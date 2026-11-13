import { escaparXml } from '../validação/escapar-xml.js';
/** Gráfico vetorial independente, sem scripts/URLs e com todas as séries do relatório. */
export function graficoRelatorioSvg(r) {
  const xml = (t) => escaparXml(String(t ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''));
  const quebrar = (t, n = 38) => {
    const caracteres = [...String(t)], linhas = [];
    for (let i = 0; i < caracteres.length; i += n) linhas.push(caracteres.slice(i, i + n).join(''));
    return linhas.length ? linhas : [''];
  };
  const series = r.series;
  const limite = series.reduce((maximo, s) => Math.max(maximo, Math.abs(s.valor)), 1);
  const temNegativo = series.some((s) => s.valor < 0), temPositivo = series.some((s) => s.valor > 0);
  const origem = temNegativo && temPositivo ? 600 : temNegativo ? 900 : 310;
  const espaco = temNegativo && temPositivo ? 280 : 580;
  const titulo = quebrar(r.titulo, 100);
  const posicoes = [];
  let y = 40 + titulo.length * 18 + 25;
  for (const serie of series) {
    const linhas = quebrar(serie.nome), altura = Math.max(30, linhas.length * 15 + 10);
    posicoes.push({ serie, linhas, y, altura }); y += altura;
  }
  const alturaTotal = y + 55;
  const textos = (linhas, x, top, atributos = '') => `<text x="${x}" y="${top}" ${atributos}>${linhas.map((l, i) => `<tspan x="${x}" dy="${i ? 15 : 0}">${xml(l)}</tspan>`).join('')}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${alturaTotal}" viewBox="0 0 1000 ${alturaTotal}" role="img" aria-labelledby="titulo descricao"><title id="titulo">${xml(r.titulo)}</title><desc id="descricao">Todas as ${series.length} séries. Barras em escala linear com zero explícito; rótulos mostram os valores originais.</desc><rect width="1000" height="${alturaTotal}" fill="#fff"/><g font-family="Arial, sans-serif" font-size="12" fill="#172238">${textos(titulo, 20, 30, 'font-size="16" font-weight="bold"')}<text x="${origem}" y="${posicoes[0]?.y - 10}" text-anchor="middle">0</text><line x1="${origem}" x2="${origem}" y1="${posicoes[0]?.y || 50}" y2="${y}" stroke="#8996a8"/>${posicoes.map(({ serie, linhas, y: top, altura }) => {
    const tamanho = Math.abs(serie.valor) / limite * espaco;
    const x = serie.valor < 0 ? origem - tamanho : origem;
    return `${textos(linhas, 20, top + 16)}<rect x="${x}" y="${top + 5}" width="${tamanho}" height="${Math.min(20, altura - 10)}" fill="${serie.valor < 0 ? '#9a3f36' : '#275ea8'}"/><text x="980" y="${top + 19}" text-anchor="end">${xml(serie.valor)}</text>`;
  }).join('')}<text x="20" y="${y + 30}" font-size="11">Ander Flow | Valores originais; método e premissas constam no relatório.</text></g></svg>`;
  return new TextEncoder().encode(svg);
}
