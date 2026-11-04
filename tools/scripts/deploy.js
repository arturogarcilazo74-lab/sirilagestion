#!/usr/bin/env node
/**
 * Despliegue seguro de Sirila Gestion.
 *
 * Garantiza el invariante del proyecto: dist-app (el artefacto que Hostinger
 * sirve en produccion, ver server/server.js:59-63) SIEMPRE viaja en el mismo
 * push que el codigo fuente que lo genero.
 *
 * Uso:
 *   npm run deploy -- "mensaje del cambio"   Compila, commitea y empuja a main
 *   npm run deploy:check                     Solo verifica si dist-app esta al dia
 *   npm run deploy -- "msg" --no-push        Prepara los commits sin empujar
 *   npm run deploy -- "msg" --dry-run        Muestra lo que haria, sin tocar git
 *   npm run deploy -- "msg" --skip-typecheck Omite tsc (no recomendado)
 *
 * Salidas: 0 = ok, 1 = error o dist-app desactualizado.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const BUILD_ENTRY = path.join(ROOT, 'dist-app', 'index.html');
const TARGET_BRANCH = 'main';

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const message = argv.filter((a) => !a.startsWith('--')).join(' ').trim();

const CHECK_ONLY = flags.has('--check');
const NO_PUSH = flags.has('--no-push');
const SKIP_TYPECHECK = flags.has('--skip-typecheck');
const DRY_RUN = flags.has('--dry-run');

const step = (n, msg) => console.log(`\n[${n}] ${msg}`);
const ok = (msg) => console.log(`  OK  ${msg}`);
const fail = (msg) => {
  console.error(`\nERROR: ${msg}\n`);
  process.exit(1);
};

/** Ejecuta un comando heredando stdout/stderr (sin capturar la salida). */
function run(cmd) {
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

/** Ejecuta un comando y devuelve su salida recortada. */
function capture(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
}

/**
 * Archivos de dist-app que no coinciden con lo commiteado (HEAD).
 *
 * Se usa git diff en lugar de git status a proposito: core.autocrlf marca los
 * artefactos como "modificados" aunque su contenido sea identico. git diff
 * compara contenido real, y los archivos nuevos (hashes de chunks) se detectan
 * aparte como no rastreados. --ignore-cr-at-eol evita falsos positivos si un
 * checkout dejo algun archivo con CRLF.
 */
function distAppDrift() {
  const modified = capture('git diff --name-status --ignore-cr-at-eol HEAD -- dist-app')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const untracked = capture('git ls-files --others --exclude-standard -- dist-app')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((f) => `A\t${f}`);

  return [...modified, ...untracked];
}

/** Archivos del codigo fuente (todo menos dist-app) pendientes de commit. */
function sourceChanges() {
  return capture('git status --porcelain -- . ":(exclude)dist-app"')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

console.log('=== Sirila Gestion - Despliegue verificado ===');

// ---------------------------------------------------------------------------
// Paso 1: contexto del repositorio
// ---------------------------------------------------------------------------
step(1, 'Verificando repositorio');
try {
  capture('git rev-parse --is-inside-work-tree');
} catch {
  fail('No es un repositorio git.');
}

const branch = capture('git rev-parse --abbrev-ref HEAD');
if (branch !== TARGET_BRANCH && !CHECK_ONLY) {
  fail(
    `Estas en la rama "${branch}" y el despliegue solo opera sobre "${TARGET_BRANCH}".\n` +
      `  Cambia con: git checkout ${TARGET_BRANCH}`
  );
}
ok(`Rama: ${branch}`);

const gitDir = capture('git rev-parse --git-dir');
for (const marker of ['rebase-merge', 'rebase-apply', 'MERGE_HEAD']) {
  if (fs.existsSync(path.join(ROOT, gitDir, marker))) {
    fail(`Hay una operacion de git en curso (${marker}). Termina antes de desplegar.`);
  }
}
ok('Sin merges ni rebases pendientes');

// ---------------------------------------------------------------------------
// Paso 2: comprobacion de tipos
// ---------------------------------------------------------------------------
if (!SKIP_TYPECHECK) {
  step(2, 'Comprobando tipos (tsc --noEmit)');
  try {
    run('npx tsc --noEmit');
  } catch {
    fail('La comprobacion de tipos fallo. Corrige los errores antes de desplegar.');
  }
  ok('Tipos sin errores');
} else {
  step(2, 'Comprobacion de tipos OMITIDA (--skip-typecheck)');
}

// ---------------------------------------------------------------------------
// Paso 3: compilar (antes de commitear, para detectar que dist-app queda al dia)
// ---------------------------------------------------------------------------
step(3, 'Compilando frontend (build atomico -> dist-app)');
try {
  run('node tools/scripts/build-dist.js');
} catch {
  fail('La compilacion fallo. dist-app quedo intacto y NO se desplego.');
}
if (!fs.existsSync(BUILD_ENTRY)) {
  fail(`La compilacion no genero ${path.relative(ROOT, BUILD_ENTRY)}.`);
}
ok('dist-app generado correctamente');

// ---------------------------------------------------------------------------
// Paso 4: comparar el artefacto con lo commiteado
// ---------------------------------------------------------------------------
step(4, 'Verificando sincronizacion de dist-app');
const drift = distAppDrift();

if (CHECK_ONLY) {
  if (drift.length > 0) {
    console.error('\n  dist-app esta DESACTUALIZADO respecto al codigo fuente:');
    drift.slice(0, 15).forEach((f) => console.error(`    ${f}`));
    if (drift.length > 15) {
      console.error(`    ... y ${drift.length - 15} archivo(s) mas`);
    }
    fail('Ejecuta: npm run deploy -- "mensaje del cambio"');
  }
  ok('dist-app esta al dia con el codigo fuente');
  console.log('\nVerificacion completada.\n');
  process.exit(0);
}

const source = sourceChanges();

if (drift.length === 0 && source.length === 0) {
  ok('Nada que desplegar: el arbol esta limpio y dist-app coincide');
  console.log('\nSin cambios.\n');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Paso 5: registrar commits
// ---------------------------------------------------------------------------
step(5, 'Registrando commits');

if (source.length > 0) {
  if (!message) {
    fail(
      'Hay cambios sin commitear y no diste mensaje.\n' +
        '  Uso: npm run deploy -- "descripcion del cambio"'
    );
  }
  if (DRY_RUN) {
    ok(`(dry-run) Se commitearia(n) ${source.length} archivo(s): ${message}`);
  } else {
    run('git add -A -- . ":(exclude)dist-app"');
    const quoted = message.replace(/"/g, '\\"');
    run(`git commit -m "${quoted}"`);
    ok(`Commit creado: ${message}`);
  }
} else {
  ok('Sin cambios de codigo pendientes');
}

if (drift.length > 0) {
  if (DRY_RUN) {
    ok(`(dry-run) Se commitearia dist-app (${drift.length} archivo(s))`);
  } else {
    run('git add -A -- dist-app');
    run('git commit -m "chore(build): regenerar dist-app"');
    ok(`Commit de build creado (${drift.length} archivo(s))`);
  }
} else {
  ok('dist-app ya estaba al dia');
}

// ---------------------------------------------------------------------------
// Paso 6: publicar
// ---------------------------------------------------------------------------
if (NO_PUSH || DRY_RUN) {
  step(6, 'Push OMITIDO');
  console.log('\nLos commits estan listos localmente. Publica con: git push origin main\n');
  process.exit(0);
}

step(6, `Empujando a origin/${TARGET_BRANCH}`);
try {
  run(`git push origin ${TARGET_BRANCH}`);
} catch {
  fail('El push fallo. Revisa la salida de git arriba (credenciales, red o rechazo del remoto).');
}

console.log('\n=== Despliegue completado: dist-app y fuente quedaron sincronizados ===\n');
