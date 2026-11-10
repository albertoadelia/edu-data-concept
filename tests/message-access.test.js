const test = require('node:test');
const assert = require('node:assert/strict');
const { canViewMessage, filterVisibleMessages } = require('../app/modules/message-access.js');

const userA = { utilizador: 'ana', dist: 905, perfil: 2 };
const userB = { utilizador: 'bruno', dist: 905, perfil: 2 };
const userC = { utilizador: 'carla', dist: 906, perfil: 2 };
const dpeAdmin = { utilizador: 'dpe.admin', dist: 0, perfil: 3 };

 test('mensagem pessoal só é visível ao remetente e ao destinatário', () => {
  const m = { deUtil: 'ana', deDist: 905, para: 905, paraUtil: 'bruno' };
  assert.equal(canViewMessage(m, userA), true);
  assert.equal(canViewMessage(m, userB), true);
  assert.equal(canViewMessage(m, userC), false);
  assert.equal(canViewMessage(m, { utilizador: 'diana', dist: 905, perfil: 3 }), false);
});

test('utilizador sem sessão não vê mensagens', () => {
  assert.equal(canViewMessage({ deUtil: 'ana', paraUtil: 'bruno' }, null), false);
  assert.equal(canViewMessage({ deDist: 0, para: 0 }, {}), false);
});

test('visitante não vê nem avisos gerais nem mensagens dirigidas', () => {
  const visitante = { utilizador: 'visitante', dist: 0, perfil: 0 };
  assert.equal(canViewMessage({ deDist: 0, para: 0 }, visitante), false);
  assert.equal(canViewMessage({ deUtil: 'ana', deDist: 905, para: 0 }, visitante), false);
});

test('mensagens institucionais são limitadas à unidade destinatária', () => {
  const m = { deUtil: 'gestor', deDist: 0, para: 905 };
  assert.equal(canViewMessage(m, userA), true);
  assert.equal(canViewMessage(m, userC), false);
});

test('avisos gerais da DPE continuam visíveis a utilizadores autenticados', () => {
  const aviso = { deUtil: 'dpe.admin', deDist: 0, para: 0 };
  assert.equal(canViewMessage(aviso, userA), true);
  assert.equal(canViewMessage(aviso, userC), true);
});

test('pedidos de palavra-passe só são visíveis aos administradores autorizados', () => {
  const pedido905 = { tipo: 'senha', deUtil: 'ana', deDist: 905, para: 0 };
  assert.equal(canViewMessage(pedido905, userA), true); // a própria pessoa que pediu
  assert.equal(canViewMessage(pedido905, { utilizador: 'admin905', dist: 905, perfil: 3 }), true);
  assert.equal(canViewMessage(pedido905, { utilizador: 'admin906', dist: 906, perfil: 3 }), false);
  assert.equal(canViewMessage(pedido905, dpeAdmin), true);
  assert.equal(canViewMessage(pedido905, { utilizador: 'dpe.consulta', dist: 0, perfil: 1 }), false);
});

test('filtro devolve apenas mensagens autorizadas e aceita listas vazias', () => {
  const msgs = [
    { id: '1', deUtil: 'ana', deDist: 905, para: 905, paraUtil: 'bruno' },
    { id: '2', deUtil: 'carla', deDist: 906, para: 906, paraUtil: 'diana' },
    { id: '3', deUtil: 'dpe.admin', deDist: 0, para: 0 },
  ];
  assert.deepEqual(filterVisibleMessages(msgs, userA).map((m) => m.id), ['1', '3']);
  assert.deepEqual(filterVisibleMessages(null, userA), []);
});
