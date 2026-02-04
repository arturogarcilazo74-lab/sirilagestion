const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
    port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
    multipleStatements: true // Needed for running schema.sql
};

let pool = null;

async function initDB() {
    let retries = 10;
    while (retries > 0) {
        try {
            // 1. Create connection to create DB if not exists
            const connection = await mysql.createConnection(dbConfig);
            const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'sirila_db';
            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);

            // Try to increase packet size for large image syncs
            try {
                // Only if user has permissions
                // await connection.query('SET GLOBAL max_allowed_packet=1073741824'); 
            } catch (e) {
                // console.warn('Failed to set max_allowed_packet:', e.message);
            }

            await connection.end();

            // 2. Create pool with database selected
            pool = mysql.createPool({
                ...dbConfig,
                database: dbName,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });

            // 3. Run Schema
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await pool.query(schema);

            console.log('Database initialized and schema loaded.');
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

function getPool() {
    if (!pool) {
        throw new Error('Database not initialized. Call initDB first.');
    }
    return pool;
}

module.exports = { initDB, getPool };
