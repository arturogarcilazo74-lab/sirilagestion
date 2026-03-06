
const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
    console.log('--- DIAGNOSTIC START ---');
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_NAME:', process.env.DB_NAME);

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });
        console.log('MySQL Connection SUCCESS');
        await connection.end();
    } catch (e) {
        console.log('MySQL Connection FAILED:', e.message);
        if (e.code === 'ECONNREFUSED') {
            console.log('CAUSE: MySQL service is NOT running on localhost:3306');
        }
    }
    console.log('--- DIAGNOSTIC END ---');
}

test();
