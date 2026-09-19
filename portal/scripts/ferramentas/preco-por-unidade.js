/** Comparador de embalagens pelo custo da unidade base. */
import { montarFerramenta, número, ErroDeEntrada } from '../núcleo/montador.js';
import { preçoPorUnidade, emCentavos } from '../cálculos/dinheiro.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

const UNIDADES = [
  { valor: 'g', rótulo: 'gramas', fator: 1, base: '100 g', porBase: 100 },
  { valor: 'kg', rótulo: 'quilos', fator: 1000, base: '100 g', porBase: 100 },
  { valor: 'ml', rótulo: 'mililitros', fator: 1, base: '100 ml', porBase: 100 },
  { valor: 'l', rótulo: 'litros', fator: 1000, base: '100 ml', porBase: 100 },
  { valor: 'un', rótulo: 'unidades', fator: 1, base: 'unidade', porBase: 1 },
  { valor: 'm', rótulo: 'metros', fator: 1, base: 'metro', porBase: 1 },
];

export default {
  instruções: {
    passos: [
      'Preencha preço e quantidade de cada embalagem que você está comparando.',
      'Escolha a unidade de cada uma. Pode misturar gramas e quilos: a conversão é feita para você.',
      'Deixe em branco as opções que não vai usar. Duas já bastam.',
      'Toque em Comparar. A mais barata aparece primeiro, com quanto as outras custam a mais.',
    ],
    exemplo: {
      texto: 'Pacote de 500 g por R$ 12,90 contra pacote de 1 kg por R$ 22,50: o de 1 kg sai por R$ 2,25 a cada 100 g, '
        + 'contra R$ 2,58 do menor. O maior é 12,8% mais barato por grama.',
    },
    limites: 'A comparação é só de preço por quantidade. Ela não considera validade, desperdício nem espaço de armazenamento: '
      + 'a embalagem maior só compensa de verdade se você consumir tudo antes de vencer.',
    perguntas: [
      { p: 'Posso comparar gramas com quilos?', r: 'Sim. Escolha a unidade correta em cada linha e a ferramenta converte tudo para a mesma base antes de comparar.' },
      { p: 'Posso comparar peso com volume?', r: 'Não. Um quilo e um litro não são a mesma grandeza, então a ferramenta recusa a comparação em vez de devolver um número sem sentido.' },
    ],
  },

  montar(raiz, ferramenta) {
    const campos = [];
    for (let i = 1; i <= 4; i += 1) {
      campos.push(
        { nome: `preço${i}`, rótulo: `Opção ${i} · preço (R$)`, tipo: 'número', exemplo: i === 1 ? '12,90' : '' },
        { nome: `qtd${i}`, rótulo: `Opção ${i} · quantidade`, tipo: 'número', exemplo: i === 1 ? '500' : '' },
        { nome: `un${i}`, rótulo: `Opção ${i} · unidade`, tipo: 'seleção', opções: UNIDADES, padrão: 'g' },
      );
    }

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Comparar',
      campos,
      calcular(dados) {
        const opções = [];
        for (let i = 1; i <= 4; i += 1) {
          const preçoBruto = String(dados[`preço${i}`] ?? '').trim();
          const quantidadeBruta = String(dados[`qtd${i}`] ?? '').trim();
          if (!preçoBruto && !quantidadeBruta) continue;
          const preço = número(dados, `preço${i}`, { rótulo: `Preço da opção ${i}`, mín: 0 });
          const quantidade = número(dados, `qtd${i}`, { rótulo: `Quantidade da opção ${i}`, mín: 0.0001 });
          const unidade = UNIDADES.find((u) => u.valor === dados[`un${i}`]) ?? UNIDADES[0];
          opções.push({
            nome: `Opção ${i} · ${formatarNúmero(quantidade, { casas: 2 })} ${unidade.valor}`,
            preçoCentavos: emCentavos(preço),
            quantidade,
            fator: unidade.fator / unidade.porBase,
            base: unidade.base,
          });
        }

        if (opções.length < 2) {
          throw new ErroDeEntrada('Preencha pelo menos duas opções para comparar.', 'preço2');
        }
        if (new Set(opções.map((o) => o.base)).size > 1) {
          throw new ErroDeEntrada('Todas as opções precisam usar a mesma grandeza: peso, volume, unidade ou comprimento.', 'un2');
        }

        const { ordenadas, melhor } = preçoPorUnidade(opções);
        const { base } = opções[0];

        return {
          valor: `${melhor} é a mais barata`,
          resumo: `${formatarMoeda(ordenadas[0].porBaseCentavos / 100)} por ${base}.`,
          tabela: {
            cabeçalho: ['Opção', `Preço por ${base}`, 'Mais cara em'],
            linhas: ordenadas.map((o, i) => [
              o.nome,
              formatarMoeda(o.porBaseCentavos / 100),
              i === 0 ? '—' : `${formatarNúmero(o.economia, { casas: 1 })}%`,
            ]),
          },
          observações: ['A comparação considera apenas preço e quantidade, não validade nem desperdício.'],
        };
      },
    });
  },
};
