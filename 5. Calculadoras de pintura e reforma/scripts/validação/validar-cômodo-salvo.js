// Confere um cômodo (superfícies e aberturas da ferramenta "Área de paredes") salvo ou
// importado antes de aceitá-lo.
const númeroNaFaixa = (valor, mínimo, máximo) => typeof valor === 'number' && Number.isFinite(valor) && valor >= mínimo && valor <= máximo;
const textoNoLimite = (valor, limite) => typeof valor === 'string' && valor.length <= limite;

function superfíciesVálidas(superfícies) {
  return (
    Array.isArray(superfícies) &&
    superfícies.length >= 1 &&
    superfícies.length <= 200 &&
    superfícies.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        item.id.length > 0 &&
        item.id.length <= 60 &&
        textoNoLimite(item.nome ?? '', 80) &&
        númeroNaFaixa(item.largura, 0.01, 1000) &&
        númeroNaFaixa(item.altura, 0.01, 1000),
    )
  );
}

function aberturasVálidas(aberturas, idsDeSuperfícies) {
  return (
    Array.isArray(aberturas) &&
    aberturas.length <= 500 &&
    aberturas.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        idsDeSuperfícies.has(item.superfícieId) &&
        textoNoLimite(item.nome ?? '', 80) &&
        númeroNaFaixa(item.largura, 0.01, 1000) &&
        númeroNaFaixa(item.altura, 0.01, 1000) &&
        typeof item.descontar === 'boolean',
    )
  );
}

export function validarCômodoSalvo(registro) {
  if (registro === null || typeof registro !== 'object') return false;
  if (typeof registro.nome !== 'string' || registro.nome.trim().length < 1 || registro.nome.length > 120) return false;
  if (!superfíciesVálidas(registro.superfícies)) return false;
  const idsDeSuperfícies = new Set(registro.superfícies.map((superfície) => superfície.id));
  if (!aberturasVálidas(registro.aberturas ?? [], idsDeSuperfícies)) return false;
  return true;
}
