const mysql = require('mysql2/promise');

async function check() {
    const ports = [3306, 3307];
    for (const port of ports) {
        try {
            const config = {
                host: '127.0.0.1',
                port: port,
                user: 'root',
                password: '',
                database: 'sirilagestion'
            };
            const conn = await mysql.createConnection(config);
            console.log(`✅ Connected to Local DB on port ${port}.`);

            const [rows] = await conn.query('SELECT COUNT(*) as count FROM students WHERE avatar IS NOT NULL AND LENGTH(avatar) > 100');
            console.log(`Port ${port}: Total students with avatars: ${rows[0].count}`);

            await conn.end();
        } catch (e) {
            // Silently fail for closed ports
        }
    }
}

check();
