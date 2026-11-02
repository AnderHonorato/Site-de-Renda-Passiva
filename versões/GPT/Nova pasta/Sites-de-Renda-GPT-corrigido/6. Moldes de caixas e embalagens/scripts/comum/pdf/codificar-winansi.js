// Sincronizado de compartilhado/scripts/pdf/codificar-winansi.js — edite a origem e rode "npm run sincronizar" na raiz.
// Converte texto Unicode para bytes WinAnsiEncoding, usado pelas fontes padrão
// Helvetica do PDF. Cobre acentos e cedilha do português. Caracteres sem
// equivalente viram "?" e são contados em "substituídos" para aviso ao usuário.

const ESPECIAIS = new Map([
  ['€', 0x80], ['‚', 0x82], ['ƒ', 0x83], ['„', 0x84], ['…', 0x85], ['†', 0x86], ['‡', 0x87],
  ['ˆ', 0x88], ['‰', 0x89], ['Š', 0x8a], ['‹', 0x8b], ['Œ', 0x8c], ['Ž', 0x8e], ['‘', 0x91],
  ['’', 0x92], ['“', 0x93], ['”', 0x94], ['•', 0x95], ['–', 0x96], ['—', 0x97], ['˜', 0x98],
  ['™', 0x99], ['š', 0x9a], ['›', 0x9b], ['œ', 0x9c], ['ž', 0x9e], ['Ÿ', 0x9f],
]);

export function codificarWinAnsi(texto) {
  const bytes = [];
  let substituídos = 0;
  for (const caractere of String(texto ?? '').normalize('NFC').replace(/[\t\r\n]+/g, ' ')) {
    const código = caractere.codePointAt(0);
    if ((código >= 0x20 && código <= 0x7e) || (código >= 0xa0 && código <= 0xff)) bytes.push(código);
    else if (ESPECIAIS.has(caractere)) bytes.push(ESPECIAIS.get(caractere));
    else {
      bytes.push(0x3f);
      substituídos += 1;
    }
  }
  return { bytes, substituídos };
}
