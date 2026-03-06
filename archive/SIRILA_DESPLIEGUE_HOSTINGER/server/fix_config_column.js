const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    console.log('Starting config migration...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'sirilagestion',
        multipleStatements: true
    });

    try {
        console.log('Modifying config_value column to LONGTEXT...');
        await connection.query('ALTER TABLE school_config MODIFY COLUMN config_value LONGTEXT');
        console.log('Migration successful: config_value column is now LONGTEXT.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
        process.exit();
    }
}

migrate();
