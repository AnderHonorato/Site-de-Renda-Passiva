# Parecer independente de experiência — GPT

Data: 16/09/2026. Revisor: agente critico_experiencia. Escopo exclusivo: cópia GPT; nenhum arquivo de produção foi editado. Navegador Chromium real via Playwright CLI, sessão independente `critico-gpt`, endereço `http://127.0.0.1:4480`.

## Resultado

Aprovado nos fluxos amostrados após as correções descritas abaixo. Esta revisão não equivale a testar manualmente as 150 ferramentas nem a certificação completa de acessibilidade. Nenhum parecer de outro crítico foi consultado.

## Achados corrigidos e verificados

1. Bloqueio inicial: servidor retornava 404 nos três arquivos de índice das ferramentas; catálogo não carregava. Reportado ao implementador, corrigido e recarregado sem os erros.
2. Catálogo vazio com todas as categorias: valor HTML `0` chegava como string e era tratado como filtro ativo. Reportado com causa em `filtrar.js`; reteste mostrou 150 ferramentas.
3. Impressão: diálogo centralizado deixava grande espaço superior; entrada da calculadora não aparecia. Reportado e corrigido pelo implementador. Caligrafia A4, impressa pelo mecanismo PDF do Chromium após recarregar a versão corrigida, produziu exatamente uma página de 594,96 × 841,92 pontos. A coleta anterior com três páginas foi feita antes de recarregar a correção e não representa a versão final.

## Execução independente

- Busca sem acentos `preco venda`: retornou Preço de venda, Preço com taxas de venda e Comparador de preço unitário. Busca `regra de tres` encontrou Regra de três. Seleção de Confeitaria abriu ferramentas do grupo; retorno ao conjunto completo verificado após correção.
- Grupo 1: Preço de venda, custo 80, margem 30%, taxas 0 e 50 unidades: R$ 114,29 por lote e R$ 2,29 por unidade. Resultado coerente com 80 / 0,7.
- Grupo 2: Contador de palavras com `Olá mundo do Ofício`: quatro palavras, 19 caracteres e 16 sem espaços.
- Grupo 3: Regra de três, 3 corresponde a 12; 5 corresponde a 20.
- Salvar registro `Auditoria receita`, fechar, abrir Salvos e Continuar: formulário restaurado. Resultado exige novo cálculo, conforme explicação da interface de que guarda entradas.
- Download de resultado.txt realizado pelo botão e conteúdo lido em disco; valores e acentuação preservados.
- Folhas de caligrafia: geração de prévia SVG e botão `PDF: atividade` executado no navegador. Arquivo atividade.pdf carregado com pdf-lib: uma página de 595,2756 × 841,8898 pontos, A4. Exportação direta e impressão foram verificadas separadamente.
- Favorito em Folhas de caligrafia seguido de Só favoritos: uma ferramenta encontrada.
- Consentimento opcional rejeitado pelo controle visível; interface continuou utilizável.
- Mobile 390 × 844 e 320 × 720: sem overflow horizontal da página; diálogo calculadora em 320 com largura e scrollWidth iguais a 265 px. Campos e ações acessíveis por rolagem; barra inferior visível.
- Desktop 1440 × 900: abertura de diálogo, cálculo e retorno por Escape testados.
- Acessibilidade amostrada: busca e campos com rótulos, botão de favorito com nome específico, atalho de pular conteúdo, feedback em status, resultado aria-live e diálogo nomeado por aria-labelledby. Escape fecha diálogo. Não foi realizado teste com leitor de tela ou auditoria WCAG completa.
- Console na retomada e exportação PDF: zero erros e zero avisos.

## Evidências

Artefatos em `output/playwright/`: critico-mobile390.png, critico-ferramenta320.png, critico-desktop.png, critico-favoritos390.png e critico-caligrafia-print-final.pdf. Downloads capturados em `.playwright-cli/resultado.txt` e `.playwright-cli/atividade.pdf`. `critico-print.png`, `critico-caligrafia-print.png` e `critico-caligrafia-print.pdf` são evidências intermediárias anteriores à correção final de impressão.

## Limites

Não houve impressão em papel, teste em aparelho físico, Safari/Firefox, leitor de tela nem exame visual rasterizado do PDF final baixado. A exportação final foi validada por download real, leitura estrutural e dimensões; a prévia visual SVG foi observada no navegador. Uma ferramenta por grupo foi calculada interativamente; não se deve atribuir a este parecer uma cobertura manual de todas as 150.
