// El autoguardado se separa por reapertura, para que al reabrir empiece limpio.
import fs from 'node:fs';

const PATH = 'C:/Users/lapomiguel/Documents/6to_grado_26/guia_estudio_6to_primer_trimestre.html';
let html = fs.readFileSync(PATH, 'utf8');

const from = `  function storageKey() {
    return 'sirila_guia_' + ((CFG && CFG.assignmentId) || 'standalone');
  }`;

const to = `  function storageKey() {
    var id = (CFG && CFG.assignmentId) || 'standalone';
    // Si el docente reabrió la actividad, cambia la marca y se empieza limpio.
    var reopen = (CFG && CFG.reopenedAt) ? '_' + CFG.reopenedAt : '';
    return 'sirila_guia_' + id + reopen;
  }`;

const count = html.split(from).length - 1;
if (count !== 1) throw new Error(`Anclaje de storageKey aparece ${count} veces (se esperaba 1)`);

html = html.replace(from, to);
fs.writeFileSync(PATH, html, 'utf8');
console.log('storageKey actualizado.');
