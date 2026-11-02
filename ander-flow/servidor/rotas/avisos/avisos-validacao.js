// avisos-validacao.js — vigência e compatibilidade de público dos avisos (docs/contratos.md §7, §11).

/** `publico` do aviso é compatível com o visitante: 'todos' sempre; 'anonimos' só sem sessão; 'gratis'/'plus' pelo plano. */
export function publicoCompativel(publico, usuario) {
  if (publico === 'todos') return true;
  if (!usuario) return publico === 'anonimos';
  return publico === usuario.plano;
}

/** Aviso vigente: ativo, já começou e (sem fim ou fim no futuro). Datas ISO comparáveis como texto. */
export function avisoVigente(linha, agoraIso) {
  if (!linha.ativo) return false;
  if (linha.inicio_em > agoraIso) return false;
  if (linha.fim_em && linha.fim_em <= agoraIso) return false;
  return true;
}

export function idValido(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}
