import fs from 'fs';
import path from 'path';

console.log("🔍 Iniciando Verificación de Despliegue en la Nube...\n");

const checks = [
    {
        name: "Puerto Dinámico (PORT env)",
        file: "server/server.js",
        regex: /process\.env\.PORT/,
        success: "El servidor usa process.env.PORT (Correcto para la nube).",
        fail: "El puerto está fijado en 3001. Podría fallar en la nube."
    },
    {
        name: "Scripts de Inicio",
        file: "package.json",
        regex: /"start": "node server\/server.js"/,
        success: "Script 'npm start' configurado correctamente.",
        fail: "Falta el script 'start' en package.json."
    },
    {
        name: "Rutas Relativas API",
        file: "services/api.ts",
        regex: /return stored \|\| '\/api'/,
        success: "El frontend usa rutas relativas /api (Correcto para dominio único).",
        fail: "El frontend tiene rumbos hardcoded a localhost."
    },
    {
        name: "Conexión MySQL Flexible",
        file: "server/db.js",
        regex: /process\.env\.MYSQLHOST/,
        success: "El sistema de DB acepta variables de entorno de Railway/Render.",
        fail: "La base de datos solo busca localhost."
    }
];

let allPassed = true;

checks.forEach(check => {
    try {
        const content = fs.readFileSync(path.resolve(check.file), 'utf8');
        if (check.regex.test(content)) {
            console.log(`✅ ${check.name}: ${check.success}`);
        } else {
            console.log(`❌ ${check.name}: ${check.fail}`);
            allPassed = false;
        }
    } catch (e) {
        console.log(`⚠️  No se pudo verificar ${check.name} (Archivo no encontrado).`);
        allPassed = false;
    }
});

console.log("\n------------------------------------------------");
if (allPassed) {
    console.log("🚀 ¡TODO LISTO! Tu código está optimizado para la nube.");
    console.log("Sigue los pasos en GUIA_NUBE_Y_RESPALDOS.md para subirlo.");
} else {
    console.log("📝 Hay algunos detalles que corregir antes de subirlo.");
}
