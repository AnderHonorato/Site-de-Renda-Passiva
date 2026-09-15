# Catálogo GPT — 150 ferramentas

Extraído das definições do portal em 15/09/2026. Títulos e metodologias refletem o código encontrado; esta lista não comprova testes ou aprovação. Revisão final em andamento.

Origem: portal/scripts/catalogo.js, portal/scripts/categorias.js e módulos de ferramentas.

## 1. Confeitaria — 10 ferramentas

### Custo da receita

Identificador: custo-da-receita

Some ingredientes, embalagem e despesas por lote.

**Metodologia:** Ingredientes: nome; quantidade consumida; quantidade da embalagem; preço da embalagem. Quantidades na mesma unidade. Custo por unidade = total / rendimento.

### Preço de venda

Identificador: preco-de-venda

Inclua margem sobre venda e taxas no preço do lote.

**Metodologia:** Preço = custo / (1 − margem − taxas). Percentuais sobre receita; não confundir margem com acréscimo.

### Ajuste de receitas

Identificador: ajuste-de-receitas

Redimensione cada ingrediente para outro rendimento.

**Metodologia:** Cada quantidade é multiplicada pelo rendimento desejado / original. Preserve a unidade indicada.

### Lista de compras da produção

Identificador: lista-de-compras-da-producao

Consolide ingredientes repetidos e compre pacotes inteiros.

**Metodologia:** Nome; necessidade; tamanho do pacote. Use mesma unidade e tamanho de pacote para o mesmo ingrediente. Nomes iguais são somados.

### Orçamento de doces

Identificador: orcamento-de-doces

Monte proposta com produtos, entrega e validade.

**Metodologia:** Nome; quantidade; preço unitário. A proposta exportada contém preços de venda, sem custos internos.

### Conversor de formas

Identificador: conversor-de-formas

Compare volumes de formas redondas ou retangulares.

**Metodologia:** Volume redondo = π × (diâmetro/2)² × altura. Retangular = comprimento × largura × altura. Não ajusta tempo ou temperatura de cocção.

### Rendimento com perdas

Identificador: rendimento-com-perdas

Estime aproveitamento e custo após perdas.

**Metodologia:** Unidades aproveitáveis = produção × (1 − perdas/100), arredondadas para baixo.

### Ficha técnica de receita

Identificador: ficha-tecnica-de-receita

Gere uma ficha imprimível com ingredientes e preparo.

**Metodologia:** Ingrediente; quantidade; unidade; custo consumido. Custo informado corresponde à quantidade usada, não ao pacote.

### Cronograma de fornadas

Identificador: cronograma-de-fornadas

Calcule quantas fornadas serão necessárias e o tempo total.

**Metodologia:** Fornadas = teto(unidades / capacidade). Tempo = pré-aquecimento + fornadas × duração; trocas entre fornadas somadas.

### Quantidade de cobertura

Identificador: quantidade-de-cobertura

Estime cobertura por área e consumo medido.

**Metodologia:** Área de bolo cilíndrico = topo πr² + lateral 2πrh. Consumo em gramas/cm² deve ser informado a partir de teste próprio.

## 2. Educação — 10 ferramentas

### Atividades matemáticas

Identificador: atividades-matematicas

Gere exercícios e folha separada de gabarito.

**Metodologia:** Operações com inteiros de 0 até o limite informado; subtrações nunca negativas. Gabarito em arquivo separado.

### Tabuada para imprimir

Identificador: tabuada-para-imprimir

Prepare treino de multiplicação com gabarito separado.

**Metodologia:** Multiplica o fator escolhido pelos inteiros de 1 até o limite.

### Caça-palavras

Identificador: caca-palavras

Gere uma grade com todas as palavras e gabarito.

**Metodologia:** Palavras normalizadas para A–Z, sem acentos. Inserção horizontal alternando direção garante todas as palavras sem colisões. Gabarito fornece linha, coluna e direção.

### Folhas de caligrafia

Identificador: folhas-de-caligrafia

Gere linhas de escrita com texto em português.

**Metodologia:** Folha A4 com três guias por linha; preserva acentos. Texto modelo limitado a 50 caracteres; trechos longos são divididos em linhas de até 30 caracteres para preservar o tamanho da escrita.

### Bingo de números

Identificador: bingo-de-numeros

Gere cartelas distintas e uma sequência de sorteio.

**Metodologia:** Cada cartela usa números sem repetição. Cartelas numeradas, uma por página SVG A4. Sorteio aleatório exportado separadamente.

### Papel quadriculado

Identificador: papel-quadriculado

Crie quadrículas em milímetros para impressão.

**Metodologia:** SVG A4 em unidades físicas. Imprimir em tamanho real, 100%, sem ajustar à página. Confira quadrado de calibração de 10 mm.

### Flashcards imprimíveis

Identificador: flashcards-imprimiveis

Monte cartões de estudo com frente e verso alinhados.

**Metodologia:** Pares pergunta; resposta. Até 8 por folha. Verso espelha as colunas para impressão frente e verso pela borda longa. Faça teste com uma folha antes.

### Planejador de estudos

Identificador: planejador-de-estudos

Distribua disciplinas em blocos com pausas.

**Metodologia:** Cada linha define matéria; minutos. Pausas são inseridas entre blocos, não após o último. Horários avançam quando atravessam meia-noite.

### Gerador de ditado

Identificador: gerador-de-ditado

Prepare folha do aluno e lista separada do professor.

**Metodologia:** Uma palavra ou frase por linha, até 20 itens. O aluno recebe linhas numeradas em branco e o professor recebe a sequência.

### Frações para colorir

Identificador: fracionario-visual

Crie círculos divididos em partes iguais para atividades.

**Metodologia:** Cada linha informa numerador/denominador. Até 8 frações, denominador até 12. Folha em branco e gabarito com setores pintados.

## 3. Artesanato — 10 ferramentas

### Preço de peça artesanal

Identificador: preco-de-peca-artesanal

Inclua materiais e horas de trabalho no preço.

**Metodologia:** Custo = materiais + horas × valor/hora + despesas. Preço = custo / (1 − margem/100).

### Valor da hora artesanal

Identificador: valor-da-hora-artesanal

Calcule valor por hora efetivamente produtiva.

**Metodologia:** Valor/hora = (meta de remuneração + custos fixos) / horas produtivas. Horas produtivas excluem pausas e tarefas não faturáveis.

### Custo do fio consumido

Identificador: custo-do-fio-consumido

Calcule a parcela do novelo utilizada.

**Metodologia:** Custo consumido = preço do novelo × consumo / peso total. O consumo pode exceder um novelo; a compra é arredondada para cima.

### Planejador de encomendas

Identificador: planejador-de-encomendas

Organize peças pela capacidade diária de trabalho.

**Metodologia:** Dias produtivos = teto(total de horas / capacidade diária). Considera dias corridos disponíveis, inclusive fim de semana. Primeiro dia conta como dia de trabalho.

### Orçamento artesanal

Identificador: orcamento-artesanal

Gere proposta com prazo, itens e entrega.

**Metodologia:** Subtotal = soma(quantidade × preço unitário). Entrega somada uma vez. Arquivo contém apenas valores de venda.

### Simulador de desconto artesanal

Identificador: simulador-de-desconto-artesanal

Veja quanto sobra após desconto e custo.

**Metodologia:** Preço descontado = preço × (1 − desconto/100). Contribuição = preço descontado − custo; pode ser negativa.

### Conversor de amostras de pontos

Identificador: conversor-de-amostras-de-pontos

Ajuste pontos à largura e ao múltiplo do padrão.

**Metodologia:** Pontos teóricos = pontos da amostra / largura da amostra × largura desejada. Arredonda ao múltiplo mais próximo, no mínimo um múltiplo.

### Controle de materiais local

Identificador: controle-de-materiais-local

Calcule saldos por material com entradas e consumo.

**Metodologia:** Material; saldo inicial; entradas; consumo; unidade. Saldo negativo é explicitado como falta. Registros ficam nas entradas locais do portal.

### Distribuidor de aumentos

Identificador: distribuidor-de-aumentos

Distribua aumentos uniformes em uma carreira.

**Metodologia:** Para passar de N a N+A pontos, cada aumento adiciona um ponto em uma posição base. Espaçamento distribuído por partes inteiras; no máximo um aumento por ponto base.

### Metragem de tecido

Identificador: metragem-de-tecido

Planeje cortes retangulares pela largura útil do tecido.

**Metodologia:** Compara orientação normal e girada, sem misturar orientações. Margens de costura somadas em cada lado. Não considera sentido de estampa, encolhimento ou defeitos.

## 4. Festas — 10 ferramentas

### Calculadora de churrasco

Identificador: calculadora-de-churrasco

Estime carnes conforme o consumo que você informar.

**Metodologia:** Consumo total = adultos × gramas por adulto + crianças × gramas por criança. Reserva opcional sobre o total. Porções são premissas editáveis.

### Planejador de festa infantil

Identificador: planejador-de-festa-infantil

Calcule alimentos e descartáveis pela lista de convidados.

**Metodologia:** Multiplica convidados pela quantidade informada de cada item; reserva sobre alimentos. Itens inteiros arredondados para cima.

### Quantidade para almoço

Identificador: quantidade-para-almoco

Planeje alimentos pelo peso cru por porção.

**Metodologia:** Itens: alimento; gramas cruas por pessoa. Soma reserva sobre o peso cru, sem aplicar novamente fator de cozimento.

### Calculadora de bebidas

Identificador: calculadora-de-bebidas

Planeje bebidas por grupos declarados de consumidores.

**Metodologia:** Cada linha: bebida; consumidores; mililitros por consumidor. Bebidas alcoólicas só podem ser destinadas a adultos declarados. Consumidores podem aparecer em mais de uma linha.

### Orçamento de festa

Identificador: orcamento-de-festa

Some produtos e serviços com reserva.

**Metodologia:** Cada item: descrição; quantidade; custo unitário. Reserva é percentual do subtotal.

### Divisor de despesas

Identificador: divisor-de-despesas

Rateie o total em parcelas que fecham até o centavo.

**Metodologia:** Total arredondado para centavos e dividido igualmente. Centavos restantes são distribuídos entre os primeiros participantes.

### Cronograma de evento

Identificador: cronograma-de-evento

Organize tarefas para terminar no início da festa.

**Metodologia:** Tarefas executadas em sequência na ordem fornecida. O horário inicial é calculado subtraindo a duração total do evento.

### Lista de convidados local

Identificador: lista-de-convidados-local

Conte confirmações e registre necessidades da organização.

**Metodologia:** Cada linha: nome; status confirmado, pendente ou recusado; observação. Use hífen quando não houver observação. Nomes duplicados são apontados.

### Distribuição de mesas

Identificador: distribuicao-de-mesas

Calcule mesas, cadeiras e lugares livres.

**Metodologia:** Mesas = teto(convidados / lugares por mesa). Mesas homogêneas; não considera compatibilidade entre convidados.

### Planejador de gelo

Identificador: planejador-de-gelo

Estime sacos de gelo por consumo informado.

**Metodologia:** Gelo = pessoas × kg por pessoa + gelo adicional para resfriamento. Compra arredondada por peso do saco; premissas variam por clima e duração.

## 5. Reforma — 10 ferramentas

### Área de paredes

Identificador: area-de-paredes

Some superfícies e desconte portas e janelas.

**Metodologia:** Cada parede: nome; largura; altura. Área líquida = soma das áreas − aberturas totais. Não considera pilares ou curvas.

### Quantidade de tinta

Identificador: quantidade-de-tinta

Calcule litros e embalagens pelo rendimento declarado.

**Metodologia:** Litros = área × demãos / rendimento por litro por demão. Reserva adicionada depois. Confirme se o rótulo informa rendimento por demão ou acabado.

### Piso por caixa

Identificador: piso-por-caixa

Arredonde revestimentos pela cobertura de cada caixa.

**Metodologia:** Área com recortes = área × (1 + perda/100). Caixas = teto(área com recortes / cobertura por caixa).

### Quantidade de rodapé

Identificador: quantidade-de-rodape

Converta perímetro útil em barras inteiras.

**Metodologia:** Comprimento = (perímetro − portas) × (1 + perda/100). Compra pela soma de comprimentos; não otimiza cortes de cada parede.

### Papel de parede

Identificador: papel-de-parede

Calcule faixas e rolos com encaixe de estampa.

**Metodologia:** Faixas = teto(largura da parede / largura do rolo). Corte por faixa = altura + margem de corte, arredondado para repetição da estampa quando > 0. Faixas por rolo = piso(comprimento / corte).

### Orçamento de acabamento

Identificador: orcamento-de-acabamento

Totalize materiais, serviços e reserva.

**Metodologia:** Materiais e serviços podem ter quantidades fracionárias. Cada linha: item; quantidade; preço unitário.

### Área de rejunte estimada

Identificador: area-de-rejunte-estimada

Estime volume de juntas e massa pela densidade informada.

**Metodologia:** Modelo geométrico periódico: fração de junta = 1 − (a×b)/((a+j)×(b+j)). Volume = área × fração × profundidade. Massa usa densidade informada em kg/L. Dimensões a,b,j e profundidade em mm; não inclui juntas perimetrais.

### Comparador de embalagens de tinta

Identificador: comparador-de-embalagens-de-tinta

Compare preço por litro e por área de uma demão.

**Metodologia:** Cada embalagem: nome; volume L; preço R$; rendimento m²/L por demão. Custo de cobertura = preço / (volume × rendimento). Rendimento e qualidade precisam ser comparáveis.

### Argamassa por saco

Identificador: argamassa-por-saco

Estime sacos pelo consumo indicado pelo fabricante.

**Metodologia:** Massa = área × consumo kg/m² × (1 + reserva/100). Sacos inteiros arredondados para cima. Consumo depende de desempenadeira, base e revestimento.

### Escala de planta

Identificador: escala-de-planta

Converta medidas entre desenho e dimensão real.

**Metodologia:** Escala 1:N. Desenho em cm = real em metros × 100 / N. Conversão inversa = desenho em cm × N / 100.

## 6. Embalagens — 10 ferramentas

### Caixa retangular

Identificador: caixa-retangular

Crie bandeja retangular aberta com abas de colagem.

**Metodologia:** Dimensões internas nominais em mm para papel fino. Molde SVG em escala real; abas coladas formam quatro paredes.

### Caixa com tampa

Identificador: caixa-com-tampa

Gere base e tampa separadas com folga por lado.

**Metodologia:** Tampa interna = dimensão da base + 2 × folga. Folga não compensa automaticamente espessura ou tolerância de fabricação.

### Envelope personalizado

Identificador: envelope-personalizado

Monte envelope para um cartão com folga editável.

**Metodologia:** Área interna soma duas folgas às medidas do cartão. Abas laterais, inferior e superior dobram sobre o miolo.

### Etiquetas e tags

Identificador: etiquetas-e-tags

Distribua etiquetas em A4 com texto próprio.

**Metodologia:** Grade por divisão inteira da área útil A4, margem de 10 mm. Texto até 60 caracteres, quebrado em linhas.

### Cinta para embalagem

Identificador: cinta-para-embalagem

Gere faixa para envolver um perímetro informado.

**Metodologia:** Comprimento = perímetro + sobreposição. O perímetro pode ser medido na embalagem pronta.

### Divisórias de caixa

Identificador: divisorias-de-caixa

Gere tiras encaixáveis em grade com espessura declarada.

**Metodologia:** Ranhuras têm a espessura informada e metade da altura. Tiras paralelas ao comprimento usam ranhuras superiores; as outras inferiores.

### Saco de papel simples

Identificador: saco-de-papel-simples

Crie molde de saco sem alças com quatro painéis e fundo dobrável.

**Metodologia:** Painéis alternam largura e profundidade. Abas de fundo têm meia profundidade mais 3 mm de sobreposição. Não é embalagem estrutural.

### Aproveitamento de folha

Identificador: aproveitamento-de-folha

Compare duas orientações uniformes de corte retangular.

**Metodologia:** Divide a folha útil pelas peças mais espaçamento. Não otimiza arranjos mistos nem perda de lâmina adicional.

### Cone de papel

Identificador: cone-de-papel

Gere setor circular para montar um cone aberto.

**Metodologia:** Geratriz = raiz(raio² + altura²); ângulo do setor = 360 × raio/geratriz. Aba extra angular para cola.

### Caixa triangular

Identificador: caixa-travesseiro

Monte embalagem de prisma triangular com abas.

**Metodologia:** Seção triangular equilátera; três painéis laterais e dois triângulos de fechamento. Para papel fino.

## 7. Texto e escrita — 10 ferramentas

### Contador de palavras

Identificador: contador-de-palavras

Conte palavras, caracteres e espaços do texto.

**Metodologia:** Palavras são grupos de letras ou números, com apóstrofos e hífens internos. Caracteres usam pontos de código Unicode; emojis compostos podem contar mais de um.

### Maiúsculas e minúsculas

Identificador: maiusculas-e-minusculas

Transforme caixa de texto preservando os acentos.

**Metodologia:** Conversão Unicode em português. Título capitaliza cada palavra, incluindo preposições.

### Limpar espaços

Identificador: limpar-espacos

Remova espaços repetidos com opção de preservar parágrafos.

**Metodologia:** Preservar parágrafos mantém quebras de linha; espaços horizontais consecutivos viram um.

### Ordenar linhas

Identificador: ordenar-linhas

Ordene uma lista em português, com números em ordem natural.

**Metodologia:** Intl.Collator pt-BR, opção numeric. Linhas vazias são removidas.

### Remover linhas duplicadas

Identificador: remover-linhas-duplicadas

Elimine repetições preservando a primeira ocorrência.

**Metodologia:** Normalização opcional ignora maiúsculas e espaços nas extremidades; acentos permanecem distintos.

### Comparar textos

Identificador: comparar-textos

Encontre trechos removidos e acrescentados entre duas versões.

**Metodologia:** Comparação pela maior subsequência comum de palavras e espaços. Limite de 1.000 tokens por versão; pontuação é comparada como parte do token.

### Tempo de leitura

Identificador: tempo-de-leitura

Estime minutos de leitura na velocidade informada.

**Metodologia:** Número de palavras dividido por palavras por minuto; leitura real varia por pessoa e conteúdo.

### Texto para lista numerada

Identificador: texto-para-lista-numerada

Transforme uma linha por item em uma lista numerada.

**Metodologia:** Linhas em branco são ignoradas. Numeração consecutiva a partir do início escolhido.

### Localizar e substituir

Identificador: localizar-e-substituir

Substitua ocorrências literais sem expressões regulares.

**Metodologia:** Substituição sensível a maiúsculas; substituto pode ficar vazio. Nenhum texto é executado.

### Frequência de palavras

Identificador: frequencia-de-palavras

Descubra as palavras mais frequentes do texto.

**Metodologia:** Agrupa sem distinguir caixa, preserva acentos e ordena por frequência decrescente.

## 8. Imagens — 10 ferramentas

### Redimensionar imagem

Identificador: redimensionar-imagem

Altere a largura preservando a proporção da foto.

**Metodologia:** Altura arredondada pela razão original. Limites de saída: 16 megapixels e 8.192 px por lado.

### Comprimir imagem

Identificador: comprimir-imagem

Exporte JPEG ou WebP com qualidade ajustável.

**Metodologia:** Reencoda em resolução original; resultado pode ser maior que o original. JPEG usa fundo branco para transparências.

### Converter formato de imagem

Identificador: converter-formato-de-imagem

Converta PNG, JPEG ou WebP localmente.

**Metodologia:** PNG preserva transparência; JPEG aplica fundo escolhido. Formatos não suportados na exportação são informados.

### Recortar imagem

Identificador: recortar-imagem

Recorte na proporção e posição escolhidas.

**Metodologia:** Mantém o maior retângulo da proporção pedida dentro da imagem. Posição 0 é esquerda/topo; 100 é direita/base.

### Girar e espelhar imagem

Identificador: girar-e-espelhar-imagem

Gire em ângulos retos ou espelhe sua imagem.

**Metodologia:** Espelhamento horizontal/vertical é aplicado antes da rotação horária.

### Marca-dágua pessoal

Identificador: marca-dagua-pessoal

Aplique um texto na posição escolhida.

**Metodologia:** Texto rasterizado sobre a imagem com opacidade editável. A marca visual não impede remoção ou cópia.

### Remover metadados de imagem

Identificador: remover-metadados-de-imagem

Crie JPEG reencodificado e verifique a presença de EXIF.

**Metodologia:** Desenha pixels em Canvas e exporta novo JPEG. Verifica marcador APP1 EXIF; não analisa dados visíveis da foto nem garante ausência de todo tipo de metadado.

### Paleta de cores de imagem

Identificador: paleta-de-cores-de-imagem

Extraia cores dominantes aproximadas da imagem.

**Metodologia:** Amostra até 160 × 160 pixels; ignora transparência inferior a 50% e agrupa canais em blocos de 32. Amostras são médias dos pixels em cada grupo.

### Imagem em tons de cinza

Identificador: imagem-em-tons-de-cinza

Converta uma foto para tons de cinza mantendo transparência.

**Metodologia:** Luminância aproximada sRGB: 0,2126 R + 0,7152 G + 0,0722 B aplicada aos canais codificados.

### Folha de contato de imagens

Identificador: folha-de-contato-de-imagens

Reúna miniaturas de várias fotos em uma imagem.

**Metodologia:** Até 24 imagens na ordem selecionada, encaixadas sem recorte em células numeradas de 320 × 260 pixels.

## 9. PDF e documentos — 10 ferramentas

### Juntar PDFs

Identificador: juntar-pdfs

Una PDFs na ordem em que os arquivos foram selecionados.

**Metodologia:** Copia páginas para um novo documento. Até 20 arquivos e 80 MB no total; formulários interativos e assinaturas podem não ser preservados.

### Separar páginas de PDF

Identificador: separar-paginas-de-pdf

Exporte as páginas ou intervalos escolhidos.

**Metodologia:** Seleção 2-4 exporta três páginas em um novo PDF. Intervalos inclusivos; sem duplicatas.

### Organizar páginas de PDF

Identificador: organizar-paginas-de-pdf

Reordene e exclua páginas com prévia do resultado.

**Metodologia:** Informe a nova ordem; páginas omitidas são excluídas. Prévia mostra até 12 páginas após organizar, sem alterar o download completo.

### Girar páginas de PDF

Identificador: girar-paginas-de-pdf

Gire somente as páginas escolhidas.

**Metodologia:** Acrescenta 90, 180 ou 270 graus à rotação atual; páginas não selecionadas permanecem iguais.

### Imagens para PDF

Identificador: imagens-para-pdf

Converta imagens em páginas A4 ajustadas à proporção.

**Metodologia:** Uma imagem por página, sem recortar. Margem em mm. Imagens são reencodificadas em JPEG sobre branco; até 30 arquivos e 100 MB total.

### PDF para imagens

Identificador: pdf-para-imagens

Exporte páginas selecionadas como arquivos PNG.

**Metodologia:** Rasteriza localmente em resolução escolhida. Até 20 páginas por operação, 16 megapixels por página e 40 megapixels no total.

### Numerar páginas de PDF

Identificador: numerar-paginas-de-pdf

Adicione numeração em posição e margem escolhidas.

**Metodologia:** Numeração sequencial começa no valor informado. Revise a prévia no leitor PDF para evitar cobrir conteúdo; considera coordenadas originais da página.

### Marca-dágua em PDF

Identificador: marca-dagua-em-pdf

Aplique texto central às páginas selecionadas.

**Metodologia:** Marca visual com fonte padrão Helvetica. Não oferece segurança criptográfica; alguns símbolos fora do alfabeto latino não são suportados.

### Informações do PDF

Identificador: informacoes-do-pdf

Confira páginas, tamanhos e propriedades do documento.

**Metodologia:** Lê metadados declarados no PDF, sem verificar autoria, autenticidade ou segurança.

### Extrair texto de PDF

Identificador: extrair-texto-de-pdf

Extraia texto pesquisável para um arquivo TXT.

**Metodologia:** Não faz OCR de digitalizações. Ordem de leitura depende da estrutura do PDF; colunas e tabelas podem exigir ajustes. Limite de 200 páginas e 2 milhões de caracteres.

## 10. Datas e tempo — 10 ferramentas

### Diferença entre datas

Identificador: diferenca-entre-datas

Conte dias civis entre duas datas.

**Metodologia:** Datas tratadas ao meio-dia UTC para evitar horário de verão. Exclui a data inicial; resultado negativo quando fim precede início.

### Somar dias a uma data

Identificador: somar-dias-a-data

Avance ou recue um número de dias civis.

**Metodologia:** Soma no calendário gregoriano; não aplica regras de prazos jurídicos.

### Dias úteis configuráveis

Identificador: dias-uteis-configuraveis

Conte dias de trabalho incluindo feriados e folgas informados.

**Metodologia:** Inclui as duas datas. Dias da semana: 0 domingo a 6 sábado. Limite de 100 anos; nenhum feriado é presumido.

### Conversor de tempo

Identificador: conversor-de-tempo

Converta horas, minutos e segundos.

**Metodologia:** Conversão exata: 1 hora = 60 minutos = 3.600 segundos.

### Somador de horas

Identificador: somador-de-horas

Some durações no formato horas:minutos.

**Metodologia:** Minutos entre 00 e 59; horas podem exceder 24. Durações não são horários do dia.

### Comparador de fusos

Identificador: comparador-de-fusos

Veja o mesmo instante em dois fusos IANA.

**Metodologia:** O instante deve incluir Z ou offset explícito. Regras de fuso vêm do navegador e podem depender da versão instalada.

### Idade no calendário

Identificador: idade-calendario

Calcule anos, meses e dias completos entre duas datas.

**Metodologia:** Anos e meses são completados pelo dia correspondente, limitado ao último dia do mês de destino. Não substitui regras legais.

### Número da semana ISO

Identificador: numero-da-semana

Descubra semana ISO e dia da semana de uma data.

**Metodologia:** ISO 8601: semana começa na segunda, semana 1 contém a primeira quinta-feira. O ano ISO pode diferir do ano civil.

### Cronômetro com voltas

Identificador: cronometro-com-voltas

Meça tarefas, pause e registre voltas.

**Metodologia:** Usa performance.now(), relógio monotônico. O valor exibido é recalculado pelo tempo decorrido, não pela contagem de intervalos. Estado temporário; recarregar a página reinicia.

### Temporizador de foco

Identificador: temporizador-de-foco

Alterne períodos de foco e pausa com duração própria.

**Metodologia:** De 1 a 180 minutos por etapa. O aviso é visual e a próxima etapa exige Iniciar. O navegador pode suspender atualizações em segundo plano; ao retornar, o tempo é recalculado.

## 11. Matemática e medidas — 10 ferramentas

### Porcentagem

Identificador: porcentagem

Calcule uma parte percentual de qualquer valor.

**Metodologia:** Parte = total × percentual / 100; valores negativos são permitidos.

### Variação percentual

Identificador: variacao-percentual

Compare o crescimento ou redução entre dois valores.

**Metodologia:** Variação = (final − inicial) / |inicial| × 100. Base inicial zero é indefinida; o módulo permite interpretar bases negativas.

### Regra de três

Identificador: regra-de-tres

Resolva proporções diretas e inversas.

**Metodologia:** Direta: x = b × c / a. Inversa: x = a × b / c. As grandezas precisam representar uma relação proporcional real.

### Média ponderada

Identificador: media-ponderada

Calcule notas ou médias com pesos personalizados.

**Metodologia:** Cada linha: valor; peso. Média = soma(valor × peso) / soma dos pesos. Pesos não negativos, com soma positiva.

### Conversor de unidades

Identificador: conversor-de-unidades

Converta comprimento, massa, volume, área e temperatura.

**Metodologia:** Fatores SI: comprimento em metros, massa em kg, volume em litros e área em m². Temperaturas usam deslocamento; grandezas incompatíveis e temperaturas abaixo do zero absoluto são rejeitadas.

### Área de figuras

Identificador: area-de-figuras

Calcule retângulos, triângulos, círculos e trapézios.

**Metodologia:** Todas as dimensões em metros. Retângulo b×h; triângulo b×h/2; círculo πr²; trapézio (B+b)×h/2.

### Volume geométrico

Identificador: volume-geometrico

Calcule o volume de caixas, cilindros, cones e esferas.

**Metodologia:** Dimensões em centímetros. Caixa a×b×h; cilindro πr²h; cone πr²h/3; esfera 4πr³/3. Cada 1.000 cm³ equivale a 1 litro.

### Frações e simplificação

Identificador: fracoes-e-simplificacao

Some, subtraia, multiplique e divida frações exatamente.

**Metodologia:** Numeradores e denominadores inteiros de até 12 dígitos. Operações com BigInt e redução pelo máximo divisor comum; denominador final sempre positivo.

### Equação de segundo grau

Identificador: equacao-segundo-grau

Encontre raízes reais ou complexas de uma equação quadrática.

**Metodologia:** Resolve ax² + bx + c = 0. Delta = b² − 4ac. Coeficiente a precisa ser diferente de zero; raízes reais usam fórmula estável contra cancelamento.

### Estatística descritiva

Identificador: estatistica-descritiva

Obtenha média, mediana, amplitude e desvio padrão.

**Metodologia:** Uma observação por linha. Desvio populacional divide a soma dos quadrados por n; amostral divide por n−1 e exige pelo menos duas observações.

## 12. Vendas e negócios — 10 ferramentas

### Preço com taxas de venda

Identificador: preco-com-taxas-de-venda

Inclua comissão, tarifa fixa e margem no preço.

**Metodologia:** Preço = (custo + tarifa fixa) / (1 − (comissão + margem)/100). Margem sobre receita; percentuais somados precisam ser menores que 100%.

### Comparador de preço unitário

Identificador: comparador-de-preco-unitario

Compare embalagens em uma mesma unidade-base.

**Metodologia:** Uma linha: nome; preço em reais; quantidade; unidade. Compatíveis: g/kg, ml/L ou un. Frete, qualidade e desperdício não entram na conta.

### Descontos sucessivos

Identificador: descontos-sucessivos

Aplique uma sequência de descontos sobre o saldo.

**Metodologia:** Cada desconto é aplicado ao preço restante. Desconto equivalente = 1 − produto(1 − desconto/100). Uma porcentagem por linha.

### Rateio de frete

Identificador: rateio-de-frete

Distribua frete por valor, peso ou quantidade.

**Metodologia:** Uma linha: item; base de rateio. Cotas proporcionais; centavos restantes são distribuídos pelos maiores resíduos, preservando o total.

### Meta de vendas

Identificador: meta-de-vendas

Calcule quantas vendas alcançam uma meta de contribuição.

**Metodologia:** Quantidade = teto(meta / contribuição unitária). A contribuição é o valor restante por venda após os custos variáveis declarados; sem previsão de demanda.

### Ponto de equilíbrio

Identificador: ponto-de-equilibrio

Encontre o volume que cobre os custos fixos.

**Metodologia:** Contribuição = preço − custo variável unitário. Equilíbrio em unidades = teto(fixos/contribuição). Preço precisa superar custo variável; custos informados pelo usuário.

### Orçamento de serviço

Identificador: orcamento-de-servico

Gere uma proposta exportável com horas, materiais e condições.

**Metodologia:** Total = horas × valor/hora + materiais + deslocamento. Condições são texto informado, sem cláusulas jurídicas automáticas.

### Controle de caixa local

Identificador: controle-de-caixa-local

Some movimentações e exporte um registro CSV local.

**Metodologia:** Cada linha: descrição; entrada ou saida; valor positivo. Saldo inicial + entradas − saídas. Não substitui escrituração contábil.

### Margem e markup

Identificador: margem-e-markup

Diferencie margem sobre venda e acréscimo sobre custo.

**Metodologia:** Lucro bruto = preço − custo. Margem = lucro/preço × 100; markup percentual = lucro/custo × 100; fator markup = preço/custo. Demais custos não entram.

### Ponto de reposição de estoque

Identificador: ponto-de-reposicao

Estime quando comprar e quanto falta para o estoque-alvo.

**Metodologia:** Ponto de reposição = consumo diário × prazo de entrega + estoque de segurança. Sugestão de compra = máximo(0, estoque-alvo − disponível − a receber). Premissas constantes, sem previsão automática.

## 13. Ferramentas digitais — 10 ferramentas

### Gerador de QR Code

Identificador: gerador-de-qr-code

Crie um QR local de texto ou endereço para baixar em SVG.

**Metodologia:** Codificação local com correção de erro M e margem de quatro módulos. Texto limitado a 1.500 bytes UTF-8. Verifique o código com o leitor antes de imprimir.

### Link de WhatsApp

Identificador: link-de-whatsapp

Monte um link com mensagem sem enviar automaticamente.

**Metodologia:** Número internacional com código do país (exemplo Brasil: 55), DDD e telefone. Remove espaços, parênteses e traços; valida de 8 a 15 dígitos, sem prometer existência da conta.

### Construtor de UTM

Identificador: construtor-de-utm

Adicione parâmetros de campanha preservando o endereço.

**Metodologia:** URL HTTP(S) válida. Origem, meio e campanha substituem parâmetros UTM de mesmo nome; conteúdo e termo opcionais. Demais parâmetros e fragmento são preservados.

### Formatador de JSON

Identificador: formatador-de-json

Valide e formate JSON sem executar código.

**Metodologia:** Validação sintática com JSON.parse. Recuo de 2 ou 4 espaços, ou saída compacta. Chaves duplicadas e números muito grandes seguem semântica JavaScript; não usar para preservar representação exata desses dados.

### Codificador de URL

Identificador: codificador-de-url

Codifique ou decodifique um componente de URL.

**Metodologia:** Usa encodeURIComponent/decodeURIComponent em UTF-8. Este recurso opera sobre componentes, não sobre o endereço completo. Sinal + permanece literal na decodificação.

### Gerador de senha

Identificador: gerador-de-senha

Gere uma senha aleatória apenas neste dispositivo.

**Metodologia:** crypto.getRandomValues com amostragem sem viés. Cada conjunto escolhido aparece ao menos uma vez. A senha é mostrada na tela e não deve ser salva no histórico do portal.

### Verificador de contraste

Identificador: verificador-de-contraste

Compare duas cores e os limiares de contraste WCAG.

**Metodologia:** Cores sRGB opacas. Razão = (luminância maior + 0,05)/(menor + 0,05). WCAG 2.x AA exige 4,5:1 em texto normal e 3:1 em texto grande; AAA exige 7:1 e 4,5:1. Não avalia outros critérios de acessibilidade.

### Gerador de hash de arquivo

Identificador: gerador-de-hash-de-arquivo

Calcule SHA-256, SHA-384 ou SHA-512 de um arquivo local.

**Metodologia:** Digest pela Web Crypto API sobre os bytes do arquivo, com limite de 50 MiB para memória. Hash auxilia na comparação de integridade; não comprova origem nem ausência de malware.

### Base64 de texto UTF-8

Identificador: base64-utf8

Converta texto Unicode em Base64 e restaure o original.

**Metodologia:** Codificação de bytes UTF-8. Base64 é uma representação reversível e não criptografia. Decodificação exige Base64 canônico com preenchimento e UTF-8 válido.

### Gerador de UUID

Identificador: gerador-de-uuid

Gere identificadores UUID versão 4 localmente.

**Metodologia:** 16 bytes obtidos com crypto.getRandomValues, com bits de versão 4 e variante RFC 9562 ajustados. Identificadores aleatórios, sem garantia matemática de unicidade.

## 14. Casa e economia — 10 ferramentas

### Consumo de energia

Identificador: consumo-de-energia

Estime kWh e custo de uso de um aparelho.

**Metodologia:** kWh = potência em watts / 1.000 × horas por dia × dias. Custo = kWh × tarifa informada. Potência constante; não inclui tributos adicionais, bandeiras ou ciclos variáveis.

### Comparador de aparelhos

Identificador: comparador-de-aparelhos

Compare dois aparelhos no mesmo período de utilização.

**Metodologia:** Consumo = W × horas / 1.000. Economia no período = diferença de kWh × tarifa. Compara apenas energia sob potência constante, sem inferir desempenho equivalente.

### Orçamento doméstico

Identificador: orcamento-domestico

Organize rendas e despesas com registro exportável.

**Metodologia:** Uma linha: descrição; renda ou gasto; valor não negativo. Saldo = rendas − gastos no período declarado. Sem movimentação bancária e sem recomendação de investimento.

### Divisor de contas da casa

Identificador: divisor-de-contas-da-casa

Divida contas igualmente ou por pesos escolhidos.

**Metodologia:** Cada linha: pessoa; peso. Na divisão igual, todos recebem peso 1. Rateio por maiores resíduos distribui centavos mantendo o total.

### Custo por lavagem

Identificador: custo-por-lavagem

Some água, energia e insumos por ciclo.

**Metodologia:** Custo por ciclo = água + energia + insumos declarados em reais. Total do período = custo por ciclo × número inteiro de ciclos. Não inclui depreciação ou manutenção.

### Custo de receita doméstica

Identificador: custo-de-receita-domestica

Calcule gastos dos ingredientes consumidos e de cada porção.

**Metodologia:** Cada linha: ingrediente; preço da embalagem; quantidade na embalagem; quantidade usada. Quantidades de cada linha devem usar a mesma unidade. Soma custo proporcional e adicionais, divide pelo rendimento.

### Lista de compras comparativa

Identificador: lista-de-compras-comparativa

Compare duas cestas usando preços informados.

**Metodologia:** Uma linha: produto; quantidade; preço unitário na loja A; preço unitário na loja B. Mesmos produtos e unidades. Não inclui deslocamento nem promoções não informadas.

### Planejador de meta de economia

Identificador: planejador-de-meta-de-economia

Divida o valor restante pelo prazo em meses.

**Metodologia:** Necessário = máximo(0, meta − valor já guardado). Parcela mensal é arredondada para cima em centavos; última parcela compensa. Sem juros, inflação ou rendimento presumido.

### Consumo de água

Identificador: consumo-de-agua

Estime o volume e o custo variável de um uso diário.

**Metodologia:** Litros = vazão em L/min × minutos por uso × usos por dia × dias. Divide por 1.000 para m³ e multiplica pela tarifa constante informada. Não calcula faixas tarifárias, mínimo ou esgoto.

### Autonomia de estoque doméstico

Identificador: autonomia-de-estoque-domestico

Planeje quantos dias um produto dura pelo consumo informado.

**Metodologia:** Duração = quantidade disponível / consumo diário. Quantidade necessária = consumo diário × dias planejados. Use a mesma unidade para estoque e consumo; desconsidera validade e perdas.

## 15. Viagens e deslocamentos — 10 ferramentas

### Custo de combustível

Identificador: custo-de-combustivel

Estime litros e gasto para uma distância informada.

**Metodologia:** Litros = distância / rendimento em km/L. Gasto = litros × preço por litro. Não consulta mapas nem prevê condições de tráfego.

### Divisor de viagem

Identificador: divisor-de-viagem

Rateie combustível, pedágios, hospedagem e outros gastos.

**Metodologia:** Cada categoria é um total do grupo. A soma é dividida igualmente; centavos restantes vão aos primeiros participantes, para preservar o valor exato.

### Comparador de combustíveis

Identificador: comparador-de-combustiveis

Compare dois combustíveis pelo rendimento real informado.

**Metodologia:** Custo por km = preço por litro / rendimento em km/L. Não aplica regra fixa de 70%; rendimentos devem ser comparáveis no mesmo veículo e condições.

### Orçamento de viagem

Identificador: orcamento-de-viagem

Some despesas por pessoa, por dia e por grupo.

**Metodologia:** Total = pessoas × dias × gasto diário individual + pessoas × passagem individual + hospedagem total do grupo + extras. Reserva percentual incide no subtotal; não duplica hospedagem na parcela diária.

### Lista de bagagem

Identificador: lista-de-bagagem

Monte uma lista exportável por duração e atividade.

**Metodologia:** Trocas de roupa = dias × trocas/dia, limitadas pelo intervalo de lavagem quando informado. Sugestões editáveis pelo viajante, sem requisitos sanitários, legais ou regras de companhia aérea.

### Tempo de trajeto estimado

Identificador: tempo-de-trajeto-estimado

Calcule uma duração pela distância, velocidade média e pausas.

**Metodologia:** Minutos = distância / velocidade média × 60 + pausas. Velocidade constante representa uma média declarada; não é sugestão de velocidade e não prevê trânsito.

### Consumo médio do veículo

Identificador: consumo-medio-do-veiculo

Calcule rendimento e litros por 100 km.

**Metodologia:** km/L = distância percorrida / litros repostos. L/100 km = litros / distância × 100. Medir entre abastecimentos comparáveis de tanque cheio; combustível comprado isoladamente não mede consumo.

### Comparador de deslocamento

Identificador: comparador-de-deslocamento

Compare custos e duração das alternativas de transporte.

**Metodologia:** Uma linha: alternativa; transporte; estacionamento; outros custos; minutos. Todos os custos devem cobrir o mesmo trajeto e o mesmo grupo. Compara dinheiro e tempo separadamente.

### Conversor de moeda informada

Identificador: conversor-de-moeda-informada

Converta uma quantia usando uma cotação preenchida por você.

**Metodologia:** Destino = valor de origem × cotação em unidades de destino por 1 origem. Acréscimo = destino × taxa percentual + tarifa fixa na moeda de destino. Não consulta câmbio atual nem presume tributos.

### Peso de bagagem

Identificador: peso-de-bagagem

Some pesos dos itens e compare com o limite informado.

**Metodologia:** Cada linha: item; quantidade; peso unitário em kg. Total = peso da mala vazia + soma(quantidade × peso unitário). Limite fornecido pelo viajante; não consulta regras de transporte.
