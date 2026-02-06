
const mysql = require('mysql2/promise');

async function run() {
    const cloudConfig = {
        host: process.env.CLOUD_DB_HOST || 'mysql-818e908-arturogarcilazo74-ee52.g.aivencloud.com',
        user: process.env.CLOUD_DB_USER || 'avnadmin',
        password: process.env.CLOUD_DB_PASSWORD, // Must be set in environment
        port: Number(process.env.CLOUD_DB_PORT) || 24668,
        database: process.env.CLOUD_DB_NAME || 'defaultdb',
        ssl: { rejectUnauthorized: false }
    };

    if (!cloudConfig.password) {
        console.warn("⚠️  WARNING: CLOUD_DB_PASSWORD not set. Using simplified check or failing.");
        return;
    }

    try {
        console.log("Connecting to Aiven Cloud DB...");
        const connection = await mysql.createConnection(cloudConfig);
        console.log("Connected!\n");

        const tables = ['students', 'assignments', 'behavior_logs'];
        for (const table of tables) {
            const [rows] = await connection.query(`SELECT SUM(LENGTH(data_json)) as total_bytes, COUNT(*) as count FROM ${table}`);
            const totalMB = (rows[0].total_bytes / 1024 / 1024).toFixed(3);
            console.log(`Table ${table}: ${totalMB} MB (${rows[0].count} rows)`);

            if (table === 'students') {
                const [avatarSize] = await connection.query(`SELECT SUM(LENGTH(avatar)) as avatar_bytes FROM students`);
                console.log(`  -> Total Avatar Size: ${(avatarSize[0].avatar_bytes / 1024 / 1024).toFixed(3)} MB`);

                const [avatars] = await connection.query(`SELECT COUNT(*) as count FROM students WHERE avatar LIKE 'data:image%'`);
                console.log(`  -> Students with Base64 avatars: ${avatars[0].count}`);
            }

            /* 
            const [largest] = await connection.query(`SELECT LENGTH(data_json) as size, id FROM ${table} ORDER BY LENGTH(data_json) DESC LIMIT 1`);
            if (largest[0]) {
                console.log(`  -> Largest row in ${table}: ${(largest[0].size / 1024).toFixed(2)} KB (ID: ${largest[0].id})`);
            }
            */
        }

        await connection.end();
    } catch (e) {
        console.error("Cloud DB error:", e.message);
    }
}
run();
