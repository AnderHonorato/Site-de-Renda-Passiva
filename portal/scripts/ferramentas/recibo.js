/** Recibo de pagamento em PDF, com valor por extenso. */
import { montarFerramenta, número, texto, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { montarDocumentoPdf } from '../comum/documentos/montar-documento-pdf.js';
import { reaisPorExtenso } from '../cálculos/por-extenso.js';
import { emCentavos } from '../cálculos/dinheiro.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';

const hoje = () => new Date().toISOString().slice(0, 10);

function formatarDataBr(iso) {
  const [ano, mês, dia] = String(iso).split('-');
  return `${dia}/${mês}/${ano}`;
}

export default {
  instruções: {
    passos: [
      'Preencha quem recebeu e quem pagou. O documento e o endereço são opcionais, mas deixam o recibo mais completo.',
      'Informe o valor e a que se refere o pagamento.',
      'Escolha cidade e data: elas entram na linha de fechamento do documento.',
      'Marque "duas vias" se você quer uma cópia para cada parte na mesma folha.',
      'Baixe o PDF e assine. O valor por extenso já vem escrito.',
    ],
    exemplo: {
      texto: 'Recebi de Maria Souza a quantia de R$ 1.250,00 (mil duzentos e cinquenta reais) referente a '
        + 'serviço de manutenção elétrica. São Paulo, 19 de setembro de 2026.',
    },
    limites: 'O recibo é um comprovante particular de pagamento: ele não é documento fiscal e não substitui nota fiscal '
      + 'nem recolhe imposto. Para venda de mercadoria ou prestação de serviço sujeita a nota, procure seu contador. '
      + 'Nada é enviado a servidor: o PDF é montado dentro do seu navegador.',
    perguntas: [
      { p: 'Recibo substitui nota fiscal?', r: 'Não. O recibo prova que o pagamento aconteceu entre as partes. A nota fiscal é documento tributário e tem exigências próprias.' },
      { p: 'Preciso reconhecer firma?', r: 'Não por padrão. Reconhecer firma dá mais força de prova, e alguns casos específicos exigem, mas o recibo simples já vale entre as partes.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Gerar recibo',
      campos: [
        { nome: 'recebedor', rótulo: 'Quem recebeu (nome completo)', exemplo: 'João da Silva' },
        { nome: 'documentoRecebedor', rótulo: 'CPF ou CNPJ de quem recebeu', exemplo: '000.000.000-00' },
        { nome: 'pagador', rótulo: 'Quem pagou (nome completo)', exemplo: 'Maria Souza' },
        { nome: 'documentoPagador', rótulo: 'CPF ou CNPJ de quem pagou' },
        { nome: 'valor', rótulo: 'Valor (R$)', tipo: 'número', exemplo: '1250,00' },
        { nome: 'referência', rótulo: 'Referente a', tipo: 'área', linhas: 3, exemplo: 'Serviço de manutenção elétrica' },
        { nome: 'cidade', rótulo: 'Cidade', exemplo: 'São Paulo' },
        { nome: 'data', rótulo: 'Data', tipo: 'date', padrão: hoje() },
        { nome: 'duasVias', rótulo: 'Gerar em duas vias na mesma folha', tipo: 'caixa' },
      ],
      calcular(dados) {
        const recebedor = texto(dados, 'recebedor', { rótulo: 'Quem recebeu', máximo: 120 });
        const pagador = texto(dados, 'pagador', { rótulo: 'Quem pagou', máximo: 120 });
        const referência = texto(dados, 'referência', { rótulo: 'A que se refere', máximo: 600 });
        const cidade = texto(dados, 'cidade', { rótulo: 'Cidade', máximo: 80 });
        const documentoRecebedor = texto(dados, 'documentoRecebedor', { rótulo: 'Documento de quem recebeu', obrigatório: false, máximo: 40 });
        const documentoPagador = texto(dados, 'documentoPagador', { rótulo: 'Documento de quem pagou', obrigatório: false, máximo: 40 });
        const valor = número(dados, 'valor', { rótulo: 'Valor', mín: 0.01 });
        const data = dados.data || hoje();

        const centavos = emCentavos(valor);
        const extenso = reaisPorExtenso(centavos);
        const corpo = `Recebi de ${pagador}${documentoPagador ? `, inscrito(a) sob o nº ${documentoPagador},` : ''} `
          + `a quantia de ${formatarMoeda(valor)} (${extenso}), referente a ${referência}. `
          + 'Para clareza, firmo o presente recibo, dando plena e geral quitação do valor acima.';

        const gerarPdf = () => {
          const documento = montarDocumentoPdf({
            título: 'Recibo de pagamento',
            subtítulo: formatarMoeda(valor),
          });

          const escreverVia = (rótuloDaVia) => {
            if (rótuloDaVia) documento.seção(rótuloDaVia);
            documento.campo('Valor', formatarMoeda(valor));
            documento.campo('Recebedor', recebedor);
            if (documentoRecebedor) documento.campo('Documento', documentoRecebedor);
            documento.campo('Pagador', pagador);
            if (documentoPagador) documento.campo('Documento', documentoPagador);
            documento.espaço(4);
            documento.parágrafo(corpo, { tamanho: 10.5 });
            documento.espaço(4);
            documento.parágrafo(`${cidade}, ${formatarDataBr(data)}.`, { tamanho: 10 });
            documento.assinatura(recebedor);
          };

          escreverVia(dados.duasVias === 'sim' ? '1ª via — recebedor' : '');
          if (dados.duasVias === 'sim') {
            documento.espaço(6);
            escreverVia('2ª via — pagador');
          }

          baixar(documento.gerarBytes(), `${nomeDeArquivo(`recibo-${recebedor}`)}.pdf`, 'application/pdf');
        };

        return {
          valor: formatarMoeda(valor),
          resumo: `${extenso}.`,
          texto: `${corpo}\n\n${cidade}, ${formatarDataBr(data)}.\n\n____________________________\n${recebedor}`,
          linhas: [
            ['Recebedor', recebedor],
            ['Pagador', pagador],
            ['Valor por extenso', extenso],
            ['Data', formatarDataBr(data)],
          ],
          arquivos: [{ rótulo: 'Baixar recibo em PDF', ícone: 'documento', gerar: gerarPdf }],
          observações: ['O recibo é comprovante particular de pagamento e não substitui nota fiscal.'],
        };
      },
    });
  },
};
