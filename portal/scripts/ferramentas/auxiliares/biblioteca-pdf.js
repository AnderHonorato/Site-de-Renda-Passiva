/** Carrega a pdf-lib (build ES module 1.17.1, MIT) uma vez só, só quando a ferramenta precisa. */
const CAMINHO_DA_BIBLIOTECA = '../../../recursos/pdf-lib.esm.min.js';

let carregando;

/** @returns {Promise<any>} */
export function carregarBiblioteca() {
  carregando ??= import(CAMINHO_DA_BIBLIOTECA).catch((erro) => {
    carregando = undefined;
    throw erro;
  });
  return carregando;
}

/** Mensagem para quando a biblioteca não chega (rede caiu antes de baixar). */
export const ERRO_DE_BIBLIOTECA = 'Não foi possível carregar o leitor de PDF. Confira a conexão e tente de novo.';
