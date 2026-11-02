# Guia para criar uma ferramenta do portal

> Para quem vai implementar UMA ferramenta planejada do catálogo (pessoa ou agente). O objetivo é que cada ferramenta nova chegue com a mesma qualidade das que já estão prontas, e que várias possam ser feitas ao mesmo tempo sem uma pisar na outra.
> Tudo em português do Brasil: textos da tela, nomes, comentários, mensagens de commit.

## 0. O que é "pronta"

O status só vira `'pronta'` quando a ferramenta **abre, valida a entrada, calcula, trata erro, exporta o que promete e tem teste automático**. Além disso, para este projeto:

- as mensagens de erro aparecem **no campo certo** e dizem o que fazer ("Informe o custo, em reais"), nunca "valor inválido";
- cada ferramenta traz a seção "Como usar" completa: passos, um exemplo com números reais, limites e premissas, e perguntas frequentes (o `escreverInstruções` da página lê isso do módulo);
- o resultado é **conferido a mão** (ou por outra fonte) pelo menos nos casos de teste; não basta o código passar no teste que o próprio código inspirou;
- funciona no celular de 320 px de largura sem rolagem horizontal, com o teclado certo (`inputmode`), e por teclado e leitor de tela;
- os dados nunca saem do navegador (todas as ferramentas do portal rodam local, `local: true`);
- **nenhuma animação nova**: o portal já tem animações demais para o celular. Sem `@keyframes`, sem `transition` novo, sem canvas animado.

## 1. Ponto de partida

1. Ache a ferramenta em `portal/dados/catálogo/*.js` pelo `id` (por exemplo F052). **O catálogo do portal manda no nome, no slug e no resumo.** Não os troque.
2. Ache a especificação em `ander-flow/docs/catalogo/catalogo-<categoria>.md` (ela pode usar outro slug: procure pelo assunto, por exemplo "limpador-de-texto" para `F052`). A especificação traz entradas, limites, processamento, saídas, exportação, comportamento no celular, sobreposição com outras ferramentas e **casos de teste**. Siga o comportamento dela. Onde ela citar coisas do Ander Flow que o portal não tem (conta, plano Plus, servidor, banco), ignore essa parte e faça a versão local e grátis.
3. Veja uma ferramenta pronta parecida como modelo de estilo, antes de escrever:
   - texto: `scripts/ferramentas/removedor-de-acentos.js` e `scripts/cálculos/textos.js`;
   - cálculo financeiro: `margem-de-contribuicao.js`, `ponto-de-equilibrio.js`, `preco-de-venda.js` (+ `scripts/cálculos/dinheiro.js`, `custos.js`);
   - documento em PDF: `orcamento.js`, `recibo.js` (+ `scripts/comum/documentos/montar-documento-pdf.js`);
   - planilha e dados: `csv-e-json.js`, `limpar-planilha.js` (+ `scripts/cálculos/tabular.js`);
   - datas: `calculadora-de-datas.js` (+ `scripts/cálculos/tempo.js`).
4. Leia `portal/README.md` (seções "Como adicionar uma ferramenta" e "Regras que o código precisa respeitar") e o cabeçalho de `scripts/núcleo/montador.js`, que descreve os tipos de campo e o formato do que `calcular` devolve.

## 2. O que criar e o que NÃO tocar

Crie, e só estes:

| Arquivo | Conteúdo |
|---|---|
| `portal/scripts/cálculos/<slug>.js` | cálculo puro, sem DOM, sem `Date.now()` solto, sem aleatoriedade escondida (se precisar sortear, receba a fonte de aleatoriedade como parâmetro) |
| `portal/scripts/ferramentas/<slug>.js` | `export default { instruções, montar(raiz, ferramenta) }` usando `montarFerramenta` |
| `portal/testes/<slug>.test.mjs` | testes com `node:test` |

Edite, e só isto: **a entrada da ferramenta** no arquivo de `portal/dados/catálogo/` (troque `status` para `'pronta'`; ajuste `exporta` para listar só o que a ferramenta realmente exporta; não mexa em mais nada, nem em outras entradas).

**Não edite** arquivos compartilhados: `scripts/núcleo/*`, `scripts/cálculos/*` de outros assuntos, `scripts/comum/*`, `estilos/*`, `ferramentas/*` (gerador e verificador), `dados/categorias.js`, o modelo de página, a vitrine. Outras pessoas estão mexendo neles ao mesmo tempo. Se precisar de uma função compartilhada nova, crie-a **no seu próprio arquivo** de cálculo (`scripts/cálculos/<slug>.js`) e importe o que já existe. Se achar que um arquivo compartilhado tem um defeito ou falta algo, **não corrija**: descreva no relato final.

**Sem dependências novas.** O portal só tem `pdf-lib` (em `recursos/`) e o gerador de QR. APIs nativas do navegador são livres (`Intl`, `canvas`, `crypto.getRandomValues`, `File`, `Blob`). Se a especificação exigir uma biblioteca que não existe, pare e relate; não copie código de terceiros para dentro do projeto.

## 3. Regras de código (as da casa)

- **Política de segurança estrita:** nada de atributo `style`, nada de `<script>` embutido, nada de `eval`/`new Function`. Espaçamento pontual usa as classes utilitárias de `estilos/componentes.css`.
- **Texto que veio de fora** (digitado, importado, de arquivo) **nunca entra em `innerHTML` sem `escapar()`**; prefira `textContent`.
- **Dinheiro circula em centavos inteiros** dentro dos cálculos (`emCentavos`/`emReais` em `scripts/cálculos/dinheiro.js`). Nada de `0.1 + 0.2`.
- **Datas são data civil**, sem hora e sem fuso (`scripts/cálculos/tempo.js`).
- **Toda recusa de regra de negócio chega ao usuário**: use `ErroDeEntrada(mensagem, campo)` ou `comCampo(campo, () => …)`.
- **CSV exportado passa por `neutralizarFórmula`**; arquivos baixados usam `nomeDeArquivo()`.
- **Números e datas na tela** em pt-BR (`toLocaleString('pt-BR')`, `Intl`); moeda como `R$ 1.234,56`.
- **Limites explícitos** (tamanho do texto, número de linhas, número de itens) com mensagem clara ao ultrapassar. Entrada hostil não pode travar a página: pense em texto de 1 MB, números gigantes, `NaN`, `Infinity`, vírgula e ponto, espaços, colagem de planilha.
- Comentários explicam o **porquê**, em português, no mesmo tom do código vizinho. Nada de comentário que repete o código.
- Estilo: igual ao dos arquivos vizinhos (nomes em português com acento, aspas simples, ponto e vírgula, `export default { instruções, montar }`).

## 4. Testes

- Arquivo `portal/testes/<slug>.test.mjs`, `node:test` + `node:assert/strict`. Importe só o cálculo puro e as constantes exportadas do módulo da ferramenta quando houver.
- **Todos os casos de teste da especificação**, com os valores exatos dela. Confira os números da especificação por conta própria (por exemplo com `node -e`); se a especificação estiver errada, o teste segue a conta certa e o relato diz isso.
- Além dos casos dela: vazio, limites (no limite e um acima), entrada hostil, caracteres especiais e acentos, arredondamento, e **uma propriedade** que sempre vale (por exemplo, "a soma das partes é igual ao total", "ordenar duas vezes dá o mesmo resultado").
- Ferramentas com aleatoriedade: teste com fonte injetada; nunca teste que depende de sorte.
- Rode `node --test portal/testes/<slug>.test.mjs` e depois `npm run conferir` (dentro de `portal/`): precisa ficar **verde, sem aviso novo**.

## 5. Verificação no navegador (obrigatória)

Depois do `npm run conferir`, abra a página gerada da ferramenta (`npm run gerar` cria `f/<slug>/index.html`) servida por uma porta SUA (`node ferramentas/servir.mjs . --porta <porta> --local`; use portas de 4460 a 4499, uma por agente; **nunca** 3000, 4400 ou 4870) e confira, com o Playwright do monorrepo (`createRequire('<raiz>/ander-flow/package.json')('playwright')`, `chromium.launch({ channel: 'msedge' })`):

1. viewport 390×844 e 320×640: preencher com o exemplo, calcular, ver o resultado; **sem rolagem horizontal** (`document.documentElement.scrollWidth <= innerWidth`);
2. um erro de validação aparece no campo certo e com a mensagem certa;
3. cada botão de exportação promete e entrega (copiar, baixar: confira o arquivo gerado);
4. nenhum erro no console, nenhuma requisição de rede para fora;
5. tema escuro legível; foco visível por teclado (Tab percorre tudo na ordem certa);
6. a seção "Como usar" aparece e bate com o que a ferramenta faz.
Guarde 2 capturas (celular e computador) em `portal/medidas/` **sem commitar** (a pasta é de trabalho) e cite os caminhos no relato.

## 6. Git: o que commitar e o que não

Você está em um worktree próprio, numa branch própria. Faça commits pequenos e em português, no estilo do histórico (`git log --oneline`), com a linha final `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

- Commite **apenas por caminho explícito**: o cálculo, o módulo, o teste e o catálogo. `git add -A` é proibido.
- **Não commite arquivos gerados**: `index.html`, `ferramentas.html`, `salvos.html`, `404.html`, `f/**`, `sitemap.xml`, `manifesto.webmanifest`, `recursos/ícones-animados/**`, `vitrine/vitrine-números.js`, `vitrine/imagens/**`. Eles mudam a cada ferramenta pronta e geram conflito; quem integra os branches roda `npm run gerar` uma vez no fim. Depois de rodar `conferir`, deixe-os como estão no disco e simplesmente não os adicione.
- Não faça `push`. Não mexa em outras branches.

## 7. Relato final (obrigatório)

Devolva, nesta ordem e curto:
1. a ferramenta (id, slug) e o nome da branch com os commits;
2. arquivos criados e a linha do catálogo alterada;
3. quantos testes novos e o resultado do `npm run conferir` (cole as linhas de resumo);
4. como você verificou no navegador (e as capturas);
5. o que da especificação ficou de fora e por quê;
6. defeitos ou lacunas que você viu em arquivos compartilhados (sem corrigir);
7. se a especificação divergia da conta certa ou do catálogo.
