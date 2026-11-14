/** Modelos de impressão dos documentos comerciais locais. */
import { montarDocumentoPdf } from './montar-documento-pdf.js';
import { formatarMoeda } from '../formatação/formatar-moeda.js';

const COR_SUAVE = '#5c6270';

function exigirCentavos(valor, nome) {
  if (!Number.isSafeInteger(valor) || valor < 0) throw new Error(`${nome} precisa estar em centavos inteiros não negativos.`);
}

/** Gera um recibo a partir de valores já validados; não acessa DOM, storage ou rede. */
export function gerarPdfRecibo({
  identificação = '', recebedor, documentoRecebedor = '', pagador, documentoPagador = '',
  valorCentavos, valorExtenso, referência, cidade, data, duasVias = false,
  marca = recebedor, corMarca, logo,
}) {
  exigirCentavos(valorCentavos, 'O valor do recibo');
  const valor = formatarMoeda(valorCentavos / 100);
  const documento = montarDocumentoPdf({
    título: 'Recibo de pagamento',
    subtítulo: identificação ? `Recibo ${identificação}` : valor,
    marca,
    corMarca,
    logo,
  });

  function escreverViaCompacta(títuloVia) {
    if (títuloVia) documento.seção(títuloVia);
    documento.destaque('Valor recebido', valor);
    const identificaçãoPartes = `Recebedor: ${recebedor}${documentoRecebedor ? ` · CPF/CNPJ ${documentoRecebedor}` : ''}  |  Pagador: ${pagador}${documentoPagador ? ` · CPF/CNPJ ${documentoPagador}` : ''}`;
    documento.parágrafo(identificaçãoPartes, { tamanho: 9.2, espaço: 0 });
    documento.parágrafo(`Valor por extenso: ${valorExtenso}.`, { tamanho: 9.2, cor: COR_SUAVE, espaço: 0 });
    documento.parágrafo(`Referente a: ${referência}`, { tamanho: 9.5, espaço: 0 });
    documento.parágrafo(`Recebido em ${cidade}, ${data}. A assinatura abaixo confirma a quitação deste pagamento.`, { tamanho: 9.2, espaço: 0, cor: COR_SUAVE });
    documento.assinatura(recebedor);
  }

  function escreverViaCompleta() {
    documento.destaque('Valor recebido', valor, { grande: true });
    documento.parágrafo(`Por extenso: ${valorExtenso}.`, { tamanho: 10, cor: COR_SUAVE });
    documento.seção('Quem recebeu');
    documento.campo('Nome', recebedor);
    if (documentoRecebedor) documento.campo('CPF/CNPJ', documentoRecebedor);
    documento.seção('Quem pagou');
    documento.campo('Nome', pagador);
    if (documentoPagador) documento.campo('CPF/CNPJ', documentoPagador);
    documento.seção('Descrição do pagamento');
    documento.parágrafo(referência, { tamanho: 10.5 });
    documento.parágrafo('A assinatura abaixo confirma o recebimento e a quitação deste pagamento.', { tamanho: 9.5, cor: COR_SUAVE });
    documento.parágrafo(`${cidade}, ${data}.`, { tamanho: 10 });
    documento.assinatura(recebedor);
  }

  if (duasVias) escreverViaCompacta('1ª via · recebedor');
  else escreverViaCompleta();
  if (duasVias) {
    documento.espaço(4);
    documento.seção('2ª via · pagador');
    escreverViaCompacta('');
  }
  return documento.gerarBytes();
}

/** Gera a proposta completa; cada linha da tabela usa seus totais em centavos. */
export function gerarPdfOrcamento({
  número, emissão, validade = '', emissor, contato = '', cliente,
  itens, subtotalCentavos, descontoPercentual = 0, descontoCentavos = 0, totalCentavos,
  condições = '', marca = emissor, corMarca, logo,
}) {
  if (!Array.isArray(itens) || itens.length === 0) throw new Error('O orçamento precisa ter itens.');
  for (const item of itens) {
    exigirCentavos(item.unitárioCentavos, 'O valor unitário');
    exigirCentavos(item.totalCentavos, 'O total do item');
    if (!Number.isFinite(item.quantidade) || item.quantidade <= 0 || typeof item.descrição !== 'string') {
      throw new Error('Cada item do orçamento precisa ter descrição e quantidade válidas.');
    }
  }
  exigirCentavos(subtotalCentavos, 'O subtotal');
  exigirCentavos(descontoCentavos, 'O desconto');
  exigirCentavos(totalCentavos, 'O total');
  const documento = montarDocumentoPdf({
    título: `Orçamento nº ${número}`,
    subtítulo: emissão,
    marca,
    corMarca,
    logo,
  });

  documento.seção('Proposta comercial');
  documento.campo('Número do orçamento', `Nº ${número}`);
  documento.campo('Emitido em', emissão);
  if (validade) documento.campo('Válido até', validade);
  documento.campo('Proponente', emissor);
  if (contato) documento.campo('Contato', contato);
  documento.campo('Cliente', cliente);
  documento.seção(`Itens · ${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`);
  documento.tabela(
    ['Descrição', 'Qtd.', 'Unitário', 'Total'],
    itens.map(item => [
      item.descrição,
      String(item.quantidade),
      formatarMoeda(item.unitárioCentavos / 100),
      formatarMoeda(item.totalCentavos / 100),
    ]),
    [82, 16, 38, 38],
  );
  documento.campo('Subtotal', formatarMoeda(subtotalCentavos / 100));
  if (descontoCentavos > 0) documento.campo(`Desconto (${descontoPercentual}%)`, `- ${formatarMoeda(descontoCentavos / 100)}`);
  documento.destaque('Total da proposta', formatarMoeda(totalCentavos / 100));
  if (condições) {
    documento.seção('Pagamento e entrega');
    documento.parágrafo(condições, { tamanho: 10 });
  }
  documento.parágrafo('Esta proposta não é documento fiscal nem substitui contrato.', { tamanho: 8.5, cor: COR_SUAVE });
  documento.assinatura(emissor);
  return documento.gerarBytes();
}
