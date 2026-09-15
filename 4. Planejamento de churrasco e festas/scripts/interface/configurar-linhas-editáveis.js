// Gerencia um grupo de linhas dinâmicas dentro de um contêiner ".linhas-editáveis":
// cada linha nova é construída por criarLinha(índice) e inserida antes do botão de
// adicionar; o clique em "[data-remover-linha]" remove a linha, respeitando um número
// mínimo de linhas que nunca pode ser removido pelo botão.
export function configurarLinhasEditáveis({ contêiner, botãoAdicionar, criarLinha, mínimo = 1, aoMudar }) {
  function contarLinhas() {
    return contêiner.querySelectorAll(':scope > [data-linha]').length;
  }

  function adicionarLinha() {
    const linha = criarLinha(contarLinhas());
    contêiner.insertBefore(linha, botãoAdicionar);
    aoMudar?.();
    return linha;
  }

  botãoAdicionar.addEventListener('click', () => adicionarLinha());

  contêiner.addEventListener('click', (evento) => {
    const botãoDeRemover = evento.target.closest('[data-remover-linha]');
    if (!botãoDeRemover) return;
    if (contarLinhas() <= mínimo) return;
    botãoDeRemover.closest('[data-linha]')?.remove();
    aoMudar?.();
  });

  return { adicionarLinha, contarLinhas };
}
