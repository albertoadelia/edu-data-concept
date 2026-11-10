// 1.22.0: exportar mapas (copiar imagem / PNG / SVG)
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app', 'app.js'), 'utf8');
const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const preload = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');

test('renderer tem helpers e botões de exportação de mapa', () => {
  for (const f of ['mapaSVGTexto', 'mapaParaPNG', 'botoesExportarMapa']) assert.ok(app.includes('function ' + f) || app.includes(f + ' ='), 'helper ' + f);
  for (const t of ['Copiar imagem', 'Guardar PNG', 'Guardar SVG']) assert.ok(app.includes(`'${t}'`), 'botão ' + t);
  assert.ok(/botoesExportarMapa\(box, \(\) => `Mapa_/.test(app), 'botões ligados ao mapa interactivo');
});

test('cópia de imagem nativa: IPC no main e ponte no preload', () => {
  assert.ok(/ipcMain\.handle\('img:clip'/.test(main), 'handler img:clip');
  assert.ok(/nativeImage\.createFromDataURL/.test(main) && /clipboard\.writeImage\(/.test(main), 'usa clipboard nativo');
  assert.ok(/clipboard, nativeImage \} = require\('electron'\)/.test(main), 'importa clipboard/nativeImage');
  assert.ok(/copiarImagem: \(dataURL\) => ipcRenderer\.invoke\('img:clip', dataURL\)/.test(preload), 'preload expõe copiarImagem');
});
