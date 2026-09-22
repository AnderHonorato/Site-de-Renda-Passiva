# Checklist do Ander Flow

Legenda: `[x]` feito e testado · `[~]` em andamento · `[ ]` falta · `[!]` problema/decisão. Item só vira `[x]` depois de testado.

## Fundação (Onda 0–1)
- [x] Branch `ander-flow/v1`, esqueleto de pastas, `package.json` com scripts em português
- [x] `.gitignore`, `.env.exemplo`
- [x] Contratos (`docs/contratos.md`), decisões (`docs/decisoes.md`), propriedade (`.orquestracao/propriedade.json`)
- [x] Dependências instaladas: Express 5, better-sqlite3, helmet, compression, pdf-lib, SheetJS 0.20.3 (CDN oficial), Playwright
- [!] Playwright usa o Edge instalado (sem baixar Chromium) — ver decisões 7
- [x] Esquema do banco (migração 001) escrito
- [x] Verificador de propriedade
- [ ] Servidor com porta livre automática (4870–4889, nunca 3000 etc.), PID e parar seguro
- [ ] Montador de páginas com inclusões, tradução no servidor e acesso por página
- [ ] Catálogo gerado dos manifestos; contagens calculadas
- [ ] Banco: conexão, migrador, sementes, `admin:criar` sem senha padrão
- [ ] Sistema visual: tokens claro/escuro, fontes locais, componentes, ícones em sprite
- [ ] Idioma PT-BR/EN no servidor e no navegador, sem piscar
- [ ] Tema claro/escuro sem piscar, botão acessível
- [ ] Verificadores: nomes, idiomas, textos fixos, propriedade

## Segurança
- [ ] CSP estrita sem `unsafe-inline`/`unsafe-eval`, cabeçalhos
- [ ] Limite de tráfego por grupo + bloqueio progressivo persistido (1 min → 24 h)
- [ ] 429 com `Retry-After` e página traduzida
- [ ] CSRF duplo em toda rota que altera
- [ ] Sessão HttpOnly/SameSite/Secure, token com hash, expiração e revogação
- [ ] scrypt nativo; nenhuma senha padrão
- [ ] Corpo máx. 100 kB, timeouts, tamanho de cabeçalho
- [ ] Plano e admin verificados no servidor

## Funcionalidades (Onda 2)
- [ ] Autenticação: criar conta, entrar, sair, recuperar e redefinir senha
- [ ] Conta: dados, idioma/tema, senha, exportar dados, excluir conta (LGPD)
- [ ] Favoritos/Salvos (local e conta, juntar sem substituir), Trabalhos
- [ ] Avisos do sistema, popup administrável, mensagens com o admin
- [ ] Planos (Grátis e Plus, pagamento "em breve")
- [ ] Páginas: Início, Catálogo, Planos, Privacidade, Termos, Cookies, 404/403/429/500
- [ ] Páginas: Entrar/Criar conta, Recuperar senha, Conta, Avisos, Trabalho, Salvos
- [ ] Ferramentas: Preço de venda, Ponto de equilíbrio, Margem de contribuição, Contador de texto
- [ ] Ferramentas: Juntar PDF, Limpar planilha (em etapas)
- [ ] Admin: ferramentas, usuários, avisos e mensagens, bloqueios de tráfego

## Acabamento (Onda 3)
- [ ] Manifestos das ferramentas planejadas
- [ ] Inglês completo (paridade de chaves)
- [ ] Testes de unidade, integração e visuais
- [ ] README completo

## Integração, debate e entrega (Ondas 4–6)
- [ ] Instalação limpa, migração, subida, todas as telas abertas
- [ ] Debate dos críticos — rodada 1
- [ ] Correções e rodada 2 (se houver ALTA)
- [ ] Verificação final (§13 do prompt)
