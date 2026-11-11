// Corrige el estado del botón: bloqueado implica deshabilitado.
import fs from 'node:fs';

const PATH = 'C:/Users/lapomiguel/Documents/6to_grado_26/guia_estudio_6to_primer_trimestre.html';
let html = fs.readFileSync(PATH, 'utf8');

const from = `    var card = screens[current].card;
    var locked = isLocked(card);
    var ready = locked || hasAnswer(card);
    btn.disabled = !ready;
    btn.classList.toggle('opacity-40', !ready);
    btn.classList.toggle('cursor-not-allowed', !ready);
    btn.textContent = locked ? 'Respondida' : 'Comprobar';`;

const to = `    var card = screens[current].card;
    var locked = isLocked(card);
    var canCheck = !locked && hasAnswer(card);
    btn.disabled = !canCheck;
    btn.classList.toggle('opacity-40', !canCheck);
    btn.classList.toggle('cursor-not-allowed', !canCheck);
    btn.textContent = locked ? 'Respondida' : 'Comprobar';`;

const count = html.split(from).length - 1;
if (count !== 1) throw new Error(`Anclaje del botón aparece ${count} veces (se esperaba 1)`);

html = html.replace(from, to);
fs.writeFileSync(PATH, html, 'utf8');
console.log('Estado del botón corregido.');
