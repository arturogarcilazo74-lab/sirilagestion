import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

const BUILD_DIR = path.join(projectRoot, 'deploy_temp');
const ZIP_NAME = 'SIRILA_LISTO_HOSTINGER.zip';
const ZIP_PATH = path.join(projectRoot, ZIP_NAME);

process.chdir(projectRoot);

console.log('--- 📦 PREPARANDO PAQUETE PARA HOSTINGER ---');

// 1. Limpieza
if (fs.existsSync(BUILD_DIR)) fs.rmSync(BUILD_DIR, { recursive: true, force: true });
if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);

fs.mkdirSync(BUILD_DIR);
fs.mkdirSync(path.join(BUILD_DIR, 'server'));

// 2. Copiar archivos de servidor (excluyendo basura)
console.log('[1/4] Copiando archivos de servidor...');
const serverFiles = fs.readdirSync('server');
serverFiles.forEach(file => {
    const src = path.join('server', file);
    const dest = path.join(BUILD_DIR, 'server', file);
    const stats = fs.statSync(src);

    if (stats.isDirectory()) {
        // Solo copiamos carpetas que NO sean node_modules, tools o backups
        if (!['node_modules', 'tools', 'backups', 'temp'].includes(file)) {
            // Copia recursiva simple (asumimos servidor no es muy profundo)
            fs.mkdirSync(dest, { recursive: true });
            // xcopy es más fácil para recursivo en Windows
            execSync(`xcopy "${src}" "${dest}" /E /I /H /Y /Q`);
        }
    } else {
        // Excluir archivos locales y basura
        if (!['.env', '.env.local', 'database.json', 'server.log'].includes(file)) {
            fs.copyFileSync(src, dest);
        }
    }
});

// 3. Copiar Front-end (dist-app)
console.log('[2/4] Copiando front-end (dist-app)...');
if (!fs.existsSync('dist-app')) {
    console.error('❌ ERROR: No se encuentra la carpeta dist-app. Ejecuta "npm run build" primero.');
    process.exit(1);
}
execSync(`xcopy "dist-app" "${path.join(BUILD_DIR, 'dist-app')}" /E /I /H /Y /Q`);

// 4. Copiar Entry Points y Package
console.log('[3/4] Configurando puntos de entrada...');
fs.copyFileSync('server_entry.js', path.join(BUILD_DIR, 'server.js'));
fs.copyFileSync('package.production.json', path.join(BUILD_DIR, 'package.json'));
fs.copyFileSync(path.join('server', '.env.production'), path.join(BUILD_DIR, 'server/.env'));

// 5. Crear ZIP
console.log('[4/4] Creando archivo ZIP...');
try {
    // Usamos PowerShell para crear el ZIP nativamente
    execSync(`powershell -Command "Compress-Archive -Path '${BUILD_DIR}/*' -DestinationPath '${ZIP_PATH}' -Force"`);
    console.log(`\n✅ ¡ÉXITO! Paquete listo: ${ZIP_NAME}`);
} catch (e) {
    console.error('❌ ERROR al crear el ZIP:', e.message);
}

// 6. Limpieza final
fs.rmSync(BUILD_DIR, { recursive: true, force: true });
console.log('--- Temporales limpios ---');
