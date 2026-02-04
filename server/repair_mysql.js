const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 SCRIPT DE REPARACIÓN DE MYSQL\n');
console.log('='.repeat(60));

// Verificar si XAMPP está instalado en las ubicaciones comunes
const xamppPaths = [
    'C:\\xampp',
    'C:\\Program Files\\xampp',
    'C:\\Program Files (x86)\\xampp'
];

let xamppPath = null;
for (const p of xamppPaths) {
    if (fs.existsSync(p)) {
        xamppPath = p;
        console.log(`✅ XAMPP encontrado en: ${xamppPath}`);
        break;
    }
}

if (!xamppPath) {
    console.log('❌ XAMPP no encontrado en las ubicaciones comunes.');
    console.log('\n📋 INSTRUCCIONES MANUALES:');
    console.log('1. Abre el Panel de Control de XAMPP');
    console.log('2. Haz clic en el botón "Start" junto a MySQL');
    console.log('3. Espera a que el módulo MySQL se ponga verde');
    console.log('4. Si hay un error, haz clic en "Logs" para ver los detalles');
    console.log('\n🔍 PROBLEMAS COMUNES:');
    console.log('- Puerto 3306 ocupado: Cierra otros programas que usen MySQL');
    console.log('- Archivos corruptos: Intenta reparar desde el panel de XAMPP');
    console.log('- Servicio bloqueado: Ejecuta XAMPP como Administrador');
    process.exit(1);
}

// Rutas importantes de XAMPP
const mysqlBin = path.join(xamppPath, 'mysql', 'bin');
const xamppControl = path.join(xamppPath, 'xampp-control.exe');
const mysqlData = path.join(xamppPath, 'mysql', 'data');

console.log('\n📁 Rutas de XAMPP:');
console.log(`   - Binarios MySQL: ${mysqlBin}`);
console.log(`   - Control Panel: ${xamppControl}`);
console.log(`   - Datos MySQL: ${mysqlData}`);

// Función para ejecutar comandos
function runCommand(cmd, description) {
    return new Promise((resolve, reject) => {
        console.log(`\n⏳ ${description}...`);
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.log(`❌ Error: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr && !stderr.includes('Warning')) {
                console.log(`⚠️  Advertencia: ${stderr}`);
            }
            if (stdout) {
                console.log(stdout);
            }
            resolve(stdout);
        });
    });
}

// Verificar el estado de MySQL
async function checkMySQLStatus() {
    try {
        const tasklist = await runCommand('tasklist', 'Verificando procesos de MySQL');
        if (tasklist.includes('mysqld.exe')) {
            console.log('✅ MySQL está ejecutándose');
            return true;
        } else {
            console.log('❌ MySQL NO está ejecutándose');
            return false;
        }
    } catch (error) {
        console.log('❌ No se pudo verificar el estado de MySQL');
        return false;
    }
}

// Intentar iniciar MySQL
async function startMySQL() {
    try {
        const mysqldPath = path.join(mysqlBin, 'mysqld.exe');
        if (!fs.existsSync(mysqldPath)) {
            console.log('❌ No se encontró mysqld.exe');
            return false;
        }

        console.log('\n🚀 Intentando iniciar MySQL...');
        console.log('   (Esto puede tomar unos segundos)');

        // Intentar iniciar MySQL
        exec(`"${mysqldPath}" --defaults-file="${xamppPath}\\mysql\\bin\\my.ini" --standalone`, (error) => {
            if (error) {
                console.log(`❌ Error al iniciar MySQL: ${error.message}`);
            }
        });

        // Esperar 5 segundos para que MySQL inicie
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Verificar si está corriendo
        const isRunning = await checkMySQLStatus();
        return isRunning;
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return false;
    }
}

// Verificar la conexión a MySQL
async function testMySQLConnection() {
    try {
        console.log('\n🔍 Probando conexión a MySQL...');
        const testScript = path.join(__dirname, 'test_db.js');

        return new Promise((resolve) => {
            exec(`node "${testScript}"`, (error, stdout, stderr) => {
                console.log(stdout);
                if (error) {
                    console.log('❌ No se pudo conectar a MySQL');
                    console.log(`   Error: ${error.message}`);
                    resolve(false);
                } else {
                    console.log('✅ Conexión exitosa a MySQL');
                    resolve(true);
                }
            });
        });
    } catch (error) {
        console.log(`❌ Error en la prueba de conexión: ${error.message}`);
        return false;
    }
}

// Función principal
async function main() {
    console.log('\n🔍 PASO 1: Verificando el estado actual de MySQL');
    console.log('='.repeat(60));

    let isRunning = await checkMySQLStatus();

    if (!isRunning) {
        console.log('\n🔧 PASO 2: Intentando iniciar MySQL');
        console.log('='.repeat(60));
        console.log('\n⚠️  IMPORTANTE: Si esto no funciona, abre XAMPP Control Panel manualmente');
        console.log('   y haz clic en "Start" junto a MySQL\n');

        // Intentar abrir el panel de control de XAMPP
        if (fs.existsSync(xamppControl)) {
            console.log('📂 Abriendo XAMPP Control Panel...');
            exec(`"${xamppControl}"`, (error) => {
                if (error) {
                    console.log(`   ⚠️  No se pudo abrir automáticamente: ${error.message}`);
                }
            });
        }

        console.log('\n⏰ Esperando 10 segundos para que inicies MySQL manualmente...');
        console.log('   (Haz clic en "Start" en el panel de XAMPP si se abrió)');

        await new Promise(resolve => setTimeout(resolve, 10000));

        // Verificar de nuevo
        isRunning = await checkMySQLStatus();
    }

    if (isRunning) {
        console.log('\n✅ PASO 3: MySQL está corriendo, probando conexión');
        console.log('='.repeat(60));

        const connected = await testMySQLConnection();

        if (connected) {
            console.log('\n🎉 ¡ÉXITO! MySQL está funcionando correctamente');
            console.log('\n📝 Próximos pasos:');
            console.log('   1. Puedes iniciar tu servidor con: npm run dev');
            console.log('   2. Los datos ahora se guardarán en MySQL');
            console.log('   3. Mantén XAMPP abierto mientras uses la aplicación');
        } else {
            console.log('\n⚠️  MySQL está corriendo pero hay problemas de conexión');
            console.log('\n🔧 SOLUCIONES:');
            console.log('   1. Verifica el archivo .env en la carpeta server');
            console.log('   2. Asegúrate de que la contraseña de root esté vacía');
            console.log('   3. Verifica que el puerto 3306 no esté bloqueado');
        }
    } else {
        console.log('\n❌ No se pudo iniciar MySQL automáticamente');
        console.log('\n📋 SOLUCIONES MANUALES:');
        console.log('   1. Abre XAMPP Control Panel como Administrador');
        console.log('   2. Haz clic en "Start" junto a MySQL');
        console.log('   3. Si aparece un error, lee el mensaje');
        console.log('   4. Problemas comunes:');
        console.log('      - Puerto 3306 ocupado → Cierra otros programas MySQL');
        console.log('      - Error de permisos → Ejecuta XAMPP como Administrador');
        console.log('      - Error de archivos → Haz backup y reinstala XAMPP');
        console.log('\n💡 ALTERNATIVA: Usar almacenamiento JSON');
        console.log('   El servidor ya tiene un sistema de respaldo que usa JSON');
        console.log('   Si MySQL no funciona, la app usará database.json automáticamente');
    }

    console.log('\n' + '='.repeat(60));
    console.log('Script finalizado. Presiona cualquier tecla para salir...');
}

main().catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
});
