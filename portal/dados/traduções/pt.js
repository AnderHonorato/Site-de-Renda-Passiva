/**
 * Textos das páginas geradas, em português. É a origem: o inglês (en.js) tem exatamente as
 * mesmas chaves, e testes/idioma.test.mjs confere isso, inclusive os {parâmetros} de cada texto.
 *
 * Regras:
 * - texto puro; os blocos longos (listas de parágrafos) usam a marcação mínima de
 *   scripts/núcleo/texto-rico.js: *ênfase*, [[tecla:/]], [[código:portal.]] e [texto](endereço);
 * - {parâmetro} é trocado na geração (por exemplo {nome}, {prontas}, {total});
 * - o nome do site NUNCA é escrito aqui: vem de dados/site.js pelo parâmetro {nome}.
 *
 * Cada chave é também o identificador que o painel do admin vai usar para editar o texto
 * (decisão 32 do plano), então os nomes são estáveis: não renomeie sem necessidade.
 */
export default Object.freeze({
  moldura: {
    pular: 'Pular para o conteúdo',
    nav: { início: 'Início', ferramentas: 'Ferramentas', salvos: 'Salvos', ajuda: 'Ajuda' },
    marcaInício: '{nome}, início',
    categorias: 'Categorias',
    menuTítulo: 'Encontre pelo que precisa fazer',
    menuRodapé: 'Processamento no seu navegador',
    menuVerCatálogo: 'Ver o catálogo completo',
    buscar: 'Buscar ferramenta',
    buscaTopoMarcador: 'Buscar ferramenta…',
    temaRótulo: 'Tema escuro',
    navPrincipal: 'Navegação principal',
    navCelular: 'Navegação no celular',
    rodapéDescrição: 'Ferramentas para calcular, criar e organizar. Rodam no seu navegador, sem cadastro.',
    rodapéCategorias: 'Categorias',
    rodapéPortal: 'Portal',
    rodapéTodas: 'Todas as ferramentas',
    rodapéSalvos: 'Meus salvos',
    rodapéComoUsar: 'Como usar',
    rodapéLegal: 'Legal',
    rodapéPrivacidade: 'Privacidade',
    rodapéTermos: 'Termos de uso',
    criadoPor: 'Criado por {autor} · 2026',
    dadosNoAparelho: 'Seus dados ficam neste aparelho.',
    idioma: {
      rótulo: 'Idioma',
      português: 'Português',
      inglês: 'English',
      indisponível: 'English version not available yet',
      ferramentaSóEmPortuguês: 'Ferramenta disponível só em português por enquanto',
    },
    descriçãoCurta: 'Ferramentas para calcular, criar e organizar, direto no navegador.',
  },

  início: {
    título: '{nome} — resolva a tarefa, não procure o botão',
    descrição: 'Portal com {prontas} ferramentas prontas para calcular, criar e organizar. Funciona no navegador, sem cadastro e sem enviar seus dados.',
    pergunta: 'O que você precisa *resolver* agora?',
    linha: 'Escreva a tarefa, não o nome da ferramenta. {prontas} ferramentas prontas, sem cadastro, rodando no seu navegador.',
    buscaMarcador: 'Ex.: preciso saber quanto cobrar',
    buscaRótulo: 'Buscar ferramenta',
    sugestões: 'Sugestões',
    pedem: 'Pessoas costumam pedir',
    verApresentação: 'Ver a apresentação',
    acessoRápido: 'Acesso rápido',
    comeceAqui: 'Comece por aqui',
    vitrineRótulo: 'Apresentação animada do portal',
    vitrinePausar: 'Pausar animação',
    vitrineCapa: '{nome}: {prontas} ferramentas grátis.',
    recentes: 'Continue de onde parou',
    limpar: 'Limpar',
    categoriasTítulo: 'Categorias',
    verTudo: 'Ver tudo',
    prontasTítulo: 'Prontas para usar',
    prontasContagem: '{prontas} de {total} ferramentas do catálogo',
    prontasNota: 'As demais estão no catálogo com a ficha completa do que farão. Nenhuma abre uma tela vazia.',
    faqTítulo: 'Perguntas de quem chega agora',
    faq: [
      'Preciso criar conta?|Não. Todas as ferramentas do portal funcionam sem cadastro. Favoritos e histórico ficam guardados no seu próprio navegador.',
      'Meus arquivos são enviados para algum servidor?|Não. O portal é um site estático: o processamento acontece no seu navegador. Cada ferramenta informa isso na ficha, e se alguma vier a precisar de servidor, o aviso aparecerá antes de você enviar qualquer coisa.',
      'Por que algumas ferramentas aparecem como "planejada"?|Porque ainda não estão implementadas. Preferimos mostrar a ficha do que elas vão fazer a abrir uma tela vazia. Só recebe o selo de pronta a ferramenta que abre, valida a entrada, calcula, trata erro, exporta o que promete e tem teste automático.',
      'Posso usar no celular?|Sim. O portal foi desenhado primeiro para a tela pequena, com navegação inferior e campos que o teclado não cobre.',
    ],
  },

  catálogo: {
    título: 'Todas as ferramentas — {nome}',
    descrição: 'Catálogo completo com {total} ferramentas organizadas por categoria e tipo de tarefa.',
    h1: 'Catálogo de ferramentas',
    contagem: '{total} ferramentas no catálogo, {prontas} já prontas para usar.',
    buscaMarcador: 'Busque por tarefa, nome ou categoria',
    buscaRótulo: 'Buscar no catálogo',
    todas: 'Todas',
    filtrarCategoria: 'Filtrar por categoria',
    qualquerTarefa: 'Qualquer tarefa',
    tipoDeTarefa: 'Tipo de tarefa',
    situação: 'Situação',
    prontasEPlanejadas: 'Prontas e planejadas',
    sóProntas: 'Só as prontas',
    sóFavoritos: 'Só os favoritos',
  },

  salvos: {
    título: 'Meus salvos — {nome}',
    descrição: 'Favoritos e histórico das ferramentas que você usa, guardados no seu próprio navegador.',
    h1: 'Meus salvos',
    texto: 'Favoritos e histórico ficam guardados neste navegador. Nada é enviado para servidor. Exporte uma cópia antes de limpar os dados do navegador.',
    exportar: 'Exportar cópia',
    importar: 'Importar cópia',
    favoritos: 'Favoritos',
    abertas: 'Abertas recentemente',
    limparHistórico: 'Limpar histórico',
  },

  erro404: {
    título: 'Página não encontrada — {nome}',
    descrição: 'O endereço pedido não existe no portal.',
    h1: 'Esta página não existe',
    texto: 'O endereço pode ter mudado ou a ferramenta ainda não foi publicada.',
    irInício: 'Ir para o início',
    verCatálogo: 'Ver o catálogo',
  },

  ajuda: {
    título: 'Como usar o portal',
    descrição: 'Como encontrar a ferramenta certa, usar no celular, exportar resultados e guardar seus favoritos.',
    corpo: [
      '> Três passos e um princípio: você sempre vê o que vai acontecer antes de baixar qualquer coisa.',
      '## 1. Descreva a tarefa',
      'A busca entende intenção. Você pode escrever *“quanto preciso vender para pagar as despesas”* em vez de procurar por “ponto de equilíbrio”. Pressione [[tecla:/]] em qualquer página para ir direto para o campo de busca.',
      '## 2. Preencha e confira as premissas',
      'Cada ferramenta mostra, acima da dobra, o que ela faz, o que você precisa informar, o que vai receber, se existe limite e onde seus dados ficam. Quando o resultado depende de uma suposição — arredondamento, taxa, perda —, a suposição aparece escrita junto do resultado.',
      '## 3. Leve o resultado',
      'Copiar, baixar em PDF ou planilha, imprimir ou gerar um link para enviar ao cliente. O que cada ferramenta exporta está escrito na ficha dela.',
      '## Favoritos e histórico',
      'O marcador ao lado de cada ferramenta salva o atalho neste navegador. A página [Meus salvos](salvos.html) reúne favoritos e histórico, e permite exportar uma cópia em arquivo. Se você limpar os dados do navegador, essa lista se perde — por isso existe a exportação.',
      '## No celular',
      'A navegação fica na barra inferior: Início, Ferramentas, Salvos e Ajuda. Os campos numéricos abrem o teclado numérico, e nenhum botão de ação fica escondido atrás do teclado.',
      '## Acessibilidade',
      'Todo o portal funciona por teclado, os campos têm rótulo associado, os erros são anunciados por leitores de tela e as cores foram conferidas para contraste mínimo de 4,5:1. Se o seu sistema pede menos movimento, as animações são desligadas.',
    ],
  },

  privacidade: {
    título: 'Política de privacidade',
    descrição: 'O que o portal guarda, onde guarda e como apagar. Sem cadastro e sem envio de arquivos.',
    corpo: [
      '> Última revisão: 19 de setembro de 2026.',
      '## O que o portal não faz',
      '- não pede cadastro, e-mail ou telefone;',
      '- não envia os arquivos nem os números que você digita para nenhum servidor;',
      '- não usa medição de audiência, rastreadores de terceiros nem anúncios nesta versão;',
      '- não compartilha dados com terceiros, porque não coleta dados para compartilhar.',
      '## O que fica guardado',
      'Só no armazenamento local do seu navegador, sob o prefixo [[código:portal.]]: favoritos, histórico das ferramentas abertas, preferência de tema e os rascunhos que você escolher salvar dentro de uma ferramenta. Esses dados não saem do aparelho e não são legíveis por outros sites.',
      '## Como apagar',
      'Em [Meus salvos](salvos.html) você limpa o histórico e remove favoritos. Limpar os dados do site pelo próprio navegador apaga tudo de uma vez. Antes disso, use a exportação de cópia se quiser guardar.',
      '## Hospedagem',
      'O servidor que entrega as páginas pode registrar, por padrão, endereço de IP e data do acesso — é um registro técnico do provedor de hospedagem, não uma coleta do portal. Quando o endereço definitivo de publicação for escolhido, esta seção passará a nomear o provedor.',
      '## Direitos',
      'Como não existe cadastro nem base de dados pessoal do lado do portal, não há dados seus para acessar, corrigir ou excluir em nosso poder. O controle é integralmente seu, no seu navegador. Dúvidas sobre este texto podem ser enviadas ao contato publicado no rodapé quando o endereço definitivo estiver no ar.',
    ],
  },

  termos: {
    título: 'Termos de uso',
    descrição: 'Condições de uso das ferramentas, limites de responsabilidade e direitos sobre o conteúdo.',
    corpo: [
      '> Última revisão: 19 de setembro de 2026.',
      '## Uso das ferramentas',
      'As ferramentas são oferecidas gratuitamente, no estado em que se encontram, para uso pessoal e profissional. Você pode usar os resultados livremente, inclusive comercialmente.',
      '## Conferência dos resultados',
      'Os cálculos são testados, mas o resultado depende do que você informa. Para decisões financeiras, trabalhistas, fiscais ou de obra, confira com o profissional responsável. As ferramentas não substituem contador, advogado, engenheiro ou profissional de saúde, e nenhuma delas emite documento fiscal.',
      '## Disponibilidade',
      'O portal pode sair do ar para manutenção, e ferramentas podem mudar de comportamento quando um erro é corrigido. Mudanças que alteram resultados são registradas no histórico de versões do projeto.',
      '## Conteúdo',
      'O código, os textos, os ícones e o desenho do portal são de autoria de {autor}. Componentes de terceiros mantêm suas próprias licenças, listadas na documentação do projeto. O conteúdo que você digita continua seu.',
    ],
  },
});
