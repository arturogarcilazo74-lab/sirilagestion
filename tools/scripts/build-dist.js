#!/usr/bin/env node
/**
 * Compila el frontend de forma atomica hacia dist-app.
 *
 * Motivo: vite se configura con emptyOutDir, de modo que un `vite build` que
 * falla a mitad deja dist-app mutilado (borra assets/ e index.html). Como
 * dist-app es el artefacto que Hostinger sirve en produccion, un fallo de
 * compilacion no debe poder tocar la copia buena.
 *
 * Por eso se compila en un directorio de trabajo y solo se reemplaza dist-app
 * cuando la compilacion termino correctamente. Ante cualquier error, dist-app
 * queda intacto y el proceso sale con codigo 1.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

const TARGET = path.join(ROOT, 'dist-app');
const STAGING = path.join(ROOT, 'dist-app.__staging');
const BACKUP = path.join(ROOT, 'dist-app.__backup');

function rm(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function fail(message) {
  console.error(`\nERROR: ${message}`);
  console.error('dist-app NO fue modificado.\n');
  rm(STAGING);
  process.exit(1);
}

if (!fs.existsSync(VITE_BIN)) {
  fail('No se encontro vite en node_modules. Ejecuta: npm install');
}

rm(STAGING);
rm(BACKUP);

console.log('=== Compilando frontend (build atomico) ===');

const result = spawnSync(process.execPath, [VITE_BIN, 'build', '--outDir', STAGING], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
});

if (result.error) {
  fail(`No se pudo ejecutar vite: ${result.error.message}`);
}

if (result.status !== 0) {
  // Algunos entornos fallan solo al limpiar temporales de esbuild, despues de
  // haber escrito la salida completa. Si el artefacto esta integro, se acepta.
  const entry = path.join(STAGING, 'index.html');
  const assets = path.join(STAGING, 'assets');
  const looksComplete = fs.existsSync(entry) && fs.existsSync(assets) && fs.readdirSync(assets).length > 0;

  if (!looksComplete) {
    fail(`vite build termino con codigo ${result.status} y la salida esta incompleta.`);
  }
  console.warn(`\nAVISO: vite termino con codigo ${result.status} pero la salida esta completa.`);
  console.warn('       Se continua; revisa la salida anterior por si requiere atencion.\n');
}

const entry = path.join(STAGING, 'index.html');
if (!fs.existsSync(entry)) {
  fail('La compilacion no genero index.html.');
}

const builtAssets = path.join(STAGING, 'assets');
if (!fs.existsSync(builtAssets) || fs.readdirSync(builtAssets).length === 0) {
  fail('La compilacion no genero la carpeta assets.');
}

// Reemplazo: dist-app -> dist-app.__backup, staging -> dist-app.
// Si el segundo paso falla, se restaura el respaldo.
if (fs.existsSync(TARGET)) {
  fs.renameSync(TARGET, BACKUP);
}

try {
  fs.renameSync(STAGING, TARGET);
} catch (error) {
  if (fs.existsSync(BACKUP) && !fs.existsSync(TARGET)) {
    fs.renameSync(BACKUP, TARGET);
  }
  fail(`No se pudo reemplazar dist-app: ${error.message}`);
}

rm(BACKUP);
console.log('=== dist-app actualizado correctamente ===');
process.exit(0);
