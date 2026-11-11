// Verifica que al reabrir la actividad el alumno empiece con el estado limpio.
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

function makeDom(cfg, seedKey, seedValue) {
    const errors = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => errors.push(e.message));
    const dom = new JSDOM(html, {
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        url: 'https://sirila.test/',
        virtualConsole: vc,
        beforeParse(window) {
            window.SIRILA_CONFIG = cfg;
            window.scrollTo = () => {};
            if (seedKey) window.localStorage.setItem(seedKey, JSON.stringify(seedValue));
        }
    });
    return { dom, errors };
}

const ready = (dom) => new Promise(r => {
    if (dom.window.document.readyState === 'complete') return r();
    dom.window.addEventListener('load', () => r());
    setTimeout(r, 2000);
});

const baseCfg = { assignmentId: 'R', title: 'Guía', fields: ['Lenguajes'], maxAttempts: 1 };
const lockedState = { answers: { L1: { radio: KEY.L1.ans, locked: true } }, at: Date.now() };

// 1. Sin reapertura: el estado guardado se recupera (comportamiento esperado).
{
    const { dom } = makeDom({ ...baseCfg, reopenedAt: null }, 'sirila_guia_R', lockedState);
    await ready(dom);
    const doc = dom.window.document;
    const card = doc.querySelector('#qcard-L1');
    check('sin reapertura recupera el reactivo bloqueado', [...card.querySelectorAll('input')].every(i => i.disabled));
    check('sin reapertura conserva la retroalimentación', !card.querySelector('.feedback-box').classList.contains('hidden'));
    dom.window.close();
}

// 2. Con reapertura: ignora el estado anterior y arranca limpio.
{
    const { dom, errors } = makeDom({ ...baseCfg, reopenedAt: '2026-11-04T10:00:00.000Z' }, 'sirila_guia_R', lockedState);
    await ready(dom);
    const doc = dom.window.document;
    const card = doc.querySelector('#qcard-L1');
    check('tras reabrir, el reactivo NO está bloqueado', [...card.querySelectorAll('input')].every(i => !i.disabled));
    check('tras reabrir, no hay retroalimentación previa', card.querySelector('.feedback-box').classList.contains('hidden'));
    check('tras reabrir, el botón vuelve a Comprobar', doc.getElementById('btnCheck').textContent.trim() === 'Comprobar');
    check('sin errores de página', errors.length === 0);
    dom.window.close();
}

let failed = 0;
for (const [l, p] of checks) { console.log(`${p ? 'OK  ' : 'FALLO'} ${l}`); if (!p) failed++; }
console.log(`\n${checks.length - failed}/${checks.length} comprobaciones correctas`);
process.exit(failed === 0 ? 0 : 1);
