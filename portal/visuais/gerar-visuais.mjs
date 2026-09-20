/**
 * Gera uma página por proposta visual, com o mesmo conteúdo em todas.
 *
 * Quatro endereços separados, para comparar abrindo em abas diferentes.
 * Material de decisão: nada aqui entra no site publicado.
 *
 * Uso: node portal/visuais/gerar-visuais.mjs
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ícone } from '../scripts/núcleo/ícones.js';

const AQUI = dirname(fileURLToPath(import.meta.url));

const VISUAIS = [
  {
    id: 'a',
    nome: 'A — Artesanal',
    resumo: 'Na linha da pasta modelo/: creme, terracota, Caprasimo, sombra sólida e contorno marcado. Agora com cor própria por categoria.',
  },
  {
    id: 'b',
    nome: 'B — Aplicativo',
    resumo: 'Convencional e colorido: fundo claro azulado, ícone em caixa cheia na cor da categoria, azul de ação, sombra suave.',
  },
  {
    id: 'c',
    nome: 'C — Sóbrio',
    resumo: 'Ferramenta de trabalho: topo escuro, fundo branco, cantos retos, densidade alta. A cor aparece só num traço por categoria.',
  },
  {
    id: 'd',
    nome: 'D — Vivo',
    resumo: 'Escuro e contrastado: brilho no topo, cor forte por categoria, âmbar como cor de ação. Nada de tela vazia.',
  },
];

/* Cada categoria com a sua cor: é o que tira a sensação de "tudo igual". */
const CATEGORIAS = [
  { nome: 'Dinheiro e preços', qtd: '7 prontas', ícone: 'dinheiro', cor: '#2f8f5b' },
  { nome: 'Vendas e propostas', qtd: '1 pronta', ícone: 'vendas', cor: '#c2410c' },
  { nome: 'Cálculo e conversão', qtd: '3 prontas', ícone: 'cálculo', cor: '#7c3aed' },
  { nome: 'Datas e horas', qtd: '2 prontas', ícone: 'datas', cor: '#0891b2' },
  { nome: 'Texto', qtd: '9 planejadas', ícone: 'texto', cor: '#be185d' },
  { nome: 'Documentos e PDF', qtd: '2 prontas', ícone: 'documento', cor: '#b91c1c' },
  { nome: 'Planilhas e dados', qtd: '2 prontas', ícone: 'planilha', cor: '#047857' },
  { nome: 'Imagens', qtd: '1 pronta', ícone: 'imagem', cor: '#7e22ce' },
  { nome: 'Senhas e segurança', qtd: '2 prontas', ícone: 'chave', cor: '#4338ca' },
  { nome: 'RH e trabalho', qtd: '9 planejadas', ícone: 'pessoas', cor: '#0369a1' },
  { nome: 'Estoque e logística', qtd: '10 planejadas', ícone: 'caixa', cor: '#a16207' },
  { nome: 'Ofício, casa e obra', qtd: '9 prontas', ícone: 'martelo', cor: '#9a3412' },
];

const FERRAMENTAS = [
  { nome: 'Preço de venda', resumo: 'Preço a partir do custo, com margem, taxas e imposto.', ícone: 'dinheiro', cor: '#2f8f5b' },
  { nome: 'Divisão de contas', resumo: 'Quem pagou o quê e o menor número de transferências.', ícone: 'pessoas', cor: '#0369a1' },
  { nome: 'Orçamento e proposta', resumo: 'PDF, planilha e link para o cliente abrir no celular.', ícone: 'documento', cor: '#c2410c' },
  { nome: 'Calculadora de tinta', resumo: 'Litros necessários e a combinação de latas mais barata.', ícone: 'cálculo', cor: '#9a3412' },
  { nome: 'Gerador de senhas', resumo: 'Senha forte, PIN e Wi-Fi, com medidor de entropia.', ícone: 'chave', cor: '#4338ca' },
  { nome: 'Limpeza de planilha', resumo: 'Remove duplicadas e vazias e devolve CSV ou Excel.', ícone: 'planilha', cor: '#047857' },
];

const INTENÇÕES = ['quanto devo cobrar', 'rachar a conta', 'quantos dias faltam', 'limpar minha planilha', 'criar senha forte'];

function página(visual) {
  const categorias = CATEGORIAS.map((c, índice) => `
        <a class="cat cor-${índice}" href="#">
          <i>${ícone(c.ícone)}</i>
          <span><b>${c.nome}</b><small>${c.qtd}</small></span>
        </a>`).join('');

  const ferramentas = FERRAMENTAS.map((f, índice) => `
        <a class="ferr cor-f${índice}" href="#">
          <i>${ícone(f.ícone)}</i>
          <span><b>${f.nome}</b><small>${f.resumo}</small></span>
          <u>${ícone('chevron', { tamanho: 16 })}</u>
        </a>`).join('');

  const outras = VISUAIS.filter((v) => v.id !== visual.id)
    .map((v) => `<a href="${v.id}.html">${v.nome}</a>`).join(' · ');

  return `<!doctype html>
<html lang="pt-BR" data-visual="${visual.id}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${visual.nome} — proposta visual</title>
<meta name="description" content="Proposta visual ${visual.nome} para o portal de ferramentas: ${visual.resumo}">
<meta name="robots" content="noindex">
<link rel="stylesheet" href="../estilos/fontes.css">
<link rel="stylesheet" href="visuais.css">
<link rel="stylesheet" href="cores.css">
</head>
<body>
  <div class="régua">
    <strong>${visual.nome}</strong>
    <span>${visual.resumo}</span>
    <span class="régua__fim">Ver: ${outras} · <a href="./">todas</a></span>
  </div>

  <div class="palco">
    <header class="topo">
      <span class="marca">
        <i>${ícone('marca')}</i>
        <span><b>Ferramentas</b><small>do Ander</small></span>
      </span>
      <nav>
        <a href="#">Categorias</a>
        <a href="#">Ferramentas</a>
        <a href="#">Salvos</a>
        <a class="ação" href="#">Buscar</a>
      </nav>
    </header>

    <section class="herói">
      <h1>O que você precisa <em>resolver</em> agora?</h1>
      <p>Escreva a tarefa, não o nome da ferramenta. 30 ferramentas prontas, sem cadastro, rodando no seu navegador.</p>
      <div class="busca">
        ${ícone('busca')}
        <input type="search" placeholder="Ex.: preciso saber quanto cobrar" aria-label="Buscar">
      </div>
      <div class="chips">${INTENÇÕES.map((i) => `<span>${i}</span>`).join('')}</div>
    </section>

    <div class="faixa"><h2>Categorias</h2><a href="#">Ver as 150 ferramentas</a></div>
    <div class="grade">${categorias}
    </div>

    <div class="faixa faixa--espaçada"><h2>Prontas para usar</h2><a href="#">30 de 150</a></div>
    <div class="lista">${ferramentas}
    </div>

    <div class="faixa faixa--espaçada"><h2>Dentro de uma ferramenta</h2><a href="#">Preço de venda</a></div>
    <div class="painel">
      <div class="campos">
        <div class="campo"><label>Custo do lote (R$)</label><input value="80,00"></div>
        <div class="campo"><label>Margem desejada (%)</label><input value="30"></div>
        <div class="campo"><label>Taxa de cartão (%)</label><input value="4"></div>
        <div class="campo"><label>Unidades no lote</label><input value="50"></div>
      </div>
      <button class="botão" type="button">Calcular preço</button>
      <div class="saída">
        <p class="valor">R$ 121,22 o lote</p>
        <p class="nota">Cada unidade por R$ 2,43 · lucro de R$ 36,37 · markup equivalente 51,5%</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

function índice() {
  const cartões = VISUAIS.map((v) => `
    <a class="opção" href="${v.id}.html">
      <b>${v.nome}</b>
      <span>${v.resumo}</span>
    </a>`).join('');

  return `<!doctype html>
<html lang="pt-BR" data-visual="c">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Propostas visuais do portal</title>
<meta name="description" content="Quatro propostas visuais para o portal de ferramentas, com o mesmo conteúdo em cada uma, para comparação e escolha.">
<meta name="robots" content="noindex">
<link rel="stylesheet" href="../estilos/fontes.css">
<link rel="stylesheet" href="visuais.css">
<link rel="stylesheet" href="índice.css">
</head>
<body>
  <div class="palco">
    <h1 class="título">Quatro propostas visuais</h1>
    <p class="linha">Mesmo conteúdo em todas: cabeçalho, busca, categorias, lista de ferramentas e uma ferramenta aberta.
      A diferença está em cor, fundo, forma e tratamento dos ícones. Cada categoria tem cor própria nas quatro.</p>
    <div class="opções">${cartões}
    </div>
    <p class="linha linha--espaçada">Escolha uma e me diga a letra. Posso também misturar: por exemplo, a cor de uma com a forma de outra.</p>
  </div>
</body>
</html>
`;
}

const estiloDoÍndice = `/* Folha só do índice das propostas. */
.título { font-size: 30px; letter-spacing: -.03em; margin: 34px 0 8px; }
.linha { color: var(--tinta-suave); max-width: 66ch; margin: 0 0 20px; font-size: 15px; }
.opções { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr)); }
.opção {
  display: block; padding: 18px; border-radius: 10px;
  border: 1px solid #dde3ea; background: #fff; text-decoration: none; color: inherit;
  transition: border-color .15s ease, transform .15s ease;
}
.opção:hover { border-color: #0f766e; transform: translateY(-2px); }
.opção b { display: block; font-size: 17px; margin-bottom: 6px; }
.opção span { font-size: 13.5px; color: var(--tinta-suave); line-height: 1.5; }
.linha--espaçada { margin-top: 22px; }
`;

const folhaDeCores = [
  '/* Cor de cada categoria e de cada ferramenta, em classe.',
  '   Atributo style é bloqueado pela política de segurança do site. */',
  ...CATEGORIAS.map((c, i) => `.cor-${i} { --cor: ${c.cor}; }`),
  ...FERRAMENTAS.map((f, i) => `.cor-f${i} { --cor: ${f.cor}; }`),
].join('\n') + '\n';

await writeFile(join(AQUI, 'cores.css'), folhaDeCores, 'utf8');
await writeFile(join(AQUI, 'índice.css'), estiloDoÍndice, 'utf8');
await writeFile(join(AQUI, 'index.html'), índice(), 'utf8');
for (const visual of VISUAIS) {
  await writeFile(join(AQUI, `${visual.id}.html`), página(visual), 'utf8');
}
console.log(`Geradas ${VISUAIS.length} propostas visuais + índice em portal/visuais/`);
