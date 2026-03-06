const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Configuración con timeout más largo
const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'sirilagestion',
    port: 3307,
    connectTimeout: 30000, // 30 segundos
    waitForConnections: true,
    connectionLimit: 1
};

async function waitForMySQL(maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            console.log(`⏳ Intento ${i + 1}/${maxAttempts} de conectar a MySQL...`);
            const conn = await mysql.createConnection(dbConfig);
            await conn.ping();
            await conn.end();
            console.log('✅ MySQL está listo!\n');
            return true;
        } catch (error) {
            console.log(`   ❌ No disponible aún (${error.code})`);
            if (i < maxAttempts - 1) {
                console.log('   ⏰ Esperando 5 segundos...\n');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }
    return false;
}

async function migrateData() {
    console.log('========================================');
    console.log('🔄 MIGRACIÓN MYSQL → JSON');
    console.log('========================================\n');

    // Esperar a que MySQL esté listo
    const isReady = await waitForMySQL();
    if (!isReady) {
        console.error('\n❌ No se pudo conectar a MySQL después de varios intentos');
        console.error('⚠️  Asegúrate de que MySQL esté corriendo en XAMPP\n');
        process.exit(1);
    }

    let connection;
    try {
        // Conectar a MySQL
        console.log('1️⃣ Estableciendo conexión final...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión establecida\n');

        // Extraer todos los datos
        const data = {
            students: [],
            assignments: [],
            events: [],
            behaviorLogs: [],
            financeEvents: [],
            schoolConfig: null,
            staffTasks: []
        };

        // Students
        console.log('2️⃣ Extrayendo estudiantes...');
        try {
            const [students] = await connection.query('SELECT * FROM students');
            data.students = students.map(s => ({
                ...s,
                completedAssignmentIds: s.completedAssignmentIds ? JSON.parse(s.completedAssignmentIds) : []
            }));
            console.log(`   ✅ ${data.students.length} estudiantes encontrados`);
        } catch (e) {
            console.log(`   ⚠️ Tabla students no encontrada o vacía`);
        }

        // Assignments
        console.log('3️⃣ Extrayendo tareas...');
        try {
            const [assignments] = await connection.query('SELECT * FROM assignments');
            data.assignments = assignments.map(a => ({
                ...a,
                studentSubmissions: a.studentSubmissions ? JSON.parse(a.studentSubmissions) : {},
                interactiveData: a.interactiveData ? JSON.parse(a.interactiveData) : null
            }));
            console.log(`   ✅ ${data.assignments.length} tareas encontradas`);
        } catch (e) {
            console.log(`   ⚠️ Tabla assignments no encontrada o vacía`);
        }

        // Events
        console.log('4️⃣ Extrayendo eventos...');
        try {
            const [events] = await connection.query('SELECT * FROM events');
            data.events = events;
            console.log(`   ✅ ${data.events.length} eventos encontrados`);
        } catch (e) {
            console.log(`   ⚠️ Tabla events no encontrada o vacía`);
        }

        // Behavior Logs
        console.log('5️⃣ Extrayendo registros de comportamiento...');
        try {
            const [behaviorLogs] = await connection.query('SELECT * FROM behavior_logs');
            data.behaviorLogs = behaviorLogs;
            console.log(`   ✅ ${data.behaviorLogs.length} registros encontrados`);
        } catch (e) {
            console.log(`   ⚠️ Tabla behavior_logs no encontrada o vacía`);
        }

        // Finance Events
        console.log('6️⃣ Extrayendo eventos financieros...');
        try {
            const [financeEvents] = await connection.query('SELECT * FROM finance_events');
            data.financeEvents = financeEvents;
            console.log(`   ✅ ${data.financeEvents.length} eventos encontrados`);
        } catch (e) {
            console.log(`   ⚠️ Tabla finance_events no encontrada o vacía`);
        }

        // School Config
        console.log('7️⃣ Extrayendo configuración escolar...');
        try {
            const [config] = await connection.query('SELECT * FROM school_config LIMIT 1');
            if (config.length > 0) {
                data.schoolConfig = {
                    ...config[0],
                    teachers: config[0].teachers ? JSON.parse(config[0].teachers) : []
                };
                console.log(`   ✅ Configuración extraída`);
            } else {
                console.log(`   ⚠️ No hay configuración guardada`);
            }
        } catch (e) {
            console.log(`   ⚠️ Tabla school_config no encontrada`);
        }

        // Staff Tasks
        console.log('8️⃣ Extrayendo tareas del personal...');
        try {
            const [staffTasks] = await connection.query('SELECT * FROM staff_tasks');
            data.staffTasks = staffTasks.map(t => ({
                ...t,
                assignedTo: t.assignedTo ? JSON.parse(t.assignedTo) : [],
                completedBy: t.completedBy ? JSON.parse(t.completedBy) : []
            }));
            console.log(`   ✅ ${data.staffTasks.length} tareas encontradas`);
        } catch (e) {
            console.log(`   ⚠️ Tabla staff_tasks no encontrada o vacía`);
        }

        await connection.end();

        // Guardar a JSON
        console.log('\n9️⃣ Guardando datos en database.json...');
        const jsonPath = path.join(__dirname, 'database.json');

        // Backup del JSON actual
        if (fs.existsSync(jsonPath)) {
            const backupPath = path.join(__dirname, `database.backup.${Date.now()}.json`);
            fs.copyFileSync(jsonPath, backupPath);
            console.log(`   📦 Backup creado: ${path.basename(backupPath)}`);
        }

        // Guardar nuevos datos
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
        console.log('   ✅ Datos guardados exitosamente\n');

        // Resumen
        console.log('========================================');
        console.log('✅ MIGRACIÓN COMPLETADA');
        console.log('========================================');
        console.log(`\n📊 Resumen de datos migrados:`);
        console.log(`   📚 Estudiantes: ${data.students.length}`);
        console.log(`   📝 Tareas: ${data.assignments.length}`);
        console.log(`   📅 Eventos: ${data.events.length}`);
        console.log(`   😊 Comportamiento: ${data.behaviorLogs.length}`);
        console.log(`   💰 Finanzas: ${data.financeEvents.length}`);
        console.log(`   📋 Tareas Personal: ${data.staffTasks.length}`);
        console.log(`   ⚙️  Configuración: ${data.schoolConfig ? '✅ Sí' : '❌ No'}`);
        console.log(`\n💾 Archivo: server\\database.json`);
        console.log(`\n🔄 SIGUIENTE PASO: Reinicia el servidor para ver tus datos\n`);

    } catch (error) {
        console.error('\n❌ ERROR durante la migración:');
        console.error(error.message);
        console.error(error.stack);

        if (connection) {
            try { await connection.end(); } catch (e) { }
        }
        process.exit(1);
    }
}

migrateData();
