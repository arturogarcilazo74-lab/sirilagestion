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

        const [rows] = await cloudConn.query('SELECT id, name, avatar, data_json FROM students LIMIT 10');

        console.log("\n--- Student Avatar Status (Cloud) ---");
        rows.forEach(r => {
            const hasColAvatar = !!r.avatar && r.avatar.length > 50;
            let hasJsonAvatar = false;
            if (r.data_json) {
                try {
                    const parsed = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json;
                    hasJsonAvatar = !!parsed.avatar && parsed.avatar.length > 50;
                } catch (e) { }
            }
            console.log(`Student: ${r.name.padEnd(20)} | Col Avatar: ${hasColAvatar ? 'YES' : 'NO '} | JSON Avatar: ${hasJsonAvatar ? 'YES' : 'NO '}`);
        });

        await cloudConn.end();
    } catch (e) {
        console.error("Error:", e.message);
    }
}

check();
