// Área de uma forma de assar redonda, quadrada ou retangular, em centímetros quadrados.
// Usada para estimar o fator de conversão de massa entre formas de mesma altura.
export function calcularÁreaDeForma({ tipo, diâmetro, lado, largura, comprimento }) {
  if (tipo === 'redonda') {
    if (!Number.isFinite(diâmetro) || diâmetro <= 0) return { válido: false, erro: 'Informe um diâmetro maior que zero.' };
    const raio = diâmetro / 2;
    return { válido: true, área: Math.PI * raio * raio };
  }
  if (tipo === 'quadrada') {
    if (!Number.isFinite(lado) || lado <= 0) return { válido: false, erro: 'Informe um lado maior que zero.' };
    return { válido: true, área: lado * lado };
  }
  if (tipo === 'retangular') {
    if (!Number.isFinite(largura) || largura <= 0 || !Number.isFinite(comprimento) || comprimento <= 0) {
      return { válido: false, erro: 'Informe largura e comprimento maiores que zero.' };
    }
    return { válido: true, área: largura * comprimento };
  }
  return { válido: false, erro: 'Forma desconhecida: use redonda, quadrada ou retangular.' };
}
