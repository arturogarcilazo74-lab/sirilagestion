import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env explicitly
dotenv.config({ path: path.join(__dirname, '.env') });

const cloudConfig = {
    host: process.env.CLOUD_DB_HOST,
    port: process.env.CLOUD_DB_PORT,
    user: process.env.CLOUD_DB_USER,
    password: process.env.CLOUD_DB_PASSWORD,
    database: process.env.CLOUD_DB_NAME,
    ssl: { rejectUnauthorized: false }
};

async function checkCloudData() {
    console.log('☁️  Checking Aiven Cloud Database...');
    console.log(`Target: ${cloudConfig.host}`);

    try {
        const conn = await mysql.createConnection(cloudConfig);
        console.log('✅ Connection Successful!');

        const tables = ['students', 'assignments', 'events', 'behavior_logs', 'finance_events', 'staff_tasks', 'books', 'school_config', 'parent_messages', 'notifications'];

        for (const table of tables) {
            try {
                const [rows] = await conn.query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`${table}: ${rows[0].count}`);
            } catch (e) {
                console.log(`${table}: ERROR - ${e.message}`);
            }
        }

        conn.end();
    } catch (error) {
        console.error('❌ Error connecting or querying cloud DB:', error.message);
    }
}

checkCloudData();
