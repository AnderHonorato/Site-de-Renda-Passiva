/** Área de paredes e teto, descontando portas e janelas. */
import { montarFerramenta, ErroDeEntrada } from '../núcleo/montador.js';
import { áreaDeSuperfícies } from '../cálculos/obra.js';
import { paraNúmero } from '../núcleo/texto.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

/**
 * Lê linhas no formato "nome; largura; altura; quantidade".
 * @param {string} valor
 * @param {string} campo nome do campo, para apontar o erro no lugar certo
 * @param {boolean} obrigatório
 */
function lerSuperfícies(valor, campo, obrigatório) {
  const linhas = String(valor ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (linhas.length === 0) {
    if (obrigatório) throw new ErroDeEntrada('Informe pelo menos uma superfície.', campo);
    return [];
  }
  if (linhas.length > 60) throw new ErroDeEntrada('Limite de 60 linhas.', campo);

  return linhas.map((linha, índice) => {
    const partes = linha.split(/\s*[;|]\s*/).map((p) => p.trim());
    if (partes.length < 3) {
      throw new ErroDeEntrada(
        `A linha ${índice + 1} precisa ter nome, largura e altura. Exemplo: Parede norte; 4; 2,70`,
        campo,
      );
    }
    const [nome, larguraBruta, alturaBruta, quantidadeBruta = '1'] = partes;
    const largura = paraNúmero(larguraBruta);
    const altura = paraNúmero(alturaBruta);
    const quantidade = paraNúmero(quantidadeBruta);
    if (!Number.isFinite(largura) || largura <= 0) throw new ErroDeEntrada(`Largura inválida na linha ${índice + 1}.`, campo);
    if (!Number.isFinite(altura) || altura <= 0) throw new ErroDeEntrada(`Altura inválida na linha ${índice + 1}.`, campo);
    if (!Number.isInteger(quantidade) || quantidade < 1) throw new ErroDeEntrada(`Quantidade inválida na linha ${índice + 1}.`, campo);
    return { nome: nome || `Superfície ${índice + 1}`, largura, altura, quantidade };
  });
}

export default {
  instruções: {
    passos: [
      'Escreva uma superfície por linha: nome; largura; altura. Acrescente a quantidade quando forem iguais.',
      'Para incluir o teto, some-o como mais uma linha com as medidas do piso.',
      'Liste portas e janelas no segundo campo, no mesmo formato.',
      'A área líquida é a que você leva para a calculadora de tinta ou de revestimento.',
    ],
    exemplo: {
      texto: 'Parede norte; 4; 2,70\nParede sul; 4; 2,70\nParede leste; 3; 2,70\nParede oeste; 3; 2,70\n\n'
        + 'Com uma porta de 0,80 × 2,10 e uma janela de 1,20 × 1,00: 37,80 m² brutos, 2,88 m² de aberturas, 34,92 m² líquidos.',
    },
    limites: 'As medidas são em metros e a área sai em metros quadrados. A ferramenta soma o que você informar: '
      + 'ela não conhece a planta da sua casa e não adivinha o teto. Se as aberturas somarem mais que as paredes, '
      + 'ela recusa em vez de devolver área negativa.',
    perguntas: [
      { p: 'Desconto portas e janelas ao pintar?', r: 'Para orçar tinta, sim: você não pinta o vão. Para orçar revestimento de parede, também. Em superfícies pequenas o desconto muda pouco, mas em ambiente com muita janela faz diferença de litros.' },
      { p: 'Como incluo o teto?', r: 'Some uma linha com a largura e o comprimento do cômodo. O teto tem a mesma área do piso.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular área',
      campos: [
        {
          nome: 'superfícies', rótulo: 'Paredes e tetos', tipo: 'área', linhas: 6,
          padrão: 'Parede norte; 4; 2,70\nParede sul; 4; 2,70\nParede leste; 3; 2,70\nParede oeste; 3; 2,70',
          dica: 'nome; largura; altura; quantidade (a quantidade é opcional)',
        },
        {
          nome: 'aberturas', rótulo: 'Portas e janelas a descontar', tipo: 'área', linhas: 3,
          padrão: 'Porta; 0,80; 2,10\nJanela; 1,20; 1,00',
          dica: 'Mesmo formato. Deixe em branco se não houver.',
        },
      ],
      calcular(dados) {
        const superfícies = lerSuperfícies(dados.superfícies, 'superfícies', true);
        const aberturas = lerSuperfícies(dados.aberturas, 'aberturas', false);
        const r = áreaDeSuperfícies(superfícies, aberturas);
        const m2 = (v) => `${formatarNúmero(v, { casas: 2 })} m²`;

        return {
          valor: m2(r.áreaLíquida),
          resumo: `${superfícies.length} superfície(s), ${aberturas.length} abertura(s) descontada(s).`,
          linhas: [
            ['Área bruta', m2(r.áreaBruta)],
            ['Aberturas descontadas', m2(r.áreaDeAberturas)],
            ['Área líquida', m2(r.áreaLíquida)],
          ],
          tabela: {
            cabeçalho: ['Superfície', 'Área'],
            linhas: r.detalhe.map((d) => [d.nome, formatarNúmero(d.área, { casas: 2 })]),
          },
          observações: ['Leve a área líquida para a calculadora de tinta ou para o piso por caixa.'],
        };
      },
    });
  },
};
