import { detectarSeparador } from './tabular.js';

/** Recusa aspas malformadas antes que o leitor tolerante remova caracteres do arquivo. */
export function validarCsvProfissional(texto, { separador = detectarSeparador(texto.replace(/^\uFEFF/, '')) } = {}) {
  let estado = 0;
  for (let i = texto.charCodeAt(0) === 0xFEFF ? 1 : 0; i < texto.length; i++) {
    const c = texto[i];
    if (estado === 2) {
      if (c === '"' && texto[i + 1] === '"') i++;
      else if (c === '"') estado = 3;
    } else if (c === separador || c === '\n' || c === '\r') estado = 0;
    else if (estado === 0 && c === '"') estado = 2;
    else if (estado === 3) {
      if (c !== ' ' && c !== '\t') throw new Error('CSV inválido: há conteúdo depois do fechamento de aspas.');
    } else {
      if (c === '"') throw new Error('CSV inválido: aspas no meio de uma célula sem delimitação.');
      estado = 1;
    }
  }
  if (estado === 2) throw new Error('CSV inválido: há aspas sem fechamento.');
}
