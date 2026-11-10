// =====================================================================
// VERSÃO 1.4: BARRA LATERAL, PAINEL DA CONTA, MENSAGENS (MINI REDE), PRESENÇA COM IP,
// CÓPIAS AUTOMÁTICAS, VISITA GUIADA E AJUDA NOVA
// =====================================================================
const SVG = (d, w = 18) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', w); s.setAttribute('height', w); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.9'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = d; return s; };
const IC = {
  chave: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M14 9l2 2"/>',
  tema: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
  filtro: '<path d="M3 5h18l-7 8v6l-4 2v-8Z"/>',
  zoom: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
  ecra: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  pasta: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  copia: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  sair: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l5-5-5-5M15 12H3"/>',
  fechar: '<path d="M18 6 6 18M6 6l12 12"/>',
  guia: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>',
  ajuda: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  msg: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>',
  enviar: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  pessoas: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  escudo: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/><path d="m9 12 2 2 4-4"/>',
  nuvem: '<path d="M17.5 19H7a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 12 3.5 3.5 0 0 1 17.5 19Z"/>',
  raio: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
  livro: '<path d="M4 19V6a2 2 0 0 1 2-2h13v13H6a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h13"/>',
  grafico: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  ficha: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v3h6V3M9 11h6M9 15h4"/>',
  mapa: '<path d="m9 4-6 3v13l6-3 6 3 6-3V4l-6 3Z"/><path d="M9 4v13M15 7v13"/>',
};

// ---------------- barra lateral: recolher / mostrar ----------------
(function barraLateral() {
  const b = document.getElementById('hamb'); if (!b || b.__ok) return; b.__ok = true;
  const mini = () => { try { return localStorage.getItem('navMini') === '1'; } catch { return false; } };
  if (mini()) document.body.classList.add('nav-mini');
  b.onclick = () => {
    if (window.innerWidth <= 900) { document.body.classList.toggle('nav-open'); return; }
    const m = document.body.classList.toggle('nav-mini'); try { localStorage.setItem('navMini', m ? '1' : '0'); } catch {}
  };
  document.getElementById('nav')?.addEventListener('click', (e) => { if (e.target.closest('a') && window.innerWidth <= 900) document.body.classList.remove('nav-open'); });
})();

// ---------------- cartão do utilizador (canto superior direito) e painel da conta ----------------
function nomePerfilCurto() {
  const s = S.sessao || {};
  if (s.raiz) return 'Supervisão do sistema'; if (s.perfil === 0) return 'Visitante';
  if (s.perfil === 3) return +s.dist ? 'Administrador Distrital' : 'Administrador Provincial';
  const p = (PERFIS.find((x) => x[0] === s.perfil) || [0, ''])[1].split(' (')[0];
  return p.replace(/^./, (c) => c.toUpperCase());
}
const iniciais = (n) => (/^SDEJT/i.test(n || '') && /\(([^)]+)\)/.test(n) ? n.match(/\(([^)]+)\)/)[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 2).toUpperCase() : (n || '?').replace(/\(.*\)/, '').split(/[\s_]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase());
function drawWho() {
  if (!DESKTOP || !S.sessao) return;
  const btn = h('button', { class: 'conta', 'aria-haspopup': 'menu', title: 'A sua conta, tema, parâmetros e sair' }, h('span', { class: 'av', text: iniciais(S.sessao.nome) }),
    h('span', { class: 'hide-sm' }, h('b', { text: S.sessao.nome }), h('small', { text: nomePerfilCurto() })), h('span', { text: '▾', 'aria-hidden': 'true' }));
  btn.onclick = () => abrirMenuApp(btn);
  $('#who').replaceChildren(btn);
  $('#nav-admin').hidden = S.sessao.perfil !== 3;
}
function abrirMenuApp(anc) {
  if (document.querySelector('.menu-app')) { document.querySelector('.menu-app').remove(); return; }
  const it = (ic, t, f, k, cls) => h('button', { role: 'menuitem', class: cls || null, onclick: () => { m.remove(); f(); } }, h('span', { class: 't' }, SVG(IC[ic]), h('span', { text: t })), k ? h('kbd', { text: k }) : null);
  const tema = { sistema: 'automático', claro: 'claro', escuro: 'escuro' }[temaActual()];
  const s = S.sessao;
  const m = h('div', { class: 'menu-app', role: 'menu' },
    h('div', { class: 'cab' }, h('span', { class: 'av', text: iniciais(s.nome) }), h('div', {}, h('b', { text: s.nome }), h('small', { text: nomePerfilCurto() }),
      h('small', { text: [+s.dist ? 'SDEJT de ' + distName(s.dist) : 'DPE Tete', s.local && !String(s.local).includes(+s.dist ? distName(s.dist) : 'DPE') ? s.local : null].filter(Boolean).join(' · ') }))),
    h('div', { class: 'mg', text: 'Conta' }),
    it('chave', 'Mudar a palavra-passe…', () => mudarSenha(false)),
    it('guia', 'Visita guiada ao programa', () => iniciarTour(true)),
    h('div', { class: 'mg', text: 'Ver' }),
    it('tema', `Tema: ${tema} (mudar)`, () => { aplicarTema({ sistema: 'claro', claro: 'escuro', escuro: 'sistema' }[temaActual()]); drawWho(); }),
    it('filtro', 'Parâmetros (anos e distritos)…', abrirParametros),
    it('zoom', 'Aumentar', () => window.educstat.janela('zoomMais'), 'Ctrl +'), it('zoom', 'Diminuir', () => window.educstat.janela('zoomMenos'), 'Ctrl −'), it('zoom', 'Tamanho normal', () => window.educstat.janela('zoomNormal')),
    it('ecra', 'Ecrã inteiro', () => window.educstat.janela('ecra'), 'F11'),
    h('div', { class: 'mg', text: 'Ficheiro' }),
    it('pasta', 'Abrir a pasta de dados', () => window.educstat.janela('pasta')),
    s.perfil === 3 ? it('copia', 'Cópias de segurança…', () => { S.adm = { tab: 'dados' }; location.hash = '#admin'; go('admin'); }) : null,
    it('info', 'Sobre o EducStat Tete', async () => { const i = await window.educstat.info(); confirmBox(`EducStat Tete ${i.versao}. Sistema de introdução, verificação e indicadores das estatísticas da educação da Província de Tete. Funciona sem internet. Preparado por Alberto Adélia Manhice — DPE Tete.`, 'Fechar'); }),
    h('div', { class: 'mg', text: 'Sessão' }),
    it('sair', 'Sair da sessão', async () => { await registar('saída'); recarregar(); }),
    it('fechar', 'Fechar o programa', async () => { await registar('saída'); window.educstat.janela('sair'); }, null, 'perigo'));
  const r = anc.getBoundingClientRect(); m.style.top = r.bottom + 6 + 'px'; m.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
  document.body.append(m);
  setTimeout(() => { const f = (e) => { if (!m.contains(e.target) && !anc.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', f); } }; document.addEventListener('mousedown', f); }, 0);
}

// ---------------- presença: quem está online (todos vêem todos; a DPE vê também o IP) ----------------
async function presencaPing() {
  try {
    if (!S.sessao || S.sessao.perfil === 0) return; const sv = await window.educstat.servidor('estado'); if (!sv?.email) return;
    const inst = await instalacao(); const info = (S.__info ||= await window.educstat.info());
    if (!S.sessao.raiz) await window.educstat.netSync(null, 'ping', { id: `presenca/${inst.id}/${S.sessao.utilizador}`, dist: inst.papel === 'central' ? null : inst.dist, origem: `${inst.papel}:${inst.dist || 0}:${inst.id}`,
      dados: { utilizador: S.sessao.utilizador, nome: S.sessao.nome, perfil: S.sessao.perfil, dist: S.sessao.dist || 0, local: S.sessao.local || '', papel: inst.papel, instDist: inst.dist || 0, desde: S.sessao.desde },
      tec: { maquina: info.maquina, ipLocal: (info.ips || []).join(', '), versao: info.versao } });
    const r = await window.educstat.netSync(null, 'quem', 180);
    if (r?.ok) { S.online = r.docs.map((x) => ({ ...x.dados, em: x.em, ip: x.ip || null })); desenharIcones(); if (current === 'mensagens') desenharListaConversas?.(); }
  } catch {}
}
const unidadeDe = (x) => +x.dist || 0;
function painelOnline() {
  const l = listaOnline(); const dpe = ehDPE();
  return h('div', { class: 'pop-in' }, h('div', { class: 'row between' }, h('strong', { text: `Online agora (${l.length})` }), h('div', { class: 'row' }, h('button', { class: 'btn sm', text: 'Abrir mensagens', onclick: () => { fecharPop(); location.hash = '#mensagens'; } }), h('button', { class: 'btn sm', text: 'Actualizar', onclick: async () => { await presencaPing(); fecharPop(); abrirPop('online'); } }))),
    S.online ? null : h('p', { class: 'note', text: 'Para ver os outros computadores, este computador tem de ter entrado no servidor (Administração > Sincronização).' }),
    h('p', { class: 'note', text: 'Clique numa pessoa para lhe escrever.' }),
    h('div', { style: 'display:flex;flex-direction:column;gap:2px;max-height:420px;overflow:auto' }, l.sort((a, b) => unidadeDe(a) - unidadeDe(b) || String(a.nome).localeCompare(String(b.nome), 'pt')).map((x) => {
      const pode = !x.eu; const linha = h(pode ? 'button' : 'div', { class: 'pessoa conv-it', style: 'width:100%', title: pode ? 'Escrever a ' + (x.nome || x.utilizador) : null, onclick: pode ? () => { fecharPop(); abrirConversa('u' + unidadeDe(x), x); } : null },
        h('span', { class: 'av on', text: iniciais(x.nome || x.utilizador) }),
        h('span', { class: 'tx' }, h('b', { text: `${x.nome || x.utilizador}${x.eu ? ' (você)' : ''}` }), h('small', { text: [unidadeDe(x) ? 'SDEJT ' + distName(unidadeDe(x)) : 'DPE Tete', x.local, x.eu ? 'agora' : 'activo às ' + new Date(x.em).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })].filter(Boolean).join(' · ') }),
          dpe && !x.eu && (x.ip || x.ipLocal || x.maquina) ? h('small', { class: 'mono', text: [x.ip ? 'IP ' + x.ip : null, x.ipLocal ? 'rede local ' + x.ipLocal : null, x.maquina, x.versao ? 'v' + x.versao : null].filter(Boolean).join(' · ') }) : null),
        pode ? SVG(IC.msg, 16) : null);
      return linha;
    })));
}

// ---------------- mensagens: conversas por unidade (DPE, cada SDEJT, todos os distritos) ----------------
// Cada mensagem: de (nome), deUtil, deDist (0 = DPE), para (distrito de destino; 0 = DPE quando escreve um distrito, ou todos quando escreve a DPE),
// paraUtil / paraNome (opcional: pessoa a quem se dirige), em, threadId, replyTo.
const meuDist = () => +(S.sessao?.dist || 0);
function convDe(m) {
  const eu = meuDist(), de = +m.deDist || 0, pa = +m.para || 0;
  if (!de && !pa) return 'todos';
  if (de === eu) return 'u' + pa; if (pa === eu || (!pa && !eu)) return 'u' + de;
  return 'p' + Math.min(de, pa) + '_' + Math.max(de, pa); // entre dois distritos (só a DPE vê)
}
function nomeConv(k) {
  if (k === 'todos') return meuDist() ? 'DPE · avisos para todos os distritos' : 'Todos os distritos (avisos)';
  if (k.startsWith('u')) { const d = +k.slice(1); return d ? 'SDEJT ' + distName(d) : 'DPE Tete'; }
  const [a, b] = k.slice(1).split('_').map(Number); return `${distName(a)} ↔ ${distName(b)}`;
}
// privacidade das mensagens (como numa rede social): cada pessoa só vê o que enviou, o que lhe foi enviado
// (a si ou à sua unidade) e os avisos para todos. Nem a DPE nem um administrador vêem as conversas dos outros.
function podeVerMsg(m) {
  // política única e testada (app/modules/message-access.js; testes em tests/message-access.test.js)
  if (window.EducStatMessageAccess) return window.EducStatMessageAccess.canViewMessage(m, S.sessao);
  return false;
}
function msgsParaMim(todas) {
  const t = (m) => m.enviada || m.em;
  return todas.filter(podeVerMsg).sort((a, b) => (t(a) < t(b) ? 1 : -1));
}
const chaveLidasConv = () => 'msgLidasConv_' + (S.sessao?.utilizador || '');
const lidasConv = () => { try { return JSON.parse(localStorage.getItem(chaveLidasConv()) || '{}') || {}; } catch { return {}; } };
function marcarLida(k) { const l = lidasConv(); l[k] = new Date().toISOString(); try { localStorage.setItem(chaveLidasConv(), JSON.stringify(l)); } catch {} }
function naoLidas(k) {
  const l = lidasConv(), base = lidasAte();
  return (S.msgs || []).filter((m) => m.deUtil !== S.sessao?.utilizador && (!k || convDe(m) === k) && m.em > (l[convDe(m)] || base));
}
// notificações retiradas da janelinha do sino (continuam na área de Mensagens)
const chaveOcultas = () => 'msgOcultas_' + (S.sessao?.utilizador || '');
const ocultas = () => { try { return new Set(JSON.parse(localStorage.getItem(chaveOcultas()) || '[]')); } catch { return new Set(); } };
function ocultar(ids) { const o = ocultas(); for (const i of ids) o.add(i); try { localStorage.setItem(chaveOcultas(), JSON.stringify([...o].slice(-500))); } catch {} }
function painelMensagens() { // a janelinha do sino mostra as últimas e leva à área de mensagens
  const nl = naoLidas(); const oc = ocultas(); const ult = (S.msgs || []).filter((m) => !oc.has(m.id)).slice(0, 8);
  const redesenhar = () => { fecharPop(); abrirPop('msgs'); desenharIcones(); };
  return h('div', { class: 'pop-in' }, h('div', { class: 'row between' }, h('strong', { text: nl.length ? `${nl.length} mensagens por ler` : 'Mensagens' }), h('button', { class: 'btn sm primary', text: 'Abrir as mensagens', onclick: () => { fecharPop(); location.hash = '#mensagens'; } })),
    h('div', { class: 'row', style: 'gap:4px' }, h('button', { class: 'btn sm', text: 'Marcar tudo como lido', disabled: !nl.length, onclick: () => { for (const m of nl) marcarLida(convDe(m)); try { localStorage.setItem(chaveLidas(), new Date().toISOString()); } catch {} redesenhar(); } }),
      h('button', { class: 'btn sm', text: 'Limpar a lista', disabled: !ult.length, title: 'Retira daqui as notificações (continuam em Mensagens)', onclick: () => { for (const m of nl) marcarLida(convDe(m)); ocultar(ult.map((m) => m.id)); redesenhar(); } })),
    ult.length ? h('div', { style: 'display:flex;flex-direction:column;gap:2px' }, ult.map((m) => h('div', { class: 'row', style: 'gap:2px;flex-wrap:nowrap;align-items:stretch' }, h('button', { class: 'conv-it', style: 'flex:1', onclick: () => { fecharPop(); abrirConversa(convDe(m)); } },
      h('span', { class: 'av', text: iniciais(m.de) }), h('span', { class: 'tx' }, h('b', { text: `${m.de || '—'} · ${nomeConv(convDe(m))}` }), h('small', { text: m.texto })),
      nl.includes(m) ? h('span', { class: 'nb', text: '•' }) : h('small', { class: 'note', text: '✓ lida' })),
      h('button', { class: 'btn sm', title: 'Retirar da lista', 'aria-label': 'Retirar da lista', text: '×', onclick: () => { marcarLida(convDe(m)); ocultar([m.id]); redesenhar(); } })))) : h('p', { class: 'note', text: 'Sem notificações.' }));
}
function abrirConversa(k, pessoa) { S.msgSt = { ...(S.msgSt || {}), conv: k, pessoa: pessoa || null }; if (current === 'mensagens') go('mensagens'); else location.hash = '#mensagens'; }
let desenharListaConversas = null;
VIEWS.mensagens = async (v) => {
  const st = S.msgSt ||= { conv: null, q: '' };
  const eu = meuDist(), dpe = ehDPE(), podeEscrever = (S.sessao?.perfil || 0) >= 2;
  const cfgOn = (await S.db.doc('config/online').get()).data() || {}; const sv = await window.educstat.servidor('estado');
  const lastPush = cfgOn.lastPush || '';
  const unidades = [eu ? 'u0' : 'todos', ...(eu ? ['todos'] : []), ...S.cod.distritosTodos.filter((d) => d[0] !== eu).map((d) => 'u' + d[0])];
  const lista = h('div', { class: 'lista', role: 'list' });
  const busca = h('input', { type: 'search', placeholder: 'Procurar nas mensagens…', value: st.q || '', oninput: (e) => { st.q = e.target.value; desenharLista(); desenharChat(); } });
  const btTodos = h('button', { class: 'btn sm', text: st.todos ? 'Só as conversas' : '+ Todos os contactos', title: 'Mostrar todas as unidades com quem pode conversar', onclick: () => { st.todos = !st.todos; btTodos.textContent = st.todos ? 'Só as conversas' : '+ Todos os contactos'; desenharLista(); } });
  const onlineBox = h('div', { style: 'display:flex;flex-direction:column;gap:2px' });
  const chat = h('div', { class: 'card chat' });
  const onlineDe = (k) => (S.online || []).filter((x) => k.startsWith('u') && unidadeDe(x) === +k.slice(1) && x.utilizador !== S.sessao.utilizador);
  const convs = () => { const m = new Map(); for (const x of S.msgs || []) { const k = convDe(x); (m.get(k) || m.set(k, []).get(k)).push(x); } return m; };
  const desenharLista = () => {
    const cv = convs(); const q = (st.q || '').toLowerCase();
    // por omissão só aparecem as conversas que já têm mensagens (e a própria unidade); “Todos os contactos” mostra os restantes
    const ks = [...new Set([...(st.todos ? unidades : unidades.slice(0, eu ? 2 : 1)), ...cv.keys()])].filter((k) => k !== 'todos' || dpe || cv.has('todos'));
    ks.sort((a, b) => { const la = cv.get(a)?.[0]?.em || '', lb = cv.get(b)?.[0]?.em || ''; return lb.localeCompare(la) || unidades.indexOf(a) - unidades.indexOf(b); });
    lista.replaceChildren(...ks.filter((k) => !q || nomeConv(k).toLowerCase().includes(q) || (cv.get(k) || []).some((m) => m.texto.toLowerCase().includes(q))).map((k) => {
      const ult = cv.get(k)?.[0]; const n = naoLidas(k).length; const on = onlineDe(k).length;
      return h('button', { class: 'conv-it', role: 'listitem', 'aria-current': String(st.conv === k), onclick: () => { st.conv = k; st.pessoa = null; desenharLista(); desenharChat(); } },
        h('span', { class: 'av' + (on ? ' on' : ''), text: k === 'todos' ? 'TD' : k === 'u0' ? 'DPE' : k.startsWith('u') ? String(+k.slice(1)).slice(-2) : '↔' }),
        h('span', { class: 'tx' }, h('b', { text: nomeConv(k) }), h('small', { text: ult ? `${ult.deUtil === S.sessao.utilizador ? 'Você: ' : ''}${ult.apagada ? 'Mensagem apagada' : ult.texto}` : on ? `${on} online agora` : 'Sem mensagens' })),
        n ? h('span', { class: 'nb', text: n }) : null);
    }));
    const ol = listaOnline().filter((x) => !x.eu);
    onlineBox.replaceChildren(h('strong', { style: 'font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em', text: `Online agora (${ol.length})` }),
      ...(ol.length ? ol.map((x) => h('button', { class: 'conv-it', title: 'Escrever a ' + (x.nome || x.utilizador), onclick: () => { st.conv = 'u' + unidadeDe(x); st.pessoa = x; desenharLista(); desenharChat(); } },
        h('span', { class: 'av on', text: iniciais(x.nome || x.utilizador) }), h('span', { class: 'tx' }, h('b', { text: x.nome || x.utilizador }), h('small', { text: (unidadeDe(x) ? 'SDEJT ' + distName(unidadeDe(x)) : 'DPE Tete') + (dpe && x.ip ? ' · IP ' + x.ip : '') })))) :
        [h('p', { class: 'note', text: sv?.email ? 'Ninguém mais online neste momento.' : 'Para ver quem está online, entre no servidor em Administração > Sincronização.' })]));
  };
  desenharListaConversas = desenharLista;
  const desenharChat = () => {
    const k = st.conv;
    if (!k) { chat.replaceChildren(h('div', { class: 'empty', style: 'margin:auto' }, SVG(IC.msg, 34), h('p', { text: 'Escolha uma conversa à esquerda, ou clique numa pessoa online para lhe escrever.' }))); return; }
    const ms = (convs().get(k) || []).slice().reverse(); const q = (st.q || '').toLowerCase();
    const fio = h('div', { class: 'chat-fio' }); let dia = '';
    for (const m of ms) {
      if (q && !m.texto.toLowerCase().includes(q)) continue;
      const d = new Date(m.enviada || m.em); const dd = d.toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      if (dd !== dia) { dia = dd; fio.append(h('div', { class: 'dia', text: dd })); }
      const minha = m.deUtil === S.sessao.utilizador; const pend = minha && sv?.email && (!lastPush || m.em > lastPush) && SYNC.estado !== 'sincronizado';
      // editar ou apagar: o autor durante 15 minutos; o administrador provincial apaga a qualquer momento (o texto apagado fica registado e só a DPE o vê)
      const dentro15 = minha && Date.now() - new Date(m.enviada || m.em).getTime() < 15 * 60 * 1000;
      const admDPE = dpe && S.sessao?.perfil === 3;
      const acc = !m.apagada && podeEscrever && (dentro15 || admDPE) ? h('span', { style: 'display:inline-flex;gap:8px;margin-left:8px' },
        dentro15 ? h('a', { href: '#', style: 'font-size:11px', text: 'Editar', onclick: (ev) => { ev.preventDefault(); editarMsg(m); } }) : null,
        h('a', { href: '#', style: 'font-size:11px;color:var(--bad)', text: 'Apagar', onclick: (ev) => { ev.preventDefault(); apagarMsg(m); } })) : null;
      fio.append(h('div', { class: 'bolha' + (minha ? ' minha' : ''), style: m.apagada ? 'opacity:.7;font-style:italic' : null },
        !minha ? h('b', { style: 'display:block;font-size:12px;color:var(--brand)', text: `${m.de || '—'}${m.deDist ? ' · SDEJT ' + distName(m.deDist) : ' · DPE'}` }) : null,
        m.paraNome ? h('small', { style: 'margin:0 0 3px', text: 'Para ' + m.paraNome }) : null,
        h('span', { text: m.apagada ? 'Mensagem apagada' : m.texto }),
        m.apagada && admDPE && m.textoOriginal ? h('small', { style: 'color:var(--bad)', text: `Registo (só a DPE vê): “${m.textoOriginal}” — apagada por ${m.apagadaPor || '—'} em ${new Date(m.apagada).toLocaleString('pt-PT')}` }) : null,
        h('small', {}, d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }), m.editada && !m.apagada ? ' · editada' : '', pend ? h('span', { class: 'pend', text: ' · por enviar (segue logo que houver rede)' }) : minha ? ' · ✓' : '', acc)));
    }
    if (!fio.childElementCount) fio.append(h('p', { class: 'note', style: 'margin:auto', text: q ? 'Nenhuma mensagem com esse texto.' : 'Ainda não há mensagens nesta conversa. Escreva a primeira.' }));
    const ehPar = k.startsWith('p'); const destinoOk = podeEscrever && !ehPar && (k !== 'todos' || dpe);
    // por omissão a resposta vai só para quem escreveu (privada); “Todos de …” envia à unidade inteira
    const online = onlineDe(k); const pessoas = [...online];
    for (const m of ms) if (m.deUtil && m.deUtil !== S.sessao.utilizador && !pessoas.some((x) => x.utilizador === m.deUtil)) pessoas.push({ utilizador: m.deUtil, nome: m.de });
    const ultimoOutro = [...ms].reverse().find((m) => m.deUtil && m.deUtil !== S.sessao.utilizador);
    const alvo = st.pessoa?.utilizador || (k !== 'todos' ? ultimoOutro?.deUtil : null);
    const paraSel = h('select', { 'aria-label': 'Para quem' }, h('option', { value: '', text: k === 'todos' ? 'Todos os distritos' : `Todos de ${nomeConv(k)}` }),
      ...pessoas.map((x) => h('option', { value: x.utilizador, text: (x.nome || x.utilizador) + (online.includes(x) ? ' (online)' : ''), selected: alvo === x.utilizador })),
      st.pessoa && !pessoas.some((x) => x.utilizador === st.pessoa.utilizador) ? h('option', { value: st.pessoa.utilizador, text: st.pessoa.nome || st.pessoa.utilizador, selected: true }) : null);
    const txt = h('textarea', { rows: 2, placeholder: destinoOk ? 'Escreva a mensagem… (Enter envia, Shift+Enter muda de linha)' : 'Só leitura', disabled: !destinoOk });
    const enviar = async () => {
      const t = txt.value.trim(); if (!t) return;
      const id = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      const para = k === 'todos' ? 0 : +k.slice(1);
      const quem = paraSel.value ? [...pessoas, st.pessoa].find((x) => x && x.utilizador === paraSel.value) : null;
      const ant = ms[ms.length - 1];
      await S.db.doc(`mensagens/${id}`).set({ id, texto: t, de: S.sessao.nome, deUtil: S.sessao.utilizador, deDist: eu, deLocal: S.sessao.local || '', para, paraUtil: quem?.utilizador || null, paraNome: quem?.nome || null, em: new Date().toISOString(), threadId: ant ? ant.threadId || ant.id : id, replyTo: ant ? ant.id : null });
      txt.value = ''; marcarLida(k); await registar('mensagem enviada', { para: nomeConv(k) }); syncAgora('mensagem');
    };
    txt.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } };
    const EMO = ['👍', '🙏', '😊', '😀', '👏', '✅', '❗', '❓', '📊', '📌', '📅', '⏰', '🏫', '📚', '✍️', '📎', '🎉', '😔'];
    const emo = h('div', { class: 'emo-pop', hidden: true }, EMO.map((x) => h('button', { type: 'button', text: x, onclick: () => { const a = txt.selectionStart ?? txt.value.length; txt.value = txt.value.slice(0, a) + x + txt.value.slice(a); txt.focus(); txt.selectionStart = txt.selectionEnd = a + x.length; emo.hidden = true; } })));
    const btEmo = h('button', { class: 'btn', type: 'button', title: 'Emojis', 'aria-label': 'Emojis', text: '😊', onclick: () => { emo.hidden = !emo.hidden; } });
    const pes = online.length ? h('span', { class: 'note', text: `Online: ${online.map((x) => x.nome || x.utilizador).join(', ')}` }) : null;
    chat.replaceChildren(
      h('div', { class: 'chat-cab' }, h('span', { class: 'av', style: 'width:38px;height:38px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--soft);color:var(--brand);font-weight:700', text: k === 'todos' ? 'TD' : k === 'u0' ? 'DPE' : '✉' }),
        h('div', { style: 'flex:1;min-width:0' }, h('h2', { text: nomeConv(k) }), pes),
        h('button', { class: 'btn sm', text: 'Exportar (Excel)', onclick: () => exportarConversa(k, ms) })),
      fio,
      destinoOk ? h('div', { class: 'chat-esc', style: 'position:relative' }, emo, h('label', { class: 'f', style: 'min-width:10rem' }, 'Para', paraSel), txt, btEmo, h('button', { class: 'btn primary', title: 'Enviar', onclick: enviar }, SVG(IC.enviar, 16), ' Enviar')) :
        h('p', { class: 'note', text: ehPar ? 'Conversa entre dois distritos: a DPE acompanha, mas não escreve aqui.' : !podeEscrever ? 'O seu perfil é só de consulta: pode ler, mas não enviar mensagens.' : 'Só a DPE envia avisos para todos os distritos.' }));
    requestAnimationFrame(() => { fio.scrollTop = fio.scrollHeight; });
    if (!q) { marcarLida(k); setTimeout(() => { desenharIcones(); }, 0); }
  };
  v.append(h('div', { class: 'row between' }, h('div', {}, h('h1', { text: 'Mensagens' }), h('p', { class: 'lede', text: 'Converse com a DPE e com os outros SDEJT. Cada pessoa só vê as mensagens que enviou, as que recebeu (pessoalmente ou para a sua unidade) e os avisos para todos: ninguém, nem a DPE, lê as conversas dos outros. Quem está online aparece com um ponto verde.' })),
    h('div', { class: 'row' }, h('span', { class: 'autosave', text: sv?.email ? (SYNC.estado === 'sincronizado' ? 'Ligado ao servidor' : SYNC.estado === 'sem ligação' ? 'Sem ligação: as mensagens ficam na fila' : 'Ligado ao servidor') : 'Sem conta do servidor: as mensagens seguem por pacote' }),
      h('button', { class: 'btn', text: 'Marcar tudo como lido', onclick: () => { for (const k of convs().keys()) marcarLida(k); try { localStorage.setItem(chaveLidas(), new Date().toISOString()); } catch {} go('mensagens'); } }))));
  v.append(h('div', { class: 'msg-shell' }, h('div', { class: 'card msg-side' }, busca, btTodos, lista, h('hr', { style: 'border:0;border-top:1px solid var(--line);width:100%' }), onlineBox), chat));
  desenharLista(); desenharChat();
  // enquanto esta área está aberta, procura mensagens novas de 30 em 30 segundos
  clearInterval(S.__msgPoll); S.__msgPoll = setInterval(() => { if (current !== 'mensagens') { clearInterval(S.__msgPoll); return; } if (!SYNC.aCorrer && SYNC.falhas === 0) syncAgora('mensagens'); }, 30000);
  S.__msgRedraw = () => { if (current === 'mensagens') { desenharLista(); const at = document.activeElement; if (!(at && at.tagName === 'TEXTAREA' && at.value)) desenharChat(); } };
};
function exportarConversa(k, ms) {
  const wb = XLSX.utils.book_new();
  const linhas = ms.map((m) => ({ Data: new Date(m.em).toLocaleString('pt-PT'), De: m.de || '', Unidade: m.deDist ? 'SDEJT ' + distName(m.deDist) : 'DPE', Para: m.paraNome || nomeConv(k), Mensagem: m.texto }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas.length ? linhas : [{ Data: '', De: '', Unidade: '', Para: '', Mensagem: '' }]), 'Mensagens');
  wb.Props = { Title: 'Mensagens — ' + nomeConv(k), Subject: 'Conversa no EducStat Tete', Keywords: 'mensagens, EducStat, DPE Tete' };
  S.downloads.save({ filename: `Mensagens_${nomeConv(k).replace(/[^\wÀ-ú]+/g, '_')}.xlsx`, data: new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })]) }).catch(() => {});
}
function iniciarMensagens() {
  let primeira = true;
  S.db.collection('mensagens').onSnapshot((snap) => {
    const antes = new Set((S.msgs || []).map((m) => m.id));
    S.msgs = msgsParaMim(snap.docs.map((d) => d.data()));
    const novas = S.msgs.filter((m) => !antes.has(m.id) && m.deUtil !== S.sessao?.utilizador && naoLidas(convDe(m)).includes(m));
    if (!primeira && novas.length) {
      const m = novas[0]; const aberta = current === 'mensagens' && S.msgSt?.conv === convDe(m) && document.hasFocus();
      if (!aberta) {
        somAviso();
        try { const n = new Notification('EducStat Tete · nova mensagem', { body: `${m.de || ''}${m.deDist ? ' (SDEJT ' + distName(m.deDist) + ')' : ' (DPE)'}: ${m.texto.slice(0, 140)}`, silent: true }); n.onclick = () => { window.focus(); abrirConversa(convDe(m)); }; } catch {}
        toast(`Nova mensagem de ${m.de || 'outro utilizador'}.`, 5000);
      }
    } else if (primeira && naoLidas().length) { somAviso(); }
    primeira = false; desenharIcones(); S.__msgRedraw?.();
  }, () => {});
}
function desenharIcones() {
  const w = $('#icones'); if (!w || !S.sessao) return;
  const nl = naoLidas().length; const on = listaOnline().length;
  w.replaceChildren(
    iconBtn('actualizar', 'Actualizar o ecrã e sincronizar agora', 0, actualizarTudo, 'ib-actualizar'),
    iconBtn('filtro', 'Parâmetros de visualização (anos, distritos)', 0, abrirParametros),
    podeVerOnline() ? iconBtn('pessoas', `Quem está online (${on})`, on, () => (POP ? fecharPop() : abrirPop('online')), 'ib-online') : null,
    iconBtn('sino', nl ? `${nl} mensagens e notificações novas` : 'Mensagens e notificações', nl, () => (POP ? fecharPop() : abrirPop('msgs')), 'ib-msgs'));
  w.querySelector('#ib-msgs')?.classList.toggle('pulse', nl > 0);
  const nb = document.getElementById('nav-msg-nb'); if (nb) nb.textContent = nl ? (nl > 99 ? '99+' : String(nl)) : '';
}

// ---------------- cópias automáticas e orientação para recuperar dados ----------------
// a cópia manual e a automática têm o mesmo conteúdo (todas as colecções; o resumo vai também para o restauro ficar coerente)
const COLS_COPIA = ['fichas', 'resumo', 'escolas', 'alfa', 'centros', 'utilizadores', 'config', 'mensagens', 'populacao', 'registo', 'conflitos'];
async function copiaAutomatica() {
  try {
    const hoje = new Date().toISOString().slice(0, 10); const k = 'copiaAuto';
    let ult = ''; try { ult = localStorage.getItem(k) || ''; } catch {}
    if (ult === hoje) return;
    const all = {}; for (const c of COLS_COPIA) { all[c] = {}; for (const d of (await S.db.collection(c).get()).docs) all[c][d.id] = d.data(); }
    await window.educstat.copiaAuto(JSON.stringify({ tipo: 'educstat-copia', automatica: true, criado: new Date().toISOString(), dados: all }));
    try { localStorage.setItem(k, hoje); } catch {}
  } catch (e) { console.warn('cópia automática', e); }
}
async function cartaoCopiasAuto(restore) {
  const l = await window.educstat.copias();
  return h('div', { class: 'card' }, h('h2', { text: 'Cópias automáticas (uma por dia)' }),
    h('p', { class: 'note', text: 'O programa faz sozinho uma cópia por dia, na primeira vez que é aberto, dentro da pasta de dados (subpasta Copias). Ficam as 14 mais recentes.' }),
    l.length ? h('div', { class: 'tw', style: 'max-height:280px' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { class: 'l', text: 'Dia' }), h('th', { text: 'Tamanho' }), h('th', { text: '' }))),
      h('tbody', {}, l.map((c) => { const d = c.nome.match(/(\d{4})-(\d{2})-(\d{2})/); return h('tr', {}, h('td', { class: 'l', text: d ? `${d[3]}/${d[2]}/${d[1]}` : c.nome }), h('td', { text: (c.tam / 1048576).toFixed(1) + ' MB' }),
        h('td', {}, h('button', { class: 'btn sm warn', text: 'Restaurar esta', onclick: async () => restore(await window.educstat.lerCopia(c.nome)) }))); })))) : h('p', { class: 'note', text: 'Ainda não há cópias automáticas.' }));
}
function cartaoRecuperar(info) {
  const passo = (t, p) => h('div', { class: 'passo' }, h('div', {}, h('b', { text: t }), h('p', { text: p })));
  return h('div', { class: 'card' }, h('h2', { text: 'Se alguma coisa correr mal: como recuperar os dados' }),
    h('div', { class: 'passos' },
      passo('Faltou a corrente ou o computador desligou-se', 'Não precisa de fazer nada. Cada alteração é gravada no disco em menos de um segundo, com a versão anterior guardada ao lado (ficheiro .anterior). Ao abrir de novo, o programa usa a última versão boa. O que ainda não tinha sido enviado continua marcado e segue na próxima sincronização.'),
      passo('Um mapa ficou mal ou foi apagado por engano', 'Abra o mapa em Introdução de Dados e use “Desfazer” enquanto não sair. Se já saiu, restaure a cópia automática do dia anterior (tabela acima) e volte a introduzir só o que fez depois disso.'),
      passo('O programa não abre ou mostra os dados vazios', `Feche o programa. Abra a pasta ${info.pasta} e confirme que lá estão as pastas fichas e alfa. Se estiverem vazias, copie para lá o conteúdo de uma cópia de segurança (ou restaure uma cópia, depois de abrir).`),
      passo('O computador avariou ou foi roubado', 'Instale o EducStat noutro computador, entre com a mesma conta e: (a) entre no servidor em Administração > Sincronização e carregue em Sincronizar, para receber de volta tudo o que já tinha sido enviado; ou (b) peça à DPE um pacote do seu distrito e importe-o. Depois disso, peça à DPE para mudar a senha da conta do servidor antiga.'),
      passo('Trabalho sem internet durante dias', 'Pode trabalhar à vontade: tudo fica gravado neste computador. Quando houver rede, a sincronização envia sozinha o que mudou. Se não houver rede durante muito tempo, exporte um pacote (Administração > Sincronização) e envie-o à DPE por pen ou e-mail.'),
      passo('Antes de grandes mudanças', 'Antes de importar uma base Access, restaurar uma cópia ou mudar a pasta de dados, faça “Fazer cópia de segurança” e guarde o ficheiro numa pen.')));
}

// ---------------- visita guiada (depois de entrar pela primeira vez, e a pedido) ----------------
const TOUR = [
  ['#hamb', 'Menu', 'Este botão recolhe ou mostra o menu da esquerda. Recolhido, ficam só os ícones e ganha espaço para as tabelas.'],
  ['nav.side a[data-r="inicio"]', 'Início', 'O resumo do ano: quantas escolas já têm mapa, o que falta introduzir e os avisos mais importantes.'],
  ['nav.side a[data-r="lancar"]', 'Introdução de Dados', 'Aqui introduz os mapas das escolas (3 de Março e fim do ano), mapa a mapa como no papel. Os erros de coerência aparecem enquanto escreve. Pode ver os outros distritos, mas só altera o seu.'],
  ['nav.side a[data-r="escolas"]', 'Escolas', 'A lista das escolas com código, tipo, localização e níveis. Só a DPE cria escolas novas.'],
  ['nav.side a[data-r="alfa"]', 'Alfabetização', 'Mapas dos centros de alfabetização e EPJA, com painel e Excel próprios.'],
  ['nav.side a[data-r="painel"]', 'Painel', 'Todos os indicadores (cobertura, eficácia, professores, salas, equidade) do seu distrito, da província e dos outros distritos, com gráficos ao longo dos anos.'],
  ['nav.side a[data-r="explorar"]', 'Explorar', 'Abre qualquer base Access e soma os mapas como quiser (por escola, classe, idade, motivo…).'],
  ['nav.side a[data-r="publicacoes"]', 'Publicações', 'Gera a brochura estatística (levantamento, aproveitamento ou os dois), a carta escolar e a retroalimentação às escolas, em Word e PDF.'],
  ['nav.side a[data-r="excel"]', 'Excel', 'Ficheiros de introdução para trabalhar sem o programa e livros de indicadores com gráficos.'],
  ['nav.side a[data-r="mensagens"]', 'Mensagens', 'Converse com a DPE e com os outros SDEJT. O número vermelho mostra as mensagens por ler.'],
  ['#ib-online', 'Quem está online', 'Veja quem está ligado agora em toda a província. Clique numa pessoa para lhe escrever.'],
  ['nav.side a[data-r="admin"]', 'Administração', 'Utilizadores, prazos, sincronização, cópias de segurança e configurações.'],
  ['#side-pe', 'Estado da sincronização', 'Mostra se este computador está ligado ao servidor e quando sincronizou pela última vez. Sem rede, guarda tudo e envia depois sozinho.'],
  ['#who', 'A sua conta', 'Mudar a palavra-passe, o tema, os parâmetros, repetir esta visita, sair da sessão ou fechar o programa.'],
];
function iniciarTour(forcar) {
  const chave = 'tourVisto_' + (S.sessao?.utilizador || '');
  try { if (!forcar && localStorage.getItem(chave)) return; } catch {}
  const passos = TOUR.filter(([sel]) => { const e = document.querySelector(sel); return e && !e.hidden && e.getClientRects().length; });
  if (!passos.length) return;
  let i = 0; const foco = h('div', { class: 'tour-foco' }); const caixa = h('div', { class: 'tour-caixa', role: 'dialog', 'aria-live': 'polite' });
  const fim = () => { foco.remove(); caixa.remove(); document.removeEventListener('keydown', tecla); try { localStorage.setItem(chave, '1'); } catch {} };
  const tecla = (e) => { if (e.key === 'Escape') fim(); if (e.key === 'ArrowRight') mostrar(i + 1); if (e.key === 'ArrowLeft') mostrar(i - 1); };
  const mostrar = (n) => {
    if (n < 0) return; if (n >= passos.length) { fim(); return; } i = n;
    const [sel, t, txt] = passos[i]; const el = document.querySelector(sel);
    if (document.body.classList.contains('nav-mini') && sel.startsWith('nav.side')) { /* com o menu recolhido, aponta para o ícone */ }
    el.scrollIntoView({ block: 'nearest' });
    const r = el.getBoundingClientRect(); const pad = 6;
    Object.assign(foco.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    caixa.replaceChildren(h('div', { class: 'pt' }, passos.map((_, k) => h('i', { class: k === i ? 'on' : '' }))), h('h3', { text: t }), h('p', { text: txt }),
      h('div', { class: 'row between' }, h('button', { class: 'btn sm', text: 'Saltar a visita', onclick: fim }), h('div', { class: 'row' }, i ? h('button', { class: 'btn sm', text: '← Anterior', onclick: () => mostrar(i - 1) }) : null,
        h('button', { class: 'btn sm primary', text: i === passos.length - 1 ? 'Terminar' : 'Seguinte →', onclick: () => mostrar(i + 1) }))));
    const cw = Math.min(384, window.innerWidth - 32); let x = r.right + 16, y = r.top;
    if (x + cw > window.innerWidth - 16) { x = Math.max(16, r.left - cw - 16); }
    if (x < 16 || (r.left < 300 && r.right + cw + 16 > window.innerWidth)) { x = Math.min(window.innerWidth - cw - 16, Math.max(16, r.left)); y = r.bottom + 14; }
    caixa.style.left = x + 'px'; caixa.style.top = Math.min(y, window.innerHeight - 230) + 'px';
  };
  document.body.append(foco, caixa); document.addEventListener('keydown', tecla); mostrar(0);
}

// ---------------- prazos vistos por um SDEJT: cartões claros em vez de datas soltas ----------------
const dataPT = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
const diasAte = (iso) => { if (!iso) return null; const a = new Date(new Date().toISOString().slice(0, 10)), b = new Date(iso); return Math.round((b - a) / 864e5); };
async function prazosDistrito(body, st, anoSel) {
  const d = +(S.inst?.dist || S.sessao?.dist); const nome = distName(d);
  const QUE = { marco: 'Mapas das escolas · 3 de Março', fim: 'Mapas das escolas · fim do ano (aproveitamento)', alfa_marco: 'Alfabetização · levantamento de Abril', alfa_fim: 'Alfabetização · aproveitamento de Dezembro' };
  const cards = [];
  for (const [k] of LEV_TRANCA) {
    const e = estadoTranca(st.ano, k, d); const prazo = S.trancas[`${st.ano}_${k}`]?.prazo || null; const dias = diasAte(prazo);
    let cls = '', est = 'Aberto para introduzir e corrigir', det = prazo ? (dias > 0 ? `Prazo: ${dataPT(prazo)} · faltam ${dias} dia${dias === 1 ? '' : 's'}` : dias === 0 ? `Prazo: hoje (${dataPT(prazo)})` : `Prazo: ${dataPT(prazo)}`) : 'Sem prazo definido pela DPE';
    if (e.estado === 'aberto' && dias != null && dias >= 0 && dias <= 7) cls = 'quase';
    const lm = limiteAuto(st.ano, k); const hojeI = new Date().toISOString().slice(0, 10);
    if (lm && e.estado === 'aberto') { if (motivoTranca(st.ano, k, d)) { cls = 'fechado'; est = 'Fechado: passaram 3 meses do levantamento'; } det += ` · Fecha sozinho em ${dataPT(lm.dist)}`; }
    if (e.estado === 'trancado') { cls = 'fechado'; est = e.porPrazo ? 'Fechado: o prazo terminou' : 'Trancado pela DPE'; det = (prazo ? `Prazo: ${dataPT(prazo)}. ` : '') + 'Para corrigir alguma coisa, peça à DPE que reabra (pode usar as Mensagens).'; }
    if (e.estado === 'harmonizado') { cls = 'harm'; est = 'Harmonizado e confirmado pela DPE'; det = `Confirmado em ${e.em ? dataPT(e.em) : '—'}. Estes passam a ser os números oficiais do distrito.`; }
    let comp = null;
    if (e.estado === 'harmonizado' && e.resumo) { const meu = await resumoParaHarmonizar(st.ano, k, d); const igual = Object.keys(e.resumo).every((x) => +e.resumo[x] === +meu[x]); comp = h('span', { class: 'pill ' + (igual ? 'ok' : 'bad'), text: igual ? 'Os dados deste computador são iguais aos da DPE' : 'Diferentes dos da DPE: sincronize' }); }
    cards.push(h('div', { class: 'prazo ' + cls }, h('span', { class: 'q', text: QUE[k] }), h('span', { class: 'e', text: est }), h('span', { class: 'd', text: det }),
      e.estado === 'harmonizado' && e.resumo ? h('small', { class: 'note', text: Object.entries(e.resumo).map(([a, b]) => `${a}: ${NF.format(b)}`).join(' · ') }) : null, comp));
  }
  const pub = S.publicacao?.anos?.[st.ano];
  body.append(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('div', {}, h('h2', { text: `Estado dos dados de ${nome} em ${st.ano}` }), h('p', { class: 'note', text: 'Os prazos e a harmonização são definidos pela DPE. Datas em dia/mês/ano.' })), h('label', { class: 'f' }, 'Ano', anoSel)),
    h('div', { class: 'prazo-card' }, cards),
    h('div', { class: 'prazo ' + (pub ? 'harm' : ''), style: 'margin-top:4px' }, h('span', { class: 'q', text: 'Consulta dos outros distritos' }),
      h('span', { class: 'e', text: pub ? `Publicado pela DPE em ${dataPT(pub.em)}` : 'Ainda não publicado' }),
      h('span', { class: 'd', text: pub ? `Pode ver (sem alterar) os dados de ${st.ano} de todos os distritos no Painel, em Introdução de Dados e nas Publicações.` : `Quando a DPE confirmar a harmonização de todos os distritos e publicar ${st.ano}, passa a ver os dados dos outros distritos para comparar. Até lá vê os anos já fechados (até ${ANO_FECHADO}) e os anos publicados.` }))));
}

// ---------------- Lançar: desfazer gravações (a ficha grava-se sozinha 2,5 s depois de cada alteração) ----------------
async function desfazerFicha() {
  const d = S.draft; if (!d) return; const hk = d.ano + '_' + d.esc; const hist = S.histFicha?.[hk]; if (!hist?.length) return;
  if (S.dirty && !(await confirmBox('Há alterações ainda não gravadas. Desfazer a última gravação e perdê-las?', 'Desfazer'))) return;
  clearTimeout(S.tAuto);
  const prev = hist.pop(); const em = new Date().toISOString();
  const out = prev ? { ...clone(prev), em, por: S.me?.id || null } : { ano: d.ano, esc: d.esc, dist: d.dist, sis: d.sis, marco: {}, fim: {}, apagada: true, em, por: S.me?.id || null };
  await S.db.doc(`fichas/${d.ano}_${d.esc}`).set(out);
  const k = d.ano + '_' + d.dist; const m = S.dbFichas.get(k) || new Map(); m.set(d.esc, out); S.dbFichas.set(k, m);
  await recalcResumo(d.ano, d.dist); await registar('mapa: gravação desfeita', { ano: d.ano, esc: d.esc });
  S.draft = prev ? clone(out) : { ano: d.ano, esc: d.esc, dist: d.dist, sis: d.sis, marco: {}, fim: {} }; delete S.draft.apagada;
  S.fichaBase = prev ? clone(out) : null; S.dirty = false; S.blockRows = {}; S.autoEstado = null;
  toast(prev ? 'Voltou à versão anterior do mapa.' : 'O mapa voltou a ficar vazio (como estava antes).'); drawLancar(); fillEsc();
}

// ---------------- publicações: capa, ficha técnica, rodapé ----------------
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const mesAnoPT = (d = new Date()) => `${MESES[d.getMonth()]} de ${d.getFullYear()}`;
function capaPub(prov, dist, tipo, ano) {
  const nome = prov ? '' : distName(dist);
  const gov = /^Cidade/i.test(nome) ? `Governo da ${nome}` : `Governo do Distrito de ${nome}`;
  const entidade = prov ? ['Província de Tete', 'Direcção Provincial da Educação'] : ['Província de Tete', gov, 'Serviço Distrital de Educação, Juventude e Tecnologia'];
  const lugarTxt = prov ? 'Província de Tete' : `Distrito de ${nome}`;
  const pub = { brochura: 'Estatísticas da Educação', carta: 'Carta Escolar', retro: 'Retroalimentação às Escolas' }[tipo] || 'Estatísticas da Educação';
  return { entidade, dataLocal: `${prov ? 'Tete' : nome}, ${mesAnoPT()}`, rodape: `${pub} · ${lugarTxt} · EducStat Tete`, anoTxt: String(ano), geo: { prov: !!prov, dist: +dist || 0, tipo } };
}
function fichaTecnicaPub(titulo, prov, dist, tipo, ano, versao) {
  const s = S.sessao || {}; const inst = prov ? 'Direcção Provincial da Educação de Tete' : `Serviço Distrital de Educação, Juventude e Tecnologia de ${distName(dist)}`;
  const contaGeral = /^sdejt_\d{4}$|^admin$/i.test(s.utilizador || '');
  return [['Título', titulo], ['Edição', `${mesAnoPT()} · dados de ${ano}`], ['Propriedade', inst],
    ['Elaboração', contaGeral ? (+s.dist ? `SDEJT de ${distName(s.dist)}` : 'Direcção Provincial da Educação de Tete — Repartição de Estatística') : `${s.nome || s.utilizador}${+s.dist ? ' — SDEJT de ' + distName(s.dist) : ' — DPE Tete'}`],
    ['Coordenação', prov ? 'Direcção Provincial da Educação de Tete' : `Direcção do SDEJT de ${distName(dist)}`],
    ['Fonte dos dados', 'Levantamentos estatísticos de 3 de Março e de fim do ano (aproveitamento), EducStat. Instituto Nacional de Estatística, projecções da população'],
    ['Produzido com', `EducStat Tete ${versao}`],
    ['Direitos', `© ${new Date().getFullYear()} ${inst}. É permitida a reprodução, total ou parcial, desde que citada a fonte.`]];
}
const CSS_PUB = `@page{size:A4;margin:14mm 15mm 19mm}body{font-family:'Public Sans','Segoe UI',Arial,sans-serif;color:#13221B;font-size:10.3pt;line-height:1.45;margin:0}
  .capa{height:262mm;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:6mm}
  .capa .ent{font-weight:700;letter-spacing:.04em;font-size:11.5pt;line-height:1.5}.capa .ent b{font-size:12.5pt}
  .capa .fio{width:100%;border-bottom:2.5px solid #0A6B45;margin:6mm 0 0}
  .capa h1{font-family:Georgia,serif;color:#0A6B45;font-size:28pt;margin:42mm 0 5mm;border:0;line-height:1.2}.capa .sub{font-size:13pt;color:#4A5A52;max-width:150mm}.capa .ano{font-size:18pt;color:#B07C00;font-weight:700;margin-top:10mm}
  .capa .data{margin-top:auto;font-weight:700;font-size:12pt;letter-spacing:.02em}
  .capa{position:relative;overflow:hidden}.capa h1.com-arte{margin-top:14mm}.capa .regua{width:28mm;height:2.2mm;border-radius:2mm;background:linear-gradient(90deg,#0A6B45 0 60%,#C98E00 60%);margin:0 auto 4mm}
  .capa .arte{margin:5mm 0 0;width:140mm}.capa .arte svg{width:100%;height:auto;display:block}
  .capa .ano{display:inline-block;background:#C98E00;color:#fff;border-radius:20mm;padding:1.6mm 8mm;letter-spacing:.06em}
  .capa .faixa{width:calc(100% + 30mm);margin:4mm -15mm -2mm}.capa .faixa svg{width:100%;height:auto;display:block}
  .p2 h2,.idx h2{font-size:13pt;color:#0A6B45;border-bottom:1.5px solid #C98E00;padding-bottom:2px;margin:6px 0 6px}
  .def{margin:3px 0 7px;padding-left:9px;border-left:3px solid #C98E00}.def b{color:#0A6B45}.lista{font-size:9.3pt}
  .kv{width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:10px}.kv td{border:0;border-bottom:1px solid #E6ECE8;padding:4px 6px;text-align:left;background:none!important;vertical-align:top}.kv td:first-child{width:30%;font-weight:700;color:#0A6B45}
  h1{font-family:Georgia,serif;color:#0A6B45;font-size:16pt;border-bottom:2px solid #C98E00;padding-bottom:2px;margin:16px 0 6px;page-break-after:avoid;break-after:avoid}h2{color:#9A6C00;font-size:12pt;margin:12px 0 5px;page-break-after:avoid;break-after:avoid}
  p{text-align:justify;margin:0 0 7px;orphans:3;widows:3}.tt{font-weight:700;color:#0A6B45;font-size:9.3pt;margin:10px 0 3px;page-break-after:avoid;break-after:avoid}.fonte{font-size:7.8pt;color:#4A5A52;font-style:italic;margin:2px 0 8px}
  .blk{page-break-inside:avoid;break-inside:avoid}.blk.longa{page-break-inside:auto;break-inside:auto}
  table{border-collapse:collapse;width:100%;font-size:8.4pt}th{background:#0A6B45;color:#fff;padding:3px 5px;text-align:center;border:1px solid #0A6B45}th:first-child{text-align:left}thead{display:table-header-group}tr{page-break-inside:avoid}
  td{border:1px solid #D5DED8;padding:2px 5px;text-align:right}td:first-child{text-align:left}tr:nth-child(even) td{background:#F4F7F5}tr.tot td{font-weight:700;background:#E7F1EA}tr.sec td{font-weight:700;color:#0A6B45;background:#E7F1EA;text-align:left}
  .fig svg{width:100%;height:auto;display:block}.quebra{page-break-after:always}.indice{columns:1;font-size:10pt}.indice li{margin:2px 0}
  @media screen{body{background:#E9EEEA;padding:16px 0}.folha{background:#fff;width:180mm;margin:0 auto 14px;padding:14mm 15mm 10mm;box-shadow:0 6px 24px -12px rgba(0,0,0,.35)}.capa{height:auto;min-height:250mm}
    .rodape-demo{margin-top:12px;border-top:1px solid #0A6B45;padding-top:4px;font:7.5pt Arial;color:#4A5A52;display:flex;gap:6px;align-items:center}.rodape-demo img{height:12px}}
  @media print{.rodape-demo{display:none}.folha{padding:0;margin:0}}`;
function htmlCapa(doc) {
  const arte = arteCapa(doc.geo);
  return `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><style>${CSS_PUB}</style></head><body><div class="capa">${S.emblemaURL ? `<img src="${S.emblemaURL}" alt="" style="width:30mm;height:auto;margin-bottom:5mm">` : ''}
    <div class="ent"><b>REPÚBLICA DE MOÇAMBIQUE</b><br>${doc.entidade.map((e) => esc_(String(e).toUpperCase())).join('<br>')}</div><div class="fio"></div>
    <h1${arte.mapa ? ' class="com-arte"' : ''}>${esc_(doc.titulo)}</h1><div class="regua"></div><div class="sub">${esc_(doc.subtitulo || '')}</div>${arte.mapa ? `<div class="arte">${arte.mapa}</div>` : ''}<div class="ano">${esc_(doc.anoTxt || '')}</div><div class="data">${esc_(doc.dataLocal)}</div>${arte.faixa ? `<div class="faixa">${arte.faixa}</div>` : ''}</div></body></html>`;
}
function htmlPublicacao(doc, paraPdf) {
  const linhaT = (l, n) => (l.sec ? `<tr class="sec"><td colspan="${n}">${esc_(l.sec)}</td></tr>` : `<tr class="${/^(Total|Província|Média)/.test(String(l[0])) ? 'tot' : ''}">${l.map((c) => `<td>${esc_(c)}</td>`).join('')}</tr>`);
  const corpo = doc.blocos.map((b) => b.t === 'h1' ? `<h1>${esc_(b.texto)}</h1>` : b.t === 'h2' ? `<h2>${esc_(b.texto)}</h2>` : b.t === 'p' ? (b.termo ? `<p class="def"><b>${esc_(b.termo)}</b> — ${esc_(b.texto)}</p>` : `<p>${esc_(b.texto)}</p>`) : b.t === 'quebra' ? '<div class="quebra"></div>'
    : b.t === 'tabela' ? `<div class="blk${b.linhas.length > 18 ? ' longa' : ''}"><div class="tt">${esc_(b.titulo)}</div><table><thead><tr>${b.cab.map((c) => `<th>${esc_(c)}</th>`).join('')}</tr></thead><tbody>${b.linhas.map((l) => linhaT(l, b.cab.length)).join('')}</tbody></table>${b.fonte ? `<div class="fonte">Fonte: ${esc_(b.fonte)}</div>` : ''}</div>`
    : `<div class="blk fig"><div class="tt">${esc_(b.titulo)}</div>${b.svg}${b.fonte ? `<div class="fonte">Fonte: ${esc_(b.fonte)}</div>` : ''}</div>`).join('\n');
  const indice = doc.blocos.filter((b) => b.t === 'h1').map((b) => `<li>${esc_(b.texto)}</li>`).join('');
  const kv = (rows) => `<table class="kv">${rows.map(([k, v]) => `<tr><td>${esc_(k)}</td><td>${esc_(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`;
  const listas = (doc.listaMapas?.length ? `<h2>Índice das Ilustrações (Lista de Mapas)</h2><ol class="indice lista">${doc.listaMapas.map((t) => `<li>${esc_(t)}</li>`).join('')}</ol>` : '') + (doc.listaGraficos?.length ? `<h2>Índice de Gráficos</h2><ol class="indice lista">${doc.listaGraficos.map((t) => `<li>${esc_(t)}</li>`).join('')}</ol>` : '');
  const rod = `<div class="rodape-demo">${S.emblemaURL ? `<img src="${S.emblemaURL}" alt="">` : ''}<span style="flex:1">${esc_(doc.rodape || '')}</span><span>Página n de N</span></div>`;
  const capaIn = htmlCapa(doc).replace(/^[\s\S]*<body>/, '').replace(/<\/body><\/html>$/, '');
  const f = (x, comRod = true) => (paraPdf ? x : `<div class="folha">${x}${comRod ? rod : ''}</div>`);
  return `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><title>${esc_(doc.titulo)}</title><meta name="author" content="Alberto Adélia Manhice"><meta name="description" content="${esc_(doc.subtitulo || '')}"><style>${CSS_PUB}</style></head><body>
  ${f(capaIn, false)}<div class="quebra"></div>
  ${f(`<div class="p2">${doc.fichaTecnica?.length ? `<h2>Ficha técnica</h2>${kv(doc.fichaTecnica)}` : ''}${doc.notaTecnica?.length ? `<h2>Nota técnica</h2>${kv(doc.notaTecnica)}` : ''}</div>`)}<div class="quebra"></div>
  ${f(`<div class="idx"><h2>Índice</h2><ol class="indice">${indice}</ol></div>`)}<div class="quebra"></div>
  ${listas ? f(`<div class="idx">${listas}</div>`) + '<div class="quebra"></div>' : ''}
  ${f(corpo)}</body></html>`;
}

// ---------------- limites (shapefiles): reconhecer todos os distritos, mesmo com nomes diferentes (ex.: “Zumbu”) ----------------
const normGeo = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/^(distrito|cidade|municipio|vila)( de| da| do)? /, '').replace(/[^a-z]/g, '');
const ALIAS_GEO = { zumbu: 'zumbo', zumb: 'zumbo', cahorabassa: 'cahorabassa', cahorabasa: 'cahorabassa', caborabassa: 'cahorabassa', songo: 'cahorabassa', tetecity: 'tete', tetecidade: 'tete', cidadetete: 'tete', magoe: 'magoe', mague: 'magoe', mutarara: 'mutarara', chiuta: 'chiuta', chifunde: 'chifunde', macanga: 'macanga', maravia: 'maravia', angonia: 'angonia', tsangano: 'tsangano', moatize: 'moatize', changara: 'changara', doa: 'doa', marara: 'marara' };
function lev(a, b) { const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9; const d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
function distDeNome(v) {
  let k = normGeo(v); if (!k) return null; k = ALIAS_GEO[k] || k;
  const L = S.cod.distritosTodos.map(([d, n]) => [d, normGeo(n)]);
  const ex = L.find(([, n]) => n === k); if (ex) return ex[0];
  if (k.length >= 5) { const c = L.map(([d, n]) => [d, lev(k, n)]).sort((a, b) => a[1] - b[1]); if (c[0][1] <= 1 && (c.length < 2 || c[1][1] > 1)) return c[0][0]; }
  return null;
}
function codDistritoGeo(ft, campo) {
  const p = ft.properties || {};
  if (p.__cod) return +p.__cod;
  if (campo && p[campo] != null) { const v = p[campo]; if (S.cod.distritosTodos.some((d) => d[0] === +v)) return +v; const d = distDeNome(v); if (d) return d; }
  const cand = [p.cDist, p.CdDistEd, p.cod, p.codigo, p.COD_DIST, p.DistrictId].find((x) => x != null);
  if (cand && S.cod.distritosTodos.some((d) => d[0] === +cand)) return +cand;
  for (const k of ['nDist', 'NAME_2', 'shapeName', 'Distrito', 'DISTRITO', 'name', 'NOME', 'ADM2_PT', 'ADM2_EN', 'admin2Name']) if (p[k] != null) { const d = distDeNome(p[k]); if (d) return d; }
  return null;
}
// o d3 desenha os polígonos pela orientação dos anéis: um anel ao contrário cobre o mundo inteiro e o distrito “desaparece”
function rebobinar(ft) {
  const d3 = window.d3; const g = ft.geometry; if (!g || !d3) return ft;
  const inv = (pl) => pl.map((r) => [...r].reverse());
  const ok = (pl) => d3.geoArea({ type: 'Polygon', coordinates: pl }) <= 2 * Math.PI;
  if (g.type === 'Polygon' && !ok(g.coordinates)) g.coordinates = inv(g.coordinates);
  if (g.type === 'MultiPolygon') g.coordinates = g.coordinates.map((pl) => (ok(pl) ? pl : inv(pl)));
  return ft;
}
const NA_TETE = (ft) => { try { const [x, y] = window.d3.geoCentroid(ft); return x > 29.8 && x < 35.6 && y > -18.2 && y < -13.6; } catch { return false; } };
const rotuloGeo = (ft) => { const p = ft.properties || {}; for (const k of ['nDist', 'NAME_2', 'ADM2_PT', 'shapeName', 'Distrito', 'DISTRITO', 'name', 'NOME', 'NAME', 'Nome']) if (p[k]) return String(p[k]); const v = Object.values(p).find((x) => typeof x === 'string' && /[a-z]/i.test(x)); return v || '(sem nome)'; };
async function guardarLimites(nivel, fc, info, campos, semIr) {
  const d3 = window.d3;
  for (const f of fc.features) rebobinar(f);
  if (nivel === 'distritos') {
    // 1) só as áreas da província de Tete: pelo campo da província (se existir) e pela posição
    const campoProv = Object.keys(fc.features[0]?.properties || {}).find((k) => /^(prov|provincia|province|adm1|adm1_?pt|adm1_?en|name_1|admin1name|nprov|provname)$/i.test(k));
    let tete = fc.features.filter((f) => NA_TETE(f));
    if (campoProv) { const t2 = fc.features.filter((f) => normGeo(f.properties[campoProv]) === 'tete' || String(f.properties[campoProv]).replace(/\D/g, '') === '05'); if (t2.length) tete = t2; }
    // 2) cada distrito procura a sua área: código, nome exacto (sem acentos), nome alternativo; o nome parecido só entre as áreas de Tete
    const cands = [null, ...(campos || Object.keys(fc.features[0]?.properties || {}))];
    let melhor = null, mN = -1; for (const c of cands) { const n = new Set(tete.map((f) => codDistritoGeo(f, c)).filter(Boolean)).size; if (n > mN) { mN = n; melhor = c; } }
    const porDist = new Map(); const sobra = [];
    for (const f of tete) { const c = codDistritoGeo(f, melhor); if (c) (porDist.get(c) || porDist.set(c, []).get(c)).push(f); else sobra.push(f); }
    // várias partes do mesmo distrito juntam-se numa só área
    const ok = [...porDist.entries()].map(([c, fs]) => fs.length === 1 ? { ...fs[0], properties: { ...fs[0].properties, __cod: c } }
      : { type: 'Feature', properties: { ...fs[0].properties, __cod: c }, geometry: { type: 'MultiPolygon', coordinates: fs.flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)) } });
    if (!ok.length && !sobra.length) { toast('Nenhuma área corresponde a um distrito de Tete (verifique os nomes ou códigos).', 7000); return; }
    S.limites = { type: 'FeatureCollection', features: ok }; S.limitesCampo = melhor; S.limitesInfo = info; S.limitesSobra = sobra.map((f) => ({ ...f, properties: { ...f.properties, __rot: rotuloGeo(f) } }));
    await S.db.doc('config/limites').set({ geojson: JSON.stringify(S.limites), campo: melhor, info, sobra: JSON.stringify(S.limitesSobra) });
    await registar('limites dos distritos carregados', { n: ok.length });
    const falta = S.cod.distritosTodos.filter(([d]) => !porDist.has(d)).map((x) => x[1]);
    toast(`${S.cod.distritosTodos.length - falta.length} de ${S.cod.distritosTodos.length} distritos de Tete reconhecidos (${tete.length} áreas da província no ficheiro)${falta.length ? `. Sem área: ${falta.join(', ')} — associe-os à mão na lista abaixo.` : '.'}`, 9000);
  } else {
    if (!S.limites) { toast('Carregue primeiro os limites dos distritos: servem para ficar só com os postos e localidades de Tete.', 7000); return; }
    const props = Object.keys(fc.features[0]?.properties || {});
    const nomeCampo = (nivel === 'localidades' ? props.find((k) => /^(localidade|n?local|nm_?local|adm4_?pt|name_4|adm4_?en|nome)$/i.test(k)) : props.find((k) => /^(n?posto|posto_?adm|nm_?posto|adm3_?pt|name_3|adm3_?en|nome)$/i.test(k)))
      || props.find((k) => /^(nome|name)$/i.test(k)) || props[0];
    const ok = fc.features.filter((p) => { try { const c = d3.geoCentroid(p); return S.limites.features.some((f) => d3.geoContains(f, c)); } catch { return false; } }).map((p) => ({ type: 'Feature', geometry: p.geometry, properties: { __nome: String(p.properties?.[nomeCampo] ?? ''), ...p.properties } }));
    if (!ok.length) { toast('Nenhuma área fica dentro dos distritos de Tete.', 6000); return; }
    const fc2 = { type: 'FeatureCollection', features: ok };
    if (nivel === 'postos') { S.limitesPostos = fc2; await S.db.doc('config/limitesPostos').set({ geojson: JSON.stringify(fc2), info }); }
    else { S.limitesLocalidades = fc2; await S.db.doc('config/limitesLocalidades').set({ geojson: JSON.stringify(fc2), info }); }
    await registar(`limites (${nivel}) carregados`, { n: ok.length }); toast(`${ok.length} áreas de ${nivel} dentro da província de Tete.`, 6000);
  }
  await marcarFicheiroBase('limites_' + nivel, { ficheiro: String(info || '').split(' (')[0], n: (fc.features || []).length }); if (!semIr) go(current);
}
// quadro de correspondência: cada distrito e a área do shapefile que o representa; os que faltam associam-se à mão
function cartaoCorrespondencia() {
  if (!S.limites) return null;
  const sobra = S.limitesSobra || [];
  const todas = [...S.limites.features, ...sobra];
  const linhas = S.cod.distritosTodos.map(([d, n]) => {
    const ft = S.limites.features.find((f) => codDistritoGeo(f, S.limitesCampo) === d);
    const sel = h('select', {}, h('option', { value: '', text: ft ? `${rotuloGeo(ft)} (reconhecido)` : '— sem área —' }), ft ? h('option', { value: '-1', text: '— retirar esta área —' }) : null,
      todas.map((f, i) => (f === ft ? null : h('option', { value: i, text: `${f.properties.__rot || rotuloGeo(f)}${f.properties.__cod ? ' (agora: ' + distName(f.properties.__cod) + ')' : ''}` }))));
    sel.onchange = async () => {
      if (sel.value === '') return;
      if (sel.value === '-1') { ft.properties.__cod = null; S.limites.features = S.limites.features.filter((x) => x !== ft); S.limitesSobra = [...(S.limitesSobra || []), ft]; await S.db.doc('config/limites').set({ geojson: JSON.stringify(S.limites), campo: S.limitesCampo, info: S.limitesInfo, sobra: JSON.stringify(S.limitesSobra) }); toast(`${n} ficou sem área.`); go(current); return; }
      const f = todas[+sel.value];
      for (const x of S.limites.features) if (+x.properties.__cod === d) x.properties.__cod = null;
      f.properties.__cod = d; if (!S.limites.features.includes(f)) S.limites.features.push(f);
      S.limites.features = S.limites.features.filter((x) => x.properties.__cod); S.limitesSobra = todas.filter((x) => !S.limites.features.includes(x));
      await S.db.doc('config/limites').set({ geojson: JSON.stringify(S.limites), campo: S.limitesCampo, info: S.limitesInfo, sobra: JSON.stringify(S.limitesSobra) });
      await registar('limites: distrito associado à mão', { alvo: n }); toast(`${n} associado à área “${rotuloGeo(f)}”.`); go(current);
    };
    return h('tr', {}, h('td', { class: 'l', text: n }), h('td', { class: 'l' }, h('span', { class: 'pill ' + (ft ? 'ok' : 'bad'), text: ft ? 'Com área' : 'Sem área' })), h('td', { class: 'l' }, sel));
  });
  return h('div', { style: 'display:flex;flex-direction:column;gap:6px' }, h('strong', { text: 'Correspondência entre distritos e áreas do shapefile' }),
    h('p', { class: 'note', text: 'Se um distrito aparecer “Sem área” (por exemplo quando o shapefile escreve o nome de outra maneira, ou é anterior à criação de Dôa e Marara), escolha à mão a área que lhe corresponde.' }),
    h('div', { class: 'tw', style: 'max-height:360px' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { class: 'l', text: 'Distrito' }), h('th', { class: 'l', text: 'Estado' }), h('th', { class: 'l', text: 'Área no shapefile' }))), h('tbody', {}, linhas))));
}

// ---------------- Excel com gráficos nativos e fórmulas (o técnico corrige um número e tudo se recalcula) ----------------
const colL = (c) => { let s = ''; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
const refF = (folha, c1, r1, c2, r2) => `'${folha.replace(/'/g, "''")}'!$${colL(c1)}$${r1 + 1}${c2 == null ? '' : `:$${colL(c2)}$${r2 + 1}`}`;
async function guardarXlsx(wb, nome, graficos) {
  let buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  if (graficos?.length && window.educstat?.xlsxGraficos) { try { buf = await window.educstat.xlsxGraficos(buf, graficos); } catch (e) { console.warn('gráficos excel', e); } }
  return S.downloads.save({ filename: nome, data: new Blob([buf]) });
}
// base de cada ano: contagens que alimentam as fórmulas
function baseAno(a, f, nv) {
  const x = sumUp(a, { ...f, nivel: nv, sexo: 'Ambos' }); if (!x) return null;
  const T = x.T; const s = (k) => T[k][0] + T[k][1]; const c1 = x.byCl[1];
  const sis = sisDe(a), n2 = nv === 'Todos' || nv === 'ETP' ? 'EP' : nv; const rg = window.EAgg.RANGE[sis][n2];
  return { HM: s('Matric'), M: T.Matric[1], IdOf: s('IdOf'), Rep: s('Rep'), Novos: c1 ? c1.Matric[0] + c1.Matric[1] - c1.Rep[0] - c1.Rep[1] : null, Prof: s('Prof'), ProfM: T.Prof[1], ProfF: s('ProfForm'), Turmas: T.Turmas, Fim: s('Fim') || null, Aprov: s('Fim') ? s('Aprov') : null, MatricFim: s('Fim') ? s('MatricFim') : null, Desist: s('Fim') ? s('Desist') : null, Escolas: T.Escolas, PopN: popSoma(a, f.dist, rg[0], rg[1], 'Ambos'), Pop6: popSoma(a, f.dist, 6, 6, 'Ambos') };
}
const BASE_L = [['HM', 'Alunos matriculados (HM)'], ['M', 'Alunas (M)'], ['IdOf', 'Alunos em idade oficial do nível'], ['Rep', 'Repetentes'], ['Novos', 'Novos ingressos na 1ª classe'], ['Prof', 'Professores'], ['ProfM', 'Professoras'], ['ProfF', 'Professores com formação psicopedagógica'], ['Turmas', 'Turmas'], ['Escolas', 'Escolas com alunos'], ['Fim', 'Alunos no fim do ano'], ['Aprov', 'Aprovados'], ['MatricFim', 'Matriculados (escolas com fim do ano introduzido)'], ['Desist', 'Desistentes'], ['PopN', 'População em idade oficial do nível (INE)'], ['Pop6', 'População de 6 anos (INE)']];
// indicador: [nome, fórmula com {chave}, formato, cálculo em JS]
const IND_L = [['% de raparigas', '{M}/{HM}', '0.0%', (b) => b.M / b.HM], ['Taxa bruta de escolarização', '{HM}/{PopN}', '0.0%', (b) => b.HM / b.PopN], ['Taxa líquida de escolarização', '{IdOf}/{PopN}', '0.0%', (b) => b.IdOf / b.PopN],
  ['Taxa bruta de admissão (1ª classe)', '{Novos}/{Pop6}', '0.0%', (b) => b.Novos / b.Pop6], ['Taxa de repetência', '{Rep}/{HM}', '0.0%', (b) => b.Rep / b.HM], ['Rácio alunos por professor', '{HM}/{Prof}', '0.0', (b) => b.HM / b.Prof],
  ['Rácio alunos por turma', '{HM}/{Turmas}', '0.0', (b) => b.HM / b.Turmas], ['% de professores com formação', '{ProfF}/{Prof}', '0.0%', (b) => b.ProfF / b.Prof], ['% de professoras', '{ProfM}/{Prof}', '0.0%', (b) => b.ProfM / b.Prof],
  ['Taxa de aprovação (aproveitamento pedagógico)', '{Aprov}/{Fim}', '0.0%', (b) => b.Aprov / b.Fim], ['Taxa de aproveitamento escolar', '{Aprov}/{MatricFim}', '0.0%', (b) => b.Aprov / b.MatricFim], ['Taxa de reprovação', '({Fim}-{Aprov})/{Fim}', '0.0%', (b) => (b.Fim - b.Aprov) / b.Fim],
  ['Taxa de desistência', '{Desist}/{MatricFim}', '0.0%', (b) => b.Desist / b.MatricFim], ['Paridade de género (IPG)', '{M}/({HM}-{M})', '0.00', (b) => b.M / (b.HM - b.M)]];
const okNum = (v) => (v == null || !Number.isFinite(v) ? null : v);
// folha com dados de base (editáveis) e indicadores (fórmulas); devolve as posições para os gráficos
function folhaIndicadores(nomeF, titulo, colunas, bases) {
  const aoa = [[titulo], ['Dados de base: pode corrigir os números (letra azul) e os indicadores e gráficos recalculam-se sozinhos.'], [], ['Dados de base', ...colunas]];
  const linhaDe = {};
  for (const [k, l] of BASE_L) { linhaDe[k] = aoa.length; aoa.push([l, ...bases.map((b) => (b && b[k] != null ? b[k] : null))]); }
  aoa.push([]); const cabI = aoa.length; aoa.push(['Indicadores (calculados)', ...colunas]);
  const linhaInd = [];
  for (const [l] of IND_L) { linhaInd.push(aoa.length); aoa.push([l, ...colunas.map(() => null)]); }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const azul = { font: { name: 'Arial', sz: 10, color: { rgb: '1F4E9A' } } };
  for (const k in linhaDe) for (let c = 1; c <= colunas.length; c++) { const cell = ws[XLSX.utils.encode_cell({ r: linhaDe[k], c })]; if (cell) { cell.s = azul; cell.z = '#,##0'; } }
  IND_L.forEach(([, fx, z, js], i) => {
    for (let c = 1; c <= colunas.length; c++) {
      const L = colL(c); const f = fx.replace(/\{(\w+)\}/g, (_, k) => `${L}${linhaDe[k] + 1}`);
      const b = bases[c - 1]; let v = null; try { v = b ? okNum(js(b)) : null; } catch {}
      ws[XLSX.utils.encode_cell({ r: linhaInd[i], c })] = { t: v == null ? 's' : 'n', v: v == null ? '' : v, f: `IFERROR(${f},"")`, z };
    }
  });
  ws['!cols'] = [{ wch: 46 }, ...colunas.map(() => ({ wch: 11 }))];
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: colunas.length } });
  return { ws, linhaDe, linhaInd, cabI, ncol: colunas.length, aoaLen: aoa.length };
}
async function livroIndicadores() {
  const f = { ...S.pf }; const wb = XLSX.utils.book_new(); const graf = [];
  const anos = ANOS.filter((a) => S.cod.distritos.some((d) => resumoDe(a, d[0])));
  const lugar = f.dist === 'Todos' ? 'Província de Tete' : 'Distrito de ' + distName(f.dist);
  const anoK = anos.includes(+f.ano) ? +f.ano : anos[anos.length - 1];
  const NIV = [['Todos', 'Todos os níveis'], ['EP', 'Ensino Primário'], ['ESG1', 'ESG 1º Ciclo'], ['ESG2', 'ESG 2º Ciclo']];
  // folha Painel (primeiro, preenchida no fim)
  const posF = {};
  for (const [nv, nome] of NIV) {
    const bases = anos.map((a) => baseAno(a, f, nv));
    const fo = folhaIndicadores(nome, `${nome} — ${lugar} (tipo de escola: ${f.tipo === 'Todos' ? 'todos' : f.tipo})`, anos.map(String), bases);
    posF[nome] = fo; XLSX.utils.book_append_sheet(wb, fo.ws, nome);
    const cats = { ref: refF(nome, 1, 3, anos.length, 3), vals: anos.map(String) };
    const x0 = anos.length + 2; let y = 3;
    const G = (tipo, titulo, linhas, fmt) => { graf.push({ folha: nome, tipo, titulo, fmt, cats, series: linhas.map(([r, n, cor]) => ({ nome: n, ref: refF(nome, 1, r, anos.length, r), vals: anos.map((_, i) => { const c = fo.ws[XLSX.utils.encode_cell({ r, c: i + 1 })]; return c && c.t === 'n' ? c.v : null; }), cor })), de: [x0, y], ate: [x0 + 8, y + 15] }); y += 16; };
    G('barras', 'Alunos matriculados', [[fo.linhaDe.HM, 'Alunos (HM)', '0A6B45'], [fo.linhaDe.M, 'Alunas (M)', 'C98E00']], '#,##0');
    G('linha', 'Rácios alunos por professor e por turma', [[fo.linhaInd[5], 'Alunos por professor', '0A6B45'], [fo.linhaInd[6], 'Alunos por turma', 'C98E00']], '0.0');
    G('linha', 'Aprovação, reprovação e desistência', [[fo.linhaInd[9], 'Aprovação', '0A6B45'], [fo.linhaInd[11], 'Reprovação', 'C0172F'], [fo.linhaInd[12], 'Desistência', 'C98E00']], '0.0%');
    G('linha', 'Escolarização e repetência', [[fo.linhaInd[1], 'Taxa bruta de escolarização', '0A6B45'], [fo.linhaInd[2], 'Taxa líquida de escolarização', '2E6F8E'], [fo.linhaInd[4], 'Repetência', 'C0172F']], '0.0%');
  }
  // distritos no ano escolhido
  const dists = S.cod.distritos.filter(([d]) => visivel(anoK, d));
  const basesD = dists.map(([d]) => baseAno(anoK, { ...f, dist: d }, 'Todos'));
  const foD = folhaIndicadores('Distritos', `Distritos em ${anoK} — todos os níveis (só aparecem os distritos com dados que pode consultar)`, dists.map((d) => d[1]), basesD);
  XLSX.utils.book_append_sheet(wb, foD.ws, 'Distritos');
  // os distritos ficam em colunas: os gráficos usam a linha de cada indicador
  const catsD = { ref: refF('Distritos', 1, 3, dists.length, 3), vals: dists.map((d) => d[1]) };
  const vD = (r) => dists.map((_, i) => { const c = foD.ws[XLSX.utils.encode_cell({ r, c: i + 1 })]; return c && c.t === 'n' ? c.v : null; });
  graf.push({ folha: 'Distritos', tipo: 'barras', titulo: `Rácio alunos por professor por distrito, ${anoK}`, fmt: '0.0', cats: catsD, series: [{ nome: 'Alunos por professor', ref: refF('Distritos', 1, foD.linhaInd[5], dists.length, foD.linhaInd[5]), vals: vD(foD.linhaInd[5]), cor: '0A6B45' }], de: [1, foD.aoaLen + 1], ate: [Math.max(9, dists.length + 1), foD.aoaLen + 18] });
  graf.push({ folha: 'Distritos', tipo: 'barras', titulo: `Taxa de aprovação por distrito, ${anoK}`, fmt: '0.0%', cats: catsD, series: [{ nome: 'Aprovação', ref: refF('Distritos', 1, foD.linhaInd[9], dists.length, foD.linhaInd[9]), vals: vD(foD.linhaInd[9]), cor: 'C98E00' }], de: [1, foD.aoaLen + 19], ate: [Math.max(9, dists.length + 1), foD.aoaLen + 36] });
  // painel: indicadores-chave do ano (fórmulas ligadas às folhas) e os mesmos gráficos
  const T = posF['Todos os níveis']; const ci = anos.indexOf(anoK) + 1; const L = colL(ci);
  const kp = [['Alunos matriculados', `'Todos os níveis'!${L}${T.linhaDe.HM + 1}`, '#,##0'], ['Professores', `'Todos os níveis'!${L}${T.linhaDe.Prof + 1}`, '#,##0'], ['Escolas com alunos', `'Todos os níveis'!${L}${T.linhaDe.Escolas + 1}`, '#,##0'],
    ['% de raparigas', `'Todos os níveis'!${L}${T.linhaInd[0] + 1}`, '0.0%'], ['Rácio alunos por professor', `'Todos os níveis'!${L}${T.linhaInd[5] + 1}`, '0.0'], ['Taxa de aprovação', `'Todos os níveis'!${L}${T.linhaInd[9] + 1}`, '0.0%'], ['Taxa de desistência', `'Todos os níveis'!${L}${T.linhaInd[12] + 1}`, '0.0%']];
  const pa = [[`Painel de Indicadores da Educação — ${lugar}`], [`Ano de referência: ${anoK} · Gerado pelo EducStat Tete em ${new Date().toLocaleDateString('pt-PT')}`], [], ['Indicador', String(anoK)]];
  const wsP = XLSX.utils.aoa_to_sheet(pa);
  kp.forEach(([l, ref, z], i) => { const r = 4 + i; wsP[XLSX.utils.encode_cell({ r, c: 0 })] = { t: 's', v: l }; const src = T.ws[ref.split('!')[1]]; wsP[XLSX.utils.encode_cell({ r, c: 1 })] = { t: src?.t === 'n' ? 'n' : 's', v: src?.v ?? '', f: ref, z }; });
  wsP['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 4 + kp.length, c: 1 } }); wsP['!cols'] = [{ wch: 32 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsP, 'Painel'); wb.SheetNames.unshift(wb.SheetNames.pop());
  const gT = graf.filter((g) => g.folha === 'Todos os níveis');
  gT.forEach((g, i) => graf.push({ ...g, folha: 'Painel', de: [3 + (i % 2) * 9, 3 + Math.floor(i / 2) * 17], ate: [3 + (i % 2) * 9 + 9, 3 + Math.floor(i / 2) * 17 + 16] }));
  const dl = [['Indicador', 'Definição', 'Como se calcula', 'Origem dos dados', 'Como interpretar']];
  for (const it of IND) if (it[1]) { const d = DEFS[it[0]] || []; dl.push([it[1], d[0] || '', d[1] || it[3], d[2] || '', d[3] || '']); }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dl), 'Definições');
  wb.Props = { Title: `Livro de Indicadores da Educação — ${lugar}`, Subject: 'Indicadores de cobertura, eficácia interna e gestão de recursos, com gráficos', Author: 'Alberto Adélia Manhice', LastAuthor: 'Alberto Adélia Manhice', Category: 'Estatística da Educação', Keywords: 'POEMA; Indicadores; Educação; Tete; Gráficos', Comments: 'Os indicadores são fórmulas sobre os dados de base: corrija um número e tudo se recalcula.' };
  try { await guardarXlsx(wb, `Livro_Indicadores_${lugar.replace(/\s+/g, '_')}_${anoK}.xlsx`, graf); toast('Livro de indicadores guardado (com gráficos e fórmulas).'); } catch (e) { if (e?.code !== 'declined') toast('Não foi possível criar o ficheiro.'); }
}

// ---------------- painel: lista longa com indicação de continuação; comparação de distritos ao longo dos anos ----------------
function rolagem(el) {
  const pe = h('div', { class: 'rolagem-pe' }, h('span', { text: 'Há mais indicadores ↓' }));
  const box = h('div', { class: 'rolagem' }, el, pe);
  const ver = () => box.classList.toggle('fim', box.scrollTop + box.clientHeight >= box.scrollHeight - 8);
  box.addEventListener('scroll', ver); pe.firstChild.onclick = () => box.scrollBy({ top: 320, behavior: 'smooth' });
  requestAnimationFrame(ver); return box;
}
function multiLinhas(box, series, k) {
  box.replaceChildren(); const d3 = window.d3; const pts = series.flatMap((s) => s.pts); if (!pts.length || !d3) { box.append(h('p', { class: 'note', text: 'Sem dados para comparar neste período.' })); return; }
  const W = Math.max(320, box.clientWidth), H = 300, kind = KIND[k];
  const tf = (v) => (kind === 'n' ? d3.format('~s')(v).replace('k', ' mil').replace('M', ' M') : fmt(k, v));
  const ext = d3.extent(pts, (p) => p.y); const xs = [...new Set(pts.map((p) => p.x))].sort((a, b) => a - b);
  const pad = (ext[1] - ext[0]) * 0.25 || Math.abs(ext[1]) * 0.1 || 1; const y = d3.scaleLinear([Math.max(kind === 'n' || kind === 'p' ? 0 : -Infinity, ext[0] - pad), ext[1] + pad], [H - 28, 12]).nice(5);
  const svg = d3.create('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img'); box.append(svg.node());
  let mw = 0; for (const t of y.ticks(5)) mw = Math.max(mw, svg.append('text').text(tf(t)).node().getComputedTextLength()); svg.selectAll('text').remove();
  const ml = mw + 10, lw = 130; const x = d3.scalePoint(xs, [ml + 8, W - lw - 10]);
  svg.append('g').selectAll('line').data(y.ticks(5)).join('line').attr('x1', ml).attr('x2', W - lw).attr('y1', y).attr('y2', y).attr('stroke', 'var(--line)');
  svg.append('g').selectAll('text').data(y.ticks(5)).join('text').attr('x', ml - 6).attr('y', (t) => y(t) + 4).attr('text-anchor', 'end').text(tf);
  svg.append('g').selectAll('text').data(xs).join('text').attr('x', (a) => x(a)).attr('y', H - 8).attr('text-anchor', 'middle').text((a) => a);
  const cores = ['#0A6B45', '#C98E00', '#2E6F8E', '#C0172F', '#6B4FA0', '#1F2328', '#D2691E', '#16A085', '#8E44AD', '#7F8C8D', '#2C3E50', '#E67E22', '#27AE60', '#B03A2E', '#5D6D7E', '#AF7AC5'];
  const rot = [];
  series.forEach((s, i) => {
    const c = s.cor || cores[i % cores.length]; const larg = s.destaque ? 3.2 : 1.6; const op = s.destaque || series.length < 6 ? 1 : 0.75;
    const p = s.pts.filter((q) => q.y != null); if (!p.length) return;
    svg.append('path').datum(p).attr('d', d3.line().x((q) => x(q.x)).y((q) => y(q.y))).attr('fill', 'none').attr('stroke', c).attr('stroke-width', larg).attr('opacity', op).attr('stroke-dasharray', s.tracejado ? '6 4' : null);
    svg.append('g').selectAll('circle').data(p).join('circle').attr('cx', (q) => x(q.x)).attr('cy', (q) => y(q.y)).attr('r', s.destaque ? 4 : 2.5).attr('fill', c).append('title').text((q) => `${s.nome} ${q.x}: ${fmt(k, q.y)}`);
    const u = p[p.length - 1]; rot.push({ y: y(u.y), c, t: `${s.nome} ${fmt(k, u.y)}`, b: s.destaque });
  });
  // rótulos no fim das linhas, afastados para não se sobreporem
  rot.sort((a, b) => a.y - b.y); for (let i = 1; i < rot.length; i++) if (rot[i].y - rot[i - 1].y < 12) rot[i].y = rot[i - 1].y + 12;
  for (const r of rot) svg.append('text').attr('x', W - lw + 4).attr('y', r.y + 4).attr('font-weight', r.b ? 700 : 400).style('fill', r.c).text(r.t);
}
function cartaoComparar(f, anosDados, ano) {
  const st = S.cmp ||= { k: 'aprov', de: null, ate: null, sel: null };
  const meu = +(S.sessao?.dist || (S.inst?.papel === 'distrito' ? S.inst.dist : 0));
  const todos = desc(anosDados); if (!st.ate || !anosDados.includes(+st.ate)) st.ate = ano; if (!st.de || !anosDados.includes(+st.de)) st.de = anosDados[Math.max(0, anosDados.indexOf(+st.ate) - 4)];
  if (!st.sel) st.sel = meu ? [meu] : S.cod.distritos.slice(0, 4).map((d) => d[0]);
  const box = h('div', { class: 'chart', style: 'min-height:300px' });
  const selK = h('select', { onchange: (e) => { st.k = e.target.value; desenhar(); } }, IND.filter((x) => x[1]).map((x) => h('option', { value: x[0], text: x[1], selected: x[0] === st.k })));
  const selA = (k) => h('select', { onchange: (e) => { st[k] = +e.target.value; desenhar(); } }, todos.map((a) => h('option', { value: a, text: a, selected: a === +st[k] })));
  const chk = S.cod.distritos.map(([d, n]) => { const c = h('input', { type: 'checkbox', checked: st.sel.includes(d), onchange: () => { st.sel = chk.filter((l) => l.firstChild.checked).map((l) => +l.firstChild.value); desenhar(); } }); c.value = d; return h('label', { class: 'chk', style: d === meu ? 'font-weight:700' : null }, c, n + (d === meu ? ' (o seu)' : '')); });
  const prov = h('input', { type: 'checkbox', checked: st.prov !== false, onchange: (e) => { st.prov = e.target.checked; desenhar(); } });
  const aviso = h('p', { class: 'note' });
  const desenhar = () => {
    const a0 = Math.min(+st.de, +st.ate), a1 = Math.max(+st.de, +st.ate); const anos = anosDados.filter((a) => a >= a0 && a <= a1);
    const ser = st.sel.map((d) => ({ nome: distName(d), destaque: d === meu, pts: anos.map((a) => ({ x: a, y: visivel(a, d) ? indicators(sumUp(a, { ...f, dist: d }), f.sexo)[st.k] ?? null : null })) }));
    if (st.prov !== false) ser.push({ nome: 'Província', cor: '#1F2328', tracejado: true, pts: anos.map((a) => ({ x: a, y: indicators(sumUp(a, { ...f, dist: 'Todos' }), f.sexo)[st.k] ?? null })) });
    const escondidos = meu ? anos.filter((a) => S.cod.distritos.some(([d]) => !visivel(a, d))) : [];
    aviso.textContent = escondidos.length ? `Em ${escondidos.join(', ')}, os outros distritos e o total da província ainda não estão disponíveis: aparecem quando a DPE confirmar a harmonização e publicar esses anos.` : '';
    requestAnimationFrame(() => multiLinhas(box, ser, st.k));
  };
  const card = h('div', { class: 'card' }, h('div', { class: 'row between' }, h('div', {}, h('h2', { text: 'Comparar distritos ao longo dos anos' }), h('p', { class: 'note', text: 'Escolha o indicador, o período e os distritos. Só para consulta: os dados dos outros distritos não se alteram aqui.' })),
    h('div', { class: 'row' }, h('label', { class: 'f' }, 'Indicador', selK), h('label', { class: 'f' }, 'De', selA('de')), h('label', { class: 'f' }, 'Até', selA('ate')))),
    h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(10rem,1fr));gap:2px 12px' }, ...chk, h('label', { class: 'chk' }, prov, 'Província (tracejado)')),
    h('div', { class: 'row' }, h('button', { class: 'btn sm', text: 'Todos', onclick: () => { chk.forEach((l) => (l.firstChild.checked = true)); st.sel = S.cod.distritos.map((d) => d[0]); desenhar(); } }), h('button', { class: 'btn sm', text: 'Só o meu / nenhum', onclick: () => { chk.forEach((l) => (l.firstChild.checked = +l.firstChild.value === meu)); st.sel = meu ? [meu] : []; desenhar(); } })),
    box, aviso);
  desenhar(); return card;
}

// ---------------- BROCHURA ESTATÍSTICA (modelo das brochuras do Ministério): levantamento, aproveitamento ou os dois ----------------
async function brochura2(c) {
  const { prov, dist, lugar, F, anoFim, anos, A0, A1, anosFim, AF, H1, H2, P, TAB, GR, L_, B_, fichasAno, cont } = c;
  const nomeU = prov ? 'Distrito' : divU().nome; const porU = prov ? 'por distrito' : divU().por;
  const comLev = cont !== 'aproveitamento', comAprov = cont !== 'levantamento';
  const unidadesDe = async (a) => (prov ? S.cod.distritosTodos.filter(([d]) => visivel(a, d)).map(([d, n]) => ({ nome: n, x: (f = {}) => sumUp(a, { ...F, ...f, dist: d }) }))
    : (await unidadesDistrito(a, dist)).map((u) => ({ nome: u.nome, fichas: u.fichas, x: (f = {}) => sumUpRs([u.r], a, { dist: +dist, tipo: 'Todos', nivel: 'Todos', sexo: 'Ambos', ...f }) })));
  const TOT = (a, f = {}) => sumUp(a, { ...F, ...f });
  const s2 = (v) => (v ? v[0] + v[1] : 0); const div = (a, b) => (b ? a / b : null);
  const extremo = (lin, k, maior = true) => { const v = lin.filter((l) => l[k] != null); if (!v.length) return null; return v.reduce((a, b) => ((maior ? b[k] > a[k] : b[k] < a[k]) ? b : a)); };
  const COR3 = { ap: '#1B8A3A', de: '#2E86C1', re: '#C0172F' };
  const NIVS = [['EP', 'Ensino Primário'], ['ESG1', 'Ensino Secundário, 1º Ciclo'], ['ESG2', 'Ensino Secundário, 2º Ciclo']];
  const temNivel = (a, nv) => s2(TOT(a, { nivel: nv })?.T.Matric) > 0;
  const titulos = [comLev ? `Levantamento Escolar de 3 de Março de ${anoFim}` : null, comAprov && AF ? `Aproveitamento Escolar de ${AF}` : null].filter(Boolean);
  // ---- introdução e glossário (curtos) ----
  H1('Introdução');
  P(`Esta brochura reúne as principais estatísticas da Educação ${prov ? 'da Província de Tete' : 'do ' + lugar}: ${titulos.join(' e ').replace(/^./, (x) => x.toLowerCase())}. Os dados vêm dos mapas preenchidos pelas escolas e introduzidos no EducStat, e são apresentados ${porU}, por sexo e por nível de ensino, seguindo o modelo das brochuras do Ministério da Educação e Desenvolvimento Humano.`);
  P(`As tabelas podem ser actualizadas no Word (clique no gráfico > Editar dados) e os mesmos números estão disponíveis em Excel, em Relatórios > Guardar dados em Excel.${comAprov && AF && AF < anoFim ? ` O aproveitamento refere-se a ${AF}, último ano com o levantamento de fim do ano completo.` : ''}`);
  if (comLev) {
    const a = anoFim; const U = await unidadesDe(a); const T0 = TOT(a);
    if (!T0) { P(`Ainda não há dados do levantamento de 3 de Março de ${a}.`); }
    else {
      H1(`Levantamento escolar de 3 de Março de ${a}`);
      // 1. escolas
      const fa = await fichasAno(); const grp = prov ? S.cod.distritosTodos.map(([d, n]) => [n, fa.filter((f) => +f.dist === d)]) : U.map((u) => [u.nome, u.fichas || []]);
      const tipoN = (fs, t) => fs.filter((f) => (S.esc.get(f.esc)?.tipo || 'Pública') === t).length;
      const lE = grp.map(([n, fs]) => { const e = escolasPorNivel(fs); return [n, numTxt(fs.length), numTxt(tipoN(fs, 'Pública')), numTxt(tipoN(fs, 'Privada') + tipoN(fs, 'Comunitária')), numTxt(e.EP), numTxt(e.ESG1), numTxt(e.ESG2)]; });
      const eT = escolasPorNivel(fa); lE.push(['Total', numTxt(fa.length), numTxt(tipoN(fa, 'Pública')), numTxt(tipoN(fa, 'Privada') + tipoN(fa, 'Comunitária')), numTxt(eT.EP), numTxt(eT.ESG1), numTxt(eT.ESG2)]);
      H2('Escolas');
      TAB(`Número de escolas com informação, por tipo e nível de ensino, ${porU}, ${a}`, [nomeU, 'Escolas', 'Públicas', 'Privadas e comunitárias', 'Com EP', 'Com ESG1', 'Com ESG2'], lE);
      P(`Em ${a}, ${numTxt(fa.length)} escolas enviaram o mapa do levantamento: ${numTxt(eT.EP)} leccionam o Ensino Primário, ${numTxt(eT.ESG1)} o 1º Ciclo e ${numTxt(eT.ESG2)} o 2º Ciclo do Ensino Secundário (uma escola pode leccionar mais de um nível).`);
      // 2. resumo de alunos por nível e sexo
      H2('Alunos matriculados');
      const lA = U.map((u) => { const r = [u.nome]; let t = [0, 0]; for (const [nv] of NIVS) { const x = u.x({ nivel: nv }); const m = x?.T.Matric || [0, 0]; t = [t[0] + m[0], t[1] + m[1]]; r.push(numTxt(s2(m)), numTxt(m[1])); } r.push(numTxt(s2(t)), pctTxt(div(t[1], s2(t)))); return r; });
      { const r = ['Total']; let t = [0, 0]; for (const [nv] of NIVS) { const m = TOT(a, { nivel: nv })?.T.Matric || [0, 0]; t = [t[0] + m[0], t[1] + m[1]]; r.push(numTxt(s2(m)), numTxt(m[1])); } r.push(numTxt(s2(t)), pctTxt(div(t[1], s2(t)))); lA.push(r); }
      TAB(`Alunos matriculados por nível de ensino e sexo, ${porU}, ${a}`, [nomeU, 'EP HM', 'EP M', 'ESG1 HM', 'ESG1 M', 'ESG2 HM', 'ESG2 M', 'Total HM', '% M'], lA);
      const totNiv = NIVS.map(([nv]) => s2(TOT(a, { nivel: nv })?.T.Matric));
      GR(`Distribuição dos alunos por nível de ensino, ${a}`, B_({ cats: NIVS.map((n) => n[1].replace('Ensino Secundário, ', 'ESG ')), series: [{ nome: 'Alunos', cor: PUB_COR.br, cores: [PUB_COR.EP, PUB_COR.ESG1, PUB_COR.ESG2], vals: totNiv }] }));
      const totA = totNiv.reduce((x, y) => x + y, 0);
      const linU = U.map((u) => { const m = u.x()?.T.Matric || [0, 0]; return { nome: u.nome, h: m[0], m: m[1] }; });
      const tH = linU.reduce((x, l) => x + l.h, 0), tM = linU.reduce((x, l) => x + l.m, 0);
      if (U.length > 1) GR(`Distribuição dos alunos ${porU} e sexo em relação ao total, ${a}`, B_({ cats: linU.map((l) => l.nome), series: [{ nome: 'Raparigas', cor: PUB_COR.M, vals: linU.map((l) => div(l.m, tM)) }, { nome: 'Rapazes', cor: PUB_COR.H, vals: linU.map((l) => div(l.h, tH)) }], pct: true, horiz: true, H: Math.max(180, linU.length * 30 + 40) }));
      const maiorU = linU.reduce((x, y) => (y.h + y.m > x.h + x.m ? y : x), linU[0] || { nome: '—', h: 0, m: 0 });
      P(`${prov ? 'A província' : 'O distrito'} tinha ${numTxt(totA)} alunos em ${a}, dos quais ${pctTxt(div(totNiv[0], totA))} no Ensino Primário. ${U.length > 1 ? `${maiorU.nome} concentra a maior parte (${pctTxt(div(maiorU.h + maiorU.m, tH + tM))} do total).` : ''} As raparigas representam ${pctTxt(div(tM, tH + tM))} dos alunos.`);
      // 3. por nível: alunos por classe; indicadores por unidade
      for (const [nv, nomeN] of NIVS) {
        if (!temNivel(a, nv)) continue;
        const X = TOT(a, { nivel: nv }); H2(nomeN);
        const cls = Object.keys(X.byCl).map(Number).filter((k) => k > 0 && s2(X.byCl[k].Matric)).sort((p, q) => p - q);
        const lC = cls.map((k) => { const C = X.byCl[k]; return [`${k}ª classe`, numTxt(s2(C.Matric)), numTxt(C.Matric[1]), numTxt(s2(C.Rep)), pctTxt(div(s2(C.Rep), s2(C.Matric))), numTxt(C.Turmas), R1.format(div(s2(C.Matric), C.Turmas) || 0)]; });
        lC.push(['Total', numTxt(s2(X.T.Matric)), numTxt(X.T.Matric[1]), numTxt(s2(X.T.Rep)), pctTxt(div(s2(X.T.Rep), s2(X.T.Matric))), numTxt(X.T.Turmas), R1.format(div(s2(X.T.Matric), X.T.Turmas) || 0)]);
        TAB(`${nomeN}: alunos e repetentes por classe e sexo, turmas e alunos por turma, ${a}`, ['Classe', 'Alunos HM', 'Alunos M', 'Repetentes HM', '% repetentes', 'Turmas', 'Alunos/turma'], lC);
        const lI = U.map((u) => { const x = u.x({ nivel: nv }); if (!x || !s2(x.T.Matric)) return null; const i = indicators(x, 'Ambos'); return { nome: u.nome, al: s2(x.T.Matric), pf: i.pctF, rep: i.repet, ap: i.alprof, at: i.altur, fo: i.formados, prof: s2(x.T.Prof) }; }).filter(Boolean);
        const iT = indicators(X, 'Ambos');
        const lI2 = lI.map((l) => [l.nome, numTxt(l.al), pctTxt(l.pf), pctTxt(l.rep), numTxt(l.prof), R1.format(l.ap || 0), R1.format(l.at || 0), pctTxt(l.fo)]);
        lI2.push([prov ? 'Província' : 'Total', numTxt(s2(X.T.Matric)), pctTxt(iT.pctF), pctTxt(iT.repet), numTxt(s2(X.T.Prof)), R1.format(iT.alprof || 0), R1.format(iT.altur || 0), pctTxt(iT.formados)]);
        if (lI.length > 1) TAB(`${nomeN}: alunos, repetência, professores e rácios ${porU}, ${a}`, [nomeU, 'Alunos', '% raparigas', '% repetentes', 'Professores', 'Alunos/professor', 'Alunos/turma', '% prof. com formação'], lI2);
        if (lI.length > 1 && nv === 'EP') {
          GR(`${nomeN}: rácio alunos por professor ${porU}, ${a}`, B_({ cats: [...lI.map((l) => l.nome), 'Média'], series: [{ nome: 'Alunos por professor', cor: '#2E86C1', cores: [...lI.map(() => '#2E86C1'), PUB_COR.br], vals: [...lI.map((l) => l.ap), iT.alprof] }], horiz: true, H: Math.max(180, (lI.length + 1) * 26 + 30) }));
          const pior = extremo(lI, 'ap'), melhor = extremo(lI, 'ap', false);
          if (pior && melhor) P(`No Ensino Primário há, em média, ${R1.format(iT.alprof || 0)} alunos por professor e ${R1.format(iT.altur || 0)} alunos por turma. O rácio mais alto é o de ${pior.nome} (${R1.format(pior.ap)}) e o mais baixo o de ${melhor.nome} (${R1.format(melhor.ap)}).`);
        }
        // professores com e sem formação, por sexo
        if (s2(X.T.Prof)) {
          const lP = U.map((u) => { const x = u.x({ nivel: nv }); if (!x || !s2(x.T.Prof)) return null; const p = x.T.Prof, f = x.T.ProfForm; return [u.nome, numTxt(p[1]), numTxt(s2(p)), numTxt(f[1]), numTxt(s2(f)), pctTxt(div(s2(f), s2(p))), numTxt(s2(p) - s2(f))]; }).filter(Boolean);
          const p = X.T.Prof, f = X.T.ProfForm; lP.push(['Total', numTxt(p[1]), numTxt(s2(p)), numTxt(f[1]), numTxt(s2(f)), pctTxt(div(s2(f), s2(p))), numTxt(s2(p) - s2(f))]);
          TAB(`${nomeN}: professores com e sem formação psicopedagógica, por sexo, ${porU}, ${a}`, [nomeU, 'Professores M', 'Professores HM', 'Com formação M', 'Com formação HM', '% com formação', 'Sem formação HM'], lP);
        }
      }
      // 4. cobertura (precisa da população: só ao nível do distrito ou da província)
      const cob = (prov ? S.cod.distritosTodos.filter(([d]) => visivel(a, d)).map(([d, n]) => [n, { ...F, dist: d }]) : []).concat([[prov ? 'Província' : distName(dist), { ...F }]]);
      const lCob = cob.map(([n, f]) => [n, ...['tba', 'tesc6', 'tle', 'tbe'].map((k) => pctTxt(IX(a, { ...f, nivel: 'EP' }, k)))]);
      if (lCob.some((l) => l.slice(1).some((v) => v !== '—'))) {
        H2('Indicadores de cobertura escolar');
        TAB(`Ensino Primário: taxas de admissão e de escolarização${prov ? ' por distrito' : ''}, ${a}`, [prov ? 'Distrito' : 'Âmbito', 'Taxa bruta de admissão', 'Escolarização aos 6 anos', 'Taxa líquida de escolarização', 'Taxa bruta de escolarização'], lCob, 'Levantamento 3 de Março. INE, projecções da população.');
        if (prov) GR(`Ensino Primário: taxas de admissão e escolarização por distrito, ${a}`, B_({ cats: cob.slice(0, -1).map((x) => x[0]), series: [['tba', 'T. B. admissão', '#2E86C1'], ['tle', 'T. L. escolarização', '#7F8C8D'], ['tbe', 'T. B. escolarização', PUB_COR.ac]].map(([k, n, cor]) => ({ nome: n, cor, vals: cob.slice(0, -1).map(([, f]) => IX(a, { ...f, nivel: 'EP' }, k)) })), pct: true }), 'Levantamento 3 de Março. INE, projecções da população.');
        P('Taxas acima de 100% indicam alunos fora da idade oficial (entrada tardia ou repetência) ou população projectada abaixo da real. Devem ser lidas em conjunto com a taxa líquida.');
      }
      // 5. equidade e inclusão
      const lEq = U.map((u) => { const x = u.x(); if (!x) return null; return [u.nome, numTxt(s2(x.T.Orf)), pctTxt(div(s2(x.T.Orf), s2(x.T.Matric))), numTxt(s2(x.T.Defic)), numTxt(s2(x.T.Biling))]; }).filter(Boolean);
      lEq.push(['Total', numTxt(s2(T0.T.Orf)), pctTxt(div(s2(T0.T.Orf), s2(T0.T.Matric))), numTxt(s2(T0.T.Defic)), numTxt(s2(T0.T.Biling))]);
      H2('Equidade e inclusão');
      TAB(`Alunos órfãos, alunos com necessidades educativas especiais e alunos do ensino bilingue, ${porU}, ${a}`, [nomeU, 'Órfãos', '% órfãos', 'Com NEE', 'Ensino bilingue'], lEq);
      // 6. evolução
      if (anos.length > 1) {
        H2(`Evolução ${A0}-${A1}`);
        GR(`Evolução do número de alunos por nível de ensino, ${A0}-${A1}`, L_({ anos, pct: false, series: NIVS.map(([nv, n]) => ({ nome: n.replace('Ensino Secundário, ', 'ESG '), cor: PUB_COR[nv], vals: anos.map((x) => { const t = TOT(x, { nivel: nv }); return t ? s2(t.T.Matric) : null; }) })) }));
        GR(`Evolução dos rácios alunos por professor e por turma, Ensino Primário, ${A0}-${A1}`, L_({ anos, pct: false, series: [{ nome: 'Alunos por professor', cor: PUB_COR.br, vals: anos.map((x) => IX(x, { ...F, nivel: 'EP' }, 'alprof')) }, { nome: 'Alunos por turma', cor: PUB_COR.ac, vals: anos.map((x) => IX(x, { ...F, nivel: 'EP' }, 'altur')) }] }));
        // indicadores de equidade e de qualidade ao longo do tempo
        const serieNiv = (k) => NIVS.filter(([nv]) => anos.some((x) => temNivel(x, nv))).map(([nv, n]) => ({ nome: n.replace('Ensino Secundário, ', 'ESG '), cor: PUB_COR[nv], vals: anos.map((x) => IX(x, { ...F, nivel: nv }, k)) }));
        const varTxt = (k, nv, nome) => { const v0 = IX(A0, { ...F, nivel: nv }, k), v1 = IX(A1, { ...F, nivel: nv }, k); if (v0 == null || v1 == null) return ''; const d = (v1 - v0) * 100; return `${nome} passou de ${pctTxt(v0)} em ${A0} para ${pctTxt(v1)} em ${A1} (${d >= 0 ? 'mais' : 'menos'} ${R1.format(Math.abs(d))} pontos percentuais).`; };
        GR(`Evolução da percentagem de raparigas por nível de ensino, ${A0}-${A1}`, L_({ anos, series: serieNiv('pctF') }));
        { const t = varTxt('pctF', 'EP', 'No Ensino Primário, a percentagem de raparigas'); if (t) P(t); }
        GR(`Evolução da percentagem de professores com formação psicopedagógica, ${A0}-${A1}`, L_({ anos, series: serieNiv('formados') }));
        { const t = varTxt('formados', 'EP', 'No Ensino Primário, a percentagem de professores com formação psicopedagógica'); if (t) P(t); }
        GR(`Evolução da taxa de repetência por nível de ensino, ${A0}-${A1}`, L_({ anos, series: serieNiv('repet') }));
      }
      // alunos por classe e sexo no Ensino Primário (barras)
      { const x = TOT(a, { nivel: 'EP' }); const cl = x ? Object.keys(x.byCl).map(Number).filter((c) => c > 0 && s2(x.byCl[c].Matric)).sort((p, q) => p - q) : [];
        if (cl.length > 1) GR(`Ensino Primário: alunos matriculados por classe e sexo, ${a}`, B_({ cats: cl.map((c) => `${c}ª classe`), series: [{ nome: 'Homens', cor: '#2E6F8E', vals: cl.map((c) => x.byCl[c].Matric[0]) }, { nome: 'Mulheres', cor: '#C98E00', vals: cl.map((c) => x.byCl[c].Matric[1]) }] })); }
    }
  }
  if (comAprov) {
    if (!AF) { H1('Aproveitamento escolar'); P('Ainda não há dados do levantamento de fim do ano (aproveitamento) para este período.'); }
    else {
      const a = AF; const U = await unidadesDe(a); H1(`Aproveitamento escolar de ${a}`);
      // 1. escolas cobertas no fim do ano
      const lC = U.map((u) => { const x = u.x(); return x ? [u.nome, numTxt(x.T.Escolas), numTxt(x.T.EscolasFim), pctTxt(div(Math.min(x.T.EscolasFim, x.T.Escolas), x.T.Escolas))] : null; }).filter(Boolean);
      const XT = TOT(a); lC.push(['Total', numTxt(XT.T.Escolas), numTxt(XT.T.EscolasFim), pctTxt(div(Math.min(XT.T.EscolasFim, XT.T.Escolas), XT.T.Escolas))]);
      TAB(`Escolas existentes e com informação do fim do ano, ${porU}, ${a}`, [nomeU, 'Escolas existentes', 'Com informação', '% com informação'], lC, 'Levantamento de fim do ano.');
      for (const [nv, nomeN] of NIVS) {
        const X = TOT(a, { nivel: nv }); if (!X || !s2(X.T.Fim)) continue;
        H2(nomeN);
        // taxas por unidade (em relação ao início do ano: aprovação, desistência e reprovação somam 100%)
        const tx = (x) => { const ini = s2(x.T.MatricFim), ap = s2(x.T.Aprov), de = s2(x.T.Desist); return ini ? { ap: ap / ini, de: de / ini, re: Math.max(0, 1 - ap / ini - de / ini) } : null; };
        const lT = U.map((u) => { const x = u.x({ nivel: nv }); const t = x && tx(x); return t ? { nome: u.nome, ...t } : null; }).filter(Boolean);
        const tT = tx(X);
        TAB(`${nomeN}: taxas de aprovação, desistência e reprovação ${porU}, ${a}`, [nomeU, 'Aprovação', 'Desistência', 'Reprovação'], [...lT.map((l) => [l.nome, pctTxt(l.ap), pctTxt(l.de), pctTxt(l.re)]), [prov ? 'Província' : 'Total', pctTxt(tT?.ap), pctTxt(tT?.de), pctTxt(tT?.re)]], 'Levantamentos de 3 de Março e de fim do ano. Taxas em relação aos alunos no início do ano.');
        if (lT.length > 1) GR(`${nomeN}: taxas de aprovação, desistência e reprovação ${porU}, ${a}`, B_({ cats: lT.map((l) => l.nome), series: [{ nome: 'Aprovação', cor: COR3.ap, vals: lT.map((l) => l.ap) }, { nome: 'Desistência', cor: COR3.de, vals: lT.map((l) => l.de) }, { nome: 'Reprovação', cor: COR3.re, vals: lT.map((l) => l.re) }], pct: true }), 'Levantamentos de 3 de Março e de fim do ano.');
        const mx = extremo(lT, 'ap'), mn = extremo(lT, 'ap', false);
        if (tT) P(`No ${nomeN.charAt(0).toLowerCase() + nomeN.slice(1)}, ${pctTxt(tT.ap)} dos alunos matriculados no início do ano foram aprovados, ${pctTxt(tT.de)} desistiram e ${pctTxt(tT.re)} reprovaram.${mx && mn && lT.length > 1 ? ` A aprovação mais alta foi em ${mx.nome} (${pctTxt(mx.ap)}) e a mais baixa em ${mn.nome} (${pctTxt(mn.ap)}).` : ''}`);
        // por classe: início, fim, aprovados e indicadores
        const cls = Object.keys(X.byCl).map(Number).filter((k) => k > 0 && s2(X.byCl[k].Fim)).sort((p, q) => p - q);
        const lK = cls.map((k) => { const C = X.byCl[k]; const ini = s2(C.MatricFim) || s2(C.Matric); return [`${k}ª classe`, numTxt(ini), numTxt(s2(C.Fim)), numTxt(s2(C.Aprov)), numTxt(C.Aprov[1]), pctTxt(div(s2(C.Aprov), ini)), pctTxt(div(s2(C.Desist), ini)), pctTxt(div(s2(C.Aprov), s2(C.Fim)))]; });
        const iniT = s2(X.T.MatricFim);
        lK.push(['Total', numTxt(iniT), numTxt(s2(X.T.Fim)), numTxt(s2(X.T.Aprov)), numTxt(X.T.Aprov[1]), pctTxt(div(s2(X.T.Aprov), iniT)), pctTxt(div(s2(X.T.Desist), iniT)), pctTxt(div(s2(X.T.Aprov), s2(X.T.Fim)))]);
        TAB(`${nomeN}: alunos no início, no fim e aprovados por classe. Indicadores em relação ao início e ao fim do ano, ${a}`, ['Classe', 'Início', 'Fim', 'Aprovados HM', 'Aprovados M', 'Aprovação (início)', 'Desistência (início)', 'Aprovação (fim)'], lK, 'Levantamentos de 3 de Março e de fim do ano.');
        // graduados (aprovados na classe final do nível)
        const fin = FINAL[sisDe(a)][nv];
        const gU = U.map((u) => { const x = u.x({ nivel: nv }); const C = x?.byCl[fin]; return C && s2(C.Aprov) ? { nome: u.nome, h: C.Aprov[0], m: C.Aprov[1] } : null; }).filter(Boolean);
        if (gU.length) {
          const gh = gU.reduce((s, g) => s + g.h, 0), gm = gU.reduce((s, g) => s + g.m, 0);
          TAB(`${nomeN}: graduados (aprovados na ${fin}ª classe) por sexo, ${porU}, ${a}`, [nomeU, 'H', 'M', 'HM', '% do total'], [...gU.map((g) => [g.nome, numTxt(g.h), numTxt(g.m), numTxt(g.h + g.m), pctTxt(div(g.h + g.m, gh + gm))]), ['Total', numTxt(gh), numTxt(gm), numTxt(gh + gm), '100,0%']], 'Levantamento de fim do ano.');
        }
      }
      // taxa bruta de conclusão (precisa da população)
      const conc = (prov ? S.cod.distritosTodos.filter(([d]) => visivel(a, d)).map(([d, n]) => [n, { ...F, dist: d }]) : []).concat([[prov ? 'Província' : distName(dist), { ...F }]]);
      const lTc = conc.map(([n, f]) => [n, ...['EP', 'ESG1', 'ESG2'].flatMap((nv) => ['Homens', 'Mulheres', 'Ambos'].map((sx) => pctTxt(IX(a, { ...f, nivel: nv }, 'tbc', sx))))]);
      if (lTc.some((l) => l.slice(1).some((v) => v !== '—'))) {
        H2('Taxas brutas de conclusão');
        TAB(`Taxas brutas de conclusão por nível de ensino e sexo${prov ? ', por distrito' : ''}, ${a}`, [prov ? 'Distrito' : 'Âmbito', 'EP H', 'EP M', 'EP HM', 'ESG1 H', 'ESG1 M', 'ESG1 HM', 'ESG2 H', 'ESG2 M', 'ESG2 HM'], lTc, 'Levantamento de fim do ano. INE, projecções da população.');
      }
      if (anosFim.length > 1) GR(`Evolução da taxa de aprovação por nível de ensino, ${anosFim[0]}-${anosFim[anosFim.length - 1]}`, L_({ anos: anosFim, series: NIVS.map(([nv, n]) => ({ nome: n.replace('Ensino Secundário, ', 'ESG '), cor: PUB_COR[nv], vals: anosFim.map((x) => IX(x, { ...F, nivel: nv }, 'aprovEsc')) })) }), 'Levantamentos de 3 de Março e de fim do ano.');
      if (anosFim.length > 1) GR(`Evolução da taxa de desistência por nível de ensino, ${anosFim[0]}-${anosFim[anosFim.length - 1]}`, L_({ anos: anosFim, series: NIVS.map(([nv, n]) => ({ nome: n.replace('Ensino Secundário, ', 'ESG '), cor: PUB_COR[nv], vals: anosFim.map((x) => IX(x, { ...F, nivel: nv }, 'desist')) })) }), 'Levantamentos de 3 de Março e de fim do ano.');
    }
  }
  H1('Glossário');
  for (const [t, d] of [['Escolas com informação', 'Escolas que preencheram o mapa do levantamento e cujos dados foram introduzidos no sistema.'], ['Alunos repetentes', 'Alunos que frequentam a mesma classe que no ano lectivo anterior.'], ['Turma', 'Grupo de alunos ensinados ao mesmo tempo pelo(s) mesmo(s) professor(es). Inclui turmas puras e mistas.'],
    ['Taxa bruta de admissão', 'Novos ingressos na 1ª classe ÷ população com 6 anos.'], ['Taxa líquida de escolarização', 'Alunos em idade oficial do nível ÷ população nessa idade.'], ['Taxa bruta de escolarização', 'Alunos do nível ÷ população em idade oficial do nível.'],
    ['Rácio alunos por professor', 'Alunos matriculados ÷ professores em exercício no nível.'], ['Taxa de aprovação', 'Aprovados ÷ alunos matriculados no início do ano (ou no fim do ano, quando indicado).'], ['Taxa de desistência', 'Desistentes ÷ alunos matriculados no início do ano.'],
    ['Graduados', 'Alunos aprovados na última classe do nível (6ª classe no EP desde 2023; 9ª no ESG1; 12ª no ESG2).'], ['Taxa bruta de conclusão', 'Graduados ÷ população com a idade oficial de conclusão do nível.']]) P(`${t}: ${d}`);
  return titulos;
}

// ---------------- Ajuda: três separadores com aspecto novo ----------------
VIEWS.ajuda = (v) => {
  const tab = S.ajudaTab || 'como';
  v.append(h('div', { class: 'row between' }, h('div', {}, h('h1', { text: 'Ajuda' }), h('p', { class: 'lede', text: 'Como usar o programa, o que significa cada indicador e as notas dos mapas oficiais.' })),
    h('button', { class: 'btn primary', onclick: () => iniciarTour(true) }, SVG(IC.guia, 16), ' Visita guiada')));
  v.append(h('div', { class: 'tabs' }, [['como', 'Como funciona'], ['ficha', 'Explicação dos indicadores'], ['notas', 'Notas explicativas dos mapas']].map(([k, l]) => h('button', { 'aria-selected': String(tab === k), text: l, onclick: () => { S.ajudaTab = k; go('ajuda'); } }))));
  if (tab === 'ficha') return VIEWS.indicadores(v);
  if (tab === 'notas') { const t = h('div'); ajudaAntiga(t); t.firstChild?.remove(); for (const c of t.querySelectorAll('.card')) c.style.borderTop = '4px solid var(--m, var(--brand))'; v.append(...t.childNodes); return; }
  const C = (ic, cor, t, ...k) => h('div', { class: 'ajuda-c', style: `--c:${cor}` }, h('span', { class: 'ic' }, SVG(IC[ic], 22)), h('h3', { text: t }), ...k);
  const ul = (...l) => h('ul', {}, l.map((x) => h('li', { text: x })));
  v.append(h('div', { class: 'ajuda-hero' },
    C('ficha', 'var(--brand)', 'Introduzir os mapas', ul('Introdução de Dados: ano, distrito e escola.', 'Cada nível de ensino é um mapa, com as cores do papel.', 'Os erros entre quadros aparecem enquanto escreve.', 'O mapa grava-se sozinho. “Desfazer” volta atrás.')),
    C('grafico', '#2E86C1', 'Ver os indicadores', ul('Painel: cobertura, eficácia, professores, salas, equidade.', 'Compare distritos ao longo dos anos.', 'Livro de Indicadores em Excel, com gráficos e fórmulas.')),
    C('livro', 'var(--accent)', 'Publicar', ul('Brochura: levantamento, aproveitamento ou os dois.', 'Carta escolar com mapas.', 'Word editável (gráficos com dados), PDF e Excel.')),
    C('msg', '#6B4FA0', 'Comunicar', ul('Mensagens com a DPE e os outros SDEJT.', 'Veja quem está online e escreva-lhe.', 'Aviso com som quando chega uma mensagem.')),
    C('nuvem', '#16A085', 'Sincronizar', ul('Com internet: envia sozinho, segundos depois de cada alteração.', 'Sem internet: guarda tudo e envia quando a rede voltar.', 'Por pacote (pen, e-mail) quando não há rede durante muito tempo.')),
    C('escudo', 'var(--bad)', 'Proteger os dados', ul('Cópia automática todos os dias (14 dias).', 'Cortes de energia: a última versão boa é recuperada sozinha.', 'Cada distrito só altera os seus dados.'))));
  const passo = (t, p) => h('div', { class: 'passo' }, h('div', {}, h('b', { text: t }), h('p', { text: p })));
  v.append(h('div', { class: 'grid2' },
    h('div', { class: 'card' }, h('h2', { text: 'Um ano de trabalho, passo a passo' }), h('div', { class: 'passos' },
      passo('Antes de começar (DPE): Configurações', 'Em Administração > Configurações, a DPE carrega a carta escolar, os limites dos distritos e postos e as coordenadas das escolas. É feito uma vez (e revisto uma vez por ano) e segue para todos os distritos na sincronização.'),
      passo('Março: levantamento de 3 de Março', 'Cada SDEJT introduz os mapas das suas escolas (Introdução de Dados > 3 de Março). Use “Copiar estrutura” para criar as linhas do ano anterior.'),
      passo('Verificar a qualidade', 'Explorar > Verificação da qualidade mostra escolas sem mapa, novas ou que mudaram de nível, e os erros de coerência.'),
      passo('Harmonizar com a DPE', 'Até ao prazo definido pela DPE, os dados sincronizam-se. A DPE confirma a harmonização e os números ficam oficiais.'),
      passo('Publicar e comparar', 'Depois de a DPE publicar o ano, cada distrito vê (só para consulta) os dados dos outros, no Painel e nas Publicações.'),
      passo('Dezembro: aproveitamento', 'Introduza o fim do ano (Introdução de Dados > Fim do ano) ou importe a base Access: o que faltar entra sozinho, o resto mantém-se.'))),
    h('div', { class: 'card' }, h('h2', { text: 'Quem pode fazer o quê' }), h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Perfil', 'Pode'].map((t) => h('th', { class: 'l', text: t })))),
      h('tbody', {}, [['Consulta', 'Ver mapas, painel e publicações. Ler mensagens.'], ['Lançamento', 'Introduzir e corrigir os mapas do seu distrito. Enviar mensagens.'], ['Administrador Distrital (SDEJT_09xx)', 'Tudo o anterior. Criar utilizadores do distrito. Sincronizar. Cópias de segurança.'], ['Administrador Provincial (DPE)', 'Tudo. Criar escolas. Prazos, trancas, harmonização e publicação. Repor senhas.']].map(([a, b]) => h('tr', {}, h('td', { class: 'l', style: 'white-space:normal;font-weight:600', text: a }), h('td', { class: 'l', style: 'white-space:normal', text: b })))))),
      h('h2', { text: 'Cuidados com a comparação', style: 'margin-top:8px' }),
      h('p', { class: 'note', style: 'font-size:13px;line-height:1.55', text: 'Até 2022 o Ensino Primário tinha 7 classes. Desde 2023 (SNE) tem 6 e a 7ª passou ao ESG 1º Ciclo. As qualificações dos professores e os motivos de desistência também mudaram de tabela em 2023: o sistema usa a tabela certa para cada ano.' }),
      h('p', { class: 'note', text: 'Sistema preparado por Alberto Adélia Manhice — DPE Tete.' }))));
};

// ---------------- gráficos das publicações com estética moderna (linhas finas, pontos com contorno, barras com fundo) ----------------
const FONTE_G = "'Public Sans','Segoe UI',Arial,sans-serif";
function legendaSVG(series, x, y, W) { let g = '', lx = x, ly = y; for (const s of series) { const w = 22 + s.nome.length * 6; if (lx + w > W - 8) { lx = x; ly += 16; } g += `<circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${s.cor}"/><text x="${lx + 14}" y="${ly}" font-size="10.5" fill="#13221B">${esc_(s.nome)}</text>`; lx += w + 10; } return g; }
function svgLinhas({ anos, series, pct = true, W = 640, H = 250 }) {
  const vals = series.flatMap((s) => s.vals).filter((v) => v != null && Number.isFinite(v)); if (!vals.length) return null;
  let mn = Math.min(...vals), mx = Math.max(...vals); const pad = (mx - mn) * 0.18 || Math.abs(mx) * 0.1 || 1; mn = Math.max(0, mn - pad); mx = mx + pad;
  const L = 52, R = series.length > 3 ? 48 : 22, T = series.length > 1 ? 34 : 16, B = 28; const X = (i) => L + (anos.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (anos.length - 1)); const Y = (v) => T + (1 - (v - mn) / (mx - mn)) * (H - T - B);
  const f = (v) => (pct ? P1.format(v) : NF.format(Math.round(v)));
  let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONTE_G}"><rect width="${W}" height="${H}" fill="#fff"/>`;
  if (series.length > 1) g += legendaSVG(series, L, 14, W);
  for (let i = 0; i <= 4; i++) { const v = mn + ((mx - mn) * i) / 4; const y = Y(v); g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#E3E9E5" stroke-dasharray="${i ? '3 3' : ''}"/><text x="${L - 8}" y="${y + 3.5}" font-size="9.5" text-anchor="end" fill="#6B7B73">${esc_(f(v))}</text>`; }
  anos.forEach((a, i) => { g += `<text x="${X(i)}" y="${H - 9}" font-size="10" text-anchor="middle" fill="#4A5A52">${a}</text>`; });
  series.forEach((s) => {
    const pts = s.vals.map((v, i) => (v == null ? null : [X(i), Y(v)])).filter(Boolean);
    if (series.length === 1 && pts.length > 1) g += `<polygon points="${pts.map((p) => p.join(',')).join(' ')} ${pts[pts.length - 1][0]},${Y(mn)} ${pts[0][0]},${Y(mn)}" fill="${s.cor}" opacity="0.08"/>`;
    if (pts.length > 1) g += `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${s.cor}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`;
    s.vals.forEach((v, i) => { if (v == null) return; const ult = i === s.vals.length - 1 || s.vals.slice(i + 1).every((x) => x == null);
      g += `<circle cx="${X(i)}" cy="${Y(v)}" r="${ult ? 4.6 : 3.6}" fill="${ult ? s.cor : '#fff'}" stroke="${s.cor}" stroke-width="2"/>`;
      // valor de cada ponto (com muitas séries, só o último, à direita da linha)
      const sj = series.indexOf(s); const baixo = series.length > 1 && sj % 2 === 1;
      if (series.length <= 3) g += `<text x="${X(i)}" y="${baixo ? Y(v) + 16 : Y(v) - 9}" font-size="9.5" font-weight="${ult ? 700 : 500}" text-anchor="middle" fill="${s.cor}" paint-order="stroke" stroke="#fff" stroke-width="3">${esc_(f(v))}</text>`;
      else if (ult) g += `<text x="${X(i) + 7}" y="${Y(v) + 3.5}" font-size="9" font-weight="700" text-anchor="start" fill="${s.cor}" paint-order="stroke" stroke="#fff" stroke-width="3">${esc_(f(v))}</text>`; });
  });
  return g + '</svg>';
}
function svgBarras({ cats, series, pct = false, W = 640, H = 260, horiz = false }) {
  const vals = series.flatMap((s) => s.vals).filter((v) => v != null && Number.isFinite(v)); if (!vals.length) return null;
  const mx = Math.max(...vals) * (!horiz && series.length * cats.length > 24 ? 1.3 : 1.12) || 1; const f = (v) => (pct ? P1.format(v) : NF.format(Math.round(v)));
  let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONTE_G}"><rect width="${W}" height="${H}" fill="#fff"/>`;
  const legT = series.length > 1 ? 22 : 0; if (legT) g += legendaSVG(series, horiz ? 140 : 50, 14, W);
  if (horiz) {
    // barras horizontais com “calha” clara de fundo, rótulo à esquerda e valor no fim (estilo dos relatórios da UNICEF/ONU)
    const L = 136, R = 54, T = 6 + legT, B = 6; const bh = (H - T - B) / cats.length; const sb = Math.min(16, (bh * 0.7) / series.length);
    cats.forEach((c, i) => { const y0 = T + i * bh + (bh - sb * series.length) / 2;
      g += `<text x="${L - 8}" y="${y0 + (sb * series.length) / 2 + 3.5}" font-size="10.5" text-anchor="end" fill="#13221B">${esc_(c)}</text><rect x="${L}" y="${y0}" width="${W - L - R}" height="${sb * series.length}" rx="${Math.min(4, sb / 2)}" fill="#F1F4F2"/>`;
      series.forEach((s, j) => { const v = s.vals[i]; if (v == null) return; const w = Math.max(2, (v / mx) * (W - L - R)); const y = y0 + j * sb; g += `<rect x="${L}" y="${y + 1}" width="${w}" height="${sb - 2}" rx="${Math.min(4, (sb - 2) / 2)}" fill="${s.cores?.[i] || s.cor}"/><text x="${L + w + 5}" y="${y + sb / 2 + 3.5}" font-size="9.5" font-weight="600" fill="#13221B">${esc_(f(v))}</text>`; }); });
  } else {
    const rodar = cats.length > 7; const L = 50, R = 10, T = 16 + legT, B = rodar ? 92 : 30; const bw = (W - L - R) / cats.length; const sb = Math.min(46, (bw * 0.7) / series.length); const Y = (v) => T + (1 - v / mx) * (H - T - B);
    for (let i = 0; i <= 4; i++) { const v = (mx * i) / 4; g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#E3E9E5" stroke-dasharray="${i ? '3 3' : ''}"/><text x="${L - 8}" y="${Y(v) + 3.5}" font-size="9.5" text-anchor="end" fill="#6B7B73">${esc_(f(v))}</text>`; }
    cats.forEach((c, i) => { const cx = L + i * bw + bw / 2;
      g += rodar ? `<text transform="translate(${cx},${H - B + 12}) rotate(-40)" font-size="9.5" text-anchor="end" fill="#13221B">${esc_(String(c).slice(0, 18))}</text>` : `<text x="${cx}" y="${H - 10}" font-size="10" text-anchor="middle" fill="#13221B">${esc_(String(c).slice(0, 16))}</text>`;
      const x0 = cx - (sb * series.length) / 2;
      series.forEach((s, j) => { const v = s.vals[i]; if (v == null) return; const x = x0 + j * sb; const y = Y(v); const hh = Y(0) - y; const r = Math.min(3, (sb - 2) / 2, hh);
        g += `<path d="M${x + 1},${Y(0)} V${y + r} Q${x + 1},${y} ${x + 1 + r},${y} H${x + sb - 1 - r} Q${x + sb - 1},${y} ${x + sb - 1},${y + r} V${Y(0)} Z" fill="${s.cores?.[i] || s.cor}"/>`;
        // valor em cada barra: por cima; com barras estreitas, na vertical
        const fs = series.length * cats.length <= 24 ? (series.length > 2 ? 8 : 9.5) : 7.5;
        g += sb >= 22 || series.length * cats.length <= 24 ? `<text x="${x + sb / 2}" y="${y - 4}" font-size="${fs}" font-weight="600" text-anchor="middle" fill="#13221B">${esc_(f(v))}</text>` : `<text transform="translate(${x + sb / 2 + 2.6},${y - 3}) rotate(-90)" font-size="${fs}" font-weight="600" text-anchor="start" fill="#13221B">${esc_(f(v))}</text>`; }); });
  }
  return g + '</svg>';
}

// mapa das escolas: só escolas dentro de Tete (ou do distrito), fundo só com os distritos de Tete e os nomes
function svgPontos({ escolas, W = 640, H = 460, corDe, fundo }) {
  const d3 = window.d3; if (!d3) return null;
  const base = fundo || S.limites;
  const dentro = (c) => c[0] > 29.8 && c[0] < 35.6 && c[1] > -18.2 && c[1] < -13.6 && (!fundo || fundo.features.filter((f) => f.properties?.__nivel !== 'posto').some((f) => d3.geoContains(f, c)));
  const pts = escolas.map((e) => ({ e, c: coordsEscola(e) })).filter((p) => p.c && dentro(p.c)); if (!pts.length) return null;
  const fc = { type: 'FeatureCollection', features: pts.map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p.c } })) };
  const proj = d3.geoMercator().fitExtent([[16, 16], [W - 16, H - 46]], base || fc); const path = d3.geoPath(proj);
  let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONTE_G}"><rect width="${W}" height="${H}" fill="#fff"/>`;
  const rot = [];
  if (base) for (const ft of base.features) { const posto = ft.properties?.__nivel === 'posto'; g += `<path d="${path(ft)}" fill="${posto ? 'none' : '#F2F6F3'}" stroke="${posto ? '#C98E00' : '#9DB2A6'}" stroke-width="${posto ? 0.7 : 1}" ${posto ? 'stroke-dasharray="3 2"' : ''}/>`;
    const nome = posto ? ft.properties?.__nome : ft.properties?.__cod ? distName(ft.properties.__cod) : null; if (nome) { const [cx, cy] = path.centroid(ft); rot.push(`<text x="${cx}" y="${cy}" font-size="${posto ? 8.5 : 9.5}" font-weight="${posto ? 400 : 700}" text-anchor="middle" fill="#4A5A52" paint-order="stroke" stroke="#fff" stroke-width="2.5" opacity=".9">${esc_(nome)}</text>`); } }
  const cats = new Map();
  for (const p of pts) { const [x, y] = proj(p.c); const [cor, nome] = corDe(p.e); cats.set(nome, cor); g += `<circle cx="${x}" cy="${y}" r="3.2" fill="${cor}" fill-opacity=".85" stroke="#fff" stroke-width=".6"/>`; }
  g += rot.join('');
  let lx = 14; for (const [n, c] of cats) { g += `<circle cx="${lx + 5}" cy="${H - 20}" r="5" fill="${c}"/><text x="${lx + 14}" y="${H - 16}" font-size="11" fill="#13221B">${esc_(n)}</text>`; lx += 28 + n.length * 6.5; }
  return g + '</svg>';
}

// ---------------- Alfabetização: com “Ambos”, cada número aparece em H, M e HM ----------------
async function alfaPainel(body, st) {
  const f = S.apf ||= { ano: 2024, dist: 'Todos', sexo: 'Ambos' };
  const amb = f.sexo === 'Ambos';
  const sx = (a) => (f.sexo === 'Homens' ? a[0] : f.sexo === 'Mulheres' ? a[1] : a[0] + a[1]);
  const N = (a) => (amb ? [h('td', { text: NF.format(a[0]) }), h('td', { text: NF.format(a[1]) }), h('td', { style: 'font-weight:700', text: NF.format(a[0] + a[1]) })] : [h('td', { text: NF.format(sx(a)) })]);
  const H3 = (t) => (amb ? [h('th', { class: 'grp', colspan: 3, text: t })] : [h('th', { text: t })]);
  const sub = (n) => (amb ? Array.from({ length: n }, () => [h('th', { text: 'H' }), h('th', { text: 'M' }), h('th', { text: 'HM' })]).flat() : []);
  const sel = (k, list, lab) => h('label', { class: 'f' }, lab, h('select', { onchange: (e) => { f[k] = e.target.value; go('alfa'); } }, list.map((o) => h('option', { value: o[0], text: o[1], selected: String(o[0]) === String(f[k]) }))));
  body.append(h('div', { class: 'card' }, h('div', { class: 'row' }, sel('ano', desc(ANOS_A).map((a) => [a, a]), 'Ano'), sel('dist', [['Todos', 'Província (todos)'], ...S.cod.distritos], 'Distrito'), sel('sexo', [['Ambos', 'Ambos (H, M e HM)'], ['Homens', 'Homens'], ['Mulheres', 'Mulheres']], 'Sexo'))));
  const box = h('div', { class: 'loading', text: 'A calcular…' }); body.append(box);
  const all = {}; for (const a of ANOS_A) all[a] = await alfaFichas(a, !!S.db);
  const { T, prog, niv } = alfaSum(all[+f.ano], f);
  const pr = (a, b) => (b ? P1.format(a / b) : '—');
  const det = (a) => (amb ? `H ${NF.format(a[0])} · M ${NF.format(a[1])}` : '');
  const kp = [['Inscritos em alfabetização', NF.format(sx(T.insA)), det(T.insA)], ['Inscritos na EPJA', NF.format(sx(T.insE)), det(T.insE)], ['Aprovação na alfabetização', pr(sx(T.apA), sx(T.fimA)), amb ? `H ${pr(T.apA[0], T.fimA[0])} · M ${pr(T.apA[1], T.fimA[1])}` : ''], ['Aprovação na EPJA', pr(sx(T.apE), sx(T.fimE)), amb ? `H ${pr(T.apE[0], T.fimE[0])} · M ${pr(T.apE[1], T.fimE[1])}` : ''], ['Centros com mapa de Março', NF.format(T.nM), ''], ['Alfabetizadores capacitados', pr(T.cap, T.cap + T.sem), '']];
  const tb = (obj, labels) => h('tbody', {}, labels.filter((l) => obj[l[0]]).map(([k, l]) => { const o = obj[k]; return h('tr', {}, h('td', { class: 'l', text: l }), ...N(o.ins), ...N(o.fim), ...N(o.ap), h('td', { text: pr(sx(o.ap), sx(o.fim)) })); }));
  const tbTot = (obj) => { const s = { ins: [0, 0], fim: [0, 0], ap: [0, 0] }; for (const o of Object.values(obj)) for (const k of ['ins', 'fim', 'ap']) { s[k][0] += o[k][0]; s[k][1] += o[k][1]; } return h('tfoot', {}, h('tr', {}, h('td', { text: 'Total' }), ...N(s.ins), ...N(s.fim), ...N(s.ap), h('td', { text: pr(sx(s.ap), sx(s.fim)) }))); };
  const head = () => h('thead', {}, h('tr', {}, h('th', { rowspan: amb ? 2 : 1, text: '' }), ...H3('Inscritos (Março)'), ...H3('No fim do ano'), ...H3('Aprovados'), h('th', { rowspan: amb ? 2 : 1, text: 'Aprovação' })), amb ? h('tr', {}, ...sub(3)) : null);
  const drows = S.cod.distritos.map(([dd, nm]) => { const x = alfaSum(all[+f.ano], { dist: dd }).T; return h('tr', {}, h('td', { class: 'l', text: nm }), ...N(x.insA), ...N(x.insE), h('td', { text: pr(sx(x.apA), sx(x.fimA)) }), h('td', { text: pr(sx(x.apE), sx(x.fimE)) }), h('td', { text: NF.format(x.nM) }), h('td', { text: NF.format(x.nF) }), h('td', { text: pr(x.cap, x.cap + x.sem) })); });
  const dtot = h('tfoot', {}, h('tr', {}, h('td', { text: 'Província' }), ...N(alfaSum(all[+f.ano], { dist: 'Todos' }).T.insA), ...N(alfaSum(all[+f.ano], { dist: 'Todos' }).T.insE), h('td', { colspan: 5 })));
  const serie = ANOS_A.filter((a) => all[a].size).map((a) => { const x = alfaSum(all[a], f).T; return h('tr', {}, h('td', { text: a }), ...N(x.insA), ...N(x.insE), ...N(x.fimA), h('td', { text: pr(sx(x.apA), sx(x.fimA)) }), ...N(x.fimE), h('td', { text: pr(sx(x.apE), sx(x.fimE)) })); });
  const r2 = amb ? 2 : 1;
  box.replaceWith(h('div', { style: 'display:flex;flex-direction:column;gap:16px' },
    h('div', { class: 'kpis' }, kp.map(([l, v_, d]) => h('div', { class: 'kpi' }, h('span', { class: 'l', text: l }), h('span', { class: 'v', text: v_ }), d ? h('span', { class: 'd', text: d }) : null))),
    +f.ano === 2023 ? h('p', { class: 'note', text: 'Em 2023 a base só tem o levantamento de fim do ano.' }) : null,
    h('div', { class: 'card' }, h('h2', { text: 'Alfabetização por programa' }), h('div', { class: 'tw' }, h('table', {}, head(), tb(prog, S.cod.programas), tbTot(prog)))),
    h('div', { class: 'card' }, h('h2', { text: 'EPJA por nível' }), h('div', { class: 'tw' }, h('table', {}, head(), tb(niv, S.cod.niveisEPJA), tbTot(niv)))),
    h('div', { class: 'card' }, h('h2', { text: `Distritos em ${f.ano}` }), h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { rowspan: r2, text: 'Distrito' }), ...H3('Inscritos alfab.'), ...H3('Inscritos EPJA'), ...['Aprovação alfab.', 'Aprovação EPJA', 'Centros (Março)', 'Centros (fim)', 'Alfabetizadores capacitados'].map((t) => h('th', { rowspan: r2, text: t }))), amb ? h('tr', {}, ...sub(2)) : null), h('tbody', {}, drows), dtot))),
    h('div', { class: 'card' }, h('h2', { text: 'Evolução' }), h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { rowspan: r2, text: 'Ano' }), ...H3('Inscritos alfab.'), ...H3('Inscritos EPJA'), ...H3('Fim alfab.'), h('th', { rowspan: r2, text: 'Aprovação alfab.' }), ...H3('Fim EPJA'), h('th', { rowspan: r2, text: 'Aprovação EPJA' })), amb ? h('tr', {}, ...sub(4)) : null), h('tbody', {}, serie))))));
}

// ---------------- códigos das escolas: procura por 90568, 0568, 09-0568 ou 090568 ----------------
const codFmt = (cod) => (String(cod).length === 5 && String(cod)[0] === '9' ? `09-${String(cod).slice(1)}` : String(cod));
function codBate(q, cod) {
  const d = String(q).replace(/\D/g, ''); if (!d) return false; const c = String(cod);
  const cands = new Set([d]); if (/^09\d{4}$/.test(d)) cands.add('9' + d.slice(2)); if (/^\d{4}$/.test(d)) cands.add('9' + d);
  return [...cands].some((x) => c === x || (x.length >= 3 && c.includes(x)));
}
const codDeTexto = (t) => { const d = String(t ?? '').replace(/\D/g, ''); if (/^09\d{4}$/.test(d)) return +('9' + d.slice(2)); if (/^9\d{4}$/.test(d)) return +d; if (/^\d{4}$/.test(d)) return +('9' + d); return d ? +d : null; };

// ---------------- propostas dos SDEJT (escolas e centros): a DPE revê, corrige e aprova ----------------
async function enviarProposta(obj, cod, dados, actual) {
  const id = Date.now() + '_' + Math.random().toString(36).slice(2, 6); const eu = meuDist();
  const nome = dados.nome || actual?.nome || '';
  const texto = `${cod ? 'Proposta de correcção' : 'Proposta de novo registo'} (${obj === 'escola' ? 'escola' : 'centro de alfabetização'}): ${nome}${cod ? ` (código ${obj === 'escola' ? codFmt(cod) : cod})` : ''}. Para rever em ${obj === 'escola' ? 'Escolas' : 'Alfabetização > Centros'}.`;
  await S.db.doc(`mensagens/${id}`).set({ id, tipo: 'proposta', obj, cod: cod || null, dados, texto, de: S.sessao.nome, deUtil: S.sessao.utilizador, deDist: eu, deLocal: S.sessao.local || '', para: 0, em: new Date().toISOString(), threadId: id, resolvido: null });
  await registar('proposta enviada à DPE', { alvo: nome }); toast('Proposta enviada à DPE. Fica registada nas Mensagens.'); syncAgora('mensagem');
}
function cartaoPropostas(obj) {
  if (!DESKTOP) return null;
  const dpe = ehDPE(); const eu = meuDist();
  const lista = (S.msgs || []).filter((m) => m.tipo === 'proposta' && m.obj === obj && !m.resolvido && (dpe || +m.deDist === eu));
  const feitas = (S.msgs || []).filter((m) => m.tipo === 'proposta' && m.obj === obj && m.resolvido && !dpe && +m.deDist === eu).slice(0, 5);
  if (!lista.length && !feitas.length) return null;
  const box = h('div');
  const CAMPOS = obj === 'escola' ? [['nome', 'Nome'], ['dist', 'Distrito', 'dist'], ['posto', 'Posto administrativo'], ['localidade', 'Localidade'], ['zip', 'ZIP'], ['tipo', 'Tipo', 'tipo'], ['abertura', 'Ano de abertura', 'n'], ['fecho', 'Ano de encerramento', 'n']]
    : [['nome', 'Nome do centro'], ['dist', 'Distrito', 'dist'], ['esc', 'Código da escola de apoio', 'n'], ['org', 'Entidade', 'org'], ['provedor', 'Provedor'], ['abertura', 'Ano de abertura', 'n'], ['fecho', 'Ano de encerramento', 'n']];
  const rever = (m) => {
    const f = { ...(m.dados || {}) };
    const campo = ([k, l, t]) => { let el;
      if (t === 'dist') el = h('select', { onchange: (e) => (f[k] = +e.target.value) }, S.cod.distritosTodos.map((d) => h('option', { value: d[0], text: d[1], selected: d[0] === +f[k] })));
      else if (t === 'tipo') el = h('select', { onchange: (e) => (f[k] = e.target.value) }, ['Pública', 'Privada', 'Comunitária'].map((x) => h('option', { text: x, selected: x === f[k] })));
      else if (t === 'org') el = h('select', { onchange: (e) => (f[k] = +e.target.value) }, S.cod.organ.map((o) => h('option', { value: o[0], text: o[1], selected: o[0] === +f[k] })));
      else { el = h('input', { type: t === 'n' ? 'number' : 'text', value: f[k] ?? '' }); el.oninput = () => (f[k] = t === 'n' ? (+el.value || null) : el.value); }
      return h('label', { class: 'f' }, l, el); };
    const fechar = async (estado) => { const em = new Date().toISOString(); const res = { ...m, resolvido: em, estado, em, resolvidoPor: S.sessao.nome }; await S.db.doc('mensagens/' + m.id).set(res);
      const i_ = (S.msgs || []).findIndex((x) => x.id === m.id); if (i_ >= 0) S.msgs[i_] = res; // o estado muda logo neste computador
      const id = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      await S.db.doc(`mensagens/${id}`).set({ id, tipo: 'resposta-proposta', texto: `${estado === 'aprovada' ? '✓ Proposta aprovada e gravada no cadastro' : '✗ Proposta recusada'}: ${m.texto.replace(/\. Para rever.*$/, '').replace(/^Proposta de [^:]*: /, '')}.${estado === 'aprovada' ? ' A alteração chega ao seu computador na próxima sincronização.' : ''}`, de: S.sessao.nome, deUtil: S.sessao.utilizador, deDist: 0, para: +m.deDist, paraUtil: m.deUtil || null, paraNome: m.de || null, em, threadId: m.threadId || m.id, replyTo: m.id });
      syncAgora('mensagem'); };
    box.replaceChildren(h('div', { class: 'card', style: 'background:var(--soft)' }, h('h3', { text: `Rever a proposta de ${m.de} (SDEJT ${distName(m.deDist)})` }), h('p', { class: 'note', text: 'Pode corrigir os campos antes de aprovar.' }),
      h('div', { class: 'row' }, CAMPOS.map(campo)),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', text: 'Aprovar e gravar', onclick: async () => {
        const col = obj === 'escola' ? 'escolas' : 'centros'; const atual = obj === 'escola' ? S.esc.get(+m.cod) : S.cen?.get(+m.cod);
        const cod = m.cod || (obj === 'escola' ? Math.max(...S.esc.keys()) + 1 : Math.max(0, ...S.cen.keys()) + 1);
        const rec = { ...(atual || {}), ...f, cod: +cod, dist: +f.dist, em: new Date().toISOString(), por: S.me?.id || null };
        await S.db.doc(`${col}/${cod}`).set(rec); if (obj === 'centro') { S.cenDb ||= new Map(); S.cenDb.set(+cod, rec); rebuildCentros(); }
        await fechar('aprovada'); await registar('proposta aprovada', { alvo: rec.nome }); toast('Aprovada e gravada.'); go(current);
      } }), h('button', { class: 'btn warn', text: 'Recusar', onclick: async () => { if (await confirmBox('Recusar esta proposta? O SDEJT recebe uma mensagem.', 'Recusar')) { await fechar('recusada'); go(current); } } }), h('button', { class: 'btn', text: 'Fechar', onclick: () => box.replaceChildren() }))));
  };
  return h('div', { class: 'card', style: 'border-left:4px solid var(--accent)' }, h('h2', { text: dpe ? `Propostas dos distritos por aprovar (${lista.length})` : 'As suas propostas à DPE' }),
    ...lista.map((m) => h('div', { class: 'row between' }, h('span', { text: `${new Date(m.em).toLocaleString('pt-PT')} · ${m.de} (${distName(m.deDist)}): ${m.texto.replace(/\. Para rever.*$/, '')}` }), dpe ? h('button', { class: 'btn sm primary', text: 'Rever', onclick: () => rever(m) }) : h('span', { class: 'pill warn', text: S.lastPush && m.em > S.lastPush ? 'Ainda não enviada: falta sincronizar' : 'Enviada · à espera da DPE' }))),
    ...feitas.map((m) => h('div', { class: 'row between' }, h('span', { text: m.texto.replace(/\. Para rever.*$/, '') }), h('span', { class: 'pill ' + (m.estado === 'aprovada' ? 'ok' : 'bad'), text: `${m.estado === 'aprovada' ? 'Aprovada' : 'Recusada'} pela DPE${m.resolvido ? ' em ' + new Date(m.resolvido).toLocaleDateString('pt-PT') : ''}` }))), box);
}

// ---------------- Escolas: só a DPE cria e altera; os SDEJT vêem e propõem ----------------
VIEWS.escolas = (v) => {
  const st = S.escView ||= { dist: 'Todos', q: '', posto: '', loc: '', tipo: 'Todos', estado: 'Todos', falta: '', ord: 'cod', dir: -1 };
  if (DESKTOP && !ehDPE() && meuDist() && st.dist === 'Todos') st.dist = String(meuDist());
  const dpe = !DESKTOP || ehDPE(); const podeEditar = !writeNote() && (!DESKTOP || (S.sessao?.perfil === 3 && dpe));
  const propor = DESKTOP && !dpe && (S.sessao?.perfil || 0) >= 2 && !writeNote();
  v.append(h('div', { class: 'row between' }, h('div', {}, h('h1', { text: 'Escolas' }), h('p', { class: 'lede', text: dpe ? 'Cadastro das escolas. Só a DPE cria e altera escolas. As propostas dos SDEJT aparecem aqui para rever e aprovar. O posto administrativo, a localidade, a ZIP e as coordenadas vêm da carta escolar e passam para o painel, as publicações e as exportações.' : 'Cadastro das escolas (só consulta). Para uma escola nova ou uma correcção, use “Propor”: a DPE recebe, revê e aprova.' })),
    h('div', { class: 'row' }, dpe && DESKTOP && S.sessao?.perfil === 3 ? h('button', { class: 'btn', text: 'Carta escolar e mapas…', title: 'A carta escolar, os limites e as coordenadas carregam-se em Administração > Configurações', onclick: () => { S.adm = { ...(S.adm || {}), tab: 'base' }; location.hash = '#admin'; } }) : null,
      h('button', { class: 'btn', text: 'Exportar a lista (Excel)', disabled: !S.downloads, onclick: () => exportarEscolas(filtrar()) }))));
  const opt = (val, txt, sel) => h('option', { value: val, text: txt, selected: String(val) === String(sel) });
  const distSel = h('select', { onchange: (e) => { st.dist = e.target.value; st.posto = ''; st.loc = ''; desenharFiltros(); draw(); } }, opt('Todos', 'Todos os distritos', st.dist), S.cod.distritos.map((d) => opt(d[0], d[1], st.dist)));
  const postoSel = h('select', { onchange: (e) => { st.posto = e.target.value; st.loc = ''; desenharFiltros(); draw(); } });
  const locSel = h('select', { onchange: (e) => { st.loc = e.target.value; draw(); } });
  const tipoSel = h('select', { onchange: (e) => { st.tipo = e.target.value; draw(); } }, ['Todos', 'Pública', 'Privada', 'Comunitária'].map((t) => opt(t, t === 'Todos' ? 'Todos os tipos' : t, st.tipo)));
  const estSel = h('select', { onchange: (e) => { st.estado = e.target.value; draw(); } }, [['Todos', 'Activas e encerradas'], ['activa', 'Só activas'], ['encerrada', 'Só encerradas']].map(([a, b]) => opt(a, b, st.estado)));
  const faltaSel = h('select', { onchange: (e) => { st.falta = e.target.value; draw(); } }, [['', 'Todas'], ['posto', 'Sem posto administrativo'], ['loc', 'Sem localidade'], ['zip', 'Sem ZIP'], ['coord', 'Sem coordenadas'], ['carta', 'Sem dados da carta escolar']].map(([a, b]) => opt(a, b, st.falta)));
  const q = h('input', { type: 'search', placeholder: 'Nome ou código (ex.: 09-0568)', value: st.q, oninput: (e) => { st.q = e.target.value; draw(); } });
  const base = () => [...S.esc.values()].filter((e) => !e.removida && (st.dist === 'Todos' || String(e.dist) === String(st.dist)));
  const desenharFiltros = () => {
    const ps = [...new Set(base().map((e) => e.posto).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
    if (st.posto && !ps.includes(st.posto)) st.posto = '';
    postoSel.replaceChildren(opt('', `Todos (${ps.length})`, st.posto), ...ps.map((p) => opt(p, p, st.posto)), opt('__sem', 'Sem posto indicado', st.posto));
    const ls = [...new Set(base().filter((e) => !st.posto || e.posto === st.posto).map((e) => e.localidade).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
    if (st.loc && !ls.includes(st.loc)) st.loc = '';
    locSel.replaceChildren(opt('', `Todas (${ls.length})`, st.loc), ...ls.map((p) => opt(p, p, st.loc)));
  };
  const filtrar = () => {
    let l = base();
    if (st.posto) l = l.filter((e) => (st.posto === '__sem' ? !e.posto : e.posto === st.posto));
    if (st.loc) l = l.filter((e) => e.localidade === st.loc);
    if (st.tipo !== 'Todos') l = l.filter((e) => (e.tipo || 'Pública') === st.tipo);
    if (st.estado === 'activa') l = l.filter((e) => !e.fecho); else if (st.estado === 'encerrada') l = l.filter((e) => e.fecho);
    if (st.falta === 'posto') l = l.filter((e) => !e.posto); else if (st.falta === 'loc') l = l.filter((e) => !e.localidade); else if (st.falta === 'zip') l = l.filter((e) => !e.zip);
    else if (st.falta === 'coord') l = l.filter((e) => !coordsEscola(e)); else if (st.falta === 'carta') l = l.filter((e) => !e.ce);
    const s = st.q.trim().toLowerCase(); if (s) l = l.filter((e) => e.nome.toLowerCase().includes(s) || codBate(s, e.cod));
    const val = (e) => (st.ord === 'cod' ? +e.cod : st.ord === 'dist' ? distName(e.dist) : st.ord === 'abertura' ? +e.abertura || 0 : String(e[st.ord] || ''));
    l.sort((a, b) => { const x = val(a), y = val(b); let c; if (typeof x === 'number') c = (x - y) * st.dir; else if (!x || !y) c = !x && !y ? 0 : !x ? 1 : -1; else c = x.localeCompare(y, 'pt') * st.dir; return c || +b.cod - +a.cod; });
    return l;
  };
  const tb = h('tbody'); const count = h('span', { class: 'note' }); const form = h('div'); const thr = h('tr');
  const COLS = [['cod', 'Código'], ['nome', 'Escola'], ['dist', 'Distrito'], ['posto', 'Posto administrativo'], ['localidade', 'Localidade'], ['zip', 'ZIP'], ['tipo', 'Tipo'], ['abertura', 'Abertura']];
  const draw = () => {
    const l = filtrar();
    const semPosto = l.filter((e) => !e.posto).length, semC = l.filter((e) => !coordsEscola(e)).length;
    count.textContent = `${NF.format(l.length)} escolas${semPosto ? ` · ${NF.format(semPosto)} sem posto` : ''}${semC ? ` · ${NF.format(semC)} sem coordenadas` : ''}`;
    thr.replaceChildren(...COLS.map(([k, t], i) => h('th', { class: (i ? 'l' : '') + (i > 2 && i < 6 ? ' hide-sm' : ''), 'aria-sort': st.ord === k ? (st.dir > 0 ? 'ascending' : 'descending') : null },
      h('button', { class: 'ord', title: 'Ordenar por esta coluna (clique outra vez para inverter)', onclick: () => { st.dir = st.ord === k ? -st.dir : k === 'cod' || k === 'abertura' ? -1 : 1; st.ord = k; draw(); } }, t, h('span', { class: 'seta', text: st.ord === k ? (st.dir > 0 ? ' ▲' : ' ▼') : ' ↕' })))), h('th', { text: 'Estado' }), h('th'));
    tb.replaceChildren(...l.slice(0, 2500).map((e) => h('tr', {}, h('td', { class: 'mono', text: codFmt(e.cod) }), h('td', { class: 'l', text: e.nome }), h('td', { class: 'l', text: distName(e.dist) }), h('td', { class: 'l hide-sm', text: e.posto || '—' }), h('td', { class: 'l hide-sm', text: e.localidade || '—' }), h('td', { class: 'l hide-sm', text: e.zip || '—' }), h('td', { class: 'l', text: e.tipo || 'Pública' }), h('td', { class: 'l', text: e.abertura || '' }),
      h('td', { text: e.fecho ? `Encerrada ${e.fecho}` : '' }), h('td', {}, h('button', { class: 'btn sm', text: podeEditar ? 'Editar' : propor ? 'Ver / propor' : 'Ver', onclick: () => editEscola(e, form, !podeEditar, propor) })))));
  };
  v.append(cartaoPropostas('escola'));
  desenharFiltros();
  v.append(h('div', { class: 'card' }, h('div', { class: 'row' }, h('label', { class: 'f' }, 'Distrito', distSel), h('label', { class: 'f' }, 'Posto administrativo', postoSel), h('label', { class: 'f' }, 'Localidade', locSel), h('label', { class: 'f' }, 'Tipo', tipoSel), h('label', { class: 'f' }, 'Estado', estSel), h('label', { class: 'f' }, 'Mostrar', faltaSel)),
    h('div', { class: 'row between' }, h('div', { class: 'row' }, h('label', { class: 'f', style: 'min-width:16rem' }, 'Procurar', q), count),
      podeEditar ? h('button', { class: 'btn primary', text: '+ Nova escola', onclick: () => editEscola(null, form, false, false) }) : propor ? h('button', { class: 'btn', text: '+ Propor escola nova à DPE', onclick: () => editEscola(null, form, true, true) }) : null), form,
    h('div', { class: 'tw tall' }, h('table', { class: 'ordenavel' }, h('thead', {}, thr), tb)),
    h('p', { class: 'note', text: 'Por defeito a lista vem pelo código, do maior para o menor. Clique no título de uma coluna para ordenar por ela. O código pode escrever-se 90568, 0568, 090568 ou 09-0568.' })));
  draw();
};
// lista de escolas para Excel, com o que veio da carta escolar (sem mexer na base Access)
async function exportarEscolas(l) {
  const linhas = l.map((e) => { const c = coordsEscola(e); const ce = e.ce || {};
    return { 'Código': codFmt(e.cod), 'Código (número)': +e.cod, Escola: e.nome, Distrito: distName(e.dist), 'Posto administrativo': e.posto || '', Localidade: e.localidade || '', Povoado: ce.povoado || '', ZIP: e.zip || '', Tipo: e.tipo || 'Pública', 'Ano de abertura': e.abertura || '', 'Ano de encerramento': e.fecho || '',
      Latitude: c ? +c[1].toFixed(6) : '', Longitude: c ? +c[0].toFixed(6) : '', 'Nível (carta)': ce.nivel || '', 'Água': ce.agua || '', Energia: ce.energia || '', Salas: ce.salas ?? '', Latrinas: ce.latrinas || '', 'Casa de banho': ce.casaBanho || '', 'Fonte da localização': ce.ficheiro ? 'Carta escolar: ' + ce.ficheiro : 'Base Access' }; });
  const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(linhas.length ? linhas : [{ 'Código': '' }]);
  ws['!cols'] = Object.keys(linhas[0] || { a: 1 }).map((k) => ({ wch: Math.min(42, Math.max(9, k.length + 2, ...linhas.slice(0, 300).map((r) => String(r[k] ?? '').length + 1))) }));
  ws['!autofilter'] = { ref: ws['!ref'] }; XLSX.utils.book_append_sheet(wb, ws, 'Escolas');
  await guardarXlsx(wb, `Escolas_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
function editEscola(e, box, ro, propor) {
  const novo = !e; const cod = e?.cod || Math.max(...S.esc.keys()) + 1;
  const f = { nome: e?.nome || '', dist: e?.dist || meuDist() || S.cod.distritos[0][0], posto: e?.posto || '', localidade: e?.localidade || '', zip: e?.zip || '', tipo: e?.tipo || 'Pública', abertura: e?.abertura || '', fecho: e?.fecho || '' };
  const roC = ro && !propor;
  const inp = (k, label, type = 'text') => { const el = h('input', { type, value: f[k] ?? '', disabled: roC }); el.oninput = () => (f[k] = el.value); return h('label', { class: 'f' }, label, el); };
  const dist = h('select', { disabled: roC || (propor && !!meuDist()), onchange: (ev) => (f.dist = +ev.target.value) }, S.cod.distritosTodos.map((d) => h('option', { value: d[0], text: d[1], selected: d[0] === +f.dist })));
  const tipo = h('select', { disabled: roC, onchange: (ev) => (f.tipo = ev.target.value) }, ['Pública', 'Privada', 'Comunitária'].map((t) => h('option', { text: t, selected: t === f.tipo })));
  const ce = e?.ce;
  box.replaceChildren(h('div', { class: 'card', style: 'background:var(--soft)' }, h('h3', { text: novo ? (propor ? 'Propor uma escola nova' : `Nova escola (código ${codFmt(cod)})`) : `${e.nome} (${codFmt(cod)})` }),
    h('div', { class: 'row' }, inp('nome', 'Nome da escola'), h('label', { class: 'f' }, 'Distrito', dist), inp('posto', 'Posto administrativo'), inp('localidade', 'Localidade'), inp('zip', 'ZIP'), h('label', { class: 'f' }, 'Tipo', tipo), inp('abertura', 'Ano de abertura', 'number'), inp('fecho', 'Ano de encerramento', 'number')),
    ce ? h('p', { class: 'note', text: `Carta escolar: ${[ce.povoado && 'povoado ' + ce.povoado, ce.nivel && 'nível ' + ce.nivel, ce.agua && 'água: ' + ce.agua, ce.energia && 'energia: ' + ce.energia, ce.salas != null && ce.salas + ' salas', ce.latrinas && 'latrinas: ' + ce.latrinas].filter(Boolean).join(' · ')}` }) : null,
    h('div', { class: 'row' }, propor ? h('button', { class: 'btn primary', text: novo ? 'Enviar a proposta à DPE' : 'Propor esta correcção à DPE', onclick: async () => { if (!f.nome.trim()) { toast('Escreva o nome da escola.'); return; } await enviarProposta('escola', novo ? null : cod, { nome: f.nome.trim(), dist: +f.dist, posto: f.posto || null, localidade: f.localidade || null, zip: f.zip || null, tipo: f.tipo, abertura: +f.abertura || null, fecho: +f.fecho || null }, e); box.replaceChildren(); } }) : null,
      ro ? null : h('button', { class: 'btn primary', text: 'Gravar escola', onclick: async () => {
        if (!f.nome.trim()) { toast('Escreva o nome da escola.'); return; }
        try { await S.db.doc(`escolas/${cod}`).set({ ...(S.escDb?.get(cod) || {}), cod, nome: f.nome.trim(), dist: +f.dist, posto: f.posto || null, localidade: f.localidade || null, zip: f.zip || null, tipo: f.tipo, abertura: +f.abertura || null, fecho: +f.fecho || null, em: new Date().toISOString(), por: S.me?.id || null }); toast('Escola gravada.'); box.replaceChildren(); } catch { toast('Não foi possível gravar a escola.'); }
      } }), h('button', { class: 'btn', text: 'Fechar', onclick: () => box.replaceChildren() }))));
}

// ---------------- carta escolar (Excel .xlsx/.xls ou CSV): actualiza distrito, posto, localidade, ZIP e coordenadas pelo código ----------------
async function importarCartaEscolar() {
  const f = await window.educstat.openFile(['xlsx', 'xls', 'csv']); if (!f) return;
  let wb;
  try {
    if (/\.csv$/i.test(f.nome)) { const b = new Uint8Array(f.dados); let t = new TextDecoder('utf-8', { fatal: true }); let txt; try { txt = t.decode(b); } catch { txt = new TextDecoder('windows-1252').decode(b); } wb = XLSX.read(txt.replace(/^﻿/, ''), { type: 'string', FS: (txt.split('\n')[0].match(/;/g) || []).length > (txt.split('\n')[0].match(/,/g) || []).length ? ';' : ',', raw: true }); }
    else wb = XLSX.read(new Uint8Array(f.dados), { type: 'array' });
  } catch (e) { toast('Não foi possível ler o ficheiro: ' + (e.message || e), 7000); return; }
  const ws = wb.Sheets[wb.SheetNames[0]]; const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
  const hi = aoa.findIndex((r) => r && r.some((c) => /cod.*esc/i.test(String(c ?? '')))); if (hi < 0) { toast('Não encontrei a coluna do código da escola (ex.: “Cod_Escol”).', 7000); return; }
  const cab = aoa[hi].map((c) => String(c ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''));
  const col = (...re) => cab.findIndex((c) => re.some((r) => r.test(c)));
  const C = { cod: col(/^cod.*esc/), dist: col(/^distrito$/), posto: col(/^posto/), loc: col(/^localidade/), pov: col(/^povoado/), zip: col(/^zip$/, /^zip/), lat: col(/^latitude/, /^lat$/, /^latdd$/, /^coordy$/, /^ycoord/, /^y$/), lon: col(/^longitude/, /^lon$/, /^long$/, /^longdd$/, /^coordx$/, /^xcoord/, /^x$/), gps: col(/^coordenadas$/, /^gps$/, /^coord$/, /^localizacaogps/), nivel: col(/^nivelensin/), tipoE: col(/^tipodeensino$|^dependencia/), agua: col(/^agua$/), energia: col(/^energia$/), salas: col(/^totalsala$/), latr: col(/^latrina$/), cb: col(/^casabanho$/), abert: col(/abertura|^anoabert/) };
  const num = (v) => { if (v == null || v === '') return null; const n = typeof v === 'number' ? v : +String(v).replace(/\s/g, '').replace(',', '.'); return Number.isFinite(n) ? n : null; };
  // coordenadas em graus decimais (com vírgula ou ponto) ou em graus, minutos e segundos (14°39'09"S)
  const grau = (v) => { if (v == null || v === '') return null; if (typeof v === 'number') return v; const t = String(v).trim();
    const m = t.match(/(-?\d+(?:[.,]\d+)?)\s*[°º:d ]\s*(\d+(?:[.,]\d+)?)?\s*['′:m ]?\s*(\d+(?:[.,]\d+)?)?\s*["″s]?\s*([NSEWO])?/i);
    if (m && (m[2] || m[4])) { const g_ = Math.abs(+m[1].replace(',', '.')) + (+(m[2] || '0').replace(',', '.')) / 60 + (+(m[3] || '0').replace(',', '.')) / 3600; return (/^-/.test(m[1]) || /[SWO]/i.test(m[4] || '')) ? -g_ : g_; }
    return num(t); };
  const parGPS = (v) => { const p = String(v ?? '').split(/[;,]\s+|\s{2,}|\s*\/\s*|;/).filter(Boolean); if (p.length < 2) return null; let a = grau(p[0]), b = grau(p[1]); if (a == null || b == null) return null; if (Math.abs(a) > Math.abs(b)) [a, b] = [b, a]; return [a, b]; };
  const txt = (v) => (v == null ? null : String(v).trim() || null);
  const mud = []; const naoEnc = []; let iguais = 0;
  for (const r of aoa.slice(hi + 1)) {
    if (!r || r[C.cod] == null) continue; const cod = codDeTexto(r[C.cod]); if (!cod) continue;
    const e = S.esc.get(cod); if (!e) { naoEnc.push(String(r[C.cod])); continue; }
    const nd = C.dist >= 0 ? distDeNome(r[C.dist]) : null;
    const novo = { dist: nd || e.dist, posto: C.posto >= 0 ? txt(r[C.posto]) || e.posto : e.posto, localidade: C.loc >= 0 ? txt(r[C.loc]) || e.localidade : e.localidade, zip: C.zip >= 0 ? txt(r[C.zip]) || e.zip || null : e.zip || null };
    let la = C.lat >= 0 ? grau(r[C.lat]) : null, lo = C.lon >= 0 ? grau(r[C.lon]) : null;
    if ((la == null || lo == null) && C.gps >= 0) { const g2 = parGPS(r[C.gps]); if (g2) [la, lo] = g2; }
    if (la != null && la > 13 && la < 18.5) la = -la; // Tete fica a sul do equador
    if (la != null && lo != null && la < -13 && la > -18.5 && lo > 29.5 && lo < 36) { novo.y = la; novo.x = lo; }
    if (C.abert >= 0 && !e.abertura && num(r[C.abert])) novo.abertura = num(r[C.abert]);
    const ce = { povoado: C.pov >= 0 ? txt(r[C.pov]) : null, nivel: C.nivel >= 0 ? txt(r[C.nivel]) : null, dependencia: C.tipoE >= 0 ? txt(r[C.tipoE]) : null, agua: C.agua >= 0 ? txt(r[C.agua]) : null, energia: C.energia >= 0 ? txt(r[C.energia]) : null, salas: C.salas >= 0 ? num(r[C.salas]) : null, latrinas: C.latr >= 0 ? txt(r[C.latr]) : null, casaBanho: C.cb >= 0 ? txt(r[C.cb]) : null, ficheiro: f.nome };
    const muda = ['dist', 'posto', 'localidade', 'zip', 'x', 'y', 'abertura'].filter((k) => novo[k] !== undefined && String(novo[k] ?? '') !== String(e[k] ?? ''));
    if (!muda.length) iguais++;
    mud.push({ e, novo, ce, muda });
  }
  // nomes uniformizados pela carta escolar: o mesmo posto ou localidade escrito de outra forma noutras escolas do distrito passa a ter a grafia da carta
  const canon = { posto: new Map(), localidade: new Map() };
  for (const { novo } of mud) for (const k of ['posto', 'localidade']) if (novo[k]) { const kk = novo.dist + '|' + normGeo(novo[k]); const m_ = canon[k].get(kk) || new Map(); m_.set(novo[k], (m_.get(novo[k]) || 0) + 1); canon[k].set(kk, m_); }
  const melhor = (k, dist, nome) => { if (!nome) return null; const n = normGeo(nome); let m_ = canon[k].get(dist + '|' + n);
    if (!m_ && n.length >= 5) for (const [kk, mm] of canon[k]) { const [d_, nn] = kk.split('|'); if (+d_ === +dist && lev(n, nn) <= 1) { m_ = mm; break; } }
    return m_ ? [...m_.entries()].sort((a, b) => b[1] - a[1])[0][0] : null; };
  const naCarta = new Set(mud.map((m) => m.e.cod)); let uniform = 0;
  for (const m of mud) for (const k of ['posto', 'localidade']) { const b = melhor(k, m.novo.dist, m.novo[k]); if (b && b !== m.novo[k]) { m.novo[k] = b; if (!m.muda.includes(k) && String(b) !== String(m.e[k] ?? '')) m.muda.push(k); } }
  const distsCarta = new Set(mud.map((m) => +m.novo.dist));
  for (const e of S.esc.values()) { if (naCarta.has(e.cod) || !distsCarta.has(+e.dist)) continue; const novo = { dist: e.dist, posto: e.posto, localidade: e.localidade, zip: e.zip || null }; const muda = [];
    for (const k of ['posto', 'localidade']) { const b = melhor(k, e.dist, e[k]); if (b && b !== e[k]) { novo[k] = b; muda.push(k); } }
    if (muda.length) { mud.push({ e, novo, ce: e.ce || null, muda, uniform: true }); uniform++; } }
  const comMud = mud.filter((m) => m.muda.length);
  const m = h('div', { class: 'modal' }, h('div', { style: 'max-width:56rem;max-height:86vh;overflow:auto' }, h('h2', { text: 'Actualizar o cadastro com a carta escolar' }),
    h('p', { text: `${f.nome}: ${NF.format(mud.length)} escolas reconhecidas pelo código; ${NF.format(comMud.length)} com alterações (${NF.format(iguais)} já iguais)${naoEnc.length ? `; ${NF.format(naoEnc.length)} códigos sem escola no cadastro` : ''}. O nome das escolas não é alterado.${uniform ? ` Além disso, ${NF.format(uniform)} escolas que não estão no ficheiro ficam com o posto ou a localidade escritos como na carta.` : ''}` }),
    h('div', { class: 'tw', style: 'max-height:46vh' }, h('table', {}, h('thead', {}, h('tr', {}, ['Código', 'Escola', 'Distrito', 'Posto', 'Localidade', 'ZIP', 'Muda'].map((t) => h('th', { class: 'l', text: t })))),
      h('tbody', {}, comMud.slice(0, 300).map(({ e, novo, muda }) => h('tr', {}, h('td', { class: 'mono', text: codFmt(e.cod) }), h('td', { class: 'l', text: e.nome }), h('td', { class: 'l', text: distName(novo.dist) + (muda.includes('dist') ? ' ◄' : '') }), h('td', { class: 'l', text: (novo.posto || '—') + (muda.includes('posto') ? ' ◄' : '') }), h('td', { class: 'l', text: (novo.localidade || '—') + (muda.includes('localidade') ? ' ◄' : '') }), h('td', { class: 'l', text: (novo.zip || '—') + (muda.includes('zip') ? ' ◄' : '') }), h('td', { class: 'l', text: muda.join(', ').replace('x', 'coordenadas').replace(', y', '') })))))),
    naoEnc.length ? h('p', { class: 'note', text: 'Códigos sem escola no cadastro: ' + naoEnc.slice(0, 40).join(', ') + (naoEnc.length > 40 ? '…' : '') }) : null,
    h('div', { class: 'row', style: 'justify-content:flex-end' }, h('button', { class: 'btn', text: 'Cancelar', onclick: () => m.remove() }),
      h('button', { class: 'btn primary', text: `Aplicar a ${NF.format(mud.length)} escolas`, onclick: async () => {
        const em = new Date().toISOString(); let n = 0;
        for (const { e, novo, ce } of mud) { await S.db.doc(`escolas/${e.cod}`).set({ ...(S.escDb?.get(e.cod) || {}), cod: e.cod, nome: e.nome, tipo: e.tipo, abertura: e.abertura ?? null, fecho: e.fecho ?? null, x: e.x ?? null, y: e.y ?? null, ...novo, ce, em, por: S.me?.id || null }); if (++n % 100 === 0) await new Promise((r) => setTimeout(r, 0)); }
        await registar('cadastro actualizado com a carta escolar', { n, ficheiro: f.nome }); await marcarFicheiroBase('carta', { ficheiro: f.nome, n }); m.remove(); toast(`${NF.format(n)} escolas actualizadas com a carta escolar.`, 6000); go(current);
      } }))));
  document.body.append(m);
}

async function editarMsg(m) {
  const ta = h('textarea', { rows: 4, style: 'width:100%;font:inherit;padding:8px;border:1px solid var(--input-line);border-radius:8px' }); ta.value = m.texto;
  const md = h('div', { class: 'modal' }, h('div', {}, h('h2', { text: 'Editar a mensagem' }), h('p', { class: 'note', text: 'Só pode editar nos primeiros 15 minutos depois de enviar.' }), ta,
    h('div', { class: 'row', style: 'justify-content:flex-end' }, h('button', { class: 'btn', text: 'Cancelar', onclick: () => md.remove() }), h('button', { class: 'btn primary', text: 'Gravar', onclick: async () => {
      if (Date.now() - new Date(m.enviada || m.em).getTime() > 15 * 60 * 1000) { toast('Já passaram 15 minutos: a mensagem já não pode ser editada.'); md.remove(); return; }
      const t = ta.value.trim(); if (!t) return; const em = new Date().toISOString();
      await S.db.doc('mensagens/' + m.id).set({ ...m, texto: t, enviada: m.enviada || m.em, editada: em, historico: [...(m.historico || []), { texto: m.texto, em: m.editada || m.enviada || m.em }], em });
      md.remove(); syncAgora('mensagem');
    } }))));
  document.body.append(md); ta.focus();
}
async function apagarMsg(m) {
  const admDPE = ehDPE() && S.sessao?.perfil === 3;
  if (!admDPE && Date.now() - new Date(m.enviada || m.em).getTime() > 15 * 60 * 1000) { toast('Já passaram 15 minutos: só a DPE pode apagar esta mensagem.'); return; }
  if (!(await confirmBox('Apagar esta mensagem? Fica “Mensagem apagada” na conversa e o texto fica registado para a DPE.', 'Apagar'))) return;
  const em = new Date().toISOString();
  await S.db.doc('mensagens/' + m.id).set({ ...m, enviada: m.enviada || m.em, textoOriginal: m.texto, texto: '', apagada: em, apagadaPor: S.sessao.nome, em });
  await registar('mensagem apagada', { alvo: m.texto.slice(0, 200) }); syncAgora('mensagem');
}

// ---------------- tranca automática dos levantamentos ----------------
// data de referência de cada levantamento; os SDEJT podem alterar até 3 meses depois, a DPE até 6 meses
const DATA_LEV = { marco: [3, 3], fim: [12, 26], alfa_marco: [4, 30], alfa_fim: [12, 17] };
function somaMeses(iso, n) { const d = new Date(iso + 'T12:00:00Z'); const dia = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); const ult = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); d.setUTCDate(Math.min(dia, ult)); return d.toISOString().slice(0, 10); }
function limiteAuto(ano, lev) {
  const r = DATA_LEV[lev]; if (!r || !+ano) return null;
  const base = `${ano}-${String(r[0]).padStart(2, '0')}-${String(r[1]).padStart(2, '0')}`;
  const cf = S.trancas?.__auto || {}; if (cf.activo === false) return null;
  // a DPE pode fixar uma data-limite própria para um levantamento (prolongar ou encurtar), em vez dos meses gerais
  const fx = cf.datas?.[`${ano}_${lev}`]; const dpe = somaMeses(base, +cf.mesesDPE || 6);
  return { base, dist: fx || somaMeses(base, +cf.mesesDist || 3), dpe: fx && fx > dpe ? fx : dpe, fixa: !!fx };
}
// cartão na DPE: períodos da tranca automática e reabrir todos os distritos de uma vez
function cartaoTrancaAuto(ano) {
  const cf = { activo: true, mesesDist: 3, mesesDPE: 6, ...(S.trancas?.__auto || {}) };
  const act = h('input', { type: 'checkbox', checked: cf.activo !== false });
  const md = h('input', { type: 'number', min: 1, max: 24, value: cf.mesesDist, style: 'width:5rem' }), mp = h('input', { type: 'number', min: 1, max: 36, value: cf.mesesDPE, style: 'width:5rem' });
  const lin = LEV_TRANCA.map(([k, l]) => { const lm = limiteAuto(ano, k);
    const dt = h('input', { type: 'date', value: (S.trancas?.__auto?.datas || {})[`${ano}_${k}`] || '', title: 'Data-limite própria para os SDEJT neste levantamento (vazio = usar os meses)', onchange: async (e) => { const a = (S.trancas.__auto ||= { activo: true, mesesDist: 3, mesesDPE: 6 }); a.datas ||= {}; if (e.target.value) a.datas[`${ano}_${k}`] = e.target.value; else delete a.datas[`${ano}_${k}`]; await S.db.doc('config/trancas').set(S.trancas); await registar('data-limite alterada', { ano, lev: k, alvo: e.target.value || 'meses gerais' }); toast('Gravado. Segue para os distritos na sincronização.'); go('admin'); } });
    return h('tr', {}, h('td', { class: 'l', text: l }), h('td', { text: lm ? dataPT(lm.base) : '—' }), h('td', {}, lm ? dataPT(lm.dist) : '—', lm?.fixa ? h('small', { style: 'display:block;color:var(--accent)', text: 'data fixada' }) : null), h('td', { text: lm ? dataPT(lm.dpe) : '—' }), h('td', {}, dt),
    h('td', {}, h('button', { class: 'btn sm', text: 'Reabrir todos os distritos', title: 'Volta a permitir alterações em todos os distritos neste levantamento (fica registado)', onclick: async () => { if (!(await confirmBox(`Reabrir ${l} ${ano} em todos os distritos? Os SDEJT e a DPE voltam a poder alterar até nova tranca.`, 'Reabrir'))) return; for (const [d] of S.cod.distritosTodos) await gravarTranca(ano, k, d, 'aberto'); toast('Reaberto em todos os distritos.'); go('admin'); } }))); });
  return h('div', { class: 'card' }, h('h2', { text: 'Tranca automática depois de cada levantamento' }),
    h('p', { class: 'note', text: 'Resumo: cada levantamento fecha sozinho para os SDEJT depois dos meses indicados (ou na data-limite própria que escolher na tabela). Para abrir de novo um ou vários distritos, use “Reabrir” na tabela de cima, ou “Reabrir os marcados”. Os SDEJT só alteram os dados durante alguns meses depois da data do levantamento (3 de Março, 26 de Dezembro, 30 de Abril e 17 de Dezembro na alfabetização). A DPE durante mais algum tempo. Depois disso tudo fica só para consulta, a não ser que a DPE reabra.' }),
    h('div', { class: 'row' }, h('label', { class: 'chk' }, act, 'Tranca automática activa'), h('label', { class: 'f' }, 'Meses para os SDEJT', md), h('label', { class: 'f' }, 'Meses para a DPE', mp),
      h('button', { class: 'btn primary', text: 'Gravar', onclick: async () => { S.trancas.__auto = { activo: act.checked, mesesDist: +md.value || 3, mesesDPE: +mp.value || 6 }; await S.db.doc('config/trancas').set(S.trancas); await registar('tranca automática alterada', S.trancas.__auto); toast('Gravado.'); go('admin'); } })),
    h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Levantamento ' + ano, 'Data', 'Fecha para os SDEJT', 'Fecha para a DPE', 'Data-limite própria (opcional)', ''].map((t, i) => h('th', { class: i ? '' : 'l', text: t })))), h('tbody', {}, lin))));
}

// =====================================================================
// 1.6: actualizar/sincronizar em qualquer ecrã, configurações da DPE no distrito, filtros do painel
// =====================================================================
ICON.actualizar = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12A9 9 0 0 1 18.5 5.8L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/></svg>';
// botão do topo: envia e recebe o que houver no servidor e volta a desenhar o ecrã actual com os dados mais recentes
async function actualizarTudo() {
  const b = document.getElementById('ib-actualizar'); if (b?.classList.contains('gira')) return; b?.classList.add('gira');
  try {
    const sv = await window.educstat.servidor('estado').catch(() => null);
    if (sv?.email) { SYNC.falhas = 0; await syncAgora('manual'); }
    await carregarTrancas(); try { rebuildEscolas(); } catch {}
    if (current === 'lancar' && S.dirty) drawLancarStatus(); else go(current || 'inicio');
    toast(sv?.email ? (SYNC.estado === 'sincronizado' ? `Actualizado e sincronizado às ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}.` : `Ecrã actualizado. A sincronização falhou: ${SYNC.erro || 'sem ligação ao servidor'}.`) : 'Ecrã actualizado com os dados deste computador (a sincronização online não está configurada).', 5000);
  } finally { b?.classList.remove('gira'); }
}

// no distrito: o que a DPE definiu e chegou pela sincronização (prazos, trancas, privilégios)
function cartaoConfigDPE() {
  const meu = +(S.inst?.dist || S.sessao?.dist || 0); if (!meu) return null;
  const anos = desc(ANOS.filter((a) => a <= ANO_MAX_DADOS + 1)).slice(0, 3);
  const au = { activo: true, mesesDist: 3, mesesDPE: 6, ...(S.trancas?.__auto || {}) };
  const linhas = [];
  for (const a of anos) for (const [k, l] of LEV_TRANCA) {
    const e = estadoTranca(a, k, meu); const af = autoFechado(a, k, meu); const lim = af.lim;
    const est = e.estado === 'harmonizado' ? ['ok', 'Harmonizado pela DPE'] : e.estado === 'trancado' ? ['warn', e.porPrazo ? 'Fechado (prazo)' : 'Trancado pela DPE'] : af.dist ? ['warn', 'Fechado (automático)'] : af.reab ? ['ok', 'Reaberto pela DPE'] : ['', 'Aberto'];
    linhas.push(h('tr', {}, h('td', { class: 'l', text: `${l} ${a}` }), h('td', { class: 'l' }, h('span', { class: 'pill ' + est[0], text: est[1] })), h('td', { class: 'l', text: lim ? dataPT(lim.dist) : '—' }), h('td', { class: 'l', text: S.trancas?.[`${a}_${k}`]?.prazo ? dataPT(S.trancas[`${a}_${k}`].prazo) : '—' })));
  }
  const pv = S.privilegios?.[meu] || {};
  const recebido = [S.trancas?.em, S.privilegios?.em, S.publicacao?.em].filter(Boolean).sort().pop();
  return h('div', { class: 'card', style: 'border-left:4px solid var(--brand)' }, h('h2', { text: 'Configurações recebidas da DPE' }),
    h('p', { class: 'note', text: `O que a DPE definiu para ${distName(meu)} e chegou a este computador pela sincronização${recebido ? ` (última alteração recebida em ${new Date(recebido).toLocaleString('pt-PT')})` : ''}. Se a DPE mudou alguma coisa e não aparece aqui, carregue no botão de actualizar do topo.` }),
    h('div', { class: 'row' }, h('span', { class: 'pill', text: au.activo === false ? 'Tranca automática desligada' : `Tranca automática: ${au.mesesDist} meses para os SDEJT, ${au.mesesDPE} para a DPE` }),
      h('span', { class: 'pill ' + (pv.utilizadores ? 'ok' : ''), text: pv.utilizadores ? 'Pode gerir os utilizadores do distrito' : 'Utilizadores definidos pela DPE' }),
      ...Object.keys(S.publicacao?.anos || {}).map((a) => h('span', { class: 'pill ok', text: `${a} publicado` }))),
    h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Levantamento', 'Estado', 'Alterações até', 'Prazo da DPE'].map((t) => h('th', { class: 'l', text: t })))), h('tbody', {}, linhas))));
}
const adminSyncBase = adminSync;
adminSync = async function (body) { if (!ehDPE()) body.append(cartaoConfigDPE()); return adminSyncBase(body); };

// ---------------- Painel: intervalo de anos, posto administrativo, localidade e classe ----------------
// com posto ou localidade escolhidos, o painel recalcula-se só com os mapas dessas escolas (no distrito escolhido)
S.rFiltro = new Map();
async function prepararFiltroLocal(f, anos) {
  if (!(f.posto || f.loc) || f.dist === 'Todos') return;
  const ver = [...S.dbFichas.entries()].filter(([k]) => k.endsWith('_' + f.dist)).map(([, m]) => { let x = ''; for (const y of m.values()) if ((y.em || '') > x) x = y.em; return m.size + x; }).join(',') + '|' + S.esc.size;
  const chave = `${f.dist}|${f.posto || ''}|${f.loc || ''}|${ver}`;
  if (S.rFiltroChave === chave) return; S.rFiltro = new Map();
  const ok = (cod) => { const e = S.esc.get(+cod); return e && (!f.posto || e.posto === f.posto) && (!f.loc || e.localidade === f.loc); };
  for (const a of anos) {
    const fm = await fichasEfectivas(a, +f.dist); const fs = [...fm.values()].filter((x) => ok(x.esc)); if (!fs.length) continue;
    const r = window.EAgg.resumo(fs, escolaTipo, formados()); r.estado = Object.fromEntries(fs.map((x) => [x.esc, { m: true, f: !!x.fim?.aprov?.length }])); S.rFiltro.set(`${a}_${f.dist}`, r);
  }
  S.rFiltroChave = chave;
}
sumUp = function (ano, f) {
  const dists = f.dist === 'Todos' ? S.cod.distritos.map((d) => d[0]) : [+f.dist];
  if (f.dist === 'Todos' && dists.some((d) => !visivel(ano, d))) return null;
  // com posto/localidade: o distrito escolhido usa o cálculo filtrado; os outros distritos ficam sem valor (não há como comparar)
  const local = (f.posto || f.loc) && f.dist !== 'Todos';
  return sumUpRs(dists.map((d) => (local ? (String(d) === String(S.pf.dist) ? S.rFiltro.get(`${ano}_${d}`) || null : null) : resumoDe(ano, d))), ano, f);
};
const painelBase = VIEWS.painel;
VIEWS.painel = async (v) => {
  const f = S.pf;
  const todos = ANOS.filter((a) => S.cod.distritos.some((d) => resumoDe(a, d[0])));
  if (f.dist === 'Todos') { f.posto = ''; f.loc = ''; }
  const de = +f.de || todos[0], ate = +f.ate || todos[todos.length - 1];
  const faixa = todos.filter((a) => a >= Math.min(de, ate) && a <= Math.max(de, ate));
  if (f.posto || f.loc) { v.append(h('div', { class: 'loading', text: 'A calcular os indicadores do posto administrativo / localidade…' })); await prepararFiltroLocal(f, faixa); v.replaceChildren(); }
  const guarda = [...ANOS]; ANOS.length = 0; ANOS.push(...(faixa.length ? faixa : guarda));
  try { painelBase(v); } finally { ANOS.length = 0; ANOS.push(...guarda); }
  // filtros novos, na mesma caixa dos outros
  const linha = v.querySelector('.card .row'); if (!linha) return;
  const opt = (val, txt, sel) => h('option', { value: val, text: txt, selected: String(val) === String(sel ?? '') });
  const mk = (lab, list, k, extra) => h('label', { class: 'f' }, lab, h('select', { onchange: (e) => { f[k] = e.target.value; if (extra) extra(); go('painel'); } }, list));
  const escD = f.dist === 'Todos' ? [] : [...S.esc.values()].filter((e) => +e.dist === +f.dist);
  const postos = [...new Set(escD.map((e) => e.posto).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
  const locs = [...new Set(escD.filter((e) => !f.posto || e.posto === f.posto).map((e) => e.localidade).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt'));
  const cls = f.nivel === 'EP' ? [1, 2, 3, 4, 5, 6, 7] : f.nivel === 'ESG1' ? [7, 8, 9, 10] : f.nivel === 'ESG2' ? [11, 12] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const novos = h('div', { class: 'row', style: 'margin-top:6px' },
    mk('Desde', desc(todos).map((a) => opt(a, a, de)), 'de'), mk('Até', desc(todos).map((a) => opt(a, a, ate)), 'ate'),
    f.dist === 'Todos' ? h('span', { class: 'note', style: 'align-self:center', text: 'Escolha um distrito para filtrar por posto administrativo ou localidade.' })
      : [mk('Posto administrativo', [opt('', `Todos (${postos.length})`, f.posto), ...postos.map((p) => opt(p, p, f.posto))], 'posto', () => { f.loc = ''; S.rFiltroChave = null; }),
        mk('Localidade', [opt('', `Todas (${locs.length})`, f.loc), ...locs.map((p) => opt(p, p, f.loc))], 'loc', () => { S.rFiltroChave = null; })],
    mk('Classe', [opt('', 'Todas as classes', f.classe), ...cls.map((c) => opt(c, `${c}ª classe`, f.classe))], 'classe'),
    (f.posto || f.loc || f.classe || f.de || f.ate) ? h('button', { class: 'btn sm', style: 'align-self:flex-end', text: 'Limpar estes filtros', onclick: () => { f.posto = ''; f.loc = ''; f.classe = ''; f.de = ''; f.ate = ''; go('painel'); } }) : null);
  linha.after(novos);
  if (f.classe) novos.after(h('p', { class: 'note', text: `Só a ${f.classe}ª classe: os indicadores de professores, escolas e salas não se dividem por classe e aparecem com traço.` }));
  if (f.posto || f.loc) novos.after(h('p', { class: 'pill', text: `Indicadores calculados só com as escolas de ${[f.loc && 'localidade ' + f.loc, f.posto && 'posto administrativo ' + f.posto].filter(Boolean).join(', ')} (${distName(f.dist)}), segundo o cadastro e a carta escolar.` }));
};

// ---------------- capa moderna: silhueta do distrito (ou da província) e faixa com as cores da bandeira ----------------
function arteCapa(geo) {
  const out = { mapa: null, faixa: null };
  // faixa geométrica do fundo da capa (verde e ouro da DPE, com um fio nas cores da bandeira)
  const W = 794, H = 118;
  out.faixa = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>
    <polygon points="0,${H} 0,46 ${W * 0.62},${H}" fill="#0A6B45"/><polygon points="0,46 0,24 ${W * 0.78},${H} ${W * 0.62},${H}" fill="#0E8A5A" opacity=".9"/>
    <polygon points="${W},${H} ${W},20 ${W * 0.46},${H}" fill="#C98E00"/><polygon points="${W},20 ${W},4 ${W * 0.36},${H} ${W * 0.46},${H}" fill="#E0AE2A" opacity=".85"/>
    <rect x="0" y="${H - 7}" width="${W / 5}" height="7" fill="#009739"/><rect x="${W / 5}" y="${H - 7}" width="${W / 5}" height="7" fill="#fff"/><rect x="${(2 * W) / 5}" y="${H - 7}" width="${W / 5}" height="7" fill="#000"/><rect x="${(3 * W) / 5}" y="${H - 7}" width="${W / 5}" height="7" fill="#FCE100"/><rect x="${(4 * W) / 5}" y="${H - 7}" width="${W / 5}" height="7" fill="#D21034"/></svg>`;
  const d3 = window.d3; if (!d3 || !geo) return out;
  const MW = 520, MH = 300;
  const todos = S.limites?.features || [];
  const sel = geo.prov ? todos : todos.filter((f) => codDistritoGeo(f, S.limitesCampo) === +geo.dist);
  const escolas = [...S.esc.values()].filter((e) => !e.fecho && !e.removida && (geo.prov || +e.dist === +geo.dist)).map(coordsEscola).filter(Boolean);
  if (!sel.length && !escolas.length) return out;
  const alvo = sel.length ? { type: 'FeatureCollection', features: sel } : { type: 'FeatureCollection', features: escolas.map((c) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c } })) };
  const proj = d3.geoMercator().fitExtent([[10, 10], [MW - 10, MH - 10]], alvo); const path = d3.geoPath(proj);
  let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MW} ${MH}" width="${MW}" height="${MH}"><rect width="${MW}" height="${MH}" fill="#fff"/>`;
  // vizinhos (só no distrito), muito claros, para dar contexto
  if (!geo.prov) for (const f of todos) if (!sel.includes(f)) g += `<path d="${path(f)}" fill="#F4F7F5" stroke="#DCE5DF" stroke-width=".8"/>`;
  for (const f of sel) g += `<path d="${path(f)}" fill="#E3F0E8" stroke="#0A6B45" stroke-width="1.6" stroke-linejoin="round"/>`;
  if (geo.tipo === 'carta' || !sel.length) for (const c of escolas) { const p = proj(c); if (p && p[0] > 0 && p[0] < MW && p[1] > 0 && p[1] < MH) g += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${geo.prov ? 1.6 : 2.6}" fill="#C98E00" fill-opacity=".85"/>`; }
  else if (geo.prov) for (const f of sel) { const [cx, cy] = path.centroid(f); const n = distName(codDistritoGeo(f, S.limitesCampo)); if (n && n !== '—') g += `<text x="${cx}" y="${cy}" font-size="9" text-anchor="middle" fill="#0A6B45" font-family="Arial" opacity=".8">${esc_(n)}</text>`; }
  out.mapa = g + '</svg>';
  return out;
}

// =====================================================================
// Administração > Configurações: tudo o que a DPE carrega uma vez e segue para todos os computadores
// =====================================================================
async function marcarFicheiroBase(tipo, info) {
  const d = (await S.db.doc('config/ficheirosBase').get()).data() || { ultimo: {}, hist: [] };
  const reg = { tipo, ...info, em: new Date().toISOString(), por: S.sessao?.nome || S.sessao?.utilizador || '' };
  d.ultimo = { ...(d.ultimo || {}), [tipo]: reg }; d.hist = [reg, ...(d.hist || [])].slice(0, 60);
  await S.db.doc('config/ficheirosBase').set(d);
}
async function carregarLimitesS() {
  if (S.limites !== undefined) return;
  const l = (await S.db.doc('config/limites').get()).data(); S.limites = l?.geojson ? JSON.parse(l.geojson) : null; S.limitesSobra = l?.sobra ? JSON.parse(l.sobra) : [];
  if (S.limites) { for (const f of S.limites.features) rebobinar(f); S.limites.features = S.limites.features.filter(NA_TETE); S.limitesSobra = S.limitesSobra.filter(NA_TETE); }
  S.limitesCampo = l?.campo || null; S.limitesInfo = l?.info || '';
  const lp = (await S.db.doc('config/limitesPostos').get()).data(); S.limitesPostos = lp?.geojson ? JSON.parse(lp.geojson) : null; if (S.limitesPostos) for (const f of S.limitesPostos.features) rebobinar(f);
  const ll = (await S.db.doc('config/limitesLocalidades').get()).data(); S.limitesLocalidades = ll?.geojson ? JSON.parse(ll.geojson) : null; if (S.limitesLocalidades) for (const f of S.limitesLocalidades.features) rebobinar(f);
}
// grafias diferentes do mesmo posto ou localidade no mesmo distrito (Fíngoé / Fíngoè, Malowera / Molowera)
function variantesNomes(campo) {
  const grupos = [];
  for (const [d] of S.cod.distritosTodos) {
    const cont = new Map(); for (const e of S.esc.values()) if (+e.dist === d && e[campo] && !e.fecho) cont.set(e[campo], (cont.get(e[campo]) || 0) + 1);
    const nomes = [...cont.keys()]; const usado = new Set();
    for (const a of nomes) { if (usado.has(a)) continue; const na = normGeo(a.replace(/\(.*\)/, ''));
      const g = nomes.filter((b) => !usado.has(b) && (b === a || (() => { const nb = normGeo(b.replace(/\(.*\)/, '')); return nb === na || (na.length >= 5 && lev(na, nb) <= 1); })()));
      if (g.length > 1) { g.forEach((x) => usado.add(x)); grupos.push({ dist: d, campo, nomes: g.sort((x, y) => cont.get(y) - cont.get(x)), cont }); } }
  }
  return grupos;
}
async function adminBase(body) {
  await carregarLimitesS();
  const fb = (await S.db.doc('config/ficheirosBase').get()).data() || { ultimo: {}, hist: [] }; const U = fb.ultimo || {};
  const escs = [...S.esc.values()].filter((e) => !e.fecho && !e.removida);
  const nCarta = escs.filter((e) => e.ce).length, nPosto = escs.filter((e) => e.posto).length, nCoord = escs.filter((e) => coordsEscola(e)).length;
  const est = (ok, txt) => h('span', { class: 'pill ' + (ok ? 'ok' : 'warn'), text: txt });
  const quando = (k) => (U[k] ? `${U[k].ficheiro || ''} · ${new Date(U[k].em).toLocaleDateString('pt-PT')} · ${U[k].por || ''}` : 'ainda não carregado aqui');
  body.append(h('div', { class: 'card', style: 'border-left:4px solid var(--accent)' }, h('h2', { text: 'Configurações: preparar o sistema' }),
    h('p', { text: 'Estes ficheiros carregam-se uma vez, na DPE. Depois seguem sozinhos para todos os SDEJT na sincronização (com internet). Os distritos não precisam de fazer nada: as publicações, o painel e as listas de escolas passam a usar os mesmos limites, os mesmos postos e localidades e as mesmas coordenadas.' }),
    h('ol', { class: 'base-passos' },
      h('li', {}, h('b', { text: 'Carta escolar' }), ' (Excel ou CSV, uma linha por escola): actualiza o posto administrativo, a localidade, a ZIP, as coordenadas e as condições das escolas, pelo código. O nome das escolas e os dados da base Access não mudam. ', est(nCarta > escs.length * 0.8, `${NF.format(nCarta)} de ${NF.format(escs.length)} escolas com carta`), h('small', { style: 'display:block;color:var(--muted)', text: 'Último: ' + quando('carta') })),
      h('li', {}, h('b', { text: 'Limites dos distritos' }), ' (shapefile .shp/.zip ou GeoJSON). Pode ser o do país inteiro: o programa fica só com Tete. Depois confira a tabela de correspondência. ', est(!!S.limites, S.limites ? `${S.limites.features.length} distritos` : 'sem limites'), h('small', { style: 'display:block;color:var(--muted)', text: 'Último: ' + quando('limites_distritos') })),
      h('li', {}, h('b', { text: 'Limites dos postos administrativos' }), ' (opcional, mesmo formato), para os mapas por posto. ', est(!!S.limitesPostos, S.limitesPostos ? `${S.limitesPostos.features.length} postos` : 'sem postos'), h('small', { style: 'display:block;color:var(--muted)', text: 'Último: ' + quando('limites_postos') })),
      h('li', {}, h('b', { text: 'Coordenadas avulsas' }), ' (Excel com CodEscola, Latitude e Longitude), só para as escolas que a carta não trouxer. ', est(nCoord > escs.length * 0.8, `${NF.format(nCoord)} escolas com coordenadas`)),
      h('li', {}, h('b', { text: 'Uniformizar os nomes' }), ' de postos e localidades escritos de formas diferentes (abaixo). ', est(nPosto > escs.length * 0.9, `${NF.format(nPosto)} escolas com posto`)),
      h('li', {}, h('b', { text: 'População (INE) e bases Access' }), ': nos separadores População e Importar Access.'))));
  body.append(h('div', { class: 'card' }, h('h2', { text: '1. Carta escolar' }),
    h('p', { class: 'note', text: 'Colunas reconhecidas (os nomes podem variar): código da escola (09-0568, 090568 ou 90568), Distrito, Posto, Localidade, Povoado, ZIP, Latitude e Longitude (ou uma coluna Coordenadas, em graus decimais ou em graus, minutos e segundos), nível, água, energia, salas, latrinas e casa de banho. Antes de gravar mostra o que muda. Os postos e localidades escritos de outra forma noutras escolas do mesmo distrito ficam com a grafia da carta.' }),
    h('button', { class: 'btn primary', text: 'Carregar a carta escolar (Excel ou CSV)…', onclick: importarCartaEscolar })));
  body.append(blocoMapasBase(), cartaoCorrespUnidades());
  // uniformizar grafias
  const grupos = [...variantesNomes('posto'), ...variantesNomes('localidade')];
  const escolhas = new Map();
  body.append(h('div', { class: 'card' }, h('h2', { text: '5. Uniformizar os nomes de postos e localidades' }),
    grupos.length ? h('p', { class: 'note', text: `${grupos.length} nomes aparecem escritos de formas diferentes no mesmo distrito. Escolha a grafia correcta de cada um (por omissão, a mais usada) e grave: todas as escolas desse distrito ficam com essa grafia.` }) : h('p', { class: 'pill ok', text: 'Não há postos nem localidades com grafias diferentes.' }),
    grupos.length ? h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Distrito', 'Campo', 'Grafias encontradas (escolas)', 'Fica'].map((t) => h('th', { class: 'l', text: t })))),
      h('tbody', {}, grupos.map((g, i) => { const sel = h('select', { onchange: (e) => escolhas.set(i, e.target.value) }, g.nomes.map((n) => h('option', { value: n, text: n }))); escolhas.set(i, g.nomes[0]);
        return h('tr', {}, h('td', { class: 'l', text: distName(g.dist) }), h('td', { class: 'l', text: g.campo === 'posto' ? 'Posto administrativo' : 'Localidade' }), h('td', { class: 'l', text: g.nomes.map((n) => `${n} (${g.cont.get(n)})`).join(' · ') }), h('td', { class: 'l' }, sel)); })))) : null,
    grupos.length ? h('button', { class: 'btn primary', text: 'Gravar as grafias escolhidas', onclick: async () => {
      let n = 0; const em = new Date().toISOString();
      for (const [i, g] of grupos.entries()) { const alvo = escolhas.get(i); for (const e of S.esc.values()) if (+e.dist === g.dist && g.nomes.includes(e[g.campo]) && e[g.campo] !== alvo) { await S.db.doc(`escolas/${e.cod}`).set({ ...(S.escDb?.get(e.cod) || e), cod: e.cod, [g.campo]: alvo, em, por: S.me?.id || null }); n++; } }
      await registar('nomes de postos e localidades uniformizados', { n }); await marcarFicheiroBase('uniformizar', { ficheiro: 'grafias', n }); toast(`${NF.format(n)} escolas actualizadas.`); go(current);
    } }) : null));
  // histórico e conselhos para durar
  body.append(h('div', { class: 'card' }, h('h2', { text: 'Histórico das configurações' }),
    (fb.hist || []).length ? h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Quando', 'O quê', 'Ficheiro', 'Registos', 'Por'].map((t) => h('th', { class: 'l', text: t })))),
      h('tbody', {}, fb.hist.map((r) => h('tr', {}, h('td', { class: 'l', text: new Date(r.em).toLocaleString('pt-PT') }), h('td', { class: 'l', text: { carta: 'Carta escolar', limites_distritos: 'Limites dos distritos', limites_postos: 'Limites dos postos', limites_localidades: 'Limites das localidades', coordenadas: 'Coordenadas', uniformizar: 'Grafias uniformizadas' }[r.tipo] || r.tipo }), h('td', { class: 'l', text: r.ficheiro || '' }), h('td', { class: 'l', text: r.n != null ? NF.format(r.n) : '' }), h('td', { class: 'l', text: r.por || '' })))))) : h('p', { class: 'note', text: 'Ainda não foi carregado nenhum ficheiro de configuração neste computador.' }),
    h('h3', { text: 'Para que isto dure' }),
    h('ul', {}, h('li', { text: 'Guarde os ficheiros originais numa pasta “Ficheiros de base” da DPE (e numa cópia fora do computador), com o ano no nome: por exemplo Carta_Escolar_2025.xlsx.' }),
      h('li', { text: 'Actualize uma vez por ano, depois do levantamento de 3 de Março: carta escolar nova, escolas abertas ou encerradas, e coordenadas em falta. O histórico acima mostra quando foi a última vez.' }),
      h('li', { text: 'As correcções do dia-a-dia (uma escola que muda de localidade) fazem-se em Escolas: os SDEJT propõem e a DPE aprova. Não é preciso voltar a carregar a carta inteira.' }),
      h('li', { text: 'Os limites (shapefile) quase nunca mudam: carregue de novo só se houver nova divisão administrativa.' }),
      h('li', { text: 'Tudo o que se carrega aqui vai para o servidor e para todos os distritos na sincronização, e entra nas cópias de segurança diárias.' }))));
}

// ---------------- divisão das publicações do distrito: por posto administrativo ou por localidade ----------------
function divU() {
  if (S.pubDiv === 'localidade') return { nome: 'Localidade', por: 'por localidade', o: 'A localidade', campo: 'localidade' };
  if (S.pubDiv === 'ambos') return { nome: 'Posto › Localidade', por: 'por posto administrativo e localidade', o: 'A localidade', campo: 'localidade' };
  if (S.pubDiv === 'distrito') return { nome: 'Distrito', por: 'no distrito', o: 'O distrito', campo: 'distrito' };
  return { nome: 'Posto administrativo', por: 'por posto administrativo', o: 'O posto administrativo', campo: 'posto' };
}
// mapa coroplético das unidades do distrito (postos ou localidades), quando a DPE carregou esses limites
function mapaUnid(vs, fmtv, inv, legenda) {
  const d3 = window.d3; if (S.pubDiv === 'distrito') return null; const camada = S.pubDiv === 'localidade' || S.pubDiv === 'ambos' ? S.limitesLocalidades : S.limitesPostos; if (!d3 || !camada || !S.pubDist) return null;
  const fd = (S.limites?.features || []).filter((f) => codDistritoGeo(f, S.limitesCampo) === +S.pubDist); if (!fd.length) return null;
  const fts = camada.features.filter((p) => { try { return fd.some((f) => d3.geoContains(f, d3.geoCentroid(p))); } catch { return false; } }); if (fts.length < 2) return null;
  const vm = new Map(vs.filter((x) => x[2] != null).map((x) => [normGeo(String(x[0]).split('›').pop()), x[2]]));
  const valDe = (f) => { const n = normGeo(f.properties?.__alias || f.properties?.__nome); if (vm.has(n)) return vm.get(n); for (const [k, v] of vm) if (n.length >= 4 && lev(n, k) <= 2) return v; return null; };
  const vals = fts.map(valDe); const ok = vals.filter((v) => v != null); if (ok.length < 2) return null;
  if (!fmtv) return true; // só a pergunta: há mapa possível?
  const W = 640, H = 430; const proj = d3.geoMercator().fitExtent([[12, 12], [W - 12, H - 58]], { type: 'FeatureCollection', features: fd }); const path = d3.geoPath(proj);
  const mn = Math.min(...ok), mx = Math.max(...ok); const t = (v) => (mx === mn ? 0.6 : (v - mn) / (mx - mn)); const cor = (v) => d3.interpolateRgb(inv ? '#E9F4EE' : '#F7EBC8', inv ? '#B5121B' : '#0A6B45')(inv ? t(v) : t(v));
  let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial"><rect width="${W}" height="${H}" fill="#fff"/>`;
  fts.forEach((f, i) => { g += `<path d="${path(f)}" fill="${vals[i] == null ? '#EEF1EF' : cor(vals[i])}" stroke="#fff" stroke-width="1.2"/>`; });
  for (const f of fd) g += `<path d="${path(f)}" fill="none" stroke="#0A6B45" stroke-width="1.6"/>`;
  fts.forEach((f, i) => { const [cx, cy] = path.centroid(f); if (!Number.isFinite(cx)) return; g += `<text x="${cx}" y="${cy - 2}" font-size="9.5" font-weight="700" text-anchor="middle" fill="#13221B" paint-order="stroke" stroke="#fff" stroke-width="2.6">${esc_(f.properties?.__alias || f.properties?.__nome || '')}</text>${vals[i] == null ? '' : `<text x="${cx}" y="${cy + 10}" font-size="9" text-anchor="middle" fill="#13221B" paint-order="stroke" stroke="#fff" stroke-width="2.6">${esc_(fmtv(vals[i]))}</text>`}`; });
  const lx = 40, ly = H - 34, lw = 220; g += `<defs><linearGradient id="gl"><stop offset="0" stop-color="${cor(mn)}"/><stop offset="1" stop-color="${cor(mx)}"/></linearGradient></defs><rect x="${lx}" y="${ly}" width="${lw}" height="10" fill="url(#gl)" rx="3"/><text x="${lx}" y="${ly + 24}" font-size="9.5" fill="#4A5A52">${esc_(fmtv(mn))}</text><text x="${lx + lw}" y="${ly + 24}" font-size="9.5" text-anchor="end" fill="#4A5A52">${esc_(fmtv(mx))}</text><text x="${lx + lw + 14}" y="${ly + 9}" font-size="10" fill="#13221B">${esc_(legenda || '')}</text>`;
  return g + '</svg>';
}

// ---------------- shapefiles: um ZIP com várias camadas (distritos, postos, localidades), com pré-visualização antes de gravar ----------------
function svgCamada(fc, W = 260, H = 180) {
  const d3 = window.d3; if (!d3 || !fc.features.length) return '';
  const proj = d3.geoMercator().fitExtent([[6, 6], [W - 6, H - 6]], fc); const path = d3.geoPath(proj);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/>${fc.features.map((f) => `<path d="${path(f)}" fill="#E3F0E8" stroke="#0A6B45" stroke-width=".7"/>`).join('')}</svg>`;
}
async function carregarShapefilesBase() {
  const r = await window.educstat.lerShapefile(); if (!r) return; if (r.erro) { toast('Não foi possível ler: ' + r.erro, 7000); return; }
  const camadas = r.camadas || [{ nome: r.ficheiro, n: r.n, campos: r.campos, crs: r.crs, geojson: r.geojson, nivel: 'distritos' }];
  const d3 = window.d3;
  const linhas = camadas.map((c) => {
    for (const f of c.geojson.features) rebobinar(f);
    const tete = { type: 'FeatureCollection', features: c.geojson.features.filter((f) => f.geometry && NA_TETE(f)) };
    const antes = c.nivel === 'distritos' ? S.limites?.features.length : c.nivel === 'postos' ? S.limitesPostos?.features.length : S.limitesLocalidades?.features.length;
    const sel = h('select', {}, [['distritos', 'Distritos'], ['postos', 'Postos administrativos'], ['localidades', 'Localidades'], ['', 'Não usar']].map(([k, l]) => h('option', { value: k, text: l, selected: k === c.nivel })));
    const pv = h('div', { class: 'shp-prev' }); pv.innerHTML = svgCamada(tete.features.length ? tete : c.geojson);
    return { c, sel, tete, el: h('div', { class: 'card', style: 'display:grid;grid-template-columns:270px 1fr;gap:12px;align-items:start' }, pv,
      h('div', {}, h('h3', { text: c.nome }), h('p', { class: 'note', text: `${NF.format(c.n)} áreas no ficheiro, ${NF.format(tete.features.length)} na província de Tete · ${c.crs} · campos: ${c.campos.slice(0, 8).join(', ')}${c.campos.length > 8 ? '…' : ''}` }),
        h('label', { class: 'f' }, 'Usar como', sel), h('p', { class: 'note', text: `Agora: ${antes ? NF.format(antes) + ' áreas carregadas' : 'nada carregado'} → depois: cerca de ${NF.format(tete.features.length)} áreas de Tete.` }))) };
  });
  const m = h('div', { class: 'modal' }, h('div', { style: 'max-width:60rem;max-height:88vh;overflow:auto' }, h('h2', { text: `Shapefiles encontrados em ${r.ficheiro}` }),
    h('p', { text: 'Veja cada camada e escolha para que serve. Os distritos gravam-se primeiro (servem para ficar só com os postos e localidades de Tete). Nada muda até carregar em “Gravar”.' }),
    ...linhas.map((l) => l.el),
    h('div', { class: 'row', style: 'justify-content:flex-end' }, h('button', { class: 'btn', text: 'Cancelar', onclick: () => m.remove() }), h('button', { class: 'btn primary', text: 'Gravar as camadas escolhidas', onclick: async () => {
      const ord = { distritos: 0, postos: 1, localidades: 2 }; const esc = linhas.filter((l) => l.sel.value).sort((a, b) => ord[a.sel.value] - ord[b.sel.value]);
      if (!esc.length) { m.remove(); return; } m.remove();
      for (const l of esc) await guardarLimites(l.sel.value, l.c.geojson, `${l.c.nome} (${l.c.n} áreas, ${l.c.crs})`, l.c.campos, true);
      go(current);
    } }))));
  document.body.append(m);
}

// recarregar o programa só depois de gravar o que estiver pendente
async function recarregar() { try { await S.db?.__flush?.(); } catch {} window.educstat.reload(); }
// avisos de gravação: erro ao escrever no disco e ficheiros que não se conseguiram ler no arranque
window.__aoErroGravar = (e) => { try { toast(`Atenção: não foi possível gravar “${e.c}” no disco (${e.msg}). Verifique o espaço e a pasta de dados. O programa volta a tentar na próxima alteração.`, 9000); } catch {} };
function avisoCorrompidos() {
  const l = window.__corrompidos || []; if (!l.length) return;
  const m = h('div', { class: 'modal' }, h('div', {}, h('h2', { text: 'Alguns ficheiros de dados não se conseguiram ler' }),
    h('p', { text: `Ficheiros: ${l.join(', ')}. Foram guardados à parte na pasta “Corrompidos”, dentro da pasta de dados, para não se perderem.` }),
    h('p', { text: 'Recomenda-se restaurar a cópia automática mais recente em Administração > Dados e cópias, antes de continuar a trabalhar.' }),
    h('div', { class: 'row', style: 'justify-content:flex-end' }, h('button', { class: 'btn primary', text: 'Entendi', onclick: () => m.remove() }))));
  document.body.append(m); window.__corrompidos = [];
}

// indicadores que não existem por classe (professores, escolas, salas, infra-estruturas): com o filtro de classe ficam “sem valor”, nunca zero
const indicatorsBase = indicators;
const SEM_CLASSE = ['prof', 'alprof', 'alprofF', 'formados', 'pctProfF', 'escolas', 'alsala', 'pctConv', 'prec', 'livre', 'cobFim', 'pnd', 'elect', 'agua', 'sanit'];
indicators = function (x, sexo) { const r = indicatorsBase(x, sexo); if (r && x?.f?.classe) for (const k of SEM_CLASSE) r[k] = null; return r; };

// =====================================================================
// 1.7: publicações configuráveis — apresentação, secções a incluir e anexos
// =====================================================================
S.pubAnexos ||= [];
function ajustarPublicacao(d0, st) {
  const fmtv = st.formato || 'completo'; const excl = new Set(st.excluir || []);
  let bl = [...d0.blocos];
  if (d0.extra?.length && fmtv === 'aprofundado') bl.push(...d0.extra);
  // secções: cada H1 e o que vem a seguir até ao próximo H1
  const out = []; let fora = false;
  for (const b of bl) { if (b.t === 'h1') fora = excl.has(b.texto); if (!fora) out.push(b); }
  bl = out;
  const ehMapa = (b) => b.t === 'img' && !b.dados; // mapas e imagens (sem dados de gráfico)
  if (fmtv === 'tabelas') bl = bl.filter((b) => b.t !== 'img' || ehMapa(b));
  if (fmtv === 'graficos') bl = bl.filter((b) => b.t !== 'tabela' || b.anexo);
  // anexos do utilizador (imagens, tabelas de Excel/CSV)
  const anx = S.pubAnexos.filter(Boolean);
  if (anx.length) { bl.push({ t: 'h1', texto: 'Anexos' }); for (const a of anx) { if (a.t === 'texto') { bl.push({ t: 'h2', texto: a.titulo }); for (const p of a.paras) bl.push({ t: 'p', texto: p }); continue; } bl.push(a.t === 'tabela' ? { t: 'tabela', titulo: a.titulo, cab: a.cab, linhas: a.linhas, fonte: a.fonte, anexo: true } : { t: 'img', titulo: a.titulo, svg: a.svg, fonte: a.fonte }); } }
  // numeração de tabelas e gráficos refeita depois de filtrar
  let nt = 0, ng = 0; const ren = (t, tipo, n) => String(t || '').replace(/^(Tabela|Gráfico|Mapa|Figura) \d+:\s*/, '').replace(/^/, `${tipo} ${n}: `);
  bl = bl.map((b) => (b.t === 'tabela' ? { ...b, titulo: ren(b.titulo, 'Tabela', ++nt) } : b.t === 'img' ? { ...b, titulo: ren(b.titulo, /^Mapa/.test(b.titulo) ? 'Mapa' : b.dados ? 'Gráfico' : 'Figura', ++ng) } : b));
  return { ...d0, blocos: bl };
}
function opcoesPublicacao(box, st, redesenhar) {
  if (!S.pubDoc0) { box.replaceChildren(); return; }
  const secs = S.pubDoc0.blocos.filter((b) => b.t === 'h1').map((b) => b.texto).concat(S.pubDoc0.extra?.length && st.formato === 'aprofundado' ? S.pubDoc0.extra.filter((b) => b.t === 'h1').map((b) => b.texto) : []);
  const excl = new Set(st.excluir || []);
  const chks = secs.map((t) => h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: !excl.has(t), onchange: (e) => { if (e.target.checked) excl.delete(t); else excl.add(t); st.excluir = [...excl]; redesenhar(); } }), t));
  const lista = h('div', { style: 'display:flex;flex-direction:column;gap:6px' }, ...S.pubAnexos.map((a, i) => h('div', { class: 'row between' }, h('span', { text: `${a.t === 'tabela' ? 'Tabela' : a.t === 'texto' ? 'Texto' : 'Imagem'}: ${a.titulo}` }), h('button', { class: 'btn sm', text: 'Retirar', onclick: () => { S.pubAnexos.splice(i, 1); redesenhar(); } }))));
  box.replaceChildren(h('details', { class: 'card', open: true }, h('summary', { text: 'Conteúdo do documento: secções e anexos' }),
    h('p', { class: 'note', text: 'Desmarque as secções que não quer no documento. Pode também juntar anexos: imagens (fotografias, mapas digitalizados, logótipos) ou tabelas de Excel/CSV. As alterações aparecem logo na pré-visualização e seguem para o Word, o PDF e o Excel.' }),
    h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr));gap:4px 12px' }, chks),
    h('h3', { text: 'Anexos' }), lista,
    h('div', { class: 'row' }, h('button', { class: 'btn', 'data-largar': 'sim', text: '+ Juntar anexos (imagens, Excel, CSV ou texto)…', title: 'Pode escolher vários ficheiros, ou arrastá-los para este cartão', onclick: async () => { const l = await lerAnexos(); if (l.length) { S.pubAnexos.push(...l); redesenhar(); } } }))));
}
// vários ficheiros de uma vez (imagens, Excel, CSV ou texto); também por arrastar para o cartão
async function lerAnexos() { const fs_ = await window.educstat.openFiles(['img', 'xlsx', 'csv', 'txt']); if (!fs_) return []; const out = []; for (const f of fs_) { const a = await lerAnexo(f); if (a) out.push(a); } return out; }
async function lerAnexo(f0) {
  const f = f0 || await window.educstat.openFile(['img', 'xlsx', 'csv', 'txt']); if (!f) return null;
  if (/\.(txt|md)$/i.test(f.nome)) { const t = new TextDecoder().decode(new Uint8Array(f.dados)).trim(); return t ? { t: 'texto', titulo: f.nome.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), paras: t.split(/\n\s*\n/).map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean) } : null; }
  const titulo = f.nome.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.nome)) {
    const ext = f.nome.split('.').pop().toLowerCase(); const tipo = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml' }[ext];
    // a extensão tem de corresponder ao conteúdo (assinatura do ficheiro) e a imagem não pode passar de 20 MB
    const u0 = new Uint8Array(f.dados.slice(0, 16)); const assin = { png: [0x89, 0x50, 0x4e, 0x47], jpg: [0xff, 0xd8, 0xff], jpeg: [0xff, 0xd8, 0xff], gif: [0x47, 0x49, 0x46], bmp: [0x42, 0x4d], webp: [0x52, 0x49, 0x46, 0x46] }[ext];
    if (f.dados.byteLength > 20 * 1048576) { toast(`${f.nome}: imagem com mais de 20 MB.`); return null; }
    if (assin && !assin.every((b, i) => u0[i] === b)) { toast(`${f.nome}: o conteúdo não é uma imagem ${ext.toUpperCase()} válida.`); return null; }
    if (ext === 'svg' && /<script|on\w+=|javascript:/i.test(new TextDecoder().decode(new Uint8Array(f.dados)))) { toast(`${f.nome}: SVG com código activo, recusado.`); return null; } const u8 = new Uint8Array(f.dados); let bin = ''; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
    const url = `data:${tipo};base64,${btoa(bin)}`;
    const dim = await new Promise((res) => { const im = new Image(); im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res(null); im.src = url; }); if (!dim) { toast('Não foi possível ler a imagem.'); return null; }
    const W = 640, H = Math.round((dim[1] * W) / dim[0]);
    return { t: 'img', titulo, fonte: f.nome, svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><image width="${W}" height="${H}" href="${url}" xlink:href="${url}"/></svg>` };
  }
  let wb; try { wb = /\.csv$/i.test(f.nome) ? XLSX.read(new TextDecoder().decode(new Uint8Array(f.dados)), { type: 'string' }) : XLSX.read(new Uint8Array(f.dados), { type: 'array' }); } catch (e) { toast('Não foi possível ler o ficheiro: ' + (e.message || e)); return null; }
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }).filter((r) => r.some((c) => String(c).trim() !== ''));
  if (!aoa.length) { toast('A primeira folha está vazia.'); return null; }
  // texto que começa por = + - @ seria lido como fórmula ao abrir no Excel: neutraliza-se
  const fmtC = (c) => (typeof c === 'number' ? (Number.isInteger(c) ? NF.format(c) : R1.format(c)) : /^[=+@\t\r]|^-(?!\d)/.test(String(c)) ? "'" + String(c) : String(c));
  const larg = Math.max(...aoa.map((r) => r.length));
  return { t: 'tabela', titulo, fonte: f.nome, cab: aoa[0].map(String).concat(Array(Math.max(0, larg - aoa[0].length)).fill('')), linhas: aoa.slice(1, 400).map((r) => Array.from({ length: larg }, (_, i) => fmtC(r[i] ?? ''))) };
}
// apresentação aprofundada: anexo com os principais números de cada escola (distrito) ou de cada distrito (província)
async function anexoAprofundado(st) {
  const ano = +st.ano; const out = [{ t: 'h1', texto: 'Anexo: indicadores por escola' }];
  const pc = (a, b) => (b ? P1.format(a / b) : '—');
  const linhasDe = (fs) => fs.map((f) => { const e = S.esc.get(f.esc) || {}; const r = window.EAgg.resumo([f], escolaTipo, formados()); const s = (k) => r.rows.reduce((a, x) => a + (x[k] ? x[k][0] + x[k][1] : 0), 0); const sm = (k) => r.rows.reduce((a, x) => a + (x[k] ? x[k][1] : 0), 0);
    const al = s('Matric'), pr = s('Prof'), fim = s('Fim'), ap = s('Aprov'), tu = r.rows.reduce((a, x) => a + (x.Turmas || 0), 0);
    return [codFmt(f.esc), e.nome || f.esc, e.posto || '—', e.localidade || '—', NF.format(al), pc(sm('Matric'), al), NF.format(pr), pr ? R1.format(al / pr) : '—', tu ? R1.format(al / tu) : '—', pc(ap, fim)]; });
  const cab = ['Código', 'Escola', 'Posto', 'Localidade', 'Alunos', '% raparigas', 'Professores', 'Alunos/prof.', 'Alunos/turma', 'Aprovação'];
  const dists = st.dist === 'Todos' ? S.cod.distritosTodos.map((d) => d[0]) : [+st.dist];
  for (const d of dists) {
    const fs = [...(await fichasEfectivas(ano, d)).values()].sort((a, b) => +b.esc - +a.esc); if (!fs.length) continue;
    out.push({ t: 'tabela', titulo: `Indicadores por escola, ${distName(d)}, ${ano}`, cab, linhas: linhasDe(fs), fonte: 'Levantamentos de 3 de Março e de fim do ano.', anexo: true });
  }
  return out.length > 1 ? out : [];
}

// bloqueio automático depois de 30 minutos sem actividade: pede de novo a palavra-passe (o trabalho aberto fica como estava)
function iniciarBloqueio() {
  if (S.__bloq) return; S.__bloq = true; let ult = Date.now(); const MIN = 30;
  for (const ev of ['mousemove', 'keydown', 'mousedown', 'wheel', 'touchstart']) window.addEventListener(ev, () => { ult = Date.now(); }, { passive: true });
  setInterval(async () => {
    if (!S.sessao || document.getElementById('bloqueio') || Date.now() - ult < MIN * 60000) return;
    try { await S.db.__flush?.(); } catch {}
    const p = h('input', { type: 'password', autocomplete: 'current-password' }); const msg = h('p', { class: 'note' });
    const ok = async () => { const x = (await S.db.doc('utilizadores/' + S.sessao.utilizador).get()).data(); if (x && x.activo && (await window.educstat.hash(p.value, x.sal)).hash === x.hash) { m.remove(); ult = Date.now(); registar('sessão desbloqueada'); } else { msg.textContent = 'Palavra-passe errada.'; msg.className = 'pill bad'; } };
    p.onkeydown = (e) => { if (e.key === 'Enter') ok(); };
    const m = h('div', { class: 'modal', id: 'bloqueio', style: 'backdrop-filter:blur(8px)' }, h('div', { style: 'max-width:26rem' }, h('h2', { text: 'Sessão bloqueada' }),
      h('p', { text: `Passaram ${MIN} minutos sem actividade. Para continuar, ${S.sessao.nome}, escreva a sua palavra-passe. O que estava a fazer ficou gravado.` }), h('label', { class: 'f' }, 'Palavra-passe', p), msg,
      h('div', { class: 'row', style: 'justify-content:space-between' }, h('button', { class: 'btn', text: 'Sair e entrar com outro utilizador', onclick: () => recarregar() }), h('button', { class: 'btn primary', text: 'Continuar', onclick: ok }))));
    document.body.append(m); setTimeout(() => p.focus(), 50);
  }, 30000);
}
// aviso quando outro computador está a usar a mesma pasta de dados (pasta partilhada na rede)
async function avisoPastaEmUso() {
  const i = await window.educstat.info(); if (!i?.outroUso) return;
  const m = h('div', { class: 'modal' }, h('div', { style: 'max-width:34rem' }, h('h2', { text: 'Esta pasta de dados está a ser usada noutro computador' }),
    h('p', { text: `O computador “${i.outroUso.maquina}” está a trabalhar na mesma pasta (${i.pasta}) desde ${new Date(i.outroUso.desde).toLocaleString('pt-PT')}. Se os dois gravarem ao mesmo tempo, um pode apagar o que o outro fez.` }),
    h('p', { text: 'Recomenda-se que cada computador tenha a sua própria pasta e que os dados passem pela sincronização. Feche o programa num dos computadores, ou mude a pasta em Administração > Dados e cópias.' }),
    h('div', { class: 'row', style: 'justify-content:flex-end' }, h('button', { class: 'btn primary', text: 'Entendi', onclick: () => m.remove() }))));
  document.body.append(m);
}

// =====================================================================
// 1.8: tema no topo, painel executivo, centro de qualidade, ciclo dos dados, diagnóstico,
//      configuração de computadores SDEJT, validação dos registos, assistente e mapas com cartucho
// =====================================================================
ICON.tema = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';
const desenharIconesBase = desenharIcones;
desenharIcones = function () {
  desenharIconesBase(); const w = $('#icones'); if (!w || !S.sessao) return;
  const t = temaActual(); const nome = { sistema: 'automático', claro: 'claro', escuro: 'escuro' }[t];
  const b = iconBtn('tema', `Tema: ${nome}. Clique para mudar (claro, escuro, automático)`, 0, () => { aplicarTema({ sistema: 'claro', claro: 'escuro', escuro: 'sistema' }[temaActual()]); desenharIcones(); drawWho?.(); toast('Tema: ' + { sistema: 'automático (como o Windows)', claro: 'claro', escuro: 'escuro' }[temaActual()] + '.'); }, 'ib-tema');
  w.insertBefore(b, w.children[1] || null);
};

// ---------------- cartucho dos mapas (legenda, fontes, sistema de coordenadas, quem elaborou, norte) ----------------
function molduraMapa(svg, { fonte, prov, dist } = {}) {
  if (!svg || /data-moldura/.test(svg)) return svg;
  const m = svg.match(/width="(\d+)" height="(\d+)"/); if (!m) return svg; const W = +m[1], H = +m[2]; const P = 116;
  const quem = prov ? 'Direcção Provincial da Educação de Tete' : `Serviço Distrital de Educação, Juventude e Tecnologia de ${distName(dist)}`;
  const nl = (t, x, y, w, sz = 9.2) => { const pal = String(t).split(' '); const lin = []; let l = ''; const max = Math.floor(w / (sz * 0.52)); for (const p of pal) { if ((l + ' ' + p).trim().length > max) { lin.push(l.trim()); l = p; } else l += ' ' + p; } if (l.trim()) lin.push(l.trim()); return lin.slice(0, 6).map((x_, i) => `<text x="${x}" y="${y + i * (sz + 3)}" font-size="${sz}" fill="#13221B">${esc_(x_)}</text>`).join(''); };
  const col = (W - 32) / 3;
  const corpo = svg.replace(/^<svg[^>]*>/, `<svg x="0" y="0" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  return `<svg xmlns="http://www.w3.org/2000/svg" data-moldura="1" viewBox="0 0 ${W} ${H + P}" width="${W}" height="${H + P}" font-family="${FONTE_G}"><rect width="${W}" height="${H + P}" fill="#fff"/>${corpo}
    <g transform="translate(${W - 34},18)"><polygon points="0,-12 7,8 0,3 -7,8" fill="#13221B"/><text x="0" y="22" font-size="11" font-weight="700" text-anchor="middle" fill="#13221B">N</text></g>
    <rect x="8" y="${H + 4}" width="${W - 16}" height="${P - 12}" rx="6" fill="#F4F7F5" stroke="#C9D6CE"/>
    <text x="16" y="${H + 20}" font-size="9.5" font-weight="700" fill="#0A6B45">Fonte dos dados</text>${nl(`${String(fonte || '').replace(/\.$/, '')}. Quantitativos: levantamentos (EducStat Tete). Qualitativos: carta escolar.`.replace(/^\. /, ''), 16, H + 33, col - 8, 8.6)}
    <text x="${16 + col}" y="${H + 20}" font-size="9.5" font-weight="700" fill="#0A6B45">Sistema de referência</text>${nl('WGS 84 (EPSG:4326), graus decimais. Projecção: Mercator. Limites administrativos carregados pela DPE.', 16 + col, H + 33, col - 8, 8.6)}
    <text x="${16 + 2 * col}" y="${H + 20}" font-size="9.5" font-weight="700" fill="#0A6B45">Elaborado por</text>${nl(`${quem}, com o EducStat Tete, ${mesAnoPT()}.`, 16 + 2 * col, H + 33, col - 8, 8.6)}</svg>`;
}

// ---------------- painel executivo no Início ----------------
function coberturaDe(ano, d) {
  const r = resumoDe(ano, d), r0 = resumoDe(ano - 1, d); const est = r?.estado || {}, est0 = r0?.estado || {};
  const esperadas = Object.keys(est0).filter((c) => !S.esc.get(+c)?.fecho || +S.esc.get(+c).fecho > ano).length || Object.keys(est).length;
  const recebidas = Object.values(est).filter((x) => x.m).length; const fim = Object.values(est).filter((x) => x.f).length;
  return { esperadas, recebidas, fim, cob: esperadas ? Math.min(1, recebidas / esperadas) : null };
}
const inicioBase = VIEWS.inicio;
VIEWS.inicio = (v) => {
  inicioBase(v);
  try {
    const ano = S.inicioAno || Math.min(ANO_MAX_DADOS, ANOS[ANOS.length - 1]); const meu = DESKTOP && !ehDPE() ? meuDist() : 0;
    const dists = meu ? [meu] : S.cod.distritos.map((d) => d[0]); const f = { dist: meu || 'Todos', tipo: 'Todos', nivel: 'Todos', sexo: 'Ambos' };
    const x = sumUp(ano, f), ind = x ? indicators(x, 'Ambos') : {}; let esp = 0, rec = 0; for (const d of dists) { const c = coberturaDe(ano, d); esp += c.esperadas; rec += c.recebidas; }
    const q = S.qualCache?.[`${ano}_marco`]; const qs = q ? q.porDist.filter((r) => dists.includes(r.d)) : null; const comErro = qs ? qs.reduce((a, r) => a + r.comErro, 0) : null; const nf = qs ? qs.reduce((a, r) => a + r.recebidas, 0) : null;
    const card = (l, val, sub, alvo) => h('button', { class: 'k', onclick: () => { location.hash = '#' + alvo; } }, h('span', { class: 'l', text: l }), h('span', { class: 'v', text: val }), h('span', { class: 's', text: sub }));
    const piores = qs ? [...qs].sort((a, b) => a.pontos - b.pontos).slice(0, 3).filter((r) => r.pontos < 90) : null;
    const box = h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h2', { text: `Painel executivo · ${meu ? distName(meu) : 'Província de Tete'} · ${ano}` }), h('span', { class: 'note', text: 'Clique num cartão para ver o detalhe' })),
      h('div', { class: 'exec' }, card('Alunos', ind.matric != null ? NF.format(ind.matric) : '—', ind.pctF != null ? `${P1.format(ind.pctF)} raparigas` : '', 'painel'),
        card('Escolas com mapa', NF.format(rec), `de ${NF.format(esp)} esperadas`, 'qualidade'),
        card('Cobertura', esp ? P1.format(Math.min(1, rec / esp)) : '—', 'mapas recebidos ÷ esperados', 'qualidade'),
        card('Qualidade', comErro == null ? 'calcular…' : P1.format(nf ? 1 - comErro / nf : 0), comErro == null ? 'abra a Qualidade para calcular' : `${NF.format(comErro)} mapas com erros`, 'qualidade'),
        card('Professores', ind.prof != null ? NF.format(ind.prof) : '—', ind.alprof != null ? `${R1.format(ind.alprof)} alunos por professor` : '', 'painel')),
      piores?.length ? h('p', { class: 'note', style: 'margin-top:8px', text: 'Requerem atenção: ' + piores.map((r) => `${distName(r.d)} (pontuação ${Math.round(r.pontos)})`).join(' · ') }) : null);
    let top = v.querySelector('h1'); while (top && top.parentElement !== v) top = top.parentElement;
    if (top?.nextSibling) v.insertBefore(box, top.nextSibling); else v.append(box);
  } catch (e) { console.error('painel executivo', e); }
};

// ---------------- centro de qualidade dos dados ----------------
const chaveProb = (p) => { let x = 0; const t = `${p.lev}|${p.bloco}|${p.msg}`; for (let i = 0; i < t.length; i++) x = (x * 31 + t.charCodeAt(i)) | 0; return 'j' + (x >>> 0).toString(36); };
async function calcularQualidade(ano, lev) {
  const porDist = []; const lista = [];
  const prazo = S.trancas?.[`${ano}_${lev}`]?.prazo || null;
  for (const [d] of S.cod.distritos) {
    if (!visivel(ano, d)) continue;
    const fm = await fichasEfectivas(ano, d); const ant = await fichasEfectivas(ano - 1, d).catch(() => new Map()); const c = coberturaDe(ano, d);
    let comErro = 0, avisos = 0, anom = 0, atraso = 0, rec = 0, parciais = 0;
    const tot = (f) => (f?.marco?.alunos || []).reduce((a, r) => a + Object.values(r.id || {}).reduce((b, v) => b + (+v[0] || 0) + (+v[1] || 0), 0), 0);
    for (const f of fm.values()) {
      const temLev = lev === 'marco' ? (f.marco?.alunos || []).some((r) => Object.values(r.id || {}).some((v) => (+v?.[0] || 0) + (+v?.[1] || 0) > 0)) : (f.fim?.aprov || []).length; if (!temLev) { if (lev === 'marco' && Object.keys(f.marco || {}).length) parciais++; continue; } rec++;
      // o prazo vê-se pela primeira gravação do levantamento (uma correcção depois do prazo não conta como atraso)
      const quando = f.primeiro?.[lev] || f.em; if (prazo && quando && quando.slice(0, 10) > prazo) atraso++;
      const just = f.justif || {}; const ps = problemasDetalhe(f).filter((p) => p.lev === lev);
      // anomalias estatísticas: variação brusca face ao ano anterior e escola que deixou de enviar
      if (lev === 'marco') { const a1 = tot(f), a0 = tot(ant.get(f.esc)); if (a0 >= 40 && a1 && Math.abs(a1 - a0) / a0 > 0.4) ps.push({ g: 'anomalia', lev, bloco: 'alunos', msg: `Alunos passaram de ${NF.format(a0)} (${ano - 1}) para ${NF.format(a1)} (${ano}): variação de ${P1.format((a1 - a0) / a0)}.` }); }
      let e = 0;
      for (const p of ps) { const k = chaveProb(p); if (p.g !== 'erro' && just[k]) continue; if (p.g === 'erro') e++; else if (p.g === 'aviso') avisos++; else anom++; lista.push({ ...p, d, esc: f.esc, k, just: just[k] || null }); }
      if (e) comErro++;
    }
    if (lev === 'marco') for (const f of fm.values()) if (!(f.marco?.alunos || []).some((r) => Object.values(r.id || {}).some((v) => (+v?.[0] || 0) + (+v?.[1] || 0) > 0)) && Object.keys(f.marco || {}).length) lista.push({ g: 'aviso', lev, bloco: 'alunos', msg: 'Mapa começado mas sem alunos no Quadro 1: conta como parcial, não como recebido.', d, esc: f.esc, k: 'parcial' });
    if (lev === 'marco') for (const [esc] of ant) if (!fm.has(esc) && !S.esc.get(+esc)?.fecho) { anom++; lista.push({ g: 'anomalia', lev, bloco: '—', msg: `Tinha mapa em ${ano - 1} e ainda não tem em ${ano}.`, d, esc, k: 'falta' }); }
    const cob = c.esperadas ? Math.min(1, rec / c.esperadas) : rec ? 1 : 0; const qual = rec ? 1 - comErro / rec : 0;
    porDist.push({ d, esperadas: c.esperadas, recebidas: rec, parciais, cob, comErro, avisos, anom, atraso, noPrazo: rec ? 1 - atraso / rec : null, pontos: Math.round((cob * 0.6 + qual * 0.4) * 100) });
  }
  return { porDist, lista, em: new Date() };
}
function estadoCiclo(ano, lev, d) {
  const sub = (S.msgs || []).filter((m) => m.tipo === 'submissao' && +m.ano === +ano && m.lev === lev && +m.deDist === +d).sort((a, b) => (a.em < b.em ? 1 : -1))[0];
  const t = S.trancas?.[`${ano}_${lev}`]?.dist?.[d] || {}; const harm = estadoTranca(ano, lev, d).estado === 'harmonizado'; const pub = !!S.publicacao?.anos?.[ano];
  const passo = pub && harm ? 4 : harm ? 3 : t.revisao ? 2 : sub ? 1 : 0;
  return { passo, sub, rev: t.revisao || null };
}
function chipsCiclo(c) { return h('div', { class: 'ciclo', title: c.sub ? `Submetido em ${new Date(c.sub.em).toLocaleString('pt-PT')} por ${c.sub.de}` : '' }, ['Por submeter', 'Submetido', 'Em revisão', 'Harmonizado', 'Publicado'].map((t, i) => h('span', { class: (i <= c.passo && i > 0 ? 'on' : '') + (i === c.passo ? ' at' : ''), text: t }))); }
async function submeterDPE(ano, lev, q) {
  const d = meuDist(); const r = q?.porDist.find((x) => x.d === d);
  if (!(await confirmBox(`Submeter à DPE os mapas de ${(LEV_TRANCA.find((l) => l[0] === lev) || [0, lev])[1]} ${ano} de ${distName(d)}?${r ? ` ${r.recebidas} mapas recebidos de ${r.esperadas} esperados, ${r.comErro} com erros.` : ''} A DPE é avisada e passa a rever.`, 'Submeter'))) return;
  const id = Date.now() + '_' + Math.random().toString(36).slice(2, 6); const em = new Date().toISOString();
  await S.db.doc(`mensagens/${id}`).set({ id, tipo: 'submissao', ano: +ano, lev, texto: `Submissão: ${(LEV_TRANCA.find((l) => l[0] === lev) || [0, lev])[1]} ${ano} de ${distName(d)}${r ? ` — ${r.recebidas} mapas de ${r.esperadas} esperados (${P1.format(r.cob)}), ${r.comErro} com erros, ${r.avisos} avisos` : ''}.`, resumo: r || null, de: S.sessao.nome, deUtil: S.sessao.utilizador, deDist: d, para: 0, em });
  await registar('mapas submetidos à DPE', { ano, lev }); toast('Submetido. A DPE recebe na próxima sincronização.'); syncAgora('mensagem'); go('qualidade');
}
VIEWS.qualidade = async (v) => {
  const st = S.qSt ||= { ano: Math.min(ANO_MAX_DADOS, ANOS[ANOS.length - 1]), lev: 'marco', dist: 'Todos', g: 'todas' };
  const dpe = !DESKTOP || ehDPE(); const meu = meuDist(); if (!dpe && meu) st.dist = String(meu);
  const sel = (k, list, lab) => h('label', { class: 'f' }, lab, h('select', { onchange: (e) => { st[k] = e.target.value; if (k === 'ano' || k === 'lev') st.forcar = true; go('qualidade'); } }, list.map((o) => h('option', { value: o[0], text: o[1], selected: String(o[0]) === String(st[k]) }))));
  v.append(h('div', {}, h('h1', { text: 'Qualidade dos Dados' }), h('p', { class: 'lede', text: 'Cobertura (mapas recebidos ÷ esperados), cumprimento do prazo, erros, avisos e anomalias de cada distrito, e o ciclo dos dados até à publicação. Cada pendência abre o mapa no quadro a corrigir. Um aviso ou anomalia pode ser justificado, sem mudar os números.' })));
  v.append(h('div', { class: 'card' }, h('div', { class: 'row' }, sel('ano', desc(ANOS.filter((a) => a <= ANO_MAX_DADOS + 1)).map((a) => [a, a]), 'Ano'), sel('lev', [['marco', '3 de Março'], ['fim', 'Fim do ano']], 'Levantamento'),
    dpe ? sel('dist', [['Todos', 'Todos os distritos'], ...S.cod.distritos], 'Distrito') : null, sel('g', [['todas', 'Todas as pendências'], ['erro', 'Só erros'], ['aviso', 'Só avisos'], ['anomalia', 'Só anomalias']], 'Mostrar'),
    h('button', { class: 'btn', text: 'Recalcular', onclick: () => { st.forcar = true; go('qualidade'); } }))));
  const k = `${st.ano}_${st.lev}`; S.qualCache ||= {};
  if (!S.qualCache[k] || st.forcar) { const l = h('div', { class: 'loading', text: 'A verificar todos os mapas…' }); v.append(l); S.qualCache[k] = await calcularQualidade(+st.ano, st.lev); st.forcar = false; l.remove(); }
  const q = S.qualCache[k]; const rows = q.porDist.filter((r) => st.dist === 'Todos' || String(r.d) === String(st.dist));
  if (!dpe && meu) v.append(h('div', { class: 'card', style: 'border-left:4px solid var(--brand)' }, h('div', { class: 'row between' }, h('div', {}, h('h2', { text: 'Submeter os mapas à DPE' }), h('p', { class: 'note', text: 'Quando terminar a introdução e corrigir os erros, submeta. A DPE passa a rever, harmoniza e publica.' })), chipsCiclo(estadoCiclo(st.ano, st.lev, meu))),
    (() => { const c = estadoCiclo(st.ano, st.lev, meu); const et = estadoTranca(st.ano, st.lev, meu); const pz = S.trancas?.[`${st.ano}_${st.lev}`]?.prazo; const fora = et.estado === 'trancado' && et.porPrazo;
      // a submissão segue os prazos: depois do prazo só com reabertura da DPE; uma vez submetido fica registado (não volta a aparecer como pendente)
      if (c.passo >= 1) return h('p', { class: 'pill ok', text: `Submetido em ${new Date(c.sub?.em || Date.now()).toLocaleString('pt-PT')}${c.sub?.de ? ' por ' + c.sub.de : ''}. A DPE aprova depois de rever.` });
      return h('div', { class: 'row' }, pz ? h('span', { class: 'note', text: `Prazo: ${dataPT(pz)}` }) : null, h('button', { class: 'btn primary', text: 'Submeter à DPE', disabled: !!writeNote() || (S.sessao?.perfil || 0) < 2 || fora, title: fora ? 'O prazo terminou: peça à DPE que reabra o distrito' : '', onclick: () => submeterDPE(st.ano, st.lev, q) }), fora ? h('span', { class: 'pill warn', text: 'O prazo terminou: peça à DPE a reabertura para submeter.' }) : null); })()));
  v.append(h('div', { class: 'card' }, h('h2', { text: `Distritos · ${(LEV_TRANCA.find((l) => l[0] === st.lev) || [0, ''])[1]} ${st.ano}` }), h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Distrito', 'Esperadas', 'Recebidas (completas)', 'Parciais', 'Cobertura', 'No prazo (1ª gravação)', 'Mapas com erros', 'Avisos', 'Anomalias', 'Pontuação', 'Ciclo dos dados', ''].map((t, i) => h('th', { class: i ? '' : 'l', text: t })))),
    h('tbody', {}, rows.map((r) => { const c = estadoCiclo(st.ano, st.lev, r.d); return h('tr', {}, h('td', { class: 'l', text: distName(r.d) }), h('td', { text: NF.format(r.esperadas) }), h('td', { text: NF.format(r.recebidas) }), h('td', { class: r.parciais ? 'sev-aviso' : '', text: NF.format(r.parciais || 0) }),
      h('td', {}, h('div', { class: 'barra', title: P1.format(r.cob) }, h('i', { style: `width:${Math.round(r.cob * 100)}%;background:${r.cob < 0.8 ? 'var(--bad)' : r.cob < 0.95 ? 'var(--warn)' : 'var(--ok)'}` })), h('small', { text: P1.format(r.cob) })),
      h('td', { text: r.noPrazo == null ? '—' : P1.format(r.noPrazo) }), h('td', { class: r.comErro ? 'sev-erro' : '', text: NF.format(r.comErro) }), h('td', { text: NF.format(r.avisos) }), h('td', { text: NF.format(r.anom) }),
      h('td', { style: `font-weight:700;color:${r.pontos >= 90 ? 'var(--ok)' : r.pontos >= 70 ? 'var(--warn)' : 'var(--bad)'}`, text: r.pontos }), h('td', { style: 'min-width:20rem' }, chipsCiclo(c)),
      h('td', {}, dpe && S.sessao?.perfil === 3 && c.passo === 1 ? h('button', { class: 'btn sm', text: 'Passar a "em revisão"', onclick: async () => { const t = (S.trancas[k] ||= { dist: {} }); t.dist ||= {}; t.dist[r.d] = { ...(t.dist[r.d] || { estado: 'aberto' }), revisao: { por: S.sessao.utilizador, em: new Date().toISOString() } }; await S.db.doc('config/trancas').set(S.trancas); await registar('mapas em revisão', { ano: st.ano, lev: st.lev, alvo: distName(r.d) }); go('qualidade'); } }) : null)); })))),
    h('p', { class: 'note', text: 'Pontuação = 60% cobertura + 40% mapas sem erros. Esperadas = escolas com mapa no ano anterior que não estão encerradas. Os avisos justificados deixam de contar. A harmonização e a publicação fazem-se em Administração > Prazos e harmonização.' })));
  const pend = q.lista.filter((p) => (st.dist === 'Todos' || String(p.d) === String(st.dist)) && (st.g === 'todas' || p.g === st.g)).sort((a, b) => ['erro', 'aviso', 'anomalia'].indexOf(a.g) - ['erro', 'aviso', 'anomalia'].indexOf(b.g) || +b.esc - +a.esc);
  const justificar = async (p) => { const ta = h('textarea', { rows: 3, style: 'width:100%' }); const m = h('div', { class: 'modal' }, h('div', {}, h('h2', { text: 'Justificar' }), h('p', { class: 'note', text: p.msg }), h('label', { class: 'f' }, 'Justificação (fica registada com o seu nome; os números não mudam)', ta),
    h('div', { class: 'row', style: 'justify-content:flex-end' }, h('button', { class: 'btn', text: 'Cancelar', onclick: () => m.remove() }), h('button', { class: 'btn primary', text: 'Gravar', onclick: async () => { if (!ta.value.trim()) return; const f = (await fichasEfectivas(+st.ano, p.d)).get(p.esc); if (!f) { m.remove(); return; }
      const ro = roMotivo(+st.ano, st.lev, p.d); if (ro) { toast(ro, 6000); return; }
      await S.db.doc(`fichas/${f.ano}_${f.esc}`).set({ ...f, justif: { ...(f.justif || {}), [p.k]: { texto: ta.value.trim(), msg: p.msg, por: S.sessao.nome, em: new Date().toISOString() } }, em: new Date().toISOString() }); await registar('aviso justificado', { ano: f.ano, esc: f.esc, alvo: ta.value.trim().slice(0, 120) }); m.remove(); st.forcar = true; go('qualidade'); } }))));
    document.body.append(m); };
  v.append(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h2', { text: `Pendências (${NF.format(pend.length)})` }), h('button', { class: 'btn', text: 'Exportar pendências (Excel)', disabled: !S.downloads, onclick: async () => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pend.map((p) => ({ Gravidade: p.g, Distrito: distName(p.d), 'Código': codFmt(p.esc), Escola: S.esc.get(+p.esc)?.nome || '', Posto: S.esc.get(+p.esc)?.posto || '', Localidade: S.esc.get(+p.esc)?.localidade || '', Quadro: p.bloco, Problema: p.msg }))), 'Pendências'); await guardarXlsx(wb, `Qualidade_${st.ano}_${st.lev}.xlsx`); } })),
    h('div', { class: 'tw tall' }, h('table', {}, h('thead', {}, h('tr', {}, ['Gravidade', 'Distrito', 'Escola', 'Quadro', 'Problema', ''].map((t) => h('th', { class: 'l', text: t })))),
      h('tbody', {}, pend.slice(0, 600).map((p) => h('tr', {}, h('td', { class: 'l sev-' + p.g, text: { erro: 'Erro', aviso: 'Aviso', anomalia: 'Anomalia' }[p.g] }), h('td', { class: 'l', text: distName(p.d) }), h('td', { class: 'l', text: `${codFmt(p.esc)} · ${S.esc.get(+p.esc)?.nome || ''}` }), h('td', { class: 'l', text: p.bloco }), h('td', { class: 'l', text: p.msg }),
        h('td', {}, h('div', { class: 'row', style: 'gap:4px;flex-wrap:nowrap' }, h('button', { class: 'btn sm', text: 'Abrir o mapa', onclick: () => { Object.assign(S.sel, { ano: +st.ano, dist: p.d, esc: +p.esc, lev: st.lev, blk: '__todos' }); if (p.mapa) S.sel.mapa = p.mapa; S.draft = null; location.hash = '#lancar'; } }),
          p.g !== 'erro' && p.k !== 'falta' ? h('button', { class: 'btn sm', text: 'Justificar', onclick: () => justificar(p) }) : null))))))),
    pend.length > 600 ? h('p', { class: 'note', text: 'Mostra as primeiras 600. Use os filtros ou exporte para Excel.' }) : null));
};

// ---------------- validação dos registos recebidos na sincronização ----------------
function docValido(c, v) {
  if (!v || typeof v !== 'object') return 'registo vazio';
  const dists = new Set(S.cod.distritosTodos.map((d) => d[0]));
  let neg = false; const ver = (o, n = 0) => { if (n > 8 || neg) return; if (typeof o === 'number' && o < 0) neg = true; else if (o && typeof o === 'object') for (const x of Object.values(o)) ver(x, n + 1); };
  if (c === 'fichas' || c === 'alfa') {
    if (!Number.isInteger(+v.ano) || +v.ano < 2004 || +v.ano > new Date().getFullYear() + 1) return 'ano fora do intervalo';
    if (!dists.has(+v.dist)) return 'distrito desconhecido';
    if (c === 'fichas' && !(+v.esc > 0)) return 'escola sem código';
    ver(v.marco); ver(v.fim); if (neg) return 'números negativos';
  }
  if (c === 'escolas' && (!(+v.cod > 0) || (v.dist != null && !dists.has(+v.dist)))) return 'escola com código ou distrito inválido';
  if (c === 'mensagens' && (typeof v.texto !== 'string' || v.texto.length > 20000)) return 'mensagem inválida';
  return null;
}
const aplicarDocsBase = aplicarDocs;
aplicarDocs = async function (lista, origem) {
  const ok = [], recusa = [];
  for (const x of lista) { const m = docValido(x.c, x.v); if (m) recusa.push({ c: x.c, id: x.id, motivo: m }); else ok.push(x); }
  if (recusa.length) { S.syncRecusados = [...recusa, ...(S.syncRecusados || [])].slice(0, 200); registar('registos recusados na sincronização', { n: recusa.length, alvo: recusa.slice(0, 3).map((r) => `${r.c}/${r.id}: ${r.motivo}`).join('; ') }); }
  const r = await aplicarDocsBase(ok, origem); r.recusados = (r.recusados || 0) + recusa.length; return r;
};

// ---------------- impressão digital de um ano publicado (versão dos dados) ----------------
async function hashAno(ano) {
  const partes = []; for (const [d] of S.cod.distritosTodos) { const fm = await fichasEfectivas(ano, d); for (const f of [...fm.values()].sort((a, b) => a.esc - b.esc)) partes.push(`${f.esc}:${f.em || ''}:${JSON.stringify(f.marco || {}).length}:${JSON.stringify(f.fim || {}).length}`); }
  const b = new TextEncoder().encode(partes.join('|')); const hb = await crypto.subtle.digest('SHA-256', b); return [...new Uint8Array(hb)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// ---------------- diagnóstico da sincronização e ficheiro de configuração de um computador SDEJT ----------------
async function cartaoDiagnostico() {
  const cfg = (await S.db.doc('config/online').get()).data() || {}; const sv = await window.educstat.servidor('estado').catch(() => ({}));
  let fila = '—'; try { fila = (await docsParaEnviar(cfg.lastPush || '')).length; } catch {}
  const ur = cfg.ultimoResultado || {}; const rec = S.syncRecusados || [];
  const linhas = [['Conta do servidor', sv?.email || 'não entrou'], ['Estado', SYNC.estado + (SYNC.erro ? ` (${SYNC.erro})` : '')], ['Último contacto com êxito', cfg.ultimaSync ? new Date(cfg.ultimaSync).toLocaleString('pt-PT') : 'nunca'],
    ['Registos à espera de envio', String(fila)], ['Último envio', `${ur.enviados ?? '—'} enviados · ${ur.novos ?? '—'} novos e ${ur.actual ?? '—'} actualizados recebidos · ${ur.recusados ?? 0} recusados`], ['Registos recusados (validação)', rec.length ? rec.slice(0, 5).map((r) => `${r.c}/${r.id}: ${r.motivo}`).join(' · ') : 'nenhum']];
  const relatorio = async () => { const i = await window.educstat.info(); const t = [`EducStat Tete — diagnóstico da sincronização`, `Gerado: ${new Date().toLocaleString('pt-PT')}`, `Computador: ${i.maquina} · versão ${i.versao} · pasta ${i.pasta}`, `Instalação: ${S.inst?.papel} ${S.inst?.dist ? distName(S.inst.dist) : ''}`, '', ...linhas.map(([a, b]) => `${a}: ${b}`), '', 'Recusados:', ...rec.map((r) => `  ${r.c}/${r.id}: ${r.motivo}`)].join('\r\n');
    await S.downloads.save({ filename: `Diagnostico_sincronizacao_${new Date().toISOString().slice(0, 10)}.txt`, data: new Blob([t]) }); };
  return h('div', { class: 'card' }, h('h2', { text: 'Diagnóstico da sincronização' }), h('table', { class: 'kv' }, h('tbody', {}, linhas.map(([a, b]) => h('tr', {}, h('td', { class: 'l', style: 'font-weight:600;width:16rem', text: a }), h('td', { class: 'l', text: b }))))),
    h('div', { class: 'row' }, h('button', { class: 'btn', text: 'Sincronizar agora', onclick: async () => { SYNC.falhas = 0; await syncAgora('manual'); go('admin'); } }), h('button', { class: 'btn', text: 'Guardar relatório técnico (txt)', disabled: !S.downloads, onclick: relatorio })));
}
function cartaoConfigComputador() {
  const dpe = ehDPE();
  const pin = h('input', { type: 'password', placeholder: 'PIN de 6 ou mais caracteres', style: 'width:14rem' });
  const ds = h('select', {}, S.cod.distritosTodos.map((d) => h('option', { value: d[0], text: d[1] })));
  return h('div', { class: 'card' }, h('h2', { text: 'Configurar um computador novo de um SDEJT' }),
    h('p', { class: 'note', text: dpe ? 'Gera um ficheiro com tudo o que um computador novo do SDEJT precisa (distrito, servidor, chave de cifra e as contas dos utilizadores do distrito, com as palavras-passe protegidas), protegido por um PIN. É assim que o SDEJT entra pela primeira vez com as suas credenciais originais. Envie o ficheiro e diga o PIN por telefone. No computador novo: Administração > Sincronização > “Importar configuração”.' : 'Recebeu da DPE um ficheiro de configuração (.educcfg)? Importe-o aqui com o PIN que a DPE lhe disse: o computador fica com o distrito, o servidor e a chave de cifra.' }),
    h('div', { class: 'row' }, dpe ? h('label', { class: 'f' }, 'Distrito', ds) : null, h('label', { class: 'f' }, 'PIN', pin),
      dpe ? h('button', { class: 'btn primary', text: 'Gerar ficheiro de configuração', onclick: async () => { if (pin.value.length < 6) { toast('O PIN tem de ter pelo menos 6 caracteres.'); return; } const us = (await S.db.collection('utilizadores').get()).docs.map((d) => d.data()).filter((u) => +u.dist === +ds.value && !u.apagado && !u.raiz); const r = await window.educstat.cfgComputador('exportar', { pin: pin.value, dist: +ds.value, nome: distName(+ds.value), utilizadores: us }); if (r?.erro) toast(r.erro, 7000); else if (r?.ok) { toast('Ficheiro guardado.'); registar('configuração de computador gerada', { alvo: distName(+ds.value) }); } } }) : null,
      h('button', { class: 'btn', text: 'Importar configuração…', onclick: async () => { if (pin.value.length < 6) { toast('Escreva primeiro o PIN.'); return; } const r = await window.educstat.cfgComputador('importar', { pin: pin.value }); if (!r) return; if (r.erro) { toast(r.erro, 7000); return; }
        await importarUtilizadoresCfg(r.utilizadores);
        await S.db.doc('config/instalacao').set({ ...(S.inst || {}), papel: 'distrito', dist: +r.dist, id: S.inst?.id || Math.random().toString(36).slice(2, 10) }); await registar('configuração importada', { alvo: distName(+r.dist) }); toast(`Este computador ficou configurado para o SDEJT de ${distName(+r.dist)}. Entre agora no servidor com a conta do distrito. O programa vai reiniciar.`, 8000); setTimeout(() => recarregar(), 3000); } })));
}
const adminSyncV17 = adminSync;
adminSync = async function (body) { await adminSyncV17(body); body.append(await cartaoDiagnostico(), cartaoConfigComputador()); };

// ---------------- assistente de perguntas sobre os dados (determinístico: só lê os dados, mostra fórmula e fonte) ----------------
function responderPergunta(txt, f0) {
  const t = String(txt || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const ano = +(t.match(/\b(20\d\d)\b/) || [])[1] || +f0.ano;
  const dist = S.cod.distritosTodos.find(([, n]) => t.includes(normGeo(n)) || t.includes(String(n).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()))?.[0];
  const nivel = /secundario.*2|esg ?2|2.? ?ciclo/.test(t) ? 'ESG2' : /secundario|esg ?1|1.? ?ciclo/.test(t) ? 'ESG1' : /primario|\bep\b/.test(t) ? 'EP' : 'Todos';
  const sexo = /raparigas|mulheres|meninas|feminin/.test(t) && !/percent|%|proporc/.test(t) ? 'Mulheres' : /rapazes|homens|masculin/.test(t) ? 'Homens' : 'Ambos';
  const MAPA = [[/aprova/, 'aprov'], [/desist|abandon/, 'desist'], [/reprova/, 'reprov'], [/repet/, 'repet'], [/raparigas.*(percent|%|proporc)|(percent|%|proporc).*raparigas|paridade/, 'pctF'], [/aluno.*professor|racio/, 'alprof'], [/aluno.*turma/, 'altur'], [/aluno.*sala/, 'alsala'], [/forma(cao|dos)/, 'formados'], [/professor/, 'prof'], [/turma/, 'turmas'], [/escolariza.*liquid|tle/, 'tle'], [/escolariza|tbe/, 'tbe'], [/conclus/, 'tbc'], [/sobreidade/, 'sob'], [/aluno|matricul|efectivo/, 'matric'], [/escola/, 'escolas']];
  const k = (MAPA.find(([re]) => re.test(t)) || [])[1]; if (!k) return null;
  const it = IND.find((x) => x[0] === k); const f = { dist: dist || f0.dist || 'Todos', tipo: 'Todos', nivel, sexo };
  const cur = indicators(sumUp(ano, f), sexo)[k], ant = indicators(sumUp(ano - 1, f), sexo)[k];
  const lugar = f.dist === 'Todos' ? 'na Província de Tete' : `no distrito de ${distName(f.dist)}`; const nvT = nivel === 'Todos' ? '' : ` (${MAPA_NOME[nivel]})`;
  if (cur == null) return { txt: `Não há dados de ${it[1].toLowerCase()} ${lugar} em ${ano}${nvT}.`, it };
  const dif = ant != null ? cur - ant : null;
  return { txt: `${it[1]}${nvT} ${lugar} em ${ano}${sexo !== 'Ambos' ? ` (${sexo.toLowerCase()})` : ''}: ${fmt(k, cur)}${dif != null ? ` (${fmtD(k, dif)} face a ${ano - 1})` : ''}.`, it, k, f, ano };
}
function cartaoAssistente(f) {
  const out = h('div', { style: 'display:flex;flex-direction:column;gap:6px' });
  const q = h('input', { type: 'search', placeholder: 'Ex.: taxa de aprovação no EP em Marávia em 2024 · alunos por professor em Angónia · raparigas no ESG1 2023', style: 'flex:1;min-width:18rem' });
  const ir = () => { const r = responderPergunta(q.value, f); out.replaceChildren(r ? h('div', { class: 'card', style: 'background:var(--soft)' }, h('strong', { text: r.txt }), r.it?.[3] ? h('p', { class: 'note', text: `Como se calcula: ${r.it[3]}. Universo: escolas com mapa introduzido no EducStat Tete. Fonte: levantamentos estatísticos de 3 de Março e de fim do ano.` }) : null)
    : h('p', { class: 'note', text: 'Não percebi o indicador. Experimente: alunos, professores, aprovação, desistência, repetência, raparigas, alunos por professor, alunos por turma, escolarização, conclusão.' })); };
  // a pergunta e a resposta ficam guardadas: a sincronização (que redesenha o painel) não as apaga
  const A = (S.assist ||= { q: '', feito: false }); q.value = A.q; q.oninput = () => { A.q = q.value; A.feito = false; };
  const ir0 = ir; const irG = () => { A.q = q.value; A.feito = true; ir0(); }; if (A.feito && A.q) setTimeout(ir0, 0);
  q.onkeydown = (e) => { if (e.key === 'Enter') irG(); };
  return h('div', { class: 'card' }, h('h2', { text: 'Perguntar aos dados' }), h('p', { class: 'note', text: 'Escreva a pergunta com o indicador, o lugar e o ano. A resposta vem só dos dados do sistema, com a fórmula e a fonte. Não altera nada.' }), h('div', { class: 'row' }, q, h('button', { class: 'btn primary', text: 'Responder', onclick: irG })), out);
}
const painelV16 = VIEWS.painel;
VIEWS.painel = async (v) => { await painelV16(v); const cards = v.querySelectorAll(':scope > .card'); const alvo = cards[0]; const c = cartaoAssistente(S.pf); if (alvo?.nextSibling) v.insertBefore(c, alvo.nextSibling); else v.append(c);
  // indicadores por posto e localidade (Excel), para o distrito escolhido
  if (S.pf.dist !== 'Todos' && alvo) alvo.querySelector('.row')?.append(h('button', { class: 'btn', text: 'Por posto e localidade (Excel)', onclick: () => exportarPorLocalidade(+S.pf.dist) })); };
async function exportarPorLocalidade(dist) {
  const anos = ANOS.filter((a) => a <= ANO_MAX_DADOS).slice(-5); const linhas = [];
  for (const a of anos) { const fm = [...(await fichasEfectivas(a, dist)).values()]; const grupos = new Map();
    for (const f of fm) { const e = S.esc.get(f.esc) || {}; for (const [nivelG, chave] of [['Posto administrativo', e.posto || 'Sem posto'], ['Localidade', `${e.posto || 'Sem posto'} › ${e.localidade || 'sem localidade'}`]]) { const kk = nivelG + '|' + chave; (grupos.get(kk) || grupos.set(kk, []).get(kk)).push(f); } }
    for (const [kk, fs] of grupos) { const [nv, nome] = kk.split('|'); const x = sumUpRs([window.EAgg.resumo(fs, escolaTipo, formados())], a, { dist, tipo: 'Todos', nivel: 'Todos', sexo: 'Ambos' }); const i = indicators(x, 'Ambos');
      linhas.push({ Ano: a, Nível: nv, Unidade: nome, Escolas: fs.length, Alunos: i.matric ?? '', '% raparigas': i.pctF ?? '', Professores: i.prof ?? '', 'Alunos/professor': i.alprof ?? '', 'Alunos/turma': i.altur ?? '', 'Aprovação': i.aprov ?? '', 'Desistência': i.desist ?? '' }); } }
  const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(linhas); for (const c of Object.keys(ws)) { if (c[0] === '!') continue; const col = c.replace(/\d+/, ''); if (['F', 'J', 'K'].includes(col) && typeof ws[c].v === 'number') ws[c].z = '0.0%'; if (['H', 'I'].includes(col) && typeof ws[c].v === 'number') ws[c].z = '0.0'; }
  ws['!autofilter'] = { ref: ws['!ref'] }; XLSX.utils.book_append_sheet(wb, ws, 'Por posto e localidade'); await guardarXlsx(wb, `Indicadores_${distName(dist).replace(/\s+/g, '_')}_por_localidade.xlsx`);
}

// ---------------- Introdução de Dados: escolher a escola por posto administrativo e localidade ----------------
const fillEscBase = fillEsc;
fillEsc = function () {
  fillEscBase(); if (!LV) return;
  if (!LV.filtroLoc) { const st = S.lfLoc ||= { posto: '', loc: '' };
    const ps = h('select', { 'aria-label': 'Posto administrativo' }), ls = h('select', { 'aria-label': 'Localidade' });
    const enche = () => { const base = escolasDoDistrito(S.sel.dist); const postos = [...new Set(base.map((e) => e.posto).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt')); if (!postos.includes(st.posto)) st.posto = '';
      ps.replaceChildren(h('option', { value: '', text: 'Todos os postos' }), ...postos.map((p) => h('option', { value: p, text: p, selected: p === st.posto })));
      const locs = [...new Set(base.filter((e) => !st.posto || e.posto === st.posto).map((e) => e.localidade).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt')); if (!locs.includes(st.loc)) st.loc = '';
      ls.replaceChildren(h('option', { value: '', text: 'Todas as localidades' }), ...locs.map((p) => h('option', { value: p, text: p, selected: p === st.loc }))); };
    ps.onchange = () => { st.posto = ps.value; st.loc = ''; enche(); fillEsc(); }; ls.onchange = () => { st.loc = ls.value; fillEsc(); };
    LV.filtroLoc = { enche }; enche();
    LV.busca.closest('label')?.before(h('label', { class: 'f' }, 'Posto administrativo', ps), h('label', { class: 'f' }, 'Localidade', ls)); }
  const st = S.lfLoc; if (!st?.posto && !st?.loc) return;
  for (const o of [...LV.escSel.options]) { if (!+o.value) continue; const e = S.esc.get(+o.value); if ((st.posto && e?.posto !== st.posto) || (st.loc && e?.localidade !== st.loc)) o.remove(); }
  const n = LV.escSel.options.length - 1; if (LV.escSel.options[0]) LV.escSel.options[0].text = n ? `— escolha uma escola (${n}) —` : 'Nenhuma escola encontrada';
};

// correspondência entre as áreas dos shapefiles de postos/localidades e os nomes do cadastro (para corrigir à mão)
function cartaoCorrespUnidades() {
  const st = S.cuSt ||= { nivel: 'postos', dist: S.cod.distritosTodos[0][0] };
  const camada = st.nivel === 'postos' ? S.limitesPostos : S.limitesLocalidades; const campo = st.nivel === 'postos' ? 'posto' : 'localidade';
  const box = h('div', { class: 'card' }, h('h2', { text: 'Correspondência dos postos e localidades' }));
  const sel = (k, list, lab) => h('label', { class: 'f' }, lab, h('select', { onchange: (e) => { st[k] = e.target.value; go(current); } }, list.map((o) => h('option', { value: o[0], text: o[1], selected: String(o[0]) === String(st[k]) }))));
  box.append(h('p', { class: 'note', text: 'Cada área do shapefile tem de corresponder a um posto ou localidade do cadastro das escolas, para os mapas por posto/localidade mostrarem os valores. Quando o nome no ficheiro for diferente, escolha aqui o nome certo.' }),
    h('div', { class: 'row' }, sel('nivel', [['postos', 'Postos administrativos'], ['localidades', 'Localidades']], 'Camada'), sel('dist', S.cod.distritosTodos, 'Distrito')));
  if (!camada || !S.limites) { box.append(h('p', { class: 'pill warn', text: 'Esta camada ainda não foi carregada.' })); return box; }
  const d3 = window.d3; const fd = S.limites.features.filter((f) => codDistritoGeo(f, S.limitesCampo) === +st.dist);
  const fts = camada.features.filter((p) => { try { return fd.some((f) => d3.geoContains(f, d3.geoCentroid(p))); } catch { return false; } });
  const nomes = [...new Set([...S.esc.values()].filter((e) => +e.dist === +st.dist && e[campo]).map((e) => e[campo]))].sort((a, b) => a.localeCompare(b, 'pt'));
  const auto = (f) => { const n = normGeo(f.properties?.__nome); return nomes.find((x) => normGeo(x) === n) || nomes.find((x) => n.length >= 4 && lev(normGeo(x), n) <= 2) || ''; };
  const sels = fts.map((f) => { const atual = f.properties.__alias ?? auto(f); const s_ = h('select', {}, h('option', { value: '', text: '(sem correspondência)' }), nomes.map((x) => h('option', { value: x, text: x, selected: x === atual }))); return { f, s_ }; });
  box.append(fts.length ? h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Área no shapefile', 'Nome no cadastro', 'Estado'].map((t) => h('th', { class: 'l', text: t })))),
    h('tbody', {}, sels.map(({ f, s_ }) => h('tr', {}, h('td', { class: 'l', text: f.properties?.__nome || '—' }), h('td', { class: 'l' }, s_), h('td', { class: 'l' }, h('span', { class: 'pill ' + (s_.value ? 'ok' : 'warn'), text: s_.value ? (f.properties.__alias ? 'escolhido' : 'automático') : 'sem nome' }))))))) : h('p', { class: 'note', text: 'Nenhuma área desta camada fica dentro do distrito escolhido.' }),
    fts.length ? h('button', { class: 'btn primary', text: 'Gravar as correspondências', onclick: async () => { for (const { f, s_ } of sels) f.properties.__alias = s_.value || null; const doc = st.nivel === 'postos' ? 'config/limitesPostos' : 'config/limitesLocalidades'; const cur = (await S.db.doc(doc).get()).data() || {}; await S.db.doc(doc).set({ ...cur, geojson: JSON.stringify(camada) }); await registar('correspondência de ' + st.nivel + ' gravada', { alvo: distName(+st.dist) }); toast('Gravado. Segue para os distritos na sincronização.'); } }) : null);
  return box;
}
