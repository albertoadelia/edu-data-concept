/* EducStat Tete — sistema de introdução de dados e painel. Dados 2004–2025 vêm dos ficheiros data/*.json (bases Access);
   tudo o que se lança ou corrige aqui é gravado na base partilhada (db) e o painel recalcula-se sozinho. */
(() => {
'use strict';
// append/replaceChildren ignoram null e false (permite filhos condicionais)
for (const P_ of [Element.prototype, DocumentFragment.prototype]) for (const m_ of ['append', 'replaceChildren', 'prepend']) { const o_ = P_[m_]; P_[m_] = function (...k) { return o_.apply(this, k.flat().filter((x) => x != null && x !== false)); }; }
const $ = (s, el = document) => el.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'value') e.value = v; else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
};
const NF = new Intl.NumberFormat('pt-PT'), P1 = new Intl.NumberFormat('pt-PT', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const R1 = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }), R2 = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const desc = (l) => [...l].sort((a, b) => b - a); // anos do maior para o menor em todas as listas
const clone = (o) => JSON.parse(JSON.stringify(o ?? null));
const DESKTOP = !!window.educstat;
const ANO_MIN = 2004, ANO_MAX_DADOS = 2025, ANO_NOVO = new Date().getFullYear() + 1;
const ANOS = []; for (let a = ANO_MIN; a <= Math.max(ANO_NOVO, ANO_MAX_DADOS + 1); a++) ANOS.push(a);

// ---------------- estado ----------------
const S = {
  cod: null, escStatic: [], esc: new Map(), escDb: new Map(), resumoBase: {}, resumoDb: new Map(),
  fichasStatic: new Map(), dbFichas: new Map(), db: null, user: null, downloads: null, me: null, canWrite: null,
  sel: { ano: 2025, dist: 0, esc: 0, lev: 'marco', blk: '__todos' }, draft: null, dirty: false, fichaSub: null, fichaSubKey: '',
  pf: { ano: 2024, dist: 'Todos', tipo: 'Todos', nivel: 'Todos', sexo: 'Ambos', serie: 'matric', mapa: 'alprof' }, names: {},
};
const formados = () => ({ antigo: new Set(S.cod.qual.antigo.filter((q) => q[2]).map((q) => q[0])), SNE: new Set(S.cod.qual.SNE.filter((q) => q[2]).map((q) => q[0])) });
let FORM = null;
const distName = (d) => ((S.cod.distritosTodos || S.cod.distritos).find((x) => x[0] === +d) || [0, '—'])[1];
const ensAbbr = (e) => (S.cod.ensinos.find((x) => x[0] === +e) || [0, String(e)])[1];
const sisDe = (ano) => (ano >= 2023 ? 'SNE' : 'antigo');
const NIVEL = window.EAgg.NIVEL;
const escolaTipo = (cod) => S.esc.get(+cod)?.tipo || 'Pública';
const toast = (msg, ms = 3200) => { const t = h('div', { class: 'toast', role: 'status', text: msg }); document.body.append(t); setTimeout(() => t.remove(), ms); };
const confirmBox = (msg, okLabel = 'Continuar') => new Promise((res) => {
  const m = h('div', { class: 'modal' }, h('div', {}, h('p', { text: msg, style: 'margin:0;line-height:1.5' }),
    h('div', { class: 'row', style: 'justify-content:flex-end' }, h('button', { class: 'btn', text: 'Cancelar', onclick: () => { m.remove(); res(false); } }),
      h('button', { class: 'btn primary', text: okLabel, onclick: () => { m.remove(); res(true); } }))));
  document.body.append(m);
});
// janela para escrever um valor (substitui window.prompt, que o Electron não suporta)
const promptBox = (msg, { okLabel = 'Continuar', senha = false, placeholder = '', valor = '' } = {}) => new Promise((res) => {
  const inp = h('input', { type: senha ? 'password' : 'text', placeholder, value: valor, style: 'width:100%;margin-top:8px', autofocus: true });
  const fechar = (v) => { m.remove(); res(v); };
  const m = h('div', { class: 'modal' }, h('div', {}, h('p', { text: msg, style: 'margin:0;line-height:1.5' }), inp,
    h('div', { class: 'row', style: 'justify-content:flex-end' }, h('button', { class: 'btn', text: 'Cancelar', onclick: () => fechar(null) }),
      h('button', { class: 'btn primary', text: okLabel, onclick: () => fechar(inp.value.trim() || null) }))));
  inp.onkeydown = (e) => { if (e.key === 'Enter') fechar(inp.value.trim() || null); if (e.key === 'Escape') fechar(null); };
  document.body.append(m); setTimeout(() => inp.focus(), 40);
});
// mostra um código único (recuperação) com botão de cópia — visível uma só vez
const codigoBox = (titulo, codigo, nota) => new Promise((res) => {
  const m = h('div', { class: 'modal' }, h('div', { style: 'max-width:34rem' }, h('h2', { text: titulo }),
    h('div', { class: 'codigo-rec', style: 'font-family:ui-monospace,Menlo,Consolas,monospace;font-size:1.5rem;letter-spacing:.12em;font-weight:700;text-align:center;padding:14px;margin:10px 0;border:2px dashed var(--linha,#bbb);border-radius:10px;user-select:all', text: codigo }),
    nota ? h('p', { class: 'note', text: nota }) : null,
    h('div', { class: 'row', style: 'justify-content:flex-end' },
      h('button', { class: 'btn', text: 'Copiar', onclick: async () => { try { await navigator.clipboard.writeText(codigo); toast('Código copiado.'); } catch {} } }),
      h('button', { class: 'btn primary', text: 'Guardei o código', onclick: () => { m.remove(); res(true); } }))));
  document.body.append(m);
});

// ---------------- dados ----------------
async function loadJSON(p) { const r = await fetch(p); if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); }
async function fichasStatic(ano, dist) {
  const k = ano + '_' + dist;
  if (!S.fichasStatic.has(k)) {
    let lst = [];
    if (ano >= ANO_MIN && ano <= ANO_MAX_DADOS) { try { lst = await loadJSON(`data/${ano}/${dist}.json`); } catch { lst = []; } }
    S.fichasStatic.set(k, new Map(lst.map((f) => [f.esc, f])));
  }
  return S.fichasStatic.get(k);
}
function rebuildEscolas() {
  S.esc = new Map(S.escStatic.map((e) => [e.cod, e]));
  for (const [cod, e] of S.escDb) S.esc.set(cod, { ...(S.esc.get(cod) || {}), ...e, cod });
}
const escolasDoDistrito = (d) => [...S.esc.values()].filter((e) => +e.dist === +d && !e.removida).sort((a, b) => +b.cod - +a.cod); // pelo código, do maior para o menor
// fichas efectivas de um distrito/ano: base Access + correcções gravadas
async function fichasEfectivas(ano, dist, fresh = false) {
  if (!visivel(ano, dist)) return new Map();
  const base = await fichasStatic(ano, dist);
  const m = new Map(base);
  let dbl;
  if (S.db && fresh) {
    const q = await S.db.collection('fichas').where('ano', '==', ano).where('dist', '==', +dist).get();
    dbl = q.docs.map((d) => d.data());
  } else dbl = [...(S.dbFichas.get(ano + '_' + dist)?.values() || [])];
  for (const f of dbl) { if (f.apagada) m.delete(f.esc); else m.set(f.esc, f); }
  // escola que mudou de distrito numa correcção gravada noutro distrito: ignora-se aqui
  return m;
}
function estadoDe(fmap) {
  const est = {};
  // recebido = o Quadro 1 (alunos) tem números; um mapa só começado fica como parcial (p)
  const temAlunos = (f) => (f.marco?.alunos || []).some((r) => Object.values(r.id || {}).some((v) => (+v?.[0] || 0) + (+v?.[1] || 0) > 0));
  for (const [esc, f] of fmap) { const m = temAlunos(f); est[esc] = { m, p: !m && !!(f.marco && Object.keys(f.marco).length), f: !!(f.fim?.aprov?.length), por: f.por || null, em: f.em || null }; }
  return est;
}
async function recalcResumo(ano, dist) {
  const fm = await fichasEfectivas(ano, dist, true);
  const r = window.EAgg.resumo([...fm.values()], escolaTipo, formados());
  r.estado = estadoDe(fm); r.ano = ano; r.dist = +dist; r.em = new Date().toISOString(); r.por = S.me?.id || null;
  await S.db.doc(`resumo/${ano}_${dist}`).set(r);
  S.resumoDb.set(`${ano}_${dist}`, r);
}
// num computador de SDEJT, os dados de outros distritos de anos ainda não publicados pela DPE não se mostram
// (os anos até 2024, que vêm no instalador, são estatísticas já fechadas)
const ANO_FECHADO = 2024;
function visivel(ano, dist) { const meu = S.inst?.papel === 'distrito' ? +S.inst.dist : +(S.sessao?.dist || 0); return !(meu && +dist !== meu && +ano > ANO_FECHADO && !anoPublicado(+ano)); }
function resumoDe(ano, dist) { if (!visivel(ano, dist)) return null; return S.resumoDb.get(`${ano}_${dist}`) || S.resumoBase[`${ano}_${dist}`] || null; }

// ---------------- arranque ----------------
async function boot() {
  try {
    const [cod, esc, res] = await Promise.all([loadJSON('data/codigos.json'), loadJSON('data/escolas.json'), loadJSON('data/resumo.json')]);
    S.cod = cod; S.escStatic = esc; S.resumoBase = res; rebuildEscolas();
    S.sel.dist = S.cod.distritos[0][0];
    if (DESKTOP) aplicarParametros();
    FORM = buildForms();
  } catch (e) {
    $('#view').replaceChildren(h('div', { class: 'empty', text: 'Não foi possível carregar os dados de base do programa (pasta data em falta ou danificada). Reinstale o EducStat Tete com o instalador oficial.' })); return;
  }
  const C = window.claude;
  if (DESKTOP) {
    S.db = await C.use('db'); S.user = await C.use('user'); S.downloads = await C.use('downloads');
    await login(); await carregarBaseRemovida(); await loadSetup(); try { avisoCorrompidos(); avisoPastaEmUso(); iniciarBloqueio(); } catch {}
    const cc = (await S.db.doc('config/codigos').get()).data() || {}; for (const [k, v_] of Object.entries(cc)) setPath(S.cod, k, v_); FORM = buildForms();
    S.metas = (await S.db.doc('config/metas').get()).data() || {};
    S.mapasCfg = (await S.db.doc('config/mapas').get()).data() || { linhas: [] };
    await instalacao(); if (S.sessao?.perfil !== 0) iniciarSyncAuto(); garantirContasSDEJT();
    // população: projecções do INE embutidas (2007-2020 e 2021-2050), substituídas pelo que for lançado em Administração > População
    let popBase = {}; try { popBase = await loadJSON('data/populacao.json'); } catch {}
    S.popBase = popBase;
    S.pop = new Map(Object.entries(popBase));
    for (const d of (await S.db.collection('populacao').get()).docs) S.pop.set(d.id, d.data());
    await carregarTrancas();
    if (S.sessao.dist && !S.cod.distritos.some((d) => d[0] === +S.sessao.dist)) S.cod.distritos = S.cod.distritosTodos;
    if (!S.cenStatic) { try { S.cenStatic = await loadJSON('data/centros.json'); } catch { S.cenStatic = []; } S.cenDb = new Map((await S.db.collection('centros').get()).docs.map((d) => [+d.id, d.data()])); rebuildCentros(); }
    S.me = await S.user.me(); S.canWrite = await S.user.can('data.write');
    if (S.sessao.dist) { S.sel.dist = S.sessao.dist; }
    drawWho(); if (S.sessao?.perfil !== 0) iniciarMensagens(); iniciarPresenca(); desenharIcones(); desenharEstadoSync(); setTimeout(copiaAutomatica, 20000);
    S.db.collection('config').onSnapshot(() => { carregarTrancas(); }, () => {});
    S.db.collection('resumo').onSnapshot((snap) => { for (const d of snap.docs) S.resumoDb.set(d.id, d.data()); redrawSoft('resumo'); }, () => {});
    S.db.collection('escolas').onSnapshot((snap) => { S.escDb = new Map(snap.docs.map((d) => [+d.id, d.data()])); rebuildEscolas(); }, () => {});
    route(); window.addEventListener('hashchange', route);
    setTimeout(() => iniciarTour(false), 1200);
    return;
  }
  route();
  window.addEventListener('hashchange', route);
  // capacidades (chegam depois do primeiro desenho)
  if (C?.use) {
    C.use('user').then(async (u) => {
      S.user = u; if (!u) return;
      S.me = await u.me(); S.canWrite = await u.can('data.write');
      const who = $('#who'); who.replaceChildren(h('img', { src: S.me.avatarUrl, alt: '' }), h('span', { text: S.me.name || 'Utilizador' }));
      redrawSoft();
    });
    C.use('downloads').then((d) => { S.downloads = d; redrawSoft(); });
    C.use('db').then((db) => {
      S.db = db; if (!db) { redrawSoft(); return; }
      db.collection('resumo').onSnapshot((snap) => {
        for (const d of snap.docs) S.resumoDb.set(d.id, d.data());
        for (const ch of snap.docChanges()) if (ch.type === 'removed') S.resumoDb.delete(ch.doc.id);
        redrawSoft('resumo');
      }, () => {});
      db.collection('escolas').onSnapshot((snap) => {
        S.escDb = new Map(snap.docs.map((d) => [+d.id, d.data()])); rebuildEscolas(); redrawSoft('escolas');
      }, () => {});
      subscribeFichas();
      redrawSoft();
    });
  }
}
function subscribeFichas() {
  if (!S.db) return;
  const k = S.sel.ano + '_' + S.sel.dist;
  if (S.fichaSubKey === k) return;
  S.fichaSub?.(); S.fichaSubKey = k;
  const { ano, dist } = S.sel;
  S.fichaSub = S.db.collection('fichas').where('ano', '==', ano).where('dist', '==', +dist).onSnapshot((snap) => {
    S.dbFichas.set(k, new Map(snap.docs.map((d) => [d.data().esc, d.data()])));
    if (current === 'lancar') onFichasChanged();
  }, () => {});
}

// ---------------- rotas ----------------
let current = '';
const VIEWS = {};
function route() {
  let r = (location.hash.slice(1) || 'inicio').split('-')[0];
  if (r === 'indicadores') { S.ajudaTab = 'ficha'; r = 'ajuda'; }
  const name = VIEWS[r] ? r : 'inicio';
  if (current === 'alfa' && name !== 'alfa' && S.adirty) {
    confirmBox('Há alterações por gravar neste mapa de centro. Sair sem gravar?', 'Sair sem gravar').then((ok) => { if (ok) { S.adirty = false; go(name); } else history.replaceState(null, '', '#alfa'); });
    return;
  }
  if (current === 'lancar' && name !== 'lancar' && S.dirty) {
    confirmBox('Há alterações por gravar neste mapa. Sair sem gravar?', 'Sair sem gravar').then((ok) => {
      if (ok) { S.dirty = false; go(name); } else history.replaceState(null, '', '#lancar');
    });
    return;
  }
  go(name);
}
function go(name) {
  // ao redesenhar a mesma página (mudar um filtro, carregar um ficheiro), fica-se no mesmo sítio: não se volta ao topo
  const mesma = current === name; const y = window.scrollY; const v = $('#view');
  current = name;
  for (const a of document.querySelectorAll('nav.menu a')) a.toggleAttribute('aria-current', a.dataset.r === name), a.dataset.r === name && a.setAttribute('aria-current', 'page');
  if (mesma) v.style.minHeight = v.offsetHeight + 'px';
  v.replaceChildren(); const r = VIEWS[name](v);
  if (!mesma) { v.style.minHeight = ''; window.scrollTo(0, 0); return; }
  const repor = () => { if (current === name) window.scrollTo(0, y); };
  repor(); Promise.resolve(r).finally(() => { repor(); setTimeout(repor, 120); setTimeout(() => { repor(); v.style.minHeight = ''; }, 700); });
}
let softTimer = 0;
function redrawSoft(what) {
  clearTimeout(softTimer);
  softTimer = setTimeout(() => {
    // quem está a escrever (pergunta no painel, procura, filtros) não perde o que escreveu: o redesenho espera que saia do campo
    const ae = document.activeElement;
    if (ae && $('#view').contains(ae) && (ae.tagName === 'TEXTAREA' || (ae.tagName === 'INPUT' && !['checkbox', 'radio', 'button'].includes(ae.type)) || ae.tagName === 'SELECT')) { ae.addEventListener('blur', () => redrawSoft(what), { once: true }); return; }
    if (document.querySelector('.modal')) { softTimer = setTimeout(() => redrawSoft(what), 3000); return; }
    if (current === 'inicio' || current === 'painel' || (current === 'escolas' && what !== 'resumo')) { const v = $('#view'); const y = window.scrollY; const guard = [...v.querySelectorAll('input[type=search],input[type=text],textarea')].map((x) => [x.id || x.placeholder, x.value]); v.replaceChildren(); VIEWS[current](v); window.scrollTo(0, y); setTimeout(() => { for (const [k, val] of guard) { if (!val) continue; const el = [...v.querySelectorAll('input[type=search],input[type=text],textarea')].find((x) => (x.id || x.placeholder) === k); if (el && !el.value) el.value = val; } }, 400); }
    if (current === 'lancar') { if (!S.dirty && S.draft) drawLancar(); else drawLancarStatus(); }
    if (current === 'excel' && !S.importing) { const v = $('#view'); v.replaceChildren(); VIEWS.excel(v); }
  }, 150);
}
const writeNote = () => {
  if (!S.db) return 'A base partilhada não está disponível nesta vista: pode consultar, mas não gravar.';
  if (S.canWrite === false) return 'O seu acesso é só de leitura. Peça ao responsável que o adicione como colaborador para introduzir dados.';
  return null;
};

// =====================================================================
// INÍCIO
// =====================================================================
VIEWS.inicio = (v) => {
  const ano = S.inicioAno || Math.min(ANO_MAX_DADOS, ANOS[ANOS.length - 1]);
  const sel = h('select', { id: 'i-ano', onchange: (e) => { S.inicioAno = +e.target.value; go('inicio'); } }, desc(ANOS).map((a) => h('option', { value: a, text: a, selected: a === ano })));
  v.append(h('div', { class: 'row between' }, h('div', {}, h('h1', { text: 'Estado da Introdução de Dados' }),
    h('p', { class: 'lede', text: 'Mapas de Levantamento Estatístico (3 de Março e fim do ano) já introduzidos, por distrito. As escolas activas são as que têm mapa neste ano ou no ano anterior.' })),
    h('label', { class: 'f' }, 'Ano', sel)));
  const wn = writeNote(); if (wn) v.append(h('p', { class: 'pill warn', text: wn }));
  // destaque: a província em números, com a tendência desde 2018
  try {
    const F0 = { dist: 'Todos', tipo: 'Todos', nivel: 'Todos', sexo: 'Ambos' };
    const anosD = ANOS.filter((a) => a <= ano && S.cod.distritos.some((d) => resumoDe(a, d[0])));
    const serie = (k) => anosD.map((a) => indicators(sumUp(a, F0), 'Ambos')[k]);
    const spark = (vals) => { const ok = vals.filter((x) => x != null); if (ok.length < 2) return null; const mn = Math.min(...ok), mx = Math.max(...ok) || 1; const W = 120, H = 28; const pts = vals.map((x, i) => x == null ? null : [i / (vals.length - 1) * W, H - 3 - ((x - mn) / ((mx - mn) || 1)) * (H - 6)]).filter(Boolean);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('aria-hidden', 'true');
      const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); pl.setAttribute('points', pts.map((p) => p.join(',')).join(' ')); pl.setAttribute('fill', 'none'); pl.setAttribute('stroke', 'var(--accent)'); pl.setAttribute('stroke-width', '2'); svg.append(pl); return svg; };
    const cur = indicators(sumUp(ano, F0), 'Ambos');
    const KH = [['matric', 'Alunos'], ['escolas', 'Escolas com alunos'], ['prof', 'Professores'], ['alprof', 'Alunos por professor'], ['pctF', 'Raparigas'], ['aprov', 'Aprovação (fim do ano)']];
    v.append(h('div', { class: 'kpis hero' }, KH.map(([k, l]) => h('div', { class: 'kpi' }, h('span', { class: 'l', text: `${l} · ${ano}` }), h('span', { class: 'v', text: fmt(k, cur[k]) }), h('span', { class: 'd' }, spark(serie(k)), anosD.length > 1 ? ` desde ${anosD[0]}` : ''), k === 'aprov' && cur.cobFim != null && cur.cobFim < 0.95 ? h('span', { class: 'd', style: 'color:var(--warn)', text: `Parcial: só ${P1.format(cur.cobFim)} das escolas introduziram o fim do ano` }) : null))));
  } catch (e) { console.warn(e); }
  const rows = []; let T = { act: 0, m: 0, f: 0 };
  for (const [d, nome] of S.cod.distritos) {
    const est = resumoDe(ano, d)?.estado || {}, prev = resumoDe(ano - 1, d)?.estado || {};
    const act = new Set([...Object.keys(est), ...Object.keys(prev)]).size;
    const m = Object.values(est).filter((x) => x.m).length, f = Object.values(est).filter((x) => x.f).length;
    const last = Object.values(est).map((x) => x.em).filter(Boolean).sort().pop();
    T.act += act; T.m += m; T.f += f;
    rows.push({ d, nome, act, m, f, last });
  }
  const bar = (n, t) => h('div', { class: 'row', style: 'gap:8px;align-items:center;flex-wrap:nowrap' }, h('div', { class: 'bar' }, h('i', { style: `width:${t ? Math.min(100, (100 * n) / t) : 0}%` })), h('span', { text: t ? P1.format(n / t) : '—' }));
  const tb = h('tbody', {}, rows.map((r) => h('tr', {},
    h('td', {}, h('a', { href: '#lancar', onclick: () => { S.sel.ano = ano; S.sel.dist = r.d; S.sel.esc = 0; }, text: r.nome })),
    h('td', { text: NF.format(r.act) }), h('td', { text: NF.format(r.m) }), h('td', {}, bar(r.m, r.act)), h('td', { text: NF.format(r.f) }), h('td', {}, bar(r.f, r.act)),
    h('td', { class: 'hide-sm', text: r.last ? new Date(r.last).toLocaleString('pt-PT') : '—' }))));
  const tf = h('tfoot', {}, h('tr', {}, h('td', { text: 'Província' }), h('td', { text: NF.format(T.act) }), h('td', { text: NF.format(T.m) }), h('td', {}, bar(T.m, T.act)), h('td', { text: NF.format(T.f) }), h('td', {}, bar(T.f, T.act)), h('td', { class: 'hide-sm' })));
  v.append(h('div', { class: 'card' }, h('div', { class: 'tw' }, h('table', {},
    h('thead', {}, h('tr', {}, h('th', { text: 'Distrito' }), h('th', { text: 'Escolas activas' }), h('th', { text: 'Mapas de Março' }), h('th', { text: '% Março' }), h('th', { text: 'Mapas de fim do ano' }), h('th', { text: '% Fim do ano' }), h('th', { class: 'hide-sm', text: 'Última gravação aqui' }))),
    tb, tf)), h('p', { class: 'note', text: 'Clique num distrito para introduzir os mapas das suas escolas. "Última gravação aqui" só conta o que foi introduzido neste sistema (os dados vindos do Access não têm data).' })));
  // actividade recente
  const act = h('div', { class: 'card' }, h('h2', { text: 'Últimos mapas gravados' }), h('div', { class: 'note', text: 'A carregar…' }));
  v.append(act);
  if (S.db) {
    S.db.collection('fichas').orderBy('em', 'desc').limit(15).get().then(async (q) => {
      const docs = q.docs.map((d) => d.data());
      if (!docs.length) { act.lastChild.textContent = 'Ainda não foi gravado nenhum mapa neste sistema.'; return; }
      const ids = [...new Set(docs.map((d) => d.por).filter(Boolean))];
      const ps = S.user ? await S.user.profiles(ids) : {};
      act.lastChild.replaceWith(h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { text: 'Escola' }), h('th', { class: 'l', text: 'Distrito' }), h('th', { text: 'Ano' }), h('th', { class: 'l', text: 'Por' }), h('th', { text: 'Quando' }))),
        h('tbody', {}, docs.map((d) => h('tr', {}, h('td', { text: S.esc.get(d.esc)?.nome || d.esc }), h('td', { class: 'l', text: distName(d.dist) }), h('td', { text: d.ano }),
          h('td', { class: 'l', text: (ps[d.por]?.name) || 'Alguém' }), h('td', { text: d.em ? new Date(d.em).toLocaleString('pt-PT') : '—' })))))));
    }).catch(() => { act.lastChild.textContent = 'Não foi possível ler a actividade recente.'; });
  } else act.lastChild.textContent = 'Disponível quando a base partilhada estiver ligada.';
};

// =====================================================================
// FORMULÁRIOS (blocos da ficha)
// =====================================================================
function opts(list) { return list.map((x) => [x[0], x.length > 2 && typeof x[1] === 'string' && x[1].length < 8 ? `${x[1]}` : `${x[1]}`]); }
function buildForms() {
  const ens = S.cod.ensinos.map((e) => [e[0], `${e[1]} – ${e[2]}`]);
  const tur = S.cod.turnos;
  const pair = (k, label) => [{ k: k + 'H', label: label + ' H' }, { k: k + 'M', label: label + ' M' }];
  const byCl = (r, f) => Object.entries(r.v || {}).map(([cl, v]) => ({ ...f, cl: +cl, h: +v[0] || 0, m: +v[1] || 0 }));
  const groupCl = (rows, keyf, mk) => {
    const out = new Map();
    for (const r of rows) {
      const k = keyf(r); const o = out.get(k) || mk(r); o.v ||= {};
      const p = o.v[r.cl] || [0, 0]; p[0] += +r.h || 0; p[1] += +r.m || 0; o.v[r.cl] = p; out.set(k, o);
    }
    return [...out.values()].filter((o) => Object.values(o.v).some((p) => p[0] || p[1]));
  };
  const BL = {
    marco: [
      { id: 'alunos', label: 'Alunos por idade', special: 'alunos' },
      { id: 'prof', label: 'Professores', cols: (sis) => [{ k: 'ens', label: 'Ensino', sel: ens }, { k: 'tur', label: 'Turno', sel: tur }, { k: 'cl', label: 'Classe', int: true }, { k: 'q', label: 'Qualificação', sel: S.cod.qual[sis].map((q) => [q[0], q[1]]) }, ...pair('', 'Professores').map((c, i) => ({ k: i ? 'm' : 'h', label: c.label }))],
        from: (b) => (b || []).map((r) => ({ ens: r.ens, tur: r.tur, cl: r.cl || 0, q: r.q, h: r.v[0], m: r.v[1] })), to: (rows) => rows.filter((r) => r.h || r.m).map((r) => ({ ens: +r.ens, tur: +r.tur, cl: +r.cl || 0, q: +r.q, v: [+r.h || 0, +r.m || 0] })), total: true },
      { id: 'salas', label: 'Salas e pessoal', special: 'salas' },
      { id: 'orfaos', label: 'Órfãos', cols: () => [{ k: 'ens', label: 'Ensino', sel: ens }, { k: 'tur', label: 'Turno', sel: tur }, { k: 'cl', label: 'Classe', int: true }, { k: 'paiH', label: 'De pai H' }, { k: 'paiM', label: 'De pai M' }, { k: 'maeH', label: 'De mãe H' }, { k: 'maeM', label: 'De mãe M' }, { k: 'ambosH', label: 'De ambos H' }, { k: 'ambosM', label: 'De ambos M' }],
        from: (b) => (b || []).map((r) => ({ ens: r.ens, tur: r.tur, cl: r.cl, paiH: r.pai[0], paiM: r.pai[1], maeH: r.mae[0], maeM: r.mae[1], ambosH: r.ambos[0], ambosM: r.ambos[1] })),
        to: (rows) => rows.map((r) => ({ ens: +r.ens, tur: +r.tur, cl: +r.cl || 0, pai: [+r.paiH || 0, +r.paiM || 0], mae: [+r.maeH || 0, +r.maeM || 0], ambos: [+r.ambosH || 0, +r.ambosM || 0] })), total: true },
      { id: 'defic', label: 'Deficiência', cols: () => [{ k: 'ens', label: 'Ensino', sel: ens }, { k: 'tur', label: 'Turno', sel: tur }, { k: 'tipo', label: 'Tipo de deficiência', sel: S.cod.defic }, { k: 'cl', label: 'Classe', int: true }, { k: 'h', label: 'Alunos H' }, { k: 'm', label: 'Alunos M' }],
        from: (b) => (b || []).flatMap((r) => byCl(r, { ens: r.ens, tur: r.tur, tipo: r.tipo })), to: (rows) => groupCl(rows, (r) => [r.ens, r.tur, r.tipo].join('|'), (r) => ({ ens: +r.ens, tur: +r.tur, tipo: +r.tipo })), total: true },
      { id: 'livros', label: 'Alunos com livro', cols: (sis) => [{ k: 'ens', label: 'Ensino', sel: ens }, { k: 'tur', label: 'Turno', sel: tur }, { k: 'disc', label: 'Disciplina', sel: S.cod.livros[sis] }, { k: 'cl', label: 'Classe', int: true }, { k: 'h', label: 'Alunos H' }, { k: 'm', label: 'Alunos M' }, { k: 'n', label: 'Total (HM)' }],
        // como no mapa: alunos com livro por sexo (H e M); o total é H + M (os anos antigos só têm o total)
        from: (b) => (b || []).flatMap((r) => Object.entries(r.v || {}).map(([cl, n]) => ({ ens: r.ens, tur: r.tur, disc: r.disc, cl: +cl, h: +r.vs?.[cl]?.[0] || 0, m: +r.vs?.[cl]?.[1] || 0, n }))),
        to: (rows) => { const m = new Map(); for (const r of rows) { const k = [r.ens, r.tur, r.disc].join('|'); const o = m.get(k) || { ens: +r.ens, tur: +r.tur, disc: +r.disc, v: {}, vs: {} }; const hm = (+r.h || 0) + (+r.m || 0); o.v[r.cl] = (o.v[r.cl] || 0) + (hm || +r.n || 0); if (hm) { const p = o.vs[r.cl] || [0, 0]; o.vs[r.cl] = [p[0] + (+r.h || 0), p[1] + (+r.m || 0)]; } m.set(k, o); } return [...m.values()].filter((o) => Object.values(o.v).some(Boolean)).map((o) => (Object.keys(o.vs).length ? o : (delete o.vs, o))); }, total: true },
      { id: 'manuais', label: 'Professores com manuais', cols: (sis) => [{ k: 'ens', label: 'Ensino', sel: ens }, { k: 'tur', label: 'Turno', sel: tur }, { k: 'disc', label: 'Disciplina', sel: (S.cod.manuais || S.cod.livros)[sis] }, { k: 'cl', label: 'Classe', int: true }, { k: 'n', label: 'Professores com manual' }],
        from: (b) => (b || []).flatMap((r) => Object.entries(r.v || {}).map(([cl, n]) => ({ ens: r.ens, tur: r.tur, disc: r.disc, cl: +cl, n }))),
        to: (rows) => { const m = new Map(); for (const r of rows) { const k = [r.ens, r.tur, r.disc].join('|'); const o = m.get(k) || { ens: +r.ens, tur: +r.tur, disc: +r.disc, v: {} }; o.v[r.cl] = (o.v[r.cl] || 0) + (+r.n || 0); m.set(k, o); } return [...m.values()].filter((o) => Object.values(o.v).some(Boolean)); }, total: true },
      { id: 'infra', label: 'Infra-estruturas', special: 'infra' },
    ],
    fim: [
      { id: 'aprov', label: 'Aproveitamento', cols: () => [{ k: 'ens', label: 'Ensino', sel: ens }, { k: 'tur', label: 'Turno', sel: tur }, { k: 'cl', label: 'Classe', int: true }, { k: 'fimH', label: 'No fim do ano H' }, { k: 'fimM', label: 'No fim do ano M' }, { k: 'exH', label: 'A exame H' }, { k: 'exM', label: 'A exame M' }, { k: 'apH', label: 'Aprovados H' }, { k: 'apM', label: 'Aprovados M' }, { k: 'tp', label: 'Turmas puras' }, { k: 'tm', label: 'Turmas mistas' }],
        from: (b) => (b || []).map((r) => ({ ens: r.ens, tur: r.tur, cl: r.cl, fimH: r.fim[0], fimM: r.fim[1], exH: r.exame?.[0] || 0, exM: r.exame?.[1] || 0, apH: r.aprov[0], apM: r.aprov[1], tp: r.tp || 0, tm: r.tm || 0, notas: r.notas || {} })),
        to: (rows, old) => rows.map((r) => ({ ens: +r.ens, tur: +r.tur, cl: +r.cl, fim: [+r.fimH || 0, +r.fimM || 0], exame: [+r.exH || 0, +r.exM || 0], aprov: [+r.apH || 0, +r.apM || 0], tp: +r.tp || 0, tm: +r.tm || 0, notas: r.notas || {} })),
        check: (r) => ((+r.apH > +r.fimH || +r.apM > +r.fimM) ? 'Aprovados maior que alunos no fim do ano' : null), total: true },
      { id: 'notas', label: 'Notas por disciplina', special: 'notas' },
      { id: 'desist', label: 'Desistências', cols: (sis) => [{ k: 'ens', label: 'Ensino', sel: ens }, { k: 'tur', label: 'Turno', sel: tur }, { k: 'mot', label: 'Motivo', sel: S.cod.motivos[sis] }, { k: 'cl', label: 'Classe', int: true }, { k: 'h', label: 'Desistentes H' }, { k: 'm', label: 'Desistentes M' }],
        from: (b) => (b || []).flatMap((r) => byCl(r, { ens: r.ens, tur: r.tur, mot: r.mot })), to: (rows) => groupCl(rows, (r) => [r.ens, r.tur, r.mot].join('|'), (r) => ({ ens: +r.ens, tur: +r.tur, mot: +r.mot })), total: true },
      { id: 'transf', label: 'Transferências', cols: () => [{ k: 'ens', label: 'Ensino', sel: ens }, { k: 'tur', label: 'Turno', sel: tur }, { k: 'tipo', label: 'Movimento', sel: S.cod.transf }, { k: 'cl', label: 'Classe', int: true }, { k: 'h', label: 'Alunos H' }, { k: 'm', label: 'Alunos M' }],
        from: (b) => (b || []).flatMap((r) => byCl(r, { ens: r.ens, tur: r.tur, tipo: r.tipo })), to: (rows) => groupCl(rows, (r) => [r.ens, r.tur, r.tipo].join('|'), (r) => ({ ens: +r.ens, tur: +r.tur, tipo: +r.tipo })), total: true },
      { id: 'profex', label: 'Professores em exercício', cols: () => [{ k: 'ens', label: 'Ensino', sel: ens }, { k: 'tur', label: 'Turno', sel: tur }, { k: 'psH', label: 'Com formação psicopedagógica H' }, { k: 'psM', label: 'Com formação M' }, { k: 'smH', label: 'Sem formação H' }, { k: 'smM', label: 'Sem formação M' }],
        from: (b) => (b || []).map((r) => ({ ens: r.ens, tur: r.tur, psH: r.psico[0], psM: r.psico[1], smH: r.sem[0], smM: r.sem[1] })),
        to: (rows) => rows.map((r) => ({ ens: +r.ens, tur: +r.tur, psico: [+r.psH || 0, +r.psM || 0], sem: [+r.smH || 0, +r.smM || 0] })), total: true },
    ],
  };
  // blocos guardados como linhas planas (a grelha edita-os directamente)
  const E = { k: 'ens', label: 'Ensino', sel: ens }, Tu = { k: 'tur', label: 'Turno', sel: tur }, Cl = { k: 'cl', label: 'Classe', int: true };
  const N = (k, label) => ({ k, label });
  const flat = (id, label, cols, note) => ({ id, label, flat: true, cols: typeof cols === 'function' ? cols : () => cols, total: true, note });
  BL.marco.push(
    flat('novos', 'Novos ingressos na 1ª classe', (sis) => [E, Tu, N('aH', S.cod.novos[sis][0] + ' H'), N('aM', S.cod.novos[sis][0] + ' M'), N('bH', S.cod.novos[sis][1] + ' H'), N('bM', S.cod.novos[sis][1] + ' M')]),
    flat('profClasse', 'Professores por classe', [E, Tu, Cl, N('h', 'H'), N('m', 'M'), N('t', 'Sem sexo indicado')], 'Até 2022 o formulário só tinha o total (coluna "sem sexo indicado").'),
    flat('profDisc', 'Professores por disciplina', (sis) => [E, Tu, { ...Cl, label: 'Classe (0 = todas)' }, { k: 'disc', label: 'Disciplina', sel: S.cod.discESG[sis] }, N('h', 'H'), N('m', 'M')]),
    flat('profTurno', 'Professores por regime de turnos', [E, Tu, { k: 'reg', label: 'Regime', sel: S.cod.regimes }, N('h', 'H'), N('m', 'M'), N('t', 'Sem sexo indicado')]),
    flat('profMov', 'Movimento de professores', [E, Tu, { ...Cl, label: 'Classe (0 = todas)' }, N('fimH', 'No fim do ano anterior H'), N('fimM', 'No fim do ano anterior M'), N('falH', 'Falecidos H'), N('falM', 'Falecidos M'), N('ftH', 'Em falta H'), N('ftM', 'Em falta M'), N('abH', 'Abandonaram H'), N('abM', 'Abandonaram M')]),
    flat('profCap', 'Professores capacitados', [E, Tu, N('psH', 'Psicopedagogia H'), N('psM', 'Psicopedagogia M'), N('ticH', 'TIC H'), N('ticM', 'TIC M'), N('outH', 'Outras H'), N('outM', 'Outras M')]),
    flat('turnosEP', 'Turnos e horários', [E, Tu, { k: 'turno', label: 'Turno', sel: S.cod.turnosHor }, { k: 'ini', label: 'Início', text: true }, { k: 'fimh', label: 'Fim', text: true }, N('alunos', 'Alunos'), N('turmas', 'Turmas')]),
    flat('turnosES', 'Alunos e turmas do ESG por turno', [E, Tu, Cl, { k: 'turno', label: 'Turno', sel: S.cod.turnosHor }, N('h', 'Alunos H'), N('m', 'Alunos M'), N('t', 'Alunos (total)'), N('turmas', 'Turmas')]),
    flat('bilingue', 'Ensino bilingue', [E, Tu, Cl, N('h', 'Alunos H'), N('m', 'Alunos M'), N('turmas', 'Turmas'), N('profH', 'Professores H'), N('profM', 'Professores M'), N('profT', 'Professores (total)')]),
    flat('linguas', 'Línguas do ensino bilingue', [E, Tu, { k: 'lingua', label: 'Língua', sel: S.cod.linguas }]),
    flat('profiAlu', 'Disciplinas profissionalizantes: alunos', [E, Tu, Cl, { k: 'disc', label: 'Disciplina', sel: S.cod.discProfi }, N('h', 'Alunos H'), N('m', 'Alunos M'), N('turmas', 'Turmas')]),
    flat('profiProf', 'Disciplinas profissionalizantes: professores', [E, Tu, { k: 'disc', label: 'Disciplina', sel: S.cod.discProfi }, N('h', 'Professores H'), N('m', 'Professores M'), N('turmas', 'Turmas')]),
    flat('mobil', 'Mobiliário', [{ k: 'mob', label: 'Mobiliário', sel: S.cod.mobil }, N('total', 'Existente'), N('bom', 'Bom estado'), N('reg', 'Regular'), N('mau', 'Mau estado'), N('falta', 'Em falta')]),
  );
  const pick = (sec, ids) => ids.map((id) => BL[sec].find((b) => b.id === id));
  return {
    marco: [
      { id: 'g-alunos', label: 'Alunos', blocks: pick('marco', ['alunos', 'novos', 'orfaos']) },
      { id: 'g-prof', label: 'Professores', blocks: pick('marco', ['prof', 'profClasse', 'profDisc', 'profTurno', 'profMov', 'profCap']) },
      { id: 'g-turnos', label: 'Turnos', blocks: pick('marco', ['turnosEP', 'turnosES']) },
      { id: 'g-bil', label: 'Bilingue e profissionalizante', blocks: pick('marco', ['bilingue', 'linguas', 'profiAlu', 'profiProf']) },
      { id: 'g-incl', label: 'Deficiência, livros e manuais', blocks: pick('marco', ['defic', 'livros', 'manuais']) },
      { id: 'g-cond', label: 'Salas, infra-estruturas e mobiliário', blocks: pick('marco', ['salas', 'infra', 'mobil']) },
    ],
    fim: [
      { id: 'g-aprov', label: 'Aproveitamento', blocks: pick('fim', ['aprov']) },
      { id: 'g-notas', label: 'Notas por disciplina', blocks: pick('fim', ['notas']) },
      { id: 'g-saidas', label: 'Desistências e transferências', blocks: pick('fim', ['desist', 'transf']) },
      { id: 'g-profex', label: 'Professores em exercício', blocks: pick('fim', ['profex']) },
    ],
    flatIds: BL.marco.filter((b) => b.flat).map((b) => b.id),
    flatSpec: Object.fromEntries(BL.marco.filter((b) => b.flat).map((b) => [b.id, b])),
  };
}

// grelha genérica editável (linhas planas)
function grid({ cols, rows, ro, onChange, check, newRow, total, onDelete }) {
  // o turno só aparece como coluna quando há linhas do nocturno; com tudo diurno, mostra-se uma vez no topo
  const temTur = cols.some((c) => c.k === 'tur'); const soDiurno = temTur && rows.every((r) => !+r.tur || +r.tur === 1);
  if (soDiurno) cols = cols.filter((c) => c.k !== 'tur');
  const numCols = cols.filter((c) => !c.sel);
  // depois de cada par “… H” / “… M” acrescenta-se a soma “… HM” (calculada, como no mapa em papel)
  const vcols = []; cols.forEach((c, i) => { vcols.push(c); const n = cols[i + 1]; const ehH = (x) => !x.sel && !x.text && !x.int && (x.k === 'h' || / H$/.test(x.label)); const ehM = (x) => x && !x.sel && !x.text && (x.k === 'm' || / M$/.test(x.label));
    if (ehH(c) && ehM(n)) { /* o HM entra depois do M */ } if (ehM(c) && i > 0 && ehH(cols[i - 1])) vcols.push({ calc: [cols[i - 1].k, c.k], label: c.label === 'M' ? 'HM' : c.label.replace(/ M$/, ' HM') }); });
  const tb = h('tbody');
  const tfoot = h('tfoot');
  const updTotals = () => {
    if (!total) return;
    const tr = h('tr', {}, vcols.map((c, i) => h('td', { style: c.calc ? 'font-weight:700' : null, text: i === 0 ? 'Total' : c.calc ? NF.format(rows.reduce((s, r) => s + (+r[c.calc[0]] || 0) + (+r[c.calc[1]] || 0), 0)) : c.sel || c.int || c.text ? '' : NF.format(rows.reduce((s, r) => s + (+r[c.k] || 0), 0)) })), h('td'));
    tfoot.replaceChildren(tr);
  };
  const draw = () => {
    tb.replaceChildren(...rows.map((r, i) => {
      const tr = h('tr', { 'data-mapa': r.ens ? NIVEL(+r.ens) : null });
      const calcs = [];
      const mark = () => { const e = check?.(r); tr.classList.toggle('err', !!e); tr.title = e || ''; for (const [td, c] of calcs) td.textContent = NF.format((+r[c.calc[0]] || 0) + (+r[c.calc[1]] || 0)); };
      for (const c of vcols) {
        let el;
        if (c.calc) { const td = h('td', { class: 'calc', style: 'font-weight:600' }); calcs.push([td, c]); tr.append(td); continue; }
        if (c.sel) {
          el = h('select', { disabled: ro, 'aria-label': c.label }, c.sel.some((o) => +o[0] === +r[c.k]) ? null : h('option', { value: r[c.k] ?? '', text: r[c.k] ?? '—' }),
            c.sel.map((o) => h('option', { value: o[0], text: o[1], selected: +o[0] === +r[c.k] })));
          el.onchange = () => { r[c.k] = +el.value; if (c.k === 'ens') tr.setAttribute('data-mapa', NIVEL(+el.value)); onChange(); };
        } else if (c.text) {
          el = h('input', { type: 'text', value: r[c.k] ?? '', disabled: ro, 'aria-label': c.label, style: 'width:5.5rem' });
          el.oninput = () => { r[c.k] = el.value.trim(); onChange(); };
        } else {
          el = h('input', { type: 'number', min: 0, step: 1, inputmode: 'numeric', class: c.int ? 'w3' : null, value: r[c.k] ?? 0, disabled: ro, 'aria-label': c.label });
          el.oninput = () => { r[c.k] = el.value === '' ? 0 : Math.max(0, Math.round(+el.value)); mark(); updTotals(); onChange(); };
        }
        tr.append(h('td', { class: c.sel ? 'l' : null }, el));
      }
      tr.append(h('td', {}, ro ? null : h('button', { class: 'btn sm warn', title: 'Apagar linha', 'aria-label': 'Apagar linha', text: '×', onclick: () => { rows.splice(i, 1); onDelete?.(); draw(); onChange(); } })));
      mark();
      return tr;
    }));
    updTotals();
  };
  draw();
  const table = h('table', { class: 'ed' }, h('thead', {}, h('tr', {}, vcols.map((c) => h('th', { class: c.sel ? 'l' : null, text: c.label, style: c.calc ? 'background:color-mix(in srgb, var(--m, var(--brand)) 22%, var(--soft))' : null })), h('th'))), tb, tfoot);
  const add = ro ? null : h('button', { class: 'btn sm', text: soDiurno ? '+ Acrescentar linha (diurno)' : '+ Acrescentar linha', onclick: () => { rows.push(newRow()); draw(); onChange(); tb.lastChild?.querySelector('select,input')?.focus(); } });
  const addNoc = ro || !soDiurno ? null : h('button', { class: 'btn sm', text: '+ Linha do nocturno', onclick: () => { const r = newRow(); r.tur = 2; rows.push(r); onChange(); if (current === 'lancar') drawLancar(); } });
  return h('div', { style: 'display:flex;flex-direction:column;gap:8px' }, soDiurno ? h('span', { class: 'pill', text: 'Turno: diurno' }) : null, h('div', { class: 'tw tall' }, table), h('div', { class: 'row', style: 'gap:6px' }, add, addNoc));
}

// =====================================================================
// LANÇAR DADOS
// =====================================================================
let LV = null; // elementos da vista
VIEWS.lancar = (v) => {
  subscribeFichas();
  const s = S.sel;
  const anoSel = h('select', { id: 'l-ano', onchange: (e) => changeSel({ ano: +e.target.value }) }, desc(ANOS).map((a) => h('option', { value: a, text: a, selected: a === s.ano })));
  const meuD = +(S.sessao?.dist || (S.inst?.papel === 'distrito' ? S.inst.dist : 0));
  // na Introdução de Dados, um utilizador de distrito só vê o seu distrito (a comparação com os outros faz-se no Painel)
  if (meuD && +s.dist !== meuD) { s.dist = meuD; s.esc = 0; S.draft = null; }
  const distSel = h('select', { id: 'l-dist', disabled: !!meuD, title: meuD ? 'A Introdução de Dados mostra só o seu distrito. Para comparar com outros distritos use o Painel.' : null, onchange: (e) => changeSel({ dist: +e.target.value, esc: 0 }) }, S.cod.distritos.filter((d) => !meuD || d[0] === meuD).map((d) => h('option', { value: d[0], text: d[1], selected: d[0] === +s.dist })));
  const escSel = h('select', { id: 'l-esc', onchange: (e) => changeSel({ esc: +e.target.value }) });
  const busca = h('input', { type: 'search', id: 'l-busca', placeholder: 'Procurar escola ou código', oninput: () => fillEsc() });
  const levSeg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Levantamento' },
    h('button', { 'aria-pressed': String(s.lev === 'marco'), text: '3 de Março', onclick: () => changeSel({ lev: 'marco', blk: '__todos' }) }),
    h('button', { 'aria-pressed': String(s.lev === 'fim'), text: 'Fim do ano', onclick: () => changeSel({ lev: 'fim', blk: '__todos' }) }));
  const status = h('div', { class: 'status', id: 'l-status' });
  const actions = h('div', { class: 'row', id: 'l-actions' });
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const body = h('div', { id: 'l-body', style: 'display:flex;flex-direction:column;gap:12px' });
  const issues = h('ul', { class: 'issues', id: 'l-issues' });
  LV = { escSel, busca, status, actions, tabs, body, issues };
  v.append(h('div', {}, h('h1', { text: 'Introdução de Dados' }), h('p', { class: 'lede', text: 'Escolha o ano, o distrito e a escola e preencha os quadros como no mapa em papel. O mapa grava-se sozinho. O painel e o estado da introdução actualizam-se para todos.' })));
  const wn = writeNote(); if (wn) v.append(h('p', { class: 'pill warn', text: wn }));
  v.append(h('div', { class: 'card' },
    h('div', { class: 'row' }, h('label', { class: 'f' }, 'Ano', anoSel), h('label', { class: 'f' }, 'Distrito', distSel),
      h('label', { class: 'f', style: 'flex:1;min-width:14rem' }, 'Procurar', busca), h('label', { class: 'f', style: 'flex:2;min-width:16rem' }, 'Escola', escSel), levSeg),
    status, actions),
    h('div', { class: 'card' }, tabs, issues, body));
  fillEsc();
  if (S.draft && S.draft.ano === s.ano && S.draft.esc === s.esc) drawLancar(); else loadFicha();
};
function fillEsc() {
  if (!LV) return;
  const q = LV.busca.value.trim().toLowerCase();
  let list = escolasDoDistrito(S.sel.dist);
  const est = resumoDe(S.sel.ano, S.sel.dist)?.estado || {};
  if (q) list = list.filter((e) => e.nome.toLowerCase().includes(q) || codBate(q, e.cod));
  LV.escSel.replaceChildren(h('option', { value: 0, text: list.length ? `— escolha uma escola (${list.length}) —` : 'Nenhuma escola encontrada' }),
    ...list.map((e) => { const x = est[e.cod]; const mk = x ? (x.m ? '●' : '○') + (x.f ? '●' : '○') : '○○'; return h('option', { value: e.cod, text: `${mk}  ${codFmt(e.cod)} · ${e.nome}`, selected: e.cod === S.sel.esc }); }));
}
async function changeSel(p) {
  if (S.dirty && (p.ano || p.dist || p.esc !== undefined) && !(await confirmBox('Há alterações por gravar. Mudar de mapa sem gravar?', 'Mudar sem gravar'))) { go('lancar'); return; }
  Object.assign(S.sel, p);
  if (p.ano !== undefined || p.dist !== undefined || p.esc !== undefined) { S.dirty = false; S.draft = null; S.conflict = null; S.blockRows = {}; }
  go('lancar');
}
async function loadFicha() {
  const { ano, dist, esc } = S.sel;
  if (!esc) { S.draft = null; drawLancar(); return; }
  LV.body.replaceChildren(h('div', { class: 'loading', text: 'A carregar o mapa…' }));
  const fm = await fichasEfectivas(ano, dist, !!S.db);
  if (S.sel.esc !== esc || S.sel.ano !== ano) return;
  const f = fm.get(esc);
  S.blockRows = {};
  S.draft = f ? clone(f) : { ano, esc, dist: +dist, sis: sisDe(ano), marco: {}, fim: {} };
  S.fichaBase = f ? clone(f) : null; S.autoEstado = null;
  S.draftOrigin = f ? (f.em ? 'db' : 'access') : 'nova';
  if (!f) { try { const pf = (await fichasEfectivas(ano - 1, dist)).get(esc); if (pf) S.mapasExtra = { ...(S.mapasExtra || {}), [ano + '_' + esc]: [...niveisDaFicha(pf)] }; } catch {} }
  S.dirty = false;
  drawLancar();
  // erros que já vinham na ficha (ex.: da base Access) não impedem a gravação automática; só os novos
  try { S.errBase = validate().filter((t) => !t.startsWith('Aviso')).length; } catch { S.errBase = 0; }
}
function onFichasChanged() {
  // outra pessoa gravou esta ficha enquanto estava aberta
  const { ano, dist, esc } = S.sel;
  const f = S.dbFichas.get(ano + '_' + dist)?.get(esc);
  if (f && S.draft && f.em && f.em !== S.draft.em) {
    if (!S.dirty) { S.draft = clone(f); S.draftOrigin = 'db'; drawLancar(); toast('O mapa foi actualizado por outra pessoa.'); }
    else S.conflict = f;
  }
  fillEsc(); drawLancarStatus();
}
function drawLancarStatus() {
  if (!LV || current !== 'lancar') return;
  const d = S.draft; const st = LV.status; st.replaceChildren();
  if (!d) { st.append(h('span', { class: 'note', text: 'Escolha uma escola para abrir o mapa. ● = levantamento introduzido (Março, fim do ano).' })); LV.actions.replaceChildren(); return; }
  const e = S.esc.get(d.esc);
  st.append(h('strong', { text: `${e?.nome || d.esc}` }), h('span', { class: 'pill', text: `${distName(d.dist)} · ${e?.tipo || ''} · código ${codFmt(d.esc)}` }),
    h('span', { class: 'pill', text: d.sis === 'antigo' ? 'Sistema anterior (EP 1ª–7ª)' : 'SNE (EP 1ª–6ª)' }));
  if (S.draftOrigin === 'access') st.append(h('span', { class: 'pill', text: 'Dados vindos da base Access' }));
  if (S.draftOrigin === 'nova') st.append(h('span', { class: 'pill warn', text: 'Mapa novo (sem dados neste ano)' }));
  if (d.em) {
    const span = h('span', { class: 'pill ok', text: `Gravada em ${new Date(d.em).toLocaleString('pt-PT')}` }); st.append(span);
    if (d.por && S.user) S.user.profiles([d.por]).then((ps) => { span.textContent = `Gravada por ${ps[d.por]?.name || 'alguém'} em ${new Date(d.em).toLocaleString('pt-PT')}`; });
  }
  if (S.dirty) st.append(h('span', { class: 'pill warn', text: S.autoEstado === 'erros' ? 'Não gravada: a alteração criou erros novos (corrija, ou grave assim mesmo)' : 'A gravar automaticamente…' }));
  else if (S.autoEstado && S.autoEm) st.append(h('span', { class: 'autosave', text: `✓ Gravada ${S.autoEstado === 'auto' ? 'automaticamente ' : ''}às ${S.autoEm.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` }));
  if (S.conflict) st.append(h('span', { class: 'pill bad', text: 'Outra pessoa gravou este mapa entretanto: ao gravar, a versão dela é substituída.' }));
  const roM = roMotivo(d.ano, S.sel.lev, d.dist); const ro = !!roM;
  if (roM === MODO_LEITURA) st.append(h('span', { class: 'pill', text: 'Modo de leitura' }), h('button', { class: 'btn sm primary', id: 'l-editar', text: 'Editar este mapa', onclick: () => { (S.editarMapa ||= {})[`${d.ano}_${S.sel.lev}_${d.dist}`] = true; registar('mapa aberto para edição', { ano: d.ano, esc: d.esc, lev: S.sel.lev }); drawLancar(); } }));
  else if (roM && roM !== writeNote()) { st.append(h('span', { class: 'pill warn', text: roM }));
    if (/fecharam|trancad|fechado|terminou|encerrad/i.test(roM) && (S.sessao?.perfil || 0) >= 2 && !ehDPE()) st.append(h('button', { class: 'btn sm', text: 'Pedir abertura à DPE', onclick: () => pedirAbertura(d) })); }
  else if (!ro && (S.sessao?.perfil === 3 || ehDPE()) && S.editarMapa?.[`${d.ano}_${S.sel.lev}_${d.dist}`]) st.append(h('button', { class: 'btn sm', text: 'Voltar ao modo de leitura', onclick: () => { delete S.editarMapa[`${d.ano}_${S.sel.lev}_${d.dist}`]; drawLancar(); } }));
  LV.actions.replaceChildren(
    h('button', { class: 'btn primary', id: 'l-gravar', disabled: ro || !S.dirty, text: 'Gravar agora', onclick: () => saveFicha() }),
    h('button', { class: 'btn', disabled: !S.dirty, text: 'Descartar alterações', onclick: async () => { if (await confirmBox('Descartar as alterações deste mapa?', 'Descartar')) { S.dirty = false; S.conflict = null; loadFicha(); } } }),
    h('button', { class: 'btn', disabled: ro || !(S.histFicha?.[d.ano + '_' + d.esc]?.length), title: 'Volta à versão gravada antes da última gravação (pode repetir)', text: `↶ Desfazer${S.histFicha?.[d.ano + '_' + d.esc]?.length ? ` (${S.histFicha[d.ano + '_' + d.esc].length})` : ''}`, onclick: desfazerFicha }),
    h('button', { class: 'btn', disabled: ro, text: `Copiar estrutura de ${d.ano - 1}`, onclick: copyPrev, title: 'Cria as linhas (ensinos, turnos, classes) do mapa do ano anterior, com zeros' }),
  );
}
function drawLancar() {
  if (!LV) return;
  drawLancarStatus();
  const d = S.draft; LV.tabs.replaceChildren(); LV.body.replaceChildren(); LV.issues.replaceChildren();
  if (!d) { LV.body.append(h('div', { class: 'empty', text: 'Nenhuma escola escolhida.' })); return; }
  // cada nível de ensino da escola é um mapa separado, como os mapas em papel
  const mapas = mapasDaFicha(d);
  if (!mapas.includes(S.sel.mapa)) S.sel.mapa = mapas[0];
  const MP = S.sel.mapa;
  const blocoNoMapa = (b) => { const q = QDEF[S.sel.lev]?.[b.id]; return !q || !!quadroRef(S.sel.lev, b.id, d.ano)[MP] || MP === 'ETP'; };
  // os quadros aparecem pela ordem do mapa em papel (número do quadro de cada nível)
  const qNum = (b) => { const t = quadroRef(S.sel.lev, b.id, d.ano)[MP] || ''; const m = String(t).match(/\d+/); return m ? +m[0] + (/cont/.test(t) ? 0.5 : 0) : 999; };
  const groups0 = FORM[S.sel.lev].map((g) => ({ ...g, blocks: g.blocks.filter(blocoNoMapa).sort((a, b) => qNum(a) - qNum(b)) })).filter((g) => g.blocks.length)
    .sort((a, b) => Math.min(...a.blocks.map(qNum)) - Math.min(...b.blocks.map(qNum)));
  const todos = { id: '__todos', label: 'Todos os quadros (ordem do mapa)', blocks: groups0.flatMap((g) => g.blocks).sort((a, b) => qNum(a) - qNum(b)) };
  const groups = [todos, ...groups0];
  if (!groups.some((g) => g.id === S.sel.blk)) S.sel.blk = '__todos';
  const outros = ['EP', 'ESG1', 'ESG2', 'ETP'].filter((n) => !mapas.includes(n));
  const ro0 = !!roMotivo(d.ano, S.sel.lev, d.dist);
  LV.body.append(h('div', { class: 'mapas-seg', role: 'tablist', 'aria-label': 'Mapas da escola' }, mapas.map((n) => h('button', { role: 'tab', 'data-mapa': n, 'aria-selected': String(n === MP), onclick: () => { S.sel.mapa = n; drawLancar(); } },
      h('span', { class: 'mk' }), `Mapa ${MAPA_NOME[n]}`, temDadosNoMapa(d, S.sel.lev, n) ? h('small', { text: ' ●' }) : null)),
    !ro0 && outros.length ? h('select', { class: 'add-mapa', 'aria-label': 'Acrescentar nível', onchange: (e) => { if (!e.target.value) return; S.mapasExtra = { ...(S.mapasExtra || {}), [d.ano + '_' + d.esc]: [...(S.mapasExtra?.[d.ano + '_' + d.esc] || []), e.target.value] }; S.sel.mapa = e.target.value; drawLancar(); } },
      h('option', { value: '', text: '+ Acrescentar nível de ensino' }), outros.map((n) => h('option', { value: n, text: MAPA_NOME[n] }))) : null));
  for (const g of groups) {
    const filled = g.blocks.some((b) => blockFilledMapa(d, S.sel.lev, b.id, MP));
    LV.tabs.append(h('button', { role: 'tab', 'aria-selected': String(g.id === S.sel.blk), onclick: () => { S.sel.blk = g.id; drawLancar(); } }, g.label, filled ? ' ●' : ''));
  }
  LV.tabs.setAttribute('data-mapa', MP);
  const grp = groups.find((x) => x.id === S.sel.blk);
  const ro = !!roMotivo(d.ano, S.sel.lev, d.dist);
  let tVal = null; const changed = () => { if (!S.dirty) { S.dirty = true; drawLancarStatus(); } clearTimeout(tVal); tVal = setTimeout(validate, 350); clearTimeout(S.tAuto); S.tAuto = setTimeout(() => saveFicha({ auto: true }), 2500); };
  const sec = S.sel.lev;
  for (const b of grp.blocks) {
    const temEns = b.special === 'alunos' || b.special === 'notas' || (b.cols && b.cols(d.sis).some((c) => c.k === 'ens'));
    const box = h('section', { class: 'mapa', 'data-mapa': MP, style: 'display:flex;flex-direction:column;gap:8px' });
    box.append(h('h3', { class: 'mt' }, b.label, qChips(sec, b.id, d.ano, new Set([MP])), notaInfo(sec, b.id, MP)));
    if (!temEns) box.append(h('p', { class: 'note', text: 'Quadro comum a toda a escola: os mesmos dados aparecem em todos os mapas da escola.' }));
    if (b.note) box.append(h('p', { class: 'note', text: b.note }));
    if (b.special === 'alunos') box.append(editAlunos(d, ro, changed, MP));
    else if (b.special === 'salas') box.append(editSalas(d, ro, changed));
    else if (b.special === 'infra') box.append(editInfra(d, ro, changed));
    else if (b.special === 'notas') box.append(editNotas(d, ro, changed, MP));
    else {
      const defEns = (d.marco?.alunos || []).find((r) => NIVEL(+r.ens) === MP)?.ens || ensinosDoMapa(MP)[0] || 1001;
      const doMapa = (r) => !temEns || !r.ens || NIVEL(+r.ens) === MP;
      const newRow = () => { const r = {}; for (const c of b.cols(d.sis)) r[c.k] = c.sel ? (c.k === 'ens' ? defEns : +c.sel[0][0]) : c.text ? '' : (c.k === 'cl' ? 1 : 0); return r; };
      if (b.flat) {
        d[sec][b.id] ||= [];
        const fora = d[sec][b.id].filter((r) => !doMapa(r)); const vis = d[sec][b.id].filter(doMapa);
        box.append(grid({ cols: b.cols(d.sis), rows: vis, ro, onChange: () => { d[sec][b.id] = [...fora, ...vis]; changed(); }, onDelete: () => { d[sec][b.id] = [...fora, ...vis]; }, newRow, total: b.total }));
      } else {
        const state = S.blockRows ||= {};
        const key = `${d.ano}_${d.esc}_${sec}_${b.id}`;
        if (!state[key]) state[key] = b.from(d[sec][b.id]);
        const fora = state[key].filter((r) => !doMapa(r)); const vis = state[key].filter(doMapa);
        const commit = () => { state[key] = [...fora, ...vis]; d[sec][b.id] = b.to(state[key], d[sec][b.id]); if (!d[sec][b.id].length) delete d[sec][b.id]; changed(); };
        box.append(grid({ cols: b.cols(d.sis), rows: vis, ro, onChange: commit, onDelete: () => { state[key] = [...fora, ...vis]; }, check: b.check, newRow, total: b.total }));
      }
    }
    LV.body.append(box);
  }
  if (S.sel.lev === 'fim' && d.ano >= ANO_MAX_DADOS && !d.fim?.aprov?.length) LV.body.prepend(h('p', { class: 'note', text: 'O levantamento de fim do ano desta escola ainda não foi introduzido.' }));
  validate();
}
function blockFilled(d, lev, id) {
  if (id === 'notas') return (d.fim?.aprov || []).some((r) => Object.keys(r.notas || {}).length);
  if (id === 'salas') return !!(d.marco?.salas || d.marco?.pnd);
  const b = d[lev]?.[id]; return Array.isArray(b) ? b.length > 0 : !!b;
}
// ---------------- verificação da interdependência dos dados (regras dos mapas e do manual do SIEE) ----------------
// cada problema: g = 'erro' (os números não podem estar certos) ou 'aviso' (pouco provável; confirme), lev/bloco = onde corrigir
function problemasDetalhe(d) {
  const out = []; const P = (g, lev, bloco, ens, msg) => out.push({ g, lev, bloco, mapa: ens ? NIVEL(+ens) : null, msg });
  const SUM = (arr, f) => (arr || []).reduce((t, r) => t + (+f(r) || 0), 0);
  const tot = (r) => Object.values(r.id || {}).reduce((s, v) => [s[0] + (+v[0] || 0), s[1] + (+v[1] || 0)], [0, 0]);
  const cls = (e, t, c) => `${ensAbbr(e)} ${c}ª classe${t === 2 ? ' (nocturno)' : ''}`;
  const AL = d.marco?.alunos || [];
  const alunosDe = (e, t, c) => SUM(AL.filter((x) => +x.ens === +e && (t == null || +x.tur === +t) && (c == null || +x.cl === +c)), (x) => { const a = tot(x); return a[0] + a[1]; });
  const alunosNivel = (n) => SUM(AL.filter((x) => NIVEL(+x.ens) === n), (x) => { const a = tot(x); return a[0] + a[1]; });
  // Quadro 1: alunos, repetentes, turmas, internos
  const seen = new Set();
  for (const r of AL) {
    const t = tot(r), T = t[0] + t[1], k = [r.ens, r.tur, r.cl].join('|');
    if (seen.has(k)) P('erro', 'marco', 'alunos', r.ens, `Alunos ${cls(r.ens, r.tur, r.cl)}: a classe aparece duas vezes.`); seen.add(k);
    if ((+r.rep?.[0] || 0) > t[0] || (+r.rep?.[1] || 0) > t[1]) P('erro', 'marco', 'alunos', r.ens, `Alunos ${cls(r.ens, r.tur, r.cl)}: há mais repetentes do que alunos (H ou M).`);
    if ((+r.int?.[0] || 0) > t[0] || (+r.int?.[1] || 0) > t[1]) P('erro', 'marco', 'alunos', r.ens, `Alunos ${cls(r.ens, r.tur, r.cl)}: há mais internos do que alunos.`);
    const tu = (+r.tp || 0) + (+r.tm || 0);
    // uma classe sem turma própria pode estar numa turma mista de outra classe: não é erro
    if (NIVEL(+r.ens) === 'EP' && T > 0) {
      const nt = +r.nt || 0;
      if (nt > 3) P('erro', 'marco', 'alunos', r.ens, `Alunos ${cls(r.ens, r.tur, r.cl)}: o EP funciona no máximo em 3 turnos (indicado ${nt}).`);
      if (+r.tp && nt > +r.tp + (+r.tm || 0)) P('aviso', 'marco', 'alunos', r.ens, `Alunos ${cls(r.ens, r.tur, r.cl)}: ${nt} turnos para ${(+r.tp || 0) + (+r.tm || 0)} turma(s) desta classe. Cada turma funciona num só turno (só é possível se parte dos alunos estiver numa turma mista de outra classe).`);
      if (tu && !nt) P('aviso', 'marco', 'alunos', r.ens, `Alunos ${cls(r.ens, r.tur, r.cl)}: falta o número de turnos em que a classe funciona.`);
      const nq4 = (d.marco?.turnosEP || []).filter((x) => NIVEL(+x.ens) === 'EP' && (+x.alunos || +x.turmas)).length;
      if (nq4 && nt > nq4) P('erro', 'marco', 'alunos', r.ens, `Alunos ${cls(r.ens, r.tur, r.cl)}: funciona em ${nt} turnos, mas o Quadro 4 só tem ${nq4} turno(s).`);
    }
    if (tu && T && tu > T) P('erro', 'marco', 'alunos', r.ens, `Alunos ${cls(r.ens, r.tur, r.cl)}: mais turmas (${tu}) do que alunos (${T}).`);
    if (tu && T / tu > 120) P('aviso', 'marco', 'alunos', r.ens, `Alunos ${cls(r.ens, r.tur, r.cl)}: ${Math.round(T / tu)} alunos por turma. Confirme as turmas.`);
    if (tu && T / tu < 5 && T > 0) P('aviso', 'marco', 'alunos', r.ens, `Alunos ${cls(r.ens, r.tur, r.cl)}: só ${R1.format(T / tu)} alunos por turma. Confirme as turmas.`);
  }
  // professores: habilitações (Q2), por classe (Q9), por turno (Q3) e turmas
  for (const n of ['EP', 'ESG1', 'ESG2']) {
    const al = alunosNivel(n); if (!al) continue;
    for (const e of [...new Set(AL.filter((x) => NIVEL(+x.ens) === n).map((x) => +x.ens))]) { const a = alunosDe(e, null, null); const t = SUM(AL.filter((x) => +x.ens === e), (x) => (+x.tp || 0) + (+x.tm || 0)); if (a && !t) P('erro', 'marco', 'alunos', e, `Alunos ${ensAbbr(e)}: há ${a} alunos mas nenhuma turma em todas as classes.`); }
    const pr = SUM((d.marco?.prof || []).filter((r) => NIVEL(+r.ens) === n), (r) => (+r.v?.[0] || 0) + (+r.v?.[1] || 0));
    const tu = SUM(AL.filter((x) => NIVEL(+x.ens) === n), (x) => (+x.tp || 0) + (+x.tm || 0));
    const e0 = ensinosDoMapa(n)[0];
    if (!pr) P('erro', 'marco', 'prof', e0, `${MAPA_NOME[n]}: há ${al} alunos mas nenhum professor no quadro das habilitações.`);
    else { if (al / pr > 150) P('aviso', 'marco', 'prof', e0, `${MAPA_NOME[n]}: ${Math.round(al / pr)} alunos por professor. Confirme os professores.`); if (tu && pr > tu * 3) P('aviso', 'marco', 'prof', e0, `${MAPA_NOME[n]}: ${pr} professores para ${tu} turmas. Os professores que não dão aulas vão no quadro dos trabalhadores não docentes.`); }
  }
  const pq2 = SUM((d.marco?.prof || []).filter((r) => NIVEL(+r.ens) === 'EP'), (r) => (+r.v?.[0] || 0) + (+r.v?.[1] || 0));
  const pq9 = SUM((d.marco?.profClasse || []).filter((r) => NIVEL(+r.ens) === 'EP'), (r) => (+r.h || 0) + (+r.m || 0) + (+r.t || 0));
  if (pq9 && pq2 && pq9 < pq2) P('erro', 'marco', 'profClasse', 1001, `Professores do EP: o total por classe (${pq9}) não pode ser menor que o total por habilitações (${pq2}) — NB do Quadro 9.`);
  const pq3 = SUM((d.marco?.profTurno || []).filter((r) => NIVEL(+r.ens) === 'EP'), (r) => (+r.h || 0) + (+r.m || 0) + (+r.t || 0));
  if (pq3 && pq2 && pq3 !== pq2) P('erro', 'marco', 'profTurno', 1001, `Professores do EP: o Quadro 3 (por turnos: ${pq3}) tem de ter o mesmo total que o Quadro 2 (por habilitações: ${pq2}).`);
  // turnos (Q4 EP) e alunos por turno (ESG)
  const t4 = SUM((d.marco?.turnosEP || []).filter((r) => NIVEL(+r.ens) === 'EP'), (r) => r.alunos); const aEP = alunosNivel('EP');
  const tt4 = SUM((d.marco?.turnosEP || []).filter((r) => NIVEL(+r.ens) === 'EP'), (r) => r.turmas); const tEP = SUM(AL.filter((x) => NIVEL(+x.ens) === 'EP'), (x) => (+x.tp || 0) + (+x.tm || 0));
  // o Quadro 4 (turnos) reparte os mesmos alunos e as mesmas turmas do Quadro 1: os totais têm de ser iguais
  if (t4 && aEP && t4 !== aEP) P('erro', 'marco', 'turnosEP', 1001, `Quadro 4: os alunos por turno somam ${t4}, mas o Quadro 1 tem ${aEP}. Os dois quadros têm de ter o mesmo total.`);
  if (tt4 && tEP && tt4 !== tEP) P('erro', 'marco', 'turnosEP', 1001, `Quadro 4: as turmas por turno somam ${tt4}, mas o Quadro 1 tem ${tEP}. Os dois quadros têm de ter o mesmo número de turmas.`);
  if (aEP && !t4 && (d.marco?.turnosEP || []).length === 0 && d.ano >= 2023) P('aviso', 'marco', 'turnosEP', 1001, `Quadro 4 (turnos) vazio: deve repartir os ${aEP} alunos e as ${tEP} turmas do Quadro 1 pelos turnos.`);
  for (const n of ['ESG1', 'ESG2']) { const a = alunosNivel(n); const t = SUM((d.marco?.turnosES || []).filter((r) => NIVEL(+r.ens) === n), (r) => (+r.h || 0) + (+r.m || 0) + (+r.t || 0)); if (t && a && t !== a) P('aviso', 'marco', 'turnosES', ensinosDoMapa(n)[0], `${MAPA_NOME[n]}: os alunos por turno (${t}) somam diferente do Quadro 1 (${a}).`); }
  // salas
  // salas e mobiliário são da escola (uma escola básica usa as mesmas salas e carteiras para o EP e o ES1, em turnos diferentes):
  // contam-se uma só vez, e a lotação vê-se por turno. Só os tipos 1 a 5 são salas; turmas ao ar livre e anexas não são salas.
  const SA = d.marco?.salas || {}; const sv = (k) => +SA[k] || 0;
  const slConv = sv(1) + sv(2), slPrec = sv(3) + sv(4) + sv(5), sl = slConv + slPrec, arLivre = sv(6) + sv(7);
  const aT = alunosNivel('EP') + alunosNivel('ESG1') + alunosNivel('ESG2');
  const turnosEsc = Math.max(1, (d.marco?.turnosEP || []).filter((x) => +x.alunos || +x.turmas).length, new Set((d.marco?.turnosES || []).filter((x) => (+x.h || 0) + (+x.m || 0) + (+x.t || 0)).map((x) => x.turno)).size, ...AL.map((x) => +x.nt || 0));
  if (sl && aT) {
    const porTurno = aT / (sl * turnosEsc);
    const partes = [['EP', alunosNivel('EP')], ['ES1', alunosNivel('ESG1')], ['ES2', alunosNivel('ESG2')]].filter((x) => x[1]).map((x) => `${x[0]} ${x[1]}`).join(' + ');
    if (porTurno > 100) P('aviso', 'marco', 'salas', null, `Salas: ${aT} alunos (${partes}) em ${sl} sala(s) e ${turnosEsc} turno(s) = ${Math.round(porTurno)} alunos por sala em cada turno${arLivre ? ` (há ainda ${arLivre} turma(s) ao ar livre ou anexas, que não são salas)` : ''}. Confirme as salas e os turnos.`);
  }
  // infra-estruturas (como no mapa): quem diz que tem computadores, casas de banho, latrinas ou internato indica quantos
  const IF = d.marco?.infra;
  if (IF) for (const [f_, q, nome] of [['comput', 'nComput', 'computadores'], ['wc', 'nWc', 'casas de banho'], ['latrinas', 'nLatrinas', 'latrinas'], ['internato', 'capInternato', 'lugares no internato']]) {
    if (+IF[f_] && !(+IF[q] > 0)) P('erro', 'marco', 'infra', null, `Infra-estruturas: a escola tem ${nome.replace('lugares no ', '')}, mas falta indicar quantos (${nome}).`);
    else if (!+IF[f_] && +IF[q] > 0) P('aviso', 'marco', 'infra', null, `Infra-estruturas: indicou ${IF[q]} ${nome}, mas não marcou que a escola os tem.`);
  }
  // 5.1 e 5.2: turmas ao ar livre ou anexas com alunos indicados
  for (const [k, nome] of [[6, '5.1 turmas ao ar livre'], [7, '5.2 turmas anexas']]) { const t = sv(k), al = (d.marco?.salasAlunos?.[k] || [0, 0]); if (t && !(al[0] + al[1]) && d.ano >= 2025) P('aviso', 'marco', 'salas', null, `Quadro ${nome}: ${t} turma(s) sem alunos indicados.`); if (!t && al[0] + al[1]) P('erro', 'marco', 'salas', null, `Quadro ${nome}: há alunos mas nenhuma turma.`); }
  // carteiras: uma sala convencional leva no máximo 25 carteiras duplas (50 alunos) ou 50 simples; as salas precárias normalmente não levam carteiras convencionais
  const MOB = d.marco?.mobil || []; const mb = (k, c) => SUM(MOB.filter((r) => +r.mob === k), (r) => +r[c] || 0);
  const cartEx = mb(1, 'total') * 2 + mb(2, 'total'), cartFalta = mb(1, 'falta') * 2 + mb(2, 'falta'), lugaresMax = slConv * 50;
  if (cartEx && !slConv && slPrec) P('aviso', 'marco', 'mobil', null, `Mobiliário: há carteiras registadas, mas a escola só tem salas precárias (${slPrec}). Confirme: as salas precárias normalmente não comportam carteiras convencionais.`);
  else if (slConv && cartEx > lugaresMax) P('aviso', 'marco', 'mobil', null, `Mobiliário: ${cartEx} lugares em carteiras para ${slConv} sala(s) convencional(is), que levam no máximo ${lugaresMax} (25 carteiras duplas ou 50 simples por sala). As carteiras contam-se uma só vez por escola, mesmo que apareçam em vários mapas.`);
  if (cartFalta && cartEx + cartFalta > lugaresMax) P('aviso', 'marco', 'mobil', null, `Mobiliário: pedem-se ${cartFalta} lugares em falta, mas ${slConv ? `as ${slConv} sala(s) convencional(is) só comportam ${lugaresMax} lugares (já há ${cartEx})` : 'a escola não tem salas convencionais onde as pôr'}. A necessidade real depende de haver salas para as carteiras.`);
  // novos ingressos (Q7) <= alunos da 1ª classe; bilingue, livros, deficiência, órfãos <= alunos da classe
  for (const r of d.marco?.novos || []) { const c1 = alunosDe(r.ens, r.tur, 1); const nv = (+r.aH || 0) + (+r.aM || 0); if (nv > c1) P('erro', 'marco', 'novos', r.ens, `Novos ingressos (${nv}) maior que os alunos da 1ª classe (${c1}).`); }
  for (const r of d.marco?.bilingue || []) { const a = alunosDe(r.ens, r.tur, r.cl); const b = (+r.h || 0) + (+r.m || 0); if (b > a) P('erro', 'marco', 'bilingue', r.ens, `Ensino bilingue ${cls(r.ens, r.tur, r.cl)}: ${b} alunos, mais do que os ${a} da classe.`); }
  // livros (Q8): conta-se o número de ALUNOS com livro, não o número de livros; nunca mais do que os alunos da classe
  for (const r of d.marco?.livros || []) for (const [c, x] of Object.entries(r.vs || {})) { const a2 = alunosDe(r.ens, r.tur, +c); const AL2 = AL.filter((y) => +y.ens === +r.ens && (r.tur == null || +y.tur === +r.tur) && +y.cl === +c).reduce((t, y) => { const q = tot(y); return [t[0] + q[0], t[1] + q[1]]; }, [0, 0]); if (a2 && (+x[0] > AL2[0] || +x[1] > AL2[1])) P('erro', 'marco', 'livros', r.ens, `Livros ${cls(r.ens, r.tur, c)}: mais rapazes ou mais raparigas com livro do que alunos da classe (H ${x[0]}/${AL2[0]}, M ${x[1]}/${AL2[1]}).`); }
  for (const r of d.marco?.livros || []) for (const [c, n] of Object.entries(r.v || {})) { const a = alunosDe(r.ens, r.tur, +c); if (+n > a) P('erro', 'marco', 'livros', r.ens, `Livros ${cls(r.ens, r.tur, c)}: ${n} alunos com livro de ${(S.cod.livros[d.sis] || []).find((x) => +x[0] === +r.disc)?.[1] || 'uma disciplina'}, mais do que os ${a} alunos da classe. Conta-se alunos com livro, não livros.`); }
  // manuais (Q10 EP / Q11 ESG): professores com manual de uma classe não podem ser mais do que os professores dessa classe (Q9)
  for (const r of d.marco?.manuais || []) for (const [c, n] of Object.entries(r.v || {})) { const pc = SUM((d.marco?.profClasse || []).filter((x) => +x.ens === +r.ens && +x.cl === +c), (x) => (+x.h || 0) + (+x.m || 0) + (+x.t || 0)); if (pc && +n > pc) P('erro', 'marco', 'manuais', r.ens, `Manuais ${cls(r.ens, r.tur, c)}: ${n} professores com manual, mais do que os ${pc} professores da classe (Quadro 9).`); }
  for (const r of d.marco?.defic || []) for (const [c, v] of Object.entries(r.v || {})) { const a = alunosDe(r.ens, r.tur, +c); if ((+v[0] || 0) + (+v[1] || 0) > a) P('erro', 'marco', 'defic', r.ens, `Deficiência ${cls(r.ens, r.tur, c)}: mais alunos com deficiência do que alunos da classe.`); }
  for (const r of d.marco?.orfaos || []) { const a = alunosDe(r.ens, r.tur, r.cl || null); const o = SUM(['pai', 'mae', 'ambos'], (k) => (+r[k]?.[0] || 0) + (+r[k]?.[1] || 0)); if (a && o > a) P('erro', 'marco', 'orfaos', r.ens, `Órfãos ${ensAbbr(r.ens)}${r.cl ? ' ' + r.cl + 'ª classe' : ''}: mais órfãos (${o}) do que alunos (${a}).`); }
  // fim do ano: aproveitamento, exame, notas, desistências, transferências, coerência com o 3 de Março
  for (const r of d.fim?.aprov || []) {
    const fim = (+r.fim?.[0] || 0) + (+r.fim?.[1] || 0), ap = (+r.aprov?.[0] || 0) + (+r.aprov?.[1] || 0);
    if (+r.aprov?.[0] > +r.fim?.[0] || +r.aprov?.[1] > +r.fim?.[1]) P('erro', 'fim', 'aprov', r.ens, `Aproveitamento ${cls(r.ens, r.tur, r.cl)}: mais aprovados do que alunos no fim do ano.`);
    if (r.exame?.[1] && (+r.exame[0] > +r.fim[0] || +r.exame[1] > +r.fim[1])) P('erro', 'fim', 'aprov', r.ens, `Aproveitamento ${cls(r.ens, r.tur, r.cl)}: mais alunos a exame do que no fim do ano.`);
    if (r.exame?.[1] && (ap > (+r.exame[0] || 0) + (+r.exame[1] || 0)) && [6, 9, 12, 7, 10].includes(+r.cl)) P('aviso', 'fim', 'aprov', r.ens, `Aproveitamento ${cls(r.ens, r.tur, r.cl)}: mais aprovados do que alunos que fizeram exame.`);
    for (const [dc, v] of Object.entries(r.notas || {})) { const t = (+v[0] || 0) + (+v[1] || 0) + (+v[2] || 0); if (t && fim && t !== fim) { P('erro', 'fim', 'notas', r.ens, `Notas ${cls(r.ens, r.tur, r.cl)}: em ${dc} a soma das notas (${t}) difere dos alunos no fim do ano (${fim}).`); break; } }
    const ini = alunosDe(r.ens, r.tur, r.cl);
    if (ini) {
      const des = SUM((d.fim?.desist || []).filter((x) => +x.ens === +r.ens && +x.tur === +r.tur), (x) => (+x.v?.[r.cl]?.[0] || 0) + (+x.v?.[r.cl]?.[1] || 0));
      const tr = (tp) => SUM((d.fim?.transf || []).filter((x) => +x.ens === +r.ens && +x.tur === +r.tur && +x.tipo === tp), (x) => (+x.v?.[r.cl]?.[0] || 0) + (+x.v?.[r.cl]?.[1] || 0));
      const esperado = ini - des - tr(1) + tr(2) + tr(3);
      if (fim > ini * 1.15 + 5 && fim > esperado + 5) P('aviso', 'fim', 'aprov', r.ens, `Fim do ano ${cls(r.ens, r.tur, r.cl)}: ${fim} alunos no fim, mas ${ini} no 3 de Março (esperado cerca de ${esperado} com desistências e transferências).`);
      if (fim && Math.abs(esperado - fim) > Math.max(10, ini * 0.1)) P('aviso', 'fim', 'desist', r.ens, `Fim do ano ${cls(r.ens, r.tur, r.cl)}: 3 de Março (${ini}) − desistentes (${des}) ± transferências = ${esperado}, mas no fim do ano há ${fim}.`);
    }
  }
  for (const n of ['EP', 'ESG1', 'ESG2']) {
    const al = alunosNivel(n); const des = SUM((d.fim?.desist || []).filter((x) => NIVEL(+x.ens) === n), (x) => Object.values(x.v || {}).reduce((t, v) => t + (+v[0] || 0) + (+v[1] || 0), 0));
    if (al && des > al) P('erro', 'fim', 'desist', ensinosDoMapa(n)[0], `${MAPA_NOME[n]}: mais desistentes (${des}) do que alunos no 3 de Março (${al}).`);
    const px = SUM((d.fim?.profex || []).filter((x) => NIVEL(+x.ens) === n), (x) => (+x.psico?.[0] || 0) + (+x.psico?.[1] || 0) + (+x.sem?.[0] || 0) + (+x.sem?.[1] || 0));
    const pr = SUM((d.marco?.prof || []).filter((r) => NIVEL(+r.ens) === n), (r) => (+r.v?.[0] || 0) + (+r.v?.[1] || 0));
    if (px && pr && Math.abs(px - pr) > Math.max(3, pr * 0.25)) P('aviso', 'fim', 'profex', ensinosDoMapa(n)[0], `${MAPA_NOME[n]}: ${px} professores em exercício no fim do ano e ${pr} no 3 de Março.`);
  }
  return out.filter((x, i) => out.findIndex((y) => y.msg === x.msg) === i);
}
function problemasFicha(d) { return problemasDetalhe(d).map((x) => (x.g === 'aviso' ? 'Aviso: ' : '') + x.msg); }
function validate() {
  const d = S.draft; if (!d || !LV) return [];
  const det = problemasDetalhe(d);
  const grupoDe = (lev, bloco) => FORM[lev]?.find((g) => g.blocks.some((b) => b.id === bloco))?.id;
  // mostra só os erros e avisos do levantamento escolhido em cima; os do outro ficam num botão que muda de levantamento
  const NOME_LEV = { marco: '3 de Março', fim: 'Fim do ano' };
  const deste = det.filter((x) => x.lev === S.sel.lev), doOutro = det.filter((x) => x.lev !== S.sel.lev);
  const ne = deste.filter((x) => x.g === 'erro').length, na = deste.length - ne;
  const irQuadro = (x) => { const g = grupoDe(x.lev, x.bloco); const mud = S.sel.lev !== x.lev; S.sel.lev = x.lev; S.sel.blk = g || '__todos'; if (x.mapa) S.sel.mapa = x.mapa; if (mud) { go('lancar'); toast(`Passou para o levantamento ${NOME_LEV[x.lev] || x.lev}.`); } else drawLancar(); setTimeout(() => LV?.body.scrollIntoView({ behavior: 'smooth' }), 80); };
  const outroLev = doOutro[0]?.lev; const ne2 = doOutro.filter((x) => x.g === 'erro').length;
  LV.issues.replaceChildren(...(deste.length ? [h('li', { class: 'iss-cab' }, h('strong', { text: `${NOME_LEV[S.sel.lev] || ''}: ` + (ne ? `${ne} erro${ne > 1 ? 's' : ''}` : 'sem erros') }), na ? ` e ${na} aviso${na > 1 ? 's' : ''}` : '', ' de coerência entre quadros')] : []),
    ...deste.slice(0, 40).map((x) => h('li', { class: 'iss ' + x.g }, h('span', { class: 'iss-g', text: x.g === 'erro' ? 'Erro' : 'Aviso' }), h('span', { text: x.msg }),
      h('button', { class: 'btn sm', text: 'Ir ao quadro', onclick: () => irQuadro(x) }))),
    ...(doOutro.length ? [h('li', { class: 'iss-cab' }, h('span', { text: `${NOME_LEV[outroLev] || 'Outro levantamento'}: ${ne2} erro(s) e ${doOutro.length - ne2} aviso(s). ` }),
      h('button', { class: 'btn sm', text: `Ver no ${NOME_LEV[outroLev] || 'outro levantamento'}`, onclick: () => irQuadro(doOutro[0]) }))] : []));
  return det.map((x) => (x.g === 'aviso' ? 'Aviso: ' : '') + x.msg);
}
// --- alunos: uma grelha por ensino, idades em colunas
function editAlunos(d, ro, changed, MP) {
  const wrap = h('div', { style: 'display:flex;flex-direction:column;gap:16px' });
  d.marco.alunos ||= [];
  const groups = [...new Set(d.marco.alunos.map((r) => r.ens))].filter((e) => !MP || NIVEL(+e) === MP).sort();
  const ages = (ens) => {
    const base = S.cod.idades[d.sis][ens === 1001 || (d.sis === 'antigo' && ens === 1001) ? 'EP' : 'ESG'];
    const extra = new Set(); for (const r of d.marco.alunos) if (r.ens === ens) for (const k of Object.keys(r.id || {})) if (!base.includes(k)) extra.add(k);
    return [...base, ...extra];
  };
  for (const ens of groups) {
    const rows = d.marco.alunos.filter((r) => r.ens === ens).sort((a, b) => a.tur - b.tur || a.cl - b.cl);
    const A = ages(ens); const ep = NIVEL(+ens) === 'EP';
    // Quadro 1 do EP tem "Nº de turnos" (em quantos turnos funciona a classe); o do ESG tem os alunos internos
    const extra = ep ? [{ k: 'nt', l: 'Nº de turnos', max: 3 }] : [{ k: 'int0', l: 'Internos H' }, { k: 'int1', l: 'Internos M' }];
    const nCols = 1 + A.length * 2 + 4 + extra.length + 3 + 1;
    const tb = h('tbody'); const tf = h('tfoot');
    const totRow = () => {
      const s = (f) => rows.reduce((t, r) => t + f(r), 0);
      tf.replaceChildren(h('tr', {}, h('td', { text: 'Total' }),
        ...A.flatMap((a) => [0, 1].map((i) => h('td', { text: NF.format(s((r) => +r.id?.[a]?.[i] || 0)) }))),
        h('td', { text: NF.format(s((r) => +r.rep?.[0] || 0)) }), h('td', { text: NF.format(s((r) => +r.rep?.[1] || 0)) }),
        h('td', { text: NF.format(s((r) => +r.tp || 0)) }), h('td', { text: NF.format(s((r) => +r.tm || 0)) }),
        ...(ep ? [h('td', { text: '' })] : [h('td', { text: NF.format(s((r) => +r.int?.[0] || 0)) }), h('td', { text: NF.format(s((r) => +r.int?.[1] || 0)) })]),
        h('td', { text: NF.format(s((r) => Object.values(r.id || {}).reduce((x, v) => x + (+v[0] || 0), 0))) }),
        h('td', { text: NF.format(s((r) => Object.values(r.id || {}).reduce((x, v) => x + (+v[1] || 0), 0))) }),
        h('td', { style: 'font-weight:700', text: NF.format(s((r) => Object.values(r.id || {}).reduce((x, v) => x + (+v[0] || 0) + (+v[1] || 0), 0))) }), h('td')));
    };
    const num = (get, set, onDone, max) => {
      const el = h('input', { type: 'number', min: 0, max, step: 1, inputmode: 'numeric', class: 'w3', value: get() || 0, disabled: ro });
      el.oninput = () => { let v = el.value === '' ? 0 : Math.max(0, Math.round(+el.value)); if (max) v = Math.min(max, v); set(v); onDone(); changed(); totRow(); validate(); };
      return h('td', {}, el);
    };
    const linha = (r) => {
      const totH = h('td', { class: 'calc' }), totM = h('td', { class: 'calc' }), totHM = h('td', { class: 'calc', style: 'font-weight:700' });
      const upd = () => { const a = Object.values(r.id || {}).reduce((x, v) => x + (+v[0] || 0), 0), b = Object.values(r.id || {}).reduce((x, v) => x + (+v[1] || 0), 0); totH.textContent = NF.format(a); totM.textContent = NF.format(b); totHM.textContent = NF.format(a + b); };
      const cl = h('input', { type: 'number', min: 1, max: 12, class: 'w3', value: r.cl, disabled: ro, 'aria-label': 'Classe' });
      cl.oninput = () => { r.cl = Math.max(1, Math.min(12, +cl.value || 1)); changed(); validate(); };
      r.id ||= {}; r.rep ||= [0, 0]; r.int ||= [0, 0];
      const tr = h('tr', {}, h('td', { class: 'cl' }, cl, h('span', { text: 'ª' })),
        ...A.flatMap((a) => [0, 1].map((i) => num(() => r.id[a]?.[i], (x) => { const p = r.id[a] || [0, 0]; p[i] = x; r.id[a] = p; if (!p[0] && !p[1]) delete r.id[a]; }, upd))),
        num(() => r.rep[0], (x) => (r.rep[0] = x), upd), num(() => r.rep[1], (x) => (r.rep[1] = x), upd),
        num(() => r.tp, (x) => (r.tp = x), upd), num(() => r.tm, (x) => (r.tm = x), upd),
        ...(ep ? [num(() => r.nt, (x) => (r.nt = x), upd, 3)] : [num(() => r.int[0], (x) => (r.int[0] = x), upd), num(() => r.int[1], (x) => (r.int[1] = x), upd)]),
        totH, totM, totHM,
        h('td', {}, ro ? null : h('button', { class: 'btn sm warn', text: '×', 'aria-label': 'Apagar linha', onclick: () => { d.marco.alunos.splice(d.marco.alunos.indexOf(r), 1); rows.splice(rows.indexOf(r), 1); draw(); totRow(); changed(); validate(); } })));
      upd(); return tr;
    };
    const novaClasse = (tur) => { const l = rows.filter((x) => x.tur === tur); const last = l[l.length - 1]; const r = { ens, tur, cl: Math.min(12, (last?.cl || (ep ? 0 : NIVEL(+ens) === 'ESG1' ? (d.sis === 'SNE' ? 6 : 7) : 10)) + 1), id: {}, rep: [0, 0], tp: 0, tm: 0, nt: ep ? 1 : 0, int: [0, 0] }; d.marco.alunos.push(r); rows.push(r); rows.sort((a, b) => a.tur - b.tur || a.cl - b.cl); draw(); totRow(); changed(); };
    // as linhas aparecem agrupadas por turno: "Diurno" / "Nocturno" aparece uma vez, como faixa, e não em cada linha
    const draw = () => {
      const turs = [...new Set(rows.map((r) => r.tur))].sort(); if (!turs.length) turs.push(1);
      tb.replaceChildren(...turs.flatMap((t) => [h('tr', { class: 'faixa-turno' }, h('td', { colspan: nCols }, h('span', { text: (S.cod.turnos.find((x) => x[0] === t) || [0, 'Turno ' + t])[1] }),
        ro ? null : h('button', { class: 'btn sm', text: '+ classe', onclick: () => novaClasse(t) }))), ...rows.filter((r) => r.tur === t).map(linha)]));
    };
    draw(); totRow();
    const head1 = h('tr', {}, h('th', { rowspan: 2, text: 'Classe' }),
      ...A.map((a) => h('th', { class: 'grp', colspan: 2, text: a.replace('-', ' ou menos').replace('+', ' ou mais').replace(/^(\d+) ou menos(\d)/, '$1-$2') + ' anos' })),
      h('th', { class: 'grp', colspan: 2, text: 'Repetentes' }), h('th', { class: 'grp', colspan: 2, text: 'Turmas' }), ep ? h('th', { class: 'grp', rowspan: 2, text: 'Nº de turnos', title: 'Em quantos turnos funciona esta classe (1 a 3)' }) : h('th', { class: 'grp', colspan: 2, text: 'Internos' }), h('th', { class: 'grp', colspan: 3, text: 'Total alunos' }), h('th', { rowspan: 2 }));
    const head2 = h('tr', {}, ...A.flatMap(() => [h('th', { text: 'H' }), h('th', { text: 'M' })]), h('th', { text: 'H' }), h('th', { text: 'M' }), h('th', { text: 'Puras' }), h('th', { text: 'Mistas' }), ...(ep ? [] : [h('th', { text: 'H' }), h('th', { text: 'M' })]), h('th', { text: 'H' }), h('th', { text: 'M' }), h('th', { text: 'HM' }));
    const outrosTurnos = S.cod.turnos.filter((t) => !rows.some((r) => r.tur === t[0]) && rows.length && !(ep && t[0] === 2 && d.ano >= 2023));
    const addTur = ro || !outrosTurnos.length ? null : h('div', { class: 'row' }, ...outrosTurnos.map((t) => h('button', { class: 'btn sm', text: `+ Acrescentar o ${t[1].toLowerCase()}`, onclick: () => novaClasse(t[0]) })));
    wrap.append(h('div', { class: 'mapa', 'data-mapa': NIVEL(ens), style: 'display:flex;flex-direction:column;gap:8px' }, h('h3', {}, S.cod.ensinos.find((x) => x[0] === ens)?.[2] || ensAbbr(ens), qChips(S.sel.lev, 'alunos', S.draft?.ano || 2025, new Set([NIVEL(ens)]))),
      h('div', { class: 'tw tall' }, h('table', { class: 'ed' }, h('thead', {}, head1, head2), tb, tf)), addTur,
      h('p', { class: 'note', text: 'As classes sem alunos num ano ficam de fora (por exemplo 1ª, 2ª, 4ª, 5ª, 6ª). Uma classe sem turma própria está numa turma mista de outra classe.' + (ep ? ' Nº de turnos: em quantos turnos funciona a classe (por exemplo, duas turmas da 4ª, uma de manhã e outra à tarde = 2).' : '') })));
  }
  if (!ro) {
    const sel = h('select', {}, S.cod.ensinos.filter((e) => !groups.includes(e[0]) && (!MP || NIVEL(+e[0]) === MP)).map((e) => h('option', { value: e[0], text: `${e[1]} – ${e[2]}` })));
    wrap.append(h('div', { class: 'row' }, h('label', { class: 'f' }, 'Acrescentar ensino', sel), h('button', { class: 'btn', text: 'Acrescentar', onclick: () => { d.marco.alunos.push({ ens: +sel.value, tur: 1, cl: +sel.value === 1001 ? 1 : +sel.value === 1011 ? 7 : 10, id: {}, rep: [0, 0], tp: 0, tm: 0, int: [0, 0] }); changed(); drawLancar(); } })));
  }
  if (!groups.length) wrap.prepend(h('div', { class: 'empty', text: 'Este mapa ainda não tem alunos. Acrescente o ensino da escola ou copie a estrutura do ano anterior.' }));
  wrap.append(h('p', { class: 'note', text: d.sis === 'SNE' ? 'Idades segundo o formulário do SNE: no EP de 5 ou menos a 12 ou mais anos. No ESG de 11 ou menos a 26 ou mais.' : 'Idades segundo o formulário do sistema anterior.' }));
  return wrap;
}
function editSalas(d, ro, changed) {
  d.marco.salas ||= {}; const S_ = d.marco.salas;
  const pndCat = S.cod.pnd[d.sis]; d.marco.pnd ||= {}; const P = d.marco.pnd;
  const n = (get, set) => { const el = h('input', { type: 'number', min: 0, step: 1, value: get() || 0, disabled: ro }); el.oninput = () => { set(Math.max(0, Math.round(+el.value || 0))); changed(); }; return el; };
  // Quadro 5 (salas por material) e, desde 2025, 5.1 turmas ao ar livre e 5.2 turmas anexas com os alunos (H e M)
  d.marco.salasAlunos ||= {}; const SA = d.marco.salasAlunos;
  const nA = (k, i) => n(() => SA[k]?.[i], (x) => { const p = SA[k] || [0, 0]; p[i] = x; SA[k] = p; if (!p[0] && !p[1]) delete SA[k]; });
  const rotulo = (k, l) => (+k === 6 ? `5.1 ${l}` : +k === 7 ? `5.2 ${l}` : l);
  const salas = h('table', { class: 'ed' }, h('thead', {}, h('tr', {}, h('th', { text: 'Tipo de sala' }), h('th', { text: 'Número' }), h('th', { text: 'Alunos H' }), h('th', { text: 'Alunos M' }))),
    h('tbody', {}, S.cod.salas.map(([k, l]) => h('tr', {}, h('td', { text: rotulo(k, l) }), h('td', {}, n(() => S_[k], (x) => { if (x) S_[k] = x; else delete S_[k]; })), +k >= 6 ? h('td', {}, nA(k, 0)) : h('td', { class: 'note', text: '—' }), +k >= 6 ? h('td', {}, nA(k, 1)) : h('td', { class: 'note', text: '—' })))));
  const pnd = h('table', { class: 'ed' }, h('thead', {}, h('tr', {}, h('th', { text: 'Categoria' }), h('th', { text: 'H' }), h('th', { text: 'M' }))),
    h('tbody', {}, pndCat.map(([k, l]) => h('tr', {}, h('td', { text: l }), ...[0, 1].map((i) => h('td', {}, n(() => P[k]?.[i], (x) => { const p = P[k] || [0, 0]; p[i] = x; P[k] = p; if (!p[0] && !p[1]) delete P[k]; })))))));
  return h('div', { class: 'grid2' }, h('div', { class: 'card' }, h('h3', { text: 'Salas de aula por material' }), h('div', { class: 'tw' }, salas)), h('div', { class: 'card' }, h('h3', { text: 'Pessoal não docente' }), h('div', { class: 'tw' }, pnd)));
}
function editInfra(d, ro, changed) {
  if (d.sis === 'antigo' && !d.marco.infra) return h('div', { class: 'empty', text: 'O formulário do sistema anterior não recolhia infra-estruturas.' });
  d.marco.infra ||= {}; const I = d.marco.infra;
  const flags = [['elect', 'Tem electricidade'], ['aguaEsc', 'Água canalizada na escola'], ['aguaFora', 'Água canalizada fora da escola'], ['fontenaria', 'Água de fontenária'], ['internet', 'Tem internet'], ['comput', 'Tem computadores'], ['adaptada', 'Infra-estrutura adaptada a alunos com deficiência'], ['wc', 'Tem casas de banho'], ['latrinas', 'Tem latrinas'], ['pae', 'Tem PAE (alimentação escolar)']];
  flags.push(['internato', 'Tem internato']);
  const qty = [['nComput', 'Nº de computadores'], ['nWc', 'Nº de casas de banho'], ['nLatrinas', 'Nº de latrinas'], ['capInternato', 'Capacidade do internato']];
  return h('div', { class: 'grid2' }, h('div', { class: 'card' }, h('h3', { text: 'A escola tem' }), ...flags.map(([k, l]) => { const c = h('input', { type: 'checkbox', checked: !!+I[k], disabled: ro }); c.onchange = () => { I[k] = c.checked ? 1 : 0; changed(); }; return h('label', { class: 'chk' }, c, l); })),
    h('div', { class: 'card' }, h('h3', { text: 'Quantidades' }), ...qty.map(([k, l]) => { const el = h('input', { type: 'number', min: 0, value: I[k] || 0, disabled: ro }); el.oninput = () => { I[k] = Math.max(0, Math.round(+el.value || 0)); changed(); }; return h('label', { class: 'f' }, l, el); })));
}
function editNotas(d, ro, changed, MP) {
  d.fim.aprov ||= [];
  if (!d.fim.aprov.some((r) => !MP || NIVEL(+r.ens) === MP)) return h('div', { class: 'empty', text: 'Introduza primeiro o bloco Aproveitamento (as notas ficam associadas a cada classe).' });
  const discs = S.cod.disciplinas[d.sis];
  const wrap = h('div', { style: 'display:flex;flex-direction:column;gap:14px' });
  const sel = h('select', { 'aria-label': 'Classe' }, d.fim.aprov.map((r, i) => (MP && NIVEL(+r.ens) !== MP ? null : h('option', { value: i, text: `${ensAbbr(r.ens)} · ${r.cl}ª classe · ${r.tur === 2 ? 'nocturno' : 'diurno'}` }))));
  const box = h('div');
  const draw = () => {
    const r = d.fim.aprov[+sel.value]; r.notas ||= {};
    const n = (disc, i) => { const el = h('input', { type: 'number', min: 0, value: r.notas[disc]?.[i] || 0, disabled: ro }); el.oninput = () => { const p = r.notas[disc] || [0, 0, 0]; p[i] = Math.max(0, Math.round(+el.value || 0)); r.notas[disc] = p; if (!p.some(Boolean)) delete r.notas[disc]; changed(); }; return h('td', {}, el); };
    const list = [...new Set([...discs, ...Object.keys(r.notas)])];
    box.replaceChildren(h('div', { class: 'tw tall' }, h('table', { class: 'ed' }, h('thead', {}, h('tr', {}, h('th', { text: 'Disciplina' }), h('th', { text: 'Notas 0–9' }), h('th', { text: 'Notas 10–13' }), h('th', { text: 'Notas 14–20' }))),
      h('tbody', {}, list.map((dc) => h('tr', {}, h('td', { text: dc }), n(dc, 0), n(dc, 1), n(dc, 2)))))));
  };
  sel.onchange = draw; draw();
  wrap.append(h('label', { class: 'f' }, 'Classe', sel), box, h('p', { class: 'note', text: 'Número de alunos em cada escalão de nota final, por disciplina.' }));
  return wrap;
}
async function copyPrev() {
  const d = S.draft; const fm = await fichasEfectivas(d.ano - 1, d.dist, !!S.db); const p = fm.get(d.esc);
  if (!p) { toast(`Não há mapa de ${d.ano - 1} para esta escola.`); return; }
  const lev = S.sel.lev;
  if (d[lev] && Object.keys(d[lev]).length && !(await confirmBox('Este mapa já tem dados neste levantamento. Substituir pela estrutura do ano anterior (com zeros)?', 'Substituir'))) return;
  const z = (o) => (Array.isArray(o) ? o.map((x) => (typeof x === 'number' ? 0 : z(x))) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, ['ens', 'tur', 'cl', 'q', 'mot', 'tipo', 'disc'].includes(k) ? v : typeof v === 'number' ? 0 : z(v)])) : o);
  const src = clone(p[lev] || {});
  if (lev === 'marco') {
    d.marco = {};
    if (src.alunos) d.marco.alunos = src.alunos.filter((r) => !(d.sis === 'SNE' && p.sis === 'antigo' && r.ens === 1002)).map((r) => ({ ens: r.ens, tur: r.tur, cl: r.cl, id: {}, rep: [0, 0], tp: 0, tm: 0, int: [0, 0] }));
    if (src.prof && d.sis === p.sis) d.marco.prof = z(src.prof);
  } else {
    d.fim = {};
    if (src.aprov) d.fim.aprov = src.aprov.map((r) => ({ ens: r.ens, tur: r.tur, cl: r.cl, fim: [0, 0], exame: [0, 0], aprov: [0, 0], tp: 0, tm: 0, notas: {} }));
  }
  S.blockRows = {}; S.dirty = true; drawLancar(); toast('Estrutura copiada. Preencha os números e grave.');
}
async function saveFicha(opts = {}) {
  const d = S.draft; if (!d || !S.db) return;
  if (opts.auto && (!S.dirty || roMotivo(d.ano, S.sel.lev, d.dist))) return;
  const iss = validate();
  const nErr = iss.filter((t) => !t.startsWith('Aviso')).length;
  // gravação automática: só quando não há erros de coerência (com erros, espera que corrija ou que grave à mão)
  if (opts.auto && nErr > (S.errBase ?? 0)) { S.autoEstado = 'erros'; drawLancarStatus(); return; }
  if (!opts.auto && iss.length && !(await confirmBox(nErr ? `O mapa tem ${nErr} erro(s) de coerência entre quadros (ex.: ${iss.find((t) => !t.startsWith('Aviso'))}). Corrija antes de gravar, ou grave assim e corrija depois.` : `O mapa tem ${iss.length} aviso(s): ${iss[0].replace('Aviso: ', '')} Gravar mesmo assim?`, nErr ? 'Gravar com erros' : 'Gravar'))) return;
  const btn = $('#l-gravar'); if (btn) { btn.disabled = true; btn.textContent = 'A gravar…'; }
  try {
    const out = clone(d); out.marco ||= {}; out.fim ||= {}; out.em = new Date().toISOString(); out.por = S.me?.id || null;
    out.primeiro = { ...(S.fichaBase?.primeiro || d.primeiro || {}) }; for (const lv of ['marco', 'fim']) if (!out.primeiro[lv] && Object.keys(out[lv] || {}).length && JSON.stringify(out[lv]) !== JSON.stringify(S.fichaBase?.[lv] || {})) out.primeiro[lv] = out.em;
    out.revisoes = (S.fichaBase?.revisoes || d.revisoes || 0) + 1; S.qualCache = {};
    for (const sec of ['marco', 'fim']) for (const k of Object.keys(out[sec] || {})) { const v = out[sec][k]; if ((Array.isArray(v) && !v.length) || (v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)) delete out[sec][k]; }
    for (const id of FORM.flatIds) if (Array.isArray(out.marco[id])) { out.marco[id] = out.marco[id].filter((r) => Object.entries(r).some(([k, v]) => !['ens', 'tur', 'cl', 'disc', 'reg', 'turno', 'mob'].includes(k) && v)) ; if (!out.marco[id].length) delete out.marco[id]; }
    out.marco.alunos = (out.marco.alunos || []).filter((r) => Object.keys(r.id || {}).length || r.rep?.some(Boolean) || r.tp || r.tm);
    if (!out.marco.alunos.length) delete out.marco.alunos;
    // histórico para “Desfazer”: guarda a versão que estava gravada antes desta
    const hk = d.ano + '_' + d.esc; const hist = (S.histFicha ||= {})[hk] ||= [];
    hist.push(S.fichaBase === undefined ? null : clone(S.fichaBase)); if (hist.length > 30) hist.shift();
    await S.db.doc(`fichas/${d.ano}_${d.esc}`).set(out);
    // só se diz “gravado” depois de o mapa estar escrito no disco
    if (S.db.__flush && !(await S.db.__flush())) throw { code: 'disco', message: window.__erroGravar?.msg || '' };
    // auditoria: que quadros mudaram, quantos números, e um exemplo do valor anterior e do actual
    try { const ant = S.fichaBase || { marco: {}, fim: {} }; const mud = []; let nCel = 0, ex = '';
      const folhas = (o, p = '', acc = {}) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) folhas(v, p ? p + '.' + k : k, acc); else acc[p] = o; return acc; };
      for (const sec of ['marco', 'fim']) for (const b of new Set([...Object.keys(ant[sec] || {}), ...Object.keys(out[sec] || {})])) { const a = folhas(ant[sec]?.[b]), n = folhas(out[sec]?.[b]); let c = 0; for (const k of new Set([...Object.keys(a), ...Object.keys(n)])) if (String(a[k] ?? '') !== String(n[k] ?? '')) { c++; if (!ex) ex = `${sec}.${b}.${k}: ${a[k] ?? '—'} → ${n[k] ?? '—'}`; } if (c) { mud.push(`${sec === 'marco' ? '3 Março' : 'Fim'}·${b} (${c})`); nCel += c; } }
      if (nCel) registar(opts.auto ? 'mapa gravado (automático)' : 'mapa gravado', { ano: d.ano, esc: d.esc, alvo: `${nCel} números alterados: ${mud.join(', ')}${ex ? ' · ex.: ' + ex : ''}` }); } catch {}
    S.fichaBase = clone(out); S.autoEstado = opts.auto ? 'auto' : 'manual'; S.autoEm = new Date();
    if (opts.auto) { d.em = out.em; d.por = out.por; S.dirty = false; S.conflict = null; S.draftOrigin = 'db'; const k = d.ano + '_' + d.dist; const m = S.dbFichas.get(k) || new Map(); m.set(d.esc, out); S.dbFichas.set(k, m); await recalcResumo(d.ano, d.dist); drawLancarStatus(); fillEsc(); return; }
    S.draft = out; S.dirty = false; S.conflict = null; S.draftOrigin = 'db'; S.blockRows = {};
    const k = d.ano + '_' + d.dist; const m = S.dbFichas.get(k) || new Map(); m.set(d.esc, out); S.dbFichas.set(k, m);
    await recalcResumo(d.ano, d.dist);

    toast('Mapa gravado. O painel já inclui estes dados.');
  } catch (e) {
    toast(e?.code === 'disco' ? `Não foi possível gravar no disco (${e.message}). Verifique se o disco tem espaço e se a pasta de dados está acessível. Os dados continuam no ecrã: tente gravar de novo.` : e?.code === 'quota_exceeded' ? 'A base de dados está cheia. Contacte o responsável do sistema.' : e?.code === 'invalid_argument' ? 'Não tem permissão para gravar, ou o mapa é demasiado grande.' : 'Não foi possível gravar. Verifique a ligação e tente outra vez.', 5000);
  }
  drawLancar(); fillEsc();
}

// =====================================================================
// ESCOLAS (cadastro)
// =====================================================================

// =====================================================================
// PAINEL
// =====================================================================
const PAIRK = ['Matric', 'IdOf', 'Sob', 'BaseId', 'C1Id6', 'Rep', 'Fim', 'Aprov', 'Desist', 'Transf', 'Orf', 'Defic', 'MatricFim', 'Prof', 'ProfForm', 'Biling', 'Id6'];
function sumUp(ano, f) {
  const dists = f.dist === 'Todos' ? S.cod.distritos.map((d) => d[0]) : [+f.dist];
  // a província só se mostra quando todos os distritos são visíveis (num SDEJT, anos ainda não publicados pela DPE ficam sem total provincial)
  if (f.dist === 'Todos' && dists.some((d) => !visivel(ano, d))) return null;
  return sumUpRs(dists.map((d) => resumoDe(ano, d)), ano, f);
}
// soma uma lista de resumos (de distritos, ou de um conjunto qualquer de fichas, por exemplo um posto administrativo)
function sumUpRs(rs, ano, f) {
  const T = {}, byCl = {}, E = { nEsc: 0, salasConv: 0, salasPrec: 0, turLivre: 0, pnd: 0, elect: 0, agua: 0, sanit: 0, escInfo: 0, matricAll: 0 }, mot = {}, notas = {};
  for (const k of PAIRK) T[k] = [0, 0]; T.Turmas = 0; T.LivPort = 0; T.LivMat = 0; T.Escolas = 0; T.EscolasFim = 0;
  let any = false, nEst = 0;
  for (const r of rs) {
    if (!r) continue; any = true; nEst += Object.keys(r.estado || {}).length;
    for (const row of r.rows) {
      if (f.tipo !== 'Todos' && row.t !== f.tipo) continue;
      if (f.nivel !== 'Todos' && row.n !== f.nivel) continue;
      if (f.classe && row.cl !== +f.classe) continue;
      const c = (byCl[row.cl] ||= (() => { const o = {}; for (const k of PAIRK) o[k] = [0, 0]; o.Turmas = 0; o.LivPort = 0; o.LivMat = 0; return o; })());
      for (const k of PAIRK) if (row[k]) { T[k][0] += row[k][0]; T[k][1] += row[k][1]; c[k][0] += row[k][0]; c[k][1] += row[k][1]; }
      for (const k of ['Turmas', 'LivPort', 'LivMat']) if (row[k]) { T[k] += row[k]; c[k] += row[k]; }
      T.Escolas += row.Escolas || 0; T.EscolasFim += row.EscolasFim || 0;
    }
    for (const [t, e] of Object.entries(r.esc || {})) { if (f.tipo !== 'Todos' && t !== f.tipo) continue; for (const k of Object.keys(E)) E[k] += e[k] || 0; }
    for (const [k, v] of Object.entries(r.mot || {})) { const [t, n, m] = k.split('|'); if ((f.tipo !== 'Todos' && t !== f.tipo) || (f.nivel !== 'Todos' && n !== f.nivel)) continue; const a = (mot[m] ||= [0, 0]); a[0] += v[0]; a[1] += v[1]; }
    for (const [k, v] of Object.entries(r.notas || {})) { const [t, n, ds] = k.split('|'); if ((f.tipo !== 'Todos' && t !== f.tipo) || (f.nivel !== 'Todos' && n !== f.nivel)) continue; const a = (notas[ds] ||= [0, 0]); a[0] += v[0]; a[1] += v[1]; }
  }
  return any ? { T, byCl, E, mot, notas, ano, f } : null;
}
const IND = [
  ['Acesso e cobertura'],
  ['matric', 'Alunos matriculados', 'n', 'Levantamento de 3 de Março'], ['pctF', '% de raparigas', 'p', 'Alunas ÷ alunos'], ['escolas', 'Escolas com alunos', 'n', 'Por nível'],
  ['novos', 'Novos ingressos (classe inicial do nível)', 'n', 'Matriculados − repetentes na classe de entrada do nível e ano'], ['c1id6', '% da 1ª classe com 6 anos', 'p', 'Alunos de 6 anos ÷ alunos da 1ª classe'],
  ['tba', 'Taxa bruta de admissão (TBA)', 'p', 'Novos ingressos na 1ª classe ÷ população de 6 anos'], ['tla', 'Taxa líquida de admissão (TLA)', 'p', 'Alunos de 6 anos na 1ª classe ÷ população de 6 anos'],
  ['tesc6', 'Taxa de escolarização aos 6 anos', 'p', 'Alunos de 6 anos no EP ÷ população de 6 anos'],
  ['tbe', 'Taxa bruta de escolarização (TBE)', 'p', 'Alunos do nível ÷ população em idade oficial do nível'], ['tle', 'Taxa líquida de escolarização (TLE)', 'p', 'Alunos em idade oficial ÷ população em idade oficial'],
  ['Eficácia interna'],
  ['aprovEsc', 'Taxa de aproveitamento escolar', 'p', 'Aprovados ÷ matriculados no início do ano'], ['aprov', 'Taxa de aproveitamento pedagógico', 'p', 'Aprovados ÷ alunos no fim do ano'],
  ['reprov', 'Taxa de reprovação', 'p', 'Reprovados ÷ alunos no fim do ano'], ['desist', 'Taxa de desistência', 'p', 'Desistentes ÷ matriculados no início do ano'],
  ['ret3', 'Taxa de retenção até à 3ª classe', 'p', 'Novos ingressos na 3ª classe (ano n) ÷ alunos da 1ª classe (ano n−2)'], ['tbc', 'Taxa bruta de conclusão', 'p', 'Aprovados na última classe do nível ÷ população na idade oficial de conclusão'],
  ['repet', 'Taxa de repetência', 'p', 'Repetentes ÷ matriculados'], ['sob', '% com sobreidade (2+ anos)', 'p', 'Idade ≥ idade oficial da classe + 2'], ['cobFim', 'Cobertura do fim do ano', 'p', 'Escolas com fim do ano introduzido ÷ escolas com alunos'],
  ['Gestão de recursos: professores'],
  ['prof', 'Professores', 'n', 'Em exercício'], ['alprof', 'Rácio alunos por professor', 'r', 'Alunos ÷ professores (válido sobretudo no EP)'], ['alprofF', 'Rácio alunos por professor com formação', 'r', 'Alunos ÷ professores com formação psicopedagógica'],
  ['altur', 'Rácio alunos por turma', 'r', 'Alunos ÷ turmas (puras e mistas)'], ['turmas', 'Turmas', 'n', 'Puras + mistas'],
  ['formados', '% professores com formação psicopedagógica', 'p', 'Com formação ÷ professores'], ['pctProfF', '% de professoras', 'p', 'Professoras ÷ professores'],
  ['Gestão de recursos: salas e livros'],
  ['pctConv', '% salas de material convencional', 'p', 'Cimento e tijolo ÷ total de salas'], ['prec', '% salas de material precário', 'p', 'Maticado, pau-a-pique e outros'], ['alsala', 'Rácio alunos por sala', 'r', 'Alunos de todos os níveis ÷ salas'],
  ['livre', 'Turmas ao ar livre', 'n', ''], ['livNP', 'Alunos com livro de Português', 'n', 'Número'], ['livP', '% com livro de Português', 'p', 'Sobretudo EP'], ['livM', '% com livro de Matemática', 'p', 'Sobretudo EP'],
  ['pnd', 'Pessoal não docente', 'n', ''], ['elect', '% escolas com electricidade', 'p', 'Desde 2023'], ['agua', '% escolas com água', 'p', 'Desde 2023'], ['sanit', '% escolas com sanitários', 'p', 'Desde 2023'],
  ['Equidade'],
  ['ipg', 'Paridade de género na matrícula', 'i', 'Alunas ÷ alunos'], ['ipgAp', 'Paridade de género na aprovação', 'i', 'Aprovação delas ÷ deles'], ['orf', '% de alunos órfãos', 'p', ''], ['defic', 'Alunos com deficiência', 'n', 'Desde 2023'], ['biling', 'Alunos no ensino bilingue', 'n', ''],
];
const KIND = Object.fromEntries(IND.filter((x) => x[1]).map((x) => [x[0], x[2]]));
const GOOD = { tba: 1, tla: 1, tesc6: 1, tbe: 1, tle: 1, aprovEsc: 1, ret3: 1, tbc: 1, pctConv: 1, livNP: 1, alprofF: -1, aprov: 1, formados: 1, livP: 1, livM: 1, elect: 1, agua: 1, sanit: 1, cobFim: 1, reprov: -1, desist: -1, repet: -1, sob: -1, alprof: -1, altur: -1, alsala: -1, prec: -1, livre: -1 };
// ---- Estrutura do SNE por ano (Lei 18/2018, implementação gradual) — fonte única ----
// Classes com novos ingressos (admissão) por nível e ano:
//   EP/Todos: 1ª (admissão ao sistema). ESG1: 8ª (≤2022) · 7ª+8ª (2023) · 7ª (≥2024). ESG2: 11ª (≤2025) · 10ª+11ª (2026) · 10ª (≥2027).
function entradaNivel(ano, nivel) {
  const n = nivel === 'Todos' || nivel === 'ETP' ? 'EP' : nivel;
  if (n === 'ESG1') return ano <= 2022 ? [8] : ano === 2023 ? [7, 8] : [7];
  if (n === 'ESG2') return ano <= 2025 ? [11] : ano === 2026 ? [10, 11] : [10];
  return [1];
}
// Classe(s) terminal(is) — conclusão/exame — por nível e ano (anos de transição com duas classes):
//   EP: 7ª (≤2021) · 6ª+7ª (2022) · 6ª (≥2023). ESG1: 10ª (≤2024) · 9ª+10ª (2025) · 9ª (≥2026). ESG2: 12ª.
function terminalNivel(ano, nivel) {
  const n = nivel === 'Todos' || nivel === 'ETP' ? 'EP' : nivel;
  if (n === 'ESG1') return ano <= 2024 ? [10] : ano === 2025 ? [9, 10] : [9];
  if (n === 'ESG2') return [12];
  return ano <= 2021 ? [7] : ano === 2022 ? [6, 7] : [6];
}
function indicators(x, sexo) {
  if (!x) return {};
  const { T, byCl, E } = x;
  const clSum = (cl, k) => { const c = byCl[cl]; return !c ? 0 : sexo === 'Homens' ? c[k][0] : sexo === 'Mulheres' ? c[k][1] : c[k][0] + c[k][1]; };
  const novosV = entradaNivel(x.ano, x.f?.nivel || 'Todos').reduce((t, cl) => t + clSum(cl, 'Matric') - clSum(cl, 'Rep'), 0);
  const g = (k) => (sexo === 'Homens' ? T[k][0] : sexo === 'Mulheres' ? T[k][1] : T[k][0] + T[k][1]);
  const tot = (k) => T[k][0] + T[k][1];
  const div = (a, b) => (b > 0 ? a / b : null);
  const c1 = byCl[1]; const g1 = (k) => (!c1 ? 0 : sexo === 'Homens' ? c1[k][0] : sexo === 'Mulheres' ? c1[k][1] : c1[k][0] + c1[k][1]);
  const salas = E.salasConv + E.salasPrec, temFim = tot('Fim') > 0;
  return {
    matric: g('Matric'), pctF: div(T.Matric[1], tot('Matric')), escolas: T.Escolas, novos: novosV, c1id6: div(g1('C1Id6'), g1('Matric')),
    aprov: temFim ? div(g('Aprov'), g('Fim')) : null, reprov: temFim ? div(g('Fim') - g('Aprov'), g('Fim')) : null, desist: temFim ? div(g('Desist'), g('MatricFim')) : null,
    repet: div(g('Rep'), g('Matric')), sob: div(g('Sob'), g('BaseId')), cobFim: T.Escolas ? Math.min(1, T.EscolasFim / T.Escolas) : null,
    prof: g('Prof'), pctProfF: div(T.Prof[1], tot('Prof')), formados: div(g('ProfForm'), g('Prof')), alprof: div(tot('Matric'), tot('Prof')),
    turmas: T.Turmas, altur: div(tot('Matric'), T.Turmas), alsala: div(E.matricAll, salas), prec: div(E.salasPrec, salas), livre: E.turLivre,
    livP: div(T.LivPort, tot('Matric')), livM: div(T.LivMat, tot('Matric')), pnd: E.pnd, elect: div(E.elect, E.escInfo), agua: div(E.agua, E.escInfo), sanit: div(E.sanit, E.escInfo),
    ipg: div(T.Matric[1], T.Matric[0]), ipgAp: T.Fim[0] && T.Fim[1] && T.Aprov[0] ? (T.Aprov[1] / T.Fim[1]) / (T.Aprov[0] / T.Fim[0]) : null,
    orf: div(g('Orf'), g('Matric')), defic: ano2023(x) ? g('Defic') : null, biling: g('Biling') || null,
    aprovEsc: temFim ? div(g('Aprov'), g('MatricFim')) : null, alprofF: div(tot('Matric'), tot('ProfForm')), pctConv: div(E.salasConv, salas), livNP: T.LivPort || null,
    ...indicadoresPop(x, sexo),
  };
}
// população em idade escolar (folha Administração > População)
function popSoma(ano, dist, lo, hi, sexo) {
  const ds = dist === 'Todos' ? S.cod.distritos.map((d) => d[0]) : [+dist];
  let t = 0, any = false;
  for (const d of ds) {
    const p = S.pop?.get(`${ano}_${d}`); if (!p) continue;
    for (let a = lo; a <= hi; a++) { const v = p.idades?.[a]; if (!v) continue; any = true; t += sexo === 'Homens' ? +v[0] || 0 : sexo === 'Mulheres' ? +v[1] || 0 : (+v[0] || 0) + (+v[1] || 0); }
  }
  return any ? t : null;
}
function indicadoresPop(x, sexo) {
  if (!x.f) return {};
  const { ano, f } = x, sis = sisDe(ano), nv = f.nivel === 'Todos' || f.nivel === 'ETP' ? 'EP' : f.nivel;
  const gs = (a) => (sexo === 'Homens' ? a[0] : sexo === 'Mulheres' ? a[1] : a[0] + a[1]);
  const div = (a, b) => (a != null && b ? a / b : null);
  const pop6 = popSoma(ano, f.dist, 6, 6, sexo);
  const c1 = x.byCl[1];
  const xl = f.nivel === nv ? x : sumUp(ano, { ...f, nivel: nv });
  const rg = window.EAgg.RANGE[sis][nv];
  const popN = popSoma(ano, f.dist, rg[0], rg[1], sexo);
  const fins = terminalNivel(ano, nv), finMin = Math.min(...fins);
  const popC = popSoma(ano, f.dist, finMin + 5, finMin + 5, sexo);
  let aprC = 0, fimC = 0; for (const fc of fins) { const cfc = xl?.byCl[fc]; if (cfc) { aprC += gs(cfc.Aprov); fimC += gs(cfc.Fim); } }
  const x2 = sumUp(ano - 2, f); const c3 = x.byCl[3], c1a = x2?.byCl[1];
  return {
    tba: c1 && pop6 ? (gs(c1.Matric) - gs(c1.Rep)) / pop6 : null, tla: c1 ? div(gs(c1.C1Id6), pop6) : null, tesc6: div(gs(x.T.Id6), pop6),
    tbe: xl ? div(gs(xl.T.Matric), popN) : null, tle: xl ? div(gs(xl.T.IdOf), popN) : null,
    tbc: fimC > 0 ? div(aprC, popC) : null,
    ret3: c3 && c1a && gs(c1a.Matric) ? (gs(c3.Matric) - gs(c3.Rep)) / gs(c1a.Matric) : null,
  };
}
const ano2023 = (x) => x.T.Defic[0] + x.T.Defic[1] > 0;
const fmt = (k, v) => (v == null || Number.isNaN(v) ? '—' : KIND[k] === 'n' ? NF.format(Math.round(v)) : KIND[k] === 'r' ? R1.format(v) : KIND[k] === 'i' ? R2.format(v) : P1.format(v));
const fmtD = (k, d) => { if (d == null || Number.isNaN(d)) return '—'; const sg = d > 0 ? '+' : d < 0 ? '−' : ''; const a = Math.abs(d); return KIND[k] === 'n' ? sg + NF.format(Math.round(a)) : KIND[k] === 'r' ? sg + R1.format(a) : KIND[k] === 'i' ? sg + R2.format(a) : sg + R1.format(a * 100) + ' p.p.'; };
VIEWS.painel = (v) => {
  const f = S.pf;
  const sel = (k, list, lab) => h('label', { class: 'f' }, lab, h('select', { onchange: (e) => { f[k] = e.target.value; go('painel'); } }, list.map((o) => h('option', { value: o[0], text: o[1], selected: String(o[0]) === String(f[k]) }))));
  const anosDados = ANOS.filter((a) => S.cod.distritos.some((d) => resumoDe(a, d[0])));
  if (!anosDados.includes(+f.ano)) f.ano = anosDados[anosDados.length - 1] || ANO_MAX_DADOS;
  v.append(h('div', {}, h('h1', { text: 'Painel de Indicadores' }), h('p', { class: 'lede', text: 'Calculado a partir dos mapas de levantamento. Qualquer mapa gravado em Introdução de Dados entra aqui de imediato.' })));
  v.append(h('div', { class: 'card' }, h('div', { class: 'row' },
    sel('ano', desc(anosDados).map((a) => [a, a]), 'Ano'), sel('dist', [['Todos', 'Província (todos)'], ...S.cod.distritos], 'Distrito'), sel('tipo', ['Todos', 'Pública', 'Privada', 'Comunitária'].map((t) => [t, t]), 'Tipo de escola'),
    sel('nivel', [['Todos', 'Todos'], ['EP', 'Ensino Primário'], ['ESG1', 'ESG 1º Ciclo'], ['ESG2', 'ESG 2º Ciclo'], ['ETP', 'Técnico-Profissional']], 'Nível'), sel('sexo', ['Ambos', 'Homens', 'Mulheres'].map((t) => [t, t]), 'Sexo'),
    h('button', { class: 'btn', text: 'Exportar indicadores (Excel)', disabled: !S.downloads, onclick: exportIndicadores }),
    DESKTOP ? h('button', { class: 'btn primary', text: 'Livro de Indicadores (Excel)', onclick: livroIndicadores }) : null)));
  if (DESKTOP && !(S.pop && S.pop.size)) v.append(h('p', { class: 'pill warn', text: 'Sem população introduzida: as taxas de admissão, escolarização e conclusão aparecem com traço. Introduza-a em Administração > População.' }));
  const ano = +f.ano;
  const cur = indicators(sumUp(ano, f), f.sexo), prev = indicators(sumUp(ano - 1, f), f.sexo);
  const kp = [['matric', 'Alunos'], ['prof', 'Professores'], ['alprof', 'Alunos por professor'], ['formados', 'Professores com formação'], ['aprov', 'Taxa de aprovação'], ['desist', 'Taxa de desistência']];
  v.append(h('div', { class: 'kpis' }, kp.map(([k, l]) => {
    const d = cur[k] != null && prev[k] != null ? cur[k] - prev[k] : null;
    const cls = d && GOOD[k] ? (d * GOOD[k] > 0 ? 'good' : 'badc') : '';
    return h('div', { class: 'kpi' }, h('span', { class: 'l', text: l }), h('span', { class: 'v', text: fmt(k, cur[k]) }),
      h('span', { class: 'd' }, d == null ? (['aprov', 'desist'].includes(k) && cur[k] == null ? 'Fim do ano por introduzir' : 'Sem comparação') : h('span', { class: cls, text: fmtD(k, d) }), d == null ? '' : ` face a ${ano - 1}`,
        ['aprov', 'desist'].includes(k) && cur.cobFim != null && cur.cobFim < 0.95 && cur[k] != null ? h('span', { style: 'display:block;color:var(--warn)', text: `Só ${P1.format(cur.cobFim)} das escolas com fim do ano introduzido` }) : null));
  })));
  // por nível de ensino, com as cores dos mapas oficiais
  if (f.nivel === 'Todos') {
    const KN = [['matric', 'Alunos'], ['pctF', '% raparigas'], ['alprof', 'Alunos/professor'], ['altur', 'Alunos/turma'], ['aprov', 'Aprovação'], ['desist', 'Desistência'], ['reprov', 'Reprovação'], ['ipg', 'Paridade (IPG)']];
    v.append(h('div', { class: 'grid3', style: 'grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))' }, ['EP', 'ESG1', 'ESG2'].map((nv) => {
      const c = indicators(sumUp(ano, { ...f, nivel: nv }), f.sexo), p_ = indicators(sumUp(ano - 1, { ...f, nivel: nv }), f.sexo);
      return h('div', { class: 'mapa', 'data-mapa': nv, style: 'display:flex;flex-direction:column;gap:6px' }, h('h3', { class: 'mt', text: MAPA_NOME[nv] }),
        h('div', { class: 'ilist', style: 'grid-template-columns:minmax(0,1fr) auto auto' }, KN.flatMap(([k, l]) => { const d = c[k] != null && p_[k] != null ? c[k] - p_[k] : null; const cls = d && GOOD[k] ? (d * GOOD[k] > 0 ? 'good' : 'badc') : ''; return [h('div', { text: l }), h('div', { class: 'n', style: 'font-weight:600', text: fmt(k, c[k]) }), h('div', { class: 'n ' + cls, style: 'font-size:12px', text: fmtD(k, d) })]; })));
    })));
  }
  // lista completa + série
  const M_ = S.metas || {}; const temMeta = Object.keys(M_).length > 0;
  const list = h('div', { class: 'ilist', style: temMeta ? 'grid-template-columns:minmax(0,1fr) auto auto auto auto' : null }, h('div', { class: 'h', text: 'Indicador' }), h('div', { class: 'h n', text: ano }), h('div', { class: 'h n', text: ano - 1 }), h('div', { class: 'h n hide-sm', text: 'Diferença' }), temMeta ? h('div', { class: 'h n', text: 'Meta' }) : null);
  for (const it of IND) {
    if (!it[1]) { list.append(h('div', { class: 'g', text: it[0] })); continue; }
    const [k, l, , def] = it; const d = cur[k] != null && prev[k] != null ? cur[k] - prev[k] : null;
    const mt = M_[k]; const ok = mt == null || cur[k] == null ? null : (GOOD[k] || 1) > 0 ? cur[k] >= mt : cur[k] <= mt;
    const sp = sparkSVG(serieIndicador(k, f, anosDados)); const spb = h('button', { class: 'spk', title: `Ver a evolução de ${l} no gráfico`, 'aria-label': `Gráfico de ${l}`, onclick: () => { f.serie = k; serieSel.value = k; drawSerie(); serieBox.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, sp);
    list.append(h('div', { class: 'ind-nome' }, h('div', {}, DESKTOP ? h('a', { href: '#ajuda', onclick: () => { S.ajudaTab = 'ficha'; setTimeout(() => document.getElementById('def-' + k)?.scrollIntoView(), 150); }, text: l }) : l, def ? h('small', { text: def }) : null), spb), h('div', { class: 'n', text: fmt(k, cur[k]) }), h('div', { class: 'n', text: fmt(k, prev[k]) }),
      h('div', { class: 'n hide-sm' }, h('span', { class: d && GOOD[k] ? (d * GOOD[k] > 0 ? 'good' : 'badc') : '', text: fmtD(k, d) })),
      temMeta ? h('div', { class: 'n' }, mt == null ? '—' : h('span', { class: ok == null ? '' : ok ? 'good' : 'badc', text: (ok == null ? '' : ok ? '✓ ' : '✗ ') + fmt(k, mt) })) : null);
  }
  const serieSel = h('select', { onchange: (e) => { f.serie = e.target.value; drawSerie(); } }, IND.filter((x) => x[1]).map((x) => h('option', { value: x[0], text: x[1], selected: x[0] === f.serie })));
  const serieBox = h('div', { class: 'chart' });
  const drawSerie = () => {
    const pts = anosDados.map((a) => ({ x: a, y: indicators(sumUp(a, f), f.sexo)[f.serie] })).filter((p) => p.y != null);
    lineChart(serieBox, pts, f.serie, ano);
  };
  v.append(h('div', { class: 'grid2' }, h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h2', { text: 'Evolução' }), h('label', { class: 'f' }, 'Indicador', serieSel)),
    h('p', { class: 'note', text: 'Com os filtros escolhidos. O ponto marca o ano seleccionado. A linha tracejada marca 2023, quando o EP passou a ir até à 6ª classe.' }), serieBox),
    h('div', { class: 'card' }, h('h2', { text: 'Todos os indicadores' }), h('p', { class: 'note', text: 'Lista completa: role dentro do quadro para ver os restantes grupos. Clique no pequeno gráfico para ver a evolução.' }), rolagem(list))));
  requestAnimationFrame(drawSerie);
  // distritos
  const cols = [['matric', 'Alunos'], ['pctF', '% raparigas'], ['prof', 'Professores'], ['alprof', 'Aluno/prof.'], ['formados', '% formados'], ['altur', 'Aluno/turma'], ['alsala', 'Aluno/sala'], ['aprov', 'Aprovação'], ['desist', 'Desistência'], ['repet', 'Repetência'], ['sob', 'Sobreidade'], ['cobFim', 'Fim do ano introduzido']];
  const st = S.distSort ||= { k: 'nome', dir: 1 };
  const drows = S.cod.distritos.map(([d, nome]) => ({ nome, d, ...indicators(sumUp(ano, { ...f, dist: d }), f.sexo) }));
  drows.sort((a, b) => (st.k === 'nome' ? a.nome.localeCompare(b.nome, 'pt') * st.dir : ((a[st.k] ?? -1e9) - (b[st.k] ?? -1e9)) * st.dir));
  const th = (k, l) => h('th', { 'aria-sort': st.k === k ? (st.dir > 0 ? 'ascending' : 'descending') : null }, h('button', { class: 'btn sm', style: 'border:0;background:none;padding:0;font-weight:600;color:inherit', text: l, onclick: () => { S.distSort = { k, dir: st.k === k ? -st.dir : k === 'nome' ? 1 : -1 }; go('painel'); } }));
  const prov = indicators(sumUp(ano, { ...f, dist: 'Todos' }), f.sexo);
  const mapaSel = h('select', { onchange: (e) => { f.mapa = e.target.value; drawBars(); } }, cols.map(([k, l]) => h('option', { value: k, text: l, selected: k === f.mapa })));
  const barBox = h('div', { class: 'chart' });
  const drawBars = () => barChart(barBox, drows.filter((r) => r[f.mapa] != null).map((r) => ({ l: r.nome, v: r[f.mapa] })).sort((a, b) => b.v - a.v), f.mapa, prov[f.mapa]);
  v.append(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h2', { text: `Distritos em ${ano}` }), h('label', { class: 'f' }, 'Gráfico', mapaSel)), barBox,
    h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, th('nome', 'Distrito'), cols.map(([k, l]) => th(k, l)))),
      h('tbody', {}, drows.map((r) => h('tr', {}, h('td', { text: r.nome }), cols.map(([k]) => h('td', { text: fmt(k, r[k]), style: (k === 'alprof' || k === 'altur') && r[k] > 70 ? 'color:var(--bad);font-weight:600' : null }))))),
      h('tfoot', {}, h('tr', {}, h('td', { text: 'Província' }), cols.map(([k]) => h('td', { text: fmt(k, prov[k]) }))))))));
  requestAnimationFrame(drawBars);
  v.append(cartaoComparar(f, anosDados, ano));
  // classes + motivos + notas
  const x = sumUp(ano, f);
  const clRows = x ? Object.keys(x.byCl).map(Number).filter((c) => c > 0).sort((a, b) => a - b).map((c) => {
    const C = x.byCl[c]; const g = (k) => (f.sexo === 'Homens' ? C[k][0] : f.sexo === 'Mulheres' ? C[k][1] : C[k][0] + C[k][1]);
    const fim = C.Fim[0] + C.Fim[1];
    return [c, g('Matric'), g('Matric') ? g('Rep') / g('Matric') : null, fim ? g('Aprov') / g('Fim') : null, fim && g('MatricFim') ? g('Desist') / g('MatricFim') : null, g('BaseId') ? g('Sob') / g('BaseId') : null];
  }).filter((r) => r[1]) : [];
  const motL = x ? Object.entries(x.mot).map(([k, v]) => { const [sis, id] = k.split(':'); const nm = (S.cod.motivos[sis].find((m) => m[0] === +id) || [0, 'Motivo ' + id])[1]; return [nm, f.sexo === 'Homens' ? v[0] : f.sexo === 'Mulheres' ? v[1] : v[0] + v[1]]; }) : [];
  const motAgg = {}; for (const [n, val] of motL) motAgg[n] = (motAgg[n] || 0) + val;
  const motBox = h('div', { class: 'chart' }), notBox = h('div', { class: 'chart' });
  v.append(h('div', { class: 'grid2' },
    h('div', { class: 'card' }, h('h2', { text: 'Por classe' }), h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Classe', 'Alunos', 'Repetência', 'Aprovação', 'Desistência', 'Sobreidade'].map((t) => h('th', { text: t })))),
      h('tbody', {}, clRows.map((r) => h('tr', {}, h('td', { text: r[0] + 'ª' }), h('td', { text: NF.format(r[1]) }), ...r.slice(2).map((v_) => h('td', { text: v_ == null ? '—' : P1.format(v_) })))))))),
    h('div', { class: 'card' }, h('h2', { text: 'Desistentes por motivo' }), motBox),
  ), h('div', { class: 'card' }, h('h2', { text: 'Notas positivas por disciplina' }), h('p', { class: 'note', text: 'Alunos com nota 10–20 ÷ alunos avaliados. Disciplinas com pelo menos 30 alunos avaliados.' }), notBox));
  requestAnimationFrame(() => {
    barChart(motBox, Object.entries(motAgg).filter((e) => e[1] > 0).map(([l, v_]) => ({ l, v: v_ })).sort((a, b) => b.v - a.v), 'n');
    barChart(notBox, x ? Object.entries(x.notas).filter(([, v_]) => v_[0] + v_[1] >= 30).map(([l, v_]) => ({ l, v: v_[1] / (v_[0] + v_[1]) })).sort((a, b) => a.v - b.v) : [], 'p', null, 0.8);
  });
};
function lineChart(box, pts, k, selX) {
  box.replaceChildren(); if (!pts.length || !window.d3) { box.append(h('p', { class: 'note', text: 'Sem dados para este indicador.' })); return; }
  const d3 = window.d3, W = Math.max(280, box.clientWidth), H = 250, kind = KIND[k];
  const tf = (v) => (kind === 'n' ? d3.format('~s')(v).replace('k', ' mil').replace('M', ' M') : fmt(k, v));
  const ext = d3.extent(pts, (p) => p.y);
  const y = d3.scaleLinear([kind === 'n' || kind === 'p' ? 0 : ext[0] * 0.9, ext[1] * (kind === 'p' ? 1.1 : 1.08)], [H - 26, 22]).nice(5);
  const svg = d3.create('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Evolução');
  box.append(svg.node());
  let mw = 0; for (const t of y.ticks(5)) mw = Math.max(mw, svg.append('text').text(tf(t)).node().getComputedTextLength()); svg.selectAll('text').remove();
  const ml = mw + 10, x = d3.scaleLinear(d3.extent(pts, (p) => p.x), [ml, W - 14]);
  svg.append('g').selectAll('line').data(y.ticks(5)).join('line').attr('x1', ml).attr('x2', W - 14).attr('y1', y).attr('y2', y).attr('stroke', 'var(--line)');
  svg.append('g').selectAll('text').data(y.ticks(5)).join('text').attr('x', ml - 6).attr('y', (t) => y(t) + 4).attr('text-anchor', 'end').text(tf);
  svg.append('g').selectAll('text').data(pts.filter((p, i) => pts.length <= 12 || i % 2 === (pts.length - 1) % 2)).join('text').attr('x', (p) => x(p.x)).attr('y', H - 6).attr('text-anchor', 'middle').text((p) => p.x);
  if (pts.some((p) => p.x === 2023) && pts.some((p) => p.x === 2022)) svg.append('line').attr('x1', x(2022.5)).attr('x2', x(2022.5)).attr('y1', 10).attr('y2', H - 26).attr('stroke', 'var(--muted)').attr('stroke-dasharray', '4 4');
  svg.append('path').datum(pts).attr('d', d3.line().x((p) => x(p.x)).y((p) => y(p.y))).attr('fill', 'none').attr('stroke', 'var(--brand)').attr('stroke-width', 2).attr('stroke-linejoin', 'round');
  svg.append('g').selectAll('circle').data(pts).join('circle').attr('cx', (p) => x(p.x)).attr('cy', (p) => y(p.y)).attr('r', (p) => (p.x === selX ? 5 : 3)).attr('fill', (p) => (p.x === selX ? 'var(--accent)' : 'var(--brand)'))
    .append('title').text((p) => `${p.x}: ${fmt(k, p.y)}`);
  // valor de cada ano por cima do ponto (com muitos anos, só os anos pares, o escolhido e o último)
  const lbl = pts.filter((p, i) => pts.length <= 12 || p.x === selX || i === pts.length - 1 || (i % 2 === 0 && i < pts.length - 2));
  svg.append('g').selectAll('text').data(lbl).join('text').attr('x', (p) => x(p.x)).attr('y', (p) => y(p.y) - 8).attr('text-anchor', 'middle').attr('font-size', pts.length > 12 ? 9.5 : 10.5)
    .attr('font-weight', (p) => (p.x === selX ? 700 : 500)).attr('fill', (p) => (p.x === selX ? 'var(--accent)' : 'var(--brand)')).attr('paint-order', 'stroke').attr('stroke', 'var(--panel)').attr('stroke-width', 3).text((p) => fmt(k, p.y));
}
function barChart(box, data, k, ref, warnBelow) {
  box.replaceChildren(); if (!data.length || !window.d3) { box.append(h('p', { class: 'note', text: 'Sem dados.' })); return; }
  const d3 = window.d3, W = Math.max(280, box.clientWidth), bh = 18, H = data.length * (bh + 6) + (ref != null ? 26 : 8);
  const f_ = (v) => (k === 'n' ? NF.format(v) : k === 'p' ? P1.format(v) : fmt(k, v));
  const svg = d3.create('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img');
  box.append(svg.node());
  let lw = 0, vw = 0; for (const z of data) { lw = Math.max(lw, svg.append('text').text(z.l).node().getComputedTextLength()); vw = Math.max(vw, svg.append('text').text(f_(z.v)).node().getComputedTextLength()); } svg.selectAll('text').remove();
  const ml = Math.min(lw + 10, W * 0.45), mr = vw + 10, x = d3.scaleLinear([0, d3.max(data, (z) => z.v) || 1], [ml, W - mr]);
  data.forEach((z, i) => {
    const yy = 4 + i * (bh + 6);
    svg.append('text').attr('x', ml - 6).attr('y', yy + bh / 2 + 4).attr('text-anchor', 'end').text(z.l);
    svg.append('rect').attr('x', ml).attr('y', yy).attr('width', Math.max(1, x(z.v) - ml)).attr('height', bh).attr('rx', 3)
      .attr('fill', (warnBelow && z.v < warnBelow) || ((k === 'alprof' || k === 'altur') && z.v > 70) ? 'var(--bad)' : 'var(--brand)');
    svg.append('text').attr('x', x(z.v) + 5).attr('y', yy + bh / 2 + 4).text(f_(z.v));
  });
  if (ref != null) { const px = x(ref); svg.append('line').attr('x1', px).attr('x2', px).attr('y1', 0).attr('y2', H - 20).attr('stroke', 'var(--accent)').attr('stroke-dasharray', '4 3'); svg.append('text').attr('x', Math.min(px, W - mr)).attr('y', H - 5).attr('text-anchor', 'middle').text('Província ' + f_(ref)); }
}

// =====================================================================
// EXCEL: exportar e importar fichas
// =====================================================================
const XK = { // cabeçalhos dos ficheiros
  base: ['Ano', 'CodDistrito', 'Distrito', 'CodEscola', 'Escola', 'CodEnsino', 'Ensino', 'CodTurno'],
};
function fichasToSheets(fichas, lev) {
  const sh = {};
  const push = (n, o) => (sh[n] ||= []).push(o);
  const B = (f, r) => ({ Ano: f.ano, CodDistrito: f.dist, Distrito: distName(f.dist), CodEscola: f.esc, Escola: S.esc.get(f.esc)?.nome || '', CodEnsino: r?.ens ?? '', Ensino: r ? ensAbbr(r.ens) : '', CodTurno: r?.tur ?? '' });
  const lab = (list, id) => (list.find((x) => +x[0] === +id) || [0, ''])[1];
  for (const f of fichas) {
    const sis = f.sis === 'antigo' ? 'antigo' : 'SNE';
    if (lev !== 'fim') {
      const M = f.marco || {};
      for (const r of M.alunos || []) {
        for (const [a, v] of Object.entries(r.id || {})) push('Alunos_Idade', { ...B(f, r), Classe: r.cl, Idade: a, 'Alunos H': v[0], 'Alunos M': v[1] });
        push('Repetentes_Turmas', { ...B(f, r), Classe: r.cl, 'Repetentes H': r.rep?.[0] || 0, 'Repetentes M': r.rep?.[1] || 0, 'Turmas puras': r.tp || 0, 'Turmas mistas': r.tm || 0, 'Internos H': r.int?.[0] || 0, 'Internos M': r.int?.[1] || 0 });
      }
      for (const r of M.prof || []) push('Professores', { ...B(f, r), Classe: r.cl || 0, CodQualificacao: r.q, 'Qualificação': lab(S.cod.qual[sis], r.q), 'Professores H': r.v[0], 'Professores M': r.v[1] });
      for (const [k, n] of Object.entries(M.salas || {})) push('Salas', { ...B(f), CodSala: +k, Sala: lab(S.cod.salas, k), 'Número': n });
      for (const [k, v] of Object.entries(M.pnd || {})) push('Pessoal_Nao_Docente', { ...B(f), CodCategoria: +k, Categoria: lab(S.cod.pnd[sis], k), H: v[0], M: v[1] });
      for (const r of M.orfaos || []) push('Orfaos', { ...B(f, r), Classe: r.cl, 'De pai H': r.pai[0], 'De pai M': r.pai[1], 'De mãe H': r.mae[0], 'De mãe M': r.mae[1], 'De ambos H': r.ambos[0], 'De ambos M': r.ambos[1] });
      for (const r of M.defic || []) for (const [cl, v] of Object.entries(r.v)) push('Deficiencia', { ...B(f, r), CodTipo: r.tipo, Tipo: lab(S.cod.defic, r.tipo), Classe: +cl, H: v[0], M: v[1] });
      for (const r of M.livros || []) for (const [cl, n] of Object.entries(r.v)) push('Livros', { ...B(f, r), CodDisciplina: r.disc, Disciplina: lab(S.cod.livros[sis], r.disc), Classe: +cl, 'Alunos com livro': n });
      for (const r of M.manuais || []) for (const [cl, n] of Object.entries(r.v)) push('Manuais', { ...B(f, r), CodDisciplina: r.disc, Disciplina: lab((S.cod.manuais || S.cod.livros)[sis], r.disc), Classe: +cl, 'Professores com manual': n });
      if (M.infra) push('Infraestruturas', { ...B(f), ...Object.fromEntries(Object.entries(M.infra)) });
      for (const id of FORM.flatIds) for (const r of M[id] || []) push(id, flatOut(FORM.flatSpec[id], sis, B(f, r.ens != null ? r : null), r));
    }
    if (lev !== 'marco') {
      const F = f.fim || {};
      for (const r of F.aprov || []) {
        push('Aproveitamento', { ...B(f, r), Classe: r.cl, 'Fim do ano H': r.fim[0], 'Fim do ano M': r.fim[1], 'A exame H': r.exame?.[0] || 0, 'A exame M': r.exame?.[1] || 0, 'Aprovados H': r.aprov[0], 'Aprovados M': r.aprov[1], 'Turmas puras': r.tp || 0, 'Turmas mistas': r.tm || 0 });
        for (const [d, v] of Object.entries(r.notas || {})) push('Notas', { ...B(f, r), Classe: r.cl, Disciplina: d, 'Notas 0-9': v[0], 'Notas 10-13': v[1], 'Notas 14-20': v[2] });
      }
      for (const r of F.desist || []) for (const [cl, v] of Object.entries(r.v)) push('Desistencias', { ...B(f, r), CodMotivo: r.mot, Motivo: lab(S.cod.motivos[sis], r.mot), Classe: +cl, H: v[0], M: v[1] });
      for (const r of F.transf || []) for (const [cl, v] of Object.entries(r.v)) push('Transferencias', { ...B(f, r), CodTipo: r.tipo, Tipo: lab(S.cod.transf, r.tipo), Classe: +cl, H: v[0], M: v[1] });
      for (const r of F.profex || []) push('Prof_Exercicio', { ...B(f, r), 'Com formação H': r.psico[0], 'Com formação M': r.psico[1], 'Sem formação H': r.sem[0], 'Sem formação M': r.sem[1] });
    }
  }
  return sh;
}
const SHEETS_M = ['Alunos_Idade', 'Repetentes_Turmas', 'Professores', 'Salas', 'Pessoal_Nao_Docente', 'Orfaos', 'Deficiencia', 'Livros', 'Manuais', 'Infraestruturas'];
// blocos planos: cada coluna de código sai como "<rótulo> (código)" e "<rótulo>"; as outras com o rótulo
const flatCols = (spec, sis) => spec.cols(sis).filter((c) => c.k !== 'ens' && c.k !== 'tur');
function flatHeads(spec, sis) { return [...XK.base, ...flatCols(spec, sis).flatMap((c) => (c.sel ? [c.label + ' (código)', c.label] : [c.label]))]; }
function flatOut(spec, sis, base, r) {
  const o = { ...base };
  for (const c of flatCols(spec, sis)) { if (c.sel) { o[c.label + ' (código)'] = r[c.k]; o[c.label] = (c.sel.find((x) => +x[0] === +r[c.k]) || [0, ''])[1]; } else o[c.label] = r[c.k] ?? (c.text ? '' : 0); }
  return o;
}
function flatIn(spec, sis, r) {
  const o = { ens: +r.CodEnsino || 0, tur: +r.CodTurno || 1 };
  if (!spec.cols(sis).some((c) => c.k === 'ens')) { delete o.ens; delete o.tur; }
  for (const c of flatCols(spec, sis)) o[c.k] = c.sel ? +r[c.label + ' (código)'] || 0 : c.text ? String(r[c.label] ?? '').trim() : Math.max(0, Math.round(+r[c.label] || 0));
  return o;
}
const SHEETS_F = ['Aproveitamento', 'Notas', 'Desistencias', 'Transferencias', 'Prof_Exercicio'];
const HEADS = {
  Alunos_Idade: [...XK.base, 'Classe', 'Idade', 'Alunos H', 'Alunos M'], Repetentes_Turmas: [...XK.base, 'Classe', 'Repetentes H', 'Repetentes M', 'Turmas puras', 'Turmas mistas', 'Internos H', 'Internos M'],
  Professores: [...XK.base, 'Classe', 'CodQualificacao', 'Qualificação', 'Professores H', 'Professores M'], Salas: [...XK.base, 'CodSala', 'Sala', 'Número'], Pessoal_Nao_Docente: [...XK.base, 'CodCategoria', 'Categoria', 'H', 'M'],
  Orfaos: [...XK.base, 'Classe', 'De pai H', 'De pai M', 'De mãe H', 'De mãe M', 'De ambos H', 'De ambos M'], Deficiencia: [...XK.base, 'CodTipo', 'Tipo', 'Classe', 'H', 'M'],
  Livros: [...XK.base, 'CodDisciplina', 'Disciplina', 'Classe', 'Alunos com livro'], Manuais: [...XK.base, 'CodDisciplina', 'Disciplina', 'Classe', 'Professores com manual'], Infraestruturas: [...XK.base, 'elect', 'aguaEsc', 'aguaFora', 'fontenaria', 'internet', 'comput', 'nComput', 'adaptada', 'wc', 'nWc', 'latrinas', 'nLatrinas', 'pae'],
  Aproveitamento: [...XK.base, 'Classe', 'Fim do ano H', 'Fim do ano M', 'A exame H', 'A exame M', 'Aprovados H', 'Aprovados M', 'Turmas puras', 'Turmas mistas'],
  Notas: [...XK.base, 'Classe', 'Disciplina', 'Notas 0-9', 'Notas 10-13', 'Notas 14-20'], Desistencias: [...XK.base, 'CodMotivo', 'Motivo', 'Classe', 'H', 'M'],
  Transferencias: [...XK.base, 'CodTipo', 'Tipo', 'Classe', 'H', 'M'], Prof_Exercicio: [...XK.base, 'Com formação H', 'Com formação M', 'Sem formação H', 'Sem formação M'],
};
function codSheet(sis) {
  const rows = [];
  const add = (t, l) => l.forEach((x) => rows.push({ Tabela: t, 'Código': x[0], 'Designação': x.length > 2 ? `${x[1]} – ${x[2]}` : x[1] }));
  add('Distritos', S.cod.distritos); add('Ensinos', S.cod.ensinos); add('Turnos', S.cod.turnos); add('Qualificações', S.cod.qual[sis]); add('Motivos de desistência', S.cod.motivos[sis]);
  add('Transferências', S.cod.transf); add('Deficiências', S.cod.defic); add('Disciplinas (livros)', S.cod.livros[sis]); add('Pessoal não docente', S.cod.pnd[sis]); add('Salas', S.cod.salas);
  S.cod.disciplinas[sis].forEach((d) => rows.push({ Tabela: 'Disciplinas (notas)', 'Código': '', 'Designação': d }));
  S.cod.idades[sis].EP.forEach((d) => rows.push({ Tabela: 'Idades EP', 'Código': d, 'Designação': d }));
  S.cod.idades[sis].ESG.forEach((d) => rows.push({ Tabela: 'Idades ESG', 'Código': d, 'Designação': d }));
  return rows;
}
async function buildWorkbook(ano, dists, lev, vazio) {
  const XLSX = window.XLSX; const wb = XLSX.utils.book_new();
  let fichas = [];
  for (const d of dists) {
    const fm = await fichasEfectivas(ano, d, true);
    if (vazio) {
      // ficheiro para lançar: estrutura do ano anterior com zeros, para as escolas activas
      const prev = await fichasEfectivas(ano - 1, d, true);
      for (const e of escolasDoDistrito(d)) {
        if (e.fecho && e.fecho <= ano) continue;
        const cur = fm.get(e.cod); if (cur) { fichas.push(cur); continue; }
        const p = prev.get(e.cod); if (!p) continue;
        const z = { ano, esc: e.cod, dist: d, sis: sisDe(ano), marco: {}, fim: {} };
        if (p.marco?.alunos) z.marco.alunos = p.marco.alunos.filter((r) => !(z.sis === 'SNE' && r.ens === 1002)).map((r) => ({ ens: r.ens, tur: r.tur, cl: r.cl, id: Object.fromEntries((S.cod.idades[z.sis][r.ens === 1001 ? 'EP' : 'ESG']).map((a) => [a, [0, 0]])), rep: [0, 0], tp: 0, tm: 0, int: [0, 0] }));
        if (p.fim?.aprov) z.fim.aprov = p.fim.aprov.map((r) => ({ ens: r.ens, tur: r.tur, cl: r.cl, fim: [0, 0], exame: [0, 0], aprov: [0, 0], tp: 0, tm: 0, notas: {} }));
        fichas.push(z);
      }
    } else fichas.push(...fm.values());
  }
  const sh = fichasToSheets(fichas, lev);
  const sis = sisDe(ano);
  const leia = [
    ['EducStat Tete — ficheiro de introdução'], [`Ano ${ano} · ${dists.length === S.cod.distritos.length ? 'Província' : dists.map(distName).join(', ')} · ${lev === 'marco' ? '3 de Março' : lev === 'fim' ? 'Fim do ano' : 'os dois levantamentos'}`], [''],
    ['Como usar: preencha ou corrija os números nas folhas e importe este ficheiro no menu Excel do sistema. Uma linha por escola, ensino, turno e classe (ou por idade, motivo, disciplina…).'],
    ['Não mude os nomes das folhas nem dos cabeçalhos. As colunas de nome (Distrito, Escola, Ensino, Qualificação…) são só para ler: o sistema usa os códigos.'],
    ['Ao importar, os blocos presentes no ficheiro substituem os dessa escola e desse ano. Os blocos ausentes ficam como estavam.'],
    ['Os códigos válidos estão na folha Codigos. H = homens, M = mulheres.'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(leia), 'Leia-me');
  for (const n of [...(lev !== 'fim' ? [...SHEETS_M, ...FORM.flatIds] : []), ...(lev !== 'marco' ? SHEETS_F : [])]) {
    const hd = HEADS[n] || flatHeads(FORM.flatSpec[n], sis);
    const ws = XLSX.utils.json_to_sheet(sh[n] || [], { header: hd });
    ws['!cols'] = hd.map((c) => ({ wch: c === 'Escola' ? 38 : Math.max(8, Math.min(30, c.length + 2)) }));
    XLSX.utils.book_append_sheet(wb, ws, n);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(codSheet(sis)), 'Codigos');
  wb.Props = { Title: `EducStat Tete — introdução ${ano}`, Subject: 'Ficheiro de introdução do levantamento escolar', Author: 'Alberto Adélia Manhice', LastAuthor: 'Alberto Adélia Manhice', Category: 'Estatística da Educação', Keywords: 'EducStat; Introdução; Tete', Comments: 'Gerado pelo sistema EducStat Tete', Company: 'DPE Tete' };
  return { wb, n: fichas.length };
}
function sheetsToFichas(wb) {
  const XLSX = window.XLSX; const by = new Map(); const errs = [];
  const get = (r) => {
    const ano = +r.Ano, esc = +r.CodEscola; if (!ano || !esc) return null;
    const k = ano + '_' + esc; if (!by.has(k)) by.set(k, { ano, esc, dist: +r.CodDistrito || S.esc.get(esc)?.dist, blocks: {} }); return by.get(k);
  };
  const num = (v) => Math.max(0, Math.round(+v || 0));
  const rowsOf = (n) => (wb.Sheets[n] ? XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: 0 }) : null);
  const blk = (f, sec, b) => ((f.blocks[sec] ||= {})[b] ||= []);
  const alunos = new Map();
  const A = rowsOf('Alunos_Idade');
  const RT = rowsOf('Repetentes_Turmas');
  if (A || RT) {
    for (const r of [...(A || []), ...(RT || [])]) {
      const f = get(r); if (!f) continue; blk(f, 'marco', 'alunos');
      const k = [f.ano, f.esc, +r.CodEnsino, +r.CodTurno || 1, +r.Classe].join('|');
      let a = alunos.get(k); if (!a) { a = { ens: +r.CodEnsino, tur: +r.CodTurno || 1, cl: +r.Classe, id: {}, rep: [0, 0], tp: 0, tm: 0, int: [0, 0] }; alunos.set(k, a); f.blocks.marco.alunos.push(a); }
      if ('Idade' in r && r.Idade !== 0 && r.Idade !== '') { const h_ = num(r['Alunos H']), m_ = num(r['Alunos M']); if (h_ || m_) a.id[String(r.Idade)] = [h_, m_]; }
      if ('Repetentes H' in r) { a.rep = [num(r['Repetentes H']), num(r['Repetentes M'])]; a.tp = num(r['Turmas puras']); a.tm = num(r['Turmas mistas']); a.int = [num(r['Internos H']), num(r['Internos M'])]; }
    }
  }
  const simple = (name, sec, b, fn) => { const rs = rowsOf(name); if (!rs) return; for (const r of rs) { const f = get(r); if (!f) continue; const arr = blk(f, sec, b); fn(r, arr, f); } };
  simple('Professores', 'marco', 'prof', (r, arr) => { const v = [num(r['Professores H']), num(r['Professores M'])]; if (v[0] || v[1]) arr.push({ ens: +r.CodEnsino, tur: +r.CodTurno || 1, cl: +r.Classe || 0, q: +r.CodQualificacao, v }); });
  const objBlk = (name, b, fn) => { const rs = rowsOf(name); if (!rs) return; for (const r of rs) { const f = get(r); if (!f) continue; (f.blocks.marco ||= {}); f.blocks.marco[b] ||= {}; fn(r, f.blocks.marco[b]); } };
  objBlk('Salas', 'salas', (r, o) => { const n = num(r['Número']); if (n) o[String(+r.CodSala)] = n; });
  objBlk('Pessoal_Nao_Docente', 'pnd', (r, o) => { const v = [num(r.H), num(r.M)]; if (v[0] || v[1]) o[String(+r.CodCategoria)] = v; });
  objBlk('Infraestruturas', 'infra', (r, o) => { for (const k of HEADS.Infraestruturas.slice(XK.base.length)) o[k] = num(r[k]); });
  simple('Orfaos', 'marco', 'orfaos', (r, arr) => arr.push({ ens: +r.CodEnsino, tur: +r.CodTurno || 1, cl: +r.Classe || 0, pai: [num(r['De pai H']), num(r['De pai M'])], mae: [num(r['De mãe H']), num(r['De mãe M'])], ambos: [num(r['De ambos H']), num(r['De ambos M'])] }));
  const byClBlk = (name, sec, b, keyName, codeCol) => simple(name, sec, b, (r, arr) => {
    const kv = +r[codeCol]; let o = arr.find((x) => x.ens === +r.CodEnsino && x.tur === (+r.CodTurno || 1) && x[keyName] === kv);
    if (!o) { o = { ens: +r.CodEnsino, tur: +r.CodTurno || 1, [keyName]: kv, v: {} }; arr.push(o); }
    const v = [num(r.H), num(r.M)]; if (v[0] || v[1]) o.v[String(+r.Classe)] = v;
  });
  byClBlk('Deficiencia', 'marco', 'defic', 'tipo', 'CodTipo');
  simple('Livros', 'marco', 'livros', (r, arr) => { let o = arr.find((x) => x.ens === +r.CodEnsino && x.tur === (+r.CodTurno || 1) && x.disc === +r.CodDisciplina); if (!o) { o = { ens: +r.CodEnsino, tur: +r.CodTurno || 1, disc: +r.CodDisciplina, v: {} }; arr.push(o); } const n = num(r['Alunos com livro']); if (n) o.v[String(+r.Classe)] = n; });
  simple('Manuais', 'marco', 'manuais', (r, arr) => { let o = arr.find((x) => x.ens === +r.CodEnsino && x.tur === (+r.CodTurno || 1) && x.disc === +r.CodDisciplina); if (!o) { o = { ens: +r.CodEnsino, tur: +r.CodTurno || 1, disc: +r.CodDisciplina, v: {} }; arr.push(o); } const n = num(r['Professores com manual']); if (n) o.v[String(+r.Classe)] = n; });
  const apr = new Map();
  simple('Aproveitamento', 'fim', 'aprov', (r, arr, f) => { const o = { ens: +r.CodEnsino, tur: +r.CodTurno || 1, cl: +r.Classe, fim: [num(r['Fim do ano H']), num(r['Fim do ano M'])], exame: [num(r['A exame H']), num(r['A exame M'])], aprov: [num(r['Aprovados H']), num(r['Aprovados M'])], tp: num(r['Turmas puras']), tm: num(r['Turmas mistas']), notas: {} }; arr.push(o); apr.set([f.ano, f.esc, o.ens, o.tur, o.cl].join('|'), o); });
  const NT = rowsOf('Notas');
  if (NT) for (const r of NT) {
    const f = get(r); if (!f) continue; const k = [f.ano, f.esc, +r.CodEnsino, +r.CodTurno || 1, +r.Classe].join('|');
    let o = apr.get(k); if (!o) { errs.push(`Notas sem linha de Aproveitamento: escola ${f.esc}, ${r.Classe}ª classe.`); continue; }
    const v = [num(r['Notas 0-9']), num(r['Notas 10-13']), num(r['Notas 14-20'])]; if (v.some(Boolean)) o.notas[String(r.Disciplina)] = v;
    f.notasOnly = !rowsOf('Aproveitamento');
  }
  byClBlk('Desistencias', 'fim', 'desist', 'mot', 'CodMotivo');
  byClBlk('Transferencias', 'fim', 'transf', 'tipo', 'CodTipo');
  simple('Prof_Exercicio', 'fim', 'profex', (r, arr) => arr.push({ ens: +r.CodEnsino, tur: +r.CodTurno || 1, psico: [num(r['Com formação H']), num(r['Com formação M'])], sem: [num(r['Sem formação H']), num(r['Sem formação M'])] }));
  for (const id of FORM.flatIds) {
    const rs = rowsOf(id); if (!rs) continue;
    for (const r of rs) { const f = get(r); if (!f) continue; blk(f, 'marco', id).push(flatIn(FORM.flatSpec[id], sisDe(f.ano), r)); }
  }
  for (const f of by.values()) { if (!S.esc.has(f.esc)) errs.push(`Código de escola desconhecido: ${f.esc}.`); if (!f.dist) errs.push(`Escola ${f.esc} sem distrito.`); }
  return { list: [...by.values()].filter((f) => S.esc.has(f.esc) && f.dist), errs };
}
VIEWS.excel = (v) => {
  const st = S.xl ||= { ano: Math.min(ANO_MAX_DADOS + 1, ANOS[ANOS.length - 1]), dist: S.sel.dist || S.cod.distritos[0][0], lev: 'marco' };
  v.append(h('div', {}, h('h1', { text: 'Excel' }), h('p', { class: 'lede', text: 'Exporte um ficheiro de introdução para trabalhar sem internet, preencha-o no Excel e importe-o de volta. O que importar fica gravado nos mapas e entra no painel, como se tivesse sido introduzido aqui.' })));
  const wn = writeNote() || (DESKTOP && (S.sessao?.perfil || 0) < 2 ? 'O seu perfil é só de consulta.' : null);
  const sel = (k, list, lab) => h('label', { class: 'f' }, lab, h('select', { onchange: (e) => (st[k] = e.target.value) }, list.map((o) => h('option', { value: o[0], text: o[1], selected: String(o[0]) === String(st[k]) }))));
  const prog = h('div', { class: 'prog', hidden: true }, h('i')); const msg = h('div', { class: 'note' });
  const doExport = async (vazio) => {
    if (!S.downloads) { toast('A transferência de ficheiros não está disponível nesta vista.'); return; }
    msg.textContent = 'A preparar o ficheiro…';
    try {
      const dists = st.dist === 'Todos' ? S.cod.distritos.map((d) => d[0]) : [+st.dist];
      const { wb, n } = await buildWorkbook(+st.ano, dists, st.lev, vazio);
      const buf = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const nome = `EducStat_${st.ano}_${st.dist === 'Todos' ? 'Provincia' : distName(st.dist).replace(/\s+/g, '_')}_${st.lev === 'marco' ? '3Marco' : st.lev === 'fim' ? 'FimAno' : 'Completo'}${vazio ? '_lancamento' : ''}.xlsx`;
      await S.downloads.save({ filename: nome, data: new Blob([buf]) });
      msg.textContent = `Ficheiro com ${NF.format(n)} mapas de escola.`;
    } catch (e) { msg.textContent = e?.code === 'declined' ? 'Transferência cancelada.' : 'Não foi possível criar o ficheiro.'; }
  };
  v.append(h('div', { class: 'card' }, h('h2', { text: 'Exportar' }),
    h('div', { class: 'row' }, sel('ano', desc(ANOS).map((a) => [a, a]), 'Ano'), sel('dist', [['Todos', 'Província (todos)'], ...S.cod.distritos], 'Distrito'), sel('lev', [['marco', '3 de Março'], ['fim', 'Fim do ano'], ['ambos', 'Os dois']], 'Levantamento')),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', text: 'Ficheiro de introdução', disabled: !S.downloads, onclick: () => doExport(true), title: 'Mapas já introduzidos mais as escolas activas com a estrutura do ano anterior a zeros' }),
      h('button', { class: 'btn', text: 'Dados introduzidos', disabled: !S.downloads, onclick: () => doExport(false) })),
    h('p', { class: 'note', text: '"Ficheiro de introdução" inclui todas as escolas activas: as que já têm mapa neste ano com os seus números, e as restantes com as linhas do ano anterior a zeros, prontas a preencher. "Dados introduzidos" exporta só os mapas existentes.' }), msg));
  const file = h('input', { type: 'file', accept: '.xlsx,.xls,.xlsm,.csv', disabled: !!wn });
  const out = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
  file.onchange = async () => {
    const fl = file.files[0]; if (!fl) return;
    out.replaceChildren(h('p', { class: 'note', text: 'A ler o ficheiro…' }));
    try {
      const wb = window.XLSX.read(await fl.arrayBuffer(), { type: 'array' });
      const { list, errs } = sheetsToFichas(wb);
      if (!list.length) { out.replaceChildren(h('p', { class: 'pill bad', text: 'O ficheiro não tem mapas reconhecíveis. Use um ficheiro exportado por este sistema.' })); return; }
      const anos = [...new Set(list.map((f) => f.ano))], dists = [...new Set(list.map((f) => f.ano + '_' + f.dist))];
      const blocks = [...new Set(list.flatMap((f) => Object.entries(f.blocks).flatMap(([s, b]) => Object.keys(b).map((k) => `${s === 'marco' ? 'Março' : 'Fim'}: ${k}`))))];
      out.replaceChildren(h('p', { text: `${NF.format(list.length)} mapas de escola · ano(s) ${anos.join(', ')} · ${dists.length} distrito(s)/ano · blocos: ${blocks.join(', ')}.` }),
        errs.length ? h('ul', { class: 'issues' }, errs.slice(0, 12).map((e) => h('li', { text: e }))) : null,
        h('button', { class: 'btn primary', text: 'Importar e gravar', onclick: () => doImport(list, out) }));
    } catch { out.replaceChildren(h('p', { class: 'pill bad', text: 'Não foi possível ler o ficheiro. Confirme que é um .xlsx.' })); }
  };
  v.append(h('div', { class: 'card' }, h('h2', { text: 'Importar' }), wn ? h('p', { class: 'pill warn', text: wn }) : null,
    h('label', { class: 'f' }, 'Ficheiro Excel exportado por este sistema', file), out, prog));
  S.prog = prog;
};
async function doImport(list, out) {
  if (!(await confirmBox(`Gravar ${list.length} mapas? Os blocos presentes no ficheiro substituem os que já existem para essas escolas e anos.`, 'Gravar'))) return;
  const prog = S.prog; prog.hidden = false; const bar = prog.firstChild; let i = 0, fail = 0;
  const touched = new Set(); const cache = new Map(); S.importing = true;
  let blq = 0;
  for (const f of list) {
    const temM = Object.keys(f.blocks.marco || {}).length, temF = Object.keys(f.blocks.fim || {}).length;
    if ((temM && roMotivo(f.ano, 'marco', f.dist)) || (temF && roMotivo(f.ano, 'fim', f.dist))) { blq++; i++; continue; }
    try {
      const ck = f.ano + '_' + f.dist;
      if (!cache.has(ck)) cache.set(ck, await fichasEfectivas(f.ano, f.dist, true));
      const fm = cache.get(ck);
      const base = clone(fm.get(f.esc)) || { ano: f.ano, esc: f.esc, dist: f.dist, sis: sisDe(f.ano), marco: {}, fim: {} };
      for (const [sec, bl] of Object.entries(f.blocks)) for (const [k, v] of Object.entries(bl)) {
        base[sec] ||= {};
        if (sec === 'fim' && k === 'aprov' && f.notasOnly) { for (const r of v) { const o = (base.fim.aprov || []).find((x) => x.ens === r.ens && x.tur === r.tur && x.cl === r.cl); if (o) o.notas = r.notas; } continue; }
        if ((Array.isArray(v) && v.length) || (!Array.isArray(v) && Object.keys(v).length)) base[sec][k] = v; else delete base[sec][k];
      }
      base.dist = f.dist; base.em = new Date().toISOString(); base.por = S.me?.id || null;
      await S.db.doc(`fichas/${f.ano}_${f.esc}`).set(base);
      const k = f.ano + '_' + f.dist; const m = S.dbFichas.get(k) || new Map(); m.set(f.esc, base); S.dbFichas.set(k, m);
      touched.add(k);
    } catch { fail++; await new Promise((r) => setTimeout(r, 400)); }
    i++; bar.style.width = `${(100 * i) / (list.length + touched.size)}%`;
  }
  let j = 0;
  for (const k of touched) { const [a, d] = k.split('_'); try { await recalcResumo(+a, +d); } catch { fail++; } j++; bar.style.width = `${(100 * (i + j)) / (list.length + touched.size)}%`; }
  S.importing = false;
  await registar('ficheiro Excel importado', { n: list.length - blq - fail });
  out.replaceChildren(h('p', { class: fail ? 'pill warn' : 'pill ok', text: (fail ? `Importação terminada com ${fail} falha(s). Importe de novo o mesmo ficheiro para completar.` : `${NF.format(list.length - blq)} mapas gravados. O painel já está actualizado.`) + (blq ? ` ${blq} mapas não foram gravados (outro distrito ou levantamento fechado).` : '') }));
}
async function exportIndicadores() {
  const f = S.pf; const XLSX = window.XLSX; const rows = [];
  const anos = ANOS.filter((a) => S.cod.distritos.some((d) => resumoDe(a, d[0])));
  for (const a of anos) for (const d of [['Todos', 'Província'], ...S.cod.distritos]) {
    const ind = indicators(sumUp(a, { ...f, dist: d[0] }), f.sexo); if (!Object.keys(ind).length) continue;
    const o = { Ano: a, Distrito: d[1], Tipo: f.tipo, 'Nível': f.nivel, Sexo: f.sexo };
    for (const it of IND) if (it[1]) o[it[1]] = ind[it[0]] == null ? null : KIND[it[0]] === 'n' ? Math.round(ind[it[0]]) : +ind[it[0]].toFixed(4);
    rows.push(o);
  }
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Indicadores');
  wb.Props = { Title: 'Indicadores da educação — Tete', Author: 'Alberto Adélia Manhice', LastAuthor: 'Alberto Adélia Manhice', Subject: 'Indicadores calculados pelo sistema EducStat Tete', Category: 'Estatística da Educação' };
  try { await S.downloads.save({ filename: `Indicadores_Tete_${f.nivel}_${f.tipo}_${f.sexo}.xlsx`, data: new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]) }); } catch (e) { if (e?.code !== 'declined') toast('Não foi possível criar o ficheiro.'); }
}

// =====================================================================
// ALFABETIZAÇÃO E EPJA (fichas por centro)
// =====================================================================
const AFORM = () => {
  const N = (k, label) => ({ k, label });
  const P = { k: 'prog', label: 'Programa', sel: S.cod.programas }, NV = { k: 'niv', label: 'Nível', sel: S.cod.niveisEPJA };
  return {
    marco: [
      { id: 'prog', label: 'Alfabetização: inscritos por programa', cols: [P, N('insH', 'Inscritos H'), N('insM', 'Inscritos M'), N('repH', 'Repetentes H'), N('repM', 'Repetentes M')] },
      { id: 'epja', label: 'EPJA: inscritos por nível', cols: [NV, N('insH', 'Inscritos H'), N('insM', 'Inscritos M'), N('repH', 'Repetentes H'), N('repM', 'Repetentes M')] },
      { id: 'geral', label: 'Turmas e Habilidades para a Vida (HPV)', note: 'HPV = Habilidades para a Vida (conhecimentos, atitudes e competências para os desafios do dia-a-dia). Não é vacinação. Os alfabetizandos abrangidos não podem ser mais do que os inscritos do Quadro 1.', cols: [N('turAlfa', 'Turmas de alfabetização'), N('turEPJA', 'Turmas de EPJA'), N('hpvH', 'Abrangidos por HPV H'), N('hpvM', 'Abrangidos por HPV M')], one: true },
      { id: 'educ', label: 'Alfabetizadores e educadores', cols: [N('capH', 'Alfabetizadores capacitados H'), N('capM', 'Capacitados M'), N('semH', 'Sem capacitação H'), N('semM', 'Sem capacitação M'), N('epH', 'Educadores profissionais H'), N('epM', 'Educ. profissionais M'), N('eprH', 'Educadores professores H'), N('eprM', 'Educ. professores M')], one: true },
      { id: 'lingua', label: 'Língua de aprendizagem', cols: [{ k: 'lingua', label: 'Língua', sel: [[0, '—'], ...S.cod.linguas] }, N('porH', 'Em português H'), N('porM', 'Em português M'), N('matH', 'Em língua materna H'), N('matM', 'Em língua materna M')] },
      { id: 'existe', label: 'Alunos existentes', cols: [N('alfaH', 'Alfabetização H'), N('alfaM', 'Alfabetização M'), N('epjaH', 'EPJA H'), N('epjaM', 'EPJA M')], one: true },
      { id: 'disc', label: 'Alunos por disciplina e nível', cols: [{ k: 'disc', label: 'Disciplina', sel: S.cod.discAlfa }, N('n1', 'Nível 1 / Alfab.'), N('n2', 'Nível 2'), N('n3', 'Nível 3'), N('n4', 'Nível 4')] },
    ],
    fim: [
      { id: 'prog', label: 'Alfabetização: resultados por programa', cols: [P, N('fimH', 'No fim H'), N('fimM', 'No fim M'), N('exH', 'A exame H'), N('exM', 'A exame M'), N('apH', 'Aprovados H'), N('apM', 'Aprovados M')], check: (r) => (+r.apH > +r.fimH || +r.apM > +r.fimM ? 'Aprovados maior que alunos no fim' : null) },
      { id: 'epja', label: 'EPJA: resultados por nível', cols: [NV, N('fimH', 'No fim H'), N('fimM', 'No fim M'), N('exH', 'A exame H'), N('exM', 'A exame M'), N('apH', 'Aprovados H'), N('apM', 'Aprovados M')], check: (r) => (+r.apH > +r.fimH || +r.apM > +r.fimM ? 'Aprovados maior que alunos no fim' : null) },
      { id: 'geral', label: 'Turmas no fim do ano', cols: [N('turAlfa', 'Turmas de alfabetização'), N('turEPJA', 'Turmas de EPJA')], one: true },
      { id: 'existe', label: 'Alunos existentes no fim do ano', cols: [N('alfaH', 'Alfabetização H'), N('alfaM', 'Alfabetização M'), N('epjaH', 'EPJA H'), N('epjaM', 'EPJA M')], one: true },
      { id: 'disc', label: 'Alunos por disciplina e nível', cols: [{ k: 'disc', label: 'Disciplina', sel: S.cod.discAlfa }, N('n1', 'Nível 1 / Alfab.'), N('n2', 'Nível 2'), N('n3', 'Nível 3'), N('n4', 'Nível 4')] },
    ],
  };
};
const ANOS_A = ANOS.filter((a) => a >= 2023);
async function alfaStatic(ano) {
  S.alfaStatic ||= new Map();
  if (!S.alfaStatic.has(ano)) { let l = []; if (ano <= ANO_MAX_DADOS) { try { l = await loadJSON(`data/alfa/${ano}.json`); } catch { l = []; } } S.alfaStatic.set(ano, new Map(l.map((f) => [f.cen, f]))); }
  return S.alfaStatic.get(ano);
}
async function alfaFichas(ano, fresh = true) {
  const m = new Map(await alfaStatic(ano));
  if (S.db && fresh) { const q = await S.db.collection('alfa').where('ano', '==', ano).get(); for (const d of q.docs) { const f = d.data(); if (f.apagada) m.delete(f.cen); else m.set(f.cen, f); } }
  return m;
}
function rebuildCentros() {
  S.cen = new Map((S.cenStatic || []).map((c) => [c.cod, c]));
  for (const [k, c] of S.cenDb || new Map()) S.cen.set(k, { ...(S.cen.get(k) || {}), ...c, cod: k });
}
VIEWS.alfa = async (v) => {
  const st = S.as ||= { tab: 'painel', ano: Math.max(...ANOS_A), dist: +(S.sessao?.dist || 0) || S.cod.distritos[0][0], esc: 0, cen: 0, lev: 'marco' };
  if (!S.cenStatic) {
    v.append(h('div', { class: 'loading', text: 'A carregar os centros…' }));
    try { S.cenStatic = await loadJSON('data/centros.json'); } catch { S.cenStatic = []; }
    rebuildCentros();
    if (S.db && !S.cenSub) S.cenSub = S.db.collection('centros').onSnapshot((snap) => { S.cenDb = new Map(snap.docs.map((d) => [+d.id, d.data()])); rebuildCentros(); }, () => {});
    if (current !== 'alfa') return; v.replaceChildren();
  }
  v.append(h('div', {}, h('h1', { text: 'Alfabetização e Educação de Adultos' }), h('p', { class: 'lede', text: 'Mapas por centro de alfabetização e EPJA (dados do AdultStat desde 2023). Gravar um mapa actualiza logo o painel desta secção.' })));
  const tabs = h('div', { class: 'tabs' }, [['painel', 'Painel'], ['lancar', 'Introdução de Dados'], ['centros', 'Centros'], ['excel', 'Excel']].map(([k, l]) => h('button', { 'aria-selected': String(st.tab === k), text: l, onclick: async () => { if (S.adirty && !(await confirmBox('Há alterações por gravar neste mapa. Sair sem gravar?', 'Sair sem gravar'))) return; S.adirty = false; st.tab = k; go('alfa'); } })));
  const body = h('div', { style: 'display:flex;flex-direction:column;gap:16px' });
  v.append(tabs, body);
  ({ lancar: alfaLancar, painel: alfaPainel, centros: alfaCentros, excel: alfaExcel })[st.tab](body, st);
};
const centrosDe = (d) => [...S.cen.values()].filter((c) => +c.dist === +d).sort((a, b) => +b.cod - +a.cod);
async function alfaLancar(body, st) {
  const fm = await alfaFichas(+st.ano, !!S.db);
  const meuDA = +(S.sessao?.dist || (S.inst?.papel === 'distrito' ? S.inst.dist : 0)); if (meuDA && +st.dist !== meuDA) { st.dist = meuDA; st.esc = 0; st.cen = 0; S.adraft = null; }
  const roM = roMotivo(+st.ano, 'alfa_' + st.lev, st.dist); const ro = !!roM;
  const ano = h('select', { onchange: async (e) => { if (S.adirty && !(await confirmBox('Mudar de mapa sem gravar?', 'Mudar'))) { e.target.value = st.ano; return; } S.adirty = false; S.adraft = null; st.ano = +e.target.value; go('alfa'); } }, desc(ANOS_A).map((a) => h('option', { value: a, text: a, selected: a === +st.ano })));
  const dist = h('select', { disabled: !!meuDA, title: meuDA ? 'A Introdução de Dados mostra só o seu distrito.' : null, onchange: async (e) => { if (S.adirty && !(await confirmBox('Mudar de mapa sem gravar?', 'Mudar'))) { e.target.value = st.dist; return; } S.adirty = false; S.adraft = null; st.dist = +e.target.value; st.cen = 0; st.esc = 0; go('alfa'); } }, S.cod.distritos.filter((d) => !meuDA || d[0] === meuDA).map((d) => h('option', { value: d[0], text: d[1], selected: d[0] === +st.dist })));
  // os centros funcionam nas escolas: escolhe-se a escola e depois o centro (uma escola pode ter 2 ou 3 centros)
  const todosC = centrosDe(st.dist); const escsC = [...new Set(todosC.map((c) => +c.esc).filter(Boolean))].map((c) => S.esc.get(c) || { cod: c, nome: String(c) }).sort((a, b) => +b.cod - +a.cod);
  const semEsc = todosC.filter((c) => !+c.esc).length;
  const escA = h('select', { onchange: async (e) => { if (S.adirty && !(await confirmBox('Mudar de mapa sem gravar?', 'Mudar'))) { e.target.value = st.esc; return; } S.adirty = false; S.adraft = null; st.esc = +e.target.value; st.cen = 0; const cs = todosC.filter((c) => +c.esc === st.esc); if (cs.length === 1) st.cen = cs[0].cod; go('alfa'); } },
    h('option', { value: 0, text: `— todas as escolas com centros (${escsC.length}) —` }), escsC.map((e) => { const n = todosC.filter((c) => +c.esc === +e.cod).length; return h('option', { value: e.cod, text: `${codFmt(e.cod)} · ${e.nome}${n > 1 ? ` (${n} centros)` : ''}`, selected: +e.cod === +st.esc }); }), semEsc ? h('option', { value: -1, text: `Centros sem escola indicada (${semEsc})`, selected: +st.esc === -1 }) : null);
  const lst = +st.esc ? todosC.filter((c) => (+st.esc === -1 ? !+c.esc : +c.esc === +st.esc)) : todosC;
  const cen = h('select', { onchange: async (e) => { if (S.adirty && !(await confirmBox('Mudar de mapa sem gravar?', 'Mudar'))) { e.target.value = st.cen; return; } S.adirty = false; S.adraft = null; st.cen = +e.target.value; go('alfa'); } },
    h('option', { value: 0, text: `— escolha um centro (${lst.length}) —` }), lst.map((c) => { const f = fm.get(c.cod); const mk = (f && Object.keys(f.marco || {}).length ? '●' : '○') + (f && Object.keys(f.fim || {}).length ? '●' : '○'); return h('option', { value: c.cod, text: `${mk}  ${c.nome} (${c.cod})`, selected: c.cod === +st.cen }); }));
  const seg = h('div', { class: 'seg' }, h('button', { 'aria-pressed': String(st.lev === 'marco'), text: 'Levantamento (30 de Abril)', title: 'Nos anos anteriores chamava-se levantamento de Março', onclick: () => { st.lev = 'marco'; go('alfa'); } }), h('button', { 'aria-pressed': String(st.lev === 'fim'), text: 'Aproveitamento (Dezembro)', onclick: () => { st.lev = 'fim'; go('alfa'); } }));
  const card = h('div', { class: 'card' }, h('div', { class: 'row' }, h('label', { class: 'f' }, 'Ano', ano), h('label', { class: 'f' }, 'Distrito', dist), h('label', { class: 'f', style: 'flex:1;min-width:16rem' }, 'Escola', escA), h('label', { class: 'f', style: 'flex:1;min-width:16rem' }, 'Centro', cen), seg));
  body.append(card);
  if (roM === MODO_LEITURA) body.append(h('div', { class: 'row' }, h('span', { class: 'pill', text: 'Modo de leitura' }), h('button', { class: 'btn sm primary', text: 'Editar este mapa', onclick: () => { (S.editarMapa ||= {})[`${st.ano}_alfa_${st.lev}_${st.dist}`] = true; registar('mapa de centro aberto para edição', { ano: st.ano, cen: st.cen }); go('alfa'); } })));
  else if (roM) body.append(h('div', { class: 'row' }, h('p', { class: 'pill warn', text: roM }), /fecharam|trancad|fechado|terminou|encerrad/i.test(roM) && (S.sessao?.perfil || 0) >= 2 && !ehDPE() && +st.cen ? h('button', { class: 'btn sm', text: 'Pedir abertura à DPE', onclick: () => pedirAbertura({ ano: +st.ano, dist: +st.dist, esc: S.cen.get(+st.cen)?.esc || st.cen }) }) : null));
  if (!+st.cen) { body.append(h('div', { class: 'empty', text: 'Escolha um centro. ● = levantamento introduzido (Março, fim do ano).' })); return; }
  if (!S.adraft || S.adraft.cen !== +st.cen || S.adraft.ano !== +st.ano) {
    const f = fm.get(+st.cen); const c = S.cen.get(+st.cen);
    S.adraft = f ? clone(f) : { ano: +st.ano, cen: +st.cen, dist: +st.dist, esc: c?.esc || null, marco: {}, fim: {} }; S.adirty = false;
  }
  const d = S.adraft; d.marco ||= {}; d.fim ||= {};
  const status = h('div', { class: 'status' });
  const save = h('button', { class: 'btn primary', text: 'Gravar mapa', disabled: ro || !S.adirty });
  const drawStatus = () => {
    status.replaceChildren(h('strong', { text: S.cen.get(d.cen)?.nome || d.cen }), h('span', { class: 'pill', text: `${distName(d.dist)} · centro ${d.cen}` }));
    if (d.em) status.append(h('span', { class: 'pill ok', text: `Gravada em ${new Date(d.em).toLocaleString('pt-PT')}` })); else if (Object.keys(d.marco).length || Object.keys(d.fim).length) status.append(h('span', { class: 'pill', text: 'Dados vindos da base AdultStat' }));
    if (S.adirty) status.append(h('span', { class: 'pill warn', text: 'Alterações por gravar' }));
    save.disabled = ro || !S.adirty;
  };
  let tAuto = 0; const changed = () => { S.adirty = true; drawStatus(); clearTimeout(tAuto); tAuto = setTimeout(() => { if (S.adirty && S.adraft === d && current === 'alfa') save.onclick(); }, 2500); };
  save.onclick = async () => {
    save.disabled = true; save.textContent = 'A gravar…';
    try {
      const out = clone(d); out.em = new Date().toISOString(); out.por = S.me?.id || null;
      for (const sec of ['marco', 'fim']) for (const k of Object.keys(out[sec])) { out[sec][k] = (out[sec][k] || []).filter((r) => Object.entries(r).some(([kk, v]) => !['prog', 'niv', 'disc', 'lingua'].includes(kk) && v)); if (!out[sec][k].length) delete out[sec][k]; }
      await S.db.doc(`alfa/${d.ano}_${d.cen}`).set(out);
      await registar('mapa de centro gravado', { ano: d.ano, cen: d.cen, lev: 'alfa_' + st.lev });
      S.adraft = out; S.adirty = false; toast('Mapa do centro gravado. O painel já inclui estes dados.');
    } catch { toast('Não foi possível gravar. Verifique a ligação e a sua permissão.', 5000); }
    save.textContent = 'Gravar mapa'; drawStatus();
  };
  card.append(status, h('div', { class: 'row' }, save));
  drawStatus();
  const F = AFORM()[st.lev];
  const box = h('div', { class: 'card' });
  for (const b of F) {
    d[st.lev][b.id] ||= [];
    const rows = d[st.lev][b.id];
    if (b.one && !rows.length) rows.push(Object.fromEntries(b.cols.map((c) => [c.k, 0])));
    const newRow = () => Object.fromEntries(b.cols.map((c) => [c.k, c.sel ? +c.sel[0][0] : 0]));
    box.append(h('section', { class: 'mapa', 'data-mapa': 'ALFA', style: 'display:flex;flex-direction:column;gap:8px' }, h('h3', { class: 'mt' }, b.label, qChips('alfa:' + st.lev, b.id, st.ano)), b.note ? h('p', { class: 'note', text: b.note }) : null, grid({ cols: b.cols, rows, ro, onChange: changed, newRow, total: !b.one, check: b.check })));
  }
  // tudo se liga ao Quadro 1 (inscritos): turmas, HPV e alunos existentes não podem ultrapassar os inscritos
  const verQ1 = () => { const M = d.marco || {}; const sm = (l, a, b) => (l || []).reduce((t, r) => [t[0] + (+r[a] || 0), t[1] + (+r[b] || 0)], [0, 0]); const ia = sm(M.prog, 'insH', 'insM'), ie = sm(M.epja, 'insH', 'insM'); const g = (M.geral || [])[0] || {}; const ex = (M.existe || [])[0] || {}; const pr = [];
    if ((+g.hpvH || 0) > ia[0] + ie[0] || (+g.hpvM || 0) > ia[1] + ie[1]) pr.push('Abrangidos por HPV mais do que os inscritos do Quadro 1 (H ou M).');
    if ((+ex.alfaH || 0) > ia[0] || (+ex.alfaM || 0) > ia[1]) pr.push('Alunos existentes de alfabetização mais do que os inscritos do Quadro 1.');
    if ((+ex.epjaH || 0) > ie[0] || (+ex.epjaM || 0) > ie[1]) pr.push('Alunos existentes da EPJA mais do que os inscritos.');
    if ((ia[0] + ia[1]) && !(+g.turAlfa)) pr.push('Há alfabetizandos inscritos mas nenhuma turma de alfabetização.');
    if ((ie[0] + ie[1]) && !(+g.turEPJA)) pr.push('Há alunos da EPJA inscritos mas nenhuma turma de EPJA.');
    avisoQ1.replaceChildren(...pr.map((t) => h('li', { class: 'iss erro' }, h('span', { class: 'iss-g', text: 'Erro' }), h('span', { text: t })))); };
  const avisoQ1 = h('ul', { class: 'issues' }); if (st.lev === 'marco') { box.prepend(avisoQ1); verQ1(); box.addEventListener('input', () => setTimeout(verQ1, 50)); }
  body.append(box);
}
function alfaSum(fm, f) {
  const T = { insA: [0, 0], insE: [0, 0], fimA: [0, 0], apA: [0, 0], fimE: [0, 0], apE: [0, 0], cap: 0, sem: 0, nM: 0, nF: 0, turA: 0, turE: 0 };
  const prog = {}, niv = {};
  for (const x of fm.values()) {
    if (f.dist !== 'Todos' && +x.dist !== +f.dist) continue;
    const M = x.marco || {}, Fi = x.fim || {};
    if (Object.keys(M).length) T.nM++; if (Object.keys(Fi).length) T.nF++;
    const ad = (a, h_, m_) => { a[0] += +h_ || 0; a[1] += +m_ || 0; };
    for (const r of M.prog || []) { ad(T.insA, r.insH, r.insM); ad((prog[r.prog] ||= { ins: [0, 0], fim: [0, 0], ap: [0, 0] }).ins, r.insH, r.insM); }
    for (const r of M.epja || []) { ad(T.insE, r.insH, r.insM); ad((niv[r.niv] ||= { ins: [0, 0], fim: [0, 0], ap: [0, 0] }).ins, r.insH, r.insM); }
    for (const r of Fi.prog || []) { ad(T.fimA, r.fimH, r.fimM); ad(T.apA, r.apH, r.apM); const p = (prog[r.prog] ||= { ins: [0, 0], fim: [0, 0], ap: [0, 0] }); ad(p.fim, r.fimH, r.fimM); ad(p.ap, r.apH, r.apM); }
    for (const r of Fi.epja || []) { ad(T.fimE, r.fimH, r.fimM); ad(T.apE, r.apH, r.apM); const p = (niv[r.niv] ||= { ins: [0, 0], fim: [0, 0], ap: [0, 0] }); ad(p.fim, r.fimH, r.fimM); ad(p.ap, r.apH, r.apM); }
    for (const r of M.educ || []) { T.cap += (+r.capH || 0) + (+r.capM || 0); T.sem += (+r.semH || 0) + (+r.semM || 0); }
    for (const r of M.geral || []) { T.turA += +r.turAlfa || 0; T.turE += +r.turEPJA || 0; }
  }
  return { T, prog, niv };
}
function alfaCentros(body) {
  const st = S.cv ||= { dist: S.cod.distritos[0][0] }; const propor = DESKTOP && !ehDPE() && (S.sessao?.perfil || 0) >= 2 && !writeNote(); const ro = !!writeNote() || (DESKTOP && (S.sessao?.perfil !== 3 || !ehDPE())) ; const form = h('div');
  const dist = h('select', { onchange: (e) => { st.dist = +e.target.value; go('alfa'); } }, S.cod.distritos.map((d) => h('option', { value: d[0], text: d[1], selected: d[0] === +st.dist })));
  const lst = centrosDe(st.dist);
  const edit = (c) => {
    const cod = c?.cod || Math.max(0, ...S.cen.keys()) + 1;
    const f = { nome: c?.nome || '', dist: c?.dist || +st.dist, esc: c?.esc || '', org: c?.org || 1, provedor: c?.provedor || '', abertura: c?.abertura || '', fecho: c?.fecho || '' };
    const roC = ro && !propor; const inp = (k, l, t = 'text') => { const el = h('input', { type: t, value: f[k] ?? '', disabled: roC }); el.oninput = () => (f[k] = el.value); return h('label', { class: 'f' }, l, el); };
    const org = h('select', { disabled: roC, onchange: (e) => (f.org = +e.target.value) }, S.cod.organ.map((o) => h('option', { value: o[0], text: o[1], selected: o[0] === +f.org })));
    const ds = h('select', { disabled: roC, onchange: (e) => (f.dist = +e.target.value) }, S.cod.distritos.map((d) => h('option', { value: d[0], text: d[1], selected: d[0] === +f.dist })));
    form.replaceChildren(h('div', { class: 'card', style: 'background:var(--soft)' }, h('h3', { text: c ? `${c.nome} (${cod})` : `Novo centro (código ${cod})` }),
      h('div', { class: 'row' }, inp('nome', 'Nome do centro'), h('label', { class: 'f' }, 'Distrito', ds), inp('esc', 'Código da escola de apoio', 'number'), h('label', { class: 'f' }, 'Entidade', org), inp('provedor', 'Provedor'), inp('abertura', 'Ano de abertura', 'number'), inp('fecho', 'Ano de encerramento', 'number')),
      h('div', { class: 'row' }, propor ? h('button', { class: 'btn primary', text: c ? 'Propor esta correcção à DPE' : 'Propor este centro à DPE', onclick: async () => { if (!f.nome.trim()) { toast('Escreva o nome do centro.'); return; } await enviarProposta('centro', c ? cod : null, { nome: f.nome.trim(), dist: +f.dist, esc: +f.esc || null, org: +f.org, provedor: f.provedor || null, abertura: +f.abertura || null, fecho: +f.fecho || null }, c); form.replaceChildren(); } }) : null, ro ? null : h('button', { class: 'btn primary', text: 'Gravar centro', onclick: async () => {
        if (!f.nome.trim()) { toast('Escreva o nome do centro.'); return; }
        try { await S.db.doc(`centros/${cod}`).set({ cod, nome: f.nome.trim(), dist: +f.dist, esc: +f.esc || null, org: +f.org, provedor: f.provedor || null, abertura: +f.abertura || null, fecho: +f.fecho || null, em: new Date().toISOString() }); S.cenDb ||= new Map(); S.cenDb.set(cod, { cod, nome: f.nome.trim(), dist: +f.dist, esc: +f.esc || null, org: +f.org, provedor: f.provedor || null, abertura: +f.abertura || null, fecho: +f.fecho || null }); rebuildCentros(); toast('Centro gravado.'); go('alfa'); }
        catch { toast('Não foi possível gravar o centro.'); }
      } }), h('button', { class: 'btn', text: 'Fechar', onclick: () => form.replaceChildren() }))));
  };
  body.append(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('label', { class: 'f' }, 'Distrito', dist), ro ? (propor ? h('button', { class: 'btn', text: '+ Propor centro novo à DPE', onclick: () => edit(null) }) : null) : h('button', { class: 'btn primary', text: '+ Novo centro', onclick: () => edit(null) })), cartaoPropostas('centro', (c) => edit(c)), propor ? h('p', { class: 'note', text: 'Os centros são criados e alterados só pela DPE. Pode propor um centro novo ou uma correcção: a DPE recebe a proposta, revê e aprova.' }) : null, form,
    h('div', { class: 'tw tall' }, h('table', {}, h('thead', {}, h('tr', {}, ['Código', 'Centro', 'Escola de apoio', 'Entidade', 'Estado', ''].map((t) => h('th', { class: t === 'Centro' || t === 'Escola de apoio' ? 'l' : null, text: t })))),
      h('tbody', {}, lst.map((c) => h('tr', {}, h('td', { class: 'mono', text: c.cod }), h('td', { class: 'l', text: c.nome }), h('td', { class: 'l', text: S.esc.get(c.esc)?.nome || '' }), h('td', { text: (S.cod.organ.find((o) => o[0] === c.org) || [0, ''])[1] }), h('td', { text: c.fecho ? `Encerrado ${c.fecho}` : '' }), h('td', {}, h('button', { class: 'btn sm', text: ro ? (propor ? 'Ver / propor correcção' : 'Ver') : 'Editar', onclick: () => edit(c) })))))))));
}
function alfaExcel(body, st) {
  const x = S.ax ||= { ano: 2025, dist: st.dist, lev: 'ambos' };
  const sel = (k, list, lab) => h('label', { class: 'f' }, lab, h('select', { onchange: (e) => (x[k] = e.target.value) }, list.map((o) => h('option', { value: o[0], text: o[1], selected: String(o[0]) === String(x[k]) }))));
  const msg = h('p', { class: 'note' });
  const base = (f) => ({ Ano: f.ano, CodDistrito: f.dist, Distrito: distName(f.dist), CodCentro: f.cen, Centro: S.cen.get(f.cen)?.nome || '', CodEscola: f.esc || '' });
  const exp = async (vazio) => {
    const XLSX = window.XLSX; const fm = await alfaFichas(+x.ano, !!S.db); const wb = XLSX.utils.book_new(); const F = AFORM();
    let list = [...fm.values()].filter((f) => x.dist === 'Todos' || +f.dist === +x.dist);
    if (vazio) { const have = new Set(list.map((f) => f.cen)); for (const c of [...S.cen.values()]) if ((x.dist === 'Todos' || +c.dist === +x.dist) && !have.has(c.cod) && !(c.fecho && c.fecho <= +x.ano)) list.push({ ano: +x.ano, cen: c.cod, dist: c.dist, esc: c.esc, marco: {}, fim: {} }); }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['EducStat Tete — Alfabetização e EPJA'], [`Ano ${x.ano}`], ['Uma linha por centro (e por programa, nível, língua ou disciplina). Preencha e importe no menu Alfabetização > Excel. Não mude os nomes das folhas nem dos cabeçalhos.']]), 'Leia-me');
    for (const sec of x.lev === 'ambos' ? ['marco', 'fim'] : [x.lev]) for (const b of F[sec]) {
      const hd = ['Ano', 'CodDistrito', 'Distrito', 'CodCentro', 'Centro', 'CodEscola', ...b.cols.flatMap((c) => (c.sel ? [c.label + ' (código)', c.label] : [c.label]))];
      const rows = [];
      for (const f of list) {
        let rs = f[sec]?.[b.id] || [];
        if (vazio && !rs.length && b.one) rs = [Object.fromEntries(b.cols.map((c) => [c.k, 0]))];
        for (const r of rs) { const o = base(f); for (const c of b.cols) { if (c.sel) { o[c.label + ' (código)'] = r[c.k]; o[c.label] = (c.sel.find((s) => +s[0] === +r[c.k]) || [0, ''])[1]; } else o[c.label] = r[c.k] ?? 0; } rows.push(o); }
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows, { header: hd }), `${sec === 'marco' ? 'M' : 'F'}_${b.id}`);
    }
    wb.Props = { Title: `Alfabetização e EPJA ${x.ano}`, Author: 'Alberto Adélia Manhice', LastAuthor: 'Alberto Adélia Manhice', Subject: 'Ficheiro de introdução de alfabetização e EPJA', Category: 'Estatística da Educação' };
    try { await S.downloads.save({ filename: `Alfabetizacao_EPJA_${x.ano}_${x.dist === 'Todos' ? 'Provincia' : distName(x.dist).replace(/\s+/g, '_')}${vazio ? '_lancamento' : ''}.xlsx`, data: new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]) }); msg.textContent = `Ficheiro com ${list.length} centros.`; }
    catch (e) { msg.textContent = e?.code === 'declined' ? 'Transferência cancelada.' : 'Não foi possível criar o ficheiro.'; }
  };
  const file = h('input', { type: 'file', accept: '.xlsx,.xls,.xlsm,.csv', disabled: !!writeNote() }); const out = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
  file.onchange = async () => {
    const XLSX = window.XLSX; const wb = XLSX.read(await file.files[0].arrayBuffer(), { type: 'array' }); const F = AFORM(); const by = new Map();
    for (const sec of ['marco', 'fim']) for (const b of F[sec]) {
      const ws = wb.Sheets[`${sec === 'marco' ? 'M' : 'F'}_${b.id}`]; if (!ws) continue;
      for (const r of XLSX.utils.sheet_to_json(ws, { defval: 0 })) {
        const ano = +r.Ano, cen = +r.CodCentro; if (!ano || !cen) continue;
        const k = ano + '_' + cen; if (!by.has(k)) by.set(k, { ano, cen, dist: +r.CodDistrito || S.cen.get(cen)?.dist, esc: +r.CodEscola || null, blocks: { marco: {}, fim: {} } });
        const o = {}; for (const c of b.cols) o[c.k] = c.sel ? +r[c.label + ' (código)'] || 0 : Math.max(0, Math.round(+r[c.label] || 0));
        (by.get(k).blocks[sec][b.id] ||= []).push(o);
      }
    }
    const list = [...by.values()].filter((f) => f.dist);
    if (!list.length) { out.replaceChildren(h('p', { class: 'pill bad', text: 'O ficheiro não tem mapas de centro reconhecíveis.' })); return; }
    out.replaceChildren(h('p', { text: `${list.length} mapas de centro no ficheiro.` }), h('button', { class: 'btn primary', text: 'Importar e gravar', onclick: async () => {
      if (!(await confirmBox(`Gravar ${list.length} mapas de centro? Os blocos do ficheiro substituem os existentes.`, 'Gravar'))) return;
      let fail = 0; const cache = new Map();
      for (const f of list) {
        try {
          if (!cache.has(f.ano)) cache.set(f.ano, await alfaFichas(f.ano, true));
          const b0 = clone(cache.get(f.ano).get(f.cen)) || { ano: f.ano, cen: f.cen, dist: f.dist, esc: f.esc, marco: {}, fim: {} };
          for (const sec of ['marco', 'fim']) for (const [k, v] of Object.entries(f.blocks[sec])) { const vv = v.filter((r) => Object.entries(r).some(([kk, val]) => !['prog', 'niv', 'disc', 'lingua'].includes(kk) && val)); b0[sec] ||= {}; if (vv.length) b0[sec][k] = vv; else delete b0[sec][k]; }
          b0.em = new Date().toISOString(); b0.por = S.me?.id || null;
          await S.db.doc(`alfa/${f.ano}_${f.cen}`).set(b0);
        } catch { fail++; }
      }
      S.adraft = null;
      out.replaceChildren(h('p', { class: fail ? 'pill warn' : 'pill ok', text: fail ? `Terminado com ${fail} falha(s). Importe de novo para completar.` : `${list.length} mapas gravados.` }));
    } }));
  };
  body.append(h('div', { class: 'card' }, h('h2', { text: 'Exportar' }), h('div', { class: 'row' }, sel('ano', desc(ANOS_A).map((a) => [a, a]), 'Ano'), sel('dist', [['Todos', 'Província (todos)'], ...S.cod.distritos], 'Distrito'), sel('lev', [['ambos', 'Março e fim do ano'], ['marco', 'Março'], ['fim', 'Fim do ano']], 'Levantamento')),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', text: 'Ficheiro de introdução', disabled: !S.downloads, onclick: () => exp(true) }), h('button', { class: 'btn', text: 'Dados introduzidos', disabled: !S.downloads, onclick: () => exp(false) })), msg),
    h('div', { class: 'card' }, h('h2', { text: 'Importar' }), writeNote() ? h('p', { class: 'pill warn', text: writeNote() }) : null, h('label', { class: 'f' }, 'Ficheiro Excel exportado nesta secção', file), out));
}

// =====================================================================
// FICHA TÉCNICA DOS INDICADORES (edite aqui para corrigir ou acrescentar definições)
// =====================================================================
const DEFS = {
  tba: ['Proporção de crianças admitidas no sistema educativo (1ª classe), sem ter em conta a idade.', 'Novos ingressos na 1ª classe (todas as idades) ÷ população de 6 anos × 100.', '3 de Março · Alunos. População (INE)', 'Dá uma ideia geral da cobertura da entrada. Pode passar de 100% quando entram crianças fora da idade.'],
  tla: ['Proporção de crianças com a idade oficial (6 anos) que entram na 1ª classe.', 'Alunos de 6 anos na 1ª classe ÷ população de 6 anos × 100.', '3 de Março · Alunos por idade. População (INE)', 'Mostra se as crianças entram na escola na idade certa. Inclui os poucos repetentes de 6 anos.'],
  tesc6: ['Taxa de escolarização aos 6 anos de idade.', 'Alunos de 6 anos no EP ÷ crianças de 6 anos na população × 100.', '3 de Março · Alunos por idade. População (INE)', ''],
  tbe: ['Proporção entre os alunos de todas as idades de um nível e a população com a idade oficial desse nível.', 'Alunos do nível ÷ população em idade oficial do nível × 100. Com o nível em "Todos", usa o EP.', '3 de Março · Alunos. População (INE)', 'Mede a capacidade do sistema de atender a população em idade escolar. Pode passar de 100% por causa dos alunos fora da idade.'],
  tle: ['Proporção entre os alunos com a idade oficial de um nível e a população com essa idade.', 'Alunos em idade oficial do nível ÷ população em idade oficial do nível × 100.', '3 de Março · Alunos por idade. População (INE)', 'Não pode passar de 100%. A diferença entre a TBE e a TLE mostra o peso dos alunos fora da idade.'],
  aprovEsc: ['Taxa de aproveitamento escolar: alunos em condições de progredir em relação aos matriculados no início do ano.', 'Aprovados ÷ alunos matriculados em 3 de Março (escolas com fim do ano introduzido) × 100.', 'Fim do ano · Aproveitamento; 3 de Março · Alunos', 'Mostra a eficácia do sistema num ano lectivo, contando também os alunos que se perderam durante o ano.'],
  ret3: ['Taxa de retenção até à 3ª classe.', 'Novos ingressos na 3ª classe no ano n (alunos − repetentes) ÷ alunos matriculados na 1ª classe no ano n−2 × 100.', '3 de Março · Alunos, dois anos', 'Mostra quantos dos que entraram na 1ª classe chegam à 3ª sem perder anos.'],
  tbc: ['Taxa bruta de conclusão do nível.', 'Aprovados na(s) classe(s) terminal(is) do nível ÷ população com a idade oficial de conclusão × 100. Classe terminal por ano — EP: 7ª (até 2021), 6ª+7ª (2022, transição), 6ª (desde 2023); ESG1: 10ª (até 2024), 9ª+10ª (2025, transição), 9ª (desde 2026); ESG2: 12ª. Nos anos de transição contam-se as duas classes.', 'Fim do ano · Aproveitamento. População (INE)', 'Monitora a capacidade do sistema de levar os alunos à conclusão do nível. Em 2022 (EP) e 2025 (ES1) convivem duas classes terminais por causa da entrada gradual do SNE.'],
  alprofF: ['Rácio alunos por professor com formação psicopedagógica.', 'Alunos matriculados ÷ professores com formação psicopedagógica.', '3 de Março', 'Informa melhor sobre a distribuição dos professores preparados do que a simples proporção de formados.'],
  pctConv: ['Proporção de salas de aula de material de construção convencional.', 'Salas de cimento e de tijolo ÷ total de salas recenseadas × 100.', '3 de Março · Salas', 'A estratégia do sector é substituir as salas de material precário por salas convencionais.'],
  livNP: ['Número de alunos com livro de Português na data do levantamento.', 'Soma dos alunos com livro de Português.', '3 de Março · Livros', 'Usado com a proporção para monitorar a distribuição do livro escolar.'],
  matric: ['Número de alunos inscritos no início do ano lectivo.', 'Soma dos alunos de todas as idades, por classe, ensino e turno.', '3 de Março · Alunos por idade', 'Mede o tamanho do sistema. Compare com a população em idade escolar para saber a cobertura.'],
  pctF: ['Peso das raparigas no total de alunos.', 'Alunas ÷ (alunos + alunas) × 100.', '3 de Março · Alunos por idade', 'Perto de 50% indica equilíbrio. Valores baixos nas classes mais altas mostram abandono das raparigas.'],
  escolas: ['Escolas com pelo menos um aluno no nível.', 'Contagem de escolas com alunos > 0, por nível.', '3 de Março · Alunos por idade', 'Com o nível em "Todos", uma escola com EP e ESG conta uma vez em cada nível.'],
  novos: ['Alunos que entram pela primeira vez na classe inicial do nível.', 'Matriculados − repetentes na classe de entrada do nível e ano. Sem filtro de nível (ou no EP) é a 1ª classe; no ES1 é a 7ª (8ª no sistema anterior); no ES2 é a 10ª (11ª no sistema anterior). Nos anos de transição conta as duas classes de entrada.', '3 de Março · Alunos por idade', 'Para o sistema todo, é a base da taxa bruta de admissão (1ª classe ÷ população de 6 anos).'],
  c1id6: ['Alunos da 1ª classe com a idade oficial de entrada.', 'Alunos da 1ª classe com 6 anos ÷ alunos da 1ª classe × 100.', '3 de Março · Alunos por idade', 'Valores baixos indicam entrada tardia ou precoce na escola.'],
  reprov: ['Percentagem de alunos reprovados.', '(Alunos no fim do ano − aprovados) ÷ alunos no fim do ano × 100.', 'Fim do ano · Aproveitamento', 'Complemento da taxa de aprovação.'],
  desist: ['Percentagem de alunos que abandonaram a escola durante o ano.', 'Desistentes (todos os motivos) ÷ alunos matriculados nas escolas com fim do ano introduzido × 100.', 'Fim do ano · Desistências; 3 de Março · Alunos', 'O denominador só inclui escolas com fim do ano introduzido, para não subestimar a taxa enquanto a introdução está incompleta.'],
  repet: ['Percentagem de alunos que repetem a classe.', 'Repetentes ÷ alunos matriculados × 100.', '3 de Março · Alunos (repetentes)', 'Repetência alta aumenta a sobreidade e o custo por graduado.'],
  sob: ['Alunos com 2 ou mais anos acima da idade oficial da classe.', 'Alunos com idade ≥ (classe + 5) + 2 ÷ alunos com idade conhecida × 100.', '3 de Março · Alunos por idade', 'Desde 2023 a 6ª classe do EP fica fora: o formulário junta "12 ou mais anos" e não permite separar 12 de 13.'],
  cobFim: ['Escolas com o levantamento de fim do ano introduzido.', 'Escolas com alunos no fim do ano ÷ escolas com alunos em Março × 100.', 'Fim do ano · Aproveitamento', 'Abaixo de 95% as taxas de aprovação e desistência ainda não representam todo o território.'],
  prof: ['Professores em exercício no início do ano.', 'Soma dos professores por qualificação.', '3 de Março · Professores por qualificação', 'Um professor que lecciona em mais de um nível pode contar em cada um.'],
  pctProfF: ['Peso das professoras no corpo docente.', 'Professoras ÷ professores × 100.', '3 de Março · Professores', ''],
  formados: ['Professores com formação psicopedagógica reconhecida.', 'Professores com qualificação marcada como "formado" na tabela de qualificações ÷ professores × 100.', '3 de Março · Professores', 'A lista de qualificações que contam como formação edita-se em Administração > Tabelas de códigos.'],
  alprof: ['Alunos por professor.', 'Alunos matriculados ÷ professores que leccionam (sempre rapazes + raparigas).', '3 de Março', 'Válido sobretudo para o EP (no ESG cada professor lecciona várias turmas). Acima de 70 indica falta de professores.'],
  aprov: ['Taxa de aproveitamento pedagógico: alunos que chegaram ao fim do ano e foram aprovados.', 'Aprovados ÷ alunos existentes no fim do ano × 100.', 'Fim do ano · Aproveitamento', 'Não considera os alunos que o sistema perdeu durante o ano (veja o aproveitamento escolar). Só é calculada onde o fim do ano foi introduzido.'],
  turmas: ['Número de turmas.', 'Turmas puras + turmas mistas (multiclasse).', '3 de Março · Alunos (turmas)', ''],
  altur: ['Alunos por turma.', 'Alunos matriculados ÷ turmas.', '3 de Março', 'Turmas muito numerosas dificultam a aprendizagem.'],
  alsala: ['Alunos por sala de aula.', 'Alunos de todos os níveis ÷ salas (convencionais + precárias).', '3 de Março · Salas', 'As salas são da escola. Por isso o filtro de nível é ignorado. Com mais de um turno, o rácio por turno é menor.'],
  prec: ['Peso das salas de material precário.', 'Salas maticadas, de pau-a-pique e de outros materiais ÷ total de salas × 100.', '3 de Março · Salas', ''],
  livre: ['Turmas que funcionam sem sala.', 'Soma das turmas ao ar livre.', '3 de Março · Salas', ''],
  livP: ['Alunos com livro de Português.', 'Alunos com livro de Português ÷ alunos matriculados × 100.', '3 de Março · Livros', 'Recolhido sobretudo no EP. No ESG aparece quase a zero.'],
  livM: ['Alunos com livro de Matemática.', 'Alunos com livro de Matemática ÷ alunos matriculados × 100.', '3 de Março · Livros', ''],
  pnd: ['Pessoal não docente.', 'Direcção, técnicos administrativos e auxiliares (sem professores em trabalhos moderados).', '3 de Março · Pessoal não docente', ''],
  elect: ['Escolas com electricidade.', 'Escolas com electricidade ÷ escolas que responderam ao bloco de infra-estruturas × 100.', '3 de Março · Infra-estruturas (desde 2023)', ''],
  agua: ['Escolas com acesso a água.', 'Escolas com água canalizada (na escola ou fora) ou fontenária ÷ escolas que responderam × 100.', '3 de Março · Infra-estruturas (desde 2023)', ''],
  sanit: ['Escolas com sanitários.', 'Escolas com casas de banho ou latrinas ÷ escolas que responderam × 100.', '3 de Março · Infra-estruturas (desde 2023)', ''],
  ipg: ['Índice de paridade de género na matrícula.', 'Alunas ÷ alunos.', '3 de Março', '1,00 = paridade. Entre 0,97 e 1,03 considera-se paridade; abaixo, desvantagem das raparigas.'],
  ipgAp: ['Índice de paridade de género na aprovação.', 'Taxa de aprovação das raparigas ÷ taxa de aprovação dos rapazes.', 'Fim do ano', ''],
  orf: ['Alunos órfãos.', 'Órfãos de pai, de mãe ou de ambos ÷ alunos matriculados × 100.', '3 de Março · Órfãos', ''],
  defic: ['Alunos com deficiência declarada.', 'Soma por tipo de deficiência e classe.', '3 de Março · Deficiência (desde 2023)', ''],
  biling: ['Alunos no ensino bilingue.', 'Soma dos alunos do ensino bilingue.', '3 de Março · Ensino bilingue', ''],
};
VIEWS.indicadores = (v) => {
  v.append(h('div', {}, h('h1', { text: 'Explicação dos indicadores' }), h('p', { class: 'lede', text: 'O que mede cada indicador do painel, como se calcula, de que quadro vêm os dados e como interpretar.' })));
  const metas = S.metas || {}; let grelha = v;
  for (const it of IND) {
    if (!it[1]) { v.append(h('p', { class: 'grupo-t', text: it[0] })); grelha = h('div', { class: 'grid2' }); v.append(grelha); continue; }
    const d = DEFS[it[0]] || ['', '', '', ''];
    const F0 = { dist: 'Todos', tipo: 'Todos', nivel: 'Todos', sexo: 'Ambos' }; const anosD = ANOS.filter((a) => S.cod.distritos.some((x) => resumoDe(a, x[0])));
    const ser = serieIndicador(it[0], F0, anosD); const ult = [...ser].reverse().find((x) => x != null);
    const graf = h('div', { class: 'def-graf' }, sparkSVG(ser, { W: 220, H: 54 }), h('small', { text: ult == null ? 'Sem dados (ver a nota de origem)' : `Província: ${fmt(it[0], ult)} · ${anosD[0]}–${anosD[anosD.length - 1]}` }));
    grelha.append(h('div', { class: 'card', id: 'def-' + it[0], style: 'border-top:4px solid var(--brand)' }, h('div', { class: 'row between', style: 'align-items:flex-start' }, h('div', { style: 'flex:1;min-width:16rem' }, h('h3', { text: it[1] }), d[0] ? h('p', { style: 'margin:6px 0 0', text: d[0] }) : null), graf),
      h('div', { class: 'grid3' }, h('div', {}, h('strong', { text: 'Como se calcula' }), h('p', { class: 'note', text: d[1] || it[3] })), h('div', {}, h('strong', { text: 'Origem dos dados' }), h('p', { class: 'note', text: d[2] || '—' })),
        h('div', {}, h('strong', { text: 'Como interpretar' }), h('p', { class: 'note', text: [d[3], metas[it[0]] != null ? `Meta definida: ${fmt(it[0], +metas[it[0]])}.` : ''].filter(Boolean).join(' ') || '—' })))));
  }
  v.append(h('div', { class: 'card help' }, h('h2', { text: 'Notas gerais' }),
    h('p', { text: 'H = homens/rapazes; M = mulheres/raparigas. Os rácios usam sempre o total, qualquer que seja o filtro de sexo.' }),
    h('p', { text: 'Até 2022 o EP tinha 7 classes (EP1 1ª–5ª e EP2 6ª–7ª) e o ESG1 ia da 8ª à 10ª. Desde 2023 (SNE) o EP tem 6 classes e o ESG1 começa na 7ª. As tabelas de qualificações dos professores e de motivos de desistência também foram refeitas em 2023. O sistema usa a tabela própria de cada ano.' }),
    h('p', { text: 'Idade oficial: até 2022, EP 6–12, ESG1 13–15, ESG2 16–17 anos. Desde 2023, EP 6–11, ESG1 12–14, ESG2 15–17 anos.' })));
};

// --- administração: importar Access, tabelas de códigos e metas ---
async function adminAccess(body) {
  const st = S.acc ||= { de: ANO_MIN, ate: ANOS[ANOS.length - 1], politica: 'completar' };
  const msg = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
  const num = (k, lab) => { const el = h('input', { type: 'number', value: st[k], min: 2004, max: 2100 }); el.oninput = () => (st[k] = +el.value); return h('label', { class: 'f' }, lab, el); };
  const pol = h('select', { onchange: (e) => (st.politica = e.target.value) }, [['completar', 'Completar: acrescentar o que falta (ex.: o aproveitamento) e manter o resto'], ['diferenca', 'Actualizar o que for diferente: cada levantamento que no Access tenha outros números passa a ser o do Access'], ['substituir', 'Substituir: o Access passa a mandar em tudo'], ['manter', 'Não mexer nos mapas que já existem']].map(([k, l]) => h('option', { value: k, text: l, selected: st.politica === k })));
  const escolher = async () => {
    msg.replaceChildren(h('p', { class: 'note', text: 'A ler a base Access (pode demorar alguns segundos)…' }));
    const known = Object.fromEntries([...S.esc.values()].map((e) => [e.cod, e.dist]));
    const r = await window.educstat.importAccess({ anoMin: st.de, anoMax: st.ate, distritos: S.cod.distritos.map((d) => d[0]), escolasConhecidas: known });
    if (!r) { msg.replaceChildren(); return; }
    if (r.erro) { msg.replaceChildren(h('p', { class: 'pill bad', text: 'Não foi possível ler a base: ' + r.erro })); return; }
    const porAno = {}; for (const f of r.fichas) porAno[f.ano] = (porAno[f.ano] || 0) + 1;
    const porAnoA = {}; for (const f of r.alfa) porAnoA[f.ano] = (porAnoA[f.ano] || 0) + 1;
    const fmts = [r.formatos.antigo && 'quadros antigos (até 2022)', r.formatos.novo && 'quadros refeitos (2023 em diante)', r.formatos.alfa && 'AdultStat (alfabetização)'].filter(Boolean).join(', ') || 'nenhum quadro reconhecido';
    msg.replaceChildren(h('p', { text: `${r.ficheiro}: ${fmts}.` }),
      h('p', { text: `Mapas de escola: ${Object.entries(porAno).map(([a, n]) => `${a}: ${n}`).join(' · ') || 'nenhum no intervalo escolhido'}.` }),
      r.anosFicheiro?.length ? h('p', { class: r.fichas.length ? 'note' : 'pill warn', text: `O ficheiro tem dados de ${r.anosFicheiro[0]} a ${r.anosFicheiro[r.anosFicheiro.length - 1]}.${r.fichas.length ? '' : ` O intervalo escolhido (${st.de} a ${st.ate}) não tem dados: mude “Do ano” e “Até ao ano” e escolha a base de novo.`}` }) : null,
      r.alfa.length ? h('p', { text: `Mapas de centros de alfabetização: ${Object.entries(porAnoA).map(([a, n]) => `${a}: ${n}`).join(' · ')}.` }) : null,
      r.novasEscolas.length ? h('p', { text: `${r.novasEscolas.length} escolas novas serão acrescentadas ao cadastro.` }) : null,
      ...r.avisos.map((a) => h('p', { class: 'pill warn', text: a })),
      (r.fichas.length || r.alfa.length) ? h('button', { class: 'btn primary', text: 'Importar para o sistema', onclick: () => aplicar(r) }) : null);
  };
  const aplicar = async (r) => {
    if (!(await confirmBox(`Importar ${r.fichas.length} mapas de escola e ${r.alfa.length} mapas de centro? ${st.politica === 'manter' ? 'Os mapas já introduzidos neste sistema ficam como estão.' : st.politica === 'completar' ? 'Nos mapas que já existem, entra o que lá faltar (por exemplo o fim do ano) e o que já foi introduzido aqui fica.' : st.politica === 'diferenca' ? 'Em cada mapa, o levantamento (3 de Março ou fim do ano) com números diferentes no Access passa a ter os números do Access. O resto fica.' : 'Os mapas existentes destes anos e escolas serão substituídos pelos do Access.'}`, 'Importar'))) return;
    const prog = h('div', { class: 'prog' }, h('i')); msg.append(prog); const bar = prog.firstChild;
    const em = new Date().toISOString(); let n = 0, salt = 0; const toc = new Set(); const tot = r.fichas.length + r.alfa.length;
    if (ehDPE()) { for (const e of r.novasEscolas) if (!S.esc.has(e.cod)) await S.db.doc(`escolas/${e.cod}`).set({ ...e, em }); }
    else if (r.novasEscolas.some((e) => !S.esc.has(e.cod))) { const nov = new Set(r.novasEscolas.filter((e) => !S.esc.has(e.cod)).map((e) => e.cod)); r.fichas = r.fichas.filter((f) => !nov.has(f.esc)); toast(`${nov.size} escolas que não existem no cadastro foram ignoradas: escolas novas são criadas só pela DPE.`, 7000); }
    for (const c of r.centros) { const cur = await S.db.doc(`centros/${c.cod}`).get(); if (!cur.exists && !(S.cenStatic || []).some((x) => x.cod === c.cod)) await S.db.doc(`centros/${c.cod}`).set({ ...c, em }); }
    // “actualizar”: em cada ficha que já existe (gravada aqui ou vinda do instalador), cada parte (3 de Março, fim do ano)
    // que o Access traz e que aqui está vazia entra; o que já foi lançado aqui fica. “substituir”: o Access manda em tudo.
    const cheia = (x) => !!x && Object.values(x).some((v) => (Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : v));
    let actualizadas = 0, diferentes = 0;
    const fm = new Map(); const efe = async (a, d) => { const k = a + '_' + d; if (!fm.has(k)) fm.set(k, await fichasEfectivas(a, d, true)); return fm.get(k); };
    for (const f of r.fichas) {
      const cur = (await efe(f.ano, f.dist)).get(f.esc);
      let nova = null;
      if (!cur || st.politica === 'substituir') nova = { ...f };
      else if (st.politica === 'completar') {
        const m = { ...cur }; let mudou = false;
        for (const lev of ['marco', 'fim']) if (cheia(f[lev]) && !cheia(cur[lev])) { m[lev] = f[lev]; mudou = true; }
        if (mudou) { nova = m; actualizadas++; }
        else for (const lev of ['marco', 'fim']) if (cheia(f[lev]) && JSON.stringify(f[lev]) !== JSON.stringify(cur[lev])) { diferentes++; break; }
      } else if (st.politica === 'diferenca') {
        const m = { ...cur }; let mudou = false;
        for (const lev of ['marco', 'fim']) if (cheia(f[lev]) && JSON.stringify(f[lev]) !== JSON.stringify(cur[lev])) { m[lev] = f[lev]; mudou = true; }
        if (mudou) { nova = m; actualizadas++; }
      }
      if (!nova) salt++; else { await S.db.doc(`fichas/${f.ano}_${f.esc}`).set({ ...nova, em, por: S.sessao.utilizador, origem: cur ? (cur.origem || 'Access') : 'Access' }); toc.add(f.ano + '_' + f.dist); }
      n++; if (n % 50 === 0) { bar.style.width = `${(100 * n) / tot}%`; await new Promise((x) => setTimeout(x, 0)); }
    }
    const alfaFm = new Map(); for (const a of new Set(r.alfa.map((f) => f.ano))) alfaFm.set(a, await alfaFichas(a, true));
    for (const f of r.alfa) {
      const cur = alfaFm.get(f.ano)?.get?.(f.cen) || (await S.db.doc(`alfa/${f.ano}_${f.cen}`).get()).data();
      let nova = null;
      if (!cur || st.politica === 'substituir') nova = { ...f };
      else if (st.politica === 'completar') { const m = { ...cur }; let mudou = false; for (const lev of ['marco', 'fim']) if (cheia(f[lev]) && !cheia(cur[lev])) { m[lev] = f[lev]; mudou = true; } if (mudou) { nova = m; actualizadas++; } }
      if (!nova) salt++; else await S.db.doc(`alfa/${f.ano}_${f.cen}`).set({ ...nova, em, por: S.sessao.utilizador, origem: 'Access' });
      n++;
    }
    for (const k of toc) { const [a, d] = k.split('_'); await recalcResumo(+a, +d); }
    bar.style.width = '100%';
    await registar('base Access importada', { n: n - salt });
    msg.append(h('p', { class: 'pill ok', text: `Importação concluída: ${n - salt} mapas gravados${actualizadas ? ` (dos quais ${actualizadas} ${st.politica === 'diferenca' ? 'actualizados com os números do Access' : 'completados com o que faltava, por exemplo o aproveitamento'})` : ''}${salt ? `, ${salt} já estavam completos e ficaram como estavam` : ''}${diferentes ? `. Atenção: ${diferentes} mapas têm no Access números diferentes dos daqui; para os trazer, escolha “Actualizar o que for diferente” e importe de novo` : ''}. O painel foi recalculado.` }));
  };
  body.append(h('div', { class: 'card' }, h('h2', { text: 'Importar bases Access do EducStat / AdultStat' }),
    h('p', { class: 'note', text: 'Aceita as bases .mdb dos dois formatos: os quadros antigos (MarchAges, DecPupil, … — EducStat09) e os quadros refeitos em 2023 (_TblEP1, _TblDecAlunos, … — EducStat_Dados09), bem como as bases AdultStat. O sistema reconhece o formato sozinho. Use-o para trazer anos que ainda estejam a ser introduzidos no Access ou bases de distritos.' }),
    h('div', { class: 'row' }, num('de', 'Do ano'), num('ate', 'Até ao ano'), h('label', { class: 'f' }, 'Quando o mapa já existir', pol), h('button', { class: 'btn primary', text: 'Escolher base Access…', onclick: escolher })), msg));
}
const CODTAB = [
  ['qual.SNE', 'Qualificações dos professores (desde 2023)', true], ['qual.antigo', 'Qualificações dos professores (até 2022)', true], ['motivos.SNE', 'Motivos de desistência (desde 2023)'], ['motivos.antigo', 'Motivos de desistência (até 2022)'],
  ['defic', 'Tipos de deficiência'], ['livros.SNE', 'Disciplinas — livros (desde 2023)'], ['discESG.SNE', 'Disciplinas — professores do ESG (desde 2023)'], ['discProfi', 'Disciplinas profissionalizantes'], ['linguas', 'Línguas moçambicanas'],
  ['mobil', 'Mobiliário'], ['pnd.SNE', 'Pessoal não docente'], ['salas', 'Tipos de sala'], ['transf', 'Movimentos de transferência'], ['programas', 'Programas de alfabetização'], ['discAlfa', 'Disciplinas da alfabetização e EPJA'], ['turnosHor', 'Turnos'], ['regimes', 'Regimes de turnos dos professores'],
];
const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
const setPath = (o, p, v) => { const ks = p.split('.'); let a = o; for (const k of ks.slice(0, -1)) a = a[k] ||= {}; a[ks[ks.length - 1]] = v; };
async function adminCodigos(body) {
  const st = S.ct ||= { t: CODTAB[0][0] };
  const def = CODTAB.find((c) => c[0] === st.t);
  const rows = clone(getPath(S.cod, st.t) || []).map((r) => ({ c: r[0], d: r[1], f: r[2] ? 1 : 0 }));
  const sel = h('select', { onchange: (e) => { st.t = e.target.value; go('admin'); } }, CODTAB.map(([k, l]) => h('option', { value: k, text: l, selected: k === st.t })));
  const cols = [{ k: 'c', label: 'Código' }, { k: 'd', label: 'Designação', text: true }, ...(def[2] ? [{ k: 'f', label: 'Conta como formação (1 = sim)', int: true }] : [])];
  const g = grid({ cols, rows, ro: false, onChange: () => {}, newRow: () => ({ c: Math.max(0, ...rows.map((r) => +r.c || 0)) + 1, d: '', f: 0 }) });
  g.querySelectorAll('input[type=text]').forEach((i) => (i.style.width = '28rem'));
  body.append(h('div', { class: 'card' }, h('h2', { text: 'Tabelas de códigos' }),
    h('p', { class: 'note', text: 'Corrija designações ou acrescente códigos novos quando o Ministério mudar os formulários. Não altere o número de um código já usado: os mapas guardam o código. As alterações valem para a introdução, o Excel e o painel.' }),
    h('label', { class: 'f' }, 'Tabela', sel), g,
    h('div', { class: 'row' }, h('button', { class: 'btn primary', text: 'Gravar tabela', onclick: async () => {
      const val = rows.filter((r) => String(r.d).trim()).map((r) => (def[2] ? [+r.c, String(r.d).trim(), +r.f ? 1 : 0] : [+r.c, String(r.d).trim()]));
      if (new Set(val.map((v_) => v_[0])).size !== val.length) { toast('Há códigos repetidos.'); return; }
      const cur = (await S.db.doc('config/codigos').get()).data() || {}; cur[st.t] = val;
      await S.db.doc('config/codigos').set(cur); setPath(S.cod, st.t, val); FORM = buildForms();
      await registar('tabela de códigos alterada', { alvo: st.t }); toast('Tabela gravada.');
    } }), h('button', { class: 'btn', text: 'Repor a tabela original', onclick: async () => {
      const cur = (await S.db.doc('config/codigos').get()).data() || {}; delete cur[st.t]; await S.db.doc('config/codigos').set(cur);
      toast('Tabela original reposta. A aplicação vai reiniciar.'); setTimeout(() => recarregar(), 1200);
    } }))));
}
async function adminMetas(body) {
  const cur = (await S.db.doc('config/metas').get()).data() || {};
  const inputs = {};
  const list = h('div', { class: 'ilist', style: 'grid-template-columns:minmax(0,1fr) auto auto' }, h('div', { class: 'h', text: 'Indicador' }), h('div', { class: 'h', text: 'Meta' }), h('div', { class: 'h', text: 'Unidade' }));
  for (const it of IND) {
    if (!it[1]) { list.append(h('div', { class: 'g', text: it[0] })); continue; }
    const k = it[0], pct = KIND[k] === 'p';
    const el = h('input', { type: 'number', step: 'any', style: 'width:7rem', value: cur[k] == null ? '' : pct ? +(cur[k] * 100).toFixed(2) : cur[k] }); inputs[k] = el;
    list.append(h('div', { text: it[1] }), h('div', {}, el), h('div', { class: 'note', text: pct ? '%' : KIND[k] === 'r' ? 'rácio' : KIND[k] === 'i' ? 'índice' : 'número' }));
  }
  body.append(h('div', { class: 'card' }, h('h2', { text: 'Metas dos indicadores' }), h('p', { class: 'note', text: 'Defina metas (por exemplo, do Plano Estratégico ou do PES). O painel mostra a meta ao lado do valor e assinala se foi atingida. Deixe vazio para não usar meta.' }), list,
    h('div', { class: 'row' }, h('button', { class: 'btn primary', text: 'Gravar metas', onclick: async () => {
      const out = {}; for (const [k, el] of Object.entries(inputs)) if (el.value !== '') out[k] = KIND[k] === 'p' ? +el.value / 100 : +el.value;
      await S.db.doc('config/metas').set(out); S.metas = out; await registar('metas alteradas'); toast('Metas gravadas.');
    } }))));
}

// =====================================================================
// POPULAÇÃO, LIVRO DE INDICADORES, EXPLORADOR, EXPORTAR PARA ACCESS, MENSAGENS, TEMA
// =====================================================================
async function adminPopulacao(body) {
  const st = S.pv ||= { ano: Math.min(ANO_MAX_DADOS, ANOS[ANOS.length - 1]), dist: S.cod.distritos[0][0] };
  const IDADES = Array.from({ length: 14 }, (_, i) => i + 5);
  const key = `${st.ano}_${st.dist}`;
  const cur = clone(S.pop.get(key)?.idades || {});
  const sel = (k, list, lab) => h('label', { class: 'f' }, lab, h('select', { onchange: (e) => { st[k] = +e.target.value; go('admin'); } }, list.map((o) => h('option', { value: o[0], text: o[1], selected: +o[0] === +st[k] }))));
  const rows = IDADES.map((a) => ({ a, h: cur[a]?.[0] || 0, m: cur[a]?.[1] || 0 }));
  const g = grid({ cols: [{ k: 'a', label: 'Idade', int: true }, { k: 'h', label: 'Homens' }, { k: 'm', label: 'Mulheres' }], rows, ro: false, onChange: () => {}, newRow: () => ({ a: 19, h: 0, m: 0 }), total: true });
  const msg = h('p', { class: 'note' });
  const exp = async () => {
    const XLSX = window.XLSX; const out = [];
    for (const a of ANOS) for (const [d, nm] of S.cod.distritos) { const p = S.pop.get(`${a}_${d}`)?.idades || {}; for (const i of IDADES) out.push({ Ano: a, CodDistrito: d, Distrito: nm, Idade: i, Homens: p[i]?.[0] ?? '', Mulheres: p[i]?.[1] ?? '' }); }
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['População em idade escolar — projecções do INE'], ['Preencha as colunas Homens e Mulheres e importe no menu Administração > População. Uma linha por ano, distrito e idade.']]), 'Leia-me');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(out, { header: ['Ano', 'CodDistrito', 'Distrito', 'Idade', 'Homens', 'Mulheres'] }), 'Populacao');
    wb.Props = { Title: 'População em idade escolar — Tete', Author: 'Alberto Adélia Manhice', LastAuthor: 'Alberto Adélia Manhice', Subject: 'Projecções do INE por distrito, idade e sexo', Category: 'Estatística da Educação' };
    try { await S.downloads.save({ filename: 'Populacao_idade_escolar_Tete.xlsx', data: new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]) }); } catch {}
  };
  const imp = async () => {
    const f = await window.educstat.openFile(['xlsx', 'xls', 'csv']); if (!f) return;
    const XLSX = window.XLSX; const wb = XLSX.read(f.dados, { type: 'array' }); const ws = wb.Sheets.Populacao || wb.Sheets[wb.SheetNames[wb.SheetNames.length - 1]];
    const by = new Map(); let n = 0;
    for (const r of XLSX.utils.sheet_to_json(ws, { defval: '' })) { if (!+r.Ano || !+r.CodDistrito || r.Idade === '' || (r.Homens === '' && r.Mulheres === '')) continue; const k = `${+r.Ano}_${+r.CodDistrito}`; const o = by.get(k) || { ano: +r.Ano, dist: +r.CodDistrito, idades: {} }; o.idades[+r.Idade] = [Math.round(+r.Homens || 0), Math.round(+r.Mulheres || 0)]; by.set(k, o); n++; }
    for (const [k, o] of by) { o.em = new Date().toISOString(); await S.db.doc(`populacao/${k}`).set(o); S.pop.set(k, o); }
    await registar('população importada', { n }); msg.textContent = `${n} linhas importadas (${by.size} distritos/ano).`;
  };
  body.append(h('div', { class: 'card' }, h('h2', { text: 'População em idade escolar (projecções do INE)' }),
    h('p', { class: 'note', text: 'Necessária para as taxas de admissão, escolarização (TBE, TLE, aos 6 anos) e conclusão. Introduza por ano e distrito, ou preencha o modelo Excel para todos os anos e distritos de uma vez.' }),
    h('div', { class: 'row' }, sel('ano', desc(ANOS).map((a) => [a, a]), 'Ano'), sel('dist', S.cod.distritos, 'Distrito'), h('button', { class: 'btn', text: 'Modelo Excel (todos os anos)', onclick: exp }), h('button', { class: 'btn', text: 'Importar Excel', onclick: imp })), g,
    h('div', { class: 'row' }, h('button', { class: 'btn primary', text: 'Gravar população', onclick: async () => {
      const o = { ano: st.ano, dist: st.dist, idades: Object.fromEntries(rows.filter((r) => r.h || r.m).map((r) => [r.a, [+r.h || 0, +r.m || 0]])), em: new Date().toISOString() };
      await S.db.doc(`populacao/${key}`).set(o); S.pop.set(key, o); await registar('população gravada', { ano: st.ano }); toast('População gravada. As taxas de cobertura já a usam.');
    } })), msg));
}

// ---------------- EXPLORADOR ----------------
const NOMES_COL = { SchoolId: (v) => S.esc.get(+v)?.nome, cdDist: distName, DistrictId: distName, EducationId: ensAbbr, ShiftId: (v) => (+v === 2 ? 'Nocturno' : +v === 1 ? 'Diurno' : null), CenterId: (v) => S.cen?.get(+v)?.nome,
  QualificationId: (v) => S.cod.qual.SNE.find((q) => q[0] === +v)?.[1], DesistenciaId: (v) => S.cod.motivos.SNE.find((q) => q[0] === +v)?.[1], DeficId: (v) => S.cod.defic.find((q) => q[0] === +v)?.[1] };
VIEWS.explorar = async (v) => {
  const st = S.ex ||= { tab: 'access' };
  v.append(h('div', {}, h('h1', { text: 'Explorar Dados' }), h('p', { class: 'lede', text: 'Veja o conteúdo das bases Access sem precisar do Access, e analise os mapas do sistema por distrito, escola, classe, idade, qualificação, motivo… com totais e exportação para Excel.' })));
  v.append(h('div', { class: 'tabs' }, [['access', 'Base Access'], ['fichas', 'Análise dos Mapas'], ['verif', 'Verificação da qualidade']].map(([k, l]) => h('button', { 'aria-selected': String(st.tab === k), text: l, onclick: () => { st.tab = k; go('explorar'); } }))));
  const body = h('div', { style: 'display:flex;flex-direction:column;gap:16px' }); v.append(body);
  if (st.tab === 'access') return explorarAccess(body);
  if (st.tab === 'verif') return explorarVerif(body);
  return explorarFichas(body);
};
async function explorarAccess(body) {
  const st = S.exa ||= { base: null, tabela: null, filtro: '', ano: '', offset: 0, ordem: null, desc: false, nomes: true, qt: '' };
  const abrir = async () => { const r = await window.educstat.mdbOpen(); if (!r) return; if (r.erro) { toast('Não foi possível abrir: ' + r.erro, 5000); return; } st.base = r; st.tabela = null; go('explorar'); };
  const top = h('div', { class: 'card' }, h('div', { class: 'row between' }, h('div', {}, h('h2', { text: st.base ? st.base.ficheiro : 'Nenhuma base aberta' }), st.base ? h('p', { class: 'note mono', text: st.base.caminho }) : null),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', text: 'Abrir base Access…', onclick: abrir }),
      st.base && S.sessao?.perfil === 3 ? h('button', { class: 'btn', text: 'Importar esta base para o sistema', onclick: () => { S.adm = { tab: 'access' }; S.accDaBase = true; location.hash = '#admin'; } }) : null)));
  body.append(top);
  if (!st.base) { body.append(h('div', { class: 'empty', text: 'Abra uma base .mdb do EducStat ou do AdultStat (de qualquer ano, nos quadros antigos ou refeitos). Nada é alterado na base: só leitura.' })); return; }
  const grupo = (n) => (n.startsWith('MSys') ? 'Sistema do Access' : n.startsWith('_Tb') ? 'Quadros refeitos (2023+)' : /^(March|Dec)/.test(n) ? 'Quadros antigos / AdultStat' : 'Códigos e cadastro');
  const qt = h('input', { type: 'search', placeholder: 'Procurar tabela', value: st.qt, oninput: (e) => { st.qt = e.target.value; drawList(); } });
  const list = h('div', { class: 'tw tall', style: 'max-height:640px' });
  const drawList = () => {
    const ts = st.base.tabelas.filter((t) => !t.nome.startsWith('MSys') && t.nome.toLowerCase().includes(st.qt.toLowerCase()));
    const gs = {}; for (const t of ts) (gs[grupo(t.nome)] ||= []).push(t);
    list.replaceChildren(h('table', {}, h('tbody', {}, Object.entries(gs).flatMap(([g, l]) => [h('tr', {}, h('td', { colspan: 2, style: 'font-weight:700;color:var(--brand);font-size:11px;text-transform:uppercase;letter-spacing:.05em', text: g })),
      ...l.sort((a, b) => a.nome.localeCompare(b.nome)).map((t) => h('tr', { style: t.nome === st.tabela ? 'background:var(--sel)' : 'cursor:pointer', onclick: () => { st.tabela = t.nome; st.offset = 0; st.ordem = null; drawList(); drawTab(); } }, h('td', { class: 'mono', text: t.nome }), h('td', { text: NF.format(t.linhas) })))]))));
  };
  const right = h('div', { class: 'card', style: 'min-width:0' });
  const drawTab = async () => {
    right.replaceChildren();
    if (!st.tabela) { right.append(h('div', { class: 'empty', text: 'Escolha uma tabela à esquerda.' })); return; }
    const t = st.base.tabelas.find((x) => x.nome === st.tabela);
    const temAno = t.colunas.some((c) => c === 'Ano' || c === 'Year');
    const filtro = h('input', { type: 'search', placeholder: 'Filtrar (qualquer coluna)', value: st.filtro });
    const ano = h('input', { type: 'number', placeholder: 'Ano', value: st.ano, style: 'width:6rem' });
    const aplicar = () => { st.filtro = filtro.value; st.ano = ano.value; st.offset = 0; drawTab(); };
    filtro.onkeydown = ano.onkeydown = (e) => { if (e.key === 'Enter') aplicar(); };
    const nomes = h('input', { type: 'checkbox', checked: st.nomes, onchange: (e) => { st.nomes = e.target.checked; drawTab(); } });
    right.append(h('div', { class: 'row between' }, h('h2', { class: 'mono', text: st.tabela }), h('div', { class: 'row' }, filtro, temAno ? ano : null, h('button', { class: 'btn', text: 'Filtrar', onclick: aplicar }), h('label', { class: 'chk' }, nomes, 'Mostrar nomes dos códigos'))));
    const info = h('p', { class: 'note', text: 'A carregar…' }); right.append(info);
    const r = await window.educstat.mdbRows(st.tabela, { offset: st.offset, limit: 100, filtro: st.filtro, ano: temAno ? st.ano : '', ordem: st.ordem, desc: st.desc });
    if (!r) return;
    info.textContent = `${NF.format(r.total)} linhas${st.filtro || st.ano ? ' com o filtro' : ''} · a mostrar ${r.total ? st.offset + 1 : 0}–${Math.min(st.offset + 100, r.total)}`;
    const cols = t.colunas;
    const cell = (c, v) => { if (v == null) return ''; const fn = st.nomes && NOMES_COL[c]; const nm = fn ? fn(v) : null; return nm ? `${v} · ${nm}` : String(v); };
    right.append(h('div', { class: 'tw tall' }, h('table', {}, h('thead', {}, h('tr', {}, cols.map((c) => h('th', { class: 'l', style: 'cursor:pointer', title: 'Ordenar', text: c + (st.ordem === c ? (st.desc ? ' ▼' : ' ▲') : ''), onclick: () => { st.desc = st.ordem === c ? !st.desc : false; st.ordem = c; drawTab(); } })))),
      h('tbody', {}, r.linhas.map((l) => h('tr', {}, cols.map((c) => h('td', { class: 'l', text: cell(c, l[c]) }))))))));
    right.append(h('div', { class: 'row' }, h('button', { class: 'btn', text: '← Anteriores', disabled: st.offset === 0, onclick: () => { st.offset = Math.max(0, st.offset - 100); drawTab(); } }),
      h('button', { class: 'btn', text: 'Seguintes →', disabled: st.offset + 100 >= r.total, onclick: () => { st.offset += 100; drawTab(); } }),
      h('button', { class: 'btn primary', text: 'Exportar para Excel', onclick: async () => {
        const all = await window.educstat.mdbAll(st.tabela, { filtro: st.filtro, ano: temAno ? st.ano : '', ordem: st.ordem, desc: st.desc });
        if (all.length > 1000000) { toast('Demasiadas linhas para o Excel. Use o filtro por ano.'); return; }
        const rows = st.nomes ? all.map((o) => { const x = {}; for (const c of cols) { x[c] = o[c]; const fn = NOMES_COL[c]; if (fn) x[c + ' (nome)'] = fn(o[c]) || ''; } return x; }) : all;
        const XLSX = window.XLSX; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), st.tabela.replace(/[^A-Za-z0-9_]/g, '').slice(0, 31) || 'Tabela');
        wb.Props = { Title: `${st.base.ficheiro} — ${st.tabela}`, Author: 'Alberto Adélia Manhice', LastAuthor: 'Alberto Adélia Manhice', Subject: 'Exportação de tabela de base Access', Category: 'Estatística da Educação' };
        try { await S.downloads.save({ filename: `${st.tabela.replace(/^_+/, '')}${st.ano ? '_' + st.ano : ''}.xlsx`, data: new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]) }); toast(`${NF.format(all.length)} linhas exportadas.`); } catch {}
      } })));
  };
  body.append(h('div', { style: 'display:grid;grid-template-columns:minmax(14rem,20rem) minmax(0,1fr);gap:16px;align-items:start' }, h('div', { class: 'card' }, qt, list), right));
  drawList(); drawTab();
}
// análise das fichas: cada bloco vira registos planos com dimensões e medidas
function blocosAnalise() {
  const L = [];
  L.push({ id: 'alunos', label: 'Alunos por idade (3 de Março)', dims: ['Classe', 'Idade'], meds: ['Alunos H', 'Alunos M'], rec: (f, push) => { for (const r of f.marco?.alunos || []) for (const [a, v] of Object.entries(r.id || {})) push(r, { Classe: r.cl, Idade: a }, { 'Alunos H': v[0], 'Alunos M': v[1] }); } });
  L.push({ id: 'turmasrep', label: 'Repetentes, turmas e internos', dims: ['Classe'], meds: ['Repetentes H', 'Repetentes M', 'Turmas puras', 'Turmas mistas', 'Internos H', 'Internos M'], rec: (f, push) => { for (const r of f.marco?.alunos || []) push(r, { Classe: r.cl }, { 'Repetentes H': r.rep?.[0], 'Repetentes M': r.rep?.[1], 'Turmas puras': r.tp, 'Turmas mistas': r.tm, 'Internos H': r.int?.[0], 'Internos M': r.int?.[1] }); } });
  L.push({ id: 'salas', label: 'Salas por material', dims: ['Material'], meds: ['Salas'], rec: (f, push) => { for (const [k, n] of Object.entries(f.marco?.salas || {})) push(null, { Material: (S.cod.salas.find((x) => x[0] === +k) || [0, k])[1] }, { Salas: n }); } });
  L.push({ id: 'aprovnotas', label: 'Notas por disciplina (fim do ano)', dims: ['Classe', 'Disciplina'], meds: ['Notas 0-9', 'Notas 10-13', 'Notas 14-20'], rec: (f, push) => { for (const r of f.fim?.aprov || []) for (const [d, v] of Object.entries(r.notas || {})) push(r, { Classe: r.cl, Disciplina: d }, { 'Notas 0-9': v[0], 'Notas 10-13': v[1], 'Notas 14-20': v[2] }); } });
  for (const lev of ['marco', 'fim']) for (const g of FORM[lev]) for (const b of g.blocks) {
    if (b.special) continue;
    L.push({ id: lev + ':' + b.id, label: `${b.label} (${lev === 'marco' ? '3 de Março' : 'fim do ano'})`, gen: true, b, lev });
  }
  return L;
}
async function explorarFichas(body) {
  const st = S.exf ||= { ano: ANO_MAX_DADOS - 1, dist: 'Todos', bloco: 'alunos', g1: 'Distrito', g2: '' };
  const BL = blocosAnalise(); const B = BL.find((x) => x.id === st.bloco) || BL[0];
  const sel = (k, list, lab, re = true) => h('label', { class: 'f' }, lab, h('select', { onchange: (e) => { st[k] = e.target.value; go('explorar'); } }, list.map((o) => h('option', { value: o[0], text: o[1], selected: String(o[0]) === String(st[k]) }))));
  const out = h('div', { class: 'loading', text: 'A juntar os mapas…' });
  // dimensões possíveis
  let dims = ['Distrito', 'Escola', 'Tipo', 'Ensino', 'Turno'], meds = [];
  if (B.gen) { const cs = B.b.cols(sisDe(+st.ano)); for (const c of cs) { if (c.k === 'ens' || c.k === 'tur') continue; if (c.sel || c.int) dims.push(c.label); else if (!c.text) meds.push(c.label); } }
  else { dims = [...dims, ...B.dims]; meds = B.meds; }
  if (!dims.includes(st.g1)) st.g1 = 'Distrito'; if (st.g2 && !dims.includes(st.g2)) st.g2 = '';
  body.append(h('div', { class: 'card' }, h('div', { class: 'row' }, sel('ano', desc(ANOS).map((a) => [a, a]), 'Ano'), sel('dist', [['Todos', 'Província (todos)'], ...S.cod.distritos], 'Distrito'),
    sel('bloco', BL.map((x) => [x.id, x.label]), 'Quadro'), sel('g1', dims.map((d) => [d, d]), 'Agrupar por'), sel('g2', [['', '—'], ...dims.map((d) => [d, d])], 'e por'))), out);
  const regs = [];
  const dists = st.dist === 'Todos' ? S.cod.distritos.map((d) => d[0]) : [+st.dist];
  for (const d of dists) {
    for (const f of (await fichasEfectivas(+st.ano, d, !!S.db)).values()) {
      const e = S.esc.get(f.esc);
      const base = (r) => ({ Distrito: distName(f.dist), Escola: e?.nome || String(f.esc), Tipo: e?.tipo || '', Ensino: r?.ens ? ensAbbr(r.ens) : '—', Turno: r?.tur === 2 ? 'Nocturno' : r?.tur ? 'Diurno' : '—' });
      const push = (r, dd, mm) => regs.push({ ...base(r), ...dd, ...Object.fromEntries(Object.entries(mm).map(([k, v_]) => [k, +v_ || 0])) });
      if (B.gen) {
        const raw = B.b.flat ? f[B.lev]?.[B.b.id] || [] : B.b.from(f[B.lev]?.[B.b.id]);
        const cs = B.b.cols(f.sis);
        for (const r of raw) { const dd = {}, mm = {}; for (const c of cs) { if (c.k === 'ens' || c.k === 'tur') continue; if (c.sel) dd[c.label] = (c.sel.find((o) => +o[0] === +r[c.k]) || [0, r[c.k]])[1]; else if (c.int) dd[c.label] = r[c.k]; else if (!c.text) mm[c.label] = r[c.k]; } push(r, dd, mm); }
      } else B.rec(f, push);
    }
  }
  const grp = new Map();
  for (const r of regs) { const k = [r[st.g1], st.g2 ? r[st.g2] : ''].join('\u0001'); const o = grp.get(k) || { a: r[st.g1], b: st.g2 ? r[st.g2] : '', n: 0, ...Object.fromEntries(meds.map((m) => [m, 0])) }; o.n++; for (const m of meds) o[m] += r[m] || 0; grp.set(k, o); }
  const linhas = [...grp.values()].sort((x, y) => String(x.a).localeCompare(String(y.a), 'pt', { numeric: true }) || String(x.b).localeCompare(String(y.b), 'pt', { numeric: true }));
  const tot = Object.fromEntries(meds.map((m) => [m, linhas.reduce((t, l) => t + l[m], 0)]));
  const exportar = async () => {
    const XLSX = window.XLSX; const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas.map((l) => ({ [st.g1]: l.a, ...(st.g2 ? { [st.g2]: l.b } : {}), ...Object.fromEntries(meds.map((m) => [m, l[m]])) }))), 'Resumo');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(regs), 'Registos');
    wb.Props = { Title: `${B.label} — ${st.ano}`, Author: 'Alberto Adélia Manhice', LastAuthor: 'Alberto Adélia Manhice', Subject: 'Análise dos mapas do EducStat Tete', Category: 'Estatística da Educação' };
    try { await S.downloads.save({ filename: `Analise_${st.bloco.replace(/[:]/g, '_')}_${st.ano}.xlsx`, data: new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]) }); } catch {}
  };
  out.replaceWith(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('p', { class: 'note', text: `${NF.format(regs.length)} registos de ${B.label.toLowerCase()} em ${st.ano}.` }), h('button', { class: 'btn primary', text: 'Exportar para Excel', onclick: exportar })),
    meds.length ? h('div', { class: 'tw tall' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { class: 'l', text: st.g1 }), st.g2 ? h('th', { class: 'l', text: st.g2 }) : null, meds.map((m) => h('th', { text: m })))),
      h('tbody', {}, linhas.map((l) => h('tr', {}, h('td', { class: 'l', text: l.a }), st.g2 ? h('td', { class: 'l', text: l.b }) : null, meds.map((m) => h('td', { text: NF.format(l[m]) }))))),
      h('tfoot', {}, h('tr', {}, h('td', { text: 'Total' }), st.g2 ? h('td') : null, meds.map((m) => h('td', { text: NF.format(tot[m]) })))))) : h('p', { class: 'note', text: 'Este quadro não tem colunas numéricas para somar. Use a exportação para ver os registos.' })));
}

async function explorarVerif(body) {
  const st = S.exv ||= { ano: ANO_MAX_DADOS - 1, dist: 'Todos', fim: true };
  const sel = (k, list, lab) => h('label', { class: 'f' }, lab, h('select', { onchange: (e) => { st[k] = e.target.value; go('explorar'); } }, list.map((o) => h('option', { value: o[0], text: o[1], selected: String(o[0]) === String(st[k]) }))));
  body.append(h('div', { class: 'card' }, h('p', { class: 'note', text: 'Passa em revista todos os mapas do ano com as regras das notas explicativas dos mapas (repetentes, turmas, aprovados, exame, órfãos, professores por classe e por habilitação) e mostra as escolas a corrigir. Clique numa escola para abrir o mapa.' }),
    h('div', { class: 'row' }, sel('ano', desc(ANOS).map((a) => [a, a]), 'Ano'), sel('dist', [['Todos', 'Província (todos)'], ...S.cod.distritos], 'Distrito'),
      h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: st.fim, onchange: (e) => { st.fim = e.target.checked; go('explorar'); } }), 'Assinalar escolas sem fim do ano'))));
  const out = h('div', { class: 'loading', text: 'A verificar…' }); body.append(out);
  // cobertura do censo (manual do SIEE, 2.3.4 e 4.1): escolas esperadas face às fichas recebidas; novas, sem ficha, com novos níveis
  const cob = h('div', { class: 'card' }, h('p', { class: 'note', text: 'A calcular a cobertura…' })); body.append(cob);
  (async () => {
    const lin = []; const tot = { esp: 0, rec: 0, falta: 0, novas: 0, novoNivel: 0, saiuNivel: 0 }; const detalhe = [];
    for (const d of (st.dist === 'Todos' ? S.cod.distritos.map((x) => x[0]) : [+st.dist])) {
      const ant = await fichasEfectivas(+st.ano - 1, d), act = await fichasEfectivas(+st.ano, d);
      const com = (m) => new Set([...m.values()].filter((f) => f.marco?.alunos?.length).map((f) => f.esc));
      const A = com(ant), B = com(act); const esp = new Set([...A].filter((e) => !S.esc.get(e)?.fecho || +S.esc.get(e).fecho > +st.ano));
      const falta = [...esp].filter((e) => !B.has(e)), novas = [...B].filter((e) => !A.has(e));
      let nn = 0, sn = 0; for (const e of B) if (A.has(e)) { const a = niveisDaFicha(ant.get(e)), b = niveisDaFicha(act.get(e)); const mais = [...b].filter((x) => !a.has(x)), menos = [...a].filter((x) => !b.has(x)); if (mais.length) { nn++; detalhe.push([distName(d), e, S.esc.get(e)?.nome || e, 'Novo nível: ' + mais.join(', ')]); } if (menos.length) { sn++; detalhe.push([distName(d), e, S.esc.get(e)?.nome || e, 'Deixou de ter: ' + menos.join(', ')]); } }
      for (const e of falta) detalhe.push([distName(d), e, S.esc.get(e)?.nome || e, 'Sem mapa este ano (tinha no ano anterior)']);
      for (const e of novas) detalhe.push([distName(d), e, S.esc.get(e)?.nome || e, 'Escola nova ou sem mapa no ano anterior']);
      tot.esp += esp.size; tot.rec += [...B].filter((e) => esp.has(e)).length; tot.falta += falta.length; tot.novas += novas.length; tot.novoNivel += nn; tot.saiuNivel += sn;
      lin.push(h('tr', {}, h('td', { class: 'l', text: distName(d) }), h('td', { text: NF.format(esp.size) }), h('td', { text: NF.format([...B].filter((e) => esp.has(e)).length) }), h('td', { text: esp.size ? P1.format([...B].filter((e) => esp.has(e)).length / esp.size) : '—' }), h('td', { class: falta.length ? 'badc' : '', text: NF.format(falta.length) }), h('td', { text: NF.format(novas.length) }), h('td', { text: NF.format(nn) }), h('td', { text: NF.format(sn) })));
    }
    cob.replaceChildren(h('h2', { text: `Cobertura do levantamento de ${st.ano}` }), h('p', { class: 'note', text: 'Escolas esperadas = escolas com alunos no ano anterior que não estão encerradas. A cobertura deve ser 100% antes de fechar o levantamento: uma escola sem mapa obriga a estimar dados em falta.' }),
      h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Distrito', 'Esperadas', 'Recebidas', 'Cobertura', 'Sem mapa', 'Novas', 'Com novo nível', 'Deixaram um nível'].map((t, i) => h('th', { class: i ? null : 'l', text: t })))), h('tbody', {}, lin),
        h('tfoot', {}, h('tr', {}, h('td', { text: 'Total' }), h('td', { text: NF.format(tot.esp) }), h('td', { text: NF.format(tot.rec) }), h('td', { text: tot.esp ? P1.format(tot.rec / tot.esp) : '—' }), h('td', { text: NF.format(tot.falta) }), h('td', { text: NF.format(tot.novas) }), h('td', { text: NF.format(tot.novoNivel) }), h('td', { text: NF.format(tot.saiuNivel) }))))),
      h('div', { class: 'row' }, h('button', { class: 'btn', text: 'Lista nominal para Excel (escolas sem mapa, novas e com mudança de nível)', onclick: async () => { const XLSX = window.XLSX; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Distrito', 'Código', 'Escola', 'Situação'], ...detalhe]), 'Lista nominal'); wb.Props = { Title: `Cobertura do levantamento ${st.ano}`, Author: 'Alberto Adélia Manhice', LastAuthor: 'Alberto Adélia Manhice', Subject: 'Escolas esperadas e mapas recebidos', Category: 'Estatística da Educação' }; try { await S.downloads.save({ filename: `Cobertura_${st.ano}.xlsx`, data: new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]) }); } catch {} } })));
  })();
  const linhas = []; const cont = new Map();
  const dists = st.dist === 'Todos' ? S.cod.distritos.map((d) => d[0]) : [+st.dist];
  for (const d of dists) for (const f of (await fichasEfectivas(+st.ano, d, true)).values()) {
    const ps = problemasFicha(f); if (st.fim && f.marco?.alunos?.length && !f.fim?.aprov?.length) ps.push('Fim do ano ainda não introduzido.');
    for (const p of ps) { linhas.push({ d, esc: f.esc, nome: S.esc.get(f.esc)?.nome || String(f.esc), p }); const tipo = p.replace(/^[^:]*: /, '').replace(/\(\d+\)/g, '(…)'); cont.set(tipo, (cont.get(tipo) || 0) + 1); }
  }
  const exportar = async () => { const XLSX = window.XLSX; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas.map((l) => ({ Ano: +st.ano, Distrito: distName(l.d), CodEscola: l.esc, Escola: l.nome, Problema: l.p }))), 'Verificacao');
    wb.Props = { Title: `Verificação da qualidade dos dados ${st.ano}`, Author: 'Alberto Adélia Manhice', LastAuthor: 'Alberto Adélia Manhice', Subject: 'Mapas com incoerências segundo as notas dos mapas', Category: 'Estatística da Educação' };
    try { await S.downloads.save({ filename: `Verificacao_${st.ano}.xlsx`, data: new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]) }); } catch {} };
  out.replaceWith(h('div', { class: 'grid2' },
    h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h2', { text: `${NF.format(linhas.length)} problemas em ${NF.format(new Set(linhas.map((l) => l.esc)).size)} escolas` }), h('button', { class: 'btn primary', text: 'Exportar para Excel', disabled: !linhas.length, onclick: exportar })),
      h('div', { class: 'tw tall' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { class: 'l', text: 'Escola' }), h('th', { class: 'l', style: 'min-width:22rem', text: 'Problema' }))),
        h('tbody', {}, linhas.slice(0, 2000).map((l) => h('tr', { style: 'cursor:pointer', onclick: () => { S.sel.ano = +st.ano; S.sel.dist = l.d; S.sel.esc = l.esc; S.draft = null; location.hash = '#lancar'; } }, h('td', { class: 'l', text: `${l.nome} (${l.esc}) · ${distName(l.d)}` }), h('td', { class: 'l', style: 'white-space:normal', text: l.p }))))))),
    h('div', { class: 'card' }, h('h2', { text: 'Por tipo de problema' }), h('div', { class: 'ilist', style: 'grid-template-columns:minmax(0,1fr) auto' }, [...cont.entries()].sort((a, b) => b[1] - a[1]).flatMap(([t, n]) => [h('div', { text: t }), h('div', { class: 'n', text: NF.format(n) })])))));
}

// ---------------- EXPORTAR PARA ACCESS ----------------
async function adminExportAccess(body) {
  const st = S.eac ||= { ano: ANO_MAX_DADOS, dist: 'Todos', alfa: true };
  const sel = (k, list, lab) => h('label', { class: 'f' }, lab, h('select', { onchange: (e) => (st[k] = e.target.value) }, list.map((o) => h('option', { value: o[0], text: o[1], selected: String(o[0]) === String(st[k]) }))));
  const msg = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
  const juntar = async () => {
    const dists = st.dist === 'Todos' ? S.cod.distritos.map((d) => d[0]) : [+st.dist]; const fichas = []; for (const d of dists) fichas.push(...(await fichasEfectivas(+st.ano, d, true)).values());
    let alfa = []; if (st.alfa) alfa = [...(await alfaFichas(+st.ano, true)).values()].filter((f) => st.dist === 'Todos' || +f.dist === +st.dist);
    return { fichas, alfa };
  };
  const escrever = async () => {
    if (+st.ano < 2023) { toast('Só se escrevem anos de 2023 em diante (quadros refeitos do Access actual).'); return; }
    if (!(await confirmBox(`Escrever os mapas de ${st.ano} (${st.dist === 'Todos' ? 'todos os distritos' : distName(st.dist)}) numa base Access? Em cada tabela, as linhas dessas escolas e desse ano são apagadas e escritas de novo. Antes de escrever, é feita uma cópia da base.`, 'Escolher a base e escrever'))) return;
    msg.replaceChildren(h('p', { class: 'note', text: 'A preparar e a escrever na base Access…' }));
    const { fichas, alfa } = await juntar();
    const r = await window.educstat.accessExport(fichas, alfa);
    if (!r) { msg.replaceChildren(); return; }
    if (r.erro) { msg.replaceChildren(h('p', { class: 'pill bad', text: r.erro })); return; }
    await registar(r.ok ? 'escrita na base Access' : 'falha ao escrever na base Access', { ano: +st.ano, n: fichas.length });
    msg.replaceChildren(h('p', { class: r.ok ? 'pill ok' : 'pill bad', text: r.ok ? `Escrita concluída. Cópia da base antes da escrita: ${r.copia}` : 'A escrita falhou. A base ficou como estava (há também uma cópia de segurança).' }),
      h('pre', { class: 'mono', style: 'white-space:pre-wrap;font-size:12px;max-height:260px;overflow:auto;background:var(--soft);padding:8px;border-radius:6px', text: r.log || '' }));
  };
  const csv = async () => {
    msg.replaceChildren(h('p', { class: 'note', text: 'A preparar os ficheiros…' }));
    const { fichas, alfa } = await juntar(); const r = await window.educstat.accessCsv(fichas, alfa);
    if (!r) { msg.replaceChildren(); return; }
    msg.replaceChildren(h('p', { class: 'pill ok', text: `${r.tabelas.length} ficheiros CSV em ${r.pasta}` }), h('p', { class: 'note', text: r.tabelas.map((t) => `${t.nome}: ${t.linhas}`).join(' · ') }));
  };
  body.append(h('div', { class: 'card' }, h('h2', { text: 'Exportar para Access' }),
    h('p', { class: 'note', text: 'Leva para a base Access do EducStat (EducStat_Dados) e do AdultStat os mapas introduzidos aqui, com os nomes exactos das tabelas e colunas (_TblEP1, _TblEP1Prof, _TblDecAlunos, MarchAlfabetizacao…). Precisa do motor do Access no Windows (vem com o Office ou com o "Microsoft Access Database Engine"). Se não houver motor, use os ficheiros CSV e importe-os no Access (Dados externos > Ficheiro de texto).' }),
    h('div', { class: 'row' }, sel('ano', desc(ANOS.filter((a) => a >= 2023)).map((a) => [a, a]), 'Ano'), sel('dist', [['Todos', 'Todos os distritos'], ...S.cod.distritos], 'Distrito'),
      h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: st.alfa, onchange: (e) => (st.alfa = e.target.checked) }), 'Incluir alfabetização e EPJA')),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', text: 'Escrever numa base Access…', onclick: escrever }), h('button', { class: 'btn', text: 'Gerar ficheiros CSV para o Access…', onclick: csv })), msg));
}

// ---------------- MENSAGENS ----------------
async function mensagensCard(v) {
  if (S.sessao?.perfil === 0) return;
  const q = await S.db.collection('mensagens').orderBy('em', 'desc').limit(40).get();
  const meu = S.sessao?.dist || 0;
  const ms = q.docs.map((d) => d.data()).filter(podeVerMsg); // só as mensagens do próprio utilizador e as dirigidas a ele
  const txt = h('textarea', { rows: 2, style: 'width:100%;font:inherit;padding:8px;border:1px solid var(--input-line);border-radius:6px;background:var(--input);color:var(--ink)', placeholder: 'Escrever uma mensagem…' });
  let anexo = null;
  const emojis = h('div', { class: 'row', style: 'gap:3px' }, ...['😀', '👍', '✅', '⚠️', '📊'].map((x) => h('button', { class: 'btn sm', text: x, title: 'Inserir emoji', onclick: () => { txt.value += x; txt.focus(); } })));
  const anexar = h('button', { class: 'btn sm', text: 'Anexar ficheiro', onclick: async () => { const r = await window.educstat.openFile(['img', 'pdf', 'docx']); if (!r?.dados) return; if (r.dados.byteLength > 5 * 1048576) { toast('O anexo excede o limite de 5 MB.'); return; } let s = ''; const b = new Uint8Array(r.dados); for (const x of b) s += String.fromCharCode(x); anexo = { nome: r.nome, dados: btoa(s) }; anexar.textContent = `Anexo: ${r.nome}`; } });
  const para = h('select', {}, h('option', { value: 0, text: meu ? 'Para a DPE (província)' : 'Para todos os distritos' }), meu ? null : S.cod.distritos.map((d) => h('option', { value: d[0], text: 'Para ' + d[1] })));
  v.append(h('div', { class: 'card' }, h('h2', { text: 'Mensagens' }), h('p', { class: 'note', text: 'Avisos entre a DPE e os distritos. Chegam aos outros computadores na sincronização (online ou por pacote).' }),
    (S.sessao?.perfil || 0) >= 2 ? h('div', { style: 'display:flex;flex-direction:column;gap:8px' }, txt, h('div', { class: 'row' }, emojis, anexar, para, h('button', { class: 'btn primary', text: 'Enviar', onclick: async () => {
      if (!txt.value.trim() && !anexo) return; const id = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      await S.db.doc(`mensagens/${id}`).set({ id, texto: txt.value.trim(), anexo, de: S.sessao.nome, deUtil: S.sessao.utilizador, deDist: meu, para: +para.value || 0, em: new Date().toISOString() });
      toast('Mensagem guardada. Segue na próxima sincronização.'); go('inicio');
    } }))) : null,
    ms.length ? h('div', { style: 'display:flex;flex-direction:column;gap:6px' }, ms.map((m) => h('div', { style: 'border-left:3px solid var(--accent);padding:4px 10px' }, h('div', { class: 'note', text: `${m.de || ''}${m.deDist ? ' (' + distName(m.deDist) + ')' : ' (DPE)'} → ${m.para ? distName(m.para) : meu ? 'DPE' : 'todos'} · ${new Date(m.em).toLocaleString('pt-PT')}` }), h('div', { text: m.texto }), m.anexo ? h('div', { class: 'note', text: `📎 ${m.anexo.nome || 'Anexo'}` }) : null))) : h('p', { class: 'note', text: 'Sem mensagens.' })));
}

// ---------------- TEMA CLARO / ESCURO ----------------
function aplicarTema(t) { if (t === 'claro' || t === 'escuro') document.documentElement.setAttribute('data-theme', t === 'escuro' ? 'dark' : 'light'); else document.documentElement.removeAttribute('data-theme'); try { localStorage.setItem('tema', t); } catch {} }
function temaActual() { try { return localStorage.getItem('tema') || 'sistema'; } catch { return 'sistema'; } }
aplicarTema(temaActual());

// ---------------- MAPAS OFICIAIS: NÚMERO DO QUADRO E COR ----------------
// Numeração dos mapas de 2024 (aproveitamento) e 2025 (3 de Março). Os mapas mudam ao longo dos anos
// (houve alterações em 2026): as correcções fazem-se em Administração > Mapas e quadros, a partir do ano em que valem.
const QDEF = {
  marco: { alunos: { EP: '1', ESG1: '1', ESG2: '1' }, prof: { EP: '2', ESG1: '2', ESG2: '2' }, profTurno: { EP: '3' }, turnosEP: { EP: '4' }, salas: { EP: '5 e 6', ESG1: '3 e 14', ESG2: '3 e 14' },
    novos: { EP: '7' }, livros: { EP: '8', ESG1: '7', ESG2: '7' }, profClasse: { EP: '9' }, manuais: { EP: '10', ESG1: '11', ESG2: '11' }, orfaos: { EP: '11', ESG1: '8', ESG2: '8' },
    profMov: { EP: '12', ESG1: '13', ESG2: '13' }, bilingue: { EP: '13' }, linguas: { EP: '14' }, defic: { EP: '15', ESG1: '6', ESG2: '6' }, mobil: { EP: '16', ESG1: '15', ESG2: '15' },
    profCap: { EP: '17', ESG1: '12', ESG2: '12' }, infra: { EP: '18', ESG1: '16', ESG2: '16' }, turnosES: { ESG1: '4', ESG2: '4' }, profiAlu: { ESG1: '5', ESG2: '5' }, profiProf: { ESG1: '5', ESG2: '5' }, profDisc: { ESG1: '10', ESG2: '10' } },
  fim: { aprov: { EP: '1', ESG1: '1', ESG2: '1' }, notas: { EP: '1 (cont.)', ESG1: '1 (cont.)', ESG2: '1 (cont.)' }, profex: { EP: '2', ESG1: '2', ESG2: '2' }, desist: { EP: '3', ESG1: '3', ESG2: '3' }, transf: { EP: '4', ESG1: '4', ESG2: '4' } },
  'alfa:marco': { prog: { ALFA: '1' }, epja: { ALFA: '2' }, disc: { ALFA: '3' }, lingua: { ALFA: '5' }, educ: { ALFA: '6' } },
  'alfa:fim': { prog: { ALFA: '1' }, epja: { ALFA: '2' }, disc: { ALFA: '3' }, existe: { ALFA: '4' } },
};
const MAPA_NOME = { EP: 'Ensino Primário', ESG1: 'ESG 1º Ciclo', ESG2: 'ESG 2º Ciclo', ALFA: 'Alfabetização e EPJA', ETP: 'Técnico-profissional' };
function quadroRef(lev, id, ano) {
  const out = { ...(QDEF[lev]?.[id] || {}) };
  const ls = (S.mapasCfg?.linhas || []).filter((l) => l.lev === lev && l.bloco === id && +l.desde <= +ano).sort((a, b) => a.desde - b.desde);
  for (const l of ls) for (const k of ['EP', 'ESG1', 'ESG2', 'ALFA']) if (l[k] !== undefined && l[k] !== null && l[k] !== '') out[k] = l[k] === '-' ? undefined : String(l[k]);
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v));
}
function qChips(lev, id, ano, niveis) {
  const q = quadroRef(lev, id, ano); const ks = Object.keys(q).filter((k) => !niveis || niveis.has(k) || k === 'ALFA');
  if (!ks.length) return null;
  return h('span', { class: 'qref', title: 'Número do quadro no mapa em papel de cada nível' }, ks.map((k) => h('span', { 'data-mapa': k, text: `${k === 'ALFA' ? '' : k + ' · '}Quadro ${q[k]}` })));
}
function niveisDaFicha(d) {
  const s = new Set();
  for (const sec of ['marco', 'fim']) for (const v of Object.values(d?.[sec] || {})) if (Array.isArray(v)) for (const r of v) if (r && r.ens) s.add(NIVEL(+r.ens));
  return s;
}
function legendaMapas(niveis) {
  return h('div', { class: 'legend-mapas' }, ['EP', 'ESG1', 'ESG2', 'ALFA'].filter((k) => !niveis || niveis.has(k)).map((k) => h('span', { 'data-mapa': k }, h('i'), `Mapa ${MAPA_NOME[k]}`)));
}
async function adminMapas(body) {
  const cfg = clone(S.mapasCfg || { linhas: [] });
  const blocos = [...Object.entries(QDEF)].flatMap(([lev, o]) => Object.keys(o).map((id) => [`${lev}|${id}`, `${lev.startsWith('alfa') ? 'Alfabetização ' : ''}${lev.endsWith('fim') ? 'fim do ano' : lev === 'marco' ? '3 de Março' : 'Abril'} · ${id}`]));
  const rows = cfg.linhas.map((l) => ({ ...l, bl: `${l.lev}|${l.bloco}` })); let gRows;
  const g = grid({ cols: [{ k: 'desde', label: 'Válido desde o ano', int: true }, { k: 'bl', label: 'Bloco', sel: blocos.map((b, i) => [i, b[1]]) }, { k: 'EP', label: 'Quadro EP', text: true }, { k: 'ESG1', label: 'Quadro ESG1', text: true }, { k: 'ESG2', label: 'Quadro ESG2', text: true }, { k: 'ALFA', label: 'Quadro Alfa/EPJA', text: true }],
    rows: (gRows = rows.map((r) => ({ ...r, bl: Math.max(0, blocos.findIndex((b) => b[0] === r.bl)) }))), ro: false, onChange: () => {}, newRow: () => ({ desde: 2026, bl: 0, EP: '', ESG1: '', ESG2: '', ALFA: '' }) });
  const tab = h('table', {}, h('thead', {}, h('tr', {}, h('th', { class: 'l', text: 'Bloco' }), ['EP', 'ESG1', 'ESG2', 'ALFA'].map((k) => h('th', { class: 'l', text: k })))),
    h('tbody', {}, blocos.map(([k, l]) => { const [lev, id] = k.split('|'); const q = quadroRef(lev, id, 9999); return h('tr', {}, h('td', { text: l }), ['EP', 'ESG1', 'ESG2', 'ALFA'].map((n) => h('td', { class: 'l', text: q[n] || '' }))); })));
  body.append(h('div', { class: 'card' }, h('h2', { text: 'Mapas e quadros' }),
    h('p', { class: 'note', text: 'Cada bloco de introdução mostra o número do quadro correspondente no mapa em papel. A numeração de base é a dos mapas de 2024 (fim do ano) e 2025 (3 de Março). Os mapas mudam com o tempo (por exemplo em 2026): acrescente aqui uma linha com o ano a partir do qual a numeração mudou. Escreva "-" para indicar que o quadro deixou de existir nesse nível.' }),
    g, h('div', { class: 'row' }, h('button', { class: 'btn primary', text: 'Gravar alterações' })),
    h('h3', { text: 'Numeração em vigor (ano mais recente)' }), h('div', { class: 'tw tall' }, tab)));
  // a grelha edita "rows" no lugar; gravar lê de lá
  body.querySelector('.btn.primary').onclick = async () => {
    const linhas = gRows.filter((r) => +r.desde).map((r) => { const [lev, bloco] = blocos[+r.bl][0].split('|'); return { desde: +r.desde, lev, bloco, EP: r.EP || '', ESG1: r.ESG1 || '', ESG2: r.ESG2 || '', ALFA: r.ALFA || '' }; });
    S.mapasCfg = { linhas, em: new Date().toISOString() }; await S.db.doc('config/mapas').set(S.mapasCfg); await registar('numeração dos mapas alterada', { n: linhas.length }); toast('Numeração dos quadros gravada.'); go('admin');
  };
}
// ---------------- SINCRONIZAÇÃO (pacotes selados e servidor online) ----------------
// Regras: a DPE (instalação central) é a única que cria e altera utilizadores, códigos, metas, mapas e levantamentos.
// Os distritos enviam fichas, escolas, centros, população e mensagens; dos utilizadores só seguem as mudanças de palavra-passe.
// Cada registo fica com a versão gravada mais recentemente (campo "em"). Os pacotes e os registos online vão cifrados
// com a chave da organização embutida na aplicação: só o EducStat Tete os consegue abrir.
const SYNC_COLS = ['escolas', 'centros', 'fichas', 'alfa', 'populacao', 'mensagens', 'utilizadores', 'config', 'registo'];
const CONFIG_LOCAL = new Set(['instalacao', 'online', 'rejeitados', 'vazio']);
async function instalacao() { if (!S.inst) { const d = await S.db.doc('config/instalacao').get(); S.inst = d.exists ? d.data() : { papel: 'central', dist: 0, id: Math.random().toString(36).slice(2, 10) }; if (!d.exists) await S.db.doc('config/instalacao').set(S.inst); } return S.inst; }
const ehCentral = () => (S.inst?.papel || 'central') === 'central';
// DPE = instalação central e utilizador da província (um administrador distrital numa máquina da DPE vê só o seu distrito)
const ehDPE = () => ehCentral() && !+(S.sessao?.dist || 0);
async function docsParaEnviar(desde, filtro = {}) {
  const inst = await instalacao(); const out = [];
  for (const c of SYNC_COLS) {
    if (c === 'config' && inst.papel !== 'central') continue;
    if (c === 'registo' && inst.papel === 'central') continue; // o registo segue dos distritos para a DPE (trilho central), não ao contrário
    // só os registos alterados desde o último envio (sem copiar a base inteira de cada vez)
    const lista = desde && S.db.__desde ? S.db.__desde(c, desde) : (await S.db.collection(c).get()).docs;
    for (const d of lista) {
      const v_ = d.data(); if (!v_) continue;
      if (c === 'config' && CONFIG_LOCAL.has(d.id)) continue;
      const userDist = c === 'utilizadores' && inst.papel !== 'central' && v_.alteradoNoDistrito && +v_.dist === +inst.dist;
      if (c === 'utilizadores' && inst.papel !== 'central' && !v_.senhaEm && !userDist) continue;
      const em = c === 'utilizadores' && inst.papel !== 'central' ? (userDist ? [v_.em || '', v_.senhaEm || ''].sort().pop() : v_.senhaEm) : v_.em || v_.criado || '';
      if (desde && em && em <= desde) continue; if (desde && !em) continue;
      if (filtro.dist && filtro.dist !== 'Todos' && v_.dist != null && +v_.dist !== +filtro.dist) continue;
      if (filtro.ano && filtro.ano !== 'Todos' && v_.ano != null && +v_.ano !== +filtro.ano) continue;
      const dados = c === 'utilizadores' && inst.papel !== 'central' && !userDist ? { utilizador: v_.utilizador, sal: v_.sal, hash: v_.hash, mudar: v_.mudar, senhaEm: v_.senhaEm } : v_;
      // distrito e destinatário de cada registo (o servidor só aceita e só mostra o que pertence ao nível de cada conta)
      const rowDist = c === 'mensagens' ? (+v_.deDist || null) : c === 'config' ? null : (v_.dist ?? null);
      const rowPara = c === 'mensagens' ? (+v_.deDist ? (+v_.para || null) : (+v_.para || 0)) : null;
      if (inst.papel !== 'central' && (['escolas', 'centros', 'populacao', 'config'].includes(c) || +rowDist !== +inst.dist)) continue;
      out.push({ c, id: d.id, em: em || '', dist: rowDist, para: rowPara, ano: v_.ano ?? null, v: dados });
    }
  }
  return out;
}
async function aplicarDocs(lista, origem) {
  const inst = await instalacao(); const daCentral = origem?.papel === 'central';
  let novos = 0, actual = 0, iguais = 0, recusados = 0, trancados = 0; const toc = new Set(); let adminCentral = false;
  // regista cada registo recusado, com o motivo, para o administrador e o super-administrador poderem ver e corrigir
  const rej = (c2, id2, v2, motivo) => { recusados++; (S.__rejBuf ||= []).push({ c: c2, id: String(id2), motivo, origem: origem?.dist ? `SDEJT ${distName(origem.dist)}` : (origem?.papel || '—'), ano: v2?.ano ?? (String(id2).match(/^(\d{4})_/) || [])[1] ?? null, dist: v2?.dist ?? null, esc: v2?.esc ?? null, em: new Date().toISOString() }); };
  window.__aSincronizar = true; let __n = 0; try {
  for (const { c, id, v } of lista) {
    if (++__n % 150 === 0) await new Promise((r) => setTimeout(r, 0)); // não bloquear a interface em lotes grandes
    if (!SYNC_COLS.includes(c) || (c === 'config' && (CONFIG_LOCAL.has(id) || !daCentral))) { rej(c, id, v, c === 'config' ? 'Configuração que não se sincroniza (própria de cada computador)' : `Colecção “${c}” não entra na sincronização`); continue; }
    if (origem?.inst && origem.inst === inst.id) { iguais++; continue; }
    const cur = await S.db.doc(`${c}/${id}`).get(); const cv = cur.exists ? cur.data() : null;
    if (c === 'utilizadores') {
      if (daCentral) {
        if (cv && (v.em || v.criado || '') <= (cv.em || cv.criado || '')) { iguais++; continue; }
        const keep = cv && (cv.senhaEm || '') > (v.senhaEm || '') ? { sal: cv.sal, hash: cv.hash, mudar: cv.mudar, senhaEm: cv.senhaEm } : {};
        await S.db.doc(`${c}/${id}`).set({ ...v, ...keep, central: true }); cv ? actual++ : novos++;
        if (v.perfil === 3 && v.activo) adminCentral = true;
      } else {
        // utilizador criado ou alterado num distrito com privilégio concedido pela DPE
        const privO = !!S.privilegios?.[origem?.dist]?.utilizadores;
        // o administrador principal do distrito (conta criada pela DPE) gere os utilizadores que o distrito cria; as contas da DPE só mudam com privilégio
        if (inst.papel === 'central' && v.alteradoNoDistrito && +v.dist === +origem.dist && +v.dist !== 0 && (!cv || +cv.dist === +v.dist) && +v.perfil >= 1 && +v.perfil <= 3 && (!cv || !cv.central || privO)) {
          if (cv && (v.em || '') <= (cv.em || '')) { iguais++; continue; }
          await S.db.doc(`${c}/${id}`).set({ ...v, central: false }); cv ? actual++ : novos++; continue;
        }
        // de um distrito só se aceita a palavra-passe nova de um utilizador que já existe
        if (!cv || (v.senhaEm || '') <= (cv.senhaEm || '')) { if (cv) iguais++; else rej(c, id, v, 'Palavra-passe recebida não é mais recente do que a que já existe, ou o utilizador não existe neste computador'); continue; }
        // e só de um utilizador desse mesmo distrito: um distrito nunca muda a palavra-passe de uma conta da DPE ou de outro distrito
        if (!+cv.dist || +cv.dist !== +(origem?.dist || -1)) { rej(c, id, v, 'Um distrito não pode alterar a conta de outro distrito ou da DPE'); continue; }
        await S.db.doc(`${c}/${id}`).update({ sal: v.sal, hash: v.hash, mudar: v.mudar, senhaEm: v.senhaEm }); actual++;
      }
      continue;
    }
    if (c === 'registo') { if (cv) { iguais++; continue; } if (inst.papel !== 'central') { rej(c, id, v, 'Registo de actividade só é guardado no servidor da DPE'); continue; } await S.db.doc(`${c}/${id}`).set(v); novos++; continue; }
    // conflito: este computador mudou o registo depois da última sincronização e o servidor também; a versão que perde fica guardada
    const ctx = S.__syncCtx; const CONFL = ['fichas', 'alfa', 'escolas'];
    if (ctx && cv && CONFL.includes(c) && (cv.em || '') > (ctx.lastPush || '') && JSON.stringify({ ...cv, em: 0, por: 0 }) !== JSON.stringify({ ...v, em: 0, por: 0 })) {
      const perde = (v.em || '') > (cv.em || '') ? cv : v; const ganha = perde === cv ? 'servidor' : 'local';
      await S.db.doc(`conflitos/${c}_${id}_${Date.now()}`).set({ c, id, em: new Date().toISOString(), ganhou: ganha, versaoPerdida: perde, emLocal: cv.em, emServidor: v.em, ano: v.ano ?? null, dist: v.dist ?? null, esc: v.esc ?? null }); ctx.conflitos++;
    }
    if (ctx) ctx.recebidos.add(`${c}/${id}`);
    if (cv && (v.em || '') <= (cv.em || '')) { iguais++; if (ctx) ctx.recebidos.delete(`${c}/${id}`); continue; }
    if (c === 'escolas' && !cv && !daCentral && !S.esc.has(+id)) { rej(c, id, v, 'Escola nova: só a DPE cria escolas no cadastro'); continue; } // escolas novas: só a DPE cria
    let vv = v;
    if ((c === 'fichas' || c === 'alfa') && inst.papel === 'central' && !daCentral) {
      // partes trancadas pela DPE não são substituídas pelo que vem do distrito
      const pref = c === 'alfa' ? 'alfa_' : '';
      const tr = ['marco', 'fim'].filter((l) => estadoTranca(v.ano, pref + l, v.dist).estado !== 'aberto');
      if (tr.length === 2) { rej(c, id, v, 'Levantamento trancado ou ano já publicado pela DPE (não se substitui)'); trancados++; continue; }
      if (tr.length) { vv = { ...v }; for (const l of tr) vv[l] = cv?.[l] || {}; trancados++; }
    }
    await S.db.doc(`${c}/${id}`).set(vv); cv ? actual++ : novos++;
    if (c === 'fichas') toc.add(v.ano + '_' + v.dist);
    if (c === 'populacao') S.pop?.set(id, v);
  }
  } finally { window.__aSincronizar = false; }
  // quando chegam os utilizadores da DPE, o administrador local de origem deixa de servir
  if (adminCentral && inst.papel !== 'central') { const a = await S.db.doc('utilizadores/admin').get(); if (a.exists && !a.data().central) await S.db.doc('utilizadores/admin').update({ activo: false }); }
  for (const k of toc) { const [a, d] = k.split('_'); await recalcResumo(+a, +d); }
  if (lista.some((x) => x.c === 'config')) await carregarTrancas();
  return { novos, actual, iguais, recusados, trancados };
}
async function syncOnline(silencioso) {
  const fase = (f) => { SYNC.fase = f; desenharEstadoSync(); };
  fase('preparar'); const cfgD = await S.db.doc('config/online').get(); const cfg = cfgD.exists ? cfgD.data() : { auto: true };
  const inst = await instalacao();
  const marca = new Date().toISOString(); // antes de recolher: o que mudar durante o envio segue na próxima vez
  // 1) primeiro recebe (e reconcilia) e só depois envia: uma versão local antiga não substitui no servidor uma versão mais recente
  fase('receber'); const p = await window.educstat.netSync(null, 'pull', cfg.lastPull || '');
  if (!p.ok) { if (!silencioso) toast(p.erro, 7000); return p; }
  const falhasCifra = p.falhasCifra || []; S.syncFalhasCifra = falhasCifra;
  if (falhasCifra.length && !p.docs.length) { const r = { ok: false, erro: `${falhasCifra.length} registos do servidor não se conseguiram abrir (chave da organização diferente ou dados estragados). A sincronização parou: confirme a chave em Administração > Sincronização.` }; if (!silencioso) toast(r.erro, 9000); return r; }
  S.__syncCtx = { lastPush: cfg.lastPush || '', recebidos: new Set(), conflitos: 0 };
  // a origem de cada registo vem da conta que o gravou no servidor (não do que o registo diz de si próprio)
  let contas = null; if (inst.papel === 'central') { fase('validar'); const c = await window.educstat.netSync(null, 'contas'); if (c?.ok) contas = new Map(c.contas.map((x) => [x.user_id, x])); }
  let tot = { novos: 0, actual: 0, iguais: 0, recusados: 0, trancados: 0 };
  S.__rejBuf = [];
  const porOrigem = new Map();
  for (const x of p.docs) {
    let o = x.dados?.origem || {};
    if (contas) { const ct = contas.get(x.autor); o = ct ? { papel: ct.papel === 'provincial' ? 'central' : 'distrito', dist: +ct.dist || 0, inst: o.inst } : { papel: 'desconhecido', dist: -1 }; }
    const k = JSON.stringify(o); (porOrigem.get(k) || porOrigem.set(k, { o, l: [] }).get(k)).l.push(x.dados);
  }
  for (const { o, l } of porOrigem.values()) { if (o.papel === 'desconhecido') { tot.recusados += l.length; for (const d of l) (S.__rejBuf ||= []).push({ c: d?.c || '?', id: String(d?.id ?? ''), motivo: 'Origem desconhecida: a conta que gravou no servidor não está reconhecida', origem: 'desconhecida', ano: d?.v?.ano ?? null, dist: d?.v?.dist ?? null, esc: d?.v?.esc ?? null, em: new Date().toISOString() }); continue; } const r = await aplicarDocs(l, o); for (const k in tot) tot[k] += r[k] || 0; }
  // junta os registos que não se conseguiram decifrar e guarda a lista (limitada), para o administrador e o super-administrador verem e corrigirem
  for (const f of falhasCifra) (S.__rejBuf ||= []).push({ c: f.colecao || '?', id: String(f.id ?? ''), motivo: 'Não se conseguiu abrir (chave da organização diferente ou dados estragados)', origem: 'servidor', ano: f.ano ?? null, dist: f.dist ?? null, esc: null, em: f.em || new Date().toISOString() });
  try { const ant = ((await S.db.doc('config/rejeitados').get()).data()?.lista) || []; const nova = [...(S.__rejBuf || []), ...ant].slice(0, 3000); await S.db.doc('config/rejeitados').set({ lista: nova, em: new Date().toISOString() }); } catch {}
  // o cursor não passa à frente de um registo que não se conseguiu abrir (volta a tentar-se na próxima vez)
  const primeiraFalha = falhasCifra.map((x) => x.em).sort()[0];
  const ultimo = primeiraFalha ? new Date(new Date(primeiraFalha).getTime() - 1).toISOString() : p.docs.length ? p.docs[p.docs.length - 1].em : cfg.lastPull;
  // 2) depois envia o que mudou aqui (sem devolver ao servidor o que acabou de chegar dele)
  const rec = S.__syncCtx.recebidos;
  fase('enviar'); const env = (await docsParaEnviar(cfg.lastPush || '')).filter((d) => !rec.has(`${d.c}/${d.id}`));
  const linhas = env.map((d) => ({ id: `${d.c}/${d.id}${d.c === 'utilizadores' && inst.papel !== 'central' ? '#' + inst.dist : ''}`, colecao: d.c, dist: d.dist, para: d.para, ano: d.ano, em: d.em || new Date().toISOString(), origem: `${inst.papel}:${inst.dist || 0}:${inst.id}`, dados: { c: d.c, id: d.id, v: d.v, origem: { papel: inst.papel, dist: inst.dist, inst: inst.id } } }));
  if (linhas.length) { fase('aplicar'); const r = await window.educstat.netSync(null, 'push', linhas); if (!r.ok) { if (!silencioso) toast(r.erro, 7000); await S.db.doc('config/online').set({ ...cfg, lastPull: ultimo || '' }); return r; } }
  const conflitos = S.__syncCtx.conflitos; S.__syncCtx = null;
  // anos acabados de publicar pela DPE: um SDEJT recebe-os inteiros (os registos são antigos, por isso não vêm na recepção normal)
  const recebidos = new Set(cfg.anosPublicadosRecebidos || []);
  if (inst.papel !== 'central') { await carregarTrancas(); for (const a of Object.keys(S.publicacao?.anos || {}).map(Number)) { if (recebidos.has(a)) continue; const pa = await window.educstat.netSync(null, 'pull', { ano: a }); if (pa?.ok) { const r = await aplicarDocs(pa.docs.map((x) => x.dados).filter((d) => +d?.v?.dist !== +inst.dist), { papel: 'central', dist: 0 }); tot.novos += r.novos; tot.actual += r.actual; recebidos.add(a); } } }
  S.lastPush = marca;
  await S.db.doc('config/online').set({ ...cfg, lastPush: marca, lastPull: ultimo || '', ultimaSync: marca, anosPublicadosRecebidos: [...recebidos], ultimoResultado: { enviados: linhas.length, ...tot, conflitos, falhasCifra: falhasCifra.length } });
  if (linhas.length || tot.novos || tot.actual) await registar('sincronização online', { n: linhas.length, novos: tot.novos, actual: tot.actual });
  if (!silencioso || conflitos || falhasCifra.length) toast(`Sincronizado: ${linhas.length} enviados, ${tot.novos} novos e ${tot.actual} actualizados recebidos.${tot.recusados ? ` ${tot.recusados} recusados.` : ''}${conflitos ? ` ${conflitos} conflito(s) guardado(s): veja Qualidade > Conflitos de sincronização.` : ''}${falhasCifra.length ? ` ${falhasCifra.length} registo(s) não se conseguiram abrir.` : ''}`, conflitos || falhasCifra.length ? 9000 : 5000);
  fase('concluir'); return { ok: true, enviados: linhas.length, ...tot };
}
let SYNC_TIMER = null;
// Sincronização quase imediata e leve:
// - uns segundos depois de cada alteração local (fichas, mensagens, utilizadores…) envia o que mudou;
// - de 2 em 2 minutos verifica se há novidades no servidor;
// - se a rede falhar, tenta de novo com intervalos crescentes (30 s, 1, 2, 4… até 10 min) e logo que o Windows diga que há rede;
// - nada se perde com um corte de energia: o que não foi enviado continua marcado com a data e segue na próxima vez.
const SYNC = { aCorrer: false, pendente: false, falhas: 0, prox: null, ultimoOk: null, estado: 'parado', fase: '', erro: '' };
async function syncAgora(motivo) {
  if (SYNC.aCorrer) { SYNC.pendente = true; return; }
  const sv = await window.educstat.servidor('estado'); if (!sv?.email) { SYNC.estado = 'sem conta'; return; }
  const c = (await S.db.doc('config/online').get()).data() || { auto: true }; if (c.auto === false && motivo !== 'manual') return;
  SYNC.aCorrer = true; SYNC.estado = 'a sincronizar'; desenharEstadoSync();
  let r; try { r = await syncOnline(true); } catch (e) { r = { ok: false, erro: String(e?.message || e) }; }
  SYNC.aCorrer = false;
  if (r?.ok) { SYNC.falhas = 0; SYNC.ultimoOk = new Date(); SYNC.estado = 'sincronizado'; SYNC.erro = ''; }
  else { SYNC.falhas++; SYNC.estado = 'sem ligação'; SYNC.erro = r?.erro || ''; agendarSync(Math.min(600, 30 * 2 ** (SYNC.falhas - 1)) * 1000); }
  desenharEstadoSync();
  if (SYNC.pendente) { SYNC.pendente = false; agendarSync(3000); }
}
function agendarSync(ms) { clearTimeout(SYNC.prox); SYNC.prox = setTimeout(() => syncAgora('agendado'), ms); }
async function iniciarSyncAuto() {
  clearInterval(SYNC_TIMER);
  const c = (await S.db.doc('config/online').get()).data() || { auto: true }; const sv = await window.educstat.servidor('estado'); S.lastPush = c.lastPush || null;
  if (c.auto === false || !sv?.email) { SYNC.estado = sv?.email ? 'desligada' : 'sem conta'; desenharEstadoSync(); return; }
  agendarSync(6000);
  SYNC_TIMER = setInterval(() => { if (!SYNC.aCorrer && SYNC.falhas === 0) syncAgora('periódico'); }, 2 * 60 * 1000);
  window.__aoAlterar = (col) => { if (SYNC_COLS.includes(col) && SYNC.falhas === 0) agendarSync(col === 'mensagens' ? 1500 : 12000); };
  if (!SYNC.__rede) { SYNC.__rede = true; window.addEventListener('online', () => { SYNC.falhas = 0; agendarSync(2000); }); }
}
function desenharEstadoSync() {
  const el = document.getElementById('side-pe'); if (!el) return;
  const t = SYNC.ultimoOk ? SYNC.ultimoOk.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : null;
  const txt = { 'a sincronizar': `A sincronizar${SYNC.fase ? ` · ${SYNC.fase}` : ''}…`, sincronizado: `Sincronizado às ${t}`, 'sem ligação': `Sem ligação${t ? ` (último às ${t})` : ''}: tenta de novo sozinho`, 'sem conta': 'Sincronização online: sem conta do servidor', desligada: 'Sincronização automática desligada' }[SYNC.estado] || '';
  const cor = { sincronizado: 'var(--ok)', 'sem ligação': 'var(--warn)', 'a sincronizar': 'var(--accent)' }[SYNC.estado] || 'var(--muted)';
  el.replaceChildren(h('span', { style: `display:inline-block;width:8px;height:8px;border-radius:50%;background:${cor};margin-right:6px` }), txt,
    SYNC.estado === 'sem ligação' && SYNC.erro ? h('span', { style: 'display:block;color:var(--warn);margin-top:2px', text: 'Motivo: ' + SYNC.erro.slice(0, 160) }) : null, h('br'), h('span', { text: 'Estatísticas da Educação · Província de Tete' }));
  el.title = SYNC.erro || '';
}
// SQL de configuração do servidor: contas por nível e regras (RLS) que só deixam cada conta ver e gravar o seu nível
const SQL_SUPABASE = `-- EducStat Tete: configuração segura do servidor (executar uma vez no SQL Editor do Supabase)
create table if not exists educstat_docs (
  id text primary key,
  colecao text not null,
  dist int,
  para int,
  ano int,
  em timestamptz not null,
  origem text,
  autor uuid default auth.uid(),
  dados text not null
);
alter table educstat_docs add column if not exists para int;
alter table educstat_docs add column if not exists autor uuid default auth.uid();
create index if not exists educstat_docs_em on educstat_docs (em);
create index if not exists educstat_docs_dist on educstat_docs (dist);

-- contas: uma provincial (DPE) e uma por distrito (SDEJT)
create table if not exists educstat_contas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  papel text not null check (papel in ('provincial', 'distrital')),
  dist int,
  nome text
);

alter table educstat_docs enable row level security;
alter table educstat_contas enable row level security;

-- retirar as regras públicas da versão anterior
drop policy if exists "educstat ler" on educstat_docs;
drop policy if exists "educstat escrever" on educstat_docs;
drop policy if exists "educstat actualizar" on educstat_docs;

-- ninguém sem conta (anon) chega às tabelas
revoke all on educstat_docs from anon;
revoke all on educstat_contas from anon;
revoke delete on educstat_docs from authenticated;

-- funções auxiliares fora do esquema exposto, com search_path vazio (recomendação do Supabase)
create schema if not exists educstat_priv;
grant usage on schema educstat_priv to authenticated;
create or replace function educstat_priv.papel() returns text language sql stable security definer set search_path = '' as
  $$ select c.papel from public.educstat_contas c where c.user_id = (select auth.uid()) $$;
create or replace function educstat_priv.dist() returns int language sql stable security definer set search_path = '' as
  $$ select c.dist from public.educstat_contas c where c.user_id = (select auth.uid()) $$;
grant execute on function educstat_priv.papel(), educstat_priv.dist() to authenticated;

drop policy if exists contas_ler on educstat_contas;
create policy contas_ler on educstat_contas for select to authenticated
  using (user_id = (select auth.uid()) or educstat_priv.papel() = 'provincial');

-- anos publicados pela DPE depois da harmonização: todos os distritos podem consultar (só ler) os mapas desses anos
create table if not exists educstat_publicados (ano int primary key, em timestamptz default now());
alter table educstat_publicados enable row level security;
revoke all on educstat_publicados from anon;
drop policy if exists publicados_ler on educstat_publicados;
create policy publicados_ler on educstat_publicados for select to authenticated using (true);
drop policy if exists publicados_dpe on educstat_publicados;
create policy publicados_dpe on educstat_publicados for all to authenticated
  using (educstat_priv.papel() = 'provincial') with check (educstat_priv.papel() = 'provincial');

drop policy if exists docs_ler on educstat_docs;
create policy docs_ler on educstat_docs for select to authenticated using (
  -- a DPE lê tudo, menos as mensagens trocadas entre dois distritos (privadas)
  (educstat_priv.papel() = 'provincial' and not (colecao = 'mensagens' and dist is not null and para is not null and para <> 0))
  or (educstat_priv.papel() = 'distrital' and (
       dist = educstat_priv.dist()
       or (colecao = 'config' and dist is null)
       -- escolas de outro distrito só com ano publicado na própria linha (o cadastro, sem ano, fica só no seu distrito)
       or (colecao = 'escolas' and ano is not null and exists (select 1 from public.educstat_publicados p where p.ano = educstat_docs.ano))
       -- presença: nome, unidade e hora (sem dados técnicos); computador, IP local e versão ficam em presenca_tec, só para a DPE e o próprio distrito
       or colecao = 'presenca'
       or (colecao in ('fichas', 'alfa') and ano in (select ano from educstat_publicados))
       or (colecao = 'mensagens' and (para = 0 or para = educstat_priv.dist())))));

drop policy if exists docs_inserir on educstat_docs;
create policy docs_inserir on educstat_docs for insert to authenticated with check (
  (select auth.uid()) is not null and autor = (select auth.uid()) and (
  educstat_priv.papel() = 'provincial'
  or (educstat_priv.papel() = 'distrital' and dist = educstat_priv.dist()
      and colecao in ('fichas', 'alfa', 'mensagens', 'presenca', 'presenca_tec', 'utilizadores', 'registo'))));
-- o registo de actividade (trilho de auditoria) só se acrescenta: não há regra de alteração para ele

drop policy if exists docs_alterar on educstat_docs;
create policy docs_alterar on educstat_docs for update to authenticated
  using (educstat_priv.papel() = 'provincial' or (educstat_priv.papel() = 'distrital' and dist = educstat_priv.dist()))
  with check ((select auth.uid()) is not null and autor = (select auth.uid()) and (educstat_priv.papel() = 'provincial'
      or (educstat_priv.papel() = 'distrital' and dist = educstat_priv.dist()
          and colecao in ('fichas', 'alfa', 'mensagens', 'presenca', 'presenca_tec', 'utilizadores'))));
-- sem regra de apagar: ninguém apaga registos através da API

-- endereço IP de cada computador ligado (registado pelo servidor; só a conta da DPE o lê)
create table if not exists educstat_ips (id text primary key, user_id uuid, ip text, dist int, em timestamptz default now());
alter table educstat_ips enable row level security;
revoke all on educstat_ips from anon;
drop policy if exists ips_ler on educstat_ips;
create policy ips_ler on educstat_ips for select to authenticated using (educstat_priv.papel() = 'provincial');
create or replace function educstat_priv.registar_ip() returns trigger language plpgsql security definer set search_path = '' as $$
declare hd json;
begin
  if new.colecao = 'presenca' then
    begin hd := current_setting('request.headers', true)::json; exception when others then hd := null; end;
    insert into public.educstat_ips (id, user_id, ip, dist, em)
      values (new.id, (select auth.uid()), coalesce(nullif(split_part(hd->>'x-forwarded-for', ',', 1), ''), hd->>'x-real-ip'), new.dist, now())
      on conflict (id) do update set ip = excluded.ip, user_id = excluded.user_id, dist = excluded.dist, em = excluded.em;
  end if;
  return new;
end $$;
drop trigger if exists educstat_ip on educstat_docs;
create trigger educstat_ip after insert or update on educstat_docs for each row execute function educstat_priv.registar_ip();
-- funções antigas (versão 1.3.1), já não usadas
drop function if exists public.educstat_papel();
drop function if exists public.educstat_dist();
-- 1.7: o autor de cada registo é sempre a conta autenticada (definido pelo servidor, não pelo programa)
create or replace function educstat_priv.carimbar_autor() returns trigger language plpgsql security definer set search_path = '' as $$
begin new.autor := (select auth.uid()); return new; end $$;
drop trigger if exists educstat_autor on educstat_docs;
create trigger educstat_autor before insert or update on educstat_docs for each row execute function educstat_priv.carimbar_autor();

-- Depois de criar as contas em Authentication > Users (Add user), registe o nível de cada uma, por exemplo:
-- insert into educstat_contas (user_id, papel, dist, nome)
--   select id, 'provincial', null, 'DPE Tete' from auth.users where email = 'dpe.tete@exemplo.mz';
-- insert into educstat_contas (user_id, papel, dist, nome)
--   select id, 'distrital', 905, 'SDEJT Marávia' from auth.users where email = 'sdejt.maravia@exemplo.mz';`;
const SQL_CONTAS = () => `-- Registar as contas dos SDEJT (substitua os emails pelos que criou em Authentication > Users)\n` + S.cod.distritosTodos.map(([d, n]) => `insert into educstat_contas (user_id, papel, dist, nome) select id, 'distrital', ${d}, 'SDEJT ${n}' from auth.users where email = 'sdejt.${codDist4(d)}@educstat-tete.mz' on conflict (user_id) do update set papel = excluded.papel, dist = excluded.dist;`).join('\n') + `\ninsert into educstat_contas (user_id, papel, dist, nome) select id, 'provincial', null, 'DPE Tete' from auth.users where email = 'dpe@educstat-tete.mz' on conflict (user_id) do update set papel = excluded.papel, dist = excluded.dist;`;
async function adminSync(body) {
  const inst = await instalacao(); const dpe = ehDPE();
  const x = S.sx ||= { dist: dpe ? 'Todos' : inst.dist, ano: 'Todos' }; if (!dpe) x.dist = inst.dist || S.sessao.dist;
  const msg = h('div', { class: 'note' });
  const sel = (k, list, lab) => h('label', { class: 'f' }, lab, h('select', { onchange: (e) => (x[k] = e.target.value) }, list.map((o) => h('option', { value: o[0], text: o[1], selected: String(o[0]) === String(x[k]) }))));
  // 1. esta instalação
  if (dpe) {
    const papel = h('select', {}, [['central', 'DPE (central)'], ['distrito', 'SDEJT (distrito)']].map((o) => h('option', { value: o[0], text: o[1], selected: o[0] === inst.papel })));
    const pdist = h('select', {}, h('option', { value: 0, text: '—' }), S.cod.distritosTodos.map((d) => h('option', { value: d[0], text: d[1], selected: d[0] === +inst.dist })));
    body.append(h('div', { class: 'card' }, h('h2', { text: 'Esta instalação' }), h('p', { class: 'note', text: 'Este computador trabalha como DPE. Só mude se o computador passar a ser de um SDEJT.' }),
      h('div', { class: 'row' }, h('label', { class: 'f' }, 'Papel', papel), h('label', { class: 'f' }, 'Distrito', pdist), h('button', { class: 'btn', text: 'Gravar', onclick: async () => {
        if (papel.value === 'distrito' && !+pdist.value) { toast('Escolha o distrito.'); return; }
        if (!(await confirmBox('Mudar o papel deste computador? Os separadores e a sincronização passam a ser os do novo nível.', 'Mudar'))) return;
        S.inst = { ...inst, papel: papel.value, dist: +pdist.value }; await S.db.doc('config/instalacao').set(S.inst); await registar('papel da instalação alterado', { alvo: papel.value }); go('admin');
      } })), h('p', { class: 'note mono', text: `Identificador: ${inst.id}` })));
  } else body.append(h('div', { class: 'card' }, h('h2', { text: `Sincronização do SDEJT de ${distName(x.dist)}` }), h('p', { class: 'note', text: `Este computador envia e recebe apenas os dados de ${distName(x.dist)}: os mapas e centros do distrito, os seus utilizadores e as mensagens trocadas com a DPE. Recebe da DPE os códigos, prazos e configurações. O servidor recusa qualquer outro distrito.` })));
  // 2. chave de cifra da organização
  const ck = await window.educstat.segChave('estado');
  const kin = h('input', { type: 'password', placeholder: 'Chave da organização (fornecida pela DPE)', style: 'min-width:20rem' });
  const kmsg = h('p', { class: 'note', text: ck.definida ? `Chave definida neste computador (impressão digital ${ck.impressao}: deve ser igual em todos os computadores).` : 'Ainda não há chave neste computador. Os pacotes e a sincronização online precisam dela.' });
  body.append(h('div', { class: 'card' }, h('h2', { text: 'Chave de cifra da organização' }),
    h('p', { class: 'note', text: dpe ? 'A DPE gera uma chave e entrega-a a cada SDEJT por um canal seguro (pessoalmente ou por telefone). Os dados viajam cifrados com ela. Quem não tiver a chave não lê nem forja pacotes. A chave fica guardada neste computador protegida pelo Windows.' : 'Introduza a chave que a DPE lhe entregou. Sem ela não é possível enviar nem receber dados.' }),
    h('div', { class: 'row' }, kin, h('button', { class: 'btn primary', text: 'Gravar chave', onclick: async () => { const r = await window.educstat.segChave('definir', kin.value.trim()); if (!r.ok) { toast(r.erro); return; } toast('Chave gravada.'); await registar('chave de cifra definida'); go('admin'); } }),
      dpe ? h('button', { class: 'btn', text: 'Gerar uma chave nova', onclick: async () => { const r = await window.educstat.segChave('gerar'); kin.type = 'text'; kin.value = r.chave; kmsg.textContent = 'Chave gerada: anote-a e entregue-a aos SDEJT. Depois carregue em "Gravar chave". Se mudar a chave, todos os computadores têm de receber a nova.'; } }) : null), kmsg));
  // 3. servidor e conta
  const sv = await window.educstat.servidor('estado');
  const email = h('input', { type: 'email', placeholder: dpe ? 'conta da DPE' : `conta do SDEJT de ${distName(x.dist)}`, value: sv.email || '', style: 'min-width:18rem' }), senha = h('input', { type: 'password', placeholder: 'palavra-passe da conta' });
  const cfg = (await S.db.doc('config/online').get()).data() || { auto: true };
  const auto = h('input', { type: 'checkbox', checked: cfg.auto !== false, onchange: async (e) => { await S.db.doc('config/online').set({ ...cfg, auto: e.target.checked }); iniciarSyncAuto(); } });
  const omsg = h('div', { class: 'note', text: cfg.ultimaSync ? `Última sincronização: ${new Date(cfg.ultimaSync).toLocaleString('pt-PT')} · ${cfg.ultimoResultado?.enviados ?? 0} enviados, ${cfg.ultimoResultado?.novos ?? 0} novos, ${cfg.ultimoResultado?.actual ?? 0} actualizados recebidos.` : 'Ainda não sincronizou online.' });
  const contaTxt = sv.email ? `Ligado como ${sv.email}${sv.conta ? ` — ${sv.conta.papel === 'provincial' ? 'nível provincial (DPE)' : 'nível distrital: ' + distName(sv.conta.dist)}` : ' — conta ainda sem nível registado no servidor'}` : 'Este computador ainda não entrou no servidor.';
  const contaErrada = sv.conta && ((dpe && sv.conta.papel !== 'provincial') || (!dpe && +sv.conta.dist !== +x.dist));
  body.append(h('div', { class: 'card' }, h('h2', { text: 'Sincronização online' }),
    h('p', { class: 'note', text: `Servidor: ${sv.url} (só HTTPS). Cada computador entra com a conta do seu nível. As regras no servidor só lhe deixam ver e gravar o que lhe pertence.` }),
    h('p', { class: contaErrada ? 'pill bad' : sv.email ? 'pill ok' : 'pill warn', text: contaErrada ? contaTxt + ' — esta conta não corresponde a este computador!' : contaTxt }),
    h('div', { class: 'row' }, h('label', { class: 'f' }, 'Conta do servidor (email)', email), h('label', { class: 'f' }, 'Palavra-passe', senha),
      h('button', { class: 'btn', text: 'Entrar no servidor', onclick: async () => { omsg.textContent = 'A entrar…'; const r = await window.educstat.netSync(null, 'entrar', { email: email.value.trim(), senha: senha.value }); senha.value = ''; if (!r.ok) { omsg.textContent = r.erro; return; } await registar('entrada no servidor', { alvo: r.email }); if (r.aviso) toast(r.aviso, 8000); iniciarSyncAuto(); go('admin'); } }),
      sv.email ? h('button', { class: 'btn warn', text: 'Sair do servidor', onclick: async () => { await window.educstat.netSync(null, 'sair'); go('admin'); } }) : null),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', text: 'Sincronizar agora', disabled: !sv.email || contaErrada, onclick: async () => { omsg.textContent = 'A sincronizar…'; const r = await syncOnline(false); if (r?.ok) go('admin'); else omsg.textContent = r?.erro || 'Falhou.'; } }),
      h('label', { class: 'chk' }, auto, 'Automática (logo após cada alteração e de 2 em 2 minutos. Se a rede falhar, tenta de novo sozinha)'),
      dpe ? h('button', { class: 'btn', text: 'Reenviar tudo', title: 'Volta a enviar e a receber todos os registos (por exemplo, depois de mudar de servidor ou de chave)', onclick: async () => { await S.db.doc('config/online').set({ ...cfg, lastPush: '', lastPull: '' }); toast('Na próxima sincronização vai tudo de novo.'); } }) : null), omsg,
    dpe ? h('details', {}, h('summary', { text: 'Configurar o servidor (uma vez, na DPE)' }),
      h('ol', { class: 'help' }, h('li', { text: 'No Supabase, abra "SQL Editor", cole o primeiro texto abaixo e carregue em "Run". Isto cria as tabelas e as regras de segurança e retira as regras públicas antigas.' }),
        h('li', { text: 'Em "Authentication > Users > Add user", crie uma conta para a DPE e uma para cada SDEJT (email e palavra-passe fortes; marque "Auto confirm").' }),
        h('li', { text: 'Ajuste os emails do segundo texto aos que criou e execute-o: regista o nível (provincial ou distrital) de cada conta.' }),
        h('li', { text: 'Em cada computador: chave de cifra, depois "Entrar no servidor" com a conta do seu nível. Entregue a cada SDEJT só a sua conta.' })),
      h('pre', { class: 'mono', style: 'white-space:pre-wrap;font-size:11.5px;background:var(--soft);padding:10px;border-radius:6px;max-height:300px;overflow:auto', text: SQL_SUPABASE }),
      h('button', { class: 'btn sm', text: 'Copiar SQL de configuração', onclick: async () => { try { await navigator.clipboard.writeText(SQL_SUPABASE); toast('Copiado.'); } catch { toast('Seleccione e copie o texto.'); } } }),
      h('pre', { class: 'mono', style: 'white-space:pre-wrap;font-size:11.5px;background:var(--soft);padding:10px;border-radius:6px;max-height:200px;overflow:auto', text: SQL_CONTAS() }),
      h('button', { class: 'btn sm', text: 'Copiar SQL das contas', onclick: async () => { try { await navigator.clipboard.writeText(SQL_CONTAS()); toast('Copiado.'); } catch {} } }),
      h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'btn sm', text: 'Usar outro servidor Supabase…', onclick: async () => {
        const url = h('input', { type: 'text', placeholder: 'https://xxxx.supabase.co', style: 'min-width:20rem' }), ch = h('input', { type: 'text', placeholder: 'sb_publishable_…' });
        const m = h('div', { class: 'modal' }, h('div', {}, h('h2', { text: 'Outro servidor' }), h('label', { class: 'f' }, 'Endereço (HTTPS, *.supabase.co)', url), h('label', { class: 'f' }, 'Chave publicável', ch),
          h('div', { class: 'row', style: 'justify-content:flex-end' }, h('button', { class: 'btn', text: 'Repor o servidor da DPE', onclick: async () => { await window.educstat.servidor('repor'); m.remove(); go('admin'); } }), h('button', { class: 'btn', text: 'Cancelar', onclick: () => m.remove() }),
            h('button', { class: 'btn primary', text: 'Gravar', onclick: async () => { const r = await window.educstat.servidor('definir', { url: url.value.trim(), chave: ch.value.trim() }); if (!r.ok) { toast(r.erro, 6000); return; } m.remove(); await registar('servidor alterado', { alvo: url.value }); go('admin'); } }))));
        document.body.append(m);
      } }))) : null));
  // 4. pacotes (sem internet)
  const exportar = async () => {
    const docs = await docsParaEnviar('', x);
    const pac = { tipo: 'educsync', versao: 3, criado: new Date().toISOString(), origem: { papel: inst.papel, dist: inst.dist, inst: inst.id, maquina: (await window.educstat.info()).maquina, utilizador: S.sessao.utilizador, filtro: { ...x } }, docs };
    const buf = await window.educstat.selar(pac);
    try { await S.downloads.save({ filename: `EducStat_${inst.papel === 'central' ? 'DPE' : distName(inst.dist).replace(/\s+/g, '_')}_${x.ano}_${new Date().toISOString().slice(0, 10)}.educsync`, data: buf }); msg.textContent = `Pacote selado com ${docs.length} registos guardado.`; await registar('pacote exportado', { n: docs.length }); } catch (e) { msg.textContent = e?.code === 'declined' ? 'Exportação cancelada.' : 'Não foi possível guardar o pacote: ' + (e?.message || e); }
  };
  // um ou vários pacotes de uma vez (a DPE pode escolher a pasta onde juntou os pacotes dos 15 distritos)
  const importarUm = async (f) => {
    const r = await window.educstat.abrirPacote(f.dados);
    if (!r.ok) return { nome: f.nome, erro: r.erro };
    const pac = r.dados;
    // um SDEJT só aceita da DPE ou do próprio distrito; a DPE aceita dos distritos
    if (!dpe && pac.origem?.papel !== 'central' && +pac.origem?.dist !== +x.dist) return { nome: f.nome, erro: 'pacote de outro distrito: recusado' };
    const pubAnos = new Set([...Object.keys(S.publicacao?.anos || {}), ...Object.keys((pac.docs.find((d) => d.c === 'config' && d.id === 'publicacao')?.v?.anos) || {})].map(Number));
    const docs = dpe ? pac.docs : pac.docs.filter((d) => d.c === 'config' || d.c === 'escolas' || (pac.origem?.papel === 'central' && ['fichas', 'alfa', 'resumo'].includes(d.c) && pubAnos.has(+d.v?.ano)) || (d.c === 'mensagens' ? (!+d.v?.para || +d.v.para === +x.dist || +d.v?.deDist === +x.dist) : d.v?.dist == null || +d.v.dist === +x.dist));
    const res = await aplicarDocs(docs, pac.origem);
    await registar('pacote importado', { ficheiro: f.nome, novos: res.novos, actual: res.actual });
    return { nome: f.nome, de: pac.origem?.papel === 'central' ? 'DPE' : distName(pac.origem?.dist) || pac.origem?.maquina || '—', criado: pac.criado, ...res, ignorados: pac.docs.length - docs.length };
  };
  const importar = async (pasta) => {
    const fs_ = await window.educstat.openFiles(['educsync', 'json'], pasta); if (!fs_?.length) { if (fs_) msg.textContent = 'Não há pacotes .educsync nessa pasta.'; return; }
    const out = []; msg.textContent = `A importar ${fs_.length} pacote(s)…`;
    // os mais antigos primeiro: se houver dois do mesmo distrito, fica o mais recente
    const lidos = []; for (const f of fs_) lidos.push(f);
    for (const [i, f] of lidos.entries()) { msg.textContent = `A importar ${i + 1} de ${lidos.length}: ${f.nome}…`; out.push(await importarUm(f)); }
    const tot = out.reduce((a, r) => ({ novos: a.novos + (r.novos || 0), actual: a.actual + (r.actual || 0), erros: a.erros + (r.erro ? 1 : 0) }), { novos: 0, actual: 0, erros: 0 });
    msg.replaceChildren(h('strong', { text: `${out.length} pacote(s): ${tot.novos} registos novos, ${tot.actual} actualizados${tot.erros ? `, ${tot.erros} com problema` : ''}.` }),
      h('div', { class: 'tw', style: 'margin-top:8px;max-height:320px' }, h('table', {}, h('thead', {}, h('tr', {}, ['Pacote', 'De', 'Criado em', 'Novos', 'Actualizados', 'Iguais', 'Recusados', 'Situação'].map((t, k) => h('th', { class: k < 3 || k === 7 ? 'l' : '', text: t })))),
        h('tbody', {}, out.map((r) => h('tr', {}, h('td', { class: 'l', text: r.nome }), h('td', { class: 'l', text: r.de || '—' }), h('td', { class: 'l', text: r.criado ? new Date(r.criado).toLocaleString('pt-PT') : '—' }),
          h('td', { text: r.novos ?? '' }), h('td', { text: r.actual ?? '' }), h('td', { text: r.iguais ?? '' }), h('td', { text: r.recusados ?? '' }), h('td', { class: 'l', style: r.erro ? 'color:var(--bad)' : 'color:var(--ok)', text: r.erro || (r.trancados ? `importado (${r.trancados} partes trancadas mantidas)` : 'importado') })))))));
  };
  body.append(h('div', { class: 'card' }, h('h2', { text: 'Pacotes selados (sem internet)' }),
    h('p', { class: 'note', text: dpe ? 'Exporte para um distrito (só os dados desse distrito e as configurações) ou para todos. Para importar os pacotes dos SDEJT de uma só vez, junte-os numa pasta e use “Importar uma pasta inteira”, ou escolha vários ficheiros com Ctrl + clique.' : `Exporte os dados de ${distName(x.dist)} para enviar à DPE (pen, e-mail, WhatsApp) e importe os pacotes da DPE. Pacotes de outros distritos são recusados.` }),
    h('div', { class: 'row' }, dpe ? sel('dist', [['Todos', 'Todos os distritos'], ...S.cod.distritosTodos], 'Para / de') : null, sel('ano', [['Todos', 'Todos os anos'], ...desc(ANOS).map((a) => [a, a])], 'Ano'),
      h('button', { class: 'btn primary', text: 'Exportar pacote', onclick: exportar }), h('button', { class: 'btn', text: 'Importar pacotes…', title: 'Pode escolher vários ficheiros de uma vez (Ctrl + clique)', onclick: () => importar(false) }), dpe ? h('button', { class: 'btn', text: 'Importar uma pasta inteira…', title: 'Importa todos os pacotes .educsync que estiverem na pasta (por exemplo, os dos 15 distritos)', onclick: () => importar(true) }) : null), msg));
}

// =====================================================================
// VERSÃO 1.2: MAPAS POR NÍVEL, NOTAS DOS QUADROS, PARÂMETROS, PRAZOS E HARMONIZAÇÃO,
// PRIVILÉGIOS, PRESENÇA ONLINE, MENSAGENS COM AVISO, EXCEL COM O ESTILO DO PROGRAMA
// =====================================================================

// ---------------- mapas da escola (um por nível de ensino) ----------------
const ORDEM_MAPAS = ['EP', 'ESG1', 'ESG2', 'ETP'];
function ensinosDoMapa(n) { return S.cod.ensinos.map((e) => +e[0]).filter((e) => NIVEL(e) === n); }
function mapasDaFicha(d) {
  const s = niveisDaFicha(d);
  for (const n of S.mapasExtra?.[d.ano + '_' + d.esc] || []) s.add(n);
  const l = ORDEM_MAPAS.filter((n) => s.has(n));
  return l.length ? l : ['EP'];
}
function temDadosNoMapa(d, lev, n) { return Object.values(d?.[lev] || {}).some((v) => Array.isArray(v) && v.some((r) => r && r.ens && NIVEL(+r.ens) === n)); }
function blockFilledMapa(d, lev, id, n) {
  if (id === 'notas') return (d.fim?.aprov || []).some((r) => NIVEL(+r.ens) === n && Object.keys(r.notas || {}).length);
  const b = d[lev]?.[id];
  if (Array.isArray(b)) return b.some((r) => !r.ens || NIVEL(+r.ens) === n);
  return blockFilled(d, lev, id);
}

// ---------------- notas explicativas e NB de cada quadro (mapas 2024/2025) ----------------
const NOTAS = {
  'marco:alunos': 'Distribuição de todos os alunos da escola (incluindo os repetentes) por idade, sexo e classe. Na coluna Repetentes indicar só os repetentes.\nFonte: livro de turma ou lista de frequência.\nTurma pura: só tem alunos de uma classe. Turma mista: tem alunos de várias classes.\nESG — Alunos internos: vivem no internato e estão administrativamente a cargo das estruturas da educação.',
  'marco:prof': 'Número de professores por habilitações pedagógicas. Preencher somente os professores que dão aulas.\nESG — NB: o professor é registado apenas uma vez. Se lecciona duas ou mais classes, regista-se na classe com mais horas.\nLegenda: CFPP – Curso de Formação de Professores Primários. IMP – Instituto Médio Pedagógico. CFP – Curso de Formação de Professores. E.H.P.P. – Escola de Habilitação de Professores Primários.',
  'marco:profTurno': 'Número de professores e número de turnos que leccionam (1 turno, 2 turnos).',
  'marco:turnosEP': 'Horário de cada turno (entrada e saída), número de alunos e de turmas por turno.',
  'marco:turnosES': 'Número de alunos por turno e classe (diurno e nocturno).',
  'marco:salas': 'Salas de aula por tipo de material de construção, turmas ao ar livre e turmas anexas.\nTrabalhadores não docentes: inclui também os membros da direcção e os professores que, por várias razões, não dão aulas.',
  'marco:novos': 'Novos ingressos na 1ª classe que frequentaram creches e jardins-de-infância, e os que entram com 6 anos de idade.',
  'marco:livros': 'Número de alunos com livro, por disciplina e classe. Ex.: os alunos da 1ª classe que têm o livro de Matemática contam-se na coluna da 1ª classe, na linha de Matemática. Faz-se o mesmo para as restantes disciplinas e classes.',
  'marco:profClasse': 'Número de professores por classe e sexo.\nNB: um professor pode ser registado em duas classes (se lecciona a 1ª e a 3ª, conta nas duas). Por isso o total deste quadro NUNCA é inferior ao total dos professores do Quadro 2.',
  'marco:manuais': 'NB: registar nas colunas respectivas os professores que, leccionando uma ou mais classes, têm manuais dessas classes.',
  'marco:orfaos': 'Número de alunos órfãos por classe: órfãos de pai, órfãos de mãe, órfãos de ambos os pais, e o total.',
  'marco:profMov': 'Situação dos professores no ano lectivo anterior: no fim do ano, falecidos, que faltaram frequentemente por motivo de saúde, que abandonaram o posto.',
  'marco:bilingue': 'Número de alunos e turmas do ensino bilingue e número de professores que leccionam disciplinas em língua materna (L1).',
  'marco:linguas': 'Assinalar a língua materna usada na modalidade de ensino bilingue, se a escola tem essa modalidade.',
  'marco:defic': 'Alunos com necessidades educativas especiais por tipo de deficiência, classe e sexo.\nCegueira: falta de percepção visual. Surdez: incapacidade de aprendizagem por via auditiva. Físico-motora: dificuldade em andar ou subir. Transtornos de fala: ausência ou dificuldade na fala. Autismo: alteração neurológica que compromete a interacção social e a comunicação. Hiperactividade: dificuldade em concentrar-se. Deficiência intelectual: dificuldade em lembrar-se.',
  'marco:mobil': 'Quantidade de mobiliário segundo o estado de conservação (bom, regular, mau) e em falta na escola (ou escola anexa).\nBOM: necessita apenas manutenção. REGULAR: necessita reparação. MAU: necessita substituição.',
  'marco:profCap': 'Professores que receberam treinamento no posto de trabalho (formação em exercício) nos 12 meses anteriores.',
  'marco:infra': 'Assinalar com X e, se possível, a quantidade: electricidade, água canalizada, internet, computadores, sanitários separados por sexo, infra-estruturas adaptadas, programa de alimentação escolar.',
  'marco:profiAlu': 'Número de alunos por área de ensino (disciplinas profissionalizantes), classe e sexo. Turmas e professores em exercício.',
  'marco:profiProf': 'Professores das disciplinas profissionalizantes em exercício, por sexo, e respectivas turmas.',
  'marco:profDisc': 'Número de professores por disciplina, classe e sexo.',
  'fim:aprov': 'Alunos existentes no fim do ano lectivo, que fizeram exame e aprovados, por classe e sexo. Número de turmas.\nAlunos no fim do ano: existem na escola, nas respectivas classes, no fim do ano lectivo.\nAprovados: podem transitar para a classe seguinte (avaliação do ano e exames, nas classes com exame).\nVERIFICAÇÃO: os aprovados não podem ser mais do que os existentes no fim do ano.',
  'fim:notas': 'Média final por disciplina: classificação final dos alunos incluindo a nota de exame (nas classes de exame), por grupos 0–9, 10–13 e 14–20.\nVERIFICAÇÃO: os alunos existentes no fim do ano devem ser iguais à soma dos alunos de cada disciplina (ex.: 50 alunos = 5 + 30 + 15 em Matemática).',
  'fim:profex': 'Professores em exercício no fim do ano lectivo, de acordo com a formação psicopedagógica (com e sem).',
  'fim:desist': 'Alunos que constam no mapa do levantamento 3 de Março e que não chegaram ao fim do ano lectivo, segundo o motivo.',
  'fim:transf': 'Alunos transferidos e entradas depois do levantamento 3 de Março.',
  'alfa:marco:prog': 'Número de alfabetizandos e turmas por programa (ano ou fase de aprendizagem), por centro e sexo. Assinalar o tipo de provedor (público ou privado, nacional ou estrangeiro).\nTurma: grupo de alfabetizandos que recebem aulas ao mesmo tempo, em geral com o mesmo alfabetizador.',
  'alfa:marco:epja': 'Número de educandos e turmas do Ensino Primário para Jovens e Adultos (EPJA) por nível, centro e sexo.',
  'alfa:marco:disc': 'Disciplinas leccionadas e número de alfabetizandos e educandos que possuem livro, por disciplina.',
  'alfa:marco:lingua': 'Alfabetizandos segundo a língua em que aprendem (portuguesa ou moçambicana) e, se moçambicana, qual.',
  'alfa:marco:educ': 'Alfabetizadores e educadores com e sem formação pedagógica.',
  'alfa:fim:prog': 'Alfabetizandos existentes no fim do ano, que fizeram exame e aprovados.',
  'alfa:fim:epja': 'Educandos existentes no fim do ano, que fizeram exame e aprovados.',
  'alfa:fim:disc': 'Alfabetizandos e educandos aprovados por disciplina.',
  'alfa:fim:existe': 'Sumarização dos alfabetizandos e educandos existentes no fim do ano.',
};
function notaInfo(lev, id) {
  const t = (S.notasCfg || {})[`${lev}:${id}`] || NOTAS[`${lev}:${id}`];
  if (!t) return null;
  return h('span', { class: 'info', tabindex: 0, role: 'note', 'aria-label': 'Notas explicativas', 'data-tip': t }, 'i');
}

// ---------------- parâmetros de visualização ----------------
function lerParam() { try { return JSON.parse(localStorage.getItem('parametros') || '{}') || {}; } catch { return {}; } }
function aplicarParametros() {
  const p = S.param = lerParam();
  S.cod.distritosTodos ||= S.cod.distritos;
  S.cod.distritos = p.dists?.length ? S.cod.distritosTodos.filter((d) => p.dists.includes(d[0])) : S.cod.distritosTodos;
  if (!S.cod.distritos.length) S.cod.distritos = S.cod.distritosTodos;
  const ini = Math.max(2004, Math.min(+p.anoIni || ANO_MIN, ANO_MAX_DADOS));
  const fim = Math.max(ini, +p.anoFim || Math.max(ANO_NOVO, ANO_MAX_DADOS + 1));
  ANOS.length = 0; for (let a = ini; a <= fim; a++) ANOS.push(a);
  if (p.tipo) S.pf.tipo = p.tipo;
  if (!ANOS.includes(S.pf.ano)) S.pf.ano = Math.min(ANO_MAX_DADOS - 1, ANOS[ANOS.length - 1]);
  if (!S.cod.distritos.some((d) => d[0] === +S.sel.dist)) S.sel.dist = S.cod.distritos[0][0];
}
function abrirParametros() {
  const p = lerParam(); const anos = []; for (let a = 2004; a <= Math.max(ANO_NOVO, ANO_MAX_DADOS + 1); a++) anos.push(a);
  const ini = h('select', {}, desc(anos).map((a) => h('option', { value: a, text: a, selected: a === (+p.anoIni || ANO_MIN) })));
  const fim = h('select', {}, h('option', { value: '', text: 'Último disponível' }), desc(anos).map((a) => h('option', { value: a, text: a, selected: a === +p.anoFim })));
  const tipo = h('select', {}, ['Todos', 'Pública', 'Privada', 'Comunitária'].map((t) => h('option', { value: t, text: t === 'Todos' ? 'Todos os tipos' : t, selected: t === (p.tipo || 'Todos') })));
  const ds = S.cod.distritosTodos.map(([d, n]) => { const c = h('input', { type: 'checkbox', value: d, checked: !p.dists?.length || p.dists.includes(d) }); return h('label', { class: 'chk' }, c, n); });
  const todos = h('button', { class: 'btn sm', text: 'Todos', onclick: () => ds.forEach((l) => (l.firstChild.checked = true)) });
  const nenhum = h('button', { class: 'btn sm', text: 'Nenhum', onclick: () => ds.forEach((l) => (l.firstChild.checked = false)) });
  const m = h('div', { class: 'modal' }, h('div', { style: 'max-width:40rem' }, h('h2', { text: 'Parâmetros de visualização' }),
    h('p', { class: 'note', text: 'Escolha os anos e os distritos que aparecem nos menus, no painel e nas listas. Os dados não são alterados. É só o que se mostra neste computador, para si. Os dados das bases Access começam em 2004.' }),
    h('div', { class: 'row' }, h('label', { class: 'f' }, 'Desde o ano', ini), h('label', { class: 'f' }, 'Até ao ano', fim), h('label', { class: 'f' }, 'Tipo de escola no painel', tipo)),
    h('div', { class: 'row between' }, h('strong', { text: 'Distritos' }), h('div', { class: 'row' }, todos, nenhum)),
    h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(10rem,1fr));gap:4px 12px' }, ds),
    h('div', { class: 'row', style: 'justify-content:flex-end' }, h('button', { class: 'btn', text: 'Repor', onclick: () => { try { localStorage.removeItem('parametros'); } catch {} m.remove(); aplicarParametros(); go(current || 'inicio'); } }),
      h('button', { class: 'btn', text: 'Cancelar', onclick: () => m.remove() }),
      h('button', { class: 'btn primary', text: 'Aplicar', onclick: () => {
        const sel = ds.filter((l) => l.firstChild.checked).map((l) => +l.firstChild.value);
        const np = { anoIni: +ini.value, anoFim: fim.value ? +fim.value : null, tipo: tipo.value, dists: sel.length === S.cod.distritosTodos.length ? [] : sel };
        try { localStorage.setItem('parametros', JSON.stringify(np)); } catch {}
        m.remove(); aplicarParametros(); S.fichasStatic = new Map(); go(current || 'inicio'); toast('Parâmetros aplicados.');
      } }))));
  document.body.append(m);
}

// ---------------- prazos, trancas e harmonização ----------------
const LEV_TRANCA = [['marco', '3 de Março'], ['fim', 'Fim do ano'], ['alfa_marco', 'Alfabetização (Abril)'], ['alfa_fim', 'Alfabetização (Dezembro)']];
async function carregarTrancas() { S.trancas = (await S.db.doc('config/trancas').get()).data() || {}; S.privilegios = (await S.db.doc('config/privilegios').get()).data() || {}; S.publicacao = (await S.db.doc('config/publicacao').get()).data() || { anos: {} }; }
function estadoTranca(ano, lev, dist) {
  const t = S.trancas?.[`${ano}_${lev}`]; if (!t) return { estado: 'aberto' };
  const x = t.dist?.[dist];
  if (x && x.estado && x.estado !== 'aberto') return x;
  if (t.prazo && new Date().toISOString().slice(0, 10) > t.prazo && !(x && x.estado === 'aberto' && x.reaberto)) return { estado: 'trancado', porPrazo: true, prazo: t.prazo };
  return { estado: 'aberto', prazo: t.prazo };
}
const anoPublicado = (ano) => !!S.publicacao?.anos?.[ano];
function motivoTranca(ano, lev, dist) {
  if (!+dist) return null;
  // num computador de SDEJT, os dados de outro distrito (publicados pela DPE) são só para consulta
  if (S.inst?.papel === 'distrito' && +dist !== +S.inst.dist) return `Dados de ${distName(dist)} publicados pela DPE: só para consulta.`;
  // tranca automática: 3 meses depois da data do levantamento para os SDEJT, 6 meses para a DPE (só uma reabertura feita pela DPE depois disso a levanta)
  const auto = limiteAuto(ano, lev); if (auto) {
    const dpe = ehDPE(); const lim = dpe ? auto.dpe : auto.dist; const hoje = new Date().toISOString().slice(0, 10);
    const x = S.trancas?.[`${ano}_${lev}`]?.dist?.[dist]; const reab = x?.estado === 'aberto' && x.reaberto && String(x.em).slice(0, 10) > lim;
    if (hoje > lim && !reab) { const nm = (LEV_TRANCA.find((l) => l[0] === lev) || [0, lev])[1]; return dpe ? `${nm} ${ano}: o período de correcções terminou em ${dataPT(lim)} (6 meses depois do levantamento). Para corrigir, reabra o distrito em Administração > Prazos e harmonização.` : `${nm} ${ano}: as alterações no distrito fecharam em ${dataPT(lim)} (3 meses depois do levantamento). Os dados ficam só para consulta. Para uma correcção, escreva à DPE.`; }
  }
  const e = estadoTranca(ano, lev, dist); if (e.estado === 'aberto') return null;
  const nome = (LEV_TRANCA.find((l) => l[0] === lev) || [0, lev])[1];
  if (e.estado === 'harmonizado') return `Os dados de ${distName(dist)} (${nome} ${ano}) foram harmonizados e confirmados pela DPE${e.em ? ' em ' + new Date(e.em).toLocaleDateString('pt-PT') : ''}. Só a DPE pode reabrir.`;
  if (ehDPE() && S.sessao?.perfil === 3) return null; // a DPE corrige mesmo trancado
  return e.porPrazo ? `O prazo de ${nome} ${ano} terminou em ${new Date(e.prazo).toLocaleDateString('pt-PT')}. As alterações estão trancadas pela DPE.` : `A DPE trancou as alterações de ${distName(dist)} (${nome} ${ano}).`;
}
// estado da tranca automática de um distrito: fechado para o SDEJT / para a DPE, ou reaberto pela DPE depois do limite
function autoFechado(ano, lev, dist) {
  const lim = limiteAuto(ano, lev); if (!lim) return { dist: false, dpe: false, lim: null };
  const x = S.trancas?.[`${ano}_${lev}`]?.dist?.[dist]; const hoje = new Date().toISOString().slice(0, 10);
  const reabD = x?.estado === 'aberto' && x.reaberto && String(x.em).slice(0, 10) > lim.dist ? x.em : null;
  const reabP = x?.estado === 'aberto' && x.reaberto && String(x.em).slice(0, 10) > lim.dpe ? x.em : null;
  return { dist: hoje > lim.dist && !reabD, dpe: hoje > lim.dpe && !reabP, lim, reab: reabD };
}
async function gravarTranca(ano, lev, dist, estado) {
  const k = `${ano}_${lev}`; const t = S.trancas[k] ||= { dist: {} }; t.dist ||= {};
  t.dist[dist] = { estado, por: S.sessao.utilizador, em: new Date().toISOString(), reaberto: estado === 'aberto' };
  if (estado === 'harmonizado') t.dist[dist].resumo = await resumoParaHarmonizar(ano, lev, dist);
  await S.db.doc('config/trancas').set(S.trancas);
  if (estado === 'harmonizado') {
    // a versão da DPE passa a ser a mais recente: na próxima sincronização os distritos recebem exactamente estes dados
    const em = new Date().toISOString(); let n = 0;
    const col = lev.startsWith('alfa') ? 'alfa' : 'fichas';
    for (const d of (await S.db.collection(col).where('ano', '==', +ano).get()).docs) { const v = d.data(); if (+v.dist === +dist) { await S.db.doc(`${col}/${d.id}`).set({ ...v, em, harmonizado: em }); n++; } }
    await registar('harmonização confirmada', { ano: +ano, alvo: distName(dist), n, lev });
  } else await registar(estado === 'trancado' ? 'alterações trancadas' : 'alterações reabertas', { ano: +ano, alvo: distName(dist), lev });
}
async function resumoParaHarmonizar(ano, lev, dist) {
  if (lev.startsWith('alfa')) { const m = await alfaFichas(+ano, true); const l = [...m.values()].filter((f) => +f.dist === +dist); return { fichas: l.length }; }
  const m = await fichasEfectivas(+ano, +dist, true); let al = 0, ap = 0, n = 0;
  for (const f of m.values()) { if (lev === 'marco' && f.marco?.alunos?.length) n++; if (lev === 'fim' && f.fim?.aprov?.length) n++; for (const r of f.marco?.alunos || []) for (const v of Object.values(r.id || {})) al += (+v[0] || 0) + (+v[1] || 0); for (const r of f.fim?.aprov || []) ap += (+r.aprov?.[0] || 0) + (+r.aprov?.[1] || 0); }
  return lev === 'marco' ? { fichas: n, alunos: al } : { fichas: n, aprovados: ap };
}
async function adminPrazos(body) {
  await carregarTrancas();
  const central = ehDPE();
  const st = S.tz ||= { ano: Math.min(ANO_MAX_DADOS, ANOS[ANOS.length - 1]) };
  const anoSel = h('select', { onchange: (e) => { st.ano = +e.target.value; go('admin'); } }, desc(ANOS).map((a) => h('option', { value: a, text: a, selected: a === st.ano })));
  const prazos = LEV_TRANCA.map(([k, l]) => {
    const t = S.trancas[`${st.ano}_${k}`] || {};
    const inp = h('input', { type: 'date', value: t.prazo || '', disabled: !central });
    inp.onchange = async () => { const x = S.trancas[`${st.ano}_${k}`] ||= { dist: {} }; x.prazo = inp.value || null; await S.db.doc('config/trancas').set(S.trancas); await registar('prazo alterado', { ano: st.ano, lev: k, alvo: inp.value }); toast('Prazo gravado.'); };
    return h('label', { class: 'f' }, `Prazo: ${l}`, inp);
  });
  const PILL = { aberto: ['', 'Aberto'], trancado: ['warn', 'Trancado'], harmonizado: ['ok', 'Harmonizado'], auto: ['warn', 'Fechado (automático)'] };
  if (!central) { await prazosDistrito(body, st, anoSel); return; }
  const dists = central ? S.cod.distritosTodos : S.cod.distritosTodos.filter((d) => d[0] === +S.inst.dist);
  const linhas = [];
  for (const [d, nome] of dists) {
    const cels = [];
    for (const [k] of LEV_TRANCA) {
      const e = estadoTranca(st.ano, k, d); const af = autoFechado(st.ano, k, d);
      // fechado pela tranca automática (sem reabertura): aparece como tal, com o botão Reabrir
      if (e.estado === 'aberto' && af.dist) e.estado = 'auto';
      const [cls, txt] = PILL[e.estado] || PILL.aberto;
      const info = e.estado === 'harmonizado' && e.resumo ? Object.entries(e.resumo).map(([a, b]) => `${a}: ${NF.format(b)}`).join(' · ') : e.porPrazo ? 'por fim do prazo' : e.estado === 'auto' ? `para o SDEJT desde ${dataPT(af.lim.dist)}${af.dpe ? `, para a DPE desde ${dataPT(af.lim.dpe)}` : ''}` : af.reab ? `reaberto pela DPE em ${new Date(af.reab).toLocaleDateString('pt-PT')}` : af.lim ? `aberto até ${dataPT(af.lim.dist)} (SDEJT)` : '';
      let comp = null;
      if (!central && e.estado === 'harmonizado' && e.resumo) { const meu = await resumoParaHarmonizar(st.ano, k, d); const igual = Object.keys(e.resumo).every((x) => +e.resumo[x] === +meu[x]); comp = h('span', { class: 'pill ' + (igual ? 'ok' : 'bad'), text: igual ? 'Igual à DPE' : 'Diferente da DPE: sincronize' }); }
      cels.push(h('td', { class: 'l' }, h('span', { class: 'pill ' + cls, text: txt }), info ? h('small', { style: 'display:block;color:var(--muted)', text: info }) : null, comp,
        central ? h('div', { class: 'row', style: 'gap:4px;margin-top:4px' },
          e.estado !== 'trancado' ? h('button', { class: 'btn sm', text: 'Trancar', onclick: async () => { await gravarTranca(st.ano, k, d, 'trancado'); go('admin'); } }) : null,
          e.estado !== 'aberto' ? h('button', { class: 'btn sm', text: 'Reabrir', onclick: async () => { if (await confirmBox(`Reabrir ${nome} para alterações (${(LEV_TRANCA.find((l) => l[0] === k) || [0, k])[1]} ${st.ano})?`, 'Reabrir')) { await gravarTranca(st.ano, k, d, 'aberto'); go('admin'); } } }) : null,
          e.estado !== 'harmonizado' ? h('button', { class: 'btn sm primary', text: 'Confirmar harmonização', onclick: async () => {
            if (!(await confirmBox(`Confirmar que os dados de ${nome} (${st.ano}) estão harmonizados? A versão da DPE passa a ser a oficial e segue para o distrito na próxima sincronização. O distrito deixa de poder alterar.`, 'Confirmar'))) return;
            await gravarTranca(st.ano, k, d, 'harmonizado'); toast('Harmonização confirmada.'); go('admin'); } }) : null) : null));
    }
    const chk = h('input', { type: 'checkbox', class: 'sel-dist', value: d, 'aria-label': 'Seleccionar ' + nome });
    linhas.push(h('tr', {}, h('td', { class: 'l' }, h('label', { class: 'chk', style: 'margin:0' }, chk, nome)), cels));
  }
  // vários distritos de uma vez: reabrir só os que precisam (os outros, com dados correctos, ficam como estão)
  const levB = h('select', {}, LEV_TRANCA.map(([k, l]) => h('option', { value: k, text: l })));
  const selD = () => [...body.querySelectorAll('input.sel-dist:checked')].map((x) => +x.value);
  const emMassa = async (estado) => { const ds = selD(); if (!ds.length) { toast('Marque primeiro os distritos na tabela.'); return; } const l = LEV_TRANCA.find((x) => x[0] === levB.value)[1];
    if (!(await confirmBox(`${estado === 'aberto' ? 'Reabrir' : 'Trancar'} ${l} ${st.ano} em ${ds.length} distrito(s): ${ds.map(distName).join(', ')}?`, estado === 'aberto' ? 'Reabrir' : 'Trancar'))) return;
    for (const d of ds) await gravarTranca(st.ano, levB.value, d, estado); await registar(estado === 'aberto' ? 'distritos reabertos' : 'distritos trancados', { ano: st.ano, lev: levB.value, alvo: ds.map(distName).join(', ') }); toast('Gravado. Segue para os distritos na próxima sincronização.'); syncAgora('manual'); go('admin'); };
  const barraMassa = h('div', { class: 'row', style: 'align-items:flex-end;background:var(--soft);padding:8px 10px;border-radius:10px' }, h('strong', { text: 'Distritos marcados:' }), h('label', { class: 'f' }, 'Levantamento', levB),
    h('button', { class: 'btn sm', text: 'Marcar todos', onclick: () => body.querySelectorAll('input.sel-dist').forEach((x) => (x.checked = true)) }), h('button', { class: 'btn sm', text: 'Desmarcar', onclick: () => body.querySelectorAll('input.sel-dist').forEach((x) => (x.checked = false)) }),
    h('button', { class: 'btn sm primary', text: 'Reabrir os marcados', onclick: () => emMassa('aberto') }), h('button', { class: 'btn sm', text: 'Trancar os marcados', onclick: () => emMassa('trancado') }));
  body.append(h('div', { class: 'card' }, h('h2', { text: central ? 'Prazos, trancas e harmonização' : `Estado dos dados de ${distName(S.inst.dist)}` }),
    h('p', { class: 'note', text: central ? 'Depois do prazo, as alterações dos distritos ficam trancadas automaticamente. A DPE pode trancar ou reabrir cada distrito e, no fim, confirmar a harmonização: a versão da DPE passa a ser a oficial e os distritos recebem-na na sincronização, ficando todos com os mesmos dados. Alterações que cheguem de um distrito depois de trancado são recusadas.' : 'Estado definido pela DPE. Quando a DPE confirma a harmonização, os dados do distrito ficam iguais aos da DPE após a sincronização.' }),
    h('div', { class: 'row' }, h('label', { class: 'f' }, 'Ano', anoSel), ...prazos), barraMassa,
    h('div', { class: 'tw tall' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { class: 'l', text: 'Distrito' }), LEV_TRANCA.map(([, l]) => h('th', { class: 'l', text: l })))), h('tbody', {}, linhas)))));
  // publicação: depois da harmonização de todos os distritos, os dados do ano ficam visíveis (só consulta) para todos os SDEJT
  const todosH = (lev) => S.cod.distritosTodos.every(([d]) => estadoTranca(st.ano, lev, d).estado === 'harmonizado');
  const pub = S.publicacao?.anos?.[st.ano];
  const podePub = todosH('marco') || todosH('fim');
  body.append(h('div', { class: 'card', style: 'border-left:4px solid ' + (pub ? 'var(--ok)' : 'var(--line)') }, h('h2', { text: `Publicação dos dados de ${st.ano} para todos os distritos` }),
    h('p', { class: 'note', text: pub ? `Publicado (versão ${pub.versao || 1}${pub.hash ? ', impressão ' + pub.hash.slice(0, 10) : ''}) em ${new Date(pub.em).toLocaleString('pt-PT')} por ${pub.por}. Todos os SDEJT podem consultar (sem alterar) os dados harmonizados dos outros distritos deste ano, no painel, nas publicações e em Introdução de Dados (só leitura).` : 'Quando a harmonização estiver confirmada em todos os distritos, a DPE publica o ano: cada SDEJT passa a poder consultar os dados dos outros distritos, sem os poder alterar. O servidor só entrega esses dados depois da publicação.' }),
    central ? h('div', { class: 'row' }, pub ? h('button', { class: 'btn warn', text: 'Retirar a publicação', onclick: async () => { if (!(await confirmBox(`Retirar a publicação de ${st.ano}? Os SDEJT deixam de receber os dados dos outros distritos deste ano (os que já receberam ficam no computador deles).`, 'Retirar'))) return; (S.publicacao.historico ||= []).push({ ano: +st.ano, accao: 'retirada', versao: S.publicacao.anos[st.ano]?.versao || 1, em: new Date().toISOString(), por: S.sessao.utilizador }); delete S.publicacao.anos[st.ano]; S.publicacao.em = new Date().toISOString(); await S.db.doc('config/publicacao').set(S.publicacao); await window.educstat.netSync(null, 'publicar', { ano: +st.ano, retirar: true }); await registar('publicação retirada', { ano: +st.ano }); go('admin'); } })
      : h('button', { class: 'btn primary', text: podePub ? `Publicar ${st.ano} para todos os distritos` : 'Publicar (falta harmonizar todos os distritos)', disabled: !podePub, onclick: async () => {
        if (!(await confirmBox(`Publicar os dados harmonizados de ${st.ano}? Todos os SDEJT passam a poder consultar os dados dos outros distritos deste ano, sem os alterar.`, 'Publicar'))) return;
        S.publicacao.anos ||= {}; const vAnt = Math.max(0, ...(S.publicacao.historico || []).filter((x) => +x.ano === +st.ano).map((x) => x.versao || 1)); const hashPub = await hashAno(+st.ano); S.publicacao.anos[st.ano] = { em: new Date().toISOString(), por: S.sessao.utilizador, versao: vAnt + 1, hash: hashPub }; (S.publicacao.historico ||= []).push({ ano: +st.ano, accao: 'publicada', versao: vAnt + 1, hash: hashPub, em: S.publicacao.anos[st.ano].em, por: S.sessao.utilizador }); S.publicacao.em = new Date().toISOString(); await S.db.doc('config/publicacao').set(S.publicacao);
        const r = await window.educstat.netSync(null, 'publicar', { ano: +st.ano }); if (r && !r.ok) toast('Publicado neste computador. No servidor: ' + r.erro, 7000);
        await registar('dados publicados para todos os distritos', { ano: +st.ano }); toast('Publicado. Segue na próxima sincronização.'); go('admin');
      } })) : null));
  if (central) { body.append(cartaoTrancaAuto(st.ano)); await adminPrivilegios(body); }
}
async function adminPrivilegios(body) {
  const pv = S.privilegios || {};
  body.append(h('div', { class: 'card' }, h('h2', { text: 'Privilégios dos distritos' }),
    h('p', { class: 'note', text: 'Por omissão, os utilizadores dos distritos são definidos pela DPE e ficam fixos. Aqui a DPE pode conceder a um distrito o privilégio de criar e alterar os utilizadores desse distrito (nunca os da província). As alterações feitas no distrito chegam à DPE na sincronização e só são aceites enquanto o privilégio estiver concedido.' }),
    h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { class: 'l', text: 'Distrito' }), h('th', { class: 'l', text: 'Gerir os utilizadores do distrito' }), h('th', { class: 'l', text: 'Concedido por' }))),
      h('tbody', {}, S.cod.distritosTodos.map(([d, nome]) => { const x = pv[d] || {}; const c = h('input', { type: 'checkbox', checked: !!x.utilizadores, 'aria-label': 'Privilégio de ' + nome });
        c.onchange = async () => { pv[d] = { ...x, utilizadores: c.checked, por: S.sessao.utilizador, em: new Date().toISOString() }; S.privilegios = pv; await S.db.doc('config/privilegios').set(pv); await registar(c.checked ? 'privilégio concedido' : 'privilégio retirado', { alvo: nome }); toast('Gravado. Segue para o distrito na sincronização.'); };
        return h('tr', {}, h('td', { class: 'l', text: nome }), h('td', { class: 'l' }, h('label', { class: 'chk' }, c, 'Concedido')), h('td', { class: 'l', text: x.por ? `${x.por} · ${new Date(x.em).toLocaleDateString('pt-PT')}` : '' }));
      }))))));
}
const podeGerirUtilizadores = () => S.sessao?.perfil === 3; // DPE: todos; administrador distrital (SDEJT): só o seu distrito

// ---------------- presença (quem está online) ----------------
const LOCAIS = () => [['DPE Tete', 'DPE Tete (Direcção Provincial)'], ...S.cod.distritosTodos.map(([d, n]) => [`SDEJT ${n}`, `SDEJT de ${n}`]), ['Escola/ZIP', 'Escola ou ZIP'], ['Outro', 'Outro local / em deslocação']];
let PRES_TIMER = null;
const podeVerOnline = () => DESKTOP && !!S.sessao;
function iniciarPresenca() { clearInterval(PRES_TIMER); presencaPing(); PRES_TIMER = setInterval(presencaPing, 60 * 1000); }
function listaOnline() {
  const eu = { utilizador: S.sessao.utilizador, nome: S.sessao.nome, perfil: S.sessao.perfil, dist: S.sessao.dist, local: S.sessao.local, papel: S.inst?.papel, em: new Date().toISOString(), eu: true };
  const m = new Map([[eu.utilizador + '|eu', eu]]); for (const x of S.online || []) if (x.utilizador !== eu.utilizador || x.local !== eu.local) m.set(x.utilizador + '|' + x.local, x);
  return [...m.values()];
}

// ---------------- mensagens no topo, com aviso e som ----------------
const chaveLidas = () => 'msgLidas_' + (S.sessao?.utilizador || '');
const lidasAte = () => { try { return localStorage.getItem(chaveLidas()) || ''; } catch { return ''; } };
function somAviso() {
  try { const A = new (window.AudioContext || window.webkitAudioContext)(); const t0 = A.currentTime;
    for (const [f, t] of [[880, 0], [1320, 0.16]]) { const o = A.createOscillator(), g = A.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + t); g.gain.exponentialRampToValueAtTime(0.25, t0 + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.28); o.connect(g).connect(A.destination); o.start(t0 + t); o.stop(t0 + t + 0.3); }
    setTimeout(() => A.close(), 800); } catch {}
}

// ---------------- ícones do topo e janelas flutuantes ----------------
const ICON = {
  sino: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
  pessoas: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  filtro: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/></svg>',
};
function iconBtn(nome, label, n, onclick, id) {
  const b = h('button', { class: 'ib', id, title: label, 'aria-label': label + (n ? ` (${n})` : ''), onclick }); b.innerHTML = ICON[nome];
  if (n) b.append(h('span', { class: 'badge', text: n > 99 ? '99+' : String(n) }));
  return b;
}
let POP = null;
function fecharPop() { POP?.remove(); POP = null; }
function abrirPop(tipo, arg) {
  fecharPop();
  const cont = tipo === 'msgs' ? painelMensagens(arg) : painelOnline();
  POP = h('div', { class: 'pop', role: 'dialog', 'aria-label': tipo === 'msgs' ? 'Mensagens' : 'Utilizadores online' }, cont);
  document.body.append(POP);
  setTimeout(() => { const f = (e) => { if (POP && !POP.contains(e.target) && !e.target.closest('.ib')) { fecharPop(); document.removeEventListener('mousedown', f); } }; document.addEventListener('mousedown', f); }, 0);
}

// ---------------- Excel com o aspecto do programa ----------------
(function estiloExcel() {
  const X = window.XLSX; if (!X || X.__estilo) return; X.__estilo = true;
  const BR = '0A6B45', AC = 'C98E00', LN = 'D5DED8', SOFT = 'F4F7F5';
  const borda = { top: { style: 'thin', color: { rgb: LN } }, bottom: { style: 'thin', color: { rgb: LN } }, left: { style: 'thin', color: { rgb: LN } }, right: { style: 'thin', color: { rgb: LN } } };
  const F = (o = {}) => ({ name: 'Arial', sz: 10, color: { rgb: '17242B' }, ...o });
  function estilizar(ws, nome) {
    if (!ws || !ws['!ref']) return;
    const R = X.utils.decode_range(ws['!ref']);
    const cel = (r, c) => ws[X.utils.encode_cell({ r, c })];
    // linha de cabeçalho: a primeira, nas três de cima, com pelo menos duas células de texto
    let hr = -1; for (let r = R.s.r; r <= Math.min(R.s.r + 3, R.e.r); r++) { let n = 0; for (let c = R.s.c; c <= R.e.c; c++) { const x = cel(r, c); if (x && ((x.t === 's' && String(x.v).trim()) || (x.t === 'n' && Number.isInteger(x.v) && x.v >= 1990 && x.v <= 2100))) n++; } if (n >= 2 && n >= (R.e.c - R.s.c + 1) * 0.5) { hr = r; break; } }
    const larg = [];
    for (let r = R.s.r; r <= R.e.r; r++) for (let c = R.s.c; c <= R.e.c; c++) {
      const x = cel(r, c); if (!x) continue; const txt = x.v == null ? '' : String(x.v);
      larg[c] = Math.max(larg[c] || 6, Math.min(55, txt.length + 2));
      if (r < hr) { x.s = { font: F(r === R.s.r ? { sz: 14, bold: true, color: { rgb: BR } } : { color: { rgb: '5B6B72' }, italic: true }) }; continue; }
      if (r === hr) { x.s = { font: F({ bold: true, color: { rgb: 'FFFFFF' } }), fill: { patternType: 'solid', fgColor: { rgb: BR } }, alignment: { vertical: 'center', wrapText: true, horizontal: x.t === 's' && c === R.s.c ? 'left' : 'center' }, border: { ...borda, bottom: { style: 'medium', color: { rgb: AC } } } }; continue; }
      if (hr < 0) { x.s = { font: F(r === R.s.r ? { sz: 14, bold: true, color: { rgb: BR } } : {}), alignment: { wrapText: txt.length > 80, vertical: 'top' } }; continue; }
      const corPropria = x.s?.font?.color?.rgb; const zebra = (r - hr) % 2 === 0;
      const tot = (cel(r, R.s.c)?.v + '').match(/^(Total|TOTAL|Província)/);
      const sec = x.t === 's' && c === R.s.c && R.e.c > R.s.c && [...Array(R.e.c - R.s.c)].every((_, i) => !cel(r, R.s.c + 1 + i) || cel(r, R.s.c + 1 + i).v === '' || cel(r, R.s.c + 1 + i).v == null);
      x.s = { font: F(tot || sec ? { bold: true, color: { rgb: sec ? BR : '17242B' } } : {}), border: borda,
        fill: tot ? { patternType: 'solid', fgColor: { rgb: 'E9EFED' } } : zebra ? { patternType: 'solid', fgColor: { rgb: SOFT } } : undefined,
        alignment: { vertical: 'center', horizontal: x.t === 'n' ? 'right' : 'left' } };
      if (corPropria && x.s.font) x.s.font.color = { rgb: corPropria };
      if (x.t === 'n' && !x.z) x.z = Number.isInteger(x.v) ? (Math.abs(x.v) >= 1000 && !/^(Ano|Cod|Código)/i.test(String(cel(hr, c)?.v || '')) ? '#,##0' : '0') : '#,##0.0';
    }
    if (!ws['!cols']) ws['!cols'] = larg.map((w) => ({ wch: w || 8 }));
    if (hr >= 0) { ws['!rows'] = ws['!rows'] || []; ws['!rows'][hr] = { hpt: 30 }; if (R.e.r > hr) ws['!autofilter'] = { ref: X.utils.encode_range({ s: { r: hr, c: R.s.c }, e: { r: R.e.r, c: R.e.c } }) }; }
  }
  // índice com ligações para cada folha e, em cada folha, uma ligação “◄ Índice” para voltar
  function ligarIndice(wb) {
    if (wb.SheetNames.length < 3 || wb.__indice) return; wb.__indice = true;
    const lk = (n) => `#'${n.replace(/'/g, "''")}'!A1`;
    const est = { font: { name: 'Arial', sz: 10, color: { rgb: '1F4E9A' }, underline: true } };
    let ix = wb.SheetNames.find((n) => /^[ÍI]ndice$/i.test(n));
    if (!ix) {
      ix = 'Índice'; const rows = [['Índice do ficheiro'], ['Clique no nome de uma folha para a abrir. Em cada folha, “◄ Índice” traz de volta aqui.'], [], ['Folha', 'O que contém']];
      for (const n of wb.SheetNames) { const ws = wb.Sheets[n]; const t = ws?.A1?.v; rows.push([n, t && String(t) !== n ? String(t).slice(0, 120) : '']); }
      const ws = X.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 32 }, { wch: 90 }]; wb.SheetNames.unshift(ix); wb.Sheets[ix] = ws; estilizar(ws, ix);
    }
    const wi = wb.Sheets[ix]; const R = X.utils.decode_range(wi['!ref']);
    for (let r = R.s.r; r <= R.e.r; r++) { const c = wi[X.utils.encode_cell({ r, c: 0 })]; if (c && typeof c.v === 'string' && wb.Sheets[c.v] && c.v !== ix) { c.l = { Target: lk(c.v), Tooltip: 'Abrir a folha ' + c.v }; c.s = { ...(c.s || {}), font: { ...(c.s?.font || {}), color: { rgb: '1F4E9A' }, underline: true } }; } }
    for (const n of wb.SheetNames) {
      if (n === ix) continue; const ws = wb.Sheets[n]; if (!ws || !ws['!ref']) continue;
      const Rg = X.utils.decode_range(ws['!ref']); const col = Rg.e.c + 2; const ref = X.utils.encode_cell({ r: 0, c: col });
      ws[ref] = { t: 's', v: '◄ Índice', l: { Target: lk(ix), Tooltip: 'Voltar ao índice' }, s: est };
      Rg.e.c = Math.max(Rg.e.c, col); ws['!ref'] = X.utils.encode_range(Rg);
      if (ws['!cols']) { while (ws['!cols'].length <= col) ws['!cols'].push({ wch: 10 }); ws['!cols'][col] = { wch: 12 }; }
    }
  }
  const W = X.write.bind(X);
  X.write = (wb, opts) => {
    try { for (const n of wb.SheetNames) estilizar(wb.Sheets[n], n); } catch (e) { console.warn('estilo', e); }
    try { ligarIndice(wb); } catch (e) { console.warn('índice', e); }
    wb.Props = { Author: 'Alberto Adélia Manhice', LastAuthor: 'Alberto Adélia Manhice', Company: 'DPE Tete', Category: 'Estatística da Educação', ...(wb.Props || {}) };
    wb.Props.Author = 'Alberto Adélia Manhice'; wb.Props.LastAuthor = 'Alberto Adélia Manhice';
    return W(wb, { cellStyles: true, ...opts });
  };
})();

// ---------------- gráficos pequenos (todos os indicadores) ----------------
function sparkSVG(vals, { W = 96, H = 26, cor = 'var(--accent)', marcar = true } = {}) {
  const ok = vals.map((v, i) => [i, v]).filter((p) => p[1] != null && Number.isFinite(p[1]));
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('class', 'spark'); svg.setAttribute('aria-hidden', 'true');
  if (ok.length < 2) return svg;
  const ys = ok.map((p) => p[1]); const mn = Math.min(...ys), mx = Math.max(...ys);
  const X = (i) => 2 + (i / (vals.length - 1)) * (W - 4), Y = (v) => H - 3 - ((v - mn) / ((mx - mn) || 1)) * (H - 6);
  const pl = document.createElementNS(svg.namespaceURI, 'polyline'); pl.setAttribute('points', ok.map((p) => `${X(p[0])},${Y(p[1])}`).join(' ')); pl.setAttribute('fill', 'none'); pl.setAttribute('stroke', cor); pl.setAttribute('stroke-width', '1.8'); pl.setAttribute('stroke-linejoin', 'round'); svg.append(pl);
  if (marcar) { const l = ok[ok.length - 1]; const c = document.createElementNS(svg.namespaceURI, 'circle'); c.setAttribute('cx', X(l[0])); c.setAttribute('cy', Y(l[1])); c.setAttribute('r', 2.6); c.setAttribute('fill', cor); svg.append(c); }
  return svg;
}
const serieIndicador = (() => { const cache = new Map(); return (k, f, anos) => { const key = JSON.stringify([k, f.dist, f.tipo, f.nivel, f.sexo, anos[0], anos[anos.length - 1], S.resumoDb.size]); if (!cache.has(key)) cache.set(key, anos.map((a) => indicators(sumUp(a, f), f.sexo)[k])); return cache.get(key); }; })();

// ---------------- local de trabalho ----------------
function selLocal(dist) {
  return h('select', { id: 'lg-local' }, LOCAIS().map(([v, l]) => h('option', { value: v, text: l, selected: dist ? v === `SDEJT ${distName(dist)}` : v === 'DPE Tete' })));
}

// =====================================================================
// PUBLICAÇÕES: BROCHURA ESTATÍSTICA E CARTA ESCOLAR (DISTRITO OU PROVÍNCIA) EM PDF E WORD
// =====================================================================
const PUB_COR = { br: '#0A6B45', ac: '#C98E00', H: '#2E6F8E', M: '#D2691E', HM: '#0A6B45', ln: '#D9E0DE', mu: '#5B6B72', EP: '#1F2328', ESG1: '#1B8A3A', ESG2: '#C62828' };
const esc_ = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pctTxt = (v) => (v == null ? '—' : P1.format(v));
const numTxt = (v) => (v == null ? '—' : NF.format(Math.round(v)));
const varTxt = (a, b) => (a && b != null ? `${b >= a ? 'um crescimento' : 'uma redução'} de ${R1.format(Math.abs((b - a) / a) * 100)}%` : '');

// ---- gráficos em SVG (servem para o ecrã, o PDF e, convertidos em PNG, para o Word) ----
// mapa dos distritos: com limites oficiais (GeoJSON carregado pela DPE) ou, sem eles, um mapa esquemático em mosaico
const TILES = { 905: [1, 0], 913: [2, 0], 904: [3, 0], 901: [4, 0], 910: [0, 1], 907: [1, 1], 902: [2, 1], 903: [3, 1], 912: [4, 1], 915: [2, 2], 909: [3, 2], 906: [4, 2], 911: [2, 3], 914: [4, 3], 908: [4, 4] };
function corEscala(t, inv) { const a = [[232, 243, 236], [10, 107, 69]]; if (inv) a.reverse(); const c = a[0].map((x, i) => Math.round(x + (a[1][i] - x) * t)); return `rgb(${c.join(',')})`; }
function svgMapa({ vals, fmtv, inv = false, W = 640, H = 420, legenda = '' }) {
  const ks = Object.keys(vals).filter((k) => vals[k] != null); if (!ks.length) return null;
  const vs = ks.map((k) => vals[k]); const mn = Math.min(...vs), mx = Math.max(...vs);
  const t = (v) => (mx > mn ? (v - mn) / (mx - mn) : 0.5);
  let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  const geo = S.limites;
  if (geo && window.d3) {
    const d3 = window.d3; const proj = d3.geoMercator().fitExtent([[24, 10], [W - 24, H - 60]], geo); const path = d3.geoPath(proj);
    const fora = [];
    for (const ft of geo.features) {
      const cod = codDistritoGeo(ft, S.limitesCampo); const v = cod ? vals[cod] : null;
      g += `<path d="${path(ft)}" fill="${v == null ? '#EEE' : corEscala(t(v), inv)}" stroke="#fff" stroke-width="1.2"/>`;
      if (cod) {
        const [cx, cy] = path.centroid(ft); const [[x0, y0], [x1, y1]] = path.bounds(ft); const nome = distName(cod); const larg = nome.length * 5.6 + 6;
        const pequeno = x1 - x0 < larg || y1 - y0 < 26 || path.area(ft) < 1500;
        if (!pequeno) { const dark = v != null && t(v) > 0.55 !== inv; g += `<text x="${cx}" y="${cy}" font-size="9.5" text-anchor="middle" fill="${dark ? '#fff' : '#13221B'}" font-weight="700" paint-order="stroke" stroke="${dark ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.8)'}" stroke-width="2.4">${esc_(nome)}</text><text x="${cx}" y="${cy + 11}" font-size="9" text-anchor="middle" fill="${dark ? '#fff' : '#13221B'}" paint-order="stroke" stroke="${dark ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.8)'}" stroke-width="2.4">${esc_(v == null ? '—' : fmtv(v))}</text>`; }
        else fora.push({ cx, cy, nome, val: v == null ? '—' : fmtv(v) });
      }
    }
    // distritos pequenos (ex.: Cidade de Tete): nome fora do mapa, ligado por uma linha fina
    fora.sort((a, b) => a.cy - b.cy); let ultY = -99;
    for (const f of fora) { const tw = Math.max(f.nome.length * 5.8, String(f.val).length * 5.4) + 4; let lado = f.cx > W / 2 ? 1 : -1; let lx = lado > 0 ? f.cx + 60 : f.cx - 60; if (lado > 0 && lx + tw > W - 4) { lado = -1; lx = f.cx - 60; } if (lado < 0 && lx - tw < 4) lx = tw + 6; if (lado > 0 && lx + tw > W - 4) lx = W - tw - 6; let ly = Math.max(f.cy - 26, ultY + 26, 14); ultY = ly;
      g += `<circle cx="${f.cx}" cy="${f.cy}" r="2.6" fill="#13221B"/><polyline points="${f.cx},${f.cy} ${lx - lado * 14},${ly} ${lx},${ly}" fill="none" stroke="#13221B" stroke-width="0.9"/><text x="${lx + lado * 3}" y="${ly - 2}" font-size="9.5" font-weight="700" text-anchor="${lado > 0 ? 'start' : 'end'}" fill="#13221B">${esc_(f.nome)}</text><text x="${lx + lado * 3}" y="${ly + 9}" font-size="9" text-anchor="${lado > 0 ? 'start' : 'end'}" fill="#4A5A52">${esc_(f.val)}</text>`; }
  } else {
    const cw = (W - 20) / 6, ch = (H - 70) / 5;
    for (const [cod, [c, r]] of Object.entries(TILES)) {
      const v = vals[cod]; const x = 10 + c * cw + (r % 2 ? cw * 0.25 : 0), y = 10 + r * ch; const dark = v != null && (t(v) > 0.55) !== inv;
      g += `<rect x="${x + 2}" y="${y + 2}" width="${cw - 4}" height="${ch - 4}" rx="8" fill="${v == null ? '#EEE' : corEscala(t(v), inv)}" stroke="#fff"/>`;
      g += `<text x="${x + cw / 2}" y="${y + ch / 2 - 2}" font-size="10" text-anchor="middle" font-weight="700" fill="${dark ? '#fff' : '#17242B'}">${esc_(distName(cod))}</text><text x="${x + cw / 2}" y="${y + ch / 2 + 13}" font-size="11" text-anchor="middle" fill="${dark ? '#fff' : '#17242B'}">${esc_(v == null ? '—' : fmtv(v))}</text>`;
    }
  }
  // legenda
  const lw = 220; for (let i = 0; i < 20; i++) g += `<rect x="${W - lw - 14 + (i * lw) / 20}" y="${H - 34}" width="${lw / 20 + 0.5}" height="10" fill="${corEscala(i / 19, inv)}"/>`;
  g += `<text x="${W - lw - 14}" y="${H - 40}" font-size="10" fill="${PUB_COR.mu}">${esc_(legenda)}</text><text x="${W - lw - 14}" y="${H - 12}" font-size="10" fill="${PUB_COR.mu}">${esc_(fmtv(inv ? mx : mn))}</text><text x="${W - 14}" y="${H - 12}" font-size="10" text-anchor="end" fill="${PUB_COR.mu}">${esc_(fmtv(inv ? mn : mx))}</text>`;
  if (!geo) g += `<text x="12" y="${H - 12}" font-size="9" fill="${PUB_COR.mu}">Mapa esquemático (posição aproximada dos distritos). Carregue os limites oficiais em Publicações para o mapa real.</text>`;
  return g + '</svg>';
}
function coordsEscola(e) {
  const fix = (v, lo, hi) => { if (v == null) return null; v = +v; for (let i = 0; i < 20; i++) { if (v >= lo && v <= hi) return v; if (Math.abs(v) < 1) return null; v /= 10; } return null; };
  const x = fix(e.x, 30, 36.5), y = fix(e.y, -17.5, -14); return x && y ? [x, y] : null;
}
async function svgParaPng(svg, escala = 2) {
  return new Promise((res) => {
    const m = svg.match(/width="(\d+)" height="(\d+)"/); const w = +m[1], hh = +m[2];
    const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = w * escala; c.height = hh * escala; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); res({ png: c.toDataURL('image/png').split(',')[1], w, h: hh }); };
    img.onerror = () => res(null); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

// ---- dados para as publicações ----
const NV3 = [['EP', 'Ensino Primário'], ['ESG1', 'ESG 1º Ciclo'], ['ESG2', 'ESG 2º Ciclo']];
function anosComDados(ate, n = 5) { const l = ANOS.filter((a) => a <= ate && S.cod.distritosTodos.some((d) => resumoDe(a, d[0]))); return l.slice(-n); }
const gsx = (a, sx) => (sx === 'H' ? a[0] : sx === 'M' ? a[1] : a[0] + a[1]);
function IX(ano, f, k, sexo = 'Ambos') { const x = sumUp(ano, { tipo: 'Todos', nivel: 'Todos', sexo: 'Ambos', ...f }); return x ? indicators(x, sexo)[k] : null; }
async function unidadesDistrito(ano, dist) {
  // agrupa as fichas do distrito por posto administrativo
  const fm = await fichasEfectivas(+ano, +dist); const g = new Map(); const dv = S.pubDiv || 'posto';
  const chave = (e) => (dv === 'distrito' ? distName(dist) : dv === 'localidade' ? e?.localidade || 'Sem localidade indicada' : dv === 'ambos' ? `${e?.posto || 'Sem posto'} › ${e?.localidade || 'sem localidade'}` : e?.posto || 'Sem posto indicado');
  for (const f of fm.values()) { const p = chave(S.esc.get(f.esc)); (g.get(p) || g.set(p, []).get(p)).push(f); }
  if (dv === 'ambos') { // distrito > posto (total) > localidades do posto
    const porPosto = new Map(); for (const f of fm.values()) { const p = S.esc.get(f.esc)?.posto || 'Sem posto'; (porPosto.get(p) || porPosto.set(p, []).get(p)).push(f); }
    const out = [];
    for (const [posto, fs] of [...porPosto.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt'))) {
      out.push({ nome: `${posto} (posto)`, fichas: fs, r: window.EAgg.resumo(fs, escolaTipo, formados()), posto: true });
      const locs = new Map(); for (const f of fs) { const l = S.esc.get(f.esc)?.localidade || 'sem localidade'; (locs.get(l) || locs.set(l, []).get(l)).push(f); }
      for (const [l, fl] of [...locs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt'))) out.push({ nome: `   › ${l}`, fichas: fl, r: window.EAgg.resumo(fl, escolaTipo, formados()) });
    }
    return out;
  }
  return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt')).map(([nome, fs]) => ({ nome, fichas: fs, r: window.EAgg.resumo(fs, escolaTipo, formados()) }));
}
function salasDe(fichas) { const t = {}; for (const f of fichas) for (const [k, v] of Object.entries(f.marco?.salas || {})) t[k] = (t[k] || 0) + (+v || 0); return t; }
function escolasPorNivel(fichas) { const o = { EP: 0, ESG1: 0, ESG2: 0 }; for (const f of fichas) { const s = new Set((f.marco?.alunos || []).filter((r) => Object.values(r.id || {}).some((v) => v[0] + v[1] > 0)).map((r) => NIVEL(+r.ens))); for (const n of s) if (n in o) o[n]++; } return o; }

// ---- construção do documento ----
async function construirPublicacao({ tipo, dist, ano, cont: c_cont }) {
  const prov = dist === 'Todos'; const lugar = prov ? 'Província de Tete' : `Distrito de ${distName(dist)}`; const F = { dist: prov ? 'Todos' : +dist, tipo: 'Todos', nivel: 'Todos', sexo: 'Ambos' };
  const anoFim = Math.min(+ano, ANO_MAX_DADOS); const anos = anosComDados(anoFim, 5); const A0 = anos[0], A1 = anos[anos.length - 1];
  const anosFim = anos.filter((a) => { const x = sumUp(a, F); return x && gsx(x.T.MatricFim) > 0.8 * gsx(x.T.Matric); }); const AF = anosFim[anosFim.length - 1];
  const B = []; let nT = 0, nG = 0;
  const H1 = (t) => B.push({ t: 'h1', texto: t }), H2 = (t) => B.push({ t: 'h2', texto: t }), P = (t) => t && B.push(typeof t === 'object' ? { t: 'p', ...t } : { t: 'p', texto: t });
  const TAB = (titulo, cab, linhas, fonte = 'Levantamento 3 de Março, EducStat.') => B.push({ t: 'tabela', titulo: `Tabela ${++nT}: ${lugar}: ${titulo}`, cab, linhas, fonte });
  // um gráfico guarda o desenho (ecrã e PDF) e os dados (gráfico nativo e editável no Word, folha no Excel)
  const L_ = (a) => ({ svg: svgLinhas(a), dados: { tipo: 'linha', cats: a.anos.map(String), series: a.series.map((x) => ({ nome: x.nome, cor: x.cor, vals: x.vals })), pct: a.pct !== false } });
  const B_ = (a) => ({ svg: svgBarras(a), dados: { tipo: 'barras', cats: a.cats.map(String), series: a.series.map((x) => ({ nome: x.nome, cor: x.cor, cores: x.cores, vals: x.vals })), pct: !!a.pct, horiz: !!a.horiz } });
  const GR = (titulo, g, fonte = 'Levantamento 3 de Março, EducStat.') => g?.svg && B.push({ t: 'img', titulo: `Gráfico ${++nG}: ${lugar}: ${titulo}`, svg: g.svg, dados: g.dados, fonte });
  const MAP = (titulo, svg, fonte) => svg && B.push({ t: 'img', titulo: `Mapa ${++nG}: ${lugar}: ${titulo}`, svg: molduraMapa(svg, { fonte, prov, dist }), fonte });
  const unidades = prov ? S.cod.distritosTodos.map(([d, n]) => ({ nome: n, d, r: resumoDe(anoFim, d) })) : await unidadesDistrito(anoFim, dist);
  const uSum = (u, a, f = {}) => (prov ? sumUp(a, { ...F, ...f, dist: u.d }) : a === anoFim ? sumUpRs([u.r], a, { dist: +dist, tipo: 'Todos', nivel: 'Todos', ...f }) : null);
  const uInd = (u, a, k, f = {}) => { const x = uSum(u, a, { tipo: 'Todos', nivel: 'Todos', sexo: 'Ambos', ...f }); return x ? indicators(x, 'Ambos')[k] : null; };
  const nomeU = prov ? 'Distrito' : divU().nome;
  const linhasSexo = (k, f = {}) => ({ anos, series: [['HM', 'Ambos', 'Total'], ['H', 'Homens', 'Rapazes'], ['M', 'Mulheres', 'Raparigas']].map(([c, s, n]) => ({ nome: n, cor: PUB_COR[c], vals: anos.map((a) => IX(a, { ...F, ...f }, k, s)) })) });
  const fichasAno = async () => { const out = []; for (const d of prov ? S.cod.distritosTodos.map((x) => x[0]) : [+dist]) out.push(...(await fichasEfectivas(anoFim, d)).values()); return out; };

  const versao = (await window.educstat.info()).versao;
  // a nota técnica (proveniência dos dados) vai para a página 2, a seguir à capa, junto da ficha técnica
  let NT = []; const notaTecnica = (extra = []) => { NT = [['Âmbito', lugar], ['Ano de referência', String(anoFim)], ['Período das séries', A0 === A1 ? String(A0) : `${A0}-${A1}`], ['Tipo de escola', 'Todas (pública, privada e comunitária), salvo indicação'], ['Níveis', 'Ensino Primário, ESG 1º e 2º Ciclos'], ['Fontes', 'Levantamentos 3 de Março e fim do ano (EducStat). INE, projecções da população 2007-2020 e 2017-2050'], ['Sistema', `EducStat Tete ${versao}`], ...extra]; };
  const fecho = (o) => ({ ...o, ...capaPub(prov, dist, tipo, anoFim), notaTecnica: NT, fichaTecnica: fichaTecnicaPub(o.titulo, prov, dist, tipo, anoFim, versao), blocos: tipo === 'retro' ? B : B.filter((b) => b.t !== 'quebra') });
  if (tipo === 'retro') {
    // retroalimentação às escolas (manual do SIEE, 7.4): por escola, alunos por classe e sexo, turmas, professores por sexo e formação
    const fa = prov ? [] : [...(await fichasEfectivas(anoFim, +dist)).values()].sort((a, b) => +b.esc - +a.esc); // pelo código, do maior para o menor
    const fq = formados()[sisDe(anoFim)];
    H1('Introdução');
    P(`Este documento devolve a cada escola de ${lugar} os dados que enviou no levantamento de ${anoFim}, já verificados e processados: alunos por classe e sexo, turmas e professores por sexo e formação pedagógica. Cada escola deve conferir os seus números e comunicar ao SDEJT qualquer diferença.`);
    for (const f of fa) {
      const e = S.esc.get(f.esc) || {}; B.push({ t: 'quebra' }); H1(`${e.nome || f.esc} (código ${f.esc})`);
      P(`${e.posto ? 'Posto administrativo: ' + e.posto + '. ' : ''}${e.localidade ? 'Localidade: ' + e.localidade + '. ' : ''}Tipo: ${e.tipo || 'Pública'}.`);
      const li = []; const somaI = (r) => Object.values(r.id || {}).reduce((t, v) => [t[0] + (+v[0] || 0), t[1] + (+v[1] || 0)], [0, 0]);
      const T = [0, 0, 0];
      for (const r of [...(f.marco?.alunos || [])].sort((a, b) => a.ens - b.ens || a.tur - b.tur || a.cl - b.cl)) { const a = somaI(r); const tu = (+r.tp || 0) + (+r.tm || 0); T[0] += a[0]; T[1] += a[1]; T[2] += tu; li.push([`${ensAbbr(r.ens)} ${r.cl}ª${r.tur === 2 ? ' (nocturno)' : ''}`, numTxt(a[0]), numTxt(a[1]), numTxt(a[0] + a[1]), numTxt(tu)]); }
      li.push(['Total', numTxt(T[0]), numTxt(T[1]), numTxt(T[0] + T[1]), numTxt(T[2])]);
      TAB(`${e.nome || f.esc}: alunos por classe e sexo e turmas, ${anoFim}`, ['Classe', 'Homens', 'Mulheres', 'Total', 'Turmas'], li);
      const pf = [0, 0], ps = [0, 0]; for (const r of f.marco?.prof || []) { const t = fq.has(+r.q) ? pf : ps; t[0] += +r.v?.[0] || 0; t[1] += +r.v?.[1] || 0; }
      TAB(`${e.nome || f.esc}: professores por sexo e formação pedagógica, ${anoFim}`, ['Professores', 'Homens', 'Mulheres', 'Total'], [['Com formação pedagógica', numTxt(pf[0]), numTxt(pf[1]), numTxt(pf[0] + pf[1])], ['Sem formação pedagógica', numTxt(ps[0]), numTxt(ps[1]), numTxt(ps[0] + ps[1])], ['Total', numTxt(pf[0] + ps[0]), numTxt(pf[1] + ps[1]), numTxt(pf[0] + ps[0] + pf[1] + ps[1])]]);
      const fim = f.fim?.aprov || [];
      if (fim.length) TAB(`${e.nome || f.esc}: alunos no fim do ano e aprovados, ${anoFim}`, ['Classe', 'No fim do ano', 'Aprovados', '% aprovação'], fim.map((r) => { const a = (+r.fim?.[0] || 0) + (+r.fim?.[1] || 0), b = (+r.aprov?.[0] || 0) + (+r.aprov?.[1] || 0); return [`${ensAbbr(r.ens)} ${r.cl}ª`, numTxt(a), numTxt(b), a ? pctTxt(b / a) : '—']; }), 'Levantamento de fim do ano.');
      const pr = problemasFicha(f); if (pr.length) P('Pontos a confirmar pela escola: ' + pr.slice(0, 5).join(' '));
    }
    if (!fa.length) P('Escolha um distrito: a retroalimentação é feita escola a escola.');
    notaTecnica([['Escolas', String(fa.length)]]);
    return fecho({titulo: `Retroalimentação às escolas — ${lugar} ${anoFim}`, subtitulo: 'Dados do levantamento devolvidos a cada escola para conferência', assunto: 'Retroalimentação às escolas' });
  }
  if (tipo === 'brochura') {
    const cont = c_cont || 'ambos';
    const tit = await brochura2({ prov, dist, lugar, F, anoFim, anos, A0, A1, anosFim, AF, H1, H2, P, TAB, GR, L_, B_, fichasAno, cont });
    notaTecnica([['Conteúdo', tit.join('; ')]]);
    return fecho({ titulo: 'Estatísticas da Educação', subtitulo: `${lugar} · ${tit.join(' · ')}`, assunto: 'Brochura estatística da Educação: ' + tit.join(' e ') });
  }

  // ---------------- CARTA ESCOLAR ----------------
  const fa = await fichasAno();
  const escolasAct = [...new Set(fa.map((f) => f.esc))].map((c) => S.esc.get(c)).filter(Boolean);
  notaTecnica();
  H1('Nota introdutória');
  P(`O presente documento resulta de uma leitura objectiva e técnica sobre o ponto de situação da Carta Escolar ${prov ? 'na Província de Tete' : 'no ' + lugar}, onde são analisados vários indicadores (cobertura, eficácia interna e gestão de recursos) e se apresentam elementos para a planificação da expansão da rede escolar, em linha com os objectivos do Plano Estratégico da Educação.`);
  P(`A análise considera a rede escolar com mapa no levantamento de ${anoFim} (${numTxt(escolasAct.length)} escolas) e os indicadores mais recentes disponíveis.`);
  B.push({ t: 'quebra' });
  H1('População');
  const popU = prov ? S.cod.distritosTodos.map(([d, n]) => [n, d]) : [[distName(dist), +dist]];
  const lPop = popU.map(([n, d]) => [n, ...[[0, 80], [6, 11], [12, 14], [15, 17]].map(([lo, hi]) => numTxt(popSoma(anoFim, d, lo, hi, 'Ambos')))]);
  if (prov) lPop.push(['Total', ...[[0, 80], [6, 11], [12, 14], [15, 17]].map(([lo, hi]) => numTxt(popSoma(anoFim, 'Todos', lo, hi, 'Ambos')))]);
  TAB(`População por ${prov ? 'distrito' : 'idade escolar'}, ${anoFim} (0-30 anos e grupos de idade escolar)`, [prov ? 'Distrito' : 'Distrito', 'População 0-30 anos', '6-11 anos (EP)', '12-14 anos (ESG1)', '15-17 anos (ESG2)'], lPop, 'INE, projecções da população (2007-2020 e 2017-2050).');
  if (prov) MAP(`População de 6-11 anos por distrito, ${anoFim}`, svgMapa({ vals: Object.fromEntries(S.cod.distritosTodos.map(([d]) => [d, popSoma(anoFim, d, 6, 11, 'Ambos')])), fmtv: numTxt, legenda: 'População de 6-11 anos' }), 'INE, projecções da população.');
  H1('Rede escolar');
  const porTipo = (es) => ({ Pública: es.filter((e) => (e.tipo || 'Pública') === 'Pública').length, Privada: es.filter((e) => e.tipo === 'Privada').length, Comunitária: es.filter((e) => e.tipo === 'Comunitária').length });
  const gR = prov ? S.cod.distritosTodos.map(([d, n]) => [n, fa.filter((f) => +f.dist === d)]) : unidades.map((u) => [u.nome, u.fichas]);
  const lRede = gR.map(([n, fs]) => { const es = fs.map((f) => S.esc.get(f.esc)).filter(Boolean); const t = porTipo(es); const nv = escolasPorNivel(fs); return [n, numTxt(t.Pública), numTxt(t.Privada), numTxt(t.Comunitária), numTxt(nv.EP), numTxt(nv.ESG1), numTxt(nv.ESG2), numTxt(fs.length)]; });
  const tt = porTipo(escolasAct), tn = escolasPorNivel(fa); lRede.push(['Total', numTxt(tt.Pública), numTxt(tt.Privada), numTxt(tt.Comunitária), numTxt(tn.EP), numTxt(tn.ESG1), numTxt(tn.ESG2), numTxt(fa.length)]);
  TAB(`Rede escolar por tipo de ensino e por nível, por ${nomeU.toLowerCase()}, ${anoFim}`, [nomeU, 'Públicas', 'Privadas', 'Comunitárias', 'Com EP', 'Com ESG1', 'Com ESG2', 'Total escolas'], lRede);
  P(`Em ${anoFim}, a rede escolar ${prov ? 'da província' : 'do distrito'} contava com ${numTxt(fa.length)} escolas com mapa no levantamento: ${numTxt(tt.Pública)} públicas, ${numTxt(tt.Privada)} privadas e ${numTxt(tt.Comunitária)} comunitárias. ${numTxt(tn.EP)} escolas leccionam o Ensino Primário, ${numTxt(tn.ESG1)} o ESG 1º Ciclo e ${numTxt(tn.ESG2)} o ESG 2º Ciclo.`);
  const comC = escolasAct.filter((e) => coordsEscola(e)).length;
  const fundoD = !prov && S.limites ? (() => { const fd = S.limites.features.filter((f) => codDistritoGeo(f, S.limitesCampo) === +dist); const ps = ((S.pubDiv === 'localidade' && S.limitesLocalidades ? S.limitesLocalidades : S.limitesPostos)?.features || []).filter((p) => fd.some((f) => window.d3.geoContains(f, window.d3.geoCentroid(p)))).map((p) => ({ ...p, properties: { __nivel: 'posto', __nome: p.properties?.__nome } })); return fd.length ? { type: 'FeatureCollection', features: [...fd, ...ps] } : null; })() : null;
  MAP(`Localização das escolas segundo o tipo de ensino, ${anoFim}`, svgPontos({ escolas: escolasAct, fundo: fundoD, corDe: (e) => (e.tipo === 'Privada' ? ['#C2711A', 'Privada'] : e.tipo === 'Comunitária' ? ['#7A4FA0', 'Comunitária'] : ['#0A6B45', 'Pública']) }), `Coordenadas do cadastro de escolas (${numTxt(comC)} de ${numTxt(escolasAct.length)} escolas têm coordenadas).`);
  if (comC < escolasAct.length * 0.8) P(`Nota: só ${numTxt(comC)} das ${numTxt(escolasAct.length)} escolas têm coordenadas geográficas no cadastro. A DPE pode carregar as coordenadas em falta em Administração > Configurações.`);
  H1('Condições das escolas');
  const infra = gR.map(([n, fs]) => { let el = 0, ag = 0, wc = 0, nt = 0, inf = 0; for (const f of fs) { const i = f.marco?.infra; if (!i) continue; inf++; if (+i.elect) el++; if (+i.aguaEsc || +i.fontenaria) ag++; if (+i.wc || +i.latrinas || +i.nWc || +i.nLatrinas) wc++; if (+i.internet) nt++; } return { n, inf, el, ag, wc, nt }; });
  const lInf = infra.map((x) => [x.n, numTxt(x.inf), x.inf ? pctTxt(x.el / x.inf) : '—', x.inf ? pctTxt(x.ag / x.inf) : '—', x.inf ? pctTxt(x.wc / x.inf) : '—', x.inf ? pctTxt(x.nt / x.inf) : '—']);
  const ti = infra.reduce((a, x) => ({ inf: a.inf + x.inf, el: a.el + x.el, ag: a.ag + x.ag, wc: a.wc + x.wc, nt: a.nt + x.nt }), { inf: 0, el: 0, ag: 0, wc: 0, nt: 0 });
  lInf.push(['Total', numTxt(ti.inf), ti.inf ? pctTxt(ti.el / ti.inf) : '—', ti.inf ? pctTxt(ti.ag / ti.inf) : '—', ti.inf ? pctTxt(ti.wc / ti.inf) : '—', ti.inf ? pctTxt(ti.nt / ti.inf) : '—']);
  TAB(`Escolas com energia, água, latrinas ou casas de banho e internet, por ${nomeU.toLowerCase()}, ${anoFim}`, [nomeU, 'Escolas com informação', '% com energia', '% com água', '% com latrinas/WC', '% com internet'], lInf);
  if (prov) for (const [k, nome] of [['el', 'energia eléctrica'], ['ag', 'água'], ['wc', 'latrinas ou casas de banho']]) MAP(`Percentagem de escolas com ${nome}, ${anoFim}`, svgMapa({ vals: Object.fromEntries(infra.map((x, i) => [S.cod.distritosTodos[i][0], x.inf ? x[k] / x.inf : null])), fmtv: pctTxt, legenda: `% de escolas com ${nome}` }));
  // condições segundo a carta escolar (água, energia, latrinas e salas), quando a DPE carregou a carta em Escolas
  { const sim = (v) => /^(s|sim|yes|1|x)/i.test(String(v ?? '').trim());
    const grpC = prov ? S.cod.distritosTodos.map(([d, n]) => [n, escolasAct.filter((e) => +e.dist === d)]) : (() => { const gk = (e) => (S.pubDiv === 'distrito' ? distName(dist) : S.pubDiv === 'localidade' ? e.localidade || 'Sem localidade indicada' : S.pubDiv === 'ambos' ? `${e.posto || 'Sem posto'} › ${e.localidade || 'sem localidade'}` : e.posto || 'Sem posto indicado'); return [...new Set(escolasAct.map(gk))].sort((a, b) => a.localeCompare(b, 'pt')).map((p) => [p, escolasAct.filter((e) => gk(e) === p)]); })();
    const lin = grpC.map(([n, es]) => { const c = es.filter((e) => e.ce); const sl = c.map((e) => +e.ce.salas).filter((x) => Number.isFinite(x) && x > 0); return { n, c: c.length, ag: c.filter((e) => sim(e.ce.agua)).length, en: c.filter((e) => sim(e.ce.energia)).length, la: c.filter((e) => sim(e.ce.latrinas)).length, cb: c.filter((e) => sim(e.ce.casaBanho)).length, sal: sl.reduce((a, b) => a + b, 0), nsal: sl.length }; }).filter((x) => x.c);
    if (lin.length) {
      const T = lin.reduce((a, x) => ({ c: a.c + x.c, ag: a.ag + x.ag, en: a.en + x.en, la: a.la + x.la, cb: a.cb + x.cb, sal: a.sal + x.sal, nsal: a.nsal + x.nsal }), { c: 0, ag: 0, en: 0, la: 0, cb: 0, sal: 0, nsal: 0 });
      const row = (x) => [x.n, numTxt(x.c), pctTxt(x.ag / x.c), pctTxt(x.en / x.c), pctTxt(x.la / x.c), pctTxt(x.cb / x.c), numTxt(x.sal), x.nsal ? R1.format(x.sal / x.nsal) : '—'];
      H2('Condições das escolas segundo a carta escolar');
      TAB(`Escolas com água, energia, latrinas e casa de banho, e salas de aula, segundo a carta escolar, por ${nomeU.toLowerCase()}`, [nomeU, 'Escolas na carta', '% com água', '% com energia', '% com latrinas', '% com casa de banho', 'Salas de aula', 'Salas por escola'], [...lin.map(row), row({ ...T, n: 'Total' })], 'Carta escolar carregada em Escolas.');
      GR(`Percentagem de escolas com água, energia e latrinas, por ${nomeU.toLowerCase()} (carta escolar)`, B_({ cats: lin.map((x) => x.n), series: [{ nome: 'Água', cor: '#2E86C1', vals: lin.map((x) => x.ag / x.c) }, { nome: 'Energia', cor: '#C98E00', vals: lin.map((x) => x.en / x.c) }, { nome: 'Latrinas', cor: '#0A6B45', vals: lin.map((x) => x.la / x.c) }], pct: true, horiz: true, H: Math.max(180, lin.length * 46 + 40) }), 'Carta escolar.');
      P(`Segundo a carta escolar, das ${numTxt(T.c)} escolas registadas, ${pctTxt(T.ag / T.c)} têm água, ${pctTxt(T.en / T.c)} têm energia e ${pctTxt(T.la / T.c)} têm latrinas. ${(() => { const o = [...lin].sort((a, b) => a.ag / a.c - b.ag / b.c)[0]; return lin.length > 1 ? `O acesso à água é mais baixo em ${o.n} (${pctTxt(o.ag / o.c)}).` : ''; })()}`);
    } }
  B.push({ t: 'quebra' });
  H1('Efectivos escolares');
  const ef = NV3.map(([nv]) => ['Pública', 'Privada', 'Comunitária'].map((t) => { const x = sumUp(anoFim, { ...F, tipo: t, nivel: nv }); return x ? gsx(x.T.Matric) : 0; }));
  TAB(`Alunos por nível e tipo de ensino, ${anoFim}`, ['Nível', 'Público', 'Privado', 'Comunitário', 'Total'], NV3.map(([, n], i) => [n, ...ef[i].map(numTxt), numTxt(ef[i].reduce((a, b) => a + b, 0))]));
  GR(`Alunos por nível de ensino, ${anoFim}`, B_({ cats: NV3.map((x) => x[1]), series: [{ nome: 'Alunos', cor: PUB_COR.br, cores: NV3.map(([nv]) => PUB_COR[nv]), vals: ef.map((l) => l.reduce((a, b) => a + b, 0)) }] }));
  H1('Indicadores ' + (prov ? 'por distrito' : divU().por));
  const indDist = [['aprovEsc', 'EP', 'Taxa de aproveitamento escolar, Ensino Primário', false, AF], ['aprovEsc', 'ESG1', 'Taxa de aproveitamento escolar, ESG 1º Ciclo', false, AF], ['aprovEsc', 'ESG2', 'Taxa de aproveitamento escolar, ESG 2º Ciclo', false, AF],
    ['tbc', 'EP', 'Taxa bruta de conclusão, Ensino Primário', false, AF], ['tbc', 'ESG1', 'Taxa bruta de conclusão, ESG 1º Ciclo', false, AF], ['ret3', 'EP', 'Taxa de retenção até à 3ª classe', false, anoFim],
    ['desist', 'EP', 'Taxa de desistência, Ensino Primário', true, AF], ['desist', 'ESG1', 'Taxa de desistência, ESG 1º Ciclo', true, AF],
    ['pctF', 'EP', 'Proporção de raparigas, Ensino Primário', false, anoFim], ['pctF', 'ESG1', 'Proporção de raparigas, ESG 1º Ciclo', false, anoFim], ['pctF', 'ESG2', 'Proporção de raparigas, ESG 2º Ciclo', false, anoFim], ['alprof', 'EP', 'Rácio alunos por professor, Ensino Primário', true, anoFim]];
  for (const [k, nv, nome, mau, aI] of indDist) {
    if (!aI) continue;
    const vs = prov ? S.cod.distritosTodos.map(([d, n]) => [n, d, IX(aI, { dist: d, nivel: nv }, k)]) : unidades.map((u) => [u.nome, null, aI === anoFim ? uInd(u, aI, k, { nivel: nv }) : null]);
    const val = vs.filter((x) => x[2] != null); if (!val.length) continue;
    const fm = (v) => fmt(k, v); const tot = IX(aI, { ...F, nivel: nv }, k);
    H2(`${nome}, ${aI}`);
    const ord = [...val].sort((a, b) => b[2] - a[2]);
    P(`${prov ? 'Na província' : 'No distrito'}, ${nome.charAt(0).toLowerCase() + nome.slice(1)} foi de ${fm(tot)} em ${aI}. ${prov ? 'O distrito' : divU().o} de ${ord[0][0]} apresenta o valor mais ${mau ? 'alto (desfavorável)' : 'alto'} (${fm(ord[0][2])}) e ${ord[ord.length - 1][0]} o mais baixo (${fm(ord[ord.length - 1][2])}).`);
    if (prov) MAP(`${nome}, ${aI}`, svgMapa({ vals: Object.fromEntries(vs.map((x) => [x[1], x[2]])), fmtv: fm, inv: mau, legenda: nome }), aI === anoFim ? 'Levantamento 3 de Março.' : 'Levantamentos 3 de Março e de fim do ano.');
    else if (mapaUnid(vs)) MAP(`${nome}, ${divU().por}, ${aI}`, mapaUnid(vs, fm, mau, nome), aI === anoFim ? 'Levantamento 3 de Março.' : 'Levantamentos 3 de Março e de fim do ano.');
    if (!prov) GR(`${nome}, ${divU().por}, ${aI}`, B_({ cats: val.map((x) => x[0]), series: [{ nome, cor: PUB_COR[nv] || PUB_COR.br, vals: val.map((x) => x[2]) }], pct: KIND[k] === 'p', horiz: true, H: Math.max(160, val.length * 28 + 20) }));
  }
  H1('Conclusão');
  P(`A Carta Escolar ${prov ? 'da província' : 'do distrito'} de ${anoFim} mostra uma rede de ${numTxt(fa.length)} escolas, das quais ${ti.inf ? pctTxt(ti.el / ti.inf) : '—'} com energia e ${ti.inf ? pctTxt(ti.ag / ti.inf) : '—'} com água, entre as escolas com informação. Os indicadores por ${prov ? 'distrito' : 'posto administrativo'} apontam onde concentrar a expansão da rede, a melhoria das condições das escolas e o acompanhamento pedagógico.`);
  if (comC < escolasAct.length) P('Para uma carta escolar completa recomenda-se completar as coordenadas geográficas de todas as escolas no cadastro.');
  notaTecnica([['Limites dos distritos', S.limites ? 'Ficheiro de limites carregado pela DPE' : 'Mapa esquemático (sem limites oficiais carregados)'], ['Escolas com coordenadas', `${numTxt(comC)} de ${numTxt(escolasAct.length)}`]]);
  return fecho({titulo: `Carta Escolar — ${lugar} ${anoFim}`, subtitulo: 'Rede escolar, condições das escolas e indicadores de cobertura, eficácia interna e gestão de recursos', assunto: 'Carta escolar' });
}
// guarda os limites de um nível; para os distritos escolhe o campo que melhor corresponde aos códigos ou nomes dos distritos de Tete
VIEWS.publicacoes = async (v) => {
  const st = S.pubSt ||= { tipo: 'brochura', dist: S.sessao?.dist || 'Todos', ano: ANO_MAX_DADOS, cont: 'ambos', div: 'posto', formato: 'completo', excluir: [] };
  if (!S.emblemaURL) { try { const b = await (await fetch('img/emblema.png')).blob(); S.emblemaURL = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); } catch {} }
  await carregarLimitesS();
  v.append(h('div', {}, h('h1', { text: 'Relatórios e Publicações' }), h('p', { class: 'lede', text: 'Gera a Brochura Estatística, a Carta Escolar, o relatório da Alfabetização e Educação de Adultos e o Folheto da Educação, do Distrito ou da Província, com tabelas, gráficos, mapas e textos de análise, prontos a guardar em Word (editável) ou em PDF.' })));
  const sel = (k, list, lab) => h('label', { class: 'f' }, lab, h('select', { onchange: (e) => { st[k] = e.target.value; } }, list.map((o) => h('option', { value: o[0], text: o[1], selected: String(o[0]) === String(st[k]) }))));
  const prev = h('div', { class: 'pub-prev' });
  const msg = h('p', { class: 'note' });
  let doc = null;
  const opcoes = h('div', { class: 'pub-opcoes' });
  // monta o documento final a partir do gerado: formato (tabelas/gráficos), secções escolhidas e anexos
  const mostrar = () => { if (!S.pubDoc0) return; doc = ajustarPublicacao(S.pubDoc0, st); prev.replaceChildren(); const fr = h('iframe', { class: 'pub-frame', title: 'Pré-visualização', sandbox: '' }); fr.srcdoc = htmlPublicacao(doc); prev.append(fr);
    msg.textContent = `${doc.blocos.filter((b) => b.t === 'tabela').length} tabelas e ${doc.blocos.filter((b) => b.t === 'img').length} gráficos, mapas e imagens. No Word, as tabelas e os gráficos ficam editáveis (clique no gráfico > Editar dados).`; bW.disabled = bP.disabled = bX.disabled = false; opcoesPublicacao(opcoes, st, mostrar); };
  const gerar = async () => { S.pubDiv = st.div || 'posto'; S.pubDist = st.dist === 'Todos' ? null : +st.dist; msg.textContent = 'A preparar o documento…'; prev.replaceChildren(); st.excluir = [];
    S.pubDoc0 = await construirPublicacao({ tipo: st.tipo, dist: st.dist, ano: +st.ano, cont: st.cont }); if (st.formato === 'aprofundado') { msg.textContent = 'A preparar os anexos por escola…'; S.pubDoc0.extra = await anexoAprofundado(st); } mostrar(); };
  const nome = (ext) => `${{ brochura: 'Brochura_Estatistica', carta: 'Carta_Escolar', retro: 'Retroalimentacao_Escolas', aea: 'Alfabetizacao_Adultos', folheto: 'Folheto_Educacao' }[st.tipo]}_${st.dist === 'Todos' ? 'Provincia_Tete' : distName(st.dist).replace(/\s+/g, '_')}_${st.ano}.${ext}`;
  const bP = h('button', { class: 'btn', text: 'Guardar em PDF', disabled: true, onclick: async () => { const r = await window.educstat.relPdf(htmlPublicacao(doc, true), nome('pdf'), { capa: htmlCapa(doc), rodape: doc.rodape, titulo: doc.titulo, assunto: doc.assunto, palavras: 'educação; Estatística; Tete', ...opcoesPdfRel(doc) }); if (r?.status === 'saved') { toast('PDF guardado.'); registar('publicação gerada', { alvo: nome('pdf') }); } } });
  const bW = h('button', { class: 'btn primary', text: 'Guardar em Word', disabled: true, onclick: async () => {
    msg.textContent = 'A preparar o Word…'; const blocos = [];
    for (const b of doc.blocos) { if (b.t === 'img' && b.dados) blocos.push({ t: 'grafico', titulo: b.titulo, fonte: b.fonte, dados: b.dados }); else if (b.t === 'img') { const p = await svgParaPng(b.svg); if (p) blocos.push({ t: 'img', titulo: b.titulo, fonte: b.fonte, png: p.png, w: Math.min(600, p.w), h: Math.round((p.h * Math.min(600, p.w)) / p.w) }); } else blocos.push(b); }
    const arte = arteCapa(doc.geo); const capaArte = { mapa: arte.mapa ? await svgParaPng(arte.mapa) : null, faixa: arte.faixa ? await svgParaPng(arte.faixa) : null };
    const r = await window.educstat.relDocx({ ...doc, blocos, capaArte, palavras: 'educação; Estatística; Tete; ' + (st.tipo === 'brochura' ? 'brochura' : 'carta escolar') }, nome('docx'));
    msg.textContent = r?.status === 'saved' ? `Word guardado: ${r.caminho}` : 'Cancelado.'; if (r?.status === 'saved') registar('publicação gerada', { alvo: nome('docx') });
  } });
  const bX = h('button', { class: 'btn', text: 'Guardar dados em Excel', disabled: true, title: 'Todas as tabelas e os dados de todos os gráficos, editáveis', onclick: async () => {
    const XLSX = window.XLSX; const wb = XLSX.utils.book_new(); const nomes = new Set(); const graf = [];
    const nomeF = (t) => { let n = t.replace(/^(Tabela|Gráfico|Mapa) (\d+).*/, '$1 $2').replace(/[\\/?*[\]:]/g, '').slice(0, 28) || 'Folha'; let k = n, i = 2; while (nomes.has(k)) k = n + ' ' + i++; nomes.add(k); return k; };
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[doc.titulo], [doc.subtitulo], ['Emitido em', new Date().toLocaleString('pt-PT')], ['Âmbito', st.dist === 'Todos' ? 'Província de Tete' : distName(st.dist)], ['Ano de referência', +st.ano], [''], ['Folha', 'Conteúdo'], ...doc.blocos.filter((b) => b.t === 'tabela' || (b.t === 'img' && b.dados)).map((b) => [b.titulo.replace(/:.*/, ''), b.titulo])]), 'Índice');
    for (const b of doc.blocos) {
      if (b.t === 'tabela') XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[b.titulo], b.cab, ...b.linhas.map((l) => (l.sec ? [l.sec] : l.map((c) => { const t = String(c).replace(/\s/g, '').replace(/\u202f/g, ''); if (/^-?[\d.]+$/.test(t)) return +t.replace(/\./g, ''); if (/^-?[\d.]+,\d+%$/.test(t)) return +t.replace(/\./g, '').replace(',', '.').replace('%', '') / 100; if (/^-?[\d.]+,\d+$/.test(t)) return +t.replace(/\./g, '').replace(',', '.'); return c; }))), [], ['Fonte: ' + (b.fonte || '')]]), nomeF(b.titulo));
      else if (b.t === 'img' && b.dados) {
        const fn = nomeF(b.titulo); const d = b.dados; const n = d.cats.length;
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[b.titulo], ['', ...d.series.map((x) => x.nome)], ...d.cats.map((c, i) => [String(c), ...d.series.map((x) => (x.vals[i] == null ? null : x.vals[i]))]), [], ['Fonte: ' + (b.fonte || '')]]), fn);
        if (d.pct) { const ws = wb.Sheets[fn]; for (let r = 2; r < n + 2; r++) for (let c = 1; c <= d.series.length; c++) { const x = ws[XLSX.utils.encode_cell({ r, c })]; if (x && x.t === 'n') x.z = '0.0%'; } }
        graf.push({ folha: fn, tipo: d.tipo === 'linha' ? 'linha' : d.horiz ? 'barrasH' : 'barras', titulo: b.titulo.replace(/^Gráfico \d+: /, ''), fmt: d.pct ? '0.0%' : '#,##0', cats: { ref: refF(fn, 0, 2, 0, n + 1), vals: d.cats.map(String) },
          series: d.series.map((x, j) => ({ nome: x.nome, nomeRef: refF(fn, j + 1, 1), ref: refF(fn, j + 1, 2, j + 1, n + 1), vals: x.vals, cor: x.cor })), de: [d.series.length + 2, 1], ate: [d.series.length + 11, Math.max(18, n + 6)] });
      }
    }
    wb.Props = { Title: doc.titulo + ' — dados', Subject: doc.assunto, Author: 'Alberto Adélia Manhice', LastAuthor: 'Alberto Adélia Manhice', Category: 'Estatística da Educação', Keywords: 'publicação; dados; Tete' };
    try { await guardarXlsx(wb, nome('xlsx').replace('.xlsx', '_dados.xlsx'), graf); toast('Excel guardado, com os gráficos ligados aos dados.'); } catch {}
  } });
  const central = ehDPE();
  const dists = central || !S.sessao?.dist ? [['Todos', 'Província de Tete'], ...S.cod.distritosTodos] : S.cod.distritosTodos.filter((d) => d[0] === +S.sessao.dist);
  if (!dists.some((d) => String(d[0]) === String(st.dist))) st.dist = dists[0][0];
  v.append(h('div', { class: 'card' }, h('div', { class: 'row' }, sel('tipo', [['brochura', 'Brochura Estatística'], ['carta', 'Carta Escolar'], ['retro', 'Retroalimentação às Escolas']], 'Publicação'), sel('dist', dists, 'Âmbito'), sel('ano', ANOS.filter((a) => a <= ANO_MAX_DADOS).reverse().map((a) => [a, a]), 'Ano de referência'),
    sel('div', [['distrito', 'Só o distrito (sem divisão)'], ['posto', 'Por posto administrativo'], ['localidade', 'Por localidade'], ['ambos', 'Por posto e localidade (em simultâneo)']], 'Dados do distrito'),
    sel('formato', [['completo', 'Tabelas e gráficos'], ['tabelas', 'Só tabelas (e mapas)'], ['graficos', 'Só gráficos e mapas'], ['aprofundado', 'Aprofundado (com anexos por escola)']], 'Apresentação'),
    sel('cont', [['ambos', 'Levantamento e Aproveitamento'], ['levantamento', 'Só Levantamento (3 de Março)'], ['aproveitamento', 'Só Aproveitamento (fim do ano)']], 'Conteúdo da brochura'),
    h('button', { class: 'btn primary', text: 'Gerar', onclick: gerar }), bW, bP, bX), msg, opcoes));
  if (central) v.append(h('p', { class: 'note', text: 'Os limites dos distritos e postos (shapefile), as coordenadas e a carta escolar carregam-se em Administração > Configurações.' }));
  v.append(prev);
};


// limites (shapefile/GeoJSON) e coordenadas: em Administração > Configurações
function blocoMapasBase() {
  return h('div', { class: 'card' }, h('h2', { text: '2 a 4. Limites dos distritos e dos postos (shapefile) e coordenadas avulsas' }),
    h('p', { class: 'note', text: S.limites ? `Distritos: ${S.limites.features.length} áreas (${S.limitesInfo || ''}).${S.limitesPostos ? ` Postos administrativos: ${S.limitesPostos.features.length} áreas.` : ''} Os mapas das publicações usam-nos.` : 'Sem limites, os mapas são esquemáticos. Carregue o shapefile dos distritos (pode ser o do país inteiro: o programa fica só com os de Tete). Aceita .shp com o .dbf e o .prj ao lado, ou tudo num .zip. Converte a projecção para graus e liga cada área ao distrito pelo código ou pelo nome.' }),
    cartaoCorrespondencia(),
    h('div', { class: 'row' }, h('label', { class: 'f' }, 'Nível (para GeoJSON)', (() => { const x = h('select', { id: 'lim-nivel' }, [['distritos', 'Distritos'], ['postos', 'Postos administrativos'], ['localidades', 'Localidades']].map(([k, l]) => h('option', { value: k, text: l }))); return x; })()),
      h('button', { class: 'btn primary', text: 'Carregar shapefiles (.shp ou .zip com várias camadas)…', title: 'Um ZIP pode trazer os distritos, os postos e as localidades: mostra cada camada antes de gravar', onclick: carregarShapefilesBase }),
      h('button', { class: 'btn', text: 'Carregar GeoJSON…', onclick: async () => {
        const nivel = $('#lim-nivel').value; const f = await window.educstat.openFile(['geojson', 'json']); if (!f) return;
        try { const g = JSON.parse(new TextDecoder().decode(f.dados)); await guardarLimites(nivel, g.type === 'FeatureCollection' ? g : { type: 'FeatureCollection', features: [g] }, 'GeoJSON', null); } catch (e) { toast('Ficheiro inválido: ' + e.message, 6000); }
      } }),
      S.limites ? h('button', { class: 'btn warn', text: 'Retirar os limites', onclick: async () => { S.limites = null; S.limitesPostos = null; await S.db.doc('config/limites').set({ geojson: '' }); await S.db.doc('config/limitesPostos').set({ geojson: '' }); go(current); } }) : null),
    h('div', { class: 'row' },
      h('button', { class: 'btn', text: 'Carregar coordenadas das escolas (Excel)', title: 'Colunas: CodEscola, Latitude, Longitude', onclick: async () => {
        const f = await window.educstat.openFile(['xlsx', 'xls', 'csv']); if (!f) return; const XLSX = window.XLSX; const wb = XLSX.read(f.dados, { type: 'array' }); let n = 0;
        for (const r of XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })) { const cod = +(r.CodEscola || r.Codigo || r.SchoolId); const la = +String(r.Latitude || r.Lat || r.y).replace(',', '.'), lo = +String(r.Longitude || r.Lon || r.x).replace(',', '.'); const e = S.esc.get(cod); if (!e || !la || !lo) continue; await S.db.doc(`escolas/${cod}`).set({ ...(S.escDb.get(cod) || e), cod, x: lo, y: la, em: new Date().toISOString() }); n++; }
        toast(`${n} escolas com coordenadas actualizadas.`); await registar('coordenadas de escolas carregadas', { n }); await marcarFicheiroBase('coordenadas', { ficheiro: f.nome, n });
      } })));
}
// =====================================================================
// VERSÃO WINDOWS: entrada, perfis, levantamentos, administração, sincronização
// =====================================================================
const PERFIS = [[1, 'Consulta (só ver)'], [2, 'Introdução de dados (ver, inserir, alterar)'], [3, 'Administrador']];
const contaPrincipal = (u) => !!u && +u.dist > 0 && u.utilizador === `sdejt_0${+u.dist}`; // a conta que a DPE cria para cada SDEJT
const ehSuperDistrito = () => contaPrincipal(S.sessao);
const nomePerfil = (u) => (u.perfil === 3 ? (+u.dist ? (contaPrincipal(u) ? 'Administrador Principal do Distrito (SDEJT)' : 'Administrador Distrital (SDEJT)') : 'Administrador Provincial (DPE)') : (PERFIS.find((p) => p[0] === u.perfil) || [0, ''])[1]);
const LEVS = [['marco', 'Escolas – 3 de Março'], ['fim', 'Escolas – Fim do ano'], ['alfa_marco', 'Alfabetização – Março'], ['alfa_fim', 'Alfabetização – Fim do ano']];
// cada registo guarda também o computador, o endereço IP local e (quando a DPE o conhece) o IP público visto pelo servidor
async function registar(accao, extra = {}) { if (!DESKTOP) return; try {
  if (!S.infoMaq) { try { S.infoMaq = await window.educstat.info(); } catch { S.infoMaq = {}; } }
  const ipPub = (S.online || []).find((x) => x.maquina && x.maquina === S.infoMaq.maquina)?.ip || null;
  await S.db.doc(`registo/${Date.now()}_${Math.random().toString(36).slice(2, 7)}`).set({ em: new Date().toISOString(), por: S.sessao?.utilizador || null, accao, maquina: S.infoMaq.maquina || null, ip: (S.infoMaq.ips || [])[0] || null, ipPublico: ipPub, local: S.sessao?.local || null, dist: +(S.sessao?.dist || S.inst?.dist || 0) || null, ...extra }); } catch {} }
function roMotivo(ano, lev, dist) {
  const w = writeNote(); if (w) return w;
  if (!DESKTOP) return null;
  const s = S.sessao || {};
  if ((s.perfil || 0) < 2) return s.perfil === 0 ? 'Entrou como visitante: só pode ver.' : 'O seu perfil é só de consulta.';
  if (s.dist && +dist && +s.dist !== +dist) return `O seu utilizador só pode introduzir dados do distrito de ${distName(s.dist)}.`;
  const mt = motivoTranca(ano, lev, dist); if (mt) return mt;
  if (s.perfil < 3 && S.setup?.[`${ano}_${lev}`] === false) return `O levantamento (${(LEVS.find((l) => l[0] === lev) || [0, lev])[1]}) de ${ano} está fechado. Peça ao administrador para o abrir.`;
  // a DPE e os administradores abrem os mapas em modo de leitura: só alteram depois de carregar em “Editar este mapa”
  if ((s.perfil === 3 || ehDPE()) && !S.editarMapa?.[`${ano}_${lev}_${dist}`]) return MODO_LEITURA;
  return null;
}
const MODO_LEITURA = 'Modo de leitura: carregue em “Editar este mapa” para alterar.';
async function loadSetup() { const d = await S.db.doc('config/levantamentos').get(); S.setup = d.exists ? d.data() : {}; }
async function primeiraUtilizacao(db) {
  // sem conta "admin/admin": quem instala cria o administrador e diz se o computador é da DPE ou de um SDEJT
  return new Promise((resolve) => {
    const u = h('input', { type: 'text', value: 'admin', autocomplete: 'username' }), n = h('input', { type: 'text', placeholder: 'Nome completo' });
    const p1 = h('input', { type: 'password', autocomplete: 'new-password' }), p2 = h('input', { type: 'password', autocomplete: 'new-password' });
    const papel = h('select', {}, h('option', { value: 'central', text: 'DPE Tete (Direcção Provincial)' }), h('option', { value: 'distrito', text: 'SDEJT (um distrito)' }));
    const dist = h('select', { disabled: true }, S.cod.distritosTodos.map((d) => h('option', { value: d[0], text: d[1] })));
    papel.onchange = () => { dist.disabled = papel.value !== 'distrito'; };
    const msg = h('p', { class: 'note' });
    $('#view').replaceChildren(h('div', { class: 'card login' }, h('h1', { text: 'Bem-vindo ao EducStat Tete' }), h('p', { class: 'lede', text: 'Primeira utilização neste computador. Crie a conta de administrador e indique onde o computador vai trabalhar.' }),
      h('label', { class: 'f' }, 'Este computador é da', papel), h('label', { class: 'f' }, 'Distrito', dist),
      h('label', { class: 'f' }, 'Utilizador do administrador', u), h('label', { class: 'f' }, 'Nome', n), h('label', { class: 'f' }, 'Palavra-passe (mínimo 8 caracteres)', p1), h('label', { class: 'f' }, 'Repetir a palavra-passe', p2), msg,
      h('button', { class: 'btn primary', text: 'Criar e entrar', onclick: async () => {
        const id = u.value.trim().toLowerCase();
        if (!/^[a-z0-9._-]{2,30}$/.test(id)) { msg.textContent = 'Utilizador inválido: letras, números, ponto, hífen ou sublinhado.'; return; }
        if (p1.value.length < 8 || /^(admin|12345678|password)$/i.test(p1.value)) { msg.textContent = 'Escolha uma palavra-passe com pelo menos 8 caracteres, que não seja "admin".'; return; }
        if (p1.value !== p2.value) { msg.textContent = 'As palavras-passe não coincidem.'; return; }
        const d = papel.value === 'distrito' ? +dist.value : 0;
        const { sal, hash } = await window.educstat.hash(p1.value); const em = new Date().toISOString();
        await db.doc('utilizadores/' + id).set({ utilizador: id, nome: n.value.trim() || 'Administrador', perfil: 3, dist: d, activo: true, sal, hash, mudar: false, criado: em, em, senhaEm: em, central: papel.value === 'central', local: true });
        S.inst = { papel: papel.value, dist: d, id: (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).slice(0, 12) }; await db.doc('config/instalacao').set(S.inst);
        resolve();
      } })));
  });
}
// contas SDEJT_(Distrito): criadas uma vez pela DPE, palavra-passe inicial "admin", troca obrigatória no primeiro acesso
const codDist4 = (d) => String(d).padStart(4, '0'); // 901 -> 0901
const idSDEJT = (d) => 'sdejt_' + codDist4(d);
async function garantirContasSDEJT() {
  if (!ehDPE() || S.sessao?.perfil !== 3) return;
  const feito = (await S.db.doc('config/contasSDEJT').get()).data() || {}; let n = 0;
  for (const [d, nome] of S.cod.distritosTodos) {
    const id = idSDEJT(d); if (feito[id]) continue;
    if (!(await S.db.doc('utilizadores/' + id).get()).exists) {
      const { sal, hash } = (S._hashAdmin ||= await window.educstat.hash('admin')); const em = new Date().toISOString();
      await S.db.doc('utilizadores/' + id).set({ utilizador: id, nome: `SDEJT_${codDist4(d)} (${nome})`, perfil: 3, dist: d, activo: true, sal, hash, mudar: true, criado: em, em, central: true, contaDistrital: true });
      n++;
    }
    feito[id] = new Date().toISOString();
  }
  await S.db.doc('config/contasSDEJT').set(feito);
  if (n) { await registar('contas SDEJT criadas', { n }); toast(`${n} contas SDEJT_0901 … SDEJT_0915 criadas, com a palavra-passe inicial "admin" (mudança obrigatória no primeiro acesso).`, 7000); }
}
// o utilizador de um SDEJT pode escrever-se só com o código do distrito: 0905 (ou 905) = sdejt_0905
function idUtil(v) { const t = String(v || '').trim().toLowerCase(); if (/^0?9(0[1-9]|1[0-9])$/.test(t)) return 'sdejt_0' + t.slice(-3); const m = t.match(/^sdejt[ _-]?0?(9\d\d)$/); if (m) return 'sdejt_0' + m[1]; return t; }
// campo da palavra-passe com o botão “olho” para mostrar ou esconder o que se escreve
function campoSenha(inp) {
  const b = h('button', { type: 'button', class: 'olho', title: 'Mostrar a palavra-passe', 'aria-label': 'Mostrar a palavra-passe', 'aria-pressed': 'false' });
  const desenha = () => { const vis = inp.type === 'text'; b.replaceChildren(SVG(vis ? '<path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-3.2 3.7M6.6 6.6C4.3 8.1 3 12 3 12s4 6 9 6a8.8 8.8 0 0 0 4.4-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>' : '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>', 18)); b.title = vis ? 'Esconder a palavra-passe' : 'Mostrar a palavra-passe'; b.setAttribute('aria-label', b.title); b.setAttribute('aria-pressed', String(vis)); };
  b.onclick = () => { inp.type = inp.type === 'password' ? 'text' : 'password'; desenha(); inp.focus(); };
  desenha(); return h('span', { class: 'senha-wrap' }, inp, b);
}
// contas originais dos SDEJT (sdejt_0901 … sdejt_0915, palavra-passe inicial dada pela DPE): num computador novo,
// a primeira entrada com essa conta cria-a aqui e prepara o computador para esse distrito; a palavra-passe muda-se logo a seguir
async function entrarContaOriginal(db, id, senha) {
  const m = String(id).match(/^sdejt_0(9\d\d)$/); if (!m || senha !== 'admin') return null;
  const d = +m[1]; if (!S.cod.distritosTodos.some((x) => x[0] === d)) return null;
  const { sal, hash } = await window.educstat.hash(senha); const em = new Date().toISOString();
  const nome = `SDEJT_${codDist4(d)} (${distName(d)})`;
  const u = { utilizador: id, nome, perfil: 3, dist: d, activo: true, sal, hash, mudar: true, criado: em, em: '2000-01-01T00:00:00.000Z', central: true, contaDistrital: true, origemLocal: true };
  await db.doc('utilizadores/' + id).set(u);
  const inst = (await db.doc('config/instalacao').get()).data();
  if (!inst) { S.inst = { papel: 'distrito', dist: d, id: (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).slice(0, 12) }; await db.doc('config/instalacao').set(S.inst); }
  return u;
}
async function login() {
  const db = S.db;
  document.body.classList.add('sem-sessao');
  $('#nav').hidden = true; $('#who').replaceChildren();
  const vazio = (await db.collection('utilizadores').get()).empty;
  const acesso = (await db.doc('config/acesso').get()).data() || {};
  const instL = (await db.doc('config/instalacao').get()).data() || null;
  return new Promise((resolve) => {
    let aba = 'entrar';
    const card = h('div', { class: 'card login' });
    const cab = () => [h('img', { src: 'img/emblema.png', alt: 'Emblema da República de Moçambique', style: 'width:64px;align-self:center' }), h('div', { style: 'text-align:center;font-size:11px;letter-spacing:.08em;font-weight:700;color:var(--muted)', text: 'REPÚBLICA DE MOÇAMBIQUE · DPE TETE' }), h('h1', { text: aba === 'criar' ? 'Criar conta' : 'EducStat Tete', style: 'text-align:center' })];
    const rodape = () => { const el = h('div', { class: 'login-versao', text: 'EducStat Tete' }); window.educstat.info().then((i) => { el.textContent = `EducStat Tete · versão ${i.versao} · Direcção Provincial da Educação de Tete`; }).catch(() => {}); return el; };
    const entrou = async (x, loc) => {
      S.sessao = { utilizador: x.utilizador, nome: x.nome, perfil: x.perfil, dist: x.dist || 0, local: loc, desde: new Date().toISOString(), raiz: !!x.raiz, oculto: !!x.oculto }; window.__sessao = S.sessao;
      try { localStorage.setItem('ultimaEntrada', JSON.stringify({ utilizador: x.utilizador, local: loc })); } catch {}
      if (x.mudar) { await mudarSenha(true); }
      await registar('entrada');
      $('#nav').hidden = false; document.body.classList.remove('sem-sessao'); document.body.classList.toggle('visitante', x.perfil === 0); resolve();
    };
    const desenhar = () => {
      if (aba === 'criar') { desenharCriar(); return; }
      const u = h('input', { type: 'text', id: 'lg-u', autocomplete: 'username', autofocus: true, placeholder: 'ex.: 0905 ou o seu nome de utilizador' });
      const p = h('input', { type: 'password', id: 'lg-p', autocomplete: 'current-password' });
      let ultimo = {}; try { ultimo = JSON.parse(localStorage.getItem('ultimaEntrada') || '{}'); } catch {}
      const loc = selLocal(0); if (ultimo.local) loc.value = ultimo.local;
      const pedidoBox = h('div');
      const verPedido = async () => { pedidoBox.replaceChildren(); const id = idUtil(u.value); if (!id) return; const pend = (await db.collection('mensagens').get()).docs.map((d) => d.data()).filter((m) => m.tipo === 'senha' && m.deUtil === id && !m.resolvido);
        if (pend.length) pedidoBox.append(h('p', { class: 'note' }, `Tem um pedido de reposição da palavra-passe pendente (${new Date(pend[0].em).toLocaleString('pt-PT')}). Se já se lembrou da palavra-passe, pode `, h('button', { class: 'btn sm', text: 'cancelar o pedido', onclick: async () => { for (const m of pend) await db.doc('mensagens/' + m.id).set({ ...m, resolvido: new Date().toISOString(), estado: 'cancelado', em: new Date().toISOString() }); toast('Pedido cancelado.'); verPedido(); } }))); };
      u.addEventListener('change', async () => { const x = (await db.doc('utilizadores/' + idUtil(u.value)).get()).data(); if (x && !ultimo.local) loc.value = x.dist ? `SDEJT ${distName(x.dist)}` : 'DPE Tete'; verPedido(); });
      if (ultimo.utilizador) u.value = ultimo.utilizador;
      const msg = h('p', { class: 'note', text: '' });
      const go_ = async () => {
        // depois de 5 tentativas erradas, espera crescente (30 s, 60 s, 120 s…) antes de aceitar nova tentativa
        const LF = (S.loginFalhas ||= { n: 0, ate: 0 }); if (Date.now() < LF.ate) { msg.textContent = `Demasiadas tentativas erradas. Aguarde ${Math.ceil((LF.ate - Date.now()) / 1000)} segundos.`; msg.className = 'pill bad'; return; }
        const id = idUtil(u.value);
        // a palavra-passe confere-se no processo principal, que guarda a sessão (utilizador, perfil e distrito)
        try { await db.__flush?.(); } catch {}
        const r = await window.educstat.entrar(id, p.value);
        if (r?.erro === 'pendente') { msg.textContent = 'A sua conta ainda aguarda aprovação do administrador (SDEJT ou DPE).'; msg.className = 'pill warn'; return; }
        if (r?.erro === 'expirada') { msg.textContent = 'A palavra-passe temporária expirou. Peça uma nova ao administrador do SDEJT ou à DPE (“Esqueci a palavra-passe”).'; msg.className = 'pill bad'; return; }
        if (!r?.ok) { LF.n++; if (LF.n >= 5) LF.ate = Date.now() + 30000 * 2 ** Math.min(5, LF.n - 5); registar('entrada recusada', { alvo: id }); msg.textContent = r?.erro || 'Utilizador ou palavra-passe errados, ou utilizador desactivado.'; msg.className = 'pill bad'; return; }
        LF.n = 0;
        if (r.recuperacao) await codigoBox('Código de recuperação do criador', r.recuperacao, 'Guarde este código fora do computador (num papel ou cofre). Serve uma única vez, para recuperar o acesso de administrador se perder a palavra-passe, e não pode ser mostrado outra vez.');
        await entrou(r.utilizador, loc.value);
      };
      p.onkeydown = (e) => { if (e.key === 'Enter') go_(); }; u.onkeydown = (e) => { if (e.key === 'Enter') p.focus(); };
      card.replaceChildren(...cab(),
        h('p', { class: 'lede', text: vazio ? 'Primeira vez neste computador. Para entrar com as credenciais originais do seu SDEJT (o código do distrito, por exemplo 0905, e a palavra-passe dada pela DPE), carregue primeiro o ficheiro de configuração que a DPE lhe enviou. Sem ficheiro, crie a conta de administrador em “Criar conta”.' : 'Estatísticas da educação da Província de Tete. Entre com o seu utilizador.' }),

        h('label', { class: 'f' }, 'Utilizador', u), h('label', { class: 'f' }, 'Palavra-passe', campoSenha(p)), h('label', { class: 'f' }, 'Local de trabalho hoje', loc), h('button', { class: 'btn primary', text: 'Entrar', onclick: go_ }), msg, pedidoBox,
        vazio ? (() => { const pin = h('input', { type: 'password', placeholder: 'PIN dado pela DPE' }); const m2 = h('p', { class: 'note' });
          return h('details', { class: 'cfg-novo', open: true }, h('summary', { text: 'Computador novo de um SDEJT: carregar o ficheiro da DPE' }), h('div', { class: 'cfg-novo-c' }, h('label', { class: 'f' }, 'PIN do ficheiro', campoSenha(pin)), h('button', { class: 'btn', 'data-largar': 'sim', text: 'Escolher o ficheiro (.educcfg)…', onclick: async () => {
            if (pin.value.length < 6) { m2.textContent = 'Escreva primeiro o PIN (6 ou mais caracteres).'; return; }
            const r = await window.educstat.cfgComputador('importar', { pin: pin.value }); if (!r) return; if (r.erro) { m2.textContent = r.erro; m2.className = 'pill bad'; return; }
            await importarUtilizadoresCfg(r.utilizadores); S.inst = { papel: 'distrito', dist: +r.dist, id: (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).slice(0, 12) }; await db.doc('config/instalacao').set(S.inst);
            m2.className = 'pill ok'; m2.textContent = `Computador configurado para o SDEJT de ${distName(+r.dist)} (${(r.utilizadores || []).length} utilizadores). Entre agora com o código do distrito e a sua palavra-passe.`; u.value = String(r.dist).padStart(4, '0'); p.focus();
          } })), m2); })() : null,
        h('div', { class: 'row between', style: 'gap:6px' },
          h('button', { class: 'btn sm link', text: vazio ? 'Criar a conta de administrador' : 'Criar conta', title: 'Criar uma conta nova neste computador', onclick: () => { aba = 'criar'; desenhar(); } }),
          h('button', { class: 'btn sm link', text: 'Recuperação de emergência', onclick: async () => {
            const codigo = await promptBox('Introduza o código único de recuperação do criador:', { okLabel: 'Entrar em emergência', placeholder: 'código de recuperação' }); if (!codigo) return;
            const r = await window.educstat.recuperacao('usar', { codigo });
            if (!r?.ok) { msg.textContent = r?.erro || 'Código inválido.'; msg.className = 'pill bad'; return; }
            msg.textContent = 'Sessão de emergência iniciada. Altere a palavra-passe do administrador assim que possível.'; msg.className = 'pill warn'; await entrou(r.utilizador, loc.value);
          } }),
          h('button', { class: 'btn sm link', text: 'Esqueci a palavra-passe', onclick: async () => {
            const id = idUtil(u.value); if (!id) { msg.textContent = 'Escreva primeiro o seu utilizador.'; return; }
            const x = (await db.doc('utilizadores/' + id).get()).data();
            if (!x) { msg.textContent = 'Esse utilizador não existe neste computador. Contacte o administrador do SDEJT ou a DPE.'; return; }
            const mid = 'pedido_' + Date.now() + '_' + id;
            await db.doc('mensagens/' + mid).set({ id: mid, tipo: 'senha', texto: `Pedido de reposição da palavra-passe do utilizador ${id} (${x.nome}). Local: ${loc.value}.`, de: x.nome, deUtil: id, deDist: +x.dist || 0, deLocal: loc.value, para: 0, em: new Date().toISOString(), threadId: mid });
            msg.className = 'pill ok'; msg.textContent = 'Pedido registado. O administrador do seu SDEJT ou a DPE vai repor a palavra-passe e comunicar-lhe uma palavra-passe temporária. Se entretanto se lembrar, pode cancelar o pedido aqui.'; verPedido();
          } }),
          acesso.visitante !== false && !vazio ? h('button', { class: 'btn sm', text: 'Entrar como visitante', title: 'Só ver: sem alterar dados, sem descarregar relatórios nem exportar', onclick: async () => { const r = await window.educstat.entrarVisitante(); if (r?.ok) entrou({ utilizador: 'visitante', nome: 'Visitante', perfil: 0, dist: 0 }, loc.value); else { msg.textContent = r?.erro || 'Não foi possível entrar como visitante.'; msg.className = 'pill bad'; } } }) : null),
        rodape());
      if (u.value) verPedido();
      setTimeout(() => u.focus(), 50);
    };
    const desenharCriar = () => {
      const u = h('input', { type: 'text', autocomplete: 'username', placeholder: 'ex.: john.doe' }), n = h('input', { type: 'text', placeholder: 'Nome completo' });
      const p1 = h('input', { type: 'password', autocomplete: 'new-password' }), p2 = h('input', { type: 'password', autocomplete: 'new-password' });
      const papel = h('select', {}, h('option', { value: 'distrito', text: 'SDEJT (um distrito)' }), h('option', { value: 'central', text: 'DPE Tete (Direcção Provincial)' }));
      const dist = h('select', {}, S.cod.distritosTodos.map((d) => h('option', { value: d[0], text: d[1], selected: +instL?.dist === d[0] })));
      if (instL?.papel === 'central') setTimeout(() => { papel.value = 'central'; dist.disabled = true; }, 0);
      const perfil = h('select', {}, h('option', { value: 2, text: 'Introdução de dados' }), h('option', { value: 1, text: 'Consulta (só ver)' }));
      papel.onchange = () => { dist.disabled = papel.value !== 'distrito'; };
      const msg = h('p', { class: 'note' });
      const criar = async () => {
        const id = u.value.trim().toLowerCase();
        if (!/^[a-z0-9._-]{2,30}$/.test(id) || /^sdejt_/.test(id)) { msg.textContent = 'Utilizador inválido: letras, números, ponto, hífen ou sublinhado (as contas sdejt_09xx são criadas pela DPE).'; return; }
        if (!n.value.trim()) { msg.textContent = 'Escreva o nome completo.'; return; }
        if (p1.value.length < 8 || /^(admin|12345678|password|educstat|87654321|qwertyui)$/i.test(p1.value)) { msg.textContent = 'Escolha uma palavra-passe com pelo menos 8 caracteres, que não seja uma palavra-passe comum.'; return; }
        if (p1.value !== p2.value) { msg.textContent = 'As palavras-passe não coincidem.'; return; }
        if ((await db.doc('utilizadores/' + id).get()).exists) { msg.textContent = 'Esse utilizador já existe.'; return; }
        const d = papel.value === 'distrito' ? +dist.value : 0;
        const { sal, hash } = await window.educstat.hash(p1.value); const em = new Date().toISOString();
        if (vazio) {
          // primeiro utilizador deste computador: é o administrador e diz onde o computador trabalha
          await db.doc('utilizadores/' + id).set({ utilizador: id, nome: n.value.trim(), perfil: 3, dist: d, activo: true, sal, hash, mudar: false, criado: em, em, senhaEm: em, central: papel.value === 'central', local: true });
          S.inst = { papel: papel.value, dist: d, id: (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).slice(0, 12) }; await db.doc('config/instalacao').set(S.inst);
          try { await db.__flush?.(); } catch {} const r = await window.educstat.entrar(id, p1.value); if (!r?.ok) { msg.textContent = 'Conta criada; entre agora em “Iniciar sessão”.'; return; }
          if (r.recuperacao) await codigoBox('Código de recuperação do criador', r.recuperacao, 'Guarde este código fora do computador (num papel ou cofre). Serve uma única vez, para recuperar o acesso de administrador se perder a palavra-passe, e não pode ser mostrado outra vez. Pode gerar outro mais tarde em Administração → Segurança.');
          await entrou(r.utilizador, d ? `SDEJT ${distName(d)}` : 'DPE Tete'); return;
        }
        // com utilizadores já criados: a conta fica a aguardar aprovação do administrador do distrito ou da DPE
        await db.doc('utilizadores/' + id).set({ utilizador: id, nome: n.value.trim(), perfil: +perfil.value, dist: d, activo: false, pendente: true, sal, hash, mudar: false, criado: em, em, senhaEm: em, alteradoNoDistrito: d ? em : undefined });
        const mid = 'conta_' + Date.now() + '_' + id;
        await db.doc('mensagens/' + mid).set({ id: mid, tipo: 'conta', texto: `Pedido de conta: ${id} (${n.value.trim()}), ${+perfil.value === 2 ? 'introdução de dados' : 'consulta'}, ${d ? distName(d) : 'DPE'}.`, de: n.value.trim(), deUtil: id, deDist: d, para: 0, em, threadId: mid });
        msg.className = 'pill ok'; msg.textContent = 'Pedido de conta enviado. Pode entrar depois de o administrador do SDEJT ou da DPE o aprovar.';
      };
      card.replaceChildren(...cab(),
        h('p', { class: 'lede', text: vazio ? 'Primeira utilização neste computador: crie a conta de administrador e indique onde o computador vai trabalhar. (Se o seu SDEJT já tem conta criada pela DPE, use antes “Iniciar sessão” com o código do distrito.)' : 'Peça uma conta nova. Fica activa depois de o administrador do SDEJT ou da DPE a aprovar.' }),
        h('label', { class: 'f' }, vazio ? 'Este computador é do' : 'Trabalho no', papel), h('label', { class: 'f' }, 'Distrito', dist), vazio ? null : h('label', { class: 'f' }, 'Perfil pretendido', perfil),
        h('label', { class: 'f' }, 'Utilizador', u), h('label', { class: 'f' }, 'Nome completo', n), h('label', { class: 'f' }, 'Palavra-passe (mínimo 8 caracteres)', campoSenha(p1)), h('label', { class: 'f' }, 'Repetir a palavra-passe', campoSenha(p2)), msg,
        h('button', { class: 'btn primary', text: vazio ? 'Criar e entrar' : 'Pedir a conta', onclick: criar }),
        h('div', { class: 'row', style: 'justify-content:center;margin-top:4px' }, h('button', { class: 'btn sm link', text: '← Já tenho conta — iniciar sessão', onclick: () => { aba = 'entrar'; desenhar(); } })),
        rodape());
    };
    $('#view').replaceChildren(card); desenhar();
  });
}
function mudarSenha(obrigatorio) {
  return new Promise((resolve) => {
    const a = h('input', { type: 'password' }), b = h('input', { type: 'password' }); const msg = h('p', { class: 'note' });
    const m = h('div', { class: 'modal' }, h('div', {}, h('h2', { text: obrigatorio ? 'Escolha uma palavra-passe nova' : 'Mudar a palavra-passe' }),
      h('label', { class: 'f' }, 'Nova palavra-passe (mínimo 8 caracteres)', campoSenha(a)), h('label', { class: 'f' }, 'Repetir', campoSenha(b)), msg,
      h('div', { class: 'row', style: 'justify-content:flex-end' }, obrigatorio ? null : h('button', { class: 'btn', text: 'Cancelar', onclick: () => { m.remove(); resolve(false); } }),
        h('button', { class: 'btn primary', text: 'Gravar', onclick: async () => {
          if (a.value.length < 8 || /^(admin|12345678|password|educstat)$/i.test(a.value)) { msg.textContent = 'A palavra-passe tem de ter pelo menos 8 caracteres e não pode ser uma palavra-passe comum.'; return; }
          if (/^(admin|123456|password)$/i.test(a.value)) { msg.textContent = 'Escolha uma palavra-passe que não seja a inicial.'; return; }
          if (a.value !== b.value) { msg.textContent = 'As duas palavras-passe não coincidem.'; return; }
          const { sal, hash } = await window.educstat.hash(a.value);
          await S.db.doc('utilizadores/' + S.sessao.utilizador).update({ sal, hash, mudar: false, temporaria: false, expira: null, senhaEm: new Date().toISOString() });
          m.remove(); toast('Palavra-passe alterada.'); resolve(true);
        } }))));
    document.body.append(m); setTimeout(() => a.focus(), 50);
  });
}
// menu interno (substitui o menu nativo Ficheiro / Ver / Ajuda; só existe depois de entrar)
VIEWS.admin = async (v) => {
  if (!DESKTOP || S.sessao?.perfil !== 3) { v.append(h('div', { class: 'empty', text: 'Só o administrador tem acesso a esta área.' })); return; }
  const st = S.adm ||= { tab: 'users' };
  v.append(h('div', {}, h('h1', { text: 'Administração' }), h('p', { class: 'lede', text: 'Utilizadores e perfis, abertura dos levantamentos, pasta de dados, cópias de segurança e sincronização com outros computadores.' })));
  await instalacao(); await carregarTrancas();
  const SO_DPE = new Set(['levs', 'pop', 'mapas', 'codigos', 'metas', 'base']);
  const TABS = [['base', 'Configurações'], ['users', 'Utilizadores'], ['prazos', ehDPE() ? 'Prazos e Harmonização' : 'Estado na DPE'], ['levs', 'Levantamentos'], ['pop', 'População'], ['access', 'Importar Access'], ['expacc', 'Exportar para Access'], ['sync', 'Sincronização'], ['mapas', 'Mapas e Quadros'], ['codigos', 'Tabelas de Códigos'], ['metas', 'Metas'], ['dados', 'Dados e Cópias'], ['reg', 'Registo de Actividade'], ...(S.sessao?.raiz ? [['super', 'Supervisão']] : [])].filter(([k]) => ehDPE() || !SO_DPE.has(k));
  if (!TABS.some(([k]) => k === st.tab)) st.tab = 'users';
  v.append(h('div', { class: 'tabs' }, TABS.map(([k, l]) => h('button', { 'aria-selected': String(st.tab === k), text: l, onclick: () => { st.tab = k; go('admin'); } }))));
  const body = h('div', { style: 'display:flex;flex-direction:column;gap:16px' }); v.append(body);
  if (st.tab === 'users') {
    await instalacao();
    if (!ehDPE() && !podeGerirUtilizadores()) {
      const q = await S.db.collection('utilizadores').get(); const list = q.docs.map((d) => d.data()).sort((a, b) => a.utilizador.localeCompare(b.utilizador));
      body.append(h('div', { class: 'card' }, h('h2', { text: 'Utilizadores (fixados pela DPE)' }), h('p', { class: 'note', text: `Esta instalação é do distrito de ${distName(S.inst.dist)}. Os utilizadores são criados e alterados só na DPE e chegam pela sincronização. Cada pessoa pode mudar a sua palavra-passe no topo do ecrã.` }),
        h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Utilizador', 'Nome', 'Perfil', 'Distrito', 'Estado', 'Origem'].map((t) => h('th', { class: 'l', text: t })))),
          h('tbody', {}, list.map((u) => h('tr', {}, h('td', { class: 'l mono', text: u.utilizador }), h('td', { class: 'l', text: u.nome }), h('td', { class: 'l', text: nomePerfil(u) }), h('td', { class: 'l', text: u.dist ? distName(u.dist) : 'Todos' }), h('td', { class: 'l', text: u.activo ? 'Activo' : 'Desactivado' }), h('td', { class: 'l', text: u.central ? 'DPE' : 'Local (inicial)' }))))))));
      return;
    }
    const distrital = !ehDPE(); const meuD = +(S.sessao?.dist || S.inst.dist);
    const q = await S.db.collection('utilizadores').get(); const todosU = q.docs.map((d) => d.data()); const list = todosU.filter((u) => !u.apagado && !u.pendente && (!u.raiz || S.sessao?.raiz) && (!distrital || +u.dist === meuD)).sort((a, b) => a.utilizador.localeCompare(b.utilizador));
    const pendentes = todosU.filter((u) => u.pendente && !u.apagado && (!distrital || +u.dist === meuD));
    const form = h('div');
    const edit = (u) => {
      const f = { utilizador: u?.utilizador || '', nome: u?.nome || '', perfil: u?.perfil || 2, dist: u?.dist || 0, activo: u ? u.activo : true, senha: '' };
      const inp = (k, l, t = 'text', dis) => { const el = h('input', { type: t, value: f[k], disabled: dis }); el.oninput = () => (f[k] = el.value); return h('label', { class: 'f' }, l, el); };
      const privD = !!S.privilegios?.[meuD]?.utilizadores;
      const superD = ehSuperDistrito();
      const perfis = distrital ? PERFIS.filter((p) => p[0] < 3 || privD || superD) : PERFIS;
      const perfil = h('select', { onchange: (e) => (f.perfil = +e.target.value) }, perfis.map((p) => h('option', { value: p[0], text: p[0] === 3 ? (distrital || +f.dist ? 'Administrador Distrital (SDEJT)' : 'Administrador Provincial (DPE)') : p[1], selected: p[0] === f.perfil })));
      if (distrital) f.dist = meuD;
      const dist = h('select', { disabled: distrital, onchange: (e) => (f.dist = +e.target.value) }, distrital ? null : h('option', { value: 0, text: 'Todos (província)' }), (distrital ? S.cod.distritosTodos.filter((d) => d[0] === meuD) : S.cod.distritosTodos).map((d) => h('option', { value: d[0], text: d[1], selected: d[0] === +f.dist })));
      const act = h('input', { type: 'checkbox', checked: f.activo, onchange: (e) => (f.activo = e.target.checked) });
      form.replaceChildren(h('div', { class: 'card', style: 'background:var(--soft)' }, h('h3', { text: u ? `Editar ${u.utilizador}` : 'Novo utilizador' }),
        h('div', { class: 'row' }, inp('utilizador', 'Utilizador (sem espaços)', 'text', !!u), inp('nome', 'Nome completo'), h('label', { class: 'f' }, 'Perfil', perfil), h('label', { class: 'f' }, 'Distrito', dist), inp('senha', u ? 'Nova palavra-passe (deixe vazio para manter)' : 'Palavra-passe inicial', 'password'), h('label', { class: 'chk' }, act, 'Activo')),
        h('p', { class: 'note', text: 'Um utilizador com distrito só introduz dados desse distrito. Vê os restantes. Na primeira entrada é obrigado a mudar a palavra-passe.' }),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', text: 'Gravar utilizador', onclick: async () => {
          const id = f.utilizador.trim().toLowerCase();
          if (!/^[a-z0-9._-]{2,30}$/.test(id)) { toast('Utilizador inválido: use letras, números, ponto ou hífen.'); return; }
          if (!f.nome.trim()) { toast('Escreva o nome.'); return; }
          if (!u && (await S.db.doc('utilizadores/' + id).get()).exists) { toast('Esse utilizador já existe.'); return; }
          if ((!u && f.senha.length < 8) || (f.senha && f.senha.length < 8)) { toast('A palavra-passe tem de ter pelo menos 8 caracteres.'); return; }
          if (u && id === S.sessao.utilizador && (f.perfil !== 3 || !f.activo)) { toast('Não pode retirar a si próprio o perfil de administrador.'); return; }
          const rec = { ...(u || {}), utilizador: id, nome: f.nome.trim(), perfil: +f.perfil, dist: +f.dist, activo: !!f.activo };
          if (f.senha) { const { sal, hash } = await window.educstat.hash(f.senha); rec.sal = sal; rec.hash = hash; rec.mudar = true; }
          if (!u) rec.criado = new Date().toISOString();
          rec.em = new Date().toISOString(); rec.central = u ? !!u.central : !distrital; rec.alteradoPor = S.sessao.utilizador; if (distrital) { rec.dist = meuD; rec.alteradoNoDistrito = rec.em; } if (f.senha) rec.senhaEm = rec.em;
          await S.db.doc('utilizadores/' + id).set(rec); await registar(u ? 'utilizador alterado' : 'utilizador criado', { alvo: id });
          toast('Utilizador gravado.'); go('admin');
        } }), h('button', { class: 'btn', text: 'Fechar', onclick: () => form.replaceChildren() }))));
    };
    const repor = async (u) => {
      if (!(await confirmBox(`Repor a palavra-passe de ${u.utilizador} (${u.nome})? É gerada uma palavra-passe temporária, que a pessoa tem de mudar ao entrar.`, 'Repor'))) return;
      const tmp = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
      const { sal, hash } = await window.educstat.hash(tmp); const em = new Date().toISOString();
      await S.db.doc('utilizadores/' + u.utilizador).set({ ...u, sal, hash, mudar: true, temporaria: true, expira: new Date(Date.now() + 30 * 864e5).toISOString(), senhaEm: em, em, ...(distrital ? { alteradoNoDistrito: em } : {}) });
      for (const m of (S.msgs || []).filter((m) => m.tipo === 'senha' && m.deUtil === u.utilizador && !m.resolvido)) await S.db.doc('mensagens/' + m.id).set({ ...m, resolvido: em, em });
      await registar('palavra-passe reposta', { alvo: u.utilizador });
      go('admin'); mostrarSenhas([[u.utilizador, u.nome, tmp]], new Date(Date.now() + 30 * 864e5).toISOString(), 'Palavra-passe reposta');
    };
    const pedidos = (S.msgs || []).filter((m) => m.tipo === 'senha' && !m.resolvido && (!distrital || +m.deDist === meuD));
    // fechar um pedido sem o executar: eliminado pelo administrador (ou cancelado por quem o fez, no ecrã de entrada)
    const fecharPedido = async (m, estado) => { const em = new Date().toISOString(); await S.db.doc('mensagens/' + m.id).set({ ...m, resolvido: em, estado, por: S.sessao.utilizador, em }); await registar('pedido ' + estado, { alvo: m.deUtil }); toast(estado === 'eliminado' ? 'Pedido eliminado.' : 'Pedido fechado.'); go('admin'); };
    if (pedidos.length) body.append(h('div', { class: 'card', style: 'border-left:4px solid var(--warn)' }, h('h2', { text: `Pedidos de reposição da palavra-passe (${pedidos.length})` }),
      h('p', { class: 'note', text: 'Se a pessoa já se lembrou da palavra-passe ou se a DPE já tratou do assunto, elimine o pedido.' }),
      pedidos.map((m) => { const u = list.find((x) => x.utilizador === m.deUtil); return h('div', { class: 'row between' }, h('span', { text: `${m.deUtil} · ${m.de}${m.deDist ? ' · ' + distName(m.deDist) : ''} · ${new Date(m.em).toLocaleString('pt-PT')}` }), h('div', { class: 'row', style: 'gap:4px' }, u ? h('button', { class: 'btn sm primary', text: 'Repor agora', onclick: () => repor(u) }) : h('span', { class: 'note', text: 'utilizador de outro nível' }), h('button', { class: 'btn sm warn', text: 'Eliminar o pedido', onclick: async () => { if (await confirmBox(`Eliminar o pedido de ${m.deUtil}? A palavra-passe não muda.`, 'Eliminar')) fecharPedido(m, 'eliminado'); } }))); })));
    // contas pedidas no ecrã de entrada (“Criar conta”): aprovar ou recusar
    if (pendentes.length) body.append(h('div', { class: 'card', style: 'border-left:4px solid var(--accent)' }, h('h2', { text: `Pedidos de conta nova (${pendentes.length})` }),
      pendentes.map((u) => h('div', { class: 'row between' }, h('span', { text: `${u.utilizador} · ${u.nome} · ${(PERFIS.find((p) => p[0] === u.perfil) || [0, ''])[1]} · ${u.dist ? distName(u.dist) : 'DPE'} · ${new Date(u.criado).toLocaleString('pt-PT')}` }),
        h('div', { class: 'row', style: 'gap:4px' }, h('button', { class: 'btn sm primary', text: 'Aprovar', onclick: async () => { const em = new Date().toISOString(); await S.db.doc('utilizadores/' + u.utilizador).set({ ...u, activo: true, pendente: false, aprovadoPor: S.sessao.utilizador, em, central: !distrital, ...(distrital ? { alteradoNoDistrito: em } : {}) }); for (const m of (S.msgs || []).filter((m) => m.tipo === 'conta' && m.deUtil === u.utilizador && !m.resolvido)) await S.db.doc('mensagens/' + m.id).set({ ...m, resolvido: em, estado: 'aprovado', em }); await registar('conta aprovada', { alvo: u.utilizador }); toast('Conta aprovada.'); go('admin'); } }),
          h('button', { class: 'btn sm warn', text: 'Recusar', onclick: async () => { if (!(await confirmBox(`Recusar o pedido de conta de ${u.utilizador}?`, 'Recusar'))) return; const em = new Date().toISOString(); await S.db.doc('utilizadores/' + u.utilizador).set({ ...u, activo: false, pendente: false, apagado: em, hash: null, sal: null, em, ...(distrital ? { alteradoNoDistrito: em } : {}) }); for (const m of (S.msgs || []).filter((m) => m.tipo === 'conta' && m.deUtil === u.utilizador && !m.resolvido)) await S.db.doc('mensagens/' + m.id).set({ ...m, resolvido: em, estado: 'recusado', em }); await registar('conta recusada', { alvo: u.utilizador }); go('admin'); } }))))));
    if (!distrital) { body.append(await cartaoAcessoEspecial()); const ci = await cartaoCredenciaisIniciais(); if (ci) body.append(ci); }
    body.append(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h2', { text: distrital ? `Utilizadores de ${distName(meuD)}` : 'Utilizadores' }), h('button', { class: 'btn primary', text: '+ Novo utilizador', onclick: () => edit(null) })), form,
      distrital ? h('p', { class: 'note', text: `A conta sdejt_0${meuD} (criada pela DPE) é o Administrador Principal de ${distName(meuD)}: cria os utilizadores do distrito (consulta, introdução de dados e outros administradores), muda nomes, perfis e repõe palavras-passe. Os outros administradores do distrito só gerem os utilizadores de consulta e de introdução. As contas criadas pela DPE só ela altera. Tudo segue para a DPE na sincronização, e a DPE pode sempre corrigir.` }) : h('p', { class: 'note', text: 'Cada distrito tem uma conta com o código do distrito (SDEJT_0901 Angónia … SDEJT_0915 Marara), criada pela DPE com uma palavra-passe temporária aleatória (válida 30 dias), que tem de ser mudada no primeiro acesso. Essa conta cria os utilizadores do seu distrito. Para um computador novo, gere o ficheiro de configuração em Sincronização.' }),
      h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, ['Utilizador', 'Nome', 'Perfil', 'Distrito', 'Estado', ''].map((t) => h('th', { class: 'l', text: t })))),
        h('tbody', {}, list.map((u) => h('tr', {}, h('td', { class: 'l mono', text: u.utilizador }), h('td', { class: 'l', text: u.nome }), h('td', { class: 'l', text: nomePerfil(u) }),
          h('td', { class: 'l', text: u.dist ? distName(u.dist) : 'Todos' }), h('td', { class: 'l', text: u.activo ? 'Activo' : 'Desactivado' }), h('td', {}, h('div', { class: 'row', style: 'gap:4px;flex-wrap:nowrap' }, h('button', { class: 'btn sm', text: 'Editar', disabled: (distrital && !ehSuperDistrito() && u.perfil === 3 && u.utilizador !== S.sessao.utilizador) || (distrital && u.central && !S.privilegios?.[meuD]?.utilizadores && u.utilizador !== S.sessao.utilizador), title: 'Conta criada pela DPE', onclick: () => edit(u) }),
            h('button', { class: 'btn sm', text: 'Repor palavra-passe', disabled: u.utilizador === S.sessao.utilizador || (distrital && !ehSuperDistrito() && u.perfil === 3) || (distrital && u.central && !S.privilegios?.[meuD]?.utilizadores), onclick: () => repor(u) }),
            // apagar: só a DPE (os SDEJT criam e alteram, mas não apagam)
            !distrital && u.utilizador !== S.sessao.utilizador ? h('button', { class: 'btn sm warn', text: 'Apagar', onclick: async () => {
              if (!(await confirmBox(`Apagar o utilizador ${u.utilizador} (${u.nome})? Deixa de poder entrar em todos os computadores, depois da sincronização. O que já introduziu fica no sistema.`, 'Apagar'))) return;
              const em = new Date().toISOString(); await S.db.doc('utilizadores/' + u.utilizador).set({ ...u, activo: false, apagado: em, hash: null, sal: null, em, senhaEm: em });
              await registar('utilizador apagado', { alvo: u.utilizador }); toast('Utilizador apagado.'); go('admin');
            } }) : null)))))))));
  } else if (st.tab === 'super') { await adminSupervisao(body);
  } else if (st.tab === 'access') { await adminAccess(body);
  } else if (st.tab === 'base') { await adminBase(body);
  } else if (st.tab === 'prazos') { await adminPrazos(body);
  } else if (st.tab === 'pop') { await adminPopulacao(body);
  } else if (st.tab === 'mapas') { await adminMapas(body);
  } else if (st.tab === 'expacc') { await adminExportAccess(body);
  } else if (st.tab === 'codigos') { await adminCodigos(body);
  } else if (st.tab === 'metas') { await adminMetas(body);
  } else if (st.tab === 'levs') {
    await loadSetup();
    const anos = ANOS;
    const tb = h('tbody', {}, anos.map((a) => h('tr', {}, h('td', { text: a }), LEVS.map(([k]) => { const c = h('input', { type: 'checkbox', checked: S.setup[`${a}_${k}`] !== false, 'aria-label': `${a} ${k}` }); c.onchange = async () => { S.setup[`${a}_${k}`] = c.checked; await S.db.doc('config/levantamentos').set(S.setup); await registar(c.checked ? 'levantamento aberto' : 'levantamento fechado', { ano: a, lev: k }); toast(`${a}: ${c.checked ? 'aberto' : 'fechado'}.`); }; return h('td', {}, c); }))));
    body.append(h('div', { class: 'card' }, h('h2', { text: 'Levantamentos abertos para introdução' }), h('p', { class: 'note', text: 'Como na tabela Setup do EducStat: um levantamento fechado fica só para consulta (o administrador continua a poder corrigir). Marque para abrir, desmarque para fechar.' }),
      h('div', { class: 'tw' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { text: 'Ano' }), LEVS.map(([, l]) => h('th', { text: l }))),
        // marcar ou desmarcar uma coluna inteira de uma vez
        h('tr', {}, h('th', { text: 'Todos os anos' }), LEVS.map(([k, l]) => h('th', {}, h('div', { class: 'row', style: 'gap:4px;justify-content:flex-end;flex-wrap:nowrap' },
          ...[[true, 'Marcar todos'], [false, 'Desmarcar todos']].map(([v_, t]) => h('button', { class: 'btn sm', text: t, onclick: async () => { for (const a of anos) S.setup[`${a}_${k}`] = v_; await S.db.doc('config/levantamentos').set(S.setup); await registar(v_ ? 'levantamentos abertos (todos os anos)' : 'levantamentos fechados (todos os anos)', { lev: k }); toast(`${l}: ${v_ ? 'todos abertos' : 'todos fechados'}.`); go('admin'); } }))))))), tb))));
  } else if (st.tab === 'sync') { await adminSync(body);
  } else if (st.tab === 'dados') {
    const info = await window.educstat.info(); const msg = h('div', { class: 'note' });
    const backup = async () => {
      const all = {}; for (const c of COLS_COPIA) { all[c] = {}; for (const d of (await S.db.collection(c).get()).docs) all[c][d.id] = d.data(); }
      try { await S.downloads.save({ filename: `EducStat_copia_${new Date().toISOString().slice(0, 10)}.json`, data: JSON.stringify({ tipo: 'educstat-copia', criado: new Date().toISOString(), dados: all }) }); msg.textContent = 'Cópia de segurança guardada.'; await registar('cópia de segurança'); } catch { msg.textContent = 'Cópia cancelada.'; }
    };
    const restore = async (buf) => {
      const f = buf ? { dados: buf } : await window.educstat.openFile(['json']); if (!f) return;
      let c; try { c = JSON.parse(new TextDecoder().decode(f.dados)); } catch { msg.textContent = 'Ficheiro inválido.'; return; }
      if (c.tipo !== 'educstat-copia') { msg.textContent = 'O ficheiro não é uma cópia de segurança do EducStat.'; return; }
      if (!(await confirmBox(`Restaurar a cópia de ${new Date(c.criado).toLocaleString('pt-PT')}? Todos os dados introduzidos neste computador serão substituídos pelos da cópia.`, 'Restaurar'))) return;
      for (const [col, docs] of Object.entries(c.dados)) {
        for (const d of (await S.db.collection(col).get()).docs) await S.db.doc(`${col}/${d.id}`).delete();
        for (const [id, v_] of Object.entries(docs)) await S.db.doc(`${col}/${id}`).set(v_);
      }
      toast('Cópia restaurada. A aplicação vai reiniciar.'); setTimeout(() => recarregar(), 1500);
    };
    body.append(h('div', { class: 'card' }, h('h2', { text: 'Pasta de dados' }), h('p', { class: 'mono', text: info.pasta }),
      h('p', { class: 'note', text: 'Os dados introduzidos ficam nesta pasta (um ficheiro por tabela). Use uma pasta deste computador. Não ponha dois computadores a trabalhar ao mesmo tempo na mesma pasta partilhada: cada um reescreve o ficheiro do ano inteiro e pode apagar o que o outro gravou. Para trabalhar em vários computadores use a sincronização (online ou por pacotes).' }),
      h('div', { class: 'row' }, h('button', { class: 'btn', text: 'Mudar a pasta de dados', onclick: async () => { const p = await window.educstat.chooseFolder(); if (p) { toast('Pasta alterada. A aplicação vai reiniciar.'); setTimeout(() => recarregar(), 1200); } } }))),
      h('div', { class: 'card' }, h('h2', { text: 'Cópias de segurança' }), h('p', { class: 'note', text: 'A cópia inclui todos os mapas introduzidos, escolas, centros, utilizadores e configurações. Faça uma cópia antes de grandes importações e no fim de cada levantamento.' }),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', text: 'Fazer cópia de segurança', onclick: backup }), h('button', { class: 'btn warn', text: 'Restaurar uma cópia…', onclick: () => restore() })), msg),
      await cartaoCopiasAuto(restore), cartaoRecuperar(info), ehDPE() && S.sessao?.perfil === 3 && !S.sessao?.raiz ? cartaoReporSistema() : null,
      h('p', { class: 'note', text: `Versão ${info.versao} · computador ${info.maquina}` }));
  } else {
    // um utilizador de distrito (mesmo num computador da DPE) só vê a actividade do seu distrito; a da conta de supervisão não aparece a ninguém
    const q0 = await S.db.collection('registo').orderBy('em', 'desc').limit(3000).get(); const meuDR = +(S.sessao?.dist || 0);
    const usD = meuDR ? new Set((await S.db.collection('utilizadores').get()).docs.map((d) => d.data()).filter((u) => +u.dist === meuDR).map((u) => u.utilizador)) : null;
    const raizes = new Set((await S.db.collection('utilizadores').get()).docs.map((d) => d.data()).filter((u) => u.raiz).map((u) => u.utilizador));
    const q = { docs: q0.docs.filter((d) => { const r = d.data(); if (!S.sessao?.raiz && raizes.has(r.por)) return false; if (!meuDR) return true; return +r.dist === meuDR || usD.has(r.por); }).slice(0, 300) };
    body.append(h('div', { class: 'card' }, h('h2', { text: 'Registo de Actividade' }), h('div', { class: 'tw tall' }, h('table', {}, h('thead', {}, h('tr', {}, ['Quando', 'Utilizador', 'Acção', 'Detalhe', 'Computador', 'IP local', 'IP público', 'Local de trabalho'].map((t) => h('th', { class: 'l', text: t })))),
      h('tbody', {}, q.docs.map((d) => d.data()).map((r) => h('tr', {}, h('td', { class: 'l', text: new Date(r.em).toLocaleString('pt-PT') }), h('td', { class: 'l', text: r.por || '' }), h('td', { class: 'l', text: r.accao }),
        h('td', { class: 'l', text: [r.ano, r.esc && (S.esc.get(r.esc)?.nome || r.esc), r.cen && (S.cen?.get(r.cen)?.nome || r.cen), r.alvo, r.n != null ? r.n + ' registos' : '', r.novos != null ? `${r.novos} novos, ${r.actual} actualizados` : '', r.lev].filter(Boolean).join(' · ') }),
        h('td', { class: 'l', text: r.maquina || '' }), h('td', { class: 'l mono', text: r.ip || '' }), h('td', { class: 'l mono', text: r.ipPublico || '' }), h('td', { class: 'l', text: r.local || '' }))))))));
  }
};

// =====================================================================
// AJUDA
// =====================================================================
const ajudaAntiga = (v) => {
  const tab = S.ajudaTab || 'como';
  v.append(h('div', { class: 'tabs' }, [['como', 'Como funciona'], ['ficha', 'Explicação dos indicadores'], ['notas', 'Notas explicativas dos mapas']].map(([k, l]) => h('button', { 'aria-selected': String(tab === k), text: l, onclick: () => { S.ajudaTab = k; go('ajuda'); } }))));
  if (tab === 'ficha') return VIEWS.indicadores(v);
  if (tab === 'notas') {
    v.append(h('div', {}, h('h1', { text: 'Notas explicativas dos mapas' }), h('p', { class: 'lede', text: 'Texto das notas e dos NB dos mapas de levantamento (2025) e de aproveitamento (2024). Ao introduzir, o mesmo texto aparece no sinal "i" ao lado de cada quadro.' })));
    for (const [nv, lev, titulo] of [['EP', 'marco', 'Ensino Primário — Levantamento 3 de Março'], ['ESG1', 'marco', 'Ensino Secundário — Levantamento 3 de Março'], ['EP', 'fim', 'Aproveitamento (26 de Dezembro)'], ['ALFA', 'alfa:marco', 'Alfabetização e EPJA — Levantamento 30 de Abril'], ['ALFA', 'alfa:fim', 'Alfabetização e EPJA — Aproveitamento 17 de Dezembro']]) {
      const ids = Object.keys(NOTAS).filter((k) => k.startsWith(lev + ':') && k.split(':').length === lev.split(':').length + 1);
      v.append(h('div', { class: 'card mapa', 'data-mapa': nv }, h('h2', { class: 'mt', text: titulo }), ids.map((k) => { const id = k.split(':').pop(); const q = quadroRef(lev, id, ANO_MAX_DADOS); const qs = Object.entries(q).filter(([n]) => n === nv || nv === 'ALFA' || (lev === 'marco' && nv === 'ESG1' && n.startsWith('ESG'))).map(([n, x]) => `Quadro ${x}`)[0];
        return h('div', { style: 'border-top:1px solid var(--line);padding-top:8px' }, h('strong', { text: `${qs ? qs + ' · ' : ''}${(lev.startsWith('alfa') ? AFORM()[lev.split(':')[1]]?.find((b) => b.id === id)?.label : FORM[lev]?.flatMap((g) => g.blocks).find((b) => b.id === id)?.label) || id}` }), h('p', { class: 'note', style: 'white-space:pre-line;font-size:13px', text: NOTAS[k] })); })));
    }
    return;
  }
  ajudaComo(v);
};

// <<V14>>
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
    S.sessao?.perfil !== 0 ? iconBtn('sino', nl ? `${nl} mensagens e notificações novas` : 'Mensagens e notificações', nl, () => (POP ? fecharPop() : abrirPop('msgs')), 'ib-msgs') : null);
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
        // graduados (aprovados na(s) classe(s) terminal(is) do nível — nos anos de transição, duas classes)
        const fins = terminalNivel(a, nv);
        const gU = U.map((u) => { const x = u.x({ nivel: nv }); let gh2 = 0, gm2 = 0, any = false; for (const fc of fins) { const C = x?.byCl[fc]; if (C && s2(C.Aprov)) { gh2 += C.Aprov[0]; gm2 += C.Aprov[1]; any = true; } } return any ? { nome: u.nome, h: gh2, m: gm2 } : null; }).filter(Boolean);
        if (gU.length) {
          const gh = gU.reduce((s, g) => s + g.h, 0), gm = gU.reduce((s, g) => s + g.m, 0);
          TAB(`${nomeN}: graduados (aprovados na ${fins.map((f) => f + 'ª').join('/')} classe) por sexo, ${porU}, ${a}`, [nomeU, 'H', 'M', 'HM', '% do total'], [...gU.map((g) => [g.nome, numTxt(g.h), numTxt(g.m), numTxt(g.h + g.m), pctTxt(div(g.h + g.m, gh + gm))]), ['Total', numTxt(gh), numTxt(gm), numTxt(gh + gm), '100,0%']], 'Levantamento de fim do ano.');
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
async function cartaoGovernanca116() {
  const escolas = S.esc?.size || 0; const centros = S.cen?.size || 0;
  const conflitos = (await S.db.collection('conflitos').get()).docs.filter((d) => !d.data()?.resolvido).length;
  const rejeitados = ((await S.db.doc('config/rejeitados').get()).data()?.lista || []).length;
  const pendentes = conflitos + rejeitados;
  return h('div', { class: 'card quality-116', 'aria-labelledby': 'quality-116-title' },
    h('h2', { id: 'quality-116-title', text: 'Centro de qualidade e governação (1.16)' }),
    h('p', { class: 'note', text: 'A qualidade é tratada antes da publicação. Os dados pessoais devem ser usados apenas para a finalidade estatística autorizada.' }),
    h('div', { class: 'quality-grid', role: 'list' }, [['Escolas no cadastro', escolas], ['Centros AEA/EPJA', centros], ['Conflitos por resolver', conflitos], ['Registos recusados', rejeitados]].map(([a, b]) => h('div', { class: 'quality-kpi', role: 'listitem' }, h('b', { text: String(b) }), h('span', { text: a })))),
    h('p', { class: pendentes ? 'pill warn' : 'pill ok', text: `${pendentes ? 'Requer atenção' : 'Sem pendências críticas locais'}. Estados: Rascunho → Validado → Revisto → Enviado → Aceite → Fechado.` }),
    h('details', {}, h('summary', { text: 'Regras de retificação e proteção de dados' }), h('ul', {}, ['Depois de Aceite ou Fechado, qualquer alteração deve indicar motivo, autor, data, valor anterior e novo valor.', 'Erros bloqueantes impedem o envio; alertas exigem justificação; avisos informam sem impedir o trabalho.', 'Antes de importações, restaurações ou migrações, faça uma cópia e confirme que ela pode ser lida.'].map((x) => h('li', { text: x })))));
}
{
  const q0 = VIEWS.qualidade;
  VIEWS.qualidade = async (v) => {
    await q0(v);
    try { const c = await cartaoConflitos(); if (c) v.insertBefore(c, v.children[1] || null); } catch (e) { console.warn(e); }
    try { const k = `${S.qSt?.ano}_${S.qSt?.lev}`; const q = S.qualCache?.[k] || Object.values(S.qualCache || {})[0]; if (q?.em) v.querySelector(':scope > div')?.append(h('p', { class: 'note', text: `Calculado em ${new Date(q.em).toLocaleString('pt-PT')}. Volta a calcular-se sozinho quando se grava um mapa ou chegam dados da sincronização.` })); } catch {}
    if (S.syncFalhasCifra?.length) v.insertBefore(h('p', { class: 'pill bad', text: `${S.syncFalhasCifra.length} registos do servidor não se conseguiram abrir na última sincronização (chave diferente ou dados estragados). Veja Administração > Sincronização > Diagnóstico.` }), v.children[1] || null);
    try { v.append(await cartaoGovernanca116()); } catch (e) { console.warn(e); }
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

// =====================================================================
// 1.11.0 — super-administrador oculto, registos recusados da sincronização, esvaziar tudo,
// remates dos mapas (moldura redonda, linhas no tema) e folheto dobrável
// =====================================================================

// torna um SVG flexível para o folheto (viewBox + largura 100%, altura pela proporção) — sem height="auto" inválido
const v20 = {
  svgFlex: (svg) => { if (!svg) return ''; const m = svg.match(/<svg([^>]*)>/); if (!m) return svg; let a = m[1];
    if (!/viewBox=/.test(a)) { const w = (a.match(/width="(\d+)"/) || [])[1], hh = (a.match(/height="(\d+)"/) || [])[1]; if (w && hh) a = `viewBox="0 0 ${w} ${hh}" ` + a; }
    a = a.replace(/\s(width|height)="[^"]*"/g, '');
    return svg.replace(/<svg[^>]*>/, `<svg ${a.trim()} width="100%" preserveAspectRatio="xMidYMid meet">`); },
};

// ---------------- super-administrador oculto (admin/admin): não aparece, não é registado nem sincronizado ----------------
const ehOculto = () => !!(S.sessao && S.sessao.oculto);
{
  const reg0 = registar;
  // eslint-disable-next-line no-global-assign
  registar = async (accao, extra = {}) => { if (ehOculto()) return; return reg0(accao, extra); };
}

// ---------------- registos recusados na sincronização: ver em detalhe e saber como corrigir ----------------
// explica cada motivo e o que fazer; o super-administrador vê primeiro, depois a DPE
const AJUDA_REJ = [
  [/trancado|publicad/i, 'A DPE já publicou ou trancou esse ano/levantamento. Para aceitar alterações, a DPE tem de reabrir o levantamento em Administração > Prazos e Harmonização.'],
  [/escola nova/i, 'A escola ainda não existe no cadastro. Só a DPE cria escolas (Escolas > nova). Depois de criada, o mapa do distrito é aceite na sincronização seguinte.'],
  [/outro distrito|outro distrito ou da DPE/i, 'A conta é de outro distrito (ou da DPE). Cada distrito só altera as suas contas e os seus dados. Confirme que o técnico entrou com a conta do seu distrito.'],
  [/origem desconhecida/i, 'A conta que gravou no servidor não está reconhecida por este computador. Sincronize as contas (a DPE) ou confirme que a conta existe e tem distrito atribuído.'],
  [/não se conseguiu abrir|decifrar/i, 'Chave da organização diferente ou dados estragados. Confirme a chave da organização em Administração > Sincronização (tem de ser a mesma em todos os computadores).'],
  [/palavra-passe/i, 'Chegou uma palavra-passe que não é mais recente do que a que já existe, ou o utilizador ainda não existe aqui. Normalmente não é preciso fazer nada.'],
  [/não entra na sincronização|não se sincroniza/i, 'Esses dados são próprios de cada computador e, por isso, não se sincronizam. Não é um erro.'],
];
const explicaRej = (m) => (AJUDA_REJ.find(([re]) => re.test(m || '')) || [, 'Veja o motivo e corrija na origem (no distrito que enviou o registo).'])[1];
async function cartaoRejeitados() {
  if (!(ehDPE() || S.sessao?.raiz)) return null;
  const d = (await S.db.doc('config/rejeitados').get()).data(); const lista = (d?.lista || []);
  const porMotivo = new Map(); for (const r of lista) porMotivo.set(r.motivo, (porMotivo.get(r.motivo) || 0) + 1);
  const st = (S.rejSt ||= { motivo: '', q: '' });
  const motivos = [...porMotivo.entries()].sort((a, b) => b[1] - a[1]);
  const filtradas = lista.filter((r) => (!st.motivo || r.motivo === st.motivo) && (!st.q || `${r.c} ${r.id} ${r.esc || ''} ${r.ano || ''} ${r.dist || ''}`.toLowerCase().includes(st.q.toLowerCase())));
  const linha = (r) => h('tr', {}, h('td', { class: 'l', text: new Date(r.em).toLocaleString('pt-PT') }), h('td', { class: 'l mono', text: r.c }), h('td', { class: 'l mono', text: r.id }),
    h('td', { class: 'l', text: [r.ano ? 'ano ' + r.ano : '', r.dist ? distName(+r.dist) : '', r.esc ? 'escola ' + r.esc : ''].filter(Boolean).join(' · ') || '—' }),
    h('td', { class: 'l', text: r.origem || '—' }), h('td', { class: 'l', text: r.motivo }));
  const corpo = h('div');
  const desenhar = () => corpo.replaceChildren(
    h('div', { class: 'row', style: 'gap:8px;align-items:flex-end;flex-wrap:wrap' },
      h('label', { class: 'f' }, 'Motivo', h('select', { onchange: (e) => { st.motivo = e.target.value; desenhar(); } }, h('option', { value: '', text: `Todos (${lista.length})` }), motivos.map(([m, n]) => h('option', { value: m, text: `${m.slice(0, 54)}${m.length > 54 ? '…' : ''} (${n})`, selected: st.motivo === m })))),
      h('label', { class: 'f' }, 'Procurar', h('input', { type: 'search', value: st.q, placeholder: 'escola, código, ano…', oninput: (e) => { st.q = e.target.value; tabela(); } })),
      h('button', { class: 'btn', text: 'Exportar (Excel)', onclick: () => { const X = window.XLSX; const wb = X.utils.book_new(); const ws = X.utils.json_to_sheet(filtradas.map((r) => ({ Quando: r.em, Colecção: r.c, Id: r.id, Ano: r.ano, Distrito: r.dist ? distName(+r.dist) : '', Escola: r.esc, Origem: r.origem, Motivo: r.motivo, 'Como corrigir': explicaRej(r.motivo) }))); X.utils.book_append_sheet(wb, ws, 'Recusados'); wb.Props = { Title: 'Registos recusados na sincronização', Author: 'Alberto Adélia Manhice', LastAuthor: 'Alberto Adélia Manhice' }; guardarXlsx(wb, `EducStat_recusados_${new Date().toISOString().slice(0, 10)}.xlsx`); } }),
      S.sessao?.raiz ? h('button', { class: 'btn warn sm', text: 'Limpar a lista', onclick: async () => { if (await confirmBox('Apagar a lista de recusados deste computador? (Os dados não são afectados; só se apaga o historial de recusas.)', 'Limpar')) { await S.db.doc('config/rejeitados').set({ lista: [], em: new Date().toISOString() }); go(current); } } }) : null),
    st.motivo ? h('p', { class: 'pill warn', style: 'white-space:normal', text: 'Como corrigir: ' + explicaRej(st.motivo) }) : null,
    h('div', { class: 'tw tall' }, h('table', {}, h('thead', {}, h('tr', {}, ['Quando', 'Colecção', 'Registo', 'Onde', 'Origem', 'Motivo da recusa'].map((t) => h('th', { class: 'l', text: t })))), h('tbody', { id: 'rej-body' }, filtradas.slice(0, 600).map(linha)))));
  const tabela = () => { const fs = lista.filter((r) => (!st.motivo || r.motivo === st.motivo) && (!st.q || `${r.c} ${r.id} ${r.esc || ''} ${r.ano || ''} ${r.dist || ''}`.toLowerCase().includes(st.q.toLowerCase()))); const b = document.getElementById('rej-body'); if (b) b.replaceChildren(...fs.slice(0, 600).map(linha)); };
  desenhar();
  return h('details', { class: 'card', open: !lista.length ? false : true, style: 'border-left:4px solid var(--bad)' },
    h('summary', { text: `Registos recusados na sincronização (${lista.length})` }),
    h('p', { class: 'note', text: 'Registos que vieram dos distritos (ou do servidor) e não foram aceites, com o motivo e como corrigir. Quando a sincronização diz “tantos recusados”, são estes. Cada computador guarda a sua lista. O super-administrador e a DPE podem vê-la.' }),
    corpo);
}
// na Qualidade (para a DPE) e na Supervisão (para o super-administrador), o visor aparece no topo
{
  const q0 = VIEWS.qualidade;
  VIEWS.qualidade = async (v) => { await q0(v); if (ehDPE() || S.sessao?.raiz) { try { const c = await cartaoRejeitados(); if (c) v.insertBefore(c, v.children[1] || null); } catch (e) { console.warn(e); } } };
}

// ---------------- Supervisão (super-administrador oculto): vê recusados primeiro e pode apagar técnicos a qualquer nível ----------------
{
  const as0 = typeof adminSupervisao === 'function' ? adminSupervisao : null;
  async function cartaoApagarTecnicos() {
    if (!S.sessao?.raiz) return null;
    const us = (await S.db.collection('utilizadores').get()).docs.map((d) => d.data()).filter((u) => u && !u.apagado && !u.raiz && u.utilizador !== S.sessao?.utilizador);
    const sel = h('select', {}, h('option', { value: '', text: '— escolher técnico —' }), us.sort((a, b) => String(a.utilizador).localeCompare(String(b.utilizador))).map((u) => h('option', { value: u.utilizador, text: `${u.utilizador} — ${u.nome || ''} (${+u.dist ? distName(+u.dist) : 'DPE'})` })));
    const msg = h('p', { class: 'note' });
    return h('details', { class: 'card', style: 'border-left:4px solid var(--bad)' }, h('summary', { text: 'Apagar um técnico (qualquer nível)' }),
      h('p', { class: 'note', text: 'Remove a conta escolhida (distrital ou provincial). Os dados que essa conta introduziu não são apagados. Esta acção não fica no registo de actividade.' }),
      h('div', { class: 'row' }, h('label', { class: 'f', style: 'flex:1;min-width:20rem' }, 'Técnico', sel), h('button', { class: 'btn warn', text: 'Apagar a conta', onclick: async () => {
        const id = sel.value; if (!id) { msg.textContent = 'Escolha um técnico.'; return; }
        if (!(await confirmBox(`Apagar a conta “${id}”? Pode voltar a ser criada depois.`, 'Apagar'))) return;
        await S.db.doc('utilizadores/' + id).set({ utilizador: id, apagado: true, activo: false, em: new Date().toISOString() });
        msg.className = 'pill ok'; msg.textContent = `Conta ${id} apagada.`; toast('Conta apagada.'); setTimeout(() => go(current), 800);
      } })), msg);
  }
  if (typeof VIEWS === 'object' && VIEWS.admin) {
    const adm0 = VIEWS.admin;
    VIEWS.admin = async (v, ...r) => { const x = await adm0(v, ...r); if ((S.adm?.tab === 'super') && S.sessao?.raiz) { try { const rj = await cartaoRejeitados(); if (rj) v.append(rj); const ap = await cartaoApagarTecnicos(); if (ap) v.append(ap); } catch (e) { console.warn(e); } } return x; }; void as0;
  }
}

// ---------------- mapas: moldura com cantos redondos (como o cartucho) e linhas no tema escolhido ----------------
{
  const mm0 = molduraMapa;
  // eslint-disable-next-line no-global-assign
  molduraMapa = (svg, o = {}) => { let out = mm0(svg, o); if (!out) return out; const t = temaRel(S.pubSt);
    // moldura exterior com cantos redondos, da mesma dimensão do cartucho (rx 3–4)
    out = out.replace(/<rect x="\.6" y="\.6" width="([\d.]+)" height="([\d.]+)" fill="none" stroke="([^"]+)" stroke-width="1"\/>/, (_m, w, h2) => `<rect rx="4" x=".6" y=".6" width="${w}" height="${h2}" fill="none" stroke="${t.br}" stroke-width="1.1"/>`);
    // divisões internas do mapa (que vinham a verde) passam a acompanhar o tema
    out = out.replace(/stroke="#1B8A3A"/g, `stroke="${t.br}"`).replace(/stroke="#0A6B45"/g, `stroke="${t.br}"`);
    return out;
  };
}
// choropleth (svgMapa): bordas dos distritos no tema (em vez de branco) e legenda com o total
{
  const sm0 = svgMapa;
  // eslint-disable-next-line no-global-assign
  svgMapa = (o) => { let s = sm0(o); if (!s) return s; const t = temaRel(S.pubSt);
    s = s.replace(/stroke="#fff" stroke-width="1\.2"/g, `stroke="${t.br}" stroke-opacity=".55" stroke-width=".9"`);
    // total na legenda (nº de unidades com valor)
    try { const n = Object.values(o.vals || {}).filter((v) => v != null).length; if (n) s = s.replace('</svg>', `<text x="12" y="18" font-size="10" font-weight="700" fill="${t.txt}">${NF.format(n)} unidades com dados</text></svg>`); } catch {}
    return s;
  };
}

// ---------------- esvaziar o sistema: apagar TUDO (inclui shapefiles, geografia, histórico de configurações e recusados) ----------------
{
  const ce0 = typeof cartaoEsvaziarSistema === 'function' ? cartaoEsvaziarSistema : null;
  if (ce0) {
    // eslint-disable-next-line no-global-assign
    cartaoEsvaziarSistema = () => {
      const card = ce0(); if (!card) return card;
      const btn = [...card.querySelectorAll('button')].find((b) => /Esvaziar o sistema/.test(b.textContent || ''));
      if (btn) { const antigo = btn.onclick; btn.onclick = async (ev) => {
        // além do que o original apaga, limpa também os mapas (shapefiles), a geografia, o histórico de configurações e a lista de recusados
        const extra = ['config/limites', 'config/limitesPostos', 'config/limitesLocalidades', 'config/geografia', 'config/rejeitados', 'config/fichaTecnica_prov'];
        try { for (const id of extra) { try { await S.db.doc(id).delete(); } catch {} } for (const d of (await S.db.collection('config').get()).docs) { if (/^fichaTecnica_/.test(d.id) || /^historico/.test(d.id)) { try { await S.db.doc('config/' + d.id).delete(); } catch {} } } S.limites = S.limitesPostos = S.limitesLocalidades = null; } catch {}
        return antigo?.call(btn, ev);
      }; }
      return card;
    };
  }
}

// ---------------- mais temas de relatório (modelos sóbrios e modernos) ----------------
if (typeof TEMAS_REL !== 'undefined' && Array.isArray(TEMAS_REL)) {
  const extra = [
    ['onu', 'Azul ONU', { br: '#009EDB', ac: '#1F3A5F', txt: '#15202B', h2: '#1F3A5F' }],
    ['esmeralda', 'Esmeralda e grafite', { br: '#0B7A5B', ac: '#2A2E33', txt: '#15221C', h2: '#2A2E33' }],
    ['bordo', 'Bordô institucional', { br: '#7A1F2B', ac: '#B9842B', txt: '#2A1518', h2: '#B9842B' }],
  ];
  for (const e of extra) if (!TEMAS_REL.some((x) => x[0] === e[0])) TEMAS_REL.push(e);
}

// ---------------- PESD (Programa de Ensino Secundário à Distância): lugar reservado para a futura base ----------------
{
  const ab2 = adminBase;
  // eslint-disable-next-line no-global-assign
  adminBase = async (body) => { await ab2(body);
    if (!ehDPE()) return;
    body.append(h('details', { class: 'card' }, h('summary', { text: 'PESD — Programa de Ensino Secundário à Distância (em preparação)' }),
      h('p', { class: 'note', text: 'Espaço reservado para a base do PESD. No futuro, importa-se aqui a compilação dos dados do PESD desde o primeiro ano, para somar aos totais dos distritos e da província. Por agora fica vazio, à espera dessa base.' }),
      h('button', { class: 'btn', disabled: true, text: 'Importar a base do PESD (em breve)' })));
  };
}

// <</V14>>


// ===================================================================================
// 1.17 — Biblioteca de Indicadores POEMA/EMIS: definição, fórmula, correspondência e origem
// Fonte: Livro de Indicadores 09 Tete (POEMA, 2020/2022). Distingue POEMA 2020, adaptado ao EducStat e SNE (2020+).
// ===================================================================================
const POEMA_IND = [
  // --- Acesso e participação (Secção B — usa dados populacionais do INE) ---
  { cod: 'B1', g: 'Acesso e participação', nome: 'Taxa Bruta de Admissão (TBA) — EP', sigla: 'TBA', un: '%',
    def: 'Mede a capacidade do sistema de admitir novos alunos na 1ª classe, independentemente da idade.',
    num: 'Novos ingressos (não repetentes) na 1ª classe', den: 'População com 6 anos de idade', formula: 'Novos ingressos na 1ª classe ÷ população de 6 anos × 100',
    fonte: 'Levantamento 3 de Março (MEC) + projecções do INE', corresp: 'novos (Quadro 1) e população de 6 anos', origem: 'POEMA 2020' },
  { cod: 'B2', g: 'Acesso e participação', nome: 'Taxa de escolarização aos 6 anos', un: '%',
    def: 'Proporção de crianças de 6 anos que estão matriculadas (em qualquer classe).', num: 'Alunos de 6 anos matriculados', den: 'População de 6 anos', formula: 'Alunos de 6 anos ÷ população de 6 anos × 100',
    fonte: 'Levantamento + INE', corresp: 'alunos por idade (Quadro 1) e população', origem: 'POEMA 2020' },
  { cod: 'B3.1', g: 'Acesso e participação', nome: 'Taxa Bruta de Escolarização (TBE) — EP', sigla: 'TBE', un: '%',
    def: 'Total de alunos no Ensino Primário em relação à população em idade oficial para esse nível.', num: 'Total de alunos matriculados no EP', den: 'População em idade oficial do EP', formula: 'Alunos no EP ÷ população em idade oficial × 100',
    fonte: 'Levantamento + INE', corresp: 'matrícula EP (Quadro 1)', origem: 'POEMA 2020: idade 6–12 (EP de 7 classes). SNE 2020+: 6–11 (EP de 6 classes). Confirme a idade oficial em uso.' },
  { cod: 'B3.2', g: 'Acesso e participação', nome: 'TBE — Ensino Secundário, 1º ciclo', sigla: 'TBE ES1', un: '%',
    def: 'Total de alunos no ES 1º ciclo em relação à população em idade oficial desse ciclo.', num: 'Alunos matriculados no ESG1', den: 'População em idade oficial do ESG1', formula: 'Alunos no ESG1 ÷ população em idade oficial × 100',
    fonte: 'Levantamento + INE', corresp: 'matrícula ESG1', origem: 'POEMA 2020: 13–15 anos. SNE: confirmar.' },
  { cod: 'B4', g: 'Acesso e participação', nome: 'Taxa Líquida de Escolarização (TLE) — EP', sigla: 'TLE', un: '%',
    def: 'Proporção de crianças na idade oficial do EP que estão matriculadas no EP (exclui alunos fora da idade).', num: 'Alunos em idade oficial matriculados no EP', den: 'População nessa idade', formula: 'Alunos de idade oficial no EP ÷ população dessa idade × 100',
    fonte: 'Levantamento + INE', corresp: 'alunos por idade no EP', origem: 'POEMA 2020 (6–12). SNE: 6–11.' },
  { cod: 'B5.1', g: 'Acesso e participação', nome: 'Taxa Bruta de Conclusão — EP', sigla: 'TBC', un: '%',
    def: 'Proporção dos que concluem a última classe do EP em relação à população com a idade oficial de conclusão.', num: 'Aprovados na última classe do EP', den: 'População com a idade oficial de conclusão do EP', formula: 'Aprovados na última classe do EP ÷ população da idade de conclusão × 100',
    fonte: 'Levantamento fim do ano + INE', corresp: 'aprovados última classe EP', origem: 'POEMA 2020 (7ª classe). SNE: 6ª classe.' },
  { cod: 'B5.2', g: 'Acesso e participação', nome: 'Taxa Bruta de Conclusão — ES 1º ciclo', sigla: 'TBC ES1', un: '%',
    def: 'Proporção dos que concluem o ES 1º ciclo em relação à população com a idade oficial de conclusão.', num: 'Aprovados na última classe do ESG1', den: 'População da idade de conclusão do ESG1', formula: 'Aprovados na última classe do ESG1 ÷ população da idade × 100',
    fonte: 'Levantamento fim do ano + INE', corresp: 'aprovados última classe ESG1', origem: 'POEMA 2020 (10ª classe).' },
  // --- Eficácia interna (Secção A) ---
  { cod: 'A4', g: 'Eficácia interna', nome: 'Taxa de desistência', un: '%',
    def: 'Proporção de alunos que abandonam a escola durante o ano lectivo.', num: 'Desistentes durante o ano', den: 'Alunos matriculados no início do ano', formula: 'Desistentes ÷ matriculados no início × 100',
    fonte: 'Levantamento fim do ano', corresp: 'desistentes (Quadro de fim do ano)', origem: 'POEMA 2020 (mantido)' },
  { cod: 'A6', g: 'Eficácia interna', nome: 'Taxa de reprovação', un: '%',
    def: 'Proporção de alunos avaliados que não transitam de classe.', num: 'Reprovados', den: 'Alunos avaliados', formula: 'Reprovados ÷ avaliados × 100',
    fonte: 'Levantamento fim do ano', corresp: 'reprovados', origem: 'POEMA 2020 (mantido)' },
  { cod: 'A7', g: 'Eficácia interna', nome: 'Taxa de aproveitamento pedagógico', un: '%',
    def: 'Proporção de alunos avaliados que são aprovados (relativa aos que fizeram a avaliação).', num: 'Aprovados', den: 'Alunos avaliados', formula: 'Aprovados ÷ avaliados × 100',
    fonte: 'Levantamento fim do ano', corresp: 'aprovados ÷ avaliados', origem: 'POEMA 2020 (mantido)' },
  { cod: 'A8', g: 'Eficácia interna', nome: 'Taxa de aproveitamento escolar', un: '%',
    def: 'Proporção de alunos aprovados relativa aos matriculados no início do ano (inclui o efeito da desistência).', num: 'Aprovados', den: 'Alunos matriculados no início do ano', formula: 'Aprovados ÷ matriculados no início × 100',
    fonte: 'Levantamento fim do ano', corresp: 'aprovados ÷ matrícula inicial', origem: 'POEMA 2020 (mantido)' },
  { cod: 'A9', g: 'Eficácia interna', nome: 'Taxa indicativa de retenção até à 3ª classe', un: '%',
    def: 'Proporção de uma coorte que chega à 3ª classe (medida indicativa da permanência nos primeiros anos).', num: 'Alunos que chegam à 3ª classe', den: 'Ingressos na 1ª classe da mesma coorte', formula: 'Chegam à 3ª classe ÷ entraram na 1ª classe × 100',
    fonte: 'Séries do levantamento', corresp: 'coortes 1ª→3ª classe', origem: 'POEMA 2020 (indicativa)' },
  { cod: 'A10', g: 'Eficácia interna', nome: 'Taxa de transição EP2 → ESG1', un: '%',
    def: 'Proporção de alunos que transitam do fim do EP para o 1º ciclo do ES.', num: 'Novos ingressos na 1ª classe do ESG1', den: 'Aprovados na última classe do EP no ano anterior', formula: 'Ingressos ESG1 ÷ aprovados última classe EP (ano anterior) × 100',
    fonte: 'Séries do levantamento', corresp: 'transição EP→ESG1', origem: 'POEMA 2020' },
  { cod: 'REP', g: 'Eficácia interna', nome: 'Proporção de repetentes', un: '%',
    def: 'Proporção de alunos matriculados que estão a repetir a classe.', num: 'Alunos repetentes', den: 'Alunos matriculados', formula: 'Repetentes ÷ matriculados × 100',
    fonte: 'Levantamento 3 de Março', corresp: 'repetentes (Quadro 1)', origem: 'POEMA 2020 (mantido)' },
  // --- Professores e recursos humanos ---
  { cod: 'A11', g: 'Professores e recursos humanos', nome: 'Rácio alunos/professor e alunos/turma — EP1', un: 'nº',
    def: 'Número médio de alunos por professor e por turma no EP 1º ciclo.', num: 'Alunos (EP1)', den: 'Professores (ou turmas) do EP1', formula: 'Alunos ÷ professores; Alunos ÷ turmas',
    fonte: 'Levantamento 3 de Março', corresp: 'alunos, professores, turmas (EP1)', origem: 'POEMA 2020' },
  { cod: 'A12', g: 'Professores e recursos humanos', nome: 'Rácio alunos/turma por classe', un: 'nº',
    def: 'Número médio de alunos por turma, em cada classe.', num: 'Alunos da classe', den: 'Turmas da classe', formula: 'Alunos ÷ turmas (por classe)',
    fonte: 'Levantamento 3 de Março', corresp: 'alunos e turmas por classe', origem: 'POEMA 2020' },
  { cod: 'A13', g: 'Professores e recursos humanos', nome: 'Proporção de professores com formação psicopedagógica — EP', un: '%',
    def: 'Proporção de professores do EP com formação psicopedagógica.', num: 'Professores do EP com formação', den: 'Total de professores do EP', formula: 'Professores com formação ÷ total × 100',
    fonte: 'Levantamento 3 de Março', corresp: 'professores com formação (EP)', origem: 'POEMA 2020' },
  { cod: 'A14', g: 'Professores e recursos humanos', nome: 'Proporção de professores com formação psicopedagógica — ES1', un: '%',
    def: 'Proporção de professores do ESG1 com formação psicopedagógica.', num: 'Professores do ESG1 com formação', den: 'Total de professores do ESG1', formula: 'Professores com formação ÷ total × 100',
    fonte: 'Levantamento 3 de Março', corresp: 'professores com formação (ESG1)', origem: 'POEMA 2020' },
  { cod: 'A15', g: 'Professores e recursos humanos', nome: 'Rácio alunos por professor com formação — EP', un: 'nº',
    def: 'Número médio de alunos por cada professor com formação psicopedagógica no EP.', num: 'Alunos do EP', den: 'Professores do EP com formação', formula: 'Alunos ÷ professores com formação',
    fonte: 'Levantamento 3 de Março', corresp: 'alunos e professores com formação (EP)', origem: 'POEMA 2020' },
  { cod: 'A16', g: 'Professores e recursos humanos', nome: 'Proporção de professoras — EP e ESG1', un: '%',
    def: 'Proporção de professores que são mulheres (equidade de género no corpo docente).', num: 'Professoras (mulheres)', den: 'Total de professores', formula: 'Professoras ÷ total × 100',
    fonte: 'Levantamento 3 de Março', corresp: 'professores por sexo', origem: 'POEMA 2020' },
  // --- Infra-estruturas e materiais ---
  { cod: 'A17', g: 'Infra-estruturas e materiais', nome: 'Alunos com livros por classe e título — EP', un: '%',
    def: 'Número e proporção de alunos com livros escolares, por classe e por disciplina, no EP.', num: 'Alunos com livro', den: 'Alunos matriculados', formula: 'Alunos com livro ÷ matriculados × 100',
    fonte: 'Levantamento 3 de Março', corresp: 'livros por classe (EP)', origem: 'POEMA 2020' },
  { cod: 'A18', g: 'Infra-estruturas e materiais', nome: 'Salas por material de construção e % de salas convencionais', un: '%',
    def: 'Distribuição das salas de aula por material (cimento, tijolo, maticado…) e proporção de salas de construção convencional.', num: 'Salas convencionais (cimento)', den: 'Total de salas', formula: 'Salas convencionais ÷ total de salas × 100',
    fonte: 'Levantamento 3 de Março', corresp: 'salas por tipo (carta escolar)', origem: 'POEMA 2020' },
];
const POEMA_GRUPOS = ['Acesso e participação', 'Eficácia interna', 'Professores e recursos humanos', 'Infra-estruturas e materiais'];
function corOrigemPoema(o) { return /SNE/i.test(o) ? 'warn' : 'ok'; }
function fichaIndicadorPoema(x) {
  const linha = (k, v) => v ? h('tr', {}, h('td', { class: 'l', text: k }), h('td', { class: 'l', style: 'white-space:normal', text: v })) : null;
  return h('details', { class: 'card poema-ind' }, h('summary', {}, h('b', { text: `${x.cod}. ${x.nome}` }), x.sigla ? h('span', { class: 'note', text: ' · ' + x.sigla } ) : null),
    h('p', { style: 'white-space:normal', text: x.def }),
    h('p', { class: 'pill ' + corOrigemPoema(x.origem), style: 'white-space:normal', text: 'Origem: ' + x.origem }),
    h('div', { class: 'tw' }, h('table', { class: 'kv' },
      linha('Fórmula', x.formula), linha('Numerador', x.num), linha('Denominador', x.den), linha('Unidade', x.un),
      linha('Fonte', x.fonte), linha('Grupo', x.g), linha('No EducStat', x.corresp))));
}
function bibliotecaPoema(v) {
  const st = (S.poemaSt ||= { q: '', g: '' });
  const topo = h('div', { class: 'card' },
    h('h2', { text: 'Biblioteca de Indicadores (POEMA / EMIS)' }),
    h('p', { class: 'note', style: 'white-space:normal', text: 'Definição, fórmula, numerador, denominador, fonte e correspondência de cada indicador, a partir do Livro de Indicadores do POEMA (2020/2022). As etiquetas indicam se a definição é do POEMA 2020 ou se foi actualizada pelo SNE (idades e classes oficiais mudaram a partir de 2020/2023 — confirme a idade oficial em uso antes de publicar).' }),
    h('div', { class: 'row' },
      h('label', { class: 'f' }, 'Procurar', h('input', { type: 'search', value: st.q, placeholder: 'taxa, aprovação, livros, salas…', oninput: (e) => { st.q = e.target.value; render(); } })),
      h('label', { class: 'f' }, 'Grupo', h('select', { onchange: (e) => { st.g = e.target.value; render(); } }, h('option', { value: '', text: 'Todos os grupos' }), POEMA_GRUPOS.map((g) => h('option', { value: g, text: g, selected: st.g === g }))))));
  const lista = h('div');
  const render = () => { lista.replaceChildren(); const q = st.q.trim().toLowerCase();
    for (const g of POEMA_GRUPOS) { if (st.g && st.g !== g) continue;
      const items = POEMA_IND.filter((x) => x.g === g && (!q || `${x.cod} ${x.nome} ${x.sigla || ''} ${x.def} ${x.formula} ${x.corresp}`.toLowerCase().includes(q)));
      if (!items.length) continue;
      lista.append(h('h3', { class: 'poema-g', text: g }), ...items.map(fichaIndicadorPoema)); } };
  render();
  v.append(topo, lista);
}
// nova aba "Indicadores (POEMA)" na Ajuda + atalho "Como é calculado?"
{
  const aj = VIEWS.ajuda;
  // eslint-disable-next-line no-global-assign
  VIEWS.ajuda = (v) => {
    if (S.ajudaTab === 'poema') {
      v.append(h('div', { class: 'row between' }, h('div', {}, h('h1', { text: 'Ajuda' }), h('p', { class: 'lede', text: 'Biblioteca de indicadores: definições e fórmulas.' }))));
      v.append(h('div', { class: 'tabs' }, [['como', 'Como funciona'], ['ficha', 'Explicação dos indicadores'], ['notas', 'Notas explicativas dos mapas'], ['poema', 'Indicadores (POEMA)']].map(([k, l]) => h('button', { 'aria-selected': String(k === 'poema'), text: l, onclick: () => { S.ajudaTab = k; go('ajuda'); } }))));
      bibliotecaPoema(v); return;
    }
    aj(v);
    const tabs = v.querySelector('.tabs');
    if (tabs && ![...tabs.children].some((b) => /POEMA/.test(b.textContent))) tabs.append(h('button', { 'aria-selected': 'false', text: 'Indicadores (POEMA)', onclick: () => { S.ajudaTab = 'poema'; go('ajuda'); } }));
  };
}



// ===================================================================================
// 1.18 — mais temas e cores (interface e relatórios), validação metodológica e atalhos
// ===================================================================================
// novas paletas modernas da interface (o CSS está em index.html)
if (typeof PALETAS !== 'undefined' && Array.isArray(PALETAS)) {
  for (const p of [['indigo', 'Índigo', '#4F46E5'], ['turquesa', 'Turquesa', '#0D9488'], ['ardosia', 'Ardósia', '#334155'], ['ambar', 'Âmbar', '#B45309'], ['esmeralda', 'Esmeralda', '#059669'], ['carmim', 'Carmim', '#BE123C']])
    if (!PALETAS.some((x) => x[0] === p[0])) PALETAS.push(p);
}
// novos temas de relatório (modernos)
if (typeof TEMAS_REL !== 'undefined' && Array.isArray(TEMAS_REL)) {
  for (const t of [
    ['indigo', 'Índigo e âmbar', { br: '#4338CA', ac: '#B45309', txt: '#1E1B4B', h2: '#4F46E5' }],
    ['turquesa', 'Turquesa e grafite', { br: '#0F766E', ac: '#334155', txt: '#132A27', h2: '#0D9488' }],
    ['onu', 'Azul ONU', { br: '#009EDB', ac: '#1F3A5F', txt: '#15202B', h2: '#1F3A5F' }],
    ['ardosia', 'Ardósia e céu', { br: '#1E293B', ac: '#0284C7', txt: '#0F172A', h2: '#334155' }],
  ]) if (!TEMAS_REL.some((x) => x[0] === t[0])) TEMAS_REL.push(t);
}

// ---------------- validação metodológica automática (centro de qualidade) ----------------
async function validacaoMetodologica(ano, distSel) {
  const dists = distSel === 'Todos' || distSel == null ? S.cod.distritos.map((d) => d[0]) : [+distSel];
  const grupos = new Map(); // rótulo -> { lev, n, exemplos: [] }
  const add = (lev, rotulo, detalhe) => { const k = rotulo; const g = grupos.get(k) || { lev, n: 0, exemplos: [] }; g.n++; if (g.exemplos.length < 8) g.exemplos.push(detalhe); if (lev === 'erro') g.lev = 'erro'; grupos.set(k, g); };
  const normRotulo = (msg) => String(msg).replace(/^Aviso:\s*/, '').replace(/\s*\([^)]*\)/g, '').replace(/:.*/, '').replace(/\d+/g, 'N').trim();
  // 1) regras por mapa (reutiliza o motor existente)
  for (const d of dists) { const fm = await fichasEfectivas(+ano, d, true);
    for (const f of fm.values()) { const nome = S.esc.get(f.esc)?.nome || String(f.esc);
      for (const p of problemasDetalhe(f)) add(p.g === 'erro' ? 'erro' : 'aviso', normRotulo(p.msg), `${nome} (${f.esc}) · ${distName(d)}: ${p.msg}`);
      // fim do ano: aprovados não podem exceder os avaliados
      const fim = f.fim?.aprov || []; // depende da estrutura; protegido por try
    } }
  // 2) escolas duplicadas no cadastro (mesmo código)
  { const vistos = new Map(); for (const e of S.esc.values()) { if (e.removida) continue; const k = +e.cod; vistos.set(k, (vistos.get(k) || 0) + 1); }
    for (const [k, n] of vistos) if (n > 1) add('erro', 'Escola com código duplicado no cadastro', `Código ${k} aparece ${n} vezes`); }
  // 3) cobertura do levantamento abaixo de 95%
  for (const d of dists) { try { const ant = await fichasEfectivas(+ano - 1, d), act = await fichasEfectivas(+ano, d);
    const com = (m) => new Set([...m.values()].filter((f) => f.marco?.alunos?.length).map((f) => f.esc));
    const A = com(ant), B = com(act); const esp = [...A].filter((e) => !S.esc.get(e)?.fecho || +S.esc.get(e).fecho > +ano);
    if (esp.length) { const cob = esp.filter((e) => B.has(e)).length / esp.length; if (cob < 0.95) add('aviso', 'Cobertura do levantamento abaixo de 95%', `${distName(d)}: cobertura de ${pctTxt(cob)} (${esp.filter((e) => B.has(e)).length} de ${esp.length})`); }
  } catch {} }
  const linhas = [...grupos.entries()].map(([rot, g]) => ({ rot, lev: g.lev, n: g.n, exemplos: g.exemplos })).sort((a, b) => (a.lev === b.lev ? b.n - a.n : a.lev === 'erro' ? -1 : 1));
  return linhas;
}
function cartaoValidacao() {
  const st = (S.valSt ||= { ano: ANO_MAX_DADOS - 1, dist: 'Todos' });
  const out = h('div'); const msg = h('p', { class: 'note' });
  const sel = (k, list, lab) => h('label', { class: 'f' }, lab, h('select', { onchange: (e) => { st[k] = e.target.value; } }, list.map((o) => h('option', { value: o[0], text: o[1], selected: String(o[0]) === String(st[k]) }))));
  const correr = async () => { msg.textContent = 'A validar…'; out.replaceChildren();
    let linhas; try { linhas = await validacaoMetodologica(+st.ano, st.dist); } catch (e) { msg.textContent = 'Não foi possível validar: ' + e.message; return; }
    const erros = linhas.filter((l) => l.lev === 'erro'), avisos = linhas.filter((l) => l.lev !== 'erro');
    const nErr = erros.reduce((t, l) => t + l.n, 0), nAvi = avisos.reduce((t, l) => t + l.n, 0);
    msg.className = nErr ? 'pill bad' : nAvi ? 'pill warn' : 'pill ok';
    msg.textContent = nErr ? `${NF.format(nErr)} erro(s) bloqueante(s) e ${NF.format(nAvi)} aviso(s) a confirmar.` : nAvi ? `Sem erros bloqueantes; ${NF.format(nAvi)} aviso(s) a confirmar.` : 'Sem problemas metodológicos detectados neste ano.';
    const bloco = (tit, arr, cls) => arr.length ? h('div', {}, h('h3', { text: tit }), h('div', { class: 'tw tall' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { class: 'l', text: 'Regra' }), h('th', { text: 'Casos' }), h('th', { class: 'l', text: 'Exemplos' }))),
      h('tbody', {}, arr.map((l) => h('tr', {}, h('td', { class: 'l', style: 'white-space:normal', text: l.rot }), h('td', { text: NF.format(l.n) }), h('td', { class: 'l note', style: 'white-space:normal', text: l.exemplos.slice(0, 3).join(' · ') + (l.n > 3 ? ' …' : '') }))))))) : null;
    out.append(bloco('Erros bloqueantes (corrigir antes de publicar)', erros, 'bad'), bloco('Avisos e anomalias (confirmar ou justificar)', avisos, 'warn'),
      h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'btn', text: 'Exportar validação (Excel)', disabled: !linhas.length, onclick: () => { const X = window.XLSX; const wb = X.utils.book_new(); const rows = []; for (const l of linhas) for (const ex of l.exemplos) rows.push({ Gravidade: l.lev === 'erro' ? 'Erro' : 'Aviso', Regra: l.rot, Casos: l.n, Exemplo: ex }); X.utils.book_append_sheet(wb, X.utils.json_to_sheet(rows), 'Validação'); wb.Props = { Title: `Validação metodológica ${st.ano}`, Author: 'Alberto Adélia Manhice', LastAuthor: 'Alberto Adélia Manhice' }; guardarXlsx(wb, `EducStat_validacao_${st.ano}.xlsx`); } }),
        h('button', { class: 'btn', text: 'Abrir no Explorar', onclick: () => { (S.exv ||= {}).ano = +st.ano; S.exv.dist = st.dist; go('explorar'); } }))); };
  return h('div', { class: 'card' }, h('h2', { text: 'Validação metodológica' }),
    h('p', { class: 'note', style: 'white-space:normal', text: 'Verifica automaticamente incoerências antes da publicação: repetentes acima dos matriculados, mais turmas do que alunos, aprovados acima dos avaliados, percentagens impossíveis, cobertura abaixo de 95%, escolas com código duplicado e outras regras dos mapas. Os erros devem ser corrigidos; os avisos devem ser confirmados ou justificados.' }),
    h('div', { class: 'row' }, sel('ano', desc(ANOS).map((a) => [a, a]), 'Ano'), sel('dist', [['Todos', 'Província (todos)'], ...S.cod.distritos], 'Distrito'), h('button', { class: 'btn primary', text: 'Correr a validação', onclick: correr })), msg, out);
}
{
  const q0 = VIEWS.qualidade;
  // eslint-disable-next-line no-global-assign
  VIEWS.qualidade = async (v) => { await q0(v); try { v.append(cartaoValidacao()); } catch (e) { console.warn(e); } };
}

// ---------------- "Como é calculado?" — dos indicadores para a Biblioteca POEMA ----------------
{
  const iv = VIEWS.indicadores;
  // eslint-disable-next-line no-global-assign
  VIEWS.indicadores = (v) => { iv(v);
    if (!v.querySelector('.btn-poema')) v.querySelector('h1')?.after(h('div', { class: 'row', style: 'margin:4px 0' },
      h('button', { class: 'btn btn-poema', text: 'Como é calculado? — Biblioteca de Indicadores (POEMA)', onclick: () => { S.ajudaTab = 'poema'; go('ajuda'); } }))); };
}



// ===================================================================================
// 1.19 — Painel EMIS: os indicadores organizados em 6 grupos (modelo EMIS/POEMA)
// ===================================================================================
const EMIS_GRUPOS = [
  ['Acesso e participação', '#2563EB', ['matric', 'escolas', 'novos', 'c1id6', 'cobFim', 'tbe', 'tle']],
  ['Eficácia interna', '#0D9488', ['aprovEsc', 'aprov', 'reprov', 'desist', 'repet']],
  ['Qualidade e resultados', '#7C3AED', ['tbc', 'ret3', 'sob']],
  ['Professores e recursos humanos', '#B45309', ['prof', 'alprof', 'altur', 'formados', 'pctProfF']],
  ['Infra-estruturas e materiais', '#0369A1', ['alsala', 'prec', 'pctConv', 'livre', 'livP', 'livM', 'elect', 'agua', 'sanit']],
  ['Equidade e inclusão', '#BE185D', ['pctF', 'ipg', 'ipgAp', 'orf', 'defic']],
];
const LABEL_IND = Object.fromEntries((typeof IND !== 'undefined' ? IND : []).filter((x) => x.length > 1).map((x) => [x[0], x[1]]));
const FONTE_IND = Object.fromEntries((typeof IND !== 'undefined' ? IND : []).filter((x) => x.length > 1).map((x) => [x[0], x[3] || '']));
function painelEMIS(v) {
  const f = S.pf || {}; const ano = +f.ano; const scope = { dist: f.dist ?? 'Todos', tipo: f.tipo ?? 'Todos', nivel: f.nivel ?? 'Todos' };
  const lugar = scope.dist === 'Todos' ? 'Província de Tete' : distName(+scope.dist);
  const val = (k) => { try { return IX(ano, scope, k); } catch { return null; } };
  const tile = (k) => { const lab = LABEL_IND[k] || k; const vv = val(k); const inv = /reprov|desist|repet|sob|prec|livre|órf|orf/.test(k);
    return h('div', { class: 'emis-tile', title: FONTE_IND[k] || '' },
      h('div', { class: 'emis-v', text: fmt(k, vv) }),
      h('div', { class: 'emis-l', text: lab })); };
  const card = h('div', { class: 'card' },
    h('div', { class: 'row between' }, h('h2', { text: 'Painel EMIS — os indicadores em 6 grupos' }),
      h('button', { class: 'btn sm', text: 'Como é calculado?', onclick: () => { S.ajudaTab = 'poema'; go('ajuda'); } })),
    h('p', { class: 'note', style: 'white-space:normal', text: `${lugar} · ${ano}${scope.nivel !== 'Todos' ? ' · ' + scope.nivel : ''}. Os seis grupos do modelo EMIS. Use os filtros acima (ano, distrito, nível, tipo) para mudar o âmbito; para comparar distritos use o Mapa Interactivo.` }));
  for (const [nome, cor, keys] of EMIS_GRUPOS) {
    const tiles = keys.filter((k) => KIND[k] !== undefined).map(tile);
    card.append(h('div', { class: 'emis-grupo', style: `--gc:${cor}` }, h('h3', { class: 'emis-h', text: nome }), h('div', { class: 'emis-grid' }, tiles)));
  }
  v.append(card);
}
{
  const pn = VIEWS.painel;
  // eslint-disable-next-line no-global-assign
  VIEWS.painel = async (v, ...r) => { const x = await pn(v, ...r); try { painelEMIS(v); } catch (e) { console.warn('EMIS', e); } return x; };
}


// =====================================================================
// v1.20 — MAPAS INTERACTIVOS (vários modelos, tudo offline em SVG)
// coroplético · símbolos proporcionais · classes (quantis) · escolas (pontos)
// =====================================================================
const MAPA_INV = new Set(['reprov', 'desist', 'repet', 'sob', 'prec', 'livre', 'alprof', 'altur', 'alsala', 'ret3', 'livNP']);
const MAPA_MODELOS = [['coropleto', 'Coroplético (distritos preenchidos)'], ['classes', 'Classes (quantis, semáforo)'], ['simbolos', 'Símbolos proporcionais (círculos)'], ['bivariado', 'Duas variáveis (tamanho + cor)'], ['comparar', 'Variação entre dois anos'], ['cobertura', 'Cobertura do levantamento'], ['escolas', 'Escolas (pontos no mapa)']];
const CLASSE_COR = ['#D73027', '#FC8D59', '#FEE08B', '#91CF60', '#1A9850']; // vermelho→verde (5 classes)
function mapaCorClasse(i, inv) { const a = [...CLASSE_COR]; if (inv) a.reverse(); return a[i] || '#CCC'; }
// escala divergente para a variação: vermelho = piorou, cinza-claro = igual, verde = melhorou (t em -1..1)
function mapaCorDiv(t) { const lerp = (a, b, k) => Math.round(a + (b - a) * k); const grey = [240, 240, 236]; const k = Math.max(-1, Math.min(1, t || 0)); const end = k >= 0 ? [26, 152, 80] : [215, 48, 39]; const a = Math.abs(k); return `rgb(${lerp(grey[0], end[0], a)},${lerp(grey[1], end[1], a)},${lerp(grey[2], end[2], a)})`; }
function mapaGeoCentroides(W, H) {
  // devolve, por código de distrito: { path, cx, cy, bounds } usando os limites oficiais (d3) ou, sem eles, os mosaicos
  const out = {}; const geo = S.limites;
  if (geo && window.d3) {
    const d3 = window.d3; const proj = d3.geoMercator().fitExtent([[24, 10], [W - 24, H - 40]], geo); const path = d3.geoPath(proj);
    for (const ft of geo.features) { const cod = codDistritoGeo(ft, S.limitesCampo); if (!cod) continue; const [cx, cy] = path.centroid(ft); out[cod] = { d: path(ft), cx, cy, bounds: path.bounds(ft), proj }; }
    out.__proj = proj;
    return out;
  }
  const cw = (W - 20) / 6, ch = (H - 40) / 5;
  for (const [cod, [c, r]] of Object.entries(TILES)) { const x = 10 + c * cw + (r % 2 ? cw * 0.25 : 0), y = 10 + r * ch; out[cod] = { rect: [x + 2, y + 2, cw - 4, ch - 4], cx: x + cw / 2, cy: y + ch / 2 }; }
  return out;
}
function mapaLegendaContinua(W, H, mn, mx, inv, fmtv) {
  const lw = 200; let g = '';
  for (let i = 0; i < 20; i++) g += `<rect x="${W - lw - 14 + (i * lw) / 20}" y="${H - 26}" width="${lw / 20 + 0.6}" height="9" fill="${corEscala(i / 19, inv)}"/>`;
  g += `<text x="${W - lw - 14}" y="${H - 8}" font-size="10" fill="#4A5A52">${esc_(fmtv(inv ? mx : mn))}</text><text x="${W - 14}" y="${H - 8}" font-size="10" text-anchor="end" fill="#4A5A52">${esc_(fmtv(inv ? mn : mx))}</text>`;
  return g;
}
// ---- exportar um mapa (SVG na página) como imagem: copiar, PNG ou SVG ----
const blobParaDataURL = (b) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); });
function mapaSVGTexto(box) {
  const svg = box.querySelector('svg'); if (!svg) return null;
  const clone = svg.cloneNode(true);
  clone.querySelectorAll('[data-cod]').forEach((el) => { el.setAttribute('stroke', el.tagName === 'circle' ? '#0A5A37' : '#fff'); el.setAttribute('stroke-width', '1'); });
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const vb = (clone.getAttribute('viewBox') || `0 0 ${svg.getAttribute('width') || 660} ${svg.getAttribute('height') || 460}`).split(/\s+/).map(Number);
  const w = vb[2] || 660, hh = vb[3] || 460;
  clone.setAttribute('width', w); clone.setAttribute('height', hh);
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', vb[0] || 0); bg.setAttribute('y', vb[1] || 0); bg.setAttribute('width', w); bg.setAttribute('height', hh); bg.setAttribute('fill', '#ffffff');
  clone.insertBefore(bg, clone.firstChild);
  return { texto: '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone), w, hh };
}
async function mapaParaPNG(box, escala = 2) {
  const s = mapaSVGTexto(box); if (!s) return null;
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.texto); });
  const cv = document.createElement('canvas'); cv.width = Math.round(s.w * escala); cv.height = Math.round(s.hh * escala);
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
  return await new Promise((res) => cv.toBlob(res, 'image/png'));
}
function botoesExportarMapa(box, nomeBase) {
  const nome = () => (nomeBase() || 'Mapa').replace(/[^\w\-]+/g, '_');
  return h('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' },
    h('button', { class: 'btn sm', title: 'Copiar a imagem do mapa para colar noutro programa', text: 'Copiar imagem', onclick: async () => {
      try { const b = await mapaParaPNG(box); if (!b) return; const du = await blobParaDataURL(b);
        if (window.educstat?.copiarImagem && (await window.educstat.copiarImagem(du))) { toast('Imagem copiada.'); return; }
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); toast('Imagem copiada.');
      } catch { toast('Não foi possível copiar. Use “Guardar PNG”.'); } } }),
    h('button', { class: 'btn sm', disabled: !S.downloads, title: 'Guardar como imagem PNG', text: 'Guardar PNG', onclick: async () => {
      try { const b = await mapaParaPNG(box); if (b) await S.downloads.save({ filename: nome() + '.png', data: b }); } catch (e) { if (e?.code !== 'declined') toast('Não foi possível guardar o PNG.'); } } }),
    h('button', { class: 'btn sm', disabled: !S.downloads, title: 'Guardar como vector SVG (editável)', text: 'Guardar SVG', onclick: async () => {
      try { const s = mapaSVGTexto(box); if (s) await S.downloads.save({ filename: nome() + '.svg', data: new Blob([s.texto], { type: 'image/svg+xml' }) }); } catch (e) { if (e?.code !== 'declined') toast('Não foi possível guardar o SVG.'); } } }));
}

VIEWS.mapas = (v) => {
  const anosD = ANOS.filter((a) => a <= ANO_MAX_DADOS && S.cod.distritos.some((d) => resumoDe(a, d[0])));
  const st = S.mp ||= { ano: anosD[anosD.length - 1] || ANO_MAX_DADOS, anoBase: anosD[anosD.length - 2] || anosD[0] || ANO_MAX_DADOS, ind: 'matric', modelo: 'coropleto', sexo: 'Ambos', nivel: 'Todos', tipo: 'Todos', foco: null };
  if (!anosD.includes(st.ano)) st.ano = anosD[anosD.length - 1] || st.ano;
  if (st.anoBase == null || !anosD.includes(st.anoBase) || st.anoBase === st.ano) st.anoBase = anosD.filter((a) => a !== st.ano).pop() || st.ano;
  const sel = (val, opts, on) => { const s = h('select', { onchange: (e) => on(e.target.value) }); for (const o of opts) { if (o.grupo) { const og = h('optgroup', { label: o.grupo }); for (const [kv, lb] of o.itens) og.append(h('option', { value: kv, text: lb, selected: String(kv) === String(val) })); s.append(og); } else s.append(h('option', { value: o[0], text: o[1], selected: String(o[0]) === String(val) })); } return s; };
  const indOpts = EMIS_GRUPOS.map(([nome, , keys]) => ({ grupo: nome, itens: keys.filter((k) => KIND[k] !== undefined).map((k) => [k, LABEL_IND[k] || k]) }));
  const bar = h('div', { class: 'row', style: 'flex-wrap:wrap;gap:10px;align-items:flex-end' },
    h('label', { class: 'f' }, 'Ano', sel(st.ano, desc(anosD).map((a) => [a, a]), (x) => { st.ano = +x; go('mapas'); })),
    h('label', { class: 'f' }, 'Modelo de mapa', sel(st.modelo, MAPA_MODELOS, (x) => { st.modelo = x; go('mapas'); })),
    (st.modelo !== 'escolas' && st.modelo !== 'cobertura') ? h('label', { class: 'f' }, 'Indicador', sel(st.ind, indOpts, (x) => { st.ind = x; go('mapas'); })) : null,
    st.modelo === 'comparar' ? h('label', { class: 'f' }, 'Comparar com', sel(st.anoBase, desc(anosD.filter((a) => a !== st.ano)).map((a) => [a, a]), (x) => { st.anoBase = +x; go('mapas'); })) : null,
    h('label', { class: 'f' }, 'Sexo', sel(st.sexo, [['Ambos', 'Ambos'], ['H', 'Rapazes'], ['M', 'Raparigas']], (x) => { st.sexo = x; go('mapas'); })),
    h('label', { class: 'f' }, 'Nível', sel(st.nivel, [['Todos', 'Todos'], ['EP', 'Ensino Primário'], ['ESG1', 'ESG 1º Ciclo'], ['ESG2', 'ESG 2º Ciclo']], (x) => { st.nivel = x; go('mapas'); })),
    h('label', { class: 'f' }, 'Tipo', sel(st.tipo, [['Todos', 'Todos'], ['Pública', 'Pública'], ['Privada', 'Privada'], ['Comunitária', 'Comunitária']], (x) => { st.tipo = x; go('mapas'); })));
  const W = 660, H = 460; const box = h('div', { class: 'mapa-box', style: 'position:relative' });
  const lado = h('div', { class: 'mapa-lado' });
  const tip = h('div', { class: 'mapa-tip', style: 'position:absolute;pointer-events:none;display:none;z-index:5' });
  const scope = { tipo: st.tipo, nivel: st.nivel };
  const fmtv = (x) => (st.modelo === 'escolas' ? NF.format(Math.round(x)) : fmt(st.ind, x));
  const inv = MAPA_INV.has(st.ind);
  const geom = mapaGeoCentroides(W, H);
  const temGeo = !!(S.limites && window.d3);

  // ----- valores por distrito -----
  const dists = S.cod.distritos; const vals = {};
  if (st.modelo !== 'escolas') for (const [d] of dists) { try { vals[d] = IX(st.ano, { dist: d, ...scope }, st.ind, st.sexo); } catch { vals[d] = null; } }
  const comVal = Object.entries(vals).filter(([, x]) => x != null).map(([d, x]) => [+d, x]);
  const vs = comVal.map(([, x]) => x); const mn = vs.length ? Math.min(...vs) : 0, mx = vs.length ? Math.max(...vs) : 1;
  const t = (x) => (mx > mn ? (x - mn) / (mx - mn) : 0.5);
  // quantis (5 classes) para o modelo "classes"
  const ordenados = [...vs].sort((a, b) => a - b); const q = (p) => ordenados.length ? ordenados[Math.min(ordenados.length - 1, Math.floor(p * ordenados.length))] : 0;
  const cortes = [q(0.2), q(0.4), q(0.6), q(0.8)]; const classeDe = (x) => cortes.reduce((acc, c) => acc + (x > c ? 1 : 0), 0);

  // dados adicionais para os novos modelos
  const mat = {}; // alunos matriculados por distrito (modelo "bivariado": tamanho do círculo)
  if (st.modelo === 'bivariado') for (const [d] of dists) { try { mat[d] = IX(st.ano, { dist: d, ...scope }, 'matric', st.sexo); } catch { mat[d] = null; } }
  const valsBase = {}, delta = {}; // variação do indicador entre anoBase e ano (modelo "comparar")
  if (st.modelo === 'comparar') for (const [d] of dists) { try { valsBase[d] = IX(st.anoBase, { dist: d, ...scope }, st.ind, st.sexo); } catch { valsBase[d] = null; } delta[d] = (vals[d] != null && valsBase[d] != null) ? vals[d] - valsBase[d] : null; }
  const dMax = Math.max(1e-9, ...Object.values(delta).filter((x) => x != null).map((x) => Math.abs(x)));
  const cobInfo = {}; // cobertura do levantamento por distrito (modelo "cobertura")
  if (st.modelo === 'cobertura') for (const [d] of dists) { try { cobInfo[d] = coberturaDe(st.ano, d); } catch { cobInfo[d] = null; } }
  // valores mostrados no tooltip e no ranking (por omissão, o indicador escolhido)
  let valDisp = vals, fmtDisp = fmtv, invDisp = inv;

  // ----- desenho SVG -----
  let g = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px" font-family="Arial, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  const forma = (cod, fill, extra = '') => temGeo
    ? `<path data-cod="${cod}" d="${geom[cod]?.d || ''}" fill="${fill}" stroke="#fff" stroke-width="1" ${extra}/>`
    : (() => { const r = geom[cod]?.rect; return r ? `<rect data-cod="${cod}" x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" rx="8" fill="${fill}" stroke="#fff" ${extra}/>` : ''; })();
  const rotulo = (cod) => { const gc = geom[cod]; if (!gc) return ''; return `<text x="${gc.cx}" y="${gc.cy}" font-size="9" text-anchor="middle" fill="#13221B" paint-order="stroke" stroke="rgba(255,255,255,.85)" stroke-width="2.2" pointer-events="none">${esc_(distName(cod))}</text>`; };

  if (st.modelo === 'escolas') {
    // base cinzenta dos distritos + um ponto por escola com coordenadas, cor por tipo
    for (const [d] of dists) g += forma(d, '#EDF1EE');
    for (const [d] of dists) g += rotulo(d);
    const corTipo = { 'Pública': '#1A6B45', 'Privada': '#2563EB', 'Comunitária': '#B45309' };
    let nComCoord = 0, nTotal = 0;
    if (temGeo) { const proj = geom.__proj;
      for (const e of S.esc.values()) { const tp = e.tipo || 'Pública'; if (st.tipo !== 'Todos' && tp !== st.tipo) continue; nTotal++; const c = coordsEscola(e); if (!c) continue; const p = proj([c[0], c[1]]); if (!p) continue; nComCoord++; const cor = corTipo[tp] || '#C98E00'; g += `<circle class="esc-pt" data-esc="${esc_(e.cod)}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.8" fill="${cor}" fill-opacity=".8" stroke="#fff" stroke-width=".5"/>`; }
    }
    // legenda de tipos
    let lx = 16; for (const [nome, cor] of Object.entries(corTipo)) { g += `<circle cx="${lx}" cy="${H - 14}" r="5" fill="${cor}"/><text x="${lx + 9}" y="${H - 10}" font-size="10" fill="#4A5A52">${esc_(nome)}</text>`; lx += nome.length * 6.4 + 26; }
    lado.append(h('h3', { text: 'Escolas no mapa' }), h('p', { class: 'note', text: temGeo ? `${NF.format(nComCoord)} de ${NF.format(nTotal)} escolas com coordenadas aparecem no mapa. As restantes ainda não têm coordenadas na carta escolar.` : 'Carregue os limites oficiais (Administração → Configurações) e as coordenadas das escolas para ver este mapa.' }));
  } else if (st.modelo === 'simbolos') {
    for (const [d] of dists) g += forma(d, '#EDF1EE');
    const rMax = temGeo ? 26 : 22; const raiz = (x) => (mx > 0 ? Math.sqrt(Math.max(0, x) / mx) * rMax : 0);
    for (const [d, x] of comVal) { const gc = geom[d]; if (!gc) continue; const r = Math.max(3, raiz(x)); g += `<circle data-cod="${d}" cx="${gc.cx}" cy="${gc.cy}" r="${r.toFixed(1)}" fill="#1A6B45" fill-opacity=".62" stroke="#0A5A37" stroke-width="1"/>`; }
    for (const [d] of dists) g += rotulo(d);
    lado.append(h('h3', { text: 'Símbolos proporcionais' }), h('p', { class: 'note', text: 'A área de cada círculo é proporcional ao valor. Indicado para contagens (alunos, escolas, professores).' }));
  } else if (st.modelo === 'classes') {
    for (const [d] of dists) { const x = vals[d]; g += forma(d, x == null ? '#EEE' : mapaCorClasse(classeDe(x), inv)); }
    for (const [d] of dists) g += rotulo(d);
    // legenda de classes
    const rng = (i) => { const lo = i === 0 ? mn : cortes[i - 1]; const hi = i === 4 ? mx : cortes[i]; return `${fmtv(lo)} – ${fmtv(hi)}`; };
    lado.append(h('h3', { text: 'Classes (quantis)' }), h('p', { class: 'note', text: 'Os distritos são repartidos em cinco grupos de igual tamanho. Vermelho = pior, verde = melhor.' }),
      h('div', { class: 'mapa-leg' }, [0, 1, 2, 3, 4].map((i) => h('div', { class: 'row', style: 'gap:6px;align-items:center' }, h('span', { style: `width:14px;height:14px;border-radius:3px;display:inline-block;background:${mapaCorClasse(i, inv)}` }), h('span', { class: 'note', text: rng(i) })))));
  } else if (st.modelo === 'bivariado') {
    // cor = indicador escolhido; tamanho do círculo = alunos matriculados
    for (const [d] of dists) { const x = vals[d]; g += forma(d, x == null ? '#EEE' : corEscala(t(x), inv)); }
    const matVs = Object.values(mat).filter((x) => x != null); const matMx = matVs.length ? Math.max(...matVs) : 1; const rMax = temGeo ? 22 : 18;
    for (const [d] of dists) { const m = mat[d]; if (m == null) continue; const gc = geom[d]; if (!gc) continue; const r = Math.max(2.5, Math.sqrt(Math.max(0, m) / matMx) * rMax); g += `<circle data-cod="${d}" cx="${gc.cx}" cy="${gc.cy}" r="${r.toFixed(1)}" fill="#13221B" fill-opacity=".14" stroke="#13221B" stroke-opacity=".5" stroke-width="1"/>`; }
    for (const [d] of dists) g += rotulo(d);
    g += mapaLegendaContinua(W, H, mn, mx, inv, fmtv);
    lado.append(h('h3', { text: 'Duas variáveis' }), h('p', { class: 'note', text: `Cor = ${LABEL_IND[st.ind] || st.ind}. Tamanho do círculo = alunos matriculados. Mostra ao mesmo tempo o nível do indicador e o peso de cada distrito.` }));
  } else if (st.modelo === 'comparar') {
    // variação do indicador entre o ano base e o ano escolhido (escala divergente)
    for (const [d] of dists) { const dd = delta[d]; if (dd == null) { g += forma(d, '#EEE'); continue; } const melhor = invDisp ? dd < 0 : dd > 0; const tt = (melhor ? 1 : -1) * Math.abs(dd) / dMax; g += forma(d, mapaCorDiv(tt)); }
    for (const [d] of dists) g += rotulo(d);
    valDisp = delta; fmtDisp = (x) => (x > 0 ? '+' : '') + fmtv(x); invDisp = false;
    // legenda divergente
    g += `<text x="16" y="${H - 24}" font-size="10" fill="#4A5A52">Piorou</text><text x="${W - 16}" y="${H - 24}" font-size="10" text-anchor="end" fill="#4A5A52">Melhorou</text>`;
    for (let i = 0; i < 20; i++) g += `<rect x="${16 + (i * (W - 32)) / 20}" y="${H - 18}" width="${(W - 32) / 20 + 0.6}" height="8" fill="${mapaCorDiv((i / 19) * 2 - 1)}"/>`;
    lado.append(h('h3', { text: `Variação ${st.anoBase} → ${st.ano}` }), h('p', { class: 'note', text: `Diferença de ${LABEL_IND[st.ind] || st.ind} entre ${st.anoBase} e ${st.ano}. Verde = melhorou, vermelho = piorou (já considera os indicadores em que "menos é melhor").` }));
  } else if (st.modelo === 'cobertura') {
    // percentagem de mapas recebidos face às escolas esperadas, por distrito
    const cobV = {}; for (const [d] of dists) cobV[d] = cobInfo[d] && cobInfo[d].esperadas ? cobInfo[d].cob : null;
    for (const [d] of dists) { const c = cobV[d]; g += forma(d, c == null ? '#EEE' : corEscala(c, false)); }
    for (const [d] of dists) g += rotulo(d);
    valDisp = cobV; fmtDisp = (x) => P1.format(x); invDisp = false;
    g += mapaLegendaContinua(W, H, 0, 1, false, (x) => P1.format(x));
    lado.append(h('h3', { text: 'Cobertura do levantamento' }), h('p', { class: 'note', text: `Percentagem de escolas esperadas com mapa de 3 de Março recebido, ${st.ano}. Verde = perto de 100%; vermelho = muitas escolas ainda sem mapa.` }));
  } else { // coropleto
    for (const [d] of dists) { const x = vals[d]; g += forma(d, x == null ? '#EEE' : corEscala(t(x), inv)); }
    for (const [d] of dists) g += rotulo(d);
    g += mapaLegendaContinua(W, H, mn, mx, inv, fmtv);
    lado.append(h('h3', { text: LABEL_IND[st.ind] || st.ind }), h('p', { class: 'note', text: FONTE_IND[st.ind] || '' }));
  }
  if (!temGeo && st.modelo !== 'escolas') g += `<text x="12" y="${H - 8}" font-size="9" fill="#4A5A52">Mapa esquemático. Carregue os limites oficiais em Administração → Configurações para o mapa real.</text>`;
  g += '</svg>';
  box.innerHTML = g; box.append(tip);

  // ----- ordenação / melhores e piores (usa os valores mostrados em cada modelo) -----
  const comDisp = Object.entries(valDisp).filter(([, x]) => x != null).map(([d, x]) => [+d, x]);
  // texto do tooltip, por modelo
  const tipTexto = (cod) => {
    if (st.modelo === 'cobertura') { const c = cobInfo[cod]; return `${distName(cod)}: ${c && c.esperadas ? P1.format(c.cob) : '—'}${c && c.esperadas ? ` (${NF.format(c.recebidas)}/${NF.format(c.esperadas)} mapas)` : ''}`; }
    if (st.modelo === 'comparar') { const x = delta[cod]; return `${distName(cod)}: ${x == null ? '—' : fmtDisp(x)} (${st.anoBase} → ${st.ano})`; }
    if (st.modelo === 'bivariado') { const x = vals[cod], m = mat[cod]; return `${distName(cod)}: ${x == null ? '—' : fmtv(x)}${m == null ? '' : ' · ' + NF.format(Math.round(m)) + ' alunos'}`; }
    const x = valDisp[cod]; return `${distName(cod)}: ${x == null ? '—' : fmtDisp(x)}`;
  };
  if (st.modelo !== 'escolas' && comDisp.length) {
    const ord = [...comDisp].sort((a, b) => (invDisp ? a[1] - b[1] : b[1] - a[1]));
    const provTxt = (() => {
      if (st.modelo === 'cobertura') { let e = 0, r = 0; for (const [d] of dists) { const c = cobInfo[d]; if (c) { e += c.esperadas; r += c.recebidas; } } return e ? P1.format(Math.min(1, r / e)) : '—'; }
      if (st.modelo === 'comparar') { try { const a = IX(st.ano, { dist: 'Todos', ...scope }, st.ind, st.sexo), b = IX(st.anoBase, { dist: 'Todos', ...scope }, st.ind, st.sexo); return (a != null && b != null) ? fmtDisp(a - b) : '—'; } catch { return '—'; } }
      try { const p = IX(st.ano, { dist: 'Todos', ...scope }, st.ind, st.sexo); return p == null ? '—' : fmtv(p); } catch { return '—'; }
    })();
    lado.append(h('div', { class: 'mapa-rank' },
      h('div', { class: 'row between', style: 'font-weight:700' }, h('span', { text: 'Província' }), h('span', { text: provTxt })),
      ...ord.map(([d, x], i) => h('div', { class: 'row between mapa-rank-l' + (st.foco === d ? ' foco' : ''), 'data-cod': d, style: 'cursor:pointer', onclick: () => { st.foco = st.foco === d ? null : d; go('mapas'); } },
        h('span', { text: `${i + 1}. ${distName(d)}` }), h('span', { text: fmtDisp(x) })))));
  }

  // ----- interactividade: realce + tooltip -----
  const realce = (cod, on) => { for (const el of box.querySelectorAll(`[data-cod="${cod}"]`)) el.setAttribute('stroke', on ? '#111' : (el.tagName === 'circle' ? '#0A5A37' : '#fff')), el.setAttribute('stroke-width', on ? '2.4' : (el.tagName === 'circle' ? '1' : '1')); };
  box.querySelectorAll('[data-cod]').forEach((el) => {
    const cod = +el.getAttribute('data-cod');
    el.style.cursor = 'pointer';
    el.addEventListener('mousemove', (ev) => { const r = box.getBoundingClientRect(); tip.style.display = 'block'; tip.style.left = (ev.clientX - r.left + 12) + 'px'; tip.style.top = (ev.clientY - r.top + 12) + 'px'; tip.textContent = tipTexto(cod); realce(cod, true); });
    el.addEventListener('mouseleave', () => { tip.style.display = 'none'; realce(cod, false); });
    el.addEventListener('click', () => { st.foco = st.foco === cod ? null : cod; go('mapas'); });
  });
  if (st.foco != null) realce(st.foco, true);

  v.append(h('div', {}, h('h1', { text: 'Mapas interactivos' }), h('p', { class: 'lede', text: 'Veja os indicadores no território da província. Escolha o modelo de mapa, o indicador e o âmbito. Passe o rato (ou toque) num distrito para ver o valor.' })),
    h('div', { class: 'card' }, bar),
    h('div', { class: 'card mapa-wrap' },
      h('div', { class: 'row between', style: 'margin-bottom:8px;flex-wrap:wrap;gap:8px' },
        h('span', { class: 'note', text: 'Passe o rato ou toque para ver o valor de cada área.' }),
        botoesExportarMapa(box, () => `Mapa_${st.ind || st.modelo}_${st.ano}`)),
      h('div', { class: 'mapa-grid' }, box, lado)),
    h('div', { class: 'card' }, h('p', { class: 'note', style: 'white-space:normal', text: `Fonte: ${FONTE_IND[st.ind] || 'Levantamentos 3 de Março e fim do ano (EducStat)'}. Ano ${st.ano}${st.nivel !== 'Todos' ? ' · ' + st.nivel : ''}${st.tipo !== 'Todos' ? ' · ' + st.tipo : ''}. Os mapas usam os limites oficiais carregados pela DPE; sem eles mostra-se um mapa esquemático.` })));
};

boot();
})();
