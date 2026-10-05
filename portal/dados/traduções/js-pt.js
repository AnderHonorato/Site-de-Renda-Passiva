/**
 * Textos que o JavaScript do navegador escreve na tela (avisos, listas, ficha das planejadas...),
 * em português. A página em inglês carrega js-en.js, com as mesmas chaves e os mesmos {parâmetros}.
 * scripts/núcleo/idioma.js carrega só o dicionário do idioma da página.
 *
 * Plural: "um|vários" (o primeiro para quantidade 1, o segundo para o resto), escolhido por
 * t('chave', { n: 3 }) quando o texto tem {n} e uma barra vertical.
 */
export default Object.freeze({
  lista: {
    planejada: 'Planejada',
    plus: 'Plus',
    nenhuma: 'Nenhuma ferramenta encontrada.',
    removerFavorito: 'Remover dos favoritos',
    salvarFavorito: 'Salvar nos favoritos',
    favoritoComNome: '{ação}: {nome}',
    limiteFavoritos: 'Limite de favoritos atingido. Remova algum antes de salvar outro.',
    salvoNosFavoritos: 'Salvo nos favoritos.',
    removidoDosFavoritos: 'Removido dos favoritos.',
    fichaTítulo: 'Ainda não implementada',
    fichaParaQueServe: 'Para que serve',
    fichaVocêInformará: 'Você informará',
    fichaVocêReceberá: 'Você receberá',
    fichaComoVaiCalcular: 'Como vai calcular',
    fichaNota: 'Ela aparece no catálogo porque está planejada e com o escopo definido. Quando abrir, terá validação, tratamento de erro e teste automático, como as demais.',
    versãoSóEmPortuguês: 'Em português',
  },
  início: {
    intenções: [
      'quanto devo cobrar',
      'rachar a conta',
      'quantos dias faltam',
      'qual embalagem compensa',
      'somar horas trabalhadas',
      'fazer um orçamento',
      'limpar minha planilha',
      'criar senha forte',
    ],
    nadaEncontrado: 'Nada encontrado para “{consulta}”.',
    verCatálogoCompleto: 'Ver o catálogo completo',
    contagemCategoria: '{prontas} de {total} prontas',
  },
  boasVindas: {
    slides: [
      'Bem-vindo|Ferramentas prontas para calcular, criar e organizar. Sem cadastro, e o que você digita fica no seu aparelho.',
      'Descreva a tarefa|Escreva na busca o que você quer resolver, como “quanto devo cobrar”. Ela entende intenção. Aperte / em qualquer página para buscar.',
      'O catálogo está crescendo|Estamos acrescentando ferramentas de PDF e outras mais avançadas. As que ainda não abriram aparecem marcadas como planejadas.',
    ],
    fechar: 'Fechar',
    pular: 'Pular',
    próximo: 'Próximo',
    começar: 'Começar',
  },
  catálogo: {
    ferramentas: '{n} ferramenta|{n} ferramentas',
    nenhumFavorito: 'Você ainda não salvou nenhuma ferramenta. Use o marcador ao lado do nome.',
    nenhumFiltro: 'Nenhuma ferramenta combina com esses filtros.',
  },
  salvos: {
    nenhumFavorito: 'Nenhum favorito ainda. Use o marcador ao lado do nome de qualquer ferramenta.',
    armazenamentoBloqueado: 'Este navegador está bloqueando o armazenamento local, então favoritos não podem ser guardados.',
    nenhumaRecente: 'Nenhuma ferramenta aberta ainda neste navegador.',
    históricoLimpo: 'Histórico limpo.',
    cópiaBaixada: 'Cópia baixada.',
    arquivoGrande: 'Arquivo grande demais para ser uma cópia do portal.',
    importados: '{importadas} item(ns) importado(s){ignoradas}.',
    ignorados: ', {ignoradas} ignorado(s)',
    nãoLeu: 'Não foi possível ler o arquivo.',
    arquivoInválido: 'Arquivo inválido.',
    nãoÉCópia: 'Este arquivo não é uma cópia do portal.',
  },
  bloco: {
    falhou: 'Esta parte não carregou.',
    aindaNãoDeu: 'Ainda não deu.',
    restoFunciona: 'O resto da página continua funcionando. Você pode tentar de novo.',
    recarregarAjuda: 'Se a conexão estiver instável, recarregar a página costuma resolver. O resto continua funcionando.',
    tentarDeNovo: 'Tentar de novo',
    recarregar: 'Recarregar a página',
    algoDeuErrado: 'Algo não funcionou como deveria. Se uma parte parar de responder, recarregue a página.',
  },
});
