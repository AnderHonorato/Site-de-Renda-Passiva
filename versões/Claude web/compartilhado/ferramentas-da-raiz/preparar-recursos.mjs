// Prepara recursos de terceiros e arquivos gerados a partir das configurações:
// fontes locais, biblioteca de QR, sprites de ícones, paletas e favicons de cada produto.
// Uso: npm run preparar (na raiz). Requer npm install antes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarEstruturaInicial } from './criar-estrutura-inicial.mjs';
import { ajustarLuminosidade, contraste, escolherPassoComContraste, gerarRampa } from './gerar-paleta.mjs';
import { produtos } from './produtos.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const módulos = path.join(raiz, 'node_modules');
const compartilhado = path.join(raiz, 'compartilhado');

const CAMINHO_ESPIRAL =
  'M 51.60 50.00 L 51.89 50.23 L 52.15 50.53 L 52.36 50.89 L 52.50 51.30 L 52.58 51.77 L 52.58 52.27 L 52.50 52.79 L 52.32 53.32 L 52.05 53.84 L 51.69 54.34 L 51.23 54.81 L 50.69 55.23 L 50.06 55.58 L 49.36 55.85 L 48.59 56.03 L 47.78 56.10 L 46.92 56.07 L 46.05 55.91 L 45.17 55.63 L 44.31 55.21 L 43.48 54.67 L 42.69 54.01 L 41.98 53.22 L 41.36 52.31 L 40.84 51.31 L 40.45 50.21 L 40.19 49.03 L 40.07 47.80 L 40.12 46.52 L 40.33 45.23 L 40.72 43.94 L 41.28 42.67 L 42.01 41.46 L 42.90 40.32 L 43.96 39.27 L 45.18 38.34 L 46.52 37.55 L 47.99 36.93 L 49.56 36.47 L 51.21 36.21 L 52.92 36.16 L 54.65 36.32 L 56.39 36.70 L 58.10 37.30 L 59.76 38.12 L 61.33 39.16 L 62.79 40.41 L 64.11 41.86 L 65.26 43.49 L 66.23 45.28 L 66.98 47.20 L 67.50 49.24 L 67.77 51.37 L 67.77 53.54 L 67.51 55.74 L 66.98 57.93 L 66.17 60.06 L 65.08 62.12 L 63.74 64.06 L 62.14 65.84 L 60.31 67.44 L 58.28 68.83 L 56.05 69.98 L 53.67 70.86 L 51.16 71.46 L 48.56 71.75 L 45.91 71.72 L 43.25 71.37 L 40.61 70.68 L 38.05 69.67 L 35.59 68.34 L 33.28 66.70 L 31.16 64.77 L 29.27 62.56 L 27.63 60.12 L 26.29 57.46 L 25.27 54.62 L 24.59 51.65 L 24.27 48.58 L 24.32 45.45 L 24.76 42.32 L 25.58 39.23 L 26.78 36.23 L 28.35 33.36 L 30.28 30.68 L 32.54 28.22 L 35.11 26.02 L 37.96 24.14 L 41.05 22.59 L 44.34 21.42 L 47.78 20.64 L 51.32 20.28 L 54.92 20.35 L 58.52 20.86 L 62.07 21.80 L 65.51 23.19 L 68.79 24.99 L 71.86 27.20 L 74.67 29.79 L 77.17 32.72 L 79.32 35.97 L 81.08 39.48 L 82.42 43.21 L 83.30 47.12 L 83.71 51.13 L 83.64 55.21 L 83.06 59.28 L 82.00 63.29 L 80.44 67.17 L 78.42 70.88 L 75.94 74.34 L 73.03 77.50 L 69.74 80.32 L 66.10 82.74 L 62.17 84.72 L 57.99 86.22 L 53.63 87.23 L 49.14 87.70 L 44.59 87.63 L 40.04 87.00 L 35.57 85.83 L 31.24 84.11 L 27.11 81.87 L 23.25 79.13 L 19.73 75.91 L 16.59 72.27 L 13.89 68.25 L 11.68 63.90 L 9.99 59.28 L 8.86 54.46 L 8.32 49.50 L 8.37 44.47 L 9.04 39.45 L 10.31 34.51 L 12.18 29.73 L 14.63 25.17';

// Ícones comuns: identificador em português → nome original no Lucide.
const ÍCONES_COMUNS = {
  início: 'house', ferramentas: 'wrench', salvos: 'bookmark', apoiar: 'heart', mais: 'menu', fechar: 'x',
  copiar: 'copy', baixar: 'download', imprimir: 'printer', calcular: 'calculator', editar: 'pencil',
  excluir: 'trash-2', duplicar: 'copy-plus', salvar: 'save', importar: 'file-up', exportar: 'file-down',
  adicionar: 'plus', remover: 'minus', informação: 'info', alerta: 'triangle-alert', sucesso: 'circle-check',
  erro: 'circle-x', 'código-qr': 'qr-code', privacidade: 'shield', 'seta-direita': 'arrow-right',
  'seta-esquerda': 'arrow-left', 'link-externo': 'external-link', lista: 'list', contato: 'mail',
  documento: 'file-text', busca: 'search', relógio: 'clock',
};

const FONTES = [
  ['caprasimo', ['latin-400', 'latin-ext-400']],
  ['figtree', ['latin-400', 'latin-600', 'latin-700', 'latin-ext-400', 'latin-ext-600', 'latin-ext-700']],
  ['caveat', ['latin-700', 'latin-ext-700']],
];

const LICENÇA_MIT_QRCODE = `qrcode-generator 2.0.4
Copyright (c) 2009 Kazuhiko Arase
URL: http://www.d-project.com/

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

The word "QR Code" is registered trademark of DENSO WAVE INCORPORATED.
`;

function copiar(origem, destino) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(origem, destino);
}

function prepararFontes() {
  const destino = path.join(compartilhado, 'recursos', 'fontes');
  fs.rmSync(destino, { recursive: true, force: true });
  for (const [família, variações] of FONTES) {
    for (const variação of variações) {
      const arquivo = `${família}-${variação}-normal.woff2`;
      copiar(path.join(módulos, '@fontsource', família, 'files', arquivo), path.join(destino, arquivo));
    }
    copiar(path.join(módulos, '@fontsource', família, 'LICENSE'), path.join(destino, 'licenças', `OFL-${família}.txt`));
  }
}

function prepararBibliotecaDeQr() {
  const destino = path.join(compartilhado, 'recursos', 'bibliotecas');
  fs.rmSync(destino, { recursive: true, force: true });
  copiar(path.join(módulos, 'qrcode-generator', 'dist', 'qrcode.mjs'), path.join(destino, 'qrcode.mjs'));
  fs.writeFileSync(path.join(destino, 'LICENSE-qrcode-generator.txt'), LICENÇA_MIT_QRCODE, 'utf8');
}

function lerÍconeLucide(nome) {
  const arquivo = path.join(módulos, 'lucide-static', 'icons', `${nome}.svg`);
  if (!fs.existsSync(arquivo)) throw new Error(`Ícone Lucide inexistente: ${nome}`);
  const svg = fs.readFileSync(arquivo, 'utf8');
  const interno = /<svg[^>]*>([\s\S]*?)<\/svg>/.exec(svg)?.[1];
  if (!interno) throw new Error(`Ícone Lucide ilegível: ${nome}`);
  return interno.replace(/\s+/g, ' ').replace(/ \/>/g, '/>').trim();
}

function montarSprite(ícones) {
  const símbolos = [
    `<symbol id="marca" viewBox="0 0 100 100"><path d="${CAMINHO_ESPIRAL}" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/></symbol>`,
  ];
  for (const [identificador, lucide] of Object.entries(ícones)) {
    símbolos.push(
      `<symbol id="${identificador}" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round">${lerÍconeLucide(lucide)}</g></symbol>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg">\n<!-- Ícones Lucide (ISC, https://lucide.dev) com traço 2,75; símbolo "marca" autoral. Gerado por npm run preparar. -->\n${símbolos.join('\n')}\n</svg>\n`;
}

function gravarÍcones(pastaDeÍcones, ícones) {
  fs.mkdirSync(pastaDeÍcones, { recursive: true });
  fs.writeFileSync(path.join(pastaDeÍcones, 'ícones.svg'), montarSprite(ícones), 'utf8');
  copiar(path.join(módulos, 'lucide-static', 'LICENSE'), path.join(pastaDeÍcones, 'LICENÇA-lucide.txt'));
}

function linhasDaRampa(nome, rampa) {
  return Object.entries(rampa).map(([passo, cor]) => `  --cor-${nome}-${passo}: ${cor};`);
}

function semânticasDoDestaque(rampa, fundos, sobreAção) {
  const passos = ['700', '800', '900'];
  const passoAção = escolherPassoComContraste(rampa, passos, [sobreAção]);
  const passoTexto = escolherPassoComContraste(rampa, passos, fundos);
  const próximo = (passo, avanço) => passos[Math.min(passos.length - 1, passos.indexOf(passo) + avanço)];
  const passoFoco = escolherPassoComContraste(rampa, ['600', '700', '800'], fundos, 3);
  return {
    linhas: [
      `  --cor-ação: ${rampa[passoAção]};`,
      `  --cor-ação-hover: ${rampa[próximo(passoAção, 1)]};`,
      `  --cor-ação-pressionada: ${rampa[próximo(passoAção, 2)]};`,
      `  --cor-texto-destaque: ${rampa[passoTexto]};`,
      `  --cor-foco: ${rampa[passoFoco]};`,
    ],
    relatório: `ação ${rampa[passoAção]} sobre-ação ${contraste(rampa[passoAção], sobreAção).toFixed(2)}:1; texto-destaque ${contraste(rampa[passoTexto], fundos[0]).toFixed(2)}:1 no fundo e ${contraste(rampa[passoTexto], fundos[1]).toFixed(2)}:1 na superfície`,
  };
}

function gerarCores(produto, identidade) {
  const neutra = gerarRampa(identidade.neutra, 0.03);
  const destaque = gerarRampa(identidade.destaque);
  const secundária = gerarRampa(identidade.secundária);
  const fundo = identidade.fundo;
  const superfície = ajustarLuminosidade(fundo, -0.045, 1.3);
  const superfícieElevada = ajustarLuminosidade(fundo, 0.025, 0.5);
  const texto = ajustarLuminosidade(neutra[900], -0.08);
  const sobreAção = neutra[100];
  const fundos = [fundo, superfície];
  const principal = semânticasDoDestaque(destaque, fundos, sobreAção);
  const relatório = [`principal: ${principal.relatório}`, `texto ${contraste(texto, fundo).toFixed(2)}:1; texto suave ${contraste(neutra[700], fundo).toFixed(2)}:1`];

  const blocos = Object.entries(identidade.destaques ?? {}).map(([nome, cor]) => {
    const rampa = gerarRampa(cor);
    const semânticas = semânticasDoDestaque(rampa, fundos, sobreAção);
    relatório.push(`${nome}: ${semânticas.relatório}`);
    return `html[data-destaque="${nome}"] {\n${linhasDaRampa('destaque', rampa).join('\n')}\n${semânticas.linhas.join('\n')}\n}`;
  });

  const conteúdo = `@charset "UTF-8";
/* Gerado por npm run preparar (compartilhado/ferramentas-da-raiz/gerar-paleta.mjs) a partir de
   configurações/identidade-visual.json. Não editar à mão.
   Contrastes WCAG verificados:
   ${relatório.join('\n   ')} */

:root {
  --cor-fundo: ${fundo};
  --cor-superfície: ${superfície};
  --cor-superfície-elevada: ${superfícieElevada};
  --cor-texto: ${texto};
  --cor-texto-suave: ${neutra[700]};
  --cor-sobre-ação: ${sobreAção};
  --cor-divisória: color-mix(in srgb, ${texto} 16%, transparent);
${linhasDaRampa('neutra', neutra).join('\n')}
${linhasDaRampa('destaque', destaque).join('\n')}
${linhasDaRampa('secundária', secundária).join('\n')}
${principal.linhas.join('\n')}
}

${blocos.join('\n\n')}
`;
  return { conteúdo, relatório, corDoTema: fundo, destaque700: destaque['700'] };
}

function gerarFavicon(fundo, cor) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="26" fill="${fundo}"/><path d="${CAMINHO_ESPIRAL}" fill="none" stroke="${cor}" stroke-width="9" stroke-linecap="round"/></svg>\n`;
}

function lerJson(caminho, padrão) {
  return fs.existsSync(caminho) ? JSON.parse(fs.readFileSync(caminho, 'utf8')) : padrão;
}

// "--produto N" regenera somente ícones, paleta e favicon do produto N, sem tocar em
// compartilhado/ nem nos outros produtos (seguro para executores trabalhando em paralelo).
const índiceDoProduto = process.argv.indexOf('--produto');
const somenteProduto = índiceDoProduto >= 0 ? Number(process.argv[índiceDoProduto + 1]) : null;
if (somenteProduto !== null && !produtos.some((produto) => produto.número === somenteProduto)) {
  console.error('Use --produto com um número de 1 a 6.');
  process.exit(2);
}

if (somenteProduto === null) {
  const criados = criarEstruturaInicial(raiz);
  if (criados.length) console.log(`Estrutura inicial criada:\n  ${criados.join('\n  ')}`);
  prepararFontes();
  prepararBibliotecaDeQr();
  gravarÍcones(path.join(compartilhado, 'recursos', 'ícones'), ÍCONES_COMUNS);
  console.log('Fontes, biblioteca de QR e ícones comuns preparados em compartilhado/recursos.');
}

for (const produto of produtos.filter((item) => somenteProduto === null || item.número === somenteProduto)) {
  const pasta = path.join(raiz, produto.pasta);
  const identidade = lerJson(path.join(pasta, 'configurações', 'identidade-visual.json'), produto.identidade);
  const extras = lerJson(path.join(pasta, 'configurações', 'ícones-do-produto.json'), produto.ícones);
  const ícones = { ...ÍCONES_COMUNS };
  for (const nome of extras) ícones[nome] = nome;
  gravarÍcones(path.join(pasta, 'recursos', 'ícones'), ícones);
  const cores = gerarCores(produto, identidade);
  fs.mkdirSync(path.join(pasta, 'estilos', 'produto'), { recursive: true });
  fs.writeFileSync(path.join(pasta, 'estilos', 'produto', 'cores.css'), cores.conteúdo, 'utf8');
  fs.writeFileSync(path.join(pasta, 'recursos', 'ícones', 'favicon.svg'), gerarFavicon(identidade.fundo, cores.destaque700), 'utf8');
  console.log(`${produto.pasta}: ${Object.keys(ícones).length + 1} ícones; ${cores.relatório.join(' | ')}`);
}
