/** Pedido de venda: itens e condições, com PDF e XLSX locais, sem emissão fiscal. */
import { montarFerramenta, número, texto, ErroDeEntrada, baixar, baixarPlanilha, nomeDeArquivo } from '../núcleo/montador.js';
import { paraNúmero } from '../núcleo/texto.js';
import { emCentavos } from '../cálculos/dinheiro.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { montarDocumentoPdf } from '../comum/documentos/montar-documento-pdf.js';

const reais = (centavos) => formatarMoeda(centavos / 100);
function dataISO(entrada, campo) {
  const valor = String(entrada || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw new ErroDeEntrada('Informe uma data válida.', campo);
  const [ano, mes, dia] = valor.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (ano < 2000 || ano > 2100 || data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    throw new ErroDeEntrada('Data inexistente ou fora do período de 2000 a 2100.', campo);
  }
  return valor.slice(8) + '/' + valor.slice(5, 7) + '/' + valor.slice(0, 4);
}

/** Retorna todos os valores monetários em centavos inteiros. */
export function calcularPedido({ itens, desconto, freteCentavos }) {
  if (!Array.isArray(itens) || itens.length < 1 || itens.length > 80) {
    throw new ErroDeEntrada('Informe de 1 a 80 itens.', 'itens');
  }
  if (!Number.isFinite(desconto) || desconto < 0 || desconto > 100) {
    throw new ErroDeEntrada('Desconto entre 0% e 100%.', 'desconto');
  }
  if (!Number.isSafeInteger(freteCentavos) || freteCentavos < 0 || freteCentavos > 100_000_000) {
    throw new ErroDeEntrada('Frete inválido.', 'frete');
  }
  let subtotalCentavos = 0;
  const calculados = itens.map((item, indice) => {
    if (!Number.isFinite(item.quantidade) || item.quantidade <= 0 || item.quantidade > 100_000
      || !Number.isSafeInteger(item.unitarioCentavos) || item.unitarioCentavos < 0 || item.unitarioCentavos > 100_000_000) {
      throw new ErroDeEntrada('Valor ou quantidade inválida na linha ' + (indice + 1) + '.', 'itens');
    }
    const totalCentavos = Math.round(item.quantidade * item.unitarioCentavos);
    subtotalCentavos += totalCentavos;
    if (!Number.isSafeInteger(subtotalCentavos) || subtotalCentavos > 10_000_000_000) {
      throw new ErroDeEntrada('O total dos itens ultrapassa o limite de R$ 100 milhões.', 'itens');
    }
    return { ...item, totalCentavos };
  });
  const descontoCentavos = Math.round(subtotalCentavos * (desconto / 100));
  const totalCentavos = subtotalCentavos - descontoCentavos + freteCentavos;
  return { itens: calculados, subtotalCentavos, descontoCentavos, freteCentavos, totalCentavos };
}
function lerItens(dados) {
  const linhas = String(dados.itens ?? '').split(/\r?\n/).map((linha) => linha.trim()).filter(Boolean);
  if (linhas.length < 1 || linhas.length > 80) throw new ErroDeEntrada('Informe de 1 a 80 itens.', 'itens');
  return linhas.map((linha, indice) => {
    const partes = linha.split(';').map((p) => p.trim());
    if (partes.length !== 3 || !partes[0] || partes[0].length > 65) {
      throw new ErroDeEntrada('Linha ' + (indice + 1) + ': escreva descrição; quantidade; valor unitário. Descrição até 65 caracteres.', 'itens');
    }
    const quantidade = paraNúmero(partes[1]);
    const unitario = paraNúmero(partes[2]);
    if (!Number.isFinite(quantidade) || quantidade <= 0 || quantidade > 100_000 ||
        !Number.isFinite(unitario) || unitario < 0 || unitario > 1_000_000) {
      throw new ErroDeEntrada('Quantidade ou preço inválido na linha ' + (indice + 1) + '.', 'itens');
    }
    return { descricao: partes[0], quantidade, unitarioCentavos: emCentavos(unitario) };
  });
}

export function calcularPedidoNaTela(dados) {
  const emissor = texto(dados, 'emissor', { rótulo: 'Empresa ou responsável', máximo: 100 });
  const cliente = texto(dados, 'cliente', { rótulo: 'Cliente', máximo: 100 });
  const numero = texto(dados, 'numero', { rótulo: 'Número do pedido', máximo: 40 });
  if (!/^[\p{L}\p{N}._/-]+$/u.test(numero)) throw new ErroDeEntrada('Número do pedido só pode ter letras, números, ponto, traço e barra.', 'numero');
  const data = dataISO(dados.data, 'data');
  const pagamento = texto(dados, 'pagamento', { rótulo: 'Condição de pagamento', máximo: 160 });
  const entrega = texto(dados, 'entrega', { rótulo: 'Prazo de entrega', máximo: 160 });
  const observacao = texto(dados, 'observacao', { rótulo: 'Observações', máximo: 400, obrigatório: false });
  const desconto = número(dados, 'desconto', { rótulo: 'Desconto (%)', mín: 0, máx: 100, obrigatório: false, padrão: 0 });
  const frete = número(dados, 'frete', { rótulo: 'Frete (R$)', mín: 0, máx: 1_000_000, obrigatório: false, padrão: 0 });
  const resultado = calcularPedido({ itens: lerItens(dados), desconto, freteCentavos: emCentavos(frete) });
  const linhas = [
    ['Subtotal', reais(resultado.subtotalCentavos)],
    ['Desconto (' + formatarNúmero(desconto, { casas: 2 }) + '%)', '− ' + reais(resultado.descontoCentavos)],
    ['Frete', reais(resultado.freteCentavos)],
    ['Total do pedido', reais(resultado.totalCentavos)],
  ];
  const tabela = { cabeçalho: ['Item', 'Quantidade', 'Unitário', 'Total'],
    linhas: resultado.itens.map((item) => [item.descricao,
      formatarNúmero(item.quantidade, { casas: 3 }),
      reais(item.unitarioCentavos), reais(item.totalCentavos)]),
    semExportação: true,
  };
  const observacoes = [
    'Pedido de venda não é nota fiscal, comprovante de pagamento nem confirmação de estoque ou entrega.',
    'Confira os dados com o cliente antes de enviar o documento; nada é transmitido automaticamente.',
  ];
  const nome = nomeDeArquivo('pedido-' + numero + '-' + cliente);
  function gerarPdf() {
    const pdf = montarDocumentoPdf({ título: 'Pedido de venda nº ' + numero, subtítulo: data, marca: emissor });
    pdf.seção('Destinatário e condições');
    pdf.campo('Cliente', cliente);
    pdf.campo('Emissão', data);
    pdf.campo('Pagamento', pagamento);
    pdf.campo('Entrega', entrega);
    pdf.seção('Itens');
    pdf.tabela(tabela.cabeçalho, tabela.linhas, [43, 14, 20, 23]);
    for (const [rotulo, valor] of linhas.slice(0, 3)) pdf.campo(rotulo, valor);
    pdf.destaque('Total do pedido', reais(resultado.totalCentavos));
    if (observacao) { pdf.seção('Observações'); pdf.parágrafo(observacao); }
    pdf.espaço(3);
    pdf.parágrafo(observacoes[0], { tamanho: 8.5 });
    baixar(pdf.gerarBytes(), nome + '.pdf', 'application/pdf');
  }
  function gerarXlsx() {
    baixarPlanilha([
      ['Pedido de venda', numero], ['Emissor', emissor], ['Cliente', cliente], ['Data', data],
      ['Pagamento', pagamento], ['Entrega', entrega], [],
      ['Item', 'Quantidade', 'Unitário (R$)', 'Total (R$)'],
      ...resultado.itens.map((item) => [item.descricao, item.quantidade,
        item.unitarioCentavos / 100, item.totalCentavos / 100]),
      [], ['Subtotal', '', '', resultado.subtotalCentavos / 100],
      ['Desconto', '', '', -resultado.descontoCentavos / 100],
      ['Frete', '', '', resultado.freteCentavos / 100],
      ['Total', '', '', resultado.totalCentavos / 100],
      ...(observacao ? [['Observações', observacao]] : []),
    ], nome, { aba: 'Pedido', larguras: [42, 18, 20, 20] });
  }
  return {
    valor: reais(resultado.totalCentavos),
    resumo: 'Pedido ' + numero + ' para ' + cliente + ' · ' + resultado.itens.length + ' itens.',
    linhas, tabela, observações: observacoes,
    texto: ['Pedido de venda ' + numero, 'Emissor: ' + emissor, 'Cliente: ' + cliente,
      'Data: ' + data, 'Pagamento: ' + pagamento, 'Entrega: ' + entrega,
      ...tabela.linhas.map((l) => l.join('; ')), ...linhas.map(([k, v]) => k + ': ' + v),
      ...(observacao ? ['Observações: ' + observacao] : []), ...observacoes].join('\n'),
    arquivos: [
      { rótulo: 'Baixar pedido em PDF', ícone: 'documento', gerar: gerarPdf },
      { rótulo: 'Baixar pedido em Excel', ícone: 'planilha', gerar: gerarXlsx },
    ],
  };
}

export default {
  instruções: {
    passos: [
      'Informe o nome do emissor, cliente, número e data do pedido.',
      'Liste itens: descrição; quantidade; preço unitário (uma linha por item).',
      'Preencha desconto opcional, frete, condições de pagamento e prazo de entrega.',
      'Confira subtotal, desconto, frete e total. Baixe o pedido em PDF ou Excel.',
    ],
    exemplo: { texto: 'Pedido PV-102: 2 camisetas de R$ 35,00 e 1 bermuda de R$ 50,00. '
      + 'Subtotal R$ 120,00, desconto de 10% (R$ 12,00) e frete de R$ 8,00: total R$ 116,00.' },
    limites: 'Até 80 itens por pedido e subtotal máximo de R$ 100 milhões. '
      + 'O PDF e a planilha são produzidos no navegador, sem cadastro obrigatório. '
      + 'Este documento registra uma intenção de compra; não emite nota fiscal nem confirma estoque, entrega ou pagamento.',
    perguntas: [
      { p: 'O pedido substitui a nota fiscal?', r: 'Não. Ele ajuda a registrar a negociação, mas não emite documentos fiscais.' },
      { p: 'Os dados do cliente são enviados?', r: 'Não durante a geração. Só envie o PDF/planilha a quem deva receber os dados.' },
    ],
  },
  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Gerar pedido',
      campos: [
        { nome: 'emissor', rótulo: 'Empresa ou responsável', exemplo: 'Minha loja' },
        { nome: 'cliente', rótulo: 'Cliente', exemplo: 'Nome do cliente' },
        { nome: 'numero', rótulo: 'Número do pedido', padrão: 'PV-001' },
        { nome: 'data', rótulo: 'Data do pedido', tipo: 'date', padrão: new Date().toLocaleDateString('sv-SE') },
        { nome: 'itens', rótulo: 'Itens do pedido', tipo: 'área', linhas: 7,
          padrão: 'Camiseta; 2; 35,00\nBermuda; 1; 50,00',
          dica: 'Uma linha por item: descrição; quantidade; preço unitário.' },
        { nome: 'desconto', rótulo: 'Desconto (%)', tipo: 'número', padrão: '10' },
        { nome: 'frete', rótulo: 'Frete (R$)', tipo: 'número', padrão: '8' },
        { nome: 'pagamento', rótulo: 'Condição de pagamento', padrão: 'Pix na confirmação' },
        { nome: 'entrega', rótulo: 'Prazo de entrega', padrão: 'Até 5 dias úteis após a confirmação' },
        { nome: 'observacao', rótulo: 'Observações (opcional)', tipo: 'área', linhas: 3 },
      ], calcular: calcularPedidoNaTela,
    });
  },
};
