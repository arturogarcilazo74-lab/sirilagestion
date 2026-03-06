const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('  EXTRACCIÓN DIRECTA DESDE BACKUP');
console.log('========================================\n');

// Ruta del backup
const backupPath = 'C:\\xampp\\mysql\\data_backup_20260121_140502\\sirilagestion';
const outputPath = path.join(__dirname, 'database.json');

console.log('📂 Buscando archivos del backup...\n');

// Verificar que el backup existe
if (!fs.existsSync(backupPath)) {
    console.log('❌ ERROR: No se encuentra el backup en:');
    console.log('   ' + backupPath);
    console.log('\nVerifica que la ruta es correcta.\n');
    process.exit(1);
}

console.log('✅ Backup encontrado en:');
console.log('   ' + backupPath + '\n');

// Listar archivos en el backup
console.log('📋 Archivos encontrados en el backup:\n');
const files = fs.readdirSync(backupPath);

const tableFiles = {};
files.forEach(file => {
    const ext = path.extname(file);
    const name = path.basename(file, ext);

    if (['.frm', '.MYD', '.MYI', '.ibd'].includes(ext)) {
        if (!tableFiles[name]) {
            tableFiles[name] = [];
        }
        tableFiles[name].push(ext);
    }
});

console.log('Tablas encontradas:');
Object.keys(tableFiles).forEach(table => {
    console.log(`   - ${table} (${tableFiles[table].join(', ')})`);
});
console.log('');

// PLAN B: Buscar otros backups JSON
console.log('🔍 Buscando backups JSON alternativos...\n');

const serverDir = __dirname;
const allFiles = fs.readdirSync(serverDir);
const jsonBackups = allFiles.filter(f =>
    f.startsWith('database') &&
    f.endsWith('.json') &&
    f !== 'database.json'
);

if (jsonBackups.length > 0) {
    console.log('✅ ¡Encontré backups JSON!\n');

    jsonBackups.forEach((file, index) => {
        const filePath = path.join(serverDir, file);
        const stats = fs.statSync(filePath);
        const size = (stats.size / 1024).toFixed(2);

        console.log(`${index + 1}. ${file}`);
        console.log(`   Tamaño: ${size} KB`);
        console.log(`   Fecha: ${stats.mtime.toLocaleString()}`);

        // Leer y verificar contenido
        try {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const studentCount = Array.isArray(content.students) ? content.students.length : 0;
            const assignmentCount = Array.isArray(content.assignments) ? content.assignments.length : 0;

            console.log(`   Contenido: ${studentCount} estudiantes, ${assignmentCount} tareas`);

            if (studentCount > 0 || assignmentCount > 0) {
                console.log(`   ✅ ¡ESTE ARCHIVO TIENE DATOS!\n`);

                // Preguntar si quiere usar este backup
                console.log('========================================');
                console.log('  ¡DATOS ENCONTRADOS!');
                console.log('========================================\n');
                console.log(`Se encontraron datos en: ${file}\n`);
                console.log('Para restaurar estos datos:\n');
                console.log('1. Ejecuta este comando:\n');
                console.log(`   copy "${file}" database.json\n`);
                console.log('2. Reinicia tu servidor (npm run dev)\n');
                console.log('3. Abre http://localhost:3001\n');
                console.log('========================================\n');
            }
        } catch (e) {
            console.log(`   ⚠️  Error al leer: ${e.message}`);
        }
        console.log('');
    });
} else {
    console.log('⚠️  No se encontraron backups JSON\n');
}

// PLAN C: Explicar opciones
console.log('========================================');
console.log('  OPCIONES DE RECUPERACIÓN');
console.log('========================================\n');

if (jsonBackups.length > 0) {
    console.log('✅ OPCIÓN 1: Usa el backup JSON que encontramos');
    console.log('   (Ver instrucciones arriba)\n');
} else {
    console.log('⚠️  No hay backups JSON disponibles\n');
}

console.log('📦 OPCIÓN 2: Extraer datos del backup de MySQL');
console.log('   Necesitamos:');
console.log('   - Iniciar MySQL en un puerto diferente (3307)');
console.log('   - O usar herramientas externas de recuperación');
console.log('   - O reinstalar XAMPP\n');

console.log('💡 OPCIÓN 3: Ayuda profesional');
console.log('   Si los datos son muy importantes:');
console.log('   - Puedo guiarte para usar herramientas avanzadas');
console.log('   - O buscar ayuda técnica especializada\n');

console.log('========================================\n');
console.log('Dime qué opción prefieres y te ayudo paso a paso.\n');
