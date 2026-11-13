/** Compõe abas usando o gerador XLSX existente; estilos e XML das células não são duplicados. */
import { gerarPlanilhaXlsx } from '../exportação/gerar-planilha-xlsx.js';
import { compactarZip } from '../exportação/compactar-zip.js';
import { escaparXml } from '../validação/escapar-xml.js';
import { lerZip, extrairEntrada } from '../../cálculos/zip.js';

export async function gerarExcelComAbas({ titulo, autor = 'Ander Flow', abas }) {
  const arquivos = new Map();
  const decodificar = (bytes) => new TextDecoder().decode(bytes);
  for (let i = 0; i < abas.length; i++) {
    const bytes = gerarPlanilhaXlsx({ título: titulo, autor, nomeDaAba: abas[i].nome, linhas: abas[i].linhas });
    for (const entrada of lerZip(bytes).entradas) {
      if (i > 0 && entrada.nome !== 'xl/worksheets/sheet1.xml') continue;
      const nome = entrada.nome === 'xl/worksheets/sheet1.xml' ? `xl/worksheets/sheet${i + 1}.xml` : entrada.nome;
      arquivos.set(nome, await extrairEntrada(bytes, entrada));
    }
  }
  const inicioXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const sheets = abas.map((aba, i) => `<sheet name="${escaparXml(aba.nome)}" sheetId="${i + 1}" r:id="rIdSheet${i + 1}"/>`).join('');
  const workbook = decodificar(arquivos.get('xl/workbook.xml')).replace(/<sheets>[\s\S]*?<\/sheets>/, `<sheets>${sheets}</sheets>`);
  arquivos.set('xl/workbook.xml', workbook);
  arquivos.set('xl/_rels/workbook.xml.rels', `${inicioXml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas.map((_, i) => `<Relationship Id="rIdSheet${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  const tipos = decodificar(arquivos.get('[Content_Types].xml')).replace('</Types>', `${abas.slice(1).map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 2}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
  arquivos.set('[Content_Types].xml', tipos);
  return compactarZip([...arquivos].map(([nome, conteúdo]) => ({ nome, conteúdo })));
}
