const { initDB, getPool } = require('./db');
require('dotenv').config();

async function checkStudents() {
    await initDB();
    const pool = getPool();
    try {
        const [rows] = await pool.query('SELECT id, name, curp, data_json FROM students');
        console.log('--- STUDENT DIAGNOSTIC ---');
        console.log(`Total Students: ${rows.length}`);
        console.log('--- LISTING CURPS ---');
        rows.forEach(r => {
            console.log(`[${r.id}] ${r.name} | CURP: "${r.curp}"`);
        });
        console.log('------------------------');
    } catch (err) {
        console.error(err);
    }
    process.exit();
}

checkStudents();
