const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function verificarDatosMySQL() {
    console.log('🔍 Verificando datos en MySQL...\n');

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306,
            connectTimeout: 5000
        });

        console.log('✅ Conectado a MySQL\n');

        const dbName = process.env.DB_NAME || 'sirilagestion';

        // Verificar si existe la base de datos
        const [dbs] = await connection.query(`SHOW DATABASES LIKE '${dbName}'`);

        if (dbs.length === 0) {
            console.log(`❌ La base de datos '${dbName}' NO existe\n`);
            console.log('CONCLUSIÓN: No hay datos en MySQL para recuperar.');
            console.log('Tus datos pueden estar en un backup que debes buscar manualmente.\n');
            await connection.end();
            return;
        }

        console.log(`✅ Base de datos '${dbName}' encontrada\n`);
        await connection.query(`USE ${dbName}`);

        console.log('Contando registros:\n');

        const tablas = [
            { nombre: 'students', desc: 'Estudiantes' },
            { nombre: 'assignments', desc: 'Tareas' },
            { nombre: 'events', desc: 'Eventos' },
            { nombre: 'behavior_logs', desc: 'Comportamiento' },
            { nombre: 'finance_events', desc: 'Finanzas' },
            { nombre: 'staff_tasks', desc: 'Tareas Personal' }
        ];

        let totalRegistros = 0;

        for (const tabla of tablas) {
            try {
                const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${tabla.nombre}`);
                const count = rows[0].count;
                console.log(`   ${tabla.desc}: ${count}`);
                totalRegistros += count;
            } catch (e) {
                console.log(`   ${tabla.desc}: tabla no existe`);
            }
        }

        console.log(`\n📊 Total de registros: ${totalRegistros}\n`);

        if (totalRegistros > 0) {
            console.log('='.repeat(60));
            console.log('✅ ¡BUENAS NOTICIAS! Hay datos en MySQL\n');
            console.log('PARA RECUPERARLOS:');
            console.log('1. Asegúrate de que MySQL siga corriendo');
            console.log('2. Ejecuta: node migrar_mysql_a_json.js');
            console.log('3. Espera a que termine');
            console.log('4. Reinicia el servidor: npm run dev');
            console.log('='.repeat(60));
        } else {
            console.log('='.repeat(60));
            console.log('⚠️  Las tablas existen pero están vacías\n');
            console.log('POSIBLES RAZONES:');
            console.log('- Los datos nunca se guardaron en MySQL');
            console.log('- Se eliminaron accidentalmente');
            console.log('- Estaban en otro servidor/base de datos');
            console.log('\nBUSCA BACKUPS EN:');
            console.log('- server/database.backup.*.json');
            console.log('- C:\\xampp\\mysql\\data_backup*\\');
            console.log('='.repeat(60));
        }

        await connection.end();

    } catch (error) {
        console.log('❌ No se pudo conectar a MySQL\n');
        console.log(`Error: ${error.message}\n`);

        if (error.code === 'ECONNREFUSED') {
            console.log('='.repeat(60));
            console.log('MySQL NO está corriendo\n');
            console.log('PARA RECUPERAR DATOS DE MYSQL:');
            console.log('1. Abre XAMPP Control Panel');
            console.log('2. Haz clic en "Start" junto a MySQL');
            console.log('3. Si falla, ejecuta: clear_mysql_logs.bat');
            console.log('4. Vuelve a intentar iniciar MySQL');
            console.log('5. Ejecuta este script de nuevo');
            console.log('='.repeat(60));
        } else {
            console.log('Error de conexión. Verifica:');
            console.log('- Usuario y contraseña en .env');
            console.log('- Que MySQL esté corriendo');
            console.log('- Puerto 3306 disponible');
        }
    }
}

verificarDatosMySQL();
