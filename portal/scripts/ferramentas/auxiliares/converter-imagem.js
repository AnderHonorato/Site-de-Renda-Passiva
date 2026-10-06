/**
 * Decodifica WebP e GIF no próprio navegador (canvas) e devolve PNG, que a
 * pdf-lib sabe incorporar. GIF animado vira o primeiro quadro. O navegador
 * aplica a rotação EXIF sozinho ao decodificar, por isso a saída vem em pé.
 */

/**
 * @param {Uint8Array} bytes
 * @param {string} tipo 'webp' ou 'gif'
 * @returns {Promise<{bytes: Uint8Array, largura: number, altura: number}>}
 */
export async function converterImagemPelaTela(bytes, tipo) {
  const bitmap = await createImageBitmap(new Blob([bytes], { type: tipo === 'webp' ? 'image/webp' : 'image/gif' }));
  try {
    const tela = document.createElement('canvas');
    tela.width = bitmap.width;
    tela.height = bitmap.height;
    const contexto = tela.getContext('2d');
    if (!contexto) throw new Error('canvas indisponível');
    contexto.drawImage(bitmap, 0, 0);
    const png = await new Promise((resolver, rejeitar) => {
      tela.toBlob((blob) => (blob ? resolver(blob) : rejeitar(new Error('sem imagem'))), 'image/png');
    });
    return { bytes: new Uint8Array(await png.arrayBuffer()), largura: bitmap.width, altura: bitmap.height };
  } finally {
    bitmap.close();
  }
}
