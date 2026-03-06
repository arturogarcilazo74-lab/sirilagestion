const { initDB, getPool } = require('./db');

async function check() {
    try {
        await initDB();
        const pool = getPool();

        console.log("Checking Tables...");
        const [tables] = await pool.query("SHOW TABLES");
        const tableNames = tables.map(t => Object.values(t)[0]);
        console.log("Tables found:", tableNames);

        const required = ['notifications', 'parent_messages'];
        const missing = required.filter(t => !tableNames.includes(t));

        if (missing.length > 0) {
            console.error("FATAL: Missing tables:", missing);
        } else {
            console.log("All communication tables exist.");
            const [notifs] = await pool.query("SELECT COUNT(*) as c FROM notifications");
            console.log("Notifications count:", notifs[0].c);
            const [msgs] = await pool.query("SELECT COUNT(*) as c FROM parent_messages");
            console.log("Parent Messages count:", msgs[0].c);
        }

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

check();
