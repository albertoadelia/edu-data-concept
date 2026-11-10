// 1.10: sessão no processo principal, validação IPC, numeração das legendas no Word e páginas dos índices no PDF
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '..', 'app', 'app.js'), 'utf8');
const extrair = (src, ini, fim) => { const i = src.indexOf(ini); const j = src.indexOf(fim, i); return src.slice(i, j); };
test('Entrada verificada no processo principal (scrypt + comparação em tempo constante)', () => {
  const b = extrair(main, "ipcMain.handle('auth:entrar'", "ipcMain.handle('auth:visitante'"); assert.ok(/scrypt/.test(b) || /verificarSenha/.test(b)); assert.ok(/timingSafeEqual/.test(main)); assert.ok(/SESSAO_LOCAL\.perfil =/.test(main));
});
test('Visitante só grava o registo de actividade e a pasta concorrente bloqueia gravações', () => {
  assert.ok(/if \(c === 'registo'\) return true;/.test(main), 'registo isento');
  assert.ok(/if \(USO\.outro\) return false;/.test(main), 'pasta concorrente bloqueia');
  assert.ok(/if \(SESSAO_LOCAL\.perfil === 0\) return false;/.test(main), 'visitante não grava');
});
test('IPC: só objectos simples, sem chaves com caminhos', () => {
  const objSimples = eval(extrair(main, '(o) => !!o', '\nconst colFile').trim().replace(/;$/, ''));
  assert.ok(objSimples({ a: 1, '2025_90344': {} })); assert.ok(!objSimples(null)); assert.ok(!objSimples([1])); assert.ok(!objSimples({ '../x': 1 })); assert.ok(!objSimples({ 'a/b': 1 })); assert.ok(!objSimples(Object.create({ x: 1 })));
});
test('Word: as legendas recebem o número (1, 2, 3 por rótulo)', async () => {
  const src = extrair(main, 'async function numerarSeq', "ipcMain.handle('rel:docx'").replace("require('./lib/geo.cjs')", `require(${JSON.stringify(path.join(__dirname, '..', 'lib', 'geo.cjs'))})`);
  const numerarSeq = eval('(' + src + ')'); const D = require('../lib/docx.cjs'); const { JSZip } = require('../lib/geo.cjs');
  const P = (l) => new D.Paragraph({ children: [new D.TextRun(l + ' '), new D.SequentialIdentifier(l)] });
  const b = await numerarSeq(await D.Packer.toBuffer(new D.Document({ sections: [{ children: [P('Tabela'), P('Mapa'), P('Tabela')] }] })));
  const x = await (await JSZip.loadAsync(b)).file('word/document.xml').async('string'); assert.deepStrictEqual((x.match(/<w:t>(\d+)<\/w:t>/g) || []).map((m) => m.replace(/\D/g, '')), ['1', '1', '2']);
});
test('PDF: índices com marcas de página e títulos numerados', () => { assert.ok(/QQPG\$\{id\}QQ/.test(app)); assert.ok(/data-pg="\$\{id\}"/.test(app)); assert.ok(/paginasDasMarcas/.test(main)); assert.ok(/numeração dos títulos: 1, 1\.1, 1\.1\.1/.test(app)); });
test('Glossário: termo a negrito seguido de dois pontos', () => { assert.ok(app.includes(`'<p class="def"><b>$1:</b> '`)); });
test('Exemplos de nomes genéricos', () => { assert.ok(!/placeholder: 'ex\.: alberto/.test(app)); assert.ok(/Jane Doe/.test(app)); });
