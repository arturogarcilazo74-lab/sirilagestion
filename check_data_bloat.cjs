
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

async function run() {
    console.log("Starting Diagnostic...");
    const localConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 3307,
        database: process.env.DB_NAME || 'sirilagestion'
    };

    const cloudConfig = {
        host: process.env.CLOUD_DB_HOST,
        user: process.env.CLOUD_DB_USER,
        password: process.env.CLOUD_DB_PASSWORD,
        port: parseInt(process.env.CLOUD_DB_PORT),
        database: process.env.CLOUD_DB_NAME,
        ssl: { rejectUnauthorized: false }
    };

    let connection;
    try {
        console.log("Trying local connection on port " + localConfig.port);
        connection = await mysql.createConnection(localConfig);
        console.log("CONNECTED TO LOCAL");
    } catch (e) {
        console.error("Local connection failed: " + e.message);
        if (cloudConfig.host) {
            console.log("Trying cloud connection to " + cloudConfig.host);
            try {
                connection = await mysql.createConnection(cloudConfig);
                console.log("CONNECTED TO CLOUD");
            } catch (e2) {
                console.error("Cloud connection failed: " + e2.message);
                return;
            }
        } else {
            console.log("No cloud config found in .env");
            return;
        }
    }

    try {
        const tables = ['students', 'assignments', 'behavior_logs', 'books', 'events', 'finance_events'];
        let grandTotal = 0;

        for (const table of tables) {
            try {
                const [rows] = await connection.query(`SELECT SUM(LENGTH(data_json)) as total_bytes, COUNT(*) as count FROM ${table}`);
                const bytes = rows[0].total_bytes || 0;
                grandTotal += bytes;
                console.log(`Table ${table.padEnd(15)}: ${(bytes / 1024 / 1024).toFixed(3)} MB | Count: ${rows[0].count}`);

                if (bytes > 0) {
                    const [largest] = await connection.query(`SELECT LENGTH(data_json) as size, id FROM ${table} ORDER BY LENGTH(data_json) DESC LIMIT 1`);
                    console.log(`  -> Largest ${table.slice(0, -1)}: ${(largest[0].size / 1024).toFixed(2)} KB`);
                }
            } catch (tableErr) {
                console.log(`Table ${table} error (maybe missing?): ` + tableErr.message);
            }
        }

        console.log("-----------------------------------------");
        console.log(`GRAND TOTAL DATA SIZE: ${(grandTotal / 1024 / 1024).toFixed(3)} MB`);

        const [avatars] = await connection.query(`SELECT COUNT(*) as count FROM students WHERE avatar LIKE 'data:image%'`);
        console.log(`Students with Base64 avatars: ${avatars[0].count}`);

        await connection.end();
    } catch (e) {
        console.error("Diagnostic error:", e);
    }
}
run();
