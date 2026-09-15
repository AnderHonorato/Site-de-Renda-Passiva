// Monta um campo EMV no formato ID (2 dígitos) + tamanho (2 dígitos) + valor.
// O BR Code usa apenas caracteres ASCII, então o tamanho em caracteres é igual ao de bytes.
export function montarCampoEmv(identificador, valor) {
  if (!/^\d{2}$/.test(identificador)) {
    throw new TypeError(`Identificador EMV inválido: ${identificador}`);
  }
  const texto = String(valor);
  if (!/^[\x20-\x7E]*$/.test(texto)) {
    throw new RangeError(`O campo ${identificador} contém caracteres fora do ASCII imprimível.`);
  }
  if (texto.length < 1 || texto.length > 99) {
    throw new RangeError(`O campo ${identificador} deve ter entre 1 e 99 caracteres (tem ${texto.length}).`);
  }
  return `${identificador}${String(texto.length).padStart(2, '0')}${texto}`;
}
