const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

async function run() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3307,
            database: process.env.DB_NAME || 'sirilagestion'
        });

        const tables = ['students', 'assignments', 'events', 'behavior_logs', 'finance_events', 'staff_tasks'];
        for (const table of tables) {
            const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`${table}: ${rows[0].count}`);
        }
        await connection.end();
    } catch (e) {
        console.error(e.message);
    }
}
run();
