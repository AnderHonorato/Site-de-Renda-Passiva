# Debate dos críticos

Dois críticos Sonnet independentes, cada um na própria cópia do projeto, só leitura (`git status --short` vazio ao terminar, conferido pelos dois). Base revisada: commit `ba1f331` (Ondas 0–4 concluídas; 387 testes de unidade/integração e 101 visuais passando). Achado sem evidência seria descartado — nenhum precisou ser.

## Rodada 1

### Crítico T — técnica

| # | Sev. | Achado | Evidência |
|---|---|---|---|
| T1 | MÉDIA | `npm run parar` sempre cai em desligamento forçado quando o servidor sobe com `npm run desenvolver` | `desenvolver` → `parar` imprime "Servidor encerrado (desligamento forçado)."; com `iniciar` imprime "Servidor desligado.". O `process.exit` do servidor não encerra o `node --watch` que o envolve, e a espera de 5 s em `scripts-parar.js` expira |
| T2 | MÉDIA | Limitador global usa o IP cru e os grupos de autenticação usam o IP sem `::ffff:` | `servidor/servidor.js:34` (`chaveIpPadrao` → `req.ip`) × `servidor/seguranca/seguranca-limite-trafego.js:29` (`chaveIp` remove o prefixo) |
| T3 | BAIXA | `POST /api/trabalhos` aceita slug de ferramenta que não existe | `servidor/rotas/trabalhos/trabalhos-validacao.js:41` só valida o formato; favoritos confere com `catalogo.obter` |
| T4 | BAIXA | Busca de usuários do admin com `LIKE '%termo%'` sem índice aproveitável | `servidor/rotas/admin/admin-rotas.js:98` |
| T5 | BAIXA | Token da rota de controle comparado com `!==`, não em tempo constante | `servidor/servidor-controle.js:14` (rota só aceita 127.0.0.1/::1) |
| T6 | BAIXA | `GET /api/ferramentas` devolve ~62 KB (151 ferramentas, a maioria planejada) | `curl -D -` → `Content-Length: 63468`; com `Content-Encoding: gzip` aplicado |

Verificado sem achado: CSP estrita; cookies de sessão e CSRF; CSRF recusa POST sem cabeçalho; 6ª falha de login → 429 com `Retry-After` e bloqueia até a senha certa; injeção SQL no login; XSS pelo nome (escapado no HTML e no JSON embutido); corpo > 100 kB → 413; travessia de caminho → 404; rota de controle nega token ausente/errado; exportar sem `senha_hash`; excluir exige senha; admin não se autorrebaixa; `npm audit --omit=dev` → 0 vulnerabilidades.

### Crítico P — produto

| # | Sev. | Achado | Evidência |
|---|---|---|---|
| P1 | ALTA | Em inglês, número digitado no formato brasileiro vira outro número, sem erro | `frontend/compartilhado/compartilhado-formatar.js:84`: `lerNumero('50,00','en')` → 5000; `lerNumero('5.000,00','en')` → 5. Ponto de equilíbrio em EN (CF 5.000, P 50, CV 20, t 10%) mostrou "1 units / R$10.00" em vez de 200 / 10.000 |
| P2 | ALTA | Na Início, cabeçalho e navegação inferior marcam "Ferramentas" como página atual | `compartilhado-cabecalho.js:8-21`: o conjunto tem `'inicio'`, mas `data-pagina` de `/` é `'principal'`; `aria-current="page"` fica no link `/ferramentas` |
| P3 | MÉDIA | Trocar para EN na Início deixa categorias e "Onde você parou" em português até recarregar | `principal.js` reusa o resultado de `/api/ferramentas` (247-249) no retorno de `aoTrocarIdioma` (274-279) |
| P4 | MÉDIA | Botões PT/EN (32×32) e avatar (34×34) abaixo do alvo de toque de 44px | `compartilhado-cabecalho.css:74-75` e `:109-111`; medido com `getBoundingClientRect()` |
| P5 | BAIXA | Admin mostra "Ferramenta ativa" ligado em ferramenta planejada, que não tem página | `admin-ferramentas.js:113` usa `ferramenta.ativa`, que por padrão é 1 |

Verificado sem achado: tokens de cor, raios 6/10/14, fontes locais e ausência de sombra/gradiente conferidos por `getComputedStyle`; contraste AA calculado nos dois temas (mínimo 4,56:1); Preço de venda reproduz os dois casos do contrato (74,41 e erro com limite 89,8%) com `aria-invalid`/`aria-describedby`.

### Achado do orquestrador (na conferência das evidências)

| # | Sev. | Achado | Evidência |
|---|---|---|---|
| O1 | MÉDIA | O módulo de limite de tráfego tem um byte nulo cru como separador, e o git passa a tratar o arquivo como binário: `git diff` e revisão não mostram mudanças num arquivo de segurança | `servidor/seguranca/seguranca-limite-trafego.js:59` (`` `${grupo}<NUL>${chave}` ``); `git diff --numstat` → `-	-`; `file` → `data`. O grep do Crítico T devolveu "Binary file matches" por isso |

## Réplica

- **T sobre P:** concorda com P1 (ALTA: "resultado numérico errado sem NaN nem erro — o pior tipo de bug numa calculadora"), P3, P4 e P5. Concorda com o fato de P2, mas **rebaixa para MÉDIA**: `aria-current` e indicador visual errados, sem perda de dado nem bloqueio de uso.
- **P sobre T:** concorda com T2 (MÉDIA), T4 e T5 (BAIXA). Em T1, o impacto para quem usa o site é nulo; para o produto seria BAIXA. **Sobe T3 para MÉDIA** com efeito visível: `principal.js` monta "Onde você parou" a partir do slug salvo, e um slug inexistente vira link para página 404 na tela de maior tráfego. Discorda de T6 como "sem compressão" — mas isso veio de um resumo impreciso do orquestrador na réplica; o próprio Crítico T tinha confirmado o gzip.

## Veredito do orquestrador — rodada 1

| # | Achado | Severidade final | Decisão | Dono da correção |
|---|---|---|---|---|
| P1 | `lerNumero` em inglês corrompe número no formato brasileiro | **ALTA** | corrigir, com teste dos casos do crítico nos dois idiomas | A4 (`compartilhado-formatar.js`) |
| P2 | Início marca "Ferramentas" como atual | MÉDIA (aceita a réplica do T: não bloqueia uso) | corrigir, com teste | A4 (`compartilhado-cabecalho.js`) |
| P3 | Categorias e "Onde você parou" não mudam de idioma sem recarregar | MÉDIA | corrigir | A7a (`principal.js`) |
| P4 | Alvo de toque de 32/34px no cabeçalho | MÉDIA | corrigir (44px de área, o visual pode ficar menor) | A3 (`compartilhado-cabecalho.css`) |
| P5 | Interruptor "ativa" em ferramenta planejada | BAIXA | corrigir | A10b (`admin-ferramentas.js`) |
| T1 | `parar` forçado no modo desenvolver | MÉDIA (mantida: o §8 exige desligamento limpo que fecha o banco) | corrigir | A1a (`scripts-iniciar.js` / `scripts-parar.js`) |
| T2 | Chave de IP sem normalizar no limitador global | MÉDIA | corrigir, usando a mesma `chaveIp` | A1a (`servidor.js`) |
| T3 | Trabalho aceita slug inexistente | MÉDIA (aceita a réplica do P: gera link 404 na Início) | corrigir, conferindo no catálogo como favoritos | A6b (`trabalhos-validacao.js` / rotas) |
| T4 | `LIKE` sem índice na busca do admin | BAIXA | **não corrigir agora** — irrelevante na base atual; pendência documentada | — |
| T5 | Token de controle sem comparação em tempo constante | BAIXA | corrigir (uma linha, alinha com CSRF e sessão) | A1a (`servidor-controle.js`) |
| T6 | Tamanho de `/api/ferramentas` | BAIXA | **não corrigir agora** — gzip já aplicado; pendência documentada se o catálogo crescer muito | — |
| O1 | Byte nulo cru torna o módulo de tráfego "binário" para o git | MÉDIA | corrigir (escape `\u0000`, mesmo valor em execução) | A5 (`seguranca-limite-trafego.js`) |

Houve correção **ALTA** (P1), então haverá **rodada 2**, só sobre os pontos corrigidos.

Correções agrupadas em dois agentes, cada um restrito à união dos escopos dos donos originais (`.orquestracao/propriedade.json`): **C1-correcoes-front** (P1–P5: A3, A4, A7a, A10b) e **C2-correcoes-servidor** (T1, T2, T3, T5, O1: A1a, A5, A6b).
