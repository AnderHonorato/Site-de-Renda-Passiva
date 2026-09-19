/** Conversor de unidades de oito grandezas, incluindo temperatura. */
import { montarFerramenta, número } from '../núcleo/montador.js';
import { GRANDEZAS, UNIDADES_DE_TEMPERATURA, converter } from '../cálculos/medidas.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

const GRANDEZAS_LISTA = [
  ...Object.entries(GRANDEZAS).map(([id, g]) => ({ valor: id, rótulo: g.nome })),
  { valor: 'temperatura', rótulo: 'Temperatura' },
];

/** Opções de unidade de uma grandeza, no formato do seletor. */
function unidadesDe(grandeza) {
  if (grandeza === 'temperatura') {
    return Object.entries(UNIDADES_DE_TEMPERATURA).map(([id, u]) => ({ valor: id, rótulo: u.nome }));
  }
  return Object.entries(GRANDEZAS[grandeza].unidades).map(([id, u]) => ({ valor: id, rótulo: `${u.nome} (${id})` }));
}

/** Números muito grandes ou muito pequenos ficam ilegíveis com casas fixas. */
function apresentar(valor) {
  const absoluto = Math.abs(valor);
  if (absoluto !== 0 && (absoluto < 0.0001 || absoluto >= 1e12)) return valor.toExponential(4);
  if (absoluto >= 1000) return formatarNúmero(valor, { casas: 2 });
  return formatarNúmero(valor, { casas: 6, casasMínimas: 0 });
}

export default {
  instruções: {
    passos: [
      'Escolha a grandeza: comprimento, massa, volume, área, tempo, velocidade, dados digitais ou temperatura.',
      'Escolha a unidade de origem e a de destino. As listas mudam junto com a grandeza.',
      'Digite o valor. O resultado aparece com as equivalências mais usadas da mesma grandeza.',
    ],
    exemplo: { texto: '2,5 quilos em libras: 5,511557 lb. A tabela abaixo mostra o mesmo valor em gramas, onças e arrobas.' },
    limites: 'As conversões de cozinha usam as medidas mais comuns no Brasil: xícara de 240 ml, colher de sopa de 15 ml e colher de chá de 5 ml. '
      + 'Xícaras de receita variam entre países, então confira a referência da sua receita. '
      + 'Em dados digitais, KB vale 1000 bytes e KiB vale 1024, como manda o padrão.',
    perguntas: [
      { p: 'Por que meu HD de 1 TB aparece com menos espaço no computador?', r: 'Porque o fabricante conta 1 TB como um trilhão de bytes e o sistema conta em TiB, que usa 1024. Converta de TB para TiB aqui e você verá a diferença exata.' },
      { p: 'Posso converter quilo em litro?', r: 'Não diretamente: peso e volume só se relacionam pela densidade do material, que muda de produto para produto.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Converter',
      campos: [
        { nome: 'grandeza', rótulo: 'Grandeza', tipo: 'seleção', opções: GRANDEZAS_LISTA, padrão: 'massa' },
        { nome: 'valor', rótulo: 'Valor', tipo: 'número', exemplo: '2,5' },
        { nome: 'de', rótulo: 'De', tipo: 'seleção', opções: unidadesDe('massa'), padrão: 'kg' },
        { nome: 'para', rótulo: 'Para', tipo: 'seleção', opções: unidadesDe('massa'), padrão: 'g' },
      ],
      calcular(dados) {
        const valor = número(dados, 'valor', { rótulo: 'Valor' });
        const { grandeza, de, para } = dados;
        const resultado = converter(valor, grandeza, de, para);

        const equivalências = grandeza === 'temperatura'
          ? Object.keys(UNIDADES_DE_TEMPERATURA)
          : Object.keys(GRANDEZAS[grandeza].unidades);

        return {
          valor: `${apresentar(resultado)} ${para}`,
          resumo: `${formatarNúmero(valor, { casas: 6, casasMínimas: 0 })} ${de} convertido.`,
          texto: `${valor} ${de} = ${apresentar(resultado)} ${para}`,
          tabela: {
            cabeçalho: ['Unidade', 'Valor equivalente'],
            linhas: equivalências
              .filter((u) => u !== de)
              .map((u) => [u, apresentar(converter(valor, grandeza, de, u))]),
          },
        };
      },
      aoMontar(elemento, recalcular) {
        // As listas de unidade acompanham a grandeza escolhida.
        const grandeza = elemento.querySelector('#campo-grandeza');
        const deSeleção = elemento.querySelector('#campo-de');
        const paraSeleção = elemento.querySelector('#campo-para');

        const preencher = () => {
          const unidades = unidadesDe(grandeza.value);
          for (const seleção of [deSeleção, paraSeleção]) {
            seleção.innerHTML = unidades
              .map((u) => `<option value="${u.valor}">${u.rótulo}</option>`).join('');
          }
          deSeleção.selectedIndex = 0;
          paraSeleção.selectedIndex = Math.min(1, unidades.length - 1);
        };

        grandeza.addEventListener('change', () => { preencher(); recalcular(); });

        // Botão para inverter origem e destino, que é o gesto mais comum aqui.
        const inverter = document.createElement('button');
        inverter.type = 'button';
        inverter.className = 'botão botão--linha';
        inverter.textContent = 'Inverter unidades';
        inverter.addEventListener('click', () => {
          const guardado = deSeleção.value;
          deSeleção.value = paraSeleção.value;
          paraSeleção.value = guardado;
          recalcular();
        });
        elemento.querySelector('.ações')?.append(inverter);
      },
    });
  },
};
