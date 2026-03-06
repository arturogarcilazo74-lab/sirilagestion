const { initDB, getPool } = require('./db');
require('dotenv').config();

async function checkAssignments() {
    try {
        await initDB();
        const pool = getPool();
        const [rows] = await pool.query('SELECT id, title, data_json FROM assignments');
        console.log('--- Assignments in DB ---');
        rows.forEach(r => {
            let data = {};
            try {
                data = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json || {};
            } catch (e) {
                console.log(`ID: ${r.id} - [Invalid JSON]`);
                return;
            }

            if (!data.interactiveData) return; // Skip non-interactive

            console.log(`ID: ${r.id}, Title: "${r.title}"`);
            const iData = data.interactiveData;

            // Summarize large fields
            const summary = { ...iData };
            if (summary.imageUrl) summary.imageUrl = `[Base64 Image Length: ${summary.imageUrl.length}]`;
            if (summary.questions) summary.questions = `[Array Length: ${summary.questions.length}]`;

            console.log('  Type:', iData.type);
            console.log('  Summary:', JSON.stringify(summary));

            // Check for the bug condition
            if (iData.type === 'QUIZ' && (!iData.questions || iData.questions.length === 0)) {
                console.log('  >>> BUG DETECTED: QUIZ type with no questions! <<<');
            }
            if (iData.type === 'WORKSHEET' && !iData.imageUrl) {
                console.log('  >>> BUG DETECTED: WORKSHEET type with no image! <<<');
            }
            console.log('---------------------------');
        });
    } catch (e) {
        console.error(e);
    }
    process.exit();
}

checkAssignments();
