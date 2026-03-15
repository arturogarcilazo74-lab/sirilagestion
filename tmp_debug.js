import { initDB, getPool } from './server/db.js';

async function debug() {
    try {
        await initDB();
        const pool = getPool();
        const [rows] = await pool.query('SELECT id, title, data_json FROM assignments');
        console.log('--- Assignments ---');
        rows.forEach(r => {
            const d = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json;
            console.log(`ID: ${r.id} | Title: ${r.title} | TargetGroup: ${d?.targetGroup || 'N/A'} | Visible: ${d?.isVisibleInParentsPortal}`);
        });

        const [studentRows] = await pool.query('SELECT id, name, data_json FROM students');
        console.log('\n--- Students ---');
        const groups = new Set();
        studentRows.forEach(r => {
            const d = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json;
            groups.add(d?.group || 'N/A');
        });
        console.log('Unique Student Groups:', Array.from(groups));

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

debug();
