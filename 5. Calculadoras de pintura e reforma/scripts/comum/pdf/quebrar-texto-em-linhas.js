// Sincronizado de compartilhado/scripts/pdf/quebrar-texto-em-linhas.js — edite a origem e rode "npm run sincronizar" na raiz.
// Quebra um texto em linhas que cabem na largura informada, usando a função de medida
// recebida (retorna a largura em mm). Palavras maiores que a largura são partidas.
export function quebrarTextoEmLinhas(texto, larguraMáxima, medir) {
  const linhas = [];
  for (const parágrafo of String(texto ?? '').split(/\r?\n/)) {
    let atual = '';
    for (const palavra of parágrafo.split(/\s+/).filter(Boolean)) {
      let pedaço = palavra;
      while (medir(pedaço) > larguraMáxima && pedaço.length > 1) {
        let corte = pedaço.length - 1;
        while (corte > 1 && medir(pedaço.slice(0, corte)) > larguraMáxima) corte -= 1;
        if (atual) {
          linhas.push(atual);
          atual = '';
        }
        linhas.push(pedaço.slice(0, corte));
        pedaço = pedaço.slice(corte);
      }
      const tentativa = atual ? `${atual} ${pedaço}` : pedaço;
      if (medir(tentativa) <= larguraMáxima) atual = tentativa;
      else {
        linhas.push(atual);
        atual = pedaço;
      }
    }
    linhas.push(atual);
  }
  return linhas;
}
