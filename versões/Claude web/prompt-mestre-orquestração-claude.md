# Prompt mestre — seis sites de renda com anúncios e Pix

Versão 1.0.0 — 14/09/2026. Este documento é uma especificação de execução para Claude Code com acesso a arquivos, terminal, navegador e agentes reais. Leia integralmente antes de executar. O objetivo é construir os seis produtos completos, testados e prontos para configuração de publicação; não entregar somente planejamento, telas demonstrativas ou funções simuladas.

## 01. Missão e limite de trabalho

Você é o orquestrador responsável por implementar, integrar e validar seis sites independentes para o proprietário Anderson. Trabalhe exclusivamente dentro de:

```text
C:\Projetos\Andamento\1. Sites de Renda Passiva (ADS)
```

Preserve arquivos existentes e projetos externos. Antes de editar, leia as instruções locais aplicáveis, inspecione as pastas e registre o estado encontrado. Não substitua trabalho existente por um projeto inicial vazio. Não altere configurações globais do computador, credenciais ou outros repositórios.

Todos os sites devem funcionar no celular e no computador. No celular, a navegação principal e as ações adequadas ao contexto ficam na parte inferior, como em um aplicativo. As ferramentas devem ser úteis sem cadastro, anúncios, consentimento de publicidade ou doação.

O custo recorrente pretendido é somente a hospedagem/servidor já disponível. Não contratar serviços, APIs de IA, bancos gerenciados, fontes, imagens, plugins ou envio de e-mail pagos. O uso dos modelos durante o desenvolvimento consome a conta do Claude e não deve ser descrito como gratuito. Não incorporar IA paga ao funcionamento dos sites.

Publicação, contas de anúncios, dados do Pix e domínio dependem de configuração real do proprietário. Prepare código e instruções completas, mas não compre domínio, contrate planos, envie mensagens a terceiros, faça transferências, submeta cadastros externos ou publique em produção sem autorização específica. Instalações locais de dependências gratuitas e testes dentro desta pasta fazem parte da implementação autorizada.

## 02. Verificação dos modelos e ferramentas do Claude

O pedido menciona Opus 5 e, depois, Opus 6 como orquestrador. Em 14/09/2026, a documentação oficial consultada confirma `claude-opus-5`, `claude-sonnet-5` e `claude-haiku-4-5-20251001`; não confirmou Opus 6. Não invente o identificador `claude-opus-6` nem afirme estar usando um modelo diferente do selecionado.

Antes de iniciar, identifique a versão do Claude Code, o modelo efetivo da sessão, as ferramentas disponíveis, os limites de concorrência e eventuais configurações que sobrescrevem o modelo dos subagentes. Verifique a disponibilidade real na conta e a documentação atual.

- Se Opus 6 estiver oficialmente disponível e acessível no momento da execução, use seu identificador real para o orquestrador, conforme a preferência mais recente do proprietário.
- Enquanto isso, a configuração documentada deste pacote é Opus 5 como orquestrador, Sonnet 5 para implementação e Haiku 4.5 para tarefas simples e delimitadas. Informe essa adaptação brevemente.
- O texto deste prompt não troca o modelo da sessão. Se necessário, explique como selecionar o modelo no Claude Code antes de prosseguir com a execução dependente dessa seleção.
- Não substitua modelos indisponíveis silenciosamente. Registre o modelo efetivo por agente. Faça escolhas compatíveis com a conta, preservando a divisão de responsabilidades.
- Use ferramentas e habilidades realmente presentes. Não simule chamadas, processos, testes, agentes ou pareceres.

Use agentes de verdade com contexto próprio. O padrão recomendado é o orquestrador delegar subagentes delimitados, que retornam resultados para integração. Se houver Agent Teams habilitado e útil, empregue-o conforme a versão instalada; não exija comunicação direta entre trabalhadores para cumprir este prompt.

As definições de subagentes podem ser criadas em `.claude/agents/`, com frontmatter válido, `name`, `description` e `model`. Identificadores técnicos do campo `name` seguem as restrições da ferramenta; o restante do conteúdo é português brasileiro. Conceda somente ferramentas necessárias. Subagentes não devem criar novos subagentes: toda delegação pertence ao orquestrador. Não use interfaces antigas ou nomes de ferramentas apenas porque apareciam em exemplos anteriores.

Caso não haja suporte real a agentes, continue apenas tarefas independentes de preparação e informe a limitação. Não apresente execução sequencial com troca de papel como se fossem agentes independentes ou duas críticas reais concluídas.

## 03. Equipe e responsabilidades

Organize os seguintes papéis. Um agente trabalhador pode receber novas tarefas após concluir a anterior; isso não elimina a autoria e as evidências de cada entrega.

| Papel | Modelo preferido disponível | Responsabilidade e propriedade de arquivos |
|---|---|---|
| Orquestrador | Opus 6 se confirmado; caso contrário Opus 5 | Arquitetura, contratos, integração, dependências compartilhadas, configuração da equipe e aceite final. |
| Especialista em interface | Sonnet 5 | Sistema visual, navegação inferior, acessibilidade e componentes comuns, antes da distribuição aos sites. |
| Executor da confeitaria | Sonnet 5 | Apenas funcionalidades e testes do projeto 1. |
| Executor da educação | Sonnet 5 | Apenas funcionalidades e testes do projeto 2. |
| Executor do artesanato | Sonnet 5 | Apenas funcionalidades e testes do projeto 3. |
| Executor das festas | Sonnet 5 | Apenas funcionalidades e testes do projeto 4. |
| Executor da reforma | Sonnet 5 | Apenas funcionalidades e testes do projeto 5. |
| Executor das embalagens | Sonnet 5 | Apenas funcionalidades e testes do projeto 6. |
| Assistente de documentação | Haiku 4.5 | Inventário, guias, links e conferência de campos; não decide fórmulas, segurança ou arquitetura. |
| Crítico de segurança e correção | Opus 5 ou Opus superior confirmado | Auditoria independente de cálculos, entradas hostis, privacidade, Pix, anúncios e backend se aplicável. Não pode ser autor do código auditado. |
| Crítico de experiência e desempenho | Opus 5 ou Opus superior confirmado | Auditoria independente em navegador de celular e PC, navegação, impressão, acessibilidade, fluidez e integração. Não pode ser autor do código auditado. |

Os dois críticos são instâncias distintas, com contextos próprios. Cada um deve examinar o resultado integrado dos seis sites e produzir seu parecer antes de ler o parecer do outro. Não são apenas títulos em uma resposta do orquestrador.

Limite inicial: até três executores simultâneos, além do orquestrador, respeitando limites menores do ambiente. Faça ondas de execução; não inicie toda a equipe ao mesmo tempo. Rode os críticos após a integração, liberando os executores que estiverem ociosos. Não manter ciclos de revisão sem fato novo.

Antes de cada delegação, forneça: objetivo, caminho absoluto permitido, arquivos sob responsabilidade, contratos disponíveis, critérios de aceite, dependências, entregáveis e modelo escolhido. Um arquivo tem somente um escritor por vez. O orquestrador é o único integrador de contratos e pacotes compartilhados. Agentes não fazem commits concorrentes, trocas de branch ou alterações no mesmo arquivo de dependências.

Cada agente devolve: identificação da tarefa, modelo efetivo, arquivos alterados, comportamento implementado, testes executados com resultados e pendências. Uma afirmação de conclusão sem arquivos ou evidências não encerra a tarefa. O orquestrador verifica a entrega antes de liberar tarefas dependentes.

Se existir Git, use isolamento compatível com o repositório e mantenha áreas de trabalho dentro da raiz autorizada. Se não existir, use as pastas independentes e propriedade explícita de arquivos; não presuma que `worktree` funciona sem Git. Não modificar o repositório pai por acidente.

## 04. Produtos e pastas definitivas

```text
1. Sites de Renda Passiva (ADS)/
├── prompt-mestre-orquestração-claude.md
├── leia-me-primeiro.md
├── documentação/
├── compartilhado/
├── .claude/agents/
├── 1. Ferramentas para confeitaria/
│   └── index.html
├── 2. Atividades escolares para imprimir/
│   └── index.html
├── 3. Ferramentas para crochê e artesanato/
│   └── index.html
├── 4. Planejamento de churrasco e festas/
│   └── index.html
├── 5. Calculadoras de pintura e reforma/
│   └── index.html
└── 6. Moldes de caixas e embalagens/
    └── index.html
```

Cada pasta de produto deve ter seu próprio ponto de entrada, configuração, conteúdo, estilos, scripts, testes, instruções e pacote publicável. Deve poder ser hospedada separadamente e copiada sem depender das outras cinco. Conteúdo compartilhado é reaproveitado no desenvolvimento e incorporado a cada pacote; nenhum site publicado deve requisitar `../compartilhado/` ou arquivos de um projeto irmão.

Não criar somente seis páginas com o mesmo cálculo e nomes diferentes. Cada produto precisa das funções específicas definidas neste documento, conteúdo útil próprio e identidade cromática própria. Nomes comerciais sugeridos são provisórios; pesquisar conflitos antes de publicar e não alegar disponibilidade de marca ou domínio sem verificar.

## 05. Arquitetura: cadastro e servidor realmente necessários?

A decisão inicial para os seis produtos é **site estático com ferramentas executadas no navegador**, sem banco de dados, cadastro, login, chat ou recepção de feedback em servidor. Todas as funções obrigatórias abaixo podem ser resolvidas assim, inclusive impressão, geração de arquivos e Pix estático.

Hospedar HTML em Apache, Nginx ou serviço de arquivos não significa ter backend de aplicação. Um servidor local de desenvolvimento ou uma etapa local de compilação também não aciona o requisito de contas e chat. Cabeçalhos de segurança e roteamento na camada de hospedagem não exigem cadastro.

Produza `documentação/decisão-sobre-cadastro-e-servidor.md`, com uma linha por projeto explicando a decisão. Não adicionar backend por conveniência para gerar PDF, guardar preferências, montar QR Code ou criar um formulário que não era necessário. Não usar serviço externo como backend escondido para dizer que o site é estático.

Se uma função necessária realmente exigir persistência compartilhada, autenticação ou API própria, justifique antes da implementação e cumpra integralmente a seção 18: usuários, administração, moderação, chat principal e feedback flutuante. Não omitir essas exigências depois de introduzir o backend. Mesmo com backend, as ferramentas públicas devem permanecer utilizáveis sem login sempre que possível.

Use HTML semântico, CSS e JavaScript modular, com uma ferramenta gratuita de desenvolvimento/compilação apenas se trouxer benefício comprovado. Uma arquitetura multipágina com HTML gerado previamente favorece conteúdo legível e publicação estática. Não adotar um framework pesado sem necessidade.

O `index.html` é a entrada real, não um arquivo contendo todo o CSS, JavaScript e conteúdo do sistema. Documente o uso via HTTP/HTTPS; módulos podem não funcionar abrindo `file://` com dois cliques. Forneça um comando local simples para desenvolvimento e outro para visualizar exatamente o pacote de produção.

## 06. Português brasileiro, acentuação e modularidade

Todo texto autoral, documentação, comentário, nome de função, variável, propriedade de dados, classe CSS e arquivo deve usar português brasileiro correto, com acentuação quando a palavra exigir. Adote UTF-8 e normalização Unicode NFC.

Exemplos: `calcularPreçoDeVenda`, `quantidadeDePorções`, `validarDoação`, `preferênciasDePrivacidade`, `calcular-preço-de-venda.js`, `navegação-inferior.css`, `configuração-pública.json`, `política-de-privacidade.html`.

Não traduzir palavras reservadas, APIs da plataforma, protocolos, nomes de pacotes, atributos HTML padronizados, diretivas HTTP, identificadores oficiais e convenções obrigatórias da ferramenta. Exemplos de exceções técnicas: `index.html`, `package.json`, `.claude/agents`, `name`, `model`, `import`, `export`, `addEventListener`, `aria-label`, `ads.txt`, `robots.txt`, `sitemap.xml`, `BR.GOV.BCB.PIX`. Não acentuar artificialmente palavras que não levam acento.

Documente as exceções em `documentação/convenções-e-exceções-técnicas.md`. Caminhos com espaço e acento devem ser citados corretamente no terminal, resolvidos por APIs de caminho e testados no sistema de arquivos do servidor. URLs devem ter codificação correta e consistência de maiúsculas/minúsculas; não resolver problemas renomeando indiscriminadamente arquivos autorais para inglês.

Cada função autoral nomeada deve ter seu próprio arquivo, com exportação clara e teste correspondente quando houver lógica relevante. HTML, CSS, JavaScript, dados e testes ficam separados. Callbacks anônimos curtos, declarações de tipos e configuração não precisam virar dezenas de arquivos sem propósito; extraia-os quando tiverem lógica própria. Um arquivo orquestrador pode importar e compor funções, mas não acumular suas implementações.

Exemplo de organização de um projeto:

```text
index.html
páginas/
  ferramentas.html
  salvos.html
  apoiar.html
  sobre.html
  contato.html
  metodologia.html
  política-de-privacidade.html
  termos-de-uso.html
  página-não-encontrada.html
estilos/
  base.css
  tipografia.css
  cores.css
  movimentos.css
  impressão.css
  componentes/
    cabeçalho.css
    navegação-inferior.css
    formulário.css
    diálogo.css
    consentimento.css
    apoio-voluntário.css
scripts/
  iniciar-aplicação.js
  configuração/
    carregar-configuração.js
    validar-configuração.js
  cálculos/
    calcular-custo-da-receita.js
    calcular-preço-de-venda.js
  validação/
    interpretar-número-brasileiro.js
    validar-quantidade.js
  interface/
    configurar-navegação-inferior.js
    abrir-diálogo.js
    fechar-diálogo.js
    exibir-mensagem.js
  privacidade/
    ler-consentimento.js
    salvar-consentimento.js
    revogar-consentimento.js
  publicidade/
    pode-carregar-anúncios.js
    carregar-anúncios.js
  apoio/
    validar-valor-pix.js
    gerar-payload-pix.js
    calcular-crc-pix.js
    renderizar-código-qr.js
    copiar-pix.js
  armazenamento/
    salvar-registro-local.js
    exportar-cópia-local.js
    importar-cópia-local.js
configurações/
  configuração-pública.json
recursos/
  fontes/
  ícones/
  imagens/
conteúdo/
testes/
documentação/
publicação/
```

Adapte os módulos de cálculo a cada produto; a árvore ilustra separação, não arquivos vazios obrigatórios. Não deixar funções `TODO`, retornos simulados, links sem destino ou conteúdo provisório nas funções entregues. Metadados de integração externa ainda não fornecidos são exceções de configuração e precisam ficar desativados de forma segura.

Use compilação para reduzir requisições, dividir carregamento por página e comprimir recursos. A modularidade obrigatória é do código-fonte; arquivos compilados podem ser agrupados, desde que não haja um pacote gigante carregado em todas as páginas. Dependências de terceiros preservam nomes e licenças originais.

## 07. Identidade visual e comportamento comum

Crie uma família visual moderna, acolhedora, delicada e orgânica. Nada futurista, neon, cyberpunk, tridimensional, com perspectiva ou aparência de painel administrativo genérico. Não usar uma grade de cartões quadrados repetidos como estrutura principal. Preferir composições editoriais, faixas suaves, listas bem desenhadas, bordas curvas e superfícies de ferramenta com formato apropriado ao conteúdo.

A estrutura de navegação e localização das ações é consistente entre os seis sites. Cada site possui uma paleta própria; cada página/ferramenta dentro dele também recebe uma combinação de cor de destaque própria e harmoniosa, mantendo o mesmo padrão estrutural. Preservar contraste: não trocar simplesmente a cor de fundo sem avaliar texto, ícones, foco e estados.

Direções iniciais de paleta, sujeitas a contraste e refinamento:

| Projeto | Direção visual |
|---|---|
| Confeitaria | Rosa queimado, creme e frutas vermelhas. |
| Educação | Azul suave, amarelo quente e papel claro. |
| Crochê e artesanato | Lavanda, ameixa e linho. |
| Festas | Coral, pêssego e verde suave. |
| Pintura e reforma | Verde sálvia, terracota e areia. |
| Embalagens | Azul petróleo, damasco e papel. |

Escolha fontes gratuitas com licença comercial, bom desenho e cobertura completa de português brasileiro. Hospede as fontes localmente; limite famílias e pesos. Selecione ícones de uma biblioteca gratuita licenciada, com estilo consistente, carregando apenas os usados. Ícone acompanha rótulo quando a ação puder ser ambígua.

Todos os estados fazem parte da interface: vazio, edição, sucesso, erro, carregamento, indisponibilidade e ausência de resultados. Mensagens claras em português, junto ao campo e com foco acessível quando necessário.

Não usar `alert()`, `confirm()` ou `prompt()` para fluxos do produto. Use diálogos personalizados acessíveis, notificações e confirmações dentro da interface, com foco inicial, contenção de foco quando modal, fechamento por Escape e restauração de foco. Não substituir permissões nativas inevitáveis: impressão, download, área de transferência e permissões do sistema podem abrir interfaces controladas pelo navegador.

O rodapé institucional precisa identificar “Criado por Anderson”, portfólio e contato reais. Os endereços vêm da configuração. Não inventar domínio, e-mail, telefone ou link `#`. Se faltarem, registrar pendência de publicação e não exibir links quebrados. Não confundir esse rodapé institucional com a navegação inferior do celular.

## 08. Celular como aplicativo; computador como site completo

Este requisito é obrigatório em todos os seis produtos e em todas as páginas, inclusive consentimento, Pix, erros e área administrativa se houver.

No celular:

- Navegação fixa inferior com até cinco destinos: Início, Ferramentas, Salvos, Apoiar e Mais. Ícones e nomes em português, estado ativo visível e `aria-current` apropriado.
- Destinos precisam existir e funcionar. “Salvos” mostra dados locais reais; “Mais” abre um menu acessível. Não inventar recursos apenas para preencher a barra.
- A ação principal de cada ferramenta, como Calcular, Gerar ou Imprimir, deve ficar ao alcance do polegar: use uma faixa contextual inferior quando útil, acima da navegação, sem duplicação confusa de botões.
- Garanta área de toque de pelo menos 44 × 44 pixels CSS, separação entre alvos e leitura confortável. Campos com fonte mínima de 16 pixels CSS para evitar zoom indesejado em aparelhos comuns.
- Reserve no conteúdo o espaço real da barra e das ações, incluindo `env(safe-area-inset-bottom)`. Use viewport adequado e unidades dinâmicas quando apropriado, com fallback.
- Teste o teclado virtual: o campo ativo e sua mensagem devem permanecer visíveis; a barra pode recolher temporariamente conforme comportamento observado, mas a ação deve continuar acessível. Não depender de uma altura fixa de tela.
- Consentimento, apoio, anúncios, feedback e chat não podem disputar o mesmo canto nem cobrir a barra. Defina hierarquia de sobreposição e reposicionamento. No máximo um diálogo modal ativo por vez.
- Banners de apoio e publicidade não podem cobrir a navegação ou imitar seus botões. O destino “Apoiar” abre a página legítima de doação voluntária. Não colocar anúncio fixo junto aos botões de uso.
- Retrato e paisagem, rolagem natural, sem arrastar lateralmente a página. Tabelas ou moldes grandes têm alternativa adequada e rolagem contida somente onde necessário.

No computador:

- Cabeçalho e navegação adequados ao espaço, sem simplesmente ampliar a barra de celular.
- Formulário e resultado podem aparecer lado a lado se isso ajudar; largura de leitura controlada e alinhamento consistente.
- Teclado, foco visível, Tab, Enter e Escape funcionando. Nenhuma função depende exclusivamente de passar o mouse.

Faixas de teste mínimas: 320, 360, 390, 768, 1024 e 1440 pixels de largura; incluir uma altura curta em paisagem. Emular aparelhos ajuda, mas não equivale a testar um dispositivo físico. Relate separadamente o que foi validado em aparelho real.

## 09. Animações e desempenho

Projete transições coerentes para botões, seleção, expansão, navegação, diálogos e resultados. Movimento deve explicar a mudança e dar sensação de cuidado, sem atrasar o uso. Valores iniciais sugeridos: 120–220 ms para controles e 180–320 ms para painéis; ajustar ao resultado observado.

Priorize `transform` e `opacity`, evite animações contínuas, parallax, partículas e movimentos pesados durante digitação. Não animar cada caractere de um resultado ou provocar saltos de layout. Respeite `prefers-reduced-motion`; toda funcionalidade deve continuar clara com movimentos reduzidos.

Ferramentas pequenas respondem imediatamente. Gerações mais caras, como caça-palavras, PDFs e moldes, usam limites explícitos, carregamento sob demanda e processamento fora da tarefa principal quando necessário. Não usar laço infinito para tentar encaixar um problema impossível. Mostrar progresso apenas quando real e permitir cancelar operações demoradas.

Como metas, buscar LCP até 2,5 s, INP até 200 ms e CLS até 0,1 em condições descritas. Dados de laboratório não substituem métricas reais de campo. Registrar aparelho/emulação, rede, build e presença de anúncios nos resultados. Não prometer velocidade universal.

Carregue bibliotecas de PDF/QR apenas quando necessárias, use imagens dimensionadas, fontes locais otimizadas e espaços reservados para anúncios. Não medir somente a versão vazia para afirmar que a versão monetizada é rápida. Se anúncios reais não estiverem disponíveis, valide a reserva de espaço com simulação identificada e deixe a medição real como pendência.

## 10. Projeto 1 — ferramentas para confeitaria

Pasta: `1. Ferramentas para confeitaria`. Marca provisória: Forno em Conta.

Entregar ferramentas conectadas: custo da receita, preço de venda, ajuste de quantidade, lista de compras e orçamento imprimível. Começar com brigadeiros, brownies e bolo de pote, sem restringir a inclusão de receitas próprias.

Entradas: preço e quantidade da embalagem comprada, quantidade usada, unidade, rendimento aproveitável, embalagem de venda, tempo, valor da hora, custos adicionais e taxa percentual informada pelo usuário. Não trazer preços de supermercado por API ou fingir cotação atualizada.

Regras essenciais:

- Custo proporcional do ingrediente = preço da embalagem × quantidade usada / quantidade comprada, em unidades compatíveis.
- Conversão entre g/kg e ml/L; não converter volume em massa sem densidade específica declarada.
- Separar custo consumido, custo de estoque e dinheiro necessário para comprar embalagens inteiras.
- Preço com margem sobre venda = custo / (1 − margem − taxas), somente quando os percentuais têm a mesma base. Bloquear denominador zero/negativo; distinguir margem de acréscimo sobre custo.
- Escala de encomenda considera rendimento e arredondamento de lotes. Permitir corrigir manualmente tempo, forno e desperdício, que nem sempre crescem linearmente.
- Salvar, duplicar, editar e excluir receitas locais; exportar e importar backup validado e versionado.
- Orçamento ao cliente contém somente informações comerciais escolhidas; não revela custo interno ou margem. Copiar texto sem integração paga de mensagens.

Caso de conferência: custo completo R$ 80 para 50 unidades e margem de 30%, sem taxas; preço matemático do lote R$ 114,2857; com arredondamento por unidade para cima, R$ 2,29 por unidade e R$ 114,50 por lote. Não arredondar cada etapa intermediária de forma a distorcer o resultado.

Incluir metodologia, exemplos revisados e explicação de premissas. Não chamar o resultado de lucro garantido.

## 11. Projeto 2 — atividades escolares para imprimir

Pasta: `2. Atividades escolares para imprimir`. Público principal: professores e responsáveis preparando materiais; isso não autoriza ignorar eventual uso por crianças.

Entregar quatro geradores: operações matemáticas, tabuada, caça-palavras e folhas de escrita/caligrafia personalizadas.

- Matemática: selecionar operações, intervalo, quantidade, apresentação e dificuldade. Controlar reserva/empréstimo, resultados negativos e divisão com ou sem resto conforme opção. Divisão exata gera operandos a partir de quociente e divisor, nunca arredonda resposta incorreta.
- Tabuada: selecionar fatores e quantidade, com gabarito separado.
- Caça-palavras: lista editável, direções, tamanho de grade e gabarito. Usar estratégia limitada e determinística por semente para reprodução; garantir inclusão de todas as palavras ou informar quais não cabem. Nunca omitir palavra silenciosamente.
- Tratar acentos e cedilha conscientemente: escolher modo de exibição e busca, explicar a opção e garantir que grade, lista e gabarito correspondam. Evitar normalização que transforme palavras sem avisar.
- Caligrafia: texto do responsável, linhas-guia, repetição e tamanho; usar fonte licenciada adequada. Cobrir letras só se a fonte/desenho permitir traçado realmente utilizável. Não fingir pontilhado com efeito visual ilegível.
- Prévia, impressão A4 e arquivo PDF local; gabarito em página separada, sem anúncios ou banner de doação no material impresso.
- Cabeçalho opcional com nome da atividade; nenhum dado de aluno é enviado a servidor, anúncios ou analytics. Campos pessoais permanecem locais e não entram em URL pública.
- Evitar personagens, apostilas e imagens protegidos copiados. Não alegar alinhamento com BNCC ou eficácia pedagógica sem verificar o conteúdo e as habilidades correspondentes.
- Anúncios e pedido de apoio aparecem no ambiente de preparação do adulto, nunca dentro da atividade infantil ou disfarçados de instrução. Avaliar e documentar tratamento de publicidade para público infantil antes de ativar monetização; não contornar isso com um aviso “somente adultos”.

Testes: respostas matemáticas independentes do renderizador; todas as palavras presentes; correspondência com o gabarito; palavras longas; grade impossível; caracteres brasileiros; PDF sem corte ou página vazia inesperada.

## 12. Projeto 3 — crochê e artesanato

Pasta: `3. Ferramentas para crochê e artesanato`.

Entregar: preço da peça, valor da hora, custo de fio/material consumido, planejamento de encomenda e orçamento imprimível. Perfis iniciais: crochê, amigurumi e peças artesanais com materiais adicionados pelo usuário.

Registrar material, preço de compra, peso/metragem disponível e consumo; considerar embalagem, tempo e custos adicionais. Não converter gramas em metros sem a relação específica daquele fio. Apresentar preço por peça e conjunto, margem real e efeito de desconto. Comparar valor mínimo calculado com preço informado sem declarar valor universal de mercado.

Permitir salvar fichas locais, duplicar peças, ajustar quantidades e exportar backup. Não gerar receita de amigurumi ou molde de roupa fingindo conhecimento de construção que não foi implementado. Conteúdo de apoio é autoral e claramente separado de estimativas.

Teste de material: novelo de R$ 20 e 100 g, consumo de 25 g = R$ 5. Soma com mão de obra e embalagem deve ser conferida antes da margem. Quantidade comprada zero, unidade incompatível e desconto que gere prejuízo precisam de tratamento claro.

## 13. Projeto 4 — churrasco e festas

Pasta: `4. Planejamento de churrasco e festas`.

Entregar planejador de churrasco, festa infantil e encontro/almoço, com lista de compras, estimativa de orçamento e divisão opcional de despesas entre participantes pagantes.

Entradas: número de adultos e crianças, duração, apetite, acompanhamentos, preferências alimentares e quantidade explícita de adultos que consumirão álcool. Não presumir consumo por sexo e não incluir crianças na conta de bebidas alcoólicas.

Premissas de consumo devem vir de referências identificadas e ser editáveis. Quantidades são estimativas, não garantia de porção ideal. Separar cru/cozido, com osso/sem osso quando pertinente; evitar dupla aplicação de perdas. Explicar ajustes por duração e acompanhamentos.

Calcular itens, arredondar embalagens, permitir excluir/substituir itens e incluir preços pagos pelo próprio usuário. Dividir o orçamento por pagantes, não necessariamente por todos os presentes. Nenhum preço em tempo real ou API obrigatória.

Salvar o evento localmente, copiar lista e imprimir versão limpa. Presets de 10, 20, 30 ou 50 pessoas podem preencher a mesma ferramenta; não criar dezenas de páginas vazias só mudando um número.

Testes: zero convidados; somente crianças; vegetarianos; zero consumidores de álcool; duração extrema; embalagem indivisível; nenhuma pessoa pagante. O total dos itens deve coincidir com o orçamento.

## 14. Projeto 5 — pintura e reforma

Pasta: `5. Calculadoras de pintura e reforma`.

Entregar quatro ferramentas: área de paredes, quantidade de tinta, piso/revestimento por caixa e rodapés, com orçamento estimado a partir de preços informados.

- Paredes: somar largura × altura de cada superfície e subtrair aberturas selecionadas, sem permitir área negativa ou abertura maior que a superfície correspondente.
- Tinta: distinguir rendimento por demão de rendimento acabado do produto. Se o rendimento informado é por demão, considerar número de demãos; se já é acabado, não multiplicar novamente. Usar o rótulo/ficha do produto como referência do rendimento.
- Piso: área, margem de recorte e cobertura por caixa; caixas = teto(área ajustada / cobertura por caixa). Não confundir área calculada com paginação exata das peças.
- Rodapé: perímetro útil, descontando trechos sem instalação, mais perdas e arredondamento por barra/embalagem.
- Mostrar unidades e memória de cálculo. Preços, mão de obra e perdas são fornecidos/ajustados pelo usuário; nunca apresentar como orçamento profissional fechado.

Teste de piso: 20 m², 10% de margem e 2,2 m² por caixa = 10 caixas. Testar precisão decimal nos limites para não comprar caixa adicional por erro de ponto flutuante.

Não incluir cálculos de estrutura, elétrica, gás, sustentação ou instruções de obra de risco. O produto estima materiais de acabamento.

## 15. Projeto 6 — moldes de caixas e embalagens

Pasta: `6. Moldes de caixas e embalagens`.

Entregar geradores de caixa retangular simples, caixa com tampa separada, envelope e etiquetas/tags. Ferramentas bidimensionais, sem visualização 3D.

Entradas: medidas em mm/cm, folga, abas, papel e opções de texto simples. Saídas: prévia em escala indicada, PDF de impressão e SVG vetorial com linhas de corte e dobra distinguíveis também em preto e branco. Explicar medidas internas/externas e espessura admitida.

Impressão em tamanho real, indicação de 100%, régua/quadrado de calibração e margens imprimíveis. Se o molde não couber em A4, oferecer divisão em folhas com marcas de montagem ou avisar; nunca reduzir silenciosamente a escala e manter dimensões declaradas.

Calcular folga da tampa de modo consistente. Validar interseções, limites, abas e dimensões impossíveis. Não prometer encaixe perfeito sem teste físico; registrar separadamente validação geométrica, renderização e montagem em papel.

Usar formas e ilustrações próprias ou licenciadas. Não importar SVG arbitrário, scripts ou URL externa como parte da primeira versão. Texto personalizado deve ser escapado na exportação. Nada de copiar moldes comerciais, personagens protegidos ou pacotes de terceiros.

Não declarar a embalagem segura para contato com alimento ou adequada a carga estrutural; o usuário escolhe material apropriado. Arquivos são gerados localmente, sem servidor.

## 16. Cookies e consentimento na primeira visita

Todos os sites devem apresentar, no primeiro acesso sem preferência válida, uma interface de privacidade clara e integrada ao visual. Oferecer **Aceitar opcionais**, **Rejeitar opcionais** e **Personalizar**, com acesso igualmente fácil. Rejeitar não impede cálculos, impressão, downloads ou acesso ao conteúdo.

Configuração inicial: publicidade e medição opcionais desativadas. Não carregar tags de anúncios, analytics, pixels, vídeos incorporados ou conexões de rastreamento antes da escolha correspondente. Não executar pedidos “sem cookie” de medição antecipada apenas para contornar a decisão do usuário. Recursos necessários à própria interface podem funcionar, com descrição fiel do armazenamento utilizado.

Guardar a escolha com versão da política e prazo documentado; não solicitar novamente em toda navegação. Um prazo operacional pode ser configurável, sem apresentá-lo como duração legal universal. Reexibir quando a escolha expirar, for apagada ou houver mudança material de finalidade. Disponibilizar “Preferências de privacidade” permanentemente no rodapé/menu, com alteração e revogação tão simples quanto a aceitação.

Persistência de receitas, atividades e listas é uma função solicitada pelo usuário. Explicar seu uso local, oferecer exclusão e backup e não confundir salvamento funcional com publicidade. “Rejeitar publicidade” não pode apagar uma receita salva ou inviabilizar a ferramenta. Cada site terá chaves de armazenamento próprias; evitar conflito entre projetos publicados no mesmo domínio e isolar permissões por produto quando necessário.

Prefixos de armazenamento evitam colisões, mas não são uma barreira de segurança entre páginas da mesma origem. Preferir origens separadas por produto quando a hospedagem permitir e documentar o alcance real do isolamento escolhido.

Consentimento verdadeiro controla o carregamento, não apenas esconde um banner. Testar em contexto novo, após aceitação, após rejeição, após revogação e com armazenamento indisponível. Ao revogar, impedir novos carregamentos e remover/reinicializar componentes controláveis; explicar que não é possível desfazer requisições já realizadas ou apagar todos os cookies de terceiros. Recarregar a página quando necessário para aplicar a escolha, preservando dados funcionais.

Quando houver AdSense, integrar uma CMP compatível com os requisitos atuais. O Google exige CMP certificada com TCF para tráfego das regiões aplicáveis, incluindo EEE, Reino Unido e Suíça. Um banner autoral não equivale a uma CMP certificada. Preferir a solução oferecida pelo próprio Google quando disponível sem custo adicional.

Definir uma fonte única de decisão por contexto: não mostrar duas solicitações concorrentes nem fazer o consentimento local sobrepor uma recusa da CMP. Se a CMP oficial for responsável pelo contexto, sincronizar a interface autoral com ela pelos mecanismos documentados, sem inventar strings TCF ou APIs. O código estritamente necessário da CMP pode carregar para obter consentimento; as tags publicitárias aguardam o sinal exigido.

Não inferir localização por idioma. Se não puder determinar com segurança o contexto necessário à veiculação ou se a CMP falhar, manter os anúncios desativados e as ferramentas funcionando. O guia de publicação deve explicar como configurar o alcance geográfico e verificar ausência de corrida entre CMP e anúncios.

Incluir política de privacidade coerente com o comportamento real: operador, contato, dados locais, logs de hospedagem se existentes, fornecedores efetivos, escolhas, retenção e canais para solicitações. Não escrever “nenhum dado é enviado” se houver anúncios ou logs. Consultar a orientação atual da ANPD e do Google; não prometer conformidade jurídica absoluta por existir um banner.

## 17. Doação voluntária exclusivamente por Pix

Em todos os seis produtos, incluir uma faixa discreta, orgânica e dispensável de apoio voluntário, além da página “Apoiar” e do destino inferior no celular. Texto sugerido: “Este projeto é gratuito. Se ele ajudou você, pode apoiar sua manutenção com qualquer valor.” Não usar culpa, urgência falsa, bloqueio de recursos ou pagamento obrigatório.

Valores rápidos obrigatórios: **R$ 1, R$ 5, R$ 10, R$ 20, R$ 30, R$ 50 e R$ 100**. Também incluir campo de valor livre, aceitando formato brasileiro. A escolha apenas gera a instrução de pagamento; nunca realiza débito, pagamento recorrente ou abertura automática de aplicativo bancário.

Fluxo: selecionar/digitar valor → revisar valor e recebedor → gerar QR Code Pix e código Copia e Cola → copiar, baixar ou fechar. Mensagens e transições são da interface do site. No próprio celular, Copia e Cola deve estar acessível, pois o usuário pode não conseguir escanear a própria tela.

Dados públicos necessários: chave Pix real, nome do recebedor e cidade conforme os limites do padrão. Não inventar esses dados. Sugerir chave aleatória se o proprietário preferir reduzir exposição de telefone/CPF, sem gerar ou substituir uma chave por conta própria. A chave presente em um Pix público pode ser lida por visitantes; não tratá-la como segredo escondido no JavaScript.

Usar QR estático com valor informado, conforme o Manual de Padrões para Iniciação do Pix vigente. Gerar o BR Code localmente, com moeda, país, comprimentos, campos e CRC corretos. Conferir o manual antes de implementar; testes devem validar campos e decodificar o QR com ferramenta independente. Separar validação monetária, montagem do payload, CRC, renderização e cópia em arquivos próprios.

Regras de integridade:

- Valores positivos em centavos inteiros, duas casas decimais na representação final; rejeitar vazio, negativo, zero, notação exponencial ambígua e precisão excedente. Limites técnicos devem seguir o padrão e ser explicados no campo.
- Valor mostrado, QR e texto copiável devem corresponder exatamente. Alterar o valor invalida o código anterior até a regeneração.
- Chave e recebedor vêm somente da configuração de publicação confiável, nunca de parâmetros de URL, mensagens do visitante, importação de receitas ou armazenamento editável usado como fonte administrativa.
- Não usar chave de exemplo em produção. Se faltarem dados, apoio fica indisponível de forma honesta e a pendência aparece no relatório de configuração. A prévia local pode mostrar o fluxo com marcadores explicitamente não pagáveis; nunca direcionar dinheiro a uma chave substituta.
- Copiar para a área de transferência pode falhar; oferecer seleção manual. Não dizer “copiado” se a operação falhar.
- O QR estático não confirma recebimento automaticamente. Não criar saldo, total arrecadado fictício, comprovante, lista de doadores ou mensagem “pagamento confirmado” baseada em clique ou retorno de aplicativo. Pode agradecer pela intenção, sem afirmar liquidação.
- Conferência bancária real fica a cargo do recebedor. Eventuais tarifas do banco dependem da conta; não prometer Pix gratuito em qualquer situação.

Nenhuma API de pagamento, checkout ou banco de dados é necessário para esse fluxo. Confirmação automática só pode ser proposta separadamente com integração bancária real, autenticação, idempotência e verificação; não faz parte desta primeira entrega.

Não misturar a faixa de apoio com anúncios nem pedir que a pessoa clique em publicidade para ajudar. Respeitar a dispensa temporária do banner. O site de atividades escolares direciona a solicitação de apoio ao adulto que prepara o material, nunca à criança na atividade.

## 18. Requisitos obrigatórios se houver backend de aplicação

Esta seção é condicional. Na arquitetura estática inicial, registrar “não aplicável: não há backend de aplicação”; não criar login, chat ou feedback falsos em armazenamento local para aparentar cumprir requisitos de servidor.

Se houver backend, usar tecnologia gratuita e compatível com o servidor existente. Definir banco, migrações, backups, retenção e restauração. SQLite pode atender uso pequeno em uma instância com persistência adequada; não colocar banco em sistema de arquivos temporário nem fingir escalabilidade entre múltiplas instâncias. Usar transações e consultas parametrizadas.

### 18.1. Contas e administração

Implementar cadastro, login, logout, edição de perfil e recuperação de acesso viável sem depender de serviço pago não contratado. Se e-mail de verificação/recuperação exigir SMTP, suportar o já existente e documentar configuração; na ausência, definir procedimento administrativo seguro, nunca expor token de recuperação na resposta pública. Não alegar e-mail enviado sem envio real.

Sessões seguras com cookies `HttpOnly`, `Secure` em produção e política `SameSite` apropriada; proteção CSRF quando necessária, expiração, rotação e revogação. Senhas com algoritmo adequado e mantido, preferencialmente Argon2id com parâmetros atuais. Não guardar senha reversível, texto puro ou token de sessão persistente no armazenamento acessível ao JavaScript.

Aplicar limites de tentativas de login, cadastro e recuperação; respostas que não facilitem enumeração de contas, tokens de uso único quando necessários e proteção contra abuso sem bloquear indefinidamente usuários legítimos. Não usar captcha pago como dependência obrigatória.

Admin de Anderson provisionado por procedimento local único, com credenciais fornecidas de forma segura. Não usar senha padrão, credencial escrita em código ou regra que torne o primeiro usuário público administrador. Segredos apenas no servidor, fora de conteúdo público e de versionamento.

Painel administrativo com acesso a todos os usuários daquele sistema, busca, paginação, situação, papéis, suspensão, reativação e ações de moderação. Acesso administrativo a dados não significa acesso a senhas ou direito de se passar por usuário. Não implementar impersonação. Autorizações verificadas no servidor em cada operação; esconder botão não é controle de acesso.

Testar usuário comum, administrador, usuário suspenso e sessão expirada. Bloquear acesso horizontal a dados de outra conta e elevação de privilégios. Confirmar ações destrutivas com diálogo próprio. Registrar trilha de auditoria minimizada, sem senhas ou segredos.

### 18.2. Chat na tela principal

Chat público do projeto visível na página inicial, com envio por pessoas autenticadas; visitantes podem ler se a política do produto permitir. Mensagens persistidas, histórico paginado, datas, estados de envio, erros e reconexão reais. Não usar respostas simuladas nem agentes fingindo ser pessoas.

Moderação pelo administrador: remover/ocultar mensagem, suspender participante, controlar denúncias e limitar frequência. Validar comprimento, sanitizar/renderizar conteúdo como texto, impedir execução de HTML e limitar links conforme política explícita. Não permitir anexos na primeira versão sem necessidade justificada.

Se usar WebSocket, autenticar conexão e autorização das ações, verificar origem e aplicar limites; se usar consultas periódicas, controlar frequência e carga. Evitar duplicação de mensagens em reenvio e reconexão. Estados de bloqueio precisam aparecer no cliente e ser efetivos no servidor.

No produto escolar, chat destinado a adultos responsáveis pela preparação do material. Não coletar contas de crianças ou habilitar interação infantil sem revisão específica de privacidade e moderação. A disponibilidade do chat não é justificativa para expor dados de alunos.

### 18.3. Feedback flutuante

Botão pequeno “Enviar feedback” no canto, reposicionado acima da navegação inferior no celular. Formulário próprio com categoria, mensagem e retorno opcional. Receber no backend e exibir no painel administrativo com estados novo/em análise/resolvido. Validar entrada, limitar envios e evitar coleta automática de informações pessoais.

Não enviar URL completa se ela puder conter dados; coletar apenas identificação segura da página e metadados necessários, informando o usuário. Captura de tela e anexos ficam fora da primeira versão. Confirmação de recebimento somente após persistência real.

### 18.4. Operação do servidor

Documentar execução, variáveis, migração, inicialização segura do admin, backups, restauração testada, logs, limites e atualização. Impedir acesso público a banco, backups, arquivos `.env`, dependências e repositório. Aplicar tratamento de erro sem detalhes internos ao visitante. Não usar CORS irrestrito com credenciais.

## 19. Segurança e proteção contra clonagem

Implementar segurança proporcional e verificável. Faça uma análise de ameaças incluindo XSS, importação de backup maliciosa, troca de chave Pix, conteúdo em SVG/PDF, URLs perigosas, dependências e integrações publicitárias. Com backend, acrescentar autenticação, autorização, CSRF, abuso e acesso indevido a dados.

Proteções mínimas:

- Validar tipo, faixa, tamanho e unidade de entrada; usar precisão adequada para dinheiro. Evitar `NaN`, `Infinity`, divisão por zero e travamento em entradas extremas.
- Inserir texto por APIs seguras; não interpolar entrada do usuário em `innerHTML`. SVG, PDF, CSV e cópia de dados exigem escape/validação correspondente ao formato; exportação CSV deve evitar execução de fórmulas ao abrir em planilha.
- Importação local aceita apenas esquema conhecido e versionado, com limite de tamanho e profundidade. Não usar `eval`, executar código importado ou misturar dados importados com configuração de Pix, anúncios ou administrador. Evitar poluição de protótipo.
- Links externos validados, protocolos permitidos e proteção apropriada ao abrir nova aba. Nenhum segredo em JavaScript, JSON público, mapa de código, log ou pacote de publicação.
- Dependências mínimas, versões fixadas e licenças registradas. Não atualizar à força quebrando o projeto para reduzir um número de auditoria.
- HTTPS em produção e cabeçalhos adequados, como proteção contra enquadramento, interpretação incorreta de tipos e vazamento desnecessário de referência. HSTS somente após verificar HTTPS e o alcance dos domínios.
- Entregar configurações de hospedagem realmente aplicáveis: Apache, Nginx ou plataforma identificada. Não afirmar que uma tag `meta` substitui diretivas que exigem cabeçalho HTTP, como `frame-ancestors`.

**CSP e AdSense exigem compatibilidade explícita.** Separar os perfis sem publicidade e com publicidade. No perfil sem anúncios, aplicar política restritiva compatível com os recursos locais. No perfil monetizado, consultar o guia oficial atualizado do Google: a documentação consultada recomenda CSP estrita com nonce, não uma lista fixa de domínios publicitários.

Se usar nonce, ele deve ser criptograficamente imprevisível e novo por resposta, aplicado consistentemente ao HTML e ao cabeçalho. Não gravar nonce constante na compilação nem compartilhar HTML em cache com política incompatível. Adaptar a camada HTTP existente quando suportado; isso, sozinho, não cria backend de negócio ou necessidade de cadastro.

Não inventar uma CSP “perfeita” que bloqueia AdSense/CMP nem remover toda proteção para fazer o anúncio aparecer. Usar modo de relatório para diagnosticar quando pertinente e documentar concessões do perfil publicitário. Se a hospedagem não conseguir aplicar a política escolhida, entregar alternativas verificadas e marcar a configuração como pendente antes de habilitar anúncios. Não declarar proteção aplicada somente porque existe um arquivo de exemplo.

**Anticlonagem: objetivo realista.** HTML, CSS, JavaScript e imagens entregues ao navegador podem ser copiados. Não existe anticlonagem absoluta de frontend. Implementar identificação de autoria, licença dos arquivos autorais, metadados, registro de versão e hashes do pacote; manter recursos originais identificáveis. Minificação, retirada de mapas de código de produção e proteção opcional contra uso externo direto de imagens dificultam cópia casual, mas não impedem clonagem.

Não bloquear botão direito, seleção, atalhos, ferramentas do navegador ou acessibilidade. Não usar código que se destrói, redireciona visitantes de cópias ou tenta interferir em outros sites. Bloqueio de domínio em JavaScript é removível e não deve ser vendido como proteção. `ads.txt` protege autorização de venda de inventário publicitário, não o código-fonte. CSP protege execução e conteúdo, não impede alguém de baixar o site.

Caso uma lógica deva permanecer secreta, só o servidor pode evitar sua distribuição ao cliente; não introduzir backend apenas para esconder fórmulas públicas destas ferramentas. Publicar conteúdo e código autorais sob licença definida para o proprietário, preservando licenças de dependências.

## 20. AdSense pronto para conexão pelo proprietário

Os seis sites devem estar preparados para Google AdSense, com espaços de publicidade e carregador modular reais, porém desativados enquanto faltarem configuração, consentimento ou aprovação. Não colocar identificador publicitário fictício em código ativo.

Criar configuração pública por produto com: publicidade ativa/inativa, identificador do publicador, identificadores dos blocos, integração de consentimento, domínio/caminho de publicação e opções de posicionamento. Esses identificadores são públicos; credenciais da conta Google não pertencem ao site.

Usar blocos discretos, responsivos, rotulados “Publicidade”, reservando dimensões para reduzir mudança de layout. Preferir posições após explicação ou resultado, sem encobrir a ferramenta. Não colocar anúncios junto de botões de copiar Pix, baixar, gerar, menu inferior ou confirmação. Nunca pedir clique, disfarçar publicidade, multiplicar páginas artificialmente ou recarregar anúncio a cada cálculo. Não incluir publicidade no material impresso.

Carregar o script uma única vez por contexto e inicializar blocos sem duplicação. Tratar bloqueador de anúncios, recusa de consentimento, falta de inventário e falha de rede sem quebrar a página. Remover espaços excessivos vazios de forma cuidadosa, sem saltos inesperados. Testes automatizados devem interceptar/simular publicidade de maneira identificada; não clicar em anúncios reais nem gerar tráfego publicitário artificial.

Entregar `documentação/como-conectar-o-adsense.md` por produto e uma orientação consolidada. Escrever passos em português, verificando os nomes atuais da interface, com os seguintes assuntos:

1. Publicar em domínio ou estrutura de domínio controlada pelo proprietário, com HTTPS e conteúdo final.
2. Criar/acessar AdSense e adicionar o site conforme as regras atuais de domínio e subdomínio; não presumir que seis subpastas equivalem a seis cadastros independentes.
3. Obter o identificador `ca-pub-...` e os identificadores de blocos, explicando exatamente onde colocá-los na configuração local.
4. Conectar/verificar a propriedade pelo método oferecido na conta, sem chamar site apenas conectado de site aprovado.
5. Gerar `ads.txt` com a linha fornecida pela conta. Instalar na raiz de domínio exigida pelo Google, não apenas dentro da pasta da ferramenta. Se os seis produtos compartilharem um domínio, documentar o arquivo central e a regra aplicável aos subdomínios.
6. Configurar privacidade, mensagem/CMP, regiões e tratamento do produto escolar, respeitando rejeição e revogação.
7. Conferir políticas, aprovação, configurações de recebimento e eventuais verificações da conta, que serão realizadas pelo proprietário.
8. Ativar a configuração somente quando pronta, validar o build publicado, o consentimento, a política de segurança e a exibição legítima.
9. Ensinar a desativar publicidade e reverter a configuração sem derrubar as ferramentas.

Não garantir aprovação, receita, RPM ou prazo. Os sites precisam de conteúdo original útil, metodologia, páginas institucionais e navegação completa. Não clonar artigos, inventar depoimentos, criar avaliações falsas ou inserir centenas de páginas de pouco valor. Informar que cada projeto terá manutenção editorial e aquisição de audiência, mesmo sendo tecnicamente leve.

## 21. Configuração pendente sem impedir o desenvolvimento

Criar `documentação/dados-que-o-proprietário-precisa-preencher.md` com tabela de campo, finalidade, arquivo e efeito quando ausente. Solicitar os dados em bloco quando a implementação estiver pronta para usá-los; não interromper cada módulo com uma pergunta repetida.

Campos públicos: nome do criador; URL real do portfólio; contato público; nome/marca de cada site; domínio ou URL-base; chave Pix; nome/cidade do recebedor; identificador AdSense; blocos; configuração CMP e contato de privacidade.

Campos privados, apenas se houver servidor: credenciais de administração para provisionamento seguro, segredo de sessão, conexão com banco e SMTP já disponível. Nunca pedir que o usuário cole segredos em arquivo público ou versionado.

Exemplo de estrutura pública, a adaptar sem ativar integrações:

```json
{
  "criador": {
    "nome": "Anderson",
    "portfólio": "",
    "contato": ""
  },
  "publicação": {
    "endereçoBase": ""
  },
  "publicidade": {
    "ativa": false,
    "identificadorDoPublicador": "",
    "blocos": {},
    "consentimentoConfigurado": false
  },
  "apoio": {
    "ativo": false,
    "chavePix": "",
    "nomeDoRecebedor": "",
    "cidadeDoRecebedor": "",
    "valoresSugeridosEmCentavos": [100, 500, 1000, 2000, 3000, 5000, 10000]
  }
}
```

Esses campos não constituem verificação de segurança apenas por terem nomes claros. Validar esquema e dependências: por exemplo, proibir ativação publicitária com identificador vazio e geração de Pix com recebedor ausente. O fluxo funciona em testes com dados de teste não pagáveis; a conexão real permanece explicitamente pendente.

## 22. Conteúdo, descoberta e publicação independente

Cada produto deve ter página inicial útil, catálogo de ferramentas, páginas específicas funcionais, metodologia, exemplos, sobre, contato, privacidade, termos e tratamento de página inexistente. Criar textos próprios e verificados, sem prometer resultados financeiros, pedagógicos ou técnicos que não foram demonstrados.

Títulos e descrições únicos; hierarquia semântica; links internos válidos; endereço canônico configurado com domínio real; sitemap e robots coerentes. Não indexar resultados com dados pessoais, prévias, testes ou infinitas combinações de parâmetros. Não usar avaliações estruturadas ou números de usuários inventados.

Nas ferramentas, exibir premissas perto do resultado, unidade, arredondamento e limites. Presets nunca escondem hipóteses. Manter testes de fórmula independentes dos componentes que a exibem.

No ambiente local, usar portas distintas livres e vinculadas ao endereço local, por exemplo 4311–4316, verificando disponibilidade. Não interromper outros serviços nem abrir túneis públicos sem solicitação. Dependências e processos devem ser conhecidos e documentados.

Gerar pacote publicável próprio para cada produto, com instruções de raiz/subpasta e caminhos testados em ambos quando suportados. Não incluir banco, arquivos secretos, `.git`, dependências de desenvolvimento, relatórios de usuários ou configuração de testes no pacote público. Não assumir que servidores Windows e Linux tratam capitalização/Unicode da mesma forma.

## 23. Plano de execução e continuidade

Fase A — Inventário e contrato: inspecionar a raiz, registrar modelos/ferramentas, confirmar arquitetura estática, mapear seis produtos e aprovar internamente o contrato de configuração, componentes, dados e arquivos. Criar `documentação/matriz-de-requisitos.md`, com identificadores únicos para todos os requisitos deste prompt.

Fase B — Base comum: implementar navegação de celular e computador, formulários, diálogos, temas, privacidade, Pix, carregador de anúncios desativado, impressão e salvamento local. Integrar primeiro em uma fatia real da confeitaria. Testar o contrato antes de distribuí-lo aos outros executores.

Fase C — Seis implementações: distribuir projetos em ondas, com propriedade de arquivos e contratos estabilizados. Agentes implementam funcionalidades e testes próprios; pedem alterações compartilhadas ao orquestrador. Conteúdo, estados vazios e configurações fazem parte da entrega, não são deixados para o usuário programar.

Fase D — Integração: construir os seis pacotes, verificar independência, referências, importações, nomes em português, licenças, configurações e fluxos. O orquestrador resolve divergências e registra a revisão integrada usada pelos críticos.

Fase E — Dois críticos: cada crítico examina uma cópia/snapshot equivalente e identifica problemas com evidências, arquivo, passo de reprodução, consequência e gravidade. Pareceres separados. Não aprovar com base apenas no relatório dos executores. Críticos não editam o código de produção durante a primeira leitura; testes que gerem evidências usam local delimitado.

Fase F — Correção e aceite: distribuir achados aos responsáveis, corrigir, repetir os testes afetados e uma regressão relevante. Críticos revisitam os achados e os fluxos afetados. O orquestrador reconcilia os dois pareceres, executa os critérios finais necessários e assina o relatório com evidências.

Não repetir a bateria inteira indefinidamente quando nada mudou. Uma revisão completa por crítico, correções direcionadas e verificação final proporcional são o padrão. Se surgirem novos defeitos, tratá-los e documentar. Nenhum achado pode ser descartado silenciosamente.

Persistir progresso em `documentação/estado-da-execução.md`: concluído, em andamento, pendente, bloqueado, responsável, arquivos, comandos, resultados e próximo passo. Na retomada, ler esse estado e conferir os arquivos antes de reiniciar. Não confiar somente na memória da conversa.

Não interromper a execução porque uma mensagem ficou longa ou porque um agente concluiu sua parte. Continue até completar os seis produtos ou identificar dependência externa real. Diferenciar dependência de configuração do proprietário de defeito de implementação.

## 24. Critérios de teste e aceite

Exigir evidência verificável, não a expressão “sem erros” como garantia absoluta. O resultado aceitável é não haver defeito conhecido não resolvido nos fluxos obrigatórios e haver clareza sobre o que não pôde ser validado.

| Área | Evidência mínima |
|---|---|
| Funcionalidade | Fluxos de cada ferramenta com entradas normais, inválidas e extremas; exemplos de cálculo conferidos independentemente. |
| Modularidade e idioma | Arquivos autorais separados, funções nomeadas em português, acentuação correta, exceções técnicas documentadas e importações válidas. |
| Celular | Navegação inferior nos seis sites, destino ativo, toque, paisagem, teclado virtual, safe area e ausência de sobreposição. |
| Computador | Navegação completa, formulários/resultados, teclado, foco e larguras previstas. |
| Consentimento | Sem tags opcionais antes da escolha; aceitar, rejeitar, personalizar, persistir e revogar; CMP quando aplicável. |
| Pix | Sete valores padrão e valor livre; centavos, QR decodificado, CRC, dados do recebedor, cópia e alteração de valor coerentes; sem falsa confirmação. |
| Anúncios | Configuração desativada segura; inicialização única; posicionamento; bloqueador; falha de rede; guia de ads.txt/CMP/CSP. |
| Armazenamento | Salvar, editar, excluir, exportar/importar e rejeitar backup malicioso; separação entre projetos e ausência de vazamento de configuração. |
| Impressão | PDF/folhas sem navegação, anúncios, apoio ou gabarito misturado; margens e escala verificadas. |
| Segurança | Entradas com HTML/script/URLs perigosas, dependências, ausência de segredos e configuração HTTP coerente com hospedagem. |
| Backend condicional | Autorização real, sessões, usuários, moderação, chat, feedback, migração e restauração de backup. |
| Desempenho | Medição do pacote real em condições registradas, carregamento sob demanda e animações sem travamento. |
| Entrega | Seis pacotes independentes, documentação, relatórios dos dois críticos e validação final. |

Navegador: executar os fluxos principais em Chromium e, quando disponíveis, Firefox e WebKit. Screenshots reais nas larguras de celular e computador; console e rede inspecionados. Falta de um navegador não equivale a aprovação nesse navegador. Testes em emulador, navegador real de desktop, celular físico, banco real e AdSense aprovado devem ser distinguidos no relatório.

Testar todo o caminho: preencher → calcular/gerar → editar → salvar → recarregar → restaurar → imprimir/exportar. Menu inferior precisa navegar de verdade. Botões Pix/cookies e eventuais feedback/chat não podem impedir a ação principal quando abertos ou dispensados.

No caso do Pix, conferir payload e leitura sem enviar dinheiro. Validação por aplicativo bancário pode exigir participação do proprietário; não alegar pagamento real. No caso dos moldes, não alegar montagem física a partir apenas da prévia. No caso do AdSense, não alegar aprovação ou receita com espaços simulados.

Não finalizar como completo se existir função obrigatória vazia, erro de build, link principal quebrado, cálculo incorreto, quebra de consentimento, pagamento divergente ou problema de segurança conhecido. Pendências externas podem ser entregues como “aguarda configuração/validação externa”, com instruções exatas, sem transformar isso em alegação de produção validada.

## 25. Entregáveis e relatório final do orquestrador

Entregar os seis projetos completos nas pastas exatas, com código-fonte modular e pacote de publicação independente. Na documentação de cada um, incluir como executar, testar, compilar, publicar, alterar identidade/contato, configurar Pix, conectar AdSense e gerenciar privacidade.

Na documentação central, entregar:

- `matriz-de-requisitos.md`, ligando requisito a implementação e teste.
- `arquitetura-e-contratos.md` e `decisão-sobre-cadastro-e-servidor.md`.
- `convenções-e-exceções-técnicas.md` e `licenças-de-terceiros.md`.
- `proteções-e-limites-de-segurança.md`, incluindo limites de anticlonagem.
- `dados-que-o-proprietário-precisa-preencher.md`.
- `estado-da-execução.md` e `histórico-de-versões.md`.
- `parecer-crítico-segurança-e-correção.md`.
- `parecer-crítico-experiência-e-desempenho.md`.
- `relatório-final-do-orquestrador.md`, com testes, screenshots, resultados, riscos remanescentes e configuração pendente.

Se o usuário autorizar commits, incluir versão cronológica no título, por exemplo `v1.0.0 — estrutura inicial dos seis sites`, e registrar incremento coerente no histórico. Não fazer push ou publicação como consequência implícita de criar um commit. Não assumir controle de repositório pai para versionar esta pasta.

A resposta final deve ser em português, clara e curta: o que foi implementado, o que foi testado, onde estão os arquivos e o que falta para o proprietário conectar. Não despejar todo o código na conversa quando os arquivos já foram criados. Se precisar mostrar código, indicar caminho/nome e usar bloco específico de HTML, CSS, JavaScript, JSON etc., um arquivo por bloco, sem misturar linguagens.

Só atribuir trabalho a agentes realmente executados. Informar modelos efetivos e distinguir “implementado”, “testado”, “preparado para configuração”, “publicado” e “validado em produção”. Não garantir ausência absoluta de erros; entregar evidências e corrigir os problemas identificados.

## 26. Referências oficiais para conferir durante a execução

As referências sustentam a compatibilidade técnica; a arquitetura, os produtos e os critérios de aceite acima são a especificação deste projeto. Revalidar informações que possam ter mudado, sem expandir o escopo por causa de sugestões genéricas da documentação.

- Modelos e IDs: https://platform.claude.com/docs/en/models/overview
- Orientações de prompt para Opus 5: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5
- Subagentes: https://code.claude.com/docs/en/subagents
- Equipes: https://code.claude.com/docs/en/agent-teams
- Configuração de modelos: https://code.claude.com/docs/en/model-config
- Elegibilidade AdSense: https://support.google.com/adsense/answer/9724?hl=pt-BR
- ads.txt: https://support.google.com/adsense/answer/12171612?hl=pt-BR
- CSP e anúncios: https://support.google.com/adsense/answer/16283098?hl=en
- CMP nas regiões aplicáveis: https://support.google.com/adsense/answer/14893312?hl=en
- Integração TCF: https://support.google.com/adsense/answer/9804260?hl=en
- Tratamento de publicidade por idade: https://support.google.com/adsense/answer/3248194?hl=en
- Cookies, ANPD: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@display-file/file
- Pix, manual vigente: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
- Atualização Pix consultada: https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=769&tipo=Instru%C3%A7%C3%A3o+Normativa+BCB
- CSP, OWASP: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
- Áreas seguras de tela, MDN: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env
- Movimento reduzido, MDN: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion
- Métricas de experiência: https://web.dev/articles/vitals

## 27. Instrução de início

Comece lendo a raiz e registrando o ambiente real. Apresente brevemente a divisão de trabalho, os modelos disponíveis e a decisão de arquitetura. Em seguida, execute as fases com agentes reais, sem pedir aprovação para escolhas rotineiras já delimitadas. Preserve a navegação inferior no celular, o funcionamento completo no computador e a independência dos seis produtos. Continue até entregar a implementação, os dois pareceres críticos, as correções necessárias e a validação final do orquestrador.
