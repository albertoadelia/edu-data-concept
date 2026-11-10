// Base de dados local com a mesma interface usada pela versão online (db, user, downloads).
(() => {
  const api = window.educstat;
  if (!api) return;
  const COLS = ['fichas', 'resumo', 'escolas', 'alfa', 'centros', 'utilizadores', 'config', 'registo', 'mensagens', 'populacao', 'conflitos'];
  const store = {}; const subs = new Set(); const timers = {};
  // fichas, alfa e resumo gravam-se por ano (só o ano alterado é reescrito)
  const PARTIDAS = new Set(['fichas', 'alfa', 'resumo']); const sujos = {};
  const parteDe = (id) => (String(id).split('_')[0] || 'outros').replace(/[^\w-]/g, '') || 'outros';
  const ready = Promise.all(COLS.map(async (c) => {
    const o = (await api.load(c)) || {}; const migrar = o.__migrar; delete o.__migrar; if (o.__corrompidos) { (window.__corrompidos ||= []).push(...o.__corrompidos); delete o.__corrompidos; }
    store[c] = new Map(Object.entries(o));
    if (migrar && PARTIDAS.has(c)) { sujos[c] = new Set([...store[c].keys()].map(parteDe)); await gravar(c); await api.fimMigracao(c); }
  }));
  const cp = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  // gravações em fila por colecção; uma parte só deixa de estar pendente depois de gravada no disco (se falhar, fica para a próxima tentativa)
  const filas = {}; const pendente = {}; window.__erroGravar = null;
  function gravar(c) {
    filas[c] = (filas[c] || Promise.resolve()).then(async () => {
      try {
        if (!PARTIDAS.has(c)) { if (!pendente[c]) return; pendente[c] = false; try { await api.save(c, Object.fromEntries(store[c])); } catch (e) { pendente[c] = true; throw e; } return; }
        for (const p of [...(sujos[c] || [])]) { const o = {}; for (const [k, v] of store[c]) if (parteDe(k) === p) o[k] = v; sujos[c].delete(p); try { await api.savePart(c, p, o); } catch (e) { sujos[c].add(p); throw e; } }
        window.__erroGravar = null;
      } catch (e) { window.__erroGravar = { c, msg: String(e?.message || e), em: new Date() }; try { window.__aoErroGravar?.(window.__erroGravar); } catch {} }
    });
    return filas[c];
  }
  // espera que tudo o que está pendente fique gravado no disco
  async function flush() { for (const c of Object.keys(timers)) { clearTimeout(timers[c]); delete timers[c]; } for (const c of COLS) if (pendente[c] || sujos[c]?.size) gravar(c); await Promise.all(Object.values(filas)); return !window.__erroGravar; }
  const marcar = (c, id) => { if (PARTIDAS.has(c)) (sujos[c] ||= new Set()).add(parteDe(id)); else pendente[c] = true; };
  const persist = (c) => { clearTimeout(timers[c]); timers[c] = setTimeout(() => { delete timers[c]; gravar(c); }, 200); if (!window.__aSincronizar) { try { window.__aoAlterar?.(c); } catch {} } };
  // ao fechar a janela: o processo principal espera que esta fila termine (ver main.js, 'app:fechar')
  api.aoFechar?.(async () => { let ok = false; try { ok = await flush(); } catch {} if (!ok && !window.confirm('Não foi possível gravar tudo no disco (' + (window.__erroGravar?.msg || 'erro') + '). Fechar mesmo assim?')) return; api.prontoFechar(); });
  window.addEventListener('beforeunload', () => { for (const c of Object.keys(timers)) { clearTimeout(timers[c]); gravar(c); } });
  // avisos agrupados: uma importação de milhares de fichas não recalcula os ecrãs a cada ficha
  let tNot = null; const notify = () => { clearTimeout(tNot); tNot = setTimeout(() => { for (const s of [...subs]) { try { s(); } catch {} } }, 120); };
  // registos sem data própria recebem a hora da alteração (necessária para a sincronização); o que chega da sincronização mantém a sua
  const CARIMBO = new Set(['config', 'escolas', 'centros']);
  const carimbo = (c, d) => { if (CARIMBO.has(c) && d && typeof d === 'object' && !window.__aSincronizar) d.em = new Date().toISOString(); return d; };
  const split = (p) => { const i = p.lastIndexOf('/'); return [p.slice(0, i), p.slice(i + 1)]; };
  const snap = (c, id) => { const d = store[c]?.get(id); return { id, exists: d !== undefined, data: () => cp(d), metadata: { fromCache: false, hasPendingWrites: false } }; };
  function docRef(path) {
    const [c, id] = split(path);
    if (!store[c]) throw new TypeError('colecção desconhecida: ' + c);
    return {
      id, path,
      get: async () => snap(c, id),
      set: async (d) => { store[c].set(id, carimbo(c, cp(d))); marcar(c, id); persist(c); notify(); },
      update: async (d) => { if (!store[c].has(id)) throw { code: 'invalid_argument', message: 'não existe' }; store[c].set(id, carimbo(c, { ...store[c].get(id), ...cp(d) })); marcar(c, id); persist(c); notify(); },
      delete: async () => { store[c].delete(id); marcar(c, id); persist(c); notify(); },
      onSnapshot: (next) => { const s = () => next(snap(c, id)); subs.add(s); setTimeout(s, 0); return () => subs.delete(s); },
    };
  }
  function query(c, filters = [], order = null, lim = 0) {
    const run = () => {
      // filtra e ordena sobre os dados em memória; só copia os documentos que saem da consulta
      const ok = (o) => filters.every(([f, op, v]) => { const x = o?.[f]; return op === '==' ? x === v : op === '!=' ? x !== v : op === '>' ? x > v : op === '>=' ? x >= v : op === '<' ? x < v : op === '<=' ? x <= v : op === 'in' ? v.includes(x) : true; });
      let ids = []; for (const [id, o] of store[c] || new Map()) if (ok(o)) ids.push(id);
      if (order) { const g = (id) => store[c].get(id)?.[order[0]]; ids.sort((a, b) => { const x = g(a), y = g(b); return (x === y ? 0 : x === undefined ? 1 : y === undefined ? -1 : x > y ? 1 : -1) * (order[1] === 'desc' ? -1 : 1); }); }
      if (lim) ids = ids.slice(0, lim);
      const docs = ids.map((id) => snap(c, id));
      return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } };
    };
    return {
      where: (f, op, v) => query(c, [...filters, [f, op, v]], order, lim), orderBy: (f, d) => query(c, filters, [f, d], lim), limit: (n) => query(c, filters, order, n),
      get: async () => run(), onSnapshot: (next) => { const s = () => next(run()); subs.add(s); setTimeout(s, 0); return () => subs.delete(s); },
      doc: (id) => docRef(c + '/' + (id || Math.random().toString(36).slice(2))), add: async (d) => { const r = docRef(c + '/' + Math.random().toString(36).slice(2)); await r.set(d); return r; },
    };
  }
  // registos alterados depois de uma data (para a sincronização): percorre sem copiar e só copia os que mudaram
  const marcaDe = (o) => { let m = ''; for (const k of ['em', 'criado', 'senhaEm']) if (o && typeof o[k] === 'string' && o[k] > m) m = o[k]; return m; };
  const desde = (c, t) => { const out = []; for (const [id, o] of store[c] || new Map()) if (!t || marcaDe(o) > t) out.push(snap(c, id)); return out; };
  const db = { doc: docRef, collection: (c) => query(c), __desde: desde, __flush: flush };
  const user = {
    me: async () => { const s = window.__sessao || {}; return { id: s.utilizador || null, name: s.nome || '', avatarUrl: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="12" fill="#C2711A"/><text x="12" y="16" font-size="11" text-anchor="middle" fill="#fff" font-family="Arial">' + ((s.nome || '?')[0] || '?').toUpperCase() + '</text></svg>'), color: '#C2711A', email: null, isOwner: s.perfil === 3, canEdit: s.perfil === 3 }; },
    can: async (n) => (n === 'data.write' ? (window.__sessao?.perfil || 0) >= 2 : false),
    isOwner: async () => window.__sessao?.perfil === 3, canEdit: async () => window.__sessao?.perfil === 3,
    id: async () => window.__sessao?.utilizador || null,
    profiles: async (ids) => { const out = {}; for (const i of [].concat(ids)) { const u = store.utilizadores.get(String(i)); out[i] = { id: i, name: u?.nome || String(i || ''), avatarUrl: '', color: '#888', email: null, isMe: i === window.__sessao?.utilizador, guest: false }; } return out; },
  };
  const downloads = {
    save: async ({ filename, data }) => {
      const buf = data instanceof Blob ? await data.arrayBuffer() : data;
      const r = await api.saveFile(filename, buf);
      if (r.erro === 'visitante') { try { window.__aoVisitante?.(); } catch {} throw { code: 'declined', message: 'visitante' }; }
      if (r.status !== 'saved') throw { code: 'declined', message: 'cancelado' };
      return { status: 'saved', caminho: r.caminho };
    },
  };
  window.__dbPronta = ready;
  window.claude = { use: async (n) => { await ready; return { db, user, downloads }[n] || null; } };
})();
