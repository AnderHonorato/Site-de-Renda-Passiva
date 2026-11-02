// Gera a matriz de módulos de um QR Code (true = módulo escuro) usando a biblioteca
// qrcode-generator (MIT) recebida por parâmetro. Função pura, testável no Node.
export function gerarMatrizQr(texto, fábricaDeQr, nívelDeCorreção = 'M') {
  const qr = fábricaDeQr(0, nívelDeCorreção);
  qr.addData(String(texto), 'Byte');
  qr.make();
  const tamanho = qr.getModuleCount();
  const matriz = [];
  for (let linha = 0; linha < tamanho; linha += 1) {
    const módulos = [];
    for (let coluna = 0; coluna < tamanho; coluna += 1) módulos.push(qr.isDark(linha, coluna));
    matriz.push(módulos);
  }
  return matriz;
}
