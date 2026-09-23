# Ander Flow

Portal de ferramentas que rodam no navegador. Multiplataforma com autenticação, banco de dados e administração. Seis ferramentas prontas: Preço de Venda, Ponto de Equilíbrio, Margem de Contribuição, Contador de Texto, Juntar PDF e Limpar Planilha.

## Requisitos

- **Node.js 22+** — verifique com `node -v`
- **Git** — verifique com `git --version`

## Instalar

Clone o repositório, entre na pasta, instale as dependências e copie o arquivo de configuração:

**Windows (PowerShell):**
```powershell
git clone https://github.com/seu-usuario/ander-flow.git
cd ander-flow
npm install
Copy-Item .env.exemplo -Destination .env
```

**Linux/macOS:**
```bash
git clone https://github.com/seu-usuario/ander-flow.git
cd ander-flow
npm install
cp .env.exemplo .env
```

Abra `.env` num editor e ajuste conforme necessário (na maioria dos casos, os valores padrão funcionam em desenvolvimento).

## Banco de dados

Prepare o banco de dados com as migrações e dados iniciais:

```bash
npm run banco:migrar    # Aplica as migrações SQL
npm run banco:semear    # Insere avisos de exemplo
npm run admin:criar     # Cria um usuário administrador
```

O comando `admin:criar` pede e-mail, nome e senha no terminal. A senha não tem valor padrão: você define. Sem sessão anterior, todos entram como anónimos.

## Ligar em desenvolvimento

```bash
npm run desenvolver
```

O servidor escolhe automaticamente a **porta 4870** (se disponível) ou tenta a próxima na faixa 4870–4889. Nunca usa portas proibidas como 3000, 3001, 4200, 5000, 5173, 5500, 8000, 8080 ou 8888. A URL é impressa no terminal:

```
Ander Flow rodando em http://localhost:4870
```

Abra essa URL no navegador e navegue pela interface.

## Links úteis

- `/` — Página inicial
- `/ferramentas` — Catálogo de ferramentas
- `/entrar` — Autenticação e criar conta
- `/admin` — Painel de administração

## Derrubar o servidor

**Ctrl+C** encerra o servidor normalmente. Alternativamente:

```bash
npm run parar
```

Este comando lê o arquivo `.execucao/servidor.pid`, envia um sinal de desligamento limpo e aguarda até 5 segundos. Se o processo não morrer, verifica que o PID pertence a este projeto antes de encerrá-lo. **Nunca** mata processos por porta.

Se um processo ficar preso, consulte `.execucao/servidor.pid` para confirmar o PID antes de intervir manualmente.

## Produção (local)

Para um ambiente de produção local, defina `AMBIENTE=producao` no `.env` e use:

```bash
npm run iniciar
```

Em produção, o cookie de sessão exige HTTPS. Configure um proxy reverso (Nginx, Cloudflare) na frente do servidor.

## Testes e verificações

```bash
npm run testar              # Testes unitários e de integração
npm run testar:visual       # Testes visuais com Playwright (usa Edge)
npm run verificar           # Verifica nomes, idiomas e textos fixos
npm run verificar:propriedade  # Confere propriedade de arquivos por agente
```

Os testes visuais usam o Microsoft Edge já instalado no seu Windows (`channel: 'msedge'`). Em Linux/macOS, instale o navegador Chromium separadamente ou configure `NAVEGADOR_TESTES=chromium`.

## Git

Quando pronto para colaborar:

```bash
git init
git add .
git commit -m "feat: primeiros passos do Ander Flow"
git branch -M main
git remote add origin https://github.com/seu-usuario/ander-flow.git
git push -u origin main
```

Para baixar uma versão existente:

```bash
git clone https://github.com/seu-usuario/ander-flow.git
cd ander-flow
git pull
```

**Nunca** suba para o git:
- `.env` (contém senhas/URLs internas)
- `banco/dados/` (dados pessoais)
- `.execucao/` (PID e portas temporárias)

## Variáveis do .env

Copie `.env.exemplo` para `.env` e ajuste conforme necessário:

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORTA` | 4870 | Porta inicial. Se ocupada, o servidor tenta a próxima. |
| `PORTA_FINAL` | 4889 | Última porta a tentar na faixa. |
| `AMBIENTE` | desenvolvimento | `desenvolvimento` ou `producao`. Em produção, HTTPS é obrigatório no cookie. |
| `TRUST_PROXY` | false | Ative (`true`) só se o servidor estiver atrás de um proxy confiável (Nginx, Cloudflare). |
| `BANCO_CAMINHO` | banco/dados/ander-flow.sqlite | Caminho do arquivo SQLite (relativo ao projeto). |
| `SESSAO_DIAS` | 30 | Validade da sessão em dias. |
| `URL_PUBLICA` | http://localhost:4870 | URL pública usada em links nos e-mails. |
| `EMAIL_MODO` | arquivo | Modo de e-mail. Atualmente `arquivo` (grava em `.execucao/emails/`); SMTP não está integrado. |
| `LOG_NIVEL` | info | Nível de log: `erro`, `aviso`, `info` ou `depuracao`. |

## Idioma e tema

### Adicionar uma chave de texto

Textos visíveis (botões, títulos, ajuda) vêm de arquivos JSON de idioma. Cada página tem seu próprio dicionário:

1. Abra `frontend/paginas/<nome>/<nome>-idioma-pt-br.json`
2. Adicione a chave no formato aninhado: `{"pagina": {"secao": {"chave": "Texto em português"}}}`
3. Abra ou crie `frontend/paginas/<nome>/<nome>-idioma-en.json` com a mesma estrutura em inglês
4. No HTML, use `data-texto="pagina.secao.chave"` ou no JS, `t('pagina.secao.chave')`
5. Rode `npm run verificar` — se as chaves não forem paridade perfeita entre PT-BR e EN, a verificação reprova

### Adicionar um idioma novo

1. Copie todos os pares `-idioma-pt-br.json` para `-idioma-<novo>.json` com o mesmo conteúdo
2. Tradua linha por linha
3. Atualize `servidor/servidor-idioma.js` para registrar o novo código (ex.: `'es'`)
4. Atualize `frontend/compartilhado/compartilhado-idioma.js` para incluir botão de troca
5. Rode `npm run verificar:idiomas` para conferir paridade

## Como criar uma ferramenta nova

Cada ferramenta é uma pasta dentro de `frontend/ferramentas/<slug>/` com a seguinte estrutura:

```
frontend/ferramentas/minha-ferramenta/
├── minha-ferramenta.html          # Página (padrão obrigatório)
├── minha-ferramenta.css           # Estilos
├── minha-ferramenta.js            # Interface (DOM, botões, estado)
├── minha-ferramenta-calculo.js    # Lógica (funções puras, testáveis)
├── minha-ferramenta-manifesto.json # Metadados
├── minha-ferramenta-idioma-pt-br.json
└── minha-ferramenta-idioma-en.json
```

**Manifesto** (`minha-ferramenta-manifesto.json`):
```json
{
  "slug": "minha-ferramenta",
  "estado": "pronta",
  "categoria": "calculo",
  "plano": "gratis",
  "processamento": "navegador",
  "icone": "calculo",
  "ordem": 99,
  "nome": { "pt-BR": "Minha Ferramenta", "en": "My Tool" },
  "descricao": { "pt-BR": "Breve descrição.", "en": "Brief description." },
  "intencoes": { "pt-BR": ["quando usar", "palavras-chave"], "en": ["when to use"] },
  "etiquetas": { "pt-BR": ["tag1"], "en": ["tag1"] },
  "relacionadas": ["outra-ferramenta"],
  "recursos_plus": []
}
```

O HTML segue o padrão:
- Inclua `<!-- incluir: compartilhado-cabeca -->` no `<head>`
- Use `data-texto="chave"` para textos traduzidos
- Estruture o formulário à esquerda (`.ferramenta__formulario`) e o resultado à direita (`.ferramenta__resultado`)
- Registre reclamações de validação com `[class="campo--erro"]` no rótulo

No JS:
- Importe `{ iniciarFerramenta } from '/estatico/compartilhado/compartilhado-ferramenta.js'`
- Chame `iniciarFerramenta({ slug: 'minha-ferramenta' })` ao carregar
- Use `t()` para textos dinâmicos
- Lancia erros com `{ ok: false, erro: '<codigo>' }` e o verificador traduz

## Limite de tráfego

O servidor protege contra abuso comum com bloqueio progressivo. Cada violação (não falha, mas limite excedido) aumenta a contagem de infrações; após 5 segundos sem nenhuma outra infração, a contagem baixa de um. Os bloqueios aumentam exponencialmente:

| Infrações | Bloqueio |
|-----------|----------|
| 1ª | 1 minuto |
| 2ª | 5 minutos |
| 3ª | 15 minutos |
| 4ª | 1 hora |
| 5ª | 6 horas |
| 6ª+ | 24 horas |

Regras por grupo:

| Grupo | Chave | Limite |
|-------|-------|--------|
| Páginas | IP | 300 requisições / 60 s |
| API | IP | 120 requisições / 60 s |
| Entrar (falhas) | IP + e-mail | 5 falhas / 15 min |
| Criar conta | IP | 3 contas / 60 min |
| Recuperar senha | IP + e-mail | 3 pedidos / 60 min |
| Admin | ID do usuário | 60 requisições / 60 s |

**Desbloquear:** O administrador acessa `/admin?secao=bloqueios` e remove manualmente.

**Nota:** Este limite protege contra abuso comum (força bruta, spam). Para proteção contra DDoS em larga escala, use uma solução na borda (Cloudflare, AWS Shield).

## Planos

Há dois planos: **Grátis** e **Plus**. Pagamento **não está integrado**: o administrador muda o plano do usuário no painel `/admin?secao=usuarios`.

**Limites:**

| Recurso | Grátis | Plus |
|---------|--------|------|
| Favoritos | 10 | 500 |
| Trabalhos salvos | 3 | 500 |
| Lote de arquivos | 3 | 100 |
| Funcionalidades Plus | Não | Sim |

Funcionalidades Plus ficam em rotas `/plus/<slug>/<recurso>`, exigindo sessão ativa + plano Plus. **Aviso importante:** O bloqueio acontece no servidor (verifica a sessão e o plano), mas o código está no navegador. Quem reescrever o JavaScript localmente consegue contornar — isto é inevitável com lógica no cliente. Use Plus como um modelo de honra para usuários que valorizam o projeto.

## Problemas comuns

### Porta já está em uso

Se a mensagem de erro disser "EADDRINUSE", significa que a porta 4870 (ou as próximas) está ocupada. Solução:

1. Confirme que não há outro servidor Ander Flow rodando (`npm run parar`)
2. Mude `PORTA` em `.env` para um valor fora da lista proibida
3. Reinicie com `npm run desenvolver`

### Erro ao instalar `better-sqlite3`

Windows exige Microsoft C++ Build Tools. Se a instalação falhar:

1. Baixe e instale [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. Rode `npm install` novamente

### Banco travado

Se receber "database is locked", o banco está em uso por outro processo. Solução:

1. Encerre o servidor: `npm run parar`
2. Aguarde 2 segundos
3. Reinicie: `npm run desenvolver`

Se persistir, delete os arquivos `.db-shm` e `.db-wal` em `banco/dados/` (contêm travamento WAL).

### Página sem estilo (CSP muito restritivo)

O servidor envia uma CSP (Content Security Policy) muito restritiva por segurança:

```
default-src 'self'; script-src 'self'; style-src 'self'; ...
```

Se você implementar uma ferramenta com `<style>` inline ou `style=""`, o navegador a bloqueará. Sempre use classes CSS em `.css` separado.

Nenhuma biblioteca usa `eval` ou `new Function`. Se a página ficar sem estilo:

1. Verifique o console do navegador (F12) — haverá um aviso de CSP
2. Confirme que o arquivo `.css` está sendo servido (`/estatico/...`)
3. Se a página é gerada dinamicamente, use `createElement` + `appendChild` (nunca `innerHTML`)

## Suporte e contribuições

Consulte a documentação em `docs/`:
- `docs/decisoes.md` — Decisões arquiteturais
- `docs/contratos.md` — Contrato entre agentes e estrutura do projeto

Para relatar erros ou sugerir melhorias, abra uma issue no repositório.
