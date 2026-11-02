# Briefing comum — Onda 2

Vale para todo agente da Onda 2. Leia inteiro antes de começar.

## Onde trabalhar
- Seu worktree: `C:\Projetos\Andamento\1. Sites de Renda Passiva (ADS)\.claude\worktrees\ander-<seu-id>\` (o orquestrador informa o id). O projeto fica em `ander-flow/` dentro dele. **Não mexa em nenhuma outra pasta do disco.**
- Já estão prontos: `node_modules` (junção), bibliotecas e fontes copiadas, `.env`. Não rode `npm install`.
- Base comum: commit `122102d`.

## O que já existe (Onda 1) — use, não reescreva
- `docs/contratos.md` é a fonte da verdade. Leia §1 sempre, e as seções que o seu briefing indicar.
- Servidor completo: `node scripts/scripts-iniciar.js` sobe tudo (porta 4870+; a saída diz a porta). Pare com `node scripts/scripts-parar.js`. Rotas novas em `servidor/rotas/<nome>/<nome>-rotas.js` são carregadas sozinhas; páginas novas em `frontend/paginas/<nome>/<nome>.html` também.
- Banco: `node banco/banco-migrador.js` e `node banco/sementes/banco-sementes.js`. Para ter um admin de teste: `node scripts/scripts-admin-criar.js --email admin@teste.local --nome Admin` com a senha pela entrada padrão (ex.: `echo "senha-de-teste-123" | node scripts/scripts-admin-criar.js --email ...`).
- Nos testes de integração: `import { criarAplicativo } from '../../servidor/servidor.js'`, `import { abrirBanco } from '../../banco/banco.js'`, `import { migrar } from '../../banco/banco-migrador.js'`, `carregarConfiguracao` de `servidor/servidor-configuracao.js`. Use banco `:memory:` migrado e `supertest`-like com `fetch` num servidor em porta 0 (não há supertest instalado; use `app.listen(0)`).
- CSRF: toda chamada que altera dados precisa do cookie `af_csrf` e do cabeçalho `X-CSRF-Token` igual. Nos testes: faça um GET primeiro, leia o `Set-Cookie`, reenvie.
- CSS comum pronto em `frontend/compartilhado/*.css` com as classes do contrato §6.2 — **use essas classes**; CSS próprio só no arquivo da sua página, só com variáveis (`var(--cor-…)`, `var(--espaco-…)`, `var(--raio-…)`). A página `/vitrine` (rode o servidor) mostra todos os componentes.
- JS comum pronto em `frontend/compartilhado/*.js` (contrato §12). Importe por `/estatico/compartilhado/<arquivo>.js`.
- Dicionário compartilhado: `frontend/compartilhado/compartilhado-idioma-pt-br.json` (não edite; chave compartilhada nova → PEDIDOS). Suas chaves vão no `-idioma-pt-br.json` da sua pasta. **Não crie `-idioma-en.json`** (outro agente faz).

## Design
Arquivos (somente leitura; leia por trechos com `grep -n`, nunca inteiros):
- `C:\Projetos\Andamento\1. Sites de Renda Passiva (ADS)\modelo\Portal Ander Flow - 1 Sistema e telas.dc.html`
- `...\modelo\Portal Ander Flow - 2 Estados e mobile.dc.html`
- `...\modelo\Portal Ander Flow - 3 Trabalho e admin.dc.html`
Cada tela tem `data-screen-label="..."`. Converta `style=` em classes; nunca copie `style=`, `style-hover=`, textos fixos ou números fixos do design (ex.: "150 ferramentas" vira `{ferramentas_total}`).

## Regras que reprovam
- Nome de arquivo fora do padrão; texto visível no HTML/JS fora de chave de idioma; `style=`/`onclick=`/`<script>` inline; `innerHTML` com dado; cor literal; SQL concatenado; permissão só no front; número fixo na interface.
- Rode antes de terminar: `node scripts/scripts-verificar-nomes.js` e `node scripts/scripts-verificar-textos-fixos.js` (sem erro nos seus arquivos). `scripts-verificar-idiomas.js` vai reclamar da falta dos `-en.json` — ignore só essa reclamação; qualquer outra (chave usada e inexistente no pt-BR) é sua.
- Se sua entrega tem tela: suba o servidor, abra com Playwright (`chromium.launch({ channel: 'msedge' })`) em 1440×900 e 390×844, claro e escuro (`localStorage['af-tema']`), confira que não há erro no console nem violação de CSP, e compare com o design. Capturas numa pasta temporária FORA do projeto.

## Propriedade e entrega
- Só crie/edite arquivos que casem com os padrões do seu agente em `.orquestracao/propriedade.json`.
- `node scripts/scripts-verificar-propriedade.js <SEU-AGENTE> --base 122102d` → tem que dar APROVADO.
- Commit no seu branch: mensagem `feat: ...` em português, última linha `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- RELATÓRIO (máx. 15 linhas, sem colar código): STATUS | ARQUIVOS | TESTES (comando e resultado) | TELAS CONFERIDAS | PENDÊNCIAS | PEDIDOS.
