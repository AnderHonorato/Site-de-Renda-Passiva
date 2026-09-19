// Copia texto para a área de transferência. Retorna true somente se a cópia
// realmente aconteceu; em caso de falha a interface oferece seleção manual.
export async function copiarTexto(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // segue para o método alternativo
  }
  const área = document.createElement('textarea');
  área.value = texto;
  área.setAttribute('readonly', '');
  área.className = 'visualmente-oculto';
  document.body.append(área);
  área.select();
  let copiou = false;
  try {
    copiou = document.execCommand('copy');
  } catch {
    copiou = false;
  }
  área.remove();
  return copiou;
}
