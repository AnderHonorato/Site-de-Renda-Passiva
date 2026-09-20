# Registro de decisões

Só decisões que mudam o produto ou a arquitetura, com o motivo objetivo e o que foi descartado.

---

**DATA:** 19/09/2026
**DECISÃO:** O produto é **um único site** — o portal em `portal/`. As seis pastas numeradas deixam de ser o produto final e passam a ser origem de lógica já testada, a ser portada para o portal.
**MOTIVO:** O proprietário foi explícito: "não é 6 sites, é um único site com várias ferramentas úteis". Seis sites separados obrigam a manter seis identidades visuais, seis pacotes e seis publicações, e a pessoa que usa precisa saber de antemão em qual deles está a ferramenta que ela quer.
**ALTERNATIVAS:** (a) manter os seis e pôr um portal só como índice — foi o que existia e é o que o proprietário recusou; (b) publicar os seis sob o mesmo domínio em subpastas — resolveria o endereço mas não a inconsistência visual nem a busca única.
**IMPACTO:** As 49 ferramentas dos seis sites continuam funcionando e não foram apagadas. 28 delas estão no catálogo marcadas com `origem: 'porte'` e serão trazidas reaproveitando o cálculo testado. Até serem portadas, aparecem como planejadas — não como prontas.

---

**DATA:** 19/09/2026
**DECISÃO:** O portal anterior (`portal/app.js`, commit `3f1043a`) foi substituído inteiro, não corrigido.
**MOTIVO:** As 49 entradas do catálogo eram geradas por um `flatMap` que dava a **todas** o mesmo destino: `<pasta do site>/páginas/ferramentas.html`. "Preço de venda" e "Ficha técnica" levavam ao mesmo lugar. Não era um defeito de detalhe, era a estrutura inteira sendo fachada.
**ALTERNATIVAS:** Corrigir os links um a um exigiria criar as páginas de destino, que não existiam — ou seja, escrever o portal do zero de qualquer forma.
**IMPACTO:** O `prisma/schema.prisma` e o `servidor.mjs` do portal antigo também saíram, porque declaravam um banco que nunca teve migração nem conexão, e o prompt proíbe deixar banco falso em produção. Quando houver conta e sincronização de verdade, entram com implementação real.

---

**DATA:** 19/09/2026
**DECISÃO:** O catálogo de 150 ferramentas é a **fonte única de verdade**: alimenta a busca, o menu, as páginas geradas, os testes e a matriz da documentação.
**MOTIVO:** Catálogo escrito em dois lugares vira catálogo desatualizado em um deles. Com fonte única, é impossível uma ferramenta existir na interface sem ficha, ou ter ficha sem existir.
**ALTERNATIVAS:** Registrar cada ferramenta no próprio módulo — espalharia a informação e impediria listar o que ainda não foi implementado.
**IMPACTO:** `verificar.mjs` barra módulo sem entrada no catálogo e entrada marcada como pronta sem módulo. A matriz em `documentação/catalogo-ferramentas.md` é gerada, nunca editada à mão.

---

**DATA:** 19/09/2026
**DECISÃO:** Cada ferramenta tem dois estados possíveis: **pronta** ou **planejada**. Não existe estado intermediário e não existe página de ferramenta planejada.
**MOTIVO:** O prompt proíbe "150 cards com nomes diferentes". Uma ferramenta só recebe o selo de pronta quando abre, valida a entrada, calcula, trata erro, exporta o que promete e tem teste automático. Quem clica numa planejada vai para a ficha no catálogo, que diz o que ela fará — não para uma tela vazia.
**ALTERNATIVAS:** Publicar só as 21 prontas e esconder o resto. Descartado: o catálogo completo é o mapa do produto e mostra honestamente onde ele está.
**IMPACTO:** Hoje: 21 prontas, 129 planejadas. O número aparece em toda página, sem maquiagem.

---

**DATA:** 19/09/2026
**DECISÃO:** Todo dinheiro circula em **centavos inteiros** dentro dos cálculos, e a conversão para reais fica em um único par de funções (`emCentavos` / `emReais`).
**MOTIVO:** Neste mesmo projeto, a dupla conversão reais↔centavos já produziu custos 100× maiores numa ferramenta de festas. Centralizar a conversão torna o erro impossível de repetir em silêncio.
**ALTERNATIVAS:** Usar ponto flutuante com arredondamento no fim — foi exatamente o que falhou antes.
**IMPACTO:** `emReais` recusa valor não inteiro, e há teste garantindo que `0,1 + 0,2` vira 30 centavos e não 30,000000000000004.

---

**DATA:** 19/09/2026
**DECISÃO:** Margem, taxas e imposto na ferramenta de preço incidem sobre o **preço de venda**, não sobre o custo, e o markup equivalente é mostrado ao lado.
**MOTIVO:** É a confusão mais cara de quem vende: aplicar 30% sobre o custo devolve 23% de margem, não 30%. Mostrar os dois números ao mesmo tempo ensina a diferença sem precisar de texto explicativo.
**IMPACTO:** Quando margem + taxas + imposto somam 100% ou mais, a ferramenta recusa e explica, em vez de devolver um número absurdo ou infinito.

---

**DATA:** 19/09/2026
**DECISÃO:** Datas são tratadas como **data civil em UTC interno**, sem horário e sem fuso.
**MOTIVO:** Contagem de prazo feita com `Date` local erra na virada do horário de verão e muda de resultado conforme o relógio do aparelho. Prazo não tem hora.
**IMPACTO:** `lerData` só aceita `AAAA-MM-DD` e recusa data que não existe no calendário, como 30 de fevereiro.

---

**DATA:** 19/09/2026
**DECISÃO:** Não há lista de feriados embutida. Quem calcula dias úteis informa os feriados que valem no caso dele.
**MOTIVO:** Além dos nacionais, cada estado e cada município tem os seus, e ponto facultativo varia por empresa. Uma lista embutida estaria errada para uma parte das pessoas sem avisar.
**ALTERNATIVAS:** Embutir os feriados nacionais e avisar que faltam os locais. Descartado: dá a impressão de completude e o erro passa despercebido.
**IMPACTO:** A ferramenta avisa, quando nenhum feriado foi informado, que só sábados e domingos foram pulados.

---

**DATA:** 19/09/2026
**DECISÃO:** Nenhuma conversão automática de tipo ao ler CSV. Tudo sai como texto.
**MOTIVO:** Adivinhar tipo estraga CEP (`01310-000`), telefone e código com zero à esquerda (`007` vira `7`). O dano é silencioso e só aparece depois.
**IMPACTO:** Está escrito na documentação da ferramenta, para a pessoa saber por que o número veio como texto.

---

**DATA:** 19/09/2026
**DECISÃO:** Aleatoriedade de senha e de sorteio vem sempre de `crypto.getRandomValues`, com amostragem que descarta valores enviesados.
**MOTIVO:** `Math.random` é previsível e não serve para segredo. E o resto da divisão (`% n`) sem descarte dá vantagem aos primeiros valores da faixa — num sorteio, isso é injustiça mensurável.
**IMPACTO:** Caracteres ambíguos (`l`, `I`, `O`, `0`, `1`) ficam fora do alfabeto de senha, para não errar ao ditar. O sorteio gera um código de conferência junto do resultado, já que nada é registrado em servidor.

---

**DATA:** 19/09/2026
**DECISÃO:** O conteúdo do orçamento compartilhável viaja no **fragmento** da URL (depois do `#`), e a página que o lê valida o formato antes de exibir.
**MOTIVO:** O fragmento não é enviado ao servidor pelo navegador, o que mantém a promessa de que nada sai do aparelho. Mas o link vem de fora e pode ter sido truncado ou alterado, então é dado não confiável.
**ALTERNATIVAS:** Guardar o orçamento num servidor e mandar um identificador — exigiria backend, cadastro e política de retenção, tudo fora do escopo.
**IMPACTO:** Qualquer pessoa com o link vê o conteúdo; isso está escrito na ferramenta. Link adulterado mostra erro em vez de tela quebrada, e há limite de tamanho contra abuso.

---

**DATA:** 19/09/2026
**DECISÃO:** Nenhum atributo `style` e nenhum `<script>` embutido no HTML. Espaçamento pontual usa classes utilitárias.
**MOTIVO:** O site é servido com política de segurança de conteúdo estrita (`script-src 'self'`, `style-src 'self'`). Descoberto em teste real: o script do tema e os atributos `style` estavam sendo bloqueados e o tema piscava.
**IMPACTO:** O tema é aplicado por `scripts/núcleo/tema-inicial.js`, um script clássico carregado antes do corpo. A regra é verificável: `verificar.mjs` e uma conferência no navegador acusam qualquer recaída.

---

**DATA:** 19/09/2026
**DECISÃO:** Ícones são um conjunto SVG autoral de 50 símbolos, em grade 24×24 com traço 1,75 e junções arredondadas. Nenhuma biblioteca de terceiros, nenhum emoji na interface.
**MOTIVO:** Exigência explícita do prompt. Um conjunto próprio também garante coerência de espessura e leitura em tamanho pequeno, que é onde biblioteca genérica costuma falhar.
**IMPACTO:** Os ícones são gerados por função e há teste que valida todos eles; um nome inventado quebra a geração em vez de aparecer como espaço em branco.

---

**DATA:** 19/09/2026
**DECISÃO:** A densidade visual é requisito, não gosto: linha de ferramenta de ~54 px em vez de cartão de 210 px, e a primeira dobra mostra busca, categorias e acesso rápido.
**MOTIVO:** Reclamação direta do proprietário sobre a versão anterior: "criou cards enormes que precisa ficar rolando tela sem necessidade, ajuste adequadamente aos olhos".
**IMPACTO:** O padrão do catálogo passou de grade de cartões para lista de linhas com ícone, nome, resumo numa linha só e favorito. Cabe cerca de quatro vezes mais ferramenta na mesma tela.
