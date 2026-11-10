// 1.17.0: o registo de actividade grava sempre (não bloqueia o início de sessão)
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '..', 'app', 'app.js'), 'utf8');
test('db:save permite sempre a colecção registo (append-only)', () => {
  assert.ok(/if \(c === 'registo'\) \{[^}]*\}\s*else if \(autenticado\(\)\) exigirColecao/.test(main), 'registo isento no db:save');
  assert.ok(/if \(c === 'registo'\) return true;/.test(main), 'PODE_GRAVAR isenta registo');
});
test('arranque: 1.ª conta cria-se sem sessão, mas contas existentes ficam protegidas', () => {
  assert.ok(/function autorizarSemSessao/.test(main), 'validação de gravações sem sessão existe');
  assert.ok(/else autorizarSemSessao\(c, obj\)/.test(main), 'db:save valida gravações sem sessão');
  assert.ok(/const semContas = \(\)/.test(main), 'detecção de arranque (sem contas)');
  // sem sessão e com contas já no disco: só contas novas pendentes, nunca alterar as existentes
  assert.ok(/u\.pendente !== true \|\| \+u\.perfil >= 3/.test(main), 'pedidos de conta só pendentes e sem perfil de administrador');
});
test('fichas/config/utilizadores continuam a exigir sessão/perfil', () => {
  assert.ok(/É necessário iniciar sessão\./.test(main));
  assert.ok(/Configuração reservada à administração provincial\./.test(main));
});
test('Biblioteca de indicadores POEMA presente', () => {
  assert.ok(/Biblioteca de Indicadores \(POEMA/.test(app));
  assert.ok(/const POEMA_IND = \[/.test(app));
  assert.ok(/POEMA 2020/.test(app) && /SNE/.test(app));
});
