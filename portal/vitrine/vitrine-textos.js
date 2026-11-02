// portal/vitrine/vitrine-textos.js
// Textos da vitrine. As chaves precisam existir nos dois idiomas.
// O nome do site vem de dados/site.js e os números, de vitrine-números.js (gerado por
// ferramentas/gerar.mjs a partir do catálogo). Nada disso é escrito à mão aqui.
import { site } from '../dados/site.js';
import { números } from './vitrine-números.js';

export const textos = {
  'pt-BR': {
    descrição: `Animação de 15 segundos do portal ${site.nome}: ${números.prontas} ferramentas grátis, uma calculadora de preço de venda em uso e a assinatura da marca.`,
    pausar: 'Pausar animação',
    tocar: 'Tocar animação',
    número: String(números.prontas),
    ferramentas: 'ferramentas',
    anotaçãoGrátis: 'grátis, direto no navegador',
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
    notas: ['sem cadastro', 'sem instalar', 'no celular e no PC'],
    tituloGrátis: 'Grátis pra quem usa.',
    subtituloGrátis: 'Sem cadastro e sem instalar: tudo roda no seu navegador.',
    nós: ['Você usa de graça', 'Gera documentos e PDF', 'Gera QR Code'],
    marca: site.destaque,
    porAnder: site.assinatura['pt-BR'],
    lema: 'feito para ser simples antes de ser enfeitado',
  },
  en: {
    descrição: `15-second animation of the ${site.nome} portal: ${números.prontas} free tools, a selling price calculator in use and the brand sign-off.`,
    pausar: 'Pause animation',
    tocar: 'Play animation',
    número: String(números.prontas),
    ferramentas: 'tools',
    anotaçãoGrátis: 'free, right in your browser',
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
    notas: ['no sign-up', 'nothing to install', 'on phone and PC'],
    tituloGrátis: 'Free for everyone who uses it.',
    subtituloGrátis: 'No sign-up and nothing to install: it all runs in your browser.',
    nós: ['You use it for free', 'Makes documents and PDFs', 'Makes QR Codes'],
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
