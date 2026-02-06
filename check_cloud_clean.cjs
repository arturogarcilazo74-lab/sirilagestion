
const mysql = require('mysql2/promise');

async function run() {
    const cloudConfig = {
        host: process.env.CLOUD_DB_HOST || 'mysql-818e908-arturogarcilazo74-ee52.g.aivencloud.com',
        user: process.env.CLOUD_DB_USER || 'avnadmin',
        password: process.env.CLOUD_DB_PASSWORD,
        port: Number(process.env.CLOUD_DB_PORT) || 24668,
        database: process.env.CLOUD_DB_NAME || 'defaultdb',
        ssl: { rejectUnauthorized: false }
    };

    if (!cloudConfig.password) {
        console.error("Missing CLOUD_DB_PASSWORD");
        process.exit(1);
    }

    try {
        const connection = await mysql.createConnection(cloudConfig);
        const results = [];

        const tables = ['students', 'assignments', 'behavior_logs', 'events', 'finance_events', 'staff_tasks', 'books'];
        for (const table of tables) {
            try {
                const [rows] = await connection.query(`SELECT SUM(LENGTH(data_json)) as bytes, COUNT(*) as count FROM ${table}`);
                results.push({ table, bytes: rows[0].bytes || 0, count: rows[0].count });
            } catch (e) {
                results.push({ table, error: e.message });
            }
        }

        const [config] = await connection.query(`SELECT LENGTH(config_value) as bytes FROM school_config WHERE config_key = 'main_config'`);
        results.push({ table: 'school_config', bytes: config[0] ? config[0].bytes : 0 });

        const [avatars] = await connection.query(`SELECT SUM(LENGTH(avatar)) as bytes FROM students`);
        results.push({ table: 'student_avatars_only', bytes: avatars[0].bytes || 0 });

        console.log(JSON.stringify(results, null, 2));
        await connection.end();
    } catch (e) {
        console.error(e.message);
    }
}
run();
