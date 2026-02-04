const { initDB, getPool } = require('./server/db');

(async () => {
    try {
        await initDB();
        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM assignments');

        console.log('--- ASSIGNMENTS DEBUG ---');
        console.log(`Total Assignments: ${rows.length}`);

        rows.forEach(r => {
            let d = {};
            try { d = JSON.parse(r.data_json); } catch (e) { }
            console.log(`ID: ${r.id} | Title: "${d.title}" | TargetGroup: "${d.targetGroup}" | DB_Target: ${d.targetGroup === undefined ? 'UNDEFINED' : d.targetGroup}`);
        });

        console.log('-------------------------');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
