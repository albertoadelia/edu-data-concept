// 1.12.0: credencial universal removida, registos recusados, esvaziar tudo, folheto dobrável
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '..', 'app', 'app.js'), 'utf8');
const v20 = fs.readFileSync(path.join(__dirname, '..', 'app', 'v20.js'), 'utf8');
test('Credencial universal admin/admin não existe no processo principal', () => {
  assert.ok(!/id === 'admin' && senha === 'admin'/.test(main), 'admin/admin não pode ser fallback');
  assert.ok(!/oculto: true/.test(main), 'a sessão oculta não pode ser criada no login');
});
test('O super-administrador oculto não é registado na actividade', () => {
  assert.ok(/const ehOculto = \(\) => !!\(S\.sessao && S\.sessao\.oculto\)/.test(app));
  assert.ok(/registar = async \(accao, extra = \{\}\) => \{ if \(ehOculto\(\)\) return;/.test(app));
});
test('A sincronização regista cada registo recusado com o motivo', () => {
  assert.ok(/const rej = \(c2, id2, v2, motivo\)/.test(app));
  assert.ok(/config\/rejeitados/.test(app));
  assert.ok(/'Escola nova: só a DPE cria/.test(app));
  assert.ok(/trancado ou ano já publicado/.test(app));
});
test('A lista de recusados é local (não sincroniza) e limitada', () => {
  assert.ok(/CONFIG_LOCAL = new Set\(\[[^\]]*'rejeitados'/.test(app));
  assert.ok(/\.slice\(0, 3000\)/.test(app));
});
test('aplicarDocs cede a interface em lotes grandes (não bloqueia)', () => { assert.ok(/if \(\+\+__n % 150 === 0\) await new Promise/.test(app)); });
test('Esvaziar o sistema apaga também os shapefiles e a geografia', () => {
  assert.ok(/config\/limites'[\s\S]{0,80}config\/geografia/.test(v20) || /'config\/limites', 'config\/limitesPostos'/.test(v20));
});
test('Folheto em A4 horizontal (tríptico)', () => { assert.ok(/size:A4 landscape/.test(app)); assert.ok(/grid-template-columns:1fr 1fr 1fr/.test(app)); });
test('PDF do folheto em paisagem', () => { assert.ok(/opts\.paisagem/.test(main)); assert.ok(/landscape: !!paisagem/.test(main)); });
