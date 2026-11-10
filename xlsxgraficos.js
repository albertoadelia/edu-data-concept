// Gráficos nativos do Excel dentro de um .xlsx já gerado (xlsx-js-style não os cria).
// Cada gráfico aponta para intervalos de células da própria folha: quando se mudam os números, o gráfico muda sozinho.
const { JSZip } = require('./lib/geo.cjs');
const esc = (t) => String(t ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const corHex = (c, i) => String(c || ['0A6B45', 'C98E00', '2E6F8E', 'C0172F', '6B4FA0', '1F2328', '1B8A3A', 'D2691E'][i % 8]).replace('#', '').toUpperCase();

// g = { tipo: 'linha'|'barras'|'barrasH'|'circular', titulo, fmt, cats: {ref, vals}, series: [{nome, nomeRef?, ref, vals, cor}], de: [col, lin], ate: [col, lin] }
function chartXml(g) {
  const fmt = g.fmt || 'General'; const n = g.cats.vals.length;
  const strCache = (vals) => `<c:strCache><c:ptCount val="${vals.length}"/>${vals.map((v, i) => `<c:pt idx="${i}"><c:v>${esc(v)}</c:v></c:pt>`).join('')}</c:strCache>`;
  const numCache = (vals) => `<c:numCache><c:formatCode>${esc(fmt)}</c:formatCode><c:ptCount val="${vals.length}"/>${vals.map((v, i) => (v == null || !Number.isFinite(+v) ? '' : `<c:pt idx="${i}"><c:v>${+v}</c:v></c:pt>`)).join('')}</c:numCache>`;
  const cat = `<c:cat><c:strRef><c:f>${esc(g.cats.ref)}</c:f>${strCache(g.cats.vals.map(String))}</c:strRef></c:cat>`;
  const txt = (sz, cor = '4A5A52', b = 0) => `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${sz}" b="${b}"><a:solidFill><a:srgbClr val="${cor}"/></a:solidFill><a:latin typeface="Arial"/></a:defRPr></a:pPr><a:endParaRPr lang="pt-PT"/></a:p></c:txPr>`;
  const mostrarVal = g.tipo === 'linha' ? g.series.length <= 3 && n <= 14 : g.series.length * n <= 40;
  const dl = (pos) => `<c:dLbls><c:numFmt formatCode="${esc(fmt)}" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txt(800)}${pos ? `<c:dLblPos val="${pos}"/>` : ''}<c:showLegendKey val="0"/><c:showVal val="${mostrarVal || g.tipo === 'circular' ? 1 : 0}"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="${g.tipo === 'circular' ? 1 : 0}"/><c:showBubbleSize val="0"/></c:dLbls>`;
  const ser = g.series.map((s, j) => {
    const tx = s.nomeRef ? `<c:tx><c:strRef><c:f>${esc(s.nomeRef)}</c:f>${strCache([s.nome])}</c:strRef></c:tx>` : `<c:tx><c:v>${esc(s.nome)}</c:v></c:tx>`;
    const val = `<c:val><c:numRef><c:f>${esc(s.ref)}</c:f>${numCache(s.vals)}</c:numRef></c:val>`;
    const c = corHex(s.cor, j);
    if (g.tipo === 'linha') return `<c:ser><c:idx val="${j}"/><c:order val="${j}"/>${tx}<c:spPr><a:ln w="28575" cap="rnd"><a:solidFill><a:srgbClr val="${c}"/></a:solidFill><a:round/></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="6"/><c:spPr><a:solidFill><a:srgbClr val="${c}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr></c:marker>${mostrarVal ? dl(j % 2 && g.series.length > 1 ? 'b' : 't').replace(txt(800), txt(800, c, 1)) : (() => { const u = s.vals.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0).pop(); return u == null ? '' : `<c:dLbls><c:dLbl><c:idx val="${u}"/><c:numFmt formatCode="${esc(fmt)}" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txt(750, c, 1)}<c:dLblPos val="r"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbl><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>`; })()}${cat}${val}<c:smooth val="0"/></c:ser>`;
    if (g.tipo === 'circular') return `<c:ser><c:idx val="${j}"/><c:order val="${j}"/>${tx}${g.cats.vals.map((_, i) => `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${corHex(null, i)}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:dPt>`).join('')}${dl('bestFit')}${cat}${val}</c:ser>`;
    return `<c:ser><c:idx val="${j}"/><c:order val="${j}"/>${tx}<c:spPr><a:solidFill><a:srgbClr val="${c}"/></a:solidFill></c:spPr><c:invertIfNegative val="0"/>${dl('outEnd')}${cat}${val}</c:ser>`;
  }).join('');
  const grelha = '<c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E3E9E5"/></a:solidFill><a:prstDash val="dash"/></a:ln></c:spPr></c:majorGridlines>';
  const horiz = g.tipo === 'barrasH';
  const eixos = `<c:catAx><c:axId val="111"/><c:scaling><c:orientation val="${horiz ? 'maxMin' : 'minMax'}"/></c:scaling><c:delete val="0"/><c:axPos val="${horiz ? 'l' : 'b'}"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="low"/><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="BFC8C3"/></a:solidFill></a:ln></c:spPr>${txt(900)}<c:crossAx val="222"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>`
    + `<c:valAx><c:axId val="222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${horiz ? 'b' : 'l'}"/>${grelha}<c:numFmt formatCode="${esc(fmt)}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr>${txt(900)}<c:crossAx val="111"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;
  const corpo = g.tipo === 'linha' ? `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${ser}<c:marker val="1"/><c:axId val="111"/><c:axId val="222"/></c:lineChart>${eixos}`
    : g.tipo === 'circular' ? `<c:doughnutChart><c:varyColors val="1"/>${ser}<c:firstSliceAng val="0"/><c:holeSize val="55"/></c:doughnutChart>`
    : `<c:barChart><c:barDir val="${horiz ? 'bar' : 'col'}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${ser}<c:gapWidth val="55"/><c:overlap val="-8"/><c:axId val="111"/><c:axId val="222"/></c:barChart>${eixos}`;
  const titulo = g.titulo ? `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1100" b="1"><a:solidFill><a:srgbClr val="0A6B45"/></a:solidFill><a:latin typeface="Arial"/></a:defRPr></a:pPr><a:r><a:rPr lang="pt-PT" sz="1100" b="1"><a:solidFill><a:srgbClr val="0A6B45"/></a:solidFill><a:latin typeface="Arial"/></a:rPr><a:t>${esc(g.titulo)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>` : '<c:autoTitleDeleted val="1"/>';
  const legenda = g.series.length > 1 || g.tipo === 'circular' ? `<c:legend><c:legendPos val="b"/><c:overlay val="0"/>${txt(900, '13221B')}</c:legend>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:date1904 val="0"/><c:lang val="pt-PT"/><c:roundedCorners val="0"/><c:chart>${titulo}<c:plotArea><c:layout/>${corpo}<c:spPr><a:noFill/></c:spPr></c:plotArea>${legenda}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="D5DED8"/></a:solidFill></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr><a:latin typeface="Arial"/></a:defRPr></a:pPr><a:endParaRPr lang="pt-PT"/></a:p></c:txPr></c:chartSpace>`;
}
const ancora = (g, i) => `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${g.de[0]}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${g.de[1]}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${g.ate[0]}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${g.ate[1]}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="Gráfico ${i + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rIdG${i + 1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;

// graficos: lista de { folha, ...g }
async function inserirGraficosXlsx(buf, graficos) {
  if (!graficos?.length) return buf;
  const z = await JSZip.loadAsync(buf);
  const wbXml = await z.file('xl/workbook.xml').async('string');
  const wbRels = await z.file('xl/_rels/workbook.xml.rels').async('string');
  let ct = await z.file('[Content_Types].xml').async('string');
  const folhas = {}; // nome -> caminho
  for (const m of wbXml.matchAll(/<sheet\b[^>]*?name="([^"]+)"[^>]*?r:id="([^"]+)"/g)) {
    const nome = m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'); const rid = m[2];
    const t = wbRels.match(new RegExp(`<Relationship[^>]*Id="${rid}"[^>]*Target="([^"]+)"`)) || wbRels.match(new RegExp(`<Relationship[^>]*Target="([^"]+)"[^>]*Id="${rid}"`));
    if (t) folhas[nome] = 'xl/' + t[1].replace(/^\/?xl\//, '');
  }
  const porFolha = new Map(); for (const g of graficos) { if (!folhas[g.folha]) continue; (porFolha.get(g.folha) || porFolha.set(g.folha, []).get(g.folha)).push(g); }
  let nChart = 0, nDraw = 0;
  for (const [folha, gs] of porFolha) {
    nDraw++; const sheetPath = folhas[folha]; const base = sheetPath.split('/').pop();
    const relsPath = sheetPath.replace(base, `_rels/${base}.rels`);
    let srels = z.file(relsPath) ? await z.file(relsPath).async('string') : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    srels = srels.replace('</Relationships>', `<Relationship Id="rIdDrw1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${nDraw}.xml"/></Relationships>`);
    z.file(relsPath, srels);
    let sx = await z.file(sheetPath).async('string');
    if (!/xmlns:r=/.test(sx)) sx = sx.replace('<worksheet ', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
    // <drawing> vem depois de pageMargins/pageSetup/headerFooter e antes de legacyDrawing/tableParts/extLst
    const antes = sx.search(/<(legacyDrawing|legacyDrawingHF|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b/);
    sx = antes > 0 ? sx.slice(0, antes) + '<drawing r:id="rIdDrw1"/>' + sx.slice(antes) : sx.replace('</worksheet>', '<drawing r:id="rIdDrw1"/></worksheet>');
    z.file(sheetPath, sx);
    let drel = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    let dxml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
    gs.forEach((g, i) => {
      nChart++; z.file(`xl/charts/chart${nChart}.xml`, chartXml(g));
      drel += `<Relationship Id="rIdG${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${nChart}.xml"/>`;
      dxml += ancora(g, i);
      ct = ct.replace('</Types>', `<Override PartName="/xl/charts/chart${nChart}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`);
    });
    z.file(`xl/drawings/drawing${nDraw}.xml`, dxml + '</xdr:wsDr>');
    z.file(`xl/drawings/_rels/drawing${nDraw}.xml.rels`, drel + '</Relationships>');
    ct = ct.replace('</Types>', `<Override PartName="/xl/drawings/drawing${nDraw}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);
  }
  z.file('[Content_Types].xml', ct);
  return z.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
module.exports = { inserirGraficosXlsx };
