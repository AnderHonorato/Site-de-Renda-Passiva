# ORQUESTRAÇÃO MASTER — PORTAL DE FERRAMENTAS DO ANDER

> **Papel deste arquivo:** instrução operacional para o **Claude Opus 5**, que será o orquestrador principal do projeto.
>
> **Idioma obrigatório do projeto:** Português do Brasil (PT-BR).
>
> **Objetivo:** transformar o projeto atual em uma plataforma profissional de ferramentas online, com catálogo amplo, ferramentas realmente funcionais, UX simples, visual próprio, versão mobile completa, APK equivalente, autenticação, favoritos, planos, administração, notificações, anúncios administráveis, geração profissional de arquivos e banco de dados pronto para produção.
>
> **Regra central:** não considerar uma tarefa concluída apenas porque o código compila. O resultado precisa funcionar, estar visualmente coerente, ser responsivo, seguro, testado e pronto para publicação.

---

## 1. MISSÃO DO CLAUDE OPUS 5

Você é o **ORQUESTRADOR PRINCIPAL**.

Você deve:

1. analisar o projeto existente antes de alterar;
2. preservar funcionalidades que já funcionam;
3. dividir o trabalho em tarefas independentes;
4. chamar agentes especializados para executar essas tarefas;
5. evitar que agentes diferentes editem os mesmos arquivos simultaneamente;
6. consolidar o trabalho;
7. chamar **2 agentes críticos independentes** para revisar o resultado;
8. corrigir tudo que os críticos encontrarem;
9. executar uma segunda revisão quando houver correções relevantes;
10. validar o projeto inteiro;
11. executar testes reais;
12. fazer o commit final;
13. deixar o projeto publicável.

### Regra de economia de tokens

Não faça todo o trabalho sozinho.

Use agentes para tarefas especializadas e forneça a eles somente:
- arquivos necessários;
- contexto necessário;
- objetivo;
- critérios de aceitação;
- formato de entrega.

Não envie o repositório inteiro para cada agente.

Prefira:
- análises curtas;
- tarefas paralelas;
- relatórios estruturados;
- patches pequenos;
- reutilização de componentes;
- dados compartilhados entre agentes;
- evitar repetir pesquisas já realizadas.

---

# 2. HIERARQUIA DOS AGENTES

## ORQUESTRADOR

**Claude Opus 5**

Responsável por:
- planejamento;
- distribuição;
- integração;
- decisões arquiteturais;
- resolução de conflitos;
- revisão final;
- validação.

## AGENTES EXECUTORES

Criar agentes especializados conforme necessidade.

### Agente A — Auditor do projeto

Responsável por:
- mapear arquivos;
- descobrir stack;
- identificar frontend/backend;
- descobrir banco;
- detectar código quebrado;
- localizar duplicações;
- listar funcionalidades existentes;
- identificar riscos antes da alteração.

**Não deve implementar mudanças grandes.**

### Agente B — Catálogo e arquitetura das ferramentas

Responsável por:
- catalogar as ferramentas existentes;
- comparar ferramentas semelhantes;
- identificar duplicações;
- sugerir unificações;
- criar matriz das ferramentas;
- garantir nomes únicos;
- organizar categorias;
- propor ferramentas novas.

### Agente C — UX/UI

Responsável por:
- melhorar hierarquia visual;
- reduzir elementos excessivamente grandes;
- criar layouts que mostrem o essencial sem rolagem desnecessária;
- substituir excesso de cards quadrados;
- criar navegação por categorias;
- criar menus de ferramentas;
- melhorar cabeçalho;
- criar divisórias orgânicas/onduladas;
- definir profundidade, sombras, tons e estados;
- propor animações.

### Agente D — Sistema visual

Responsável por:
- identidade visual;
- logo;
- ícone principal;
- ícones SVG próprios;
- paleta;
- tipografia;
- espaçamento;
- componentes;
- estados hover/focus/active/loading/success/error;
- dark/light mode se compatível com o projeto.

**Não usar biblioteca de ícones genéricos como identidade principal.**

### Agente E — Ferramentas

Responsável por implementar/revisar grupos de ferramentas.

Dividir as 150 ferramentas em lotes.

Cada ferramenta deve ter:
- nome único;
- slug único;
- descrição;
- finalidade;
- formulário;
- validação;
- processamento;
- resultado;
- tratamento de erro;
- loading;
- conclusão;
- copiar;
- baixar quando aplicável;
- compartilhamento quando aplicável;
- seção "Como usar";
- exemplos quando fizer sentido;
- acessibilidade básica;
- funcionamento mobile.

### Agente F — Documentos e exportações

Responsável por:
- PDF;
- impressão;
- TXT;
- CSV;
- XLSX/Excel;
- imagens;
- convites;
- folhas;
- currículos;
- documentos visuais;
- relatórios.

**Regra:** não usar apenas o "imprimir do navegador" como produto final quando a ferramenta promete documento.

Todo documento exportado precisa:
- respeitar tamanho de página;
- margens;
- quebras;
- cabeçalho/rodapé quando necessário;
- conteúdo não cortado;
- boa hierarquia;
- tipografia legível;
- aparência profissional;
- preview antes de exportar quando fizer sentido.

### Agente G — Conta, login e favoritos

Responsável por:
- cadastro;
- login;
- sessão;
- recuperação de conta;
- perfil;
- favoritos;
- histórico;
- sincronização;
- proteção de rotas;
- logout;
- estados de carregamento.

### Agente H — Planos e acesso

Responsável por:
- plano gratuito;
- planos pagos;
- permissões;
- bloqueio de recursos avançados;
- tela de planos;
- estados "recurso premium";
- mensagens claras;
- impedir bypass apenas no frontend.

### Agente I — Admin

Responsável por painel administrativo.

O administrador principal deve poder:
- moderar usuários;
- bloquear/desbloquear;
- excluir contas;
- visualizar usuários;
- enviar avisos;
- enviar mensagens;
- administrar banners;
- administrar popup;
- administrar campanhas;
- editar textos;
- controlar ferramentas;
- controlar categorias;
- controlar planos;
- visualizar logs relevantes.

### Agente J — Notificações e mensagens

Separar claramente:

**Notificações do sistema**
- aviso;
- atualização;
- manutenção;
- segurança;
- mudança de recurso;
- mensagem administrativa geral.

**Mensagens**
- comunicação direcionada ao usuário;
- mensagens do administrador;
- histórico;
- lido/não lido.

Criar ícone de notificações e área própria.

### Agente K — Mobile/APK

Responsável por:
- versão mobile;
- navegação inferior;
- menus adaptados;
- touch;
- telas pequenas;
- teclado virtual;
- orientação;
- PWA/empacotamento Android conforme arquitetura;
- APK com aparência e comportamento equivalentes ao site.

O APK não deve ser uma versão abandonada ou uma tela web quebrada dentro de um container.

### Agente L — Segurança/LGPD

Responsável por:
- autenticação;
- autorização;
- sessão;
- cookies;
- CSRF quando aplicável;
- XSS;
- SQL injection;
- validação de entradas;
- upload seguro;
- limites;
- rate limiting;
- proteção de endpoints;
- exposição de dados;
- exclusão de conta;
- consentimentos;
- política de privacidade;
- direitos do titular;
- minimização de dados;
- logs sem dados desnecessários.

**Não declarar "LGPD compliant" apenas porque existem páginas de política.**

### Agente M — Performance

Responsável por:
- bundle;
- lazy loading;
- imagens;
- fontes;
- cache;
- carregamento de ferramentas;
- reduzir JS inicial;
- evitar dependências desnecessárias;
- medir Core Web Vitals quando possível.

### Agente N — QA/Testes

Responsável por testar:
- desktop;
- tablet;
- mobile;
- navegação;
- ferramentas;
- login;
- favoritos;
- planos;
- admin;
- exportações;
- notificações;
- erros;
- estados vazios;
- loading;
- acessibilidade básica.

### Agente O — Conteúdo

Responsável por revisar textos.

Remover:
- textos falando com desenvolvedor;
- mensagens de implementação;
- frases otimistas sem informação;
- conteúdo repetido;
- placeholders;
- "em breve" sem necessidade;
- promessas não implementadas.

Escrever de forma:
- clara;
- brasileira;
- objetiva;
- profissional;
- verificável.

---

# 3. OS DOIS AGENTES CRÍTICOS

Depois dos agentes executores terminarem, o Opus deve chamar:

## CRÍTICO 1 — QA Técnico e Segurança

Deve verificar:

- bugs;
- funcionalidades quebradas;
- rotas;
- banco;
- autenticação;
- autorização;
- vazamento de dados;
- XSS;
- injeções;
- uploads;
- permissões;
- APIs;
- inconsistências;
- erros no console;
- erros de rede;
- estados de loading;
- estados de erro;
- exportações;
- mobile;
- performance.

### Saída obrigatória

```text
STATUS: APROVADO | REPROVADO

CRÍTICOS:
- ...

IMPORTANTES:
- ...

MELHORIAS:
- ...

ARQUIVOS AFETADOS:
- ...

CORREÇÕES OBRIGATÓRIAS:
- ...
```

Se existir problema crítico, **REPROVADO**.

---

## CRÍTICO 2 — UX/UI e Produto

Deve verificar:

- visual quebrado;
- excesso de espaço;
- elementos grandes demais;
- contraste;
- consistência;
- navegação;
- menus;
- responsividade;
- mobile;
- cards;
- ícones;
- animações;
- loading;
- textos;
- hierarquia;
- excesso de informações;
- acessibilidade;
- experiência real de uso.

Também deve abrir ferramentas e verificar se elas realmente são utilizáveis.

### Saída obrigatória

```text
STATUS: APROVADO | REPROVADO

PROBLEMAS VISUAIS:
- ...

PROBLEMAS DE UX:
- ...

PROBLEMAS MOBILE:
- ...

PROBLEMAS DE CONTEÚDO:
- ...

CORREÇÕES OBRIGATÓRIAS:
- ...

MELHORIAS OPCIONAIS:
- ...
```

---

# 4. REGRA DE BLOQUEIO DOS CRÍTICOS

Se **qualquer crítico** reprovar:

1. Opus não finaliza.
2. Opus transforma cada problema em tarefa.
3. Chama os agentes responsáveis.
4. Corrige.
5. Testa novamente.
6. Chama os críticos novamente nos pontos afetados.
7. Só continua quando os problemas críticos estiverem resolvidos.

Não ignorar uma reprovação simplesmente porque "o código funciona".

---

# 5. PROCESSO DE EXECUÇÃO

## FASE 0 — BACKUP

Antes de modificar:

- verificar branch;
- verificar estado Git;
- criar branch de trabalho;
- garantir recuperação do estado anterior.

### Checkpoint

```bash
git status
git branch
git add .
git commit -m "checkpoint: estado inicial antes da grande atualização"
```

Não apagar código antigo sem necessidade.

---

# 6. FASE 1 — AUDITORIA

Checklist:

- [ ] mapear projeto
- [ ] identificar stack
- [ ] identificar banco
- [ ] identificar APIs
- [ ] identificar autenticação
- [ ] listar páginas
- [ ] listar ferramentas
- [ ] listar componentes
- [ ] listar arquivos grandes
- [ ] encontrar duplicações
- [ ] encontrar código morto
- [ ] verificar erros atuais
- [ ] verificar responsividade
- [ ] verificar publicação atual

### Salvar relatório

Criar:

```text
docs/auditoria-projeto.md
```

### Commit

```bash
git add .
git commit -m "docs: auditoria inicial do projeto"
```

---

# 7. FASE 2 — CATÁLOGO DAS 150 FERRAMENTAS

Objetivo:

**150 ferramentas únicas e úteis.**

Não criar 150 variações artificiais da mesma ferramenta.

Exemplo ruim:

- Calculadora de porcentagem
- Calculadora de porcentagem simples
- Calculadora de porcentagem avançada
- Calculadora de porcentagem rápida

Se a diferença puder ser resolvida dentro da mesma ferramenta, **unificar**.

Exemplo melhor:

**Calculadora de Porcentagem**
- porcentagem de um valor;
- aumento;
- desconto;
- diferença percentual;
- margem;
- comparação.

---

# 8. MATRIZ OBRIGATÓRIA DE FERRAMENTAS

Criar:

```text
docs/catalogo-ferramentas.md
```

Cada ferramenta deve ter:

| Campo | Obrigatório |
|---|---|
| ID | Sim |
| Nome | Sim |
| Slug | Sim |
| Categoria | Sim |
| Descrição | Sim |
| Problema resolvido | Sim |
| Entrada | Sim |
| Processamento | Sim |
| Saída | Sim |
| Exportação | Quando aplicável |
| Plano | Sim |
| Mobile | Sim |
| Status | Sim |
| Duplicada? | Sim |
| Ferramenta unificada? | Sim |

---

# 9. CATÁLOGO DE REFERÊNCIA: FERRAMENTAS JÁ

A pesquisa realizada identificou **103 ferramentas** na página pública consultada em 19/09/2026.

Fonte:
https://www.ferramentasja.com.br/views/ferramentas

Use esta lista como **referência de cobertura e ideias**, não como conteúdo para copiar literalmente.

## Consultas e Verificações

1. Consulta de CNPJ — consultar dados públicos de empresas por CNPJ.
2. Consulta CEP do Brasil — obter endereço por CEP.
3. Consulta Localização de IP — estimar localização e dados de IP.
4. Qual é o meu IP? — descobrir IP público.
5. Validador de CNPJ — validar matematicamente CNPJ.
6. Validador de CPF — validar matematicamente CPF.
7. Ver Localização de Foto — extrair GPS/metadados de imagem.

## Segurança

8. Gerador de Senhas Fortes — gerar senhas personalizadas.
9. Gerador de Senhas Wi-Fi — gerar senha para rede Wi-Fi.
10. Gerador de PIN Aleatório — gerar PIN numérico.
11. Verificador de Força de Senha — analisar força de senha.
12. Criptografia de Texto AES-256 — criptografar/descriptografar texto.
13. Gerador de Senhas e Chaves Criptográficas — gerar segredos/chaves usando Web Crypto.

## Matemática

14. Calculadora de Regra de Três — resolver proporções.
15. Calculadora de Porcentagem — calcular porcentagem, desconto e acréscimo.

## Data e Hora

16. Calculadora de Datas — diferenças e operações com datas.
17. Contador de Dias Personalizado — acompanhar datas.
18. Calculadora de Dias Úteis — somar dias úteis considerando feriados.
19. Cronômetro Online — cronômetro progressivo/regressivo.
20. Calculadora de Idade Detalhada — idade em várias unidades.
21. Calculadora de Horas — somar/subtrair horários.
22. Descobrir Dia da Semana por Data — descobrir dia da semana.
23. Calendário Interativo — navegar por calendário.
24. Consulta de Estação do Ano — descobrir estação por data.
25. Dia do Ano — posição da data no ano.
26. Calculadora de Semana do Ano — semana do ano.

## Texto

27. Contador de Caracteres — contar caracteres, palavras e parágrafos.
28. Corretor Ortográfico — corrigir ortografia PT-BR.
29. Removedor de Acentos — remover acentos.
30. Inversor de Texto — inverter texto.
31. Extrair Texto da Imagem — OCR.
32. Maiúsculo, Minúsculo e Capitalizado — alterar capitalização.
33. Removedor de Linhas Duplicadas — remover duplicidades.
34. Ordenador de Lista — ordenar listas.
35. Emojis para Copiar e Colar — pesquisar/copiar emojis.
36. Remover Formatação de Texto — limpar formatação.
37. Removedor de Palavras e Trechos — remover padrões.
38. Comparador Diff de Texto e Código — comparar textos/códigos.

## Conversores

39. Conversor de Unidades — converter medidas.
40. Extrair Áudio de Vídeo — extrair áudio.
41. Conversor de Números Romanos e Decimais — converter formatos numéricos.

## Design

42. Gerador de QR Code — gerar QR Code.
43. Seletor de Cores — escolher e converter cores.
44. Redimensionador de Imagens — redimensionar.
45. Compactador de Imagens — reduzir tamanho.
46. Conversor de Imagens para WebP — converter para WebP.
47. Converter Imagem em SVG — vetorizar imagem.
48. Conversor de Imagem para PNG — converter para PNG.
49. Gerador de ICO — gerar ICO.
50. Validador de Ícones ICO — analisar ICO/favicon.
51. Trocador de Cor PNG — substituir cores.
52. Analisador de Imagens — dimensões, tamanho, EXIF e metadados.
53. Conversor HEIC para JPG — converter HEIC/HEIF.
54. Remover EXIF e Metadados — limpar metadados.
55. Visualizador de SVG — visualizar SVG.
56. Converter Foto para Preto e Branco — escala de cinza.
57. Conversor de SVG para PNG — rasterizar SVG.
58. Conversor de PDF em Imagens PNG — converter páginas de PDF.
59. Conversor de PowerPoint em Imagens PNG — converter slides.

## Inteligência Artificial

60. Calculadora de Tokens de IA — estimar tokens.
61. Comparador de Tokens de IA — comparar uso de tokens.

## Desenvolvimento

62. Codificador/Decodificador Base64 — Base64.
63. Codificador de Texto — ASCII, binário, hexadecimal, etc.
64. Extrator de Código SVG — extrair SVG.
65. Visualizador de XML — abrir/formatar XML.
66. Teste de Webhook Interativo — testar GET/POST.
67. Gerador de Link para WhatsApp — gerar wa.me.
68. Conversor de Timestamp Unix — Unix timestamp.
69. Verificador Open Graph — validar OG/Twitter Cards.
70. Explorador SQLite — explorar SQLite no navegador.
71. Validador e Formatador de JSON — validar/formatar/minificar JSON.
72. Minificar CSS — minificar CSS.

## Finanças

73. Conversor de Moedas — converter moedas.
74. Consulta de Salário Mínimo — consultar histórico.
75. Calculadora de Juros — juros simples/compostos.
76. Simulador de Poupança — simular evolução.
77. Simulador Rumo ao Primeiro Milhão — simular objetivo financeiro.
78. Número por Extenso — converter número em texto.
79. Gerador de QR Code Pix — gerar cobrança Pix.

## Economia

80. Calculadora Gasolina ou Etanol — comparar combustível.
81. Calculadora de Consumo de Combustível — km/l e custo.
82. Simulador de Custo para Carregar Carro Elétrico — custo de recarga.
83. Comparador de Preços de Embalagens — custo por unidade.
84. Calculadora de Preço Proporcional — proporcionalidade de preço.
85. Simulador de Consumo de Energia Elétrica — custo de aparelhos.
86. Calculadora de Preço Médio Ponderado — custo médio de estoque.
87. Calculadora de Preço de Venda — markup/margem/lucro.
88. Calculadora IPCA Brasil — atualização monetária.
89. Calculadora de Investimento para Renda Mensal — capital necessário.
90. Gerador de Custo de Produto — custo de produção.

## Produtividade

91. Timer Pomodoro — ciclos de foco e pausa.

## Saúde e Bem-estar

92. Calculadora de IMC — IMC.
93. Calculadora de Peso Ideal — faixa de referência.
94. Calculadora de Água Diária — estimativa de hidratação.

## Sorteios

95. Sorteador de Números — números aleatórios.
96. Gerador de Números 1–60 — jogos aleatórios.
97. Sorteador de Nomes — sortear participantes.
98. Sorteador de Times — dividir participantes.

## Trabalho e RH

99. Calculadora de Carga Horária por Intervalos — carga horária.
100. Gerador de Currículos — currículo e PDF.

## Família

101. Gerador de Árvore Genealógica — diagrama familiar.

## Jogos

102. Jogar Dados 3D — dados com animação.
103. Jogo da Velha Infinito — jogo da velha expandido.

### Regra sobre os 103

Não copie o FerramentasJá.

Use a lista para:
- identificar lacunas;
- comparar funcionalidades;
- decidir quais ferramentas são redundantes;
- criar versões mais completas;
- criar ferramentas que resolvam problemas reais.

A página consultada informa 103 ferramentas e 17 categorias. A própria página apresenta recursos como favoritos, planos, login e processamento local para diversas ferramentas.

---

# 10. REFERÊNCIAS VISUAIS E DE UX

## Referência principal visual

https://anderhonorato.github.io/Site-de-Renda-Passiva/portal/

Características que devem ser preservadas como inspiração:
- simplicidade;
- busca;
- ferramentas organizadas;
- recentes;
- categorias;
- aparência limpa;
- acesso rápido.

O objetivo **não é clonar** o site.

É criar uma evolução visual e funcional dele.

## Referência de página de ferramenta

https://www.ferramentasja.com.br/app/comparador-embalagens

Observar especialmente:
- título;
- descrição;
- ferramenta;
- ações;
- "Como usar";
- passo a passo;
- exemplos;
- situações ideais;
- FAQ;
- ferramentas relacionadas.

A página de referência apresenta uma seção "Como comparar preços de embalagens" com passo a passo, exemplos, recursos inteligentes e FAQ. Reproduzir o **conceito de documentação contextual**, não o texto.

## Referência de planos

https://www.ferramentasja.com.br/views/planos

Usar como inspiração para:
- diferenciação de recursos;
- recursos premium;
- página de planos;
- benefícios;
- gerenciamento de assinatura.

Não copiar textos, identidade ou implementação.

## Referência de login

https://www.ferramentasja.com.br/login

Criar fluxo de autenticação próprio e completo.

## Referência de favoritos

https://www.ferramentasja.com.br/dashboard/meus-favoritos

A ideia importante é:
- favoritos locais;
- favoritos sincronizados;
- filtros;
- conta;
- limite para usuário sem login;
- área pessoal.

---

# 11. DIRETRIZES VISUAIS DO NOVO PROJETO

## Layout

Evitar:
- cards quadrados em excesso;
- blocos enormes;
- excesso de branco;
- títulos gigantes;
- ferramentas que exigem rolagem para chegar à ação principal;
- aparência genérica de dashboard.

Preferir:
- blocos horizontais;
- listas inteligentes;
- grupos;
- painéis compactos;
- grids assimétricos quando fizer sentido;
- densidade visual equilibrada;
- hierarquia.

### Regra da primeira viewport

Nas telas principais:

**o usuário deve entender o que fazer sem precisar rolar.**

Prioridade:
1. ação principal;
2. busca;
3. ferramenta/categoria;
4. informação secundária.

---

# 12. CORES E PROFUNDIDADE

Não deixar tudo com a mesma cor.

Criar sistema de design com:
- cor principal;
- cor secundária;
- superfícies;
- fundo;
- borda;
- texto;
- texto secundário;
- sucesso;
- alerta;
- erro;
- informação.

Criar profundidade com:
- variações tonais;
- sombras discretas;
- bordas;
- transparências moderadas;
- gradientes pequenos quando fizer sentido;
- estados de interação.

Não transformar o site em um carnaval de gradientes.

---

# 13. ÍCONES

Criar conjunto próprio de SVG.

Regras:
- consistência de espessura;
- mesma linguagem geométrica;
- boa leitura em tamanhos pequenos;
- versões para categorias;
- versões para ações;
- ícone principal do site;
- favicon/app icon.

Não usar emoji como ícone principal da interface.

---

# 14. DIVISÓRIAS

Evitar divisórias retas em toda a página.

Criar:
- ondas SVG;
- curvas;
- recortes;
- transições orgânicas;
- linhas discretas.

Usar com moderação.

---

# 15. ANIMAÇÕES

Adicionar animações onde agreguem feedback.

Exemplos:
- entrada de página;
- aparecimento ao rolar;
- hover;
- botão;
- abertura de modal;
- troca de resultado;
- loading;
- progresso;
- conclusão;
- notificações;
- menus.

Evitar:
- animação em absolutamente tudo;
- efeitos que atrapalhem produtividade;
- animações pesadas em celular.

---

# 16. SISTEMA DE LOADING

Toda operação relevante deve possuir estado:

```text
iniciando
↓
processando
↓
100%
↓
concluído
```

Mesmo quando o processamento for instantâneo, pode existir uma microanimação de feedback.

Não fingir que uma operação demorada aconteceu se ela não aconteceu.

Exemplo visual:

```text
Preparando arquivo...
[████████░░] 80%

Finalizando...
[██████████] 100%

✓ Concluído
```

---

# 17. MOBILE

O mobile não é uma adaptação posterior.

Criar desde o início.

Obrigatório:
- navegação inferior;
- botão de ferramentas;
- busca;
- favoritos;
- perfil;
- menu;
- touch targets adequados;
- inputs adequados;
- resultados legíveis;
- exportações funcionando;
- modais adaptados;
- teclado não cobrindo campos;
- tabelas responsivas;
- ferramentas utilizáveis com uma mão quando possível.

---

# 18. APK

Criar aplicativo Android equivalente ao site.

Prioridade:
1. mesma identidade;
2. mesma navegação;
3. mesmas ferramentas;
4. mesma conta;
5. mesmos favoritos;
6. notificações;
7. comportamento consistente.

A solução técnica pode ser escolhida pelo agente conforme a stack, mas deve evitar duplicação desnecessária de toda a aplicação.

---

# 19. CHAT FLUTUANTE

Adicionar chat flutuante.

Estados:
- fechado;
- botão;
- aberto;
- minimizado;
- digitando;
- resposta;
- erro;
- offline.

O chat deve poder:
- orientar o usuário;
- ajudar a encontrar ferramentas;
- explicar uma ferramenta;
- direcionar para páginas.

Não expor informações administrativas.

---

# 20. CADASTRO E CONTA

Criar:

- cadastro;
- login;
- logout;
- recuperação;
- sessão;
- perfil;
- exclusão de conta;
- preferências;
- favoritos;
- histórico quando aplicável.

OAuth pode ser adicionado conforme credenciais reais disponíveis.

Não simular integração externa como se estivesse funcionando.

---

# 21. ADMINISTRADOR

Criar área:

```text
/admin
```

Somente administrador autorizado.

Recursos:

### Usuários
- listar;
- buscar;
- visualizar;
- bloquear;
- desbloquear;
- excluir;
- histórico administrativo necessário;
- status.

### Ferramentas
- criar;
- editar;
- ativar/desativar;
- categoria;
- plano;
- destaque;
- ordem.

### Conteúdo
- banners;
- popup;
- textos;
- avisos;
- mensagens.

### Sistema
- métricas;
- erros;
- logs;
- saúde do sistema.

---

# 22. LGPD

Implementar tecnicamente, não apenas textualmente.

Deve existir:

- política de privacidade;
- termos;
- cookies quando necessários;
- consentimentos;
- minimização;
- exclusão de conta;
- tratamento de dados;
- transparência;
- controles administrativos;
- proteção de dados.

Antes de declarar conformidade, validar juridicamente o escopo.

---

# 23. POPUP DE PROPAGANDA

Criar sistema administrável.

Popup pode conter:
- imagem;
- vídeo;
- texto;
- título;
- CTA;
- link;
- carrossel;
- botão fechar;
- tempo;
- prioridade;
- ativo/inativo;
- período;
- frequência;
- segmentação quando implementada.

Regra:
- primeira vez em algumas horas;
- não abrir repetidamente a cada página;
- respeitar estado do usuário;
- permitir configuração pelo admin.

---

# 24. BANNER DE NOTÍCIAS/AVISOS

Criar faixa/carrossel.

Exemplo:

```text
[←] Nova ferramenta disponível · Saiba mais [→]
```

Admin pode:
- criar;
- editar;
- excluir;
- ordenar;
- adicionar link;
- ativar/desativar;
- definir duração;
- inserir vários itens.

No celular:
- mostrar um item por vez;
- permitir toque;
- animação suave.

---

# 25. NOTIFICAÇÕES

Criar:

## Notificações do sistema
- atualizações;
- manutenção;
- segurança;
- novidades;
- avisos.

## Mensagens
- mensagens diretas do admin;
- conversas;
- histórico.

Nunca misturar os dois conceitos visualmente.

---

# 26. FAVORITOS

Usuário não logado:
- favoritos locais;
- limite configurável.

Usuário logado:
- favoritos sincronizados;
- ilimitados conforme plano;
- ordenação;
- pesquisa;
- categorias.

Ao fazer login:
- oferecer fusão dos favoritos locais com a conta.

---

# 27. PLANOS

Criar controle real de permissões.

Exemplo:

### Gratuito
- ferramentas básicas;
- limite de alguns recursos;
- anúncios.

### Plus
- recursos avançados;
- limites maiores;
- menos anúncios ou sem anúncios;
- favoritos ampliados;
- ferramentas premium.

### Premium/Pro
Somente se fizer sentido econômico.

O bloqueio deve existir no backend.

Não confiar apenas em:
```js
if (premium) ...
```

no frontend.

---

# 28. FERRAMENTAS COMPLEXAS

Adicionar ferramentas mais sofisticadas e úteis.

Possíveis grupos:

- documentos;
- PDF;
- finanças;
- produtividade;
- ecommerce;
- marketing;
- programação;
- imagens;
- áudio/vídeo;
- planejamento;
- pequenas empresas;
- RH;
- estudos;
- organização pessoal.

Priorizar utilidade real.

---

# 29. "COMO USAR"

Toda ferramenta que não for autoexplicativa deve possuir:

## Como usar

1. o que informar;
2. onde informar;
3. qual botão usar;
4. como interpretar o resultado;
5. como exportar;
6. exemplos.

## Exemplo

Mostrar exemplo realista e curto.

## Perguntas frequentes

Somente quando houver perguntas plausíveis.

Não criar FAQ artificial apenas para preencher espaço.

---

# 30. ARQUITETURA DE ARQUIVOS

O usuário prefere:

- cada função em seu arquivo;
- HTML separado;
- CSS separado;
- JS separado;
- código organizado;
- arquivos pequenos;
- PT-BR.

Não criar centenas de pastas sem necessidade.

Também não criar um arquivo monolítico com milhares de linhas.

Buscar equilíbrio.

Exemplo:

```text
ferramentas/
  calculadora-porcentagem/
    index.html
    style.css
    script.js

  comparador-precos/
    index.html
    style.css
    script.js
```

Componentes compartilhados podem ser reutilizados quando isso não comprometer a clareza.

---

# 31. BANCO DE DADOS

Banco deve estar funcional.

Validar:
- schema;
- migrations;
- seed;
- relações;
- índices;
- constraints;
- usuários;
- sessões;
- favoritos;
- ferramentas;
- planos;
- assinaturas;
- notificações;
- mensagens;
- banners;
- popups;
- logs.

Não deixar:

```text
TODO: conectar banco
```

ou banco falso em produção.

---

# 32. EXPORTAÇÃO

Criar sistema de exportação reutilizável.

Tipos:

- PDF;
- impressão;
- TXT;
- CSV;
- Excel/XLSX;
- PNG/JPG quando aplicável;
- JSON;
- SVG.

Cada ferramenta deve declarar quais formatos suporta.

---

# 33. QUALIDADE DO CONTEÚDO

Revisar o site inteiro.

Remover frases como:
- "estamos desenvolvendo";
- "o desenvolvedor precisa";
- "backend ainda será conectado";
- "em breve" sem contexto;
- promessas não implementadas;
- texto duplicado;
- marketing exagerado.

Substituir por informação objetiva.

---

# 34. NOMES ÚNICOS

Criar validação automática.

Não permitir:
- nome duplicado;
- slug duplicado;
- ID duplicado;
- categoria duplicada sem intenção.

Antes de criar ferramenta nova:

```text
1. pesquisar catálogo;
2. comparar objetivo;
3. verificar sobreposição;
4. decidir:
   - manter separada
   - unificar
   - ampliar ferramenta existente
5. registrar decisão.
```

---

# 35. CHECKPOINTS GIT

Criar commit ao finalizar cada grande fase.

## Checkpoint 1

```bash
git commit -m "checkpoint: auditoria inicial"
```

## Checkpoint 2

```bash
git commit -m "feat: nova identidade e arquitetura visual"
```

## Checkpoint 3

```bash
git commit -m "feat: catálogo e ferramentas principais"
```

## Checkpoint 4

```bash
git commit -m "feat: contas favoritos e planos"
```

## Checkpoint 5

```bash
git commit -m "feat: painel administrativo notificacoes e campanhas"
```

## Checkpoint 6

```bash
git commit -m "feat: mobile e aplicativo Android"
```

## Checkpoint 7

```bash
git commit -m "test: validacao completa e correcoes finais"
```

Nunca esperar o final para fazer o primeiro commit.

---

# 36. PROTOCOLO DE AGENTES PARA EVITAR CONFLITOS

Antes de chamar um agente, o Opus deve registrar:

```text
AGENTE:
TAREFA:
ARQUIVOS QUE PODE ALTERAR:
ARQUIVOS QUE NÃO PODE ALTERAR:
DEPENDÊNCIAS:
SAÍDA ESPERADA:
```

Dois agentes não podem editar simultaneamente o mesmo arquivo.

Se duas tarefas precisarem do mesmo arquivo:
- executar em sequência;
- ou criar uma camada intermediária;
- ou um agente cria a base e outro integra.

---

# 37. EXECUÇÃO PARALELA

Pode executar em paralelo quando houver independência.

Exemplo:

```text
Agente Catálogo
      +
Agente Segurança
      +
Agente Conteúdo
      +
Agente Performance
      ↓
      Opus integra
      ↓
Críticos 1 + 2
```

Não paralelizar tarefas que dependem do resultado de outra.

---

# 38. CRITÉRIOS DE ACEITAÇÃO DAS FERRAMENTAS

Uma ferramenta só está concluída se:

- [ ] abre;
- [ ] interface aparece corretamente;
- [ ] inputs funcionam;
- [ ] valida entrada;
- [ ] calcula/processa corretamente;
- [ ] mostra resultado;
- [ ] trata erro;
- [ ] possui loading;
- [ ] possui conclusão;
- [ ] funciona no mobile;
- [ ] não gera erro no console;
- [ ] exportação funciona quando prometida;
- [ ] texto está correto;
- [ ] nome é único;
- [ ] slug é único;
- [ ] plano está respeitado;
- [ ] segurança foi verificada.

---

# 39. TESTE VISUAL

Testar pelo menos:

- desktop largo;
- desktop comum;
- tablet;
- celular pequeno;
- celular grande.

Verificar:
- cortes;
- overflow;
- botões;
- menus;
- modais;
- tabelas;
- gráficos;
- inputs;
- teclado;
- rodapé;
- navegação inferior.

---

# 40. TESTE FINAL DO OPUS

Antes de finalizar, responder internamente:

### Produto
- Todas as principais funções funcionam?
- Existem ferramentas duplicadas?
- Os nomes são únicos?
- O catálogo está organizado?

### Visual
- A primeira viewport está bem aproveitada?
- O site não está gigante?
- Os cards não dominam tudo?
- Os ícones são próprios?
- Há profundidade visual?
- As divisórias são interessantes?
- As animações ajudam?

### Mobile
- Tudo funciona?
- O rodapé/navegação funciona?
- Os botões são tocáveis?
- Exportações funcionam?

### Segurança
- Usuário consegue acessar admin?
- Usuário consegue burlar plano pelo frontend?
- Dados sensíveis aparecem indevidamente?
- APIs estão protegidas?
- Inputs são validados?

### Conta
- Cadastro funciona?
- Login funciona?
- Logout funciona?
- Favoritos funcionam?
- Exclusão funciona?

### Admin
- Usuários?
- Ferramentas?
- Banners?
- Popup?
- Mensagens?
- Notificações?

### Exportação
- PDF?
- Excel?
- TXT?
- Print?
- Imagens?

### Publicação
- build?
- migrations?
- env?
- banco?
- rotas?
- deploy?

---

# 41. DEFINITION OF DONE

O projeto somente pode ser considerado finalizado quando:

- [ ] auditoria realizada
- [ ] backup/branch criado
- [ ] arquitetura revisada
- [ ] catálogo revisado
- [ ] duplicações resolvidas
- [ ] 150 ferramentas planejadas/implementadas conforme escopo
- [ ] nomes únicos
- [ ] identidade visual criada
- [ ] logo criada
- [ ] ícones SVG próprios
- [ ] desktop funcionando
- [ ] mobile funcionando
- [ ] APK funcionando conforme escopo
- [ ] loading implementado
- [ ] estados de conclusão implementados
- [ ] cadastro funcionando
- [ ] login funcionando
- [ ] favoritos funcionando
- [ ] planos funcionando
- [ ] bloqueio de recursos seguro
- [ ] admin funcionando
- [ ] mensagens funcionando
- [ ] notificações funcionando
- [ ] popup administrável
- [ ] banners administráveis
- [ ] chat funcionando
- [ ] LGPD técnica revisada
- [ ] exportações revisadas
- [ ] PDF revisado
- [ ] Excel revisado
- [ ] impressão revisada
- [ ] textos revisados
- [ ] documentação "Como usar" adicionada
- [ ] erros de console resolvidos
- [ ] testes executados
- [ ] crítico técnico aprovado
- [ ] crítico UX aprovado
- [ ] correções pós-crítica realizadas
- [ ] build final aprovado
- [ ] Git limpo
- [ ] commit final realizado
- [ ] instruções de publicação documentadas

---

# 42. REGRA FINAL DO ORQUESTRADOR

Não finalize porque "parece bom".

Finalize somente quando:

```text
EXECUÇÃO
   ↓
INTEGRAÇÃO
   ↓
TESTE
   ↓
CRÍTICO TÉCNICO
   ↓
CRÍTICO UX/UI
   ↓
CORREÇÕES
   ↓
RETESTE
   ↓
VALIDAÇÃO OPUS 5
   ↓
BUILD FINAL
   ↓
COMMIT FINAL
```

Se houver conflito entre velocidade e qualidade:

**priorize uma implementação menor porém realmente funcional em vez de dezenas de telas falsas.**

Se houver conflito entre quantidade e duplicação:

**prefira unificar ferramentas semelhantes e tornar cada ferramenta mais completa.**

Se houver conflito entre aparência e usabilidade:

**preserve usabilidade.**

Se houver conflito entre animação e performance:

**preserve performance.**

Se houver conflito entre facilidade e segurança:

**preserve segurança.**

---

# 43. REGISTRO DE DECISÕES

Criar:

```text
docs/decisoes-projeto.md
```

Registrar apenas decisões relevantes:

```text
DATA:
DECISÃO:
MOTIVO:
ALTERNATIVAS:
IMPACTO:
```

Não registrar cadeia de pensamento privada dos agentes.

Registrar apenas decisões técnicas e justificativas objetivas.

---

# 44. RELATÓRIO FINAL

No final, gerar:

```text
docs/relatorio-final.md
```

Com:

- resumo;
- funcionalidades implementadas;
- ferramentas;
- ferramentas unificadas;
- problemas corrigidos;
- segurança;
- testes;
- limitações reais;
- variáveis de ambiente necessárias;
- instruções de deploy;
- próximos passos.

Não esconder limitações.

Não declarar que algo funciona se não foi testado.

---

# 45. RESULTADO ESPERADO

O resultado deve parecer um **produto real**, não um projeto de demonstração.

O usuário deve conseguir entrar e pensar:

> "Eu sei o que posso fazer aqui."

E, ao abrir uma ferramenta:

> "Eu sei exatamente o que informar, o que vai acontecer e como obter o resultado."

Esse é o padrão de qualidade.

---

## REFERÊNCIAS

- Portal visual: https://anderhonorato.github.io/Site-de-Renda-Passiva/portal/
- Ferramentas Já: https://www.ferramentasja.com.br/
- Catálogo: https://www.ferramentasja.com.br/views/ferramentas
- Comparador de embalagens: https://www.ferramentasja.com.br/app/comparador-embalagens
- Planos: https://www.ferramentasja.com.br/views/planos
- Login: https://www.ferramentasja.com.br/login
- Favoritos: https://www.ferramentasja.com.br/dashboard/meus-favoritos

**Observação de pesquisa:** o catálogo público consultado apresentou 103 ferramentas na data da análise. A especificação deste projeto estabelece 150 ferramentas únicas como meta própria, e não como obrigação de copiar ou reproduzir o catálogo de referência.


---

# 46. EXPANSÃO V2 — FERRAMENTAS CORPORATIVAS, OFFICE E USO DIÁRIO

## OBJETIVO DESTA EXPANSÃO

Não reduza, substitua ou reescreva as especificações anteriores.

Esta seção é um **acréscimo obrigatório** ao prompt existente.

O portal deve evoluir de um conjunto de utilitários para uma **plataforma de ferramentas digitais para trabalho, empresa, estudos, documentos, produtividade, dados e tarefas do dia a dia**.

A referência deixa de ser apenas "sites de ferramentas rápidas".

A nova referência é uma combinação de:

- utilitários rápidos;
- ferramentas de escritório;
- documentos;
- PDF;
- planilhas;
- dados;
- produtividade;
- administração;
- financeiro;
- vendas;
- atendimento;
- RH;
- marketing;
- programação;
- mídia;
- organização pessoal;
- pequenas empresas;
- automação;
- IA aplicada a tarefas;
- ferramentas para celular.

A pesquisa de referências mostrou que plataformas maduras já concentram fluxos muito maiores do que simples conversores. O Adobe Acrobat, por exemplo, reúne conversão, edição, organização, OCR, assinatura, proteção, formulários e recursos de IA para PDF. citeturn0search0turn0search6

O Google Workspace demonstra outro padrão importante: documentos, planilhas, apresentações, formulários, armazenamento, agenda, tarefas, colaboração, administração e automação precisam funcionar como um ecossistema conectado. citeturn1search0turn1search3

A HubSpot demonstra uma terceira referência: ferramentas para CRM, formulários, tickets, chat, pipeline, reuniões, relatórios, marketing, vendas, atendimento e operações. citeturn1search1turn1search14

Use essas referências como **inspiração funcional**, nunca como cópia visual ou de código.

---

# 47. PRINCÍPIO CENTRAL: "RESOLVER O TRABALHO"

A pergunta para cada nova ferramenta não deve ser:

> "Que ferramenta conseguimos adicionar?"

Deve ser:

> "Que tarefa real uma pessoa faria no trabalho ou no cotidiano e como podemos resolver essa tarefa inteira em poucos passos?"

Exemplos:

Não criar apenas:

- "calculadora de porcentagem".

Criar também:

- calculadora de desconto;
- preço antes/depois do desconto;
- margem;
- markup;
- comissão;
- imposto;
- lucro;
- comparação de cenários;
- exportação do resultado.

Não criar apenas:

- "conversor de PDF".

Criar um fluxo de documentos:

1. importar;
2. visualizar;
3. converter;
4. organizar;
5. editar/anotar quando possível;
6. proteger;
7. exportar;
8. compartilhar;
9. manter histórico quando o usuário estiver autenticado.

Não criar apenas:

- "contador de palavras".

Criar ferramentas para trabalho com texto:

- limpeza;
- comparação;
- padronização;
- revisão;
- extração;
- transformação;
- geração de modelos;
- análise;
- exportação.

---

# 48. NOVAS MACROCATEGORIAS

Adicionar suporte estrutural para estas categorias:

### A. OFFICE E DOCUMENTOS

Ferramentas para documentos de trabalho.

### B. PDF E DOCUMENTOS DIGITAIS

Fluxos completos de PDF, não somente conversores isolados.

### C. PLANILHAS E DADOS

Ferramentas para análise, limpeza, transformação e geração de planilhas.

### D. PRODUTIVIDADE

Organização pessoal e profissional.

### E. EMPRESAS E ADMINISTRAÇÃO

Ferramentas para pequenas e médias empresas.

### F. FINANCEIRO EMPRESARIAL

Fluxos financeiros mais completos.

### G. VENDAS E COMERCIAL

Ferramentas para orçamento, proposta, comissão, preço e acompanhamento.

### H. ATENDIMENTO E SAC

Ferramentas para tickets, respostas, organização e análise.

### I. RH E DEPARTAMENTO PESSOAL

Ferramentas administrativas para pessoas e equipes.

### J. MARKETING

Ferramentas de conteúdo, campanha, análise e materiais.

### K. REUNIÕES

Pautas, atas, decisões e acompanhamento.

### L. PROJETOS

Cronogramas, tarefas, Kanban, RACI e acompanhamento.

### M. PROCESSOS E FLUXOS

Ferramentas para mapear e documentar processos.

### N. FORMULÁRIOS

Criação e processamento de formulários.

### O. ASSINATURA E APROVAÇÃO

Fluxos de aprovação e assinatura digital quando tecnicamente possível.

### P. ARQUIVOS

Organização, renomeação, comparação, compressão e conversão.

### Q. IMAGENS E DESIGN

Além das ferramentas já existentes.

### R. ÁUDIO E VÍDEO

Ferramentas para tarefas comuns de mídia.

### S. DESENVOLVIMENTO

Ferramentas técnicas mais completas.

### T. IA

Ferramentas de IA orientadas a tarefas reais.

### U. COMUNICAÇÃO

E-mail, mensagens, modelos e respostas.

### V. ESTUDOS

Ferramentas para estudantes e treinamento corporativo.

### W. E-COMMERCE

Preço, margem, estoque, frete, anúncios e produtos.

### X. LOGÍSTICA

Peso, cubagem, prazo, rotas, volumes e conferência.

### Y. ESTOQUE

Entradas, saídas, inventário e análise.

### Z. USO PESSOAL

Contas, planejamento, organização e vida cotidiana.

---

# 49. BIBLIOTECA CORPORATIVA DE FERRAMENTAS

Criar uma backlog de ferramentas de alta utilidade.

IMPORTANTE:

- não contar duas ferramentas iguais;
- não criar versões "básica", "rápida", "simples" e "avançada" artificialmente;
- unificar funcionalidades quando fizer sentido;
- somente considerar uma ferramenta como implementada depois de funcionar;
- cada ferramenta precisa ter nome, slug, categoria, descrição, fluxo, entradas, saídas e critérios de teste.

## 49.1 OFFICE E DOCUMENTOS

Adicionar ao backlog:

1. Criador de Documento Profissional
2. Gerador de Memorando
3. Gerador de Ofício
4. Gerador de Declaração
5. Gerador de Comunicado
6. Gerador de Ata de Reunião
7. Gerador de Relatório
8. Gerador de Proposta Comercial
9. Gerador de Orçamento
10. Gerador de Termo
11. Gerador de Recibo
12. Gerador de Checklist Profissional
13. Gerador de Procedimento Operacional Padrão
14. Gerador de Política Interna
15. Gerador de Formulário
16. Gerador de Carta
17. Gerador de Contracapa/Capa de Documento
18. Gerador de Documento com cabeçalho e rodapé
19. Gerador de documento numerado
20. Montador de documentos por blocos

Cada ferramenta deve permitir, quando aplicável:

- título;
- subtítulo;
- logotipo;
- dados da empresa;
- autor;
- data;
- campos editáveis;
- tabelas;
- assinatura;
- rodapé;
- numeração;
- exportação;
- impressão;
- PDF;
- DOCX quando tecnicamente suportado.

---

# 50. PDF E DOCUMENTOS DIGITAIS

Criar um **hub de PDF**, evitando dezenas de páginas visualmente desconectadas.

Funcionalidades:

1. PDF para Word
2. PDF para Excel
3. PDF para PowerPoint
4. PDF para JPG
5. PDF para PNG
6. Word para PDF
7. Excel para PDF
8. PowerPoint para PDF
9. JPG para PDF
10. PNG para PDF
11. HEIC para PDF
12. Mesclar PDF
13. Dividir PDF
14. Extrair páginas
15. Excluir páginas
16. Reordenar páginas
17. Girar páginas
18. Recortar PDF
19. Inserir páginas
20. Numerar páginas
21. Adicionar marca d'água
22. Proteger PDF
23. Desbloquear PDF quando tecnicamente e legalmente apropriado
24. Compactar PDF
25. OCR
26. Extrair texto de PDF
27. Comparar dois PDFs
28. Visualizar metadados
29. Remover metadados
30. Preencher formulário PDF
31. Criar formulário PDF
32. Anotar PDF
33. Destacar PDF
34. Adicionar texto
35. Redigir/ocultar conteúdo sensível
36. Gerar resumo de PDF
37. Perguntar ao PDF com IA
38. Extrair tabelas de PDF
39. Extrair imagens de PDF
40. Detectar páginas duplicadas
41. Diagnosticar PDF corrompido
42. Verificar tamanho e estrutura
43. Gerar índice
44. Criar PDF a partir de imagens
45. Criar PDF a partir de texto

A referência funcional do Acrobat inclui conversão, edição, organização, OCR, assinatura, proteção e IA para documentos. Use isso como referência de amplitude. citeturn0search0turn0search6

NUNCA prometer assinatura digital juridicamente válida apenas desenhando uma assinatura na tela.

Diferenciar:

- assinatura desenhada;
- assinatura eletrônica;
- assinatura digital certificada;
- fluxo de aprovação.

Explicar limitações quando necessário.

---

# 51. PLANILHAS E DADOS

Criar um conjunto forte de ferramentas para pessoas que trabalham diariamente com Excel/Planilhas.

## Ferramentas

1. Criador de tabela
2. Gerador de planilha
3. Limpador de planilha
4. Removedor de linhas duplicadas
5. Comparador de duas planilhas
6. Mesclador de planilhas
7. Divisor de planilha
8. Conversor CSV ↔ XLSX
9. Conversor JSON ↔ CSV
10. Conversor XML ↔ CSV
11. Formatador de CSV
12. Validador CSV
13. Gerador de gráficos
14. Gerador de dashboard
15. Calculadora de médias
16. Calculadora de mediana
17. Calculadora de desvio padrão
18. Calculadora de variância
19. Calculadora de percentis
20. Analisador estatístico
21. Gerador de tabela dinâmica
22. Gerador de fórmulas
23. Explicador de fórmula
24. Corretor de fórmula
25. Conversor de fórmula entre Excel e Planilhas Google
26. Gerador de PROCV/PROCX/XLOOKUP
27. Gerador de SOMASES
28. Gerador de CONT.SES
29. Gerador de SE aninhado
30. Gerador de fórmulas por linguagem natural
31. Gerador de dados fictícios
32. Gerador de CPF/CNPJ fictício para testes
33. Gerador de lista de produtos
34. Gerador de inventário
35. Gerador de lista de clientes fictícios
36. Gerador de calendário
37. Gerador de escala
38. Gerador de cronograma
39. Gerador de matriz
40. Gerador de relatório a partir de CSV

Não criar 40 páginas independentes se uma arquitetura de "Laboratório de Planilhas" puder reunir funções relacionadas sem prejudicar a navegação.

---

# 52. FINANCEIRO EMPRESARIAL

Adicionar ferramentas práticas:

1. Fluxo de caixa
2. Contas a pagar
3. Contas a receber
4. Conciliação manual
5. DRE simplificada
6. Margem de contribuição
7. Ponto de equilíbrio
8. Markup
9. Margem de lucro
10. Formação de preço
11. Comissão de vendedor
12. Comissão escalonada
13. Desconto comercial
14. Desconto progressivo
15. Acréscimo
16. Juros simples
17. Juros compostos
18. Parcelamento
19. Antecipação de parcelas
20. Valor presente
21. Valor futuro
22. ROI
23. ROAS
24. CAC
25. LTV
26. Payback
27. Ponto de equilíbrio financeiro
28. Custo fixo x variável
29. Comparador de fornecedores
30. Comparador de propostas
31. Simulador de reajuste
32. Simulador de inflação
33. Rateio de custos
34. Rateio proporcional
35. Divisão de despesas
36. Conversor de moeda
37. Cotação histórica quando houver fonte adequada
38. Calculadora de impostos com aviso de que não substitui contador
39. Simulador de salário líquido
40. Simulador de custo de funcionário

Ferramentas financeiras devem mostrar claramente:

- fórmula;
- premissas;
- valores de entrada;
- resultado;
- arredondamentos;
- observações;
- data da referência quando houver dados externos.

Não inventar índices, impostos ou alíquotas.

---

# 53. VENDAS E COMERCIAL

Criar ferramentas para vendedores e pequenos negócios:

1. Gerador de orçamento
2. Gerador de proposta
3. Comparador de propostas
4. Calculadora de desconto
5. Calculadora de comissão
6. Calculadora de margem
7. Calculadora de markup
8. Calculadora de preço mínimo
9. Calculadora de preço de venda
10. Simulador de parcelamento
11. Gerador de pedido
12. Gerador de pedido interno
13. Gerador de ficha de cliente
14. Gerador de briefing
15. Gerador de follow-up
16. Gerador de mensagem comercial
17. Gerador de e-mail comercial
18. Gerador de descrição de produto
19. Comparador de produtos
20. Matriz de comparação de fornecedores
21. Calculadora de conversão de vendas
22. Funil de vendas
23. Pipeline simples
24. Gerador de metas
25. Simulador de meta de faturamento
26. Calculadora de ticket médio
27. Calculadora de taxa de conversão
28. Calculadora de desconto máximo
29. Calculadora de comissão líquida
30. Gerador de catálogo simples

---

# 54. ATENDIMENTO, SAC E PÓS-VENDA

Criar um módulo para equipes de atendimento.

Ferramentas:

1. Gerador de resposta profissional
2. Gerador de resposta para reclamação
3. Gerador de resposta para atraso
4. Gerador de resposta para troca
5. Gerador de resposta para garantia
6. Gerador de resposta para cobrança
7. Gerador de resposta para orçamento
8. Gerador de resposta para suporte técnico
9. Classificador de atendimento
10. Gerador de ticket
11. Gerador de protocolo
12. Gerador de SLA
13. Calculadora de prazo de atendimento
14. Matriz de prioridade
15. Classificador de urgência
16. Gerador de checklist de atendimento
17. Gerador de script de ligação
18. Gerador de FAQ
19. Analisador de conversas
20. Resumidor de atendimento
21. Extrator de ações de uma conversa
22. Gerador de pesquisa de satisfação
23. Calculadora de CSAT
24. Calculadora de NPS
25. Relatório de atendimento
26. Relatório de reclamações
27. Análise de motivos de contato
28. Gerador de resposta multicanal

Separar:

- resposta sugerida;
- mensagem enviada;
- anotação interna;
- ação pendente.

Nunca misturar mensagem interna com resposta ao cliente.

---

# 55. RH E ROTINAS ADMINISTRATIVAS

Adicionar:

1. Gerador de currículo
2. Analisador de currículo
3. Comparador de currículos
4. Gerador de descrição de vaga
5. Gerador de perguntas de entrevista
6. Matriz de avaliação de candidato
7. Gerador de feedback
8. Gerador de comunicado interno
9. Gerador de onboarding
10. Checklist de admissão
11. Checklist de desligamento
12. Controle de férias
13. Calculadora de férias
14. Calculadora de horas
15. Banco de horas
16. Carga horária
17. Escala de trabalho
18. Gerador de escala
19. Controle de treinamentos
20. Matriz de competências
21. Avaliação de desempenho
22. Plano de desenvolvimento
23. Gerador de política interna
24. Gerador de termo de ciência
25. Organograma
26. Matriz RACI
27. Lista de contatos corporativos
28. Controle de documentos de funcionários

Ferramentas trabalhistas devem indicar quando dependem de legislação, convenção coletiva ou dados atualizados.

---

# 56. PRODUTIVIDADE E PROJETOS

Criar:

1. Kanban
2. Lista de tarefas
3. Checklist
4. Matriz Eisenhower
5. Pomodoro
6. Planejador diário
7. Planejador semanal
8. Planejador mensal
9. Cronograma
10. Gantt simplificado
11. Roadmap
12. RACI
13. Matriz de riscos
14. Registro de decisões
15. Registro de problemas
16. Registro de mudanças
17. Ata de reunião
18. Pauta de reunião
19. Plano de ação
20. 5W2H
21. SMART Goals
22. OKR simplificado
23. Backlog
24. Priorizador de tarefas
25. Calculadora de capacidade
26. Estimador de esforço
27. Controle de prazo
28. Calendário de entregas
29. Gerador de retrospectiva
30. Relatório de status

---

# 57. PROCESSOS E OPERAÇÕES

Adicionar ferramentas para documentar operações:

1. Criador de fluxograma
2. Criador de processo passo a passo
3. SOP/POP Builder
4. Checklist operacional
5. Matriz RACI
6. SIPOC
7. 5W2H
8. Ishikawa
9. 5 Porquês
10. Matriz de risco
11. FMEA simplificado
12. Mapa de processo
13. Controle de versão de procedimento
14. Comparador de procedimentos
15. Gerador de instrução de trabalho
16. Registro de não conformidade
17. Plano de ação corretiva
18. Auditoria/checklist
19. Registro de incidente
20. Indicadores operacionais

---

# 58. FORMULÁRIOS E COLETA DE DADOS

Criar um construtor de formulários reutilizável.

Tipos de campo:

- texto;
- número;
- moeda;
- data;
- hora;
- seleção;
- múltipla seleção;
- checkbox;
- upload;
- assinatura;
- avaliação;
- escala;
- e-mail;
- telefone;
- CPF;
- CNPJ;
- endereço.

Recursos:

- lógica condicional;
- campos obrigatórios;
- validação;
- mensagens de erro;
- página de sucesso;
- exportação CSV/XLSX;
- geração de PDF;
- compartilhamento;
- respostas;
- filtros;
- estatísticas;
- gráfico de respostas;
- histórico.

---

# 59. REUNIÕES E COLABORAÇÃO

Criar:

1. Gerador de pauta
2. Gerador de ata
3. Extrator de decisões
4. Extrator de tarefas
5. Lista de participantes
6. Controle de presença
7. Cronômetro de reunião
8. Agenda de reunião
9. Registro de decisões
10. Registro de pendências
11. Gerador de follow-up
12. Gerador de resumo
13. Gerador de e-mail pós-reunião
14. Gerador de plano de ação
15. Matriz de responsáveis

---

# 60. E-MAIL E COMUNICAÇÃO CORPORATIVA

Adicionar:

1. Gerador de e-mail profissional
2. Reescritor profissional
3. Resumidor de e-mail
4. Classificador de e-mail
5. Gerador de assunto
6. Gerador de resposta
7. Gerador de cobrança
8. Gerador de confirmação
9. Gerador de solicitação
10. Gerador de follow-up
11. Gerador de comunicado
12. Gerador de aviso
13. Gerador de resposta para cliente
14. Gerador de resposta interna
15. Gerador de e-mail de reunião

Diferenciar claramente:

- comunicação externa;
- comunicação interna;
- cliente;
- fornecedor;
- liderança;
- RH.

---

# 61. E-COMMERCE E PEQUENOS NEGÓCIOS

Adicionar:

1. Calculadora de preço de venda
2. Calculadora de margem
3. Markup
4. Comissão
5. Frete
6. Cubagem
7. Peso volumétrico
8. Custo por unidade
9. Custo por lote
10. Preço promocional
11. Desconto máximo
12. Ponto de equilíbrio
13. ROI de produto
14. ROAS
15. Ticket médio
16. Giro de estoque
17. Cobertura de estoque
18. Estoque mínimo
19. Ponto de reposição
20. Curva ABC
21. Inventário
22. Comparador de fornecedores
23. Comparador de preços
24. Gerador de SKU
25. Gerador de código interno
26. Gerador de descrição
27. Gerador de ficha de produto
28. Gerador de etiquetas
29. Gerador de código de barras
30. Gerador de catálogo

---

# 62. ESTOQUE E LOGÍSTICA

Criar:

1. Inventário
2. Entrada de estoque
3. Saída de estoque
4. Ajuste de estoque
5. Estoque mínimo
6. Ponto de reposição
7. Giro
8. Cobertura
9. Curva ABC
10. Lote econômico
11. Cubagem
12. Peso volumétrico
13. Dimensões
14. Quantidade por caixa
15. Quantidade por pallet
16. Separação de pedidos
17. Conferência de pedidos
18. Checklist de expedição
19. Gerador de etiqueta
20. Romaneio
21. Lista de volumes
22. Conferência de carga
23. Cálculo de frete
24. Comparador de transportadoras
25. Prazo estimado
26. Rastreamento por lista
27. Relatório de expedição

---

# 63. MARKETING E CONTEÚDO

Adicionar:

1. Gerador de briefing
2. Calendário editorial
3. Gerador de post
4. Gerador de legenda
5. Gerador de título
6. Gerador de descrição
7. Gerador de CTA
8. Gerador de anúncio
9. Gerador de e-mail marketing
10. Gerador de landing page
11. Gerador de meta description
12. Gerador de palavras-chave
13. Gerador de UTM
14. Analisador de UTM
15. Gerador de calendário de campanha
16. Calculadora de CTR
17. Calculadora de CPC
18. Calculadora de CPM
19. Calculadora de CPA
20. Calculadora de ROAS
21. Calculadora de conversão
22. Gerador de briefing para designer
23. Gerador de briefing para vídeo
24. Gerador de roteiro
25. Gerador de calendário de conteúdo

---

# 64. DESENVOLVIMENTO E DADOS TÉCNICOS

Expandir o bloco de desenvolvimento existente:

1. JSON formatter
2. JSON validator
3. JSON diff
4. JSON schema generator
5. CSV inspector
6. XML formatter
7. XML validator
8. YAML formatter
9. Base64
10. URL encoder
11. URL decoder
12. HTML entity encoder
13. JWT decoder
14. UUID generator
15. Hash generator
16. Regex tester
17. Regex builder
18. Cron expression builder
19. Timestamp converter
20. Unix date converter
21. SQL formatter
22. SQL validator
23. SQL query builder
24. SQL explain helper
25. API request builder
26. HTTP header inspector
27. HTTP status explainer
28. Webhook tester
29. cURL generator
30. cURL converter
31. Open Graph checker
32. Meta tag generator
33. Sitemap generator
34. robots.txt generator
35. .htaccess helper
36. MIME type lookup
37. HTTP response inspector
38. Color contrast checker
39. Accessibility checker
40. SVG optimizer
41. CSS minifier
42. JS minifier
43. HTML minifier
44. Diff de código
45. Log analyzer
46. Regex log parser
47. Token calculator
48. Prompt token estimator
49. Markdown formatter
50. Markdown to HTML

Ferramentas técnicas devem explicar o que cada campo significa para usuários não técnicos.

---

# 65. IA ORIENTADA A TAREFAS

Não transformar o portal em apenas "chat com IA".

Criar ferramentas com entradas e resultados previsíveis:

1. Resumidor de documento
2. Resumidor de reunião
3. Extrator de ações
4. Extrator de tarefas
5. Classificador de texto
6. Classificador de e-mails
7. Gerador de resposta
8. Revisor de texto
9. Reescritor
10. Tradutor
11. Gerador de tabela
12. Extrator de dados
13. Estruturador de texto
14. Gerador de JSON
15. Gerador de CSV
16. Analisador de documento
17. Comparador de documentos
18. Chat com documento
19. Gerador de FAQ
20. Gerador de SOP
21. Gerador de proposta
22. Gerador de relatório
23. Gerador de ata
24. Gerador de briefing
25. Gerador de checklist

Sempre informar:

- qual IA foi utilizada;
- se existe limite;
- se os dados são enviados para servidor;
- se existe processamento local;
- se existe armazenamento;
- quais limitações existem.

Não fingir que IA "entendeu" algo quando o sistema somente fez correspondência textual.

---

# 66. FERRAMENTAS DE ARQUIVOS

Criar um "Laboratório de Arquivos":

- identificar formato;
- renomear arquivos em lote;
- gerar nomes padronizados;
- remover caracteres inválidos;
- detectar duplicados;
- comparar arquivos;
- calcular hash;
- calcular tamanho;
- listar metadados;
- agrupar por extensão;
- converter formatos;
- compactar;
- descompactar quando suportado;
- dividir;
- juntar;
- gerar índice;
- gerar lista de arquivos;
- gerar relatório de arquivos.

Para operações em lote:

- preview obrigatório;
- mostrar quantos arquivos serão afetados;
- permitir desfazer quando tecnicamente possível;
- nunca sobrescrever silenciosamente.

---

# 67. IMAGENS, ÁUDIO E VÍDEO

Expandir além das ferramentas atuais:

### Imagens

- redimensionar em lote;
- cortar;
- girar;
- converter;
- comprimir;
- remover fundo;
- remover metadados;
- comparar imagens;
- gerar contato/folha de thumbnails;
- criar favicon;
- gerar spritesheet;
- detectar dimensões;
- detectar formato;
- extrair paleta;
- verificar contraste;
- otimizar WebP;
- otimizar AVIF;
- gerar imagem para redes sociais.

### Áudio

- cortar;
- juntar;
- converter;
- normalizar;
- extrair áudio;
- detectar duração;
- alterar volume;
- gerar waveform;
- transcrever quando houver serviço adequado.

### Vídeo

- cortar;
- extrair áudio;
- gerar thumbnail;
- converter;
- comprimir;
- detectar duração;
- extrair frames;
- gerar GIF;
- gerar contato;
- converter proporção.

---

# 68. FERRAMENTAS DE ESTUDO E TREINAMENTO CORPORATIVO

Adicionar:

1. Gerador de quiz
2. Gerador de flashcards
3. Gerador de questões
4. Gerador de resumo
5. Gerador de mapa mental
6. Gerador de plano de estudos
7. Cronograma de estudo
8. Simulador de prova
9. Banco de questões
10. Conversor texto → perguntas
11. Conversor PDF → flashcards
12. Conversor PDF → quiz
13. Gerador de treinamento interno
14. Gerador de avaliação
15. Gerador de certificado
16. Gerador de trilha de aprendizagem

---

# 69. ADMINISTRAÇÃO DA PLATAFORMA

O painel administrativo deve permitir controlar o ecossistema inteiro.

## Ferramentas

- CRUD de ferramentas;
- categorias;
- tags;
- busca;
- destaque;
- ordem;
- status;
- versão;
- documentação;
- instruções;
- FAQ;
- plano necessário;
- limites;
- permissões;
- métricas;
- erros;
- feedback;
- sugestões;
- denúncias;
- usuários;
- favoritos;
- notificações;
- mensagens;
- banners;
- popups;
- campanhas;
- anúncios;
- cupons;
- planos;
- assinaturas;
- logs;
- auditoria.

---

# 70. SISTEMA DE TEMPLATE PARA FERRAMENTAS

Criar uma especificação comum.

Cada ferramenta deve possuir:

```text
id
slug
nome
categoria
subcategoria
descrição_curta
descrição_longa
ícone
tags
status
versão
autor
data_criação
data_atualização
plano
limite
entradas
saídas
instruções
exemplos
faq
ferramentas_relacionadas
exportações
permissões
analytics
```

Isso permite ao administrador criar novas ferramentas sem duplicar estrutura.

---

# 71. MOTOR DE FERRAMENTAS

Quando várias ferramentas compartilharem infraestrutura, criar serviços reutilizáveis.

Exemplos:

- FileProcessor
- PdfProcessor
- ImageProcessor
- SpreadsheetProcessor
- TextProcessor
- ExportProcessor
- ValidationEngine
- CalculationEngine
- NotificationEngine
- SearchEngine
- FavoritesEngine
- PermissionsEngine
- PlanLimitEngine
- AuditLogEngine

Não criar um backend diferente para cada ferramenta se o processamento puder ser compartilhado.

---

# 72. SISTEMA DE FLUXOS MULTIETAPAS

Ferramentas complexas devem usar wizard quando isso reduzir a complexidade.

Exemplo:

```text
1. ENVIAR
↓
2. CONFIGURAR
↓
3. PROCESSAR
↓
4. REVISAR
↓
5. EXPORTAR
```

Mostrar:

- progresso;
- etapa atual;
- voltar;
- cancelar;
- processamento;
- sucesso;
- erro;
- recuperação.

Nunca colocar 30 campos em uma tela quando um fluxo progressivo for mais fácil.

---

# 73. HISTÓRICO DE TRABALHOS

Para ferramentas que geram arquivos ou resultados importantes, permitir:

- histórico;
- nome;
- data;
- ferramenta usada;
- status;
- resultado;
- download;
- duplicar;
- refazer;
- excluir;
- compartilhar quando suportado.

Usuário autenticado:

- sincronização.

Usuário não autenticado:

- armazenamento local temporário quando possível.

Explicar claramente a diferença.

---

# 74. ÁREA "MEUS ARQUIVOS"

Criar área para usuários autenticados:

- arquivos recentes;
- trabalhos recentes;
- favoritos;
- downloads;
- documentos gerados;
- histórico;
- lixeira;
- filtros;
- busca;
- ordenação;
- tamanho;
- data;
- tipo.

Não armazenar arquivos indefinidamente sem política de retenção.

---

# 75. BUSCA INTELIGENTE DE FERRAMENTAS

A busca deve entender intenção.

Exemplo:

Usuário digita:

> "quero calcular quanto preciso vender para pagar minhas despesas"

Resultados possíveis:

- ponto de equilíbrio;
- margem de contribuição;
- preço de venda;
- meta de faturamento.

Usuário digita:

> "juntar dois documentos"

Resultados:

- juntar PDF;
- combinar imagens;
- mesclar planilhas;
- juntar textos.

A busca deve indexar:

- nome;
- descrição;
- categoria;
- tags;
- sinônimos;
- tarefas;
- perguntas comuns.

---

# 76. "O QUE VOCÊ QUER FAZER?"

Adicionar uma entrada de busca orientada a intenção.

Exemplos:

- "Quero organizar meus gastos"
- "Preciso fazer um orçamento"
- "Preciso transformar PDF em Excel"
- "Quero comparar duas planilhas"
- "Preciso criar uma ata"
- "Quero calcular o preço de venda"
- "Preciso organizar meu estoque"
- "Quero criar uma proposta"
- "Preciso gerar um relatório"

O sistema sugere ferramentas e fluxos.

---

# 77. CENTRAL "TRABALHO"

Criar uma área agregadora para uso profissional.

Possíveis blocos:

- Hoje;
- Ferramentas recentes;
- Trabalhos em andamento;
- Arquivos recentes;
- Favoritos;
- Pendências;
- Atalhos;
- Últimos resultados;
- Ferramentas recomendadas;
- Histórico.

Não transformar em dashboard cheio de gráficos inúteis.

Dashboard deve responder:

> "O que preciso fazer agora?"

---

# 78. CENTRAIS POR PROFISSÃO/DEPARTAMENTO

Criar hubs temáticos.

## Atendimento

- SAC;
- tickets;
- respostas;
- SLA;
- satisfação;
- relatórios.

## Financeiro

- fluxo de caixa;
- contas;
- margem;
- preço;
- juros;
- relatórios.

## Vendas

- orçamento;
- proposta;
- comissão;
- preço;
- follow-up;
- pipeline.

## RH

- currículo;
- vagas;
- entrevistas;
- avaliação;
- onboarding;
- documentos.

## Expedição

- pedidos;
- volumes;
- etiquetas;
- cubagem;
- conferência.

## Marketing

- campanhas;
- conteúdo;
- UTM;
- métricas;
- anúncios.

## Administrativo

- documentos;
- formulários;
- relatórios;
- processos;
- reuniões.

---

# 79. REGRAS DE NÃO DUPLICAÇÃO

Antes de criar uma ferramenta nova:

1. pesquisar no catálogo;
2. pesquisar por nome;
3. pesquisar por sinônimos;
4. pesquisar por tags;
5. pesquisar por categoria;
6. verificar ferramentas relacionadas;
7. verificar funcionalidades existentes.

Se existir ferramenta semelhante:

- expandir a existente;
- criar subfunção;
- criar modo avançado;
- ou justificar objetivamente a separação.

Nunca criar:

- "Calculadora de Porcentagem 2";
- "Calculadora de Porcentagem Pro";
- "Calculadora de Porcentagem Avançada";

apenas para aumentar o número de ferramentas.

---

# 80. META DE 150 FERRAMENTAS

A meta anterior de **150 ferramentas únicas continua válida**.

Não aumentar artificialmente essa meta para criar volume.

O objetivo é chegar a 150 ferramentas **realmente úteis e funcionais**.

Prioridade:

```text
UTILIDADE
>
QUALIDADE
>
COBERTURA
>
QUANTIDADE
```

As 103 ferramentas do catálogo de referência são apenas base de comparação. A plataforma pode superar esse número com ferramentas próprias.

---

# 81. MODELO DE QUALIDADE POR FERRAMENTA

Cada ferramenta deve ser avaliada internamente:

### Nível 1 — Funcionalidade

- funciona;
- valida entrada;
- produz resultado.

### Nível 2 — UX

- fácil de entender;
- estados de erro;
- loading;
- sucesso;
- responsividade.

### Nível 3 — Profissional

- exportação;
- histórico;
- exemplos;
- documentação;
- acessibilidade.

### Nível 4 — Integração

- conta;
- favoritos;
- histórico;
- notificações;
- plano;
- analytics.

### Nível 5 — Escala

- performance;
- limites;
- cache;
- filas;
- segurança;
- observabilidade.

Não é obrigatório que toda ferramenta tenha todos os níveis, mas o agente deve definir o nível adequado.

---

# 82. EXPORTAÇÃO PROFISSIONAL

Para ferramentas que geram documentos, relatórios ou dados:

### PDF

- A4;
- margens;
- cabeçalho;
- rodapé;
- paginação;
- tabelas;
- quebra inteligente;
- logo;
- data;
- autor.

### XLSX

- cabeçalhos;
- largura de colunas;
- filtros;
- congelamento de cabeçalho;
- formatos numéricos;
- moeda;
- datas;
- fórmulas quando necessário.

### CSV

- UTF-8;
- separador configurável;
- cabeçalho;
- escape correto.

### JSON

- pretty print;
- minificado;
- UTF-8;
- download.

### PNG/JPG/SVG

- dimensões corretas;
- resolução adequada;
- transparência quando aplicável.

---

# 83. SEGURANÇA PARA FERRAMENTAS CORPORATIVAS

Ferramentas que lidam com documentos e dados precisam considerar:

- upload seguro;
- validação MIME;
- extensão não confiável;
- tamanho máximo;
- timeout;
- limpeza de arquivos temporários;
- isolamento de processamento;
- proteção contra path traversal;
- proteção contra zip bombs;
- proteção contra arquivos maliciosos;
- rate limit;
- autenticação;
- autorização;
- logs;
- exclusão;
- retenção;
- criptografia em trânsito;
- criptografia em repouso quando aplicável.

Nunca executar arquivo enviado pelo usuário como código.

---

# 84. LGPD E DADOS CORPORATIVOS

Para ferramentas que processam:

- CPF;
- CNPJ;
- endereço;
- telefone;
- e-mail;
- contratos;
- currículos;
- documentos;
- dados financeiros;
- dados de funcionários;

considerar:

- minimização;
- finalidade;
- retenção;
- exclusão;
- consentimento quando aplicável;
- transparência;
- controle de acesso;
- logs;
- anonimização/pseudonimização quando aplicável.

Não colocar dados pessoais reais em exemplos, seeds ou testes.

---

# 85. OFFLINE-FIRST QUANDO FIZER SENTIDO

Priorizar processamento local para ferramentas que não precisam de servidor.

Exemplos:

- calculadoras;
- conversores simples;
- formatadores;
- compressão local;
- manipulação de imagem local;
- algumas operações PDF;
- geradores;
- timers;
- utilitários de texto.

Benefícios:

- privacidade;
- velocidade;
- menor custo;
- funcionamento sem internet.

Não forçar processamento local quando a tarefa exige backend ou IA externa.

---

# 86. MODO "PRIVACIDADE"

Para ferramentas de documentos e dados:

Mostrar quando aplicável:

> "Processamento local"

ou:

> "Arquivo enviado para processamento"

ou:

> "Arquivo armazenado na sua conta"

Nunca usar linguagem vaga para esconder o fluxo real.

---

# 87. OBSERVABILIDADE

Cada ferramenta importante deve possuir métricas internas:

- execuções;
- sucesso;
- erro;
- tempo médio;
- tempo P95;
- abandono;
- exportações;
- uso por dispositivo;
- uso por plano.

Nunca coletar mais dados pessoais do que o necessário.

---

# 88. FEEDBACK POR FERRAMENTA

Adicionar:

- funcionou;
- não funcionou;
- reportar problema;
- sugerir melhoria.

Quando o usuário reportar erro:

Registrar:

```text
tool_id
versão
data
dispositivo
navegador
tipo de erro
mensagem
etapa
```

Sem capturar conteúdo sensível desnecessariamente.

---

# 89. SISTEMA DE SUGESTÃO DE FERRAMENTAS

Usuário pode solicitar:

> "Preciso de uma ferramenta para..."

O sistema deve:

1. procurar ferramentas existentes;
2. sugerir a ferramenta mais próxima;
3. explicar o motivo;
4. permitir sugerir nova ferramenta;
5. impedir duplicação.

Administrador recebe:

- sugestão;
- frequência;
- categoria;
- descrição;
- status.

---

# 90. PLANO DE IMPLEMENTAÇÃO DA EXPANSÃO

Não tentar construir tudo simultaneamente.

Ordem recomendada:

### Fase A

- arquitetura;
- sistema de ferramentas;
- catálogo;
- busca;
- contas;
- favoritos;
- planos;
- infraestrutura.

### Fase B

- documentos;
- PDF;
- arquivos;
- imagens.

### Fase C

- planilhas;
- dados;
- financeiro.

### Fase D

- vendas;
- atendimento;
- RH;
- administração.

### Fase E

- produtividade;
- projetos;
- processos;
- reuniões.

### Fase F

- e-commerce;
- estoque;
- logística;
- marketing.

### Fase G

- IA;
- automações;
- fluxos complexos.

### Fase H

- APK;
- otimização;
- QA;
- segurança;
- publicação.

Após cada fase:

```text
IMPLEMENTAR
↓
TESTAR
↓
CRÍTICO TÉCNICO
↓
CRÍTICO UX/UI
↓
CORRIGIR
↓
TESTAR NOVAMENTE
↓
COMMIT
```

---

# 91. NOVOS AGENTES ESPECIALISTAS

Além dos agentes anteriores, considerar:

### Agent Office

Responsável por documentos, modelos, exportação e fluxos de escritório.

### Agent PDF

Responsável pelo hub de PDF, OCR, conversão, organização e segurança.

### Agent Data

Responsável por CSV, XLSX, análise, tabelas e dashboards.

### Agent Finance

Responsável por ferramentas financeiras empresariais.

### Agent Sales

Responsável por vendas e comercial.

### Agent SAC

Responsável por atendimento e pós-venda.

### Agent HR

Responsável por RH e rotinas administrativas.

### Agent Operations

Responsável por processos, estoque, logística e operações.

### Agent Marketing

Responsável por conteúdo, campanhas e métricas.

### Agent AI Tools

Responsável por IA orientada a tarefas.

### Agent Privacy

Responsável por LGPD, privacidade, retenção e segurança de dados.

### Agent Export

Responsável pela qualidade de PDF, XLSX, CSV, DOCX e imagens.

---

# 92. MATRIZ DE RESPONSABILIDADE DOS AGENTES

Nenhum agente deve modificar arquivos fora de sua área sem autorização do Orchestrator.

Exemplo:

| Agente | Responsabilidade |
|---|---|
| Office | documentos |
| PDF | PDF/OCR |
| Data | planilhas/dados |
| Finance | financeiro |
| Sales | vendas |
| SAC | atendimento |
| HR | RH |
| Operations | processos/logística |
| Marketing | marketing |
| AI Tools | IA |
| Privacy | LGPD |
| Export | exportações |
| UX/UI | experiência |
| QA | testes |

Conflitos continuam seguindo as regras anteriores deste prompt.

---

# 93. CRITÉRIOS PARA UMA FERRAMENTA CORPORATIVA SER CONSIDERADA PRONTA

Uma ferramenta corporativa complexa só pode ser marcada como concluída se:

- [ ] fluxo principal funciona;
- [ ] validações funcionam;
- [ ] estados vazios funcionam;
- [ ] loading funciona;
- [ ] erro funciona;
- [ ] sucesso funciona;
- [ ] mobile funciona;
- [ ] teclado funciona;
- [ ] exportação funciona quando prevista;
- [ ] dados não são perdidos inesperadamente;
- [ ] permissões funcionam;
- [ ] limite do plano funciona;
- [ ] histórico funciona quando previsto;
- [ ] não há erro no console;
- [ ] não há overflow;
- [ ] acessibilidade básica foi verificada;
- [ ] segurança foi revisada;
- [ ] conteúdo foi revisado;
- [ ] documentação foi criada;
- [ ] teste de regressão passou.

---

# 94. PESQUISA DE REFERÊNCIAS V2

Usar referências funcionais atuais como inspiração para amplitude, sem copiar identidade.

### Adobe Acrobat

Referência para:

- PDF;
- conversão;
- edição;
- organização;
- OCR;
- assinatura;
- proteção;
- IA documental. citeturn0search0turn0search6

### Google Workspace

Referência para:

- Docs;
- Sheets;
- Slides;
- Forms;
- Drive;
- Calendar;
- Tasks;
- colaboração;
- administração;
- automação;
- IA. citeturn1search0turn1search3turn1search4

### HubSpot

Referência para:

- CRM;
- contatos;
- vendas;
- pipeline;
- reuniões;
- atendimento;
- tickets;
- marketing;
- relatórios;
- operações. citeturn1search1turn1search14

### TinyWow / 123apps / iLovePDF / Smallpdf / CloudConvert

Usar como referências de amplitude de utilitários de arquivos, PDF, mídia e conversão. Uma pesquisa de mercado recente também identifica essas plataformas como referências de ferramentas online para PDF, arquivos, mídia e conversão. citeturn0search7

Não copiar:

- layout;
- marca;
- textos;
- código;
- ícones;
- identidade;
- nomes proprietários.

---

# 95. NOVO PADRÃO DE DESCOBERTA

Antes de implementar uma categoria inteira:

1. pesquisar 3 a 5 referências;
2. listar as funções encontradas;
3. separar funções por:
   - essencial;
   - avançada;
   - corporativa;
   - opcional;
4. verificar duplicações;
5. selecionar funcionalidades adequadas ao portal;
6. criar arquitetura;
7. implementar;
8. testar.

O objetivo é aprender com padrões de produto, não copiar produtos.

---

# 96. EXPERIÊNCIA "UMA FERRAMENTA LEVA À OUTRA"

Após concluir uma tarefa, sugerir o próximo passo.

Exemplo:

Usuário gerou um orçamento.

Sistema sugere:

- gerar PDF;
- gerar proposta;
- enviar por e-mail;
- calcular margem;
- registrar cliente;
- criar follow-up.

Usuário converteu PDF em Excel.

Sistema sugere:

- limpar planilha;
- remover duplicados;
- gerar gráfico;
- exportar relatório.

Usuário criou uma ata.

Sistema sugere:

- extrair tarefas;
- gerar plano de ação;
- criar checklist;
- gerar e-mail de follow-up.

Essa navegação contextual é mais útil do que uma lista gigantesca de 150 ícones.

---

# 97. "WORKFLOWS" COMPOSTOS

Criar futuramente fluxos compostos.

Exemplos:

## Fluxo: Proposta comercial

```text
Cliente
↓
Produto/serviço
↓
Preço
↓
Desconto
↓
Margem
↓
Proposta
↓
PDF
↓
Follow-up
```

## Fluxo: Atendimento

```text
Cliente
↓
Classificação
↓
Prioridade
↓
Resposta
↓
Ticket
↓
SLA
↓
Follow-up
↓
Satisfação
```

## Fluxo: Documento

```text
Upload
↓
OCR
↓
Extração
↓
Revisão
↓
Conversão
↓
Assinatura/aprovação
↓
Arquivo
```

## Fluxo: Estoque

```text
Produto
↓
Entrada
↓
Estoque
↓
Saída
↓
Reposição
↓
Inventário
↓
Relatório
```

---

# 98. LIMITES E CUSTOS

O Orchestrator deve considerar custo computacional.

Classificar ferramentas:

### Local

Processamento no navegador.

### Leve

Backend simples.

### Pesada

Processamento de arquivos grandes.

### IA

Uso de modelo/API.

### Assíncrona

Fila/background job.

Para ferramentas pesadas:

- mostrar progresso;
- limitar tamanho;
- controlar concorrência;
- usar fila quando necessário;
- limpar temporários;
- registrar falhas;
- evitar travar o servidor.

---

# 99. ARQUITETURA DE FILAS

Quando necessário:

```text
UPLOAD
↓
VALIDAÇÃO
↓
JOB
↓
QUEUE
↓
WORKER
↓
PROCESSAMENTO
↓
RESULTADO
↓
DOWNLOAD
```

Não executar tarefas pesadas diretamente em uma requisição HTTP longa quando isso causar timeout ou instabilidade.

---

# 100. PWA E EXPERIÊNCIA MOBILE

O portal deve funcionar como aplicativo quando possível.

Adicionar:

- PWA;
- instalação;
- offline parcial;
- cache;
- atalhos;
- compartilhamento;
- upload pelo celular;
- câmera quando pertinente;
- download;
- abertura de arquivos;
- navegação inferior.

O APK deve reutilizar a arquitetura web quando isso fizer sentido.

Não criar duas aplicações completamente diferentes sem necessidade.

---

# 101. BUSCA POR DEPARTAMENTO

Adicionar filtros:

- Todos;
- Administrativo;
- Atendimento;
- Financeiro;
- Fiscal;
- RH;
- Vendas;
- Marketing;
- TI;
- Desenvolvimento;
- Logística;
- Estoque;
- Expedição;
- Gestão;
- Estudos;
- Pessoal.

---

# 102. BUSCA POR TIPO DE TAREFA

Adicionar filtros:

- Calcular;
- Converter;
- Criar;
- Editar;
- Comparar;
- Analisar;
- Organizar;
- Gerar;
- Exportar;
- Validar;
- Otimizar;
- Comunicar;
- Planejar;
- Controlar.

---

# 103. NOVA REGRA DE DESCOBERTA DO USUÁRIO

Cada ferramenta deve responder visualmente, acima da dobra:

1. O que é?
2. Para que serve?
3. O que preciso fornecer?
4. O que receberei?
5. Existe algum limite?
6. Meus dados ficam onde?

O usuário não deve precisar ler um manual para descobrir como clicar no botão principal. A humanidade já sofreu o suficiente com sistemas empresariais assim.

---

# 104. DOCUMENTAÇÃO DE CADA FERRAMENTA

Criar metadados e documentação curta:

```text
O QUE FAZ
PARA QUEM É
COMO USAR
EXEMPLO
ENTRADAS
SAÍDAS
LIMITES
PRIVACIDADE
EXPORTAÇÃO
FERRAMENTAS RELACIONADAS
```

Para ferramentas complexas:

```text
COMO FUNCIONA
QUANDO USAR
QUANDO NÃO USAR
EXEMPLOS
ERROS COMUNS
PERGUNTAS FREQUENTES
```

---

# 105. TESTES DE CASOS REAIS

Além de testes unitários, criar cenários reais.

Exemplos:

### Financeiro

- valor pequeno;
- valor alto;
- desconto;
- parcelamento;
- arredondamento;
- valor negativo quando inválido;
- campo vazio.

### PDF

- PDF de uma página;
- PDF de 100 páginas;
- PDF escaneado;
- PDF protegido;
- PDF com tabela;
- PDF grande;
- PDF corrompido.

### Planilha

- 10 linhas;
- 10.000 linhas;
- células vazias;
- duplicados;
- caracteres especiais;
- acentos;
- datas;
- valores monetários.

### Imagem

- JPG;
- PNG;
- WebP;
- HEIC;
- imagem grande;
- transparência.

### Usuário

- visitante;
- usuário autenticado;
- usuário sem plano;
- usuário premium;
- administrador.

---

# 106. TESTE DE ACESSIBILIDADE

Para cada ferramenta:

- teclado;
- foco;
- labels;
- contraste;
- leitores de tela;
- mensagens de erro;
- tamanho dos controles;
- navegação sem mouse;
- reduced motion;
- sem depender apenas de cor.

---

# 107. TESTE DE INTERNACIONALIZAÇÃO

Preparar arquitetura para:

- PT-BR;
- EN;
- ES.

Mesmo que apenas PT-BR seja publicado inicialmente.

Não colocar textos críticos diretamente espalhados em dezenas de arquivos.

---

# 108. PREPARAÇÃO PARA API

As ferramentas importantes devem possuir lógica separável da interface.

Estrutura conceitual:

```text
UI
↓
VALIDAÇÃO
↓
SERVIÇO
↓
PROCESSAMENTO
↓
RESULTADO
```

Isso facilita:

- API;
- APK;
- automações;
- integração externa;
- testes.

---

# 109. API INTERNA DE FERRAMENTAS

Quando apropriado:

```text
POST /api/tools/:slug/run
GET  /api/tools/:slug
GET  /api/tools
GET  /api/history
POST /api/favorites
GET  /api/favorites
```

Não implementar endpoints apenas por estética.

Cada endpoint precisa existir porque uma funcionalidade real precisa dele.

---

# 110. WEBHOOKS E AUTOMAÇÃO

Quando a arquitetura permitir:

- webhook de conclusão;
- webhook de formulário;
- webhook de geração;
- webhook de erro;
- integração com automações.

Permitir futuramente:

```text
Ferramenta
→ Webhook
→ Automação externa
```

Sem transformar a primeira versão em uma plataforma impossível de manter.

---

# 111. SISTEMA DE PLUGINS INTERNOS

Avaliar arquitetura para ferramentas independentes:

```text
/tools/
  ferramenta-a/
  ferramenta-b/
  ferramenta-c/
```

Cada ferramenta declara:

```text
manifest
configuração
permissões
inputs
outputs
exportações
```

O catálogo lê os metadados.

Isso permite adicionar ferramentas sem modificar o núcleo inteiro.

---

# 112. VERSIONAMENTO DE FERRAMENTAS

Cada ferramenta deve possuir:

```text
version
changelog
updated_at
```

Quando houver alteração que mude o resultado:

- atualizar versão;
- testar;
- registrar mudança;
- verificar compatibilidade.

Não quebrar resultados antigos sem justificativa.

---

# 113. ANALYTICS DE PRODUTO

Métricas úteis:

- ferramentas abertas;
- ferramentas executadas;
- conclusão;
- abandono;
- erro;
- busca sem resultado;
- categoria;
- dispositivo;
- tempo;
- exportação;
- retorno.

Uma métrica especialmente importante:

> "O usuário encontrou o que procurava?"

Registrar buscas sem resultado para descobrir quais ferramentas estão faltando.

---

# 114. BACKLOG AUTOMÁTICO DE OPORTUNIDADES

A partir de:

- buscas sem resultado;
- sugestões;
- erros;
- ferramentas populares;
- ferramentas abandonadas;
- feedback;

gerar:

```text
OPORTUNIDADE
FREQUÊNCIA
CATEGORIA
IMPACTO
COMPLEXIDADE
STATUS
```

Isso ajuda o produto a evoluir baseado em uso real.

---

# 115. CHECKPOINT OBRIGATÓRIO APÓS A EXPANSÃO

Depois de cada grande categoria:

- [ ] Git checkpoint;
- [ ] testes;
- [ ] criticidade técnica;
- [ ] crítica UX/UI;
- [ ] revisão de segurança;
- [ ] revisão de performance;
- [ ] revisão de conteúdo;
- [ ] documentação;
- [ ] atualização do catálogo.

---

# 116. DEFINITION OF DONE V2

O projeto só pode ser considerado concluído quando:

- [ ] tudo do Definition of Done anterior continua válido;
- [ ] meta de 150 ferramentas únicas foi atingida;
- [ ] ferramentas corporativas relevantes foram incluídas;
- [ ] PDF possui fluxo robusto;
- [ ] documentos possuem geração profissional;
- [ ] planilhas/dados possuem ferramentas reais;
- [ ] financeiro possui ferramentas empresariais;
- [ ] vendas possui ferramentas reais;
- [ ] SAC possui ferramentas reais;
- [ ] RH possui ferramentas úteis;
- [ ] processos possuem ferramentas;
- [ ] produtividade possui ferramentas;
- [ ] e-commerce possui ferramentas;
- [ ] estoque/logística possui ferramentas;
- [ ] marketing possui ferramentas;
- [ ] IA está orientada a tarefas;
- [ ] busca entende intenção;
- [ ] ferramentas relacionadas formam workflows;
- [ ] histórico funciona quando previsto;
- [ ] exportações funcionam;
- [ ] permissões funcionam;
- [ ] limites de plano funcionam;
- [ ] segurança foi testada;
- [ ] LGPD foi revisada;
- [ ] mobile/PWA funciona;
- [ ] APK foi validado conforme escopo;
- [ ] críticos aprovaram;
- [ ] testes passaram;
- [ ] build final passou;
- [ ] documentação foi atualizada;
- [ ] limitações reais estão documentadas;
- [ ] Git está limpo;
- [ ] commit final foi criado.

---

# 117. REFERÊNCIAS V2

As seguintes referências foram consultadas para ampliar o escopo funcional:

- Adobe Acrobat Online: https://www.adobe.com/br/acrobat/online.html
- Adobe Acrobat PDF Editor: https://www.adobe.com/br/acrobat/online/pdf-editor.html
- Google Workspace: https://workspace.google.com/intl/pt-br/features/
- Google Workspace para empresas: https://workspace.google.com/intl/pt-BR/business/
- Google Docs: https://workspace.google.com/intl/pt-BR/products/docs/
- Google Planilhas: https://workspace.google.com/intl/pt-BR/products/sheets/
- Google Slides: https://workspace.google.com/intl/pt-BR/products/slides/
- HubSpot: https://br.hubspot.com/
- HubSpot Products: https://br.hubspot.com/products
- Ferramentas online e referências de mercado: https://news.avatix.com.br/guias/melhores-sites-ferramentas-online-gratis-2026/

Essas referências devem servir apenas para pesquisa de padrões, cobertura funcional e descoberta de necessidades.

---

# 118. INSTRUÇÃO FINAL PARA CLAUDE OPUS 5

Você não recebeu este documento para produzir uma lista bonita de funcionalidades.

Você recebeu este documento para **construir um produto utilizável**.

Não faça:

```text
"Vou criar a estrutura e deixar TODO."
```

Não faça:

```text
"Implementarei isso futuramente."
```

Não faça:

```text
"Mock temporário."
```

quando a funcionalidade for parte do escopo final.

Não faça:

```text
"150 cards com nomes diferentes."
```

Faça:

```text
150 ferramentas realmente úteis
+
fluxos compostos
+
busca inteligente
+
documentos
+
PDF
+
planilhas
+
dados
+
financeiro
+
vendas
+
SAC
+
RH
+
operações
+
produtividade
+
e-commerce
+
marketing
+
IA
+
arquivos
+
mobile
+
conta
+
histórico
+
admin
+
segurança
+
exportação
```

A plataforma deve parecer uma **caixa de ferramentas digital completa para pessoas e empresas**, sem perder a simplicidade para quem só quer resolver uma tarefa em 30 segundos.

Quando uma pessoa abrir o portal para:

> calcular

ela deve conseguir calcular.

Quando quiser:

> converter

ela deve conseguir converter.

Quando quiser:

> criar um documento

ela deve conseguir criar.

Quando quiser:

> organizar uma planilha

ela deve conseguir organizar.

Quando quiser:

> preparar uma proposta

ela deve conseguir preparar.

Quando quiser:

> atender um cliente

ela deve encontrar ferramentas para isso.

Quando quiser:

> organizar uma empresa

deve encontrar um conjunto coerente de ferramentas.

Quando quiser apenas:

> "me ajuda a fazer isso"

o sistema deve ajudar a encontrar o fluxo certo.

Esse é o objetivo final.

**Não remova nada das seções anteriores deste documento.**

**Esta V2 é cumulativa.**

**Preserve todos os requisitos, agentes, checklists, regras, ferramentas, referências, checkpoints Git, críticos, segurança, LGPD, mobile, APK, admin, notificações, banners, popups, favoritos, planos, exportações e critérios já definidos.**

**Apenas amplie, refine e conecte.**
