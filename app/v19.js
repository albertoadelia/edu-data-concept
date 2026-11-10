// =====================================================================
// VERSÃO 1.9: ENTRADA E CONTAS, VISITANTE, SUPERVISÃO, REPOSIÇÃO DO SISTEMA, ARRASTAR FICHEIROS,
// PEDIDOS, ÂMBITO TERRITORIAL DOS RELATÓRIOS, CARTA ESCOLAR NO MODELO DA DPE, MAPA INTERACTIVO
// =====================================================================

// ---------------- datas em português anterior ao Acordo Ortográfico: meses e dias da semana com maiúscula ----------------
{
  const NOMES = /\b(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|domingo|segunda|terça|quarta|quinta|sexta|sábado|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b/g;
  const cap = (t) => String(t).replace(NOMES, (m) => m[0].toUpperCase() + m.slice(1));
  for (const f of ['toLocaleDateString', 'toLocaleString']) { const o = Date.prototype[f]; if (o.__cap) continue; const n = function (...a) { return cap(o.apply(this, a)); }; n.__cap = true; Date.prototype[f] = n; }
}

// ---------------- visitante: só ver ----------------
window.__aoVisitante = () => toast('Entrou como visitante: pode ver, mas não pode descarregar nem exportar.', 6000);
const ehVisitante = () => S.sessao?.perfil === 0;

// ---------------- anos retirados do sistema (reposição): os dados de base desses anos deixam de contar ----------------
S.baseRemovida = new Set();
async function carregarBaseRemovida() { try { const d = (await S.db.doc('config/baseRemovida').get()).data(); S.baseRemovida = new Set((d?.anos || []).map(Number)); } catch { S.baseRemovida = new Set(); } }
{
  const fs0 = fichasStatic; fichasStatic = async (ano, dist) => (S.baseRemovida?.has(+ano) ? new Map() : fs0(ano, dist));
  const rd0 = resumoDe; resumoDe = (ano, dist) => { if (S.baseRemovida?.has(+ano)) { if (!visivel(ano, dist)) return null; return S.resumoDb.get(`${ano}_${dist}`) || null; } return rd0(ano, dist); };
  if (typeof alfaStatic === 'function') { const as0 = alfaStatic; alfaStatic = async (ano) => (S.baseRemovida?.has(+ano) ? new Map() : as0(ano)); }
}

// ---------------- arrastar ficheiros para o programa ----------------
// larga-se o ficheiro sobre o cartão onde se quer carregar: o programa carrega no botão de abrir desse cartão e usa o ficheiro largado
(function arrastar() {
  if (!DESKTOP || window.__arrastarOk) return; window.__arrastarOk = true;
  const RX = /(carregar|importar|anexar|abrir|restaurar|escolher|ler).*(…|\.\.\.)|anexar|carregar|importar/i;
  let marca = null;
  const alvo = (el) => el?.closest?.('.card, .modal > div, .pub-opcoes, .login');
  document.addEventListener('dragover', (e) => { if (![...(e.dataTransfer?.types || [])].includes('Files')) return; e.preventDefault(); const c = alvo(e.target); if (c !== marca) { marca?.classList.remove('largar-aqui'); marca = c; c?.classList.add('largar-aqui'); } });
  document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) { marca?.classList.remove('largar-aqui'); marca = null; } });
  document.addEventListener('drop', (e) => {
    if (!e.dataTransfer?.files?.length) return; e.preventDefault(); marca?.classList.remove('largar-aqui'); marca = null;
    if (ehVisitante()) { toast('Visitante: não pode carregar ficheiros.'); return; }
    const c = alvo(e.target); const nomes = window.educstat.largar?.([...e.dataTransfer.files]) || [];
    if (!c) { toast('Largue o ficheiro sobre o cartão onde o quer carregar (por exemplo, “Carta escolar” ou “Anexos”).', 6000); return; }
    const bs = [...c.querySelectorAll('button:not([disabled])')].filter((b) => b.dataset.largar !== 'nao');
    const b = bs.find((x) => x.dataset.largar === 'sim') || bs.find((x) => RX.test(x.textContent || ''));
    if (!b) { toast('Este cartão não recebe ficheiros. Largue-o sobre o cartão com o botão de carregar.', 6000); return; }
    toast(`A abrir ${nomes.join(', ') || 'o ficheiro'}…`, 2500); b.click();
  });
  window.educstat.aoRecusarLargado?.((x) => toast(x.texto || `O ficheiro ${x.ficheiro} não serve aqui. Aceita: ${(x.aceita || []).map((e) => '.' + e).join(', ')}.`, 7000));
})();

// ---------------- pedido de abertura de um levantamento fechado ----------------
async function pedirAbertura(d) {
  const nome = (LEV_TRANCA.find((l) => l[0] === S.sel.lev) || [0, S.sel.lev])[1];
  const ta = h('textarea', { rows: 3, placeholder: 'Motivo (por exemplo: a escola enviou o mapa corrigido)' });
  const m = h('div', { class: 'modal' }, h('div', {}, h('h2', { text: 'Pedir à DPE a abertura do levantamento' }), h('p', { text: `${nome} ${d.ano}, ${distName(d.dist)}, escola ${S.esc.get(d.esc)?.nome || d.esc}.` }), h('label', { class: 'f' }, 'Motivo', ta),
    h('div', { class: 'row', style: 'justify-content:flex-end' }, h('button', { class: 'btn', text: 'Cancelar', onclick: () => m.remove() }), h('button', { class: 'btn primary', text: 'Enviar o pedido', onclick: async () => {
      const id = 'abrir_' + Date.now(); const em = new Date().toISOString();
      await S.db.doc('mensagens/' + id).set({ id, tipo: 'abertura', ano: d.ano, lev: S.sel.lev, esc: d.esc, texto: `Pedido de abertura: ${nome} ${d.ano}, ${distName(d.dist)}, ${S.esc.get(d.esc)?.nome || d.esc}. ${ta.value.trim()}`, de: S.sessao.nome, deUtil: S.sessao.utilizador, deDist: +d.dist, para: 0, em, threadId: id });
      await registar('pedido de abertura', { ano: d.ano, esc: d.esc, lev: S.sel.lev }); m.remove(); toast('Pedido enviado à DPE. Segue na próxima sincronização.');
    } }))));
  document.body.append(m); setTimeout(() => ta.focus(), 50);
}
// lista de pedidos (palavra-passe, contas, aberturas, propostas) feitos por mim ou para mim: cancelar, eliminar
function cartaoPedidos() {
  const eu = S.sessao?.utilizador; const dpe = ehDPE(); const meuD = +(S.sessao?.dist || 0); const adm = S.sessao?.perfil === 3;
  const TIPOS = { senha: 'Reposição da palavra-passe', conta: 'Conta nova', abertura: 'Abertura de levantamento', proposta: 'Proposta de correcção de escola' };
  const lista = (S.msgs || []).filter((m) => TIPOS[m.tipo] && !m.resolvido && (m.deUtil === eu || (adm && (dpe || +m.deDist === meuD))));
  if (!lista.length) return null;
  const fechar = async (m, estado) => { const em = new Date().toISOString(); await S.db.doc('mensagens/' + m.id).set({ ...m, resolvido: em, estado, por: eu, em }); await registar('pedido ' + estado, { alvo: m.deUtil }); toast(estado === 'cancelado' ? 'Pedido cancelado.' : 'Pedido eliminado.'); go(current); };
  return h('div', { class: 'card', style: 'border-left:4px solid var(--warn)' }, h('h2', { text: `Pedidos em aberto (${lista.length})` }),
    h('p', { class: 'note', text: 'Quem fez o pedido pode cancelá-lo (por exemplo, se já se lembrou da palavra-passe). O administrador pode eliminá-lo se já foi tratado por outra via.' }),
    h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Quando', 'Tipo', 'Pedido', 'De', ''].map((t) => h('th', { class: 'l', text: t })))),
      h('tbody', {}, lista.map((m) => h('tr', {}, h('td', { class: 'l', text: new Date(m.em).toLocaleString('pt-PT') }), h('td', { class: 'l', text: TIPOS[m.tipo] }), h('td', { class: 'l', text: m.texto }), h('td', { class: 'l', text: `${m.de || m.deUtil}${m.deDist ? ' · ' + distName(m.deDist) : ''}` }),
        h('td', {}, h('div', { class: 'row', style: 'gap:4px;flex-wrap:nowrap' },
          m.deUtil === eu ? h('button', { class: 'btn sm', text: 'Cancelar', onclick: async () => { if (await confirmBox('Cancelar este pedido?', 'Cancelar o pedido')) fechar(m, 'cancelado'); } }) : null,
          adm && m.deUtil !== eu ? h('button', { class: 'btn sm warn', text: 'Eliminar', onclick: async () => { if (await confirmBox('Eliminar este pedido? Nada é alterado.', 'Eliminar')) fechar(m, 'eliminado'); } }) : null))))))));
}

// ---------------- acesso: visitante e conta de supervisão (oculta) ----------------
async function cartaoAcessoEspecial() {
  const ac = (await S.db.doc('config/acesso').get()).data() || {};
  const us = (await S.db.collection('utilizadores').get()).docs.map((d) => d.data());
  const raiz = us.find((u) => u.raiz && !u.apagado);
  const vis = h('input', { type: 'checkbox', checked: ac.visitante !== false, onchange: async (e) => { await S.db.doc('config/acesso').set({ ...ac, visitante: e.target.checked, em: new Date().toISOString() }); await registar(e.target.checked ? 'entrada de visitante permitida' : 'entrada de visitante retirada'); toast('Gravado. Segue para os distritos na sincronização.'); } });
  const card = h('div', { class: 'card' }, h('h2', { text: 'Acesso' }),
    h('label', { class: 'chk' }, vis, 'Permitir “Entrar como visitante” no ecrã de entrada (só ver: não altera dados, não descarrega relatórios nem exporta)'));
  if (S.sessao?.raiz) {
    card.append(h('h3', { text: 'Conta de supervisão (a sua)' }), h('p', { class: 'note', text: 'Esta conta não aparece nas listas de utilizadores de ninguém. Vê o registo de actividade de todos, repõe o sistema e corrige configurações. Não lê as conversas privadas das outras pessoas.' }),
      h('button', { class: 'btn', text: 'Mudar a minha palavra-passe', onclick: () => mudarSenha(false) }));
  } else if (!raiz && ehDPE() && S.sessao?.perfil === 3) {
    const u = h('input', { type: 'text', placeholder: 'ex.: jane.doe' }), n = h('input', { type: 'text', value: '' }), p1 = h('input', { type: 'password', autocomplete: 'new-password' }), p2 = h('input', { type: 'password', autocomplete: 'new-password' }); const msg = h('p', { class: 'note' });
    card.append(h('h3', { text: 'Conta de supervisão (oculta)' }), h('p', { class: 'note', text: 'Uma única conta acima de todas: não aparece em nenhuma lista, ninguém a pode alterar nem apagar, segue para todos os computadores na sincronização e permite acompanhar o que todos fazem (registo de actividade) e repor o sistema. Crie-a uma vez, com os seus dados. Depois de criada, esta opção desaparece.' }),
      h('div', { class: 'row' }, h('label', { class: 'f' }, 'Utilizador', u), h('label', { class: 'f' }, 'Nome completo', n), h('label', { class: 'f' }, 'Palavra-passe (mínimo 10)', campoSenha(p1)), h('label', { class: 'f' }, 'Repetir', campoSenha(p2))), msg,
      h('button', { class: 'btn primary', text: 'Criar a conta de supervisão', onclick: async () => {
        const id = u.value.trim().toLowerCase();
        if (!/^[a-z0-9._-]{3,30}$/.test(id) || (await S.db.doc('utilizadores/' + id).get()).exists) { msg.textContent = 'Utilizador inválido ou já existente.'; return; }
        if (p1.value.length < 10 || p1.value !== p2.value) { msg.textContent = 'A palavra-passe tem de ter pelo menos 10 caracteres e as duas têm de coincidir.'; return; }
        const { sal, hash } = await window.educstat.hash(p1.value); const em = new Date().toISOString();
        await S.db.doc('utilizadores/' + id).set({ utilizador: id, nome: n.value.trim() || id, perfil: 3, dist: 0, activo: true, raiz: true, sal, hash, mudar: false, criado: em, em, senhaEm: em, central: true });
        await registar('conta de supervisão criada'); toast('Conta de supervisão criada. Entre com ela para a usar.'); go('admin');
      } }));
  }
  return card;
}

// ---------------- supervisão (só a conta de supervisão) ----------------
async function adminSupervisao(body) {
  if (!S.sessao?.raiz) { body.append(h('div', { class: 'empty', text: 'Só a conta de supervisão.' })); return; }
  const us = (await S.db.collection('utilizadores').get()).docs.map((d) => d.data()).filter((u) => !u.raiz);
  const reg = (await S.db.collection('registo').orderBy('em', 'desc').limit(2000).get()).docs.map((d) => d.data());
  const ult = new Map(); for (const r of reg) if (r.accao === 'entrada' && r.por && !ult.has(r.por)) ult.set(r.por, r);
  const f = S.supF ||= { quem: '', accao: '', de: '' };
  const quem = h('select', { onchange: (e) => { f.quem = e.target.value; go('admin'); } }, h('option', { value: '', text: 'Todos' }), [...new Set(reg.map((r) => r.por).filter(Boolean))].sort().map((x) => h('option', { value: x, text: x, selected: x === f.quem })));
  const acc = h('input', { type: 'search', value: f.accao, placeholder: 'acção contém…', onchange: (e) => { f.accao = e.target.value; go('admin'); } });
  const de = h('input', { type: 'date', value: f.de, onchange: (e) => { f.de = e.target.value; go('admin'); } });
  const fl = reg.filter((r) => (!f.quem || r.por === f.quem) && (!f.accao || String(r.accao).toLowerCase().includes(f.accao.toLowerCase())) && (!f.de || String(r.em).slice(0, 10) >= f.de));
  const info = await window.educstat.info();
  body.append(h('div', { class: 'card', style: 'border-left:4px solid var(--brand)' }, h('h2', { text: 'Supervisão do sistema' }),
    h('p', { class: 'note', text: `Versão ${info.versao} · computador ${info.maquina} · pasta ${info.pasta}. Esta página mostra quem entra e o que faz, sem abrir as conversas privadas de ninguém.` }),
    h('div', { class: 'kpis' }, [['Utilizadores', us.filter((u) => !u.apagado).length], ['Activos', us.filter((u) => u.activo && !u.apagado).length], ['Pedidos de conta', us.filter((u) => u.pendente).length], ['Registos (últimos)', reg.length], ['Online agora', (S.online || []).length]].map(([l, v_]) => h('div', { class: 'kpi' }, h('div', { class: 'l', text: l }), h('div', { class: 'v', text: NF.format(v_) }))))));
  body.append(h('div', { class: 'card' }, h('h2', { text: 'Utilizadores: última entrada' }), h('div', { class: 'tw tall' }, h('table', {}, h('thead', {}, h('tr', {}, ['Utilizador', 'Nome', 'Perfil', 'Distrito', 'Estado', 'Última entrada', 'Computador'].map((t) => h('th', { class: 'l', text: t })))),
    h('tbody', {}, us.sort((a, b) => a.utilizador.localeCompare(b.utilizador)).map((u) => { const r = ult.get(u.utilizador); return h('tr', {}, h('td', { class: 'l mono', text: u.utilizador }), h('td', { class: 'l', text: u.nome }), h('td', { class: 'l', text: nomePerfil(u) }), h('td', { class: 'l', text: u.dist ? distName(u.dist) : 'DPE' }), h('td', { class: 'l', text: u.apagado ? 'Apagado' : u.pendente ? 'A aguardar aprovação' : u.activo ? 'Activo' : 'Desactivado' }), h('td', { class: 'l', text: r ? new Date(r.em).toLocaleString('pt-PT') : '—' }), h('td', { class: 'l', text: r?.maquina || '' })); }))))));
  body.append(h('div', { class: 'card' }, h('h2', { text: 'Actividade de todos' }), h('div', { class: 'row' }, h('label', { class: 'f' }, 'Utilizador', quem), h('label', { class: 'f' }, 'Acção', acc), h('label', { class: 'f' }, 'Desde', de),
    h('button', { class: 'btn', text: 'Exportar (Excel)', onclick: () => { const X = window.XLSX; const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.json_to_sheet(fl.map((r) => ({ Quando: r.em, Utilizador: r.por, Accao: r.accao, Ano: r.ano, Escola: r.esc, Alvo: r.alvo, Computador: r.maquina, IP: r.ip, Local: r.local }))), 'Actividade'); guardarXlsx(wb, `Supervisao_actividade_${new Date().toISOString().slice(0, 10)}.xlsx`); } })),
    h('p', { class: 'note', text: `${NF.format(fl.length)} registos. O registo de cada computador chega aqui pela sincronização.` }),
    h('div', { class: 'tw tall' }, h('table', {}, h('thead', {}, h('tr', {}, ['Quando', 'Utilizador', 'Acção', 'Detalhe', 'Computador', 'IP'].map((t) => h('th', { class: 'l', text: t })))),
      h('tbody', {}, fl.slice(0, 600).map((r) => h('tr', {}, h('td', { class: 'l', text: new Date(r.em).toLocaleString('pt-PT') }), h('td', { class: 'l', text: r.por || '' }), h('td', { class: 'l', text: r.accao }), h('td', { class: 'l', text: [r.ano, r.esc && (S.esc.get(r.esc)?.nome || r.esc), r.alvo, r.n != null ? r.n + ' registos' : ''].filter(Boolean).join(' · ') }), h('td', { class: 'l', text: r.maquina || '' }), h('td', { class: 'l mono', text: r.ipPublico || r.ip || '' }))))))));
  body.append(cartaoReporSistema());
}

// ---------------- repor o sistema: começar de novo, sem dados de qualquer ano, e voltar a carregar uma base num período ----------------
function cartaoReporSistema() {
  const anosAll = [...new Set([...ANOS, ...S.baseRemovida])].sort();
  const de = h('select', {}, anosAll.map((a) => h('option', { value: a, text: a, selected: a === anosAll[0] })));
  const ate = h('select', {}, anosAll.map((a) => h('option', { value: a, text: a, selected: a === anosAll[anosAll.length - 1] })));
  const oQue = h('select', {}, [['tudo', 'Dados de base do instalador e tudo o que foi introduzido ou importado'], ['introduzidos', 'Só o que foi introduzido ou importado (a base do instalador fica)'], ['base', 'Só a base do instalador (o que foi introduzido fica)']].map(([k, l]) => h('option', { value: k, text: l })));
  const conf = h('input', { type: 'text', placeholder: 'escreva REPOR' }); const msg = h('p', { class: 'note' });
  const removidos = [...S.baseRemovida].sort();
  return h('div', { class: 'card', style: 'border-left:4px solid var(--bad)' }, h('h2', { text: 'Repor o sistema (começar de novo)' }),
    h('p', { text: 'Retira os dados dos anos escolhidos, para depois carregar uma base (Access) só do período que quiser, em Administração > Importar Access (escolha aí “Do ano” e “Até ao ano”). Antes de repor, o programa faz uma cópia de segurança automática. Os utilizadores, as escolas e as configurações ficam.' }),
    removidos.length ? h('p', { class: 'pill warn', text: `Anos sem a base do instalador: ${removidos.join(', ')}.` }) : null,
    h('div', { class: 'row' }, h('label', { class: 'f' }, 'Do ano', de), h('label', { class: 'f' }, 'Até ao ano', ate), h('label', { class: 'f', style: 'flex:1;min-width:20rem' }, 'Retirar', oQue), h('label', { class: 'f' }, 'Confirmação', conf)), msg,
    h('div', { class: 'row' }, h('button', { class: 'btn warn', text: 'Repor', onclick: async () => {
      if (conf.value.trim().toUpperCase() !== 'REPOR') { msg.textContent = 'Escreva REPOR para confirmar.'; return; }
      const a0 = Math.min(+de.value, +ate.value), a1 = Math.max(+de.value, +ate.value); const anos = anosAll.filter((a) => a >= a0 && a <= a1);
      msg.textContent = 'A fazer a cópia de segurança…'; try { await copiaAutomatica(true); } catch {}
      let n = 0;
      if (oQue.value !== 'base') for (const c of ['fichas', 'alfa', 'resumo']) for (const d of (await S.db.collection(c).get()).docs) { const v_ = d.data(); const a = +(v_?.ano ?? String(d.id).split('_')[0]); if (anos.includes(a)) { await S.db.doc(`${c}/${d.id}`).delete(); n++; } }
      if (oQue.value !== 'introduzidos') { const set = new Set([...S.baseRemovida, ...anos]); await S.db.doc('config/baseRemovida').set({ anos: [...set].sort(), em: new Date().toISOString(), por: S.sessao.utilizador }); }
      await registar('sistema reposto', { alvo: `${a0}-${a1}`, n, lev: oQue.value }); toast(`Feito: ${a0} a ${a1}. A aplicação vai reiniciar.`, 5000); setTimeout(() => recarregar(), 1500);
    } }),
      removidos.length ? h('button', { class: 'btn', text: 'Voltar a mostrar a base do instalador destes anos', onclick: async () => { const a0 = Math.min(+de.value, +ate.value), a1 = Math.max(+de.value, +ate.value); const set = new Set([...S.baseRemovida].filter((a) => a < a0 || a > a1)); await S.db.doc('config/baseRemovida').set({ anos: [...set].sort(), em: new Date().toISOString(), por: S.sessao.utilizador }); await registar('base do instalador reposta', { alvo: `${a0}-${a1}` }); toast('Feito. A aplicação vai reiniciar.'); setTimeout(() => recarregar(), 1200); } }) : null));
}

// ---------------- shapefiles de postos e localidades: escolher o campo com o nome e reconhecer pelas escolas ----------------
// o campo com o nome é o que mais coincide com os postos/localidades do cadastro das escolas (o nome do campo varia de ficheiro para ficheiro)
function nomesCadastro(nivel) { const campo = nivel === 'postos' ? 'posto' : 'localidade'; const s = new Set(); for (const e of S.esc.values()) if (e[campo]) s.add(normGeo(String(e[campo]).replace(/\(.*\)/, ''))); return s; }
function pontuarCampos(fc, nivel) {
  const alvo = nomesCadastro(nivel); const props = Object.keys(fc.features[0]?.properties || {});
  const bate = (v) => { const n = normGeo(String(v ?? '').replace(/\(.*\)/, '')); if (!n) return false; if (alvo.has(n)) return true; if (n.length >= 5) for (const k of alvo) if (Math.abs(k.length - n.length) <= 2 && lev(k, n) <= 1) return true; return false; };
  return props.map((k) => { const vs = fc.features.map((f) => f.properties?.[k]); const txt = vs.filter((v) => typeof v === 'string' && /[a-z]/i.test(v)).length; return { k, txt, n: txt ? vs.filter(bate).length : 0 }; }).sort((a, b) => b.n - a.n || b.txt - a.txt);
}
{
  const gl0 = guardarLimites;
  guardarLimites = async (nivel, fc, info, campos, semIr) => {
    if (nivel === 'distritos') return gl0(nivel, fc, info, campos, semIr);
    const d3 = window.d3; for (const f of fc.features) rebobinar(f);
    const sc = pontuarCampos(fc, nivel); const nomeCampo = S.__campoNome?.[info] || sc[0]?.k;
    // dentro de Tete: pelos limites dos distritos, se carregados; senão pela posição (caixa da província)
    const dentro = (p) => { try { const c = d3.geoCentroid(p); return S.limites ? S.limites.features.some((f) => d3.geoContains(f, c)) : NA_TETE(p); } catch { return false; } };
    const distDe = (p) => { try { const c = d3.geoCentroid(p); const f = (S.limites?.features || []).find((x) => d3.geoContains(x, c)); return f ? codDistritoGeo(f, S.limitesCampo) : null; } catch { return null; } };
    const ok = fc.features.filter((p) => p.geometry && dentro(p)).map((p) => ({ type: 'Feature', geometry: p.geometry, properties: { ...p.properties, __nome: String(p.properties?.[nomeCampo] ?? '').trim(), __dist: distDe(p) } }));
    if (!ok.length) { toast('Nenhuma área fica dentro da província de Tete. Confirme a projecção do ficheiro (.prj) ou carregue primeiro os limites dos distritos.', 8000); return; }
    // cada localidade fica também com o posto onde está (pelo shapefile dos postos, se existir)
    if (nivel === 'localidades' && S.limitesPostos) for (const f of ok) { try { const c = d3.geoCentroid(f); const p = S.limitesPostos.features.find((x) => d3.geoContains(x, c)); if (p) f.properties.__posto = p.properties?.__alias || p.properties?.__nome || null; } catch {} }
    const fc2 = { type: 'FeatureCollection', features: ok };
    if (nivel === 'postos') { S.limitesPostos = fc2; await S.db.doc('config/limitesPostos').set({ geojson: JSON.stringify(fc2), info, campo: nomeCampo }); }
    else { S.limitesLocalidades = fc2; await S.db.doc('config/limitesLocalidades').set({ geojson: JSON.stringify(fc2), info, campo: nomeCampo }); }
    const alvo = nomesCadastro(nivel); const rec = ok.filter((f) => alvo.has(normGeo(f.properties.__nome))).length;
    await registar(`limites (${nivel}) carregados`, { n: ok.length });
    toast(`${ok.length} áreas de ${nivel} em Tete (campo do nome: ${nomeCampo}). ${rec} com o mesmo nome que no cadastro das escolas; as outras podem ligar-se à mão em “Correspondência dos postos e localidades”.`, 9000);
    await marcarFicheiroBase('limites_' + nivel, { ficheiro: String(info || '').split(' (')[0], n: ok.length }); if (!semIr) go(current);
  };
}
// pré-visualização das camadas com a escolha do campo do nome (substitui a de 1.6)
carregarShapefilesBase = async function () {
  const r = await window.educstat.lerShapefile(); if (!r) return; if (r.erro) { toast('Não foi possível ler: ' + r.erro, 8000); return; }
  const camadas = r.camadas || [{ nome: r.ficheiro, n: r.n, campos: r.campos, crs: r.crs, geojson: r.geojson, nivel: 'distritos' }];
  S.__campoNome = {};
  const linhas = camadas.map((c) => {
    for (const f of c.geojson.features) rebobinar(f);
    const tete = { type: 'FeatureCollection', features: c.geojson.features.filter((f) => f.geometry && NA_TETE(f)) };
    const sel = h('select', {}, [['distritos', 'Distritos'], ['postos', 'Postos administrativos'], ['localidades', 'Localidades'], ['', 'Não usar']].map(([k, l]) => h('option', { value: k, text: l, selected: k === c.nivel })));
    const campoSel = h('select'); const info = h('p', { class: 'note' });
    const preencher = () => {
      const nv = sel.value; campoSel.replaceChildren(); if (!nv || nv === 'distritos') { campoSel.disabled = true; info.textContent = nv === 'distritos' ? 'Os distritos reconhecem-se pelo código ou pelo nome, automaticamente.' : ''; return; }
      campoSel.disabled = false; const sc = pontuarCampos(tete.features.length ? tete : c.geojson, nv); const am = c.amostras || {};
      for (const x of sc) campoSel.append(h('option', { value: x.k, text: `${x.k}${x.n ? ` — ${x.n} nomes iguais aos do cadastro` : ''}${am[x.k]?.length ? ` (ex.: ${am[x.k].slice(0, 3).join(', ')})` : ''}` }));
      info.textContent = sc[0]?.n ? `Sugestão: o campo ${sc[0].k} tem ${sc[0].n} nomes iguais aos ${nv === 'postos' ? 'postos' : 'das localidades'} das escolas.` : 'Nenhum campo tem nomes iguais aos do cadastro das escolas: escolha o campo com o nome e depois ligue as áreas à mão na tabela de correspondência.';
    };
    sel.onchange = preencher; preencher();
    const pv = h('div', { class: 'shp-prev' }); pv.innerHTML = svgCamada(tete.features.length ? tete : c.geojson);
    const chave = `${c.nome} (${c.n} áreas, ${c.crs})`;
    return { c, sel, campoSel, chave, el: h('div', { class: 'card', style: 'display:grid;grid-template-columns:270px 1fr;gap:12px;align-items:start' }, pv,
      h('div', {}, h('h3', { text: c.nome }), h('p', { class: 'note', text: `${NF.format(c.n)} áreas no ficheiro, ${NF.format(tete.features.length)} na província de Tete · ${c.crs}` }),
        tete.features.length ? null : h('p', { class: 'pill warn', text: 'Nenhuma área cai na província de Tete: a projecção pode estar errada (falta o .prj?) ou o ficheiro é de outra região.' }),
        h('div', { class: 'row' }, h('label', { class: 'f' }, 'Usar como', sel), h('label', { class: 'f', style: 'flex:1;min-width:18rem' }, 'Campo com o nome', campoSel)), info)) };
  });
  const m = h('div', { class: 'modal' }, h('div', { style: 'max-width:64rem;max-height:88vh;overflow:auto' }, h('h2', { text: `Shapefiles encontrados em ${r.ficheiro}` }),
    h('p', { text: 'Veja cada camada, diga para que serve e qual o campo com o nome do posto ou da localidade. Os distritos gravam-se primeiro. Nada muda até carregar em “Gravar”.' }),
    ...linhas.map((l) => l.el),
    h('div', { class: 'row', style: 'justify-content:flex-end' }, h('button', { class: 'btn', text: 'Cancelar', onclick: () => m.remove() }), h('button', { class: 'btn primary', text: 'Gravar as camadas escolhidas', onclick: async () => {
      const ord = { distritos: 0, postos: 1, localidades: 2 }; const esc = linhas.filter((l) => l.sel.value).sort((a, b) => ord[a.sel.value] - ord[b.sel.value]);
      m.remove(); for (const l of esc) { if (!l.campoSel.disabled) S.__campoNome[l.chave] = l.campoSel.value; await guardarLimites(l.sel.value, l.c.geojson, l.chave, l.c.campos, true); }
      go(current);
    } }))));
  document.body.append(m);
};

// ---------------- copiar e guardar qualquer gráfico ou mapa como imagem ----------------
async function svgElParaPng(svgEl, escala = 2) {
  const cl = svgEl.cloneNode(true); const r = svgEl.getBoundingClientRect(); const W = Math.round(r.width) || +svgEl.getAttribute('width') || 640, H = Math.round(r.height) || +svgEl.getAttribute('height') || 400;
  cl.setAttribute('width', W); cl.setAttribute('height', H); cl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  // as cores vêm de variáveis CSS: resolvem-se aqui para a imagem ficar igual ao ecrã
  const cs = getComputedStyle(document.body); const txt = new XMLSerializer().serializeToString(cl).replace(/var\((--[\w-]+)\)/g, (_, v) => cs.getPropertyValue(v).trim() || '#333');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#fff"/>${txt.replace(/^<svg/, '<svg x="0" y="0"')}</svg>`;
  return new Promise((res) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = W * escala; c.height = H * escala; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); c.toBlob((b) => res({ blob: b, svg }), 'image/png'); }; img.onerror = () => res(null); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
}
function ferramentasFigura(svgEl, nome) {
  const bar = h('div', { class: 'fig-acc so-editor' });
  const copiar = h('button', { class: 'btn sm', title: 'Copiar a imagem (para colar no Word, PowerPoint ou WhatsApp)', text: 'Copiar imagem', onclick: async () => { const r = await svgElParaPng(svgEl); if (!r) return; try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': r.blob })]); toast('Imagem copiada: cole-a no documento (Ctrl+V).'); } catch { toast('Não foi possível copiar. Use “Guardar PNG”.'); } } });
  const png = h('button', { class: 'btn sm', text: 'Guardar PNG', onclick: async () => { const r = await svgElParaPng(svgEl, 3); if (!r) return; try { await S.downloads.save({ filename: `${nome}.png`, data: new Uint8Array(await r.blob.arrayBuffer()) }); toast('Imagem guardada.'); } catch {} } });
  const svg = h('button', { class: 'btn sm', text: 'SVG', title: 'Imagem vectorial (amplia sem perder qualidade)', onclick: async () => { const r = await svgElParaPng(svgEl, 1); if (!r) return; try { await S.downloads.save({ filename: `${nome}.svg`, data: r.svg }); } catch {} } });
  bar.append(copiar, png, svg); return bar;
}
function juntarFerramentas(v) {
  let i = 0;
  for (const s of v.querySelectorAll('svg')) {
    if (s.closest('.fig-acc, button, .mapa-int, nav, header') || s.dataset.ferr) continue; const r = s.getBoundingClientRect(); if (r.width < 220 || r.height < 120) continue;
    s.dataset.ferr = '1'; const card = s.closest('.card'); const tit = (card?.querySelector('h2,h3')?.textContent || 'Grafico').trim().replace(/[\\/:*?"<>|]+/g, '').slice(0, 60);
    s.after(ferramentasFigura(s, `${tit.replace(/\s+/g, '_')}_${++i}`));
  }
}

// ---------------- mapa interactivo (painel): distritos, postos, localidades ou escolas ----------------
const IND_POP = new Set(['tba', 'tla', 'tesc6', 'tbe', 'tle', 'tbc']);
async function valoresUnidades(nivelU, dist, ano, k, nivel) {
  // devolve [{nome, val, feat?, e?}] para a camada pedida
  if (nivelU === 'distritos') return S.cod.distritosTodos.map(([d, n]) => ({ nome: n, d, val: IX(ano, { dist: d, nivel }, k) }));
  const fm = [...(await fichasEfectivas(ano, dist)).values()]; const campo = nivelU === 'postos' ? 'posto' : 'localidade';
  if (nivelU === 'escolas') return fm.map((f) => { const e = S.esc.get(f.esc); const r = window.EAgg.resumo([f], escolaTipo, formados()); const x = sumUpRs([r], ano, { dist, tipo: 'Todos', nivel, sexo: 'Ambos' }); return { nome: e?.nome || f.esc, e, val: x ? indicators(x, 'Ambos')[k] : null }; }).filter((u) => u.e && coordsEscola(u.e));
  const g = new Map(); for (const f of fm) { const n = S.esc.get(f.esc)?.[campo]; if (!n) continue; (g.get(n) || g.set(n, []).get(n)).push(f); }
  return [...g.entries()].map(([nome, fs]) => { const x = sumUpRs([window.EAgg.resumo(fs, escolaTipo, formados())], ano, { dist, tipo: 'Todos', nivel, sexo: 'Ambos' }); return { nome, n: fs.length, val: x && !IND_POP.has(k) ? indicators(x, 'Ambos')[k] : null }; });
}
function cartaoMapaInteractivo() {
  const d3 = window.d3; if (!d3) return null;
  const st = S.mapaInt ||= { u: 'distritos', k: 'matric', nivel: 'EP', ano: null };
  const anos = ANOS.filter((a) => S.cod.distritos.some((d) => resumoDe(a, d[0]))); if (!st.ano || !anos.includes(st.ano)) st.ano = anos[anos.length - 1];
  const distSel = S.pf.dist !== 'Todos' ? +S.pf.dist : null;
  const box = h('div', { class: 'mapa-int' }); const tip = h('div', { class: 'mapa-tip', hidden: true }); const leg = h('p', { class: 'note' });
  const inds = IND.filter((x) => x.length > 1 && x[2] !== 'i');
  const sel = (k, opts, lab) => h('label', { class: 'f' }, lab, h('select', { onchange: (e) => { st[k] = k === 'ano' ? +e.target.value : e.target.value; desenhar(); } }, opts.map(([v_, t]) => h('option', { value: v_, text: t, selected: String(v_) === String(st[k]) }))));
  const unidadesOpc = [['distritos', 'Distritos (província)'], ...(distSel ? [['postos', `Postos de ${distName(distSel)}`], ['localidades', `Localidades de ${distName(distSel)}`], ['escolas', `Escolas de ${distName(distSel)} (pontos)`]] : [])];
  if (!distSel && st.u !== 'distritos') st.u = 'distritos';
  const svgEl = () => box.querySelector('svg');
  const desenhar = async () => {
    box.replaceChildren(h('div', { class: 'loading', text: 'A desenhar o mapa…' }));
    const k = st.k, nivel = st.nivel === 'Todos' ? 'Todos' : st.nivel; const nomeInd = (IND.find((x) => x[0] === k) || [0, k])[1];
    let us; try { us = await valoresUnidades(st.u, distSel, st.ano, k, nivel); } catch (e) { box.replaceChildren(h('p', { class: 'note', text: 'Não foi possível calcular: ' + e.message })); return; }
    const W = 760, H = 520; let fundo = [], camada = [];
    if (st.u === 'distritos') { if (!S.limites) { box.replaceChildren(h('p', { class: 'note', style: 'padding:12px', text: 'Faltam os limites dos distritos (Administração > Configurações). Sem eles, veja o mapa nas publicações (esquemático).' })); return; }
      camada = S.limites.features.map((f) => ({ f, u: us.find((u) => u.d === codDistritoGeo(f, S.limitesCampo)) })); }
    else {
      fundo = (S.limites?.features || []).filter((f) => codDistritoGeo(f, S.limitesCampo) === distSel);
      if (st.u !== 'escolas') { const cam = st.u === 'postos' ? S.limitesPostos : S.limitesLocalidades;
        if (!cam) { box.replaceChildren(h('p', { class: 'note', style: 'padding:12px', text: `Faltam os limites ${st.u === 'postos' ? 'dos postos administrativos' : 'das localidades'} (Administração > Configurações).` })); return; }
        const fs = cam.features.filter((p) => { try { return !fundo.length || fundo.some((f) => d3.geoContains(f, d3.geoCentroid(p))); } catch { return false; } });
        const vm = new Map(us.map((u) => [normGeo(u.nome), u]));
        camada = fs.map((f) => { const n = normGeo(f.properties?.__alias || f.properties?.__nome); let u = vm.get(n); if (!u && n.length >= 4) for (const [kk, x] of vm) if (lev(n, kk) <= 2) { u = x; break; } return { f, u }; }); }
    }
    const tudo = { type: 'FeatureCollection', features: [...fundo, ...camada.map((c) => c.f)] };
    const proj = d3.geoMercator(); if (tudo.features.length) proj.fitExtent([[16, 16], [W - 16, H - 16]], tudo); else { const pts = us.map((u) => coordsEscola(u.e)); proj.fitExtent([[16, 16], [W - 16, H - 16]], { type: 'MultiPoint', coordinates: pts }); }
    const path = d3.geoPath(proj);
    const vals = (st.u === 'escolas' ? us : camada.map((c) => c.u)).map((u) => u?.val).filter((x) => x != null && Number.isFinite(x));
    const mn = Math.min(...vals), mx = Math.max(...vals); const inv = ['desist', 'reprov', 'repet', 'sob', 'alprof', 'alprofF', 'altur'].includes(k);
    const cor = (v) => (v == null || !Number.isFinite(v) ? '#E6EAE8' : d3.interpolateRgb(inv ? '#EAF5EF' : '#F6EDCB', inv ? '#B5121B' : '#0A6B45')(mx === mn ? 0.6 : (v - mn) / (mx - mn)));
    const ns = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('font-family', 'Arial');
    const g = document.createElementNS(ns, 'g'); svg.append(g);
    const el = (t, a) => { const e = document.createElementNS(ns, t); for (const [x, y] of Object.entries(a)) e.setAttribute(x, y); return e; };
    for (const f of fundo) g.append(el('path', { d: path(f), fill: '#F4F6F5', stroke: '#0A6B45', 'stroke-width': 1.8 }));
    const mostrar = (ev, html) => { tip.hidden = false; tip.innerHTML = html; const r = box.getBoundingClientRect(); tip.style.left = Math.min(r.width - 270, ev.clientX - r.left + 14) + 'px'; tip.style.top = (ev.clientY - r.top + 12) + 'px'; };
    for (const c of camada) {
      const p = el('path', { d: path(c.f), fill: cor(c.u?.val), stroke: '#fff', 'stroke-width': 1.1, class: 'u' }); g.append(p);
      const nome = c.u?.nome || c.f.properties?.__alias || c.f.properties?.__nome || rotuloGeo(c.f);
      p.addEventListener('mousemove', (ev) => mostrar(ev, `<b>${esc_(nome)}</b><br>${esc_(nomeInd)}: <b>${esc_(fmt(k, c.u?.val))}</b>${c.u?.n ? `<br>${c.u.n} escolas` : ''}${st.u === 'distritos' ? '<br><i>clique para ver os postos</i>' : ''}`));
      p.addEventListener('mouseleave', () => { tip.hidden = true; });
      if (st.u === 'distritos' && c.u?.d) p.addEventListener('click', () => { S.pf.dist = c.u.d; S.mapaInt.u = S.limitesPostos ? 'postos' : 'escolas'; go('painel'); });
    }
    for (const c of camada) { const [cx, cy] = path.centroid(c.f); if (!Number.isFinite(cx) || !c.u) continue; const t = el('text', { x: cx, y: cy, 'font-size': st.u === 'distritos' ? 10.5 : 9, 'font-weight': 700, 'text-anchor': 'middle', fill: '#13221B', 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 2.6, 'pointer-events': 'none' }); t.textContent = c.u.nome; g.append(t); const t2 = el('text', { x: cx, y: cy + 12, 'font-size': 9, 'text-anchor': 'middle', fill: '#13221B', 'paint-order': 'stroke', stroke: '#fff', 'stroke-width': 2.6, 'pointer-events': 'none' }); t2.textContent = fmt(k, c.u.val); g.append(t2); }
    if (st.u === 'escolas') for (const u of us) { const [x, y] = proj(coordsEscola(u.e)); const c_ = el('circle', { cx: x, cy: y, r: 5, fill: cor(u.val), stroke: '#13221B', 'stroke-width': .8, class: 'u' }); c_.style.cursor = 'pointer'; g.append(c_);
      c_.addEventListener('mousemove', (ev) => mostrar(ev, `<b>${esc_(u.nome)}</b><br>${esc_(u.e.posto || '')}${u.e.localidade ? ' › ' + esc_(u.e.localidade) : ''}<br>${esc_(nomeInd)}: <b>${esc_(fmt(k, u.val))}</b>`)); c_.addEventListener('mouseleave', () => { tip.hidden = true; }); }
    // norte e escala
    g.append(el('path', { d: `M${W - 40},20 l8,22 l-8,-6 l-8,6 Z`, fill: '#13221B' })); const tn = el('text', { x: W - 40, y: 16, 'font-size': 11, 'font-weight': 700, 'text-anchor': 'middle' }); tn.textContent = 'N'; g.append(tn);
    try { const [lo, la] = proj.invert([W / 2, H - 30]); const km = 6371 * Math.PI / 180 * Math.cos(la * Math.PI / 180); const px100 = proj([lo + 100 / km, la])[0] - W / 2; const kmB = [5, 10, 20, 25, 50, 100, 200].find((x) => (px100 * x) / 100 > 60) || 200; const pxB = (px100 * kmB) / 100;
      g.append(el('rect', { x: 18, y: H - 24, width: pxB, height: 5, fill: '#13221B' })); const ts = el('text', { x: 18 + pxB + 6, y: H - 18, 'font-size': 10 }); ts.textContent = `${kmB} km`; g.append(ts); } catch {}
    box.replaceChildren(svg, tip);
    // aproximar e deslocar com a roda do rato e arrastando
    const zoom = d3.zoom().scaleExtent([1, 12]).on('zoom', (ev) => g.setAttribute('transform', ev.transform)); d3.select(svg).call(zoom);
    S.__zoomMapa = () => d3.select(svg).transition().call(zoom.transform, d3.zoomIdentity);
    leg.textContent = vals.length ? `${nomeInd} (${nivel === 'Todos' ? 'todos os níveis' : nivel}, ${st.ano}): de ${fmt(k, mn)} a ${fmt(k, mx)}. ${inv ? 'Vermelho = valor desfavorável.' : 'Verde mais escuro = valor mais alto.'} Passe o rato sobre cada área; roda do rato para aproximar.${st.u !== 'distritos' && IND_POP.has(k) ? ' Este indicador usa a população e só existe por distrito.' : ''}` : 'Sem valores para este indicador, nível e ano.';
  };
  const card = h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h2', { text: 'Mapa Interactivo' }), h('div', { class: 'row', style: 'gap:4px' }, h('button', { class: 'btn sm', text: 'Ver tudo', onclick: () => S.__zoomMapa?.() }))),
    h('div', { class: 'row mapa-ctl' }, sel('u', unidadesOpc, 'Mostrar'), sel('k', inds.map((x) => [x[0], x[1]]), 'Indicador'), sel('nivel', [['EP', 'Ensino Primário'], ['ESG1', 'ESG 1º Ciclo'], ['ESG2', 'ESG 2º Ciclo'], ['Todos', 'Todos os níveis']], 'Nível'), sel('ano', [...anos].reverse().map((a) => [a, a]), 'Ano')),
    box, leg);
  card.append(ferramentasFigura({ getBoundingClientRect: () => svgEl()?.getBoundingClientRect() || { width: 760, height: 520 }, cloneNode: () => { const s = svgEl().cloneNode(true); s.querySelector('g')?.removeAttribute('transform'); return s; }, getAttribute: (a) => svgEl()?.getAttribute(a) }, 'Mapa_interactivo'));
  carregarLimitesS().then(desenhar);
  return card;
}
{
  const painel18 = VIEWS.painel;
  VIEWS.painel = async (v) => {
    await painel18(v);
    try { const c = cartaoMapaInteractivo(); if (c) { const cards = v.querySelectorAll(':scope > .card'); const ref = cards[2] || null; v.insertBefore(c, ref); } } catch (e) { console.warn('mapa interactivo', e); }
    setTimeout(() => juntarFerramentas(v), 900);
  };
}

// =====================================================================
// RELATÓRIOS: ficha técnica no modelo da DPE, recorte territorial (postos, localidades, ZIP), AEA, carta escolar completa
// =====================================================================
const R_TERRA = 6371.0088;
const areaKm2 = (fs) => (fs || []).reduce((t, f) => { try { return t + window.d3.geoArea(f) * R_TERRA * R_TERRA; } catch { return t; } }, 0);
// a última projecção desenhada (para a escala gráfica em km nos mapas)
if (window.d3 && !window.d3.__projOk) { const gm0 = window.d3.geoMercator; try { window.d3.geoMercator = (...a) => { const p = gm0(...a); S.__proj = p; return p; }; window.d3.__projOk = true; } catch {} }
function escalaKm(proj, W, H) {
  try { const [lo, la] = proj.invert([W / 2, H / 2]); const kmGrau = (R_TERRA * Math.PI / 180) * Math.cos(la * Math.PI / 180); const px100 = proj([lo + 100 / kmGrau, la])[0] - W / 2; if (!(px100 > 0)) return null;
    const passo = [2, 5, 10, 20, 25, 50, 100, 200].find((x) => (px100 * x) / 100 >= W * 0.12) || 200; return { passo, px: (px100 * passo) / 100 }; } catch { return null; }
}
// ---- dados geográficos de base (editáveis em Administração > Configurações) ----
const GEO_PADRAO = {
  prov: { area: 100742, terraFirme: 98230, aguas: 2494, postos: 34, localidades: 124, municipios: 'Tete, Moatize, Ulónguè (Angónia) e Nhamayábuè (Mutarara)', sede: 'Cidade de Tete',
    limites: 'A Província de Tete situa-se no extremo noroeste do país e faz fronteira com três países numa extensão total de cerca de 1.480 km: a norte com as Repúblicas da Zâmbia e do Malawi, a este com o Malawi, a oeste com a Zâmbia e o Zimbabwe e a sul com o Zimbabwe e com as províncias de Manica e Sofala. A sudeste confina com a Zambézia e a nordeste com o Niassa.',
    relevo: 'O relevo de Tete subdivide-se em duas partes bem distintas: a norte, a formação dos planaltos da Marávia-Angónia e, a sul, a planície do vale do Zambeze. Os distritos de Macanga, Tsangano e Angónia situam-se a altitudes superiores a 1.000 metros, Changara e Mágoè a altitudes inferiores a 200 m e os restantes entre 200 e 1.000 m. O ponto mais alto é o monte Dómuè (2.093 m), no distrito de Angónia.',
    clima: 'A região sul tem clima tropical seco, com precipitação entre 600 e 800 mm. O norte e partes de Zumbu e Chiúta têm clima tropical de altitude, com precipitação entre 800 e 1.000 mm, e superior a 1.000 mm em Macanga, Angónia, Tsangano e norte da Marávia. Uma faixa oeste-este de Chiúta a Moatize tem clima tropical húmido.',
    censo: { ano: 2017, total: 2644650, h: 1292667, m: 1351983 } },
  // população do Censo 2017 (INE) por distrito
  dist: { 901: { censo: 472164, relevo: 'Planalto de altitude superior a 1.000 m; o ponto mais alto da província, o monte Dómuè (2.093 m), fica neste distrito.' }, 902: { censo: 128768 }, 903: { censo: 123056, relevo: 'Planície do vale do Zambeze, a altitudes inferiores a 200 m.' }, 904: { censo: 157647 }, 905: { censo: 101341 }, 906: { censo: 307338, sede: 'Cidade de Tete' }, 907: { censo: 158881, relevo: 'Planalto de altitude superior a 1.000 m.' }, 908: { censo: 89273, relevo: 'Planície do vale do Zambeze, a altitudes inferiores a 200 m.' }, 909: { censo: 126630 }, 910: { censo: 260843 }, 911: { censo: 168058 }, 912: { censo: 214560, relevo: 'Planalto de altitude superior a 1.000 m.' }, 913: { censo: 83144 }, 914: { censo: 87077 }, 915: { censo: 73044 } },
};
async function geoBase() { const c = (await S.db.doc('config/geografia').get()).data() || {}; const g = JSON.parse(JSON.stringify(GEO_PADRAO)); Object.assign(g.prov, c.prov || {}); for (const [d, x] of Object.entries(c.dist || {})) g.dist[d] = { ...(g.dist[d] || {}), ...x }; return g; }
// distritos vizinhos (pelas fronteiras do shapefile) e a direcção em que ficam
function vizinhosDistrito(d) {
  const d3 = window.d3; const fs = S.limites?.features || []; const me = fs.find((f) => codDistritoGeo(f, S.limitesCampo) === +d); if (!me || !d3) return [];
  const pts = (f) => { const out = []; const g = f.geometry; const an = g.type === 'Polygon' ? [g.coordinates[0]] : g.coordinates.map((p) => p[0]); for (const a of an) { const st = Math.max(1, Math.floor(a.length / 300)); for (let i = 0; i < a.length; i += st) out.push(a[i]); } return out; };
  const pm = pts(me); const c0 = d3.geoCentroid(me); const DIR = ['norte', 'nordeste', 'este', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste'];
  return fs.filter((f) => f !== me).map((f) => { const pf = pts(f); let mn = 9; for (const a of pm) for (const b of pf) { const dd = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); if (dd < mn) mn = dd; } return { f, mn }; }).filter((x) => x.mn < 0.04)
    .map(({ f }) => { const c = d3.geoCentroid(f); const ang = (Math.atan2(c[0] - c0[0], c[1] - c0[1]) * 180) / Math.PI; return { nome: distName(codDistritoGeo(f, S.limitesCampo)), dir: DIR[Math.round(((ang + 360) % 360) / 45) % 8] }; });
}
const grausTxt = (v, pos, neg) => `${Math.abs(v).toFixed(2).replace('.', ',')}° ${v >= 0 ? pos : neg}`;

// ---- moldura dos mapas no modelo da DPE: rosa-dos-ventos, escala em km, legenda com emblema, fontes, sistema de coordenadas e autoria ----
function quemElaborou(prov, dist) { const ano = new Date().getFullYear(); return prov ? `DPE Tete, ${ano}` : `SDEJT de ${distName(dist)}, ${ano}`; }
function rosaVentos(x, y, r = 16) { return `<g transform="translate(${x},${y})" font-family="Arial" font-weight="700" fill="#13221B"><polygon points="0,${-r} ${r * 0.22},${-r * 0.22} ${r},0 ${r * 0.22},${r * 0.22} 0,${r} ${-r * 0.22},${r * 0.22} ${-r},0 ${-r * 0.22},${-r * 0.22}" fill="#fff" stroke="#13221B" stroke-width="1"/><polygon points="0,${-r} ${r * 0.22},${-r * 0.22} 0,0" fill="#13221B"/><polygon points="${r},0 ${r * 0.22},${r * 0.22} 0,0" fill="#13221B"/><polygon points="0,${r} ${-r * 0.22},${r * 0.22} 0,0" fill="#13221B"/><polygon points="${-r},0 ${-r * 0.22},${-r * 0.22} 0,0" fill="#13221B"/><text x="0" y="${-r - 4}" font-size="11" text-anchor="middle">N</text><text x="0" y="${r + 12}" font-size="10" text-anchor="middle">S</text><text x="${r + 4}" y="4" font-size="10">E</text><text x="${-r - 4}" y="4" font-size="10" text-anchor="end">W</text></g>`; }
function barraEscala(x, y, esc) { if (!esc) return ''; const { passo, px } = esc; const meio = px / 2; return `<g transform="translate(${x},${y})" font-family="Arial" font-size="8.5" fill="#13221B"><rect x="0" y="0" width="${meio}" height="5" fill="#13221B"/><rect x="${meio}" y="0" width="${meio}" height="5" fill="#fff" stroke="#13221B" stroke-width=".8"/><text x="0" y="-3" text-anchor="middle">0</text><text x="${meio}" y="-3" text-anchor="middle">${passo / 2}</text><text x="${px}" y="-3" text-anchor="middle">${passo}</text><text x="${px + 4}" y="6">km</text></g>`; }
molduraMapa = function (svg, { fonte, prov, dist } = {}) {
  if (!svg || /data-moldura/.test(svg)) return svg;
  const m = svg.match(/width="(\d+)" height="(\d+)"/); if (!m) return svg; const W = +m[1], H = +m[2]; const P = 92;
  const esc = S.__proj ? escalaKm(S.__proj, W, H) : null; const cfg = S.fichaCfg || {};
  const linhas = [`Fonte de dados espaciais: ${cfg.fonteEspacial || (S.limites ? 'CENACARTA' : 'cadastro de escolas (coordenadas)')}`, `Dados qualitativos e quantitativos: ${cfg.fonteDados || (prov ? 'MEC / DPE Tete' : 'MEC / SDEJT ' + distName(dist))}`, 'Sistema de coordenadas geográficas: WGS 1984', `Elaborado por: ${cfg.elaborado || quemElaborou(prov, dist)}`];
  const corpo = svg.replace(/^<svg[^>]*>/, `<svg x="0" y="0" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  const emb = S.emblemaURL ? `<image x="${W * 0.38}" y="${H + 10}" width="44" height="44" href="${S.emblemaURL}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" data-moldura="1" viewBox="0 0 ${W} ${H + P}" width="${W}" height="${H + P}" font-family="Arial"><rect width="${W}" height="${H + P}" fill="#fff"/>${corpo}
    ${rosaVentos(40, 36)}
    <rect x="1" y="1" width="${W - 2}" height="${H + P - 2}" fill="none" stroke="#13221B" stroke-width="1.2"/><line x1="1" y1="${H}" x2="${W - 1}" y2="${H}" stroke="#13221B" stroke-width=".8"/>
    ${barraEscala(18, H + 30, esc)}${emb}
    ${linhas.map((t, i) => `<text x="${W * 0.38 + 54}" y="${H + 20 + i * 15}" font-size="8.6" font-weight="${i === 3 ? 700 : 600}" fill="#13221B">${esc_(t)}</text>`).join('')}</svg>`;
};
// ---- capa: mapa limpo (sem sombra), com rosa-dos-ventos e escala, como na carta da DPE ----
{
  const ac0 = arteCapa;
  arteCapa = (geo) => {
    const out = ac0(geo); const d3 = window.d3; if (!d3 || !geo || !S.limites) return out;
    const todos = S.limites.features; const sel = geo.prov ? todos : todos.filter((f) => codDistritoGeo(f, S.limitesCampo) === +geo.dist); if (!sel.length) return out;
    const MW = 520, MH = 330; const proj = d3.geoMercator().fitExtent([[22, 22], [MW - 22, MH - 22]], { type: 'FeatureCollection', features: sel }); const path = d3.geoPath(proj);
    let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MW} ${MH}" width="${MW}" height="${MH}" font-family="Arial"><rect width="${MW}" height="${MH}" fill="#fff"/>`;
    if (!geo.prov) for (const f of todos) if (!sel.includes(f)) g += `<path d="${path(f)}" fill="#fff" stroke="#9AA8A0" stroke-width=".7"/>`;
    for (const f of sel) g += `<path d="${path(f)}" fill="#F3EFC9" stroke="#2F7D32" stroke-width="1.3" stroke-linejoin="round"/>`;
    if (!geo.prov && S.limitesPostos) for (const p of S.limitesPostos.features) { try { if (!sel.some((f) => d3.geoContains(f, d3.geoCentroid(p)))) continue; g += `<path d="${path(p)}" fill="none" stroke="#2F7D32" stroke-width=".6" stroke-dasharray="3 2"/>`; } catch {} }
    if (geo.tipo === 'carta') for (const e of [...S.esc.values()]) { if (e.fecho || e.removida || (!geo.prov && +e.dist !== +geo.dist)) continue; const c = coordsEscola(e); if (!c) continue; const p = proj(c); g += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${geo.prov ? 1.3 : 2.2}" fill="#2F7D32" fill-opacity=".85"/>`; }
    for (const f of (geo.prov ? sel : todos)) { const [cx, cy] = path.centroid(f); if (!(cx > 0 && cx < MW && cy > 0 && cy < MH)) continue; const n = distName(codDistritoGeo(f, S.limitesCampo)); const forte = sel.includes(f); g += `<text x="${cx}" y="${cy}" font-size="${forte ? 10.5 : 8.5}" font-weight="${forte ? 700 : 400}" text-anchor="middle" fill="${forte ? '#13221B' : '#6B7A72'}" paint-order="stroke" stroke="#fff" stroke-width="2.4">${esc_(n)}</text>`; }
    g += rosaVentos(38, 44, 15) + barraEscala(24, MH - 18, escalaKm(proj, MW, MH)) + `<rect x=".6" y=".6" width="${MW - 1.2}" height="${MH - 1.2}" fill="none" stroke="#13221B" stroke-width="1.1"/></svg>`;
    out.mapa = g; return out;
  };
}

// ---- ficha técnica no modelo da DPE: título, editor, autor, colaboradores, apoio ----
async function carregarFichaCfg(prov, dist) { const id = `config/fichaTecnica_${prov ? 'prov' : dist}`; S.fichaCfgId = id; S.fichaCfg = (await S.db.doc(id).get()).data() || {}; return S.fichaCfg; }
fichaTecnicaPub = function (titulo, prov, dist, tipo, ano, versao) {
  const c = S.fichaCfg || {}; const inst = prov ? 'Direcção Provincial da Educação de Tete' : `Serviço Distrital de Educação, Juventude e Tecnologia de ${distName(dist)}`;
  const est = (() => { try { const e = estadoCiclo(ano, 'marco', prov ? 0 : +dist); return S.publicacao?.anos?.[ano] ? 'Dados publicados pela DPE' : ['Dados provisórios (por submeter)', 'Dados provisórios (submetidos à DPE)', 'Dados em revisão na DPE', 'Dados harmonizados pela DPE', 'Dados publicados'][prov ? (S.publicacao?.anos?.[ano] ? 4 : 0) : e.passo] || 'Dados provisórios'; } catch { return 'Dados provisórios'; } })();
  return [['Título', titulo], ['Editor', c.editor || inst], ['Autor', c.autor || inst], ...(c.colaboradores?.trim() ? [['Colaboradores', c.colaboradores.trim()]] : []), ...(c.apoio?.trim() ? [['Apoio', c.apoio.trim()]] : []),
    ['Edição', `${mesAnoPT()} · dados de ${ano}`], ['Fonte dos dados', c.fonteDados ? `${c.fonteDados}. Levantamentos estatísticos de 3 de Março e de fim do ano (EducStat)` : 'Levantamentos estatísticos de 3 de Março e de fim do ano (aproveitamento), EducStat. INE, Censo 2017 e projecções da população'], ['Estado dos dados', est], ['Produzido com', `EducStat Tete ${versao}`],
    ['Direitos', `© ${new Date().getFullYear()} ${inst}. É permitida a reprodução, total ou parcial, desde que citada a fonte.`]];
};
function cartaoFichaTecnica(st) {
  const prov = st.dist === 'Todos'; const c = S.fichaCfg || {}; const inst = prov ? 'Direcção Provincial da Educação de Tete' : `Serviço Distrital de Educação, Juventude e Tecnologia de ${distName(st.dist)}`;
  const campo = (k, lab, ph, ta) => { const el = h(ta ? 'textarea' : 'input', { rows: ta ? 4 : undefined, type: ta ? undefined : 'text', value: c[k] || '', placeholder: ph }); if (ta) el.value = c[k] || ''; el.oninput = () => { c[k] = el.value; }; return h('label', { class: 'f', style: ta ? 'flex:1 1 100%' : 'flex:1;min-width:16rem' }, lab, el); };
  return h('details', { class: 'card' }, h('summary', { text: `Ficha Técnica (${prov ? 'DPE' : 'SDEJT de ' + distName(st.dist)}): editor, autor, colaboradores e apoio` }),
    h('p', { class: 'note', text: 'Aparece na página 2 de cada relatório, como na carta escolar da DPE. A ficha técnica diz quem fez o documento; a nota técnica, a seguir, diz de onde vêm os dados e como se calcularam (âmbito, anos, fontes): é ela que permite a quem lê confiar nos números e repetir o cálculo. Por isso ficam as duas.' }),
    h('div', { class: 'row' }, campo('editor', 'Editor', inst), campo('autor', 'Autor', inst), campo('apoio', 'Apoio', 'ex.: DIPLAEC-MEC'),
      campo('colaboradores', 'Colaboradores (um por linha: nome – função)', 'Jane Doe – Chefe do Departamento\nJohn Doe – Técnico de Estatística', true),
      campo('fonteEspacial', 'Fonte dos dados espaciais (mapas)', 'CENACARTA'), campo('fonteDados', 'Dados qualitativos e quantitativos', prov ? 'MEC / DPE Tete' : 'MEC / SDEJT'), campo('elaborado', 'Elaborado por (nos mapas)', quemElaborou(prov, st.dist))),
    h('button', { class: 'btn primary', text: 'Gravar a ficha técnica', onclick: async () => { await S.db.doc(S.fichaCfgId).set({ ...c, em: new Date().toISOString(), por: S.sessao?.utilizador }); toast('Ficha técnica gravada. Gere de novo o relatório para a ver.'); } }));
}

// ---- recorte territorial: só alguns postos, localidades ou ZIP do distrito ----
function valoresRecorte(dist, nivel) { const campo = nivel === 'zip' ? 'zip' : nivel; const s = new Map(); for (const e of S.esc.values()) if (+e.dist === +dist && !e.removida && e[campo]) s.set(String(e[campo]), (s.get(String(e[campo])) || 0) + 1); return [...s.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt', { numeric: true })); }
const nomeRecorte = (r) => (r?.valores?.length ? `${{ posto: r.valores.length > 1 ? 'Postos' : 'Posto administrativo', localidade: r.valores.length > 1 ? 'Localidades' : 'Localidade', zip: r.valores.length > 1 ? 'ZIP' : 'ZIP' }[r.nivel]} de ${r.valores.join(', ')}` : '');
function escNoRecorte(r) { if (!r?.valores?.length) return () => true; const set = new Set(r.valores.map(String)); const campo = r.nivel; return (cod) => { const e = S.esc.get(+cod); return !!e && set.has(String(e[campo] ?? '')); }; }
async function comRecorte(st, fn) {
  const r = st.recorte; if (!r?.valores?.length || st.dist === 'Todos') return fn();
  const d = +st.dist; const ok = escNoRecorte(r); const fe0 = fichasEfectivas, rd0 = resumoDe; const cache = new Map();
  for (const a of ANOS.filter((a) => a <= +st.ano && a >= +st.ano - 6)) { const fm = await fe0(a, d); const fs = [...fm.values()].filter((f) => ok(f.esc)); if (fs.length) { const rr = window.EAgg.resumo(fs, escolaTipo, formados()); rr.estado = estadoDe(new Map(fs.map((f) => [f.esc, f]))); cache.set(`${a}_${d}`, rr); } }
  fichasEfectivas = async (a, dd, fr) => { const m = await fe0(a, dd, fr); return +dd === d ? new Map([...m].filter(([k]) => ok(k))) : m; };
  resumoDe = (a, dd) => (+dd === d ? cache.get(`${a}_${d}`) || null : rd0(a, dd));
  try { return await fn(); } finally { fichasEfectivas = fe0; resumoDe = rd0; }
}

// ---- Alfabetização e Educação de Adultos nos relatórios (os centros funcionam nas escolas: distrito, posto e localidade da escola) ----
async function blocosAEA({ prov, dist, ano, lugar, recorte, numInicial = { t: 0, g: 0 } }) {
  const B = []; let nT = numInicial.t, nG = numInicial.g;
  const anos = ANOS_A.filter((a) => a <= +ano); if (!anos.length) return B;
  const okEsc = escNoRecorte(recorte); const dv = S.pubDiv || 'posto';
  const doCentro = (f) => { if (!prov && +f.dist !== +dist) return false; const c = S.cen?.get(+f.cen); return !recorte?.valores?.length || (c?.esc && okEsc(c.esc)); };
  const unid = (f) => { if (prov) return distName(f.dist); const e = S.esc.get(+(S.cen?.get(+f.cen)?.esc)); return dv === 'localidade' || dv === 'ambos' ? (e?.localidade || 'Sem localidade') : dv === 'distrito' ? distName(dist) : (e?.posto || 'Sem posto'); };
  const todos = {}; for (const a of anos) { const m = await alfaFichas(a, !!S.db); todos[a] = new Map([...m].filter(([, f]) => doCentro(f))); }
  const A1 = [...anos].reverse().find((a) => todos[a].size) || anos[anos.length - 1]; const fm = todos[A1];
  const TAB = (titulo, cab, linhas, fonte = 'Levantamentos da alfabetização e EPJA (AdultStat/EducStat).') => B.push({ t: 'tabela', titulo: `Tabela ${++nT}: ${lugar}: ${titulo}`, cab, linhas, fonte });
  const GR = (titulo, g, fonte = 'Levantamentos da alfabetização e EPJA.') => g?.svg && B.push({ t: 'img', titulo: `Gráfico ${++nG}: ${lugar}: ${titulo}`, svg: g.svg, dados: g.dados, fonte });
  const pr = (a, b) => (b ? pctTxt(a / b) : '—'); const s2 = (x) => x[0] + x[1];
  B.push({ t: 'h1', texto: 'Alfabetização e Educação de Adultos (AEA)' });
  if (!fm.size) { B.push({ t: 'p', texto: `Não há mapas de centros de alfabetização e EPJA para ${lugar} em ${A1}.` }); return { B, nT, nG }; }
  const { T, prog, niv } = alfaSum(fm, { dist: 'Todos' });
  B.push({ t: 'p', texto: `Em ${A1}, ${numTxt(fm.size)} centros de alfabetização e educação de adultos de ${lugar} enviaram o mapa. Inscreveram-se ${numTxt(s2(T.insA))} alfabetizandos (${pctTxt(T.insA[1] / (s2(T.insA) || 1))} mulheres) e ${numTxt(s2(T.insE))} alunos da EPJA. A taxa de aprovação foi de ${pr(s2(T.apA), s2(T.fimA))} na alfabetização e de ${pr(s2(T.apE), s2(T.fimE))} na EPJA. Os centros funcionam nas escolas: aparecem no distrito, posto e localidade da escola a que pertencem.` });
  // por unidade
  const g = new Map(); for (const f of fm.values()) { const u = unid(f); (g.get(u) || g.set(u, new Map()).get(u)).set(f.cen, f); }
  const lin = [...g.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt')).map(([u, m]) => { const x = alfaSum(m, { dist: 'Todos' }).T; return { u, n: m.size, x }; });
  const row = (n, cent, x) => [n, numTxt(cent), numTxt(x.insA[0]), numTxt(x.insA[1]), numTxt(s2(x.insA)), numTxt(s2(x.insE)), pr(s2(x.apA), s2(x.fimA)), pr(s2(x.apE), s2(x.fimE)), numTxt(x.cap + x.sem)];
  const nomeU = prov ? 'Distrito' : divU().nome;
  TAB(`Alfabetização e EPJA por ${nomeU.toLowerCase()}, ${A1}`, [nomeU, 'Centros', 'Alfab. H', 'Alfab. M', 'Alfab. HM', 'EPJA HM', 'Aprovação alfab.', 'Aprovação EPJA', 'Alfabetizadores'], [...lin.map((l) => row(l.u, l.n, l.x)), row('Total', fm.size, T)]);
  if (lin.length > 1) GR(`Taxa de aprovação na alfabetização por ${nomeU.toLowerCase()}, ${A1}`, { svg: svgBarras({ cats: lin.map((l) => l.u), series: [{ nome: 'Aprovação', cor: '#7A4FA0', vals: lin.map((l) => (s2(l.x.fimA) ? s2(l.x.apA) / s2(l.x.fimA) : null)) }], pct: true, horiz: true, H: Math.max(160, lin.length * 28 + 20) }), dados: { tipo: 'barras', cats: lin.map((l) => l.u), series: [{ nome: 'Aprovação', cor: '#7A4FA0', vals: lin.map((l) => (s2(l.x.fimA) ? s2(l.x.apA) / s2(l.x.fimA) : null)) }], pct: true, horiz: true } });
  const tabP = (obj, labels, nome) => { const ls = labels.filter(([k]) => obj[k]).map(([k, l]) => { const o = obj[k]; return [l, numTxt(o.ins[0]), numTxt(o.ins[1]), numTxt(s2(o.ins)), numTxt(s2(o.fim)), numTxt(s2(o.ap)), pr(s2(o.ap), s2(o.fim))]; }); if (ls.length) TAB(`${nome}, ${A1}`, ['', 'Inscritos H', 'Inscritos M', 'Inscritos HM', 'No fim do ano', 'Aprovados', '% aprovação'], ls); };
  tabP(prog, S.cod.programas, 'Alfabetização por programa'); tabP(niv, S.cod.niveisEPJA, 'EPJA por nível');
  const ser = anos.filter((a) => todos[a].size).map((a) => ({ a, x: alfaSum(todos[a], { dist: 'Todos' }).T, n: todos[a].size }));
  if (ser.length > 1) { TAB(`Evolução da alfabetização e EPJA, ${ser[0].a}-${ser[ser.length - 1].a}`, ['Ano', 'Centros', 'Inscritos alfab.', 'Inscritos EPJA', 'Aprovação alfab.', 'Aprovação EPJA'], ser.map((s) => [String(s.a), numTxt(s.n), numTxt(s2(s.x.insA)), numTxt(s2(s.x.insE)), pr(s2(s.x.apA), s2(s.x.fimA)), pr(s2(s.x.apE), s2(s.x.fimE))]));
    GR(`Taxa de aprovação na alfabetização e na EPJA, ${ser[0].a}-${ser[ser.length - 1].a}`, { svg: svgLinhas({ anos: ser.map((s) => s.a), series: [{ nome: 'Alfabetização', cor: '#7A4FA0', vals: ser.map((s) => (s2(s.x.fimA) ? s2(s.x.apA) / s2(s.x.fimA) : null)) }, { nome: 'EPJA', cor: '#C98E00', vals: ser.map((s) => (s2(s.x.fimE) ? s2(s.x.apE) / s2(s.x.fimE) : null)) }] }), dados: { tipo: 'linha', cats: ser.map((s) => String(s.a)), series: [{ nome: 'Alfabetização', cor: '#7A4FA0', vals: ser.map((s) => (s2(s.x.fimA) ? s2(s.x.apA) / s2(s.x.fimA) : null)) }, { nome: 'EPJA', cor: '#C98E00', vals: ser.map((s) => (s2(s.x.fimE) ? s2(s.x.apE) / s2(s.x.fimE) : null)) }], pct: true } }); }
  B.push({ t: 'p', texto: `Alfabetizadores: ${numTxt(T.cap)} capacitados e ${numTxt(T.sem)} sem capacitação. Turmas: ${numTxt(T.turA)} de alfabetização e ${numTxt(T.turE)} de EPJA.` });
  return { B, nT, nG };
}
async function construirAEA({ dist, ano }) {
  const prov = dist === 'Todos'; const lugar = prov ? 'Província de Tete' : `Distrito de ${distName(dist)}`; const st = S.pubSt || {}; const versao = (await window.educstat.info()).versao;
  const { B } = await blocosAEA({ prov, dist, ano, lugar, recorte: st.recorte });
  const intro = [{ t: 'h1', texto: 'Nota introdutória' }, { t: 'p', texto: `Este relatório apresenta a situação da Alfabetização e Educação de Adultos (AEA) ${prov ? 'na Província de Tete' : 'no ' + lugar}: centros, alfabetizandos e alunos da Educação de Pessoas Jovens e Adultas (EPJA), aproveitamento e alfabetizadores, a partir dos mapas dos centros (levantamentos de Abril e de Dezembro).` }];
  const glo = [{ t: 'h1', texto: 'Glossário' }, ...[['Centro de alfabetização', 'Local onde funcionam as turmas de alfabetização e EPJA; em regra pertence a uma escola.'], ['EPJA', 'Educação de Pessoas Jovens e Adultas, organizada por níveis.'], ['Taxa de aprovação', 'Aprovados ÷ alunos no fim do ano × 100.'], ['Alfabetizador capacitado', 'Alfabetizador que frequentou a capacitação metodológica.']].map(([t, d]) => ({ t: 'p', termo: t, texto: d }))];
  const titulo = `Alfabetização e Educação de Adultos — ${lugar} ${ano}`;
  const capa = capaPub(prov, dist, 'brochura', ano); capa.rodape = `Alfabetização e Educação de Adultos · ${lugar} · EducStat Tete`;
  return { ...capa, titulo: 'Alfabetização e Educação de Adultos', subtitulo: `${lugar}${st.recorte?.valores?.length ? ' · ' + nomeRecorte(st.recorte) : ''} · centros, inscritos, aproveitamento e alfabetizadores`, assunto: 'Alfabetização e Educação de Adultos', blocos: [...intro, ...B, ...glo],
    notaTecnica: [['Âmbito', lugar + (st.recorte?.valores?.length ? ` (${nomeRecorte(st.recorte)})` : '')], ['Ano de referência', String(ano)], ['Fontes', 'Mapas dos centros de alfabetização e EPJA (AdultStat/EducStat)'], ['Sistema', `EducStat Tete ${versao}`]], fichaTecnica: fichaTecnicaPub(titulo, prov, dist, 'aea', ano, versao) };
}

// ---- carta escolar: secções do modelo da DPE (localização, superfície e divisão administrativa, relevo e clima, população) ----
async function seccoesGeograficas({ prov, dist, ano, lugar }) {
  const d3 = window.d3; const G = await geoBase(); const B = []; const P = (t) => B.push({ t: 'p', texto: t }); const H1 = (t) => B.push({ t: 'h1', texto: t });
  const MAP = (titulo, svg, fonte) => svg && B.push({ t: 'img', titulo: `Mapa 0: ${titulo}`, svg: molduraMapa(svg, { fonte, prov, dist }), fonte });
  const fs = S.limites?.features || []; const sel = prov ? fs : fs.filter((f) => codDistritoGeo(f, S.limitesCampo) === +dist);
  const desenho = (opts = {}) => {
    if (!d3 || !sel.length) return null; const W = 640, H = 430; const proj = d3.geoMercator().fitExtent([[50, 20], [W - 20, H - 20]], { type: 'FeatureCollection', features: sel }); const path = d3.geoPath(proj);
    let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial"><rect width="${W}" height="${H}" fill="#EAF3F7"/>`;
    for (const f of fs) if (!sel.includes(f)) g += `<path d="${path(f)}" fill="#fff" stroke="#9AA8A0" stroke-width=".7"/>`;
    for (const f of sel) g += `<path d="${path(f)}" fill="${opts.cor ? opts.cor(f) : '#F3EFC9'}" stroke="#2F7D32" stroke-width="1.2"/>`;
    if (opts.postos && S.limitesPostos) for (const p of S.limitesPostos.features) { try { if (!sel.some((f) => d3.geoContains(f, d3.geoCentroid(p)))) continue; g += `<path d="${path(p)}" fill="none" stroke="#C0392B" stroke-width=".7" stroke-dasharray="3 2"/>`; const [cx, cy] = path.centroid(p); g += `<text x="${cx}" y="${cy}" font-size="8.5" fill="#C0392B" text-anchor="middle" paint-order="stroke" stroke="#fff" stroke-width="2">${esc_(p.properties?.__alias || p.properties?.__nome || '')}</text>`; } catch {} }
    for (const f of (prov ? sel : fs)) { const [cx, cy] = path.centroid(f); if (!(cx > 0 && cx < W && cy > 0 && cy < H)) continue; const forte = sel.includes(f); const n = distName(codDistritoGeo(f, S.limitesCampo)); g += `<text x="${cx}" y="${cy + (opts.rotulo ? -4 : 0)}" font-size="${forte ? 10 : 8.5}" font-weight="${forte ? 700 : 400}" text-anchor="middle" fill="${forte ? '#13221B' : '#6B7A72'}" paint-order="stroke" stroke="#fff" stroke-width="2.4">${esc_(n)}</text>${opts.rotulo && forte ? `<text x="${cx}" y="${cy + 8}" font-size="8.5" text-anchor="middle" fill="#13221B" paint-order="stroke" stroke="#fff" stroke-width="2.4">${esc_(opts.rotulo(f))}</text>` : ''}`; }
    if (opts.legenda) { const L = opts.legenda; g += `<rect x="${W - 170}" y="${H - 14 - L.length * 15 - 18}" width="158" height="${L.length * 15 + 22}" fill="#FFFBE6" stroke="#13221B" stroke-width=".7"/><text x="${W - 162}" y="${H - L.length * 15 - 18}" font-size="9.5" font-weight="700">Legenda:</text>` + L.map(([cor, t], i) => `<rect x="${W - 162}" y="${H - L.length * 15 - 12 + i * 15}" width="12" height="9" fill="${cor}" stroke="#2F7D32" stroke-width=".7"/><text x="${W - 145}" y="${H - L.length * 15 - 4 + i * 15}" font-size="8.8">${esc_(t)}</text>`).join(''); }
    return g + '</svg>';
  };
  const gd = prov ? null : (G.dist[+dist] || {});
  // localização geográfica
  H1(prov ? 'Localização geográfica da Província de Tete' : `Localização geográfica do ${lugar}`);
  if (prov) P(G.prov.limites);
  else { const viz = vizinhosDistrito(dist); const porDir = new Map(); for (const v of viz) (porDir.get(v.dir) || porDir.set(v.dir, []).get(v.dir)).push(v.nome);
    let ext = ''; try { const b = d3.geoBounds({ type: 'FeatureCollection', features: sel }); ext = ` Situa-se entre as latitudes ${grausTxt(b[1][1], 'N', 'S')} e ${grausTxt(b[0][1], 'N', 'S')} e as longitudes ${grausTxt(b[0][0], 'E', 'W')} e ${grausTxt(b[1][0], 'E', 'W')}.`; } catch {}
    P(`${lugar === 'Distrito de Cidade de Tete' ? 'A Cidade de Tete' : 'O ' + lugar} localiza-se na Província de Tete${gd.sede ? ', com sede em ' + gd.sede : ''}.${ext}${porDir.size ? ' Faz limite ' + [...porDir.entries()].map(([dd, ns]) => `a ${dd} com ${ns.join(' e ')}`).join(', ') + '.' : ''}${gd.limites ? ' ' + gd.limites : ''}`); }
  MAP(prov ? 'Localização geográfica da Província de Tete' : `Localização geográfica do ${lugar}`, desenho({ legenda: prov ? [['#F3EFC9', 'Distritos de Tete']] : [['#F3EFC9', lugar.replace('Distrito de ', '')], ['#fff', 'Outros distritos']] }), 'Limites administrativos');
  // superfície e divisão administrativa
  H1('Superfície e divisão administrativa');
  const area = prov ? G.prov.area : (gd.area || Math.round(areaKm2(sel)));
  const postos = prov ? null : [...new Set([...S.esc.values()].filter((e) => +e.dist === +dist && e.posto && !e.removida).map((e) => e.posto))].sort((a, b) => a.localeCompare(b, 'pt'));
  const locs = prov ? null : [...new Set([...S.esc.values()].filter((e) => +e.dist === +dist && e.localidade && !e.removida).map((e) => e.localidade))];
  if (prov) P(`Superfície total: ${numTxt(G.prov.area)} km² (terra firme ${numTxt(G.prov.terraFirme)} km² e águas interiores ${numTxt(G.prov.aguas)} km²). A capital da província é a ${G.prov.sede}. A província tem ${S.cod.distritosTodos.length} distritos, ${G.prov.postos} postos administrativos e ${G.prov.localidades} localidades, e possui também os municípios de ${G.prov.municipios}.`);
  else P(`${area ? `O distrito tem uma superfície de cerca de ${numTxt(area)} km²${gd.area ? '' : ' (calculada a partir dos limites carregados)'}. ` : ''}${postos.length ? `Divide-se em ${postos.length} posto${postos.length > 1 ? 's' : ''} administrativo${postos.length > 1 ? 's' : ''} (${postos.join(', ')})` : ''}${locs.length ? ` e ${locs.length} localidades com escolas no cadastro` : ''}.`);
  if (prov) { const linhas = S.cod.distritosTodos.map(([d, n]) => { const a = G.dist[d]?.area || Math.round(areaKm2(fs.filter((f) => codDistritoGeo(f, S.limitesCampo) === d))); return [n, a ? numTxt(a) : '—', numTxt(new Set([...S.esc.values()].filter((e) => +e.dist === d && e.posto).map((e) => e.posto)).size)]; });
    B.push({ t: 'tabela', titulo: `Tabela 0: ${lugar}: superfície e postos administrativos por distrito`, cab: ['Distrito', 'Superfície (km²)', 'Postos com escolas'], linhas, fonte: S.limites ? 'Superfície calculada a partir dos limites (shapefile) carregados pela DPE.' : 'Configurações da DPE.' }); }
  else if (postos.length) { const lp = postos.map((p) => { const ls = new Set([...S.esc.values()].filter((e) => +e.dist === +dist && e.posto === p && e.localidade).map((e) => e.localidade)); const fp = (S.limitesPostos?.features || []).filter((f) => normGeo(f.properties?.__alias || f.properties?.__nome) === normGeo(p)); const ar = fp.length ? Math.round(areaKm2(fp)) : null; return [p, ar ? numTxt(ar) : '—', numTxt(ls.size), [...ls].sort((a, b) => a.localeCompare(b, 'pt')).join(', ')]; });
    B.push({ t: 'tabela', titulo: `Tabela 0: ${lugar}: postos administrativos e localidades`, cab: ['Posto administrativo', 'Superfície (km²)', 'Localidades', 'Nomes das localidades'], linhas: lp, fonte: 'Cadastro de escolas e limites carregados pela DPE.' }); }
  MAP(`Superfície e divisão administrativa ${prov ? 'da Província de Tete' : 'do ' + lugar}`, desenho({ postos: true, rotulo: (f) => { const d = codDistritoGeo(f, S.limitesCampo); const a = G.dist[d]?.area || Math.round(areaKm2([f])); return a ? `${numTxt(a)} km²` : ''; }, legenda: [['#F3EFC9', prov ? 'Distritos' : 'Distrito'], ...(S.limitesPostos ? [['#fff', 'Postos administrativos (tracejado)']] : [])] }), 'Limites administrativos');
  // relevo e clima
  H1(prov ? 'Relevo e clima' : 'Relevo e clima do distrito');
  if (prov) { P(G.prov.relevo); P(G.prov.clima); } else P(gd.relevo || `O ${lugar.replace('Distrito', 'distrito')} insere-se no quadro geral da província: ${G.prov.relevo.split('. ')[0].replace(/^O relevo/, 'o relevo')}. Os dados detalhados do relevo do distrito podem ser acrescentados em Administração > Configurações > Dados geográficos.`);
  // população (censo)
  H1('População'); const RP = G.prov.pop?.ano ? `INE, projecção ${G.prov.pop.ano}` : 'Censo 2017'; const popD = (d) => G.dist[d]?.pop || G.dist[d]?.censo || 0;
  if (prov) { const c = G.prov.censo; P(G.prov.pop?.total ? `Segundo as projecções do INE, a Província de Tete tem ${numTxt(G.prov.pop.total)} habitantes em ${G.prov.pop.ano}; no Censo de ${c.ano} eram ${numTxt(c.total)} (${numTxt(c.h)} homens e ${numTxt(c.m)} mulheres). A população está distribuída de forma irregular pelos distritos.` : `A Província de Tete tem uma população total de ${numTxt(c.total)} habitantes (Censo ${c.ano}), dos quais ${numTxt(c.h)} homens e ${numTxt(c.m)} mulheres, distribuída de forma irregular pelos distritos.`);
    const tot = S.cod.distritosTodos.reduce((t, [d]) => t + (popD(d)), 0); const ord = S.cod.distritosTodos.map(([d, n]) => [n, popD(d)]).sort((a, b) => b[1] - a[1]);
    if (tot) { P(`As maiores concentrações estão em ${ord.slice(0, 3).map(([n, v]) => `${n} (${pctTxt(v / tot)})`).join(', ')}; os distritos menos populosos são ${ord.slice(-3).map(([n, v]) => `${n} (${pctTxt(v / tot)})`).join(', ')}.`);
      B.push({ t: 'tabela', titulo: `Tabela 0: ${lugar}: população por distrito (${RP}) e densidade`, cab: ['Distrito', `População (${RP})`, '% da província', 'Superfície (km²)', 'Habitantes por km²'], linhas: [...S.cod.distritosTodos.map(([d, n]) => { const p = popD(d); const a = G.dist[d]?.area || Math.round(areaKm2(fs.filter((f) => codDistritoGeo(f, S.limitesCampo) === d))); return [n, numTxt(p), pctTxt(p / tot), a ? numTxt(a) : '—', a ? R1.format(p / a) : '—']; }), ['Total', numTxt(tot), '100,0%', numTxt(G.prov.area), R1.format(tot / G.prov.area)]], fonte: 'INE, Censo 2017.' });
      const vs = Object.fromEntries(S.cod.distritosTodos.map(([d]) => [d, popD(d) || null])); MAP(`População da Província de Tete, ${RP}`, svgMapa({ vals: vs, fmtv: numTxt, legenda: `Habitantes (${RP})` }), RP); } }
  else { const p = gd.pop || gd.censo; if (p) P(`Segundo ${gd.pop ? 'as projecções do INE para ' + (G.prov.pop?.ano || 2023) : 'o Censo de 2017 (INE)'}, o ${lugar.replace('Distrito de ', 'distrito de ')} tinha ${numTxt(p)} habitantes${area ? `, numa superfície de ${numTxt(area)} km² (${R1.format(p / area)} habitantes por km²)` : ''}, o que representa ${pctTxt(p / (G.prov.pop?.total || G.prov.censo.total || 1))} da população da província.`); }
  P(`A população em idade escolar estimada para ${ano} (projecções do INE) apresenta-se na secção seguinte.`);
  return B;
}

{
  const cp0 = construirPublicacao;
  construirPublicacao = async (o) => {
    const st = S.pubSt || {}; const prov = o.dist === 'Todos';
    await carregarFichaCfg(prov, o.dist);
    if (o.tipo === 'aea') return comRecorte(st, () => construirAEA(o));
    const doc = await comRecorte(st, () => cp0(o));
    const lugar = prov ? 'Província de Tete' : `Distrito de ${distName(o.dist)}`;
    if (st.recorte?.valores?.length && !prov) { doc.subtitulo = `${doc.subtitulo || ''} · ${nomeRecorte(st.recorte)}`; doc.notaTecnica = [...(doc.notaTecnica || []), ['Recorte territorial', nomeRecorte(st.recorte)], ['Atenção', 'As taxas que usam a população (escolarização, admissão, conclusão) referem-se ao distrito inteiro e não ao recorte.']]; }
    if (o.tipo === 'carta') {
      const bl = doc.blocos; const iN = bl.findIndex((b) => b.t === 'h1' && b.texto === 'Nota introdutória'); const iPop = bl.findIndex((b) => b.t === 'h1' && b.texto === 'População');
      if (iN >= 0) { let j = iN + 1; while (j < bl.length && bl[j].t === 'p') j++; bl.splice(iN + 1, j - iN - 1, { t: 'p', texto: `O presente documento aborda, de forma simples e técnica, o ponto de situação da Carta Escolar ${prov ? 'na Província de Tete' : 'no ' + lugar}${st.recorte?.valores?.length ? ' (' + nomeRecorte(st.recorte) + ')' : ''}, onde são analisados vários indicadores (cobertura, eficácia interna e gestão de recursos) que concorrem para o alcance dos objectivos traçados no Plano Estratégico da Educação (PEE) 2020-2029.` }, { t: 'p', texto: prov ? 'A coordenação com os técnicos dos distritos para harmonizar a base da carta escolar foi um momento importante para a produção deste relatório.' : `A coordenação entre o SDEJT e as escolas do distrito, e a harmonização com a Direcção Provincial, foram importantes para a produção deste relatório.` }); }
      try { const geo = await seccoesGeograficas({ prov, dist: o.dist, ano: +o.ano, lugar }); const ip = bl.findIndex((b) => b.t === 'h1' && b.texto === 'População'); if (ip >= 0) { bl[ip] = { t: 'h1', texto: 'População em idade escolar' }; bl.splice(ip, 0, ...geo); } } catch (e) { console.warn('secções geográficas', e); }
      void iPop;
    }
    if ((st.aea || o.tipo === 'carta') && o.tipo !== 'retro') { try { const r = await blocosAEA({ prov, dist: o.dist, ano: +o.ano, lugar, recorte: st.recorte }); const iC = doc.blocos.findIndex((b) => b.t === 'h1' && /^(Conclusão|Glossário)$/.test(b.texto)); if (r.B?.length) doc.blocos.splice(iC >= 0 ? iC : doc.blocos.length, 0, ...r.B); } catch (e) { console.warn('AEA', e); } }
    if (o.tipo === 'carta') doc.blocos.push({ t: 'h1', texto: 'Glossário' }, ...[['Carta escolar', 'Instrumento de planificação que mostra a localização, as condições e o funcionamento da rede escolar, para orientar a sua expansão.'], ['DUAT', 'Direito de Uso e Aproveitamento da Terra: título que confirma que a escola pode usar o terreno onde está.'], ['Taxa de aproveitamento escolar', 'Aprovados ÷ alunos matriculados no início do ano × 100.'], ['Taxa de conclusão', 'Aprovados na última classe do nível ÷ população com a idade oficial de conclusão × 100.'], ['Taxa de retenção', 'Alunos que chegam a uma classe ÷ alunos que entraram na 1ª classe da mesma coorte × 100.'], ['Taxa de desistência', 'Desistentes ÷ alunos matriculados no início do ano × 100.'], ['Proporção de raparigas', 'Alunas ÷ total de alunos × 100.'], ['Rácio aluno/professor', 'Alunos ÷ professores em exercício.']].map(([t, d]) => ({ t: 'p', termo: t, texto: d })));
    return doc;
  };
}
// numeração separada de mapas e gráficos, e listas de mapas e de gráficos (como no modelo da DPE)
{
  const aj0 = ajustarPublicacao;
  ajustarPublicacao = (d0, st) => {
    const d = aj0(d0, st); let nt = 0, nm = 0, ng = 0, nf = 0; const lm = [], lg = [];
    const ren = (t, tipo, n) => String(t || '').replace(/^(Tabela|Gráfico|Mapa|Figura) \d+:\s*/, '').replace(/^/, `${tipo} ${n}: `);
    d.blocos = d.blocos.map((b) => { if (b.t === 'tabela') return { ...b, titulo: ren(b.titulo, 'Tabela', ++nt) }; if (b.t !== 'img') return b; const tipo = /^Mapa/.test(b.titulo) ? 'Mapa' : b.dados ? 'Gráfico' : 'Figura'; const n = tipo === 'Mapa' ? ++nm : tipo === 'Gráfico' ? ++ng : ++nf; const t = ren(b.titulo, tipo, n); (tipo === 'Mapa' ? lm : tipo === 'Gráfico' ? lg : []).push(t.replace(/^(Mapa|Gráfico) (\d+): /, '$1 $2. ')); return { ...b, titulo: t }; });
    if (st?.tipo === 'carta' || lm.length > 3) { d.listaMapas = lm; d.listaGraficos = lg; }
    return d;
  };
}
// ecrã dos relatórios: tipo AEA, incluir AEA, recorte territorial e ficha técnica
{
  const pub0 = VIEWS.publicacoes;
  VIEWS.publicacoes = async (v) => {
    await pub0(v); const st = S.pubSt; st.recorte ||= { nivel: 'posto', valores: [] };
    const card = v.querySelector(':scope > .card'); if (!card) return; const sels = card.querySelectorAll('select');
    const tipoSel = sels[0]; if (tipoSel && ![...tipoSel.options].some((o) => o.value === 'aea')) tipoSel.append(h('option', { value: 'aea', text: 'Alfabetização e Educação de Adultos (AEA)', selected: st.tipo === 'aea' }));
    const aea = h('label', { class: 'chk', title: 'Junta à brochura um capítulo da alfabetização e EPJA (a carta escolar já o inclui)' }, h('input', { type: 'checkbox', checked: !!st.aea, onchange: (e) => { st.aea = e.target.checked; } }), 'Incluir a AEA (alfabetização e EPJA)');
    const rec = h('div', { class: 'row', style: 'align-items:flex-start;gap:10px' });
    const desenharRec = async () => {
      rec.replaceChildren(); if (st.dist === 'Todos') { st.recorte.valores = []; rec.append(h('p', { class: 'note', text: 'Para fazer o relatório só de um posto, de uma localidade ou de uma ZIP, escolha primeiro um distrito no Âmbito.' })); return; }
      const nv = h('select', { onchange: (e) => { st.recorte = { nivel: e.target.value, valores: [] }; desenharRec(); } }, [['posto', 'Postos administrativos'], ['localidade', 'Localidades'], ['zip', 'ZIP (zonas de influência pedagógica)']].map(([k, l]) => h('option', { value: k, text: l, selected: st.recorte.nivel === k })));
      const vals = valoresRecorte(st.dist, st.recorte.nivel); const set = new Set(st.recorte.valores);
      const lista = h('div', { class: 'recorte-lista', style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(13rem,1fr));gap:2px 10px;max-height:9.5rem;overflow:auto;flex:1;min-width:20rem;border:1px solid var(--line);border-radius:8px;padding:6px 8px' },
        vals.length ? vals.map(([n, c]) => h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: set.has(n), onchange: (e) => { if (e.target.checked) set.add(n); else set.delete(n); st.recorte.valores = [...set]; resumo.textContent = st.recorte.valores.length ? `Só: ${st.recorte.valores.join(', ')}` : 'O distrito inteiro'; } }), `${n} (${c})`)) : h('span', { class: 'note', text: 'Sem valores no cadastro das escolas (carregue a carta escolar em Configurações).' }));
      const resumo = h('p', { class: 'note', text: st.recorte.valores.length ? `Só: ${st.recorte.valores.join(', ')}` : 'O distrito inteiro' });
      rec.append(h('label', { class: 'f' }, 'Recorte: só alguns', nv), lista, h('div', {}, resumo, h('button', { class: 'btn sm', text: 'Limpar (distrito inteiro)', onclick: () => { st.recorte.valores = []; desenharRec(); } })));
    };
    card.append(h('div', { style: 'border-top:1px solid var(--line);padding-top:10px;margin-top:6px;display:flex;flex-direction:column;gap:8px' }, h('div', { class: 'row' }, aea), h('strong', { text: 'Recorte territorial (opcional)' }), rec));
    card.addEventListener('change', (e) => { if (e.target === sels[1]) { desenharRec(); carregarFichaCfg(st.dist === 'Todos', st.dist).then(() => { fichaBox.replaceChildren(cartaoFichaTecnica(st)); }); } });
    const fichaBox = h('div'); card.after(fichaBox); await carregarFichaCfg(st.dist === 'Todos', st.dist); fichaBox.append(cartaoFichaTecnica(st));
    desenharRec();
  };
}

// nomes com codificação errada nos limites já gravados (ex.: “MarÃ¡via”)
const desMoji = (v) => { if (typeof v !== 'string' || !/Ã[\u0080-¿¡-¿]/.test(v)) return v; try { const b = Uint8Array.from([...v].map((c) => c.charCodeAt(0) & 255)); const t = new TextDecoder('utf-8', { fatal: true }).decode(b); return t; } catch { return v; } };
{
  const cl0 = carregarLimitesS;
  carregarLimitesS = async () => { const ja = S.limites !== undefined; await cl0(); if (ja) return; for (const fc of [S.limites, S.limitesPostos, S.limitesLocalidades]) for (const f of fc?.features || []) for (const [k, v] of Object.entries(f.properties || {})) f.properties[k] = desMoji(v); };
}
// ---------------- Configurações > Dados geográficos (superfície, população do Censo, sede, limites, relevo) ----------------
async function cartaoDadosGeograficos() {
  const G = await geoBase(); const c = (await S.db.doc('config/geografia').get()).data() || { prov: {}, dist: {} }; c.prov ||= {}; c.dist ||= {};
  const inp = (obj, k, val, w = '7rem', ta) => { const el = h(ta ? 'textarea' : 'input', { type: ta ? undefined : 'text', rows: ta ? 2 : undefined, value: val ?? '', style: `width:${w}` }); if (ta) el.value = val ?? ''; el.oninput = () => { obj[k] = /^(area|censo|pop|terraFirme|aguas|postos|localidades)$/.test(k) ? (el.value.trim() ? +el.value.replace(/\D/g, '') : undefined) : el.value; }; return el; };
  const linhas = S.cod.distritosTodos.map(([d, n]) => { const o = (c.dist[d] ||= {}); const g = G.dist[d] || {}; const ac = Math.round(areaKm2((S.limites?.features || []).filter((f) => codDistritoGeo(f, S.limitesCampo) === d)));
    return h('tr', {}, h('td', { class: 'l', text: n }), h('td', {}, inp(o, 'area', g.area ?? '', '6rem')), h('td', { class: 'note', text: ac ? NF.format(ac) : '—' }), h('td', {}, inp(o, 'censo', g.censo ?? '', '7rem')), h('td', {}, inp(o, 'pop', g.pop ?? '', '7rem')), h('td', {}, inp(o, 'sede', g.sede ?? '', '9rem')), h('td', {}, inp(o, 'relevo', g.relevo ?? '', '22rem', true)), h('td', {}, inp(o, 'limites', g.limites ?? '', '18rem', true))); });
  const P = c.prov;
  return h('details', { class: 'card' }, h('summary', { text: '6. Dados geográficos para a carta escolar (superfície, população do Censo, relevo, limites)' }),
    h('p', { class: 'note', text: 'Entram nas secções “Localização geográfica”, “Superfície e divisão administrativa”, “Relevo e clima” e “População” da carta escolar. A superfície, se ficar vazia, calcula-se a partir dos limites (shapefile). Os vizinhos de cada distrito também se encontram pelos limites. Vêm preenchidos com os dados da Carta Escolar da Província 2024 (DPE) e do Censo 2017 (INE); corrija ou complete quando houver dados mais recentes.' }),
    h('div', { class: 'row' }, h('label', { class: 'f' }, 'Superfície da província (km²)', inp(P, 'area', G.prov.area)), h('label', { class: 'f' }, 'Terra firme (km²)', inp(P, 'terraFirme', G.prov.terraFirme)), h('label', { class: 'f' }, 'Águas interiores (km²)', inp(P, 'aguas', G.prov.aguas)), h('label', { class: 'f' }, 'Postos administrativos', inp(P, 'postos', G.prov.postos, '5rem')), h('label', { class: 'f' }, 'Localidades', inp(P, 'localidades', G.prov.localidades, '5rem'))),
    h('label', { class: 'f' }, 'Limites e localização da província', inp(P, 'limites', G.prov.limites, '100%', true)), h('label', { class: 'f' }, 'Relevo', inp(P, 'relevo', G.prov.relevo, '100%', true)), h('label', { class: 'f' }, 'Clima', inp(P, 'clima', G.prov.clima, '100%', true)),
    h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Distrito', 'Superfície (km²)', 'Calculada', 'População (Censo 2017)', 'População (INE, projecção)', 'Sede', 'Relevo', 'Limites (texto livre; os vizinhos já se calculam)'].map((t) => h('th', { class: 'l', text: t })))), h('tbody', {}, linhas))),
    h('button', { class: 'btn primary', text: 'Gravar os dados geográficos', onclick: async () => { await S.db.doc('config/geografia').set({ ...c, em: new Date().toISOString(), por: S.sessao?.utilizador }); await registar('dados geográficos gravados'); toast('Gravado. Segue para os distritos na sincronização.'); } }));
}
{ const ab0 = adminBase; adminBase = async (body) => { await ab0(body); try { const ref = [...body.children].find((x) => /Histórico das configurações/.test(x.querySelector('h2')?.textContent || '')); const c = await cartaoDadosGeograficos(); if (ref) body.insertBefore(c, ref); else body.append(c); } catch (e) { console.warn(e); } }; }

// ---------------- impressão digital da publicação: SHA-256 do conteúdo integral (forma canónica), fichas e alfabetização ----------------
const canonico = (o) => (Array.isArray(o) ? '[' + o.map(canonico).join(',') + ']' : o && typeof o === 'object' ? '{' + Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canonico(o[k])).join(',') + '}' : typeof o === 'number' ? String(+o) : JSON.stringify(o ?? null));
hashAno = async function (ano) {
  const partes = [`EducStat-publicacao-v2|${ano}`];
  for (const [d] of S.cod.distritosTodos) { const fm = await fichasEfectivas(ano, d); for (const f of [...fm.values()].sort((a, b) => a.esc - b.esc)) partes.push(canonico({ esc: f.esc, dist: f.dist, ano: f.ano, sis: f.sis, marco: f.marco || {}, fim: f.fim || {} })); }
  try { const al = await alfaFichas(ano, !!S.db); for (const f of [...al.values()].sort((a, b) => a.cen - b.cen)) partes.push(canonico({ cen: f.cen, dist: f.dist, ano: f.ano, marco: f.marco || {}, fim: f.fim || {} })); } catch {}
  const hb = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(partes.join('\n'))); return [...new Uint8Array(hb)].map((x) => x.toString(16).padStart(2, '0')).join('');
};
// ---------------- a qualidade recalcula-se quando chegam dados novos ----------------
{ const ad0 = aplicarDocs; aplicarDocs = async (l, o) => { const r = await ad0(l, o); if (r.novos || r.actual) S.qualCache = {}; return r; }; }
// ---------------- conflitos de sincronização: nenhuma versão desaparece ----------------
async function cartaoConflitos() {
  const l = (await S.db.collection('conflitos').get()).docs.map((d) => d.data()).filter((x) => !x.resolvido).sort((a, b) => (a.em < b.em ? 1 : -1));
  if (!l.length) return null;
  const nome = (x) => (x.c === 'fichas' ? `Mapa ${S.esc.get(+x.esc)?.nome || x.esc} (${x.ano})` : x.c === 'alfa' ? `Centro ${S.cen?.get(+x.versaoPerdida?.cen)?.nome || x.id}` : `Escola ${S.esc.get(+x.id)?.nome || x.id}`);
  return h('div', { class: 'card conflito' }, h('h2', { text: `Conflitos de sincronização (${l.length})` }),
    h('p', { class: 'note', text: 'O mesmo registo foi alterado aqui e noutro computador antes de sincronizar. Ficou a versão mais recente; a outra está guardada aqui. Pode repor a versão guardada (passa a ser a mais recente e segue na sincronização) ou dar o conflito por resolvido.' }),
    h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Quando', 'Registo', 'Ficou a versão', 'Versão guardada de', ''].map((t) => h('th', { class: 'l', text: t })))),
      h('tbody', {}, l.map((x) => h('tr', {}, h('td', { class: 'l', text: new Date(x.em).toLocaleString('pt-PT') }), h('td', { class: 'l', text: nome(x) }), h('td', { class: 'l', text: x.ganhou === 'servidor' ? 'do servidor' : 'deste computador' }), h('td', { class: 'l', text: new Date(x.versaoPerdida?.em || x.em).toLocaleString('pt-PT') }),
        h('td', {}, h('div', { class: 'row', style: 'gap:4px;flex-wrap:nowrap' }, h('button', { class: 'btn sm', text: 'Repor a versão guardada', onclick: async () => { if (!(await confirmBox('Repor a versão guardada? A versão actual é substituída (e guardada como novo conflito, por precaução).', 'Repor'))) return; const cur = (await S.db.doc(`${x.c}/${x.id}`).get()).data(); const em = new Date().toISOString(); if (cur) await S.db.doc(`conflitos/${x.c}_${x.id}_${Date.now()}`).set({ ...x, versaoPerdida: cur, ganhou: 'reposta', em, resolvido: em }); await S.db.doc(`${x.c}/${x.id}`).set({ ...x.versaoPerdida, em }); await marcarResolvido(x); if (x.c === 'fichas') await recalcResumo(+x.ano, +x.dist); await registar('conflito: versão reposta', { alvo: x.id }); toast('Versão reposta.'); go(current); } }),
          h('button', { class: 'btn sm', text: 'Resolvido', onclick: async () => { await marcarResolvido(x); go(current); } })))))))));
}
async function marcarResolvido(x) { const docs = (await S.db.collection('conflitos').get()).docs; const d = docs.find((y) => y.data().em === x.em && y.data().id === x.id && y.data().c === x.c); if (d) await S.db.doc(`conflitos/${d.id}`).set({ ...d.data(), resolvido: new Date().toISOString() }); }
{
  const q0 = VIEWS.qualidade;
  VIEWS.qualidade = async (v) => {
    await q0(v);
    try { const c = await cartaoConflitos(); if (c) v.insertBefore(c, v.children[1] || null); } catch (e) { console.warn(e); }
    try { const k = `${S.qSt?.ano}_${S.qSt?.lev}`; const q = S.qualCache?.[k] || Object.values(S.qualCache || {})[0]; if (q?.em) v.querySelector(':scope > div')?.append(h('p', { class: 'note', text: `Calculado em ${new Date(q.em).toLocaleString('pt-PT')}. Volta a calcular-se sozinho quando se grava um mapa ou chegam dados da sincronização.` })); } catch {}
    if (S.syncFalhasCifra?.length) v.insertBefore(h('p', { class: 'pill bad', text: `${S.syncFalhasCifra.length} registos do servidor não se conseguiram abrir na última sincronização (chave diferente ou dados estragados). Veja Administração > Sincronização > Diagnóstico.` }), v.children[1] || null);
  };
}

// ---------------- contas: utilizadores trazidos pelo ficheiro de configuração e palavras-passe temporárias que expiram ----------------
async function importarUtilizadoresCfg(us) {
  for (const u of us || []) { if (!u?.utilizador || !/^[a-z0-9._-]{2,30}$/.test(u.utilizador) || u.raiz) continue; const cur = (await S.db.doc('utilizadores/' + u.utilizador).get()).data(); if (cur && (cur.em || '') >= (u.em || '') && (cur.senhaEm || '') >= (u.senhaEm || '')) continue; await S.db.doc('utilizadores/' + u.utilizador).set({ ...u, central: true }); }
}
const DIAS_TEMP = 30;
// janela com palavras-passe temporárias: copiar, exportar para Excel ou guardar em texto (mostradas só uma vez)
function mostrarSenhas(linhas, exp, titulo = 'Palavras-passe temporárias') {
  const txt = linhas.map((l) => `${l[0]}\t${l[1]}\t${l[2]}`).join('\n');
  const m = h('div', { class: 'modal' }, h('div', { style: 'max-width:46rem' }, h('h2', { text: titulo }), h('p', { class: 'note', text: `Mostradas só agora. Válidas até ${new Date(exp).toLocaleDateString('pt-PT')}; a pessoa muda-a no primeiro acesso. Entregue cada uma só ao respectivo responsável.` }),
    h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Utilizador', 'Nome', 'Palavra-passe temporária', ''].map((t) => h('th', { class: 'l', text: t })))), h('tbody', {}, linhas.map((l) => h('tr', {}, h('td', { class: 'l mono', text: l[0] }), h('td', { class: 'l', text: l[1] }), h('td', { class: 'l mono', text: l[2] }), h('td', {}, h('button', { class: 'btn sm', text: 'Copiar', onclick: async () => { try { await navigator.clipboard.writeText(`${l[0]} ${l[2]}`); toast('Copiado.'); } catch {} } }))))))),
    h('div', { class: 'row', style: 'justify-content:flex-end' },
      h('button', { class: 'btn', text: 'Copiar tudo', onclick: async () => { try { await navigator.clipboard.writeText(txt); toast('Lista copiada.'); } catch { toast('Não foi possível copiar.'); } } }),
      h('button', { class: 'btn', text: 'Exportar (Excel)', onclick: () => { const X = window.XLSX; const wb = X.utils.book_new(); const ws = X.utils.aoa_to_sheet([['Utilizador', 'Nome', 'Palavra-passe temporária', 'Válida até'], ...linhas.map((l) => [l[0], l[1], l[2], new Date(exp).toLocaleDateString('pt-PT')])]); ws['!cols'] = [{ wch: 16 }, { wch: 34 }, { wch: 24 }, { wch: 14 }]; X.utils.book_append_sheet(wb, ws, 'Palavras-passe'); wb.Props = { Title: 'Palavras-passe temporárias — EducStat Tete', Author: 'Alberto Adélia Manhice', LastAuthor: 'Alberto Adélia Manhice', Subject: 'Credenciais iniciais', Keywords: 'contas; SDEJT; credenciais' }; guardarXlsx(wb, `EducStat_palavras_passe_${new Date().toISOString().slice(0, 10)}.xlsx`); } }),
      h('button', { class: 'btn', text: 'Guardar (txt)', onclick: async () => { try { await S.downloads.save({ filename: `EducStat_palavras_passe_${new Date().toISOString().slice(0, 10)}.txt`, data: `${titulo}\nVálidas até ${new Date(exp).toLocaleDateString('pt-PT')}\n\n${txt}\n` }); } catch {} } }),
      h('button', { class: 'btn primary', text: 'Fechar', onclick: () => m.remove() }))));
  document.body.append(m);
}

const senhaAleatoria = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => 'abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRTUVWXY2346789'[b % 51]).join('');
// a DPE substitui a palavra-passe inicial previsível (“admin”) das contas SDEJT por palavras-passe aleatórias que expiram em 30 dias
async function cartaoCredenciaisIniciais() {
  if (!ehDPE() || S.sessao?.perfil !== 3) return null;
  const us = (await S.db.collection('utilizadores').get()).docs.map((d) => d.data()).filter((u) => u.contaDistrital && u.mudar && !u.apagado);
  const comAdmin = []; for (const u of us) { try { if ((await window.educstat.hash('admin', u.sal)).hash === u.hash) comAdmin.push(u); } catch {} }
  const out = h('div');
  const gerar = async (lista) => {
    const linhas = []; const em = new Date().toISOString(); const exp = new Date(Date.now() + DIAS_TEMP * 864e5).toISOString();
    for (const u of lista) { const t = senhaAleatoria(); const { sal, hash } = await window.educstat.hash(t); await S.db.doc('utilizadores/' + u.utilizador).set({ ...u, sal, hash, mudar: true, temporaria: true, expira: exp, senhaEm: em, em }); linhas.push([u.utilizador, u.nome, t]); }
    await registar('palavras-passe iniciais geradas', { n: linhas.length });
    mostrarSenhas(linhas, exp, 'Palavras-passe iniciais das contas SDEJT');
    const txt = `EducStat Tete — palavras-passe iniciais (temporárias)\nGeradas em ${new Date().toLocaleString('pt-PT')} · válidas até ${new Date(exp).toLocaleDateString('pt-PT')} · mudança obrigatória no primeiro acesso\n\n` + linhas.map((l) => `${l[0]}\t${l[1]}\t${l[2]}`).join('\n') + '\n\nEntregue cada palavra-passe só ao responsável do respectivo SDEJT (pessoalmente ou por telefone). Destrua esta folha depois.';
    out.replaceChildren(h('div', { class: 'card', style: 'background:var(--soft)' }, h('h3', { text: 'Palavras-passe temporárias (mostradas só agora)' }), h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Utilizador', 'Nome', 'Palavra-passe temporária'].map((t) => h('th', { class: 'l', text: t })))), h('tbody', {}, linhas.map((l) => h('tr', {}, h('td', { class: 'l mono', text: l[0] }), h('td', { class: 'l', text: l[1] }), h('td', { class: 'l mono', text: l[2] })))))),
      h('div', { class: 'row' }, h('button', { class: 'btn', text: 'Guardar a lista (txt)', onclick: async () => { try { await S.downloads.save({ filename: `EducStat_palavras_passe_iniciais_${em.slice(0, 10)}.txt`, data: txt }); } catch {} } }), h('span', { class: 'note', text: 'Seguem para os computadores dos SDEJT na sincronização ou no ficheiro de configuração (.educcfg).' }))));
  };
  return h('div', { class: 'card', style: comAdmin.length ? 'border-left:4px solid var(--warn)' : '' }, h('h2', { text: 'Palavras-passe iniciais das contas SDEJT' }),
    h('p', { class: 'note', text: comAdmin.length ? `${comAdmin.length} conta(s) SDEJT ainda têm a palavra-passe inicial “admin”, que é igual para todas e fácil de adivinhar. Substitua-as por palavras-passe aleatórias, diferentes para cada conta, que expiram em ${DIAS_TEMP} dias se não forem mudadas.` : `Nenhuma conta SDEJT tem a palavra-passe “admin”. As palavras-passe temporárias expiram em ${DIAS_TEMP} dias.` }),
    h('div', { class: 'row' }, comAdmin.length ? h('button', { class: 'btn primary', text: `Gerar palavras-passe temporárias (${comAdmin.length})`, onclick: () => gerar(comAdmin) }) : null), out);
}
// contas SDEJT novas: palavra-passe aleatória (em vez de “admin”)
garantirContasSDEJT = async function () {
  if (!ehDPE() || S.sessao?.perfil !== 3) return;
  const feito = (await S.db.doc('config/contasSDEJT').get()).data() || {}; const novas = [];
  for (const [d, nome] of S.cod.distritosTodos) {
    const id = idSDEJT(d); if (feito[id]) continue;
    if (!(await S.db.doc('utilizadores/' + id).get()).exists) { const t = senhaAleatoria(); const { sal, hash } = await window.educstat.hash(t); const em = new Date().toISOString(); await S.db.doc('utilizadores/' + id).set({ utilizador: id, nome: `SDEJT_${codDist4(d)} (${nome})`, perfil: 3, dist: d, activo: true, sal, hash, mudar: true, temporaria: true, expira: new Date(Date.now() + DIAS_TEMP * 864e5).toISOString(), criado: em, em, senhaEm: em, central: true, contaDistrital: true }); novas.push([id, t]); }
    feito[id] = new Date().toISOString();
  }
  await S.db.doc('config/contasSDEJT').set(feito);
  if (novas.length) { await registar('contas SDEJT criadas', { n: novas.length }); mostrarSenhas(novas.map(([id, t]) => [id, `SDEJT_${id.slice(-4)} (${distName(+id.slice(-3))})`, t]), new Date(Date.now() + DIAS_TEMP * 864e5).toISOString(), 'Contas SDEJT criadas'); }
};

// ---------------- catálogo e dicionário dos indicadores (metadados), exportável para Excel ----------------
function catalogoIndicadores() {
  const linhas = []; let grupo = '';
  for (const x of IND) { if (x.length === 1) { grupo = x[0]; continue; } const d = DEFS[x[0]] || []; linhas.push({ Código: x[0], Indicador: x[1], Grupo: grupo, Definição: d[0] || '', Fórmula: d[1] || x[3] || '', Unidade: { p: 'Percentagem (%)', n: 'Número', r: 'Rácio', i: 'Índice' }[x[2]] || x[2], Universo: /populaç/i.test(d[1] || x[3] || '') ? 'População em idade escolar (INE) e alunos' : 'Escolas com mapa no levantamento', Fonte: d[2] || 'Levantamentos EducStat', Periodicidade: 'Anual', Responsável: 'DPE Tete — Repartição de Estatística', 'Regra de validação': /taxa|%|percent/i.test(x[1]) ? 'Entre 0% e 100% (excepto taxas brutas, que podem passar de 100%)' : 'Não negativo', Observações: d[3] || '' }); }
  return linhas;
}
{
  const ind0 = VIEWS.indicadores;
  VIEWS.indicadores = (v) => { ind0(v); v.querySelector('h1')?.after(h('div', { class: 'row', style: 'margin:6px 0' }, h('button', { class: 'btn', text: 'Exportar o dicionário dos indicadores (Excel)', title: 'Nome, definição, fórmula, unidade, universo, fonte, periodicidade, responsável e regra de validação de cada indicador', onclick: () => { const X = window.XLSX; const wb = X.utils.book_new(); const ws = X.utils.json_to_sheet(catalogoIndicadores()); ws['!cols'] = [8, 34, 22, 50, 50, 14, 30, 22, 12, 28, 34, 40].map((w) => ({ wch: w })); X.utils.book_append_sheet(wb, ws, 'Dicionário'); wb.Props = { Title: 'Dicionário dos indicadores — EducStat Tete', Author: 'Alberto Adélia Manhice', LastAuthor: 'Alberto Adélia Manhice', Subject: 'Metadados dos indicadores', Keywords: 'indicadores; metadados; estatística; Tete' }; guardarXlsx(wb, 'EducStat_dicionario_indicadores.xlsx'); } }))); };
}

// ---------------- caixa de tarefas no Início: o que precisa de acção (pedidos, submissões, conflitos, prazos) ----------------
async function cartaoTarefas() {
  if (!DESKTOP || !S.sessao || ehVisitante()) return null;
  const t = []; const dpe = ehDPE(); const meu = +(S.sessao.dist || S.inst?.dist || 0); const ano = Math.min(ANO_MAX_DADOS, ANOS[ANOS.length - 1]);
  const ir = (hash, prep) => () => { prep?.(); location.hash = hash; };
  const ped = (S.msgs || []).filter((m) => ['senha', 'conta', 'abertura', 'proposta'].includes(m.tipo) && !m.resolvido && (dpe || +m.deDist === meu || m.deUtil === S.sessao.utilizador));
  if (ped.length && S.sessao.perfil === 3) t.push(['Pedidos por tratar', `${ped.length} (palavra-passe, contas, aberturas, propostas)`, ir('#admin', () => { (S.adm ||= {}).tab = 'users'; })]);
  try { const nc = (await S.db.collection('conflitos').get()).docs.filter((d) => !d.data().resolvido).length; if (nc) t.push(['Conflitos de sincronização', `${nc} por rever`, ir('#qualidade')]); } catch {}
  if (!dpe && meu) { try { const c = estadoCiclo(ano, 'marco', meu); if (c.passo === 0) t.push([`Submeter o 3 de Março ${ano} à DPE`, 'Ainda não submetido', ir('#qualidade')]); } catch {} }
  if (dpe) { const sub = (S.msgs || []).filter((m) => m.tipo === 'submissao' && +m.ano === ano && !S.trancas?.[`${ano}_${m.lev}`]?.dist?.[m.deDist]?.revisao); if (sub.length) t.push(['Submissões para rever', `${sub.length} distrito(s)`, ir('#qualidade')]); }
  for (const [k, nome] of [['marco', '3 de Março'], ['fim', 'Fim do ano']]) { const pz = S.trancas?.[`${ano}_${k}`]?.prazo; if (pz) { const dias = Math.ceil((new Date(pz) - new Date()) / 864e5); if (dias >= 0 && dias <= 14) t.push([`Prazo do ${nome} ${ano}`, dias ? `faltam ${dias} dia(s) (${dataPT(pz)})` : 'termina hoje', ir('#admin', () => { (S.adm ||= {}).tab = 'prazos'; })]); } }
  if (S.syncFalhasCifra?.length) t.push(['Sincronização', `${S.syncFalhasCifra.length} registos não se abriram`, ir('#admin', () => { (S.adm ||= {}).tab = 'sync'; })]);
  const pedMeus = (S.msgs || []).filter((m) => m.deUtil === S.sessao.utilizador && ['senha', 'abertura', 'proposta', 'conta'].includes(m.tipo) && !m.resolvido);
  if (!t.length && !pedMeus.length) return null;
  return h('div', { class: 'card', style: 'border-left:4px solid var(--accent)' }, h('h2', { text: 'Tarefas' }),
    t.length ? h('div', { style: 'display:flex;flex-direction:column;gap:4px' }, t.map(([a, b, f]) => h('div', { class: 'row between' }, h('span', {}, h('b', { text: a }), ' · ', b), h('button', { class: 'btn sm', text: 'Abrir', onclick: f })))) : null,
    pedMeus.length ? cartaoPedidos() : null);
}
{
  const in0 = VIEWS.inicio;
  VIEWS.inicio = (v) => { in0(v); cartaoTarefas().then((c) => { if (c && current === 'inicio') { const ref = v.querySelector(':scope > .card'); v.insertBefore(c, ref || null); } }).catch(() => {}); };
}

// ---------------- ligações directas: “Administração > Configurações” no texto passa a ser um link que leva lá ----------------
(function ligacoes() {
  if (window.__ligOk) return; window.__ligOk = true;
  const TAB = { 'configurações': 'base', utilizadores: 'users', 'prazos e harmonização': 'prazos', prazos: 'prazos', 'estado na dpe': 'prazos', levantamentos: 'levs', 'população': 'pop', 'importar access': 'access', 'exportar para access': 'expacc', 'sincronização': 'sync', 'mapas e quadros': 'mapas', 'tabelas de códigos': 'codigos', metas: 'metas', 'dados e cópias': 'dados', 'registo de actividade': 'reg', 'supervisão': 'super' };
  const RX = /(Administração\s*[>›]\s*)(Configurações|Utilizadores|Prazos e harmonização|Prazos|Estado na DPE|Levantamentos|População|Importar Access|Exportar para Access|Sincronização|Mapas e quadros|Tabelas de códigos|Metas|Dados e cópias|Registo de [Aa]ctividade|Supervisão)|(Qualidade)(\s*[>›]\s*Conflitos)?|(Ajuda)(\s*[>›]\s*Explicação dos indicadores)?/g;
  const fazer = (no) => {
    const t = no.nodeValue; if (!t || !/Administração\s*[>›]|Qualidade\s*[>›]|Ajuda\s*[>›]/.test(t)) return;
    const pai = no.parentElement; if (!pai || pai.closest('a, button, input, textarea, select, option, h1, h2, nav, .tabs, iframe, .lig-ok')) return;
    const fr = document.createDocumentFragment(); let i = 0; RX.lastIndex = 0; let m; let algum = false;
    while ((m = RX.exec(t))) {
      if (m[3] && !m[4]) continue; if (m[5] && !m[6]) continue; // “Qualidade” e “Ajuda” sozinhos não são ligações
      algum = true; fr.append(t.slice(i, m.index)); const txt = m[0];
      const a = document.createElement('a'); a.href = '#'; a.className = 'lig'; a.textContent = txt; a.title = 'Abrir';
      a.onclick = (e) => { e.preventDefault(); if (m[2]) { (S.adm ||= {}).tab = TAB[m[2].toLowerCase()] || 'base'; if (current === 'admin') go('admin'); else location.hash = '#admin'; } else if (m[3]) location.hash = '#qualidade'; else { S.ajudaTab = 'ficha'; if (current === 'ajuda') go('ajuda'); else location.hash = '#ajuda'; } };
      fr.append(a); i = m.index + txt.length;
    }
    if (!algum) return; fr.append(t.slice(i)); no.replaceWith(fr);
  };
  const varrer = (el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const l = []; while (w.nextNode()) l.push(w.currentNode); l.forEach(fazer); };
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) { if (n.nodeType === 3) fazer(n); else if (n.nodeType === 1) varrer(n); } }).observe(document.body, { childList: true, subtree: true });
})();

// ---------------- temas do sistema: modo (claro, escuro, automático) e paleta de cores ----------------
const PALETAS = [['verde', 'Verde (DPE)', '#0A6B45'], ['azul', 'Azul', '#1F4E8C'], ['oceano', 'Oceano', '#0B6E79'], ['roxo', 'Roxo', '#5B3A8C'], ['terracota', 'Terracota', '#9C3D1F'], ['grafite', 'Grafite', '#2A2E33']];
function aplicarPaleta(p) { if (!p || p === 'verde') document.documentElement.removeAttribute('data-paleta'); else document.documentElement.setAttribute('data-paleta', p); try { localStorage.setItem('paleta', p || 'verde'); } catch {} }
try { aplicarPaleta(localStorage.getItem('paleta') || 'verde'); } catch {}
function painelTemas() {
  const pal = (() => { try { return localStorage.getItem('paleta') || 'verde'; } catch { return 'verde'; } })(); const mo = temaActual();
  const box = h('div', { class: 'pop-in pop-tema' }, h('strong', { text: 'Aspecto do programa' }),
    h('div', { class: 'seg' }, [['claro', 'Claro'], ['escuro', 'Escuro'], ['sistema', 'Automático']].map(([k, l]) => h('button', { 'aria-pressed': String(mo === k), text: l, onclick: () => { aplicarTema(k); fecharPop(); abrirPop('tema'); desenharIcones(); } }))),
    h('span', { class: 'note', text: 'Cores' }),
    h('div', { class: 'sw' }, PALETAS.map(([k, l, c]) => h('button', { 'aria-pressed': String(pal === k), onclick: () => { aplicarPaleta(k); fecharPop(); abrirPop('tema'); } }, h('i', { style: `background:${c}` }), l))),
    h('span', { class: 'note', text: 'Fica guardado neste computador. Os relatórios têm os seus próprios temas (em Relatórios).' }));
  return box;
}
{
  const ap0 = abrirPop;
  abrirPop = (tipo, arg) => { if (tipo !== 'tema') return ap0(tipo, arg); fecharPop(); POP = h('div', { class: 'pop', role: 'dialog', 'aria-label': 'Tema' }, painelTemas()); document.body.append(POP); setTimeout(() => { const f = (e) => { if (POP && !POP.contains(e.target) && !e.target.closest('.ib')) { fecharPop(); document.removeEventListener('mousedown', f); } }; document.addEventListener('mousedown', f); }, 0); };
  const di0 = desenharIcones;
  desenharIcones = (...a) => { const r = di0(...a); const b = document.getElementById('ib-tema'); if (b) { b.onclick = () => (POP ? fecharPop() : abrirPop('tema')); b.title = 'Tema e cores do programa'; } return r; };
}

// ---------------- Alfabetização: painel por posto, localidade e escola (os centros funcionam nas escolas da carta escolar) ----------------
{
  const ap0 = alfaPainel;
  alfaPainel = async (body, st) => {
    await ap0(body, st);
    const f = S.apf; if (!f || f.dist === 'Todos') { body.append(h('p', { class: 'note', text: 'Escolha um distrito para ver os dados por posto administrativo, localidade e escola.' })); return; }
    const nv = (S.apNivel ||= 'localidade');
    const fm = await alfaFichas(+f.ano, !!S.db); const doD = [...fm.values()].filter((x) => +x.dist === +f.dist);
    const campo = (x) => { const e = S.esc.get(+S.cen?.get(+x.cen)?.esc); if (nv === 'escola') return e ? `${codFmt(e.cod)} · ${e.nome}` : 'Sem escola indicada'; return (e && e[nv]) || `Sem ${nv === 'posto' ? 'posto' : 'localidade'} indicado(a)`; };
    const g = new Map(); for (const x of doD) { const k = campo(x); (g.get(k) || g.set(k, new Map()).get(k)).set(x.cen, x); }
    const sx = (a) => (f.sexo === 'Homens' ? a[0] : f.sexo === 'Mulheres' ? a[1] : a[0] + a[1]); const pr = (a, b) => (b ? P1.format(a / b) : '—');
    const linhas = [...g.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt')).map(([k, m]) => { const T = alfaSum(m, { dist: 'Todos' }).T; const escs = new Set([...m.values()].map((x) => S.cen?.get(+x.cen)?.esc).filter(Boolean)); return { k, cen: m.size, esc: escs.size, T }; });
    const sel = h('select', { onchange: (e) => { S.apNivel = e.target.value; go('alfa'); } }, [['posto', 'Posto administrativo'], ['localidade', 'Localidade'], ['escola', 'Escola']].map(([k, l]) => h('option', { value: k, text: l, selected: k === nv })));
    const cab = [nv === 'escola' ? 'Escola' : nv === 'posto' ? 'Posto administrativo' : 'Localidade', 'Centros', ...(nv === 'escola' ? [] : ['Escolas']), 'Inscritos alfab.', 'Inscritos EPJA', 'Aprovação alfab.', 'Aprovação EPJA', 'Alfabetizadores'];
    const lin = (l) => h('tr', {}, h('td', { class: 'l', text: l.k }), h('td', { text: NF.format(l.cen) }), nv === 'escola' ? null : h('td', { text: NF.format(l.esc) }), h('td', { text: NF.format(sx(l.T.insA)) }), h('td', { text: NF.format(sx(l.T.insE)) }), h('td', { text: pr(sx(l.T.apA), sx(l.T.fimA)) }), h('td', { text: pr(sx(l.T.apE), sx(l.T.fimE)) }), h('td', { text: NF.format(l.T.cap + l.T.sem) }));
    const tab = h('table', {}, h('thead', {}, h('tr', {}, cab.map((t, i) => h('th', { class: i ? '' : 'l', text: t })))), h('tbody', {}, linhas.map(lin)));
    const card = h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h2', { text: `${distName(f.dist)}, ${f.ano}: por ${nv === 'escola' ? 'escola' : nv === 'posto' ? 'posto administrativo' : 'localidade'}` }), h('label', { class: 'f' }, 'Mostrar por', sel)),
      h('p', { class: 'note', text: 'Os centros de alfabetização e EPJA funcionam nas escolas: aparecem no posto e na localidade da escola, segundo a carta escolar.' }), h('div', { class: 'tw' }, tab),
      h('button', { class: 'btn', text: 'Exportar (Excel)', onclick: () => { const X = window.XLSX; const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([cab, ...linhas.map((l) => [l.k, l.cen, ...(nv === 'escola' ? [] : [l.esc]), sx(l.T.insA), sx(l.T.insE), sx(l.T.fimA) ? sx(l.T.apA) / sx(l.T.fimA) : null, sx(l.T.fimE) ? sx(l.T.apE) / sx(l.T.fimE) : null, l.T.cap + l.T.sem])]), 'AEA'); guardarXlsx(wb, `AEA_${distName(f.dist).replace(/\s+/g, '_')}_${f.ano}_por_${nv}.xlsx`); } }));
    body.append(card); setTimeout(() => juntarFerramentas(body), 600);
  };
}

// =====================================================================
// 1.10 — RELATÓRIOS: temas de cores, capa limpa, numeração 1 / 1.1, índices com páginas, siglas, contracapa,
// glossário oficial (MEC), cartucho dentro do mapa, bandeirinhas nas escolas e Folheto da Educação
// =====================================================================
const TEMAS_REL = [
  ['dpe', 'Verde e dourado (DPE)', { br: '#0A6B45', ac: '#B07C00', txt: '#13221B', h2: '#B07C00' }],
  ['preto', 'Preto e cinzento (sóbrio)', { br: '#111111', ac: '#555555', txt: '#111111', h2: '#333333' }],
  ['azul', 'Azul institucional', { br: '#1F4E8C', ac: '#C98E00', txt: '#15202B', h2: '#2F6DB8' }],
  ['mec', 'Azul e vermelho (MEC)', { br: '#173A6B', ac: '#B3261E', txt: '#15202B', h2: '#B3261E' }],
  ['terracota', 'Terracota', { br: '#9C3D1F', ac: '#2F6B5A', txt: '#2A1A14', h2: '#2F6B5A' }],
  ['roxo', 'Roxo', { br: '#5B3A8C', ac: '#C98E00', txt: '#1E1530', h2: '#7451AA' }],
];
function temaRel(st) { const t = (TEMAS_REL.find((x) => x[0] === st?.tema) || TEMAS_REL[0])[2]; return { ...t, ...(st?.cores || {}) }; }
// maiúscula inicial em cada palavra significativa (preposições e conjunções ficam minúsculas, salvo a primeira)
const PEQ_TIT = /^(de|da|do|das|dos|e|em|a|o|à|ao|aos|às|para|por|com|sem|the|of|and)$/i;
const tituloCase = (s) => String(s).replace(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’]*)/g, (w, _m, off, str) => { const ini = off === 0 || /[([«"]\s*$/.test(str.slice(0, off)) || !/\S/.test(str.slice(0, off)); return !ini && PEQ_TIT.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1); });
const SIGLAS_EDU = [['AEA', 'Alfabetização e Educação de Adultos'], ['CENACARTA', 'Centro Nacional de Cartografia e Teledetecção'], ['DPE', 'Direcção Provincial da Educação'], ['DUAT', 'Direito de Uso e Aproveitamento da Terra'], ['EB', 'Escola Básica'], ['EP', 'Ensino Primário'], ['EPJA', 'Educação de Pessoas Jovens e Adultas'], ['ES1 / ESG1', 'Ensino Secundário (Geral), 1º Ciclo'], ['ES2 / ESG2', 'Ensino Secundário (Geral), 2º Ciclo'], ['ETP', 'Ensino Técnico-Profissional'], ['H / M / HM', 'Homens / Mulheres / Homens e Mulheres (total)'], ['HPV', 'Habilidades para a Vida'], ['INE', 'Instituto Nacional de Estatística'], ['IPG', 'Índice de Paridade de Género'], ['MEC', 'Ministério da Educação e Cultura'], ['NEE', 'Necessidades Educativas Especiais'], ['PEE', 'Plano Estratégico da Educação'], ['SDEJT', 'Serviço Distrital de Educação, Juventude e Tecnologia'], ['TBA', 'Taxa Bruta de Admissão'], ['TBC', 'Taxa Bruta de Conclusão'], ['TBE', 'Taxa Bruta de Escolarização'], ['TLE', 'Taxa Líquida de Escolarização'], ['WGS 84', 'Sistema Geodésico Mundial de 1984 (coordenadas geográficas)'], ['ZIP', 'Zona de Influência Pedagógica'], ['…', 'Dado não disponível à data da publicação'], ['—', 'Resultado nulo ou não aplicável']];
// glossário oficial (Levantamento Estatístico do Sector, MEC 2026), com os termos usados no sistema
const GLOSSARIO_MEC = [['Alfabetização', 'Aquisição e aplicação de competências básicas de leitura, escrita e cálculo.'], ['Alfabetizador', 'Facilitador do processo de aprendizagem básica da leitura, escrita e cálculo.'], ['Alunos repetentes', 'Alunos matriculados no início do ano lectivo que frequentam a mesma classe que frequentaram no ano lectivo anterior.'], ['Alunos órfãos', 'Alunos que perderam o pai, a mãe ou ambos os progenitores.'],
  ['Centro de alfabetização', 'Local onde funcionam as turmas de alfabetização e EPJA; em regra pertence a uma escola.'], ['Classe', 'Ano de escolaridade frequentado pelo aluno.'], ['Escolas cobertas', 'Escolas que forneceram informação estatística no levantamento escolar.'], ['Habilidades para a Vida (HPV)', 'Conjunto de conhecimentos, atitudes e competências necessárias para enfrentar os desafios da vida quotidiana.'], ['Percentagem de cobertura', 'Relação entre as escolas que forneceram informação estatística e o total de escolas, em percentagem.'],
  ['Proporção de repetentes', 'Relação entre os alunos repetentes e o total de alunos matriculados na mesma classe, em percentagem.'], ['Rácio alunos por professor', 'Número médio de alunos por professor num determinado nível de ensino.'], ['Rácio alunos por turma', 'Número médio de alunos por turma num determinado nível de ensino.'], ['Sala de cimento', 'Sala de aula de construção convencional com paredes rebocadas e cobertura durável.'], ['Sala de tijolo', 'Sala com paredes de tijolo ou bloco não rebocadas e cobertura de chapa ou outro material.'], ['Sala de maticado', 'Sala construída com estacas e/ou bambu, rebocada e coberta com chapa ou material local.'],
  ['Taxa bruta de admissão (EP)', 'Relação entre os novos ingressos na 1ª classe e a população de 6 anos de idade, em percentagem.'], ['Taxa bruta de escolarização (EP)', 'Relação entre o total de alunos matriculados no Ensino Primário e a população de 6–11 anos, em percentagem.'], ['Taxa bruta de escolarização (ES1)', 'Relação entre o total de alunos matriculados no ES1 e a população de 12–14 anos, em percentagem.'], ['Taxa líquida de escolarização (EP)', 'Relação entre os alunos de 6–11 anos matriculados no Ensino Primário e a população de 6–11 anos, em percentagem.'],
  ['Taxa bruta de conclusão', 'Aprovados na última classe do nível ÷ população com a idade oficial de conclusão, em percentagem.'], ['Taxa de aproveitamento escolar', 'Aprovados ÷ alunos matriculados no início do ano, em percentagem.'], ['Taxa de desistência', 'Desistentes ÷ alunos matriculados no início do ano, em percentagem.'], ['Taxa de retenção', 'Alunos que chegam a uma classe ÷ alunos que entraram na 1ª classe da mesma coorte, em percentagem.'], ['Turma', 'Grupo de alunos ensinados, geralmente pelos mesmos professores, ao mesmo tempo.'], ['Turma mista', 'Turma composta por alunos de diferentes classes.'], ['Turma pura', 'Turma composta apenas por alunos da mesma classe.'], ['DUAT', 'Direito de Uso e Aproveitamento da Terra: título que confirma que a escola pode usar o terreno onde está.'], ['Densidade populacional', 'Relação entre a população e a superfície do território, em habitantes por km² (INE).']];
// localização da instituição (contracapa e ficha técnica): a DPE tem a sua; cada SDEJT escreve a sua uma vez
const LOCAL_DPE = 'Av. da Liberdade, Cidade de Tete, Província de Tete, República de Moçambique';
function contracapaDe(prov, dist) { const c = S.fichaCfg || {}; const inst = prov ? 'Direcção Provincial da Educação de Tete' : `Serviço Distrital de Educação, Juventude e Tecnologia de ${distName(dist)}`; return { republica: 'REPÚBLICA DE MOÇAMBIQUE', linhas: [prov ? 'PROVÍNCIA DE TETE' : `GOVERNO DO DISTRITO DE ${distName(dist).toUpperCase()}`, inst, c.endereco || (prov ? LOCAL_DPE : `Sede do Distrito de ${distName(dist)}, Província de Tete`), [c.telefone ? 'Tel.: ' + c.telefone : '', c.email ? 'E-mail: ' + c.email : ''].filter(Boolean).join(' · ')].filter(Boolean) }; }
// capa: só o território, com o nome dentro (sem moldura, sem rosa-dos-ventos, sem escala e sem pontos)
arteCapa = function (geo) {
  const out = { mapa: null, faixa: null }; const W0 = 794, H0 = 118; const t = temaRel(S.pubSt);
  out.faixa = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W0} ${H0}" width="${W0}" height="${H0}"><rect width="${W0}" height="${H0}" fill="#fff"/><polygon points="0,${H0} 0,46 ${W0 * 0.62},${H0}" fill="${t.br}"/><polygon points="${W0},${H0} ${W0},20 ${W0 * 0.46},${H0}" fill="${t.ac}"/><rect x="0" y="${H0 - 7}" width="${W0 / 5}" height="7" fill="#009739"/><rect x="${W0 / 5}" y="${H0 - 7}" width="${W0 / 5}" height="7" fill="#fff"/><rect x="${(2 * W0) / 5}" y="${H0 - 7}" width="${W0 / 5}" height="7" fill="#000"/><rect x="${(3 * W0) / 5}" y="${H0 - 7}" width="${W0 / 5}" height="7" fill="#FCE100"/><rect x="${(4 * W0) / 5}" y="${H0 - 7}" width="${W0 / 5}" height="7" fill="#D21034"/></svg>`;
  const d3 = window.d3; if (!d3 || !geo || !S.limites) return out;
  const todos = S.limites.features; const sel = geo.prov ? todos : todos.filter((f) => codDistritoGeo(f, S.limitesCampo) === +geo.dist); if (!sel.length) return out;
  const MW = 520, MH = 320; const proj = d3.geoMercator().fitExtent([[8, 8], [MW - 8, MH - 8]], { type: 'FeatureCollection', features: sel }); const path = d3.geoPath(proj);
  let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MW} ${MH}" width="${MW}" height="${MH}" font-family="Arial"><rect width="${MW}" height="${MH}" fill="#fff"/>`;
  for (const f of sel) g += `<path d="${path(f)}" fill="${t.br}" fill-opacity=".14" stroke="${t.br}" stroke-width="1.4" stroke-linejoin="round"/>`;
  if (!geo.prov && S.limitesPostos) for (const p of S.limitesPostos.features) { try { if (!sel.some((f) => d3.geoContains(f, d3.geoCentroid(p)))) continue; g += `<path d="${path(p)}" fill="none" stroke="${t.br}" stroke-opacity=".5" stroke-width=".6" stroke-dasharray="3 2"/>`; } catch {} }
  for (const f of sel) { const [cx, cy] = path.centroid(f); const n = distName(codDistritoGeo(f, S.limitesCampo)); g += `<text x="${cx}" y="${cy}" font-size="${geo.prov ? 9.5 : 16}" font-weight="700" text-anchor="middle" fill="${t.br}">${esc_(n)}</text>`; }
  out.mapa = g + '</svg>'; return out;
};
// cartucho do mapa dentro do próprio mapa, no canto mais vazio (escala em km e fontes); a rosa-dos-ventos fica em cima, à esquerda
function cantoMaisVazio(svg, W, H, bw, bh) {
  const aneis = []; for (const m of svg.matchAll(/<path d="([^"]+)"/g)) { const d = m[1]; for (const r of d.split(/(?=M)/)) { const pts = [...r.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((x) => [+x[1], +x[2]]); if (pts.length > 2) aneis.push(pts); } }
  const dentro = (x, y) => aneis.some((p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { if ((p[i][1] > y) !== (p[j][1] > y) && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1] + 1e-9) + p[i][0]) c = !c; } return c; });
  const cantos = [['bd', W - bw - 8, H - bh - 8], ['be', 8, H - bh - 8], ['cd', W - bw - 8, 8]];
  let melhor = cantos[0], mn = 1e9;
  for (const c of cantos) { let n = 0; for (let i = 0; i <= 6; i++) for (let j = 0; j <= 4; j++) if (dentro(c[1] + (bw * i) / 6, c[2] + (bh * j) / 4)) n++; if (n < mn) { mn = n; melhor = c; } }
  return { x: melhor[1], y: melhor[2] };
}
molduraMapa = function (svg, { fonte, prov, dist } = {}) {
  if (!svg || /data-moldura/.test(svg)) return svg;
  const m = svg.match(/width="(\d+)" height="(\d+)"/); if (!m) return svg; const W = +m[1], H = +m[2];
  const esc = S.__proj ? escalaKm(S.__proj, W, H) : null; const cfg = S.fichaCfg || {}; const t = temaRel(S.pubSt);
  const linhas = [`Fonte de dados espaciais: ${cfg.fonteEspacial || (S.limites ? 'CENACARTA' : 'cadastro de escolas')}`, `Dados qualitativos e quantitativos: ${cfg.fonteDados || (prov ? 'MEC / DPE Tete' : 'MEC / SDEJT ' + distName(dist))}`, 'Sistema de coordenadas geográficas: WGS 1984', `Elaborado por: ${cfg.elaborado || quemElaborou(prov, dist)}`];
  const bw = Math.min(250, W * 0.42), bh = 74; const { x, y } = cantoMaisVazio(svg, W, H, bw, bh);
  const corpo = svg.replace(/^<svg[^>]*>/, `<svg x="0" y="0" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  const emb = S.emblemaURL ? `<image x="${x + 6}" y="${y + 20}" width="30" height="30" href="${S.emblemaURL}"/>` : '';
  const caixa = `<g><rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="#fff" fill-opacity=".93" stroke="#13221B" stroke-width=".6"/>${emb}${esc ? barraEscala(x + 44, y + 13, { passo: esc.passo, px: Math.min(esc.px, bw - 80) * 1 }) : ''}${linhas.map((l, i) => `<text x="${x + 42}" y="${y + 32 + i * 10.5}" font-size="7.4" font-weight="${i === 3 ? 700 : 500}" fill="#13221B">${esc_(l)}</text>`).join('')}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" data-moldura="1" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial"><rect width="${W}" height="${H}" fill="#fff"/>${corpo}${rosaVentos(40, 36)}${caixa}<rect x=".6" y=".6" width="${W - 1.2}" height="${H - 1.2}" fill="none" stroke="${t.br}" stroke-width="1"/></svg>`;
};
// escolas como bandeirinhas (como nos sistemas geográficos), em vez de pontos
{
  const sp0 = svgPontos;
  const bandeira = (x, y, cor, s = 1) => `<g transform="translate(${(+x).toFixed(1)},${(+y).toFixed(1)}) scale(${s})"><path d="M0,0 V-9" stroke="#13221B" stroke-width="1"/><path d="M0,-9 L7,-6.6 L0,-4.2 Z" fill="${cor}" stroke="#13221B" stroke-width=".4"/></g>`;
  svgPontos = (o) => { const svg = sp0(o); if (!svg) return svg; const muitas = (o.escolas || []).length > 400;
    return svg.replace(/<circle cx="([\d.-]+)" cy="([\d.-]+)" r="3\.2" fill="([^"]+)"[^>]*\/>/g, (_, x, y, c) => bandeira(x, y, c, muitas ? 0.7 : 1)).replace(/<circle cx="([\d.-]+)" cy="([\d.-]+)" r="5" fill="([^"]+)"\/>/g, (_, x, y, c) => bandeira(+x - 3, +y + 5, c, 1.1)); };
}
// glossário com o termo a negrito seguido de dois pontos (ecrã e PDF)
{
  const hp0 = htmlPublicacao;
  htmlPublicacao = (doc, paraPdf) => {
    if (doc.folheto) return htmlFolheto(doc);
    let html = hp0(doc, paraPdf).replace(/<p class="def"><b>([^<]*)<\/b> — /g, '<p class="def"><b>$1:</b> ');
    // numeração de páginas nos índices (preenchida ao guardar em PDF) e índice de tabelas
    let k = 0; const ent = [];
    html = html.replace(/<(h[12])>(\d+(?:\.\d+)?\s[\s\S]*?)<\/\1>/g, (m0, tg, t) => { if (tg === 'h2' && !/^\d+\.\d+\s/.test(t)) return m0; const id = 'H' + ++k; ent.push([tg, t, id]); return `<${tg}><span class="mk">QQPG${id}QQ</span>${t}</${tg}>`; });
    html = html.replace(/(<ol class="indice">)[\s\S]*?(<\/ol>)/, (_, a, c) => a + ent.map(([tg, t, id]) => `<li class="${tg === 'h2' ? 'sub' : ''}"><span class="it">${t}</span><span class="pg" data-pg="${id}"></span></li>`).join('') + c);
    for (const [rot, pre] of [['Mapa', 'M'], ['Gráfico', 'G'], ['Tabela', 'T'], ['Figura', 'F']]) {
      let n = 0; html = html.replace(new RegExp(`<div class="tt">(${rot} \\d+:)`, 'g'), (_, t) => `<div class="tt"><span class="mk">QQPG${pre}${++n}QQ</span>${t}`);
      let n2 = 0; html = html.replace(new RegExp(`<li>(${rot} \\d+\\.[^<]*)</li>`, 'g'), (_, t) => `<li><span class="it">${t}</span><span class="pg" data-pg="${pre}${++n2}"></span></li>`);
    }
    if (doc.listaTabelas?.length) { const lt = `<h2>Índice de Tabelas</h2><ol class="indice lista">${doc.listaTabelas.map((t, i) => `<li><span class="it">${esc_(t)}</span><span class="pg" data-pg="T${i + 1}"></span></li>`).join('')}</ol>`; html = html.replace(/(<div class="idx">)(<h2>Índice d[ae]s? [IiGg])/, `$1${lt}$2`); }
    if (doc.siglas?.length) { const sg = `<div class="idx"><h2>Siglas e Abreviaturas</h2><table class="kv siglas">${doc.siglas.map(([a, b]) => `<tr><td>${esc_(a)}</td><td>${esc_(b)}</td></tr>`).join('')}</table></div>`; const f = (x) => (paraPdf ? x : `<div class="folha">${x}</div>`); html = html.replace(/(<div class="folha">)?(<h1><span class="mk">)/, (m, a, b) => `${f(sg)}<div class="quebra"></div>${a || ''}${b}`); }
    // títulos dos índices com todas as palavras significativas em maiúscula (Índice das Ilustrações, Índice de Gráficos, Siglas e Abreviaturas, Ficha Técnica…)
    html = html.replace(/<h2>((?:Índice|Siglas|Ficha|Nota)\b[^<]*)<\/h2>/g, (_, s) => `<h2>${tituloCase(s)}</h2>`);
    // tema de cores
    const t = temaRel(S.pubSt); html = html.replace(/#0A6B45/gi, t.br).replace(/#C98E00/gi, t.ac).replace(/#B07C00/gi, t.ac).replace(/#13221B/gi, t.txt);
    // índices: nada a negrito; números (Mapa 1., Tabela 1.…) com a mesma cor do texto; pontinhos (leaders) uniformes como no índice geral
    html = html.replace('</style>', `.mk{font-size:1px;color:#fff;line-height:0;letter-spacing:0}.idx ol.indice{list-style:none;padding-left:0;margin:2px 0 10px}.indice li{display:flex;gap:6px;align-items:baseline;font-weight:400}.indice li.sub{padding-left:1.4em;font-size:.95em}.indice .it{flex:1;font-weight:400}.indice .it::after{content:" ";display:inline-block;width:0}.indice li .it{position:relative;overflow:hidden}.indice .it{border-bottom:1px dotted #9FB0A7}.indice .pg{min-width:2em;text-align:right;font-weight:400;font-variant-numeric:tabular-nums}.idx h2{font-weight:700}h2.h2n{color:${t.h2}}.siglas td:first-child{width:22%}</style>`);
    return html;
  };
  const hc0 = htmlCapa; htmlCapa = (doc) => { const t = temaRel(S.pubSt); return hc0(doc).replace(/<div class="ano">[^<]*<\/div>/, '').replace(/#0A6B45/gi, t.br).replace(/#C98E00/gi, t.ac).replace(/#13221B/gi, t.txt); };
}
function htmlContracapa(doc) {
  const t = temaRel(S.pubSt); const c = doc.contracapa || {};
  return `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><style>@page{size:A4;margin:0}html,body{margin:0;height:100%}body{background:${t.br};color:#fff;font-family:Arial,sans-serif;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center;height:297mm;box-sizing:border-box;padding:0 20mm 34mm}img{width:28mm;margin-bottom:8mm}.r{font-weight:700;font-size:13pt;letter-spacing:.05em}.l{font-size:10.5pt;margin-top:2mm}.l.b{font-weight:700}</style></head><body>${S.emblemaURL ? `<img src="${S.emblemaURL}" alt="">` : ''}<div class="r">${esc_(c.republica || 'REPÚBLICA DE MOÇAMBIQUE')}</div>${(c.linhas || []).map((l, i) => `<div class="l${i < 2 ? ' b' : ''}">${esc_(l)}</div>`).join('')}</body></html>`;
}

// ---- visitante: âmbito explícito e sem botões de guardar/exportar (o processo principal também recusa) ----
{
  const npc0 = nomePerfilCurto;
  const ambitoVisitante = () => (S.inst?.papel === 'distrito' && +S.inst.dist ? `SDEJT ${distName(S.inst.dist)}` : 'DPE Tete');
  nomePerfilCurto = () => (S.sessao?.perfil === 0 && !S.sessao?.raiz ? `Visitante · ${ambitoVisitante()}` : npc0());
  const RX_GUARDAR = /(word|pdf|excel|xlsx|docx|csv|png|svg|guardar|gravar|descarregar|exportar|imprimir|copiar( a)? (imagem|figura|tabela)|salvar)/i;
  const esconder = (raiz) => { if (!document.body.classList.contains('visitante')) return; for (const b of raiz.querySelectorAll ? raiz.querySelectorAll('button, a.btn') : []) { if (b.dataset.visOk) continue; const t = (b.textContent || '') + ' ' + (b.title || ''); if (RX_GUARDAR.test(t) && !/^\s*(gerar|ver|abrir|actualizar)/i.test(b.textContent || '')) { b.hidden = true; b.dataset.visOculto = '1'; } b.dataset.visOk = '1'; } };
  new MutationObserver((ms) => { if (!document.body.classList.contains('visitante')) return; for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) esconder(n); }).observe(document.body, { childList: true, subtree: true });
  new MutationObserver(() => { if (document.body.classList.contains('visitante')) esconder(document.body); else document.querySelectorAll('[data-vis-oculto]').forEach((b) => { b.hidden = false; delete b.dataset.visOculto; }); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const pn0 = VIEWS.painel; VIEWS.painel = async (v, ...r) => { const x = await pn0(v, ...r); if (S.sessao?.perfil === 0 && S.inst?.papel === 'distrito') v.querySelector('h1')?.after(h('p', { class: 'note', text: `Está a ver como visitante neste computador do ${ambitoVisitante()}. Pode escolher outros distritos para comparar, mas os dados deles só aparecem para os anos que a DPE já publicou.` })); return x; };
}

// ---- estrutura do relatório: títulos numerados (1, 1.1), glossário oficial, índice de tabelas, siglas, contracapa e tema ----
{
  const aj1 = ajustarPublicacao;
  ajustarPublicacao = (d0, st) => {
    const d = aj1(d0, st);
    if (d.folheto) { d.tema = { ...temaRel(S.pubSt), fonte: 'Arial' }; d.contracapa = contracapaDe(!d.geo || d.geo.prov, d.geo?.dist); return d; }
    // glossário: o do relatório mais o do Levantamento Estatístico do MEC, termo a negrito seguido de dois pontos
    const ig = d.blocos.findIndex((b) => b.t === 'h1' && /^(\d+(\.\d+)*\s+)?Gloss/i.test(b.texto));
    if (ig >= 0) { let fim = d.blocos.findIndex((b, i) => i > ig && b.t === 'h1'); if (fim < 0) fim = d.blocos.length;
      const termos = new Map(); const intro = [];
      for (const b of d.blocos.slice(ig + 1, fim)) { if (b.t !== 'p') { intro.push(b); continue; } if (b.termo) termos.set(b.termo, b.texto); else { const m = String(b.texto).match(/^([^:—–]{2,60})\s*[:—–]\s+(.+)$/s); if (m) termos.set(m[1].trim(), m[2].trim()); else intro.push(b); } }
      const chave = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s*\(.*\)/, '');
      const tem = new Set([...termos.keys()].map(chave)); for (const [t, x] of GLOSSARIO_MEC) if (!tem.has(chave(t))) termos.set(t, x);
      const lista = [...termos].sort((a, b) => a[0].localeCompare(b[0], 'pt')).map(([termo, texto]) => ({ t: 'p', termo, texto }));
      d.blocos = [...d.blocos.slice(0, ig + 1), ...intro.filter((b) => b.t !== 'p' || !/^Os termos/.test(b.texto)), { t: 'p', texto: 'Definições segundo o Levantamento Estatístico do Sector da Educação (MEC) e o Livro de Indicadores da Educação, com os termos usados neste documento.' }, ...lista, ...d.blocos.slice(fim)];
    }
    // numeração dos títulos: 1, 1.1, 1.1.1
    let a = 0, b2 = 0, c3 = 0; const limpa = (t) => String(t).replace(/^\d+(\.\d+)*\.?\s+/, '');
    d.blocos = d.blocos.map((b) => { if (b.t === 'h1') { a++; b2 = c3 = 0; return { ...b, texto: `${a} ${limpa(b.texto)}` }; } if (b.t === 'h2') { b2++; c3 = 0; return { ...b, texto: `${a}.${b2} ${limpa(b.texto)}` }; } if (b.t === 'h3') { c3++; return { ...b, texto: `${a}.${b2}.${c3} ${limpa(b.texto)}` }; } return b; });
    d.listaTabelas = d.blocos.filter((b) => b.t === 'tabela').map((b) => b.titulo.replace(/^(Tabela \d+):\s*/, '$1. '));
    d.listaFiguras = d.blocos.filter((b) => b.t === 'img' && /^Figura/.test(b.titulo)).map((b) => b.titulo.replace(/^(Figura \d+):\s*/, '$1. '));
    if (!d.listaMapas?.length) d.listaMapas = d.blocos.filter((b) => b.t === 'img' && /^Mapa/.test(b.titulo)).map((b) => b.titulo.replace(/^(Mapa \d+):\s*/, '$1. '));
    if (!d.listaGraficos?.length) d.listaGraficos = d.blocos.filter((b) => b.t === 'img' && /^Gráfico/.test(b.titulo)).map((b) => b.titulo.replace(/^(Gráfico \d+):\s*/, '$1. '));
    const usadas = JSON.stringify(d.blocos); d.siglas = SIGLAS_EDU.filter(([s]) => s.length < 3 || s.split(/\s*\/\s*/).some((x) => new RegExp(`\\b${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s/g, '\\s')}\\b`).test(usadas)) || /^(MEC|INE|DPE|SDEJT)$/.test(s));
    const prov = !d.geo || d.geo.prov; d.contracapa = contracapaDe(prov, d.geo?.dist); d.tema = { ...temaRel(S.pubSt), fonte: 'Arial' };
    return d;
  };
}
// exportar: o Word e o PDF recebem tema, siglas, índices e contracapa
function opcoesPdfRel(doc) { return doc.folheto ? { cor: temaRel(S.pubSt).br, paisagem: true } : { cor: temaRel(S.pubSt).br, contracapa: htmlContracapa(doc) }; }
// Folheto em tríptico: A4 horizontal, dobrável em três, duas páginas (6 painéis). Capa à direita do exterior, contactos à esquerda, conteúdo no interior.
function htmlFolheto(doc) {
  const t = temaRel(S.pubSt); const esc = esc_;
  const limpa = (s) => String(s).replace(/^\d+(\.\d+)*\.?\s+/, '');
  const bloco = (b) => b.t === 'h2' ? `<h3>${esc(limpa(b.texto))}</h3>` : b.t === 'p' ? (b.termo ? `<p class="d"><b>${esc(b.termo)}:</b> ${esc(b.texto)}</p>` : `<p>${esc(b.texto)}</p>`)
    : b.t === 'tabela' ? `<table><thead><tr>${b.cab.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${b.linhas.map((l) => l.sec ? `<tr class="s"><td colspan="${b.cab.length}">${esc(l.sec)}</td></tr>` : `<tr class="${/^(Total|Província|Média)/.test(String(l[0])) ? 'tt' : ''}">${l.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : b.t === 'img' ? `<figure>${v20.svgFlex(b.svg || '')}</figure>` : '';
  // agrupa os blocos por secção (cada h1 começa uma secção)
  const seccoes = []; for (const b of doc.blocos) { if (b.t === 'h1') seccoes.push({ tit: limpa(b.texto), bs: [] }); else if (seccoes.length) seccoes.at(-1).bs.push(b); }
  const secHtml = (s) => s ? `<h2>${esc(s.tit)}</h2>${s.bs.map(bloco).join('')}` : '';
  const porTit = (re) => seccoes.find((s) => re.test(s.tit));
  const intro = porTit(/Apresenta/); const territorio = porTit(/Territ/); const numeros = porTit(/n[úu]meros/i); const eficacia = porTit(/Efic[áa]cia/); const condicoes = porTit(/Condi/); const glos = porTit(/Gloss/);
  // mapa pequeno para a capa
  const arte = arteCapa(doc.geo); const mapa = arte.mapa ? v20.svgFlex(arte.mapa) : '';
  const cc = doc.contracapa || contracapaDe(!doc.geo || doc.geo.prov, doc.geo?.dist);
  const emb = S.emblemaURL ? `<img class="emb" src="${S.emblemaURL}" alt="">` : '';
  const painel = (cls, inner) => `<section class="pn ${cls}">${inner}</section>`;
  const capa = painel('capa', `${emb}<div class="rep">REPÚBLICA DE MOÇAMBIQUE</div><div class="ent">${doc.entidade.map((e) => esc(String(e))).join('<br>')}</div><div class="mapa">${mapa}</div><h1>${esc(doc.titulo)}</h1><div class="sub">${esc(doc.subtitulo || '')}</div><div class="dl">${esc(doc.dataLocal)}</div>`);
  const introP = painel('intro', secHtml(intro) + (numeros ? `<h2>${esc(numeros.tit)}</h2>${numeros.bs.filter((b) => b.t !== 'tabela').map(bloco).join('')}` : ''));
  const contra = painel('contra', `${emb}<div class="rep">${esc(cc.republica || 'REPÚBLICA DE MOÇAMBIQUE')}</div>${(cc.linhas || []).map((l, i) => `<div class="cl${i < 2 ? ' b' : ''}">${esc(l)}</div>`).join('')}<div class="rod">EducStat Tete · ${esc(doc.subtitulo || '')}</div>`);
  const in1 = painel('', secHtml(territorio));
  const in2 = painel('', (numeros ? `<h2>${esc(numeros.tit)}</h2>${numeros.bs.filter((b) => b.t === 'tabela').map(bloco).join('')}` : '') + secHtml(eficacia));
  const in3 = painel('', secHtml(condicoes) + secHtml(glos));
  const css = `@page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{margin:0}body{font-family:Arial,Helvetica,sans-serif;color:${t.txt};font-size:8pt;line-height:1.3}
  .folha{width:297mm;height:209.7mm;display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:209.7mm;overflow:hidden;page-break-after:always}.folha:last-child{page-break-after:auto}
  .pn{padding:9mm 7mm;border-right:1px dashed #C7D2CC;overflow:hidden;position:relative}.pn:last-child{border-right:0}
  h1{font-size:15pt;color:${t.br};margin:4mm 0 1mm;line-height:1.1}h2{font-size:10.5pt;color:${t.br};margin:3mm 0 1mm;border-bottom:1.5px solid ${t.ac};padding-bottom:.5mm}h3{font-size:9pt;color:${t.h2};margin:2mm 0 .5mm}
  p{margin:0 0 1.6mm;text-align:justify}p.d{font-size:7.4pt}p.d b{color:${t.br}}
  table{width:100%;border-collapse:collapse;font-size:6.9pt;margin:1mm 0 2mm}th{background:${t.br};color:#fff;padding:1px 2px;text-align:left;font-weight:700}td{padding:1px 2px;border-bottom:.5px solid #DfE6E2}tr.tt td{font-weight:700;background:#F0F4F2}tr.s td{background:${t.ac};color:#fff;font-weight:700}
  figure{margin:1mm 0}.emb{width:17mm;height:auto;display:block;margin:0 auto 2mm}
  .capa{text-align:center}.capa .rep{font-weight:700;font-size:8pt;letter-spacing:.03em}.capa .ent{font-size:7pt;color:${t.txt};margin:1mm 0 3mm}.capa .mapa{margin:2mm auto;max-width:62mm}.capa .sub{font-size:8.5pt;color:${t.h2};margin-top:1mm}.capa .dl{position:absolute;bottom:9mm;left:0;right:0;font-size:8pt;font-weight:700;color:${t.br}}
  .contra{text-align:center;display:flex;flex-direction:column;justify-content:flex-end}.contra .rep{font-weight:700;margin-top:4mm}.contra .cl{font-size:8pt;margin-top:1mm}.contra .cl.b{font-weight:700}.contra .rod{margin-top:6mm;font-size:6.8pt;color:${t.h2}}
  .intro h1{margin-top:0}`;
  return `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>${esc(doc.titulo)}</title><meta name="author" content="Alberto Adélia Manhice"><style>${css}</style></head><body>`
    + `<div class="folha">${contra}${introP}${capa}</div>`
    + `<div class="folha">${in1}${in2}${in3}</div></body></html>`;
}

// ---- dados oficiais do INE: superfície (Folheto Estatístico Distrital) e população projectada para 2023 (Projecções 2017-2050) ----
{
  const INE = { 901: [3304, 566990], 902: [6474, 167310], 903: [7018, 117122], 904: [7053, 183660], 905: [16096, 146380], 906: [8752, 331950], 907: [9084, 103214], 908: [2752, 204251], 909: [636, 499387], 910: [12211, 96110], 911: [7995, 142235], 912: [3509, 248008], 913: [9308, 182239], 914: [3663, 100631], 915: [2869, 84430] };
  GEO_PADRAO.prov.area = 100724; GEO_PADRAO.prov.pop = { ano: 2023, total: 3171917, fonte: 'INE, Projecções da População 2017-2050' };
  for (const [d, [a, p]] of Object.entries(INE)) { GEO_PADRAO.dist[d] = { ...(GEO_PADRAO.dist[d] || {}), area: a, pop: p }; }
  GEO_PADRAO.dist[905].limites ||= 'A norte faz fronteira com a República da Zâmbia, a sul com os distritos de Cahora Bassa e Mágoè, a este com os distritos de Chifunde e Chiúta e a oeste com o distrito do Zumbo.';
  GEO_PADRAO.dist[905].sede ||= 'Fíngoè';
}

// ---- DPE: esvaziar o sistema (começar sem dados, por exemplo para outra província, e carregar tudo por importação) ----
{
  const cbr0 = carregarBaseRemovida;
  carregarBaseRemovida = async () => { await cbr0(); try { const v = (await S.db.doc('config/vazio').get()).data(); S.sistemaVazio = !!v?.vazio; } catch { S.sistemaVazio = false; }
    if (S.sistemaVazio) { for (const a of ANOS) S.baseRemovida.add(+a); S.escStatic = []; S.cenStatic = S.cenStatic ? [] : S.cenStatic; rebuildEscolas(); } };
  const rc0 = rebuildCentros; rebuildCentros = () => { if (S.sistemaVazio) S.cenStatic = []; rc0(); };
}
function cartaoEsvaziarSistema() {
  const conf = h('input', { type: 'text', placeholder: 'escreva ESVAZIAR' }); const msg = h('p', { class: 'note' });
  const mens = h('input', { type: 'checkbox' }); const contas = h('input', { type: 'checkbox' });
  return h('div', { class: 'card', style: 'border-left:4px solid var(--bad)' }, h('h2', { text: 'Esvaziar o sistema (começar sem dados)' }),
    h('p', { text: 'Retira todos os dados: a base do instalador (todos os anos), as escolas e os centros que vêm com o programa, e tudo o que foi introduzido ou importado (mapas, alfabetização, resumos, população importada). O programa fica vazio, pronto para receber por importação (Administração > Importar Access, Excel ou pacote) os dados de outra província ou de outro período. Antes de esvaziar faz-se uma cópia de segurança completa, que permite voltar atrás em Administração > Cópias de segurança.' }),
    h('label', { class: 'chk' }, mens, 'Apagar também as mensagens e o registo de actividade'), h('label', { class: 'chk' }, contas, 'Apagar também as contas dos SDEJT (a conta da DPE com que está a trabalhar fica)'),
    h('div', { class: 'row' }, h('label', { class: 'f' }, 'Confirmação', conf), h('button', { class: 'btn warn', text: 'Esvaziar o sistema', onclick: async () => {
      if (conf.value.trim().toUpperCase() !== 'ESVAZIAR') { msg.textContent = 'Escreva ESVAZIAR para confirmar.'; return; }
      if (!(await confirmBox('Tem a certeza? O programa fica sem dados até importar novos. A cópia de segurança fica guardada.', 'Esvaziar'))) return;
      msg.textContent = 'A fazer a cópia de segurança…'; try { await copiaAutomatica(true); } catch {}
      let n = 0; const cols = ['fichas', 'alfa', 'resumo', 'escolas', 'centros', 'conflitos', ...(mens.checked ? ['mensagens', 'registo'] : [])];
      for (const c of cols) { try { for (const d of (await S.db.collection(c).get()).docs) { await S.db.doc(`${c}/${d.id}`).delete(); n++; } } catch {} }
      for (const id of ['config/populacaoINE', 'config/geografia', 'config/baseRemovida']) { try { await S.db.doc(id).delete(); } catch {} }
      if (contas.checked) for (const d of (await S.db.collection('utilizadores').get()).docs) { const u = d.data(); if (u && +u.dist && u.utilizador !== S.sessao?.utilizador) { await S.db.doc('utilizadores/' + d.id).delete(); n++; } }
      await S.db.doc('config/vazio').set({ vazio: true, em: new Date().toISOString(), por: S.sessao?.utilizador });
      await registar('sistema esvaziado', { n }); toast(`Sistema esvaziado (${NF.format(n)} registos retirados). A aplicação vai reiniciar.`, 5000); setTimeout(() => recarregar(), 1500);
    } })), msg,
    h('button', { class: 'btn sm', text: 'Voltar a usar a base do instalador (desfazer “esvaziar”)', onclick: async () => { await S.db.doc('config/vazio').set({ vazio: false, em: new Date().toISOString(), por: S.sessao?.utilizador }); await registar('base do instalador reposta'); toast('A base do instalador volta a contar. A aplicação vai reiniciar.'); setTimeout(() => recarregar(), 1200); } }));
}
{ const crs0 = cartaoReporSistema; cartaoReporSistema = () => { const c = crs0(); return (S.sessao?.raiz || (S.sessao?.perfil === 3 && !+S.sessao?.dist)) ? h('div', {}, c, cartaoEsvaziarSistema()) : c; }; }
{ const ab1 = adminBase; adminBase = async (body) => { await ab1(body); if (S.sessao?.perfil === 3 && !+S.sessao?.dist && !S.sessao?.raiz) body.append(cartaoEsvaziarSistema()); }; }

// ---- Folheto da Educação (provincial ou distrital): a educação em números, numa publicação curta ao estilo do folheto do INE ----
async function construirFolheto({ dist, ano }) {
  const prov = dist === 'Todos'; const lugar = prov ? 'Província de Tete' : `Distrito de ${distName(dist)}`; const G = await geoBase(); const versao = (await window.educstat.info()).versao;
  const anoF = Math.min(+ano, ANO_MAX_DADOS); const anos = anosComDados(anoF, 5); const A = anos[anos.length - 1] || anoF;
  const F = (n = 'Todos') => ({ dist: prov ? 'Todos' : +dist, tipo: 'Todos', nivel: n, sexo: 'Ambos' });
  const I = (a, n) => indicators(sumUp(a, F(n)), 'Ambos'); const x = I(A, 'Todos');
  const B = []; let nT = 0, nG = 0; const H1 = (t) => B.push({ t: 'h1', texto: t }), P = (t) => B.push({ t: 'p', texto: t });
  const TAB = (titulo, cab, linhas, fonte = 'Levantamento 3 de Março, EducStat.') => B.push({ t: 'tabela', titulo: `Tabela ${++nT}: ${lugar}: ${titulo}`, cab, linhas, fonte });
  const n0 = (v) => (v == null ? '…' : NF.format(Math.round(v))), p1 = (v) => (v == null ? '…' : pctTxt(v)), r1 = (v) => (v == null ? '…' : R1.format(v));
  const area = prov ? G.prov.area : G.dist[dist]?.area; const pop = prov ? G.prov.pop?.total : G.dist[dist]?.pop; const popAno = G.prov.pop?.ano || 2023;
  H1('Apresentação');
  P(`O Folheto da Educação reúne, numa só publicação, os principais números da educação ${prov ? 'na Província de Tete' : 'no ' + lugar.replace('Distrito', 'distrito')} no ano lectivo de ${A}: território e população, rede escolar, alunos, professores e os indicadores de acesso, de eficácia interna e de condições de ensino. Os dados vêm do Levantamento Estatístico 3 de Março (MEC) e, para a população e a superfície, do Instituto Nacional de Estatística (INE).`);
  H1('Território e população');
  TAB('território e população', ['Indicador', 'Valor', 'Fonte'], [['Superfície (km²)', n0(area), 'INE'], [`População (${popAno})`, n0(pop), 'INE, projecções'], ['Densidade populacional (hab./km²)', area && pop ? r1(pop / area) : '…', 'INE'], ...(prov ? [['Distritos', NF.format(S.cod.distritosTodos.length), 'INE'], ['Postos administrativos', n0(G.prov.postos), 'INE'], ['Localidades', n0(G.prov.localidades), 'INE']] : [['Sede do distrito', G.dist[dist]?.sede || '…', 'INE']])], 'INE; EducStat.');
  H1('A educação em números');
  const linhaN = (n, rot) => { const y = I(A, n); return [rot, n0(y.escolas), n0(y.matric), p1(y.pctF), n0(y.prof), p1(y.pctProfF), n0(y.turmas), r1(y.alprof), r1(y.altur)]; };
  TAB(`rede escolar, alunos e professores por nível, ${A}`, ['Nível', 'Escolas', 'Alunos (HM)', '% raparigas', 'Professores', '% mulheres', 'Turmas', 'Alunos/professor', 'Alunos/turma'], [linhaN('EP', 'Ensino Primário'), linhaN('ESG1', 'ES 1º ciclo'), linhaN('ESG2', 'ES 2º ciclo'), linhaN('Todos', 'Total')]);
  const ep = I(A, 'EP');
  P(`Em ${A}, ${n0(x.matric)} alunos frequentaram ${n0(x.escolas)} escolas, ensinados por ${n0(x.prof)} professores; ${p1(x.pctF)} dos alunos são raparigas e ${p1(x.pctProfF)} dos professores são mulheres. No Ensino Primário há, em média, ${r1(ep.alprof)} alunos por professor e ${r1(ep.altur)} alunos por turma.`);
  H1('Eficácia interna');
  const ef = (n, rot) => { const y = I(A, n); return [rot, p1(y.aprov), p1(y.reprov), p1(y.desist), p1(y.repet)]; };
  TAB(`aproveitamento por nível, ${A}`, ['Nível', 'Aprovação', 'Reprovação', 'Desistência', 'Repetência'], [ef('EP', 'Ensino Primário'), ef('ESG1', 'ES 1º ciclo'), ef('ESG2', 'ES 2º ciclo')]);
  if (anos.length > 1) { const s = (k) => anos.map((a) => { const y = I(a, 'EP'); return y[k] == null ? null : +(y[k] * 100).toFixed(1); });
    B.push({ t: 'img', titulo: `Gráfico ${++nG}: ${lugar}: aprovação e desistência no Ensino Primário, ${anos[0]}-${A}`, svg: svgLinhas({ anos, series: [{ nome: 'Aprovação', cor: PUB_COR.HM, vals: anos.map((a) => I(a, 'EP').aprov) }, { nome: 'Desistência', cor: PUB_COR.M, vals: anos.map((a) => I(a, 'EP').desist) }] }), dados: { tipo: 'linha', cats: anos.map(String), series: [{ nome: 'Aprovação', cor: PUB_COR.HM, vals: anos.map((a) => I(a, 'EP').aprov) }, { nome: 'Desistência', cor: PUB_COR.M, vals: anos.map((a) => I(a, 'EP').desist) }], pct: true }, fonte: 'Levantamento 3 de Março, EducStat.' }); void s; }
  H1('Condições de ensino');
  TAB(`condições das escolas, ${A}`, ['Indicador', 'Valor'], [['Alunos por sala de aula', r1(x.alsala)], ['Salas precárias (% do total)', p1(x.prec)], ['Turmas ao ar livre', n0(x.livre)], ['Escolas com energia eléctrica', p1(x.elect)], ['Escolas com água', p1(x.agua)], ['Escolas com sanitários', p1(x.sanit)], ['Professores com formação pedagógica', p1(x.formados)]]);
  // o folheto é um resumo dobrável: a repartição por distrito/posto fica para a brochura e a carta escolar
  H1('Glossário'); for (const [termo, texto] of GLOSSARIO_MEC.filter(([t]) => /Rácio alunos por turma|aproveitamento escolar|escolariz.*\(EP\)|Escolas cobertas/i.test(t)).slice(0, 4)) B.push({ t: 'p', termo, texto });
  const capa = capaPub(prov, dist, 'brochura', A); capa.rodape = `Folheto da Educação · ${lugar} · EducStat Tete`;
  return { folheto: true, ...capa, titulo: 'Folheto da Educação', subtitulo: `${lugar} · ${A}`, assunto: 'Principais números da educação', blocos: B, notaTecnica: [['Âmbito', lugar], ['Ano de referência', String(A)], ['Fontes', 'Levantamento Estatístico 3 de Março (MEC); INE (população e superfície)'], ['Sistema', `EducStat Tete ${versao}`]], fichaTecnica: fichaTecnicaPub('Folheto da Educação', prov, dist, 'brochura', A, versao) };
}
{ const cp0 = construirPublicacao; construirPublicacao = async (o) => (o.tipo === 'folheto' ? construirFolheto(o) : cp0(o)); }
// ecrã dos relatórios: tipo Folheto e tema de cores (pré-definidos e personalizados)
{
  const pub1 = VIEWS.publicacoes;
  VIEWS.publicacoes = async (v) => {
    await pub1(v); const st = S.pubSt; const card = v.querySelector(':scope > .card'); if (!card) return; const tipoSel = card.querySelector('select');
    if (tipoSel && ![...tipoSel.options].some((o) => o.value === 'folheto')) tipoSel.append(h('option', { value: 'folheto', text: 'Folheto da Educação (principais números)', selected: st.tipo === 'folheto' }));
    st.cores ||= {}; const cor = (k, rot) => { const i = h('input', { type: 'color', value: temaRel(st)[k], oninput: (e) => { st.cores[k] = e.target.value; } }); return h('label', { class: 'f' }, rot, i); };
    const tema = h('select', { onchange: (e) => { st.tema = e.target.value; st.cores = {}; desenhar(); } }, TEMAS_REL.map(([k, l]) => h('option', { value: k, text: l, selected: (st.tema || 'dpe') === k })));
    const caixa = h('div', { class: 'row', style: 'align-items:flex-end' });
    const desenhar = () => caixa.replaceChildren(h('label', { class: 'f' }, 'Tema de cores do relatório', tema), cor('br', 'Títulos e capa'), cor('h2', 'Subtítulos'), cor('ac', 'Destaque'), cor('txt', 'Texto'), h('button', { class: 'btn sm', text: 'Repor as cores do tema', onclick: () => { st.cores = {}; desenhar(); } }), h('span', { class: 'note', text: 'Gere de novo para ver as cores. O tema vale para o ecrã, o PDF e o Word.' }));
    desenhar(); card.append(h('details', { class: 'sub' }, h('summary', { text: 'Cores do Relatório' }), caixa));
  };
}

// ---- Ajuda: os mapas da alfabetização e EPJA (incluindo HPV) e trabalhar em vários computadores ----
{
  const aj0 = VIEWS.ajuda;
  VIEWS.ajuda = (v) => { const r = aj0(v); if ((S.ajudaTab || 'como') !== 'notas') return r;
    const L = (t, d) => h('p', { class: 'def' }, h('b', { text: t + ':' }), ' ' + d);
    v.append(h('div', { class: 'card' }, h('h2', { text: 'Mapas da Alfabetização e Educação de Adultos (AEA)' }),
      h('p', { text: 'Cada centro de alfabetização pertence a uma escola (uma escola pode ter dois ou três centros). Em Alfabetização > Introdução de Dados escolhe-se a escola e depois o centro. Tudo parte do Quadro 1 (inscritos por programa): os restantes quadros têm de ser coerentes com ele.' }),
      L('Quadro 1 — Inscritos por programa', 'alfabetizandos inscritos no início do ano, por programa e sexo, e os repetentes. É a base de todos os outros quadros.'),
      L('Quadro 2 — EPJA por nível', 'alunos da Educação de Pessoas Jovens e Adultas por nível e sexo.'),
      L('Quadro 3 — Turmas e Habilidades para a Vida (HPV)', 'número de turmas e alfabetizandos que recebem conteúdos de Habilidades para a Vida (conhecimentos, atitudes e competências para os desafios do dia-a-dia: saúde, cidadania, ambiente, rendimento). HPV não é vacinação. O número de alfabetizandos com HPV não pode passar o total do Quadro 1.'),
      L('Quadro 4 — Alfabetizadores e educadores', 'alfabetizadores com e sem capacitação e educadores da EPJA, por sexo.'),
      L('Quadro 5 — Língua de aprendizagem', 'alfabetizandos que aprendem em português e em língua materna; a soma deve dar o total do Quadro 1.'),
      L('Quadro 6 — Alunos existentes', 'alunos que continuam a frequentar à data do levantamento (alfabetização e EPJA), por sexo.'),
      L('Quadro 7 — Alunos por disciplina e nível', 'distribuição dos alunos por disciplina e nível.'),
      L('Mapa do fim do ano (aproveitamento)', 'avaliados, aprovados, reprovados e desistentes; os avaliados mais os desistentes não podem passar os inscritos do Quadro 1.'),
      h('p', { class: 'note', text: 'O Painel da Alfabetização mostra os dados por distrito, posto administrativo, localidade e escola, segundo a localização da escola na carta escolar. Cada SDEJT só introduz os dados do seu distrito; a comparação entre distritos faz-se no Painel.' })),
      h('div', { class: 'card' }, h('h2', { text: 'Trabalhar em vários computadores (técnicos que mudam de computador)' }),
        h('p', { text: 'O EducStat funciona sem internet em cada computador. Para que um técnico possa trabalhar em qualquer computador e encontrar sempre os mesmos dados, há três caminhos, do mais simples ao mais completo:' }),
        L('1. Pacote de transferência', 'em Administração > Configurações > Este computador, exporta-se a configuração (.educcfg) com as contas e, em Administração > Cópias, um pacote dos dados; no outro computador importa-se. Serve para mudanças pontuais.'),
        L('2. Sincronização pela internet (servidor da DPE)', 'com a sincronização ligada (Administração > Sincronização), cada computador envia e recebe os mapas quando tem internet. As regras de acesso (RLS) do servidor garantem que cada SDEJT só escreve no seu distrito. Um técnico pode entrar noutro computador do mesmo distrito e, depois de sincronizar, encontra o seu trabalho.'),
        L('3. Sistema em linha (próxima fase)', 'publicar a mesma interface como página web ligada ao servidor (Supabase), com início de sessão pelo servidor (contas por e-mail), cópias de segurança diárias e registo de actividade no servidor. Exige: servidor com domínio próprio e HTTPS, contas individuais (nunca partilhadas), a chave de serviço guardada só no servidor, e um responsável na DPE pela administração e pelas cópias.'),
        h('p', { class: 'note', text: 'Enquanto o sistema em linha não existir, o caminho 2 é o recomendado: a palavra-passe de cada pessoa é a mesma em todos os computadores do distrito (vai no .educcfg) e os dados chegam pela sincronização.' })));
    return r; };
}
