# Parecer crítico de correção — portal GPT

Data: 2026-09-15. Revisão independente de código, exemplos e artefatos em Node. Escopo exclusivo: a cópia `versões/GPT/Sites de Renda GPT`. Nenhum arquivo de produção foi editado por este crítico.

## Conclusão

Os dois defeitos reproduzidos foram corrigidos pelo integrador e suas regressões passam. A suíte disponível passou com 464 testes, incluindo 14 verificações independentes criadas em `portal/testes/auditoria.test.mjs`. Não foi encontrado bloqueador adicional nos casos examinados. Esta revisão é amostral; não equivale à certificação funcional das 150 ferramentas no navegador.

## Defeitos encontrados e resolvidos

1. **Unidade perdida por arredondamento binário** — `rendimento-com-perdas`, produção 100, perda 56%, custo 80. Antes: 43 aproveitáveis e 57 perdidas. Correto: 44 e 56. A implementação aplicava `floor` em `100*(1-0.56)`. O integrador mudou a ordem da operação e adicionou tolerância relativa. Verificado também com 7%, 28%, 57% e 58%.
2. **Raiz não nula exibida como zero** — `equacao-segundo-grau`, a=1, b=1000000000000, c=1. Antes: segunda raiz `-0`, apesar de ser aproximadamente -1e-12. O integrador introduziu notação científica para valores não nulos menores que o limite das casas decimais. Regressão confirma que a raiz não é apresentada como zero.

## Evidências independentes

- Catálogo: 150 IDs únicos, 50 ferramentas em cada grupo, 15 categorias com 10 ferramentas cada.
- Calendário: janeiro de 31 dias para fevereiro bissexto; semana ISO que pertence ao ano anterior e ao seguinte; feriado em domingo sem desconto duplicado; recusa de 29/02 inválido e 31/04.
- Cortes: folha 101 × 101, peças 50 × 50 e separação 1 mm comportam quatro peças, sem cobrar margem externa inexistente.
- PDF: seleção mantém a ordem `3,1-2`; rejeita zero, inexistentes, repetidos, intervalo invertido e notação científica.
- SVG: texto com marcação de script é escapado; folha mantém dimensões A4 em milímetros.
- Ditado: texto do professor aparece no arquivo separado e não aparece no SVG do aluno.
- Ficha técnica: arquivo TXT preserva acentos, ingredientes e preparo.
- Backup: recusa chaves de protótipo e ferramenta inexistente.
- Senhas: ferramenta sinalizada como sensível e sem persistência.

## Inspeção do renderer e privacidade

O renderer insere os textos com elementos/textContent; SVG aparece em imagem via Blob, sem inserir HTML fornecido pelo usuário. Mudanças de entrada invalidam resultados assíncronos anteriores. Fechamento chama a limpeza da ferramenta e revoga URLs de prévia. Senhas não apresentam a ação de salvar. O armazenamento acontece mediante ação de salvar; resultados de arquivos não são serializados como conteúdo no backup.

Busca estática nos scripts encontrou `fetch` somente para a configuração pública local. Bibliotecas PDF são carregadas de recursos locais. Isto apoia o comportamento local declarado, mas não substitui captura de rede no navegador nem auditoria de bibliotecas distribuídas.

## Limites e observações de acabamento

- Não executei neste parecer decodificação de imagem, operações PDF completas, temporizadores, clipboard, impressão física ou navegação de todos os diálogos. Esses fluxos precisam da validação de navegador do integrador.
- Documentos SVG com texto longo ainda precisam de inspeção visual. Por exemplo, caligrafia limita a 50 caracteres, mas usa fonte proporcional fixa; 50 letras muito largas podem ultrapassar a linha. Esse risco foi observado no código e não confirmado por renderização nesta revisão.
- As URLs de prévias anteriores são revogadas ao fechar/trocar ferramenta, não a cada novo resultado. Repetir processamento de arquivos grandes na mesma janela pode manter mais memória até fechá-la.
- A suíte anterior tinha 450 casos dos grupos 1 e 3. Os 14 casos novos acrescentam calendário, seleção PDF e corte do grupo 2, mas não oferecem cobertura completa dele.

Comandos executados: `npm test`; `node --test --test-reporter=spec testes/auditoria.test.mjs`; `node --test --test-reporter=dot testes/*.test.mjs`. Todos passaram após as correções.
