// verificações estáticas das regras do servidor e da protecção local (relatórios técnicos de 01/11/2026)
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app', 'app.js'), 'utf8');
const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
test('RLS: escolas de outro distrito só com o ano publicado da própria linha', () => {
  assert.ok(/colecao = 'escolas' and ano is not null and exists \(select 1 from public\.educstat_publicados p where p\.ano = educstat_docs\.ano\)/.test(app));
  assert.ok(!/or exists \(select 1 from public\.educstat_publicados\)\)\)/.test(app), 'o exists global já não pode existir');
});
test('Presença: dados técnicos separados da presença pública', () => {
  assert.ok(/presenca_tec/.test(main)); assert.ok(/colecao=not\.in\.\(presenca,presenca_tec\)/.test(main));
});
test('Sem palavra-passe inicial previsível nas contas novas', () => { assert.ok(/senhaAleatoria/.test(app)); assert.ok(/expira/.test(app)); });
test('Visitante não guarda ficheiros (verificado no processo principal)', () => { assert.ok(/ipcMain\.handle\('file:save'[^]*?if \(visitante\(\)\)/.test(main)); assert.ok(/ipcMain\.handle\('rel:docx'[^]*?if \(visitante\(\)\)/.test(main)); });
test('Limites de tamanho nos ficheiros abertos', () => { assert.ok(/LIM_FICHEIRO = 100 \* 1048576/.test(main)); });
test('Sincronização recebe antes de enviar e guarda conflitos', () => { const i = app.indexOf("netSync(null, 'pull', cfg.lastPull"); const j = app.indexOf("netSync(null, 'push', linhas)"); assert.ok(i > 0 && j > i); assert.ok(/conflitos\/\$\{c\}_\$\{id\}_/.test(app)); });
test('Falhas de decifra contam-se (não desaparecem)', () => { assert.ok(/falhasCifra/.test(main) && /falhasCifra/.test(app)); });
