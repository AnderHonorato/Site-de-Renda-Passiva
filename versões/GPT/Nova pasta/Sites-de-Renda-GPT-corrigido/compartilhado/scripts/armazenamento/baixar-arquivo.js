// Oferece um arquivo gerado no navegador para download, sem servidor.
export function baixarArquivo(nome, conteúdo, tipo = 'application/json;charset=utf-8') {
  const blob = conteúdo instanceof Blob ? conteúdo : new Blob([conteúdo], { type: tipo });
  const endereço = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = endereço;
  link.download = nome;
  link.rel = 'noopener';
  link.className = 'visualmente-oculto';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(endereço), 30_000);
}
