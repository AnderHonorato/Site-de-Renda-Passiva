/**
 * Ícones animados do portal.
 *
 * Cada ícone estático do conjunto (scripts/núcleo/ícones.js) ganha uma versão animada em
 * SVG, com o movimento que combina com o desenho: a moeda gira, o relógio anda, as barras do
 * gráfico sobem, o cadeado abre. O traço é o mesmo (24×24, traço 1,75), e a cor é um terracota
 * médio que lê bem sobre o fundo claro e sobre o escuro, porque um SVG usado como imagem não
 * enxerga o tema escolhido no botão do site.
 *
 * No site, a versão estática continua no HTML e só some quando a animada termina de carregar
 * (veja scripts/núcleo/ícone-animado.js). Se a animada demorar ou falhar, a estática fica.
 *
 * Uso: node ferramentas/ícones-animados.mjs   (também roda dentro de npm run gerar)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ícone } from '../scripts/núcleo/ícones.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAÍDA = join(RAIZ, 'recursos', 'ícones-animados');

/** Nome do arquivo de um ícone: sem acento, para o endereço ser simples. */
export const slugDoÍcone = (nome) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** O n-ésimo traço do ícone. */
const K = (n) => `#i > :nth-child(${n})`;
/** Gira em torno de um ponto da grade 24×24, e não do centro da própria forma. */
const GIRO = 'transform-box: view-box;';

/** Animações por ícone, em CSS puro. */
const ANIMAÇÕES = {
  cálculo: `
    ${K(2)} { transform-origin: left center; animation: cresce 2.4s ease-in-out infinite; }
    @keyframes cresce { 0%, 100% { transform: scaleX(.3); } 50% { transform: scaleX(1); } }
    ${K(3)} { animation: pisca 1.2s steps(1, end) infinite; }
    @keyframes pisca { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }`,
  dinheiro: `
    #i { ${GIRO} transform-origin: 12px 12px; animation: gira 2.8s ease-in-out infinite; }
    @keyframes gira { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(.12); } }`,
  gráfico: `
    ${K(2)}, ${K(3)}, ${K(4)} { transform-origin: bottom center; animation: sobe 2.4s ease-in-out infinite; }
    ${K(3)} { animation-delay: .2s; } ${K(4)} { animation-delay: .4s; }
    @keyframes sobe { 0%, 100% { transform: scaleY(.45); } 45% { transform: scaleY(1.08); } 65% { transform: scaleY(1); } }`,
  pessoas: `
    ${K(1)} { animation: pula 2s ease-in-out infinite; }
    ${K(3)}, ${K(4)} { animation: ecoa 2s ease-in-out infinite; }
    @keyframes pula { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.6px); } }
    @keyframes ecoa { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }`,
  caixa: `
    #i { ${GIRO} transform-origin: 12px 21px; animation: quica 1.8s ease-in-out infinite; }
    @keyframes quica { 0%, 100% { transform: translateY(0) scale(1.06, .94); } 40% { transform: translateY(-3px) scale(.96, 1.04); } 70% { transform: translateY(0) scale(1.04, .96); } }`,
  texto: `
    ${K(2)} { transform-origin: center top; animation: estica 2.2s ease-in-out infinite; }
    ${K(1)} { animation: balanca 2.2s ease-in-out infinite; }
    @keyframes estica { 0%, 100% { transform: scaleY(.4); } 50% { transform: scaleY(1); } }
    @keyframes balanca { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(1.2px); } }`,
  documento: `
    ${K(3)} { transform-origin: left center; animation: escreve 2.4s ease-in-out infinite; }
    ${K(2)} { animation: dobra 2.4s ease-in-out infinite; }
    @keyframes escreve { 0% { transform: scaleX(0); } 55%, 100% { transform: scaleX(1); } }
    @keyframes dobra { 0%, 100% { opacity: .5; } 50% { opacity: 1; } }`,
  vendas: `
    #i { animation: rola 2s ease-in-out infinite; }
    @keyframes rola { 0%, 100% { transform: translateX(-1.4px); } 50% { transform: translateX(1.4px); } }
    ${K(2)}, ${K(3)} { animation: roda 2s ease-in-out infinite; }
    @keyframes roda { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-.8px); } }`,
  alvo: `
    ${K(2)} { animation: onda 2s ease-in-out infinite; }
    ${K(3)} { animation: onda 2s ease-in-out .3s infinite; }
    @keyframes onda { 0%, 100% { transform: scale(.7); opacity: .6; } 50% { transform: scale(1.05); opacity: 1; } }`,
  filtro: `
    #i { ${GIRO} transform-origin: 12px 5px; animation: aperta 1.8s ease-in-out infinite; }
    @keyframes aperta { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(.82, 1.06); } }`,
  lista: `
    ${K(1)} { transform-origin: left center; animation: escorre 2.4s ease-in-out infinite; }
    ${K(2)} { animation: marca 2.4s ease-in-out infinite; }
    @keyframes escorre { 0%, 100% { transform: scaleX(.55); } 50% { transform: scaleX(1); } }
    @keyframes marca { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }`,
  balão: `
    #i { ${GIRO} transform-origin: 8px 19px; animation: fala 2.2s ease-in-out infinite; }
    @keyframes fala { 0%, 100% { transform: rotate(-5deg) scale(1); } 50% { transform: rotate(5deg) scale(1.1); } }`,
  régua: `
    #i { ${GIRO} transform-origin: 12px 12px; animation: mede 2.6s ease-in-out infinite; }
    @keyframes mede { 0%, 100% { transform: rotate(-7deg); } 50% { transform: rotate(7deg); } }
    ${K(2)} { animation: marcas 2.6s ease-in-out infinite; }
    @keyframes marcas { 0%, 100% { opacity: .4; } 50% { opacity: 1; } }`,
  datas: `
    ${K(3)} { animation: argola 1.8s ease-in-out infinite; }
    @keyframes argola { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.8px); } }
    ${K(2)} { transform-origin: center; animation: faixa 1.8s ease-in-out infinite; }
    @keyframes faixa { 0%, 100% { transform: scaleX(.6); } 50% { transform: scaleX(1); } }`,
  relógio: `
    ${K(2)} { ${GIRO} transform-origin: 12px 12px; animation: anda 4s linear infinite; }
    @keyframes anda { to { transform: rotate(360deg); } }`,
  código: `
    ${K(1)} { animation: esq 2s ease-in-out infinite; }
    ${K(2)} { animation: dir 2s ease-in-out infinite; }
    ${K(3)} { animation: barra 2s ease-in-out infinite; }
    @keyframes esq { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-1.8px); } }
    @keyframes dir { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(1.8px); } }
    @keyframes barra { 0%, 100% { transform: rotate(-9deg); } 50% { transform: rotate(9deg); } }`,
  chave: `
    #i { ${GIRO} transform-origin: 8px 12px; animation: gira 2.4s ease-in-out infinite; }
    @keyframes gira { 0%, 100% { transform: rotate(-18deg); } 50% { transform: rotate(18deg); } }`,
  'confere-círculo': `
    ${K(2)} { transform-origin: left center; animation: marca 2.4s ease-in-out infinite; }
    @keyframes marca { 0% { transform: scaleX(0); opacity: .3; } 45%, 100% { transform: scaleX(1); opacity: 1; } }
    ${K(1)} { animation: respira 2.4s ease-in-out infinite; }
    @keyframes respira { 0%, 100% { transform: scale(.94); } 50% { transform: scale(1.04); } }`,
  grade: `
    ${K(1)}, ${K(2)}, ${K(3)}, ${K(4)} { animation: pulsa 2s ease-in-out infinite; }
    ${K(2)} { animation-delay: .25s; } ${K(4)} { animation-delay: .5s; } ${K(3)} { animation-delay: .75s; }
    @keyframes pulsa { 0%, 100% { transform: scale(.78); } 50% { transform: scale(1.04); } }`,
  planilha: `
    ${K(2)} { transform-origin: left center; animation: traça 3s ease-in-out infinite; }
    @keyframes traça { 0% { transform: scaleX(0); } 50%, 100% { transform: scaleX(1); } }
    ${K(1)} { animation: respira 3s ease-in-out infinite; }
    @keyframes respira { 0%, 100% { opacity: .65; } 50% { opacity: 1; } }`,
  busca: `
    #i { animation: procura 3s ease-in-out infinite; }
    @keyframes procura { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(1.6px, -1.6px); } 50% { transform: translate(0, 1.6px); } 75% { transform: translate(-1.6px, -.6px); } }`,
  estrela: `
    #i { ${GIRO} transform-origin: 12px 12px; animation: brilha 2.2s ease-in-out infinite; }
    @keyframes brilha { 0%, 100% { transform: rotate(-12deg) scale(.92); } 50% { transform: rotate(12deg) scale(1.14); } }`,
  imagem: `
    ${K(2)} { animation: sol 2.4s ease-in-out infinite; }
    @keyframes sol { 0%, 100% { transform: translateY(1.2px); } 50% { transform: translateY(-1.4px); } }
    ${K(3)} { transform-origin: center bottom; animation: monte 2.4s ease-in-out infinite; }
    @keyframes monte { 0%, 100% { transform: scaleY(.8); } 50% { transform: scaleY(1.08); } }`,
  alerta: `
    #i { ${GIRO} transform-origin: 12px 18px; animation: treme 2.2s ease-in-out infinite; }
    @keyframes treme { 0%, 55%, 100% { transform: rotate(0deg); } 62% { transform: rotate(-8deg); } 70% { transform: rotate(8deg); } 78% { transform: rotate(-5deg); } 86% { transform: rotate(3deg); } }`,
  cadeado: `
    ${K(2)} { animation: abre 3s ease-in-out infinite; }
    @keyframes abre { 0%, 20%, 100% { transform: translateY(0); } 45%, 70% { transform: translateY(-2.2px); } }`,
  livro: `
    ${K(2)} { transform-origin: left center; animation: vira 2.8s ease-in-out infinite; }
    @keyframes vira { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(.25); } }
    ${K(1)} { animation: leve 2.8s ease-in-out infinite; }
    @keyframes leve { 0%, 100% { opacity: .75; } 50% { opacity: 1; } }`,
  martelo: `
    #i { ${GIRO} transform-origin: 6px 18px; animation: bate 1.6s ease-in-out infinite; }
    @keyframes bate { 0%, 55%, 100% { transform: rotate(-22deg); } 70% { transform: rotate(8deg); } 80% { transform: rotate(-4deg); } }`,
};

/** Nomes que têm versão animada. */
export const nomesComAnimação = Object.freeze(Object.keys(ANIMAÇÕES));

/** Monta o texto do SVG animado de um ícone. */
export function íconeAnimadoEmSvg(nome) {
  const css = ANIMAÇÕES[nome];
  if (!css) throw new Error(`Sem animação para o ícone "${nome}".`);
  const estático = ícone(nome);
  const formas = estático.slice(estático.indexOf('>') + 1, estático.lastIndexOf('</svg>'));
  const regras = css.split('\n').filter((l) => l.trim()).map((l) => `    ${l.trim()}`).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
  <style>
    #i { fill: none; stroke: #cc6040; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
    #i > * { transform-box: fill-box; transform-origin: center; }
${regras}
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  </style>
  <g id="i">${formas}</g>
</svg>
`;
}

/** Escreve todos os arquivos. Devolve a lista de nomes gravados. */
export async function gerarÍconesAnimados() {
  await mkdir(SAÍDA, { recursive: true });
  for (const nome of nomesComAnimação) {
    await writeFile(join(SAÍDA, `${slugDoÍcone(nome)}.svg`), íconeAnimadoEmSvg(nome), 'utf8');
  }
  return [...nomesComAnimação];
}

if (process.argv[1] && join(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const gravados = await gerarÍconesAnimados();
  console.log(`Ícones animados: ${gravados.length} arquivos em recursos/ícones-animados/.`);
}
