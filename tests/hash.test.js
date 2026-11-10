const test = require('node:test'); const assert = require('node:assert'); const crypto = require('crypto');
// a mesma forma canónica usada em hashAno (app/v19.js)
const canonico = (o) => (Array.isArray(o) ? '[' + o.map(canonico).join(',') + ']' : o && typeof o === 'object' ? '{' + Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canonico(o[k])).join(',') + '}' : typeof o === 'number' ? String(+o) : JSON.stringify(o ?? null));
const h = (x) => crypto.createHash('sha256').update(canonico(x)).digest('hex');
test('mudar um só valor (mesmo comprimento) muda a impressão digital', () => { const a = { esc: 1, marco: { alunos: [{ id: { 6: [10, 12] } }] } }; const b = { esc: 1, marco: { alunos: [{ id: { 6: [12, 10] } }] } }; assert.notStrictEqual(h(a), h(b)); });
test('a ordem das chaves não muda a impressão digital', () => { assert.strictEqual(h({ a: 1, b: 2 }), h({ b: 2, a: 1 })); });
test('o código de hashAno usa a forma canónica', () => { const s = require('fs').readFileSync(require('path').join(__dirname, '..', 'app', 'v19.js'), 'utf8'); assert.ok(s.includes(canonico.toString().replace(/^\(o\) => /, '').slice(0, 40))); });
