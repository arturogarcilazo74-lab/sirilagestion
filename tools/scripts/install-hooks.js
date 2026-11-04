#!/usr/bin/env node
/**
 * Activa los hooks versionados de .githooks mediante core.hooksPath.
 *
 * Se ejecuta automaticamente en `npm install` a traves del script "prepare".
 * Es deliberadamente tolerante: si no hay git o no es un repositorio (por
 * ejemplo en Hostinger, donde el codigo llega sin .git), no interrumpe la
 * instalacion de dependencias.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const HOOKS_DIR = '.githooks';

function main() {
  if (!fs.existsSync(path.join(ROOT, '.git'))) {
    console.log('Sin repositorio git: se omite la activacion de hooks.');
    return;
  }

  if (!fs.existsSync(path.join(ROOT, HOOKS_DIR, 'pre-push'))) {
    console.log(`No se encontro ${HOOKS_DIR}/pre-push: se omite la activacion de hooks.`);
    return;
  }

  // Asignar siempre es idempotente y evita leer la configuracion por tuberia.
  execFileSync('git', ['config', 'core.hooksPath', HOOKS_DIR], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  console.log(`Hooks de git activados (core.hooksPath=${HOOKS_DIR}).`);
}

try {
  main();
} catch (error) {
  console.warn(`No se pudieron activar los hooks de git: ${error.message}`);
  console.warn('El despliegue seguira funcionando, pero sin la comprobacion previa al push.');
}

// "prepare" nunca debe romper `npm install`.
process.exit(0);
