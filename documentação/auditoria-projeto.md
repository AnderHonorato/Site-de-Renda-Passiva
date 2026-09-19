# Auditoria do projeto — Fase 1

Data: 19/09/2026 · Autor: orquestrador (Claude Opus 5) · Branch de trabalho: `portal/ferramentas-v2`
Commit de segurança anterior à auditoria: `5bee109` (`checkpoint: estado inicial antes da reconstrução do portal de ferramentas`).

Esta auditoria descreve o que existe **hoje** no repositório, antes de qualquer alteração da reconstrução. Não contém planos: só o que foi encontrado e verificado.

---

## 1. Mapa do repositório

| Caminho | O que é | Situação |
|---|---|---|
| `1. Ferramentas para confeitaria/` … `6. Moldes de caixas e embalagens/` | Seis sites estáticos independentes, com páginas, cálculos, testes e pacote de publicação | Funcionando e testado (357 testes automáticos na última execução) |
| `compartilhado/` | Código comum dos seis sites (100 módulos) copiado para cada produto por `npm run sincronizar` | Funcionando |
| `portal/` | Tentativa anterior de portal unificado (commit `3f1043a`) | **Fachada**: ver seção 4 |
| `versões/GPT/Sites de Renda GPT/portal/` | Portal alternativo gerado por outra ferramenta, com 155 scripts de ferramenta | Versão paralela de referência, não canônica |
| `versões/GPT/Nova pasta/` | Cópia corrigida da versão GPT | Referência |
| `modelo/` | Modelo visual fornecido pelo proprietário | Referência |
| `manus modelos/Doce Oficio Ferramentas/` | Exemplo de ferramentas usado como referência | Referência |
| `documentação/` | Contratos, decisões, segurança, relatórios | Atualizado até a Fase D dos seis sites |
| `revisão/` | Pareceres dos críticos (pastas criadas, pareceres pendentes) | Vazio de conteúdo final |

### Stack

- **Front-end:** HTML estático + CSS + módulos ES nativos. Sem framework, sem bundler, sem TypeScript.
- **Back-end:** não existe nos seis sites (decisão registrada em `decisão-sobre-cadastro-e-servidor.md`). Existe apenas em `portal/servidor.mjs` (41 linhas, Node `http` puro) e em `versões/GPT/.../backend/`.
- **Banco:** `portal/prisma/schema.prisma` (83 linhas) declara `User`, `Account`, `Session`, `Recente`, `Download`, `Preferencia`. **Nunca foi migrado nem conectado**: não há migrations, não há `.env`, o `DATABASE_URL` é só exemplo.
- **Autenticação:** não implementada. O portal consulta `/api/auth/status` e, sem resposta, mostra aviso de que a integração não está ativa. Nenhum provedor é simulado — isso está correto.
- **Node:** 20+ (testado com 22.14). Dependências de desenvolvimento gratuitas e com versão fixada.

---

## 2. Páginas e ferramentas existentes (o que realmente funciona)

Os seis sites somam **49 ferramentas reais**, com cálculo, validação, resultado, tratamento de erro e testes:

| Site | Ferramentas | Testes |
|---|---|---|
| 1. Confeitaria | 9 | 49 |
| 2. Atividades escolares | 12 | 81 |
| 3. Crochê e artesanato | 8 | 30 |
| 4. Churrasco e festas | 8 | 60 |
| 5. Pintura e reforma | 8 | 39 |
| 6. Caixas e embalagens | 8 | 59 |
| Módulos comuns | — | 39 |

Contagem de arquivos: 109 páginas geradas, ~651 scripts de ferramenta nos seis produtos, 100 módulos em `compartilhado/`.

Recursos comuns que já funcionam e **devem ser preservados**:

- geração de PDF própria, sem dependência externa (`compartilhado/scripts/pdf/`);
- geração de XLSX própria (ZIP armazenado + CRC32) em `compartilhado/scripts/exportação/`;
- orçamento com PDF, planilha, impressão e link compartilhável (fragmento comprimido na URL, nunca enviado ao servidor);
- Pix estático com CRC16 conferido contra o manual do Banco Central;
- consentimento de privacidade antes de qualquer anúncio;
- armazenamento local com prefixo por produto, validação de importação e proteção contra `__proto__`;
- impressão e moldes em escala real com calibração.

---

## 3. Componentes e duplicações

- **Duplicação estrutural aceita por projeto:** `compartilhado/` é copiado para dentro de cada um dos seis sites para que cada um publique sozinho. É intencional e documentado, mas significa que **o mesmo módulo existe 7 vezes** no disco.
- **Duplicação real entre versões:** o repositório guarda três implementações concorrentes do mesmo produto — os seis sites, `portal/` e `versões/GPT/.../portal/`. Isso não é código morto (as versões são históricas), mas o repositório não deixa claro qual é a canônica.
- **Ferramentas duplicadas entre si:** `orçamento` aparece em quatro sites (confeitaria, artesanato, festas, reforma) com o mesmo motor comum e formulários diferentes. `preço de venda` (confeitaria) e `preço da peça` (artesanato) resolvem o mesmo problema com vocabulário diferente. Candidatas óbvias a unificação.

## 4. Código quebrado, fachada e riscos

Problemas encontrados, em ordem de gravidade:

1. **`portal/app.js` anuncia 49 ferramentas, mas todos os links apontam para a mesma página.** As 49 entradas são geradas por `categorias.flatMap(...)` e todas recebem `url = "<pasta do site>/páginas/ferramentas.html"`. Clicar em "Preço de venda" e em "Ficha técnica" leva exatamente ao mesmo lugar. É um catálogo de fachada e precisa ser refeito.
2. **`portal/estilos.css` tem um `@font-face` inválido** (`src:local(Figtree),local(Arial)`) — não carrega fonte nenhuma; funciona por acaso pela pilha de fallback.
3. **Cards enormes.** `.cartao{min-height:210px}` com grade de 3 colunas e `.hero h1{font-size:clamp(2.4rem,6vw,5.4rem)}`: no notebook comum, a primeira dobra é ocupada por título e busca, e o catálogo só começa depois de rolar. Foi exatamente a reclamação registrada pelo proprietário.
4. **Dicas em `toast` a cada 45 s**, ligadas por `setInterval` sem desligamento: interrompem quem está trabalhando.
5. **Banner automático a cada 30 s** sem pausa ao focar/passar o mouse.
6. **`portal/prisma/schema.prisma` sem migrations** — banco declarado e não funcional. O prompt proíbe deixar banco falso em produção.
7. **Sem testes no portal.** Os seis sites têm 357; o portal tem zero.
8. **Sem `robots.txt`, sem `404`, sem cabeçalhos de segurança** no portal (os seis sites têm `.htaccess` gerado com CSP, `X-Frame-Options` e `nosniff`).
9. O portal **não tem navegação inferior no celular**, que os seis sites já têm.

## 5. Responsividade e publicação atuais

- Seis sites: testados em emulação 390 × 844 e em desktop, com navegação inferior, sem rolagem lateral. Pacotes de publicação gerados (806–905 KiB cada), servidos por HTTP com CSP estrita, caminho com acento respondendo 200 e travessia de diretório bloqueada.
- Portal: responsivo apenas por *media queries* (900 px e 620 px); nunca foi servido nem testado em navegador nesta base.
- Publicação em produção: **nenhuma**. O `README` do portal cita GitHub Pages, mas nada foi publicado a partir deste branch.

## 6. O que não foi possível verificar

- Aparelho físico (celular real), Firefox e WebKit — só houve Chromium embutido.
- Pagamento Pix real (depende da chave do proprietário).
- AdSense real, CMP e perfil de CSP com anúncios (dependem da conta do proprietário).
- Métricas de campo (LCP, INP, CLS) — não há site publicado para medir.
- Montagem física dos moldes em papel.

## 7. Riscos antes de alterar

| Risco | Mitigação adotada |
|---|---|
| Perder os 49 cálculos testados dos seis sites | Nada é apagado. Os seis sites continuam intactos e publicáveis; o portal passa a reutilizar a mesma lógica. |
| Conflito entre três versões do portal | O portal canônico é `portal/` na raiz. `versões/` fica como histórico, sem edição. |
| Regressão silenciosa | Checkpoint `5bee109` antes de qualquer alteração e branch dedicado `portal/ferramentas-v2`. |
| Prometer 150 ferramentas e entregar cards vazios | O catálogo passa a registrar `status` por ferramenta, e só entra como pronta a que abre, calcula, valida, exporta e tem teste. |
