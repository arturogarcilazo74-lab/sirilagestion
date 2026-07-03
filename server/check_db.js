import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
};

async function test() {
    try {
        console.log("Connecting to:", dbConfig.host, "db:", dbConfig.database);
        const conn = await mysql.createConnection(dbConfig);
        console.log("Connected successfully!");
        
        const [students] = await conn.query("SELECT id, curp, name FROM students LIMIT 10");
        console.log("First 10 students:", students);
        
        const [count] = await conn.query("SELECT COUNT(*) as cnt FROM students");
        console.log("Total students count:", count[0].cnt);
        
        const [financeEvents] = await conn.query("SELECT * FROM finance_events");
        console.log("Finance events:", financeEvents);

        const [contributions] = await conn.query("SELECT COUNT(*) as cnt FROM finance_contributions");
        console.log("Total finance contributions:", contributions[0].cnt);
        
        await conn.end();
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
