# Backlog de 100 melhorias reais — Sites ADS (Ander Flow)

**Fonte analisada:** GitHub, branch `ander-flow/v1`, catálogo dividido em finanças, dados e técnica, conteúdo, trabalho, ofício, PDF e avançadas. Confirmei **246 IDs únicos (F001–F246)**, com **104 ferramentas marcadas como planejadas**; há **142 prontas** no catálogo. O `portal/README.md` ainda documenta contagens antigas (208/65), e deve ser atualizado quando a geração/testes confirmarem o estado atual.

**Objetivo:** priorizar entrega funcional, não refazer design. Os itens 1–65 são ferramentas que de fato aparecem como *planejadas* no catálogo: desenvolver cada uma com UI, cálculo/conversão real, exemplo, ajuda, exportações úteis, SEO e testes. Os itens 66–85 são propostas de pesquisa/expansão que **não têm ID reservado**; deduplicar contra o catálogo real e atribuir somente o próximo Fxxx livre na implementação. Os itens 86–100 são evoluções de engenharia/UX vinculadas a entregas de ferramentas.

**Regra de automação:** cada rodada deve entregar preferencialmente um conjunto completo de ferramentas planejadas, depois novas na sequência; correções e segurança sustentam o trabalho, mas não substituem a criação. Executar na nuvem com GitHub + Actions + Google Drive, sem depender do PC. Preservar rigorosamente a identidade 2D/editorial e os componentes existentes.

## A. Finalizar ferramentas planejadas de ponta a ponta (1–65)
1. **F032 · comparar-planilhas** — Diferenças entre planilhas com chaves por coluna, inseridos/removidos/alterados, relatório e exportação Excel. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
2. **F033 · estatistica-descritiva** — Histograma, quartis, outliers, valores ausentes e métricas por coluna, sem arredondamento enganoso. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
3. **F034 · gerador-de-formulas** — Fórmulas Excel/Sheets com assistente de argumentos, prévia segura e exemplos verificáveis. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
4. **F035 · dados-de-teste** — Geração de CSV/JSON sintético com schemas, tipos, sementes reproduzíveis e proteção contra dados pessoais. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
5. **F050 · fuso-horario** — Comparador de horários de reunião com fusos reais, DST/IANA e linha do tempo visual. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
6. **F058 · modelo-de-mensagem** — Modelos editáveis com variáveis validadas, prévia em balões de conversa e exportação. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
7. **F059 · extrator-de-contatos-em-texto** — Extração de contatos somente de texto fornecido, deduplicação e máscara com avisos de privacidade. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
8. **F063 · proteger-pdf** — Proteger PDF com senha, permissões e validação de reabertura por senha. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
9. **F064 · comprimir-pdf** — Compressão de PDF com nível de qualidade, diferença visual e tamanho antes/depois. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
10. **F068 · contrato-simples** — Contrato editável de prestação de serviços com seções, campos obrigatórios e PDF de prévia. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
11. **F069 · checklist** — Checklist visual reordenável, impressão limpa, PDF e salvamento local. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
12. **F070 · pop** — POP por etapas com fluxograma, responsáveis, evidências e revisão final. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
13. **F071 · curriculo** — Currículo com seções editáveis, validação, modelos coerentes e PDF imprimível. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
14. **F072 · etiquetas** — Editor de etiquetas A4 com medidas reais, margens, visualização e PDF sem corte. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
15. **F081 · calendario-editorial** — Calendário editorial com arrastar cartões no toque, status, prazos e CSV. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
16. **F083 · gerador-de-descricao-de-produto** — Gerador estruturado de descrição de produtos sem inventar características, com SEO e visualização. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
17. **F085 · ferias** — Cálculo de férias com regras configuráveis e fontes legais atualizadas, cenário explicado. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
18. **F086 · rescisao-estimada** — Simulador de rescisão com hipóteses claras, atualização legal e exportação discriminada. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
19. **F087 · salario-liquido-estimado** — Salário líquido com tabelas oficiais atualizadas, rubricas e memória de cálculo. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
20. **F088 · escala-de-trabalho** — Escala visual com turnos, descanso mínimo, conflitos e exportação de calendário. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
21. **F093 · organograma** — Organograma SVG responsivo com zoom, edição por toque, exportação e acessibilidade. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
22. **F104 · lista-de-tarefas** — Tarefas com prioridades, status, filtros, repetição opcional e armazenamento confiável. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
23. **F105 · quadro-kanban** — Kanban com arrastar no desktop e alternativa acessível por botões no celular. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
24. **F108 · plano-de-acao** — Plano 5W2H com donos, status, dependências e exportação ordenada. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
25. **F111 · cronograma-de-projeto** — Gantt interativo com dependências e conflitos, sem sobreposição em telas pequenas. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
26. **F112 · matriz-de-risco** — Matriz 5×5 com probabilidade, impacto, mitigação e legenda acessível. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
27. **F113 · matriz-raci** — Matriz RACI editável com avisos quando faltam responsáveis ou há mais de um A. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
28. **F118 · quiz-de-multipla-escolha** — Quiz com embaralhamento controlado, correção e progresso visual. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
29. **F119 · flashcards** — Flashcards com resposta revelável, progressão e revisão espaçada. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
30. **F120 · plano-de-estudos** — Plano de estudo com objetivos, tempo disponível e metas semanais mensuráveis. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
31. **F122 · simulado** — Simulado com gabarito, peso por questão, temporizador e análise de erros. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
32. **F130 · mapa-mental** — Mapa mental em SVG com edição por toque, reordenação e exportação. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
33. **F135 · ficha-tecnica** — Ficha técnica de produto com CMV, desperdício, variações e margem. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
34. **F155 · digitalizar-para-pdf** — Digitalização por câmera com correção de perspectiva, corte e PDF multipágina. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
35. **F156 · reparar-pdf** — Reparo real de PDF malformado com verificações de integridade e mensagens honestas. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
36. **F157 · ocr-pdf** — OCR de PDF com indicação de confiança, seleção de idioma e exportação pesquisável. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
37. **F159 · word-para-pdf** — Conversão Word→PDF com preservação de layout e testes de documentos variados. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
38. **F160 · powerpoint-para-pdf** — Slides→PDF preservando proporção, fontes substituídas e links quando possível. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
39. **F161 · excel-para-pdf** — Planilha→PDF com áreas de impressão, orientação, escalonamento e paginação. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
40. **F164 · pdf-para-word** — Extração PDF→DOCX editável, com avisos para tabelas e layouts complexos. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
41. **F166 · pdf-para-excel** — Extração de tabelas PDF→Excel, revisão antes do download e tipos numéricos. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
42. **F167 · pdf-para-pdfa** — Conversão para PDF/A com validação formal de conformidade por perfil. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
43. **F168 · editar-pdf** — Editor PDF com texto/anotações e interface visual por página, salvamento validado. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
44. **F173 · desbloquear-pdf** — Remover senha somente de documentos autorizados, comprovando senha fornecida. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
45. **F177 · resumir-pdf** — Resumo de PDF com citações de páginas, limites de contexto e privacidade explícita. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
46. **F179 · pdf-para-markdown** — Conversão PDF→Markdown mantendo títulos/listas/tabelas e referência de páginas. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
47. **F180 · remover-fundo-de-imagem** — Remoção de fundo com comparação lado a lado e bordas ajustáveis. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
48. **F181 · ocr-de-imagem** — OCR de imagem com áreas selecionáveis, confiança e correção manual. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
49. **F182 · heic-para-jpg** — HEIC→JPEG com preservação de orientação e tratamento de metadados. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
50. **F183 · ampliar-imagem** — Ampliação com algoritmos reais, comparação e memória limitada no celular. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
51. **F187 · converter-video** — Conversão de vídeo com formatos compatíveis, duração/tamanho final e progresso real. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
52. **F188 · comprimir-video** — Compressão por preset de qualidade, comparação de bitrate e ETA aproximada quando verificável. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
53. **F189 · cortar-video-e-audio** — Corte em linha do tempo por toque com prévia de intervalos e exportação. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
54. **F190 · extrair-audio-de-video** — Extração do áudio, escolha de codec e verificação de duração. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
55. **F191 · converter-audio** — Conversão WAV/MP3/OGG com bitrate, amostragem e testes de integridade. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
56. **F192 · transcrever-audio** — Transcrição com timestamps e opção de modelo local/cloud aprovado. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
57. **F194 · gravador-de-tela-e-audio** — Gravação com permissões explícitas, pause/retome, indicador de gravação e download. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
58. **F195 · traduzir-texto** — Tradução com seleção de idiomas, contexto e prevenção de falsa promessa offline. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
59. **F196 · corrigir-texto** — Revisão gramatical comparativa com destaque de alterações aceitas/rejeitadas. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
60. **F197 · resumir-texto** — Resumo com controle de tamanho, tópicos e fidelidade ao texto informado. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
61. **F198 · converter-documento** — Conversor de documentos com matriz real de formatos suportados, erros e QA. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
62. **F202 · encurtador-de-links** — Encurtamento com armazenamento seguro, estatística consentida e proteção antiabuso. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
63. **F204 · calculadora-mei-das** — MEI/DAS com calendário, faixas oficiais e fontes revisadas antes da publicação. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
64. **F205 · consulta-de-cep** — Consulta de CEP com fallback e tratamento de API indisponível. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.
65. **F206 · consulta-de-cnpj** — Consulta de CNPJ com fonte autorizada, cota, cache e privacidade. Critério: módulo utilizável + teste automatizado + cenário visual + exportação coerente.

## B. Pesquisa e criação avançada em novos IDs sequenciais (66–85)
66. **Mapa de taxas entre marketplaces** — Comparar tarifas efetivas por categoria, faixa e modalidade de frete, deduplicando simuladores existentes. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
67. **Auditoria de reembolsos multi-etapas** — Conciliar pedidos, estornos parciais, taxas devolvidas e diferenças em lotes. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
68. **Desvios de ROAS versus margem líquida** — Importar campanhas e CMV para distinguir receita atribuída de contribuição real. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
69. **Diagnóstico de produtos encalhados por cohort** — Cruzar data de entrada, giro e custos de armazenamento sem repetir F238. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
70. **Previsão de atraso de fornecedor** — Avaliar variabilidade histórica de entregas, lead time e impacto na ruptura. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
71. **Análise de variação de frete por transportadora** — Comparar tabelas de peso cúbico, CEP, prazo e tarifa faturada. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
72. **Validador de GTIN/EAN e catálogo Merchant Center** — Checar identificadores, campos obrigatórios e erros de feed com documentação atual. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
73. **Auditor de schema.org Product/Offer** — Checar JSON-LD, preços, disponibilidade e inconsistências técnicas de produto. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
74. **Checklist de migração SEO entre catálogos** — Comparar slugs, metadados, canonicals e redirecionamentos em lote. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
75. **Simulador de precificação com taxa variável** — Calcular limites por comissão/categoria sem duplicar ferramentas prontas. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
76. **Planejamento de campanhas com teto de orçamento** — Distribuir orçamento entre canais sob meta de contribuição e restrições. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
77. **Auditoria de recebíveis e antecipações** — Reconciliação por parcelas, prazos e taxas após deduplicar conciliação existente. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
78. **Simulador de ruptura multi-CD** — Realocar entre depósitos e calcular custo/benefício com disponibilidade e transporte. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
79. **Diagnóstico ABC-XYZ com tendência** — Unir variabilidade e valor de giro para orientar compras com série temporal. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
80. **Análise de SLA de expedição por janela** — Comparar cut-offs, capacidade por turno e pedidos em atraso. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
81. **Previsão de devoluções por motivo** — Estimar custos por categoria e ações usando dados anonimizados. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
82. **Simulador de kits e bundles com canibalização** — Considerar compra conjunta versus venda unitária, imposto e estoque reservado. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
83. **Planilha de comissão de afiliados** — Calcular comissão, cancelamento e estorno com histórico auditável. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
84. **Projeção de LTV por canal de aquisição** — Considerar margem de contribuição, churn e período de retenção. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.
85. **Verificador de consistência de anúncios** — Comparar título, imagem, preço, estoque e promessa entre canais. Antes: pesquisar fontes oficiais recentes, conferir conflito com catálogo e atribuir próximo Fxxx livre.

## C. Evolução transversal de produto e infraestrutura (86–100)
86. **Motor de progressão visual real** — Integrar etapas reais de validação, cálculo e exportação sem progresso aleatório. Entregar acoplado a uma ferramenta, com teste e evidência.
87. **Exemplos premium em componentes editáveis** — Substituir enormes áreas CSV isoladas por exemplos bonitos e opção de importar. Entregar acoplado a uma ferramenta, com teste e evidência.
88. **Cards de métricas contextualizadas** — Adicionar visual padrão com fonte, fórmula e contexto para resultados. Entregar acoplado a uma ferramenta, com teste e evidência.
89. **Gráficos SVG acessíveis de comparação** — Visualizar antes/depois, riscos e distribuições respeitando temas existentes. Entregar acoplado a uma ferramenta, com teste e evidência.
90. **Melhorar uso ao toque** — Garantir alvos de 44 px, teclado virtual, foco e rolagem sem corte em 390 px. Entregar acoplado a uma ferramenta, com teste e evidência.
91. **Acessibilidade e redução de movimento** — Respeitar prefers-reduced-motion, aria-live e navegação por teclado. Entregar acoplado a uma ferramenta, com teste e evidência.
92. **Exportações seguras** — Impedir CSV formula injection, testar UTF-8, XLSX e PDF em arquivos reais. Entregar acoplado a uma ferramenta, com teste e evidência.
93. **Infra cloud sem PC** — Planejar backend persistente e banco adequado, sem depender de túnel local ou disco efêmero. Entregar acoplado a uma ferramenta, com teste e evidência.
94. **Deploy automatizado GitHub Actions** — Executar CI, gerar páginas e artefatos de release a cada entrega aprovada. Entregar acoplado a uma ferramenta, com teste e evidência.
95. **Restauração de banco e migrations** — Testar migrações e backup/restauração em CI antes de publicar mudanças de schema. Entregar acoplado a uma ferramenta, com teste e evidência.
96. **Sessão e autenticação no mesmo domínio** — Remover dependência operacional do túnel e manter cookie HttpOnly em URL estável. Entregar acoplado a uma ferramenta, com teste e evidência.
97. **Versões organizadas no Drive** — Subir somente versões verificadas à pasta correta sem sobrescrever histórico. Entregar acoplado a uma ferramenta, com teste e evidência.
98. **Catálogo com estados reais** — Recusar status pronta sem módulo, testes, exemplos e execução verificável. Entregar acoplado a uma ferramenta, com teste e evidência.
99. **Checagem de traduções e conteúdo** — Validar i18n de nomes, tags, tutoriais, mensagens e SEO em cada nova ferramenta. Entregar acoplado a uma ferramenta, com teste e evidência.
100. **Performance e orçamento de JS** — Medir carga e interação no Android, dividir bundles e evitar animações pesadas. Entregar acoplado a uma ferramenta, com teste e evidência.

## Critérios mínimos de aceite por ferramenta

- **Frontend full stack:** HTML/CSS/JS sem mudar identidade visual; inputs e resultados reais, feedback ao toque, estados de loading/erro/sucesso, responsivo 390×844, foco visível, gráficos SVG quando ajudarem a explicar.
- **Backend/arquivos:** API Node e autorização por plano quando Premium, SQLite ou serviço adequado se necessário; nunca simular resultado ou processar dados secretos no GitHub Pages.
- **Confiabilidade:** erro em entradas vazias/negativas/malformadas, limites, fórmulas perigosas em CSV/XLSX, 401/403 corretos, arquivo de exportação que abre; exemplos com valores conhecidos.
- **Catálogo/i18n:** incrementar Fxxx quando for nova ferramenta, ou marcar planejada como pronta só após QA; adicionar tradução de busca, texto curto, tutorial discreto e SEO sem spam.
- **Infra:** testes via GitHub Actions, artefatos e site público verificados; Google Drive em `0. Meus Projetos Dev / Projetos / Sites ADS — Ander Flow` (pasta ID `1lZDbAR9TAc9y-kU8Efpa_2dQc_0bhPT5`) versionado; APK só se houver app Android real testado.
- **Histórico:** registrar status de cada item como pendente / em execução / validado junto ao commit, sem apagar versões anteriores.

Atualizar este backlog conforme forem concluídos os itens: quando não houver pendentes, pesquisar e adicionar novas iniciativas com base em evidências e criar ferramentas novas com o próximo número disponível.
