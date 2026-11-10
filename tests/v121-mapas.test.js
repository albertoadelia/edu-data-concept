// 1.21.0: mais modelos de mapas interactivos + código de recuperação mostrado ao criar a 1.ª conta
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app', 'app.js'), 'utf8');

test('novos modelos de mapa presentes (bivariado, comparar, cobertura)', () => {
  const m = app.match(/const MAPA_MODELOS = \[([^\]]*(?:\][^;]*)*)\];/);
  assert.ok(m, 'MAPA_MODELOS existe');
  for (const k of ['coropleto', 'classes', 'simbolos', 'bivariado', 'comparar', 'cobertura', 'escolas']) assert.ok(app.includes(`'${k}'`), 'modelo ' + k);
  assert.ok(/function mapaCorDiv/.test(app), 'escala divergente para a variação');
});

test('cada modelo tem o seu ramo de desenho', () => {
  for (const k of ['bivariado', 'comparar', 'cobertura']) assert.ok(new RegExp(`st\\.modelo === '${k}'`).test(app), 'ramo ' + k);
  assert.ok(/coberturaDe\(st\.ano, d\)/.test(app), 'cobertura usa coberturaDe');
  assert.ok(/valsBase\[d\] = IX\(st\.anoBase/.test(app), 'comparar lê o ano base');
});

test('o código de recuperação é mostrado ao criar a 1.ª conta (não só no login)', () => {
  // no ramo "vazio" de criar(), depois de entrar, mostra-se o código antes de entrou()
  assert.ok(/if \(r\.recuperacao\) await codigoBox\('Código de recuperação do criador'[^;]*;\s*\n\s*await entrou\(r\.utilizador, d \?/.test(app), 'código mostrado no arranque');
});
