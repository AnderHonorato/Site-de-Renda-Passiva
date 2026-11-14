# Lote 1 — PDFs profissionais

Continuação da revisão de atratividade e dos arquivos gerados, solicitada em 14/11/2026. O lote cobre recibo, orçamento e relatório financeiro e introduz uma base reutilizável para os demais documentos. O alvo visual é a identidade já aprovada do portal: papel, tinta e terracota, com hierarquia de valores e espaço para leitura.

## Entregas

| Frente | Resultado |
|---|---|
| Recibo | Via única com valor de 24 pt, identificação, partes separadas, descrição, quitação, data e assinatura; opção compacta de duas vias. |
| Orçamento | Marca do emissor, dados da proposta, tabela com textos quebráveis, subtotal/desconto/total, condições e assinatura. Mantidos o limite de 40 itens da ferramenta, XLSX e link para o cliente. |
| Relatório profissional | Identidade alinhada ao portal, cards de indicadores, gráfico vetorial com zero e sinais corretos, dados completos, método e premissas. O exemplo de fluxo de caixa descontado ocupa duas páginas, com resumo e nove cenários na primeira. |
| Personalização local | Cor e logo PNG/JPG opcionais nos documentos comerciais. O logo é conferido pelos bytes, normalizado como JPEG RGB e incorporado ao PDF; não é enviado nem salvo em storage. |
| Prévia | Recibo e orçamento mostram o mesmo conjunto de bytes do download em Canvas, com zoom e navegação entre páginas. Alterações de dados invalidam o documento anterior. |

## Contrato visual e de conteúdo

- Documentos comerciais A4 em retrato, margens de 18 mm e cabeçalho com coluna reservada para a marca. Logo não pode invadir título ou subtítulo; rodapé não pode sobrepor nome e paginação.
- Destaque grande para o valor do recibo de via única; duas vias usam composição compacta para preservar conteúdo. Os campos e os nomes completos permanecem no corpo, mesmo quando uma marca decorativa precisa ser abreviada no rodapé.
- Fundos suaves derivam da cor escolhida. Texto de marca com contraste insuficiente usa tinta; faixas e linhas mantêm a cor solicitada.
- Tabelas quebram textos longos e repetem o cabeçalho ao continuar em outra página. Dados, valores e descrições não são substituídos por amostras.
- Relatórios largos mantêm painéis de até cinco colunas, com índice para relacionar a linha. A tabela de apoio conserva todas as séries quando o gráfico mostra somente vinte.
- O F252 é identificado pelo slug, não pelo título. Seus valores financeiros usam duas casas e mantêm a unidade da entrada, sem atribuir uma moeda que não foi informada. CSV, JSON e Excel preservam os valores tipados originais.
- As barras usam um domínio linear que inclui zero. Sinais negativos e positivos aparecem em lados corretos, com comprimentos proporcionais. Gráficos e indicadores extensos respeitam as páginas.
- A fonte padrão continua Helvetica/WinAnsi: português é preservado; nos relatórios, caracteres fora desse conjunto mantêm a representação explícita `[U+XXXX]`. Este lote não promete fonte Unicode completa nem PDF marcado para leitores de tela.

## Figuras e verificação

| Figura | Finalidade e dados | Representação e conferência |
|---|---|---|
| Valor do recibo | Identificar a quantia paga, em centavos inteiros | Valor e extenso correspondem ao mesmo arredondamento; destaque de 24 pt. |
| Tabela do orçamento | Conferir quantidade, unitário, descontos e total | Alinhamento por coluna, quebra de descrição, continuidade e igualdade dos centavos. |
| Indicadores financeiros | Exibir a estimativa principal e seus componentes | Cards 2×2 no F252, formato pt-BR e unidade declarada. |
| Gráfico de cenários | Comparar sensibilidades calculadas | Barras vetoriais, domínio incluindo zero, razão 1:2 testada para valores positivos, negativos e mistos; rótulos completos na tabela de apoio. |
| Prévia de impressão | Revisar o que será enviado | Renderização dos bytes baixados comparada pixel a pixel com o Canvas da prévia. |

As frentes de base PDF, modelos comerciais, relatórios e testes de navegador foram divididas entre agentes; a integração e a inspeção dos arquivos renderizados foram feitas pela agente principal. As figuras são derivadas dos cálculos e dos dados da ferramenta.

## Validação incorporada ao projeto

- Testes de layout, incorporação JPEG, contraste, nomes longos, células longas e quebras de página.
- Testes dos modelos com duas vias, 100 itens no gerador puro, centavos seguros e conteúdo com aparência de HTML tratado como texto literal.
- Testes do relatório financeiro com duas páginas, números pequenos, indicadores longos, Unicode explícito e proporção das barras.
- Regressões de margem de contribuição e ponto de equilíbrio mantêm resultado, subtítulo, dados e conta nos PDFs da base compartilhada.
- Quatro cenários Chromium: recibo com uma/duas vias; orçamento com três itens, PNG e cor azul; limite de 40 itens com todas as descrições preservadas; logo inválido com recuperação e sem download obsoleto.
- Prévia, zoom, navegação, igualdade com o download e ausência de overflow em 390/1280 px integram o workflow de publicação.

Capturas e PDFs de QA ficam em `portal/.execucao/documentos-e2e/`, fora da publicação. O workflow gera novamente as páginas e executa a suíte completa antes do deploy.

Validação local final: **1.792 testes de código aprovados**, nove cenários profissionais com API real e quatro cenários novos de documentos aprovados. As verificações de publicação/servidor também passaram. O workflow reúne esses testes aos oito cenários de execução visual existentes antes de publicar.

## Continuação por lotes

1. Este lote estabelece os três modelos e a base comum.
2. Próximo lote: ampliar os modelos específicos de documentos e a personalização dos relatórios profissionais, com prévia por formato.
3. Depois: melhorar a apresentação dos arquivos Excel e as amostras visuais no catálogo, medindo abertura, geração e download para orientar a seleção das ferramentas em destaque.

O endereço público continua em GitHub Pages. As análises que usam API dependem da hospedagem Node já documentada; o novo exportador não altera esse requisito nem as regras dos planos.

### Continuação em 14/11/2026

A base XLSX recebeu cores com contraste no cabeçalho, linhas alternadas, bordas discretas, ajuste de colunas, quebra de texto e congelamento dos cabeçalhos. Relatórios com várias abas oferecem filtro na aba Dados, preservando valores e posições. Valores pequenos continuam visíveis com formato científico quando necessário. Os testes conferem os dados, não apenas a aparência; a abertura no openpyxl também foi verificada sem avisos.

O lote inclui o editor de metadados e a extração de imagens incorporadas ao PDF, ambos com arquivos processados no navegador. O primeiro reutiliza a prévia do PDF final; o segundo mostra miniaturas e entrega PNGs e manifesto em ZIP. Os dois usam o fluxo compartilhado de execução e integram o inventário visual. A página de atualizações e o sininho permitem consultar as mudanças publicadas.
