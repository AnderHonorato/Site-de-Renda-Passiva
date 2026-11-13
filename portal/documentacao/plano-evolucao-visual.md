# Plano de evolução visual das 250 ferramentas

**Implementação concluída em quatro lotes; validação local concluída.** A publicação deste conjunto é feita pelo workflow `Publicar prévia do portal`, na branch `ander-flow/v1`. O resultado do workflow determina a disponibilidade pública. Este documento não declara hospedagem de API nem ativação de pagamentos.

O [inventário por ferramenta](./inventario-evolucao-visual.json) registra as 250 entradas, seus adaptadores, lote, plano, processamento e evidência. `INTEGRADA_E_VALIDADA_POR_FAMILIA` significa que a montagem de cada ferramenta foi conferida e o comportamento compartilhado foi testado por família. Não significa que 250 telas foram testadas manualmente, uma a uma.

## Lotes executados

| Lote | Escopo principal | Entrega | Referência |
|---|---|---|---|
| 1 — Base e ferramentas locais | 63 ferramentas de cálculo/texto; base herdada pelas 150 locais | Animação de papel no estilo da abertura, estados reais, pausa decorativa, movimento reduzido, resultado com valor principal, detalhes e downloads. Reexecução, reset e resultado obsoleto tratados. | `a63200f` |
| 2 — Análises profissionais | 100 ferramentas | Painéis próprios de análise, importação e exportação; resposta real, erro, timeout e cancelamento; relatório com indicadores, tabela completa, gráfico quando aplicável e formatos preservados. | `d58c70b` |
| 3 — Arquivos e ciclos particulares | 87 ferramentas com formatos, mídia, consultas ou adaptadores especializados | Auditoria dos fluxos; correção de PNG assíncrono, prévia QR, fases de PDF/ZIP/GIF/fotos, cancelamento e leitura por voz. Ação “Abrir link” não é tratada como geração de arquivo. | `2678530` |
| 4 — Integração, cobertura e publicação | Todas as 250 | Inventário conferido contra o catálogo, testes em navegador com arquivos reais, temas e telas menores; regressões incorporadas ao workflow de publicação. | Commit que acompanha este documento |

As três frentes avançaram em paralelo, com revisão independente do componente e integração final pela agente principal. Os lotes são unidades de código revisáveis; a publicação reúne os quatro para evitar uma versão pública com interfaces incompatíveis.

## Cobertura conferida

Referência inicial: `b921497474d46a2b9e35b8cc6450375c79210fda`.

- 110 páginas locais chamam `montarFerramenta` diretamente.
- 40 páginas locais chamam fábricas que realmente usam `montarFerramenta`.
- 100 páginas profissionais usam `criarFerramentaProfissional` e a API privada.
- As 101 entradas ainda planejadas no catálogo não entram nesta entrega de 250 ferramentas prontas.

A presença de um import não foi considerada suficiente. A auditoria verificou chamadas de montagem e os adaptadores; o teste `cobertura-evolucao-visual.test.mjs` impede divergência entre o inventário e o catálogo.

As fábricas compartilhadas são `premium-lote.js`, `estrategia-premium.js`, `operacoes-profissionais.js`, `analitica-profissional.js`, `planejamento-premium-2.js`, `ferramentas-ecommerce-lote.js` e `operacoes-avancadas-2.js`. Os auxiliares `imagens-puras.js`, `imagens-navegador.js` e `resumo-de-custos.js` importam apenas o contrato de erro e não são páginas nem ferramentas adicionais.

## Contrato de geração e resultado

1. O estado indeterminado acompanha um trabalho iniciado. Não há percentual inventado por tempo. As contagens disponíveis vêm de páginas, arquivos ou linhas realmente processados; ao mudar para uma fase sem contagem, o estado volta a ser indeterminado.
2. O componente `execucao-visual.js` usa a mesma família de papel e cores da abertura. O relógio anima apenas a cena decorativa; a operação determina início, sucesso, erro e cancelamento. Dados dos exemplos públicos nunca alimentam o resultado real.
3. Não existe duração mínima para exibir a animação. A pintura anterior ao cálculo permite mostrar atividade sem atrasar artificialmente a entrega. Após concluir, a confirmação se recolhe em 650 ms; o resultado e o download já estão disponíveis durante esse tempo.
4. Pausar a decoração não cancela o trabalho. Botões de cancelamento das operações que suportam interrupção permanecem separados. Movimento reduzido mostra a cena estática e status em texto; motores param fora da tela, em aba oculta e ao encerrar.
5. Recalcular automaticamente não abre painel nem move o foco. Um reset ou resultado novo invalida a conclusão anterior e encerra a visualização de exportação obsoleta. Exportações simultâneas da mesma interface ficam bloqueadas.
6. Números ganham destaque; textos longos recebem tipografia e rolagem adequadas. Detalhes, observações e ações têm áreas próprias. Tabelas permanecem roláveis e os dados completos continuam nos arquivos, independentemente do filtro da tela.
7. A montagem especializada pode usar `aoResultado(raiz, saída)` para inserir uma prévia depois que o resultado válido existe. Isso corrige a prévia QR que antes era agendada cedo demais. `progressoExterno: true` permite que Web Speech siga seus próprios callbacks, sem anunciar conclusão antes do fim da leitura.
8. Login e requisitos Plus/Premium continuam validados pela sessão canônica e pela API. A alteração visual não amplia acesso nem disponibiliza motores privados no pacote público.

## Evidências de validação

- Suíte principal: **1.769 testes passaram** antes da adição de dois testes de inventário; os dois novos também passaram. O workflow executa a suíte completa atualizada.
- API: **8 testes passaram**, incluindo sessão, CSRF, planos e revogação durante upload.
- Arquivos/mídia: **182 testes focados passaram** após os refinamentos; regressões finais de scanner e voz também passaram, com **58 testes**.
- Navegador local: **7 cenários** aprovados no conjunto de execução e correção dirigida da prévia QR. Cobrem cálculo repetido/reset, CSV/XLSX legíveis, PDF com páginas preservadas, imagem com dimensões conferidas, PNG real de QR e gráfico e ciclo do componente.
- Navegador com API real: **9 cenários** aprovados no conjunto de execução e correção dirigida de uma fixture. Incluem quatro domínios, importação de CSV/JSON/XLSX/DOCX/PDF/SRT/SBOM, exportações completas em worker, sessão e bloqueios de plano. Uma resposta real retida verifica atividade indeterminada, pausa decorativa, cancelamento e resposta tardia sem falso sucesso.
- Layout local conferido em **320, 768 e 1280 px**, nos temas claro/escuro e com movimento reduzido. Análises profissionais conferidas em **390 e 1280 px**, nos dois temas, com títulos e indicadores visíveis e sem sobreposição.
- Integridade: **316 saídas geradas**, catálogo com **351 entradas**, sem problema no verificador. Checagens de publicação/servidor: **14 testes passaram**. Os dois avisos de ferramentas ainda planejadas são anteriores a esta entrega.

Os cenários de navegador e os testes de inventário integram o workflow, que executa novamente o conjunto final antes de publicar. Capturas locais ficam em `portal/.execucao/execucao-visual-e2e/` e `portal/.execucao/profissionais-e2e/`, fora do pacote público.

## Limites atuais do ambiente público

O endereço público do GitHub Pages serve a interface, os exemplos e as ferramentas locais. As 100 análises profissionais e os recursos de conta dependem de um servidor Node com banco persistente; a API foi testada localmente e no workflow. Esta entrega não instala essa hospedagem. A leitura por voz depende das vozes disponíveis no aparelho; os testes Node validam os callbacks do leitor, sem afirmar síntese real no Chromium sem vozes.

## Como manter os próximos lotes

Para incluir ou alterar ferramentas, atualizar o inventário a partir do catálogo, identificar a chamada real de montagem e executar os testes da família. Um fluxo próprio precisa informar seus estados reais e aguardar a geração efetiva dos bytes. Acrescentar um cenário de navegador quando houver novo comportamento de upload, exportação ou cancelamento que os cenários existentes não cubram.
