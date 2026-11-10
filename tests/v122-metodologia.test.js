// 1.22.0: estrutura do SNE por ano (classes de entrada e de conclusão) — confirmada pelo utilizador
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'app.js'), 'utf8');

function extrair(nome) {
  const i = src.indexOf(`function ${nome}(ano, nivel) {`);
  assert.ok(i >= 0, 'existe ' + nome);
  const fim = src.indexOf('\n}', i);
  // eslint-disable-next-line no-eval
  return eval('(' + src.slice(i, fim + 2).replace(/^function /, 'function ') + ')');
}
const entradaNivel = extrair('entradaNivel');
const terminalNivel = extrair('terminalNivel');
const eq = (a, b) => assert.deepEqual(a, b);

test('classes de entrada (novos ingressos) por nível e ano', () => {
  // EP / Todos: sempre 1ª classe (admissão ao sistema)
  for (const a of [2020, 2022, 2023, 2026]) { eq(entradaNivel(a, 'Todos'), [1]); eq(entradaNivel(a, 'EP'), [1]); }
  // ES1: 8ª (≤2022) · 7ª+8ª (2023) · 7ª (≥2024)
  eq(entradaNivel(2022, 'ESG1'), [8]); eq(entradaNivel(2023, 'ESG1'), [7, 8]); eq(entradaNivel(2024, 'ESG1'), [7]); eq(entradaNivel(2026, 'ESG1'), [7]);
  // ES2: 11ª (≤2025) · 10ª+11ª (2026) · 10ª (≥2027)
  eq(entradaNivel(2025, 'ESG2'), [11]); eq(entradaNivel(2026, 'ESG2'), [10, 11]); eq(entradaNivel(2027, 'ESG2'), [10]);
});

test('classes de conclusão/exame por nível e ano (com anos de transição)', () => {
  // EP: 7ª (≤2021) · 6ª+7ª (2022) · 6ª (≥2023)
  eq(terminalNivel(2021, 'EP'), [7]); eq(terminalNivel(2022, 'EP'), [6, 7]); eq(terminalNivel(2023, 'EP'), [6]); eq(terminalNivel(2026, 'Todos'), [6]);
  // ES1: 10ª (≤2024) · 9ª+10ª (2025) · 9ª (≥2026)
  eq(terminalNivel(2024, 'ESG1'), [10]); eq(terminalNivel(2025, 'ESG1'), [9, 10]); eq(terminalNivel(2026, 'ESG1'), [9]);
  // ES2: sempre 12ª
  for (const a of [2020, 2025, 2027]) eq(terminalNivel(a, 'ESG2'), [12]);
});

test('tbc soma as classes terminais e novos usa a classe de entrada do nível', () => {
  assert.ok(/for \(const fc of fins\) \{ const cfc = xl\?\.byCl\[fc\]; if \(cfc\) \{ aprC \+= gs\(cfc\.Aprov\); fimC \+= gs\(cfc\.Fim\); \} \}/.test(src), 'tbc soma classes terminais');
  assert.ok(/novos: novosV,/.test(src) && /entradaNivel\(x\.ano, x\.f\?\.nivel \|\| 'Todos'\)\.reduce/.test(src), 'novos por classe de entrada');
});
