// Efeito de um desconto percentual sobre o preço já calculado da peça: quanto sobra depois
// de descontar o custo do artesanato, com aviso claro quando o desconto derruba o preço
// abaixo do custo (prejuízo). Não presume nenhum preço de mercado: preço e custo vêm de
// quem usa a ferramenta.
export function calcularEfeitoDeDesconto({ preço, custo, descontoPercentual }) {
  if (!Number.isFinite(preço) || preço <= 0) return { válido: false, erro: 'O preço da peça precisa ser maior que zero.' };
  if (!Number.isFinite(custo) || custo < 0) return { válido: false, erro: 'O custo precisa ser zero ou maior.' };
  if (!Number.isFinite(descontoPercentual) || descontoPercentual < 0 || descontoPercentual >= 100) {
    return { válido: false, erro: 'O desconto precisa ficar entre 0% e 99,99%.' };
  }

  const valorDoDesconto = preço * (descontoPercentual / 100);
  const preçoComDesconto = preço - valorDoDesconto;
  const contribuição = preçoComDesconto - custo;

  return {
    válido: true,
    valorDoDesconto,
    preçoComDesconto,
    contribuição,
    prejuízo: contribuição < 0,
  };
}
