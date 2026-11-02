// Monta um arquivo ZIP sem compressão (método "stored"), suficiente para o pacote
// .xlsx, que é um ZIP de arquivos XML. Nomes em UTF-8 (bit 11 ativado).
import { calcularCrc32 } from './calcular-crc32.js';

function escreverInteiros(visão, posição, valores) {
  let deslocamento = posição;
  for (const [tamanho, valor] of valores) {
    if (tamanho === 2) visão.setUint16(deslocamento, valor, true);
    else visão.setUint32(deslocamento, valor, true);
    deslocamento += tamanho;
  }
  return deslocamento;
}

export function compactarZip(arquivos, data = new Date()) {
  const codificador = new TextEncoder();
  const horaDos = (data.getHours() << 11) | (data.getMinutes() << 5) | Math.floor(data.getSeconds() / 2);
  const dataDos = ((data.getFullYear() - 1980) << 9) | ((data.getMonth() + 1) << 5) | data.getDate();
  const entradas = arquivos.map(({ nome, conteúdo }) => {
    const nomeEmBytes = codificador.encode(nome);
    const dados = typeof conteúdo === 'string' ? codificador.encode(conteúdo) : conteúdo;
    return { nomeEmBytes, dados, crc: calcularCrc32(dados) };
  });

  const tamanhoDosLocais = entradas.reduce((total, entrada) => total + 30 + entrada.nomeEmBytes.length + entrada.dados.length, 0);
  const tamanhoDoDiretório = entradas.reduce((total, entrada) => total + 46 + entrada.nomeEmBytes.length, 0);
  const saída = new Uint8Array(tamanhoDosLocais + tamanhoDoDiretório + 22);
  const visão = new DataView(saída.buffer);
  const posições = [];
  let posição = 0;

  for (const entrada of entradas) {
    posições.push(posição);
    posição = escreverInteiros(visão, posição, [
      [4, 0x04034b50], [2, 20], [2, 0x0800], [2, 0], [2, horaDos], [2, dataDos],
      [4, entrada.crc], [4, entrada.dados.length], [4, entrada.dados.length], [2, entrada.nomeEmBytes.length], [2, 0],
    ]);
    saída.set(entrada.nomeEmBytes, posição);
    posição += entrada.nomeEmBytes.length;
    saída.set(entrada.dados, posição);
    posição += entrada.dados.length;
  }

  const inícioDoDiretório = posição;
  entradas.forEach((entrada, índice) => {
    posição = escreverInteiros(visão, posição, [
      [4, 0x02014b50], [2, 20], [2, 20], [2, 0x0800], [2, 0], [2, horaDos], [2, dataDos],
      [4, entrada.crc], [4, entrada.dados.length], [4, entrada.dados.length], [2, entrada.nomeEmBytes.length],
      [2, 0], [2, 0], [2, 0], [2, 0], [4, 0], [4, posições[índice]],
    ]);
    saída.set(entrada.nomeEmBytes, posição);
    posição += entrada.nomeEmBytes.length;
  });

  escreverInteiros(visão, posição, [
    [4, 0x06054b50], [2, 0], [2, 0], [2, entradas.length], [2, entradas.length],
    [4, posição - inícioDoDiretório], [4, inícioDoDiretório], [2, 0],
  ]);
  return saída;
}
