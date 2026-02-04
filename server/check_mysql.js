const { exec } = require('child_process');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔍 DIAGNÓSTICO DE MYSQL\n');
console.log('Configuración actual:');
console.log('  Host:', process.env.DB_HOST || 'localhost');
console.log('  Usuario:', process.env.DB_USER || 'root');
console.log('  Base de datos:', process.env.DB_NAME || 'sirilagestion');
console.log('  Puerto:', process.env.DB_PORT || '3306');
console.log('');

// Verificar si MySQL está corriendo
exec('tasklist /FI "IMAGENAME eq mysqld.exe"', (error, stdout) => {
    if (stdout.includes('mysqld.exe')) {
        console.log('✅ MySQL está corriendo en el sistema');

        // Intentar conectar
        testConnection();
    } else {
        console.log('❌ MySQL NO está corriendo');
        console.log('');
        console.log('SOLUCIÓN:');
        console.log('1. Ejecuta el archivo: repair_mysql.bat');
        console.log('2. O abre XAMPP Control Panel y haz clic en "Start" en MySQL');
        console.log('');
        console.log('ALTERNATIVA:');
        console.log('Si no necesitas MySQL, el servidor usará automáticamente');
        console.log('almacenamiento JSON (database.json) como respaldo.');
    }
});

async function testConnection() {
    try {
        console.log('🔌 Intentando conectar a MySQL...');

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306
        });

        console.log('✅ ¡Conexión exitosa a MySQL!');

        // Verificar si existe la base de datos
        const dbName = process.env.DB_NAME || 'sirilagestion';
        const [rows] = await connection.query(`SHOW DATABASES LIKE '${dbName}'`);

        if (rows.length > 0) {
            console.log(`✅ La base de datos '${dbName}' existe`);

            // Verificar tablas
            await connection.query(`USE ${dbName}`);
            const [tables] = await connection.query('SHOW TABLES');
            console.log(`✅ Tablas encontradas: ${tables.length}`);

            if (tables.length > 0) {
                console.log('');
                console.log('🎉 ¡MySQL está funcionando perfectamente!');
                console.log('   Puedes iniciar tu servidor con: npm run dev');
            } else {
                console.log('⚠️  La base de datos existe pero no tiene tablas');
                console.log('   Se crearán automáticamente al iniciar el servidor');
            }
        } else {
            console.log(`⚠️  La base de datos '${dbName}' no existe`);
            console.log('   Se creará automáticamente al iniciar el servidor');
        }

        await connection.end();

    } catch (error) {
        console.log('❌ Error al conectar a MySQL:');
        console.log('   ', error.message);
        console.log('');
        console.log('POSIBLES CAUSAS:');
        console.log('1. Usuario o contraseña incorrectos');
        console.log('2. MySQL no está escuchando en el puerto', process.env.DB_PORT || '3306');
        console.log('3. Firewall bloqueando la conexión');
        console.log('');
        console.log('SOLUCIÓN:');
        console.log('Verifica el archivo .env y asegúrate de que:');
        console.log('  DB_USER=root');
        console.log('  DB_PASSWORD=   (vacío o tu contraseña de root)');
        console.log('  DB_HOST=localhost');
        console.log('  DB_PORT=3306');
    }
}
