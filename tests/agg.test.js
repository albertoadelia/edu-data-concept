// Testes do agregador (node --test tests): valores conhecidos e resultados esperados
const test = require('node:test'); const assert = require('node:assert');
const A = require('../app/agg.js');
const formados = { antigo: new Set([1]), SNE: new Set([1]) };
const tipo = () => 'Pública';
const soma = (rows, k, f = () => true) => rows.filter(f).reduce((a, r) => [a[0] + (r[k]?.[0] || 0), a[1] + (r[k]?.[1] || 0)], [0, 0]);
test('níveis de ensino', () => { assert.equal(A.NIVEL(1001), 'EP'); assert.equal(A.NIVEL(1002), 'EP'); assert.equal(A.NIVEL(1011), 'ESG1'); assert.equal(A.NIVEL(1021), 'ESG2'); assert.equal(A.NIVEL(3101), 'ETP'); });
test('grupos de idade', () => { assert.deepEqual(A.parseAge('6-'), { lo: -Infinity, hi: 6, rep: 6, low: true }); assert.equal(A.parseAge('18+').lo, 18); assert.deepEqual([A.parseAge('19-20').lo, A.parseAge('19-20').hi], [19, 20]); });
test('alunos por sexo, idade oficial, sobreidade e repetentes', () => {
  const f = { ano: 2025, esc: 1, dist: 905, sis: 'SNE', marco: { alunos: [{ ens: 1001, tur: 1, cl: 1, id: { '6': [10, 12], '7': [3, 2], '9': [1, 0] }, rep: [2, 1], tp: 1, tm: 0 }], prof: [{ ens: 1001, q: 1, v: [1, 1] }, { ens: 1001, q: 2, v: [1, 0] }] }, fim: { aprov: [{ ens: 1001, cl: 1, fim: [13, 13], aprov: [11, 12] }] } };
  const r = A.resumo([f], tipo, formados);
  assert.deepEqual(soma(r.rows, 'Matric'), [14, 14]);
  assert.deepEqual(soma(r.rows, 'IdOf'), [14, 14]);  // 6–11 anos no SNE
  assert.deepEqual(soma(r.rows, 'Sob'), [1, 0]);     // 9 anos na 1ª classe (≥ 1+7+1)
  assert.deepEqual(soma(r.rows, 'Rep'), [2, 1]);
  assert.deepEqual(soma(r.rows, 'Prof'), [2, 1]); assert.deepEqual(soma(r.rows, 'ProfForm'), [1, 1]);
  assert.deepEqual(soma(r.rows, 'Aprov'), [11, 12]);
  assert.equal(r.rows.reduce((a, x) => a + (x.Escolas || 0), 0), 1);
});
test('sem mapas', () => { const r = A.resumo([], tipo, formados); assert.deepEqual(r.rows, []); assert.equal(r.n, 0); });
test('duas escolas somam', () => {
  const mk = (esc, n) => ({ ano: 2024, esc, dist: 905, sis: 'SNE', marco: { alunos: [{ ens: 1011, cl: 7, id: { '12': [n, n] }, rep: [0, 0], tp: 1, tm: 0 }] }, fim: {} });
  const r = A.resumo([mk(1, 5), mk(2, 7)], tipo, formados);
  assert.deepEqual(soma(r.rows, 'Matric'), [12, 12]);
});
