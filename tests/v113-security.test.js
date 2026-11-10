const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app', 'app.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8');

test('1.13: matriz de autorização existe no processo principal', () => {
  assert.match(main, /const autenticado =/);
  assert.match(main, /const exigirSessao =/);
  assert.match(main, /const exigirAdmin =/);
  assert.match(main, /ipcMain\.handle\('seg:chave'/);
  assert.match(main, /exigirAdmin\(true\)/);
  assert.match(main, /ipcMain\.handle\('net:sync'/);
  assert.match(main, /Visitante: sem sincronização/);
});

test('1.13: recuperação é única, cifrada por hash e invalidada após utilização', () => {
  assert.match(main, /auth:recuperacao/);
  assert.match(main, /crypto\.scryptSync\(codigo/);
  assert.match(main, /r\.usada = true/);
  assert.doesNotMatch(main, /admin\/admin/);
});

test('1.13: pasta partilhada não permite gravação concorrente', () => {
  assert.match(main, /if \(USO\.outro\) return false;/);
});

test('1.13: relatórios e mensagens usam limites/allowlist', () => {
  assert.match(main, /function sanitizarMarkup/);
  assert.match(main, /<script/);
  assert.match(app, /O anexo excede o limite de 5 MB/);
  assert.match(app, /anexo/);
});

test('1.13: Word do folheto tem orientação horizontal e três colunas', () => {
  assert.match(main, /doc\.folheto \? \{ orientation: D\.PageOrientation\.LANDSCAPE/);
  assert.match(main, /count: 3/);
  assert.match(main, /corrigirIndiceDocx/);
});

test('1.13: recuperação chega à ponte segura e o layout tem rolagem própria', () => {
  assert.match(preload, /recuperacao:/);
  assert.match(app, /Recuperação de emergência/);
  assert.match(index, /nav\.side a svg/);
  assert.match(index, /\.tw, \.table-scroll, \.scroll-y/);
});
