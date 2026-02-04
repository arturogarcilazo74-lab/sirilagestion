const { initDB } = require('./db');

(async () => {
    try {
        console.log("Testing DB initialization...");
        await initDB();
        console.log("DB Init Success");
        process.exit(0);
    } catch (e) {
        console.error("DB Init Failed:", e);
        process.exit(1);
    }
})();
