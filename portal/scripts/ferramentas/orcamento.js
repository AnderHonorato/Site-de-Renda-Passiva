/** Orçamento e proposta: PDF, planilha e link para o cliente. */
import {
  montarFerramenta, número, texto, ErroDeEntrada,
  baixar, baixarPlanilha, nomeDeArquivo, copiar, avisar,
} from '../núcleo/montador.js';
import { montarDocumentoPdf } from '../comum/documentos/montar-documento-pdf.js';
import { emCentavos } from '../cálculos/dinheiro.js';
import { paraNúmero } from '../núcleo/texto.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { gravar, ler } from '../núcleo/armazenamento.js';
import { mostrarOrçamentoCompartilhado } from './auxiliares/orcamento-compartilhado.js';

const LIMITE_DE_ITENS = 60;

/**
 * Lê as linhas de item: "descrição; quantidade; valor unitário".
 * @param {string} valor
 * @returns {{descrição: string, quantidade: number, unitárioCentavos: number, totalCentavos: number}[]}
 */
function lerItens(valor) {
  const linhas = String(valor ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (linhas.length === 0) throw new ErroDeEntrada('Inclua pelo menos um item.', 'itens');
  if (linhas.length > LIMITE_DE_ITENS) {
    throw new ErroDeEntrada(`Limite de ${LIMITE_DE_ITENS} itens por orçamento.`, 'itens');
  }

  return linhas.map((linha, índice) => {
    const partes = linha.split(/\s*[;|]\s*/).map((p) => p.trim());
    if (partes.length < 3) {
      throw new ErroDeEntrada(
        `A linha ${índice + 1} precisa ter descrição, quantidade e valor. Exemplo: Bolo de chocolate; 2; 85,00`,
        'itens',
      );
    }
    const [descrição, quantidadeBruta, unitárioBruto] = partes;
    if (!descrição) throw new ErroDeEntrada(`A linha ${índice + 1} está sem descrição.`, 'itens');
    if (descrição.length > 120) throw new ErroDeEntrada(`A descrição da linha ${índice + 1} é longa demais.`, 'itens');

    const quantidade = paraNúmero(quantidadeBruta);
    const unitário = paraNúmero(unitárioBruto);
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      throw new ErroDeEntrada(`Quantidade inválida na linha ${índice + 1}.`, 'itens');
    }
    if (!Number.isFinite(unitário) || unitário < 0) {
      throw new ErroDeEntrada(`Valor inválido na linha ${índice + 1}.`, 'itens');
    }

    const unitárioCentavos = emCentavos(unitário);
    return {
      descrição,
      quantidade,
      unitárioCentavos,
      totalCentavos: Math.round(unitárioCentavos * quantidade),
    };
  });
}

/** Monta o link compartilhável. O conteúdo vai no fragmento, que nunca é enviado ao servidor. */
function montarLink(dados) {
  const compacto = JSON.stringify(dados);
  const bytes = new TextEncoder().encode(compacto);
  let binário = '';
  for (const byte of bytes) binário += String.fromCharCode(byte);
  const base = btoa(binário).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${location.origin}${location.pathname}#o=${base}`;
}

export default {
  instruções: {
    passos: [
      'Preencha seus dados uma vez: eles ficam salvos neste navegador para o próximo orçamento.',
      'Escreva os itens, um por linha: descrição; quantidade; valor unitário.',
      'Informe desconto e validade da proposta, se houver.',
      'Baixe o PDF para enviar por e-mail, a planilha para ajustar depois, ou copie o link para o cliente abrir no celular.',
    ],
    exemplo: {
      texto: 'Bolo de chocolate; 2; 85,00\nDocinhos; 100; 1,80\n\n'
        + 'Total de R$ 350,00. Com 10% de desconto, R$ 315,00.',
    },
    limites: `Até ${LIMITE_DE_ITENS} itens. O orçamento não é documento fiscal e não substitui contrato: `
      + 'é uma proposta de preço. O link compartilhável guarda o conteúdo no endereço, depois do "#", '
      + 'que por definição do navegador não é enviado ao servidor — mas qualquer pessoa com o link vê o conteúdo, '
      + 'então não coloque dado sensível.',
    perguntas: [
      { p: 'O cliente precisa instalar algo para abrir o link?', r: 'Não. O link abre no navegador do celular ou do computador e mostra o orçamento com o seu nome e o valor.' },
      { p: 'Meus dados ficam guardados em algum servidor?', r: 'Não. Os dados do emissor ficam no armazenamento local do seu navegador, e o conteúdo do link viaja dentro do próprio endereço.' },
      { p: 'Posso editar o PDF depois?', r: 'O PDF é final. Para ajustar valores, mude aqui e gere de novo, ou baixe a planilha e trabalhe nela.' },
    ],
  },

  montar(raiz, ferramenta) {
    // Quem chega pelo link do emissor vê o orçamento pronto, não o formulário.
    const doLink = /^#o=(.+)$/.exec(location.hash);
    if (doLink) {
      mostrarOrçamentoCompartilhado(raiz, doLink[1]);
      // Trocar o endereço na mesma aba precisa redesenhar; sem isso o cliente
      // ficaria vendo o orçamento antigo ao abrir um link novo.
      addEventListener('hashchange', () => {
        const novo = /^#o=(.+)$/.exec(location.hash);
        if (novo) mostrarOrçamentoCompartilhado(raiz, novo[1]);
        else location.reload();
      });
      return;
    }

    const emissorSalvo = ler('orçamento.emissor', {});

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Montar orçamento',
      campos: [
        { nome: 'emissor', rótulo: 'Seu nome ou da empresa', padrão: emissorSalvo.emissor ?? '', exemplo: 'Ateliê da Ana' },
        { nome: 'contato', rótulo: 'Seu contato', padrão: emissorSalvo.contato ?? '', exemplo: 'ana@exemplo.com · (11) 90000-0000' },
        { nome: 'cliente', rótulo: 'Nome do cliente', exemplo: 'Maria Souza' },
        { nome: 'número', rótulo: 'Número do orçamento', padrão: String(emissorSalvo.próximo ?? 1) },
        {
          nome: 'itens', rótulo: 'Itens do orçamento', tipo: 'área', linhas: 8,
          padrão: 'Bolo de chocolate; 2; 85,00\nDocinhos; 100; 1,80',
          dica: 'Uma linha por item: descrição; quantidade; valor unitário',
        },
        { nome: 'desconto', rótulo: 'Desconto (%)', tipo: 'número', padrão: '0' },
        { nome: 'validade', rótulo: 'Validade da proposta (dias)', tipo: 'número', padrão: '7' },
        { nome: 'condições', rótulo: 'Condições de pagamento e entrega', tipo: 'área', linhas: 3, exemplo: '50% na encomenda, 50% na entrega. Prazo de 5 dias úteis.' },
      ],
      calcular(dados) {
        const emissor = texto(dados, 'emissor', { rótulo: 'Seu nome', máximo: 120 });
        const contato = texto(dados, 'contato', { rótulo: 'Seu contato', obrigatório: false, máximo: 160 });
        const cliente = texto(dados, 'cliente', { rótulo: 'Nome do cliente', máximo: 120 });
        const condições = texto(dados, 'condições', { rótulo: 'Condições', obrigatório: false, máximo: 600 });
        const númeroDoOrçamento = número(dados, 'número', { rótulo: 'Número do orçamento', mín: 1, inteiro: true });
        const desconto = número(dados, 'desconto', { rótulo: 'Desconto', mín: 0, máx: 100, obrigatório: false, padrão: 0 });
        const validade = número(dados, 'validade', { rótulo: 'Validade', mín: 0, máx: 365, obrigatório: false, padrão: 0 });
        const itens = lerItens(dados.itens);

        const subtotal = itens.reduce((soma, i) => soma + i.totalCentavos, 0);
        const descontoCentavos = Math.round(subtotal * (desconto / 100));
        const total = subtotal - descontoCentavos;

        // Guarda os dados do emissor e avança o número, para o próximo orçamento.
        gravar('orçamento.emissor', { emissor, contato, próximo: númeroDoOrçamento + 1 });

        const emitidoEm = new Date().toLocaleDateString('pt-BR');
        const válidoAté = validade > 0
          ? new Date(Date.now() + validade * 86400000).toLocaleDateString('pt-BR')
          : null;

        const linhasDaTabela = itens.map((i) => [
          i.descrição,
          String(i.quantidade),
          formatarMoeda(i.unitárioCentavos / 100),
          formatarMoeda(i.totalCentavos / 100),
        ]);

        const gerarPdf = () => {
          const documento = montarDocumentoPdf({
            título: `Orçamento nº ${númeroDoOrçamento}`,
            subtítulo: emitidoEm,
            marca: emissor,
          });
          documento.seção('Dados');
          documento.campo('Cliente', cliente);
          if (contato) documento.campo('Contato', contato);
          documento.campo('Emitido em', emitidoEm);
          if (válidoAté) documento.campo('Válido até', válidoAté);
          documento.espaço(4);
          documento.seção('Itens');
          documento.tabela(['Descrição', 'Qtd.', 'Unitário', 'Total'], linhasDaTabela, [52, 12, 18, 18]);
          if (descontoCentavos > 0) {
            documento.campo('Subtotal', formatarMoeda(subtotal / 100));
            documento.campo(`Desconto (${desconto}%)`, `− ${formatarMoeda(descontoCentavos / 100)}`);
          }
          documento.destaque('Total', formatarMoeda(total / 100));
          if (condições) {
            documento.seção('Condições');
            documento.parágrafo(condições);
          }
          documento.espaço(4);
          documento.parágrafo('Este orçamento é uma proposta de preço e não constitui documento fiscal.',
            { tamanho: 8.5, cor: '#6d5d55' });
          baixar(documento.gerarBytes(), `${nomeDeArquivo(`orcamento-${númeroDoOrçamento}-${cliente}`)}.pdf`, 'application/pdf');
        };

        const gerarPlanilha = () => baixarPlanilha(
          [
            ['Orçamento', `nº ${númeroDoOrçamento}`],
            ['Emissor', emissor], ['Cliente', cliente], ['Emitido em', emitidoEm],
            [], ['Descrição', 'Quantidade', 'Unitário (R$)', 'Total (R$)'],
            ...itens.map((i) => [i.descrição, i.quantidade, i.unitárioCentavos / 100, i.totalCentavos / 100]),
            [], ['Subtotal', '', '', subtotal / 100],
            ['Desconto', '', '', -descontoCentavos / 100],
            ['Total', '', '', total / 100],
          ],
          nomeDeArquivo(`orcamento-${númeroDoOrçamento}-${cliente}`),
          { aba: 'Orçamento', larguras: [44, 12, 16, 16] },
        );

        const gerarLink = async () => {
          const link = montarLink({
            v: 1, e: emissor, c: cliente, n: númeroDoOrçamento,
            i: itens.map((i) => [i.descrição, i.quantidade, i.unitárioCentavos]),
            d: desconto, t: total, em: emitidoEm, va: válidoAté,
          });
          if (link.length > 4000) {
            avisar('O orçamento ficou grande demais para caber num link. Envie o PDF.');
            return;
          }
          const situação = await copiar(link);
          avisar(situação === 'copiado'
            ? 'Link copiado. Cole na conversa com o cliente.'
            : 'Seu navegador bloqueou a cópia. O link está na barra de endereço.');
          if (situação !== 'copiado') location.hash = link.split('#')[1];
        };

        return {
          valor: formatarMoeda(total / 100),
          resumo: `Orçamento nº ${númeroDoOrçamento} para ${cliente} · ${itens.length} item(ns)`
            + `${válidoAté ? ` · válido até ${válidoAté}` : ''}.`,
          linhas: [
            ['Subtotal', formatarMoeda(subtotal / 100)],
            ...(descontoCentavos > 0 ? [[`Desconto (${desconto}%)`, `− ${formatarMoeda(descontoCentavos / 100)}`]] : []),
            ['Total', formatarMoeda(total / 100)],
          ],
          tabela: {
            cabeçalho: ['Descrição', 'Qtd.', 'Unitário', 'Total'],
            linhas: linhasDaTabela,
            semExportação: true,
          },
          arquivos: [
            { rótulo: 'Baixar PDF', ícone: 'documento', gerar: gerarPdf },
            { rótulo: 'Baixar planilha', ícone: 'planilha', gerar: gerarPlanilha },
            { rótulo: 'Copiar link para o cliente', ícone: 'compartilhar', gerar: gerarLink },
          ],
          observações: [
            'Seus dados de emissor ficaram salvos neste navegador para o próximo orçamento.',
            'O orçamento é uma proposta de preço: não é documento fiscal nem contrato.',
          ],
        };
      },
    });
  },
};
