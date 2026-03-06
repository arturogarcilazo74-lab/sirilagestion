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
        const [rows] = await cloudConn.query('SELECT id, avatar FROM students WHERE avatar IS NOT NULL AND LENGTH(avatar) > 100 LIMIT 5');

        const avatars = {};
        rows.forEach(r => {
            const avatar = r.avatar;
            avatars[r.id] = avatar.substring(0, 100);
        });

        console.log("Avatar endpoint simulation result (Keys and first 100 chars):");
        console.log(JSON.stringify(avatars, null, 2));

        await cloudConn.end();
    } catch (e) {
        console.error("Error:", e.message);
    }
}

check();
