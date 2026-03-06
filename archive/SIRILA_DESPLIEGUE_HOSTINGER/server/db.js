import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
    port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
    multipleStatements: true, // Needed for running schema.sql
    ssl: (process.env.DB_HOST || process.env.MYSQLHOST || '').includes('aivencloud') ? {
        rejectUnauthorized: false
    } : null
};

let pool = null;

// Debug: Check what HOST is actually being used
const debugHost = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
console.log(`[DEBUG] Attempting to connect to Host: ${debugHost.substring(0, 15)}...`);

export async function initDB() {
    let retries = 5;
    while (retries > 0) {
        try {
            const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'sirila_db';

            // 1. Try to create DB if NOT in production (or catch error if it fails)
            try {
                const connection = await mysql.createConnection(dbConfig);
                await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
                await connection.end();
            } catch (e) {
                console.warn('⚠️  Could not create database (might already exist or permission denied). Attempting to connect anyway...');
                // In cloud (Aiven), we might not have permission to CREATE DATABASE, or we just connect to the default one.
                // We proceed to create the pool.
            }

            // 2. Create pool with database selected
            pool = mysql.createPool({
                ...dbConfig,
                database: dbName,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });

            // 3. Test Connection & Run Schema
            const connection = await pool.getConnection();
            try {
                const schemaPath = path.join(__dirname, 'schema.sql');
                const schema = fs.readFileSync(schemaPath, 'utf8');
                // Only run schema if tables don't exist? Or allow errors (IF NOT EXISTS is in schema)
                await connection.query(schema);
                console.log('Database initialized and schema loaded.');
            } finally {
                connection.release();
            }

            return pool;
        } catch (error) {
            console.error(`Error initializing database (Attempts left: ${retries}):`, error.message);
            retries--;
            if (retries === 0) throw error;
            console.log('Waiting 5 seconds before retrying...');
            await new Promise(res => setTimeout(res, 5000));
        }
    }
}

export function getPool() {
    if (!pool) {
        throw new Error('Database not initialized. Call initDB first.');
    }
    return pool;
}
