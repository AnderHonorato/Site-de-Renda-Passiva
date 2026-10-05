# Desempenho das animações no celular

Relato do dono: "as animações das ferramentas deixaram lento no celular". Este documento registra como foi
medido, o que pesava, o que mudou, os números antes e depois e como medir de novo. Tudo se refere ao portal
estático em `portal/`.

## 1. Método

Script versionado: `portal/ferramentas/medir-desempenho.mjs` (`npm run medir`). Ele sobe o próprio servidor,
abre o Edge (Playwright) e mede cada página com animações ligadas e com `prefers-reduced-motion: reduce`.

- Emulação de celular: 390 x 844, `isMobile`, toque, devicePixelRatio 3, rede 4G rápida (9 Mbps, 60 ms), CPU 4x mais lenta.
- Páginas: `/`, `/ferramentas.html`, `/f/preco-de-venda/`, `/f/calculadora-de-tinta/`, `/f/orcamento/`.
- Mediana de 3 rodadas por página e cenário.
- Carga: FCP, LCP, CLS, tarefas longas e TBT, requisições, bytes e quantidade de SVG animados baixados.
- Parado (CPU 4x): tarefa da página, script, layout e estilo (`Performance.getMetrics`) e quadros por segundo (rAF).
- INP aproximado: digitar num campo e enviar o formulário (pior interação do `PerformanceObserver` de eventos).
- Troca de tema: quadros durante a transição de tela inteira.
- **CPU real** (renderizador + GPU, em % de um núcleo): lida por processo em `SystemInfo.getProcessInfo`, com a página
  parada em cada posição de rolagem (uma tela por vez, do topo ao fim). Esta passada roda **sem** estrangulamento de CPU
  e sem nenhum rAF da medição, por dois motivos medidos aqui: o estrangulador de CPU do Chromium mantém o
  renderizador a ~100% até em `about:blank` (99,7%), e contar quadros com rAF força 60 quadros por segundo numa
  página parada. Os dois escondiam o custo real.
- O navegador roda sem tela e com renderização por software: o custo absoluto de GPU é maior que o de um celular de
  verdade. O que vale é a comparação com o mesmo roteiro.

Linha de base (`portal/medidas/antes.json`): commit `003822b` + base do idioma. Depois: `portal/medidas/depois.json`.

## 2. O que pesava (evidência)

Experimentos isolados (imagens SVG animadas num documento mínimo, 390 x 844, dpr 3, sem estrangulamento; % de um
núcleo, renderizador + GPU; página vazia = 0,3%):

| Caso | CPU |
|---|---:|
| 1 recorte de categoria animado (72x48) | 16,4% |
| 4 / 8 / 11 recortes | 21,6% / 26,7% / 29,6% |
| 1 / 4 / 11 ícones de 24 px | 14,6% / 19,7% / 25,4% |
| 2 retângulos de cabeçalho (340x142) | 17,3% |
| 11 recortes **fora da tela** (rolado) | 0,4% |
| 11 recortes com `visibility: hidden` | 0,2% |
| 11 recortes com `display: none` | 2,1% |
| 11 recortes com `content-visibility: hidden` | 2,7% |
| 11 recortes com `opacity: 0` | 14,7% (não pausa) |
| 11 recortes com `will-change: transform` | 35,1% (piora) |
| 11 recortes com `contain: strict` | 26,5% (não ajuda) |
| 11 recortes com o `src` removido depois de carregar | 1,3% |
| 11 recortes com `prefers-reduced-motion` emulado | 25,7% (**não pára**) |
| 11 ícones a 15 fps ou 8 fps (`steps`) | 23,8% / 24,2% (sem ganho; original 22,2%) |
| 11 ícones sem `transform-box: fill-box` | 25,3% (sem ganho) |
| 11 ícones como `<svg>` **inline** com CSS no documento | 7,0% |
| 11 ícones como `<svg>` inline com `prefers-reduced-motion` | 0,2% |
| 11 `div` HTML com `transform` animado | 9,2% |

Conclusões:

1. **Custo fixo alto, custo por imagem baixo.** Uma só imagem SVG animada na tela já custa ~15% (o navegador passa a
   produzir 60 quadros por segundo); cada imagem a mais custa ~1,3 ponto. Limitar o número ajuda, mas o piso não sai.
2. **Fora da tela o navegador já pausa** a animação do SVG (0,4%). O que pesava era o que estava na tela, e o
   `loading="lazy"` não resolvia: ele só adia o download, não pausa nada depois que a imagem carrega.
3. **`prefers-reduced-motion` dentro do SVG usado como imagem não vale na emulação** (e o site não consegue pausar uma
   imagem animada de fora). Antes, com movimento reduzido, a página continuava gastando 20 a 55% de CPU. Só o
   controle por JavaScript garante o "reduzir movimento".
4. Baixar duas variantes (claro e escuro) por desenho, sempre: no HTML havia duas `<img>`, e a escondida
   (`display: none`) também baixava quando `eager`. O cabeçalho da ferramenta baixava os dois retângulos mesmo no
   celular, onde o retângulo é escondido (`display: none` abaixo de 560 px).
5. Quantização de taxa (`steps`), `fill-box`, `contain`, `will-change` e `loading="lazy"`: sem ganho (ou pior). Não foram adotados.
6. Animações em CSS no documento (inline) custam 4 a 5 vezes menos que imagem SVG animada, e obedecem ao reduzir movimento
   (ver recomendações).
7. Fora das animações dos SVG, três coisas apareceram na medição de linha de base:
   - as 3 estrelas da pílula de tema piscavam o tempo todo, **mesmo escondidas no tema claro**
     (`pisca-estrela`): em `/ferramentas.html` isso custava 478 ms de tarefa por segundo parado (47% da thread principal)
     e 53 recálculos de estilo por segundo;
   - CLS de 0,37 a 0,58 nas páginas de ferramenta e no catálogo (o formulário e a lista são desenhados por JavaScript
     depois do HTML, e o rodapé/coluna lateral saltava; mais a troca de fonte);
   - INP aproximado de 192 a 656 ms em algumas páginas, com a thread principal ocupada pelas estrelas.

## 3. O que mudou

| Mudança | Arquivos |
|---|---|
| Controle das animações: o HTML não traz mais o `src` da imagem animada. O módulo coloca o `src` só nas que estão na tela (IntersectionObserver), até o limite do aparelho, e as demais ficam no desenho estático. Se passar do limite, as animadas se revezam (a cada 4,5 s; 7 s com economia). | `scripts/núcleo/animação-viva.js` (novo), `scripts/núcleo/ícone-animado.js` |
| Limite simultâneo por perfil: 16 (computador), 6 (celular ou aparelho com 4 núcleos ou menos), 3 (Save-Data ou 2G). O retângulo do cabeçalho da ferramenta é prioritário e nunca é revezado: continua em laço infinito enquanto visível. | `animação-viva.js` (`perfilDeAnimação`, `escolherAtivas`) |
| Só a variante do tema atual é baixada (`data-fonte-claro`/`data-fonte-escuro` numa única `<img>`). Se o tema muda no botão ou no sistema, a variante nova é pedida sob demanda. | `ícone-animado.js` (`arteViva`), `gerar.mjs`, `páginas.mjs` |
| Pausa sem nova requisição: fora do orçamento a imagem fica `visibility: hidden` (0,2% de CPU) e volta na hora. | `estilos/componentes.css` |
| Movimento reduzido: nenhuma imagem animada é baixada nem montada; fica o desenho estático. | `animação-viva.js` |
| Estados `carregando`/`pronto`/`falhou` preservados: o estático aparece enquanto a animada carrega, se está lenta, se falhou ou se está fora do limite. Imagem que falha não é tentada de novo em laço. | `animação-viva.js` |
| Retângulo do cabeçalho escondido no celular não é mais baixado (a imagem não é visível, então o controle não a carrega). Fundo de reserva no espaço. | `estilos/páginas.css` |
| Ícones sem `stroke-dashoffset` (dois ícones passaram a animar só `transform`/`opacity`, que são as propriedades compostas). | `ferramentas/ícones-animados.mjs`, `recursos/ícones-animados/` |
| Estrelas da pílula só piscam quando aparecem (tema escuro) e usam `will-change: opacity`. | `estilos/layout.css` |
| Espaço reservado para o que o JavaScript desenha (`.lista-ferramentas:empty`, `#ferramenta` sem filhos além de `noscript`) e pré-carregamento da fonte Inter latina. | `estilos/páginas.css`, `ferramentas/modelo-de-página.mjs` |
| Medição versionada e `npm run medir`; achar o Playwright em worktree; testes de navegador em série. | `ferramentas/medir-desempenho.mjs`, `ferramentas/achar-playwright.mjs`, `package.json` |

## 4. Números antes e depois

Origem: `portal/medidas/antes.json` e `portal/medidas/depois.json` (mediana de 3 rodadas). Cada célula: antes → depois.
"CPU parado" é a CPU real (renderizador + GPU, % de um núcleo) com a página parada: no topo, na pior posição de
rolagem e na média das posições. Em `/f/...` o celular mostra só um ícone animado (o retângulo é escondido).

**Cenário: animado** (cada célula: antes → depois)

| Métrica | / | /ferramentas.html | /f/preco-de-venda/ | /f/calculadora-de-tinta/ | /f/orcamento/ |
|---|---:|---:|---:|---:|---:|
| LCP (ms) | 1296 → 1476 | 2400 → 572 | 596 → 600 | 480 → 1584 | 668 → 532 |
| CLS | 0.05 → 0.03 | 0.58 → 0 | 0.39 → 0.01 | 0.37 → 0 | 0.57 → 0.04 |
| TBT na carga (ms) | 57 → 19 | 111 → 0 | 7 → 0 | 0 → 0 | 0 → 0 |
| SVG animados baixados na carga | 7 → 0 | 17 → 5 | 3 → 1 | 3 → 1 | 3 → 1 |
| KB de imagem na carga | 20.8 → 0.7 | 19.7 → 6.4 | 7.1 → 1.7 | 7.2 → 1.8 | 7.2 → 1.8 |
| CPU parado no topo (%) | 3.3 → 0.5 | 50 → 50.9 | 22.6 → 18.5 | 22.3 → 21 | 24.3 → 19.7 |
| CPU parado, pior posição (%) | 63.8 → 48.5 | 65.8 → 61.3 | 22.6 → 18.5 | 22.3 → 21 | 24.3 → 19.7 |
| CPU parado, média (%) | 34.7 → 30.6 | 27.6 → 29.6 | 7 → 3.8 | 6.5 → 4.3 | 7 → 4.9 |
| Tarefa da página parada (ms/s, 4x) | 0 → 1 | 478 → 559 | 81 → 84 | 107 → 107 | 85 → 90 |
| Quadros/s parado (4x) | 56.3 → 59.3 | 54.3 → 58.8 | 55.3 → 59.3 | 55.8 → 59.3 | 57.3 → 55.3 |
| INP aprox. (ms) | 80 → 40 | 200 → 80 | 408 → 48 | 80 → 96 | 72 → 32 |
| Tema: quadros/s | 49.8 → 57.2 | 57.6 → 57.6 | 49 → 58.5 | 0.3 → 51.1 | 53.7 → 58.1 |

**Cenário: reduzido** (cada célula: antes → depois)

| Métrica | / | /ferramentas.html | /f/preco-de-venda/ | /f/calculadora-de-tinta/ | /f/orcamento/ |
|---|---:|---:|---:|---:|---:|
| LCP (ms) | 1964 → 1904 | 1008 → 516 | 548 → 460 | 524 → 1560 | 648 → 568 |
| CLS | 0.03 → 0.03 | 0.56 → 0 | 0.39 → 0.01 | 0.37 → 0 | 0.57 → 0.04 |
| TBT na carga (ms) | 86 → 66 | 4 → 0 | 37 → 8 | 0 → 0 | 0 → 0 |
| SVG animados baixados na carga | 7 → 0 | 17 → 0 | 3 → 0 | 3 → 0 | 3 → 0 |
| KB de imagem na carga | 20.8 → 0.7 | 19.7 → 0.7 | 7.1 → 0.7 | 7.2 → 0.7 | 7.2 → 0.7 |
| CPU parado no topo (%) | 0.4 → 0.1 | 54.3 → 0.1 | 21.2 → 0.1 | 21.7 → 0.1 | 21.8 → 0.1 |
| CPU parado, pior posição (%) | 55.9 → 0.2 | 69.1 → 0.5 | 21.2 → 0.2 | 21.7 → 0.1 | 21.8 → 0.1 |
| CPU parado, média (%) | 28.4 → 0.1 | 28.6 → 0.2 | 4.4 → 0.1 | 4.5 → 0.1 | 4.6 → 0.1 |
| Tarefa da página parada (ms/s, 4x) | 1 → 1 | 454 → 1 | 69 → 1 | 73 → 1 | 93 → 1 |
| Quadros/s parado (4x) | 53.9 → 59.8 | 47.7 → 55.3 | 51 → 59.3 | 34.5 → 59.8 | 45.8 → 59.8 |
| INP aprox. (ms) | 312 → 144 | 224 → 80 | 192 → 56 | 656 → 104 | 88 → 40 |
| Tema: quadros/s | 55.4 → 56.8 | 52.9 → 54.6 | 38.1 → 58.9 | 23.8 → 58.9 | 46.4 → 58 |

Tabela completa (todas as métricas, por página e cenário):
`node portal/ferramentas/medir-desempenho.mjs --comparar portal/medidas/antes.json portal/medidas/depois.json`.

Leitura:

- **Movimento reduzido: 20 a 69% de CPU caiu para 0,1 a 0,5%.** Antes, o pedido de menos movimento não parava os SVG
  animados. Agora para tudo e ainda não baixa os arquivos (de 17 SVG e 20 KB no catálogo para 0 SVG e 0,7 KB).
- **Carga:** de 7 SVG animados baixados na página inicial para 0 (os que estão fora da tela só são baixados quando
  aparecem), de 20,8 KB para 0,7 KB de imagem; páginas de ferramenta de 3 SVG para 1 (ícone) no celular e de 3 para 2 em
  tela larga (ícone + uma variante do retângulo, não as duas). No catálogo, de 17 para 5.
- **CLS:** de 0,37 a 0,58 para no máximo 0,04 (meta: abaixo de 0,05).
- **INP aproximado:** de 80-408 ms (pior caso 656 ms) para 32-144 ms nos dois cenários (meta: abaixo de 200 ms).
- **Quadros por segundo (4x), parado:** de 34 a 57 para 55 a 60; o quadro mais lento (p95) de 26 para 17 ms na inicial.
- **Troca de tema:** de 0,3 a 57 quadros por segundo (um caso travou 3 s, `calculadora-de-tinta`) para 51 a 59.
  A transição é uma só instância da camada; a medida depois é da transição do rolo de pintura da base atual, que
  veio no merge; a de antes é a do sol e da lua. Compare com cautela.
- **CPU parado com animação ligada:** o pico na página inicial caiu de 64% para 48% e no catálogo de 66% para 61%. É
  menos do que o esperado, porque o piso de uma animação em SVG-imagem é ~15% (veja a conclusão 1 da seção 2) e o
  limite de 6 tira só o custo por imagem (~1,3 ponto cada) e a duplicação. Nas páginas de ferramenta, no celular, de
  22 a 24% para 18 a 21% (um ícone). O catálogo aparece com 50% no topo antes e depois: é o conjunto de linhas com
  ícone na primeira tela. Para baixar esse piso, é preciso trocar a tecnologia (recomendação 1).
- **LCP:** na maioria das páginas melhorou ou ficou igual. Na página inicial e na `calculadora-de-tinta` o número subiu
  (de 480 para ~1500 ms na calculadora). Isso é um artefato da métrica: o primeiro texto pinta aos ~500 ms nos dois
  casos (observando `largest-contentful-paint`: 472 a 516 ms, depois um segundo candidato aos ~1,4 s) e, quando a fonte Inter pré-carregada chega (~1,4 s na rede emulada), o parágrafo
  é redesenhado 14 pixels quadrados maior e o navegador registra um novo candidato. Não é pintura mais lenta, é
  re-registro. Resolver exige `size-adjust` na fonte de reserva (recomendação 6).
- **Requisições:** dois pedidos a menos na página inicial (47 para 45) e muito menos bytes de imagem na carga.

Meta pedida e situação:

| Meta | Situação |
|---|---|
| Sem tarefa longa (> 50 ms) causada por animação | Atendida: nenhuma tarefa longa em repouso. Ressalva: com animação na tela, o catálogo mantém a thread principal ocupada (559 ms de tarefa por segundo em 4x, contra 1 com movimento reduzido), em tarefas curtas. |
| CPU parado perto de zero fora da tela | Atendida: topo da página inicial 0,5%; com movimento reduzido 0,1 a 0,5% em todas. |
| Quadros estáveis em 4x | Atendida: 55 a 60 quadros por segundo parado. |
| INP < 200 ms | Atendida: pior caso 144 ms (mediana). |
| CLS < 0,05 | Atendida: 0 a 0,04. |
| LCP < 2,5 s | Atendida em todas (pior 1,9 s), com a ressalva do re-registro acima. |
| CPU baixa com animação **na tela** | **Não atendida** por inteiro (18 a 61%): piso de ~15% da tecnologia SVG-imagem. |

## 5. Testes que fixam o orçamento

- `portal/testes/animações.test.mjs` (unitário): o HTML não traz `src` de imagem animada (ícones, recortes e
  retângulo); uma imagem só por desenho (nunca duas); `escolherAtivas` respeita o limite, deixa o retângulo do
  cabeçalho sempre ativo e, revezando, cobre todas as imagens; `fonteDaImagem` entrega só a variante do tema; peso
  máximo de cada SVG animado (ícone 1400 B, recorte 3600 B, retângulo 3600 B); os ícones só animam `transform` e
  `opacity`.
- `portal/testes/navegador/animações.teste.mjs` (celular emulado): pico de animações ativas ao mesmo tempo, rolando a
  página inicial, nunca passa de 6 (e de 3 com Save-Data), e continua havendo animação; no carregamento só há
  animações para o que está na tela; no tema claro nenhuma variante escura é pedida e, ao trocar o tema, só as
  escuras; com movimento reduzido nenhuma animação é baixada nem montada; no celular o retângulo escondido do
  cabeçalho não é baixado; em tela larga um só retângulo, da variante do tema; ícone que falha deixa o estático e
  não é tentado de novo.
- Os testes de navegador agora rodam em série (`--test-concurrency=1`): o tempo das animações não pode depender da
  disputa por CPU entre arquivos de teste.

## 6. Recomendações (o que ficou de fora, e por quê)

1. **Animar com CSS no documento em vez de imagem SVG** (maior ganho que resta). Ícones como `<svg>` inline com
   `@keyframes` num CSS comum custaram 7% contra 22-25% por 11 ícones, e obedecem a `prefers-reduced-motion`.
   Ficou de fora porque abre mão do que o dono pediu: o ícone animado como arquivo que carrega, com os estados
   `carregando`/`pronto`/`falhou` e o estático de segunda alternativa. Com CSS inline não há o que carregar. Se o dono
   topar, o caminho é: classes por ícone em `estilos/ícones-vivos.css`, o ícone estático ganha a classe, e o estático
   continua aparecendo se o CSS falhar ou se for movimento reduzido. É preciso renomear ids (`#i`) porque o
   `<style>` de um SVG inline é global.
2. **Rolo de pintura da troca de tema, vitrine em popup, busca expansível, divisórias, rodapé e animações de hover**
   (pedidos de design novos): afetam as mesmas áreas. Regras para não perder o que se ganhou: criar a camada só ao
   clicar; `will-change` só durante a animação; sombra grande (`box-shadow` com desfoque) em camada própria, nunca
   animada; sem `infinite` em nada que fique escondido num estado (a lição das estrelas); e rodar `npm run medir` antes
   e depois.
3. **`content-visibility: auto` nas linhas do catálogo** e **`contain`** no ícone: testados, sem ganho consistente na
   medição final (`portal/medidas/depois-contain-experimento.json`: 54% no catálogo, igual ao de antes). Não adotados.
4. **Reduzir o limite de 6** para 4 no celular: o ganho por imagem é de ~1,3 ponto; a troca não vale a perda de vida
   na tela. O limite está num lugar só (`perfilDeAnimação`).
5. **Cache longo e compressão** nos SVG e nas fontes na hospedagem (o servidor local manda `no-store`, que é de propósito
   para desenvolvimento). Os SVG animados têm 0,6 a 3,6 KB sem compressão.
6. **`size-adjust` na fonte de reserva** (e `font-display: optional` no peso 400) para o texto não ser redesenhado
   quando a Inter chega; elimina o re-registro do LCP.
7. **Teto de reprodução:** se o dono quiser ainda menos custo com animação na tela, pausar tudo depois de ~20 s sem
   rolar nem tocar e retomar ao primeiro gesto. Não foi feito porque "em laço infinito enquanto visível" foi pedido para
   o retângulo do cabeçalho.

## 7. Como medir de novo

```
cd portal
npm run gerar
npm run medir -- --saída medidas/depois-novo.json          # 5 páginas, 2 cenários, 3 rodadas (~30 min)
npm run medir -- --páginas "/" --cenários animado --rodadas 1 --rápido   # teste rápido
npm run medir -- --comparar medidas/antes.json medidas/depois-novo.json  # tabela em Markdown
```

Opções: `--páginas "/,/ferramentas.html"`, `--cenários animado,reduzido`, `--rodadas N`, `--sem-tema`,
`--porta 4455`. O script acha o Playwright em `ander-flow/node_modules` (inclusive de um worktree); em outro lugar,
defina `PLAYWRIGHT_PACOTE=<caminho do package.json que o instala>`. Rode com o computador sem outra carga: a medição de
CPU real é por processo do navegador. Para uma página nova, acrescente o caminho em `PÁGINAS_PADRÃO`.

Limites honestos da medição: Edge sem tela e com renderização por software (GPU absoluta é maior que num celular);
CPU 4x só estrangula a thread principal; a mediana de 3 rodadas ainda deixa ruído de alguns pontos percentuais; o
INP é aproximado (digitação e envio de formulário, não o INP de campo).
