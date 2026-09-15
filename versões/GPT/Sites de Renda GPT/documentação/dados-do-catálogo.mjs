// Catálogo de implementação, não uma declaração de funcionalidades prontas.
export const categorias = [
  {nome:'Confeitaria',pasta:'1. Ferramentas para confeitaria',rota:'confeitaria',cor:'#934832',ícone:'bolo',itens:`Custo da receita|Confeiteira identifica quanto gasta por lote.|R$ 80 para 50 unidades → R$ 1,60 por unidade.
Preço de venda|Vender brigadeiros considerando margem e taxas editáveis.|Custo R$ 80 e margem 30%, sem taxas → lote matemático R$ 114,2857.
Ajuste de receitas|Aumentar uma encomenda sem refazer cada ingrediente.|Receita de 20 para 50 porções → fator 2,5.
Lista de compras da produção|Comprar pacotes inteiros para várias receitas.|Necessidade 1,2 kg e pacote 500 g → comprar 3 pacotes.
Orçamento de doces|Enviar proposta sem revelar custos internos.|50 doces a R$ 2,29 → proposta de R$ 114,50.
Conversor de formas|Estimar fator de massa por volume de formas.|Redondas de mesma altura, 20 para 30 cm → fator 2,25; cocção não escala automaticamente.
Rendimento com perdas|Planejar unidades aproveitáveis e custo real.|100 unidades e perda 5% → 95 aproveitáveis.
Ficha técnica de receita|Padronizar ingredientes, etapas e custo em folha imprimível.|Brownie com 3 ingredientes cadastrados → ficha com rendimento e data.`},
  {nome:'Educação',pasta:'2. Atividades escolares para imprimir',rota:'educação',cor:'#525aa1',ícone:'livro',itens:`Atividades matemáticas|Professor gera exercícios com gabarito separado.|10 somas até 20 → 10 questões e 10 respostas conferíveis.
Tabuada para imprimir|Preparar treino por fator e dificuldade.|Fator 7, multiplicadores 1 a 10 → gabarito 7 até 70.
Caça-palavras|Criar atividade com palavras próprias.|SOL, LUA e MAR → todas inseridas e marcadas no gabarito.
Folhas de caligrafia|Responsável prepara linhas de escrita em português.|Texto João → letras com acento preservado e linhas-guia A4.
Bingo de números|Organizar atividade em turma sem cartelas repetidas.|Intervalo 1 a 75 e grade 5×5 → cartelas válidas e lista de sorteio.
Papel quadriculado|Imprimir folha em escala real para atividades.|Quadrícula 5 mm → quadrado de calibração mede 10 mm.
Flashcards imprimíveis|Estudar pares de perguntas e respostas próprios.|5 capitais cadastradas → 5 pares com frente e verso alinhados.
Planejador de estudos|Distribuir disciplinas e horários sem prometer aprovação.|2 matérias × 30 min → 60 min de estudo, mais pausas informadas.`},
  {nome:'Artesanato',pasta:'3. Ferramentas para crochê e artesanato',rota:'artesanato',cor:'#9a4469',ícone:'novelo',itens:`Preço de peça artesanal|Precificar crochê incluindo material e trabalho.|R$ 20 materiais + 2 h a R$ 15 → custo R$ 50 antes da margem.
Valor da hora artesanal|Estimar hora produtiva a partir da meta e custos.|R$ 3.000 divididos por 100 h produtivas → R$ 30 por hora.
Custo do fio consumido|Calcular custo de parte de um novelo.|Novelo R$ 20 por 100 g, uso 25 g → R$ 5.
Planejador de encomendas|Verificar capacidade e organizar datas de produção.|5 peças de 2 h, capacidade 2 h/dia → 5 dias produtivos.
Orçamento artesanal|Gerar proposta imprimível com prazo e itens.|3 peças de R$ 50 → subtotal R$ 150.
Simulador de desconto artesanal|Ver efeito do desconto sobre a contribuição.|Preço R$ 100, custo R$ 60, desconto 10% → sobra R$ 30 antes dos demais custos.
Conversor de amostras de pontos|Ajustar quantidade de pontos a uma largura.|20 pontos por 10 cm, largura 35 cm → 70 pontos, antes do múltiplo do padrão.
Controle de materiais local|Acompanhar entradas e consumo sem cadastro.|100 g disponíveis − 25 g consumidos → saldo 75 g.`},
  {nome:'Festas',pasta:'4. Planejamento de churrasco e festas',rota:'festas',cor:'#ad4c2d',ícone:'festa',itens:`Calculadora de churrasco|Estimar carnes e acompanhamentos com premissas editáveis.|10 adultos × 400 g informados → 4 kg; não é recomendação universal.
Planejador de festa infantil|Responsável organiza alimentos e itens por convidados.|20 pessoas × 5 salgados informados → 100 salgados.
Quantidade para almoço|Estimar porções sem duplicar perdas cru/cozido.|12 porções × 100 g de arroz cru informados → 1,2 kg.
Calculadora de bebidas|Planejar água e bebidas por perfil declarado.|15 consumidores × 600 ml informados → 9 L; álcool somente para adultos declarados.
Orçamento de festa|Somar compras, serviços e reserva informada.|Itens R$ 400 + reserva 10% → R$ 440.
Divisor de despesas|Ratear gastos sem coletar dados bancários.|R$ 300 entre 4 pagantes → R$ 75 para cada.
Cronograma de evento|Organizar preparação, montagem e horários.|Festa às 18h, montagem 2 h → início às 16h.
Lista de convidados local|Contar presenças e necessidades da organização.|8 confirmados, 2 pendentes → totais separados; nomes só no dispositivo.`},
  {nome:'Reforma',pasta:'5. Calculadoras de pintura e reforma',rota:'reforma',cor:'#3e7378',ícone:'pincel',itens:`Área de paredes|Estimar área de acabamento descontando aberturas.|Parede 4×3 m menos porta de 2 m² → 10 m².
Quantidade de tinta|Comprar tinta usando rendimento do fabricante.|40 m², 2 demãos, 10 m²/L por demão → 8 L antes de reserva.
Piso por caixa|Arredondar compra de revestimento.|20 m² + 10% de recorte, 2,2 m²/caixa → 10 caixas.
Quantidade de rodapé|Comprar barras pelo perímetro útil.|18 m úteis, barra 2 m, sem perda → 9 barras.
Papel de parede|Calcular faixas e rolos considerando repetição da estampa.|Parede 4 m, faixa 0,5 m → 8 faixas; rolos dependem de altura e repetição.
Orçamento de acabamento|Somar material e mão de obra informados.|R$ 800 materiais + R$ 500 serviço → R$ 1.300.
Área de rejunte estimada|Estimar volume geométrico com dados do fabricante.|Exibir juntas, profundidade e densidade informadas; não fixar consumo universal.
Comparador de embalagens de tinta|Comparar custo por litro e rendimento declarado.|Lata 3,6 L por R$ 90 → R$ 25/L; comparar cobertura antes da escolha.`},
  {nome:'Embalagens',pasta:'6. Moldes de caixas e embalagens',rota:'embalagens',cor:'#816437',ícone:'caixa',itens:`Caixa retangular|Criar molde plano com abas e dimensões internas.|10×6×4 cm → PDF/SVG com linhas de corte, dobra e calibração.
Caixa com tampa|Gerar base e tampa com folga editável.|Base 100 mm e folga 1 mm por lado → largura interna da tampa 102 mm.
Envelope personalizado|Imprimir envelope com área útil e abas.|Cartão 100×150 mm → molde com folga declarada.
Etiquetas e tags|Distribuir etiquetas em folha sem cortar margens.|Etiqueta 50×30 mm → grade calculada pela área imprimível A4.
Cinta para embalagem|Envolver caixa com faixa de papel.|Perímetro 300 mm + sobreposição 15 mm → cinta 315 mm.
Divisórias de caixa|Gerar tiras encaixáveis para separar produtos.|Grade 2×3 → 6 compartimentos; espessura e encaixes declarados.
Saco de papel simples|Criar molde plano de sacola sem alça estrutural.|Largura, profundidade, altura e abas → folha escalada e instruções.
Aproveitamento de folha|Comparar orientação de peças retangulares.|Folha útil 200×280 mm, peças 50×70 mm sem espaçamento → 16 peças.`},
  {nome:'Texto e escrita',pasta:'7. Texto e escrita',rota:'texto',cor:'#78569c',ícone:'texto',itens:`Contador de palavras|Ajustar texto a limite de caracteres e palavras.|Olá, mundo! → 2 palavras; explicar contagem de espaços e emojis.
Maiúsculas e minúsculas|Padronizar títulos preservando português.|ação útil → AÇÃO ÚTIL.
Limpar espaços|Corrigir texto colado com espaços duplicados.|Bom   dia → Bom dia; opção para preservar parágrafos.
Ordenar linhas|Organizar listas com ordenação pt-BR.|banana, abacaxi → abacaxi, banana.
Remover linhas duplicadas|Limpar listas escolhendo normalização.|ana, ana, bia → ana, bia; preservar primeira ocorrência.
Comparar textos|Encontrar alterações entre versões localmente.|Valor 10 para Valor 12 → diferença marcada em 10 e 12.
Tempo de leitura|Estimar duração pela velocidade escolhida.|600 palavras a 200 palavras/min → 3 minutos.
Texto para lista numerada|Transformar tópicos em checklist imprimível.|Comprar, Separar, Entregar → três itens numerados.`},
  {nome:'Imagens',pasta:'8. Imagens',rota:'imagens',cor:'#34736d',ícone:'imagem',itens:`Redimensionar imagem|Adequar foto a formulário ou anúncio.|4000×3000 para largura 1200 → 1200×900 mantendo proporção.
Comprimir imagem|Tentar reduzir tamanho para envio sem sair do dispositivo.|Escolher qualidade → mostrar bytes antes/depois; não garantir meta impossível.
Converter formato de imagem|Trocar PNG, JPEG e WebP suportados.|PNG transparente para JPEG → pedir cor de fundo.
Recortar imagem|Preparar avatar ou anúncio com proporção escolhida.|Foto 4:3 recortada em 1:1 → prévia e exportação coerentes.
Girar e espelhar imagem|Corrigir orientação de foto.|Giro 90° em 1200×800 → 800×1200.
Marca-dágua pessoal|Aplicar texto próprio com opacidade e posição.|Texto Loja Ana no canto → exportação com mesma marca.
Remover metadados de imagem|Gerar cópia reencodificada e verificar metadados.|JPEG com GPS de teste → saída sem esse EXIF; não prometer remover todo dado de qualquer formato.
Paleta de cores de imagem|Extrair cores aproximadas para artes.|Imagem de duas cores → amostras HEX e cópia acessível.`},
  {nome:'PDF e documentos',pasta:'9. PDF e documentos',rota:'documentos',cor:'#ae4549',ícone:'documento',itens:`Juntar PDFs|Reunir comprovantes sem enviar arquivos a terceiros.|PDFs de 2 e 3 páginas → novo PDF de 5 páginas na ordem escolhida.
Separar páginas de PDF|Enviar apenas páginas necessárias.|PDF de 10 páginas, intervalo 2–4 → PDF de 3 páginas.
Organizar páginas de PDF|Reordenar e excluir páginas com prévia.|Ordem 3,1,2 → exportação nessa ordem.
Girar páginas de PDF|Corrigir páginas digitalizadas tortas de orientação.|Página escolhida girada 90° → demais mantidas.
Imagens para PDF|Enviar fotos como documento único.|3 imagens → PDF de 3 páginas com margens escolhidas.
PDF para imagens|Exportar páginas em resolução escolhida.|PDF 2 páginas → 2 PNGs; limitar resolução e memória.
Numerar páginas de PDF|Adicionar paginação sem cobrir conteúdo.|5 páginas iniciando em 10 → números 10 a 14.
Marca-dágua em PDF|Marcar cópia de documento sem alegar segurança criptográfica.|Texto Rascunho → marca aplicada às páginas selecionadas.`},
  {nome:'Datas e tempo',pasta:'10. Datas e tempo',rota:'datas',cor:'#4e648f',ícone:'relógio',itens:`Diferença entre datas|Contar duração em dias civis com regra clara.|01/03/2026 até 03/03/2026 excluindo início → 2 dias.
Somar dias a uma data|Planejar prazos pessoais, sem cálculo jurídico.|28/02/2026 + 1 dia → 01/03/2026.
Dias úteis configuráveis|Contar excluindo fins de semana e feriados informados.|Semana de segunda a sexta sem feriados → 5 dias; não calendário jurídico oficial.
Conversor de tempo|Converter horas, minutos e segundos.|1,5 h → 90 min → 5.400 s.
Somador de horas|Totalizar registros sem folha salarial.|01:30 + 02:45 → 04:15.
Cronômetro com voltas|Medir tarefas usando relógio monotônico.|Iniciar, pausar, retomar e marcar voltas sem reiniciar.
Temporizador de foco|Organizar blocos de estudo ou trabalho.|25 min de foco e 5 min de pausa; avisos só com escolha explícita.
Comparador de fusos|Marcar reunião em duas cidades usando regras IANA.|Mesmo instante em São Paulo e Lisboa → horários e offsets calculados pela data.`},
  {nome:'Matemática e medidas',pasta:'11. Matemática e medidas',rota:'matemática',cor:'#536f39',ícone:'régua',itens:`Porcentagem|Calcular parte de um total com explicação.|15% de 200 → 30.
Variação percentual|Comparar valores e sinal de crescimento.|80 para 100 → aumento 25%; base zero requer tratamento.
Regra de três|Resolver proporção direta ou inversa escolhida.|3 itens custam R$ 12 → 5 itens custam R$ 20 na direta.
Média ponderada|Calcular nota com pesos explícitos.|Notas 6 peso 1 e 8 peso 3 → 7,5.
Conversor de unidades|Converter somente grandezas compatíveis.|2,5 km → 2.500 m; kg não vira litro sem densidade.
Área de figuras|Estimar áreas planas com unidades.|Retângulo 4×3 m → 12 m².
Volume geométrico|Calcular capacidade de formas simples.|Caixa 10×10×10 cm → 1.000 cm³ → 1 L.
Frações e simplificação|Operar frações com resultado exato.|1/2 + 1/3 → 5/6; denominador zero bloqueado.`},
  {nome:'Vendas e negócios',pasta:'12. Vendas e negócios',rota:'negócios',cor:'#86611f',ícone:'loja',itens:`Preço com taxas de venda|Incluir comissão e tarifa informadas de marketplace.|Custo R$ 60, taxas 10%, margem 20% → preço R$ 85,7143; não puxar tarifa presumida.
Comparador de preço unitário|Escolher embalagem economicamente adequada.|500 g por R$ 12 → R$ 24/kg; 1 kg por R$ 20 → menor preço unitário.
Descontos sucessivos|Conferir promoção sem somar percentuais incorretamente.|R$ 100 −10% −10% → R$ 81.
Rateio de frete|Distribuir frete por valor, peso ou quantidade.|R$ 30, pesos 1 kg e 2 kg → R$ 10 e R$ 20.
Meta de vendas|Calcular quantidade pela contribuição unitária.|Meta R$ 1.000 e contribuição R$ 25 → 40 vendas.
Ponto de equilíbrio|Simular cobertura de custos fixos.|Fixos R$ 2.000 e contribuição R$ 20 → 100 unidades.
Orçamento de serviço|Preparar proposta por horas, materiais e condições.|3 h a R$ 80 + R$ 40 materiais → R$ 280.
Controle de caixa local|Registrar entradas e saídas com exportação CSV.|Saldo R$ 100 + entrada R$ 50 − saída R$ 30 → R$ 120; não substituir contabilidade.`},
  {nome:'Ferramentas digitais',pasta:'13. Ferramentas digitais',rota:'digital',cor:'#4b6584',ícone:'código',itens:`Gerador de QR Code|Criar QR de texto ou URL localmente.|https://exemplo.com → QR decodifica exatamente esse endereço.
Link de WhatsApp|Criar contato com mensagem preenchida sem enviar automaticamente.|DDD, número e Olá → link com mensagem codificada.
Construtor de UTM|Organizar links de campanha com parâmetros informados.|URL + origem email → parâmetro utm_source=email preservando demais dados.
Formatador de JSON|Ler estrutura de dados e encontrar erro sintático.|{"a":1} → JSON indentado; entrada inválida informa posição quando disponível.
Codificador de URL|Codificar componente sem executar endereço.|ação útil → componente codificado reversível em UTF-8.
Gerador de senha|Gerar segredo local com crypto seguro e nenhuma telemetria.|20 caracteres e conjuntos escolhidos → tamanho e restrições atendidos; não salvar nem logar.
Verificador de contraste|Avaliar contraste WCAG entre duas cores.|#000000 e #FFFFFF → 21:1.
Gerador de hash de arquivo|Comparar integridade de arquivo escolhido localmente.|Arquivo abc em UTF-8 → SHA-256 conhecido; não prova origem ou ausência de malware.`},
  {nome:'Casa e economia',pasta:'14. Casa e economia',rota:'casa',cor:'#3f7655',ícone:'casa',itens:`Consumo de energia|Estimar consumo com potência, tempo e tarifa informados.|1.000 W × 2 h/dia × 30 dias → 60 kWh; a R$ 1/kWh → R$ 60 estimados.
Comparador de aparelhos|Comparar consumo no mesmo período de uso.|100 W contra 60 W, 100 h → diferença 4 kWh.
Orçamento doméstico|Organizar entradas e gastos localmente.|Renda R$ 3.000 − gastos R$ 2.400 → saldo R$ 600.
Divisor de contas da casa|Ratear conta igualmente ou por pesos escolhidos.|R$ 600 com pesos 1 e 2 → R$ 200 e R$ 400.
Custo por lavagem|Somar água, energia e insumos por uso.|Parcelas informadas R$ 1 + R$ 2 + R$ 3 → R$ 6 por ciclo.
Custo de receita doméstica|Planejar refeição pelo consumo e número de porções.|R$ 36 para 6 porções → R$ 6/porção; sem margem de venda.
Lista de compras comparativa|Comparar cestas por preços preenchidos, sem inventar oferta.|Cesta A R$ 80, B R$ 75 → diferença R$ 5, sem custo de deslocamento.
Planejador de meta de economia|Dividir valor restante pelos meses disponíveis.|Meta R$ 1.200, já R$ 200, prazo 5 meses → R$ 200/mês; sem juros prometidos.`},
  {nome:'Viagens e deslocamentos',pasta:'15. Viagens e deslocamentos',rota:'viagens',cor:'#287c82',ícone:'bússola',itens:`Custo de combustível|Estimar gasto de trajeto informado sem API de mapas.|300 km, 12 km/L, R$ 6/L → 25 L e R$ 150.
Divisor de viagem|Ratear combustível, pedágios e hospedagem.|Total R$ 600 entre 3 pagantes → R$ 200.
Comparador de combustíveis|Comparar custo por km com rendimento real informado.|Etanol R$ 4 a 8 km/L → R$ 0,50/km; gasolina R$ 6 a 12 km/L → igual.
Orçamento de viagem|Planejar despesas por dias e pessoas.|2 pessoas × 3 dias × R$ 100/dia por pessoa → R$ 600 nessa parcela.
Lista de bagagem|Preparar checklist pessoal por duração e atividade.|3 dias e 1 troca/dia → 3 trocas, ajustáveis; sem aconselhamento sanitário.
Tempo de trajeto estimado|Estimar duração com distância, média e pausas.|180 km a 60 km/h + pausa 30 min → 3 h 30; sem prever trânsito.
Consumo médio do veículo|Calcular rendimento por distância e abastecimento compatíveis.|480 km com 40 L → 12 km/L; explicar método de tanque cheio.
Comparador de deslocamento|Comparar custo total de alternativas informadas.|Carro R$ 30 + estacionamento R$ 20 contra transporte R$ 24 → diferença R$ 26.`}
];
