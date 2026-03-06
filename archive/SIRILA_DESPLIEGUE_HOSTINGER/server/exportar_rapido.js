const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function exportarRapido() {
    console.log('🚀 EXPORTACIÓN RÁPIDA DE DATOS\n');

    try {
        // Conectar directamente
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'sirilagestion',
            connectTimeout: 10000
        });

        console.log('✅ Conectado a MySQL\n');

        // Contar datos rápidamente
        const [students] = await connection.query('SELECT COUNT(*) as count FROM students');
        const [assignments] = await connection.query('SELECT COUNT(*) as count FROM assignments');
        const [events] = await connection.query('SELECT COUNT(*) as count FROM events');

        console.log('📊 Datos encontrados:');
        console.log(`   Estudiantes: ${students[0].count}`);
        console.log(`   Tareas: ${assignments[0].count}`);
        console.log(`   Eventos: ${events[0].count}`);
        console.log('');

        if (students[0].count === 0 && assignments[0].count === 0 && events[0].count === 0) {
            console.log('⚠️  La base de datos en MySQL está VACÍA\n');
            console.log('Opciones:');
            console.log('1. Restaurar desde el backup del 21/01/2026');
            console.log('2. Usar la app y empezar de nuevo');
            await connection.end();
            return;
        }

        // Exportar datos
        console.log('📥 Exportando datos a JSON...\n');

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
        const [studentRows] = await connection.query('SELECT * FROM students');
        data.students = studentRows.map(row => {
            let parsed = row.data_json || {};
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch (e) { parsed = {}; }
            }
            return {
                ...parsed,
                id: row.id,
                name: row.name,
                curp: row.curp,
                attendance: parsed.attendance || {},
                completedAssignmentIds: Array.isArray(parsed.completedAssignmentIds) ? parsed.completedAssignmentIds : []
            };
        });

        // Assignments
        const [assignmentRows] = await connection.query('SELECT * FROM assignments');
        data.assignments = assignmentRows.map(row => {
            let parsed = row.data_json || {};
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch (e) { parsed = {}; }
            }
            return { ...parsed, id: row.id };
        });

        // Events
        const [eventRows] = await connection.query('SELECT * FROM events');
        data.events = eventRows.map(row => {
            let parsed = row.data_json || {};
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch (e) { parsed = {}; }
            }
            return { ...parsed, id: row.id };
        });

        // Behavior logs
        try {
            const [behaviorRows] = await connection.query('SELECT * FROM behavior_logs');
            data.behaviorLogs = behaviorRows.map(row => {
                let parsed = row.data_json || {};
                if (typeof parsed === 'string') {
                    try { parsed = JSON.parse(parsed); } catch (e) { parsed = {}; }
                }
                return { ...parsed, id: row.id };
            });
        } catch (e) { }

        // Finance events
        try {
            const [financeRows] = await connection.query('SELECT * FROM finance_events');
            data.financeEvents = financeRows.map(row => {
                let parsed = row.data_json || {};
                if (typeof parsed === 'string') {
                    try { parsed = JSON.parse(parsed); } catch (e) { parsed = {}; }
                }
                return { ...parsed, id: row.id };
            });
        } catch (e) { }

        // Staff tasks
        try {
            const [taskRows] = await connection.query('SELECT * FROM staff_tasks');
            data.staffTasks = taskRows.map(row => {
                let parsed = row.data_json || {};
                if (typeof parsed === 'string') {
                    try { parsed = JSON.parse(parsed); } catch (e) { parsed = {}; }
                }
                return { ...parsed, id: row.id };
            });
        } catch (e) { }

        // Config
        try {
            const [configRows] = await connection.query('SELECT * FROM school_config LIMIT 1');
            if (configRows.length > 0) {
                let parsed = configRows[0].config_value || {};
                if (typeof parsed === 'string') {
                    try { parsed = JSON.parse(parsed); } catch (e) { parsed = {}; }
                }
                data.schoolConfig = parsed;
            }
        } catch (e) { }

        await connection.end();

        // Guardar
        const jsonPath = path.join(__dirname, 'database.json');

        // Backup del archivo actual
        if (fs.existsSync(jsonPath)) {
            const backupPath = path.join(__dirname, `database.backup.${Date.now()}.json`);
            fs.copyFileSync(jsonPath, backupPath);
            console.log(`   📦 Backup creado: ${path.basename(backupPath)}`);
        }

        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
        console.log('   ✅ Datos guardados en database.json\n');

        console.log('========================================');
        console.log('✅ EXPORTACIÓN COMPLETADA');
        console.log('========================================\n');
        console.log('📊 Resumen:');
        console.log(`   Estudiantes: ${data.students.length}`);
        console.log(`   Tareas: ${data.assignments.length}`);
        console.log(`   Eventos: ${data.events.length}`);
        console.log(`   Comportamiento: ${data.behaviorLogs.length}`);
        console.log(`   Finanzas: ${data.financeEvents.length}`);
        console.log(`   Tareas Personal: ${data.staffTasks.length}`);
        console.log('');
        console.log('🔄 SIGUIENTE PASO:');
        console.log('   Reinicia tu servidor (npm run dev)');
        console.log('   y abre: http://localhost:3001\n');

    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('');

        if (error.code === 'ECONNREFUSED') {
            console.log('MySQL no está respondiendo.');
            console.log('\nOPCIONES:');
            console.log('1. Verifica que MySQL esté iniciado en XAMPP');
            console.log('2. Usa la app con JSON (ya funciona en puerto 3001)');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('La base de datos "sirilagestion" no existe.');
            console.log('\nDebes restaurar desde el backup.');
        } else {
            console.log('Error de conexión a MySQL.');
        }
    }
}

exportarRapido();
