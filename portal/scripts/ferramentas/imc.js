/** IMC e faixa de peso: referência da OMS para adultos, com os limites do índice à vista. */
import { montarFerramenta, número, ErroDeEntrada } from '../núcleo/montador.js';
import { calcularImc, ErroDeImc, FAIXAS, LIMITES } from '../cálculos/imc.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

/** Aviso que fica na tela antes mesmo do cálculo: o IMC não vale para todo mundo. */
export const AVISO_DE_USO = 'Referência para adultos, não é diagnóstico. '
  + 'Não vale para menores de 18 anos, gestantes nem atletas de muita massa muscular.';

const AVISO_DO_RESULTADO = 'Referência da OMS para adultos (18 anos ou mais). Não é diagnóstico e não substitui '
  + 'a avaliação de um profissional de saúde.';

const AVISO_DOS_LIMITES = 'O IMC não separa músculo de gordura nem mostra onde a gordura está. Por isso pode enganar '
  + 'em atletas, gestantes, idosos e em crianças e adolescentes, que usam curvas próprias por idade.';

const kg = (valor) => `${formatarNúmero(valor, { casas: 2 })} kg`;
const umaCasa = (valor) => formatarNúmero(valor, { casas: 1, casasMínimas: 1 });
const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * Lê o formulário, calcula e monta o que a tela e o texto copiado mostram.
 * Exportada para os testes conferirem a tela sem navegador.
 * @param {Record<string, string>} dados valores do formulário, como digitados
 */
export function calcularImcNaTela(dados) {
  // A leitura só garante "é um número"; a faixa válida (e a mensagem) é do cálculo.
  const pesoKg = número(dados, 'pesoKg', { rótulo: 'Peso (kg)' });
  const alturaCm = número(dados, 'alturaCm', { rótulo: 'Altura (cm)' });

  let r;
  try {
    r = calcularImc({ pesoKg, alturaCm });
  } catch (erro) {
    if (erro instanceof ErroDeImc) throw new ErroDeEntrada(erro.message, erro.campo);
    throw erro;
  }

  const faixa = capitalizar(r.faixa);
  const intervalo = `${umaCasa(r.pesoMínimoNormal)} a ${umaCasa(r.pesoMáximoNormal)} kg`;
  const altura = `${formatarNúmero(r.alturaCm, { casas: 2 })} cm`;
  const peso = kg(r.pesoKg);

  const texto = [
    `IMC ${umaCasa(r.imc)} (${r.faixa})`,
    `Peso: ${peso} · Altura: ${altura}`,
    `Faixa de peso normal para ${altura}: ${intervalo}`,
    AVISO_DO_RESULTADO,
  ].join('\n');

  return {
    valor: `IMC ${umaCasa(r.imc)}`,
    resumo: `Faixa: ${r.faixa}.`,
    linhas: [
      ['IMC', `${umaCasa(r.imc)} kg/m²`],
      ['Faixa', faixa],
      [`Peso normal para ${altura}`, intervalo],
      ['Peso informado', peso],
      ['Altura informada', altura],
    ],
    // `semExportação`: a tabela é referência de leitura, e o que se copia é o resumo acima.
    tabela: {
      cabeçalho: ['Faixa', 'IMC', 'Você'],
      linhas: FAIXAS.map((f) => [capitalizar(f.faixa), f.intervalo, f.id === r.faixaId ? 'está aqui' : '']),
      semExportação: true,
    },
    observações: [AVISO_DO_RESULTADO, AVISO_DOS_LIMITES],
    texto,
  };
}

export default {
  instruções: {
    passos: [
      'Digite o peso em quilos e a altura em centímetros (175, e não 1,75). Pode usar vírgula nos decimais.',
      'Toque em Calcular. A ferramenta divide o peso pela altura ao quadrado e mostra o IMC com uma casa decimal.',
      'Veja a faixa em que o IMC cai e o intervalo de peso que corresponde à faixa de peso normal para a sua altura.',
      'Use Copiar para levar o resumo, já com o aviso de uso.',
    ],
    exemplo: {
      texto: 'Peso de 70 kg e altura de 175 cm: o IMC é 70 ÷ 1,75² = 22,9, que cai na faixa de peso normal. '
        + 'Para 175 cm, a faixa de peso normal vai de 56,7 a 76,3 kg.',
    },
    limites: 'É uma referência, não um diagnóstico, e não substitui a avaliação de um profissional de saúde. '
      + 'As faixas são as da OMS para adultos (18 anos ou mais): abaixo de 18,5, abaixo do peso; de 18,5 a 24,9, peso normal; '
      + 'de 25 a 29,9, sobrepeso; de 30 a 34,9, obesidade grau I; de 35 a 39,9, grau II; a partir de 40, grau III. '
      + 'O IMC não vale para menores de 18 anos, nem para gestantes, e engana em atletas de muita massa muscular, '
      + 'porque não separa músculo de gordura. Em pessoas idosas, os serviços de saúde costumam usar faixas diferentes. '
      + 'A faixa é decidida pelo IMC já arredondado em uma casa decimal, o mesmo número que aparece na tela. '
      + `São aceitos pesos de ${LIMITES.pesoMínKg} a ${LIMITES.pesoMáxKg} kg e alturas de ${LIMITES.alturaMínCm} a ${LIMITES.alturaMáxCm} cm. `
      + 'Os dados ficam no seu navegador e não são enviados nem guardados.',
    perguntas: [
      { p: 'O IMC serve para crianças e adolescentes?', r: 'Não com estas faixas. Até os 18 anos, a avaliação compara o IMC com curvas por idade e sexo, e quem interpreta é o pediatra ou o profissional de saúde.' },
      { p: 'Pratico musculação. Posso confiar no resultado?', r: 'Com cautela. O IMC só enxerga peso e altura: quem tem muita massa muscular pode ficar na faixa de sobrepeso sem ter excesso de gordura. Converse com um profissional sobre outras medidas.' },
      { p: 'Estou grávida. Como interpretar?', r: 'Esta ferramenta não se aplica a gestantes. O ganho de peso na gravidez é acompanhado pela equipe de saúde, com referências próprias.' },
      { p: 'Por que a faixa normal termina em 24,9 e não em 25?', r: 'Porque 25,0 já é sobrepeso pelo corte da OMS. O peso máximo mostrado é o que dá exatamente 24,9 para a sua altura.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      campos: [
        {
          nome: 'pesoKg', rótulo: 'Peso (kg)', tipo: 'número', exemplo: '70',
          dica: `De ${LIMITES.pesoMínKg} a ${LIMITES.pesoMáxKg} kg.`,
        },
        {
          nome: 'alturaCm', rótulo: 'Altura (cm)', tipo: 'número', exemplo: '175',
          dica: `Em centímetros, de ${LIMITES.alturaMínCm} a ${LIMITES.alturaMáxCm}. Digite 175, e não 1,75.`,
        },
      ],
      calcular: calcularImcNaTela,
      aoMontar(elemento) {
        // O aviso vem antes do formulário: quem só quer "o número" ainda lê os limites do índice.
        const aviso = document.createElement('p');
        aviso.className = 'pequeno suave';
        aviso.setAttribute('role', 'note');
        const destaque = document.createElement('b');
        destaque.textContent = 'Atenção: ';
        aviso.append(destaque, AVISO_DE_USO);
        elemento.prepend(aviso);
      },
    });
  },
};
