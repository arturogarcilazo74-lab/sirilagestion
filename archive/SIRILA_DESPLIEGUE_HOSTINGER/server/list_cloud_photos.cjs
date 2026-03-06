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
        const [rows] = await cloudConn.query('SELECT name FROM students WHERE avatar IS NOT NULL AND LENGTH(avatar) > 100');
        console.log("Students with photos in Cloud:");
        rows.forEach(r => console.log(`- ${r.name}`));
        await cloudConn.end();
    } catch (e) {
        console.error("Error:", e.message);
    }
}

check();
