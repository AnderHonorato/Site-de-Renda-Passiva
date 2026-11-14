/** Recibo de pagamento em PDF, com valor por extenso. */
import { montarFerramenta, número, texto, comCampo, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { reaisPorExtenso } from '../cálculos/por-extenso.js';
import { emCentavos } from '../cálculos/dinheiro.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { gerarPdfRecibo } from '../comum/documentos/modelos-comerciais.js';
import { camposPersonalizacao, ligarPersonalizacao, lerPersonalizacao } from '../comum/documentos/personalizacao.js';

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
      texto: 'Com valor 1250,00 e "serviço de manutenção elétrica" como referência, o recibo sai assim: '
        + '"Recebi de Maria Souza a quantia de R$ 1.250,00 (mil duzentos e cinquenta reais), referente a '
        + 'serviço de manutenção elétrica." A data do fechamento é a que você escolher no campo Data.',
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
        { nome: 'identificação', rótulo: 'Número ou identificação do recibo (opcional)', exemplo: 'REC-2026-0042' },
        { nome: 'documentoRecebedor', rótulo: 'CPF ou CNPJ de quem recebeu', exemplo: '000.000.000-00' },
        { nome: 'pagador', rótulo: 'Quem pagou (nome completo)', exemplo: 'Maria Souza' },
        { nome: 'documentoPagador', rótulo: 'CPF ou CNPJ de quem pagou' },
        { nome: 'valor', rótulo: 'Valor (R$)', tipo: 'número', exemplo: '1250,00' },
        { nome: 'referência', rótulo: 'Referente a', tipo: 'área', linhas: 3, exemplo: 'Serviço de manutenção elétrica' },
        { nome: 'cidade', rótulo: 'Cidade', exemplo: 'São Paulo' },
        { nome: 'data', rótulo: 'Data', tipo: 'date', padrão: hoje() },
        { nome: 'duasVias', rótulo: 'Gerar em duas vias na mesma folha', tipo: 'caixa' },
        ...camposPersonalizacao,
      ],
      invalidarAoEditar: true,
      async calcular(dados) {
        const recebedor = texto(dados, 'recebedor', { rótulo: 'Quem recebeu', máximo: 120 });
        const pagador = texto(dados, 'pagador', { rótulo: 'Quem pagou', máximo: 120 });
        const identificação = texto(dados, 'identificação', { rótulo: 'Identificação do recibo', obrigatório: false, máximo: 40 });
        const referência = texto(dados, 'referência', { rótulo: 'A que se refere', máximo: 600 });
        const cidade = texto(dados, 'cidade', { rótulo: 'Cidade', máximo: 80 });
        const documentoRecebedor = texto(dados, 'documentoRecebedor', { rótulo: 'Documento de quem recebeu', obrigatório: false, máximo: 40 });
        const documentoPagador = texto(dados, 'documentoPagador', { rótulo: 'Documento de quem pagou', obrigatório: false, máximo: 40 });
        const valor = número(dados, 'valor', { rótulo: 'Valor', mín: 0.01 });
        const data = dados.data || hoje();

        const centavos = emCentavos(valor);
        if (!Number.isSafeInteger(centavos)) throw new ErroDeEntrada('O valor não cabe com precisão em centavos. Reduza o valor e tente novamente.', 'valor');
        const valorFormatado = formatarMoeda(centavos / 100);
        const extenso = comCampo('valor', () => reaisPorExtenso(centavos));
        const corpo = `Recebi de ${pagador}${documentoPagador ? `, inscrito(a) sob o nº ${documentoPagador},` : ''} `
          + `a quantia de ${valorFormatado} (${extenso}), referente a ${referência}. `
          + 'Para clareza, firmo o presente recibo, dando plena e geral quitação do valor acima.';

        const personalização = await lerPersonalizacao(raiz, dados, { marca: recebedor });
        const bytes = gerarPdfRecibo({
          identificação, recebedor, documentoRecebedor, pagador, documentoPagador,
          valorCentavos: centavos, valorExtenso: extenso, referência, cidade,
          data: formatarDataBr(data), duasVias: dados.duasVias === 'sim', ...personalização,
        });
        const nome = `${nomeDeArquivo(`recibo-${identificação || recebedor}`)}.pdf`;

        return {
          valor: valorFormatado,
          resumo: `${extenso}.`,
          texto: `${corpo}\n\n${cidade}, ${formatarDataBr(data)}.\n\n____________________________\n${recebedor}`,
          linhas: [
            ['Recebedor', recebedor],
            ['Pagador', pagador],
            ['Valor por extenso', extenso],
            ['Data', formatarDataBr(data)],
          ],
          previaPdf: { bytes, nome },
          arquivos: [{ rótulo: 'Baixar recibo em PDF', ícone: 'documento', gerar: () => baixar(bytes, nome, 'application/pdf') }],
          observações: ['O recibo é comprovante particular de pagamento e não substitui nota fiscal.'],
        };
      },
      aoMontar(raiz) {
        ligarPersonalizacao(raiz);
        const formulário = raiz.querySelector('#formulário');
        const ações = formulário.querySelector('.ações');
        const botão = document.createElement('button');
        botão.type = 'button'; botão.className = 'botão botão--linha'; botão.textContent = 'Preencher exemplo';
        botão.addEventListener('click', () => {
          const exemplo = {
            recebedor: 'João da Silva', identificação: 'REC-2026-0042', pagador: 'Maria Souza',
            valor: '1250,99', referência: 'Serviço de manutenção elétrica preventiva',
            cidade: 'São Paulo', data: hoje(), duasVias: 'sim',
          };
          for (const [nome, valor] of Object.entries(exemplo)) {
            const controle = formulário.querySelector(`[name="${CSS.escape(nome)}"]`);
            if (!controle) continue;
            if (controle.type === 'checkbox') controle.checked = valor === 'sim';
            else controle.value = valor;
            controle.dispatchEvent(new Event('input', { bubbles: true }));
            controle.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        ações.insertBefore(botão, ações.querySelector('[type="submit"]'));
      },
    });
  },
};
