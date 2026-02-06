const mysql = require('mysql2/promise');

async function check() {
    const ports = [3306, 3307];
    for (const port of ports) {
        try {
            const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', port });
            const [rows] = await conn.query('SHOW DATABASES');
            console.log(`✅ Port ${port} is OPEN. Databases:`, rows.map(r => r.Database).join(', '));
            await conn.end();
        } catch (e) {
            console.log(`❌ Port ${port} is closed or refused connection.`);
        }
    }
}

check();
