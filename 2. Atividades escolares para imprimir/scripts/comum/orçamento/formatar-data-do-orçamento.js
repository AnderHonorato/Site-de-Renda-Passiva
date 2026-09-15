// Sincronizado de compartilhado/scripts/orçamento/formatar-data-do-orçamento.js — edite a origem e rode "npm run sincronizar" na raiz.
// Datas do orçamento no formato brasileiro (dd/mm/aaaa), incluindo a data-limite da validade.
const formatador = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function formatarDataDoOrçamento(orçamento) {
  const criação = new Date(orçamento.criadoEm);
  const emitidoEm = formatador.format(criação);
  if (!orçamento.validadeEmDias) return { emitidoEm, válidoAté: '' };
  const limite = new Date(criação.getTime() + orçamento.validadeEmDias * 86_400_000);
  return { emitidoEm, válidoAté: formatador.format(limite) };
}
