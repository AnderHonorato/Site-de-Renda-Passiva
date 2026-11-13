/** Especificações públicas; motores e auditorias executam somente no servidor. */
export const especificacoes = [
  {
    id: "F327",
    slug: "referencias-cruzadas-documento",
    nome: "Auditoria de referências cruzadas",
    nomeEn: "Cross-reference auditor",
    cat: "documentos",
    plano: "plus",
    resumo:
      "Encontra referências a seções, tabelas, figuras e anexos que não existem.",
    problema:
      "Revisar manuais e relatórios com muitos links internos sem conferir ocorrência por ocorrência.",
    processa:
      "Extrai seções numeradas e alvos Tabela/Figura/Anexo em títulos Markdown. Resolve menções pelo par tipo/número, identifica destinos ausentes, ambíguos e definições duplicadas.",
    sai: "Tabela por tipo, número, linha e estado de resolução; inclui alvos sem menção.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "## 1 Introdução\nConsulte a Seção 3.\n\n## 2 Escopo\nConsulte a Tabela 1.\n\n## 3 Método\nTexto.",
    opcoes: [],
    limites:
      "Analisa padrões textuais explícitos em TXT/MD ou texto extraído de PDF/DOCX; não inspeciona hyperlinks binários nem entende sinônimos de títulos.",
    referencia: "https://docling.ai/formats/",
  },
  {
    id: "F328",
    slug: "concordancia-terminologica",
    nome: "Concordância terminológica",
    nomeEn: "Terminology consistency checker",
    cat: "documentos",
    plano: "plus",
    resumo:
      "Compara termos do documento com um glossário controlado e aponta variantes.",
    problema:
      "Evitar que a mesma entidade ou conceito receba nomes diferentes em documentação técnica.",
    processa:
      "Lê pares termo preferido/variantes, normaliza caixa e Unicode, busca fronteiras de palavra e agrupa ocorrências conflitantes sem alterar o texto.",
    sai: "Matriz de termo preferido, forma encontrada, contagem e estado de uso; termos sem ocorrência permanecem visíveis.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "A API usa o O Auth. OAuth é o protocolo de autorização. O acesso usa protocolo OAuth.\nGLOSSÁRIO:\nOAuth | O Auth | protocolo OAuth",
    opcoes: [],
    limites:
      "O glossário é fornecido no texto após a linha GLOSSÁRIO:, um termo por linha no formato preferido | variante1 | variante2. Busca literal sem análise morfológica ou inferência semântica; aceita até 200 termos e 128 caracteres por termo para evitar padrões de busca descontrolados.",
    referencia:
      "https://docs.soda.io/soda-documentation/developer-tools/contract-language-reference",
  },
  {
    id: "F329",
    slug: "matriz-rastreabilidade-requisitos",
    nome: "Matriz de rastreabilidade de requisitos",
    nomeEn: "Requirements traceability matrix",
    cat: "documentos",
    plano: "premium",
    resumo:
      "Liga requisitos identificados a evidências textuais e revela itens sem cobertura.",
    problema:
      "Manter correspondência verificável entre uma lista de requisitos e capítulos de uma especificação.",
    processa:
      "Extrai declarações REQ-n e indexa menções fora das linhas de declaração. Calcula cobertura textual, lista linhas de evidência e aponta IDs duplicados e menções sem declaração.",
    sai: "Matriz de requisito, linha, cobertura, linhas das menções e integridade do ID.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "## Requisitos\nREQ-01: O sistema deve exportar CSV.\nREQ-02: O sistema deve manter histórico.\n\n## Implementação\nREQ-01 é coberto pelo módulo de exportação.",
    opcoes: [],
    limites:
      "IDs são literais e devem usar REQ-n; cobertura significa menção identificável, não comprovação funcional ou certificação.",
    referencia: "https://developer.adobe.com/document-services/docs/overview/",
  },
  {
    id: "F330",
    slug: "clausulas-quase-duplicadas",
    nome: "Detector de cláusulas quase duplicadas",
    nomeEn: "Near-duplicate clause detector",
    cat: "documentos",
    plano: "premium",
    resumo:
      "Localiza cláusulas textuais semelhantes para revisão de consistência.",
    problema:
      "Encontrar trechos repetidos com pequenas alterações de palavras ou ordem em documentos extensos.",
    processa:
      "Separa até 140 parágrafos com mais de 20 caracteres, normaliza Unicode/caixa e calcula similaridade Jaccard de shingles de duas palavras; retorna pares acima do limiar.",
    sai: "Pares de parágrafos com score Jaccard e trechos lado a lado.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "O fornecedor deve guardar os registros por 90 dias após o encerramento.\n\nO fornecedor deverá guardar os registros por 90 dias após o encerramento.\n\nO sistema reinicia após manutenção.",
    opcoes: [
      {
        nome: "limiar",
        rotulo: "Similaridade mínima (%)",
        tipo: "numero",
        padrao: 50,
        minimo: 10,
        maximo: 100,
      },
    ],
    limites:
      "Até 140 parágrafos elegíveis (9.730 pares) por lote. Não remove stopwords, nem interpreta equivalência jurídica, negação ou efeito das alterações.",
    referencia: "https://www.gonitro.com/automate",
  },
  {
    id: "F331",
    slug: "segmentador-estrutural-documento",
    nome: "Segmentador estrutural de documentos",
    nomeEn: "Structural document chunker",
    cat: "documentos",
    plano: "plus",
    resumo:
      "Divide texto em trechos estáveis preservando títulos, listas e limites.",
    problema:
      "Preparar documentos para indexação ou revisão sem cortar parágrafos no meio.",
    processa:
      "Usa títulos Markdown e parágrafos como blocos indivisíveis, agrupa até um alvo flexível de caracteres e replica uma cauda configurada entre trechos da mesma seção.",
    sai: "Trechos exportáveis com título de origem, linhas inicial/final, caracteres e texto integral.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "## Instalação\n\nInstale o pacote.\n\n## Configuração\n\nDefina a porta.\n\n## Execução\n\nInicie o serviço.",
    opcoes: [
      {
        nome: "alvo",
        rotulo: "Tamanho alvo em caracteres",
        tipo: "numero",
        padrao: 1000,
        minimo: 100,
        maximo: 10000,
      },
      {
        nome: "sobreposicao",
        rotulo: "Sobreposição em caracteres",
        tipo: "numero",
        padrao: 100,
        minimo: 0,
        maximo: 1000,
      },
    ],
    limites:
      "Alvo flexível: parágrafos longos podem excedê-lo. Sobreposição deve ser menor que o alvo e pode começar no meio de linha; linhas em branco são normalizadas. Sem embeddings ou inferência semântica.",
    referencia: "https://docling.ai/formats/",
  },
  {
    id: "F332",
    slug: "diff-hierarquico-documentos",
    nome: "Diff hierárquico de documentos",
    nomeEn: "Hierarchical document diff",
    cat: "documentos",
    plano: "premium",
    resumo: "Compara versões por seção e detecta blocos movidos com LCS.",
    problema:
      "Revisar mudanças sem confundir conteúdo realocado com inserções e remoções.",
    processa:
      "Separa seções por títulos Markdown e inclui o preâmbulo. Aplica LCS aos blocos com Unicode/caixa/espaços normalizados, usa IDs internados e pareia alterações por título ou movimentos por conteúdo.",
    sai: "Relatório de seções adicionadas/removidas/alteradas e blocos movidos com posição antiga/nova.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "## A\nAlfa estável.\n\n## B\nBloco que muda.\n\n## C\nConclusão.\n\n--- VERSÃO 2 ---\n## A\nAlfa estável.\n\n## C\nConclusão.\n\n## B\nBloco que muda.",
    opcoes: [],
    limites:
      "Máximo de 400 blocos em cada versão (até 160.000 células LCS). Não alinha árvores de títulos nem compara formatação/imagens; caixa e espaços são normalizados. Separe versões por --- VERSÃO 2 ---.",
    referencia: "https://docs.groupdocs.com/comparison/",
  },
  {
    id: "F333",
    slug: "integridade-numeracao-secoes",
    nome: "Integridade da numeração de seções",
    nomeEn: "Section numbering integrity checker",
    cat: "documentos",
    plano: "plus",
    resumo:
      "Detecta lacunas, repetições e saltos entre seções irmãs em hierarquias numeradas.",
    problema:
      "Conferir numeração de capítulos após editar ou reorganizar um manual.",
    processa:
      "Extrai prefixos decimais de títulos Markdown, mantém contador por prefixo pai e identifica duplicidade, regressão, salto e seção-pai não declarada.",
    sai: "Tabela de número, linha, título e estado da sequência.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "## 1 Escopo\n## 1.1 Dados\n## 1.3 Exportação\n## 2 Testes\n## 2 Testes",
    opcoes: [],
    limites:
      "Aceita numeração decimal hierárquica em títulos Markdown; numeração romana e estilos Word não são interpretados.",
    referencia: "https://docling.ai/formats/",
  },
  {
    id: "F334",
    slug: "validador-legendas-srt-vtt",
    nome: "Validador estrutural de legendas SRT/VTT",
    nomeEn: "SRT/VTT subtitle validator",
    cat: "documentos",
    plano: "plus",
    resumo:
      "Valida índices repetidos, timestamps, sobreposições e ordenação das legendas.",
    problema:
      "Corrigir erros de estrutura antes de enviar uma faixa de legenda a um editor de vídeo.",
    processa:
      "Faz parse de cues SRT/WebVTT, confere timestamp, duração positiva, IDs repetidos, ordem temporal, texto vazio e sobreposição com cues anteriores.",
    sai: "Tabela de cue com início/fim, duração, texto e avisos de sobreposição/ordem.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "1\n00:00:01,000 --> 00:00:02,500\nOlá.\n\n2\n00:00:02,000 --> 00:00:03,000\nBem-vindo.",
    opcoes: [],
    limites:
      "Aceita SRT com hh:mm:ss,mmm e WebVTT com mm:ss.mmm ou hh:mm:ss.mmm. Ignora NOTE/STYLE/REGION em WebVTT; não valida cue settings, alinhamento com áudio ou transcrição.",
    referencia: "https://ffmpeg.org/ffmpeg-all.html",
  },
  {
    id: "F335",
    slug: "diff-openapi-compatibilidade",
    nome: "Diff de compatibilidade OpenAPI",
    nomeEn: "OpenAPI compatibility diff",
    cat: "desenvolvimento",
    plano: "premium",
    resumo:
      "Detecta mudanças incompatíveis entre dois documentos OpenAPI em JSON.",
    problema:
      "Antecipar quebras de contrato antes de publicar uma nova especificação de API.",
    processa:
      "Compara paths/métodos, parâmetros herdados, corpos e mídias de resposta; percorre schemas inline para tipos, required, enum, propriedades e itens de array. Distingue restrições de entrada de expansão de saída.",
    sai: "Matriz de path, método, caminho do schema, mudança e classificação de compatibilidade.",
    entrada: "documento",
    colunas: [],
    exemplo:
      '--- VERSÃO 1 ---\n{"openapi":"3.0.0","paths":{"/items":{"get":{"responses":{"200":{"description":"ok"}}}}}}\n--- VERSÃO 2 ---\n{"openapi":"3.0.0","paths":{}}',
    opcoes: [],
    limites:
      "OpenAPI 3.x em JSON com schemas inline até 12 níveis. Recusa $ref, composição e condicionais. Não verifica format/min/max, autenticação, callbacks ou comportamento servidor. Zero achados aplica-se apenas às regras listadas.",
    referencia: "https://spec.openapis.org/oas/latest.html",
  },
  {
    id: "F336",
    slug: "validador-sbom-spdx-cyclonedx",
    nome: "Validador local de SBOM e política de licenças",
    nomeEn: "Local SBOM and license policy validator",
    cat: "segurança",
    plano: "premium",
    resumo:
      "Confere referências e múltiplas licenças em SBOM SPDX/CycloneDX JSON com uma política local.",
    problema:
      "Revisar inventário de componentes e licenças sem depender de varredura de vulnerabilidades remota.",
    processa:
      "Lê componentes, incluindo componentes aninhados CycloneDX; confere nome/versão, IDs duplicados, referências e todas as licenças declaradas contra uma lista de bloqueio local.",
    sai: "Tabela de componente, versão, licença, vínculo inválido ou regra acionada.",
    entrada: "documento",
    colunas: [],
    exemplo:
      '{"bomFormat":"CycloneDX","specVersion":"1.5","version":1,"components":[{"type":"library","name":"alpha","version":"1.0.0","licenses":[{"license":{"id":"MIT"}}]}]}',
    opcoes: [
      {
        nome: "licencasBloqueadas",
        rotulo: "IDs de licença bloqueados (separados por vírgula)",
        tipo: "texto",
        padrao: "GPL-3.0-only,AGPL-3.0-only",
      },
    ],
    limites:
      "Subset estrutural de CycloneDX 1.5 e SPDX 2.2/2.3 JSON; até 2.000 componentes e 12 níveis. Não valida o esquema completo, resolve dependências transitivas nem consulta CVEs. Expressões OR/WITH exigem revisão humana; bom-ref é opcional se não referenciado.",
    referencia: "https://cyclonedx.org/specification/",
  },
  {
    id: "F337",
    slug: "auditoria-acessibilidade-markdown",
    nome: "Auditoria de acessibilidade Markdown",
    nomeEn: "Markdown accessibility audit",
    cat: "documentos",
    plano: "plus",
    resumo:
      "Verifica títulos, links, tabelas e descrições alternativas em Markdown.",
    problema:
      "Encontrar obstáculos básicos de leitura assistiva antes de publicar documentação.",
    processa:
      "Varre headings por hierarquia, imagens sem alt, links com rótulo genérico, tabelas sem cabeçalho e blocos de código sem linguagem declarada.",
    sai: "Achados por linha com regra, trecho e correção sugerida; não certifica conformidade WCAG.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "## Guia\n\n![diagrama](fluxo.png)\n\n[clique aqui](https://example.com)\n\n| A | B |\n|---|---|\n| 1 | 2 |",
    opcoes: [],
    limites:
      "Verificação estática de Markdown; não é auditoria WCAG completa nem interpreta conteúdo alternativo.",
    referencia: "https://www.w3.org/WAI/tutorials/images/",
  },
  {
    id: "F338",
    slug: "auditor-rfc2119-normativo",
    nome: "Auditor de linguagem normativa RFC 2119",
    nomeEn: "RFC 2119 normative language auditor",
    cat: "documentos",
    plano: "premium",
    resumo:
      "Localiza MUST/SHOULD/MAY, exceções e itens sem identificador estável.",
    problema:
      "Tornar requisitos normativos de especificações mais rastreáveis e revisáveis.",
    processa:
      "Extrai cada palavra-chave RFC 2119 em caixa alta, associa ID REQ/RFC na mesma linha e marca expressões explícitas de exceção.",
    sai: "Tabela de linha, ID, força normativa, exceção e declaração.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "REQ-1: The client MUST send an Authorization header.\nThe server SHOULD retry after a timeout.\nREQ-2: The server MUST NOT log the token.",
    opcoes: [],
    limites:
      "Padrões textuais para revisão editorial; não determina se a norma é tecnicamente correta ou juridicamente obrigatória.",
    referencia: "https://www.rfc-editor.org/rfc/rfc2119",
  },
  {
    id: "F339",
    slug: "validar-placeholders-icu",
    nome: "Auditoria de placeholders de localização",
    nomeEn: "Localization placeholder audit",
    cat: "documentos",
    plano: "plus",
    resumo: "Compara variáveis e plurais entre textos de origem e tradução.",
    problema:
      "Evitar que traduções removam ou alterem placeholders usados em mensagens da interface.",
    processa:
      "Faz parse balanceado de argumentos básicos, number/date/time sem subformato e plural/select/selectordinal de primeiro nível; compara nome, tipo, categorias e multiplicidade.",
    sai: "Matriz de chave, argumento esperado/encontrado e resultado.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "source: You have {count, plural, one {# file} other {# files}}\n--- TRADUÇÃO ---\npt: Você tem {count, plural, one {# arquivo} other {# arquivos}}",
    opcoes: [],
    limites:
      "Exige opção other e categorias sem duplicação. Recusa aninhamento, offset, quoting com apóstrofo e subformatos que não interpreta. Não valida regras CLDR de cada idioma. Separe origem e tradução por --- TRADUÇÃO ---.",
    referencia: "https://formatjs.github.io/docs/core-concepts/icu-syntax/",
  },
  {
    id: "F340",
    slug: "normalizador-referencias-bibliograficas",
    nome: "Normalizador de referências bibliográficas",
    nomeEn: "Bibliography normalizer",
    cat: "documentos",
    plano: "plus",
    resumo:
      "Normaliza DOI e espaços e agrupa referências duplicadas por DOI ou texto literal.",
    problema:
      "Limpar uma bibliografia antes de consolidar referências entre documentos.",
    processa:
      "Lê uma referência por linha, extrai DOI com prefixo doi: ou doi.org, normaliza DOI/Unicode/caixa/espaços e agrupa duplicatas por DOI ou texto normalizado.",
    sai: "Tabela de linha, referência normalizada, DOI e referência à primeira duplicata.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "Silva, A. (2022). Dados confiáveis. https://doi.org/10.1000/ABC\nSilva, A. 2022. Dados confiáveis. doi:10.1000/abc",
    opcoes: [],
    limites:
      "Não decompõe autor, ano, título ou periódico e não busca metadados externos. DOI prevalece sobre diferenças de texto; referências sem DOI usam chave textual normalizada.",
    referencia:
      "https://www.crossref.org/documentation/retrieve-metadata/rest-api/",
  },
  {
    id: "F341",
    slug: "extrator-acoes-atas",
    nome: "Extrator determinístico de ações e prazos em atas",
    nomeEn: "Meeting action and deadline extractor",
    cat: "documentos",
    plano: "plus",
    resumo:
      "Localiza decisões e tarefas explícitas com responsável e data textual.",
    problema:
      "Transformar atas em lista de acompanhamento sem reinterpretar as falas.",
    processa:
      "Busca os marcadores ação, decisão, decidido e tarefa; extrai texto da mesma linha, responsável explícito ou nome antes de verbo conhecido e primeira data ISO/DD-MM-AAAA.",
    sai: "Tabela de ação, responsável, prazo, evidência e campo ausente.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "Decisão: publicar a versão 2.\nAção: Ana revisar o manual até 2026-12-01.\nAção: enviar relatório.",
    opcoes: [],
    limites:
      "Extração por marcadores e padrões na mesma linha; datas são textuais, sem validar calendário. Não entende pronomes, datas relativas ou compromissos implícitos.",
    referencia: "https://docling.ai/formats/",
  },
  {
    id: "F342",
    slug: "integridade-tabelas-markdown",
    nome: "Integridade de tabelas Markdown",
    nomeEn: "Markdown table integrity checker",
    cat: "documentos",
    plano: "plus",
    resumo:
      "Encontra linhas com número de células inconsistente e delimitadores inválidos.",
    problema:
      "Corrigir tabelas que quebram renderizadores ou exportações para documentos.",
    processa:
      "Reconhece tabelas iniciadas por pipe, exige separador de cabeçalho, conta células respeitando pipes escapados e runs de backticks e verifica contagem no separador e corpo.",
    sai: "Tabela de linha, contagem esperada/real e regra quebrada.",
    entrada: "documento",
    colunas: [],
    exemplo: "| nome | valor |\n|---|---:|\n| A | 10 |\n| B | 2 |extra",
    opcoes: [],
    limites:
      "Subset de tabelas pipe com pipe inicial; não avalia sentido dos dados nem tabelas HTML. Conteúdo de código inline exige runs de backticks de mesmo comprimento.",
    referencia: "https://commonmark.org/help/",
  },
  {
    id: "F343",
    slug: "auditor-blocos-codigo-markdown",
    nome: "Auditor de blocos de código Markdown",
    nomeEn: "Markdown code block auditor",
    cat: "documentos",
    plano: "plus",
    resumo:
      "Detecta cercas sem fechamento e linguagens ausentes ou fora da lista permitida.",
    problema:
      "Evitar que exemplos técnicos sejam renderizados como texto corrido ou com destaque errado.",
    processa:
      "Acompanha cercas de backticks/til com até três espaços iniciais, exige fechamento compatível e sem info string, e confere linguagem contra lista configurável.",
    sai: "Achados por linha com linguagem e motivo; identifica cerca ainda aberta.",
    entrada: "documento",
    colunas: [],
    exemplo: '```js\nconst ok = true;\n```\n~~~py\nprint("oi")\n~~~',
    opcoes: [
      {
        nome: "linguagens",
        rotulo: "Linguagens permitidas (separadas por vírgula)",
        tipo: "texto",
        padrao:
          "js,ts,typescript,py,python,json,yaml,yml,bash,sh,html,css,sql,md,markdown",
      },
    ],
    limites:
      "Não executa nem valida código; valida apenas a estrutura e rótulo da cerca.",
    referencia: "https://commonmark.org/help/",
  },
  {
    id: "F344",
    slug: "consistencia-versoes-semver-documentos",
    nome: "Consistência de versões SemVer em documentação",
    nomeEn: "SemVer consistency audit",
    cat: "documentos",
    plano: "plus",
    resumo: "Compara versões citadas no frontmatter, changelog e exemplos.",
    problema:
      "Encontrar referências desatualizadas após uma versão de produto ser alterada.",
    processa:
      "Extrai MAJOR.MINOR.PATCH com prerelease/build, valida SemVer e identifica valores distintos em marcações explícitas version:, heading v ou versão atual.",
    sai: "Versão por linha, contexto e indicação de sintaxe inválida, marcações conflitantes ou divergência do valor atual.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "---\nversion: 2.1.0\n---\n# v2.1.0\nA versão atual é 2.1.0.\nO exemplo antigo usa 1.9.0.",
    opcoes: [],
    limites:
      "Não escolhe a versão correta. Exemplos antigos e changelogs podem divergir legitimamente; compara prerelease/build literalmente e requer revisão do contexto.",
    referencia: "https://semver.org/",
  },
  {
    id: "F345",
    slug: "validador-frontmatter-documentacao",
    nome: "Validador de metadados escalares da documentação",
    nomeEn: "Documentation front matter validator",
    cat: "documentos",
    plano: "plus",
    resumo:
      "Verifica campos title, version SemVer e draft boolean no frontmatter Markdown.",
    problema: "Padronizar metadados de páginas técnicas e publicações.",
    processa:
      "Lê frontmatter delimitado por --- no início, confere chaves duplicadas, title textual, version SemVer e draft boolean literal.",
    sai: "Tabela de linha, chave, valor e estado, incluindo tipos e campos ausentes.",
    entrada: "documento",
    colunas: [],
    exemplo: "---\ntitle: Guia\nversion: 1.0.0\ndraft: false\n---\n# Conteúdo",
    opcoes: [],
    limites:
      "Subset de YAML plano com valores escalares em uma linha. Listas, objetos, âncoras e scalars multilinha ficam sinalizados como não suportados; não é validador YAML geral.",
    referencia: "https://yaml.org/spec/1.2.2/",
  },
  {
    id: "F346",
    slug: "auditoria-exemplos-configuracao",
    nome: "Auditoria de exemplos de configuração JSON",
    nomeEn: "Configuration example auditor",
    cat: "desenvolvimento",
    plano: "premium",
    resumo:
      "Compara chaves dos exemplos com um esquema de referência embutido no texto.",
    problema:
      "Detectar configurações de documentação que ficaram incompatíveis com o esquema atual.",
    processa:
      "Lê SCHEMA: em uma linha e blocos json; valida tipo raiz, required/properties aninhados, items de arrays, enum e additionalProperties boolean, recusando keywords sem suporte.",
    sai: "Tabela por exemplo e caminho JSON com tipo encontrado e erro de estrutura ou sintaxe.",
    entrada: "documento",
    colunas: [],
    exemplo:
      'SCHEMA: {"type":"object","required":["port"],"properties":{"port":{"type":"integer"}}}\n```json\n{"port":8080}\n```',
    opcoes: [],
    limites:
      "Subset explícito de JSON Schema; esquema com até 12 níveis e exemplo com até 20 níveis. Não processa YAML. Outras keywords são recusadas para evitar resultados incompletos apresentados como válidos.",
    referencia: "https://json-schema.org/learn/getting-started-step-by-step",
  },
  {
    id: "F347",
    slug: "rastreabilidade-achados-seguranca",
    nome: "Rastreabilidade de achados de segurança documentados",
    nomeEn: "Security finding traceability auditor",
    cat: "segurança",
    plano: "premium",
    resumo: "Liga IDs de achados a severidade, resolução e evidência no texto.",
    problema:
      "Revisar relatórios técnicos para achar findings sem evidência ou status claro.",
    processa:
      "Agrupa IDs CVE/CWE/FINDING-n, severidades critical/high/medium/low e status open/fixed/mitigated/accepted/closed em cada linha; aponta campos ausentes e conflitos entre menções.",
    sai: "Tabela por ID com severidade/status observados, linhas e inconsistências.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "CVE-2024-12345 | HIGH | mitigated\nFinding-17 severity=medium status=open\nCVE-2024-12345 status=open",
    opcoes: [],
    limites:
      "Não consulta bancos de vulnerabilidade nem confirma se um finding é real; somente consistência textual local.",
    referencia: "https://www.cve.org/ResourcesSupport/Glossary",
  },
  {
    id: "F348",
    slug: "completude-modelo-documental",
    nome: "Checador de completude contra modelo documental",
    nomeEn: "Document template completeness checker",
    cat: "documentos",
    plano: "plus",
    resumo: "Confere presença e ordem de seções obrigatórias configuradas.",
    problema:
      "Revisar propostas, relatórios e procedimentos contra um modelo interno.",
    processa:
      "Lê lista de seções esperadas após MODELO:, normaliza numeração e acentos, verifica presença, ordem, duplicidade e conteúdo vazio sob heading.",
    sai: "Checklist por seção com presença, linha original, posição esperada e achados de conteúdo vazio, duplicidade e ordem.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "MODELO: Resumo; Escopo; Procedimento; Riscos; Aprovação\n\n# Resumo\nTexto.\n# Escopo\nTexto.\n# Procedimento\n\n# Aprovação\nNome.",
    opcoes: [],
    limites:
      "Checklist definido pelo usuário; não decide se o conteúdo atende ao mérito ou a norma externa.",
    referencia: "https://docling.ai/formats/",
  },
  {
    id: "F349",
    slug: "auditor-proveniencia-figuras-tabelas",
    nome: "Auditor de fontes em tabelas e figuras",
    nomeEn: "Figure and table source auditor",
    cat: "documentos",
    plano: "plus",
    resumo:
      "Detecta tabelas e figuras sem legenda, número ou indicação de fonte.",
    problema:
      "Completar proveniência de evidências em relatórios antes da circulação.",
    processa:
      "Localiza rótulos textuais Figura/Tabela/Quadro, confere número, legenda e duplicidade por tipo/número, e procura Fonte/Source na mesma linha ou na seguinte.",
    sai: "Elemento, número, linha, legenda, indicação de fonte e motivos para revisão.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "Figura 1 — Fluxo do processo\nFonte: equipe interna.\n\nTabela 1: Resultados\n\nFigura 2: Visão geral",
    opcoes: [],
    limites:
      "Procura marcadores textuais explícitos; não identifica imagens ou tabelas embutidas em binários.",
    referencia: "https://developer.adobe.com/document-services/docs/overview/",
  },
  {
    id: "F350",
    slug: "consistencia-unidades-documento",
    nome: "Auditor de unidades e formatos numéricos",
    nomeEn: "Document unit and number consistency audit",
    cat: "documentos",
    plano: "plus",
    resumo:
      "Localiza unidades misturadas e variações de formatação no mesmo documento.",
    problema:
      "Evitar erros de leitura ao combinar tabelas e instruções que usam unidades diferentes.",
    processa:
      "Extrai números com sinal e unidades SI/imperiais, armazenamento ou percentual; agrupa pela primeira palavra relevante da linha e aponta unidades ou separadores decimais mistos.",
    sai: "Tabela de valor, unidade, contexto, grupo e inconsistência potencial.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "Peso: 2,5 kg.\nPeso na tabela: 2500 g.\nA distância é 3 km.\nLimite: 10 mi.",
    opcoes: [],
    limites:
      "Regra lexical contextual; pode agrupar medidas de conceitos distintos. Não converte dimensões nem aceita separador de milhar, notação científica ou moedas. Achados exigem revisão humana.",
    referencia: "https://www.nist.gov/pml/owm/metric-si/si-units",
  },
  {
    id: "F351",
    slug: "auditor-urls-documentacao",
    nome: "Auditor de URLs em documentação técnica",
    nomeEn: "Technical documentation URL auditor",
    cat: "documentos",
    plano: "plus",
    resumo:
      "Localiza URLs externas, sinaliza esquemas inválidos e distingue paths sensíveis a maiúsculas.",
    problema:
      "Revisar links externos copiados para manuais, notas de versão e exemplos.",
    processa:
      "Extrai URLs com ://, valida usando URL, confere HTTPS e duplicatas. Normaliza esquema/host/porta padrão e ignora fragmento, preservando caixa de path e query.",
    sai: "Tabela de URL, domínio, linhas, duplicata e aviso de esquema.",
    entrada: "documento",
    colunas: [],
    exemplo:
      "Veja https://example.com/docs.\nEspelho: http://example.org/guide\nInválida: htp://bad.example",
    opcoes: [],
    limites:
      "Somente URLs explícitas com ://; não identifica URLs quebradas por espaço nem links relativos. Não acessa a rede, confirma HTTP, redirecionamentos ou reputação.",
    referencia: "https://www.rfc-editor.org/rfc/rfc3986",
  },
];
