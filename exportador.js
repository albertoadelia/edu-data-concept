// Exportador: fichas do EducStat Tete -> linhas das tabelas Access (formato refeito em 2023, EducStat_Dados09 / AdultStat_Dados09).
// Cada tabela devolve as colunas com os nomes exactos do Access e as chaves para apagar as linhas antigas da mesma escola e ano.
const PROV = 9;
const n0 = (v) => (v == null || v === '' ? 0 : Math.round(+v) || 0);

function linhasEscolas(fichas) {
  const T = {};
  const tab = (nome, colunas, chave = ['Ano', 'SchoolId']) => (T[nome] ||= { nome, colunas, chave, linhas: [], apagar: new Set() });
  const base = (f, r) => ({ Ano: f.ano, cdProv: PROV, cdDist: f.dist, SchoolId: f.esc, EducationId: r?.ens ?? null, ShiftId: r?.tur ?? 1 });
  const add = (t, f, o) => { t.apagar.add(f.ano + '|' + f.esc); t.linhas.push(t.colunas.map((c) => (o[c] === undefined ? null : o[c]))); };
  const ageCol = (k, ens) => {
    if (k === '19-20') return '19_20'; if (k === '21-25') return '21_25'; if (k === '26+') return '26';
    const n = parseInt(k, 10); if (ens === 1001) return String(Math.min(12, Math.max(5, n)));
    return String(Math.min(12, Math.max(5, n - 6)));
  };
  const AG = ['5', '6', '7', '8', '9', '10', '11', '12'];
  const C_EP1 = ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'Classe', ...AG.flatMap((a) => [a + 'Alu_H', a + 'Alu_M']), 'Alu_H', 'Alu_M', 'Rep_H', 'Rep_M', 'TP', 'TM', 'NTurno', '19_20Alu_H', '19_20Alu_M', '21_25Alu_H', '21_25Alu_M', '26Alu_H', '26Alu_M', 'AluInt_H', 'AluInt_M'];
  const CL = Array.from({ length: 12 }, (_, i) => i + 1);
  const ABB = { 'Português': 'Por', 'Matemática': 'Mat', 'Ciências Sociais': 'CS', 'Ciências Naturais': 'CN', 'Línguas Moçambicanas': 'LM', 'Biologia': 'Bio', 'História': 'His', 'Geografia': 'Geo', 'Física': 'Fis', 'Química': 'Qui', 'Educação Visual': 'EV', 'Educação Física': 'EF', 'Inglês': 'LI', 'Francês': 'LF', 'Empreendedorismo': 'Emp', 'Agropecuária': 'Agro', 'TIC': 'Tic', 'Desenho e Geometria Descritiva': 'DGD', 'Filosofia': 'Fil', 'Psicologia': 'Psic' };
  const C_DEC = ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'Classe', 'AluFim_H', 'AluFim_M', 'AluExame_H', 'AluExame_M', 'AluAprov_H', 'AluAprov_M', 'TP', 'TM', ...Object.values(ABB).flatMap((a) => [a + '_1', a + '_2', a + '_3'])];
  for (const f of fichas) {
    if (f.ano < 2023) continue; // os quadros antigos não são escritos (o Access actual usa os quadros refeitos)
    const M = f.marco || {}, F = f.fim || {};
    for (const r of M.alunos || []) {
      const o = { ...base(f, r), Classe: r.cl, Rep_H: n0(r.rep?.[0]), Rep_M: n0(r.rep?.[1]), TP: n0(r.tp), TM: n0(r.tm), NTurno: n0(r.nt), AluInt_H: n0(r.int?.[0]), AluInt_M: n0(r.int?.[1]) };
      let th = 0, tm = 0;
      for (const [k, v] of Object.entries(r.id || {})) { const c = ageCol(k, r.ens); o[c + 'Alu_H'] = n0(o[c + 'Alu_H']) + n0(v[0]); o[c + 'Alu_M'] = n0(o[c + 'Alu_M']) + n0(v[1]); th += n0(v[0]); tm += n0(v[1]); }
      for (const c of C_EP1) if (/^\d/.test(c) && o[c] === undefined) o[c] = 0;
      o.Alu_H = th; o.Alu_M = tm;
      add(tab('_TblEP1', C_EP1), f, o);
    }
    for (const r of M.prof || []) add(tab('_TblEP1Prof', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'Classe', 'QualificationId', 'ProfH', 'ProfM', 'ProfHM']), f, { ...base(f, r), Classe: r.cl ?? 0, QualificationId: r.q, ProfH: n0(r.v[0]), ProfM: n0(r.v[1]), ProfHM: 0 });
    for (const [k, v] of Object.entries(M.salas || {})) add(tab('_TblMarchClassroom', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'ShiftId', 'EspacoId', 'Salas', 'Alu']), f, { ...base(f), EspacoId: +k, Salas: n0(v), Alu: null });
    for (const [k, v] of Object.entries(M.pnd || {})) add(tab('_TblMarchNonTeachingStaff', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'ShiftId', 'StaffId', 'StaffFemale', 'StaffMale']), f, { ...base(f), StaffId: +k, StaffMale: n0(v[0]), StaffFemale: n0(v[1]) });
    for (const r of M.orfaos || []) add(tab('_TblEP1MarchOrfans', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'Classe', 'OrfaoPaiH', 'OrfaoPaiM', 'OrfaoPaiHM', 'OrfaoMaeH', 'OrfaoMaeM', 'OrfaoMaeHM', 'OrfaoH', 'OrfaoM', 'OrfaoHM', 'Tot_H', 'Tot_M', 'Tot_HM']), f,
      { ...base(f, r), Classe: r.cl, OrfaoPaiH: n0(r.pai[0]), OrfaoPaiM: n0(r.pai[1]), OrfaoPaiHM: 0, OrfaoMaeH: n0(r.mae[0]), OrfaoMaeM: n0(r.mae[1]), OrfaoMaeHM: 0, OrfaoH: n0(r.ambos[0]), OrfaoM: n0(r.ambos[1]), OrfaoHM: 0, Tot_H: n0(r.pai[0]) + n0(r.mae[0]) + n0(r.ambos[0]), Tot_M: n0(r.pai[1]) + n0(r.mae[1]) + n0(r.ambos[1]), Tot_HM: 0 });
    for (const r of M.defic || []) { const o = { ...base(f, r), DeficId: r.tipo }; for (const c of CL) { const v = r.v?.[c] || [0, 0]; o[c + 'AluH'] = n0(v[0]); o[c + 'AluM'] = n0(v[1]); o[c + 'AluHM'] = 0; } add(tab('_TblEP1MarchDeficiencia2023', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'DeficId', ...CL.flatMap((c) => [c + 'AluH', c + 'AluM', c + 'AluHM'])]), f, o); }
    for (const r of M.manuais || []) { const o = { ...base(f, r), DisciplinaId: r.disc }; let t = 0; for (const c of CL) { o[c + 'Prof'] = n0(r.v?.[c]); t += o[c + 'Prof']; } o.Total = t; add(tab('_TblEP1ProfsLivrosDisciplina2023', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'DisciplinaId', ...CL.map((c) => c + 'Prof'), 'Total']), f, o); }
    for (const r of M.livros || []) { const o = { ...base(f, r), DisciplinaId: r.disc }; let t = 0; for (const c of CL) { o[c + 'Alu'] = n0(r.v?.[c]); t += o[c + 'Alu']; } o.Total = t; add(tab('_TblEP1AlunosLivrosDisciplina2023', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'DisciplinaId', ...CL.map((c) => c + 'Alu'), 'Total']), f, o); }
    if (M.infra) { const I = M.infra; add(tab('_TblMarchEscolaPossuiInfraMat', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'TemElectricidade', 'TemAguaCanalNaEscola', 'TemAguaCanalForaEscola', 'TemAguaFontenaria', 'TemInternet', 'TemComputadores', 'TemInfraeMatAluDefic', 'TemCasasBanho', 'QtdComputadores', 'QtdCasasBanho', 'TemLatrinas', 'QtdLatrinas', 'TemPAE']), f,
      { ...base(f, { ens: M.alunos?.[0]?.ens ?? 1001, tur: 1 }), TemElectricidade: n0(I.elect), TemAguaCanalNaEscola: n0(I.aguaEsc), TemAguaCanalForaEscola: n0(I.aguaFora), TemAguaFontenaria: n0(I.fontenaria), TemInternet: n0(I.internet), TemComputadores: n0(I.comput), TemInfraeMatAluDefic: n0(I.adaptada), TemCasasBanho: n0(I.wc), QtdComputadores: n0(I.nComput), QtdCasasBanho: n0(I.nWc), TemLatrinas: n0(I.latrinas), QtdLatrinas: n0(I.nLatrinas), TemPAE: n0(I.pae) });
      if (I.internato || I.capInternato) add(tab('_TblMarchEscolaPossuiInternato', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'TemInternato', 'Capacidade']), f, { ...base(f, { ens: M.alunos?.[0]?.ens ?? 1001, tur: 1 }), TemInternato: n0(I.internato), Capacidade: n0(I.capInternato) }); }
    const P = (nome, cols, blk, fn) => { for (const r of M[blk] || []) add(tab(nome, cols), f, { ...base(f, r), ...fn(r) }); };
    P('_TblMarchNewStartersEp1', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', '6Alu_H', '6Alu_M', '5Alu_H', '5Alu_M'], 'novos', (r) => ({ '6Alu_H': n0(r.aH), '6Alu_M': n0(r.aM), '5Alu_H': n0(r.bH), '5Alu_M': n0(r.bM) }));
    P('_TblEP1MarchTeachersPerGrade', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'Classe', 'ProfH', 'ProfM', 'ProfHM'], 'profClasse', (r) => ({ Classe: r.cl, ProfH: n0(r.h), ProfM: n0(r.m), ProfHM: n0(r.t) }));
    P('_TblESMarchTeachersPerGrade', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'Classe', 'DisciplinaId', 'ProfH', 'ProfM', 'ProfHM'], 'profDisc', (r) => ({ Classe: r.cl, DisciplinaId: r.disc, ProfH: n0(r.h), ProfM: n0(r.m), ProfHM: 0 }));
    P('_TblEP1MarchTeacherTurnEp1', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'TurnoId', 'ProfH', 'ProfM', 'ProfHM'], 'profTurno', (r) => ({ TurnoId: r.reg, ProfH: n0(r.h), ProfM: n0(r.m), ProfHM: n0(r.t) }));
    P('_TblEP1MarchTeacherAbandon', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'Classe', 'FimH', 'FimM', 'FimHM', 'FalecidosH', 'FalecidosM', 'FalecidosHM', 'FaltamH', 'FaltamM', 'FaltamHM', 'AbandonamH', 'AbandonamM', 'AbandonamHM'], 'profMov', (r) => ({ Classe: r.cl, FimH: n0(r.fimH), FimM: n0(r.fimM), FimHM: 0, FalecidosH: n0(r.falH), FalecidosM: n0(r.falM), FalecidosHM: 0, FaltamH: n0(r.ftH), FaltamM: n0(r.ftM), FaltamHM: 0, AbandonamH: n0(r.abH), AbandonamM: n0(r.abM), AbandonamHM: 0 }));
    P('_TblMarchProfTreino', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'PsicoPedH', 'PsicoPedM', 'PsicoPedHM', 'TicH', 'TicM', 'TicHM', 'OutrosH', 'OutrosM', 'OutrosHM', 'TotH', 'TotM', 'TotHM'], 'profCap', (r) => ({ PsicoPedH: n0(r.psH), PsicoPedM: n0(r.psM), PsicoPedHM: 0, TicH: n0(r.ticH), TicM: n0(r.ticM), TicHM: 0, OutrosH: n0(r.outH), OutrosM: n0(r.outM), OutrosHM: 0, TotH: n0(r.psH) + n0(r.ticH) + n0(r.outH), TotM: n0(r.psM) + n0(r.ticM) + n0(r.outM), TotHM: 0 }));
    P('_TblMarchTurnsAndTimetablesEp1', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'TurnoId', 'StartTimeTurn', 'EndTimeTurn', 'PupilsTurn', 'ClassesTurn'], 'turnosEP', (r) => ({ TurnoId: r.turno, StartTimeTurn: r.ini || null, EndTimeTurn: r.fimh || null, PupilsTurn: n0(r.alunos), ClassesTurn: n0(r.turmas) }));
    P('_TblMarchTurnsES', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'Classe', 'TurnoId', 'Alu', 'Tur', 'AluH', 'AluM'], 'turnosES', (r) => ({ Classe: r.cl, TurnoId: r.turno, Alu: n0(r.t) || n0(r.h) + n0(r.m), Tur: n0(r.turmas), AluH: n0(r.h), AluM: n0(r.m) }));
    P('_TblMarchAluTurProfBilingue', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'Classe', 'AluH', 'AluM', 'AluHM', 'Tur', 'Prof', 'ProfH', 'ProfM'], 'bilingue', (r) => ({ Classe: r.cl, AluH: n0(r.h), AluM: n0(r.m), AluHM: n0(r.h) + n0(r.m), Tur: n0(r.turmas), Prof: n0(r.profT) || n0(r.profH) + n0(r.profM), ProfH: n0(r.profH), ProfM: n0(r.profM) }));
    P('_TbMarchLinguas', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'LinguaId'], 'linguas', (r) => ({ LinguaId: r.lingua }));
    P('_TblESMarchAluDisciplinaProfissional', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'Classe', 'DisciplinaId', 'AluH', 'AluM', 'AluHM', 'Tur'], 'profiAlu', (r) => ({ Classe: r.cl, DisciplinaId: r.disc, AluH: n0(r.h), AluM: n0(r.m), AluHM: n0(r.h) + n0(r.m), Tur: n0(r.turmas) }));
    P('_TblESMarchProfDisciplinaProfissional', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'DisciplinaId', 'ProfH', 'ProfM', 'ProfHM', 'Tur'], 'profiProf', (r) => ({ DisciplinaId: r.disc, ProfH: n0(r.h), ProfM: n0(r.m), ProfHM: n0(r.h) + n0(r.m), Tur: n0(r.turmas) }));
    for (const r of M.mobil || []) add(tab('_TblMarchMobilExiste', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'ShiftId', 'MobilId', 'TotalExiste', 'NumBom', 'NumRegular', 'NumMau', 'NumEmFalta']), f, { ...base(f), MobilId: r.mob, TotalExiste: n0(r.total), NumBom: n0(r.bom), NumRegular: n0(r.reg), NumMau: n0(r.mau), NumEmFalta: n0(r.falta) });
    // fim do ano
    for (const r of F.aprov || []) {
      const o = { ...base(f, r), Classe: r.cl, AluFim_H: n0(r.fim[0]), AluFim_M: n0(r.fim[1]), AluExame_H: n0(r.exame?.[0]), AluExame_M: n0(r.exame?.[1]), AluAprov_H: n0(r.aprov[0]), AluAprov_M: n0(r.aprov[1]), TP: n0(r.tp), TM: n0(r.tm) };
      for (const [nm, ab] of Object.entries(ABB)) { const v = r.notas?.[nm] || [0, 0, 0]; o[ab + '_1'] = n0(v[0]); o[ab + '_2'] = n0(v[1]); o[ab + '_3'] = n0(v[2]); }
      add(tab('_TblDecAlunos', C_DEC), f, o);
    }
    for (const [nome, blk, kc, key] of [['_TblDecAluDesistentes', 'desist', 'DesistenciaId', 'mot'], ['_TblDecAluTransferidos', 'transf', 'TransferenciaId', 'tipo']]) for (const r of F[blk] || []) {
      const o = { ...base(f, r), [kc]: r[key] }; if (blk === 'desist') o.Motivos = r.obs || null;
      for (const c of CL) { const v = r.v?.[c] || [0, 0]; o[c + 'AluH'] = n0(v[0]); o[c + 'AluM'] = n0(v[1]); }
      add(tab(nome, ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', kc, ...(blk === 'desist' ? ['Motivos'] : []), ...CL.flatMap((c) => [c + 'AluH', c + 'AluM'])]), f, o);
    }
    for (const r of F.profex || []) add(tab('_TblDecProfExercicio', ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'EducationId', 'ShiftId', 'PsicoPedH', 'PsicoPedM', 'SemPsicoPedH', 'SemPsicoPedM']), f, { ...base(f, r), PsicoPedH: n0(r.psico[0]), PsicoPedM: n0(r.psico[1]), SemPsicoPedH: n0(r.sem[0]), SemPsicoPedM: n0(r.sem[1]) });
  }
  return Object.values(T).map((t) => ({ ...t, apagar: [...t.apagar].map((k) => k.split('|').map(Number)) }));
}

function linhasAlfa(fichas) {
  const T = {};
  const tab = (nome, colunas) => (T[nome] ||= { nome, colunas, chave: ['Ano', 'CenterId'], linhas: [], apagar: new Set() });
  const add = (t, f, o) => { t.apagar.add(f.ano + '|' + f.cen); t.linhas.push(t.colunas.map((c) => (o[c] === undefined ? 0 : o[c]))); };
  const B = (f) => ({ Ano: f.ano, cdProv: PROV, cdDist: f.dist, SchoolId: f.esc ?? null, CenterId: f.cen });
  const PROG = ['Reg', 'Radio', 'Profasa', 'Alfalit', 'Reflect'];
  const KB = ['Ano', 'cdProv', 'cdDist', 'SchoolId', 'CenterId'];
  for (const f of fichas) {
    const M = f.marco || {}, F = f.fim || {};
    if (M.prog?.length || M.geral?.length) {
      const o = B(f); for (const p of PROG) Object.assign(o, { ['AluIniH_' + p]: 0, ['AluIniM_' + p]: 0, ['RepH_' + p]: 0, ['RepM_' + p]: 0 });
      for (const r of M.prog || []) { const p = PROG[r.prog - 1]; if (!p) continue; o['AluIniH_' + p] += n0(r.insH); o['AluIniM_' + p] += n0(r.insM); o['RepH_' + p] += n0(r.repH); o['RepM_' + p] += n0(r.repM); }
      const g = M.geral?.[0] || {}; o.Tur = n0(g.turAlfa); o.HPVH = n0(g.hpvH); o.HPVM = n0(g.hpvM);
      add(tab('MarchAlfabetizacao', [...KB, ...PROG.flatMap((p) => ['AluIniH_' + p, 'AluIniM_' + p, 'RepH_' + p, 'RepM_' + p]), 'Tur', 'HPVH', 'HPVM']), f, o);
    }
    if (M.epja?.length) {
      const o = B(f); for (const n of [1, 2, 3, 4]) Object.assign(o, { ['AluIniH_' + n]: 0, ['AluIniM_' + n]: 0, ['RepH_' + n]: 0, ['RepM_' + n]: 0 });
      for (const r of M.epja) { o['AluIniH_' + r.niv] += n0(r.insH); o['AluIniM_' + r.niv] += n0(r.insM); o['RepH_' + r.niv] += n0(r.repH); o['RepM_' + r.niv] += n0(r.repM); }
      o.Tur = n0(M.geral?.[0]?.turEPJA); o.HPVH = 0; o.HPVM = 0;
      add(tab('MarchEPJA', [...KB, ...[1, 2, 3, 4].flatMap((n) => ['AluIniH_' + n, 'AluIniM_' + n, 'RepH_' + n, 'RepM_' + n]), 'Tur', 'HPVH', 'HPVM']), f, o);
    }
    for (const r of M.educ || []) add(tab('MarchAlfaEducComSemFormPed', [...KB, 'AlfaComCapH', 'AlfaComCapM', 'AlfaSemCapH', 'AlfaSemCapM', 'EducProfissionalH', 'EducProfissionalM', 'EducProfH', 'EducProfM']), f, { ...B(f), AlfaComCapH: n0(r.capH), AlfaComCapM: n0(r.capM), AlfaSemCapH: n0(r.semH), AlfaSemCapM: n0(r.semM), EducProfissionalH: n0(r.epH), EducProfissionalM: n0(r.epM), EducProfH: n0(r.eprH), EducProfM: n0(r.eprM) });
    for (const r of M.lingua || []) add(tab('MarchAlfaLinguaAprendem', [...KB, 'PorH', 'PorM', 'MatH', 'MatM', 'LinguaId']), f, { ...B(f), PorH: n0(r.porH), PorM: n0(r.porM), MatH: n0(r.matH), MatM: n0(r.matM), LinguaId: r.lingua || null });
    for (const [sec, nome] of [['marco', 'MarchAlfaEPJAExiste'], ['fim', 'DecAlfaEPJAExiste']]) for (const r of f[sec]?.existe || []) add(tab(nome, [...KB, 'AlfaH', 'AlfaM', 'EPJAH', 'EPJAM']), f, { ...B(f), AlfaH: n0(r.alfaH), AlfaM: n0(r.alfaM), EPJAH: n0(r.epjaH), EPJAM: n0(r.epjaM) });
    const AD = ['Por', 'LM', 'Mat', 'CS', 'CN', 'Ofi'];
    for (const [sec, nome] of [['marco', 'MarchAlfaEPJAporDisciplina'], ['fim', 'DecAlfaEPJAporDisciplina']]) {
      const ds = f[sec]?.disc || []; if (!ds.length) continue;
      const o = { ...B(f), Literacia: 0, Numeracia: 0 }; for (const ab of AD) for (const n of [1, 2, 3, 4]) o[ab + '_' + n] = 0;
      for (const r of ds) { if (r.disc === 1) o.Literacia += n0(r.n1); else if (r.disc === 2) o.Numeracia += n0(r.n1); else { const ab = AD[r.disc - 3]; if (ab) for (const n of [1, 2, 3, 4]) o[ab + '_' + n] += n0(r['n' + n]); } }
      add(tab(nome, [...KB, 'Literacia', 'Numeracia', ...AD.flatMap((ab) => [1, 2, 3, 4].map((n) => ab + '_' + n))]), f, o);
    }
    if (F.prog?.length || F.geral?.length) {
      const o = B(f); for (const p of PROG) Object.assign(o, { ['AluFimH_' + p]: 0, ['AluFimM_' + p]: 0, ['ExameH_' + p]: 0, ['ExameM_' + p]: 0, ['AprovH_' + p]: 0, ['AprovM_' + p]: 0 });
      for (const r of F.prog || []) { const p = PROG[r.prog - 1]; if (!p) continue; o['AluFimH_' + p] += n0(r.fimH); o['AluFimM_' + p] += n0(r.fimM); o['ExameH_' + p] += n0(r.exH); o['ExameM_' + p] += n0(r.exM); o['AprovH_' + p] += n0(r.apH); o['AprovM_' + p] += n0(r.apM); }
      o.Tur = n0(F.geral?.[0]?.turAlfa);
      add(tab('DecAlfabetizacao', [...KB, ...PROG.flatMap((p) => ['AluFimH_' + p, 'AluFimM_' + p, 'ExameH_' + p, 'ExameM_' + p, 'AprovH_' + p, 'AprovM_' + p]), 'Tur']), f, o);
    }
    if (F.epja?.length) {
      const o = B(f); for (const n of [1, 2, 3, 4]) Object.assign(o, { ['AluFimH_' + n]: 0, ['AluFimM_' + n]: 0, ['ExameH_' + n]: 0, ['ExameM_' + n]: 0, ['AprovH_' + n]: 0, ['AprovM_' + n]: 0 });
      for (const r of F.epja) { o['AluFimH_' + r.niv] += n0(r.fimH); o['AluFimM_' + r.niv] += n0(r.fimM); o['ExameH_' + r.niv] += n0(r.exH); o['ExameM_' + r.niv] += n0(r.exM); o['AprovH_' + r.niv] += n0(r.apH); o['AprovM_' + r.niv] += n0(r.apM); }
      o.Tur = n0(F.geral?.[0]?.turEPJA);
      add(tab('DecEPJA', [...KB, ...[1, 2, 3, 4].flatMap((n) => ['AluFimH_' + n, 'AluFimM_' + n, 'ExameH_' + n, 'ExameM_' + n, 'AprovH_' + n, 'AprovM_' + n]), 'Tur']), f, o);
    }
  }
  return Object.values(T).map((t) => ({ ...t, apagar: [...t.apagar].map((k) => k.split('|').map(Number)) }));
}

// Script PowerShell que escreve na base Access com o motor Jet/ACE do Windows (32 bits para .mdb).
const PS1 = String.raw`param([string]$json)
$ErrorActionPreference = 'Stop'
$d = Get-Content -Raw -Encoding UTF8 $json | ConvertFrom-Json
$cn = $null
foreach ($p in @('Microsoft.Jet.OLEDB.4.0','Microsoft.ACE.OLEDB.12.0','Microsoft.ACE.OLEDB.16.0')) {
  try { $cn = New-Object System.Data.OleDb.OleDbConnection("Provider=$p;Data Source=$($d.mdb)"); $cn.Open(); Write-Output "MOTOR $p"; break } catch { $cn = $null }
}
if ($cn -eq $null) { Write-Output 'ERRO Não foi encontrado o motor do Access (Jet/ACE) neste computador.'; exit 2 }
# colunas de cada tabela, lidas antes da transacção (o motor Jet não aceita restrições vazias em GetSchema)
$colunasDe = @{}
foreach ($t in $d.tabelas) {
  $ex = @{}
  try {
    $sch = $cn.GetOleDbSchemaTable([System.Data.OleDb.OleDbSchemaGuid]::Columns, [object[]]@($null, $null, [string]$t.nome, $null))
    foreach ($r in $sch.Rows) { $ex[([string]$r.COLUMN_NAME).ToLower()] = $true }
  } catch {}
  if ($ex.Count -eq 0) {
    try { $q = $cn.CreateCommand(); $q.CommandText = "SELECT * FROM [$($t.nome)] WHERE 1=0"; $rd = $q.ExecuteReader(); for ($i = 0; $i -lt $rd.FieldCount; $i++) { $ex[$rd.GetName($i).ToLower()] = $true }; $rd.Close() } catch {}
  }
  $colunasDe[$t.nome] = $ex
}
$tx = $cn.BeginTransaction()
try {
  foreach ($t in $d.tabelas) {
    $exist = $colunasDe[$t.nome]
    if ($exist.Count -eq 0) { Write-Output "AVISO tabela $($t.nome) não existe na base: ignorada"; continue }
    $idx = @(); for ($i = 0; $i -lt $t.colunas.Count; $i++) { if ($exist.ContainsKey($t.colunas[$i].ToLower())) { $idx += $i } }
    $del = $cn.CreateCommand(); $del.Transaction = $tx
    $del.CommandText = "DELETE FROM [$($t.nome)] WHERE [$($t.chave[0])] = ? AND [$($t.chave[1])] = ?"
    $nd = 0
    foreach ($k in $t.apagar) { $del.Parameters.Clear(); [void]$del.Parameters.AddWithValue('a', [int]$k[0]); [void]$del.Parameters.AddWithValue('b', [int]$k[1]); $nd += $del.ExecuteNonQuery() }
    $cols = ($idx | ForEach-Object { '[' + $t.colunas[$_] + ']' }) -join ','
    $qs = ($idx | ForEach-Object { '?' }) -join ','
    $ins = $cn.CreateCommand(); $ins.Transaction = $tx
    $ins.CommandText = "INSERT INTO [$($t.nome)] ($cols) VALUES ($qs)"
    $ni = 0
    foreach ($row in $t.linhas) {
      $ins.Parameters.Clear()
      foreach ($i in $idx) {
        $v = $row[$i]
        if ($v -eq $null) { [void]$ins.Parameters.AddWithValue('p' + $i, [DBNull]::Value) }
        elseif ($v -is [string]) { [void]$ins.Parameters.AddWithValue('p' + $i, $v) }
        else { [void]$ins.Parameters.AddWithValue('p' + $i, [int]$v) }
      }
      $ni += $ins.ExecuteNonQuery()
    }
    Write-Output "TABELA $($t.nome) apagadas=$nd inseridas=$ni"
  }
  $tx.Commit(); Write-Output 'OK'
} catch { $tx.Rollback(); Write-Output ('ERRO ' + $_.Exception.Message); exit 1 } finally { $cn.Close() }
`;

module.exports = { linhasEscolas, linhasAlfa, PS1 };
