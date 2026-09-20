# Matriz de ferramentas

Gerado por `portal/ferramentas/gerar-documentos.mjs` a partir de `portal/dados/catálogo.js`.
Não edite este arquivo à mão: edite o catálogo e gere de novo.

**150 ferramentas únicas · 30 prontas · 120 planejadas**

## Como ler a situação

- **pronta** — abre, valida a entrada, calcula, trata erro, exporta o que promete e tem teste automático. Tem página própria em `/portal/f/<slug>/`.
- **planejada** — a ficha existe e aparece no catálogo, mas a ferramenta ainda não foi implementada. Não abre tela vazia: leva ao catálogo com a descrição do que fará.

Toda ferramenta é projetada para funcionar no celular; por isso não existe coluna "mobile": seria sempre "sim".

## Ferramentas que absorveram outras (30)

Em vez de criar variações artificiais, estas reúnem num lugar só o que seria várias ferramentas quase iguais:

- **Calculadora de porcentagem** (`porcentagem`) reúne: Porcentagem simples · Calculadora de desconto · Calculadora de acréscimo · Diferença percentual
- **Preço de venda** (`preco-de-venda`) reúne: Markup · Margem de lucro · Preço mínimo · Formação de preço
- **Calculadora de juros** (`juros`) reúne: Juros simples · Juros compostos · Simulador de poupança · Valor futuro
- **Simulador de parcelamento** (`parcelamento`) reúne: Tabela Price · Custo do parcelamento · À vista ou parcelado
- **Divisão de contas** (`divisao-de-contas`) reúne: Divisor de despesas · Rateio proporcional · Vaquinha
- **Preço por unidade** (`preco-por-unidade`) reúne: Comparador de embalagens · Preço proporcional · Custo por quilo
- **Número por extenso** (`numero-por-extenso`) reúne: Valor por extenso · Número por extenso
- **Orçamento e proposta** (`orcamento`) reúne: Orçamento de doces · Orçamento artesanal · Orçamento de festa · Orçamento de reforma · Proposta comercial
- **Gerador de recibo** (`recibo`) reúne: Recibo de pagamento · Recibo de aluguel
- **Regra de três** (`regra-de-tres`) reúne: Regra de três simples · Regra de três inversa
- **Conversor de unidades** (`conversor-de-unidades`) reúne: Conversor de medidas · Conversor de temperatura · Conversor de bytes
- **Calculadora de datas** (`calculadora-de-datas`) reúne: Diferença entre datas · Dias úteis · Calculadora de idade · Dia da semana · Dia do ano
- **Calculadora de horas** (`calculadora-de-horas`) reúne: Somar horas · Carga horária · Banco de horas
- **JSON: validar e formatar** (`json`) reúne: Formatador de JSON · Validador de JSON · Minificador de JSON
- **Gerador de senhas** (`gerador-de-senhas`) reúne: Gerador de PIN · Senha de Wi-Fi · Verificador de força de senha
- **Validador de CPF e CNPJ** (`validador-cpf-cnpj`) reúne: Validador de CPF · Validador de CNPJ
- **Gerador de QR Code** (`qr-code`) reúne: QR Code de Wi-Fi · QR Code de contato · QR Code de link
- **Limpeza de planilha** (`limpar-planilha`) reúne: Remover linhas duplicadas · Aparar espaços · Padronizar texto de planilha
- **Cronômetro e temporizador** (`cronometro`) reúne: Pomodoro · Cronômetro · Temporizador
- **Sorteio** (`sorteio`) reúne: Sorteador de números · Sorteador de nomes · Sorteador de times · Amigo secreto
- **Limpeza de texto** (`limpador-de-texto`) reúne: Remover espaços extras · Padronizar quebras de linha · Remover linhas vazias
- **Maiúsculas e minúsculas** (`transformador-de-caixa`) reúne: Texto em maiúsculas · Texto em minúsculas · Primeira letra maiúscula · Título
- **Dividir PDF e extrair páginas** (`dividir-pdf`) reúne: Dividir PDF · Extrair páginas do PDF
- **Girar e numerar páginas do PDF** (`girar-e-numerar-pdf`) reúne: Girar páginas do PDF · Numerar páginas do PDF
- **Marca d'água e senha no PDF** (`protecao-de-pdf`) reúne: Marca d'água em PDF · Proteger PDF com senha
- **Cortar imagem** (`cortar-imagem`) reúne: Cortar imagem · Imagem para redes sociais
- **Ajuste de quantidade e rendimento da receita** (`ajuste-de-receita`) reúne: Ajuste de quantidade · Rendimento com perdas
- **Calculadora de tinta** (`calculadora-de-tinta`) reúne: Quantidade de tinta · Comparador de embalagens de tinta
- **Molde de caixa** (`molde-de-caixa`) reúne: Caixa retangular · Caixa com tampa
- **Calculadora de churrasco e almoço em grupo** (`calculadora-de-churrasco`) reúne: Calculadora de churrasco · Quantidade para almoço ou encontro

## Ferramentas cuja lógica será portada dos seis sites existentes (28)

Estas já funcionam nas pastas numeradas da raiz do repositório e serão trazidas para o portal reaproveitando o cálculo já testado, não reescrevendo do zero:

- F069 Checklist para imprimir (`checklist`)
- F072 Etiquetas para imprimir (`etiquetas`)
- F119 Flashcards (`flashcards`)
- F120 Plano de estudos (`plano-de-estudos`)
- F124 Tabuada para imprimir (`tabuada`)
- F125 Caça-palavras (`caca-palavras`)
- F126 Folha de caligrafia (`caligrafia`)
- F127 Papel quadriculado para imprimir (`papel-quadriculado`)
- F128 Bingo de números (`bingo-de-numeros`)
- F129 Folha de operações matemáticas (`operacoes-matematicas`)
- F133 Custo de receita (`custo-de-receita`)
- F134 Ajuste de quantidade e rendimento da receita (`ajuste-de-receita`)
- F135 Ficha técnica de produto (`ficha-tecnica`)
- F136 Custo de material artesanal (`custo-de-material-artesanal`)
- F137 Valor da hora de trabalho (`valor-da-hora`)
- F138 Calculadora de tinta (`calculadora-de-tinta`)
- F139 Piso por caixa (`piso-por-caixa`)
- F140 Quantidade de rodapé (`quantidade-de-rodape`)
- F141 Papel de parede (`papel-de-parede`)
- F142 Área e quantidade de rejunte (`area-de-rejunte`)
- F143 Área de paredes e tetos (`area-de-paredes`)
- F144 Molde de caixa (`molde-de-caixa`)
- F145 Molde de envelope (`molde-de-envelope`)
- F146 Divisórias de caixa (`divisorias-de-caixa`)
- F147 Calculadora de churrasco e almoço em grupo (`calculadora-de-churrasco`)
- F148 Planejador de festa infantil (`festa-infantil`)
- F149 Lista de convidados (`lista-de-convidados`)
- F150 Cronograma do evento (`cronograma-de-evento`)

## Catálogo por categoria

### Dinheiro e preços (6/10 prontas)

Preço, margem, juros, parcelas e divisão de contas.

| ID | Nome | Slug | Problema resolvido | Entrada | Saída | Exporta | Plano | Processa | Situação | Unificação |
|---|---|---|---|---|---|---|---|---|---|---|
| F002 | Preço de venda | `preco-de-venda` | Descobrir por quanto vender sem comer a própria margem com taxa de cartão e imposto. | Custo, margem desejada, taxas percentuais, imposto e despesa fixa por unidade. | Preço sugerido, lucro por unidade, markup equivalente e composição do preço. | copiar, pdf | gratuito | navegador | **pronta** | unifica 4 |
| F003 | Calculadora de juros | `juros` | Saber quanto um valor rende ou custa ao longo do tempo, com ou sem aportes. | Valor inicial, taxa, período, tipo de juros e aporte mensal opcional. | Montante, total de juros, total aportado e tabela de evolução. | copiar, xlsx | gratuito | navegador | **pronta** | unifica 4 |
| F004 | Simulador de parcelamento | `parcelamento` | Decidir entre pagar à vista com desconto ou parcelar, vendo o custo real. | Valor, entrada, número de parcelas, taxa mensal e desconto à vista. | Parcela, total pago, juros embutidos e qual opção sai mais barata. | copiar, xlsx | gratuito | navegador | **pronta** | unifica 3 |
| F005 | Divisão de contas | `divisao-de-contas` | Acertar as contas de um grupo sem planilha e sem discussão. | Participantes, o que cada um pagou e pesos opcionais. | Saldo por pessoa e lista de quem paga para quem. | copiar, pdf | gratuito | navegador | **pronta** | unifica 3 |
| F006 | Preço por unidade | `preco-por-unidade` | Descobrir qual embalagem compensa quando os tamanhos e preços são diferentes. | Preço, quantidade e unidade de cada embalagem. | Custo por unidade de cada opção, a mais barata e a economia percentual. | copiar | gratuito | navegador | **pronta** | unifica 3 |
| F007 | Número por extenso | `numero-por-extenso` | Escrever o valor por extenso sem errar centavos, plural e concordância. | Um número, com a opção de tratar como dinheiro. | Texto por extenso pronto para copiar. | copiar | gratuito | navegador | **pronta** | unifica 2 |
| F011 | Ponto de equilíbrio | `ponto-de-equilibrio` | Saber a partir de qual faturamento o negócio começa a dar lucro. | Custos fixos, custo variável unitário e preço de venda. | Ponto de equilíbrio em unidades e em reais, com margem de contribuição. | copiar | gratuito | navegador | planejada | — |
| F012 | Fluxo de caixa | `fluxo-de-caixa` | Enxergar quando o caixa fica negativo antes de acontecer. | Lançamentos com data, descrição, tipo e valor. | Saldo por período, saldo acumulado e alerta de caixa negativo. | xlsx, pdf | gratuito | navegador | planejada | — |
| F013 | Conversor de moedas | `conversor-de-moedas` | Converter valores sem depender de cotação inventada pelo site. | Valor, moeda de origem, moeda de destino e cotação. | Valor convertido com a cotação e a data usadas. | copiar | gratuito | navegador | planejada | — |
| F015 | Rateio de custos | `rateio-de-custos` | Dividir um custo compartilhado de forma justa e defensável. | Valor total, itens e o peso de cada um. | Valor rateado por item, com total conferido. | copiar, xlsx | gratuito | navegador | planejada | — |

### Vendas e propostas (1/11 prontas)

Orçamento, proposta, comissão e acompanhamento.

| ID | Nome | Slug | Problema resolvido | Entrada | Saída | Exporta | Plano | Processa | Situação | Unificação |
|---|---|---|---|---|---|---|---|---|---|---|
| F008 | Orçamento e proposta | `orcamento` | Enviar um orçamento apresentável sem abrir editor de texto nem planilha. | Dados do emissor, do cliente, itens com quantidade e preço, desconto e condições. | Orçamento pronto, PDF, planilha .xlsx e link compartilhável. | pdf, xlsx, link, imprimir | gratuito | navegador | **pronta** | unifica 5 |
| F010 | Calculadora de comissão | `comissao` | Calcular a comissão certa quando existem faixas e descontos. | Vendas do período, faixas de comissão e descontos. | Comissão bruta, descontos e comissão líquida por vendedor. | copiar, xlsx | gratuito | navegador | planejada | — |
| F016 | Pedido de venda | `pedido-de-venda` | Registrar o pedido do cliente sem sistema de gestão. | Cliente, itens, condição de pagamento e prazo. | Pedido em PDF e planilha. | pdf, xlsx | gratuito | navegador | planejada | — |
| F017 | Ficha de cliente | `ficha-de-cliente` | Guardar contatos e histórico sem contratar um CRM. | Nome, contato, observações e histórico de compras. | Lista pesquisável e arquivo de backup. | xlsx, json | gratuito | navegador | planejada | — |
| F018 | Mensagem de follow-up | `follow-up` | Escrever a cobrança educada de resposta sem soar insistente. | Cliente, assunto, data do último contato e tom desejado. | Mensagem pronta para copiar. | copiar | gratuito | navegador | planejada | — |
| F019 | Meta de faturamento | `meta-de-faturamento` | Transformar a meta do mês em um número diário possível de acompanhar. | Meta, dias úteis, ticket médio e número de vendedores. | Meta diária, semanal, por vendedor e número de vendas necessárias. | copiar | gratuito | navegador | planejada | — |
| F020 | Ticket médio e conversão | `ticket-medio` | Descobrir se compensa mais vender para mais gente ou vender mais por pessoa. | Faturamento, número de vendas e número de atendimentos. | Ticket médio, conversão e simulação de ganho. | copiar | gratuito | navegador | planejada | — |
| F114 | Funil de vendas | `funil-de-vendas` | Ver em qual etapa o funil está perdendo mais gente. | Número de leads em cada etapa do funil. | Funil visual com as taxas de conversão de cada etapa. | png, xlsx | gratuito | navegador | planejada | — |
| F115 | Script de abordagem | `script-de-abordagem` | Ter um roteiro para não travar na hora de abordar o cliente. | Produto, público e objeções comuns. | Script pronto para copiar ou imprimir. | copiar, pdf | gratuito | navegador | planejada | — |
| F116 | Calculadora de NPS | `calculadora-de-nps` | Transformar as respostas da pesquisa de satisfação num número comparável. | Lista de notas de 0 a 10. | NPS, percentual de cada grupo e classificação da zona. | copiar, xlsx | gratuito | navegador | planejada | — |
| F117 | Previsão de vendas | `previsao-de-vendas` | Ter uma estimativa de vendas futuras para planejar compra e caixa. | Vendas dos últimos meses e taxa de crescimento esperada. | Projeção mês a mês e gráfico de tendência. | xlsx, copiar | gratuito | navegador | planejada | — |

### Cálculo e conversão (3/6 prontas)

Porcentagem, regra de três e unidades de medida.

| ID | Nome | Slug | Problema resolvido | Entrada | Saída | Exporta | Plano | Processa | Situação | Unificação |
|---|---|---|---|---|---|---|---|---|---|---|
| F001 | Calculadora de porcentagem | `porcentagem` | Resolver qualquer conta de porcentagem sem precisar lembrar a fórmula certa. | Dois números e a operação desejada. | Resultado, valor da diferença e a fórmula usada. | copiar | gratuito | navegador | **pronta** | unifica 4 |
| F021 | Regra de três | `regra-de-tres` | Resolver proporções sem trocar a ordem dos termos. | Três valores conhecidos e o tipo de proporção. | Valor procurado e a conta montada. | copiar | gratuito | navegador | **pronta** | unifica 2 |
| F022 | Conversor de unidades | `conversor-de-unidades` | Converter medidas entre sistemas sem procurar tabela. | Valor, grandeza e as duas unidades. | Valor convertido e equivalências úteis da mesma grandeza. | copiar | gratuito | navegador | **pronta** | unifica 3 |
| F045 | IMC e faixa de peso | `imc` | Situar o peso em relação à altura com a referência adulta da OMS. | Peso e altura. | IMC, faixa e intervalo de peso da faixa saudável, com aviso de que não substitui avaliação profissional. | copiar | gratuito | navegador | planejada | — |
| F046 | Números romanos | `numeros-romanos` | Ler ou escrever um número romano sem errar a regra de subtração. | Número decimal ou romano. | Número convertido. | copiar | gratuito | navegador | planejada | — |
| F047 | Escala e proporção | `escala-e-proporcao` | Redimensionar sem distorcer e ler medidas de uma planta em escala. | Medidas originais, medida desejada ou escala. | Medidas finais e o fator aplicado. | copiar | gratuito | navegador | planejada | — |

### Datas e horas (2/5 prontas)

Diferenças, prazos, dias úteis e carga horária.

| ID | Nome | Slug | Problema resolvido | Entrada | Saída | Exporta | Plano | Processa | Situação | Unificação |
|---|---|---|---|---|---|---|---|---|---|---|
| F023 | Calculadora de datas | `calculadora-de-datas` | Descobrir prazos e idades sem contar no calendário. | Uma ou duas datas, quantidade de dias e feriados opcionais. | Diferença detalhada, data final, dia da semana e idade em várias unidades. | copiar | gratuito | navegador | **pronta** | unifica 5 |
| F024 | Calculadora de horas | `calculadora-de-horas` | Fechar a folha de ponto sem errar a conta de minutos. | Entradas e saídas do dia, intervalo e jornada contratual. | Horas trabalhadas, saldo positivo ou negativo e total do período. | copiar, xlsx | gratuito | navegador | **pronta** | unifica 3 |
| F048 | Calendário para imprimir | `calendario-do-mes` | Ter um calendário na parede com os feriados certos. | Ano, meses e feriados. | Calendário em PDF pronto para imprimir. | pdf, imprimir | gratuito | navegador | planejada | — |
| F049 | Contagem regressiva | `contagem-regressiva` | Acompanhar um prazo sem ficar contando no calendário. | Data e título do evento. | Tempo restante e link compartilhável. | link | gratuito | navegador | planejada | — |
| F050 | Fuso horário e reunião | `fuso-horario` | Marcar reunião com gente em outro fuso sem errar a hora. | Cidades e faixa de horário aceitável. | Horários equivalentes e janelas comuns. | copiar | gratuito | navegador | planejada | — |

### Texto (0/9 prontas)

Contar, limpar, padronizar, comparar e transformar.

| ID | Nome | Slug | Problema resolvido | Entrada | Saída | Exporta | Plano | Processa | Situação | Unificação |
|---|---|---|---|---|---|---|---|---|---|---|
| F051 | Contador de texto | `contador-de-texto` | Saber se um texto cabe no limite de caracteres ou quanto tempo leva para ler. | Texto colado ou digitado. | Contagens e tempo estimado de leitura e de fala. | copiar | gratuito | navegador | planejada | — |
| F052 | Limpeza de texto | `limpador-de-texto` | Colar um texto de outro lugar e ele vir cheio de espaços e linhas quebradas. | Texto colado. | Texto limpo pronto para copiar. | copiar | gratuito | navegador | planejada | unifica 3 |
| F053 | Comparar dois textos | `comparador-de-textos` | Achar o que mudou entre duas versões de um contrato ou parágrafo. | Dois textos. | Texto com as diferenças destacadas. | copiar | gratuito | navegador | planejada | — |
| F054 | Maiúsculas e minúsculas | `transformador-de-caixa` | Corrigir um texto digitado em CAIXA ALTA por engano. | Texto. | Texto convertido. | copiar | gratuito | navegador | planejada | unifica 4 |
| F055 | Remover acentos | `removedor-de-acentos` | Gerar um texto sem acento para um sistema que não aceita. | Texto. | Texto sem acentos. | copiar | gratuito | navegador | planejada | — |
| F056 | Remover linhas duplicadas | `remover-linhas-duplicadas-de-texto` | Limpar uma lista colada que tem itens repetidos. | Texto com uma linha por item. | Lista sem duplicadas e a contagem de linhas removidas. | copiar | gratuito | navegador | planejada | — |
| F057 | Ordenar linhas | `ordenador-de-linhas` | Colocar uma lista em ordem sem copiar para uma planilha. | Texto com uma linha por item. | Lista ordenada. | copiar | gratuito | navegador | planejada | — |
| F058 | Modelo de mensagem | `modelo-de-mensagem` | Escrever uma mensagem comum do dia a dia sem começar do zero. | Tipo de mensagem e os dados a preencher. | Mensagem pronta para copiar. | copiar | gratuito | navegador | planejada | — |
| F059 | Extrair e-mails e telefones de um texto | `extrator-de-contatos-em-texto` | Puxar contatos de um texto colado sem procurar um por um. | Texto. | Listas separadas de e-mails, telefones e links encontrados. | copiar, csv | gratuito | navegador | planejada | — |

### Documentos e PDF (1/14 prontas)

Gerar, converter, organizar e assinar documentos.

| ID | Nome | Slug | Problema resolvido | Entrada | Saída | Exporta | Plano | Processa | Situação | Unificação |
|---|---|---|---|---|---|---|---|---|---|---|
| F009 | Gerador de recibo | `recibo` | Emitir um recibo correto sem modelo do Word. | Quem recebeu, quem pagou, valor, referência, cidade e data. | Recibo em PDF com linha de assinatura e segunda via opcional. | pdf, imprimir | gratuito | navegador | **pronta** | unifica 2 |
| F060 | Juntar PDF | `juntar-pdf` | Mandar um só PDF em vez de vários arquivos soltos. | Dois ou mais arquivos PDF. | Um PDF único para baixar. | baixar | gratuito | navegador | planejada | — |
| F061 | Dividir PDF e extrair páginas | `dividir-pdf` | Tirar algumas páginas de um PDF grande sem mexer no resto. | Arquivo PDF e o intervalo de páginas. | PDF com as páginas extraídas ou vários arquivos divididos. | baixar | gratuito | navegador | planejada | unifica 2 |
| F062 | Girar e numerar páginas do PDF | `girar-e-numerar-pdf` | Corrigir páginas escaneadas de lado e numerar um documento longo. | Arquivo PDF, páginas a girar e formato da numeração. | PDF corrigido e numerado. | baixar | gratuito | navegador | planejada | unifica 2 |
| F063 | Marca d'água e senha no PDF | `protecao-de-pdf` | Identificar um PDF como rascunho ou impedir que qualquer um abra o arquivo. | Arquivo PDF, texto da marca d'água ou senha desejada. | PDF com marca d'água ou protegido por senha. | baixar | plus | servidor | planejada | unifica 2 |
| F064 | Comprimir PDF | `comprimir-pdf` | Enviar um PDF grande por e-mail ou formulário com limite de tamanho. | Arquivo PDF. | PDF menor, com o tamanho antes e depois. | baixar | plus | navegador | planejada | — |
| F065 | Extrair texto do PDF | `extrair-texto-de-pdf` | Copiar o conteúdo de um PDF sem digitar tudo de novo. | Arquivo PDF. | Texto extraído, com aviso quando o PDF é uma imagem escaneada sem texto. | copiar, baixar | gratuito | navegador | planejada | — |
| F066 | Gerador de declaração | `declaracao` | Escrever uma declaração formal sem lembrar a estrutura certa. | Tipo de declaração, dados das partes e finalidade. | Declaração em PDF com linha de assinatura. | pdf, imprimir | gratuito | navegador | planejada | — |
| F067 | Gerador de procuração | `procuracao` | Redigir uma procuração sem contratar um advogado para um ato simples. | Dados de quem outorga, de quem recebe e os poderes concedidos. | Procuração em PDF com linha de assinatura e aviso de que não substitui orientação jurídica. | pdf, imprimir | gratuito | navegador | planejada | — |
| F068 | Contrato simples de prestação de serviço | `contrato-simples` | Formalizar um acordo simples sem abrir um editor de texto do zero. | Partes, objeto do serviço, valor, forma de pagamento e prazo. | Contrato em PDF com linha de assinatura das partes. | pdf, imprimir | gratuito | navegador | planejada | — |
| F069 | Checklist para imprimir | `checklist` | Organizar os itens de uma viagem, mudança, evento ou projeto numa lista só. | Título e os itens da lista. | Checklist na tela, para copiar, imprimir ou salvar em PDF. | pdf, imprimir, copiar | gratuito | navegador | planejada | — |
| F070 | Procedimento operacional padrão (POP) | `pop` | Documentar um processo da empresa de um jeito padronizado. | Nome do processo, objetivo, materiais, etapas e responsáveis. | POP em PDF pronto para treinar a equipe. | pdf, imprimir | gratuito | navegador | planejada | — |
| F071 | Gerador de currículo | `curriculo` | Ter um currículo com boa formatação sem brigar com o editor de texto. | Dados pessoais, experiências, formação e habilidades. | Currículo em PDF pronto para enviar. | pdf, imprimir | gratuito | navegador | planejada | — |
| F072 | Etiquetas para imprimir | `etiquetas` | Imprimir etiquetas de endereço ou de produto numa folha sem desperdiçar espaço. | Tamanho da etiqueta, margens e o texto de cada uma. | PDF com as etiquetas posicionadas e linhas de corte. | pdf, imprimir | gratuito | navegador | planejada | — |

### Planilhas e dados (2/6 prontas)

Limpar, comparar, converter e analisar tabelas.

| ID | Nome | Slug | Problema resolvido | Entrada | Saída | Exporta | Plano | Processa | Situação | Unificação |
|---|---|---|---|---|---|---|---|---|---|---|
| F030 | Limpeza de planilha | `limpar-planilha` | Deixar uma lista exportada de outro sistema utilizável. | Arquivo CSV ou texto colado, com o separador detectado automaticamente. | Tabela limpa, contagem do que foi removido e arquivo para baixar. | csv, xlsx, copiar | gratuito | navegador | **pronta** | unifica 3 |
| F031 | CSV e JSON | `csv-e-json` | Levar dados de uma planilha para uma API e vice-versa. | Texto CSV ou JSON, ou arquivo. | Arquivo convertido, em UTF-8, pronto para baixar. | copiar, baixar | gratuito | navegador | **pronta** | — |
| F032 | Comparar duas planilhas | `comparar-planilhas` | Descobrir a diferença entre dois arquivos sem conferir linha a linha. | Duas planilhas e a coluna-chave. | Listas de incluídos, removidos e alterados. | xlsx, csv | gratuito | navegador | planejada | — |
| F033 | Estatística de uma coluna | `estatistica-descritiva` | Entender um conjunto de números sem abrir o Excel. | Lista de números colada ou coluna de um CSV. | Resumo estatístico e distribuição. | copiar, xlsx | gratuito | navegador | planejada | — |
| F034 | Montador de fórmulas de planilha | `gerador-de-formulas` | Escrever a fórmula certa sem decorar a ordem dos argumentos. | Intervalos, critérios e o que se quer obter. | Fórmula pronta nas duas sintaxes, com explicação de cada argumento. | copiar | gratuito | navegador | planejada | — |
| F035 | Gerador de dados de teste | `dados-de-teste` | Testar um sistema sem usar dados reais de pessoas. | Colunas desejadas e quantidade de linhas. | Tabela pronta em CSV, XLSX ou JSON. | csv, xlsx, json | gratuito | navegador | planejada | — |

### Imagens (1/9 prontas)

Redimensionar, converter, comprimir e inspecionar.

| ID | Nome | Slug | Problema resolvido | Entrada | Saída | Exporta | Plano | Processa | Situação | Unificação |
|---|---|---|---|---|---|---|---|---|---|---|
| F029 | Gerador de QR Code | `qr-code` | Gerar um QR Code sem enviar o conteúdo para um site desconhecido. | Tipo de conteúdo e os dados correspondentes. | QR Code em tela, PNG e SVG. | baixar | gratuito | navegador | **pronta** | unifica 3 |
| F073 | Redimensionar imagens em lote | `redimensionar-imagens-em-lote` | Ajustar o tamanho de muitas fotos sem abrir uma por uma num editor. | Várias imagens e a medida ou peso final desejado. | Imagens redimensionadas para baixar, uma por uma ou em pacote. | baixar | plus | navegador | planejada | — |
| F074 | Cortar imagem | `cortar-imagem` | Ajustar uma foto para o formato exigido por uma rede social. | Imagem e a proporção ou moldura desejada. | Imagem cortada, pronta para baixar. | baixar, png | gratuito | navegador | planejada | unifica 2 |
| F075 | Converter formato de imagem | `converter-formato-de-imagem` | Ter a imagem no formato exigido por um site ou sistema. | Imagem e o formato de saída. | Arquivo no novo formato para baixar. | baixar, png | gratuito | navegador | planejada | — |
| F076 | Comprimir imagem | `comprimir-imagem` | Deixar a foto leve o suficiente para o site carregar rápido. | Imagem e o nível de qualidade ou peso máximo desejado. | Imagem comprimida, com o tamanho antes e depois. | baixar | gratuito | navegador | planejada | — |
| F077 | Gerador de favicon | `gerador-de-favicon` | Ter o ícone do site nos tamanhos certos sem abrir editor de imagem. | Uma imagem quadrada. | Arquivos de favicon em vários tamanhos, prontos para baixar. | baixar | gratuito | navegador | planejada | — |
| F078 | Remover metadados da imagem | `remover-metadados-de-imagem` | Publicar uma foto sem revelar onde e com qual aparelho ela foi tirada. | Imagem. | Imagem limpa e a lista do que foi removido. | baixar | gratuito | navegador | planejada | — |
| F079 | Extrair paleta de cores da imagem | `extrator-de-paleta-de-cores` | Descobrir as cores exatas de uma imagem para usar no design. | Imagem. | Paleta de cores com os códigos hexadecimais e RGB. | copiar, png | gratuito | navegador | planejada | — |
| F080 | Verificador de contraste de cores | `verificador-de-contraste` | Saber se um texto vai ficar legível em cima de determinada cor de fundo. | Cor do texto e cor do fundo. | Razão de contraste e se passa nos níveis AA e AAA. | copiar | gratuito | navegador | planejada | — |

### Desenvolvimento (2/6 prontas)

JSON, códigos, conversores e utilitários técnicos.

| ID | Nome | Slug | Problema resolvido | Entrada | Saída | Exporta | Plano | Processa | Situação | Unificação |
|---|---|---|---|---|---|---|---|---|---|---|
| F025 | JSON: validar e formatar | `json` | Achar rapidamente onde o JSON quebrou e deixá-lo legível. | Texto JSON colado ou arquivo. | JSON formatado ou minificado, com estatísticas de chaves e profundidade. | copiar, baixar | gratuito | navegador | **pronta** | unifica 3 |
| F026 | Base64: codificar e decodificar | `base64` | Converter dados para Base64 sem quebrar acentos. | Texto ou arquivo. | Texto convertido pronto para copiar ou baixar. | copiar, baixar | gratuito | navegador | **pronta** | — |
| F037 | Gerador de identificadores | `uuid` | Criar identificadores únicos sem repetição. | Formato e quantidade. | Lista de identificadores. | copiar, baixar | gratuito | navegador | planejada | — |
| F038 | Testador de expressão regular | `regex` | Ajustar uma expressão regular vendo o efeito em tempo real. | Expressão, sinalizadores e texto de teste. | Correspondências destacadas, grupos capturados e resultado da substituição. | copiar | gratuito | navegador | planejada | — |
| F039 | Conversor de timestamp | `timestamp` | Ler uma data que veio como número num log ou API. | Timestamp ou data. | Data legível, ISO e timestamp. | copiar | gratuito | navegador | planejada | — |
| F040 | Codificador de URL e HTML | `url-e-codificacao` | Montar ou ler URLs com acentos e caracteres especiais. | Texto ou URL. | Texto convertido e a lista de parâmetros da URL. | copiar | gratuito | navegador | planejada | — |

### Senhas e segurança (2/3 prontas)

Gerar segredos, validar documentos e conferir dados.

| ID | Nome | Slug | Problema resolvido | Entrada | Saída | Exporta | Plano | Processa | Situação | Unificação |
|---|---|---|---|---|---|---|---|---|---|---|
| F027 | Gerador de senhas | `gerador-de-senhas` | Criar segredos fortes sem inventar padrões previsíveis. | Tamanho, conjuntos de caracteres e quantidade. | Senhas geradas, entropia em bits e tempo estimado de quebra. | copiar | gratuito | navegador | **pronta** | unifica 3 |
| F028 | Validador de CPF e CNPJ | `validador-cpf-cnpj` | Saber se um documento foi digitado errado antes de usar no cadastro. | CPF ou CNPJ, com ou sem pontuação. | Válido ou inválido, com o número formatado e o motivo da recusa. | copiar | gratuito | navegador | **pronta** | unifica 2 |
| F036 | Gerador de hash | `hash` | Conferir se um arquivo baixado é igual ao original. | Texto ou arquivo. | Hash em hexadecimal, com comparação contra um valor esperado. | copiar | gratuito | navegador | planejada | — |

### RH e trabalho (0/9 prontas)

Jornada, férias, currículo, escala e avaliação.

| ID | Nome | Slug | Problema resolvido | Entrada | Saída | Exporta | Plano | Processa | Situação | Unificação |
|---|---|---|---|---|---|---|---|---|---|---|
| F085 | Cálculo de férias | `ferias` | Conferir se o valor das férias recebido está correto. | Salário, dias de férias e se vai vender parte delas (abono). | Valor das férias, um terço constitucional e valor do abono. | copiar | gratuito | navegador | planejada | — |
| F086 | Estimativa de rescisão | `rescisao-estimada` | Ter uma ideia do valor da rescisão antes de receber o cálculo oficial. | Salário, tempo de casa, tipo de desligamento e saldo de férias. | Estimativa detalhada por verba, com aviso de que o valor oficial cabe ao RH. | copiar, pdf | gratuito | navegador | planejada | — |
| F087 | Salário líquido estimado | `salario-liquido-estimado` | Saber quanto cai na conta antes de fechar a proposta de emprego. | Salário bruto, dependentes e outros descontos. | Salário líquido estimado e o detalhamento dos descontos. | copiar | gratuito | navegador | planejada | — |
| F088 | Escala de trabalho | `escala-de-trabalho` | Organizar quem trabalha em cada dia sem esquecer ninguém nem deixar buraco. | Equipe, padrão de escala e período. | Escala do período por pessoa e por dia. | xlsx, pdf | gratuito | navegador | planejada | — |
| F089 | Avaliação de desempenho | `avaliacao-de-desempenho` | Avaliar a equipe de forma organizada em vez de uma conversa solta. | Competências avaliadas, notas e comentários. | Avaliação preenchida em PDF, com média por competência. | pdf | gratuito | navegador | planejada | — |
| F090 | Descrição de vaga | `descricao-de-vaga` | Publicar uma vaga completa sem esquecer nenhuma seção importante. | Cargo, responsabilidades, requisitos, benefícios e forma de candidatura. | Texto da vaga pronto para publicar. | copiar, pdf | gratuito | navegador | planejada | — |
| F091 | Roteiro de entrevista | `roteiro-de-entrevista` | Conduzir entrevistas parecidas para poder comparar os candidatos depois. | Cargo e competências a avaliar. | Roteiro de entrevista em PDF, com espaço para anotar as respostas. | pdf, imprimir | gratuito | navegador | planejada | — |
| F092 | Plano de onboarding | `plano-de-onboarding` | Receber um novo funcionário sem improvisar o primeiro dia. | Cargo, data de início e as etapas de integração. | Plano de onboarding em PDF ou planilha. | pdf, xlsx | gratuito | navegador | planejada | — |
| F093 | Gerador de organograma | `organograma` | Visualizar quem responde para quem sem desenhar no papel. | Cargos e a quem cada um responde. | Organograma em imagem e PDF. | png, pdf | gratuito | navegador | planejada | — |

### Estoque e logística (0/10 prontas)

Estoque, reposição, frete, cubagem e conferência.

| ID | Nome | Slug | Problema resolvido | Entrada | Saída | Exporta | Plano | Processa | Situação | Unificação |
|---|---|---|---|---|---|---|---|---|---|---|
| F094 | Estoque mínimo e de segurança | `estoque-minimo` | Saber a partir de quantas unidades é hora de repor, sem faltar nem sobrar. | Consumo médio, prazo de reposição e variação da demanda. | Estoque mínimo, estoque de segurança e ponto de atenção. | copiar, xlsx | gratuito | navegador | planejada | — |
| F095 | Ponto de reposição | `ponto-de-reposicao` | Saber a hora certa de repor sem esperar o produto acabar. | Consumo médio diário, prazo de entrega do fornecedor e estoque de segurança. | Ponto de reposição em unidades. | copiar | gratuito | navegador | planejada | — |
| F096 | Giro de estoque | `giro-de-estoque` | Saber se o dinheiro parado em estoque está girando rápido o suficiente. | Custo das vendas do período e estoque médio. | Giro de estoque no período e dias médios de estoque. | copiar | gratuito | navegador | planejada | — |
| F097 | Curva ABC de produtos | `curva-abc` | Descobrir quais produtos merecem mais atenção no estoque e nas compras. | Lista de produtos com valor ou quantidade vendida. | Lista classificada em A, B e C, com o percentual acumulado. | xlsx, csv | gratuito | navegador | planejada | — |
| F098 | Cálculo de cubagem | `cubagem` | Saber quanto espaço uma carga vai ocupar no veículo ou contêiner. | Comprimento, largura, altura e quantidade de cada volume. | Cubagem total em metros cúbicos. | copiar | gratuito | navegador | planejada | — |
| F099 | Peso volumétrico | `peso-volumetrico` | Entender por que a transportadora cobrou pelo peso cubado e não pelo peso real. | Medidas do volume, peso real e fator de cubagem da transportadora. | Peso volumétrico, peso real e o peso considerado para cobrança. | copiar | gratuito | navegador | planejada | — |
| F100 | Romaneio de carga | `romaneio` | Documentar o que está sendo enviado numa carga com vários volumes. | Volumes, conteúdo, peso de cada um e destinatário. | Romaneio em PDF pronto para acompanhar a carga. | pdf, xlsx | gratuito | navegador | planejada | — |
| F101 | Etiqueta de expedição | `etiqueta-de-expedicao` | Identificar cada volume de uma expedição com informação legível. | Dados do remetente, do destinatário e a numeração dos volumes. | Etiquetas em PDF, uma por volume, prontas para imprimir e colar. | pdf, imprimir | gratuito | navegador | planejada | — |
| F102 | Conferência de pedido | `conferencia-de-pedido` | Evitar que um pedido saia errado da separação. | Lista do pedido e os itens conferidos na separação. | Lista de itens conferidos, faltantes e excedentes. | csv, copiar | gratuito | navegador | planejada | — |
| F103 | Calculadora de frete | `calculadora-de-frete` | Comparar propostas de frete diferentes antes de fechar com uma transportadora. | Peso, medidas, distância e a tabela de cada transportadora. | Valor estimado por transportadora e a mais barata. | copiar, xlsx | gratuito | navegador | planejada | — |

### Marketing (0/7 prontas)

Campanha, métricas, UTM e materiais de conteúdo.

| ID | Nome | Slug | Problema resolvido | Entrada | Saída | Exporta | Plano | Processa | Situação | Unificação |
|---|---|---|---|---|---|---|---|---|---|---|
| F014 | ROI, ROAS, CAC e LTV | `roi-e-metricas` | Saber se a campanha ou o investimento realmente se paga. | Investimento, receita, número de clientes e ticket médio. | ROI, ROAS, CAC, LTV e relação LTV/CAC. | copiar | gratuito | navegador | planejada | — |
| F041 | Link de WhatsApp | `gerador-de-link-whatsapp` | Levar o cliente direto para a conversa já com a mensagem escrita. | Número com DDI e DDD e a mensagem. | Link pronto e QR Code. | copiar, baixar | gratuito | navegador | planejada | — |
| F042 | Montador e leitor de UTM | `utm` | Marcar campanhas sem errar o padrão dos parâmetros. | URL base e os campos de campanha. | URL final e tabela de parâmetros. | copiar | gratuito | navegador | planejada | — |
| F081 | Calendário editorial | `calendario-editorial` | Planejar o conteúdo do mês sem perder o fio em uma planilha solta. | Datas, temas, rede social e status de cada post. | Calendário do mês, para exportar ou imprimir. | xlsx, pdf | gratuito | navegador | planejada | — |
| F082 | Gerador de títulos | `gerador-de-titulos` | Testar várias formas de chamar a atenção sem travar na primeira ideia. | Assunto, público e objetivo do título. | Lista de títulos sugeridos para escolher e ajustar. | copiar | gratuito | navegador | planejada | — |
| F083 | Gerador de descrição de produto | `gerador-de-descricao-de-produto` | Escrever a descrição do produto para o anúncio ou a loja sem enrolar. | Nome do produto, características, benefícios e tom desejado. | Descrição pronta para copiar. | copiar | gratuito | navegador | planejada | — |
| F084 | Briefing criativo | `briefing-criativo` | Passar um pedido de criação sem esquecer informação importante. | Objetivo, público-alvo, tom de voz, prazo e referências. | Briefing em PDF pronto para enviar ao criador ou à equipe. | pdf, copiar | gratuito | navegador | planejada | — |

### Produtividade (1/12 prontas)

Tarefas, reuniões, planejamento e acompanhamento.

| ID | Nome | Slug | Problema resolvido | Entrada | Saída | Exporta | Plano | Processa | Situação | Unificação |
|---|---|---|---|---|---|---|---|---|---|---|
| F043 | Cronômetro e temporizador | `cronometro` | Marcar tempo sem depender do celular ao lado. | Tempo ou ciclos. | Tempo decorrido, voltas e aviso ao terminar. | copiar | gratuito | navegador | planejada | unifica 3 |
| F044 | Sorteio | `sorteio` | Fazer um sorteio justo e verificável na frente de todo mundo. | Faixa de números ou lista de nomes e a quantidade a sortear. | Resultado sorteado, ordem completa e registro do sorteio. | copiar | gratuito | navegador | **pronta** | unifica 4 |
| F104 | Lista de tarefas | `lista-de-tarefas` | Ter uma lista de tarefas simples sem instalar um aplicativo. | Tarefas, prioridade e prazo de cada uma. | Lista organizada, salva no aparelho. | copiar, json | gratuito | navegador | planejada | — |
| F105 | Quadro Kanban | `quadro-kanban` | Ver o andamento de várias tarefas de um jeito visual. | Tarefas e a coluna de cada uma. | Quadro Kanban salvo, exportável em imagem. | png, json | gratuito | navegador | planejada | — |
| F106 | Matriz de Eisenhower | `matriz-eisenhower` | Decidir o que fazer primeiro quando tudo parece urgente. | Lista de tarefas. | Matriz com as tarefas distribuídas nos quatro quadrantes. | png, pdf | gratuito | navegador | planejada | — |
| F107 | Plano de ação 5W2H | `matriz-5w2h` | Planejar uma ação sem esquecer nenhuma pergunta importante. | Respostas para cada uma das sete perguntas. | Plano de ação em PDF ou planilha. | pdf, xlsx | gratuito | navegador | planejada | — |
| F108 | Plano de ação com responsáveis | `plano-de-acao` | Transformar uma reunião de decisões em ações com dono e prazo. | Ações, responsável, prazo e status de cada uma. | Plano de ação em planilha ou PDF. | xlsx, pdf | gratuito | navegador | planejada | — |
| F109 | Ata de reunião | `ata-de-reuniao` | Documentar o que foi decidido numa reunião sem perder detalhes depois. | Data, presentes, pauta, decisões e ações combinadas. | Ata em PDF pronta para compartilhar com os participantes. | pdf, copiar | gratuito | navegador | planejada | — |
| F110 | Pauta de reunião | `pauta-de-reuniao` | Fazer uma reunião não passar do tempo por falta de roteiro. | Assuntos, responsável e tempo estimado de cada um. | Pauta em PDF com o tempo total da reunião. | pdf, imprimir | gratuito | navegador | planejada | — |
| F111 | Cronograma de projeto | `cronograma-de-projeto` | Ver as etapas do projeto e os prazos de cada uma num só lugar. | Etapas, data de início, duração e responsável. | Cronograma visual e em planilha. | xlsx, pdf | gratuito | navegador | planejada | — |
| F112 | Matriz de risco | `matriz-de-risco` | Priorizar quais riscos do projeto merecem atenção primeiro. | Riscos, probabilidade e impacto de cada um. | Matriz de risco visual e lista ordenada por severidade. | png, xlsx | gratuito | navegador | planejada | — |
| F113 | Matriz RACI | `matriz-raci` | Acabar com a confusão de quem faz o quê num projeto com várias pessoas. | Atividades e o papel de cada pessoa em cada uma. | Matriz RACI em planilha ou PDF. | xlsx, pdf | gratuito | navegador | planejada | — |

### Estudos (0/15 prontas)

Atividades, treino, revisão e material para imprimir.

| ID | Nome | Slug | Problema resolvido | Entrada | Saída | Exporta | Plano | Processa | Situação | Unificação |
|---|---|---|---|---|---|---|---|---|---|---|
| F118 | Quiz de múltipla escolha | `quiz-de-multipla-escolha` | Criar uma prova ou atividade de múltipla escolha sem formatar do zero. | Perguntas, alternativas e a resposta certa de cada uma. | Quiz em PDF com gabarito à parte. | pdf, imprimir | gratuito | navegador | planejada | — |
| F119 | Flashcards | `flashcards` | Ter um material de memorização sem desenhar cartão por cartão. | Pares de pergunta e resposta. | PDF de frente e verso dos flashcards. | pdf, imprimir | gratuito | navegador | planejada | — |
| F120 | Plano de estudos | `plano-de-estudos` | Organizar o tempo de estudo da semana sem virar uma bagunça de post-it. | Disciplinas, minutos por sessão e dias disponíveis. | Grade semanal em PDF, com total de minutos por dia. | pdf, imprimir | gratuito | navegador | planejada | — |
| F121 | Modelo de resumo esquemático | `resumo-esquematico` | Fazer um resumo que ajuda a revisar depois, não só copiar o texto. | Tema, tópicos principais, palavras-chave e perguntas de revisão. | Resumo em PDF pronto para revisar. | pdf, imprimir | gratuito | navegador | planejada | — |
| F122 | Montador de simulado | `simulado` | Treinar para uma prova com questões próprias e ver a nota na hora. | Banco de questões com alternativas e resposta certa. | Simulado em PDF e nota do gabarito preenchido. | pdf, copiar | gratuito | navegador | planejada | — |
| F123 | Gerador de certificado | `certificado` | Emitir certificados para uma turma sem editar um por um no design. | Nome do curso, carga horária, data e lista de participantes. | Certificados em PDF, um por participante. | pdf | plus | navegador | planejada | — |
| F124 | Tabuada para imprimir | `tabuada` | Ter folhas de treino de tabuada prontas sem montar tabela no editor. | Fatores da tabuada e se a ordem é sequencial ou embaralhada. | Folha de tabuada em PDF com gabarito. | pdf, imprimir | gratuito | navegador | planejada | — |
| F125 | Caça-palavras | `caca-palavras` | Criar uma atividade de caça-palavras personalizada para a turma. | Lista de palavras, direções permitidas e tamanho da grade. | Caça-palavras em PDF com gabarito à parte. | pdf, imprimir | gratuito | navegador | planejada | — |
| F126 | Folha de caligrafia | `caligrafia` | Treinar a letra de um aluno com o texto certo, não um texto genérico pronto. | Texto a treinar e o tipo de linha-guia. | Folha de caligrafia em PDF pronta para imprimir. | pdf, imprimir | gratuito | navegador | planejada | — |
| F127 | Papel quadriculado para imprimir | `papel-quadriculado` | Ter papel quadriculado exato sem depender de folha impressa errada de tamanho. | Tamanho da quadrícula em milímetros e margens. | PDF de papel quadriculado pronto para imprimir. | pdf, imprimir | gratuito | navegador | planejada | — |
| F128 | Bingo de números | `bingo-de-numeros` | Ter cartelas de bingo prontas para uma atividade em sala sem repetir números. | Quantidade de cartelas e a faixa de números. | Cartelas em PDF e lista de números para sortear. | pdf, imprimir | gratuito | navegador | planejada | — |
| F129 | Folha de operações matemáticas | `operacoes-matematicas` | Ter uma folha de exercícios de conta nova a cada treino, sem repetir sempre a mesma. | Operação, faixa dos números e quantidade de contas. | Folha de exercícios em PDF com gabarito à parte. | pdf, imprimir | gratuito | navegador | planejada | — |
| F130 | Montador de mapa mental | `mapa-mental` | Organizar ideias de um jeito visual em vez de uma lista de tópicos. | Tema central e os ramos com seus subtópicos. | Mapa mental em imagem e PDF. | png, pdf | gratuito | navegador | planejada | — |
| F131 | Linha do tempo | `linha-do-tempo` | Visualizar a ordem e a distância entre fatos históricos ou etapas de um tema. | Eventos com data e descrição. | Linha do tempo em imagem e PDF. | png, pdf | gratuito | navegador | planejada | — |
| F132 | Rotina de revisão espaçada | `rotina-de-revisao` | Saber quando revisar um assunto para não esquecer o que já estudou. | Data de estudo do conteúdo e os intervalos de revisão desejados. | Datas de revisão sugeridas, para copiar ou exportar. | copiar, csv | gratuito | navegador | planejada | — |

### Ofício, casa e obra (9/18 prontas)

Produção artesanal, reforma, festas e embalagens.

| ID | Nome | Slug | Problema resolvido | Entrada | Saída | Exporta | Plano | Processa | Situação | Unificação |
|---|---|---|---|---|---|---|---|---|---|---|
| F133 | Custo de receita | `custo-de-receita` | Saber quanto custa realmente produzir cada unidade antes de precificar. | Ingredientes, quantidade usada, preço de compra e rendimento da receita. | Custo total da receita e custo por unidade produzida. | copiar, pdf | gratuito | navegador | **pronta** | — |
| F134 | Ajuste de quantidade e rendimento da receita | `ajuste-de-receita` | Aumentar ou diminuir uma receita e ainda descontar o que se perde na produção. | Receita original, nova quantidade desejada e percentual de perda. | Receita reescalada e número real de unidades aproveitáveis. | copiar, pdf | gratuito | navegador | planejada | unifica 2 |
| F135 | Ficha técnica de produto | `ficha-tecnica` | Padronizar a produção para sair igual toda vez, mesmo com outra pessoa fazendo. | Ingredientes, quantidades, modo de preparo e informações de custo. | Ficha técnica em PDF pronta para imprimir e guardar. | pdf, imprimir | gratuito | navegador | planejada | — |
| F136 | Custo de material artesanal | `custo-de-material-artesanal` | Saber quanto do rolo de linha, do metro de tecido ou do pacote de miçanga foi gasto numa peça. | Materiais, quantidade do pacote, preço do pacote e quanto foi usado na peça. | Custo de material por peça, pronto para levar à precificação. | copiar, pdf | gratuito | navegador | planejada | — |
| F137 | Valor da hora de trabalho | `valor-da-hora` | Descobrir quanto vale a própria hora antes de precificar uma peça ou serviço. | Renda mensal desejada, despesas fixas e horas de trabalho disponíveis por mês. | Valor da hora de trabalho, para usar na precificação. | copiar | gratuito | navegador | **pronta** | — |
| F138 | Calculadora de tinta | `calculadora-de-tinta` | Comprar a quantidade certa de tinta e escolher a embalagem que sai mais barata. | Área a pintar, número de demãos, rendimento do rótulo e preço das embalagens disponíveis. | Litros necessários, embalagens a comprar e a opção mais barata. | copiar, pdf | gratuito | navegador | **pronta** | unifica 2 |
| F139 | Piso por caixa | `piso-por-caixa` | Comprar piso sem faltar nem sobrar caixa demais. | Área do ambiente, cobertura de cada caixa e margem de recorte. | Número de caixas a comprar e a área total coberta. | copiar | gratuito | navegador | **pronta** | — |
| F140 | Quantidade de rodapé | `quantidade-de-rodape` | Comprar rodapé sem sobra grande nem falta na hora de instalar. | Lados do cômodo, vãos de porta e percentual de perda. | Metros lineares e número de barras a comprar. | copiar | gratuito | navegador | **pronta** | — |
| F141 | Papel de parede | `papel-de-parede` | Comprar rolos de papel de parede sem sobrar estampa cortada errada. | Medidas da parede, largura do rolo e repetição da estampa. | Número de rolos a comprar e faixas por rolo. | copiar | gratuito | navegador | **pronta** | — |
| F142 | Área e quantidade de rejunte | `area-de-rejunte` | Comprar rejunte sem saber quantos quilos o serviço vai consumir. | Área revestida, medidas da peça, largura da junta e densidade do rejunte. | Volume e massa de rejunte estimados. | copiar | gratuito | navegador | **pronta** | — |
| F143 | Área de paredes e tetos | `area-de-paredes` | Ter a área certa de um ambiente para calcular tinta, papel ou revestimento. | Medidas dos cômodos e das aberturas a descontar. | Área total, por cômodo e por superfície. | copiar, xlsx | gratuito | navegador | **pronta** | — |
| F144 | Molde de caixa | `molde-de-caixa` | Ter o molde de uma caixa no tamanho exato sem desenhar planificação na mão. | Medidas internas da caixa e se é com tampa separada. | Molde em PDF em tamanho real e em SVG. | pdf, svg | gratuito | navegador | planejada | unifica 2 |
| F145 | Molde de envelope | `molde-de-envelope` | Fazer um envelope sob medida sem comprar um tamanho pronto que não serve. | Medidas do conteúdo e a folga desejada. | Molde em PDF em tamanho real. | pdf, svg | gratuito | navegador | planejada | — |
| F146 | Divisórias de caixa | `divisorias-de-caixa` | Separar o conteúdo de uma caixa em compartimentos sem calcular o encaixe na mão. | Medidas internas da caixa e o número de divisões por lado. | Molde das divisórias em PDF, pronto para cortar. | pdf, svg | gratuito | navegador | planejada | — |
| F147 | Calculadora de churrasco e almoço em grupo | `calculadora-de-churrasco` | Comprar comida e bebida para um churrasco ou almoço sem sobrar nem faltar. | Número de adultos e crianças, duração e nível de apetite. | Lista de carnes, acompanhamentos e bebidas com a quantidade de cada um. | copiar, pdf | gratuito | navegador | **pronta** | unifica 2 |
| F148 | Planejador de festa infantil | `festa-infantil` | Calcular a quantidade de comida de uma festa infantil sem exagerar no pedido. | Número de convidados, duração e opção vegetariana. | Lista de quantidades de salgados, doces, bolo e bebidas. | copiar, pdf | gratuito | navegador | planejada | — |
| F149 | Lista de convidados | `lista-de-convidados` | Saber quantas pessoas confirmaram presença sem procurar em mensagens espalhadas. | Nomes dos convidados e o status de confirmação de cada um. | Contagem de confirmados, pendentes e recusados, e a lista completa. | csv, copiar | gratuito | navegador | planejada | — |
| F150 | Cronograma do evento | `cronograma-de-evento` | Saber a que horas começar cada etapa para tudo ficar pronto na hora certa. | Horário do evento e a duração de cada etapa de preparação. | Cronograma com o horário de início de cada etapa. | pdf, imprimir | gratuito | navegador | planejada | — |
