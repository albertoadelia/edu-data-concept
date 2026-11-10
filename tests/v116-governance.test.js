const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8');
const pkg = require(path.join(root, 'package.json'));

test('1.16: governação apresenta fluxo de estados e pendências', () => {
  assert.match(app, /Centro de qualidade e governação \(1\.16\)/);
  assert.match(app, /Rascunho → Validado → Revisto → Enviado → Aceite → Fechado/);
  assert.match(app, /Conflitos por resolver/);
});

test('1.16: sincronização expõe fases operacionais', () => {
  for (const fase of ['preparar', 'receber', 'validar', 'enviar', 'aplicar', 'concluir']) assert.match(app, new RegExp(`fase\\('${fase}'\\)`));
  assert.match(app, /SYNC\.fase/);
});

test('1.16: interface tem foco visível e suporte de contraste', () => {
  assert.match(html, /:focus-visible/);
  assert.match(html, /prefers-contrast/);
  assert.match(html, /quality-grid/);
});

test('1.16: permissões continuam centralizadas no processo principal', () => {
  assert.match(main, /exigirColecao/);
  assert.match(main, /exigirDistrito/);
  assert.match(main, /emergenciaAte/);
});

test('versão do pacote é 1.22.0', () => assert.equal(pkg.version, '1.22.0'));
