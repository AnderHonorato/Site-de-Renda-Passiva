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
