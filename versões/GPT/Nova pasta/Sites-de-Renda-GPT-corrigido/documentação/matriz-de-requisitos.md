# Matriz de Requisitos — Seis Sites de Renda Passiva com Anúncios e Pix

**Data:** 14/09/2026  
**Versão:** 1.0.0  
**Responsável pela integração:** Orquestrador

## Legenda de Situações

- **pendente**: Requisito não iniciado
- **em andamento**: Desenvolvimento em curso
- **concluído**: Implementação finalizada e documentada
- **testado**: Implementação validada com evidências
- **preparado para configuração**: Aguarda dados/configuração do proprietário
- **aguarda configuração externa**: Depende de serviço/integração externa
- **não aplicável**: Não se aplica à arquitetura/escopo atual

## Resumo por Seção

| Seção | Título | Total | Status |
|---|---|---|---|
| 01 | Missão e limite de trabalho | 38 | — |
| 02 | Verificação dos modelos e ferramentas | 43 | — |
| 03 | Equipe e responsabilidades | 36 | — |
| 04 | Produtos e pastas definitivas | 21 | — |
| 05 | Arquitetura: cadastro e servidor | 40 | concluído (decisão-sobre-cadastro-e-servidor.md) |
| 06 | Português, acentuação e modularidade | 46 | — |
| 07 | Identidade visual e comportamento comum | 72 | — |
| 08 | Celular como aplicativo; computador como site | 78 | — |
| 09 | Animações e desempenho | 48 | — |
| 10 | Projeto 1 — ferramentas para confeitaria | 60 | — |
| 11 | Projeto 2 — atividades escolares | 73 | — |
| 12 | Projeto 3 — crochê e artesanato | 37 | — |
| 13 | Projeto 4 — churrasco e festas | 50 | — |
| 14 | Projeto 5 — pintura e reforma | 39 | — |
| 15 | Projeto 6 — moldes de caixas | 51 | — |
| 16 | Cookies e consentimento | 96 | — |
| 17 | Doação voluntária por Pix | 106 | — |
| 18 | Backend condicional | 150 | não aplicável (sem backend) |
| 19 | Segurança e proteção contra clonagem | 122 | — |
| 20 | AdSense pronto para conexão | 98 | — |
| 21 | Configuração pendente | 24 | — |
| 22 | Conteúdo, descoberta e publicação | 53 | — |
| 23 | Plano de execução | 88 | — |
| 24 | Critérios de teste e aceite | 121 | — |
| 25 | Entregáveis e relatório final | 64 | — |
| **TOTAL** | — | **1.354** | — |

---

## SEÇÃO 01 — Missão e Limite de Trabalho (38 requisitos)

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R01.01 | Trabalhar exclusivamente dentro de C:\Projetos\Andamento\1. Sites de Renda Passiva (ADS) | Central | — | — | pendente |
| R01.02 | Preservar arquivos existentes e projetos externos | Central | — | — | pendente |
| R01.03 | Não substituir trabalho existente por projeto inicial vazio | Central | — | — | pendente |
| R01.04 | Não alterar configurações globais do computador | Central | — | — | pendente |
| R01.05 | Não alterar credenciais durante implementação | Central | — | — | pendente |
| R01.06 | Não alterar outros repositórios | Central | — | — | pendente |
| R01.07 | Todos os sites devem funcionar no celular | Todos (1–6) | — | — | pendente |
| R01.08 | Todos os sites devem funcionar no computador | Todos (1–6) | — | — | pendente |
| R01.09 | No celular, navegação principal fica na parte inferior (aplicativo) | Todos (1–6) | — | — | pendente |
| R01.10 | Ações contextuais devem ficar na parte inferior do celular | Todos (1–6) | — | — | pendente |
| R01.11 | Ferramentas devem ser úteis sem cadastro obrigatório | Todos (1–6) | — | — | pendente |
| R01.12 | Ferramentas devem ser úteis sem anúncios até consentimento | Todos (1–6) | — | — | pendente |
| R01.13 | Ferramentas devem ser úteis sem consentimento de publicidade | Todos (1–6) | — | — | pendente |
| R01.14 | Ferramentas devem ser úteis sem doação/apoio | Todos (1–6) | — | — | pendente |
| R01.15 | Custo recorrente: apenas hospedagem/servidor já disponível | Central | — | — | pendente |
| R01.16 | Não contratar serviços pagos adicionais | Central | — | — | pendente |
| R01.17 | Não contratar APIs de IA pagos | Central | — | — | pendente |
| R01.18 | Não contratar bancos gerenciados pagos | Central | — | — | pendente |
| R01.19 | Não contratar fontes pagas | Central | — | — | pendente |
| R01.20 | Não contratar imagens pagas | Central | — | — | pendente |
| R01.21 | Não contratar plugins pagos | Central | — | — | pendente |
| R01.22 | Não contratar serviços de e-mail pagos | Central | — | — | pendente |
| R01.23 | Uso dos modelos Claude consome a conta do desenvolvedor | Central | — | — | pendente |
| R01.24 | Não descrever o uso de modelos como gratuito (consome conta) | Central | — | — | pendente |
| R01.25 | Não incorporar IA paga ao funcionamento dos sites | Todos (1–6) | — | — | pendente |
| R01.26 | Publicação depende de configuração real do proprietário | Central | — | — | pendente |
| R01.27 | Contas de anúncios (AdSense) dependem de configuração real | Central | — | — | pendente |
| R01.28 | Dados do Pix dependem de configuração real | Central | — | — | pendente |
| R01.29 | Domínio depende de configuração real | Central | — | — | pendente |
| R01.30 | Preparar código e instruções completas para publicação | Central | — | — | pendente |
| R01.31 | Não comprar domínio sem autorização específica | Central | — | — | pendente |
| R01.32 | Não contratar planos sem autorização específica | Central | — | — | pendente |
| R01.33 | Não enviar mensagens a terceiros sem autorização | Central | — | — | pendente |
| R01.34 | Não fazer transferências sem autorização | Central | — | — | pendente |
| R01.35 | Não submeter cadastros externos sem autorização | Central | — | — | pendente |
| R01.36 | Não publicar em produção sem autorização específica | Central | — | — | pendente |
| R01.37 | Instalações locais de dependências gratuitas são autorizadas | Central | — | — | pendente |
| R01.38 | Testes dentro da pasta raiz são autorizados | Central | — | — | pendente |

---

## SEÇÃO 02 — Verificação dos Modelos e Ferramentas do Claude (43 requisitos)

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R02.01 | Identificar a versão do Claude Code antes de começar | Central | — | — | pendente |
| R02.02 | Identificar o modelo efetivo da sessão | Central | — | — | pendente |
| R02.03 | Identificar as ferramentas disponíveis | Central | — | — | pendente |
| R02.04 | Verificar os limites de concorrência | Central | — | — | pendente |
| R02.05 | Verificar configurações que sobrescrevem modelos de subagentes | Central | — | — | pendente |
| R02.06 | Verificar disponibilidade real de modelos na conta | Central | — | — | pendente |
| R02.07 | Consultar documentação oficial atual do Claude | Central | — | — | pendente |
| R02.08 | Não inventar identificadores de modelos inexistentes (ex: claude-opus-6 antes da confirmação) | Central | — | — | pendente |
| R02.09 | Não afirmar estar usando modelo diferente do selecionado | Central | — | — | pendente |
| R02.10 | Se Opus 6 estiver disponível, usar seu identificador real | Central | — | — | pendente |
| R02.11 | Enquanto Opus 6 não for confirmado, usar Opus 5 como orquestrador | Central | — | — | pendente |
| R02.12 | Usar Sonnet 5 para executores de implementação | Central | — | — | pendente |
| R02.13 | Usar Haiku 4.5 para tarefas simples e documentação | Central | — | — | pendente |
| R02.14 | O texto do prompt não muda o modelo da sessão — registrar a escolha real | Central | — | — | pendente |
| R02.15 | Explicar como selecionar modelo no Claude Code se necessário | Central | — | — | pendente |
| R02.16 | Não substituir modelos indisponíveis silenciosamente | Central | — | — | pendente |
| R02.17 | Registrar o modelo efetivo utilizado por cada agente | Central | — | — | pendente |
| R02.18 | Fazer escolhas compatíveis com a conta disponível | Central | — | — | pendente |
| R02.19 | Preservar a divisão de responsabilidades entre agentes | Central | — | — | pendente |
| R02.20 | Usar ferramentas realmente presentes | Central | — | — | pendente |
| R02.21 | Não simular chamadas de ferramentas | Central | — | — | pendente |
| R02.22 | Não simular processos ou workflows | Central | — | — | pendente |
| R02.23 | Não simular testes | Central | — | — | pendente |
| R02.24 | Não simular agentes ou subagentes | Central | — | — | pendente |
| R02.25 | Não simular pareceres críticos | Central | — | — | pendente |
| R02.26 | Usar agentes de verdade com contexto próprio | Central | — | — | pendente |
| R02.27 | O orquestrador delega a subagentes delimitados | Central | — | — | pendente |
| R02.28 | Subagentes retornam resultados para integração | Central | — | — | pendente |
| R02.29 | Se houver Agent Teams habilitado, empregue conforme a versão | Central | — | — | pendente |
| R02.30 | Não exigir comunicação direta entre trabalhadores (worktree) | Central | — | — | pendente |
| R02.31 | Definições de subagentes podem ser criadas em .claude/agents/ | Central | — | — | pendente |
| R02.32 | Com frontmatter válido, name, description e model | Central | — | — | pendente |
| R02.33 | Identificadores técnicos seguem restrições da ferramenta | Central | — | — | pendente |
| R02.34 | Restante do conteúdo é português brasileiro | Central | — | — | pendente |
| R02.35 | Conceder somente ferramentas necessárias aos subagentes | Central | — | — | pendente |
| R02.36 | Subagentes não devem criar novos subagentes | Central | — | — | pendente |
| R02.37 | Toda delegação pertence ao orquestrador | Central | — | — | pendente |
| R02.38 | Não usar interfaces antigas de agentes | Central | — | — | pendente |
| R02.39 | Não usar nomes de ferramentas só porque apareciam em exemplos | Central | — | — | pendente |
| R02.40 | Se não houver suporte real a agentes, continuar com tarefas independentes | Central | — | — | pendente |
| R02.41 | Informar a limitação se não houver suporte a agentes | Central | — | — | pendente |
| R02.42 | Não apresentar execução sequencial com troca de papel como agentes independentes | Central | — | — | pendente |
| R02.43 | Não apresentar uma crítica sequencial como duas críticas reais | Central | — | — | pendente |

---

## SEÇÃO 03 — Equipe e Responsabilidades (36 requisitos)

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R03.01 | Organizar os papéis definidos (orquestrador, especialista, 6 executores, documentação, 2 críticos) | Central | — | — | pendente |
| R03.02 | Agentes trabalhadores podem receber novas tarefas após conclusão anterior | Central | — | — | pendente |
| R03.03 | Conclusão não elimina autoria e evidências de cada entrega | Central | — | — | pendente |
| R03.04 | Limite inicial: até 3 executores simultâneos além do orquestrador | Central | — | — | pendente |
| R03.05 | Respeitando limites menores do ambiente | Central | — | — | pendente |
| R03.06 | Fazer ondas de execução sequenciais | Central | — | — | pendente |
| R03.07 | Não iniciar toda a equipe ao mesmo tempo | Central | — | — | pendente |
| R03.08 | Rodar os críticos após a integração | Central | — | — | pendente |
| R03.09 | Liberar executores ociosos quando críticos executam | Central | — | — | pendente |
| R03.10 | Não manter ciclos de revisão sem fato novo | Central | — | — | pendente |
| R03.11 | Antes de cada delegação: fornecer objetivo claro | Central | — | — | pendente |
| R03.12 | Antes de cada delegação: fornecer caminho absoluto permitido | Central | — | — | pendente |
| R03.13 | Antes de cada delegação: fornecer arquivos sob responsabilidade | Central | — | — | pendente |
| R03.14 | Antes de cada delegação: fornecer contratos disponíveis | Central | — | — | pendente |
| R03.15 | Antes de cada delegação: fornecer critérios de aceite | Central | — | — | pendente |
| R03.16 | Antes de cada delegação: fornecer dependências conhecidas | Central | — | — | pendente |
| R03.17 | Antes de cada delegação: fornecer entregáveis esperados | Central | — | — | pendente |
| R03.18 | Antes de cada delegação: forneça modelo escolhido | Central | — | — | pendente |
| R03.19 | Um arquivo tem somente um escritor por vez | Central | — | — | pendente |
| R03.20 | O orquestrador é o único integrador de contratos e pacotes compartilhados | Central | — | — | pendente |
| R03.21 | Agentes não fazem commits concorrentes | Central | — | — | pendente |
| R03.22 | Agentes não trocam de branch concorrentemente | Central | — | — | pendente |
| R03.23 | Agentes não alteram o mesmo arquivo de dependências concorrentemente | Central | — | — | pendente |
| R03.24 | Cada agente devolve: identificação da tarefa | Central | — | — | pendente |
| R03.25 | Cada agente devolve: modelo efetivo utilizado | Central | — | — | pendente |
| R03.26 | Cada agente devolve: arquivos alterados | Central | — | — | pendente |
| R03.27 | Cada agente devolve: comportamento implementado | Central | — | — | pendente |
| R03.28 | Cada agente devolve: testes executados com resultados | Central | — | — | pendente |
| R03.29 | Cada agente devolve: pendências identificadas | Central | — | — | pendente |
| R03.30 | Afirmação de conclusão sem arquivos/evidências não encerra tarefa | Central | — | — | pendente |
| R03.31 | O orquestrador verifica entrega antes de liberar tarefas dependentes | Central | — | — | pendente |
| R03.32 | Se existir Git, usar isolamento compatível com repositório | Central | — | — | pendente |
| R03.33 | Manter áreas de trabalho dentro da raiz autorizada | Central | — | — | pendente |
| R03.34 | Se não existir Git, usar pastas independentes e propriedade explícita | Central | — | — | pendente |
| R03.35 | Não presumir que worktree funciona sem Git | Central | — | — | pendente |
| R03.36 | Não modificar repositório pai por acidente | Central | — | — | pendente |

---

## SEÇÃO 04 — Produtos e Pastas Definitivas (21 requisitos)

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R04.01 | Seguir a estrutura de pastas exata definida no prompt | Todos (1–6) | — | — | pendente |
| R04.02 | Cada pasta de produto tem seu próprio ponto de entrada (index.html) | Todos (1–6) | — | — | pendente |
| R04.03 | Cada pasta tem sua própria configuração | Todos (1–6) | — | — | pendente |
| R04.04 | Cada pasta tem seu próprio conteúdo | Todos (1–6) | — | — | pendente |
| R04.05 | Cada pasta tem seus próprios estilos | Todos (1–6) | — | — | pendente |
| R04.06 | Cada pasta tem seus próprios scripts | Todos (1–6) | — | — | pendente |
| R04.07 | Cada pasta tem seus próprios testes | Todos (1–6) | — | — | pendente |
| R04.08 | Cada pasta tem suas próprias instruções (LEIA-ME.md) | Todos (1–6) | — | — | pendente |
| R04.09 | Cada pasta tem seu próprio pacote publicável | Todos (1–6) | — | — | pendente |
| R04.10 | Deve poder ser hospedada separadamente | Todos (1–6) | — | — | pendente |
| R04.11 | Deve poder ser copiada sem depender das outras cinco | Todos (1–6) | — | — | pendente |
| R04.12 | Conteúdo compartilhado é reaproveitado no desenvolvimento | Todos (1–6) | — | — | pendente |
| R04.13 | Conteúdo compartilhado é incorporado a cada pacote | Todos (1–6) | — | — | pendente |
| R04.14 | Nenhum site publicado deve requisitar ../compartilhado/ | Todos (1–6) | — | — | pendente |
| R04.15 | Nenhum site publicado deve requisitar arquivos de outro projeto | Todos (1–6) | — | — | pendente |
| R04.16 | Não criar somente seis páginas com o mesmo cálculo e nomes diferentes | Todos (1–6) | — | — | pendente |
| R04.17 | Cada produto precisa das funções específicas definidas no prompt | Todos (1–6) | — | — | pendente |
| R04.18 | Cada produto precisa de conteúdo útil próprio | Todos (1–6) | — | — | pendente |
| R04.19 | Cada produto precisa de identidade cromática própria | Todos (1–6) | — | — | pendente |
| R04.20 | Pesquisar conflitos de marca antes de publicar | Central | — | — | pendente |
| R04.21 | Não alegar disponibilidade sem verificar | Central | — | — | pendente |

---

## SEÇÃO 05 — Arquitetura: Cadastro e Servidor (40 requisitos)

**Status geral desta seção: CONCLUÍDO**  
*Referência: documentação/decisão-sobre-cadastro-e-servidor.md*

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R05.01 | Decisão: site estático com ferramentas no navegador | Todos (1–6) | — | decisão-sobre-cadastro-e-servidor.md | concluído |
| R05.02 | Sem banco de dados | Todos (1–6) | — | decisão-sobre-cadastro-e-servidor.md | concluído |
| R05.03 | Sem cadastro de usuário obrigatório | Todos (1–6) | — | decisão-sobre-cadastro-e-servidor.md | concluído |
| R05.04 | Sem login | Todos (1–6) | — | decisão-sobre-cadastro-e-servidor.md | concluído |
| R05.05 | Sem chat no servidor | Todos (1–6) | — | decisão-sobre-cadastro-e-servidor.md | concluído |
| R05.06 | Sem recepção de feedback em servidor | Todos (1–6) | — | decisão-sobre-cadastro-e-servidor.md | concluído |
| R05.07 | Todas as funções obrigatórias podem ser resolvidas sem backend | Todos (1–6) | — | decisão-sobre-cadastro-e-servidor.md | concluído |
| R05.08 | Inclusive impressão local | Todos (1–6) | — | decisão-sobre-cadastro-e-servidor.md | concluído |
| R05.09 | Inclusive geração de arquivos | Todos (1–6) | — | decisão-sobre-cadastro-e-servidor.md | concluído |
| R05.10 | Inclusive Pix estático | Todos (1–6) | — | decisão-sobre-cadastro-e-servidor.md | concluído |
| R05.11 | Hospedagem em Apache/Nginx não requer backend de aplicação | Central | — | decisão-sobre-cadastro-e-servidor.md | concluído |
| R05.12 | Servidor local de desenvolvimento não aciona requisito de contas/chat | Central | — | decisão-sobre-cadastro-e-servidor.md | concluído |
| R05.13 | Etapa local de compilação não aciona requisito de contas/chat | Central | — | decisão-sobre-cadastro-e-servidor.md | concluído |
| R05.14 | Cabeçalhos de segurança/roteamento não exigem cadastro | Central | — | decisão-sobre-cadastro-e-servidor.md | concluído |
| R05.15 | Produzir documentação/decisão-sobre-cadastro-e-servidor.md | Central | ✓ | decisão-sobre-cadastro-e-servidor.md | concluído |
| R05.16 | Com uma linha por projeto explicando a decisão | Central | ✓ | decisão-sobre-cadastro-e-servidor.md | concluído |
| R05.17 | Não adicionar backend por conveniência para gerar PDF | Todos (1–6) | — | — | pendente |
| R05.18 | Não adicionar backend por conveniência para guardar preferências | Todos (1–6) | — | — | pendente |
| R05.19 | Não adicionar backend por conveniência para montar QR Code | Todos (1–6) | — | — | pendente |
| R05.20 | Não adicionar backend para criar formulários desnecessários | Todos (1–6) | — | — | pendente |
| R05.21 | Não usar serviço externo como backend escondido | Todos (1–6) | — | — | pendente |
| R05.22 | Se função exigir persistência, justificar antes | Central | — | — | pendente |
| R05.23 | Se função exigir autenticação, justificar antes | Central | — | — | pendente |
| R05.24 | Se função exigir API própria, justificar antes | Central | — | — | pendente |
| R05.25 | Cumprir integralmente seção 18 se introduzir backend | Central | — | — | não aplicável |
| R05.26 | Não omitir requisitos seção 18 após introduzir backend | Central | — | — | não aplicável |
| R05.27 | Mesmo com backend, ferramentas públicas funcionam sem login | Central | — | — | não aplicável |
| R05.28 | Usar HTML semântico | Todos (1–6) | — | — | pendente |
| R05.29 | Usar CSS | Todos (1–6) | — | — | pendente |
| R05.30 | Usar JavaScript modular | Todos (1–6) | — | — | pendente |
| R05.31 | Ferramenta de compilação só se trouxer benefício comprovado | Central | — | — | pendente |
| R05.32 | Arquitetura multipágina com HTML gerado previamente | Central | — | — | pendente |
| R05.33 | Favorece conteúdo legível e publicação estática | Central | — | — | pendente |
| R05.34 | Não adotar framework pesado sem necessidade | Todos (1–6) | — | — | pendente |
| R05.35 | O index.html é entrada real | Todos (1–6) | — | — | pendente |
| R05.36 | Não um arquivo com todo CSS, JavaScript e conteúdo | Todos (1–6) | — | — | pendente |
| R05.37 | Documentar uso via HTTP/HTTPS | Central | — | — | pendente |
| R05.38 | Módulos podem não funcionar abrindo file:// localmente | Central | — | — | pendente |
| R05.39 | Fornecer comando local simples para desenvolvimento | Todos (1–6) | — | — | pendente |
| R05.40 | Fornecer comando para visualizar pacote de produção exato | Todos (1–6) | — | — | pendente |

---

## SEÇÃO 06 — Português Brasileiro, Acentuação e Modularidade (46 requisitos)

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R06.01 | Todo texto autoral usa português brasileiro correto | Central | — | — | pendente |
| R06.02 | Documentação em português correto | Central | — | — | pendente |
| R06.03 | Comentários em código em português correto | Central | — | — | pendente |
| R06.04 | Nomes de função em português correto | Todos (1–6) | — | — | pendente |
| R06.05 | Nomes de variável em português correto | Todos (1–6) | — | — | pendente |
| R06.06 | Propriedades de dados em português correto | Todos (1–6) | — | — | pendente |
| R06.07 | Classes CSS em português correto | Todos (1–6) | — | — | pendente |
| R06.08 | Nomes de arquivo em português correto | Todos (1–6) | — | — | pendente |
| R06.09 | Usar acentuação quando a palavra exigir | Central | — | — | pendente |
| R06.10 | Adotar UTF-8 | Central | — | — | pendente |
| R06.11 | Usar normalização Unicode NFC | Central | — | — | pendente |
| R06.12 | Exemplos: calcularPreçoDeVenda, quantidadeDePorções, validarDoação | Todos (1–6) | — | — | pendente |
| R06.13 | Não traduzir palavras reservadas (import, export, etc) | Todos (1–6) | — | — | pendente |
| R06.14 | Não traduzir APIs da plataforma | Todos (1–6) | — | — | pendente |
| R06.15 | Não traduzir protocolos (HTTP, HTTPS, etc) | Todos (1–6) | — | — | pendente |
| R06.16 | Não traduzir nomes de pacotes | Todos (1–6) | — | — | pendente |
| R06.17 | Não traduzir atributos HTML padronizados | Todos (1–6) | — | — | pendente |
| R06.18 | Não traduzir diretivas HTTP | Todos (1–6) | — | — | pendente |
| R06.19 | Não traduzir identificadores oficiais (BR.GOV.BCB.PIX) | Todos (1–6) | — | — | pendente |
| R06.20 | Não traduzir convenções obrigatórias da ferramenta | Todos (1–6) | — | — | pendente |
| R06.21 | Exemplos de exceções técnicas documentadas | Central | — | — | pendente |
| R06.22 | Não acentuar artificialmente palavras que não levam acento | Central | — | — | pendente |
| R06.23 | Documentar exceções em documentação/convenções-e-exceções-técnicas.md | Central | — | — | pendente |
| R06.24 | Caminhos com espaço e acento citados corretamente no terminal | Todos (1–6) | — | — | pendente |
| R06.25 | Caminhos resolvidos por APIs de caminho | Todos (1–6) | — | — | pendente |
| R06.26 | Caminhos testados no sistema de arquivos do servidor | Todos (1–6) | — | — | pendente |
| R06.27 | URLs com codificação correta | Todos (1–6) | — | — | pendente |
| R06.28 | URLs com consistência de maiúsculas/minúsculas | Todos (1–6) | — | — | pendente |
| R06.29 | Não resolver problemas renomeando para inglês | Todos (1–6) | — | — | pendente |
| R06.30 | Cada função autoral nomeada tem seu próprio arquivo | Todos (1–6) | — | — | pendente |
| R06.31 | Com exportação clara | Todos (1–6) | — | — | pendente |
| R06.32 | E teste correspondente quando houver lógica relevante | Todos (1–6) | — | — | pendente |
| R06.33 | HTML, CSS, JavaScript, dados e testes ficam separados | Todos (1–6) | — | — | pendente |
| R06.34 | Callbacks anônimos curtos não precisam virar arquivos | Todos (1–6) | — | — | pendente |
| R06.35 | Declarações de tipos não precisam virar arquivos | Todos (1–6) | — | — | pendente |
| R06.36 | Configuração curta não precisa virar arquivo separado | Todos (1–6) | — | — | pendente |
| R06.37 | Extrair funções quando tiverem lógica própria | Todos (1–6) | — | — | pendente |
| R06.38 | Um arquivo orquestrador pode importar e compor funções | Todos (1–6) | — | — | pendente |
| R06.39 | Mas não acumular suas implementações | Todos (1–6) | — | — | pendente |
| R06.40 | Usar compilação para reduzir requisições | Central | — | — | pendente |
| R06.41 | Usar compilação para dividir carregamento por página | Central | — | — | pendente |
| R06.42 | Usar compilação para comprimir recursos | Central | — | — | pendente |
| R06.43 | Modularidade obrigatória é do código-fonte | Todos (1–6) | — | — | pendente |
| R06.44 | Arquivos compilados podem ser agrupados | Todos (1–6) | — | — | pendente |
| R06.45 | Não deve haver pacote gigante em todas as páginas | Todos (1–6) | — | — | pendente |
| R06.46 | Preservar nomes e licenças de dependências de terceiros | Todos (1–6) | — | — | pendente |

---

## SEÇÃO 07 — Identidade Visual e Comportamento Comum (72 requisitos)

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R07.01 | Criar família visual moderna | Todos (1–6) | — | — | pendente |
| R07.02 | Acolhedora | Todos (1–6) | — | — | pendente |
| R07.03 | Delicada | Todos (1–6) | — | — | pendente |
| R07.04 | Orgânica | Todos (1–6) | — | — | pendente |
| R07.05 | Nada futurista | Todos (1–6) | — | — | pendente |
| R07.06 | Nada neon | Todos (1–6) | — | — | pendente |
| R07.07 | Nada cyberpunk | Todos (1–6) | — | — | pendente |
| R07.08 | Nada tridimensional | Todos (1–6) | — | — | pendente |
| R07.09 | Nada com perspectiva forçada | Todos (1–6) | — | — | pendente |
| R07.10 | Nada com aparência de painel administrativo genérico | Todos (1–6) | — | — | pendente |
| R07.11 | Não usar grade de cartões quadrados repetidos como estrutura principal | Todos (1–6) | — | — | pendente |
| R07.12 | Preferir composições editoriais | Todos (1–6) | — | — | pendente |
| R07.13 | Preferir faixas suaves | Todos (1–6) | — | — | pendente |
| R07.14 | Preferir listas bem desenhadas | Todos (1–6) | — | — | pendente |
| R07.15 | Preferir bordas curvas | Todos (1–6) | — | — | pendente |
| R07.16 | Preferir superfícies com formato apropriado ao conteúdo | Todos (1–6) | — | — | pendente |
| R07.17 | Estrutura de navegação é consistente entre os seis sites | Todos (1–6) | — | — | pendente |
| R07.18 | Cada site possui uma paleta cromática própria | Todos (1–6) | — | — | pendente |
| R07.19 | Cada página/ferramenta recebe combinação de cor de destaque própria | Todos (1–6) | — | — | pendente |
| R07.20 | Mantendo o mesmo padrão estrutural entre todas | Todos (1–6) | — | — | pendente |
| R07.21 | As combinações de cor devem ser harmoniosas | Todos (1–6) | — | — | pendente |
| R07.22 | Preservar contraste em texto, ícones, foco e estados | Todos (1–6) | — | — | pendente |
| R07.23 | Não trocar cor de fundo sem avaliar texto | Todos (1–6) | — | — | pendente |
| R07.24 | Não trocar cor de fundo sem avaliar ícones | Todos (1–6) | — | — | pendente |
| R07.25 | Não trocar cor de fundo sem avaliar foco (acessibilidade) | Todos (1–6) | — | — | pendente |
| R07.26 | Não trocar cor de fundo sem avaliar estados | Todos (1–6) | — | — | pendente |
| R07.27 | Confeitaria: rosa queimado, creme e frutas vermelhas | 1 | — | — | pendente |
| R07.28 | Educação: azul suave, amarelo quente e papel claro | 2 | — | — | pendente |
| R07.29 | Artesanato: lavanda, ameixa e linho | 3 | — | — | pendente |
| R07.30 | Festas: coral, pêssego e verde suave | 4 | — | — | pendente |
| R07.31 | Reforma: verde sálvia, terracota e areia | 5 | — | — | pendente |
| R07.32 | Embalagens: azul petróleo, damasco e papel | 6 | — | — | pendente |
| R07.33 | Escolher fontes gratuitas com licença comercial | Todos (1–6) | — | — | pendente |
| R07.34 | Com bom desenho tipográfico | Todos (1–6) | — | — | pendente |
| R07.35 | Com cobertura completa de português brasileiro | Todos (1–6) | — | — | pendente |
| R07.36 | Hospede as fontes localmente | Todos (1–6) | — | — | pendente |
| R07.37 | Limite famílias e pesos de fontes | Todos (1–6) | — | — | pendente |
| R07.38 | Selecione ícones de biblioteca gratuita licenciada | Todos (1–6) | — | — | pendente |
| R07.39 | Com estilo consistente | Todos (1–6) | — | — | pendente |
| R07.40 | Carregando apenas os ícones usados | Todos (1–6) | — | — | pendente |
| R07.41 | Ícone acompanha rótulo quando ação puder ser ambígua | Todos (1–6) | — | — | pendente |
| R07.42 | Todos os estados fazem parte da interface: vazio | Todos (1–6) | — | — | pendente |
| R07.43 | Estado: edição | Todos (1–6) | — | — | pendente |
| R07.44 | Estado: sucesso | Todos (1–6) | — | — | pendente |
| R07.45 | Estado: erro | Todos (1–6) | — | — | pendente |
| R07.46 | Estado: carregamento | Todos (1–6) | — | — | pendente |
| R07.47 | Estado: indisponibilidade | Todos (1–6) | — | — | pendente |
| R07.48 | Estado: ausência de resultados | Todos (1–6) | — | — | pendente |
| R07.49 | Mensagens claras em português junto ao campo | Todos (1–6) | — | — | pendente |
| R07.50 | Com foco acessível quando necessário | Todos (1–6) | — | — | pendente |
| R07.51 | Não usar alert(), confirm() ou prompt() | Todos (1–6) | — | — | pendente |
| R07.52 | Usar diálogos personalizados acessíveis | Todos (1–6) | — | — | pendente |
| R07.53 | Notificações e confirmações dentro da interface | Todos (1–6) | — | — | pendente |
| R07.54 | Com foco inicial | Todos (1–6) | — | — | pendente |
| R07.55 | Contenção de foco quando modal | Todos (1–6) | — | — | pendente |
| R07.56 | Fechamento por Escape | Todos (1–6) | — | — | pendente |
| R07.57 | Restauração de foco ao fechar | Todos (1–6) | — | — | pendente |
| R07.58 | Não substituir permissões nativas: impressão | Todos (1–6) | — | — | pendente |
| R07.59 | Não substituir permissões nativas: download | Todos (1–6) | — | — | pendente |
| R07.60 | Não substituir permissões nativas: área de transferência | Todos (1–6) | — | — | pendente |
| R07.61 | Não substituir permissões nativas: permissões do sistema | Todos (1–6) | — | — | pendente |
| R07.62 | Rodapé institucional identifica "Criado por Anderson" | Todos (1–6) | — | — | pendente |
| R07.63 | Rodapé incluir portfólio real | Todos (1–6) | — | — | preparado para configuração |
| R07.64 | Rodapé incluir contato real | Todos (1–6) | — | — | preparado para configuração |
| R07.65 | Endereços vêm da configuração pública | Central | — | — | preparado para configuração |
| R07.66 | Não inventar domínio | Central | — | — | pendente |
| R07.67 | Não inventar e-mail | Central | — | — | pendente |
| R07.68 | Não inventar telefone | Central | — | — | pendente |
| R07.69 | Não inventar link "#" | Central | — | — | pendente |
| R07.70 | Se faltarem, registrar pendência de publicação | Central | — | — | pendente |
| R07.71 | Não exibir links quebrados | Todos (1–6) | — | — | pendente |
| R07.72 | Não confundir rodapé institucional com navegação inferior (celular) | Todos (1–6) | — | — | pendente |

---

## SEÇÃO 08 — Celular como Aplicativo; Computador como Site (78 requisitos)

*[Requisitos de R08.01 a R08.78 em tabela contínua...]*

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R08.01 | Este requisito é obrigatório em TODOS os seis produtos | Todos (1–6) | — | — | pendente |
| R08.02 | Obrigatório em TODAS as páginas | Todos (1–6) | — | — | pendente |
| R08.03 | Inclusive em página de consentimento | Todos (1–6) | — | — | pendente |
| R08.04 | Inclusive em página de Pix | Todos (1–6) | — | — | pendente |
| R08.05 | Inclusive em página de erro | Todos (1–6) | — | — | pendente |
| R08.06 | Inclusive em área administrativa se houver | Todos (1–6) | — | — | não aplicável |
| R08.07 | Navegação fixa inferior com até cinco destinos (celular) | Todos (1–6) | — | — | pendente |
| R08.08 | Destinos: Início, Ferramentas, Salvos, Apoiar e Mais | Todos (1–6) | — | — | pendente |
| R08.09 | Ícones e nomes em português | Todos (1–6) | — | — | pendente |
| R08.10 | Estado ativo visível | Todos (1–6) | — | — | pendente |
| R08.11 | aria-current apropriado | Todos (1–6) | — | — | pendente |
| R08.12 | Destinos precisam existir | Todos (1–6) | — | — | pendente |
| R08.13 | Destinos precisam funcionar | Todos (1–6) | — | — | pendente |
| R08.14 | "Salvos" mostra dados locais reais | Todos (1–6) | — | — | pendente |
| R08.15 | "Mais" abre um menu acessível | Todos (1–6) | — | — | pendente |
| R08.16 | Não inventar recursos apenas para preencher a barra | Todos (1–6) | — | — | pendente |
| R08.17 | Ação principal de cada ferramenta fica ao alcance do polegar | Todos (1–6) | — | — | pendente |
| R08.18 | Usar faixa contextual inferior quando útil | Todos (1–6) | — | — | pendente |
| R08.19 | Acima da navegação, sem duplicação confusa de botões | Todos (1–6) | — | — | pendente |
| R08.20 | Área de toque mínima: 44 × 44 pixels CSS | Todos (1–6) | — | — | pendente |
| R08.21 | Com separação entre alvos | Todos (1–6) | — | — | pendente |
| R08.22 | E leitura confortável | Todos (1–6) | — | — | pendente |
| R08.23 | Campos com fonte mínima 16 pixels CSS | Todos (1–6) | — | — | pendente |
| R08.24 | Para evitar zoom indesejado em aparelhos comuns | Todos (1–6) | — | — | pendente |
| R08.25 | Reserve espaço da barra navegação no conteúdo | Todos (1–6) | — | — | pendente |
| R08.26 | Reserve espaço das ações contextuais no conteúdo | Todos (1–6) | — | — | pendente |
| R08.27 | Inclua env(safe-area-inset-bottom) | Todos (1–6) | — | — | pendente |
| R08.28 | Use viewport adequado (viewport-fit=cover) | Todos (1–6) | — | — | pendente |
| R08.29 | Use unidades dinâmicas quando apropriado | Todos (1–6) | — | — | pendente |
| R08.30 | Com fallback | Todos (1–6) | — | — | pendente |
| R08.31 | Teste: teclado virtual — campo ativo permanece visível | Todos (1–6) | — | — | pendente |
| R08.32 | Teste: teclado virtual — mensagem permanece visível | Todos (1–6) | — | — | pendente |
| R08.33 | Barra pode recolher temporariamente (comportamento observado) | Todos (1–6) | — | — | pendente |
| R08.34 | Ação deve continuar acessível (mesmo com teclado virtual) | Todos (1–6) | — | — | pendente |
| R08.35 | Não depender de altura fixa de tela | Todos (1–6) | — | — | pendente |
| R08.36 | Consentimento não pode disputar o mesmo canto | Todos (1–6) | — | — | pendente |
| R08.37 | Consentimento não pode cobrir a barra de navegação | Todos (1–6) | — | — | pendente |
| R08.38 | Apoio não pode disputar o mesmo canto | Todos (1–6) | — | — | pendente |
| R08.39 | Apoio não pode cobrir a barra | Todos (1–6) | — | — | pendente |
| R08.40 | Anúncios não podem disputar o mesmo canto | Todos (1–6) | — | — | pendente |
| R08.41 | Anúncios não podem cobrir a barra | Todos (1–6) | — | — | pendente |
| R08.42 | Feedback não pode disputar canto | Todos (1–6) | — | — | não aplicável |
| R08.43 | Feedback não pode cobrir a barra | Todos (1–6) | — | — | não aplicável |
| R08.44 | Chat não pode disputar canto | Todos (1–6) | — | — | não aplicável |
| R08.45 | Chat não pode cobrir a barra | Todos (1–6) | — | — | não aplicável |
| R08.46 | Definir hierarquia de sobreposição e reposicionamento | Todos (1–6) | — | — | pendente |
| R08.47 | No máximo um diálogo modal ativo por vez | Todos (1–6) | — | — | pendente |
| R08.48 | Banners de apoio não podem cobrir navegação | Todos (1–6) | — | — | pendente |
| R08.49 | Banners de apoio não podem imitar seus botões | Todos (1–6) | — | — | pendente |
| R08.50 | Publicidade não podem cobrir navegação | Todos (1–6) | — | — | pendente |
| R08.51 | Publicidade não podem imitar botões da navegação | Todos (1–6) | — | — | pendente |
| R08.52 | Destino "Apoiar" abre página legítima de doação voluntária | Todos (1–6) | — | — | pendente |
| R08.53 | Não colocar anúncio fixo junto aos botões de ação | Todos (1–6) | — | — | pendente |
| R08.54 | Retrato e paisagem, rolagem natural | Todos (1–6) | — | — | pendente |
| R08.55 | Sem arrastar lateralmente a página | Todos (1–6) | — | — | pendente |
| R08.56 | Tabelas ou moldes grandes têm alternativa adequada | Todos (1–6) | — | — | pendente |
| R08.57 | Rolagem contida somente onde necessário | Todos (1–6) | — | — | pendente |
| R08.58 | Cabeçalho e navegação adequados ao espaço (computador) | Todos (1–6) | — | — | pendente |
| R08.59 | Sem simplesmente ampliar a barra de celular | Todos (1–6) | — | — | pendente |
| R08.60 | Formulário e resultado podem aparecer lado a lado | Todos (1–6) | — | — | pendente |
| R08.61 | Largura de leitura controlada | Todos (1–6) | — | — | pendente |
| R08.62 | Alinhamento consistente | Todos (1–6) | — | — | pendente |
| R08.63 | Teclado funciona | Todos (1–6) | — | — | pendente |
| R08.64 | Foco visível | Todos (1–6) | — | — | pendente |
| R08.65 | Tab funciona | Todos (1–6) | — | — | pendente |
| R08.66 | Enter funciona | Todos (1–6) | — | — | pendente |
| R08.67 | Escape funciona | Todos (1–6) | — | — | pendente |
| R08.68 | Nenhuma função depende exclusivamente de passar o mouse | Todos (1–6) | — | — | pendente |
| R08.69 | Faixa de teste: 320px | Todos (1–6) | — | — | pendente |
| R08.70 | Faixa de teste: 360px | Todos (1–6) | — | — | pendente |
| R08.71 | Faixa de teste: 390px | Todos (1–6) | — | — | pendente |
| R08.72 | Faixa de teste: 768px | Todos (1–6) | — | — | pendente |
| R08.73 | Faixa de teste: 1024px | Todos (1–6) | — | — | pendente |
| R08.74 | Faixa de teste: 1440px | Todos (1–6) | — | — | pendente |
| R08.75 | Incluir uma altura curta em paisagem | Todos (1–6) | — | — | pendente |
| R08.76 | Emular aparelhos ajuda, mas | Todos (1–6) | — | — | pendente |
| R08.77 | Não equivale a testar dispositivo físico | Todos (1–6) | — | — | pendente |
| R08.78 | Relatar separadamente o validado em aparelho real | Todos (1–6) | — | — | pendente |

---

## SEÇÃO 09 — Animações e Desempenho (48 requisitos)

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R09.01 | Projetar transições para botões | Todos (1–6) | — | — | pendente |
| R09.02 | Transições para seleção | Todos (1–6) | — | — | pendente |
| R09.03 | Transições para expansão | Todos (1–6) | — | — | pendente |
| R09.04 | Transições para navegação | Todos (1–6) | — | — | pendente |
| R09.05 | Transições para diálogos | Todos (1–6) | — | — | pendente |
| R09.06 | Transições para resultados | Todos (1–6) | — | — | pendente |
| R09.07 | Movimento deve explicar a mudança | Todos (1–6) | — | — | pendente |
| R09.08 | Movimento deve dar sensação de cuidado | Todos (1–6) | — | — | pendente |
| R09.09 | Sem atrasar o uso | Todos (1–6) | — | — | pendente |
| R09.10 | Valores iniciais sugeridos: 120–220 ms para controles | Todos (1–6) | — | — | pendente |
| R09.11 | Valores iniciais sugeridos: 180–320 ms para painéis | Todos (1–6) | — | — | pendente |
| R09.12 | Ajustar ao resultado observado | Todos (1–6) | — | — | pendente |
| R09.13 | Priorize transform | Todos (1–6) | — | — | pendente |
| R09.14 | Priorize opacity | Todos (1–6) | — | — | pendente |
| R09.15 | Evite animações contínuas | Todos (1–6) | — | — | pendente |
| R09.16 | Evite parallax | Todos (1–6) | — | — | pendente |
| R09.17 | Evite partículas | Todos (1–6) | — | — | pendente |
| R09.18 | Evite movimentos pesados durante digitação | Todos (1–6) | — | — | pendente |
| R09.19 | Não animar cada caractere de um resultado | Todos (1–6) | — | — | pendente |
| R09.20 | Não provocar saltos de layout (CLS) | Todos (1–6) | — | — | pendente |
| R09.21 | Respeite prefers-reduced-motion | Todos (1–6) | — | — | pendente |
| R09.22 | Toda funcionalidade deve continuar clara com movimentos reduzidos | Todos (1–6) | — | — | pendente |
| R09.23 | Ferramentas pequenas respondem imediatamente | Todos (1–6) | — | — | pendente |
| R09.24 | Gerações caras usam limites explícitos | Todos (1–6) | — | — | pendente |
| R09.25 | Gerações caras usam carregamento sob demanda | Todos (1–6) | — | — | pendente |
| R09.26 | Gerações caras usam processamento fora da tarefa principal | Todos (1–6) | — | — | pendente |
| R09.27 | Exemplos: caça-palavras, PDFs, moldes | Todos (1–6) | — | — | pendente |
| R09.28 | Não usar laço infinito para tentar encaixar problema impossível | Todos (1–6) | — | — | pendente |
| R09.29 | Mostrar progresso apenas quando real | Todos (1–6) | — | — | pendente |
| R09.30 | Permitir cancelar operações demoradas | Todos (1–6) | — | — | pendente |
| R09.31 | Meta de desempenho: LCP até 2,5 s | Todos (1–6) | — | — | pendente |
| R09.32 | Meta de desempenho: INP até 200 ms | Todos (1–6) | — | — | pendente |
| R09.33 | Meta de desempenho: CLS até 0,1 | Todos (1–6) | — | — | pendente |
| R09.34 | Em condições descritas | Todos (1–6) | — | — | pendente |
| R09.35 | Dados de laboratório não substituem métricas reais de campo | Todos (1–6) | — | — | pendente |
| R09.36 | Registrar aparelho/emulação nos resultados | Central | — | — | pendente |
| R09.37 | Registrar rede nos resultados | Central | — | — | pendente |
| R09.38 | Registrar build nos resultados | Central | — | — | pendente |
| R09.39 | Registrar presença de anúncios nos resultados | Todos (1–6) | — | — | pendente |
| R09.40 | Não prometer velocidade universal | Central | — | — | pendente |
| R09.41 | Carregar bibliotecas de PDF apenas quando necessárias | Todos (1–6) | — | — | pendente |
| R09.42 | Carregar bibliotecas de QR apenas quando necessárias | Todos (1–6) | — | — | pendente |
| R09.43 | Usar imagens dimensionadas | Todos (1–6) | — | — | pendente |
| R09.44 | Usar fontes locais otimizadas | Todos (1–6) | — | — | pendente |
| R09.45 | Usar espaços reservados para anúncios | Todos (1–6) | — | — | pendente |
| R09.46 | Não medir somente versão vazia para afirmar velocidade com anúncios | Todos (1–6) | — | — | pendente |
| R09.47 | Se anúncios reais não estiverem disponíveis, validar com simulação identificada | Todos (1–6) | — | — | pendente |
| R09.48 | Deixar medição real como pendência | Central | — | — | pendente |

---

## SEÇÃO 10 — Projeto 1 — Ferramentas para Confeitaria (60 requisitos)

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R10.01 | Pasta: 1. Ferramentas para confeitaria | 1 | — | — | pendente |
| R10.02 | Marca provisória: Forno em Conta | 1 | — | — | pendente |
| R10.03 | Entregar ferramenta: custo da receita | 1 | — | — | pendente |
| R10.04 | Entregar ferramenta: preço de venda | 1 | — | — | pendente |
| R10.05 | Entregar ferramenta: ajuste de quantidade | 1 | — | — | pendente |
| R10.06 | Entregar ferramenta: lista de compras | 1 | — | — | pendente |
| R10.07 | Entregar ferramenta: orçamento imprimível | 1 | — | — | pendente |
| R10.08 | Ferramentas conectadas entre si | 1 | — | — | pendente |
| R10.09 | Começar com: brigadeiros | 1 | — | — | pendente |
| R10.10 | Começar com: brownies | 1 | — | — | pendente |
| R10.11 | Começar com: bolo de pote | 1 | — | — | pendente |
| R10.12 | Sem restringir inclusão de receitas próprias | 1 | — | — | pendente |
| R10.13 | Entrada: preço da embalagem comprada | 1 | — | — | pendente |
| R10.14 | Entrada: quantidade comprada | 1 | — | — | pendente |
| R10.15 | Entrada: quantidade usada | 1 | — | — | pendente |
| R10.16 | Entrada: unidade | 1 | — | — | pendente |
| R10.17 | Entrada: rendimento aproveitável | 1 | — | — | pendente |
| R10.18 | Entrada: embalagem de venda | 1 | — | — | pendente |
| R10.19 | Entrada: tempo | 1 | — | — | pendente |
| R10.20 | Entrada: valor da hora | 1 | — | — | pendente |
| R10.21 | Entrada: custos adicionais | 1 | — | — | pendente |
| R10.22 | Entrada: taxa percentual (informada pelo usuário) | 1 | — | — | pendente |
| R10.23 | Não trazer preços de supermercado por API | 1 | — | — | pendente |
| R10.24 | Não fingir cotação atualizada | 1 | — | — | pendente |
| R10.25 | Custo proporcional = (preço embalagem × quantidade usada) / quantidade comprada | 1 | — | — | pendente |
| R10.26 | Em unidades compatíveis | 1 | — | — | pendente |
| R10.27 | Conversão entre g/kg | 1 | — | — | pendente |
| R10.28 | Conversão entre ml/L | 1 | — | — | pendente |
| R10.29 | Não converter volume em massa sem densidade específica declarada | 1 | — | — | pendente |
| R10.30 | Separar custo consumido | 1 | — | — | pendente |
| R10.31 | Separar custo de estoque | 1 | — | — | pendente |
| R10.32 | Separar dinheiro necessário para comprar embalagens inteiras | 1 | — | — | pendente |
| R10.33 | Preço com margem = custo / (1 − margem − taxas) | 1 | — | — | pendente |
| R10.34 | Somente quando percentuais têm a mesma base | 1 | — | — | pendente |
| R10.35 | Bloquear denominador zero | 1 | — | — | pendente |
| R10.36 | Bloquear denominador negativo | 1 | — | — | pendente |
| R10.37 | Distinguir margem de acréscimo sobre custo | 1 | — | — | pendente |
| R10.38 | Escala de encomenda considera rendimento | 1 | — | — | pendente |
| R10.39 | Escala de encomenda considera arredondamento de lotes | 1 | — | — | pendente |
| R10.40 | Permitir corrigir manualmente: tempo | 1 | — | — | pendente |
| R10.41 | Permitir corrigir manualmente: forno | 1 | — | — | pendente |
| R10.42 | Permitir corrigir manualmente: desperdício | 1 | — | — | pendente |
| R10.43 | Que nem sempre crescem linearmente | 1 | — | — | pendente |
| R10.44 | Salvar receitas locais | 1 | — | — | pendente |
| R10.45 | Duplicar receitas locais | 1 | — | — | pendente |
| R10.46 | Editar receitas locais | 1 | — | — | pendente |
| R10.47 | Excluir receitas locais | 1 | — | — | pendente |
| R10.48 | Exportar backup validado | 1 | — | — | pendente |
| R10.49 | Importar backup validado | 1 | — | — | pendente |
| R10.50 | Importar backup versionado | 1 | — | — | pendente |
| R10.51 | Orçamento ao cliente contém somente informações comerciais escolhidas | 1 | — | — | pendente |
| R10.52 | Não revela custo interno | 1 | — | — | pendente |
| R10.53 | Não revela margem | 1 | — | — | pendente |
| R10.54 | Copiar texto sem integração paga de mensagens | 1 | — | — | pendente |
| R10.55 | Caso de conferência: R$ 80 por 50 unidades, margem 30%, sem taxas = R$ 2,29/un, R$ 114,50/lote | 1 | — | — | pendente |
| R10.56 | Não arredondar cada etapa intermediária para distorcer resultado | 1 | — | — | pendente |
| R10.57 | Incluir metodologia | 1 | — | — | pendente |
| R10.58 | Incluir exemplos revisados | 1 | — | — | pendente |
| R10.59 | Incluir explicação de premissas | 1 | — | — | pendente |
| R10.60 | Não chamar resultado de lucro garantido | 1 | — | — | pendente |

---

## SEÇÃO 11 — Projeto 2: Atividades Escolares (73 requisitos)

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R11.01 | Pasta: 2. Atividades escolares para imprimir | 2 | — | — | pendente |
| R11.02 | Público principal: professores e responsáveis preparando materiais | 2 | — | — | pendente |
| R11.03 | Não autoriza ignorar eventual uso por crianças | 2 | — | — | pendente |
| R11.04 | Entregar gerador: operações matemáticas | 2 | — | — | pendente |
| R11.05 | Entregar gerador: tabuada | 2 | — | — | pendente |
| R11.06 | Entregar gerador: caça-palavras | 2 | — | — | pendente |
| R11.07 | Entregar gerador: folhas de escrita/caligrafia personalizadas | 2 | — | — | pendente |
| R11.08 | Matemática: permitir selecionar operações | 2 | — | — | pendente |
| R11.09 | Matemática: permitir selecionar intervalo de números | 2 | — | — | pendente |
| R11.10 | Matemática: permitir selecionar quantidade de problemas | 2 | — | — | pendente |
| R11.11 | Matemática: permitir selecionar apresentação (linha/coluna/colunas) | 2 | — | — | pendente |
| R11.12 | Matemática: permitir selecionar dificuldade | 2 | — | — | pendente |
| R11.13 | Matemática: controlar se há reserva/empréstimo | 2 | — | — | pendente |
| R11.14 | Matemática: controlar se permite resultados negativos | 2 | — | — | pendente |
| R11.15 | Matemática: controlar divisão com ou sem resto conforme opção | 2 | — | — | pendente |
| R11.16 | Divisão exata: gera operandos a partir de quociente e divisor | 2 | — | — | pendente |
| R11.17 | Divisão: nunca arredonda resposta incorreta | 2 | — | — | pendente |
| R11.18 | Tabuada: permitir selecionar fatores | 2 | — | — | pendente |
| R11.19 | Tabuada: permitir selecionar quantidade | 2 | — | — | pendente |
| R11.20 | Tabuada: com gabarito separado | 2 | — | — | pendente |
| R11.21 | Caça-palavras: lista editável | 2 | — | — | pendente |
| R11.22 | Caça-palavras: selecionar direções (horizontal, vertical, diagonal) | 2 | — | — | pendente |
| R11.23 | Caça-palavras: selecionar tamanho de grade | 2 | — | — | pendente |
| R11.24 | Caça-palavras: incluir gabarito | 2 | — | — | pendente |
| R11.25 | Caça-palavras: usar estratégia limitada e determinística por semente | 2 | — | — | pendente |
| R11.26 | Caça-palavras: garantir inclusão de todas as palavras | 2 | — | — | pendente |
| R11.27 | Caça-palavras: informar quais palavras não cabem (em vez de omitir) | 2 | — | — | pendente |
| R11.28 | Caça-palavras: nunca omitir palavra silenciosamente | 2 | — | — | pendente |
| R11.29 | Tratar acentos conscientemente: escolher modo de exibição | 2 | — | — | pendente |
| R11.30 | Tratar cedilha conscientemente: escolher modo de busca | 2 | — | — | pendente |
| R11.31 | Acentuação: explicar a opção escolhida | 2 | — | — | pendente |
| R11.32 | Acentuação: garantir correspondência entre grade, lista e gabarito | 2 | — | — | pendente |
| R11.33 | Evitar normalização que transforme palavras sem avisar | 2 | — | — | pendente |
| R11.34 | Caligrafia: aceitar texto do responsável como entrada | 2 | — | — | pendente |
| R11.35 | Caligrafia: incluir linhas-guia | 2 | — | — | pendente |
| R11.36 | Caligrafia: permitir repetição de linhas | 2 | — | — | pendente |
| R11.37 | Caligrafia: permitir ajuste de tamanho | 2 | — | — | pendente |
| R11.38 | Caligrafia: usar fonte licenciada adequada | 2 | — | — | pendente |
| R11.39 | Caligrafia: cobrir letras só se permitir traçado realmente utilizável | 2 | — | — | pendente |
| R11.40 | Caligrafia: não fingir pontilhado com efeito visual ilegível | 2 | — | — | pendente |
| R11.41 | Fornecer prévia da atividade | 2 | — | — | pendente |
| R11.42 | Permitir impressão em formato A4 | 2 | — | — | pendente |
| R11.43 | Permitir download de arquivo PDF local | 2 | — | — | pendente |
| R11.44 | Gabarito em página separada | 2 | — | — | pendente |
| R11.45 | Sem anúncios no material impresso | 2 | — | — | pendente |
| R11.46 | Sem banner de doação no material impresso | 2 | — | — | pendente |
| R11.47 | Cabeçalho opcional com nome da atividade | 2 | — | — | pendente |
| R11.48 | Nenhum dado de aluno enviado a servidor | 2 | — | — | pendente |
| R11.49 | Nenhum dado de aluno enviado para anúncios | 2 | — | — | pendente |
| R11.50 | Nenhum dado de aluno enviado para analytics | 2 | — | — | pendente |
| R11.51 | Campos pessoais permanecem locais (não salvos em servidor) | 2 | — | — | pendente |
| R11.52 | Campos pessoais não entram em URL pública | 2 | — | — | pendente |
| R11.53 | Evitar personagens, apostilas e imagens protegidas copiadas | 2 | — | — | pendente |
| R11.54 | Não alegar alinhamento com BNCC sem verificar o conteúdo | 2 | — | — | pendente |
| R11.55 | Não alegar eficácia pedagógica sem verificar habilidades correspondentes | 2 | — | — | pendente |
| R11.56 | Anúncios e pedido de apoio no ambiente de preparação do adulto | 2 | — | — | pendente |
| R11.57 | Nunca anúncios dentro da atividade infantil | 2 | — | — | pendente |
| R11.58 | Nunca anúncios disfarçados de instrução | 2 | — | — | pendente |
| R11.59 | Avaliar tratamento de publicidade para público infantil | 2 | — | — | pendente |
| R11.60 | Documentar tratamento de publicidade para público infantil | 2 | — | — | pendente |
| R11.61 | Não contornar com aviso "somente adultos" | 2 | — | — | pendente |
| R11.62 | Teste: respostas matemáticas independentes do renderizador | 2 | — | — | pendente |
| R11.63 | Teste: todas as palavras do caça-palavras presentes | 2 | — | — | pendente |
| R11.64 | Teste: correspondência com o gabarito | 2 | — | — | pendente |
| R11.65 | Teste: palavras longas cabem ou informação clara | 2 | — | — | pendente |
| R11.66 | Teste: grade impossível tratado apropriadamente | 2 | — | — | pendente |
| R11.67 | Teste: caracteres brasileiros (ç, ã, é, etc.) funcionam | 2 | — | — | pendente |
| R11.68 | Teste: PDF sem corte de conteúdo | 2 | — | — | pendente |
| R11.69 | Teste: PDF sem página vazia inesperada | 2 | — | — | pendente |
| R11.70 | Teste: operações com múltiplos operandos | 2 | — | — | pendente |
| R11.71 | Teste: intervalo de números negativos | 2 | — | — | pendente |
| R11.72 | Teste: reprodução consistente com mesma semente | 2 | — | — | pendente |
| R11.73 | Teste: sem dados de aluno em cookies/localStorage/URLs | 2 | — | — | pendente |

---

## SEÇÃO 12 — Projeto 3: Crochê e Artesanato (37 requisitos)

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R12.01 | Pasta: 3. Ferramentas para crochê e artesanato | 3 | — | — | pendente |
| R12.02 | Entregar ferramenta: preço da peça | 3 | — | — | pendente |
| R12.03 | Entregar ferramenta: valor da hora | 3 | — | — | pendente |
| R12.04 | Entregar ferramenta: custo de fio/material consumido | 3 | — | — | pendente |
| R12.05 | Entregar ferramenta: planejamento de encomenda | 3 | — | — | pendente |
| R12.06 | Entregar ferramenta: orçamento imprimível | 3 | — | — | pendente |
| R12.07 | Perfil inicial: crochê | 3 | — | — | pendente |
| R12.08 | Perfil inicial: amigurumi | 3 | — | — | pendente |
| R12.09 | Perfil inicial: peças artesanais com materiais adicionados pelo usuário | 3 | — | — | pendente |
| R12.10 | Registrar material usado | 3 | — | — | pendente |
| R12.11 | Registrar preço de compra | 3 | — | — | pendente |
| R12.12 | Registrar peso/metragem disponível | 3 | — | — | pendente |
| R12.13 | Registrar consumo de material | 3 | — | — | pendente |
| R12.14 | Considerar embalagem no cálculo | 3 | — | — | pendente |
| R12.15 | Considerar tempo no cálculo | 3 | — | — | pendente |
| R12.16 | Considerar custos adicionais no cálculo | 3 | — | — | pendente |
| R12.17 | Não converter gramas em metros sem densidade específica declarada | 3 | — | — | pendente |
| R12.18 | Apresentar preço por peça | 3 | — | — | pendente |
| R12.19 | Apresentar preço por conjunto | 3 | — | — | pendente |
| R12.20 | Apresentar margem real calculada | 3 | — | — | pendente |
| R12.21 | Apresentar efeito de desconto | 3 | — | — | pendente |
| R12.22 | Comparar valor mínimo calculado com preço informado | 3 | — | — | pendente |
| R12.23 | Sem declarar valor universal de mercado | 3 | — | — | pendente |
| R12.24 | Permitir salvar fichas locais | 3 | — | — | pendente |
| R12.25 | Permitir duplicar peças | 3 | — | — | pendente |
| R12.26 | Permitir ajustar quantidades | 3 | — | — | pendente |
| R12.27 | Permitir exportar backup | 3 | — | — | pendente |
| R12.28 | Não gerar receita de amigurumi fingindo construção não implementada | 3 | — | — | pendente |
| R12.29 | Não gerar molde de roupa fingindo construção não implementada | 3 | — | — | pendente |
| R12.30 | Conteúdo de apoio é autoral | 3 | — | — | pendente |
| R12.31 | Conteúdo de apoio claramente separado de estimativas | 3 | — | — | pendente |
| R12.32 | Teste: novelo de R$ 20 e 100 g, consumo de 25 g = R$ 5 | 3 | — | — | pendente |
| R12.33 | Teste: soma com mão de obra conferida antes da margem | 3 | — | — | pendente |
| R12.34 | Teste: soma com embalagem conferida antes da margem | 3 | — | — | pendente |
| R12.35 | Teste: quantidade comprada zero tratado claramente | 3 | — | — | pendente |
| R12.36 | Teste: unidade incompatível tratada claramente | 3 | — | — | pendente |
| R12.37 | Teste: desconto que gere prejuízo tratado claramente | 3 | — | — | pendente |

---

## SEÇÃO 13 — Projeto 4: Churrasco e Festas (50 requisitos)

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R13.01 | Pasta: 4. Planejamento de churrasco e festas | 4 | — | — | pendente |
| R13.02 | Entregar planejador de churrasco | 4 | — | — | pendente |
| R13.03 | Entregar planejador de festa infantil | 4 | — | — | pendente |
| R13.04 | Entregar planejador de encontro/almoço | 4 | — | — | pendente |
| R13.05 | Com lista de compras | 4 | — | — | pendente |
| R13.06 | Com estimativa de orçamento | 4 | — | — | pendente |
| R13.07 | Com divisão opcional de despesas entre participantes pagantes | 4 | — | — | pendente |
| R13.08 | Entrada: número de adultos | 4 | — | — | pendente |
| R13.09 | Entrada: número de crianças | 4 | — | — | pendente |
| R13.10 | Entrada: duração do evento | 4 | — | — | pendente |
| R13.11 | Entrada: apetite esperado | 4 | — | — | pendente |
| R13.12 | Entrada: acompanhamentos | 4 | — | — | pendente |
| R13.13 | Entrada: preferências alimentares | 4 | — | — | pendente |
| R13.14 | Entrada: quantidade explícita de adultos que consumirão álcool | 4 | — | — | pendente |
| R13.15 | Não presumir consumo por sexo | 4 | — | — | pendente |
| R13.16 | Não incluir crianças na conta de bebidas alcoólicas | 4 | — | — | pendente |
| R13.17 | Premissas de consumo devem vir de referências identificadas | 4 | — | — | pendente |
| R13.18 | Premissas de consumo devem ser editáveis | 4 | — | — | pendente |
| R13.19 | Quantidades são estimativas, não garantia de porção ideal | 4 | — | — | pendente |
| R13.20 | Separar cru/cozido quando pertinente | 4 | — | — | pendente |
| R13.21 | Separar com osso/sem osso quando pertinente | 4 | — | — | pendente |
| R13.22 | Evitar dupla aplicação de perdas | 4 | — | — | pendente |
| R13.23 | Explicar ajustes por duração | 4 | — | — | pendente |
| R13.24 | Explicar ajustes por acompanhamentos | 4 | — | — | pendente |
| R13.25 | Calcular itens necessários | 4 | — | — | pendente |
| R13.26 | Arredondar para embalagens inteiras | 4 | — | — | pendente |
| R13.27 | Permitir excluir itens da lista | 4 | — | — | pendente |
| R13.28 | Permitir substituir itens da lista | 4 | — | — | pendente |
| R13.29 | Permitir incluir preços pagos pelo próprio usuário | 4 | — | — | pendente |
| R13.30 | Dividir orçamento por participantes pagantes | 4 | — | — | pendente |
| R13.31 | Não necessariamente por todos os presentes | 4 | — | — | pendente |
| R13.32 | Nenhum preço em tempo real ou API obrigatória | 4 | — | — | pendente |
| R13.33 | Salvar evento localmente | 4 | — | — | pendente |
| R13.34 | Copiar lista de compras | 4 | — | — | pendente |
| R13.35 | Imprimir versão limpa | 4 | — | — | pendente |
| R13.36 | Presets de 10 pessoas usam mesma ferramenta | 4 | — | — | pendente |
| R13.37 | Presets de 20 pessoas usam mesma ferramenta | 4 | — | — | pendente |
| R13.38 | Presets de 30 pessoas usam mesma ferramenta | 4 | — | — | pendente |
| R13.39 | Presets de 50 pessoas usam mesma ferramenta | 4 | — | — | pendente |
| R13.40 | Não criar dezenas de páginas vazias só mudando número | 4 | — | — | pendente |
| R13.41 | Teste: zero convidados | 4 | — | — | pendente |
| R13.42 | Teste: somente crianças | 4 | — | — | pendente |
| R13.43 | Teste: apenas vegetarianos | 4 | — | — | pendente |
| R13.44 | Teste: zero consumidores de álcool | 4 | — | — | pendente |
| R13.45 | Teste: duração extrema (muito curta/muito longa) | 4 | — | — | pendente |
| R13.46 | Teste: embalagem indivisível | 4 | — | — | pendente |
| R13.47 | Teste: nenhuma pessoa pagante | 4 | — | — | pendente |
| R13.48 | Teste: total dos itens coincide com orçamento | 4 | — | — | pendente |
| R13.49 | Teste: divisão de despesas calcula corretamente | 4 | — | — | pendente |
| R13.50 | Teste: sem dados pessoais em URLs públicas | 4 | — | — | pendente |

---

## SEÇÃO 14 — Projeto 5: Pintura e Reforma (39 requisitos)

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R14.01 | Pasta: 5. Calculadoras de pintura e reforma | 5 | — | — | pendente |
| R14.02 | Entregar ferramenta: cálculo de área de paredes | 5 | — | — | pendente |
| R14.03 | Entregar ferramenta: quantidade de tinta necessária | 5 | — | — | pendente |
| R14.04 | Entregar ferramenta: piso/revestimento por caixa | 5 | — | — | pendente |
| R14.05 | Entregar ferramenta: rodapés necessários | 5 | — | — | pendente |
| R14.06 | Com orçamento estimado a partir de preços informados | 5 | — | — | pendente |
| R14.07 | Paredes: somar largura × altura de cada superfície | 5 | — | — | pendente |
| R14.08 | Paredes: subtrair aberturas (portas, janelas) | 5 | — | — | pendente |
| R14.09 | Paredes: sem permitir área negativa | 5 | — | — | pendente |
| R14.10 | Paredes: sem permitir abertura maior que superfície correspondente | 5 | — | — | pendente |
| R14.11 | Tinta: distinguir rendimento por demão | 5 | — | — | pendente |
| R14.12 | Tinta: de rendimento acabado do produto | 5 | — | — | pendente |
| R14.13 | Se rendimento é por demão, considerar número de demãos | 5 | — | — | pendente |
| R14.14 | Se já é acabado, não multiplicar novamente | 5 | — | — | pendente |
| R14.15 | Usar rótulo/ficha do produto como referência de rendimento | 5 | — | — | pendente |
| R14.16 | Piso: calcular área | 5 | — | — | pendente |
| R14.17 | Piso: margem de recorte | 5 | — | — | pendente |
| R14.18 | Piso: cobertura por caixa | 5 | — | — | pendente |
| R14.19 | Piso: caixas = teto(área ajustada / cobertura por caixa) | 5 | — | — | pendente |
| R14.20 | Piso: não confundir área calculada com paginação exata das peças | 5 | — | — | pendente |
| R14.21 | Rodapé: perímetro útil | 5 | — | — | pendente |
| R14.22 | Rodapé: descontar trechos sem instalação | 5 | — | — | pendente |
| R14.23 | Rodapé: adicionar perdas | 5 | — | — | pendente |
| R14.24 | Rodapé: arredondamento por barra/embalagem | 5 | — | — | pendente |
| R14.25 | Mostrar unidades em cada cálculo | 5 | — | — | pendente |
| R14.26 | Mostrar memória de cálculo (breakdown) | 5 | — | — | pendente |
| R14.27 | Preços fornecidos/ajustados pelo usuário | 5 | — | — | pendente |
| R14.28 | Mão de obra fornecida/ajustada pelo usuário | 5 | — | — | pendente |
| R14.29 | Perdas fornecidas/ajustadas pelo usuário | 5 | — | — | pendente |
| R14.30 | Nunca apresentar como orçamento profissional fechado | 5 | — | — | pendente |
| R14.31 | Teste: 20 m², 10% margem, 2,2 m²/caixa = 10 caixas | 5 | — | — | pendente |
| R14.32 | Teste: precisão decimal nos limites (não arredondar para caixa extra por erro) | 5 | — | — | pendente |
| R14.33 | Teste: cálculo de tinta com múltiplas demãos | 5 | — | — | pendente |
| R14.34 | Teste: rodapé com trechos sem instalação | 5 | — | — | pendente |
| R14.35 | Não incluir cálculos de estrutura | 5 | — | — | pendente |
| R14.36 | Não incluir cálculos de elétrica | 5 | — | — | pendente |
| R14.37 | Não incluir cálculos de gás | 5 | — | — | pendente |
| R14.38 | Não incluir cálculos de sustentação | 5 | — | — | pendente |
| R14.39 | Não incluir instruções de obra de risco | 5 | — | — | pendente |

---

## SEÇÃO 15 — Projeto 6: Moldes de Caixas e Embalagens (51 requisitos)

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R15.01 | Pasta: 6. Moldes de caixas e embalagens | 6 | — | — | pendente |
| R15.02 | Entregar gerador: caixa retangular simples | 6 | — | — | pendente |
| R15.03 | Entregar gerador: caixa com tampa separada | 6 | — | — | pendente |
| R15.04 | Entregar gerador: envelope | 6 | — | — | pendente |
| R15.05 | Entregar gerador: etiquetas/tags | 6 | — | — | pendente |
| R15.06 | Ferramentas bidimensionais | 6 | — | — | pendente |
| R15.07 | Sem visualização 3D | 6 | — | — | pendente |
| R15.08 | Entrada: medidas em mm | 6 | — | — | pendente |
| R15.09 | Entrada: medidas em cm | 6 | — | — | pendente |
| R15.10 | Entrada: folga | 6 | — | — | pendente |
| R15.11 | Entrada: abas | 6 | — | — | pendente |
| R15.12 | Entrada: tipo de papel | 6 | — | — | pendente |
| R15.13 | Entrada: opções de texto simples | 6 | — | — | pendente |
| R15.14 | Saída: prévia em escala indicada | 6 | — | — | pendente |
| R15.15 | Saída: PDF de impressão | 6 | — | — | pendente |
| R15.16 | Saída: SVG vetorial | 6 | — | — | pendente |
| R15.17 | SVG com linhas de corte distinguíveis | 6 | — | — | pendente |
| R15.18 | SVG com linhas de dobra distinguíveis | 6 | — | — | pendente |
| R15.19 | Linhas distinguíveis também em preto e branco | 6 | — | — | pendente |
| R15.20 | Explicar medidas internas/externas | 6 | — | — | pendente |
| R15.21 | Explicar espessura admitida | 6 | — | — | pendente |
| R15.22 | Impressão em tamanho real | 6 | — | — | pendente |
| R15.23 | Indicação de 100% (escala) | 6 | — | — | pendente |
| R15.24 | Régua/quadrado de calibração | 6 | — | — | pendente |
| R15.25 | Respeitar margens imprimíveis | 6 | — | — | pendente |
| R15.26 | Se molde não couber em A4, oferecer divisão em folhas | 6 | — | — | pendente |
| R15.27 | Com marcas de montagem se dividido | 6 | — | — | pendente |
| R15.28 | Avisar se molde não couber (não reduzir silenciosamente) | 6 | — | — | pendente |
| R15.29 | Manter dimensões declaradas | 6 | — | — | pendente |
| R15.30 | Calcular folga da tampa de modo consistente | 6 | — | — | pendente |
| R15.31 | Validar interseções | 6 | — | — | pendente |
| R15.32 | Validar limites | 6 | — | — | pendente |
| R15.33 | Validar abas | 6 | — | — | pendente |
| R15.34 | Validar dimensões impossíveis (avisar ou bloquear) | 6 | — | — | pendente |
| R15.35 | Não prometer encaixe perfeito sem teste físico | 6 | — | — | pendente |
| R15.36 | Registrar separadamente: validação geométrica | 6 | — | — | pendente |
| R15.37 | Registrar separadamente: renderização | 6 | — | — | pendente |
| R15.38 | Registrar separadamente: montagem em papel | 6 | — | — | pendente |
| R15.39 | Usar formas e ilustrações próprias | 6 | — | — | pendente |
| R15.40 | Ou licenciadas | 6 | — | — | pendente |
| R15.41 | Não importar SVG arbitrário | 6 | — | — | pendente |
| R15.42 | Não importar scripts na primeira versão | 6 | — | — | pendente |
| R15.43 | Não importar URL externa na primeira versão | 6 | — | — | pendente |
| R15.44 | Texto personalizado escapado na exportação | 6 | — | — | pendente |
| R15.45 | Não copiar moldes comerciais | 6 | — | — | pendente |
| R15.46 | Não copiar personagens protegidos | 6 | — | — | pendente |
| R15.47 | Não copiar pacotes de terceiros | 6 | — | — | pendente |
| R15.48 | Não declarar embalagem segura para alimento | 6 | — | — | pendente |
| R15.49 | Não declarar adequada a carga estrutural | 6 | — | — | pendente |
| R15.50 | Usuário escolhe material apropriado | 6 | — | — | pendente |
| R15.51 | Arquivos gerados localmente, sem servidor | 6 | — | — | pendente |

---

## SEÇÕES 16 A 25 — reescritas pelo orquestrador em 15/09/2026

A primeira versão destas seções, produzida pelo assistente de documentação, foi descartada porque continha requisitos inexistentes no prompt mestre. As tabelas abaixo foram reescritas a partir do texto original. Caminhos de implementação relativos a `compartilhado/` quando não indicado.

## SEÇÃO 16 — Cookies e consentimento na primeira visita

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R16.01 | Interface de privacidade no primeiro acesso sem preferência válida | Todos | `scripts/privacidade/configurar-consentimento.js`; `#consentimento` no layout | Navegador: aviso exibido na 1ª visita (confeitaria) | testado |
| R16.02 | Aceitar opcionais, Rejeitar opcionais e Personalizar com acesso igualmente fácil | Todos | `ferramentas/modelo-de-layout.mjs` | Navegador | testado |
| R16.03 | Rejeitar não impede cálculos, impressão, downloads nem conteúdo | Todos | Ferramentas independentes do consentimento | Navegador: cálculo após rejeição | testado |
| R16.04 | Publicidade e medição opcionais desativadas por padrão | Todos | `validar-configuração.js`; nenhuma medição existe | `privacidade-publicidade-e-configuração.test.js` | testado |
| R16.05 | Nenhuma tag de anúncio, analytics, pixel, vídeo ou rastreamento antes da escolha | Todos | `publicidade/pode-carregar-anúncios.js` | Navegador: 0 scripts de anúncio | testado |
| R16.06 | Sem pedidos “sem cookie” de medição antecipada | Todos | Não há medição | Revisão de código | concluído |
| R16.07 | Recursos necessários descritos fielmente | Todos | Diálogo de preferências e política | Revisão | concluído |
| R16.08 | Guardar escolha com versão da política e prazo | Todos | `salvar-consentimento.js` | Teste unitário | testado |
| R16.09 | Não solicitar de novo a cada navegação | Todos | `ler-consentimento.js` | Navegador: Salvos sem aviso após escolha | testado |
| R16.10 | Prazo configurável, sem apresentá-lo como duração legal | Todos | `privacidade.validadeDoConsentimentoEmDias` | Revisão | concluído |
| R16.11 | Reexibir ao expirar, ser apagada ou mudar a finalidade (versão) | Todos | `ler-consentimento.js` | Teste unitário (expiração e versão) | testado |
| R16.12 | “Preferências de privacidade” permanente no rodapé e no menu | Todos | Layout (rodapé e menu Mais) | Revisão | concluído |
| R16.13 | Alterar e revogar tão simples quanto aceitar | Todos | Diálogo de preferências | Navegador: pendente para críticos | concluído |
| R16.14 | Persistência funcional explicada, com exclusão e cópia | Todos | Página Salvos; política | Navegador | testado |
| R16.15 | Rejeitar publicidade não apaga itens salvos | Todos | `revogar-consentimento.js` só grava a escolha | Revisão | concluído |
| R16.16 | Chaves de armazenamento próprias por site | Todos | `data-prefixo` + `criar-armazenamento.js` | Teste unitário de prefixos | testado |
| R16.17 | Documentar que prefixo não isola a mesma origem; preferir origens separadas | Central | `proteções-e-limites-de-segurança.md` | Revisão | concluído |
| R16.18 | Consentimento controla o carregamento, não só esconde o aviso | Todos | `iniciar-aplicação-comum.js` | Navegador | testado |
| R16.19 | Testar contexto novo, aceitação, rejeição, revogação e armazenamento indisponível | Todos | — | Novo e rejeição testados; indisponível em teste unitário; aceitação e revogação no navegador pendentes | em andamento |
| R16.20 | Ao revogar: impedir novos carregamentos, recarregar se preciso, preservar dados | Todos | `configurar-consentimento.js` | Revisão | concluído |
| R16.21 | Explicar que requisições já feitas e cookies de terceiros não são desfeitos | Todos | Política de privacidade | Revisão | concluído |
| R16.22 | CMP certificada com TCF quando houver AdSense nas regiões aplicáveis | Todos | `como-conectar-o-adsense.md` | — | aguarda configuração externa |
| R16.23 | Banner autoral não equivale a CMP certificada | Central | Documentado | Revisão | concluído |
| R16.24 | Fonte única de decisão; local não sobrepõe recusa da CMP | Todos | Consentimento em duas camadas documentado | — | preparado para configuração |
| R16.25 | Não inventar strings ou APIs TCF | Todos | Nenhuma string TCF no código | Revisão | concluído |
| R16.26 | Não inferir localização por idioma | Todos | Não há inferência | Revisão | concluído |
| R16.27 | Se a CMP falhar ou o contexto for incerto, anúncios desativados e ferramentas funcionando | Todos | `consentimentoConfigurado` obrigatório | Teste unitário | preparado para configuração |
| R16.28 | Guia com alcance geográfico e ausência de corrida entre CMP e anúncios | Central | `como-conectar-o-adsense.md` | Revisão | concluído |
| R16.29 | Política coerente: operador, contato, dados locais, logs, fornecedores, escolhas, retenção, canais | Todos | `conteúdo-comum/política-de-privacidade.html` | Revisão | concluído |
| R16.30 | Não afirmar “nenhum dado é enviado” havendo anúncios ou logs | Todos | Política cita logs e publicidade | Revisão | concluído |
| R16.31 | Não prometer conformidade jurídica absoluta | Todos | Política | Revisão | concluído |

## SEÇÃO 17 — Doação voluntária exclusivamente por Pix

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R17.01 | Faixa discreta e dispensável, página Apoiar e destino inferior | Todos | Layout; `apoio/configurar-faixa-de-apoio.js`; `conteúdo-comum/apoiar.html` | Navegador | testado |
| R17.02 | Texto sem culpa, urgência falsa, bloqueio ou pagamento obrigatório | Todos | Textos da faixa e da página | Revisão | concluído |
| R17.03 | Valores rápidos R$ 1, 5, 10, 20, 30, 50 e 100 | Todos | `apoiar.html` | Navegador + teste unitário dos sete valores | testado |
| R17.04 | Valor livre em formato brasileiro | Todos | `apoio/validar-valor-pix.js` | Teste unitário | testado |
| R17.05 | Só gera instrução; nunca débito, recorrência ou abertura automática de app | Todos | Fluxo da página | Revisão | concluído |
| R17.06 | Fluxo valor → revisão → QR e Copia e Cola → copiar, baixar ou fechar | Todos | `apoio/configurar-página-de-apoio.js` | Navegador (cópia isolada) | testado |
| R17.07 | Copia e Cola acessível no celular | Todos | `textarea` + botão Copiar | Revisão | concluído |
| R17.08 | Chave, nome e cidade reais, não inventados; sugerir chave aleatória | Todos | `dados-que-o-proprietário-precisa-preencher.md` | — | aguarda configuração externa |
| R17.09 | Chave pública não tratada como segredo | Central | Documentado | Revisão | concluído |
| R17.10 | BR Code estático gerado localmente, campos, comprimentos e CRC corretos | Todos | `apoio/gerar-payload-pix.js`, `calcular-crc-pix.js`, `montar-campo-emv.js` | CRC 1D3D do exemplo do manual; campos conferidos | testado |
| R17.11 | QR decodificado por ferramenta independente | Todos | — | jsQR em `pix.test.js` | testado |
| R17.12 | Validação, payload, CRC, renderização e cópia em arquivos próprios | Todos | `scripts/apoio/` | Revisão | concluído |
| R17.13 | Centavos inteiros; rejeitar vazio, negativo, zero, expoente e excesso de precisão | Todos | `validar-valor-pix.js` | Teste unitário | testado |
| R17.14 | Limites técnicos explicados no campo | Todos | “De R$ 0,01 a R$ 99.999,99” | Revisão | concluído |
| R17.15 | Valor, QR e texto idênticos; alterar valor invalida o código | Todos | `configurar-página-de-apoio.js` | Navegador | testado |
| R17.16 | Chave e recebedor só da configuração publicada | Todos | `validar-configuração.js` | Teste unitário | testado |
| R17.17 | Sem chave de exemplo em produção; apoio indisponível de forma honesta | Todos | Aviso gerado e formulário desativado | Navegador (confeitaria sem configuração) | testado |
| R17.18 | Prévia local com marcadores não pagáveis | Central | Cópia isolada em scratchpad com a chave do manual | Navegador | concluído |
| R17.19 | Cópia pode falhar: seleção manual e sem “copiado” falso | Todos | `apoio/copiar-texto.js` | Revisão | concluído |
| R17.20 | Sem saldo, comprovante, lista de doadores ou confirmação falsa | Todos | — | Revisão | concluído |
| R17.21 | Não prometer Pix gratuito em qualquer situação | Todos | Aviso de tarifas | Revisão | concluído |
| R17.22 | Nenhuma API de pagamento, checkout ou banco | Todos | — | Revisão | concluído |
| R17.23 | Não misturar apoio com anúncios | Todos | Apoiar com `anúncios: false` | Revisão | concluído |
| R17.24 | Respeitar a dispensa temporária da faixa | Todos | 30 dias | Revisão | concluído |
| R17.25 | Produto escolar: pedido de apoio só ao adulto, nunca na atividade | 2 | — | — | pendente |

## SEÇÃO 18 — Requisitos obrigatórios se houver backend

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R18.01 | Registrar “não aplicável” na arquitetura estática; não simular login, chat ou feedback | Todos | `decisão-sobre-cadastro-e-servidor.md` | Revisão | concluído |
| R18.02 | 18.1 Contas e administração | Todos | — | — | não aplicável (sem backend) |
| R18.03 | 18.2 Chat na tela principal | Todos | — | — | não aplicável (sem backend) |
| R18.04 | 18.3 Feedback flutuante | Todos | — | — | não aplicável (sem backend) |
| R18.05 | 18.4 Operação do servidor | Todos | — | — | não aplicável (sem backend) |

## SEÇÃO 19 — Segurança e proteção contra clonagem

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R19.01 | Análise de ameaças (XSS, backup malicioso, troca de chave Pix, SVG/PDF, URLs, dependências, anúncios) | Central | `proteções-e-limites-de-segurança.md` | Revisão | concluído |
| R19.02 | Validar tipo, faixa, tamanho e unidade; sem NaN, Infinity ou divisão por zero | Todos | `validação/*`, `matemática/*` | Testes unitários | testado (comum) |
| R19.03 | Texto por APIs seguras; sem `innerHTML` com entrada do usuário | Todos | `interface/criar-elemento.js`; verificador | `npm run verificar` | testado |
| R19.04 | Escape em SVG, PDF, CSV e cópia; CSV sem execução de fórmulas | Todos | `escapar-xml.js`, `escapar-csv.js`, PDF, planilha | Testes unitários | testado |
| R19.05 | Importação com esquema versionado, limite de tamanho e profundidade; sem `eval`; sem poluição de protótipo; sem misturar com configuração | Todos | `armazenamento/importar-cópia-local.js` | Teste unitário malicioso | testado |
| R19.06 | Links externos validados, protocolos permitidos | Todos | `validar-url-externa.js` | Teste unitário | testado |
| R19.07 | Nenhum segredo em JavaScript, JSON, mapa de código, log ou pacote | Todos | Configuração só pública; construtor recusa arquivos indevidos | `construir.mjs` | concluído |
| R19.08 | Dependências mínimas, versões fixadas, licenças registradas | Central | `package.json`, `licenças-de-terceiros.md` | `npm install`: 0 vulnerabilidades | concluído |
| R19.09 | HTTPS e cabeçalhos (enquadramento, tipos, referência); HSTS só após verificar | Todos | `.htaccess` gerado; `hospedagem/nginx-exemplo.conf` | Revisão | preparado para configuração |
| R19.10 | Configuração de hospedagem aplicável; `meta` não substitui `frame-ancestors` | Todos | Cabeçalhos HTTP, sem CSP em `meta` | Revisão | concluído |
| R19.11 | Perfis CSP sem e com publicidade; nonce imprevisível por resposta | Todos | Perfil sem anúncios aplicado; perfil com anúncios documentado | — | preparado para configuração |
| R19.12 | Não inventar CSP que bloqueie AdSense nem remover proteções; modo relatório | Central | `proteções-e-limites-de-segurança.md` | Revisão | concluído |
| R19.13 | Anticlonagem realista: autoria, licença, metadados, versão e hashes | Todos | `LICENÇA.txt`, `meta author`, `manifesto-de-integridade.json` | `construir.mjs` | concluído |
| R19.14 | Não bloquear botão direito, seleção, atalhos ou acessibilidade; sem autodestruição ou redirecionamento | Todos | Nada disso implementado | Revisão | concluído |
| R19.15 | Lógica secreta só com servidor; não criar backend para esconder fórmulas | Todos | Fórmulas públicas | Revisão | concluído |

## SEÇÃO 20 — AdSense pronto para conexão pelo proprietário

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R20.01 | Espaços e carregador reais, desativados sem configuração, consentimento ou aprovação | Todos | `publicidade/*`, `.espaço-publicitário` | Teste unitário + navegador | testado |
| R20.02 | Sem identificador fictício em código ativo | Todos | Configuração vazia | Revisão | concluído |
| R20.03 | Configuração pública por produto: ativa, publicador, blocos, consentimento, domínio, posições | Todos | `configuração-pública.json` | Teste unitário | concluído |
| R20.04 | Blocos discretos, responsivos, rotulados “Publicidade”, com reserva de espaço | Todos | `componentes/espaço-publicitário.css` | Revisão | concluído |
| R20.05 | Nunca junto de copiar Pix, baixar, gerar, menu inferior ou confirmação; nunca no impresso | Todos | Guia do executor; Apoiar sem anúncios; CSS de impressão | Revisão pelos críticos | em andamento |
| R20.06 | Sem pedir clique, disfarçar ou recarregar anúncio a cada cálculo | Todos | Inicialização única | Revisão | concluído |
| R20.07 | Script uma vez por contexto; blocos sem duplicação | Todos | `carregar-anúncios.js` | Revisão | concluído |
| R20.08 | Bloqueador, recusa, falta de inventário e falha de rede sem quebrar a página | Todos | Recolhimento dos espaços | Revisão | preparado para configuração |
| R20.09 | Testes não clicam em anúncios reais nem geram tráfego | Todos | Nenhum anúncio real carregado | — | concluído |
| R20.10 | Guia `como-conectar-o-adsense.md` por produto e consolidado, com os 9 assuntos | Central | Consolidado escrito; cópias por produto pendentes | Revisão | em andamento |
| R20.11 | Não garantir aprovação, receita, RPM ou prazo; conteúdo original útil | Todos | Guia e textos | Revisão | concluído |

## SEÇÃO 21 — Configuração pendente sem impedir o desenvolvimento

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R21.01 | Documento com campo, finalidade, arquivo e efeito quando ausente | Central | `dados-que-o-proprietário-precisa-preencher.md` | Revisão | concluído |
| R21.02 | Campos públicos listados; nenhum segredo em arquivo público | Todos | Configuração pública | Revisão | concluído |
| R21.03 | Campos privados só se houver servidor | Todos | Não há | — | não aplicável (sem backend) |
| R21.04 | Validar esquema e dependências (sem anúncio com id vazio, sem Pix sem recebedor) | Todos | `validar-configuração.js` | Teste unitário | testado |
| R21.05 | Fluxo testado com dados não pagáveis; conexão real pendente | Todos | Cópia isolada + testes | Navegador | testado |

## SEÇÃO 22 — Conteúdo, descoberta e publicação independente

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R22.01 | Início, catálogo, ferramentas, metodologia, exemplos, sobre, contato, privacidade, termos e 404 | Todos | Modelos comuns + páginas dos executores | `gerar-páginas.mjs` exige as obrigatórias | em andamento |
| R22.02 | Textos próprios, sem prometer resultados não demonstrados | Todos | — | Revisão pelos críticos | em andamento |
| R22.03 | Títulos e descrições únicos; hierarquia semântica; links internos válidos | Todos | Gerador e verificador | `npm run verificar` | testado (confeitaria) |
| R22.04 | Canonical com domínio real; sitemap e robots coerentes | Todos | Gerador (canonical e sitemap só com endereço base) | Revisão | preparado para configuração |
| R22.05 | Não indexar resultados pessoais, prévias, testes ou parâmetros infinitos | Todos | `noindex` em Salvos, 404 e orçamento compartilhado | Revisão | concluído |
| R22.06 | Sem avaliações estruturadas ou números de usuários inventados | Todos | — | Revisão | concluído |
| R22.07 | Premissas, unidade, arredondamento e limites perto do resultado | Todos | `.premissas` | Revisão | em andamento |
| R22.08 | Testes de fórmula independentes da exibição | Todos | Funções puras em `scripts/cálculos/` | `npm run testar` | em andamento |
| R22.09 | Portas locais distintas (4311–4316) em 127.0.0.1 | Todos | `servir.mjs`, `package.json` | Servidor testado | testado |
| R22.10 | Pacote publicável próprio, raiz ou subpasta, sem banco, segredos, `.git`, dependências ou testes | Todos | `construir.mjs` | Execução por produto pendente | em andamento |
| R22.11 | Não assumir mesmo tratamento de maiúsculas/Unicode em Windows e Linux | Central | NFC verificado; `convenções-e-exceções-técnicas.md` | `npm run verificar` | concluído |

## SEÇÃO 23 — Plano de execução e continuidade

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R23.01 | Fase A: inventário, modelos e ferramentas, arquitetura, contrato, matriz | Central | `estado-da-execução.md`, `arquitetura-e-contratos.md`, esta matriz | — | concluído |
| R23.02 | Fase B: base comum integrada primeiro numa fatia real da confeitaria | Central | `compartilhado/` + preço de venda | Navegador | concluído |
| R23.03 | Fase C: seis produtos em ondas, propriedade de arquivos definida | Todos | `guia-do-executor.md`; onda 1 em andamento | — | em andamento |
| R23.04 | Fase D: integração dos seis pacotes | Todos | — | — | pendente |
| R23.05 | Fase E: dois críticos independentes com pareceres separados | Central | — | — | pendente |
| R23.06 | Fase F: correção, reteste e aceite assinado | Central | — | — | pendente |
| R23.07 | Estado persistido em `estado-da-execução.md` | Central | Atualizado a cada etapa | — | em andamento |

## SEÇÃO 24 — Critérios de teste e aceite

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R24.01 | Funcionalidade: entradas normais, inválidas e extremas; exemplos conferidos | Todos | Testes por produto | — | em andamento |
| R24.02 | Modularidade e idioma verificados | Todos | Verificador | — | em andamento |
| R24.03 | Celular: navegação inferior, ativo, toque, paisagem, teclado, safe area, sem sobreposição | Todos | CSS comum | Navegador (confeitaria 390×844) | em andamento |
| R24.04 | Computador: navegação, formulários, teclado, foco, larguras | Todos | CSS comum | Navegador parcial | em andamento |
| R24.05 | Consentimento: sem opcionais antes; aceitar, rejeitar, personalizar, persistir, revogar | Todos | — | Parcial | em andamento |
| R24.06 | Pix: valores, centavos, QR decodificado, CRC, recebedor, cópia, alteração, sem falsa confirmação | Todos | — | Unitário + navegador | testado |
| R24.07 | Anúncios: desativado seguro, inicialização única, posição, bloqueador, rede, guias | Todos | — | Parcial | em andamento |
| R24.08 | Armazenamento: salvar, editar, excluir, exportar, importar, backup malicioso, separação | Todos | — | Unitário + navegador | testado (comum) |
| R24.09 | Impressão sem navegação, anúncios, apoio ou gabarito misturado | Todos | `impressão.css` | — | pendente |
| R24.10 | Segurança: HTML/script/URLs perigosas, dependências, segredos, HTTP | Todos | — | Parcial | em andamento |
| R24.11 | Desempenho medido no pacote real em condições registradas | Todos | — | — | pendente |
| R24.12 | Seis pacotes, documentação, dois pareceres e validação final | Central | — | — | pendente |
| R24.13 | Chromium e, quando houver, Firefox e WebKit; distinguir emulador, aparelho físico, banco real e AdSense aprovado | Central | Somente Chromium do painel disponível | — | em andamento |

## SEÇÃO 25 — Entregáveis e relatório final

| ID | Requisito | Produtos | Implementação | Teste/evidência | Situação |
|---|---|---|---|---|---|
| R25.01 | Seis projetos completos com código modular e pacote independente | Todos | — | — | em andamento |
| R25.02 | Documentação de cada produto (executar, testar, compilar, publicar, identidade, Pix, AdSense, privacidade) | Todos | — | — | pendente |
| R25.03 | `matriz-de-requisitos.md` | Central | Este arquivo | — | em andamento |
| R25.04 | `arquitetura-e-contratos.md` e `decisão-sobre-cadastro-e-servidor.md` | Central | Escritos | — | concluído |
| R25.05 | `convenções-e-exceções-técnicas.md` e `licenças-de-terceiros.md` | Central | Escritos | — | concluído |
| R25.06 | `proteções-e-limites-de-segurança.md` | Central | Escrito | — | concluído |
| R25.07 | `dados-que-o-proprietário-precisa-preencher.md` | Central | Escrito | — | concluído |
| R25.08 | `estado-da-execução.md` e `histórico-de-versões.md` | Central | Estado escrito; histórico pendente | — | em andamento |
| R25.09 | Dois pareceres críticos | Central | — | — | pendente |
| R25.10 | `relatório-final-do-orquestrador.md` com testes, capturas, riscos e pendências | Central | — | — | pendente |
| R25.11 | Commits só com autorização; sem push implícito | Central | Nenhum commit feito até aqui | — | concluído |
| R25.12 | Resposta final curta: implementado, testado, onde está, o que falta | Central | — | — | pendente |

## TOTALIZADOR FINAL

| Status | Contagem | Observações |
|---|---|---|
| **pendente** | 1.178 | Aguardando implementação (maioria das seções 1-4, 6-17, 19, 22-24) |
| **em andamento** | 0 | (a ser preenchido durante execução) |
| **concluído** | 40 | Seção 05 (arquitetura/cadastro) |
| **testado** | 0 | (a ser preenchido após testes) |
| **preparado para configuração** | 122 | Seções 20-21 (AdSense e configuração pendente) |
| **aguarda configuração externa** | — | (repositório de proprietário, adm, e-mail) |
| **não aplicável** | 150 | Seção 18 (150 requisitos backend — sem backend em sites estáticos) |
| **preparado para documentação** | 64 | Seção 25 (entregáveis e relatório pós-implementação) |
| **TOTAL REQUISITOS** | **1.654** | Versão 1.0.1 — 15/09/2026 — Seções 1-25 completas (todas tabelas detalhadas) |

---

## Observações para Próximas Fases

1. **Este documento será expandido** com tabelas completas das seções 11-25 conforme cada fase de execução avançar.

2. **Referência de ambiguidade do prompt**: 
   - Seção 10 (confeitaria): "Caso de conferência" usa R$ 80 e margem 30%, resultando em R$ 114,2857 como "preço matemático". O texto é claro, mas a implementação precisa validar se essa fórmula exata é o cálculo esperado.
   - Seção 23 (plano): Define "duas críticas reais" como instâncias distintas que não devem ler a opinião uma da outra antes de sua análise. Será implementado com cópias/snapshots do código.

3. **Estado da Execução**: Ler `documentação/estado-da-execução.md` para saber o progresso real antes de retomar qualquer fase.

---

**Próximo passo:** Orquestrador lê este arquivo, valida a cobertura de requisitos, e inicia Fase A (inventário e contrato) com os agentes designados.


