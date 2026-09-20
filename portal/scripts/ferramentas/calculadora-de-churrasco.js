/** Quantidades de comida e bebida para churrasco ou almoço. */
import { montarFerramenta, número, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { quantidadesDoEvento } from '../cálculos/produção.js';
import { montarDocumentoPdf } from '../comum/documentos/montar-documento-pdf.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';

/** Mostra gramas como quilos quando o número fica grande demais para ler. */
function apresentar(quantidade, unidade) {
  if (unidade === 'g' && quantidade >= 1000) return `${formatarNúmero(quantidade / 1000, { casas: 2 })} kg`;
  if (unidade === 'ml' && quantidade >= 1000) return `${formatarNúmero(quantidade / 1000, { casas: 2 })} L`;
  if (unidade === 'un') return `${formatarNúmero(Math.ceil(quantidade), { casas: 0 })} un`;
  return `${formatarNúmero(quantidade, { casas: 0 })} ${unidade}`;
}

export default {
  instruções: {
    passos: [
      'Escolha entre churrasco e almoço: os itens e as quantidades por pessoa mudam.',
      'Informe quantos adultos e quantas crianças, e quantas horas o evento vai durar.',
      'Diga quantos adultos realmente bebem álcool. Só esse número entra na conta de cerveja.',
      'Ajuste o apetite se o seu grupo come mais ou menos que a média.',
      'Baixe a lista em PDF para levar ao mercado.',
    ],
    exemplo: {
      texto: '10 adultos, 4 crianças, 5 horas, 6 adultos bebendo: 3,48 kg de carne bovina, 1,44 kg de linguiça, '
        + '15 L de cerveja e 8 L de refrigerante.',
    },
    limites: 'As quantidades por pessoa são premissas, e elas aparecem escritas junto do resultado — '
      + 'não é um número mágico. Grupo com muitos homens adultos ou churrasco que começa cedo consome mais: '
      + 'suba o apetite. Crianças não entram em nenhuma conta de bebida alcoólica. '
      + 'A lista é de quantidade, não de preço.',
    perguntas: [
      { p: 'Por que perguntar quantos bebem, e não só quantos adultos?', r: 'Porque calcular cerveja para todo adulto presente é o jeito mais rápido de sobrar caixa fechada. Quem não bebe entra só nas bebidas sem álcool.' },
      { p: '300 g de carne por pessoa não é pouco?', r: 'É a média quando há linguiça, frango e acompanhamentos. Se o churrasco for só de carne bovina, suba o apetite para 130% ou 150%.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Calcular quantidades',
      campos: [
        {
          nome: 'tipo', rótulo: 'Tipo de evento', tipo: 'seleção', padrão: 'churrasco',
          opções: [
            { valor: 'churrasco', rótulo: 'Churrasco' },
            { valor: 'almoço', rótulo: 'Almoço ou encontro' },
          ],
        },
        { nome: 'adultos', rótulo: 'Adultos', tipo: 'número', padrão: '10' },
        { nome: 'crianças', rótulo: 'Crianças', tipo: 'número', padrão: '4' },
        { nome: 'horas', rótulo: 'Duração (horas)', tipo: 'número', padrão: '5' },
        { nome: 'bebem', rótulo: 'Adultos que bebem álcool', tipo: 'número', padrão: '6' },
        { nome: 'apetite', rótulo: 'Apetite do grupo (%)', tipo: 'número', padrão: '100', dica: '100% é a média. Suba para grupo que come mais.' },
      ],
      calcular(dados) {
        const adultos = número(dados, 'adultos', { rótulo: 'Adultos', mín: 0, máx: 2000, inteiro: true });
        const crianças = número(dados, 'crianças', { rótulo: 'Crianças', mín: 0, máx: 2000, inteiro: true });
        const horas = número(dados, 'horas', { rótulo: 'Duração', mín: 1, máx: 24 });
        const bebem = número(dados, 'bebem', { rótulo: 'Adultos que bebem', mín: 0, máx: 2000, inteiro: true });
        const apetite = número(dados, 'apetite', { rótulo: 'Apetite', mín: 50, máx: 200 });

        const r = quantidadesDoEvento({
          adultos, crianças, horas, adultosQueBebem: bebem, apetite, tipo: dados.tipo,
        });

        const tudo = [
          ...r.comida.map((i) => ({ ...i, grupo: 'Comida' })),
          ...r.bebidas.map((i) => ({ ...i, grupo: 'Bebida' })),
        ];

        const gerarPdf = () => {
          const documento = montarDocumentoPdf({
            título: dados.tipo === 'churrasco' ? 'Lista do churrasco' : 'Lista do almoço',
            subtítulo: `${adultos + crianças} pessoas`,
          });
          documento.seção('Premissas');
          for (const premissa of r.premissas) documento.parágrafo(premissa, { tamanho: 9, espaço: 0 });
          documento.espaço(4);
          documento.seção('Lista de compras');
          documento.tabela(
            ['Item', 'Quantidade'],
            tudo.map((i) => [i.nome, apresentar(i.quantidade, i.unidade)]),
            [70, 30],
          );
          documento.espaço(4);
          documento.parágrafo('Quantidades estimadas a partir de consumo médio por pessoa. Ajuste ao seu grupo.',
            { tamanho: 8.5, cor: '#6d5d55' });
          baixar(documento.gerarBytes(), `${nomeDeArquivo(`lista-${dados.tipo}`)}.pdf`, 'application/pdf');
        };

        return {
          valor: `${adultos + crianças} pessoas`,
          resumo: `${adultos} adulto(s), ${crianças} criança(s), ${formatarNúmero(horas, { casas: 0 })} hora(s).`,
          texto: tudo.map((i) => `${i.nome}: ${apresentar(i.quantidade, i.unidade)}`).join('\n'),
          tabela: {
            cabeçalho: ['Item', 'Quantidade', 'Grupo'],
            linhas: tudo.map((i) => [i.nome, apresentar(i.quantidade, i.unidade), i.grupo]),
          },
          arquivos: [{ rótulo: 'Baixar lista em PDF', ícone: 'documento', gerar: gerarPdf }],
          observações: r.premissas,
        };
      },
    });
  },
};
