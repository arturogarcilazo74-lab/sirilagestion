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
        const [rows] = await cloudConn.query('SELECT name, avatar FROM students WHERE avatar IS NOT NULL AND LENGTH(avatar) > 100 LIMIT 1');
        if (rows.length > 0) {
            console.log(`Student: ${rows[0].name}`);
            console.log(`Avatar length: ${rows[0].avatar.length}`);
            console.log(`Avatar prefix: ${rows[0].avatar.substring(0, 50)}...`);
        } else {
            console.log("No avatars found with length > 100");
        }
        await cloudConn.end();
    } catch (e) {
        console.error("Error:", e.message);
    }
}

check();
