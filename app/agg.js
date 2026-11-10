// Agregador comum: fichas de escola -> resumo de um distrito e ano (usado pela aplicação e pela geração inicial).
(function (root) {
  const NIVEL = (e) => (e === 1001 || e === 1002 ? 'EP' : e === 1011 ? 'ESG1' : e >= 1020 && e <= 1023 ? 'ESG2' : 'ETP');
  const RANGE = { antigo: { EP: [6, 12], ESG1: [13, 15], ESG2: [16, 17] }, SNE: { EP: [6, 11], ESG1: [12, 14], ESG2: [15, 17] } };
  const parseAge = (k) => {
    if (k.endsWith('-')) { const n = +k.slice(0, -1); return { lo: -Infinity, hi: n, rep: n, low: true }; }
    if (k.endsWith('+')) { const n = +k.slice(0, -1); return { lo: n, hi: Infinity, rep: n, top: true }; }
    if (k.includes('-')) { const [a, b] = k.split('-').map(Number); return { lo: a, hi: b, rep: a }; }
    const n = +k; return { lo: n, hi: n, rep: n };
  };
  const PAIR = ['Matric', 'IdOf', 'Sob', 'BaseId', 'C1Id6', 'Rep', 'Fim', 'Aprov', 'Desist', 'Transf', 'Orf', 'Defic', 'MatricFim', 'Prof', 'ProfForm', 'Biling', 'Id6'];
  const SINGLE = ['Turmas', 'LivPort', 'LivMat', 'Escolas', 'EscolasFim'];
  function newCell() { const c = {}; for (const k of PAIR) c[k] = [0, 0]; for (const k of SINGLE) c[k] = 0; return c; }
  const add2 = (a, v) => { a[0] += +v?.[0] || 0; a[1] += +v?.[1] || 0; };

  /**
   * fichas: lista de fichas {ano, esc, dist, sis, marco:{...}, fim:{...}}
   * tipoDe(esc) -> 'Pública' | 'Privada' | 'Comunitária'
   * formados: {antigo: Set(codigos), SNE: Set(codigos)}
   */
  function resumo(fichas, tipoDe, formados) {
    const cells = {}; const esc = {}; const mot = {}; const notas = {};
    const cell = (t, n, cl) => (cells[t + '|' + n + '|' + cl] ||= newCell());
    for (const f of fichas) {
      const t = tipoDe(f.esc) || 'Pública', sis = f.sis === 'antigo' ? 'antigo' : 'SNE', M = f.marco || {}, Fm = f.fim || {};
      const E = (esc[t] ||= { nEsc: 0, salasConv: 0, salasPrec: 0, turLivre: 0, pnd: 0, elect: 0, agua: 0, sanit: 0, escInfo: 0, matricAll: 0 });
      const niveisM = new Set(), niveisF = new Set();
      const temFim = (Fm.aprov || []).some((r) => (r.fim?.[0] || 0) + (r.fim?.[1] || 0) > 0);
      for (const r of M.alunos || []) {
        const n = NIVEL(r.ens), c = cell(t, n, r.cl), rg = RANGE[sis][n];
        let h = 0, m = 0, sob = [0, 0], idof = [0, 0], c16 = [0, 0], id6 = [0, 0], straddle = sis === 'SNE' && n === 'EP' && r.cl >= 6; const thr = r.cl + 7;
        for (const [k, v] of Object.entries(r.id || {})) {
          const a = parseAge(k), vh = +v[0] || 0, vm = +v[1] || 0; h += vh; m += vm;
          if (rg && !a.top && a.rep >= rg[0] && a.rep <= rg[1]) { idof[0] += vh; idof[1] += vm; }
          if (r.cl === 1 && (k === '6' || k === '6-')) { c16[0] += vh; c16[1] += vm; }
          if (n === 'EP' && (k === '6' || k === '6-')) { id6[0] += vh; id6[1] += vm; }
          if (a.lo >= thr) { sob[0] += vh; sob[1] += vm; } else if (a.hi >= thr) straddle = true;
        }
        add2(c.Matric, [h, m]); add2(c.IdOf, idof); add2(c.C1Id6, c16); add2(c.Id6, id6); add2(c.Rep, r.rep);
        if (!straddle) { add2(c.Sob, sob); add2(c.BaseId, [h, m]); }
        if (temFim) add2(c.MatricFim, [h, m]);
        c.Turmas += (+r.tp || 0) + (+r.tm || 0);
        if (h + m > 0) niveisM.add(n);
        E.matricAll += h + m;
      }
      for (const r of M.prof || []) {
        const c = cell(t, NIVEL(r.ens), 0); add2(c.Prof, r.v);
        if (formados[sis].has(+r.q)) add2(c.ProfForm, r.v);
      }
      for (const r of M.orfaos || []) { const c = cell(t, NIVEL(r.ens), r.cl || 0); add2(c.Orf, r.pai); add2(c.Orf, r.mae); add2(c.Orf, r.ambos); }
      for (const r of M.bilingue || []) add2(cell(t, NIVEL(r.ens), r.cl || 0).Biling, [r.h, r.m]);
      for (const r of M.defic || []) for (const [cl, v] of Object.entries(r.v || {})) add2(cell(t, NIVEL(r.ens), +cl).Defic, v);
      for (const r of M.livros || []) {
        if (+r.disc !== 1 && +r.disc !== 2) continue;
        for (const [cl, v] of Object.entries(r.v || {})) cell(t, NIVEL(r.ens), +cl)[+r.disc === 1 ? 'LivPort' : 'LivMat'] += +v || 0;
      }
      const S = M.salas || {};
      if (Object.keys(S).length) {
        E.salasConv += (+S['1'] || 0) + (+S['2'] || 0); E.salasPrec += (+S['3'] || 0) + (+S['4'] || 0) + (+S['5'] || 0); E.turLivre += +S['6'] || 0;
      }
      for (const [k, v] of Object.entries(M.pnd || {})) if (k !== '4') E.pnd += (+v[0] || 0) + (+v[1] || 0);
      if (M.infra) {
        const I = M.infra; E.escInfo++; if (+I.elect) E.elect++; if (+I.aguaEsc || +I.aguaFora || +I.fontenaria) E.agua++; if (+I.wc || +I.latrinas) E.sanit++;
      }
      if (niveisM.size) E.nEsc++;
      for (const n of niveisM) cell(t, n, 0).Escolas++;
      for (const r of Fm.aprov || []) {
        const n = NIVEL(r.ens), c = cell(t, n, r.cl); add2(c.Fim, r.fim); add2(c.Aprov, r.aprov);
        if ((+r.fim?.[0] || 0) + (+r.fim?.[1] || 0) > 0) niveisF.add(n);
        for (const [d, v] of Object.entries(r.notas || {})) {
          const k = t + '|' + n + '|' + d, a = (notas[k] ||= [0, 0]); a[0] += +v[0] || 0; a[1] += (+v[1] || 0) + (+v[2] || 0);
        }
      }
      for (const n of niveisF) cell(t, n, 0).EscolasFim++;
      for (const r of Fm.desist || []) {
        const n = NIVEL(r.ens);
        for (const [cl, v] of Object.entries(r.v || {})) {
          add2(cell(t, n, +cl).Desist, v);
          const k = t + '|' + n + '|' + sis + ':' + r.mot, a = (mot[k] ||= [0, 0]); add2(a, v);
        }
      }
      for (const r of Fm.transf || []) {
        if (+r.tipo !== 1) continue;
        for (const [cl, v] of Object.entries(r.v || {})) add2(cell(t, NIVEL(r.ens), +cl).Transf, v);
      }
    }
    // compactar: so celulas com algum valor
    const rows = [];
    for (const [k, c] of Object.entries(cells)) {
      const [t, n, cl] = k.split('|');
      const o = { t, n, cl: +cl };
      let any = false;
      for (const p of PAIR) if (c[p][0] || c[p][1]) { o[p] = c[p]; any = true; }
      for (const s of SINGLE) if (c[s]) { o[s] = c[s]; any = true; }
      if (any) rows.push(o);
    }
    return { rows, esc, mot, notas, n: fichas.length };
  }
  const api = { resumo, NIVEL, parseAge, RANGE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.EAgg = api;
})(typeof window !== 'undefined' ? window : globalThis);
