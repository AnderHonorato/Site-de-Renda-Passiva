/**
 * Redireciona somente as cópias estáticas das telas de autenticação.
 * A publicação Node completa conserva formulários e login funcionais.
 */
export function redirecionarAutenticacaoPages(html, destino, ingles = false) {
  if (!['entrar', 'cadastro'].includes(destino)) throw new Error('Destino de autenticação inválido.');
  if (typeof html !== 'string' || !html.includes('</head>')) throw new Error('Documento sem cabeçalho HTML.');
  const caminho = (ingles ? '../' : '') + 'servidor-teste.html?abrir=' + destino;
  return html.replace('</head>', `  <meta http-equiv="refresh" content="0; url=${caminho}">\n</head>`);
}
