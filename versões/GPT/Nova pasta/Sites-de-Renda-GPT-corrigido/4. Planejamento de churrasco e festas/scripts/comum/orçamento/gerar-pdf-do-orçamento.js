// Sincronizado de compartilhado/scripts/orçamento/gerar-pdf-do-orçamento.js — edite a origem e rode "npm run sincronizar" na raiz.
// Gera o PDF do orçamento com a identidade do site: faixa na cor da marca, título,
// dados de quem emite e do cliente, tabela de itens com quebra de página e total em destaque.
// Função pura (recebe as cores), testável no Node.
import { formatarCentavos } from '../formatação/formatar-centavos.js';
import { formatarNúmero } from '../formatação/formatar-número.js';
import { criarDocumentoPdf } from '../pdf/criar-documento-pdf.js';
import { quebrarTextoEmLinhas } from '../pdf/quebrar-texto-em-linhas.js';
import { calcularTotaisDoOrçamento } from './calcular-totais-do-orçamento.js';
import { formatarDataDoOrçamento } from './formatar-data-do-orçamento.js';

const MARGEM = 16;
const LARGURA = 210;
const LIMITE_INFERIOR = 268;
const COLUNAS = { descrição: MARGEM + 3, quantidade: MARGEM + 112, preço: MARGEM + 146, subtotal: LARGURA - MARGEM - 3 };

const semEspaçoRígido = (texto) => texto.replace(/ /g, ' ');

export function gerarPdfDoOrçamento(orçamento, { marca = orçamento.marca || 'Orçamento', cores = {} } = {}) {
  const principal = cores.principal ?? '#8c491a';
  const clara = cores.clara ?? '#fff2eb';
  const texto = cores.texto ?? '#201e1d';
  const suave = '#6b645c';
  const totais = calcularTotaisDoOrçamento(orçamento);
  const datas = formatarDataDoOrçamento(orçamento);
  const moeda = (centavos) => semEspaçoRígido(formatarCentavos(centavos));
  const documento = criarDocumentoPdf({ título: `${orçamento.título} — ${orçamento.emissor.nome}`, autor: orçamento.emissor.nome });
  const medir = (tamanho, negrito = false) => (conteúdo) => documento.larguraDoTexto(conteúdo, tamanho, negrito);
  let númeroDaPágina = 0;

  function novaPágina() {
    documento.novaPágina();
    númeroDaPágina += 1;
    documento.retângulo(0, 0, LARGURA, 30, { preenchimento: principal, contorno: false });
    documento.texto(MARGEM, 15, marca, { tamanho: 18, negrito: true, cor: '#ffffff' });
    documento.texto(MARGEM, 22.5, 'Orçamento gerado no navegador', { tamanho: 9, cor: '#ffffff' });
    documento.texto(LARGURA - MARGEM, 15, 'ORÇAMENTO', { tamanho: 13, negrito: true, cor: '#ffffff', alinhamento: 'direita' });
    documento.texto(LARGURA - MARGEM, 22.5, `Emitido em ${datas.emitidoEm} · página ${númeroDaPágina}`, { tamanho: 9, cor: '#ffffff', alinhamento: 'direita' });
    documento.texto(MARGEM, 289, `Valores definidos por ${orçamento.emissor.nome}. Confira sempre com quem enviou.`, { tamanho: 8, cor: suave });
    return 42;
  }

  function cabeçalhoDaTabela(y) {
    documento.retângulo(MARGEM, y, LARGURA - MARGEM * 2, 8, { preenchimento: clara, contorno: false });
    const estilo = { tamanho: 9, negrito: true, cor: principal };
    documento.texto(COLUNAS.descrição, y + 5.4, 'DESCRIÇÃO', estilo);
    documento.texto(COLUNAS.quantidade, y + 5.4, 'QUANTIDADE', { ...estilo, alinhamento: 'direita' });
    documento.texto(COLUNAS.preço, y + 5.4, 'PREÇO UNIT.', { ...estilo, alinhamento: 'direita' });
    documento.texto(COLUNAS.subtotal, y + 5.4, 'SUBTOTAL', { ...estilo, alinhamento: 'direita' });
    return y + 12;
  }

  let y = novaPágina();
  for (const linha of quebrarTextoEmLinhas(orçamento.título, LARGURA - MARGEM * 2, medir(16, true))) {
    documento.texto(MARGEM, y, linha, { tamanho: 16, negrito: true, cor: principal });
    y += 7;
  }
  y += 1;
  const dados = [
    ['Emitido por', orçamento.emissor.nome],
    ['Contato', orçamento.emissor.contato],
    ['Para', orçamento.cliente.nome],
    ['Válido até', datas.válidoAté],
    ['Prazo', orçamento.prazo],
  ].filter(([, valor]) => valor);
  for (const [rótulo, valor] of dados) {
    documento.texto(MARGEM, y, `${rótulo}:`, { tamanho: 10, negrito: true, cor: texto });
    documento.texto(MARGEM + 26, y, valor, { tamanho: 10, cor: texto });
    y += 5.5;
  }
  y = cabeçalhoDaTabela(y + 4);

  for (const item of totais.itens) {
    const linhas = quebrarTextoEmLinhas(item.descrição, 88, medir(10));
    const altura = linhas.length * 5 + 2;
    if (y + altura > LIMITE_INFERIOR) y = cabeçalhoDaTabela(novaPágina());
    linhas.forEach((linha, índice) => documento.texto(COLUNAS.descrição, y + índice * 5, linha, { tamanho: 10, cor: texto }));
    documento.texto(COLUNAS.quantidade, y, `${formatarNúmero(item.quantidade, { casas: 3 })} ${item.unidade}`, { tamanho: 10, cor: texto, alinhamento: 'direita' });
    documento.texto(COLUNAS.preço, y, moeda(item.preçoUnitárioEmCentavos), { tamanho: 10, cor: texto, alinhamento: 'direita' });
    documento.texto(COLUNAS.subtotal, y, moeda(item.subtotalEmCentavos), { tamanho: 10, cor: texto, alinhamento: 'direita' });
    y += altura;
    documento.linha(MARGEM, y - 3, LARGURA - MARGEM, y - 3, { espessura: 0.2, cor: '#d9d2c7' });
  }

  const linhasDeTotal = [
    ...(totais.descontoEmCentavos ? [['Subtotal', moeda(totais.subtotalEmCentavos)], ['Desconto', `- ${moeda(totais.descontoEmCentavos)}`]] : []),
  ];
  const alturaDoQuadro = linhasDeTotal.length * 6 + 14;
  if (y + alturaDoQuadro + 4 > LIMITE_INFERIOR) y = novaPágina();
  y += 3;
  const xDoQuadro = LARGURA - MARGEM - 86;
  documento.retângulo(xDoQuadro, y, 86, alturaDoQuadro, { preenchimento: clara, contorno: false });
  let yDoQuadro = y + 6;
  for (const [rótulo, valor] of linhasDeTotal) {
    documento.texto(xDoQuadro + 5, yDoQuadro, rótulo, { tamanho: 10, cor: texto });
    documento.texto(COLUNAS.subtotal, yDoQuadro, valor, { tamanho: 10, cor: texto, alinhamento: 'direita' });
    yDoQuadro += 6;
  }
  documento.texto(xDoQuadro + 5, yDoQuadro + 3, 'TOTAL', { tamanho: 12, negrito: true, cor: principal });
  documento.texto(COLUNAS.subtotal, yDoQuadro + 3, moeda(totais.totalEmCentavos), { tamanho: 14, negrito: true, cor: principal, alinhamento: 'direita' });
  y += alturaDoQuadro + 8;

  if (orçamento.observações) {
    const linhas = quebrarTextoEmLinhas(orçamento.observações, LARGURA - MARGEM * 2, medir(9.5));
    if (y + 6 > LIMITE_INFERIOR) y = novaPágina();
    documento.texto(MARGEM, y, 'Observações', { tamanho: 10, negrito: true, cor: texto });
    y += 5.5;
    for (const linha of linhas) {
      if (y > LIMITE_INFERIOR) y = novaPágina();
      documento.texto(MARGEM, y, linha, { tamanho: 9.5, cor: texto });
      y += 4.8;
    }
  }
  return documento.gerarBytes();
}
