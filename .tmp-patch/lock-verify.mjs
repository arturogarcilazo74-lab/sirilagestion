// Verifica el bloqueo del reactivo tras comprobarlo.
import fs from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const PATH = 'C:/Users/lapomiguel/Documents/6to_grado_26/guia_estudio_6to_primer_trimestre.html';
const html = fs.readFileSync(PATH, 'utf8');

const marker = 'var ANSWER_KEY = ';
const start = html.indexOf(marker) + marker.length;
let depth = 0, end = start;
for (let i = start; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const KEY = new Function('return ' + html.slice(start, end))();

const checks = [];
const check = (l, p) => checks.push([l, p]);

function makeDom({ savedState } = {}) {
    const errors = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => errors.push(e.message));
    const dom = new JSDOM(html, {
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        url: 'https://sirila.test/',
        virtualConsole: vc,
        beforeParse(window) {
            window.SIRILA_CONFIG = { assignmentId: 'LOCK', title: 'Guía', fields: ['Lenguajes', 'Saberes', 'Etica', 'Humano'], maxAttempts: 1 };
            window.scrollTo = () => {};
            window.addEventListener('error', e => errors.push(e.message));
            if (savedState) {
                try { window.localStorage.setItem('sirila_guia_LOCK', JSON.stringify(savedState)); } catch (e) { errors.push('localStorage: ' + e.message); }
            }
        }
    });
    return { dom, errors };
}

const ready = (dom) => new Promise(r => {
    if (dom.window.document.readyState === 'complete') return r();
    dom.window.addEventListener('load', () => r());
    setTimeout(r, 2000);
});

// ---------------------------------------------------------------- A. bloqueo
{
    const { dom, errors } = makeDom();
    await ready(dom);
    const doc = dom.window.document;

    const radio = doc.querySelector('#qcard-L1 input[name="L1"][value="' + KEY.L1.ans + '"]');
    radio.checked = true;
    radio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const btn = doc.getElementById('btnCheck');
    check('antes de comprobar el botón dice Comprobar', btn.textContent.trim() === 'Comprobar');
    btn.click();

    const card = doc.querySelector('#qcard-L1');
    const inputs = [...card.querySelectorAll('input')];
    check('tras comprobar todos los campos quedan bloqueados', inputs.length > 0 && inputs.every(i => i.disabled));
    check('el botón pasa a decir Respondida', btn.textContent.trim() === 'Respondida');
    check('el botón queda deshabilitado', btn.disabled === true);
    check('la retroalimentación sigue visible', !card.querySelector('.feedback-box').classList.contains('hidden'));

    // Reintentar comprobar no debe cambiar nada ni romper.
    btn.disabled = false;
    btn.click();
    check('recomprobar no altera el resultado', card.querySelector('.feedback-box').textContent.includes(KEY.L1.exp.slice(0, 20)));
    check('sin errores al recomprobar', errors.length === 0);

    dom.window.close();
}

// ---------------------------------------------------------------- B. si falla, también bloquea
{
    const { dom } = makeDom();
    await ready(dom);
    const doc = dom.window.document;

    const wrong = ['A', 'B', 'C', 'D'].find(v => v !== KEY.L1.ans);
    const radio = doc.querySelector('#qcard-L1 input[name="L1"][value="' + wrong + '"]');
    radio.checked = true;
    radio.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    doc.getElementById('btnCheck').click();

    const card = doc.querySelector('#qcard-L1');
    check('una respuesta incorrecta también bloquea', [...card.querySelectorAll('input')].every(i => i.disabled));
    check('muestra la correcta pero ya no se puede corregir', card.querySelector('.feedback-box').textContent.includes('La opción correcta es'));

    dom.window.close();
}

// ---------------------------------------------------------------- C. persiste al recargar
{
    const saved = { answers: { L1: { radio: KEY.L1.ans, locked: true } }, at: Date.now() };
    const { dom } = makeDom({ savedState: saved });
    await ready(dom);
    const doc = dom.window.document;

    const card = doc.querySelector('#qcard-L1');
    check('al recargar el reactivo sigue bloqueado', [...card.querySelectorAll('input')].every(i => i.disabled));
    check('al recargar se conserva la retroalimentación', !card.querySelector('.feedback-box').classList.contains('hidden'));
    check('al recargar el botón dice Respondida', doc.getElementById('btnCheck').textContent.trim() === 'Respondida');

    dom.window.close();
}

// ---------------------------------------------------------------- D. al terminar, todo bloqueado
{
    const { dom, errors } = makeDom();
    await ready(dom);
    const doc = dom.window.document;

    let guard = 0;
    while (guard++ < 200) {
        const card = doc.querySelector('.screen.active .question-card');
        const key = card.id.replace('qcard-', '');
        const item = KEY[key];
        if (!item.type && item.ans) {
            const r = card.querySelector('input[name="' + key + '"][value="' + item.ans + '"]');
            if (r) { r.checked = true; r.dispatchEvent(new dom.window.Event('change', { bubbles: true })); }
        } else if (item.type === 'numeric') {
            card.querySelector('#sn1_val').value = String(item.ans);
        } else if (item.type === 'circunferencia') {
            card.querySelector('#sn2_d').value = String(item.d);
            card.querySelector('#sn2_c1').value = String(item.c1);
            card.querySelector('#sn2_total').value = String(item.total);
        } else if (item.type === 'sucesion') {
            card.querySelector('#sn3_cant').value = String(item.cant);
            card.querySelector('#sn3_pos').value = String(item.pos);
        } else if (item.type === 'open') {
            ['regla1', 'regla2', 'regla3'].forEach(id => { card.querySelector('#' + id).value = 'Respeta los lugares y cuida el espacio'; });
        }
        const next = doc.getElementById('btnNext');
        const last = next.textContent.trim() === 'Terminar';
        doc.getElementById('btnCheck').click();
        if (last) {
            dom.window.confirm = () => true;
            next.click();
            break;
        }
        next.click();
    }

    const r = dom.window.__SIRILA_GUIA_RESULT__;
    check('termina con 45 reactivos', !!r && r.total === 45);
    check('la nota es 10 con todo correcto', !!r && r.score === 10);
    const allInputs = [...doc.querySelectorAll('.question-card input')];
    check('al terminar todos los campos quedan bloqueados', allInputs.length > 0 && allInputs.every(i => i.disabled));
    check('sin errores de página', errors.length === 0);

    dom.window.close();
}

let failed = 0;
for (const [l, p] of checks) { console.log(`${p ? 'OK  ' : 'FALLO'} ${l}`); if (!p) failed++; }
console.log(`\n${checks.length - failed}/${checks.length} comprobaciones correctas`);
process.exit(failed === 0 ? 0 : 1);
