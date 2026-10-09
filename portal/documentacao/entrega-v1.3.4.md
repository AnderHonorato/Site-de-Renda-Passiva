# Portal v1.3.4 — Limpeza de planilhas em etapas

09/10/2026. Continuação de `ander-flow/v1` a partir de `5b9c328` (v1.3.3), somente em `portal/`. Conclui o primeiro item da ordem de continuidade do prompt original.

## Comportamento entregue

- Quatro etapas: **Carregar → Configurar → Revisar → Baixar**. É possível voltar para ajustar dados ou opções; alterações invalidam o resultado anterior antes de liberar outro download.
- Importação local de XLSX, CSV, TSV e TXT, além da colagem. XLSX lista as abas e permite trocar a aba escolhida. Uma primeira aba vazia não impede selecionar outra. CSV aceita as codificações já suportadas pelo portal, incluindo Windows-1252.
- Escolha das colunas que identificam duplicatas, por exemplo somente e-mail, preservando todas as demais colunas. A comparação ocorre após as limpezas selecionadas. É possível manter a primeira ou a última ocorrência; a ordem relativa das linhas preservadas é mantida.
- Revisão com contagens de duplicadas/vazias, colunas, critério e ocorrência. Amostra limitada a 20 linhas e 12 colunas; CSV e XLSX baixados incluem todo o resultado. Sem cabeçalho, a exportação não acrescenta uma linha fictícia.
- Reabertura de trabalho salvo recupera dados, opções e caixas das colunas escolhidas. A importação e a limpeza processam células localmente; **Salvar trabalho** envia dados e configurações para a conta, conforme os limites já existentes do serviço. O registro habitual de uso envia `{}` ao endpoint identificado pelo slug, sem células ou configurações.
- Leitura XLSX em Web Worker, com cancelamento ao reiniciar/sair e prazo de 20 segundos. Falha do leitor fica isolada, mostra mensagem e permite continuar com dados colados. Arquivo inválido preserva os dados anteriores; aba inválida restaura a seleção anterior.
- Estilos específicos somente nesta ferramenta, seguindo cores, controles e rolagem do portal. Resumo de muitas colunas compacto no celular. As caixas de seleção não herdam dimensões de campos de texto.
- CSV com aspas abertas passa a ser recusado com mensagem útil. A chave de duplicatas usa serialização sem colisão entre células com caracteres de controle. A fonte do gerador da edição de perfil foi alinhada à classe compacta já entregue na v1.3.3; regenerar preserva aquele HTML.

## Limites e biblioteca

Até 10 MiB por arquivo; pacote XLSX com no máximo 40 MiB descompactados, 2.000 entradas e 100 abas. Por aba: 50.000 linhas incluindo cabeçalho, 256 colunas, 500.000 células e 5 milhões de caracteres; cada célula tem limite de 32.767 caracteres. O CSV de trabalho serializado também respeita 5 milhões de caracteres. A verificação ZIP confere diretório, métodos, nomes e expansão real em fluxo antes de carregar o leitor.

Importa **valores exibidos já salvos**, incluindo códigos com zero à esquerda, datas formatadas e erros de células. Não recalcula fórmulas, não mantém estilos/gráficos e não importa macros. Fórmulas sem resultado salvo ficam vazias com aviso. Arquivos com senha, XLS, ODS, macros e ZIP64 não são aceitos; a alternativa é salvar como XLSX simples ou CSV. Navegador sem descompressão compatível recebe orientação para usar CSV. A proteção contra fórmulas nos arquivos exportados continua ativa.

SheetJS CE 0.20.3 vendorizado localmente, carregado somente ao importar XLSX. Distribuição oficial: [módulo](https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs), [documentação de instalação](https://docs.sheetjs.com/docs/getting-started/installation/standalone/) e [opções de leitura](https://docs.sheetjs.com/docs/api/parse-options/). Licença Apache 2.0 em `recursos/bibliotecas/LICENSE-SheetJS.txt`; aviso original preservado. SHA-256 do módulo: `1A0FB062EE9781B13F6687371B202AAEFC53B6CE55B530C027E01F9C087B77DB`. Nenhuma CDN é consultada durante o uso da ferramenta.

## Validação

- `npm run conferir`: **1.116/1.116** testes unitários; gerador com 121 saídas e 65 ferramentas prontas; verificador com 120 páginas, 210 scripts e 208 entradas, nenhum problema. Log privado: `.execucao/conferencia-v1.3.4.log`.
- Incluídos 12 testes de cálculo/importação: chaves, normalização, primeira/última, exportação completa, ausência de cabeçalho, limites, XLSX comprimido/sem compressão, códigos/datas/erros, fórmulas sem cache e pacote inválido.
- **8/8** cenários Chromium da nova ferramenta: abas, chave por e-mail, última ocorrência, downloads CSV/XLSX conferidos por conteúdo, reabertura simulada, falha isolada do trabalhador, 1280/390/320 px, temas claro/escuro, amostra/saída completa, arquivo quebrado, primeira aba vazia, Windows-1252, proteção de fórmulas e reinício. Log: `.execucao/testes-planilha-navegador-v1.3.4.log`.
- **1/1** regressão de Converter planilha: colagem, JSON/XLSX/CSV, Windows-1252 e recusa de arquivo binário. Log: `.execucao/regressao-converter-planilha-v1.3.4.log`. Converter planilha mantém seu escopo próprio; a nova importação XLSX pertence a Limpar planilha.
- Uma primeira execução geral teve timeout no teste de recuperação do servidor enquanto outros navegadores eram executados. O teste passou isoladamente (2/2 cenários), e a suíte geral repetida sem essa concorrência passou integralmente. Não houve alteração do supervisor para mascarar a falha.
- Capturas renderizadas inspecionadas em sessões isoladas: `.execucao/planilha-configurar-v1.3.4.png` e `.execucao/planilha-etapas-{1280-light,390-light,320-dark}-v1.3.4.png`. Testes usam dados fictícios e API simulada, sem a sessão real do proprietário.
- HTTP 200 local e LAN para `/f/limpar-planilha/`; CSS, módulo principal, trabalhador e biblioteca servidos comparados por hash aos arquivos editados; `Cache-Control: no-store`; API de sessão responde 200. Log: `.execucao/http-planilha-v1.3.4.log`.

## Operação e continuidade

Servidor permanece em `http://127.0.0.1:4400/`, escutando em `0.0.0.0:4400`; API independente em `127.0.0.1:4870`. Rede: `http://192.168.1.1:4400/`, verificada deste computador. Não houve teste físico em outro aparelho, publicação externa, migração nem escrita de testes na conta real. Recarregar a aba aberta carrega os novos arquivos.

A próxima pendência da ordem original continua sendo diferenciação Premium e missões/eventos/ranking, conforme `pendencias-prompt-original-2026-10-08.md`. A conclusão desta ferramenta não conclui as demais ondas do portal.
