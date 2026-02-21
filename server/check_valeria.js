import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
    port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'sirila_db'
};

async function checkValeria() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SELECT id, curp, name FROM students WHERE name LIKE '%VALERIA%'");
        rows.forEach(r => {
            console.log(`ID: "${r.id}", CURP: "${r.curp}", Name: "${r.name}"`);
        });
        await connection.end();
    } catch (e) {
        console.error(e);
    }
}

checkValeria();
