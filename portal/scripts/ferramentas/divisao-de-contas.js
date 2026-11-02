/** Divisão de contas de um grupo, com o menor número de transferências. */
import { montarFerramenta, ErroDeEntrada } from '../núcleo/montador.js';
import { divisãoDeContas, emCentavos } from '../cálculos/dinheiro.js';
import { paraNúmero } from '../núcleo/texto.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';

/**
 * Lê as linhas "nome = valor" ou "nome; valor" escritas pela pessoa.
 * @param {string} texto
 * @returns {{nome: string, pagouCentavos: number, peso: number}[]}
 */
function lerParticipantes(texto) {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (linhas.length < 2) {
    throw new ErroDeEntrada('Escreva pelo menos duas pessoas, uma por linha.', 'pessoas');
  }
  if (linhas.length > 60) {
    throw new ErroDeEntrada('Limite de 60 pessoas por divisão.', 'pessoas');
  }

  const nomes = new Set();
  return linhas.map((linha, índice) => {
    const partes = linha.split(/\s*[=;|]\s*|\s{2,}/);
    const nome = (partes[0] ?? '').trim();
    if (!nome) throw new ErroDeEntrada(`A linha ${índice + 1} está sem nome.`, 'pessoas');
    if (nomes.has(nome.toLowerCase())) {
      throw new ErroDeEntrada(`O nome "${nome}" aparece duas vezes. Use nomes diferentes.`, 'pessoas');
    }
    nomes.add(nome.toLowerCase());

    const pagou = partes.length > 1 ? paraNúmero(partes[1]) : 0;
    if (partes.length > 1 && !Number.isFinite(pagou)) {
      throw new ErroDeEntrada(`Não entendi o valor de "${nome}". Escreva assim: ${nome} = 120,50`, 'pessoas');
    }
    if (pagou < 0) throw new ErroDeEntrada(`O valor de "${nome}" não pode ser negativo.`, 'pessoas');

    const peso = partes.length > 2 ? paraNúmero(partes[2]) : 1;
    if (!Number.isFinite(peso) || peso <= 0) {
      throw new ErroDeEntrada(`O peso de "${nome}" precisa ser um número maior que zero.`, 'pessoas');
    }

    return { nome, pagouCentavos: emCentavos(pagou), peso };
  });
}

export default {
  instruções: {
    passos: [
      'Escreva uma pessoa por linha, no formato "nome = quanto pagou".',
      'Quem não pagou nada entra só com o nome.',
      'Para dividir em partes desiguais, acrescente o peso: "Ana = 120 = 2" conta a Ana como duas cotas.',
      'Toque em Dividir. Você recebe o saldo de cada um e a lista de quem paga para quem.',
    ],
    exemplo: {
      texto: 'Ana = 300\nBruno = 90\nCarla\n\nTotal de R$ 390,00 para três pessoas: R$ 130,00 cada. '
        + 'Carla paga R$ 130,00 para a Ana e o Bruno paga R$ 40,00 para a Ana. Dois acertos resolvem.',
    },
    limites: 'Os acertos são reduzidos ao mínimo prático: o maior credor recebe do maior devedor até zerar. '
      + 'Centavos de arredondamento vão para a última pessoa da lista, de modo que a soma sempre fecha exatamente com o total.',
    perguntas: [
      { p: 'Posso dividir em partes desiguais?', r: 'Sim. Use o terceiro campo como peso. Um casal que conta como duas cotas recebe peso 2.' },
      { p: 'Os nomes ficam salvos em algum lugar?', r: 'Não. Nada sai do seu navegador, e a ferramenta não guarda a lista depois que você fecha a página.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Dividir',
      campos: [
        {
          nome: 'pessoas', rótulo: 'Quem participou e quanto pagou', tipo: 'área', linhas: 8,
          padrão: 'Ana = 300\nBruno = 90\nCarla',
          dica: 'Uma pessoa por linha: nome = valor pago = peso (peso é opcional).',
        },
      ],
      calcular(dados) {
        const participantes = lerParticipantes(String(dados.pessoas ?? ''));
        const r = divisãoDeContas(participantes);

        const acertos = r.acertos.length === 0
          ? ['Ninguém deve nada: todo mundo já pagou a parte certa.']
          : r.acertos.map((a) => `${a.de} paga ${formatarMoeda(a.valorCentavos / 100)} para ${a.para}`);

        return {
          valor: formatarMoeda(r.totalCentavos / 100),
          resumo: `Total gasto pelo grupo, dividido entre ${r.saldos.length} pessoas.`,
          texto: `Total: ${formatarMoeda(r.totalCentavos / 100)}\n\n${acertos.join('\n')}`,
          linhas: acertos.map((a) => [a, '']),
          tabela: {
            cabeçalho: ['Pessoa', 'Pagou', 'Deveria pagar', 'Saldo'],
            linhas: r.saldos.map((s) => [
              s.nome,
              formatarMoeda(participantes.find((p) => p.nome === s.nome).pagouCentavos / 100),
              formatarMoeda(s.deveriaPagarCentavos / 100),
              `${s.saldoCentavos > 0 ? 'recebe ' : s.saldoCentavos < 0 ? 'paga ' : ''}${formatarMoeda(Math.abs(s.saldoCentavos) / 100)}`,
            ]),
          },
          observações: ['Saldo positivo significa que a pessoa pagou a mais e tem a receber.'],
        };
      },
    });
  },
};
