# Portal — versão 1.4.0

O lote **F252–F351** acrescenta 100 ferramentas profissionais: 32 Plus e 68 Premium (Premium inclui Plus). O catálogo passa a 351 entradas, com 250 ferramentas implementadas. O histórico abaixo preserva as entregas anteriores; a referência deste lote é [100 ferramentas profissionais](documentacao/100-ferramentas-profissionais.md).

As novas ferramentas recebem arquivos CSV/TSV/JSON/XLSX ou documentos TXT/Markdown/JSON/SRT/VTT/PDF com texto/DOCX, conforme o tipo de análise. Os relatórios completos exportam PDF, Excel com três abas, TXT, CSV e JSON, além de SVG quando há série numérica. Exemplos editáveis, pesquisa, paginação, etapas de execução e cancelamento seguem os componentes do portal.

Execute `npm run gerar`, `npm run testar`, `npm run testar:api` e `npm run verificar`. A suíte `testes/navegador/profissionais.teste.mjs` exercita navegador e API reais com banco temporário; requer Playwright e Chromium. Os motores pagos rodam na API Node com autorização por plano, limite de corpo, cota, memória, concorrência e prazo. O GitHub Pages publica somente a interface; conta, assinatura e execução exigem servidor persistente na mesma origem. A liberação de planos continua manual, sem gateway de cobrança.

O portal escolhido é o da porta **4400**. A identidade visual e as 65 ferramentas prontas foram preservadas. Conta e chat usam uma API separada, na mesma origem através do proxy do portal. O catálogo tem 208 itens; os planejados continuam identificados como planejados.

## Executar

Node 22.14 ou superior. A API não exige dependências npm. O SQLite embutido em Node 22 emite aviso de recurso experimental.

Na pasta `portal`:

```powershell
npm run gerar
npm run no-ar
```

Abra `http://127.0.0.1:4400/`. O comando inicia site e API, preservando arquivos e banco, e religa o conjunto se um deles cair. A API escuta só em `127.0.0.1:4870`; as páginas usam `/api/` na 4400. Ctrl+C encerra os dois processos. `npm run dev` inicia uma sessão simples de desenvolvimento; `npm run servir`, apenas o site; `npm run api`, apenas a API. O arquivo `.env`, quando existir, é lido por `dev` e `no-ar`.

O comando `dev` habilita o chat local. Em desenvolvimento, com a origem padrão da 4400 e o chat local habilitado, a API aceita também os endereços das interfaces deste computador na porta 4400. Em produção o chat fica desligado até `PORTAL_CHAT_PUBLICO=1`; exige as condições do checklist e responsável por moderação. Para domínio definitivo, configure `URL_PUBLICA` com a origem exata usada no navegador. Alterações de outra origem são recusadas.

## Conta e administração

Cadastro com e-mail, senha de 12–128 caracteres, @usuário único e declaração de idade. Login, saída, perfil, preferências, exportação e exclusão da conta usam banco próprio. Senhas e tokens de sessão não ficam em localStorage. As ferramentas locais funcionam quando a API cai.

Depois de criar sua conta, conceda a função de administrador **localmente**:

```powershell
npm run admin:criar -- seu-email@exemplo.com
```

Não há senha nem administrador de fábrica. O script concede a função a uma conta ativa existente. O menu da conta oferece moderação, usuários e suporte. Plus/Premium são liberados manualmente, sem preço ou cobrança automática. `/planos.html` descreve a disponibilidade atual.

## Recuperação e armazenamento

Em desenvolvimento, instruções de recuperação são gravadas em `servidor/.execucao/emails/`. O token fica no fragmento `#token`, expira em uma hora e tem uso único. A API não devolve links ou tokens.

Em produção não há SMTP integrado e a recuperação pública retorna indisponível. O operador autorizado pode gerar um link para uma conta existente:

```powershell
npm run admin:recuperar -- seu-email@exemplo.com
```

Esse comando exige `URL_PUBLICA` HTTPS. Entregue o link privadamente ao titular após verificar a identidade; não publique o arquivo de recuperação.

SQLite: `servidor/.execucao/portal.sqlite`, ou o caminho privado `PORTAL_BANCO`. Banco, WAL e e-mails não são publicados nem versionados. Os testes usam bancos temporários. Faça backup privado e teste sua restauração antes de abrir contas ao público. Sessões expiram, trocar/redefinir senha revoga sessões antigas e mensagens são retidas por até 90 dias.

## AdSense

Publicidade vem desligada e sem IDs. Exemplo de `.env` sem credenciais:

```dotenv
PORTAL_ADS_ATIVO=0
PORTAL_ADS_EDITOR=
PORTAL_ADS_RODAPE=
PORTAL_ADS_RESULTADO=
PORTAL_ADS_TESTE=1
```

O administrador pode configurar `/admin/publicidade/`, com validação do editor e dos blocos de resultado, lista e rodapé. A configuração salva no banco prevalece sobre as variáveis legadas. `Demonstração local` mostra cartões identificados para conferir posições e não carrega o Google nem gera receita; essa opção é recusada em produção. Em 07/10/2026 a prévia local foi habilitada a pedido do proprietário, que ainda não tem IDs.

Editor: `ca-pub-` mais 16 dígitos. Blocos: IDs reais de 6–20 dígitos. Sem configuração, consentimento, autorização da API ou preenchimento, os blocos reais não ocupam altura nem margem. Posições após o conteúdo de uso, na lista e acima do rodapé, longe dos controles. Conta, admin, autenticação, perfis, textos legais, erros, salvos, planos e estudos não recebem anúncios; Plus/Premium também não.

Use apenas blocos manuais no AdSense. Anúncios automáticos/âncoras/vinhetas não fazem parte do formato implementado. A escolha muda em `/cookies.html`. O servidor gera `ads.txt`; HTML autorizado recebe nonce novo e CSP própria. Sem publicidade, mantém a CSP original.

Fontes: [blocos vazios](https://support.google.com/adsense/answer/10762946?hl=en), [posicionamento](https://support.google.com/adsense/answer/1346295?hl=en), [CSP](https://support.google.com/adsense/answer/16283098?hl=en), [consentimento regional](https://support.google.com/adsense/answer/13554116?hl=en). IDs, aprovação, CMP aplicável e anúncio real ainda precisam de validação na conta do proprietário.

## Validar e publicar

```powershell
npm run conferir
npm run testar:api
npm run publicar
```

`publicar` prepara arquivos públicos; não faz deploy nem leva banco/API. Contas exigem os dois processos Node atrás de HTTPS. Hospedagem só estática não entrega login/chat. Quando ligar publicidade, mantenha o proxy Node para HTML com nonce; atualize o Nginx estático antigo antes do deploy.

O exemplo `../documentação/hospedagem/portal-v1.1.conf.exemplo` encaminha também SSE. Use `PORTAL_PROXY_CONFIAVEL=1` somente com proxy local que sobrescreve `X-Forwarded-For` com o IP real; isso permite limites por visitante. Requisições diretas não podem escolher seu IP por cabeçalho.

Estado: `../CHECKLIST.md` e `../documentação/plano-portal-principal.md`. Administração editorial e bloqueios persistentes: [`documentacao/entrega-v1.3.6.md`](documentacao/entrega-v1.3.6.md). Refinamento do editor, verificação visual e estado atual: [`documentacao/entrega-v1.3.7.md`](documentacao/entrega-v1.3.7.md).

Auditoria atual do pedido original: [`documentacao/pendencias-prompt-original-2026-10-08.md`](documentacao/pendencias-prompt-original-2026-10-08.md). Ela distingue as funções entregues das lacunas da primeira fase, expansões posteriores e dependências de produção.

## Refinamento visual — 08/10/2026

A pesquisa fica imediatamente antes do sino no grupo direito do cabeçalho. Ao abrir, cresce apenas para a esquerda, até 240 px no computador e 176 px no celular, sem deslocar o sino. Notificações de conquistas usam colunas independentes para miniatura e texto; o cabeçalho do painel fica fora da lista rolável e não pode ser coberto pelos itens. Barras de rolagem usam cores do tema, com alternativa nativa em contraste forçado. O perfil apresenta rank, XP, estatísticas e coleção filtrável com oito marcos por conquista. Até cinco destaques podem ser escolhidos e ordenados; contas sem seleção conservam os três destaques automáticos anteriores. Conquistas recebidas persistem após remover favoritos/trabalhos. Links de notificação destacam a insígnia correspondente, inclusive na coleção. Os desenhos dos emblemas variam por família e os nove ranks têm símbolos próprios.

O chat segue a organização pública observada no SuperAnimes, dentro do tema do portal: salas à esquerda, conversa central, participantes à direita. Mensagens contínuas agrupam o autor e separadores marcam as datas; não há medalhas ou cartões no fluxo de mensagens. O painel de participantes mostra rank textual. Sem API de presença, a lista identifica pessoas das mensagens carregadas e não afirma que estão online. No celular, salas ficam em um painel recolhível. A denúncia de perfil continua em Mais no próprio perfil; a denúncia de mídia continua no visualizador.

O menu de categorias mede o espaço disponível e rola internamente em telas baixas. Ao passar para a navegação móvel, fecha o painel do cabeçalho. A publicidade é carregada como módulo opcional: sua falha não impede listas, consentimento nem a apresentação flutuante. Na página inicial, a apresentação aparece automaticamente na primeira visita após o consentimento e aguarda outros diálogos. A visualização é registrada ao abrir, por cookie por um ano e fallback local. Não exige botão manual e não se repete ao recarregar. Avisos publicados posteriormente conservam seu controle por revisão.

Evidências atualizadas desta versão: [relatório v1.3.2](documentacao/entrega-v1.3.2.md). São testes em Chromium com dados de teste; a inspeção da sessão real do proprietário e outro aparelho físico não estão confirmadas nesta rodada.

## Perfil e conquistas — 07/10/2026

Nome, biografia, redes sociais, preferências, visual e foto são gravados juntos por `PATCH /api/perfil`. Uma entrada inválida impede a atualização inteira. A tela conserva os campos quando há erro e mantém o tema usado no aparelho. Links sociais aceitam o @usuário ou a URL direta do perfil na plataforma correspondente.

A foto é recortada localmente em 512 × 512, com zoom, posição e prévias de perfil/chat. A consulta privada da imagem não usa cache para que uma alteração apareça após salvar. Trabalhos, favoritos e suporte ficam em abas com transição dentro da conta. Senhas e tokens não participam desse salvamento.

Conquistas pendentes são calculadas a partir da atividade real. O servidor registra o maior patamar já recebido em cada família; uma nova aba ou outro aparelho não repete a celebração. O modal tem feixes de luz e emblema central, com movimento reduzido quando solicitado pelo sistema. Sons discretos são sintetizados no aparelho após interação; podem ser desativados em Preferências. Mensagens próprias não fazem som de recebimento.

Para o teste solicitado, `@honor` recebeu o nível 15, último marco dos banners e molduras atuais. A progressão numérica continua acima disso. Não foram alterados plano, senha, dados do perfil nem atividades para inventar medalhas. O banco anterior está preservado em `.execucao/`, fora da publicação e do Git.

## Avisos prioritários e estabilidade — 07/10/2026

O administrador encontra **Avisos** no menu de administração da conta. A área cria até doze avisos ativos abaixo do cabeçalho, com textos em português e inglês, cores com contraste validado, imagem opcional PNG/JPEG/WebP de até 1 MiB, texto alternativo, link seguro, programação e ordem. Dois ou mais avisos formam um carrossel que pausa ao receber foco, ao passar o mouse, fora da tela, com a página oculta ou quando a pessoa prefere reduzir movimento. Sem avisos ativos, a região não ocupa espaço.

O cabeçalho, sessão, chat, busca e avisos são inicializados em blocos independentes. Se uma função falhar, ela mostra uma mensagem localizada e uma nova tentativa, sem trocar uma conta carregada por visitante ou interromper as ferramentas. Durante o carregamento são usados esqueletos no formato dos componentes. As ilustrações de categoria agora respeitam o orçamento de movimento no celular, revezam corretamente as vagas disponíveis e mostram a variante estática coerente quando não há vaga.

## Busca e divulgação

O gerador inclui instruções, exemplos, limites e perguntas reais no HTML das 65 ferramentas. Títulos, descrições, Open Graph e dados estruturados descrevem cada ferramenta. Canonical, hreflang absoluto e sitemap exigem um domínio HTTPS real em `URL_PUBLICA` ou `PORTAL_URL_SITE`; na prévia local o sitemap fica vazio e o robots impede indexação. `npm run gerar` lê `.env` quando existir.

O roteiro para Search Console, conteúdo e campanhas está em [busca e publicidade](../documentação/busca-e-publicidade-2026-10-07.md). A preparação técnica não representa indexação confirmada, aprovação de anúncios ou campanha paga ativa.


## Continuação — SEO da publicação pública no GitHub Pages

A prévia estática publica as ferramentas locais sem PC ligado. O workflow agora gera sitemap e URLs canônicas HTTPS com o caminho completo da subpasta de publicação. A preparação verifica as páginas do sitemap e marca login, conta, administração, erros e outras páginas que dependem da API como noindex, mantendo visual e scripts.

A indexação não é garantida. Ainda é preciso validar cobertura no Search Console, implementar a hospedagem da API para login/chat, e configurar AdSense com consentimento. Arquivos robots.txt em subpastas do GitHub Pages não controlam o domínio raiz; as páginas privadas são protegidas de indexação por metatags HTML.


## Servidor completo na nuvem — testes isolados

A prévia estática do GitHub Pages continua independente. Para testar a API em uma hospedagem Node 22+, configure a pasta raiz `portal` e execute `npm run gerar` durante a construção. Na inicialização use `npm run nuvem`, com as variáveis:

- `NODE_ENV=production` e `PORT` fornecida pela plataforma.

- `URL_PUBLICA=https://<domínio-do-servidor>` (origem sem caminho, HTTPS).

- `PORTAL_BANCO=/data/portal.sqlite` com volume persistente montado em `/data`.

- `PORTAL_CHAT_PUBLICO=0`, `PORTAL_CHAT_LOCAL=0` e `PORTAL_ADS_ATIVO=0`.

O comando de nuvem valida ambiente/HTTPS/volume e executa API no loopback, com site e proxy no mesmo domínio. Não reutiliza `dev`/ `no-ar`, pois esses usam o modo de desenvolvimento. A recuperação de senha pública, moderação do chat e anúncios reais seguem indisponíveis; dados criados no ambiente de testes não são migrados para produção. Não faça cadastro com dados pessoais reais até concluir a revisão de segurança e operação. Custos do servidor/volume dependem do plano de hospedagem.


## Nova rodada: quatro ferramentas completas (antes da tradução)

O catálogo agora oferece Fluxo de caixa (saldo por data de corte, projeção e exportação PDF/CSV/XLSX), Conversor de moedas com cotação **manual**, ROI/ROAS/CAC/LTV com hipóteses explícitas, e Rateio de custos proporcional com conciliação dos centavos e exportação PDF/CSV/XLSX. Cada ferramenta mantém o montador comum, visual, cálculo local, validação por campo, seção Como usar e testes Node. As quatro passaram da categoria planejada para pronta; nenhum dado bancário nem cotação ao vivo é consultado automaticamente. A implementação evita adicionar dependências externas, telas duplicadas ou processamento remoto.


## Nova rodada: operações comerciais — quatro ferramentas prontas

O catálogo mantém 208 entradas, com 73 ferramentas realmente funcionais. Sem mudar a identidade visual, foram entregues:

- **Pedido de venda:** linhas de itens, quantidade, preço unitário, desconto, frete, número, cliente e condições; PDF A4 e XLSX locais. Não emite nota fiscal ou registra pagamento.

- **Mensagem de follow-up:** cinco objetivos e três tons para mensagens editáveis; não dispara SMS, e-mail ou WhatsApp automaticamente.

- **Meta de faturamento:** valor que falta para o mês, metas por dia útil, até cinco dias úteis e vendedor, com vendas estimadas pelo ticket e tratamento de prazo esgotado.

- **Ticket médio e conversão:** indicadores e cenários de aumento relativo de ticket/conversão para um volume informado de visitantes; resultados sem denominador são explicitamente não calculáveis.

Cada ferramenta possui cálculos locais, seção Como usar, validação de entrada por campo e testes Node. A hospedagem do backend permanece bloqueada pelo fim do período gratuito do Railway; as 73 ferramentas rodam diretamente no GitHub Pages sem depender do backend. Tradução integral somente depois do núcleo funcional.


## Ficha de cliente — armazenamento 100% local

A ferramenta de vendas **Ficha de cliente** é funcional e trabalha somente com o armazenamento do navegador, com busca tolerante a acentos, cadastro/edição/exclusão confirmada, histórico e observações. Os registros têm IDs locais e datas de criação/alteração. O backup JSON possui versão e validações de tamanho, campos, IDs e integridade; a importação **substitui** o cadastro inteiro somente após confirmação. A planilha XLSX é gerada com valores textuais (não como fórmulas). **Não há sincronização com contas nem API de cadastro**: o botão "Salvar trabalho" e o registro remoto de uso foram desativados especificamente aqui. Isso não altera outras ferramentas. O backup e a planilha **não são criptografados** e contêm dados pessoais legíveis; devem ser protegidos pelo usuário. Limite de 250 fichas e 2 MB por arquivo de restauração. Limpeza de dados do site pode apagar as fichas, portanto oferecemos backup antes de qualquer exclusão definitiva.


## Rodada de estoque e logística — cinco ferramentas completas
Ponto de reposição, Giro de estoque, Curva ABC, Cubagem e Peso volumétrico agora usam o montador compacto e o botão de ajuda modal, com cálculos e testes locais. Curva ABC e Cubagem produzem tabela automaticamente exportável em CSV e XLSX. Nenhuma das cinco consulta fornecedores ou dados externos: a pessoa informa consumo, estoque, mercadorias, medidas ou fator contratual. O ponto de reposição indica o gatilho para revisar compras, **não o lote econômico**; o giro usa **CMV ao custo**, não faturamento; a curva ABC não equivale a margem; e o peso de referência **não é o preço de frete**.


## Continuação de expedição — Conferência de pedido e Romaneio
A ferramenta **Conferência de pedido** compara SKU e quantidades do pedido e da separação, consolida SKUs repetidos, detecta faltas e excessos e exporta tabela em CSV/Excel. A ferramenta **Romaneio de carga** prepara documento PDF A4 com relação de até 80 volumes, conteúdo, peso e destinatário, além de tabela CSV/Excel. Ambas processam dados no navegador, possuem limites e validação de entrada e não substituem conferência física ou documentação fiscal. Os módulos usam o layout compacto e o modal "Como funciona" já existentes.


## Terceira rodada logística: etiquetas e comparação de fretes
A ferramenta **Etiqueta de expedição** gera até 80 etiquetas genéricas, quatro por A4, com numeração e exportação PDF/CSV/XLSX. A identificação não é etiqueta oficial de postagem e não emite código de rastreio. Dados pessoais de etiquetas e romaneios são processados no navegador; nestas duas ferramentas o salvamento de trabalhos na conta está bloqueado. A ferramenta **Calculadora de frete** compara de 2 a 20 transportadoras a partir de preços e fatores **informados manualmente** por transportadora; não consulta cotações reais nem afirma calcular seguro, pedágio ou taxas externas.


## Produtividade e funil de vendas — quatro novas ferramentas

A rodada implementa **Matriz de Eisenhower**, **Plano de ação 5W2H**, **Pauta de reunião** e **Funil de vendas**. As ferramentas usam os componentes do portal compacto e a ajuda em modal, sem redesenho ou dependências externas. Eisenhower, 5W2H e Pauta geram PDF local; todas oferecem tabela exportável em CSV/Excel. A Pauta soma minutos e calcula início/término estimado; o Funil usa uma mesma coorte, recusa aumentos artificiais entre etapas e diferencia conversão real de taxa não calculável. As ferramentas não criam automaticamente tarefas, eventos no calendário nem enviam dados para serviços externos. Tradução de ferramentas permanece para a última etapa.


## Referências profissionais da lista de 50 sites — segurança e acessibilidade

Da lista enviada (Squoosh, regex101, CodeBeautify, VirusTotal, Have I Been Pwned e similares), duas ferramentas planejadas foram implementadas sem replicar código ou marca de terceiros:

- **Gerador de hash** (F036): hashes SHA-1/256/384/512 de texto UTF-8 ou arquivo de até 25 MB, checksum opcional e comparação, usando Web Crypto no navegador. SHA-1 aparece apenas por compatibilidade e recebe alerta de risco. Hash não verifica malware nem consulta VirusTotal. O formulário nunca grava o conteúdo na conta do portal.
- **Verificador de contraste WCAG 2.2** (F080): comparação AA/AAA para texto normal e grande, prévia de cores e sugestão calculada de texto que passe em AA. Avalia somente duas cores sólidas, sem prometer conformidade total do site.

O portal agora tem 89 ferramentas prontas entre as 208 entradas. Ambas usam o montador de ferramentas e o design compacto comum, modal Como funciona e recomendações distintas no final.


## Laboratório Regex e gerador seguro de identificadores
- **Regex (F038):** executa padrões somente em Worker descartável, interrompe a execução ao passar de 1,6 s para mitigar travamentos, destaca matches com texto HTML escapado, expõe capturas nomeadas e numeradas, substituição JS e resultados exportáveis. Limite de 30 mil caracteres de entrada e 150 correspondências exibidas. A proteção reduz risco de ReDoS, não é uma garantia universal para uso em backend.
- **UUID (F037):** gera em lote até 200 UUID v4, códigos hexadecimais ou códigos legíveis sem caracteres ambíguos. Usa Web Crypto e amostragem sem viés, aceita prefixo seguro, baixa TXT e permite exportação CSV/Excel. Sem sincronização dos identificadores com contas e sem promessas de unicidade global.
Ambas mantêm o layout compacto, ajuda em modal, faixa de relacionadas abaixo do conteúdo e selo Visto.


## Rastreamento de campanhas — UTM profissional
O montador e leitor de UTM (F042) foi ativado. Monta links com origem, mídia, campanha, termo e conteúdo; preserva parâmetros externos e fragmentos e normaliza maiúsculas/espaços. O modo Auditor identifica parâmetros essenciais ausentes e duplicatas, e avisa quando há UTMs não padronizadas. Exporta tabela em CSV/Excel, sem integrar Analytics ou enviar URLs à conta do portal. URLs devem usar HTTP/HTTPS sem credenciais embutidas.


## F207 — Formatação profissional de código
O portal integra Prettier 3.9.10 e SQL Formatter 15.9.0, bibliotecas MIT empacotadas no próprio portal com esbuild 0.25.12, sem CDN em execução. A CI monta scripts/terceiros/formatadores.js durante a publicação; o arquivo é gerado, não commitado.
Para desenvolvimento local: npm ci --prefix portal; npm install --prefix portal --no-save --no-package-lock --ignore-scripts prettier@3.9.10 sql-formatter@15.9.0 esbuild@0.25.12; npm run montar:formatadores --prefix portal. O editor oferece formatação JS, TS, HTML, CSS, JSON e SQL (vários dialetos). Minificação somente para JSON. Código não é executado nem enviado, Worker limitado a 18 segundos e 65 mil caracteres.


## F208 — Diagramas Mermaid no navegador
A ferramenta usa Mermaid 11.17.2 empacotado localmente via esbuild (MIT) e geração em modo estrito. O SVG é sanitizado, removendo scripts, referências externas e objetos incorporados, e a prévia é exibida como imagem isolada, não como HTML injetado. Permite fonte .mmd, SVG e PNG, com limites de 8 mil caracteres, 140 linhas, 2.400 px por lado e no máximo 4 milhões de pixels na exportação. Não existe link executável nem API externa. Para montar localmente, instale mermaid@11.17.2 com a mesma versão de esbuild e rode npm run montar:diagramas --prefix portal.


## F077 — Gerador de favicon em pacote de instalação

O módulo gera favicons de imagem local PNG, JPG ou WebP, em tamanhos 16/32/48/180/192/512 px. Exporta um ZIP com seis PNGs, favicon.ico (16, 32 e 48 px), site.webmanifest, HTML de instalação e LEIA-ME. Usa canvas e a infraestrutura ZIP própria do projeto. Processamento 100% no navegador, até 15 MB, 16 megapixels e 8192 px por lado. Inclui modos conter/preencher, fundos transparente/branco/escuro, prévia de cada tamanho e alerta para imagens pequenas e não quadradas. O pacote fornece ícones mas não configura sozinho um PWA instalável. Não envia arquivos à conta ou a um servidor.


## Lote de 5 ferramentas para fotografia e e-commerce (F073, F074, F075, F078, F079)
Em uma única rodada, o portal recebeu **cinco ferramentas locais** com módulo compartilhado, campos compactos, instruções completas no modal e sugestões em faixa separada no fim do conteúdo:
- F073: redimensionar **até 12 fotos** de uma vez sem distorcer nem ampliar, limites de largura/altura, qualidade, JPG/PNG/WebP, ZIP real e CSV/Excel de tamanhos;
- F074: recortar para post 1:1, 4:5, story 9:16, capa 16:9 ou foto 3:2, com âncora topo/base/lateral, sem reamostragem;
- F075: converter arquivos JPG/PNG/WebP com qualidade e escolha de fundo sólido ou transparência;
- F078: inspecionar blocos comuns EXIF/XMP/IPTC e recodificar os pixels, sem copiar blocos do arquivo original, conferir o arquivo de saída e mostrar lista de marcadores observados;
- F079: amostrar cores da foto, agrupar em até oito cores, exportar PNG visual da paleta, variáveis CSS e tabela em CSV/Excel.

Cada arquivo tem limite de 18 MB, até 24 megapixels e 8192 px por lado. Lote máximo 12 fotos, 56 MB. Os arquivos são processados localmente pelo navegador e não são salvos na conta. Redimensionamento não garante peso final exato, e remoção de metadados não remove informações visíveis ou marcas d'água.


## F117 — Inteligência de vendas Premium
O portal oferece análise de até 70 SKUs e até 1.800 registros mensais, com histórico de 3 a 24 meses consecutivos por SKU. CSV com 13 colunas: SKU, mês, vendas, preço, CMV, comissão, tarifa fixa, frete, Ads por unidade, imposto, perdas esperadas, estoque e prazo.
O motor escolhe entre média móvel e tendência por erro histórico quando há dados suficientes, projeta três meses em cenários entre -40% e +100%, calcula margem de contribuição, preço para meta, curva ABC, possível ruptura e quantidade de reposição; exporta CSV e XLSX completos.
**Segurança:** o algoritmo fica em portal/servidor/analise-premium.mjs, fora do bundle GitHub Pages. A rota POST /api/premium/previsao-de-vendas exige sessão e plano premium (ou admin), CSRF, rate limit e validação de 300 KB; CSV analisado em memória e não persistido no banco.
**Limite atual:** GitHub Pages é estático. A ferramenta exibe interface demonstrativa, mas a análise real depende da API Node pública. Os planos Plus/Premium são liberados manualmente, sem assinatura cobrada ou gateway de pagamento nesta etapa.
**Cuidado:** as taxas de marketplace são informadas pelo vendedor, pois variam por categoria e logística; não há consulta automática. Projeções não consideram sazonalidade externa, despesas fixas ou conciliação contábil.


## F209 — Auditoria Premium de catálogo para Google Merchant Center
Nova ferramenta profissional, ampliando o catálogo de 208 para 209 entradas. Audita CSV/TSV com até 500 produtos, detecta campos essenciais vazios, valores de availability, preço, URLs, duplicatas, títulos/descritivos fora do limite, GTIN com dígito incorreto e advertências de identificadores/categoria. Relatório por SKU com gravidade e ação recomendada, nota técnica, exportação CSV/XLSX completa. As regras são uma triagem fundamentada na especificação oficial: https://support.google.com/merchants/answer/7052112. Não assegura aprovação nem verifica URL, imagem, política ou disponibilidade em tempo real.
A rota POST /api/premium/auditar-feed exige sessão e plano Premium, limite de chamadas e dados de até 300 KB; motor exclusivamente no servidor, sem persistência de CSV. No GitHub Pages é somente interface explicativa, sem servidor API.


## F210 — Planejamento de estoque ABC/XYZ Premium
A ferramenta importa até 500 SKUs de CSV/TSV, com 3–24 meses de demanda por SKU, preço, custo, estoque, prazo e sazonalidade opcional. Gera classes ABC/XYZ, demanda estimada, ponto de pedido, compra sugerida e custo total; exporta CSV e Excel com todos os registros. O motor fica exclusivamente no servidor e exige a rota POST /api/premium/planejamento-estoque, conta Premium (ou admin), CSRF e limite de uso. Os dados não ficam gravados em trabalhos nem na conta. O GitHub Pages oferece somente a interface.


## Lote F212–F216 — análises Premium
Cinco ferramentas com uma API privada por tipo, validação por coluna, máximo 500 registros/tabela e 270 KB por arquivo: rentabilidade multicanal por SKU, conciliação de pedidos e repasses, auditoria de devoluções, diferenças de inventário e rentabilidade de campanhas Ads. Relatórios e exportações CSV/Excel. Rota POST /api/premium/lote/:tipo, limite compartilhado de 12 análises/minuto por conta, autenticação Premium, CSRF global e dados transitórios não persistidos. Contas não Premium recebem 403. GH Pages fornece apenas interface estática; pagamento ainda não está automatizado.


## Lote F217-F221 — Estratégia comercial Premium
Cinco novos módulos: análise de promoções e margens, projeção de caixa por recebíveis probabilísticos, comparação de fornecedores e custo posto, auditoria de cupons e priorização de produtos por desempenho ABC/estoque. Cada motor processa CSV de até 500 registros/tabela e 270 KB, gera relatório completo e exportação CSV/Excel. API /api/premium/estrategia/:tipo protegida por sessão Premium, CSRF, 12 usos/minuto por conta e sem gravação de dados; sem consultas bancárias ou marketplaces. A cobrança real só poderá existir após contratação autorizada e integração de gateway, não incluída neste lote.


## F222–F226 — Operações Premium
Cinco novas ferramentas profissionais com motores privados, importação CSV/TSV de até 500 linhas por tabela, apoio gerencial e exportações CSV/XLSX: planejamento de kits por lista de materiais e estoque compartilhado; auditoria de SLA logístico por pedido; coortes de recompra/CAC/LTV com identificadores pseudônimos; redistribuição de estoque entre CDs sob restrições de rota; risco de concentração de receita por SKU, fornecedor e canal (HHI e cenários separados). Rota POST /api/premium/operacoes/:tipo: sessão Premium/admin, proteção CSRF global, até 10 chamadas por minuto/usuário, corpo máximo 600 KB, sem persistência. Não consulta serviços externos nem movimenta dinheiro, mercadorias ou anúncios. GitHub Pages exibe apenas o formulário e a ajuda.


## F227–F231 — Diagnóstico Premium profissional
Cinco motores em API Node autenticada: faturas de frete e peso cubado por etiqueta; associação de cestas por suporte/confiança/lift; recebíveis vencidos com aging e pagamentos parciais; experimentos A/B com intervalos Wilson, teste z bilateral e ajuste Holm; jornada de checkout por segmento e período. CSV/TSV de até 500 linhas e 270 KB por tabela, sem acessar bancos ou marketplaces, sem persistir dados comerciais, com exportação CSV/Excel. Rota POST /api/premium/analitica/:tipo, proteção de sessão Premium/admin, CSRF global, rate limit 10 por minuto/usuário, corpo máximo 600 KB. Todas as análises são suporte gerencial, não cobram clientes, não alteram campanhas nem dão garantias estatísticas sem premissas.
