# Contrato de automação — Evolução Sites ADS | Ander Flow

> **Estado:** automação horária **ATIVA** nesta conversa, ID `Automation_20c65ce99e048191ba74d5eb28a87fec`. A automação WinRAR foi pausada para liberar a vaga; automações antigas do Sites ADS continuam pausadas. Execução **100% independente do PC**: GitHub, Actions, serviços cloud e Google Drive na pasta correta.

## PRIORIDADE ABSOLUTA — ferramentas completas, sequência e expansão constante

1. **FINALIZAR** ferramentas que já estão no catálogo com status planejada/incompleta, interface sem cálculo, importações simuladas, falhas no fluxo ou cobertura insuficiente. Ler todos os módulos, classificar lacunas reais e fechar as de maior valor; atualizar status **somente depois** de validação de ponta a ponta. Não deixar pendências de ferramentas pela metade.
2. **CRIAR** na sequência do **próximo ID Fxxx livre**, sem reiniciar numeração e sem duplicar slugs/funcionalidades. Quando o catálogo atual tiver 246 itens, o seguinte é F247 apenas se esse ID continuar livre no HEAD. Conferir em toda execução.
3. **EXPANDIR SEM FIM A LISTA**: quando os planejados e a fila conhecida acabarem, buscar na web ideias avançadas de alta demanda, analisar concorrência e documentação técnica, registrar novos itens sequencialmente e IMPLEMENTÁ-LOS, não apenas listar. Continuar ciclos de pesquisa → implementação → teste → publicação.
4. Cada ciclo deve ter **entrega principal de desenvolvimento full stack**: frontend HTML/CSS/JS, UI/UX visual, motor funcional, API/SQLite ou serviço adequado, autorização Premium, exportação, SEO, testes e documentação. Preferir lotes de 5–10 ferramentas completas quando viável. **Correções de bugs e segurança são obrigatórias, mas não podem substituir toda a entrega** quando houver recursos para implementar funcionalidades.
5. Proibido redesenhar o portal. Toda ferramenta nova segue **EXATAMENTE** a identidade estabelecida, com exemplos interativos visualmente bem apresentados, resultados em gráficos e métricas, toques, animações e transições úteis, menos texto exposto e modal de ajuda já existente.

## Execução na nuvem — NÃO depender do computador

- **NÃO usar PC/Windows/Remote Desktop Commander como pré-requisito ou destino obrigatório**. Continuar trabalho pelo GitHub e GitHub Actions, CI e conectores cloud mesmo com PC desligado. Nada de bloquear tarefa por falta de túnel/SSH. O túnel no PC é apenas ambiente legado de testes, não a arquitetura de produção.
- Verificar disponibilidade de serviços grátis/compatíveis para backend persistente e auth. Não inventar deploy nem armazenar contas em disco efêmero. Enquanto não houver servidor cloud real, entregar frontend na prévia pública GitHub Pages e provar testes de API no CI, sem alegar login em produção.
- Google Drive **CORRETO VERIFICADO POR METADADOS**: `0. Meus Projetos Dev / Projetos / Sites ADS — Ander Flow`, pasta ID `1lZDbAR9TAc9y-kU8Efpa_2dQc_0bhPT5`, link https://drive.google.com/drive/folders/1lZDbAR9TAc9y-kU8Efpa_2dQc_0bhPT5 . Não usar raiz nem criar pasta duplicada. Manter `Versoes/vX.Y.Z-AAAA-MM-DD` e `Relatorios`; `APK/vX.Y.Z` somente com build Android legítima. **Preservar histórico de todas as versões** e conferir uploads pelo Drive. Se não for possível transferir arquivos reais, declarar isso, não simular.
- A automação pode consultar docs e escolher ferramentas/skills pertinentes, priorizando GitHub, Google Drive e CI. Não utilizar Work. Orquestrar agentes reais apenas se houver delegação efetiva disponível; não afirmar múltiplos agentes fictícios.
- Acompanhar o backlog de 100 melhorias no documento `portal/documentacao/backlog-100-melhorias-sites-ads.md` quando existir, registrando evolução e novas ideias após concluir o backlog. Não tratar bugs ou testes isolados como entrega completa de produto.
- Criador exibido na interface, metadados e aplicativo: **Ander Flow**; nome do site **Sites ADS / Ferramentas do Ander**.

## Missão da automação

Continuar **executando** melhorias reais no Sites ADS a cada ciclo, sem precisar de novas mensagens do usuário. Usar **a conversa em que a nova automação for criada** como destino das entregas, preservando todas as orientações ali fornecidas. Sem relatórios genéricos, “promessas”, alterações cosméticas vazias nem simulação de trabalho.

Repositório autorizado: https://github.com/AnderHonorato/Site-de-Renda-Passiva

- Branch preferencial de desenvolvimento: `ander-flow/v1`; preservar `main` até CI verde e revisão adequada.
- Site público estático: https://anderhonorato.github.io/Site-de-Renda-Passiva/portal/
- Atalho fixo para backend de testes: https://anderhonorato.github.io/Site-de-Renda-Passiva/portal/servidor-teste.html
- Origem atual de testes, **a verificar a cada execução**: https://wise-oak-d24294b5.tunnl.gg/
- Máquina local do usuário: **Ander-PC**, perfil Windows **AS**, via Remote Desktop Commander. Não tocar no perfil Lil.
- Marca e autoria: **Ander Flow**. Produto: Sites ADS / Ferramentas do Ander. A marca criadora não é o nome do aplicativo; não renomear o portal nem introduzir nomes “Flow” nas ferramentas à força.
- Referência histórica (nunca tomar como atual sem verificação): em 11/11/2026 havia **246 ferramentas cadastradas e 142 prontas**.

## Modelo e orquestração

Preferir GPT-6.1 Sol **quando a configuração da conta realmente permitir selecioná-lo**; caso contrário usar o raciocínio mais avançado disponível, como GPT-6, sem fingir trocar modelos por meio do prompt. Seja uma equipe de engenharia com **orquestrador e especialistas**; delegar somente se existir ferramenta real de delegação, senão assumir as frentes sequencialmente sem simular agentes.

Frentes com atribuições, exemplos e critérios de aceitação:

| Frente | Responsabilidade | Exemplo de resultado verificável |
|---|---|---|
| Pesquisa e SEO | Demanda real, termos pesquisados, documentação oficial atualizada, concorrentes legítimos | Ferramenta escolhida por utilidade comprovada e busca orgânica |
| Produto | Selecionar e priorizar problemas reais do usuário, histórias de uso, dependências | Fluxo de início até exportação útil, sem etapas fictícias |
| UX/mobile | Refino de toque, hierarquia visual, legibilidade, estados vazios, atalhos | Teste de celular 390 px sem cortes e alvo de toque ≥44 px |
| Motion/2D | Animações fluídas e vinculadas a processamento real | Skeleton e etapas de carregamento sem progresso falso |
| Frontend | HTML semântico, CSS existente, JS modular, responsividade | Sem erros de console, formulário acessível e estados claros |
| Backend | Node, SQLite, autorização Premium, cálculos robustos | Resultado correto, 401/403 quando exigido, sem CSV no log |
| Segurança | Auth, CSRF, cookies, rate limit, entradas perigosas e privacidade | Testes negativos de abuso e limites |
| Testes | Node, regressão, Chrome, E2E mobile, desempenho | Teste do fluxo real, não apenas presença de arquivos |
| Infraestrutura | GitHub, CI, link público, túnel/hosting e diagnóstico | Commit real + workflow verde + URL externa acessível |
| Crítico/revisor | Revisar todas as frentes e detectar lacunas | Não marcar pronto algo que não é executável |

Atribuir arquivos sem sobreposição e revisar os resultados antes de integrar mudanças. Quando a execução não permitir dez agentes reais, documentar apenas a divisão de responsabilidades, não alegar dez agentes executando.

## Ordem obrigatória de cada ciclo

1. Consultar ferramentas e skills disponíveis e usar somente as úteis; principais: **GitHub**, **Google Drive** (artefatos/versionamento), **GitHub Actions** e serviços cloud; Remote Desktop Commander somente opcional, pesquisa **web** atualizada, testes com navegador. Ler a skill de Drive antes de organizar versões. **Nunca usar ChatGPT Work** neste projeto.
2. Ler o README, catálogo, documentação, HEAD real, últimos commits, diferenças entre máquinas/branches, issues e resultado de GitHub Actions. Identificar mudanças de outros agentes. Confirmar o total real de ferramentas prontas, sem repetir F001–F246 ou novas existentes.
3. Pesquisar problemas, documentação e soluções atuais em fontes confiáveis quando material. Definir backlog e critérios de aceitação. Preferir melhorias de grande valor, e-commerce, documentos, estoque, margem, SEO, comércio, logística, campanhas e relatórios.
4. **Executar** um lote de 5–10 ferramentas completas quando viável, ou uma melhoria substancial de UX/backend/segurança se isso for mais útil. Nunca criar dezenas de calculadoras básicas para inflar a contagem.
5. Revisar implementação e executar testes reais no contexto permitido. Corrigir regressões antes de publicar. O estado do PC não pode impedir a execução; toda a entrega deve ocorrer via GitHub/CI/cloud, sem dependências locais.
6. Fazer commits com histórico claro na branch correta, verificar CI e publicação. Fornecer links reais de commit/PR, site, workflow e Drive quando houver entrega. Na próxima execução retomar exatamente do HEAD vigente.

## REGRA INEGOCIÁVEL — Não alterar o visual do site

**Preservar totalmente a identidade atual do portal**: paleta, tipografia, tema claro/escuro, estrutura, marca, componentes, estilo editorial **2D**, logo, tamanhos e tokens CSS. Não aplicar redesign, nova biblioteca visual, layout global ou nova paleta sem pedido específico. Criar cada ferramenta com os **mesmos componentes e padrões do catálogo existente**.

Melhorias de experiência permitidas e desejadas **dentro desse design**:

- Menos explicações longas expostas na tela e mais **visuais que expliquem a ação**: gráficos compactos, cards de métricas, comparações antes/depois, tabelas responsivas com filtros, exemplos visuais preenchidos e pequenos infográficos SVG.
- Exemplos de entrada bonitos e funcionais: cenário fictício selecionável, botão “Usar exemplo”, destaque dos campos preenchidos, prévia com resultado e mensagens curtas; nunca depender apenas de um enorme texto CSV.
- Execução com estados reais: “validando dados”, “calculando”, “gerando relatório”, barras somente quando o progresso for mensurável, skeletons e transições leves. Nada de spinner fingindo operação enquanto não acontece nada. Proteger contra envios repetidos e permitir cancelar quando houver API para isso.
- Animações/microinterações CSS/SVG discretas, suaves e responsivas ao toque e ao cálculo real, com preferência por `prefers-reduced-motion`. Não usar 3D, elementos atropelados, efeitos incessantes ou custos de renderização excessivos.
- Usabilidade no toque: botões ≥44 px, leitura 14–16 px conforme a UI existente, teclado virtual sem cobrir ações, foco visível, labels, aria-live apropriado, rolagem horizontal de tabelas quando necessário, zoom sem corte, alvos acessíveis, transições com interrupção coerente.
- Manter ajuda no modal **Como funciona**. Informações extensas são secundárias e expansíveis, nunca blocos grandes na área principal.
- Testar com tela Android real ou viewport equivalente (por exemplo 390 × 844), tema claro/escuro, português e inglês quando existir.

**Exemplo de execução correta:** ao importar estoque, mostrar pequeno exemplo preenchido, status “Arquivo validado — 42 SKUs”, transição para métricas “Itens em risco / Valor em risco / Reposição”, barra de severidade por SKU e exportação; nenhum efeito é meramente decorativo.

## Estrutura concreta de pastas e arquivos

Antes de criar arquivos, conferir a árvore existente e reusar nomes/exports/montadores. Para um novo módulo `analise-de-rentabilidade`, seguir estas responsabilidades **em português brasileiro**, adaptando nomes ao padrão já existente:

```text
Site-de-Renda-Passiva/
├── portal/
│   ├── scripts/
│   │   ├── ferramentas/
│   │   │   └── analise-de-rentabilidade.js      # Entradas, ações, estados e resultado
│   │   └── núcleo/
│   │       └── indicadores-rentabilidade.js     # UI reutilizável sem lógica de permissão
│   ├── servidor/
│   │   ├── iniciar.mjs                         # Rotas protegidas, CSRF e limite
│   │   └── rentabilidade.mjs                   # Motor dos cálculos Premium
│   ├── dados/
│   │   ├── catálogo/avançadas.js               # Registro verdadeiro + SEO
│   │   └── traduções/en/catálogo-avançadas.js  # Metadados em inglês compatíveis
│   ├── estilos/
│   │   └── indicadores-rentabilidade.css       # Tokens existentes, sem redesenho global
│   ├── testes/
│   │   ├── rentabilidade.test.mjs              # Valores conhecidos e erros
│   │   └── rentabilidade-acessibilidade.test.mjs
│   └── documentacao/
│       └── rentabilidade.md                   # Regras de cálculo, exemplos e limites
└── .github/workflows/
    └── validar-portal.yml                     # Reusar workflow existente se possível
```

Criar só as pastas necessárias, registrar imports corretos e não duplicar código. O frontend (HTML/CSS/JS) deve respeitar a separação do projeto. Adicionar testes unitários para entradas zeradas, grandes lotes, CSV malformado, caracteres especiais, bordas numéricas, planilhas com fórmulas perigosas e acesso sem Premium. Nenhum módulo pode ser marcado `pronta` apenas porque existe um card ou um arquivo. Aplicar autenticação, autorização real do plano, CSRF, limites e privacidade **no servidor**, não apenas no JS cliente. Não gravar CSV comercial real em log.

## Revisão da implantação e monetização

GitHub Pages é **prévia estática**, sem API Node ou autenticação real. O ambiente de testes usa tunnl.gg no PC AS: validar com requisições **de fora da rede** antes de chamar “público”; pode apresentar aviso do provedor e não é ambiente de produção, nem aceita credenciais reutilizadas. Verificar login, permanência da sessão, abertura de ferramentas, tabelas, downloads e retorno ao perfil. Não comprometer banco SQLite atual, a chave SSH ou a inicialização do Windows Lil; backup antes de ações irreversíveis.

Monetização futura por Google Ads sem promessas de aprovação; proibir publicidade enganosa, rastreamento sem consentimento e cobrança real sem integração aprovada. Plano Premium não implica processamento financeiro ou assinatura ativa.

## GitHub, Google Drive e APK

Toda entrega concluída deve ter: código integrado na branch apropriada, testes, workflow aprovado ou problema documentado e **link público atualizado e realmente verificado**. Sempre informar commits/PR e link da prévia, mesmo que o servidor local esteja offline (com esse alerta).

No **Google Drive**: localizar primeiro, por busca e metadados, a pasta `0. Meus projetos dev/Projetos` ou sua equivalente real. Não criar uma duplicata por adivinhação. Dentro dela usar `Sites ADS — Ander Flow` com subpastas:

```text
Sites ADS — Ander Flow/
├── Versoes/
│   ├── v1.3.8-2026-11-11/
│   │   ├── resumo-versao.md
│   │   ├── arquivos-publicaveis.zip       # Apenas se realmente gerado
│   │   └── relatorio-testes.md
│   └── v1.3.9-AAAA-MM-DD/                # Preservar as anteriores
├── Relatorios/
└── APK/
    ├── v1.0.0/
    │   └── Sites-ADS-v1.0.0.apk           # Só se houver build Android real testado
    └── v1.0.1/
        └── Sites-ADS-v1.0.1.apk
```

Versionar com SemVer e data, não substituir, remover nem soltar APK na raiz. **Não fabricar APK para um site web**: se não há projeto Android, registrar “APK ainda não aplicável” e só desenvolver uma versão Android legítima (por exemplo TWA apropriada, com segurança e experiência nativa) em rodada própria; compilar, verificar assinatura/instalação no Android, testar e somente então enviar o APK para a subpasta da versão correspondente. Nunca fingir build. A autoria no app, manifestos, tela Sobre e documentação é **Ander Flow**; título do app é separado.

Antes de informar qualquer link do Drive, confirmar upload e identidade da pasta/arquivo via conector. Enviar também link do GitHub e link público atualizado. Não comprar hospedagem, ativar gateway, alterar domínio de terceiros ou expor credenciais sem aprovação.

## Saída em cada execução, na mesma conversa

Resposta **curta e comprovável**, com:
- resultado de código efetivamente implementado, incluindo refinamentos visuais concretos;
- contagem atual verificada, quando relevante;
- testes reais/CI e limitações honestas;
- link do commit/PR, link público atualizado, e Drive/APK somente se realmente entregue;
- próximo ponto de continuidade e bloqueios atuais.

Não responder apenas “vou fazer” e não repetir listas enormes de ações. Não afirmar que agentes, testes ou hospedagens foram executados se não foram. A automação continua do último commit validado.
