# Relatório final do orquestrador

Situação: **rascunho em construção** — as seções de pareceres críticos, correções da Fase F e aceite final serão preenchidas depois dessas etapas. Data de início: 14/09/2026.

## 1. Ambiente e modelos efetivos

| Papel | Modelo efetivo | Observação |
|---|---|---|
| Orquestrador | Opus 5 (`claude-opus-5`) | Opus 6 não confirmado na documentação consultada; não usado. |
| Especialista em interface | Sonnet 5 | CSS comum, 12 scripts de interface, vitrine. Retomado após limite de uso. |
| Assistente de documentação | Haiku 4.5 | Matriz de requisitos: seções 01–15 aproveitadas; 16–25 descartadas por conter requisitos inexistentes e reescritas pelo orquestrador. |
| Executores (1 a 6) | Sonnet 5 | Um por produto, em ondas de até três simultâneos; tarefa adicional da educação para os extras do catálogo. |
| Crítico de segurança e correção | Opus 5 | Pendente (Fase E). |
| Crítico de experiência e desempenho | Opus 5 | Pendente (Fase E). |

Ferramentas: Windows 10, Node 22.14, npm 10.9, Git 2.49, painel de navegador Chromium do Claude Code (emulação de celular e computador). Não houve Firefox, WebKit nem aparelho físico. A execução foi interrompida cinco vezes pelo limite de uso da conta; todos os agentes foram retomados do estado gravado em disco.

## 2. Arquitetura

Seis sites estáticos, sem backend, cadastro, banco ou chat (`decisão-sobre-cadastro-e-servidor.md`). HTML gerado a partir de fragmentos, JavaScript em módulos ES nativos, uma função autoral por arquivo, nomes em português com acentos, código comum em `compartilhado/` copiado para cada produto (`npm run sincronizar`), pacote publicável independente por produto (`npm run construir`). Detalhes em `arquitetura-e-contratos.md`.

## 3. Produtos entregues

| Produto | Marca provisória | Ferramentas | Testes do produto |
|---|---|---|---|
| 1. Confeitaria | Doce Ofício | Custo da receita, preço de venda, ajuste de quantidade, lista de compras, orçamento, preço por unidade, conversor de formas, rendimento com perdas, ficha técnica | 49 |
| 2. Educação | Folha Pronta | Operações, tabuada, caça-palavras, caligrafia (+ extras em andamento: bingo, papel quadriculado, flashcards, planejador) | 45 (antes dos extras) |
| 3. Artesanato | Ponto e Preço | Custo do material, valor da hora, preço da peça, desconto, encomendas, orçamento, amostra de pontos, controle de materiais | 30 |
| 4. Festas | Mesa Farta | Churrasco, festa infantil, almoço, divisor de despesas, orçamento do evento, checklist, cronograma, lista de convidados | 60 |
| 5. Reforma | Demão Certa | Área de paredes, tinta, piso, rodapé, orçamento, papel de parede, rejunte, comparador de tinta | 39 |
| 6. Embalagens | Dobra & Cola | Caixa retangular, caixa com tampa, envelope, etiquetas, cinta, divisórias, saco de papel, aproveitamento de folha | 59 |
| Comum | — | Pix, consentimento, publicidade, armazenamento, cópia, PDF, planilha, orçamento compartilhável | 39 |

Requisito adicional do proprietário (15/09/2026): orçamentos com PDF no visual do site, planilha Excel e link para o cliente. Implementado no componente comum e usado pelos produtos 1, 3, 4 e 5.

Ferramentas do exemplo em `manus modelos/` incorporadas: preço de venda e preço por unidade (1), custo do artesanato (3), planejador de festa, divisor de contas e checklist (4), calculadora de tinta (5). Não incorporadas: orçamento doméstico e custo de combustível (categorias 14 e 15 do catálogo, sites futuros).

## 4. Validação feita pelo orquestrador (evidências)

- `gerar`, `testar` e `verificar` rodados de forma independente em cada produto após cada entrega: todos limpos.
- Navegador Chromium, emulação 390 × 844 e computador:
  - Confeitaria: layout sem rolagem lateral, barra inferior, ação contextual e consentimento sem sobreposição; R$ 80/50/30% → R$ 2,29 e R$ 114,50; receita salva alimentando o preço de venda (R$ 44 ÷ 0,7 ÷ 30 → R$ 2,10); Salvos exibindo HTML hostil como texto.
  - Pix (cópia isolada com chave de exemplo não pagável): revisão, QR, Copia e Cola com campo 54 correto, invalidação ao mudar valor, sem anúncios. CRC igual ao exemplo do Manual do Banco Central (1D3D) e QR lido por jsQR nos testes.
  - Orçamento compartilhado: link de ~500 caracteres, página do cliente com valores e emissor, `<script>` no nome exibido como texto, `noindex`, link adulterado recusado. PDF renderizado no visualizador do Chromium; planilha aberta pelo descompactador do Windows com XML bem formado.
  - Educação: divisão exata conferida (dividendo = divisor × quociente), gabarito separado, PDF gerado, caça-palavras avisando palavra que não cabe e mantendo Ç.
  - Artesanato: R$ 20/100 g/25 g → R$ 5,00; orçamento com PDF (3,4 KB) e planilha (7,1 KB).
  - Festas: álcool apenas para adultos declarados; zero convidados e zero pagantes com mensagem; total igual à soma das linhas.
  - Reforma: piso 20 m² + 10% ÷ 2,2 → 10 caixas; 22 ÷ 2,2 → 10; tinta por demão 8 L × acabado 4 L; orçamento R$ 1.300,00.
  - Embalagens: tampa 102 mm; SVG em mm com texto escapado; molde 900 × 600 × 300 mm → aviso e PDF de 87 folhas em escala real.
- Pacote publicado servido por HTTP: caminho com acento 200, inexistente 404, `..%2f` 404, CSP estrita, `X-Frame-Options: DENY`, `nosniff`.

## 5. Defeitos encontrados pelo orquestrador e corrigidos

| Defeito | Onde | Correção |
|---|---|---|
| `gerarPayloadPix` aceitava valor em texto como centavos | comum | exige centavos inteiros; teste |
| Mensagens de erro fixas removidas do DOM por `limparErrosDeCampo`, quebrando a geração na educação | comum | esconde e esvazia as fixas; remove só as dinâmicas |
| Orçamento sem marca quando a página não informava | comum | usa a marca da página |
| Compartilhar link sem saída quando a cópia falha | comum | janela com o link selecionado (`'manual'`) |
| Troca de `#` na mesma aba não atualizava o orçamento compartilhado | comum | escuta `hashchange` |
| Seletor de receita fora do formulário desalinhava a grade | confeitaria | movido para o formulário |
| **Custos 100× maiores** (dupla conversão para centavos) | festas | função pura `calcular-custo-de-compra.js` com teste de regressão |
| Resultado anterior visível após erro de validação | festas | resultado escondido |
| Aviso de número de folhas nunca exibido (chaves de objeto divergentes) | embalagens | `contar-folhas-do-molde.js` com teste |
| Lista com acentos e grade sem acentos no modo sem acentos | educação | em correção |

## 6. Pacotes publicáveis

| Produto | Arquivos | Tamanho | Indevidos |
|---|---|---|---|
| Confeitaria | 150 | 849 KiB | 0 |
| Educação | 140 | 758 KiB | 0 (será refeito após os extras) |
| Artesanato | 142 | 806 KiB | 0 |
| Festas | 147 | 839 KiB | 0 |
| Reforma | 143 | 813 KiB | 0 |
| Embalagens | 167 | 881 KiB | 0 |

## 7. O que não foi validado

- Aparelho físico (celular real), Firefox e WebKit.
- Pagamento Pix real em aplicativo bancário (depende da chave do proprietário).
- AdSense real, CMP do Google e perfil de CSP com anúncios (dependem da conta).
- Impressão física e montagem dos moldes em papel.
- Métricas de desempenho de campo (LCP, INP, CLS reais).
- Publicação em hospedagem real.

## 8. Configuração pendente do proprietário

Ver `dados-que-o-proprietário-precisa-preencher.md`: portfólio, contato, endereço de publicação, contato de privacidade, chave Pix com nome e cidade, identificador e blocos do AdSense, CMP e `ads.txt`.

## 9. Pareceres críticos

Pendente (Fase E).

## 10. Correções da Fase F e aceite

Pendente.
