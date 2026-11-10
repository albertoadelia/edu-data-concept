// Antes de gerar o instalador: confirma que os dados de base estão presentes e íntegros (sem eles o programa não arranca).
// node scripts/verificar-dados.js            -> verifica (e compara com app/data/manifesto.json, se existir)
// node scripts/verificar-dados.js --manifesto -> escreve app/data/manifesto.json (nome, tamanho e SHA-256 de cada ficheiro)
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const D = path.join(__dirname, '..', 'app', 'data');
const obrig = ['codigos.json', 'escolas.json', 'resumo.json', 'centros.json', 'populacao.json'];
const falta = obrig.filter((f) => !fs.existsSync(path.join(D, f)));
const anos = fs.existsSync(D) ? fs.readdirSync(D).filter((x) => /^\d{4}$/.test(x)).sort() : [];
if (falta.length || anos.length < 20) { console.error('Dados de base em falta:', falta.join(', ') || '-', `| anos: ${anos.length} (são precisos pelo menos 20, de 2004 em diante)`); process.exit(1); }
for (const f of obrig) JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'));
const todos = []; (function andar(d, rel) { for (const x of fs.readdirSync(d).sort()) { const p = path.join(d, x), r = rel ? rel + '/' + x : x; if (fs.statSync(p).isDirectory()) andar(p, r); else if (x !== 'manifesto.json') todos.push(r); } })(D, '');
const lista = todos.map((r) => { const b = fs.readFileSync(path.join(D, r)); return { f: r, tam: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex') }; });
const MF = path.join(D, 'manifesto.json');
if (process.argv.includes('--manifesto')) { fs.writeFileSync(MF, JSON.stringify({ criado: new Date().toISOString(), ficheiros: lista }, null, 1)); console.log(`Manifesto escrito: ${lista.length} ficheiros.`); process.exit(0); }
if (fs.existsSync(MF)) { const m = JSON.parse(fs.readFileSync(MF, 'utf8')); const mp = new Map(m.ficheiros.map((x) => [x.f, x.sha256])); const dif = lista.filter((x) => mp.get(x.f) !== x.sha256).map((x) => x.f); const sem = [...mp.keys()].filter((f) => !todos.includes(f));
  if (dif.length || sem.length) { console.error(`Os dados não coincidem com o manifesto: ${dif.length} alterados/novos, ${sem.length} em falta (ex.: ${[...dif, ...sem].slice(0, 5).join(', ')}). Se a alteração for intencional, corra: npm run manifesto`); process.exit(1); } }
console.log(`Dados de base OK: ${obrig.length} ficheiros principais, ${anos.length} anos (${anos[0]}–${anos[anos.length - 1]}), ${lista.length} ficheiros no total.`);
