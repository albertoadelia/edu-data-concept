// Gráficos nativos do Word (DrawingML/OOXML) dentro do .docx gerado pela biblioteca docx.
// Cada gráfico leva a sua folha Excel embutida: no Word, "Editar dados" abre os números e o gráfico actualiza-se.
const { JSZip } = require('./lib/geo.cjs');

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const col = (i) => String.fromCharCode(65 + i);

// folha Excel mínima (A = categorias, B.. = séries)
async function xlsxDados(g) {
  const z = new JSZip();
  z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>');
  z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
  z.file('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>Alberto Adélia Manhice</dc:creator><cp:lastModifiedBy>Alberto Adélia Manhice</cp:lastModifiedBy><dc:title>Dados do gráfico</dc:title></cp:coreProperties>');
  z.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Folha1" sheetId="1" r:id="rId1"/></sheets></workbook>');
  z.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
  const is = (r, c, t) => `<c r="${col(c)}${r}" t="inlineStr"><is><t>${esc(t)}</t></is></c>`;
  const nu = (r, c, v) => (v == null || !Number.isFinite(+v) ? '' : `<c r="${col(c)}${r}"><v>${+v}</v></c>`);
  let rows = `<row r="1">${is(1, 0, '')}${g.series.map((s, j) => is(1, j + 1, s.nome)).join('')}</row>`;
  g.cats.forEach((c, i) => { rows += `<row r="${i + 2}">${is(i + 2, 0, c)}${g.series.map((s, j) => nu(i + 2, j + 1, s.vals[i])).join('')}</row>`; });
  z.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`);
  return z.generateAsync({ type: 'nodebuffer' });
}

function chartXml(g) {
  const n = g.cats.length; const fmt = g.pct ? '0.0%' : '#,##0';
  const catRef = `<c:cat><c:strRef><c:f>Folha1!$A$2:$A$${n + 1}</c:f><c:strCache><c:ptCount val="${n}"/>${g.cats.map((c, i) => `<c:pt idx="${i}"><c:v>${esc(c)}</c:v></c:pt>`).join('')}</c:strCache></c:strRef></c:cat>`;
  const cor = (s) => String(s.cor || '#0E4D5C').replace('#', '').toUpperCase();
  const ser = g.series.map((s, j) => {
    const vals = `<c:val><c:numRef><c:f>Folha1!$${col(j + 1)}$2:$${col(j + 1)}$${n + 1}</c:f><c:numCache><c:formatCode>${fmt}</c:formatCode><c:ptCount val="${n}"/>${s.vals.map((v, i) => (v == null || !Number.isFinite(+v) ? '' : `<c:pt idx="${i}"><c:v>${+v}</c:v></c:pt>`)).join('')}</c:numCache></c:numRef></c:val>`;
    const tx = `<c:tx><c:strRef><c:f>Folha1!$${col(j + 1)}$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${esc(s.nome)}</c:v></c:pt></c:strCache></c:strRef></c:tx>`;
    const pontos = s.cores && g.tipo === 'barras' ? s.cores.map((c, i) => `<c:dPt><c:idx val="${i}"/><c:invertIfNegative val="0"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${String(c).replace('#', '').toUpperCase()}"/></a:solidFill></c:spPr></c:dPt>`).join('') : '';
    const corT = g.tipo === 'linha' ? cor(s) : '3F4F47';
    const tp = (sz, c) => `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${sz}" b="1"><a:solidFill><a:srgbClr val="${c}"/></a:solidFill><a:latin typeface="Arial"/></a:defRPr></a:pPr><a:endParaRPr lang="pt-PT"/></a:p></c:txPr>`;
    const flags = (v) => `<c:showLegendKey val="0"/><c:showVal val="${v}"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/>`;
    const semFundo = '<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>';
    let dl;
    if (g.tipo === 'linha') {
      // valores por cima dos pontos, na cor da série; com muitas séries só o último ponto de cada uma
      const todos = g.series.length <= 3 && n <= 14;
      if (todos) dl = `<c:dLbls><c:numFmt formatCode="${fmt}" sourceLinked="0"/>${semFundo}${tp(800, corT)}<c:dLblPos val="${j % 2 && g.series.length > 1 ? 'b' : 't'}"/>${flags(1)}</c:dLbls>`;
      else { const ult = s.vals.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0).pop(); dl = `<c:dLbls>${ult == null ? '' : `<c:dLbl><c:idx val="${ult}"/><c:numFmt formatCode="${fmt}" sourceLinked="0"/>${semFundo}${tp(750, corT)}<c:dLblPos val="r"/>${flags(1)}</c:dLbl>`}${flags(0)}</c:dLbls>`; }
    } else {
      const mostra = g.series.length * n <= 48; const sz = g.series.length * n > 16 ? 700 : 800;
      dl = `<c:dLbls><c:numFmt formatCode="${fmt}" sourceLinked="0"/>${semFundo}${tp(sz, corT)}<c:dLblPos val="outEnd"/>${flags(mostra ? 1 : 0)}</c:dLbls>`;
    }
    if (g.tipo === 'linha') return `<c:ser><c:idx val="${j}"/><c:order val="${j}"/>${tx}<c:spPr><a:ln w="28575" cap="rnd"><a:solidFill><a:srgbClr val="${cor(s)}"/></a:solidFill><a:round/></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="5"/><c:spPr><a:solidFill><a:srgbClr val="${cor(s)}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr></c:marker>${dl}${catRef}${vals}<c:smooth val="0"/></c:ser>`;
    return `<c:ser><c:idx val="${j}"/><c:order val="${j}"/>${tx}<c:spPr><a:solidFill><a:srgbClr val="${cor(s)}"/></a:solidFill></c:spPr><c:invertIfNegative val="0"/>${pontos}${dl}${catRef}${vals}</c:ser>`;
  }).join('');
  const eixoTxt = '<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"><a:solidFill><a:srgbClr val="5B6B72"/></a:solidFill><a:latin typeface="Arial"/></a:defRPr></a:pPr><a:endParaRPr lang="pt-PT"/></a:p></c:txPr>';
  const grelha = '<c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E6EBEA"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>';
  const eixos = `<c:catAx><c:axId val="111"/><c:scaling><c:orientation val="${g.horiz ? 'maxMin' : 'minMax'}"/></c:scaling><c:delete val="0"/><c:axPos val="${g.horiz ? 'l' : 'b'}"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="BFC8C6"/></a:solidFill></a:ln></c:spPr>${eixoTxt}<c:crossAx val="222"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>`
    + `<c:valAx><c:axId val="222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${g.horiz ? 'b' : 'l'}"/>${grelha}<c:numFmt formatCode="${fmt}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr>${eixoTxt}<c:crossAx val="111"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;
  const corpo = g.tipo === 'linha' ? `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${ser}<c:marker val="1"/><c:axId val="111"/><c:axId val="222"/></c:lineChart>`
    : `<c:barChart><c:barDir val="${g.horiz ? 'bar' : 'col'}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${ser}<c:gapWidth val="60"/><c:overlap val="-10"/><c:axId val="111"/><c:axId val="222"/></c:barChart>`;
  const legenda = g.series.length > 1 ? `<c:legend><c:legendPos val="b"/><c:overlay val="0"/><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"><a:latin typeface="Arial"/></a:defRPr></a:pPr><a:endParaRPr lang="pt-PT"/></a:p></c:txPr></c:legend>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:date1904 val="0"/><c:lang val="pt-PT"/><c:roundedCorners val="0"/><c:chart><c:autoTitleDeleted val="1"/><c:plotArea><c:layout/>${corpo}${eixos}<c:spPr><a:noFill/></c:spPr></c:plotArea>${legenda}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr><a:latin typeface="Arial"/></a:defRPr></a:pPr><a:endParaRPr lang="pt-PT"/></a:p></c:txPr><c:externalData r:id="rId1"><c:autoUpdate val="0"/></c:externalData></c:chartSpace>`;
}

// substitui cada parágrafo "§GRAF_n§" do documento por um gráfico nativo
async function inserirGraficos(buf, graficos) {
  if (!graficos.length) return buf;
  const z = await JSZip.loadAsync(buf);
  let doc = await z.file('word/document.xml').async('string');
  let rels = await z.file('word/_rels/document.xml.rels').async('string');
  let ct = await z.file('[Content_Types].xml').async('string');
  if (!/Extension="xlsx"/.test(ct)) ct = ct.replace('</Types>', '<Default Extension="xlsx" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"/></Types>');
  if (!/xmlns:wp=/.test(doc)) doc = doc.replace('<w:document ', '<w:document xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ');
  for (let i = 0; i < graficos.length; i++) {
    const g = graficos[i]; const n = i + 1; const rid = `rIdGraf${n}`;
    z.file(`word/charts/chart${n}.xml`, chartXml(g));
    z.file(`word/charts/_rels/chart${n}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/package" Target="../embeddings/Dados_grafico_${n}.xlsx"/></Relationships>`);
    z.file(`word/embeddings/Dados_grafico_${n}.xlsx`, await xlsxDados(g));
    ct = ct.replace('</Types>', `<Override PartName="/word/charts/chart${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`);
    rels = rels.replace('</Relationships>', `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="charts/chart${n}.xml"/></Relationships>`);
    const cx = Math.round((g.w || 600) * 9525), cy = Math.round((g.h || 260) * 9525);
    const drawing = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${5000 + n}" name="Gráfico ${n}"/><wp:cNvGraphicFramePr/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${rid}"/></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
    const re = new RegExp(`<w:p>(?:(?!<w:p>)[\\s\\S])*?§GRAF_${n}§[\\s\\S]*?</w:p>`);
    if (!re.test(doc)) throw new Error('marcador do gráfico ' + n + ' não encontrado');
    doc = doc.replace(re, drawing);
  }
  z.file('word/document.xml', doc); z.file('word/_rels/document.xml.rels', rels); z.file('[Content_Types].xml', ct);
  return z.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
module.exports = { inserirGraficos };
