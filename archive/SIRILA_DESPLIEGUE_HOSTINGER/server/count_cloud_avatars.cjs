const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const cloudConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
};

async function check() {
    try {
        const cloudConn = await mysql.createConnection(cloudConfig);
        console.log("✅ Connected to Aiven.");

        const [rows] = await cloudConn.query("SELECT COUNT(*) as count FROM students WHERE avatar IS NOT NULL AND LENGTH(avatar) > 100");
        console.log(`Total students with avatars in Column (Cloud): ${rows[0].count}`);

        const [rowsPending] = await cloudConn.query("SELECT COUNT(*) as count FROM students WHERE avatar = 'PENDING_LOAD'");
        console.log(`Total students with PENDING_LOAD in Column (Cloud): ${rowsPending[0].count}`);

        const [rowsJson] = await cloudConn.query('SELECT id, name, data_json FROM students');
        let jsonWithAvatar = 0;
        rowsJson.forEach(r => {
            if (r.data_json) {
                const d = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json;
                if (d.avatar && d.avatar.length > 100) jsonWithAvatar++;
            }
        });
        console.log(`Total students with avatars in JSON (Cloud): ${jsonWithAvatar}`);

        await cloudConn.end();
    } catch (e) {
        console.error("Error:", e.message);
    }
}

check();
