# Lote F247–F251 — operações e-commerce

Criador: Ander Flow. Implementação em JavaScript local, sem coleta de dados.

| ID | Ferramenta | Motor |
|---|---|---|
| F247 | Auditoria de margem por marketplace | Preço − CMV − comissão − imposto − tarifa − frete − Ads |
| F248 | Custos de devoluções | Pedidos × taxa de devolução × custo por devolução |
| F249 | Equilíbrio por canal | Teto(despesa fixa / contribuição unitária) |
| F250 | Reajuste de fornecedores | Preço líquido de taxas − custo reajustado |
| F251 | Planejamento ROAS/CPA | Receita total / investimento total; CPA por campanha |

## Uso

Cada módulo tem CSV editável com dois exemplos, resultados por registro, indicadores e exportação CSV/XLSX usando o montador existente. O CSV de entrada usa ponto e vírgula, cabeçalho exato, até 500 registros e identificadores únicos. Nenhum dado é enviado ao servidor.

## Critérios de validação

- [x] Código do motor e dos cinco módulos criado na branch de desenvolvimento
- [x] Catálogo PT-BR e tradução de metadados EN adicionados sem reaproveitar IDs
- [x] Testes unitários de fórmulas e entradas inválidas adicionados
- [x] Workflow de CI Ubuntu/Node 22 criado
- [ ] Confirmar CI verde e carregamento da ferramenta no portal
- [ ] Verificar responsividade e exportações no navegador real
- [ ] Promover status de planejada para pronta apenas após as verificações

Não há backend Premium ou autenticação neste lote: os cálculos são locais e as ferramentas são gratuitas. Isso não substitui a validação de relatórios contábeis reais.

## Evolução funcional de 12/11/2026

- Importação direta de arquivos CSV e TSV de até 100 KB em cada uma das cinco interfaces.
- F247 identifica SKUs com contribuição negativa e apresenta margem percentual.
- F248 mostra pedidos analisados, devoluções esperadas e alerta para taxas acima de 20% (limiar ilustrativo, não norma).
- F249 calcula também a receita bruta necessária para o ponto de equilíbrio.
- F250 compara a contribuição antes/depois e sinaliza resultado negativo.
- F251 calcula ROAS agregado ponderado por investimento, CPA agregado e campanhas abaixo da meta.
- Alertas aparecem no resultado com limite de dez mensagens; exportação inclui todas as linhas.
- Cabeçalhos precisam seguir os modelos; o importador atual aceita CSV simples com ponto e vírgula ou TSV simples, sem campos com delimitadores escapados por aspas.

**Estado:** manter como planejada até CI e validação de integração/uso no navegador. Nenhum deploy ou upload Drive foi presumido.

## Evolução de cálculos e importação — 12/11/2026

- F247: preço mínimo para contribuição zero após percentuais e custos unitários; inviável quando a soma de comissões e impostos chega a 100%.
- F248: custo esperado de devoluções por pedido.
- F250: preço de venda necessário para preservar a contribuição anterior após reajuste, mantendo a alíquota de taxas.
- Importação CSV/TSV: aspas duplas escapadas, campos com separadores, limite de 100 KB em UTF-8 e validação antes de substituir o formulário. Identificadores iniciados por caracteres de fórmula são rejeitados.
- Testes novos para cálculos e importação; CI e navegador precisam ser confirmados antes de promover o catálogo para pronta.

## Evolução de cenários — 2026-11-12

- **F249:** além dos pedidos e receita de equilíbrio, apresenta cenários de despesa fixa 10% menor e 10% maior por canal, mantendo contribuição unitária constante. Valores de custo são arredondados para centavos antes do cálculo de unidades inteiras.
- **F251:** mostra receita adicional para alcançar o ROAS-alvo e estima pedidos adicionais a partir do ticket médio histórico (receita/pedidos). Se não houver receita ou pedidos históricos, informa que não é possível estimar. Não promete crescimento real de conversões.
- Testes de limites e fórmulas adicionados em `portal/testes/lote-ecommerce-f247-f251.test.mjs`.

O status permanece **planejada** até CI verde e validação no navegador; nenhuma mudança de identidade visual.

## Melhorias desta rodada (12/11/2026)

- F247: preço de equilíbrio e preço recomendado para margem de contribuição de 20%, respeitando comissão, impostos, custos variáveis e impossibilidade matemática quando a soma das taxas inviabiliza a meta.
- F250: cálculo do percentual mínimo de reajuste do preço para preservar a contribuição antes do aumento de custo; mostra o custo adicional unitário.
- F247–F251: botões para baixar modelo CSV preenchido e restaurar o exemplo editável, com alvos de toque de 44 px.
- Testes novos para preço-alvo, impossibilidade da margem e percentual de repasse.

**Critério de conclusão ainda aberto:** CI verde, interação real em navegador, verificação de exportações e publicação. Nenhum status foi promovido sem essas evidências.

## Atualização — 2026-11-12: metas personalizadas

- F247: campo editável de meta de margem de 0% a 99%, padrão 20%. O preço sugerido é calculado a partir dos custos e taxas informados; meta inviável permanece identificada.
- F248: campo editável de limite de alerta de devoluções entre 0% e 100%, padrão 20%. O alerta utiliza o limite escolhido, sem alterar a estimativa financeira.
- Os dois campos aceitam vírgula decimal e rejeitam percentuais inválidos. Foram acrescentados testes de cenário e validação.
- Status permanece planejada até CI verde e validação visual; não confundir commits com deploy público.
