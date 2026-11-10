// EducStat Tete — aplicação Windows offline (processo principal)
const { app, BrowserWindow, ipcMain, dialog, protocol, net, Menu, shell, clipboard, nativeImage } = require('electron');
// todas as chamadas internas (IPC) só são aceites vindas da janela do programa (app://educstat/)
{ const _handle = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (canal, fn) => _handle(canal, (e, ...a) => { const u = e?.senderFrame?.url || ''; if (!u.startsWith('app://educstat/')) throw new Error('Chamada recusada (origem desconhecida).'); return fn(e, ...a); }); }
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

const APP_DIR = path.join(__dirname, 'app');
const CFG_FILE = () => path.join(app.getPath('userData'), 'configuracao.json');
const readCfg = () => { try { return JSON.parse(fs.readFileSync(CFG_FILE(), 'utf8')); } catch { return {}; } };
const writeCfg = (c) => { fs.mkdirSync(path.dirname(CFG_FILE()), { recursive: true }); fs.writeFileSync(CFG_FILE(), JSON.stringify(c, null, 2)); };
const dataDir = () => readCfg().pastaDados || path.join(app.getPath('documents'), 'EducStat Tete', 'Dados');
const COLS = new Set(['fichas', 'resumo', 'escolas', 'alfa', 'centros', 'utilizadores', 'config', 'registo', 'mensagens', 'populacao', 'conflitos']);
// sessão actual (definida pela interface ao entrar): o visitante não guarda nem exporta ficheiros, e isto confirma-se aqui, no processo principal
// sessão autenticada no processo principal: a palavra-passe confere-se aqui (não na interface) e o perfil vem do ficheiro dos utilizadores
const SESSAO_LOCAL = { perfil: null, utilizador: null, dist: 0, raiz: false, desde: null, falhas: 0, ate: 0, emergenciaAte: 0 };
const visitante = () => SESSAO_LOCAL.perfil === 0;
const autenticado = () => Number.isInteger(SESSAO_LOCAL.perfil) && SESSAO_LOCAL.perfil > 0 && !!SESSAO_LOCAL.utilizador && (!SESSAO_LOCAL.emergenciaAte || Date.now() < SESSAO_LOCAL.emergenciaAte);
const adminProvincial = () => autenticado() && SESSAO_LOCAL.perfil >= 3 && (!SESSAO_LOCAL.dist || SESSAO_LOCAL.raiz);
const exigirSessao = () => { if (!autenticado()) throw new Error('É necessário iniciar sessão.'); };
const exigirAdmin = (provincial = false) => { exigirSessao(); if (SESSAO_LOCAL.perfil < 3 || (provincial && !adminProvincial())) throw new Error('Operação reservada ao administrador autorizado.'); };
const exigirDistrito = (dist) => { exigirSessao(); if (SESSAO_LOCAL.dist && +dist && +dist !== +SESSAO_LOCAL.dist) throw new Error('Operação fora do distrito autorizado.'); };
const exigirColecao = (colecao, operacao = 'ler', obj = null) => {
  exigirSessao(); if (operacao === 'gravar' && !PODE_GRAVAR(colecao)) throw new Error('Sem permissão para gravar esta coleção.');
  if (colecao === 'config' && !adminProvincial()) throw new Error('Configuração reservada à administração provincial.');
  if (colecao === 'utilizadores' && SESSAO_LOCAL.perfil < 3) throw new Error('Utilizadores reservados à administração.');
  if (obj && obj.dist) exigirDistrito(obj.dist);
};
function registarSeguranca(evento, dados = {}) { try { const f = colFile('seguranca'); const o = lerSeguro(f) || {}; const id = new Date().toISOString() + '_' + Math.random().toString(36).slice(2, 7); o[id] = { evento, ...dados, em: new Date().toISOString(), computador: require('os').hostname() }; const ks = Object.keys(o).sort().slice(-200); gravarSeguro(f, Object.fromEntries(ks.map((k) => [k, o[k]]))); } catch {} }
const lerUtilizadores = () => { try { return JSON.parse(fs.readFileSync(path.join(dataDir(), 'utilizadores.json'), 'utf8')) || {}; } catch { return {}; } };
// sem contas no disco: o computador está em arranque e ainda não tem administrador (permite criar a 1.ª conta sem sessão)
const semContas = () => { try { return Object.keys(lerUtilizadores()).length === 0; } catch { return false; } };
const lerConfig = (id) => { try { return (JSON.parse(fs.readFileSync(path.join(dataDir(), 'config.json'), 'utf8')) || {})[id] || null; } catch { return null; } };
ipcMain.handle('auth:entrar', (_e, a = {}) => {
  if (Date.now() < SESSAO_LOCAL.ate) return { erro: `Demasiadas tentativas erradas. Aguarde ${Math.ceil((SESSAO_LOCAL.ate - Date.now()) / 1000)} segundos.` };
  const id = String(a.utilizador || '').trim().toLowerCase(); const senha = String(a.senha || '');
  if (!/^[a-z0-9._-]{2,30}$/.test(id) || senha.length > 200) return { erro: 'Utilizador ou palavra-passe errados.' };
  const u = lerUtilizadores()[id];
  const ok = u && u.activo && !u.apagado && !u.pendente && u.sal && u.hash && crypto.timingSafeEqual(Buffer.from(crypto.scryptSync(senha, u.sal, 32).toString('hex')), Buffer.from(String(u.hash).padEnd(64, '0').slice(0, 64)));
  if (!ok) { SESSAO_LOCAL.falhas++; if (SESSAO_LOCAL.falhas >= 5) SESSAO_LOCAL.ate = Date.now() + 30000 * 2 ** Math.min(5, SESSAO_LOCAL.falhas - 5); return { erro: u?.pendente ? 'pendente' : 'Utilizador ou palavra-passe errados, ou utilizador desactivado.' }; }
  if (u.mudar && u.expira && Date.now() > new Date(u.expira).getTime()) return { erro: 'expirada' };
  SESSAO_LOCAL.falhas = 0; Object.assign(SESSAO_LOCAL, { perfil: +u.perfil, utilizador: id, dist: +u.dist || 0, raiz: !!u.raiz, desde: new Date().toISOString(), emergenciaAte: 0 });
  const { hash, sal, ...publico } = u;
  const cfg = readCfg(); let recuperacao = null;
  if (SESSAO_LOCAL.perfil >= 3 && !cfg.recuperacao?.hash) {
    const codigo = crypto.randomBytes(18).toString('base64url').slice(0, 24).toUpperCase(); const rs = crypto.randomBytes(16).toString('hex');
    cfg.recuperacao = { sal: rs, hash: crypto.scryptSync(codigo, rs, 32).toString('hex'), utilizador: id, criada: new Date().toISOString(), usada: false };
    writeCfg(cfg); recuperacao = codigo;
  }
  return { ok: true, utilizador: publico, recuperacao };
});
ipcMain.handle('auth:visitante', () => { const ac = lerConfig('acesso'); if (ac && ac.visitante === false) return { erro: 'A entrada de visitantes está desligada.' }; Object.assign(SESSAO_LOCAL, { perfil: 0, utilizador: 'visitante', dist: 0, raiz: false, desde: new Date().toISOString() }); return { ok: true }; });
ipcMain.handle('auth:sair', () => { Object.assign(SESSAO_LOCAL, { perfil: null, utilizador: null, dist: 0, raiz: false, desde: null, emergenciaAte: 0 }); return true; });
// copiar imagem (mapas/gráficos) para a área de transferência — nativo, fiável
ipcMain.handle('img:clip', (_e, dataURL) => { try { const img = nativeImage.createFromDataURL(String(dataURL || '')); if (img.isEmpty()) return false; clipboard.writeImage(img); return true; } catch { return false; } });
ipcMain.handle('auth:mudarSenha', (_e, a = {}) => { if (!SESSAO_LOCAL.utilizador || SESSAO_LOCAL.perfil === 0) return { erro: 'Sem sessão.' }; const n = String(a.nova || ''); if (n.length < 8 || n.length > 200) return { erro: 'Palavra-passe inválida.' }; const sal = crypto.randomBytes(16).toString('hex'); return { sal, hash: crypto.scryptSync(n, sal, 32).toString('hex') }; });
ipcMain.handle('auth:recuperacao', (_e, op, a = {}) => {
  const cfg = readCfg();
  if (op === 'estado') return { configurada: !!cfg.recuperacao?.hash, usada: !!cfg.recuperacao?.usada };
  if (op === 'gerar') {
    exigirAdmin(true); const codigo = crypto.randomBytes(18).toString('base64url').slice(0, 24).toUpperCase(); const sal = crypto.randomBytes(16).toString('hex');
    cfg.recuperacao = { sal, hash: crypto.scryptSync(codigo, sal, 32).toString('hex'), utilizador: SESSAO_LOCAL.utilizador, criada: new Date().toISOString(), usada: false }; writeCfg(cfg); return { ok: true, codigo };
  }
  if (op === 'usar') {
    const r = cfg.recuperacao; const codigo = String(a.codigo || '').trim().toUpperCase();
    if (!r?.hash || r.usada || !codigo || !r.sal) return { erro: 'Código de recuperação inválido ou já utilizado.' };
    const h = crypto.scryptSync(codigo, r.sal, 32).toString('hex'); if (h !== r.hash) return { erro: 'Código de recuperação inválido ou já utilizado.' };
    const u = lerUtilizadores()[r.utilizador]; if (!u || !u.activo || +u.perfil < 3) return { erro: 'A conta de recuperação já não está disponível.' };
    r.usada = true; r.usadaEm = new Date().toISOString(); writeCfg(cfg); Object.assign(SESSAO_LOCAL, { perfil: +u.perfil, utilizador: r.utilizador, dist: +u.dist || 0, raiz: true, desde: new Date().toISOString(), emergenciaAte: Date.now() + 15 * 60000 });
    registarSeguranca('recuperação de emergência utilizada', { utilizador: r.utilizador, temporaria: true });
    return { ok: true, temporaria: true, utilizador: (({ hash, sal, ...x }) => ({ ...x, mudar: true }))(u) };
  }
  return { erro: 'Operação desconhecida.' };
});
// o visitante não grava nada no disco além do registo de actividade;
// sem sessão só se gravam utilizadores/config/mensagens, e o conteúdo é validado em autorizarSemSessao (arranque e pedidos de conta)
const PODE_GRAVAR = (c) => {
  if (c === 'registo') return true;          // registo de actividade: sempre (append-only)
  if (USO.outro) return false;                // outra máquina a trabalhar na mesma pasta partilhada
  if (SESSAO_LOCAL.perfil === 0) return false; // visitante: não grava nada
  if (autenticado()) return true;             // sessão iniciada
  return c === 'utilizadores' || c === 'config' || c === 'mensagens';
};
// ficheiro largado (arrastado) sobre o programa: o caminho fica guardado uns segundos e o próximo "Abrir" usa-o em vez da janela de escolha
const LARGADO = { l: [], em: 0 };
ipcMain.on('largar:definir', (e, caminhos) => { if (e.sender !== win?.webContents) return; LARGADO.l = (Array.isArray(caminhos) ? caminhos : []).filter((c) => typeof c === 'string' && c.length < 1024 && fs.existsSync(c)); LARGADO.em = Date.now(); });
async function escolherFicheiros(opts, varios) {
  if (LARGADO.l.length && Date.now() - LARGADO.em < 15000) {
    const exts = (opts.filters || []).flatMap((f) => f.extensions || []).map((x) => x.toLowerCase());
    const ok = LARGADO.l.filter((c) => !exts.length || exts.includes('*') || exts.includes(path.extname(c).slice(1).toLowerCase()));
    const fora = LARGADO.l.filter((c) => !ok.includes(c)); LARGADO.l = []; LARGADO.em = 0;
    if (ok.length) return { canceled: false, filePaths: varios ? ok : [ok[0]] };
    if (fora.length) { try { win.webContents.send('largar:recusado', { ficheiro: path.basename(fora[0]), aceita: exts }); } catch {} return { canceled: true, filePaths: [] }; }
  }
  return dialog.showOpenDialog(win, opts);
}

// português de Portugal/Moçambique: campos de data em dia/mês/ano
app.commandLine.appendSwitch('lang', 'pt-PT');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

// nome que aparece nas notificações do Windows (em vez de “electron.app.EducStat Tete”)
app.setName('EducStat Tete');
if (process.platform === 'win32') app.setAppUserModelId('mz.gov.tete.dpe.educstat');
if (!app.requestSingleInstanceLock()) app.quit();
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600, show: false, title: 'EducStat Tete', icon: path.join(__dirname, 'build', 'icon.png'),
    backgroundColor: '#F3F5F4', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  });
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  // antes de fechar, a interface grava o que estiver pendente e só depois a janela fecha (no máximo 8 segundos de espera)
  let podeFechar = false;
  win.on('close', (e) => { if (podeFechar) return; e.preventDefault(); try { win.webContents.send('app:fechar'); } catch { podeFechar = true; win.close(); return; } setTimeout(() => { if (!podeFechar) { podeFechar = true; win.close(); } }, 8000); });
  ipcMain.removeAllListeners('app:prontoFechar'); ipcMain.on('app:prontoFechar', (e) => { if (e.sender !== win.webContents) return; podeFechar = true; win.close(); });
  // sem ferramentas de programador nem recarregar por teclado (F5, Ctrl+R, Ctrl+Shift+I) na versão instalada
  win.webContents.on('before-input-event', (e, i) => { const k = (i.key || '').toLowerCase(); if (app.isPackaged && (k === 'f12' || k === 'f5' || (i.control && (k === 'r' || (i.shift && (k === 'i' || k === 'j' || k === 'c')))))) e.preventDefault(); });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) e.preventDefault(); });
  win.loadURL('app://educstat/index.html');
}
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const u = new URL(req.url);
    const p = path.normalize(path.join(APP_DIR, decodeURIComponent(u.pathname)));
    if (p !== APP_DIR && !p.startsWith(APP_DIR + path.sep)) return new Response('', { status: 403 });
    if (!fs.existsSync(p)) return new Response('', { status: 404 });
    return net.fetch(pathToFileURL(p).toString());
  });
  // sem menu nativo: as opções Ficheiro, Ver e Ajuda estão no menu interno, que só aparece depois de entrar
  Menu.setApplicationMenu(null);
  createWindow();
});
app.on('window-all-closed', () => app.quit());

// ---------------- base de dados local: um ficheiro JSON por colecção ----------------

// gravação segura contra cortes de energia: escreve num ficheiro temporário, força a escrita no disco (fsync),
// guarda a versão anterior e só depois troca; ao ler, se o ficheiro estiver estragado usa a versão anterior
function gravarSeguro(f, texto) {
  const tmp = f + '.tmp'; const fd = fs.openSync(tmp, 'w');
  try { fs.writeSync(fd, texto); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  if (fs.existsSync(f)) { try { const st = fs.statSync(f); if (st.size > 2) fs.copyFileSync(f, f + '.anterior'); } catch {} }
  fs.renameSync(tmp, f);
  try { const d = fs.openSync(path.dirname(f), 'r'); try { fs.fsyncSync(d); } catch {} fs.closeSync(d); } catch {}
}
const CORROMPIDOS = [];
function lerSeguro(f) {
  let existe = false;
  for (const x of [f, f + '.anterior', f + '.tmp']) {
    try { const t = fs.readFileSync(x, 'utf8'); existe = true; if (!t.trim()) continue; const o = JSON.parse(t); if (x !== f) console.warn('recuperado de', x); return o; } catch {}
  }
  // o ficheiro existe mas não se consegue ler: guarda uma cópia à parte (para não ser apagado na próxima gravação) e avisa
  if (existe) { try { const dir = path.join(dataDir(), 'Corrompidos'); fs.mkdirSync(dir, { recursive: true }); const marca = new Date().toISOString().replace(/[:.]/g, '-'); for (const x of [f, f + '.anterior']) if (fs.existsSync(x)) fs.copyFileSync(x, path.join(dir, path.basename(x) + '.' + marca)); } catch {} CORROMPIDOS.push(path.basename(f)); }
  return null;
}
// validação dos argumentos IPC: só objectos simples (não listas, não nulos), chaves de documento sem caminhos
const objSimples = (o) => !!o && typeof o === 'object' && !Array.isArray(o) && Object.getPrototypeOf(o) === Object.prototype && Object.keys(o).every((k) => k.length <= 200 && !/[\\/]|^\.\.?$/.test(k));
const colFile = (c) => path.join(dataDir(), `${c}.json`);
// colecções grandes ficam divididas por ano (pasta Dados/<colecção>/<ano>.json): gravar uma ficha só reescreve o ficheiro desse ano
const PARTIDAS = new Set(['fichas', 'alfa', 'resumo']);
ipcMain.handle('db:load', (_e, c) => {
  if (!COLS.has(c)) throw new Error('colecção inválida');
  let out = lerSeguro(colFile(c)) || {}; const antigo = PARTIDAS.has(c) && Object.keys(out).length > 0;
  if (PARTIDAS.has(c)) {
    const dir = path.join(dataDir(), c); let fs_ = [];
    try { fs_ = fs.readdirSync(dir); } catch {}
    const partes = new Set(fs_.filter((f) => /\.json(\.anterior|\.tmp)?$/.test(f)).map((f) => f.replace(/\.json.*$/, '')));
    for (const p of partes) { const o = lerSeguro(path.join(dir, p + '.json')); if (o) Object.assign(out, o); }
  }
  if (antigo) out.__migrar = true;
  if (CORROMPIDOS.length) out.__corrompidos = CORROMPIDOS.splice(0);
  return out;
});
ipcMain.handle('db:savePart', (_e, c, parte, obj) => {
  exigirSessao();
  exigirColecao(c, 'gravar', obj);
  if (!PARTIDAS.has(c) || !/^[\w-]{1,20}$/.test(String(parte))) throw new Error('parte inválida');
  if (!objSimples(obj)) throw new Error('dados inválidos');
  const dir = path.join(dataDir(), c); fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `${parte}.json`);
  if (!Object.keys(obj).length) { for (const x of [f, f + '.anterior', f + '.tmp']) { try { fs.unlinkSync(x); } catch {} } return true; }
  gravarSeguro(f, JSON.stringify(obj));
  return true;
});
ipcMain.handle('db:fimMigracao', (_e, c) => { exigirAdmin(); const f = colFile(c); try { if (fs.existsSync(f)) fs.renameSync(f, f + '.migrado'); } catch {} return true; });
// gravações sem sessão: só o arranque (1.ª conta de administrador) e os pedidos de conta/mensagens,
// validadas no processo principal pelo conteúdo — nunca se podem alterar ou apagar contas já existentes
function autorizarSemSessao(c, obj) {
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const lerCol = (col) => { try { return JSON.parse(fs.readFileSync(colFile(col), 'utf8')) || {}; } catch { return {}; } };
  const vazio = semContas();
  if (c === 'config') {
    // sem sessão só se pode mexer na configuração de instalação (onde o computador trabalha);
    // as definições sensíveis (servidor, chave, pasta de dados, acesso, limites) ficam intactas
    const antigo = lerCol('config');
    for (const k of Object.keys(antigo)) if (k !== 'instalacao' && !eq(obj[k], antigo[k])) throw new Error('É necessário iniciar sessão.');
    for (const k of Object.keys(obj)) if (k !== 'instalacao' && !eq(obj[k], antigo[k])) throw new Error('É necessário iniciar sessão.');
    return;
  }
  if (c === 'utilizadores') {
    const antigo = lerCol('utilizadores');
    // arranque (nenhuma conta ainda): é o passo de instalação — admite as contas de administrador
    // criadas aqui ou recebidas no ficheiro da DPE; nenhuma conta oculta (raiz)
    if (vazio) {
      for (const k of Object.keys(obj)) { const u = obj[k];
        if (!u || typeof u !== 'object' || u.raiz) throw new Error('É necessário iniciar sessão.'); }
      return;
    }
    // já há contas: só acrescentar contas novas pendentes/inactivas, sem tocar nem apagar as existentes
    for (const k of Object.keys(antigo)) if (!eq(obj[k], antigo[k])) throw new Error('É necessário iniciar sessão.');
    for (const k of Object.keys(obj)) { if (k in antigo) continue; const u = obj[k];
      if (!u || typeof u !== 'object' || u.raiz || u.activo === true || u.pendente !== true || +u.perfil >= 3) throw new Error('É necessário iniciar sessão.'); }
    return;
  }
  if (c === 'mensagens') {
    // pedido de conta ou de reposição de palavra-passe: só acrescentar, nunca apagar/alterar mensagens existentes
    if (vazio) throw new Error('É necessário iniciar sessão.');
    const antigo = lerCol('mensagens');
    for (const k of Object.keys(antigo)) if (!eq(obj[k], antigo[k])) throw new Error('É necessário iniciar sessão.');
    for (const k of Object.keys(obj)) { if (k in antigo) continue; const m = obj[k];
      if (!m || typeof m !== 'object' || !(m.tipo === 'conta' || m.tipo === 'senha')) throw new Error('É necessário iniciar sessão.'); }
    return;
  }
  throw new Error('É necessário iniciar sessão.');
}
ipcMain.handle('db:save', (_e, c, obj) => {
  if (!COLS.has(c)) throw new Error('colecção inválida');
  if (!objSimples(obj)) throw new Error('dados inválidos');
  if (c === 'registo') { /* registo de actividade: sempre gravável (append-only) */ }
  else if (autenticado()) exigirColecao(c, 'gravar', obj);
  else autorizarSemSessao(c, obj); // sem sessão: arranque e pedidos de conta, validados pelo conteúdo
  if (!PODE_GRAVAR(c)) throw new Error('sem permissão para gravar ' + c);
  fs.mkdirSync(dataDir(), { recursive: true });
  gravarSeguro(colFile(c), JSON.stringify(obj));
  return true;
});
const ipsLocais = () => { try { return Object.values(require('os').networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address); } catch { return []; } };
// marca de utilização da pasta de dados: detecta outro computador a trabalhar na mesma pasta (pasta partilhada)
const USO = { desde: new Date().toISOString(), outro: null, f: () => path.join(dataDir(), '.em_uso.json') };
function marcarUso() { try { const os = require('os'); let o = null; try { o = JSON.parse(fs.readFileSync(USO.f(), 'utf8')); } catch {}
  if (o && o.maquina !== os.hostname() && Date.now() - new Date(o.em).getTime() < 3 * 60000) USO.outro = o; else if (o && o.maquina === os.hostname()) USO.outro = null;
  if (!USO.outro) { fs.mkdirSync(dataDir(), { recursive: true }); fs.writeFileSync(USO.f(), JSON.stringify({ maquina: os.hostname(), pid: process.pid, desde: USO.desde, em: new Date().toISOString() })); } } catch {} }
app.whenReady().then(() => { marcarUso(); setInterval(marcarUso, 60000); });
ipcMain.handle('db:info', () => ({ pasta: dataDir(), versao: app.getVersion(), maquina: require('os').hostname(), ips: ipsLocais(), outroUso: USO.outro }));
// cópia automática diária (pasta Dados\Copias, guarda as 14 mais recentes)
ipcMain.handle('db:copiaAuto', (_e, texto) => {
  exigirSessao();
  const dir = path.join(dataDir(), 'Copias'); fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `EducStat_copia_${new Date().toISOString().slice(0, 10)}.json`);
  gravarSeguro(f, texto);
  const l = fs.readdirSync(dir).filter((x) => /^EducStat_copia_\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort();
  for (const x of l.slice(0, Math.max(0, l.length - 14))) { try { fs.unlinkSync(path.join(dir, x)); } catch {} }
  return { ok: true, caminho: f, n: Math.min(l.length, 14) };
});
ipcMain.handle('db:copias', () => { exigirSessao(); const dir = path.join(dataDir(), 'Copias'); try { return fs.readdirSync(dir).filter((x) => x.endsWith('.json') && !x.includes('.anterior')).sort().reverse().map((x) => ({ nome: x, tam: fs.statSync(path.join(dir, x)).size })); } catch { return []; } });
ipcMain.handle('db:lerCopia', (_e, nome) => { exigirAdmin(); if (!/^EducStat_copia_[\d-]+\.json$/.test(nome)) return null; const b = fs.readFileSync(path.join(dataDir(), 'Copias', nome)); if (b.length > LIM_FICHEIRO) throw new Error('cópia demasiado grande'); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); });
ipcMain.handle('db:chooseFolder', async () => {
  exigirAdmin(true);
  const r = await dialog.showOpenDialog(win, { title: 'Escolher a pasta de dados', properties: ['openDirectory', 'createDirectory'] });
  if (r.canceled || !r.filePaths[0]) return null;
  const antiga = dataDir(); const nova = r.filePaths[0];
  // a pasta nova sem utilizadores recebe os utilizadores e as configurações da pasta actual: não se volta a criar conta
  try { if (path.resolve(antiga) !== path.resolve(nova) && !fs.existsSync(path.join(nova, 'utilizadores.json'))) { fs.mkdirSync(nova, { recursive: true }); for (const f of ['utilizadores.json', 'config.json', 'mensagens.json', 'populacao.json']) { const o = path.join(antiga, f); if (fs.existsSync(o)) fs.copyFileSync(o, path.join(nova, f)); } } } catch {}
  const c = readCfg(); c.pastaDados = nova; writeCfg(c);
  return nova;
});
ipcMain.handle('app:reload', () => { Object.assign(SESSAO_LOCAL, { perfil: null, utilizador: null, dist: 0, raiz: false, desde: null }); win.reload(); });

// ---------------- palavras-passe ----------------
ipcMain.handle('auth:hash', (_e, senha, sal) => {
  const s = sal || crypto.randomBytes(16).toString('hex');
  return { sal: s, hash: crypto.scryptSync(String(senha), s, 32).toString('hex') };
});

// ---------------- ficheiros ----------------
const LIM_FICHEIRO = 100 * 1048576; // 100 MB por ficheiro (anexos, Excel, pacotes, cópias)
const FILTERS = { png: { name: 'Imagem', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] }, jpg: { name: 'Imagem JPEG', extensions: ['jpg', 'jpeg'] }, img: { name: 'Imagem', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] }, pdf: { name: 'PDF', extensions: ['pdf'] }, docx: { name: 'Documento Word', extensions: ['docx'] }, geojson: { name: 'GeoJSON', extensions: ['geojson', 'json'] }, kml: { name: 'KML', extensions: ['kml'] }, zip: { name: 'ZIP', extensions: ['zip'] }, txt: { name: 'Texto', extensions: ['txt', 'md'] }, csv: { name: 'CSV', extensions: ['csv'] }, xlsx: { name: 'Livro Excel', extensions: ['xlsx', 'xls', 'xlsm'] }, xls: { name: 'Livro Excel antigo (.xls)', extensions: ['xls'] }, json: { name: 'Ficheiro de dados', extensions: ['json'] }, educsync: { name: 'Pacote de sincronização EducStat', extensions: ['educsync'] } };
ipcMain.handle('file:save', async (_e, nome, dados) => {
  exigirSessao(); if (visitante()) return { status: 'declined', erro: 'visitante' };
  if ((typeof dados === 'string' ? Buffer.byteLength(dados) : Buffer.byteLength(Buffer.from(dados || []))) > LIM_FICHEIRO) return { status: 'declined', erro: 'ficheiro demasiado grande' };
  const ext = path.extname(nome).slice(1).toLowerCase();
  const r = await dialog.showSaveDialog(win, { title: 'Guardar ficheiro', defaultPath: path.join(app.getPath('documents'), nome), filters: FILTERS[ext] ? [FILTERS[ext]] : [] });
  if (r.canceled || !r.filePath) return { status: 'declined' };
  fs.writeFileSync(r.filePath, typeof dados === 'string' ? dados : Buffer.from(dados));
  return { status: 'saved', caminho: r.filePath };
});
ipcMain.handle('file:open', async (_e, exts) => {
  const fl = (exts || []).map((x) => FILTERS[x]).filter(Boolean); const todas = [...new Set(fl.flatMap((x) => x.extensions))];
  const r = await escolherFicheiros({ title: 'Abrir ficheiro', properties: ['openFile'], filters: fl.length > 1 ? [{ name: 'Ficheiros suportados', extensions: todas }, ...fl] : fl });
  if (r.canceled || !r.filePaths[0]) return null;
  // limites: tamanho máximo e extensão verdadeira (a do filtro), para não carregar ficheiros enormes ou de outro tipo
  const aviso = (t) => { try { win.webContents.send('largar:recusado', { texto: t }); } catch {} return null; };
  const st = fs.statSync(r.filePaths[0]); if (st.size > LIM_FICHEIRO) return aviso(`O ficheiro tem ${Math.round(st.size / 1048576)} MB; o máximo é ${LIM_FICHEIRO / 1048576} MB.`);
  if (todas.length && !todas.includes(path.extname(r.filePaths[0]).slice(1).toLowerCase())) return aviso('Tipo de ficheiro não aceite aqui.');
  const buf = fs.readFileSync(r.filePaths[0]);
  return { nome: path.basename(r.filePaths[0]), dados: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
});

ipcMain.handle('file:openMany', async (_e, exts, pasta) => {
  let files = [];
  if (pasta) {
    const r = await dialog.showOpenDialog(win, { title: 'Escolher a pasta com os pacotes', properties: ['openDirectory'] });
    if (r.canceled || !r.filePaths[0]) return null;
    files = fs.readdirSync(r.filePaths[0]).filter((f) => (exts || []).some((x) => f.toLowerCase().endsWith('.' + x))).map((f) => path.join(r.filePaths[0], f));
  } else {
    const r = await escolherFicheiros({ title: 'Abrir ficheiros', properties: ['openFile', 'multiSelections'], filters: (exts || []).map((x) => FILTERS[x]).filter(Boolean) }, true);
    if (r.canceled || !r.filePaths.length) return null; files = r.filePaths;
  }
  const exts2 = (exts || []).flatMap((x) => FILTERS[x]?.extensions || [x]);
  files = files.filter((f) => !exts2.length || exts2.includes(path.extname(f).slice(1).toLowerCase())).filter((f) => { try { return fs.statSync(f).size <= LIM_FICHEIRO; } catch { return false; } });
  return files.slice(0, 200).map((f) => { const b = fs.readFileSync(f); return { nome: path.basename(f), dados: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }; });
});

// ---------------- importar bases Access (.mdb / .accdb) ----------------
ipcMain.handle('access:import', async (_e, opts) => {
  exigirAdmin();
  const r = await escolherFicheiros({ title: 'Escolher a base Access do EducStat ou AdultStat', properties: ['openFile'], filters: [{ name: 'Base Access', extensions: ['mdb', 'accdb'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  try {
    if (fs.statSync(r.filePaths[0]).size > 1536 * 1048576) return { erro: 'A base Access tem mais de 1,5 GB: compacte-a no Access (Ficheiro > Compactar e Reparar) e tente de novo.' };
    const { converter } = require('./conversor');
    const res = converter(fs.readFileSync(r.filePaths[0]), { ...opts, MDBReader: await carregarMDB() });
    res.ficheiro = path.basename(r.filePaths[0]);
    return res;
  } catch (e) { return { erro: String(e && e.message || e) }; }
});

// ---------------- explorador de bases Access ----------------
const MDB = { reader: null, nome: null, buffer: null, cache: {} };
const valor = (v) => (v instanceof Date ? v.toISOString().slice(0, 19).replace('T', ' ') : Buffer.isBuffer(v) ? '[binário]' : v);
// mdb-reader é um módulo ES: tem de ser carregado com import()
let _MDB = null; async function carregarMDB() { if (!_MDB) { let m; try { m = require('./lib/mdb-reader.cjs'); } catch { m = await import('mdb-reader'); } _MDB = m.default || m; } return _MDB; }
ipcMain.handle('mdb:open', async () => {
  exigirSessao(); if (visitante()) return { erro: 'Visitante: sem acesso.' };
  const r = await escolherFicheiros({ title: 'Abrir base Access', properties: ['openFile'], filters: [{ name: 'Base Access', extensions: ['mdb', 'accdb'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  try {
    const MDBReader = await carregarMDB();
    const buf = fs.readFileSync(r.filePaths[0]);
    MDB.reader = new MDBReader(buf); MDB.buffer = buf; MDB.nome = path.basename(r.filePaths[0]); MDB.caminho = r.filePaths[0]; MDB.cache = {};
    const tabelas = MDB.reader.getTableNames().map((n) => { const t = MDB.reader.getTable(n); return { nome: n, linhas: t.rowCount, colunas: t.getColumnNames() }; });
    return { ficheiro: MDB.nome, caminho: MDB.caminho, tabelas };
  } catch (e) { return { erro: String(e.message || e) }; }
});
function mdbDados(t) { if (!MDB.cache[t]) MDB.cache[t] = MDB.reader.getTable(t).getData().map((r) => { const o = {}; for (const k in r) o[k] = valor(r[k]); return o; }); return MDB.cache[t]; }
function mdbFiltrar(t, { filtro, ano, ordem, desc }) {
  let d = mdbDados(t);
  if (ano) d = d.filter((r) => +(r.Ano ?? r.Year) === +ano);
  if (filtro) { const q = String(filtro).toLowerCase(); d = d.filter((r) => Object.values(r).some((v) => v != null && String(v).toLowerCase().includes(q))); }
  if (ordem) d = [...d].sort((a, b) => { const x = a[ordem], y = b[ordem]; return (x === y ? 0 : x == null ? 1 : y == null ? -1 : x > y ? 1 : -1) * (desc ? -1 : 1); });
  return d;
}
ipcMain.handle('mdb:rows', (_e, t, o = {}) => { exigirSessao(); if (visitante()) return { erro: 'Visitante: sem acesso.' }; if (!MDB.reader) return null; o = o || {}; const off = Math.max(0, +o.offset || 0), lim = Math.min(2000, Math.max(1, +o.limit || 100)); const d = mdbFiltrar(t, o); return { total: d.length, linhas: d.slice(off, off + lim) }; });
ipcMain.handle('mdb:all', (_e, t, o) => { exigirSessao(); if (visitante()) return null; return MDB.reader ? mdbFiltrar(t, o || {}) : null; });
ipcMain.handle('mdb:convert', async (_e, opts) => { exigirAdmin(); if (!MDB.buffer) return null; try { const { converter } = require('./conversor'); const r = converter(MDB.buffer, { ...opts, MDBReader: await carregarMDB() }); r.ficheiro = MDB.nome; return r; } catch (e) { return { erro: String(e.message || e) }; } });

// ---------------- escrever numa base Access (motor Jet/ACE do Windows) ----------------
ipcMain.handle('access:export', async (_e, fichas, alfa) => {
  exigirAdmin(); if (visitante()) return { status: 'declined', erro: 'visitante' };
  const r = await dialog.showOpenDialog(win, { title: 'Escolher a base Access onde escrever (EducStat_Dados ou AdultStat_Dados)', properties: ['openFile'], filters: [{ name: 'Base Access', extensions: ['mdb', 'accdb'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  const mdb = r.filePaths[0];
  const { linhasEscolas, linhasAlfa, PS1 } = require('./exportador');
  const tabelas = [...linhasEscolas(fichas || []), ...linhasAlfa(alfa || [])];
  if (!tabelas.length) return { erro: 'Não há mapas de 2023 em diante para escrever.' };
  const copia = mdb.replace(/(\.\w+)$/, `_copia_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}$1`);
  fs.copyFileSync(mdb, copia);
  const tmp = app.getPath('temp'); const jf = path.join(tmp, 'educstat_export.json'), ps = path.join(tmp, 'educstat_export.ps1');
  fs.writeFileSync(jf, JSON.stringify({ mdb, tabelas }), 'utf8'); fs.writeFileSync(ps, '\ufeff' + PS1, 'utf8');
  const sys32 = path.join(process.env.SystemRoot || 'C:\\Windows', 'SysWOW64', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const exe = fs.existsSync(sys32) ? sys32 : 'powershell.exe';
  const { execFile } = require('child_process');
  return await new Promise((res) => execFile(exe, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps, '-json', jf], { maxBuffer: 1 << 24, windowsHide: true }, (err, out, errOut) => {
    try { fs.unlinkSync(jf); } catch {}
    res({ ok: !err && /\bOK\b/.test(out), log: String(out || '') + String(errOut || ''), copia, tabelas: tabelas.map((t) => ({ nome: t.nome, linhas: t.linhas.length })) });
  }));
});
ipcMain.handle('access:csv', async (_e, fichas, alfa) => {
  exigirAdmin(); if (visitante()) return { status: 'declined', erro: 'visitante' };
  const r = await dialog.showOpenDialog(win, { title: 'Escolher a pasta para os ficheiros CSV', properties: ['openDirectory', 'createDirectory'] });
  if (r.canceled || !r.filePaths[0]) return null;
  const { linhasEscolas, linhasAlfa } = require('./exportador');
  const q = (v) => (v == null ? '' : typeof v === 'string' ? '"' + v.replace(/"/g, '""') + '"' : String(v));
  const out = [];
  for (const t of [...linhasEscolas(fichas || []), ...linhasAlfa(alfa || [])]) {
    fs.writeFileSync(path.join(r.filePaths[0], t.nome + '.csv'), '\ufeff' + [t.colunas.join(';'), ...t.linhas.map((l) => l.map(q).join(';'))].join('\r\n'), 'utf8');
    out.push({ nome: t.nome, linhas: t.linhas.length });
  }
  fs.writeFileSync(path.join(r.filePaths[0], 'COMO_IMPORTAR_NO_ACCESS.txt'), '\ufeff' + [
    'Como juntar estes ficheiros CSV à base Access (EducStat / AdultStat)', '',
    'Cada ficheiro tem o nome de uma tabela da base (por exemplo _TblEP1.csv vai para a tabela _TblEP1).',
    'Os ficheiros usam ponto e vírgula (;) como separador e a primeira linha tem os nomes das colunas.', '',
    '1. Faça uma cópia da base .mdb antes de começar.',
    '2. Abra a base no Access. Para cada escola e ano que vai importar, apague primeiro as linhas antigas dessa escola e ano na tabela (para não ficarem repetidas).',
    '3. Separador Dados Externos > Novo Origem de Dados > De Ficheiro > Texto (no Access 2010-2013: Dados Externos > Ficheiro de Texto).',
    '4. Escolha o ficheiro .csv e marque “Acrescentar uma cópia dos registos à tabela” e escolha a tabela com o mesmo nome do ficheiro.',
    '5. No assistente: Delimitado > separador Ponto e vírgula > marque “A primeira linha contém nomes de campos” > Avançar > Concluir.',
    '6. Repita para cada ficheiro. Se o Access disser que um campo não existe, essa coluna é nova no formulário: pode ignorá-la.',
  ].join('\r\n'), 'utf8');

  return { pasta: r.filePaths[0], tabelas: out };
});

// ---------------- mecanismo próprio de comunicação: pacotes e dados online cifrados ----------------
// Só as aplicações EducStat Tete com esta chave conseguem ler ou criar pacotes e registos online.
const CHAVE_ORG = crypto.createHash('sha256').update('EducStat-Tete:f9c632397baa3b286a4e056f2e8bc11ed10cba028e6b53f93f159c41c64cb882').digest();
const zlib = require('zlib');
// pacotes: com a chave da organização (definida pela DPE) quando existe; a chave antiga embutida só serve enquanto
// a DPE não definir a sua, e deixa de ser aceite depois disso
function selarCom(obj, k) {
  const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', k, iv);
  const enc = Buffer.concat([c.update(zlib.gzipSync(Buffer.from(JSON.stringify(obj), 'utf8'))), c.final()]);
  return Buffer.concat([Buffer.from('EDUCSYNC3'), iv, c.getAuthTag(), enc]);
}
function abrirSeloCom(buf, k) {
  buf = Buffer.from(buf);
  if (buf.slice(0, 9).toString() !== 'EDUCSYNC3') throw new Error('formato desconhecido');
  const iv = buf.slice(9, 21), tag = buf.slice(21, 37), d = crypto.createDecipheriv('aes-256-gcm', k, iv); d.setAuthTag(tag);
  return JSON.parse(zlib.gunzipSync(Buffer.concat([d.update(buf.slice(37)), d.final()])).toString('utf8'));
}
function selar(obj) {
  const k0 = chaveOrg(); if (k0) return selarCom(obj, k0);
  const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', CHAVE_ORG, iv);
  const enc = Buffer.concat([c.update(zlib.gzipSync(Buffer.from(JSON.stringify(obj), 'utf8'))), c.final()]);
  return Buffer.concat([Buffer.from('EDUCSYNC2'), iv, c.getAuthTag(), enc]);
}
function abrirSelo(buf) {
  buf = Buffer.from(buf);
  const k0 = chaveOrg();
  if (buf.slice(0, 9).toString() === 'EDUCSYNC3') { if (!k0) throw new Error('falta a chave de cifra da organização neste computador'); return abrirSeloCom(buf, k0); }
  if (k0) throw new Error('pacote antigo, sem a chave da organização: peça um pacote novo');
  if (buf.slice(0, 9).toString() !== 'EDUCSYNC2') throw new Error('não é um pacote do EducStat Tete');
  const iv = buf.slice(9, 21), tag = buf.slice(21, 37), d = crypto.createDecipheriv('aes-256-gcm', CHAVE_ORG, iv); d.setAuthTag(tag);
  return JSON.parse(zlib.gunzipSync(Buffer.concat([d.update(buf.slice(37)), d.final()])).toString('utf8'));
}
ipcMain.handle('pac:selar', (_e, obj) => { const b = selar(obj); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); });
ipcMain.handle('pac:abrir', (_e, buf) => { try { return { ok: true, dados: abrirSelo(buf) }; } catch (e) { return { ok: false, erro: 'Pacote inválido, alterado ou de outro sistema (' + e.message + ').' }; } });
// ---------------- segurança: chave da organização e sessão no servidor ----------------
// A chave de cifra dos pacotes e dos registos online é escolhida pela DPE e introduzida em cada computador
// (não vem dentro do programa). Fica guardada cifrada com a protecção do Windows (safeStorage/DPAPI).
const { safeStorage } = require('electron');
// sem a protecção do Windows, cifra com uma chave deste computador e utilizador (AES-GCM), em vez de guardar só codificado
function chaveMaquina() { const c = readCfg(); if (!c.salMaq) { c.salMaq = crypto.randomBytes(16).toString('hex'); writeCfg(c); } const os = require('os'); return crypto.createHash('sha256').update(`EducStat|${os.hostname()}|${os.userInfo().username}|${c.salMaq}`).digest(); }
const proteger = (txt) => { try { if (safeStorage.isEncryptionAvailable()) return 'ss:' + safeStorage.encryptString(txt).toString('base64'); } catch {}
  const iv = crypto.randomBytes(12); const ci = crypto.createCipheriv('aes-256-gcm', chaveMaquina(), iv); const b = Buffer.concat([ci.update(txt, 'utf8'), ci.final()]); return 'mk:' + Buffer.concat([iv, ci.getAuthTag(), b]).toString('base64'); };
const desproteger = (v) => { if (!v) return ''; try { if (v.startsWith('ss:')) return safeStorage.decryptString(Buffer.from(v.slice(3), 'base64'));
  if (v.startsWith('mk:')) { const b = Buffer.from(v.slice(3), 'base64'); const d = crypto.createDecipheriv('aes-256-gcm', chaveMaquina(), b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'); }
  if (v.startsWith('b64:')) return Buffer.from(v.slice(4), 'base64').toString(); } catch {} return ''; };
function chaveOrg() { const c = desproteger(readCfg().chaveOrg); return c ? crypto.createHash('sha256').update('EducStat-Tete-org:' + c).digest() : null; }
ipcMain.handle('seg:chave', (_e, op, valor) => {
  exigirAdmin(true);
  const c = readCfg();
  if (op === 'definir') { if (!valor || String(valor).length < 16) return { ok: false, erro: 'A chave tem de ter pelo menos 16 caracteres.' }; c.chaveOrg = proteger(String(valor)); writeCfg(c); return { ok: true }; }
  if (op === 'gerar') return { ok: true, chave: crypto.randomBytes(18).toString('base64').replace(/[+/=]/g, '').slice(0, 24).replace(/(.{6})(?=.)/g, '$1-') };
  if (op === 'retirar') { delete c.chaveOrg; writeCfg(c); return { ok: true }; }
  return { ok: true, definida: !!c.chaveOrg, impressao: c.chaveOrg ? crypto.createHash('sha256').update(desproteger(c.chaveOrg)).digest('hex').slice(0, 8) : null };
});

// ficheiro de configuração de um computador novo do SDEJT (distrito, servidor e chave da organização), protegido por um PIN
ipcMain.handle('cfg:computador', async (_e, op, a = {}) => {
  try { exigirAdmin(true); } catch (e) { return { erro: e.message }; }
  try {
    const pin = String(a.pin || ''); if (pin.length < 6) return { erro: 'PIN curto (mínimo 6 caracteres).' };
    if (op === 'exportar') {
      const c = readCfg(); const chave = desproteger(c.chaveOrg); if (!chave && !a.utilizadores?.length) return { erro: 'Este computador ainda não tem a chave da organização (Administração > Sincronização).' };
      // v2: leva também os utilizadores do distrito (com a palavra-passe cifrada por hash, nunca em claro) e a instalação
      const us = Array.isArray(a.utilizadores) ? a.utilizadores.filter((u) => u && typeof u.utilizador === 'string' && +u.dist === +a.dist && !u.raiz).slice(0, 200) : [];
      const conteudo = Buffer.from(JSON.stringify({ v: 2, dist: +a.dist, nome: String(a.nome || ''), servidor: c.servidor || null, chaveOrg: chave || null, utilizadores: us, criado: new Date().toISOString() }));
      const sal = crypto.randomBytes(16), iv = crypto.randomBytes(12); const k = crypto.scryptSync(pin, sal, 32, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
      const ci = crypto.createCipheriv('aes-256-gcm', k, iv); const b = Buffer.concat([ci.update(conteudo), ci.final()]);
      const out = Buffer.concat([Buffer.from('EDUCCFG1'), sal, iv, ci.getAuthTag(), b]);
      const r = await dialog.showSaveDialog(win, { title: 'Guardar a configuração do computador', defaultPath: path.join(app.getPath('documents'), `EducStat_configuracao_${String(a.nome || a.dist).replace(/\s+/g, '_')}.educcfg`), filters: [{ name: 'Configuração EducStat', extensions: ['educcfg'] }] });
      if (r.canceled || !r.filePath) return null; fs.writeFileSync(r.filePath, out); return { ok: true };
    }
    if (op === 'importar') {
      const r = await escolherFicheiros({ title: 'Escolher o ficheiro de configuração', properties: ['openFile'], filters: [{ name: 'Configuração EducStat', extensions: ['educcfg'] }] });
      if (r.canceled || !r.filePaths[0]) return null; const b = fs.readFileSync(r.filePaths[0]);
      if (b.length > 1e6 || b.subarray(0, 8).toString() !== 'EDUCCFG1') return { erro: 'Não é um ficheiro de configuração do EducStat.' };
      const sal = b.subarray(8, 24), iv = b.subarray(24, 36), tag = b.subarray(36, 52), dados = b.subarray(52);
      const k = crypto.scryptSync(pin, sal, 32, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }); let o;
      try { const d = crypto.createDecipheriv('aes-256-gcm', k, iv); d.setAuthTag(tag); o = JSON.parse(Buffer.concat([d.update(dados), d.final()]).toString()); } catch { return { erro: 'PIN errado ou ficheiro alterado.' }; }
      if (!o || !(+o.dist > 900) || (!o.chaveOrg && !o.utilizadores?.length)) return { erro: 'Configuração incompleta.' };
      const c = readCfg(); if (o.chaveOrg) c.chaveOrg = proteger(String(o.chaveOrg)); if (o.servidor) c.servidor = o.servidor; writeCfg(c);
      return { ok: true, dist: +o.dist, utilizadores: Array.isArray(o.utilizadores) ? o.utilizadores : [] };
    }
    return { erro: 'operação desconhecida' };
  } catch (e) { return { erro: String(e.message || e) }; }
});

// sincronização online: Supabase (PostgREST + Auth). Cada computador entra com a conta do seu nível
// (DPE ou SDEJT); as regras no servidor (RLS) só deixam ver e gravar o que pertence a esse nível.
const SERVIDOR = { url: 'https://dvwttxtugxvvwtmablhc.supabase.co', chave: 'sb_publishable_J1RkZ-iN1llte8P3z1WlHA_Q4z-yJ6R', tabela: 'educstat_docs' };
function servidor() { const s = { ...SERVIDOR, ...(readCfg().servidor || {}) }; const u = new URL(s.url); if (u.protocol !== 'https:' || !/\.supabase\.co$/.test(u.hostname)) throw new Error('servidor inválido (só HTTPS em *.supabase.co)'); s.url = u.origin; return s; }
ipcMain.handle('net:servidor', (_e, op, s) => {
  try { exigirAdmin(true); } catch (e) { return { ok: false, erro: e.message }; }
  const c = readCfg();
  if (op === 'definir') { try { const u = new URL(s.url); if (u.protocol !== 'https:' || !/\.supabase\.co$/.test(u.hostname)) return { ok: false, erro: 'Só são aceites servidores HTTPS do Supabase (*.supabase.co).' }; if (!/^(sb_publishable_|eyJ)/.test(s.chave || '')) return { ok: false, erro: 'Use a chave publicável (sb_publishable_…) ou anon; nunca a chave secreta/service_role.' }; c.servidor = { url: u.origin, chave: s.chave, tabela: /^[a-z_][a-z0-9_]{0,40}$/.test(s.tabela || '') ? s.tabela : 'educstat_docs' }; writeCfg(c); delete SESSAO.acesso; return { ok: true }; } catch { return { ok: false, erro: 'Endereço inválido.' }; } }
  if (op === 'repor') { delete c.servidor; writeCfg(c); return { ok: true }; }
  const v = servidor(); return { url: v.url, tabela: v.tabela, chave: v.chave.slice(0, 18) + '…', email: c.contaEmail || null, conta: c.contaInfo || null };
});
const SESSAO = {};
async function acesso() {
  const s = servidor();
  if (SESSAO.acesso && SESSAO.expira > Date.now() + 60000) return SESSAO.acesso;
  const rt = desproteger(readCfg().contaRefresh); if (!rt) throw Object.assign(new Error('Este computador ainda não entrou no servidor (Administração > Sincronização > Entrar com a conta).'), { code: 'sessao' });
  const r = await net.fetch(s.url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: s.chave, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: rt }) });
  if (!r.ok) throw Object.assign(new Error('A sessão no servidor expirou: entre de novo com a conta (Administração > Sincronização).'), { code: 'sessao' });
  const j = await r.json(); guardarSessao(j); return SESSAO.acesso;
}
function guardarSessao(j) { SESSAO.acesso = j.access_token; SESSAO.expira = Date.now() + (j.expires_in || 3600) * 1000; const c = readCfg(); c.contaRefresh = proteger(j.refresh_token); if (j.user?.email) c.contaEmail = j.user.email; writeCfg(c); }
ipcMain.handle('net:sync', async (_e, _cfg, op, arg) => {
  exigirSessao(); if (visitante()) return { ok: false, erro: 'Visitante: sem sincronização.' };
  try {
    const s = servidor(); const base = s.url + '/rest/v1/' + s.tabela;
    if (op === 'entrar') {
      const r = await net.fetch(s.url + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: s.chave, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: arg.email, password: arg.senha }) });
      if (!r.ok) return { ok: false, erro: r.status === 400 ? 'Email ou palavra-passe da conta do servidor errados.' : 'Servidor respondeu ' + r.status };
      const j = await r.json(); guardarSessao(j);
      const rc = await net.fetch(s.url + '/rest/v1/educstat_contas?select=papel,dist,nome&user_id=eq.' + j.user.id, { headers: { apikey: s.chave, Authorization: 'Bearer ' + j.access_token } });
      const conta = rc.ok ? (await rc.json())[0] || null : null; const c = readCfg(); c.contaInfo = conta; writeCfg(c);
      return { ok: true, email: j.user.email, conta, aviso: conta ? null : (rc.ok ? 'A conta entrou, mas ainda não tem nível atribuído na tabela educstat_contas (a DPE tem de a registar).' : 'A tabela educstat_contas não existe: execute o SQL de configuração no Supabase.') };
    }
    if (op === 'sair') { const c = readCfg(); delete c.contaRefresh; delete c.contaEmail; delete c.contaInfo; writeCfg(c); delete SESSAO.acesso; return { ok: true }; }
    const H = { apikey: s.chave, Authorization: 'Bearer ' + (await acesso()), 'Content-Type': 'application/json' };
    const k = chaveOrg(); if (!k && op !== 'teste') return { ok: false, erro: 'Falta a chave de cifra da organização (Administração > Sincronização).' };
    const cif = (o) => selarCom(o, k).toString('base64'); const dec = (b) => abrirSeloCom(Buffer.from(b, 'base64'), k);
    const falha = async (r) => { const t = (await r.text()).slice(0, 300); return { ok: false, erro: r.status === 401 || r.status === 403 || /row-level security/i.test(t) ? 'O servidor recusou: esta conta não tem permissão para estes dados (' + r.status + ').' : /does not exist|42P01/.test(t) ? 'A tabela não existe no servidor: execute o SQL de configuração.' : 'Servidor respondeu ' + r.status + ': ' + t }; };
    if (op === 'push') {
      // o autor vai explícito: assim a DPE pode actualizar um registo criado por um distrito (e vice-versa) sem o servidor recusar o lote
      let uid = null; try { uid = JSON.parse(Buffer.from(H.Authorization.split(' ')[1].split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()).sub || null; } catch {}
      const linhas = arg.map((d) => ({ id: d.id, colecao: d.colecao, dist: d.dist ?? null, para: d.para ?? null, ano: d.ano ?? null, em: d.em, origem: d.origem || null, dados: cif(d.dados), ...(uid ? { autor: uid } : {}) }));
      for (let i = 0; i < linhas.length; i += 200) { const r = await net.fetch(base + '?on_conflict=id', { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(linhas.slice(i, i + 200)) }); if (!r.ok) return falha(r); }
      return { ok: true, n: linhas.length };
    }
    if (op === 'pull') {
      // arg: data a partir da qual receber, ou { ano } para receber um ano inteiro acabado de publicar pela DPE
      const anoF = arg && typeof arg === 'object' && arg.ano ? `&ano=eq.${+arg.ano}&colecao=in.(fichas,alfa)` : '';
      const out = []; const falhas = []; const desde = (arg && typeof arg === 'object' ? arg.desde : arg) || '1970-01-01T00:00:00Z';
      // páginas de 500 com cursor composto (data, id): registos com a mesma data nunca ficam por receber entre páginas
      let cur = null; const q = (v) => '"' + String(v).replace(/"/g, '') + '"';
      for (let page = 0; page < 400; page++) {
        const filtro = cur ? '&or=' + encodeURIComponent(`(em.gt.${q(cur.em)},and(em.eq.${q(cur.em)},id.gt.${q(cur.id)}))`) : '&em=gt.' + encodeURIComponent(desde);
        const r = await net.fetch(base + '?select=id,colecao,em,dados,autor&colecao=not.in.(presenca,presenca_tec)' + anoF + filtro + '&order=em.asc,id.asc&limit=500', { headers: H });
        if (!r.ok) return falha(r);
        const rows = await r.json(); if (!rows.length) break;
        for (const x of rows) { try { out.push({ id: x.id, colecao: x.colecao, em: x.em, autor: x.autor, dados: dec(x.dados) }); } catch { falhas.push({ id: x.id, colecao: x.colecao, em: x.em }); } }
        cur = { em: rows[rows.length - 1].em, id: rows[rows.length - 1].id }; if (rows.length < 500) break;
      }
      // registos que não se conseguiram decifrar (outra chave ou dados estragados): contam-se e devolvem-se, nunca desaparecem em silêncio
      return { ok: true, docs: out, falhasCifra: falhas };
    }
    if (op === 'ping') {
      // presença pública (nome, unidade, hora) separada dos dados técnicos (computador, IP local, versão), que só a DPE e o próprio distrito lêem
      const em = new Date().toISOString(); const tec = arg.tec ? [{ id: arg.id.replace(/^presenca\//, 'presenca_tec/'), colecao: 'presenca_tec', dist: arg.dist ?? null, ano: null, em, origem: arg.origem || null, dados: cif(arg.tec) }] : [];
      const r = await net.fetch(base + '?on_conflict=id', { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ id: arg.id, colecao: 'presenca', dist: arg.dist ?? null, ano: null, em, origem: arg.origem || null, dados: cif(arg.dados) }, ...tec]) }); return r.ok ? { ok: true } : falha(r); }
    if (op === 'quem') {
      const desde = new Date(Date.now() - (arg || 180) * 1000).toISOString();
      const r = await net.fetch(base + '?select=id,em,dados,colecao&colecao=in.(presenca,presenca_tec)&em=gt.' + encodeURIComponent(desde) + '&limit=1000', { headers: H }); if (!r.ok) return falha(r);
      const out = []; const tec = new Map(); for (const x of await r.json()) { try { if (x.colecao === 'presenca_tec') tec.set(x.id.replace(/^presenca_tec\//, 'presenca/'), dec(x.dados)); else out.push({ id: x.id, em: x.em, dados: dec(x.dados) }); } catch {} }
      for (const o of out) if (tec.has(o.id)) o.dados = { ...o.dados, ...tec.get(o.id) };
      // endereço IP de cada computador (o servidor regista-o; só a conta da DPE o consegue ler)
      try { const ri = await net.fetch(s.url + '/rest/v1/educstat_ips?select=id,ip&em=gt.' + encodeURIComponent(desde), { headers: H }); if (ri.ok) { const m = new Map((await ri.json()).map((x) => [x.id, x.ip])); for (const o of out) if (m.has(o.id)) o.ip = m.get(o.id); } } catch {}
      return { ok: true, docs: out };
    }
    if (op === 'teste') { const r = await net.fetch(base + '?select=id&limit=1', { headers: H }); return r.ok ? { ok: true } : falha(r); }
    if (op === 'publicar') {
      const u = s.url + '/rest/v1/educstat_publicados';
      const r = arg.retirar ? await net.fetch(u + '?ano=eq.' + (+arg.ano), { method: 'DELETE', headers: H }) : await net.fetch(u + '?on_conflict=ano', { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ ano: +arg.ano }]) });
      return r.ok ? { ok: true } : falha(r);
    }
    if (op === 'contas') { const r = await net.fetch(s.url + '/rest/v1/educstat_contas?select=user_id,papel,dist,nome', { headers: H }); return r.ok ? { ok: true, contas: await r.json() } : falha(r); }
    return { ok: false, erro: 'operação desconhecida' };
  } catch (e) { return { ok: false, erro: e.code === 'sessao' ? e.message : 'Sem ligação ao servidor (' + (e.message || e) + ').', sessao: e.code === 'sessao' }; }
});

// ---------------- publicações (brochura e carta escolar) em PDF e Word ----------------
// ---------------- publicações: PDF e Word ----------------
// Capa numa secção própria: sem cabeçalho, sem rodapé e sem número (conta como página 1).
// Restantes páginas: só rodapé, com um fio por cima, o emblema, o nome da publicação e “Página X de Y”.
const emblemaB64 = () => { try { return fs.readFileSync(path.join(APP_DIR, 'img', 'emblema.png')).toString('base64'); } catch { return ''; } };
const escH = (t) => String(t ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
// números de página nos índices do PDF: 1.ª impressão com marcas invisíveis, leitura da página de cada marca (pdf.js) e 2.ª impressão com os números
let _PDFJS = null;
async function paginasDasMarcas(pdf) {
  if (!_PDFJS) { _PDFJS = await import(pathToFileURL(path.join(__dirname, 'lib', 'pdfjs.min.mjs')).href); _PDFJS.GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(__dirname, 'lib', 'pdfjs.worker.min.mjs')).href; }
  const doc = await _PDFJS.getDocument({ data: new Uint8Array(pdf), isEvalSupported: false, disableFontFace: true }).promise; const pg = {};
  for (let i = 1; i <= doc.numPages; i++) { const tc = await (await doc.getPage(i)).getTextContent(); const t = tc.items.map((x) => x.str).join('').replace(/\s+/g, ''); for (const m of t.matchAll(/QQPG([A-Z]+\d+?)QQ/g)) if (!pg[m[1]]) pg[m[1]] = i; }
  return pg;
}
async function htmlComPaginas(html, rodape, desvio = 0) {
  if (!/data-pg="/.test(html)) return html.replace(/<span class="mk">QQPG[A-Z]+\d+QQ<\/span>/g, '');
  try { const pg = await paginasDasMarcas(await htmlParaPdf(html, true, rodape)); return html.replace(/<span class="pg" data-pg="([A-Za-z0-9]+)"><\/span>/g, (_, id) => `<span class="pg">${pg[id] ? pg[id] + desvio : ''}</span>`).replace(/<span class="mk">QQPG[A-Z]+\d+QQ<\/span>/g, ''); } catch (e) { console.warn('números de página', e); return html; }
}
function sanitizarMarkup(html) {
  let s = String(html || '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<iframe[\s\S]*?<\/iframe>/gi, '').replace(/<object[\s\S]*?<\/object>/gi, '');
  s = s.replace(/\s+on[a-z]+\s*=\s*(['"]).*?\1/gi, '').replace(/\s+(?:href|src)\s*=\s*(['"])(?!data:image\/(?:png|jpeg|gif|svg\+xml);|app:|#).*?\1/gi, '');
  s = s.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  return s;
}
async function htmlParaPdf(html, comRodape, rodape, cor, semMargem, paisagem) {
  html = sanitizarMarkup(html);
  const tmp = path.join(app.getPath('temp'), `educstat_rel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.html`);
  fs.writeFileSync(tmp, html, 'utf8');
  const w = new BrowserWindow({ show: false, width: paisagem ? 1200 : 900, height: paisagem ? 900 : 1200, webPreferences: { sandbox: true, javascript: false } });
  try {
    await w.loadFile(tmp);
    const e = emblemaB64();
    return await w.webContents.printToPDF({ pageSize: 'A4', landscape: !!paisagem, printBackground: true, margins: semMargem ? { marginType: 'none' } : { marginType: 'custom', top: 0.55, bottom: comRodape ? 0.75 : 0.55, left: 0.6, right: 0.6 }, displayHeaderFooter: comRodape,
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;margin:0 15mm;padding-top:3px;border-top:0.8px solid ${/^#[0-9A-Fa-f]{6}$/.test(cor || '') ? cor : '#0A6B45'};display:flex;align-items:center;gap:6px;font-family:Arial;font-size:7.5px;color:#4A5A52">${e ? `<img src="data:image/png;base64,${e}" style="height:13px">` : ''}<span style="flex:1">${escH(rodape)}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>` });
  } finally { w.destroy(); try { fs.unlinkSync(tmp); } catch {} }
}
ipcMain.handle('rel:pdf', async (_e, html, nome, opts = {}) => {
  exigirSessao(); if (visitante() && !opts.preview) return { status: 'declined', erro: 'visitante' };
  const r = await dialog.showSaveDialog(win, { title: 'Guardar em PDF', defaultPath: path.join(app.getPath('documents'), nome), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
  if (r.canceled || !r.filePath) return { status: 'declined' };
  // folheto (tríptico): A4 horizontal, sem margens nem rodapé, sem capa/contracapa (desenha os seus próprios painéis)
  if (opts.paisagem) {
    try { fs.writeFileSync(r.filePath, await htmlParaPdf(html, false, '', opts.cor, true, true)); return { status: 'saved', caminho: r.filePath }; } catch (e) { return { status: 'erro', erro: String(e.message || e) }; }
  }
  const htmlN = await htmlComPaginas(html, opts.rodape || '');
  let pdf = await htmlParaPdf(htmlN, true, opts.rodape || '', opts.cor);
  // a capa é impressa à parte, sem rodapé, e substitui a primeira página (a numeração das outras mantém-se: 2, 3, … de N)
  if (opts.capa) {
    try {
      const { PDFDocument } = require('./lib/pdf-lib.cjs');
      const capa = await htmlParaPdf(opts.capa, false, '');
      const doc = await PDFDocument.load(pdf); const dc = await PDFDocument.load(capa);
      const [pg] = await doc.copyPages(dc, [0]); doc.removePage(0); doc.insertPage(0, pg);
      doc.setTitle(opts.titulo || nome); doc.setAuthor('Alberto Adélia Manhice'); doc.setSubject(opts.assunto || ''); doc.setKeywords(String(opts.palavras || 'educação; estatística; Tete').split(/;\s*/)); doc.setCreator('EducStat Tete ' + app.getVersion()); doc.setProducer('EducStat Tete');
      pdf = Buffer.from(await doc.save());
    } catch (e) { console.warn('capa pdf', e); }
  }
  // contracapa (última página, a toda a página, sem rodapé)
  if (opts.contracapa) {
    try { const { PDFDocument } = require('./lib/pdf-lib.cjs'); const cc = await htmlParaPdf(opts.contracapa, false, '', null, true); const doc = await PDFDocument.load(pdf); const dc = await PDFDocument.load(cc); const [pg] = await doc.copyPages(dc, [0]); doc.addPage(pg); pdf = Buffer.from(await doc.save()); } catch (e) { console.warn('contracapa pdf', e); }
  }
  fs.writeFileSync(r.filePath, pdf);
  return { status: 'saved', caminho: r.filePath };
});
// legendas (SEQ): o docx deixa o campo sem número até o Word actualizar; escreve-se já o número certo (1, 2, 3… por rótulo)
async function numerarSeq(buf, cor) {
  try { const { JSZip } = require('./lib/geo.cjs'); const z = await JSZip.loadAsync(buf); const f = z.file('word/document.xml'); if (!f) return buf; const cont = {};
    const x = (await f.async('string')).replace(/(<w:instrText[^>]*>\s*SEQ ([A-Za-zÀ-ÿ]+)[^<]*<\/w:instrText>(?:<\/w:r><w:r>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?)?<w:fldChar w:fldCharType="separate"\/>)(<\/w:r><w:r>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?)?(<w:fldChar w:fldCharType="end"\/>)/g, (_, a, lab, mid, e) => `${a}<w:t>${(cont[lab] = (cont[lab] || 0) + 1)}</w:t>${mid || ''}${e}`);
    let y = x; if (cor && /^[0-9A-Fa-f]{6}$/.test(cor)) y = y.replace(/<w:r>(<w:fldChar w:fldCharType="begin"[^>]*\/><w:instrText[^>]*>\s*SEQ )/g, `<w:r><w:rPr><w:b/><w:color w:val="${cor}"/></w:rPr>$1`);
    z.file('word/document.xml', y); return await z.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }); } catch { return buf; }
}
ipcMain.handle('rel:docx', async (_e, doc, nome) => {
  exigirSessao(); if (visitante()) return { status: 'declined', erro: 'visitante' };
  const r = await dialog.showSaveDialog(win, { title: 'Guardar em Word', defaultPath: path.join(app.getPath('documents'), nome), filters: [{ name: 'Documento Word', extensions: ['docx'] }] });
  if (r.canceled || !r.filePath) return { status: 'declined' };
  const D = require('./lib/docx.cjs');
  // tema de cores do relatório (escolhido no ecrã dos Relatórios): títulos, acento, texto e cabeçalhos das tabelas
  const hx = (v, d) => (/^#?[0-9A-Fa-f]{6}$/.test(String(v || '')) ? String(v).replace('#', '').toUpperCase() : d);
  const BR = hx(doc.tema?.br, '0A6B45'), AC = hx(doc.tema?.ac, 'B07C00'), TX = hx(doc.tema?.txt, '13221B'), H2C = hx(doc.tema?.h2, AC), LN = 'D5DED8', MU = '4A5A52', FONT = doc.tema?.fonte === 'serif' ? 'Cambria' : 'Arial';
  const LARG = 9706; // largura útil da página em twips (A4 menos margens): tabelas e gráficos ocupam-na toda
  const LARG_PX = Math.round((LARG / 1440) * 96);
  const run = (t, o = {}) => new D.TextRun({ text: String(t ?? ''), font: FONT, size: o.size || 21, bold: o.bold, italics: o.italics, color: o.color || TX, allCaps: o.caps });
  const para = (t, o = {}) => new D.Paragraph({ children: Array.isArray(t) ? t : [run(t, o)], alignment: o.align, spacing: { after: o.after ?? 100, before: o.before ?? 0, line: o.line ?? 276 }, heading: o.heading, pageBreakBefore: o.quebra, keepNext: o.keepNext, keepLines: o.keepLines, border: o.border });
  const borda = { style: D.BorderStyle.SINGLE, size: 4, color: LN };
  const bordas = { top: borda, bottom: borda, left: borda, right: borda };
  const sem = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const semBordas = { top: sem, bottom: sem, left: sem, right: sem };
  const filhos = []; const graficos = [];
  let emblema = null; try { emblema = fs.readFileSync(path.join(APP_DIR, 'img', 'emblema.png')); } catch {}
  const img = (w, hh) => new D.ImageRun({ type: 'png', data: emblema, transformation: { width: w, height: hh } });
  // ---- capa (secção 1) ----
  const capa = [];
  if (emblema) capa.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 200, after: 160, line: 240, lineRule: D.LineRuleType.AUTO }, children: [img(100, 101)] }));
  capa.push(para('REPÚBLICA DE MOÇAMBIQUE', { bold: true, align: D.AlignmentType.CENTER, size: 26, after: 60 }));
  for (const l of doc.entidade || []) capa.push(para(String(l).toUpperCase(), { bold: true, align: D.AlignmentType.CENTER, size: 23, after: 40 }));
  capa.push(para('', { after: 0, border: { bottom: { style: D.BorderStyle.SINGLE, size: 12, color: BR, space: 1 } } }));
  const arte = doc.capaArte || {};
  capa.push(para(doc.titulo, { bold: true, size: 46, color: BR, align: D.AlignmentType.CENTER, before: arte.mapa ? 700 : 2000, after: 240, line: 300 }));
  if (doc.subtitulo) capa.push(para(doc.subtitulo, { size: 26, align: D.AlignmentType.CENTER, color: MU, after: 200 }));
  // silhueta do distrito/província com as escolas (carta) por cima do ano, e a faixa colorida no fundo da página
  if (arte.mapa?.png) { const w = 500, hh = Math.round((arte.mapa.h * w) / arte.mapa.w); capa.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 120, after: 0, line: 240, lineRule: D.LineRuleType.AUTO }, children: [new D.ImageRun({ type: 'png', data: Buffer.from(arte.mapa.png, 'base64'), transformation: { width: w, height: hh }, altText: { name: 'Mapa', description: 'Silhueta do território', title: 'Mapa' } })] })); }
  if (doc.anoTxt) capa.push(para(doc.anoTxt, { size: 32, bold: true, align: D.AlignmentType.CENTER, color: AC, before: arte.mapa ? 160 : 400 }));
  if (arte.faixa?.png) capa.push(new D.Paragraph({ spacing: { before: 0, after: 0, line: 240, lineRule: D.LineRuleType.AUTO }, children: [new D.ImageRun({ type: 'png', data: Buffer.from(arte.faixa.png, 'base64'), transformation: { width: 794, height: Math.round((arte.faixa.h * 794) / arte.faixa.w) }, altText: { name: 'Faixa', description: 'Faixa decorativa', title: 'Faixa' },
    floating: { horizontalPosition: { relative: D.HorizontalPositionRelativeFrom.PAGE, align: D.HorizontalPositionAlign.LEFT }, verticalPosition: { relative: D.VerticalPositionRelativeFrom.PAGE, align: D.VerticalPositionAlign.BOTTOM }, behindDocument: true, allowOverlap: true } })] }));
  // local e data dentro da capa, encostados à margem de baixo (moldura alinhada ao fundo da margem)
  capa.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, frame: { type: 'alignment', width: LARG, height: 500, anchor: { horizontal: D.FrameAnchorType.MARGIN, vertical: D.FrameAnchorType.MARGIN }, alignment: { x: D.HorizontalPositionAlign.CENTER, y: D.VerticalPositionAlign.BOTTOM } }, children: [run(doc.dataLocal || '', { size: 24, bold: true })] }));
  // ---- página 2: ficha técnica e nota técnica ----
  const kv = (linhas) => new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, borders: { top: sem, bottom: sem, left: sem, right: sem, insideHorizontal: { style: D.BorderStyle.SINGLE, size: 2, color: 'E6ECE8' }, insideVertical: sem },
    rows: linhas.map(([k, v]) => new D.TableRow({ cantSplit: true, children: [
      new D.TableCell({ width: { size: 30, type: D.WidthType.PERCENTAGE }, borders: semBordas, margins: { top: 50, bottom: 50, left: 0, right: 100 }, children: [new D.Paragraph({ children: [run(k, { size: 18, bold: true, color: BR })] })] }),
      new D.TableCell({ width: { size: 70, type: D.WidthType.PERCENTAGE }, borders: semBordas, margins: { top: 50, bottom: 50, left: 100, right: 0 }, children: String(v ?? '').split('\n').map((x) => new D.Paragraph({ children: [run(x, { size: 18 })] })) })] })) });
  const tituloSec = (t) => para(t, { bold: true, size: 26, color: BR, after: 120, before: 120, keepNext: true, border: { bottom: { style: D.BorderStyle.SINGLE, size: 8, color: AC, space: 2 } } });
  if (doc.fichaTecnica?.length) { filhos.push(tituloSec('Ficha técnica'), kv(doc.fichaTecnica)); }
  if (doc.notaTecnica?.length) { filhos.push(tituloSec('Nota técnica'), kv(doc.notaTecnica)); }
  if (doc.direitos) filhos.push(para(doc.direitos, { size: 16, italics: true, color: MU, before: 240 }));
  filhos.push(new D.Paragraph({ children: [new D.PageBreak()] }));
  filhos.push(para('Índice', { bold: true, size: 30, color: BR, after: 120 }));
  filhos.push(new D.TableOfContents('Índice', { hyperlink: true, headingStyleRange: '1-2' }));
  filhos.push(para('(Se o índice aparecer vazio: clique com o botão direito sobre ele e escolha “Actualizar campo”.)', { italics: true, size: 15, color: MU }));
  filhos.push(new D.Paragraph({ children: [new D.PageBreak()] }));
  // índice das ilustrações (lista de mapas) e índice de gráficos, como no modelo da carta escolar da DPE
  let algumaLista = false;
  for (const [tit, l, id] of [['Índice de Tabelas', doc.listaTabelas, 'Tabela'], ['Índice de Gráficos', doc.listaGraficos, 'Grafico'], ['Índice das Ilustrações (Lista de Mapas)', doc.listaMapas, 'Mapa'], ['Índice de Figuras', doc.listaFiguras, 'Figura']]) if (l?.length) {
    algumaLista = true; filhos.push(para(tit, { bold: true, size: 26, color: BR, after: 120, before: 160 }));
    filhos.push(new D.TableOfContents(tit, { hyperlink: true, captionLabelIncludingNumbers: id }));
  }
  if (algumaLista) filhos.push(para('(Os índices de tabelas, gráficos e mapas actualizam-se como o índice: botão direito > “Actualizar campo”, ou F9.)', { italics: true, size: 15, color: MU }));
  // siglas e abreviaturas
  if (doc.siglas?.length) { filhos.push(new D.Paragraph({ children: [new D.PageBreak()] })); filhos.push(para('Siglas e Abreviaturas', { bold: true, size: 30, color: BR, after: 160 }));
    filhos.push(new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, borders: { top: sem, bottom: sem, left: sem, right: sem, insideHorizontal: { style: D.BorderStyle.SINGLE, size: 2, color: 'E6ECE8' }, insideVertical: sem },
      rows: doc.siglas.map(([k, v]) => new D.TableRow({ cantSplit: true, children: [new D.TableCell({ width: { size: 18, type: D.WidthType.PERCENTAGE }, borders: semBordas, margins: { top: 40, bottom: 40, left: 0, right: 100 }, children: [new D.Paragraph({ children: [run(k, { size: 19, bold: true, color: BR })] })] }), new D.TableCell({ width: { size: 82, type: D.WidthType.PERCENTAGE }, borders: semBordas, margins: { top: 40, bottom: 40, left: 100, right: 0 }, children: [new D.Paragraph({ children: [run(v, { size: 19 })] })] })] })) })); }
  if (algumaLista || doc.siglas?.length) filhos.push(new D.Paragraph({ children: [new D.PageBreak()] }));
  // ---- corpo ----
  const SEQ_ID = { Tabela: 'Tabela', 'Gráfico': 'Grafico', Mapa: 'Mapa', Figura: 'Figura' };
  const legenda = (t) => { const m = String(t).match(/^(Tabela|Gráfico|Mapa|Figura) \d+:\s*(.*)$/); if (!m) return para(t, { bold: true, size: 18, color: BR, keepNext: true, keepLines: true, before: 140, after: 60 });
    return new D.Paragraph({ keepNext: true, keepLines: true, spacing: { before: 140, after: 60 }, children: [run(m[1] + ' ', { bold: true, size: 18, color: BR }), new D.SequentialIdentifier(SEQ_ID[m[1]]), run(': ' + m[2], { bold: true, size: 18, color: BR })] }); };
  const fonte = (t) => para('Fonte: ' + t, { italics: true, size: 15, color: MU, after: 160, before: 40 });
  for (const b of doc.blocos) {
    if (b.t === 'h1') filhos.push(para(b.texto, { heading: D.HeadingLevel.HEADING_1, keepNext: true, keepLines: true }));
    else if (b.t === 'h2') filhos.push(para(b.texto, { heading: D.HeadingLevel.HEADING_2, keepNext: true, keepLines: true }));
    else if (b.t === 'p' && b.termo) filhos.push(new D.Paragraph({ alignment: D.AlignmentType.JUSTIFIED, spacing: { after: 100 }, indent: { left: 160 }, border: { left: { style: D.BorderStyle.SINGLE, size: 12, color: AC, space: 6 } }, children: [run(b.termo + ':', { bold: true, color: BR }), run(' ' + b.texto)] }));
    else if (b.t === 'p') filhos.push(para(b.texto, { align: D.AlignmentType.JUSTIFIED }));
    else if (b.t === 'quebra') filhos.push(new D.Paragraph({ children: [new D.PageBreak()] }));
    else if (b.t === 'grafico') {
      // gráfico nativo do Word, à largura da página: marcador agora, substituído depois pelo gráfico com os dados editáveis
      filhos.push(legenda(b.titulo));
      const alt = b.dados.horiz ? Math.min(560, Math.max(170, b.dados.cats.length * 22 + 50)) : Math.round(LARG_PX * 0.42);
      graficos.push({ ...b.dados, w: LARG_PX, h: alt });
      filhos.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, keepNext: !!b.fonte, spacing: { after: 0 }, children: [run(`§GRAF_${graficos.length}§`)] }));
      if (b.fonte) filhos.push(fonte(b.fonte));
    } else if (b.t === 'tabela') {
      filhos.push(legenda(b.titulo));
      const ncol = b.cab.length; const pequeno = ncol > 9 ? 14 : ncol > 6 ? 16 : 17;
      const cel = (t, o = {}) => new D.TableCell({ children: [new D.Paragraph({ keepNext: o.keepNext, children: [run(t, { size: pequeno, bold: o.bold, color: o.color })], alignment: o.align || D.AlignmentType.LEFT })], shading: o.fill ? { type: D.ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined, borders: bordas, margins: { top: 30, bottom: 30, left: 60, right: 60 }, verticalAlign: D.VerticalAlign.CENTER, columnSpan: o.span });
      const curta = b.linhas.length <= 14; // tabelas curtas não se partem entre páginas
      const linhas = [new D.TableRow({ tableHeader: true, cantSplit: true, children: b.cab.map((c, i) => cel(c, { bold: true, color: 'FFFFFF', fill: BR, align: i ? D.AlignmentType.CENTER : D.AlignmentType.LEFT, keepNext: true })) })];
      b.linhas.forEach((l, j) => {
        const kn = curta && j < b.linhas.length - 1;
        if (l.sec) { linhas.push(new D.TableRow({ cantSplit: true, children: [cel(l.sec, { bold: true, color: BR, fill: 'E7F1EA', span: ncol, keepNext: true })] })); return; }
        const tot = /^(Total|Província|Média)/.test(String(l[0]));
        linhas.push(new D.TableRow({ cantSplit: true, children: l.map((c, i) => cel(c, { bold: tot, fill: tot ? 'E7F1EA' : j % 2 ? 'F4F7F5' : undefined, align: i ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT, keepNext: kn })) }));
      });
      filhos.push(new D.Table({ rows: linhas, width: { size: 100, type: D.WidthType.PERCENTAGE }, layout: D.TableLayoutType.AUTOFIT }));
      if (b.fonte) filhos.push(fonte(b.fonte)); else filhos.push(para('', { after: 120 }));
    } else if (b.t === 'img') {
      filhos.push(legenda(b.titulo));
      const w = LARG_PX, hh = Math.round((b.h * w) / b.w);
      filhos.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, keepNext: !!b.fonte, spacing: { after: 0 }, children: [new D.ImageRun({ type: 'png', data: Buffer.from(b.png, 'base64'), transformation: { width: w, height: hh } })] }));
      if (b.fonte) filhos.push(fonte(b.fonte));
    }
  }
  const rodape = new D.Footer({ children: [new D.Paragraph({ border: { top: { style: D.BorderStyle.SINGLE, size: 6, color: BR, space: 4 } }, tabStops: [{ type: D.TabStopType.RIGHT, position: LARG }],
    children: [...(emblema ? [img(15, 15), run('  ')] : []), run(doc.rodape || doc.titulo, { size: 15, color: MU }), new D.TextRun({ font: FONT, size: 15, color: MU, children: [new D.Tab(), 'Página ', D.PageNumber.CURRENT, ' de ', D.PageNumber.TOTAL_PAGES] })] })] });
  const vazio = () => new D.Header({ children: [new D.Paragraph({ children: [] })] });
  const margem = { top: 1000, bottom: 1000, left: 1100, right: 1100, footer: 500 };
  const pagina = doc.folheto ? { orientation: D.PageOrientation.LANDSCAPE, size: { width: 16838, height: 11906 }, margin: margem } : { margin: margem };
  const d = new D.Document({
    creator: 'Alberto Adélia Manhice', lastModifiedBy: 'Alberto Adélia Manhice', title: doc.titulo, subject: doc.assunto || doc.subtitulo || '', keywords: doc.palavras || 'educação; estatística; Tete', description: doc.descricao || doc.subtitulo || '',
    styles: { default: { document: { run: { font: FONT, size: 21 }, paragraph: { spacing: { line: 276 } } } }, paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 28, bold: true, color: BR }, paragraph: { spacing: { before: 280, after: 100 }, keepNext: true, border: { bottom: { style: D.BorderStyle.SINGLE, size: 8, color: AC, space: 2 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 23, bold: true, color: H2C }, paragraph: { spacing: { before: 200, after: 80 }, keepNext: true } }] },
    features: { updateFields: true },
    sections: [
      { properties: { page: pagina }, headers: { default: vazio() },
        footers: { default: new D.Footer({ children: [new D.Paragraph({ children: [] })] }) }, children: capa },
      { properties: { type: D.SectionType.NEXT_PAGE, page: pagina, column: doc.folheto ? { count: 3, space: 360 } : undefined }, headers: { default: vazio() }, footers: { default: rodape }, children: filhos },
      // contracapa: página inteira na cor do tema, com o emblema, a instituição e a sua localização
      ...(doc.contracapa ? [{ properties: { type: D.SectionType.NEXT_PAGE, page: { margin: { top: 0, bottom: 0, left: 0, right: 0, header: 0, footer: 0 } } }, headers: { default: vazio() }, footers: { default: new D.Footer({ children: [new D.Paragraph({ children: [] })] }) },
        children: [new D.Table({ width: { size: 11906, type: D.WidthType.DXA }, columnWidths: [11906], borders: { top: sem, bottom: sem, left: sem, right: sem, insideHorizontal: sem, insideVertical: sem }, rows: [new D.TableRow({ height: { value: 16700, rule: D.HeightRule.EXACT }, children: [new D.TableCell({ width: { size: 11906, type: D.WidthType.DXA }, borders: semBordas, shading: { type: D.ShadingType.CLEAR, fill: BR, color: 'auto' }, verticalAlign: D.VerticalAlign.BOTTOM, margins: { top: 0, bottom: 1400, left: 900, right: 900 },
          children: [...(emblema ? [new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 200 }, children: [img(78, 79)] })] : []), ...[doc.contracapa.republica || 'REPÚBLICA DE MOÇAMBIQUE', ...(doc.contracapa.linhas || [])].map((t, i) => new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 60 }, children: [run(t, { size: i ? 19 : 22, bold: i < 2, color: 'FFFFFF' })] }))] })] })] })] }] : [])],
  });
  const { inserirGraficos } = require('./docxgraficos');
  let outDocx = await numerarSeq(await inserirGraficos(await D.Packer.toBuffer(d), graficos), BR);
  outDocx = await corrigirIndiceDocx(outDocx);
  fs.writeFileSync(r.filePath, outDocx);
  return { status: 'saved', caminho: r.filePath };
});
async function corrigirIndiceDocx(buf) {
  try { const { JSZip } = require('./lib/geo.cjs'); const z = await JSZip.loadAsync(buf); const f = z.file('word/styles.xml'); if (!f) return buf; let x = await f.async('string');
    x = x.replace(/(<w:style[^>]+w:styleId="TOC[12]"[\s\S]*?<\/w:style>)/g, (m) => m.includes('<w:rPr>') ? m.replace('<w:rPr>', '<w:rPr><w:b w:val="0"/>') : m.replace(/(<\/w:name>)/, '$1<w:rPr><w:b w:val="0"/></w:rPr>'));
    z.file('word/styles.xml', x); return await z.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  } catch { return buf; }
}

ipcMain.handle('xlsx:graficos', async (_e, buf, graficos) => {
  const { inserirGraficosXlsx } = require('./xlsxgraficos');
  const out = await inserirGraficosXlsx(Buffer.from(buf), graficos);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
});

// ---------------- menu interno (Ficheiro, Ver, Ajuda) ----------------
ipcMain.handle('janela:accao', (_e, a) => {
  const wc = win.webContents;
  if (a === 'pasta') { fs.mkdirSync(dataDir(), { recursive: true }); shell.openPath(dataDir()); }
  else if (a === 'zoomMais') wc.setZoomLevel(Math.min(4, wc.getZoomLevel() + 0.5));
  else if (a === 'zoomMenos') wc.setZoomLevel(Math.max(-3, wc.getZoomLevel() - 0.5));
  else if (a === 'zoomNormal') wc.setZoomLevel(0);
  else if (a === 'ecra') win.setFullScreen(!win.isFullScreen());
  else if (a === 'sair') app.quit();
  return true;
});

// ---------------- limites geográficos: importação directa de shapefiles (.shp/.dbf/.prj ou .zip) ----------------
function simplificar(pts, tol) {
  if (pts.length <= 4) return pts;
  const d2 = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const t = dx || dy ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy))) : 0; const x = a[0] + t * dx - p[0], y = a[1] + t * dy - p[1]; return x * x + y * y; };
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]]; const t2 = tol * tol;
  while (st.length) { const [i, j] = st.pop(); let m = -1, md = 0; for (let k = i + 1; k < j; k++) { const v = d2(pts[k], pts[i], pts[j]); if (v > md) { md = v; m = k; } } if (md > t2) { keep[m] = 1; st.push([i, m], [m, j]); } }
  const out = pts.filter((_, i) => keep[i]); return out.length >= 4 ? out : pts.slice(0, 4);
}
ipcMain.handle('geo:shp', async () => {
  exigirAdmin(true);
  const r = await escolherFicheiros({ title: 'Escolher o shapefile (.shp ou .zip)', properties: ['openFile'], filters: [{ name: 'Shapefile', extensions: ['shp', 'zip'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  try {
    const { shapefile, proj4, JSZip } = require('./lib/geo.cjs');
    const f = r.filePaths[0];
    // cada .shp (com o seu .dbf, .prj e .cpg) é uma camada; um ZIP pode ter várias (distritos, postos, localidades)
    const fontes = [];
    if (/\.zip$/i.test(f)) {
      if (fs.statSync(f).size > 300 * 1048576) return { erro: 'O ZIP tem mais de 300 MB.' };
      const z = await JSZip.loadAsync(fs.readFileSync(f)); const nomes = Object.keys(z.files);
      const bases = nomes.filter((n) => /\.shp$/i.test(n) && !/__MACOSX/.test(n)); if (!bases.length) return { erro: 'O ZIP não tem nenhum ficheiro .shp.' };
      for (const base of bases) { const b = base.replace(/\.shp$/i, ''); const get = async (ext) => { const n = nomes.find((x) => x.toLowerCase() === (b + ext).toLowerCase()); return n ? z.file(n).async('nodebuffer') : null; };
        fontes.push({ nome: path.basename(base), shp: await get('.shp'), dbf: await get('.dbf'), prj: (await get('.prj'))?.toString() || '', cpg: (await get('.cpg'))?.toString() || '' }); }
    } else {
      const b = f.replace(/\.shp$/i, ''); const ler = (ext) => { for (const e of [ext, ext.toUpperCase()]) { try { return fs.readFileSync(b + e); } catch {} } return null; };
      fontes.push({ nome: path.basename(f), shp: ler('.shp'), dbf: ler('.dbf'), prj: ler('.prj')?.toString() || '', cpg: ler('.cpg')?.toString() || '' });
    }
    const camadas = [];
    for (const { nome, shp, dbf, prj, cpg } of fontes) {
      if (!dbf) { if (fontes.length === 1) return { erro: 'Falta o ficheiro .dbf (os atributos: nomes e códigos) junto do .shp.' }; continue; }
      const geo = await shapefile.read(shp, dbf, { encoding: /utf-?8/i.test(cpg) ? 'utf-8' : (cpg.trim() || 'windows-1252') });
      // nomes lidos com a codificação errada (UTF-8 lido como Windows-1252: “MarÃ¡via”): corrigem-se
      const moji = /Ã[\u0080-\u00BF]|Ã[¡-¿]/; for (const ft of geo.features) for (const [k, v] of Object.entries(ft.properties || {})) if (typeof v === 'string' && moji.test(v)) { try { const t = Buffer.from(v, 'latin1').toString('utf8'); if (!t.includes('\uFFFD')) ft.properties[k] = t; } catch {} }
      // projecção: se o .prj não for geográfico (graus), converte para WGS84
      // sem .prj mas com coordenadas em metros (UTM): assume-se UTM 36S (WGS 84), a zona de Tete
      const amostra = (() => { for (const ft of geo.features) { const g = ft.geometry; if (!g) continue; let c = g.coordinates; while (Array.isArray(c[0])) c = c[0]; return c; } return null; })();
      const emMetros = amostra && (Math.abs(amostra[0]) > 360 || Math.abs(amostra[1]) > 90);
      let geografico = (!prj || /^GEOGCS/i.test(prj.trim())) && !emMetros; let crsNome = '';
      let conv = (p) => p;
      if (!geografico) { try { const t = proj4(prj && !/^GEOGCS/i.test(prj.trim()) ? prj : '+proj=utm +zone=36 +south +datum=WGS84 +units=m +no_defs', 'EPSG:4326'); conv = (p) => t.forward(p); if (!prj || /^GEOGCS/i.test(prj.trim())) crsNome = 'UTM 36S (assumido: sem .prj)'; }
        catch { const t = proj4('+proj=utm +zone=36 +south +datum=WGS84 +units=m +no_defs', 'EPSG:4326'); conv = (p) => t.forward(p); crsNome = 'UTM 36S (assumido: .prj não reconhecido)'; } }
      let n = 0;
      const tratar = (anel) => simplificar(anel.map((p) => { const q = conv(p); return [Math.round(q[0] * 1e5) / 1e5, Math.round(q[1] * 1e5) / 1e5]; }), 0.0015);
      for (const ft of geo.features) {
        const g = ft.geometry; if (!g) continue; n++;
        if (g.type === 'Polygon') g.coordinates = g.coordinates.map(tratar);
        else if (g.type === 'MultiPolygon') g.coordinates = g.coordinates.map((pl) => pl.map(tratar));
        else if (g.type === 'Point') g.coordinates = conv(g.coordinates);
      }
      const campos = geo.features[0] ? Object.keys(geo.features[0].properties || {}) : [];
      const t = (nome + ' ' + campos.join(' ')).toLowerCase();
      const nivel = /local|adm4|name_4/.test(t) && !/adm3|posto/.test(nome.toLowerCase()) ? 'localidades' : /posto|adm3|name_3/.test(t) ? 'postos' : 'distritos';
      // amostra de valores de cada campo (para escolher o campo com o nome)
      const amostras = Object.fromEntries(campos.map((k) => [k, [...new Set(geo.features.slice(0, 400).map((f) => f.properties?.[k]).filter((v) => v != null && v !== ''))].slice(0, 5).map(String)]));
      camadas.push({ nome, n, campos, amostras, crs: crsNome || (geografico ? 'WGS84 (graus)' : (prj.match(/PROJCS\["([^"]+)"/) || [0, 'projectada'])[1]), geojson: geo, nivel });
    }
    if (!camadas.length) return { erro: 'Nenhuma camada com .shp e .dbf.' };
    const c0 = camadas[0];
    return { ficheiro: path.basename(f), n: c0.n, campos: c0.campos, crs: c0.crs, geojson: c0.geojson, camadas };
  } catch (e) { return { erro: String(e.message || e) }; }
});
