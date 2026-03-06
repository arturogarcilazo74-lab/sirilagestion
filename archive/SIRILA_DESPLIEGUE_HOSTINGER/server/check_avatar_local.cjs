const mysql = require('mysql2/promise');

const localConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'sirilagestion'
};

async function check() {
    try {
        const localConn = await mysql.createConnection(localConfig);
        console.log("✅ Connected to Local DB.");

        const [rows] = await localConn.query('SELECT id, name, avatar, data_json FROM students LIMIT 10');

        console.log("\n--- Student Avatar Status (Local) ---");
        rows.forEach(r => {
            const hasColAvatar = !!r.avatar && r.avatar.length > 50;
            let hasJsonAvatar = false;
            if (r.data_json) {
                try {
                    const parsed = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json;
                    hasJsonAvatar = !!parsed.avatar && parsed.avatar.length > 50;
                } catch (e) { }
            }
            console.log(`Student: ${r.name.padEnd(20)} | Col Avatar: ${hasColAvatar ? 'YES' : 'NO '} | JSON Avatar: ${hasJsonAvatar ? 'YES' : 'NO '}`);
        });

        await localConn.end();
    } catch (e) {
        console.error("Connection Error:", e);
    }
}

check();
