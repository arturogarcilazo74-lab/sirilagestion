const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sirilagestion',
    port: process.env.DB_PORT || 3306
};

async function fixDB() {
    console.log('Connecting to database...');
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS staff_tasks (
                id VARCHAR(50) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                assigned_to VARCHAR(100),
                type VARCHAR(50),
                due_date DATE,
                status VARCHAR(50) DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_json JSON
            );
        `;

        console.log('Creating staff_tasks table...');
        await connection.execute(createTableQuery);
        console.log('Table staff_tasks created or already exists.');

        await connection.end();
        console.log('Done.');
    } catch (error) {
        console.error('Error fixing DB:', error);
    }
}

fixDB();
