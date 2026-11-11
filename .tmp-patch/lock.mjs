// Bloquea el reactivo al comprobarlo: no se puede corregir después de ver la respuesta.
import fs from 'node:fs';

const PATH = 'C:/Users/lapomiguel/Documents/6to_grado_26/guia_estudio_6to_primer_trimestre.html';
let html = fs.readFileSync(PATH, 'utf8');

function apply(label, from, to) {
    const count = html.split(from).length - 1;
    if (count !== 1) throw new Error(`Anclaje "${label}" aparece ${count} veces (se esperaba 1)`);
    html = html.replace(from, to);
    console.log(`OK  ${label}`);
}

// 1. Utilidades de bloqueo
apply(
    'utilidades de bloqueo',
    '  /** Habilita "Comprobar" solo cuando hay respuesta. */',
    `  /** ¿Este reactivo ya fue comprobado? Una vez comprobado queda bloqueado. */
  function isLocked(card) {
    return card.getAttribute('data-locked') === '1';
  }

  /** Bloquea el reactivo: no se puede cambiar la respuesta después de ver el resultado. */
  function lockCard(card) {
    card.setAttribute('data-locked', '1');
    Array.prototype.forEach.call(card.querySelectorAll('input'), function (input) {
      input.disabled = true;
    });
  }

  /** Pinta la retroalimentación de un reactivo. */
  function renderFeedback(card, result) {
    var box = card.querySelector('.feedback-box');
    if (!box || !result) return;
    box.classList.remove('hidden');
    box.className = 'feedback-box mt-3 p-4 rounded-2xl text-sm border ' +
      (result.correct
        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
        : 'bg-rose-50 text-rose-900 border-rose-200');
    box.innerHTML = result.html;
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
  }

  /** Habilita "Comprobar" solo cuando hay respuesta. */`
);

// 2. El botón refleja el estado bloqueado
apply(
    'estado del botón con reactivo bloqueado',
    `  function updateCheckButton() {
    var btn = document.getElementById('btnCheck');
    if (!btn || !screens.length) return;
    var ready = hasAnswer(screens[current].card);
    btn.disabled = !ready;
    btn.classList.toggle('opacity-40', !ready);
    btn.classList.toggle('cursor-not-allowed', !ready);
  }`,
    `  function updateCheckButton() {
    var btn = document.getElementById('btnCheck');
    if (!btn || !screens.length) return;
    var card = screens[current].card;
    var locked = isLocked(card);
    var ready = locked || hasAnswer(card);
    btn.disabled = !ready;
    btn.classList.toggle('opacity-40', !ready);
    btn.classList.toggle('cursor-not-allowed', !ready);
    btn.textContent = locked ? 'Respondida' : 'Comprobar';
  }`
);

// 3. No ocultar la retroalimentación de un reactivo ya bloqueado
apply(
    'respetar el bloqueo al editar',
    `    var card = target.closest('.question-card');
    if (!card) return;
    var box = card.querySelector('.feedback-box');`,
    `    var card = target.closest('.question-card');
    if (!card || isLocked(card)) return;
    var box = card.querySelector('.feedback-box');`
);

// 4. checkCurrent: calificar, bloquear y no volver a tocar el reactivo
apply(
    'bloqueo al comprobar',
    `    var box = card.querySelector('.feedback-box');
    var result = gradeOne(screen);
    if (!box || !result) return;

    box.classList.remove('hidden');
    box.className = 'feedback-box mt-3 p-4 rounded-2xl text-sm border ' +
      (result.correct
        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
        : 'bg-rose-50 text-rose-900 border-rose-200');
    box.innerHTML = result.html;
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');

    save();

    var btn = document.getElementById('btnCheck');
    btn.textContent = result.correct ? '¡Correcto!' : 'Revisar';
    setTimeout(function () { btn.textContent = 'Comprobar'; }, 1800);
  }`,
    `    var result = gradeOne(screen);
    if (!result) return;

    renderFeedback(card, result);
    lockCard(card);
    save();
    updateCheckButton();
  }`
);

// 5. La guarda de bloqueo va antes del aviso de "primero responde"
apply(
    'salida temprana si ya está comprobado',
    `  function checkCurrent() {
    var screen = screens[current];
    var card = screen.card;

    // Sin respuesta no se califica`,
    `  function checkCurrent() {
    var screen = screens[current];
    var card = screen.card;

    // Una vez comprobado, el reactivo queda bloqueado.
    if (isLocked(card)) return;

    // Sin respuesta no se califica`
);

// 6. Guardar el bloqueo
apply(
    'guardar el estado bloqueado',
    '        if (entry.radio !== undefined || entry.texts) data[s.key] = entry;',
    `        if (isLocked(s.card)) entry.locked = true;
        if (entry.radio !== undefined || entry.texts || entry.locked) data[s.key] = entry;`
);

// 7. Restaurar el bloqueo al recargar
apply(
    'restaurar el bloqueo',
    `        if (entry.texts) {
          Object.keys(entry.texts).forEach(function (id) {
            var input = s.card.querySelector('#' + id);
            if (input) input.value = entry.texts[id];
          });
        }
      });`,
    `        if (entry.texts) {
          Object.keys(entry.texts).forEach(function (id) {
            var input = s.card.querySelector('#' + id);
            if (input) input.value = entry.texts[id];
          });
        }
        if (entry.locked) {
          renderFeedback(s.card, gradeOne(s));
          lockCard(s.card);
        }
      });`
);

// 8. Al terminar, todo queda bloqueado (modo revisión) y no se puede reenviar
apply(
    'bloquear todo al terminar',
    `    var result = computeResult();
    renderResult(result);`,
    `    var result = computeResult();
    screens.forEach(function (s) { lockCard(s.card); });
    save();
    renderResult(result);`
);

apply(
    'impedir reenvío tras terminar',
    `    document.getElementById('btnNext').addEventListener('click', function () {
      if (current < screens.length - 1) {`,
    `    document.getElementById('btnNext').addEventListener('click', function () {
      if (submitted) return;
      if (current < screens.length - 1) {`
);

fs.writeFileSync(PATH, html, 'utf8');
console.log(`\nArchivo actualizado (${Math.round(html.length / 1024)} KB)`);
