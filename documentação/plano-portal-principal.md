# Plano: o portal passa a ser o site principal

> Arquivo de destino: `documentação/plano-portal-principal.md`. Escrito em 28/09/2026, a partir das decisões 1 a 25 de `ander-flow/docs/decisoes.md` e das respostas do dono de 28/09.
> Todas as afirmações sobre o código foram conferidas no branch `ander-flow/v1` (HEAD `834f160`). Cada uma vem com `arquivo:linha` ou com o comando que a comprova.

---

## 1. Decisão e objetivo

**Decisão (24 e 25).** O portal estático em `portal/` passa a ser o site principal. Ele tem o nome provisório "Ferramentas do Ander", roda na porta 4400 e é gerado por `portal/ferramentas/gerar.mjs`. Tudo o que o Ander Flow tem a mais entra no portal aos poucos e com o visual do portal:

- contas: cadastro, entrar, sessão, recuperar senha;
- admin;
- planos Grátis, Plus e Premium;
- anúncios sem atrapalhar (decisão 22);
- boas-vindas com carrossel editável (decisão 23);
- trabalhos salvos;
- avisos e mensagens;
- favoritos sincronizados;
- LGPD (exportar e excluir dados);
- idioma pt-BR/en;
- uso por ferramenta e ajustes de ferramenta pelo admin;
- **(04/10) novidades em carrossel** no cartão de boas-vindas (decisão 31);
- **(04/10) admin edita todo texto e elemento do site** (decisão 32);
- **(04/10) perfil, @usuário, nível evolutivo, amizade e bloqueio** (decisão 34);
- **(04/10) chat global** para quem tem conta (decisão 33);
- **(04/10) botão de tema em pílula com transição de tela inteira** (decisão 35, já feito).

Quando os dois já têm a mesma coisa, fica a versão do portal: busca, catálogo, página e ficha de ferramenta, montador, favoritos e recentes locais, tema, "Meus salvos", toast, orçamento compartilhado pelo `#` e as 30 ferramentas prontas.

**Fora deste plano:** portar ferramentas. Os agentes P1 (`portal/p1-financas`, hoje em `537e1b1`) e P2 (`portal/p2-conteudo`, hoje em `122a97f`) já trazem as 6 ferramentas do Ander Flow. Este plano só prevê a **porta de entrada** para elas:

- os campos `plano` e `local` do catálogo;
- os limites por plano no montador;
- os recursos servidos conforme o plano;
- o estado "Serviço indisponível" para as ferramentas que precisam do servidor.

**Objetivo:** um único site com o visual do portal, em português e inglês. As ferramentas continuam funcionando sem conta e sem servidor. Conta, plano, admin e anúncios ficam numa API que pode cair sem derrubar as ferramentas.

**Premissas das respostas do dono de 28/09, que valem acima de qualquer documento:**

- O nome é global e provisório. Ele fica num lugar só e a vitrine lê esse valor.
- Pix fica de fora por enquanto.
- Plus e Premium são liberados à mão pelo admin, sem botão de pagar.
- O site terá português e inglês.

**Estado real do código hoje.** É diferente do que o texto da tarefa supõe:

- A vitrine e o `servir.mjs` na rede local **já estão com commit**: `git log -- portal/vitrine portal/ferramentas/servir.mjs` → `7346f4d` e `b968267`. `git status --short portal` não mostra nada pendente.
- `node ferramentas/verificar.mjs` **passa**: "Verificadas 42 páginas, 70 scripts e 150 entradas de catálogo. Nenhum problema encontrado." Isso porque a prévia da vitrine foi posta fora das regras (`verificar.mjs:87-88`, `PRÉVIAS = ['vitrine/vitrine.html']`).
- `node --test "testes/*.test.mjs"` → 86 de 86 passam.
- **Nenhum dos dois branches P1 e P2 contém `7346f4d`**, ou seja, nenhum tem a vitrine: `git merge-base --is-ancestor 7346f4d portal/p1-financas` → "sem vitrine", e o mesmo vale para o p2.

---

## 2. Arquitetura

### 2.1 Recomendação

**Uma origem só, com dois processos independentes.** Um servidor de arquivos estáticos entrega o portal gerado. Um Node separado, a API que hoje é o servidor do Ander Flow, responde só em `/api/*`, `/plus/*` e `/midia/*`. O servidor estático repassa esses três caminhos para o Node por proxy reverso.

**Por quê, em poucas linhas:**

1. A regra de resiliência (decisão 21) só vale de verdade se quem entrega as páginas não for o mesmo processo da API. Se o Node servir o portal, a queda dele derruba as ferramentas do navegador.
2. Precisa ser a mesma origem. O Ander Flow não tem CORS: um `OPTIONS` vindo de `:4400` recebe 404, e `grep -rniE 'cors|access-control' ander-flow/servidor` não acha nada. As duas CSPs têm `connect-src 'self'` (`portal/ferramentas/servir.mjs:44-52`, `ander-flow/servidor/seguranca/seguranca-cabecalhos.js:31-43`). O cookie de sessão é `SameSite=Lax` e o CSRF é de envio duplo (`seguranca-csrf.js:85-110`). Com proxy na mesma origem, tudo isso funciona sem afrouxar nada.
3. O portal continua sendo HTML gerado e sem dependências. A API traz as dependências dela numa pasta separada.
4. A API do Ander Flow já é JSON puro: são 43 rotas, e os 132 testes de integração do v1 passam. Só três pontos a prendem ao Ander Flow: o catálogo, o montador de páginas e o plano Premium, que não existe. Os três são trocáveis.

Descartei o Express do Ander Flow servindo `portal/`, porque fere a decisão 21. Descartei também chamar `:4870` a partir de outra origem, porque exigiria CORS com credenciais e afrouxar a CSP.

### 2.2 Origens e processos

```
Navegador ──► mesma origem (dev: http://127.0.0.1:4400 · produção: https://<domínio>)
               │
               ├─ /  /f/*  /en/*  /conta/*  /admin/*  estilos/ scripts/ dados/ …   → ESTÁTICO (sempre no ar)
               │     dev: portal/ferramentas/servir.mjs   produção: Nginx sobre portal/publicar/
               │
               └─ /api/*  /plus/*  /midia/*  ──proxy──► Node da API (127.0.0.1:4870, nunca exposto)
                                                        portal/servidor/  (Express 5 + better-sqlite3)
                                                        Node fora do ar → o proxy responde 503 JSON
                                                        {"erro":"servico_indisponivel"}
```

- **Desenvolvimento.** O `servir.mjs` ganha um proxy só para `/api/`, `/plus/` e `/midia/`, que são os únicos caminhos em que aceita POST, PUT, PATCH e DELETE. Hoje ele recusa tudo que não seja GET/HEAD (`servir.mjs:70-73`). Se o destino recusar a conexão, o proxy responde `503` com o JSON acima.
  - O Node da API escuta **só** em `127.0.0.1`.
  - O `servir.mjs` continua podendo abrir na rede local para testes no celular (`servir.mjs:111`, pedido do dono em `b968267`). O celular chega à API pelo proxy, então nada mais fica exposto.
- **Produção.** Nginx (ou Caddy) com HTTPS serve `portal/publicar/`, que é a saída do build com lista branca, e faz `proxy_pass` para `127.0.0.1:4870` nos três prefixos, com `proxy_intercept_errors on` e `error_page 502 503 504 = @indisponível`, que devolve o mesmo JSON 503.
  - Hoje não existe etapa de publicação: `ls portal/ferramentas` → gerar-documentos, gerar, modelo-de-página, servir, verificar. O `servir.mjs` serve `/package.json`, `/testes/…` e `/ferramentas/servir.mjs` com resposta 200. `publicar/` resolve isso.

### 2.3 Onde fica cada coisa

| Caminho | Conteúdo | Situação |
|---|---|---|
| `portal/dados/site.js` | **Configuração global do site**: `nome`, `nomeCurto`, `lema` (pt/en), `domínio`, `contatoPrivacidade`, `idiomas` | novo |
| `portal/dados/catálogo/*.js` | Fonte única do catálogo, também para a API. `plano` passa a aceitar `'gratuito' \| 'plus' \| 'premium'` | existente, com validação nova |
| `portal/dados/traduções/en/…` | Textos em inglês: moldura, páginas institucionais, catálogo por ID | novo |
| `portal/scripts/núcleo/api.js` | Cliente único da API (CSRF, prazo, erros) | novo |
| `portal/scripts/núcleo/sessão.js` | Estado da sessão lido pelo `cabeçalho.js` | novo |
| `portal/scripts/núcleo/idioma.js` | `t()` para textos dinâmicos (toasts, erros do montador) | novo |
| `portal/scripts/páginas/*.js` | entrar, criar-conta, recuperar-senha, redefinir-senha, conta-*, planos, cookies, admin-* | novo |
| `portal/estilos/` | Só extensões de `componentes.css`, `layout.css` e `páginas.css` (mais um `admin.css`, se preciso) | existente |
| `portal/ferramentas/gerar.mjs` + `modelo-de-página.mjs` | Geram pt na raiz e en em `/en/`, as páginas de conta e admin (`semÍndice`) e os perfis de anúncio | existente |
| `portal/ferramentas/publicar.mjs` | Copia para `portal/publicar/` só o que é público | novo |
| `portal/servidor/` | A API: cópia de `ander-flow/servidor`, `banco` e `scripts-*`, **sem** o montador de páginas. Tem `package.json` próprio e mantém os nomes ASCII como exceção registrada | novo, pela cópia |
| `portal/servidor/.execucao/` | banco SQLite, e-mails em arquivo, mídia das boas-vindas | fora do git |
| `portal/hospedagem/nginx.conf.exemplo` | Proxy, CSP, perfil de anúncios, 503 em JSON | novo |

O `ander-flow/` fica **congelado como referência** até a última ferramenta ser portada por P1 e P2. Ninguém apaga nada sem pedido do dono.

### 2.4 Sessão, CSRF e CSP

- **Sessão.** O que o Ander Flow faz hoje continua: token opaco de 32 bytes guardado como sha256, cookie HttpOnly e `SameSite=Lax`, validade de 30 dias e renovação a cada 10 minutos (`seguranca-sessao.js:160-192`). Muda o seguinte:
  - Os cookies ganham nomes neutros (`sessao`, `csrf`), porque `af_` carrega a marca antiga.
  - Em produção, levam o prefixo `__Host-`, que exige Secure, Path=/ e nenhum Domain.
  - Entram `TRUST_PROXY=true` e `URL_PUBLICA=<domínio>`.
- **CSRF.** Continua o envio duplo (cookie legível e cabeçalho `X-CSRF-Token`) em todo POST, PUT, PATCH e DELETE.
  - O `cabeçalho.js` chama `GET /api/autenticacao/sessao` em toda página, e é essa resposta que cria o cookie CSRF.
  - `api.js` tenta de novo uma única vez quando recebe `403 csrf_invalido`.
  - **Novo:** o servidor passa a conferir `Origin`/`Sec-Fetch-Site` nas alterações. Hoje não confere.
- **Link de redefinição de senha.** Passa a usar `/redefinir-senha.html#token=…` no fragmento, em vez de `?token=` (`autenticacao-rotas.js:127`). Assim o token não vai para logs nem para o `Referer`.
- **Controle de acesso das páginas.** Sem o montador, as páginas `conta/*` e `admin/*` são HTML público e `noindex`. O script da página consulta a sessão e redireciona para `entrar.html?volta=`. **Os dados** continuam protegidos no servidor (`exigirSessao`, `exigirAdmin`, `admin-rotas.js:35`). Em produção dá para acrescentar depois `auth_request` do Nginx em `/admin/`.
- **CSP.** Uma única fonte, `portal/ferramentas/política-de-segurança.mjs`, usada pelo `servir.mjs` e pelo exemplo do Nginx.
  - Nas páginas sem anúncio, a política atual (`servir.mjs:44-52`) já basta, porque `/api` e `/midia` são `'self'`.
  - A regra "nada de `style=` nem `<script>` embutido" continua valendo. **Não** adotamos o `<script type="application/json">` da decisão 12 do Ander Flow: os textos já vêm escritos no HTML de cada idioma.
  - O perfil com anúncios está em 2.8.

### 2.5 Nome global do site

Existe um único arquivo, `portal/dados/site.js`, com `export const SITE = { nome: 'Ferramentas do Ander', … }`, e tudo lê dele:

| Onde o nome aparece hoje, fixo no código (conferido com grep) | Passa a ler |
|---|---|
| `gerar.mjs:121,165,198,213,343,392` (títulos), `:356` (`name` do manifesto) | `SITE.nome` |
| `modelo-de-página.mjs:33` (marca e `aria-label`) | `SITE.nome` |
| `scripts/comum/documentos/montar-documento-pdf.js:22` (`marca = 'Ferramentas do Ander'`) | `import { SITE }` |
| `vitrine/vitrine-textos.js:6,36` (descrição), `vitrine-cenas.js:9,1065-1079` (assinatura "Ferramentas" + `tx.porAnder`) | a cena de assinatura passa a desenhar `SITE.nome` com quebra automática |
| `gerar.mjs:77` (alt da capa: "Ferramentas **por** Ander: 49 ferramentas grátis em seis áreas.") | alt gerado a partir de `SITE.nome` e do catálogo |
| `ander-flow/servidor/rotas/autenticacao/autenticacao-email-{pt-br,en}.json`, `servidor.js` ("Ander Flow") | a API importa `../dados/site.js` (ESM nos dois lados: `"type": "module"` em ambos os `package.json`) |

**A vitrine não pode ter nem nome nem números embutidos:**

- `número: '49'` e "Seis áreas" (`vitrine-textos.js:9,12,39`) passam a vir do catálogo: `ferramentasProntas.length` (hoje 30) e o número de categorias com ao menos uma pronta.
- A cena "Grátis" (`vitrine-textos.js:29-30,59-60`) perde o Pix e passa a dizer, por exemplo, "Mantido por anúncios discretos. Planos Plus e Premium liberados pelo admin."
- As capas `vitrine/imagens/*.webp` são geradas pela própria cena a partir de `SITE` e do catálogo, com `vitrine/ferramentas/vitrine-renderizar-video.mjs` ou um script irmão. Um carimbo guardado ao lado permite que o `verificar` acuse capa desatualizada.

**Regra nova no `verificar.mjs`:** o texto literal de `SITE.nome` não pode aparecer em nenhum arquivo fora de `dados/site.js`, seja em `scripts/`, `vitrine/`, `ferramentas/` ou `servidor/`. Recomendo **não** tornar o nome editável no admin (decisão 8.11 abaixo): trocar o nome é editar um arquivo e rodar `npm run gerar`.

### 2.6 Idioma pt/en

- **Endereços.** O português continua na raiz, com os caminhos de hoje intactos. O inglês fica em `/en/…`, com os **mesmos slugs**: `/en/f/porcentagem/`.
  - Cada página tem `<html lang>` certo e `hreflang` recíproco.
  - Não há redireção automática pelo `Accept-Language`, o que respeita R16.26 ("não inferir localização por idioma").
  - A troca fica no cabeçalho e no rodapé e leva à página equivalente.
- **Texto estático:** é gerado já traduzido pelo `gerar.mjs`, com um dicionário por página em `dados/traduções/`.
- **Texto dinâmico** (toasts, erros do montador, conta, admin): vem de `scripts/núcleo/idioma.js`, que carrega só o dicionário do `lang` da página.
- **Catálogo em inglês:** fica em arquivos por ID (nome, resumo, palavras de busca). As páginas `/en/` carregam **só** o catálogo em inglês, para não dobrar os cerca de 117 KB que toda página já carrega (`página-de-ferramenta.js:8`).
- **Preferência:** cookie `idioma`, que a API já lê para avisos e e-mails (`servidor-idioma.js:63-64`), mais `conta.idioma` (`PATCH /api/conta`).
- **Moeda e números.** Os cálculos continuam brasileiros, em R$ e pelas regras do Brasil. O `Intl` passa a seguir o idioma da página: hoje está fixo em `'pt-BR'` (`formatar-moeda.js:2`). A página em inglês avisa que as regras são brasileiras.
- **`verificar.mjs:105`**, que hoje exige `lang="pt-BR"`, passa a exigir o `lang` da pasta.
- **Fonte das traduções:** os 22 dicionários `*-en.json` do Ander Flow (`find ander-flow/frontend -name "*-en.json" | wc -l` → 22) servem de ponto de partida para conta, admin e avisos.
- As ferramentas em inglês entram numa onda própria (Onda 9). Até lá, a versão em inglês de uma ferramenta não traduzida **não é gerada**, e o seletor avisa, de forma honesta, que ela só existe em português.

### 2.7 Catálogo único e planos

- A API deixa de ler os manifestos do Ander Flow (`servidor-catalogo.js:40-69`). Ela passa a importar `portal/dados/catálogo.js`, com um adaptador fino. Favoritos, trabalhos e uso validam o slug nesse catálogo.
- Um só vocabulário: `gratuito | plus | premium`.
  - A migração 004 recria `usuarios` e `ferramentas_ajustes`. O `CHECK plano IN ('gratis','plus')` (`banco-migracao-001-inicial.sql:12,105`) só muda recriando as tabelas no SQLite, e a migração converte `gratis` em `gratuito`.
  - Acompanham a mudança `admin-validacao.js:6`, `servidor-planos.json` e `exigirPlano`, que passa a comparar por hierarquia (gratuito < plus < premium) em vez de igualdade (`ferramentas-rotas.js:530`).
  - Não há banco de produção, então o custo é baixo.
- `conferirCatálogo` (`dados/catálogo.js:69-93`) passa a validar os valores de `plano`. Hoje não valida.
- **Porta de entrada para as ferramentas futuras:**
  - `local:false` indica que a ferramenta precisa do servidor e usa `api.js`, com a mensagem da decisão 21.
  - `GET /api/conta` → `limites.lote_arquivos` é o limite de lote que o montador expõe aos módulos (ex.: lote maior no Plus).
  - `/plus/:slug/:recurso` entrega código por plano.
  - `POST /api/ferramentas/:slug/uso` registra métricas.
  - `ferramentas_ajustes` permite ao admin ligar e desligar ferramentas, trocar o plano e o destaque. Se a API cair, a ferramenta abre normalmente.

### 2.8 Anúncios (decisão 22) com páginas estáticas

A decisão 22 pede nonce por resposta e decisão tomada no servidor. HTML estático puro não faz isso. Proposta (a validar no Nginx real, na Onda 8):

1. **Quais páginas podem ter anúncio** é decidido na geração. O `gerar.mjs` marca as páginas elegíveis (ferramenta, lista, início, categoria) e emite um mapa `perfis-anúncio.map` com esses caminhos.
   - Ficam fora: conta, admin, entrar, recuperar senha, planos, termos, privacidade, cookies, 404, salvos, orçamento compartilhado, impressão e páginas infantis ou escolares (a confirmar, decisão 8.9).
   - Nas páginas elegíveis, todo `<script>` sai com `nonce="__NONCE__"`.
2. **Se os anúncios estão ligados** é decidido pelo admin. Ao salvar um ID de editor válido com a opção "ligado", a API grava um arquivo-sinal, que o Nginx testa com `if (-f …)`.
   - Com a página elegível **e** o sinal presente, o Nginx troca `__NONCE__` por `$request_id` (`sub_filter`) e envia a CSP com `'nonce-$request_id' 'strict-dynamic'` e os domínios do Google.
   - Em qualquer outro caso, sai a CSP estrita de hoje e o `__NONCE__` é simplesmente ignorado. **Sem ID válido, a CSP não muda**, como pede a decisão 22.
   - O `servir.mjs` faz o mesmo em desenvolvimento.
3. **Se o anúncio aparece para esta pessoa** é decidido na API: `GET /api/anuncios?pagina=` lê a sessão, o plano e a configuração e devolve `{mostrar, editor, blocos}`.
   - O carregador (reaproveitado de `compartilhado/scripts/publicidade/carregar-anúncios.js:12-50`) só injeta o script do Google se `mostrar` for verdadeiro e se já houver escolha na faixa de consentimento.
   - Se a API cair, não aparece anúncio: a falha fecha.
4. **Posições:** `.espaço-publicitário[data-bloco]` depois do resultado e do "como usar" (`gerar.mjs:320-339`), acima do rodapé e entre linhas da lista (`lista.js`). São no máximo 3 por página, com espaço reservado e rótulo "Publicidade".

---

## 3. Resiliência exata (decisão 21)

**Texto único.** A constante vive em `idioma.js`:

- pt: "Serviço indisponível no momento. Volte mais tarde ou tente outra ferramenta."
- en: "Service unavailable right now. Come back later or try another tool."

**O que conta como indisponível.** O `api.js` usa `fetch` com `AbortController` de 8 s. São tratados como indisponível: erro de rede ou status 0, **502, 503 e 504**, resposta que não é JSON e prazo esgotado.

Hoje o cliente do Ander Flow transforma 502/503 sem JSON em `erro_interno` (`ander-flow/frontend/compartilhado/compartilhado-api.js:57-75`). O portal não repete isso. Erro 500 com JSON continua sendo erro genérico ("Algo deu errado"), porque aí o serviço respondeu.

| Situação | Ferramentas `local:true` | Ferramentas `local:false` e recursos Plus/Premium | Conta, admin e trabalhos | Cabeçalho, avisos, boas-vindas, anúncios |
|---|---|---|---|---|
| Node fora do ar | funcionam normalmente (não importam a API) | ao executar: a mensagem acima, no lugar do resultado | formulário mostra a mensagem; "Salvar trabalho" mostra toast com a mensagem e **o resultado fica na tela** | cabeçalho mostra o "Entrar" estático; faixa, pop-up e anúncio **não aparecem**; favoritos seguem no aparelho |
| Node lento (> 8 s) | idem | idem | idem | idem, sem travar a página |
| Banco com erro (500 JSON) | idem | "Algo deu errado. Tente de novo." | idem | idem |
| Estático fora do ar | site fora do ar (depende da hospedagem, fora do alcance do código) | — | — | — |

**Regras de código que garantem isso:**

- O `verificar.mjs` passa a barrar `import` de `núcleo/api.js` e `núcleo/sessão.js` em `scripts/ferramentas/**` e `scripts/cálculos/**`.
- Só o montador chama a API, e sempre por `import()` dinâmico dentro do clique ("Salvar trabalho", recurso Plus), com `catch`.
- Ferramenta com `local:false` declara isso no catálogo e usa uma nova classe `ServiçoIndisponível`, tratada no `catch` de `executar` (`montador.js:240-265`).
- Nenhuma página espera a API para desenhar. O "Entrar" é HTML estático em `.topo__fim` (`modelo-de-página.mjs:55-58`) e só é trocado pelo menu da conta se `/sessao` responder.
- Se o admin desligar uma ferramenta e a API estiver fora, a ferramenta abre normalmente (a falha abre).

**Testes de pronto:**

- `testes/resiliência.test.mjs` (node:test) sobe o `servir.mjs` com a porta da API fechada e confere três respostas:
  - `GET /f/porcentagem/` → 200 HTML;
  - `GET /api/autenticacao/sessao` → 503 `{"erro":"servico_indisponivel"}`;
  - `POST /api/favoritos` → 503 JSON.
- Teste de unidade do mapeamento de status em `api.js`.
- Teste de fumaça no navegador (Playwright com Edge, como na decisão 7 do Ander Flow, dentro de `portal/servidor/`): com a API parada, calcular uma ferramenta e clicar em "Salvar trabalho" mostra exatamente o texto acima e mantém o resultado.

---

## 4. O que é reaproveitado e o que é descartado

### Ander Flow v1

| Reaproveita | Descarta |
|---|---|
| Toda a API JSON: `autenticacao`, `conta` (inclui `exportar`/`excluir` da LGPD e `uso-mensal`), `favoritos` (inclui `juntar`, para sincronizar os favoritos locais), `trabalhos`, `avisos`, `mensagens`, `planos`, `ferramentas/uso`, `admin` inteiro (`servidor/rotas/*`) | `servidor-montador-paginas.js`: montagem de HTML, tradução no servidor, `data-sessao` e erros em HTML |
| Segurança já testada: `seguranca-sessao.js`, `seguranca-senha.js` (scrypt), `seguranca-csrf.js`, `seguranca-limite-trafego.js`, `seguranca-cabecalhos.js`, `servidor-cookies.js`, `servidor-erros.js`, `servidor-controle.js` | todo o `frontend/`, com seu visual, CSS e páginas. O visual que vale é o do portal |
| `banco/` (migrador + 001 com 13 tabelas e `ON DELETE CASCADE`), `scripts-admin-criar.js`, os 132 testes de integração | `/api/idioma/:codigo/:pagina` (depende do montador; o portal gera o texto) |
| E-mails de recuperação em pt/en (passam a usar `SITE.nome`) | `servidor-catalogo.js` baseado em manifestos (trocado pelo catálogo do portal) |
| Os 22 dicionários `*-en.json` como fonte de tradução | `<script type="application/json">` (decisão 12) |

Ajustes obrigatórios no que é reaproveitado:

- O tratador de erros passa a responder JSON também em `/plus` e `/midia`. Hoje devolve HTML pelo montador (`servidor-tratador-erros.js:34-47`).
- O `LOG_NIVEL` documentado como `depuracao` não é aceito pelo código, que só aceita `debug`. É preciso corrigir o README ou o código.

### A16, boas-vindas (`ander-flow/a16-boas-vindas`, `9291d0f`)

- **Reaproveita:**
  - migração 002, com rascunho e publicado versionado e slides em pt/en;
  - `boas-vindas-validacao.js`, com funções puras e 28 testes que passam;
  - `servidor-midia.js`, que confere o tipo pelos bytes, dá nome sha256 e recusa SVG;
  - as rotas públicas e de admin;
  - as regras puras de `compartilhado-boas-vindas.js` (`deveMostrarBoasVindas`, `proximoIndice`, `trocaAutomaticaPermitida`…).
- **Adapta:**
  - `montador.paginas()` vira a lista de páginas do portal, gerada pelo `gerar.mjs`;
  - `variaveisGlobais` passa a ler `SITE` e o número de prontas do catálogo;
  - o teste de contagem de tabelas, que espera 13 e hoje falha em 2 casos.
- **Descarta:** o DOM e o CSS do carrossel. Ele é refeito sobre o `dialog.diálogo` do portal (`componentes.css:286-303`). A tela do admin nunca existiu e é feita do zero.

### A17, anúncios (`ander-flow/a17-anuncios`, `2cd7e98`)

- **Reaproveita:** o esquema `anuncios_configuracao` da migração 003: linha única, ligado, modo de teste, editor e 4 blocos.
- **Não há mais nada no branch:** nenhuma rota e nenhuma tela. O resto é feito na Onda 8.

### origin/main (portal antigo + PR #2 com Prisma)

**Descarta tudo:** `servidor.mjs`, `app.js`, `index.html`, os dois schemas Prisma e `backend/`. Testes em cópia mostraram o seguinte:

- `/.git/config` e `/backend/.env` respondem 200;
- uma URL malformada derruba o processo;
- `req.headers.get` quebra `/api/me`.

**Não se faz merge** de `origin/main` em `ander-flow/v1`. O `merge-tree` dá conflito em `README.md` e `portal/package.json` e traz o Prisma de volta. Ficam só ideias:

- `Preferencia` chave/valor, para tema e idioma sincronizados;
- recentes únicos por usuário+ferramenta;
- o padrão `/api/saude`.

### Sites antigos (`compartilhado/`)

- **Reaproveita:** o carregador de anúncios e a lógica de consentimento em duas camadas, com versão e prazo, e a revogação.
- **Não traz agora:** o Pix de apoio (decisão 25b).

---

## 5. Ondas de implementação, em ordem

Esforço em dias de trabalho de um agente: P ≤ 1, M = 2–3, G = 4–6. Cada onda fica num branch próprio, criado a partir de `ander-flow/v1`, e só termina com `npm run conferir` verde e os testes da API passando.

**Coordenação com P1 e P2.** As Ondas 0 e 1 mexem em `gerar.mjs` e em `modelo-de-página.mjs`. P1 e P2 estão sem a vitrine, e um `npm run gerar` rodado lá refaz o `index.html` sem ela. A regra é esta: **juntar P1 e P2 antes da Onda 0**, ou refazê-los em cima do HEAD. Depois do merge, rodar `npm run gerar` e nunca resolver conflito editando páginas geradas à mão. A Onda 4 mexe em `montador.js`, que o P2 também mexe ("montador em andamento", `122a97f`), então a Onda 4 só começa depois do P2 juntado.

### Onda 0: base limpa e nome global (M)

- **Também nesta onda (decisão 28): erro não se espalha.** Um `isolarBloco(nome, montar)` no núcleo monta cada parte da página (cabeçalho, busca, vitrine, listas, ferramenta) separada, com `try/catch` e captura de promessa rejeitada. Em caso de falha, só aquela parte mostra a mensagem com o desenho e "tentar de novo". Os `import()` dinâmicos e as bibliotecas (pdf-lib etc.) são tratados por quem os carrega, e há um tratador global discreto. Teste Playwright: forçar falha na vitrine, numa ferramenta e na busca, uma de cada vez, e conferir que o resto da página responde.
- **Também nesta onda (decisão 29): animações reais.**
  - `estilos/movimento.css` com tokens de tempo e curva, classes de entrada em cascata e `@keyframes` das ilustrações.
  - `scripts/núcleo/movimento.js` com as curvas e a mola da vitrine, contagem até o valor e observador de tela.
  - Aplicado já na página inicial (cartões e busca), no resultado das ferramentas pelo montador, em copiar, favoritos, tema e menu, nos toasts e na 404 com a ilustração animada.
  - As ondas seguintes aplicam o módulo nas telas novas (conta, admin, pop-ups, carrossel de boas-vindas, anúncios, que só aparecem com fade).
  - Teste: com `reducedMotion: 'reduce'` nada se mexe, e nenhuma animação gera deslocamento de layout (CLS).
- **Também nesta onda (decisão 27):** o conjunto inicial de ilustrações amigáveis em `recursos/ilustrações/` (erro 404, erro do servidor, serviço indisponível, sem conexão, acesso negado, estado vazio, boas-vindas) e a página 404 já com o desenho ao lado do texto. As ondas 2, 5, 6, 7 e 8 usam o mesmo conjunto nas suas telas de erro, pop-ups e estados vazios.

- **O dono vê:** o nome sai de um lugar só. A vitrine mostra os números reais (30 prontas, sem "49" e sem "seis áreas") e deixa de falar em Pix. A página 404 aparece de verdade.
- **Arquivos:**
  - `dados/site.js` (novo);
  - `gerar.mjs`, `modelo-de-página.mjs`, `montar-documento-pdf.js`, `vitrine/vitrine-textos.js`, `vitrine-cenas.js` (assinatura), capas da vitrine;
  - `servir.mjs`: servir `404.html`, hoje procura `páginas/página-não-encontrada.html` (`:62`); e bloquear `testes/`, `ferramentas/`, `package.json`;
  - `ferramentas/publicar.mjs` (novo);
  - `ferramentas/política-de-segurança.mjs` (novo);
  - `armazenamento.js:109` (regex com flag `u`, porque hoje `orçamento.emissor` some na importação);
  - `verificar.mjs`: nome literal proibido e capa desatualizada.
- **Pronto quando:**
  - `grep -rn "Ferramentas do Ander"` só encontra `dados/site.js`;
  - trocar `nome` e rodar `npm run gerar` muda cabeçalho, rodapé, títulos, manifesto, PDF e vitrine;
  - um teste compara o número da vitrine com `ferramentasProntas.length`;
  - um teste de importação restaura `orçamento.emissor`;
  - `curl -i /nao-existe` devolve HTML do 404;
  - `publicar/` não contém `testes/`, `package.json` nem `visuais/`.

### Onda 1: português e inglês na moldura (G)

- **O dono vê:** o seletor PT/EN no cabeçalho e no rodapé. Início, lista, categorias, páginas institucionais, Meus salvos e 404 aparecem em inglês em `/en/`.
- **Arquivos:** `dados/traduções/en/*`, `scripts/núcleo/idioma.js`, `gerar.mjs` (geração dupla e `hreflang`), `modelo-de-página.mjs`, `formatar-moeda.js` e o restante do `Intl`, `verificar.mjs:105`.
- **Pronto quando:**
  - cada página pt tem um par en com `hreflang` recíproco;
  - o `verificar` confere `lang` por pasta e links nos dois idiomas;
  - as páginas `/en/` não carregam o catálogo pt;
  - ferramenta ainda sem tradução não tem página en e o seletor avisa isso honestamente.

### Onda 2: API na mesma origem, entrar, criar conta e recuperar senha (G)

- **Também nesta onda (decisão 30):** saudação com o nome na página inicial, "Olá, {primeiro nome}! O que vamos trabalhar hoje?", em pt e en e com animação de entrada. O nome é lido da sessão e escrito com `textContent`. Sem sessão ou com a API fora do ar, fica o título normal. Na conta, o campo "Como quer ser chamado". Teste: com sessão aparece o nome; sem sessão ou com a API em 503 aparece o título normal, sem erro no console.

- **O dono vê:** o botão "Entrar". O cadastro, a entrada, a saída e a recuperação de senha funcionam; o e-mail de recuperação é gravado em arquivo em desenvolvimento. A página "Minha conta" permite trocar nome, senha, idioma e tema. **Com a API desligada, todas as ferramentas continuam funcionando.**
- **Arquivos:**
  - `portal/servidor/`: cópia do servidor sem o montador, catálogo do portal, cookies neutros, verificação de `Origin`, erros sempre em JSON, link de recuperação com `#token`;
  - proxy no `servir.mjs`;
  - `scripts/núcleo/api.js`, `sessão.js`, `cabeçalho.js`;
  - páginas `entrar`, `criar-conta`, `recuperar-senha`, `redefinir-senha`, `conta/` (pt e en);
  - `hospedagem/nginx.conf.exemplo`.
- **Pronto quando:**
  - os 132 testes de integração passam no endereço novo, com os ajustes de nomes;
  - o `testes/resiliência.test.mjs` da seção 3 passa;
  - o teste de fumaça no navegador (cadastro → sair → entrar → trocar senha) passa em pt e en;
  - o admin é criado só pelo script local.

### Onda 3: textos honestos, consentimento, LGPD e favoritos sincronizados (M). Condição para abrir contas ao público

- **O dono vê:**
  - política de privacidade, termos e a página de cookies reescritos;
  - a faixa de primeira visita com a escolha guardada, versão e prazo;
  - "Meus dados" com exportar e excluir a conta, ao lado da cópia local que já existe;
  - favoritos que sobem para a conta no primeiro login.
- **Arquivos:**
  - textos de `gerar.mjs` (hoje dizem "Preciso criar conta? Não." em `:114`, "Nada é enviado para servidor." em `:178` e "não usa… anúncios nesta versão" em `:245-248`);
  - `modelo-de-página.mjs:78,93`;
  - `package.json` (descrição);
  - `salvos.js`, `preferências.js` (camada de sincronização com `/api/favoritos/juntar`), página `cookies`.
- **Pronto quando:**
  - um `grep` pelas frases antigas não encontra nada;
  - a exportação baixa o JSON da conta, e a exclusão pede senha e apaga em cascata (teste de integração);
  - no login, os favoritos locais acima da cota ficam só no aparelho, com aviso (regra da decisão 8.10).

### Onda 4: planos e trabalhos salvos (G)

- **O dono vê:**
  - a página "Planos" com Grátis, Plus e Premium e o texto claro "liberados pelo admin, sem cobrança automática; peça pela sua conta", sem botão de pagar;
  - o botão "Salvar trabalho" no resultado de toda ferramenta, e a página "Meus trabalhos" para reabrir, renomear e apagar;
  - a etiqueta Premium na lista.
- **Arquivos:**
  - migração 004 (`gratuito/plus/premium`), `servidor-planos.json`, `exigirPlano` por hierarquia, `admin-validacao.js`;
  - `dados/catálogo.js` (validação de `plano`), `lista.js` (etiqueta);
  - `montador.js`: botão em `desenharResultado:180-192`, `preencherFormulário(dados)` para reabrir por `?trabalho=<id>`, limite de lote vindo de `/api/conta`, registro de uso com `fetch keepalive`;
  - páginas `planos` e `conta/trabalhos`.
- **Pronto quando:**
  - a cota recusa no servidor (`403 limite_do_plano`) e a tela explica;
  - um trabalho salvo reabre com os mesmos valores;
  - um teste confirma que Premium ≥ Plus em `/plus/`;
  - o resultado continua na tela quando a API está fora.
- **Depende de:** a decisão sobre os limites do Premium (8.2). Até lá, a coluna Premium aparece com os limites que o dono aprovar, e nada é inventado.

### Onda 5: admin no visual do portal (G)

- **O dono vê** em `/admin/`:
  - resumo;
  - usuários, com a troca **manual** de plano, papel e suspensão;
  - encerramento de sessões;
  - ferramentas (ligar, desligar, plano, destaque);
  - bloqueios de tráfego;
  - registro das ações do admin;
  - o nome do site só para leitura.
- **Arquivos:** páginas `admin/*` (moldura do portal sem a barra inferior, `noindex`), `scripts/páginas/admin-*.js`, `estilos/admin.css`.
- **Pronto quando:**
  - um não-admin recebe 403 na API e é redirecionado na página;
  - o admin não consegue rebaixar nem suspender a si mesmo (regra já existente);
  - toda alteração aparece em `registros_admin`;
  - os textos vindos do banco passam por `escapar()` ou `textContent`, com teste de XSS usando `<img onerror>` num nome de usuário.

### Onda 6: avisos e mensagens (M)

- **O dono vê:**
  - avisos criados no admin aparecendo na faixa `.avisos`, que já existe no CSS (`layout.css:79-92`), entre o cabeçalho e o `<main>`, com o contador de não lidos no menu da conta;
  - mensagens entre o usuário e o admin, com lida e não lida;
  - o pedido de Plus ou Premium feito por mensagem.
- **Nomes definidos, para acabar com a confusão:** `avisar()`/`#aviso` continua sendo o toast; a faixa passa a se chamar **"comunicados"** no código novo (`comunicados.js`), mesmo com a rota `/api/avisos`.
- **Pronto quando:**
  - com a API fora, a faixa não aparece e a página não quebra;
  - o aviso respeita o público e o idioma;
  - o teste de XSS é repetido.

### Onda 7: boas-vindas e novidades em carrossel (M) — atualizada em 04/10 (decisão 31)

- **O dono vê:** na primeira visita, um cartão grande e flutuante com botão de fechar: animação à esquerda, mensagem à direita. Com mais de uma novidade, seta para a direita (e para a esquerda a partir da segunda) e uma barra discreta de segmentos mostrando quantas há. No admin, uma tela para adicionar, editar, reordenar, agendar e remover novidades em pt e en.
- **Arquivos:** migração 002 e rotas do A16 adaptadas (tabela `novidades`), `scripts/núcleo/novidades.js` sobre o `dialog.diálogo`, página `admin/novidades`, cookie `visto_novidades` declarado na faixa de consentimento e na privacidade.
- **Pronto quando:**
  - o cartão nunca abre em página de ferramenta, só depois da faixa de consentimento e no máximo uma vez por página vista;
  - depois de fechado, só volta se houver novidade publicada depois da última vista;
  - sem seta e sem barra quando há um item só; a troca automática fica desligada com "reduzir movimento";
  - o teclado navega (setas, Esc fecha, foco preso no cartão) e o leitor de tela lê "item 2 de 5";
  - um SVG enviado é recusado e um PNG de mais de 1 MB também; textos entram só como texto;
  - os 28 testes do A16 passam e o teste de tabelas é atualizado.

### Onda 8: anúncios (G)

- **O dono vê** no admin o ID do editor e dos blocos por posição, com "ligado" e "modo de teste". Nas páginas elegíveis aparecem os blocos com o rótulo "Publicidade". Quem tem Plus ou Premium não vê anúncio.
- **Arquivos:**
  - migração 003 do A17 e a rota `GET /api/anuncios`;
  - carregador baseado em `compartilhado/scripts/publicidade/carregar-anúncios.js`;
  - perfis de CSP da seção 2.8 no `servir.mjs` e no Nginx de exemplo;
  - consentimento ("Só o essencial" conforme a decisão 8.4);
  - `ads.txt` gerado.
- **Pronto quando:**
  - sem ID válido, a CSP servida é idêntica à de hoje;
  - as páginas proibidas não têm espaço de anúncio;
  - há no máximo 3 blocos por página;
  - nada do Google carrega antes da escolha;
  - um bloco vazio some;
  - com a API fora, não aparece anúncio;
  - o teste da CSP com nonce passa no Nginx real.

### Onda 9: ferramentas em inglês e porta para as ferramentas que precisam do servidor (G, por família de ferramentas)

- **O dono vê:** cada ferramenta pronta com versão em inglês.
- **Arquivos:** módulos em `scripts/ferramentas/*` (textos via `idioma.js`), `dados/traduções/en/catálogo/*`, e a classe `ServiçoIndisponível` exercitada pela primeira ferramenta com `local:false`, quando o P1, o P2 ou um sucessor trouxer uma.
- **Pronto quando:** toda ferramenta pronta tem página en, e os testes de cálculo continuam iguais porque os cálculos não mudam com o idioma.

### Onda 10: publicação (M, depende do dono)

- **Entrega:** domínio com HTTPS, Nginx, a API como serviço, backup do SQLite com **restauração testada**, sitemap real (hoje `https://exemplo.invalid/portal/` em `gerar.mjs:383`), contato de privacidade e SMTP ou o procedimento de recuperação de senha definido na decisão 8.6.
- **Pronto quando:** uma restauração de backup é feita num ambiente de teste, o teste de resiliência passa no servidor real, e o dono autoriza por escrito (R01.36).

---

### Onda 11: admin edita o site inteiro (G) — decisão 32. Depende das Ondas 2 e 5

- **O dono vê:** no admin, "Textos do site" (busca por chave ou por página, edição em pt e en, histórico e "voltar ao original"), ferramentas (nome, resumo, destaque, ligar e desligar), categorias, planos e limites, e as regras de pontos e níveis. O nome do site também é editável.
- **Arquivos:** migração (`conteudos`, `conteudos_historico`), `scripts/núcleo/textos-editaveis.js` (troca `[data-texto]` por `textContent`), `gerar.mjs` marcando cada texto editável com a chave, `dados/textos-padrão.js` gerado, página `admin/textos`.
- **Pronto quando:**
  - toda alteração aparece em `registros_admin` e pode ser desfeita;
  - com a API fora do ar, o texto padrão aparece e nada quebra;
  - texto com `<img onerror>` aparece como texto, sem executar;
  - um teste lista todo texto visível das páginas geradas e falha se algum não tiver chave (nada fica fora do alcance do admin, salvo os marcados como técnicos).
- **Cuidado:** o texto editado chega depois do HTML. Para o mecanismo de busca, vale o texto padrão; mudanças importantes de texto devem ser refletidas no padrão com `npm run gerar`. O painel mostra um aviso quando o texto editado difere do padrão.

### Onda 12: @usuário, perfil e nível (G) — decisão 34 (a, b, c). Depende das Ondas 2 e 4

- **O dono vê:** no cadastro, o @usuario obrigatório com verificação ao vivo e até 3 sugestões; a página "Meu perfil" com biografia, idade, de onde é, avatar, ferramentas recomendadas (só as já usadas) e as mais usadas, calculadas sozinhas; o nível subindo com o uso e o modal animado de subida de nível; o ícone de nível evolutivo infinito.
- **Arquivos:** migração (`usuarios.arroba`, `perfis`, `uso_por_ferramenta`, `pontos`, `niveis_vistos`), `scripts/núcleo/ícone-de-nível.js` (SVG gerado a partir do número), `scripts/núcleo/subir-de-nível.js` (modal), `estilos/nível.css`, rotas `/api/arroba/disponivel`, `/api/perfil`.
- **Pronto quando:**
  - dois cadastros ao mesmo tempo com o mesmo @usuario: só um passa (índice único sem diferenciar maiúscula);
  - a verificação ao vivo tem limite de tentativas e não revela mais do que "livre" ou "ocupado";
  - recomendar ferramenta que nunca usou é recusado no servidor;
  - os pontos têm teto diário e um teste tenta forçá-los;
  - o ícone de nível do 1, do 10, do 100 e do 1000 são diferentes entre si, e o do 100000 ainda é gerado sem erro;
  - com "reduzir movimento", o modal mostra só o quadro final.

### Onda 13: amizades, seguir e bloqueio (M) — decisão 34 (d, e). Depende da Onda 12

- **O dono vê:** "Adicionar aos amigos" no perfil, a confirmação do outro lado (com aviso na conta), "Seguindo" enquanto não aceitar, e "Bloquear".
- **Pronto quando:**
  - pedido sem aceite vira só "seguindo", sem acesso a mais nada;
  - um bloqueio, nos dois sentidos, faz o perfil devolver **a mesma resposta e o mesmo tempo** de uma conta inexistente, com o texto exato da decisão 34;
  - quem bloqueia não recebe mensagens, menções nem pedidos do bloqueado;
  - apagar a conta remove amizades, seguidores e bloqueios.

### Onda 14: chat global (G) — decisões 33 e 36. Depende das Ondas 12 e 13 e das condições da decisão 36

- **O dono vê:** a bolha animada no canto inferior direito; o painel com a tela de uso e privacidade na primeira vez; as salas por categoria e por ferramenta; as conversas diretas entre amigos; a própria pessoa à direita, as outras à esquerda; o admin com o nome destacado e animado; avatar, cargo, tempo no site e nível em cada mensagem; clique abre o perfil; aviso pequeno e clicável de subida de nível no cabeçalho da sala global; denúncia, silenciar e banir no admin.
- **Arquivos:** migração (`salas`, `mensagens`, `denuncias`, `silenciados`), rotas `/api/chat/*` com Server-Sent Events, `scripts/núcleo/chat/*`, `estilos/chat.css`, ilustração e ícone animado da bolha, página `admin/chat`.
- **Pronto quando:**
  - um visitante sem conta não vê a bolha nem consegue chamar a API;
  - mensagens de bloqueados não chegam a quem bloqueou, nem pelo tempo real;
  - o limite de envio, o tamanho máximo e o bloqueio de links para contas novas funcionam no servidor;
  - mensagem com `<img onerror>` aparece como texto;
  - com a API fora do ar a bolha some e as ferramentas seguem iguais;
  - a primeira abertura exige o aceite e o grava; com "reduzir movimento" nenhuma animação do chat se mexe;
  - exportar e excluir dados incluem as mensagens.

---

## 6. Contradições com a documentação antiga e como ficam

| Documento antigo | Diz | Como fica |
|---|---|---|
| `README.md:3`, `portal/package.json` (description) | "sem cadastro, sem banco de dados…"; "site estático, sem servidor e sem cadastro" | Reescrito na Onda 3. As ferramentas continuam sem cadastro e no navegador; a conta é opcional |
| `README.md:58-61` | Conta, planos, admin, avisos e pop-up "não feitos: exigem servidor" | Vira o roteiro das Ondas 2 a 8 |
| `README.md:51` | O dono recusou o visual; há quatro propostas em `visuais/` | Superado pela decisão 24: vale o visual do portal. `visuais/` sai do que é publicado |
| `README.md:133` | "qualquer hospedagem de arquivos serve, inclusive GitHub Pages" | Estático + Node atrás de proxy na mesma origem (seção 2) |
| `documentação/decisão-sobre-cadastro-e-servidor.md:3,16` | Sem backend; se houver persistência, a seção 18 inteira passa a valer | O gatilho disparou: a seção 18 vira obrigatória, e o que ela exige está coberto nas Ondas 2 a 5 e 10 |
| `arquitetura-e-contratos.md:7` | Não há backend, banco nem cadastro | Substituído pela seção 2 deste plano |
| `matriz-de-requisitos.md:38, :224-249, :1001-1005, :1049` | Seção 18 e R05.x "não aplicável" | Reabertos. Chat (18.2) e feedback (18.3) dependem da decisão 8.7 |
| `dados-que-o-proprietário-precisa-preencher.md:3,27` | Não há segredo a fornecer; não há hospedagem | Novos itens: segredo de sessão, admin, SMTP, domínio e ID do AdSense (este fica no admin) |
| `como-conectar-o-adsense.md:20-30,56` | JSON público + `npm run construir` | Configuração no admin (decisão 22) + perfil de CSP da seção 2.8 |
| `como-conectar-o-adsense.md:57` | "Rejeitar" não carrega nada | Conflita com a decisão 22 ("Só o essencial" = anúncio não personalizado). Fica com o dono (8.4) |
| `guia-do-executor.md:54` | 1 bloco por ferramenta | Vale a decisão 22, que é mais nova: até 3 por página, nas posições definidas |
| `proteções-e-limites-de-segurança.md:9` | innerHTML proibido e barrado pelo `verificar` | Hoje o portal usa innerHTML com `escapar()` em 15 pontos. Todo conteúdo novo vindo do banco entra por `textContent` ou criação de nós; o `verificar` passa a barrar innerHTML em arquivos novos |
| `convenções-e-exceções-técnicas.md:5` | Nomes em português com acento | `portal/servidor/` mantém os nomes ASCII do Ander Flow como **exceção registrada**, para não renomear código testado |
| PROMPT V2 `:5` | Idioma obrigatório: PT-BR | O PT-BR continua sendo o idioma principal; o inglês é adicional (decisão 25d) |
| `matriz-de-requisitos.md:1065` (R22.09) | Servidores locais em 127.0.0.1 | A API escuta só em 127.0.0.1. O `servir.mjs` pode abrir na rede para testes no celular (pedido do dono), sem expor a API diretamente |
| `matriz:992` (R17.22) | Nenhuma API de pagamento | Mantido: o admin libera o plano à mão (decisão 25c) |
| `ander-flow/docs/decisoes.md` itens 1, 9, 10, 12, 19D | Portal "recusado visualmente"; sem anúncios; aviso só informativo; JSON no HTML; orçamento sem link | 1 é superado pela 24; 9 e 10 pela 22; 12 não é adotado no portal; no 19D vale a do portal (link pelo `#`, `decisoes-projeto.md:84-87`) |
| Decisão 21 → `docs/proposta-plus-premium.md` | A proposta decide os planos | **O arquivo não existe** (`ls ander-flow/docs`). A decisão 8.2 cobre isso |
| `origin/main` (README, Prisma, `backend/`) | Login com Prisma e OAuth | Superado; nada de merge (seção 4) |
| `estado-da-execução.md` (14/09), relatório final em rascunho | Estado antigo | Atualizados junto com a Onda 0, com a autorização do dono para mexer na documentação da raiz |

---

## 7. Riscos

1. **Promessas falsas no ar.** Se as contas ou os anúncios forem publicados antes da Onda 3, o site continua dizendo "sem cadastro", "nada é enviado" e "não usa anúncios". Isso é risco de LGPD e de confiança. *Mitigação:* a Onda 3 é condição para publicar e há um `grep` no critério de pronto.
2. **XSS na mesma origem da sessão e do admin.** Nomes, mensagens, avisos e slides vêm do banco, e o portal monta HTML com innerHTML em 15 lugares. *Mitigação:* conteúdo do banco só por `textContent`, teste de XSS nas Ondas 5 a 7 e regra no `verificar`.
3. **O perfil de CSP com nonce no Nginx** (`sub_filter` + `if -f` + `map`) não foi validado em servidor real. *Mitigação:* protótipo no começo da Onda 8. Se não funcionar, a alternativa é um servidor Node de estáticos **separado** da API, que injeta o nonce.
4. **Conflitos com P1 e P2** em `gerar.mjs`, `montador.js`, no catálogo e no `index.html` gerado, porque nenhum dos dois tem a vitrine. *Mitigação:* a ordem da seção 5, sempre regenerar depois do merge, e o ID de catálogo para `margem-de-contribuicao` definido pelo P1 antes da Onda 4.
5. **Premium sem definição** trava a Onda 4.
6. **Recuperação de senha sem SMTP.** Em produção não há e-mail real, e o site não pode dizer "e-mail enviado" sem envio (prompt-mestre:413). *Mitigação:* decisão 8.6.
7. **Idioma inglês.** Tudo que é texto passa a existir duas vezes. Se a Onda 1 atrasar, cada onda seguinte gera retrabalho de tradução. *Mitigação:* a Onda 1 vem antes de qualquer tela nova.
8. **Sem testes de interface no portal.** Hoje há só node:test de código puro: 86 testes, em 14/37/15/20. *Mitigação:* testes de fumaça com Playwright e Edge dentro de `portal/servidor/`, com o Edge instalado (decisão 7).
9. **Favoritos:** o aparelho guarda até 60 (`preferências.js:4`) e a conta grátis aceita 10 (decisão 8). A fusão pode perder dados. *Mitigação:* o excedente fica local e aparece um aviso.
10. **Cookies compartilhados entre portas** em 127.0.0.1: portal e Ander Flow rodando lado a lado confundem a sessão e o CSRF. *Mitigação:* em desenvolvimento, o Ander Flow antigo não roda junto com a API nova; os nomes neutros dos cookies também ajudam.
11. **Publicação sem filtro.** Publicar `portal/` como está expõe `testes/`, `ferramentas/` e `package.json`. *Mitigação:* `publicar/` com lista branca (Onda 0).
12. **Branch local à frente do remoto.** `ander-flow/v1` está 13 commits à frente do `origin`, e o trabalho só existe nesta máquina. *Mitigação:* o push depende de autorização (8.13).
13. **Custo de hospedagem:** Node, SQLite persistente, backup e HTTPS têm de caber em R01.15.

---

## 8. Decisões que ainda são só do dono

1. **Hospedagem e domínio.** *Recomendo* um VPS com Nginx, a API Node e o SQLite em disco, tudo no mesmo domínio.
2. **Premium: limites e recursos.** Hoje existem Grátis 10/3/3 e Plus 500/500/100, sem Premium (`servidor-planos.json`). *Recomendo* Premium = Plus + processamento no servidor + cotas maiores, com números definidos por você antes da Onda 4.
3. **Mostrar preço dos planos?** O arquivo tem R$ 14,90 e R$ 149 para o Plus. *Recomendo* não mostrar preço enquanto a liberação for manual e escrever "peça pela sua conta".
4. **Consentimento: o que faz "Só o essencial"?** Mostrar anúncio não personalizado (decisão 22) ou não carregar nada (doc raiz)? E a CMP do Google para EEE, Reino Unido e Suíça? *Recomendo* seguir a decisão 22 e usar a mensagem de consentimento gratuita do próprio Google para essas regiões.
5. **Nome editável no admin?** Resolvido em 04/10 (decisão 32): sim, com `dados/site.js` como valor padrão.
6. **Recuperação de senha em produção.** Existe SMTP gratuito já disponível? *Recomendo* que, sem SMTP, o admin gere o link de redefinição pelo painel.
7. **Chat (decisão 33, pedido do dono em 04/10).** Antes era "deixar de fora"; agora entra, na Onda 14, e só abre com as condições da decisão 36. O botão de feedback segue de fora: as mensagens da conta cobrem.
8. **Inglês:** os mesmos slugs em `/en/` e R$ com as regras brasileiras também no inglês? *Recomendo* sim nos dois casos, e indexar as páginas em inglês.
9. **Páginas escolares e infantis sem anúncio?** *Recomendo* que sim.
10. **Favoritos acima da cota no primeiro login.** *Recomendo* que o excedente fique só no aparelho, com aviso.
11. **Admin no mesmo domínio, em `/admin/`**, com a moldura do portal sem a barra inferior. *Recomendo* que sim.
12. **Login com Google, Apple ou X** (previsto no PR #2). *Recomendo* não: só e-mail e senha.
13. **`main` do GitHub e push.** *Recomendo* substituir o `main` pelo `ander-flow/v1` quando você aprovar, sem merge do `origin/main`, e autorizar o push do branch local.
14. **Futuro da pasta `ander-flow/`.** *Recomendo* congelar como referência até a última ferramenta ser portada e depois arquivar, sem apagar sem pedido seu.
15. **Atualizar a documentação da raiz** (README, arquitetura, matriz da seção 18, dados a preencher). *Recomendo* fazer junto com a Onda 0.
16. **Idade mínima do chat.** *Recomendo* 13 anos, com declaração no cadastro, e perfil sem idade visível por padrão.
17. **Moderadores além do admin.** *Recomendo* só o admin no começo; papel de moderador depois.
18. **Retenção das mensagens.** *Recomendo* 90 dias.
19. **Foto de perfil enviada pela pessoa.** *Recomendo* não por enquanto (biblioteca de avatares ilustrados), por causa de moderação de imagem.
20. **Campos do perfil visíveis a quem?** *Recomendo* visíveis só a quem tem conta, cada campo com seu interruptor, e idade e local desligados por padrão.

---

## Habilidades usadas em cada onda (varredura de 29/09)

Os agentes carregam estas habilidades pelo `Skill` antes de começar a parte correspondente:

| Habilidade | Para quê | Ondas |
|---|---|---|
| `frontend-design:frontend-design` | telas novas com acabamento, sem cara de modelo genérico, dentro do visual do portal | 0, 2, 4, 5, 7 |
| `consistent-ui:consistent-ui` | conferir que cada tela nova usa os mesmos componentes e tokens do portal | todas |
| `agentic-council:artisan-motion-design` | linguagem de movimento (decisão 29): tempos, curvas, coreografia, alternativa com "reduzir movimento" | 0, depois cada onda |
| `anidoodle:anidoodle` | só a régua de qualidade (`references/craft-bar.md`), os estilos e o guia `references/workflows/interactive.md`, aplicados às ilustrações amigáveis (decisão 27). A saída é SVG + CSS leve, não vídeo nem canvas | 0, 7 |
| `design-skills:ux-writing` | textos de erro, estado vazio, boas-vindas e saudação (decisões 27, 28 e 30) | 0, 2, 7 |
| `agentic-council:skeptic-failure-mode-analysis` | mapear onde cada bloco pode falhar, para o erro não se espalhar (decisão 28) | 0, 2, 8 |
| `agentic-council:advocate-i18n-review` | português e inglês | 1, 9 |
| `agentic-council:guardian-compliance-review` | LGPD e consentimento | 3, 8 |
| `security-review` e `code-review` | revisão de cada onda antes de juntar | todas |
| `fairmind-design:a11y-audit` e `design-skills:accessibility-audit` | acessibilidade (teclado, leitor de tela, contraste) na conferência | todas |
