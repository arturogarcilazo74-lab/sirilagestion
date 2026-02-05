const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '.env') });

// CONFIGURACION LOCAL
const localConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3307,
    database: process.env.DB_NAME || 'sirila_db'
};

// CONFIGURACION NUBE (AIVEN)
const cloudConfig = {
    host: process.env.CLOUD_DB_HOST,
    port: process.env.CLOUD_DB_PORT,
    user: process.env.CLOUD_DB_USER,
    password: process.env.CLOUD_DB_PASSWORD,
    database: process.env.CLOUD_DB_NAME,
    ssl: {
        rejectUnauthorized: false
    }
};

if (!process.env.CLOUD_DB_HOST) {
    console.error("❌ Error: No se encontraron las credenciales de la Nube en .env");
    console.error("Asegúrate de llenar CLOUD_DB_HOST, CLOUD_DB_PASSWORD, etc. en server/.env");
    process.exit(1);
}

async function migrate() {
    console.log("🚀 Iniciando migración de datos a la nube (Aiven)...");

    let localConn, cloudConn;

    try {
        console.log("📡 Conectando a base de datos LOCAL...");
        localConn = await mysql.createConnection(localConfig);
        console.log("✅ Conectado a Local.");

        console.log("📡 Conectando a base de datos NUBE...");
        cloudConn = await mysql.createConnection(cloudConfig);
        console.log("✅ Conectado a Aiven.");

        // Crear tablas en la nube si no existen
        console.log("📝 Inicializando tablas en la nube...");
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        const statements = schema.split(';').filter(s => s.trim());
        for (let sql of statements) {
            await cloudConn.query(sql);
        }
        console.log("✅ Tablas creadas/verificadas.");

        // Lista de tablas a migrar
        const tables = [
            'students',
            'assignments',
            'events',
            'behavior_logs',
            'finance_events',
            'school_config',
            'books',
            'staff_tasks',
            'notifications',
            'parent_messages'
        ];

        for (const table of tables) {
            try {
                console.log(`\n📦 Migrando tabla: ${table}...`);
                const [rows] = await localConn.query(`SELECT * FROM ${table}`);

                if (rows.length === 0) {
                    console.log(`  - La tabla ${table} está vacía. Saltando...`);
                    continue;
                }

                // Limpiar tabla destino antes de insertar para evitar duplicados en la primera carga limpia
                // await cloudConn.query(`DELETE FROM ${table}`); 

                for (const row of rows) {
                    const keys = Object.keys(row);
                    const values = Object.values(row);
                    const placeholders = keys.map(() => '?').join(', ');
                    const columns = keys.join(', ');

                    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${keys.map(k => `${k}=VALUES(${k})`).join(', ')}`;
                    await cloudConn.query(sql, values);
                }
                console.log(`  ✅ ${rows.length} registros migrados.`);
            } catch (err) {
                console.log(`  ⚠️  Error en tabla ${table}: ${err.message}`);
            }
        }

        console.log("\n===============================================");
        console.log("🎉 ¡MIGRACIÓN COMPLETADA CON ÉXITO!");
        console.log("Tus datos ya están en la nube de Aiven.");
        console.log("===============================================");

    } catch (error) {
        console.error("\n❌ ERROR DURANTE LA MIGRACIÓN:");
        console.error(error.message);
    } finally {
        if (localConn) await localConn.end();
        if (cloudConn) await cloudConn.end();
    }
}

migrate();
