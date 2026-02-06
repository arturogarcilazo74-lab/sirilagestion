
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

function getEnv() {
    try {
        const content = fs.readFileSync(path.join(__dirname, 'server', '.env'), 'utf8');
        const lines = content.split('\n');
        const env = {};
        lines.forEach(line => {
            const match = line.match(/^([^=#]+)=(.*)$/);
            if (match) {
                env[match[1].trim()] = match[2].trim();
            }
        });
        return env;
    } catch (e) { return {}; }
}

async function run() {
    const env = getEnv();
    const config = {
        host: env.DB_HOST || 'localhost',
        user: env.DB_USER || 'root',
        password: env.DB_PASSWORD || '',
        port: parseInt(env.DB_PORT || '3307'),
        database: env.DB_NAME || 'sirilagestion'
    };

    const cloudConfig = {
        host: env.CLOUD_DB_HOST,
        user: env.CLOUD_DB_USER,
        password: env.CLOUD_DB_PASSWORD,
        port: parseInt(env.CLOUD_DB_PORT || '24668'),
        database: env.CLOUD_DB_NAME || 'defaultdb',
        ssl: { rejectUnauthorized: false }
    };

    let connection;
    try {
        connection = await mysql.createConnection(config);
    } catch (e) {
        if (cloudConfig.host) {
            try {
                connection = await mysql.createConnection(cloudConfig);
            } catch (e2) {
                console.log(JSON.stringify({ error: "Connections failed", local: e.message, cloud: e2.message }));
                return;
            }
        } else {
            console.log(JSON.stringify({ error: "Local failed, no cloud config", local: e.message }));
            return;
        }
    }

    const results = {};
    const tables = ['students', 'assignments', 'behavior_logs', 'books', 'events', 'finance_events'];
    let grandTotal = 0;

    for (const table of tables) {
        try {
            const [rows] = await connection.query(`SELECT SUM(LENGTH(data_json)) as total_bytes, COUNT(*) as count FROM ${table}`);
            const bytes = rows[0].total_bytes || 0;
            grandTotal += bytes;

            const [largest] = await connection.query(`SELECT LENGTH(data_json) as size, id FROM ${table} ORDER BY LENGTH(data_json) DESC LIMIT 1`);

            results[table] = {
                mb: (bytes / 1024 / 1024).toFixed(3),
                count: rows[0].count,
                largestKb: largest[0] ? (largest[0].size / 1024).toFixed(2) : 0
            };
        } catch (tableErr) { }
    }

    results.grandTotalMb = (grandTotal / 1024 / 1024).toFixed(3);
    const [avatars] = await connection.query(`SELECT COUNT(*) as count FROM students WHERE avatar LIKE 'data:image%'`);
    results.base64Avatars = avatars[0].count;

    console.log("JSON_START");
    console.log(JSON.stringify(results, null, 2));
    console.log("JSON_END");
    await connection.end();
}
run();
