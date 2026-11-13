// portal/vitrine/vitrine-textos.js
// Textos da vitrine. As chaves precisam existir nos dois idiomas.
// O nome do site vem de dados/site.js e os números, de vitrine-números.js (gerado por
// ferramentas/gerar.mjs a partir do catálogo). Nada disso é escrito à mão aqui.
import { site } from '../dados/site.js';
import { números } from './vitrine-números.js';

export const textos = {
  'pt-BR': {
    descrição: `Animação do portal ${site.nome}: ${números.prontas} ferramentas prontas, sendo ${números.gratuitas} gratuitas e ${números.plus + números.premium} dos planos Plus e Premium.`,
    pausar: 'Pausar animação',
    tocar: 'Tocar animação',
    número: String(números.prontas),
    ferramentas: 'ferramentas prontas',
    anotaçãoGrátis: `${números.gratuitas} grátis · ${números.plus + números.premium} Plus e Premium`,
    tituloÁreas: 'Uma busca só para tudo.',
    áreas: ['Receitas e preços', 'Contas do dia a dia', 'Artesanato', 'Churrasco e festas', 'Pintura e reforma', 'Orçamento e recibo'],
    contaEducação: '7 × 8 = 56',
    áreaDaFerramenta: 'Receitas e preços',
    nomeDaFerramenta: 'Preço de venda',
    campoCusto: 'Custo do lote',
    valorCusto: 'R$ 42,00',
    campoMargem: 'Margem desejada',
    valorMargem: '40%',
    botão: 'Calcular preço',
    linhaCusto: 'Custo',
    linhaMargem: 'Margem',
    preçoFinal: 70,
    moeda: (v) => 'R$ ' + v.toFixed(2).replace('.', ','),
    etiqueta: 'preço sugerido',
    notas: ['opções gratuitas', 'sem instalar', 'no celular e no PC'],
    tituloGrátis: 'Escolha seu acesso.',
    subtituloGrátis: 'Ferramentas gratuitas e recursos avançados com conta Plus ou Premium.',
    nós: [`${números.gratuitas} grátis`, `${números.plus} Plus`, `${números.premium} Premium`],
    marca: site.destaque,
    porAnder: site.assinatura['pt-BR'],
    lema: 'feito para ser simples antes de ser enfeitado',
  },
  en: {
    descrição: `${site.nome} portal animation: ${números.prontas} ready tools, including ${números.gratuitas} free tools and ${números.plus + números.premium} Plus and Premium tools.`,
    pausar: 'Pause animation',
    tocar: 'Play animation',
    número: String(números.prontas),
    ferramentas: 'ready tools',
    anotaçãoGrátis: `${números.gratuitas} free · ${números.plus + números.premium} Plus & Premium`,
    tituloÁreas: 'One search for everything.',
    áreas: ['Recipes & pricing', 'Everyday math', 'Crafts', 'BBQ & parties', 'Painting & renovation', 'Quotes & receipts'],
    contaEducação: '7 × 8 = 56',
    áreaDaFerramenta: 'Recipes & pricing',
    nomeDaFerramenta: 'Selling price',
    campoCusto: 'Batch cost',
    valorCusto: 'R$ 42.00',
    campoMargem: 'Desired margin',
    valorMargem: '40%',
    botão: 'Calculate price',
    linhaCusto: 'Cost',
    linhaMargem: 'Margin',
    preçoFinal: 70,
    moeda: (v) => 'R$ ' + v.toFixed(2),
    etiqueta: 'suggested price',
    notas: ['free options', 'nothing to install', 'on phone and PC'],
    tituloGrátis: 'Choose your access.',
    subtituloGrátis: 'Free tools and advanced features with a Plus or Premium account.',
    nós: [`${números.gratuitas} free`, `${números.plus} Plus`, `${números.premium} Premium`],
    marca: site.destaque,
    porAnder: site.assinatura.en,
    lema: 'made to be simple before being fancy',
  },
};

export function obterTextos(idioma) {
  if (idioma && textos[idioma]) return textos[idioma];
  if (idioma && idioma.toLowerCase().startsWith('en')) return textos.en;
  return textos['pt-BR'];
}
