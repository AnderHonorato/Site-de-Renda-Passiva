// Sincronizado de compartilhado/scripts/formatação/formatar-centavos.js — edite a origem e rode "npm run sincronizar" na raiz.
// Formata centavos inteiros como moeda brasileira, sem arredondamento adicional.
import { formatarMoeda } from './formatar-moeda.js';

export function formatarCentavos(centavos) {
  if (!Number.isSafeInteger(centavos)) return '—';
  return formatarMoeda(centavos / 100);
}
