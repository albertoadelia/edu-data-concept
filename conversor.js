// Conversor das bases Access (EducStat / AdultStat) para fichas do EducStat Tete.
// Reconhece os dois formatos de quadros: o antigo (EducStat09: MarchAges, DecPupil, ...) e o
// refeito em 2023 (EducStat_Dados09: _TblEP1, _TblDecAlunos, ...). Para acrescentar um formato
// novo, junte aqui uma função "conv..." e chame-a em converter().
// mdb-reader é um módulo ES: no Electron carrega-se com import() no processo principal e chega em opts.MDBReader
// (lib/mdb-reader.cjs é o mesmo módulo convertido para CommonJS, para funcionar em qualquer versão do Node/Electron)
let MDBReaderReq = null; try { const m = require('./lib/mdb-reader.cjs'); MDBReaderReq = m.default || m; } catch { /* ver opts.MDBReader */ }

const I = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : 0; };
const S_ = (v) => (v == null ? '' : String(v).trim());

function abrir(buffer, opts) {
  const MDBReader = (opts && opts.MDBReader) || MDBReaderReq;
  const r = new MDBReader(buffer);
  const nomes = new Set(r.getTableNames());
  const tab = (n) => (nomes.has(n) ? r.getTable(n).getData() : []);
  return { nomes, tab };
}

function converter(buffer, opts) {
  const { anoMin = 2004, anoMax = 2100, distritos, escolasConhecidas = {} } = opts;
  const DIST = new Set(distritos.map(Number));
  const { nomes, tab } = abrir(buffer, opts);
  const fichas = new Map(); // ano_esc -> ficha
  const novasEscolas = new Map();
  const avisos = [];
  // cadastro do próprio ficheiro
  const escFich = new Map();
  for (const s of tab('School')) if (!escFich.has(+s.Id) || +s.Local === 0) escFich.set(+s.Id, s);
  const distDe = (esc, cd) => {
    if (cd && DIST.has(+cd)) return +cd;
    const e = escFich.get(+esc); if (e && DIST.has(+e.DistrictId)) return +e.DistrictId;
    const k = escolasConhecidas[+esc]; if (k && DIST.has(+k)) return +k;
    return null;
  };
  const okAno = (a) => +a >= anoMin && +a <= anoMax;
  const anosVistos = new Set();
  const F = (ano, esc, cd) => {
    const d = distDe(esc, cd); if (d && +ano > 1990) anosVistos.add(+ano); if (!d || !okAno(ano)) return null;
    const k = ano + '_' + esc;
    if (!fichas.has(k)) fichas.set(k, { ano: +ano, esc: +esc, dist: d, sis: +ano >= 2023 ? 'SNE' : 'antigo', marco: {}, fim: {} });
    if (!escolasConhecidas[+esc] && escFich.has(+esc) && !novasEscolas.has(+esc)) {
      const s = escFich.get(+esc); novasEscolas.set(+esc, { cod: +esc, nome: S_(s.Name), dist: d, tipo: { 1: 'Pública', 2: 'Privada', 3: 'Comunitária' }[+s.TypeId] || 'Pública', abertura: I(s.YearOpened) || null, fecho: I(s.YearClosed) || null });
    }
    return fichas.get(k);
  };
  const push = (f, sec, b, row) => { if (f) (f[sec][b] ||= []).push(row); };
  let nAntigo = 0, nNovo = 0;

  // ================= formato antigo (até 2022) =================
  if (nomes.has('MarchAges')) {
    const age = new Map(tab('Age').map((a) => {
      const d = S_(a.AgeDescription);
      const k = d.includes('ou menos') ? d.split(' ')[0] + '-' : d.includes('ou mais') ? d.split(' ')[0] + '+' : d.replace('/', '-');
      return [+a.AgeGroupId, k];
    }));
    const al = new Map();
    const row = (t) => { const k = [t.Year, t.SchoolId, t.EducationId, t.ShiftId, t.Grade].join('|'); if (!al.has(k)) al.set(k, { f: F(t.Year, t.SchoolId), r: { ens: +t.EducationId, tur: +t.ShiftId, cl: +t.Grade, id: {}, rep: [0, 0], tp: 0, tm: 0, int: [0, 0] } }); return al.get(k); };
    for (const t of tab('MarchAges')) {
      if (!okAno(t.Year)) continue; const o = row(t); if (!o.f) continue; nAntigo++;
      const a = age.get(+t.AgeGroupId) || String(t.AgeGroupId); const h = I(t.NumberMale), m = I(t.NumberFemale);
      if (h || m) { const p = o.r.id[a] || [0, 0]; o.r.id[a] = [p[0] + h, p[1] + m]; }
    }
    for (const t of tab('MarchRepClassBoard')) {
      if (!okAno(t.Year)) continue; const o = row(t); if (!o.f) continue;
      o.r.rep = [I(t.RepeatersMale), I(t.RepeatersFemale)]; o.r.tp = I(t.PureClasses); o.r.tm = I(t.MixedClasses); o.r.int = [I(t.BoardersMale), I(t.BoardersFemale)];
    }
    for (const o of al.values()) push(o.f, 'marco', 'alunos', o.r);
    const prof = new Map();
    const addProf = (ano, esc, ens, tur, q, h, m) => { const f = F(ano, esc); if (!f || !(h || m)) return; const k = [ano, esc, ens, tur, q].join('|'); const o = prof.get(k); if (o) { o.r.v[0] += h; o.r.v[1] += m; } else prof.set(k, { f, r: { ens, tur, cl: 0, q, v: [h, m] } }); };
    for (const t of tab('MarchTeacherQualification')) if (okAno(t.Year)) addProf(+t.Year, +t.SchoolId, +t.EducationId, +t.ShiftId, +t.QualificationId, I(t.TeachersMale), I(t.TeachersFemale));
    for (const t of tab('MarchTeacherQualificationEsg2')) if (okAno(t.Year)) addProf(+t.Year, +t.SchoolId, 1020, ({ 5: 1, 6: 2, 1: 1, 2: 2 })[+t.FormId] || 1, +t.QualificationId, I(t.TeachersMale), I(t.TeachersFemale));
    for (const o of prof.values()) push(o.f, 'marco', 'prof', o.r);
    for (const t of tab('MarchClassroom')) { const f = okAno(t.Year) && F(t.Year, t.SchoolId); if (f) f.marco.salas = { 1: I(t.Cement), 2: I(t.Brick), 3: I(t.Maticado), 4: I(t.PauAPique), 5: I(t.Other), 6: I(t.TurLivre) }; }
    for (const t of tab('MarchNonTeachingStaff')) { const f = okAno(t.Year) && F(t.Year, t.SchoolId); if (f) f.marco.pnd = { 0: [I(t.StaffMale), I(t.StaffFemale)] }; }
    for (const t of tab('MarchOrfans')) { if (!okAno(t.Year)) continue; push(F(t.Year, t.SchoolId), 'marco', 'orfaos', { ens: +t.EducationId, tur: +t.ShiftId, cl: 0, pai: [I(t.OrfaoPaiH), I(t.OrfaoPaiM)], mae: [I(t.OrfaoMaeH), I(t.OrfaoMaeM)], ambos: [I(t.OrfaoH), I(t.OrfaoM)] }); }
    const lv = new Map();
    for (const t of tab('MarchBook')) {
      if (!okAno(t.Year)) continue; const f = F(t.Year, t.SchoolId); if (!f) continue;
      const k = [t.Year, t.SchoolId, t.EducationId, t.ShiftId, t.DisciplineId].join('|');
      let o = lv.get(k); if (!o) { o = { f, r: { ens: +t.EducationId, tur: +t.ShiftId, disc: +t.DisciplineId, v: {} } }; lv.set(k, o); }
      o.r.v[+t.Grade] = (o.r.v[+t.Grade] || 0) + I(t.PupilsWithBook);
    }
    for (const o of lv.values()) push(o.f, 'marco', 'livros', o.r);
    const lm = new Map();
    for (const t of tab('MarchManual')) {
      if (!okAno(t.Year)) continue; const f = F(t.Year, t.SchoolId); if (!f) continue;
      const k = [t.Year, t.SchoolId, t.EducationId, t.ShiftId, t.DisciplineId].join('|');
      let o = lm.get(k); if (!o) { o = { f, r: { ens: +t.EducationId, tur: +t.ShiftId, disc: +t.DisciplineId, v: {} } }; lm.set(k, o); }
      o.r.v[+t.Grade] = (o.r.v[+t.Grade] || 0) + I(t.TeachersWithManual);
    }
    for (const o of lm.values()) if (Object.values(o.r.v).some(Boolean)) push(o.f, 'marco', 'manuais', o.r);
    const disc = new Map(tab('Discipline').map((d) => [+d.Id, S_(d.Name)]));
    const fr = new Map();
    const frow = (t) => { const k = [t.Year, t.SchoolId, t.EducationId, t.ShiftId, t.Grade].join('|'); if (!fr.has(k)) fr.set(k, { f: F(t.Year, t.SchoolId), r: { ens: +t.EducationId, tur: +t.ShiftId, cl: +t.Grade, fim: [0, 0], exame: [0, 0], aprov: [0, 0], tp: 0, tm: 0, notas: {} } }); return fr.get(k); };
    for (const t of tab('DecPupil')) { if (!okAno(t.Year)) continue; const o = frow(t); o.r.fim = [I(t.TotalMale), I(t.TotalFemale)]; o.r.exame = [I(t.DidExam), 0]; o.r.aprov = [I(t.ApprovedMale), I(t.ApprovedFemale)]; o.r.tp = I(t.PureClasses); o.r.tm = I(t.MixedClasses); }
    for (const t of tab('DecMark')) { if (!okAno(t.Year)) continue; const o = frow(t); const v = [I(t.Pupils0_9), I(t.Pupils10_13), I(t.Pupils14_20)]; if (v[0] + v[1] + v[2]) o.r.notas[disc.get(+t.DisciplineId) || String(t.DisciplineId)] = v; }
    for (const o of fr.values()) push(o.f, 'fim', 'aprov', o.r);
    const byCl = (rows, kf, key, codeCol, blk) => {
      const m = new Map();
      for (const t of rows) {
        if (!okAno(t.Year)) continue; const f = F(t.Year, t.SchoolId); if (!f) continue;
        const k = [t.Year, t.SchoolId, t.EducationId, t.ShiftId, t[codeCol]].join('|');
        let o = m.get(k); if (!o) { o = { f, r: { ens: +t.EducationId, tur: +t.ShiftId, [key]: +t[codeCol], v: {} } }; m.set(k, o); }
        const p = o.r.v[+t.Grade] || [0, 0]; o.r.v[+t.Grade] = [p[0] + I(t.PupilsMale), p[1] + I(t.PupilsFemale)];
      }
      for (const o of m.values()) push(o.f, 'fim', blk, o.r);
    };
    byCl(tab('DecPupilDesistencias'), null, 'mot', 'DesistenciaId', 'desist');
    byCl(tab('DecPupilTransferidos'), null, 'tipo', 'TransferidoId', 'transf');
    for (const t of tab('DecTeacher')) if (okAno(t.Year)) push(F(t.Year, t.SchoolId), 'fim', 'profex', { ens: +t.EducationId, tur: +t.ShiftId, psico: [I(t.QualifiedMale), I(t.QualifiedFemale)], sem: [I(t.UnqualifiedMale), I(t.UnqualifiedFemale)] });
    for (const t of tab('DecTeacherEsg2')) if (okAno(t.Year)) push(F(t.Year, t.SchoolId), 'fim', 'profex', { ens: 1020, tur: +t.ShiftId || 1, psico: [I(t.QualifiedMale), I(t.QualifiedFemale)], sem: [I(t.UnqualifiedMale), I(t.UnqualifiedFemale)] });
    // blocos adicionais
    for (const t of tab('MarchNewStartersEp1')) if (okAno(t.Year)) push(F(t.Year, t.SchoolId), 'marco', 'novos', { ens: 1001, tur: 1, aH: I(t.StartersMale), aM: I(t.StartersFemale), bH: I(t.PreschoolMale), bM: I(t.PreschoolFemale) });
    for (const t of tab('MarchTeachersPerGrade')) if (okAno(t.Year)) push(F(t.Year, t.SchoolId), 'marco', 'profClasse', { ens: +t.EducationId, tur: +t.ShiftId, cl: I(t.Grade), h: 0, m: 0, t: I(t.Teachers) });
    for (const t of tab('MarchTeacherDiscipline')) if (okAno(t.Year)) push(F(t.Year, t.SchoolId), 'marco', 'profDisc', { ens: +t.EducationId, tur: +t.ShiftId, cl: 0, disc: I(t.DisciplineId), h: I(t.TeachersMale), m: I(t.TeachersFemale) });
    for (const t of tab('MarchTeacherDisciplineEsg2')) if (okAno(t.Year)) push(F(t.Year, t.SchoolId), 'marco', 'profDisc', { ens: 1020, tur: ({ 5: 1, 6: 2, 1: 1, 2: 2 })[+t.FormId] || 1, cl: 0, disc: I(t.DisciplineId), h: I(t.TeachersMale), m: I(t.TeachersFemale) });
    for (const t of tab('MarchTeacherTurnEp1')) if (okAno(t.Year)) [[1, 'TeachingOneTurn'], [2, 'TeachingOneAndAHalfTurn'], [3, 'TeachingTwoTurns']].forEach(([reg, c]) => { if (I(t[c])) push(F(t.Year, t.SchoolId), 'marco', 'profTurno', { ens: 1001, tur: 1, reg, h: 0, m: 0, t: I(t[c]) }); });
    for (const t of tab('MarchTeacherAbandon')) if (okAno(t.Year)) push(F(t.Year, t.SchoolId), 'marco', 'profMov', { ens: +t.EducationId, tur: +t.ShiftId, cl: 0, fimH: 0, fimM: 0, falH: I(t.FalecidosH), falM: I(t.FalecidosM), ftH: I(t.FaltamH), ftM: I(t.FaltamM), abH: I(t.AbandonamH), abM: I(t.AbandonamM) });
    for (const t of tab('MarchTurnsAndTimetablesEP1')) if (okAno(t.Year)) for (const k of [1, 2, 3]) if (I(t['PupilsTurn' + k]) || I(t['ClassesTurn' + k]) || S_(t['StartTimeTurn' + k])) push(F(t.Year, t.SchoolId), 'marco', 'turnosEP', { ens: 1001, tur: 1, turno: k, ini: S_(t['StartTimeTurn' + k]), fimh: S_(t['EndTimeTurn' + k]), alunos: I(t['PupilsTurn' + k]), turmas: I(t['ClassesTurn' + k]) });
    for (const t of tab('MarchAluTurProfBilingue')) if (okAno(t.Year)) push(F(t.Year, t.SchoolId), 'marco', 'bilingue', { ens: +t.EducationId, tur: +t.ShiftId, cl: I(t.Grade), h: Math.max(0, I(t.AluHM) - I(t.AluM)), m: I(t.AluM), turmas: I(t.Tur), profH: 0, profM: 0, profT: I(t.Prof) });
    for (const t of tab('MarchLinguas')) if (okAno(t.Year) && I(t.LinguaId)) push(F(t.Year, t.SchoolId), 'marco', 'linguas', { ens: +t.EducationId, tur: +t.ShiftId, lingua: I(t.LinguaId) });
  }

  // ================= formato refeito em 2023 (_Tbl...) =================
  if (nomes.has('_TblEP1')) {
    const N = (n) => tab(n).filter((t) => okAno(t.Ano));
    const keyAge = (col, ens) => {
      const k = col.split('Alu_')[0];
      if (k === '19_20') return '19-20'; if (k === '21_25') return '21-25'; if (k === '26') return '26+';
      const n = +k; if (ens === 1001) return n === 5 ? '5-' : n === 12 ? '12+' : String(n);
      return n === 5 ? '11-' : String(n + 6);
    };
    for (const t of N('_TblEP1')) {
      const f = F(t.Ano, t.SchoolId, t.cdDist); if (!f) continue; nNovo++;
      const id = {};
      for (const c of Object.keys(t)) {
        if (!/^\d/.test(c) || !c.includes('Alu_')) continue; const v = I(t[c]); if (!v) continue;
        const k = keyAge(c, +t.EducationId); const p = id[k] || [0, 0]; p[c.endsWith('_H') ? 0 : 1] += v; id[k] = p;
      }
      push(f, 'marco', 'alunos', { ens: +t.EducationId, tur: +t.ShiftId, cl: I(t.Classe), id, rep: [I(t.Rep_H), I(t.Rep_M)], tp: I(t.TP), tm: I(t.TM), nt: I(t.NTurno), int: [I(t.AluInt_H), I(t.AluInt_M)] });
    }
    const pr = new Map();
    for (const t of N('_TblEP1Prof')) { const f = F(t.Ano, t.SchoolId, t.cdDist); if (!f) continue; const k = [t.Ano, t.SchoolId, t.EducationId, t.ShiftId, I(t.Classe), t.QualificationId].join('|'); const o = pr.get(k); if (o) { o.r.v[0] += I(t.ProfH); o.r.v[1] += I(t.ProfM); } else pr.set(k, { f, r: { ens: +t.EducationId, tur: +t.ShiftId, cl: I(t.Classe), q: +t.QualificationId, v: [I(t.ProfH), I(t.ProfM)] } }); }
    for (const o of pr.values()) if (o.r.v[0] || o.r.v[1]) push(o.f, 'marco', 'prof', o.r);
    // Quadro 5: salas por material; 5.1 turmas ao ar livre e 5.2 turmas anexas trazem também os alunos (H e M)
    for (const t of N('_TblMarchClassroom')) { const f = F(t.Ano, t.SchoolId, t.cdDist); if (!f) continue; f.marco.salas ||= {}; const e = +t.EspacoId; f.marco.salas[e] = (f.marco.salas[e] || 0) + I(t.Salas); const h = I(t.AluH), m = I(t.AluM); if (h || m) { f.marco.salasAlunos ||= {}; const p = f.marco.salasAlunos[e] || [0, 0]; f.marco.salasAlunos[e] = [p[0] + h, p[1] + m]; } }
    for (const t of N('_TblMarchNonTeachingStaff')) { const f = F(t.Ano, t.SchoolId, t.cdDist); if (!f) continue; f.marco.pnd ||= {}; const p = f.marco.pnd[+t.StaffId] || [0, 0]; f.marco.pnd[+t.StaffId] = [p[0] + I(t.StaffMale), p[1] + I(t.StaffFemale)]; }
    for (const t of N('_TblEP1MarchOrfans')) push(F(t.Ano, t.SchoolId, t.cdDist), 'marco', 'orfaos', { ens: +t.EducationId, tur: +t.ShiftId, cl: I(t.Classe), pai: [I(t.OrfaoPaiH), I(t.OrfaoPaiM)], mae: [I(t.OrfaoMaeH), I(t.OrfaoMaeM)], ambos: [I(t.OrfaoH), I(t.OrfaoM)] });
    for (const t of N('_TblEP1MarchDeficiencia2023')) { const v = {}; for (let k = 1; k <= 12; k++) { const h = I(t[k + 'AluH']), m = I(t[k + 'AluM']); if (h || m) v[k] = [h, m]; } if (Object.keys(v).length) push(F(t.Ano, t.SchoolId, t.cdDist), 'marco', 'defic', { ens: +t.EducationId, tur: +t.ShiftId, tipo: +t.DeficId, v }); }
    for (const t of N('_TblEP1AlunosLivrosDisciplina2023')) {
      const v = {}; const ep = +t.EducationId === 1001;
      const vs = {};
      for (let k = 1; k <= 12; k++) { if ((ep && k > 6) || (!ep && k < 7)) continue; const h = I(t[k + 'AluH']), m = I(t[k + 'AluM']); let n = I(t[k + 'Alu']); if (!n) n = h + m; if (n) v[k] = n; if (h || m) vs[k] = [h, m]; }
      if (Object.keys(v).length) push(F(t.Ano, t.SchoolId, t.cdDist), 'marco', 'livros', { ens: +t.EducationId, tur: +t.ShiftId, disc: +t.DisciplinaId, v, ...(Object.keys(vs).length ? { vs } : {}) });
    }
    for (const t of N('_TblEP1ProfsLivrosDisciplina2023')) {
      const v = {}; for (let k = 1; k <= 12; k++) { let n = I(t[k + 'Prof']); if (!n) n = I(t[k + 'ProfH']) + I(t[k + 'ProfM']); if (n) v[k] = n; }
      if (Object.keys(v).length) push(F(t.Ano, t.SchoolId, t.cdDist), 'marco', 'manuais', { ens: +t.EducationId, tur: +t.ShiftId, disc: +t.DisciplinaId, v });
    }
    const inf = new Map();
    for (const t of N('_TblMarchEscolaPossuiInfraMat')) {
      const f = F(t.Ano, t.SchoolId, t.cdDist); if (!f) continue; const o = (f.marco.infra ||= {});
      const mx = (k, c) => { o[k] = Math.max(o[k] || 0, I(t[c])); };
      mx('elect', 'TemElectricidade'); mx('aguaEsc', 'TemAguaCanalNaEscola'); mx('aguaFora', 'TemAguaCanalForaEscola'); mx('fontenaria', 'TemAguaFontenaria'); mx('internet', 'TemInternet'); mx('comput', 'TemComputadores'); mx('nComput', 'QtdComputadores'); mx('adaptada', 'TemInfraeMatAluDefic'); mx('wc', 'TemCasasBanho'); mx('nWc', 'QtdCasasBanho'); mx('latrinas', 'TemLatrinas'); mx('nLatrinas', 'QtdLatrinas'); mx('pae', 'TemPAE');
    }
    for (const t of N('_TblMarchEscolaPossuiInternato')) { const f = F(t.Ano, t.SchoolId, t.cdDist); if (!f) continue; const o = (f.marco.infra ||= {}); o.internato = Math.max(o.internato || 0, I(t.TemInternato)); o.capInternato = (o.capInternato || 0) + I(t.Capacidade); }
    const ABB = { Por: 'Português', Mat: 'Matemática', CS: 'Ciências Sociais', CN: 'Ciências Naturais', LM: 'Línguas Moçambicanas', Bio: 'Biologia', His: 'História', Geo: 'Geografia', Fis: 'Física', Qui: 'Química', EV: 'Educação Visual', EF: 'Educação Física', LI: 'Inglês', LF: 'Francês', Emp: 'Empreendedorismo', Agro: 'Agropecuária', Tic: 'TIC', DGD: 'Desenho e Geometria Descritiva', Fil: 'Filosofia', Psic: 'Psicologia' };
    for (const t of N('_TblDecAlunos')) {
      const notas = {}; for (const [ab, nm] of Object.entries(ABB)) { const v = [I(t[ab + '_1']), I(t[ab + '_2']), I(t[ab + '_3'])]; if (v[0] + v[1] + v[2]) notas[nm] = v; }
      push(F(t.Ano, t.SchoolId, t.cdDist), 'fim', 'aprov', { ens: +t.EducationId, tur: +t.ShiftId, cl: I(t.Classe), fim: [I(t.AluFim_H), I(t.AluFim_M)], exame: [I(t.AluExame_H), I(t.AluExame_M)], aprov: [I(t.AluAprov_H), I(t.AluAprov_M)], tp: I(t.TP), tm: I(t.TM), notas });
    }
    for (const [tb, blk, kc, key] of [['_TblDecAluDesistentes', 'desist', 'DesistenciaId', 'mot'], ['_TblDecAluTransferidos', 'transf', 'TransferenciaId', 'tipo']]) for (const t of N(tb)) {
      const v = {}; for (let k = 1; k <= 12; k++) { const h = I(t[k + 'AluH']), m = I(t[k + 'AluM']); if (h || m) v[k] = [h, m]; }
      if (!Object.keys(v).length) continue; const r = { ens: +t.EducationId, tur: +t.ShiftId, [key]: I(t[kc]), v };
      if (blk === 'desist' && S_(t.Motivos)) r.obs = S_(t.Motivos);
      push(F(t.Ano, t.SchoolId, t.cdDist), 'fim', blk, r);
    }
    for (const t of N('_TblDecProfExercicio')) push(F(t.Ano, t.SchoolId, t.cdDist), 'fim', 'profex', { ens: +t.EducationId, tur: +t.ShiftId, psico: [I(t.PsicoPedH), I(t.PsicoPedM)], sem: [I(t.SemPsicoPedH), I(t.SemPsicoPedM)] });
    const P = (tb, blk, fn) => { for (const t of N(tb)) { const r = fn(t); if (r) push(F(t.Ano, t.SchoolId, t.cdDist), 'marco', blk, r); } };
    P('_TblMarchNewStartersEp1', 'novos', (t) => ({ ens: +t.EducationId, tur: +t.ShiftId, aH: I(t['6Alu_H']), aM: I(t['6Alu_M']), bH: I(t['5Alu_H']), bM: I(t['5Alu_M']) }));
    P('_TblEP1MarchTeachersPerGrade', 'profClasse', (t) => ({ ens: +t.EducationId, tur: +t.ShiftId, cl: I(t.Classe), h: I(t.ProfH), m: I(t.ProfM), t: I(t.ProfHM) }));
    P('_TblESMarchTeachersPerGrade', 'profDisc', (t) => ({ ens: +t.EducationId, tur: +t.ShiftId, cl: I(t.Classe), disc: I(t.DisciplinaId), h: I(t.ProfH), m: I(t.ProfM) }));
    P('_TblEP1MarchTeacherTurnEp1', 'profTurno', (t) => ({ ens: +t.EducationId, tur: +t.ShiftId, reg: I(t.TurnoId), h: I(t.ProfH), m: I(t.ProfM), t: I(t.ProfHM) }));
    P('_TblEP1MarchTeacherAbandon', 'profMov', (t) => ({ ens: +t.EducationId, tur: +t.ShiftId, cl: I(t.Classe), fimH: I(t.FimH), fimM: I(t.FimM), falH: I(t.FalecidosH), falM: I(t.FalecidosM), ftH: I(t.FaltamH), ftM: I(t.FaltamM), abH: I(t.AbandonamH), abM: I(t.AbandonamM) }));
    P('_TblMarchProfTreino', 'profCap', (t) => ({ ens: +t.EducationId, tur: +t.ShiftId, psH: I(t.PsicoPedH), psM: I(t.PsicoPedM), ticH: I(t.TicH), ticM: I(t.TicM), outH: I(t.OutrosH), outM: I(t.OutrosM) }));
    P('_TblMarchTurnsAndTimetablesEp1', 'turnosEP', (t) => ({ ens: +t.EducationId, tur: +t.ShiftId, turno: I(t.TurnoId), ini: S_(t.StartTimeTurn), fimh: S_(t.EndTimeTurn), alunos: I(t.PupilsTurn), turmas: I(t.ClassesTurn) }));
    P('_TblMarchTurnsES', 'turnosES', (t) => ({ ens: +t.EducationId, tur: +t.ShiftId, cl: I(t.Classe), turno: I(t.TurnoId), h: I(t.AluH), m: I(t.AluM), t: I(t.Alu), turmas: I(t.Tur) }));
    P('_TblMarchAluTurProfBilingue', 'bilingue', (t) => ({ ens: +t.EducationId, tur: +t.ShiftId, cl: I(t.Classe), h: I(t.AluH), m: I(t.AluM), turmas: I(t.Tur), profH: I(t.ProfH), profM: I(t.ProfM), profT: I(t.Prof) }));
    P('_TbMarchLinguas', 'linguas', (t) => (I(t.LinguaId) ? { ens: +t.EducationId, tur: +t.ShiftId, lingua: I(t.LinguaId) } : null));
    P('_TblESMarchAluDisciplinaProfissional', 'profiAlu', (t) => ({ ens: +t.EducationId, tur: +t.ShiftId, cl: I(t.Classe), disc: I(t.DisciplinaId), h: I(t.AluH), m: I(t.AluM), turmas: I(t.Tur) }));
    P('_TblESMarchProfDisciplinaProfissional', 'profiProf', (t) => ({ ens: +t.EducationId, tur: +t.ShiftId, disc: I(t.DisciplinaId), h: I(t.ProfH), m: I(t.ProfM), turmas: I(t.Tur) }));
    const mob = new Map();
    for (const t of N('_TblMarchMobilExiste')) { const f = F(t.Ano, t.SchoolId, t.cdDist); if (!f) continue; const k = t.Ano + '|' + t.SchoolId + '|' + t.MobilId; let o = mob.get(k); if (!o) { o = { f, r: { mob: I(t.MobilId), total: 0, bom: 0, reg: 0, mau: 0, falta: 0 } }; mob.set(k, o); } o.r.total += I(t.TotalExiste); o.r.bom += I(t.NumBom); o.r.reg += I(t.NumRegular); o.r.mau += I(t.NumMau); o.r.falta += I(t.NumEmFalta); }
    for (const o of mob.values()) push(o.f, 'marco', 'mobil', o.r);
  }
  // fichas sem alunos nem aproveitamento (só blocos acessórios) ficam de fora, como na conversão inicial
  const lista = [...fichas.values()].filter((f) => f.marco.alunos?.length || f.marco.prof?.length || f.fim.aprov?.length || f.marco.salas || f.fim.desist?.length);
  if (!nAntigo && !nNovo && !nomes.has('MarchAlfabetizacao') && !nomes.has('DecAlfabetizacao')) avisos.push('O ficheiro não tem quadros do EducStat nem do AdultStat reconhecíveis.');
  const alfa = converterAlfa(nomes, tab, DIST, okAno);
  return { fichas: lista, novasEscolas: [...novasEscolas.values()], alfa: alfa.fichas, centros: alfa.centros, avisos, formatos: { antigo: nAntigo > 0, novo: nNovo > 0, alfa: alfa.fichas.length > 0 }, anosFicheiro: [...anosVistos].sort((a, b) => a - b) };
}

function converterAlfa(nomes, tab, DIST, okAno) {
  if (!nomes.has('MarchAlfabetizacao') && !nomes.has('DecAlfabetizacao')) return { fichas: [], centros: [] };
  const A = new Map(); const PROG = ['Reg', 'Radio', 'Profasa', 'Alfalit', 'Reflect'];
  const F = (t) => { if (!okAno(t.Ano) || !DIST.has(+t.cdDist)) return null; const k = t.Ano + '_' + t.CenterId; if (!A.has(k)) A.set(k, { ano: +t.Ano, cen: +t.CenterId, dist: +t.cdDist, esc: I(t.SchoolId) || null, marco: {}, fim: {} }); return A.get(k); };
  const push = (f, sec, b, r) => { if (f) (f[sec][b] ||= []).push(r); };
  for (const t of tab('MarchAlfabetizacao')) { const f = F(t); if (!f) continue; PROG.forEach((p, i) => { const v = [I(t['AluIniH_' + p]), I(t['AluIniM_' + p]), I(t['RepH_' + p]), I(t['RepM_' + p])]; if (v.some(Boolean)) push(f, 'marco', 'prog', { prog: i + 1, insH: v[0], insM: v[1], repH: v[2], repM: v[3] }); }); push(f, 'marco', 'geral', { turAlfa: I(t.Tur), turEPJA: 0, hpvH: I(t.HPVH), hpvM: I(t.HPVM) }); }
  for (const t of tab('MarchEPJA')) { const f = F(t); if (!f) continue; [1, 2, 3, 4].forEach((n) => { const v = [I(t['AluIniH_' + n]), I(t['AluIniM_' + n]), I(t['RepH_' + n]), I(t['RepM_' + n])]; if (v.some(Boolean)) push(f, 'marco', 'epja', { niv: n, insH: v[0], insM: v[1], repH: v[2], repM: v[3] }); }); const g = f.marco.geral?.[0]; if (g) { g.turEPJA = I(t.Tur); g.hpvH += I(t.HPVH); g.hpvM += I(t.HPVM); } else push(f, 'marco', 'geral', { turAlfa: 0, turEPJA: I(t.Tur), hpvH: I(t.HPVH), hpvM: I(t.HPVM) }); }
  for (const t of tab('MarchAlfaEducComSemFormPed')) push(F(t), 'marco', 'educ', { capH: I(t.AlfaComCapH), capM: I(t.AlfaComCapM), semH: I(t.AlfaSemCapH), semM: I(t.AlfaSemCapM), epH: I(t.EducProfissionalH), epM: I(t.EducProfissionalM), eprH: I(t.EducProfH), eprM: I(t.EducProfM) });
  for (const t of tab('MarchAlfaLinguaAprendem')) push(F(t), 'marco', 'lingua', { lingua: I(t.LinguaId), porH: I(t.PorH), porM: I(t.PorM), matH: I(t.MatH), matM: I(t.MatM) });
  for (const [sec, tb] of [['marco', 'MarchAlfaEPJAExiste'], ['fim', 'DecAlfaEPJAExiste']]) for (const t of tab(tb)) push(F(t), sec, 'existe', { alfaH: I(t.AlfaH), alfaM: I(t.AlfaM), epjaH: I(t.EPJAH), epjaM: I(t.EPJAM) });
  const AD = ['Por', 'LM', 'Mat', 'CS', 'CN', 'Ofi'];
  for (const [sec, tb] of [['marco', 'MarchAlfaEPJAporDisciplina'], ['fim', 'DecAlfaEPJAporDisciplina']]) for (const t of tab(tb)) {
    const f = F(t); if (!f) continue;
    if (I(t.Literacia)) push(f, sec, 'disc', { disc: 1, n1: I(t.Literacia), n2: 0, n3: 0, n4: 0 });
    if (I(t.Numeracia)) push(f, sec, 'disc', { disc: 2, n1: I(t.Numeracia), n2: 0, n3: 0, n4: 0 });
    AD.forEach((ab, i) => { const v = [1, 2, 3, 4].map((n) => I(t[ab + '_' + n])); if (v.some(Boolean)) push(f, sec, 'disc', { disc: i + 3, n1: v[0], n2: v[1], n3: v[2], n4: v[3] }); });
  }
  for (const t of tab('DecAlfabetizacao')) { const f = F(t); if (!f) continue; PROG.forEach((p, i) => { const v = [I(t['AluFimH_' + p]), I(t['AluFimM_' + p]), I(t['ExameH_' + p]), I(t['ExameM_' + p]), I(t['AprovH_' + p]), I(t['AprovM_' + p])]; if (v.some(Boolean)) push(f, 'fim', 'prog', { prog: i + 1, fimH: v[0], fimM: v[1], exH: v[2], exM: v[3], apH: v[4], apM: v[5] }); }); push(f, 'fim', 'geral', { turAlfa: I(t.Tur), turEPJA: 0 }); }
  for (const t of tab('DecEPJA')) { const f = F(t); if (!f) continue; [1, 2, 3, 4].forEach((n) => { const v = [I(t['AluFimH_' + n]), I(t['AluFimM_' + n]), I(t['ExameH_' + n]), I(t['ExameM_' + n]), I(t['AprovH_' + n]), I(t['AprovM_' + n])]; if (v.some(Boolean)) push(f, 'fim', 'epja', { niv: n, fimH: v[0], fimM: v[1], exH: v[2], exM: v[3], apH: v[4], apM: v[5] }); }); const g = f.fim.geral?.[0]; if (g) g.turEPJA = I(t.Tur); else push(f, 'fim', 'geral', { turAlfa: 0, turEPJA: I(t.Tur) }); }
  const centros = tab('Center').filter((c) => DIST.has(+c.cdDist)).map((c) => ({ cod: +c.CenterId, nome: S_(c.Name), dist: +c.cdDist, esc: I(c.SchoolId) || null, org: I(c.OrganId) || null, provedor: S_(c.ProvedorName) || null, abertura: I(c.YearOpened) || null, fecho: I(c.YearClosed) || null }));
  return { fichas: [...A.values()], centros };
}

module.exports = { converter };
