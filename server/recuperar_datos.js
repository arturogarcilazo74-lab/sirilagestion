const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔍 RECUPERACIÓN DE DATOS - Script de diagnóstico\n');
console.log('='.repeat(60));

const DB_FILE = path.join(__dirname, 'database.json');
const BACKUP_FILE = path.join(__dirname, 'database_recuperado.json');

// Verificar datos en JSON
console.log('\n📁 PASO 1: Verificando datos en database.json...');
try {
    if (fs.existsSync(DB_FILE)) {
        const jsonData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        const studentCount = Array.isArray(jsonData.students) ? jsonData.students.length : 0;
        const assignmentCount = Array.isArray(jsonData.assignments) ? jsonData.assignments.length : 0;
        const eventCount = Array.isArray(jsonData.events) ? jsonData.events.length : 0;

        console.log(`   Estudiantes: ${studentCount}`);
        console.log(`   Tareas: ${assignmentCount}`);
        console.log(`   Eventos: ${eventCount}`);

        if (studentCount > 0 || assignmentCount > 0 || eventCount > 0) {
            console.log('\n✅ ¡HAY DATOS EN JSON!');
            console.log('   Estos datos están seguros y disponibles.');
        } else {
            console.log('\n⚠️  El archivo JSON existe pero está vacío.');
        }
    } else {
        console.log('   ❌ No existe database.json');
    }
} catch (error) {
    console.log('   ❌ Error al leer JSON:', error.message);
}

// Verificar datos en MySQL
console.log('\n' + '='.repeat(60));
console.log('💾 PASO 2: Verificando datos en MySQL...\n');

async function checkMySQL() {
    let connection = null;
    try {
        // Intentar conectar a MySQL
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306
        });

        console.log('✅ Conectado a MySQL');

        // Verificar si existe la base de datos
        const dbName = process.env.DB_NAME || 'sirilagestion';
        const [dbs] = await connection.query(`SHOW DATABASES LIKE '${dbName}'`);

        if (dbs.length === 0) {
            console.log(`❌ La base de datos '${dbName}' NO existe en MySQL`);
            console.log('   No hay datos que recuperar de MySQL.');
            await connection.end();
            return false;
        }

        console.log(`✅ La base de datos '${dbName}' existe`);
        await connection.query(`USE ${dbName}`);

        // Verificar tablas y contar registros
        console.log('\nConteo de datos en MySQL:');

        let hasData = false;
        const tables = ['students', 'assignments', 'events', 'behavior_logs', 'finance_events', 'staff_tasks'];

        for (const table of tables) {
            try {
                const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = rows[0].count;
                console.log(`   ${table}: ${count} registros`);
                if (count > 0) hasData = true;
            } catch (e) {
                console.log(`   ${table}: tabla no existe`);
            }
        }

        if (hasData) {
            console.log('\n✅ ¡HAY DATOS EN MYSQL!');
            console.log('\n🔄 ¿Quieres exportar estos datos a JSON?');
            console.log('   Ejecuta: node migrar_mysql_a_json.js');
        } else {
            console.log('\n⚠️  Las tablas existen pero están vacías.');
        }

        await connection.end();
        return hasData;

    } catch (error) {
        console.log('❌ No se pudo conectar a MySQL');
        console.log(`   Error: ${error.message}`);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 MySQL no está corriendo.');
            console.log('   Para recuperar datos de MySQL:');
            console.log('   1. Inicia MySQL en XAMPP Control Panel');
            console.log('   2. Vuelve a ejecutar este script');
        }

        if (connection) await connection.end();
        return false;
    }
}

// Buscar archivos de backup
console.log('\n' + '='.repeat(60));
console.log('🗂️  PASO 3: Buscando archivos de backup...\n');

const backupPatterns = [
    'database_backup*.json',
    'database*.json',
    '*backup*.json'
];

const serverDir = __dirname;
const files = fs.readdirSync(serverDir);
const backupFiles = files.filter(f =>
    (f.includes('backup') || f.includes('database')) &&
    f.endsWith('.json') &&
    f !== 'database.json' &&
    f !== 'package.json' &&
    f !== 'package-lock.json'
);

if (backupFiles.length > 0) {
    console.log('✅ Archivos de backup encontrados:');
    backupFiles.forEach(f => {
        const filePath = path.join(serverDir, f);
        const stats = fs.statSync(filePath);
        const size = (stats.size / 1024).toFixed(2);
        console.log(`   - ${f} (${size} KB) - ${stats.mtime.toLocaleString()}`);
    });

    console.log('\n💡 Para restaurar desde un backup:');
    console.log('   1. Copia el archivo de backup');
    console.log('   2. Renómbralo a: database.json');
    console.log('   3. Reinicia el servidor');
} else {
    console.log('⚠️  No se encontraron archivos de backup en la carpeta server');
}

// Resumen final
async function finalReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN\n');

    const mysqlHasData = await checkMySQL();

    console.log('\n' + '='.repeat(60));
    console.log('🎯 RECOMENDACIONES:\n');

    if (mysqlHasData) {
        console.log('✅ Tus datos están en MySQL');
        console.log('\n   PARA RECUPERARLOS:');
        console.log('   1. Asegúrate de que MySQL esté corriendo en XAMPP');
        console.log('   2. Ejecuta: node migrar_mysql_a_json.js');
        console.log('   3. Esto exportará todos tus datos a database.json');
        console.log('   4. Reinicia tu servidor (npm run dev)');
    } else {
        console.log('⚠️  No se encontraron datos en MySQL');
        console.log('\n   OPCIONES:');
        console.log('   1. Si tenías MySQL funcionando antes, intenta iniciarlo');
        console.log('   2. Busca archivos de backup manualmente en:');
        console.log(`      ${serverDir}`);
        console.log('   3. Verifica si hay carpetas de backup de MySQL en:');
        console.log('      C:\\xampp\\mysql\\data_backup*');
    }

    console.log('\n' + '='.repeat(60));
}

finalReport().catch(console.error);
