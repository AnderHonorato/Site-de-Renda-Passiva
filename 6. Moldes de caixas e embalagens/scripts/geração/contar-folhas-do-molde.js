// Conta quantas folhas A4 uma peça de molde vai ocupar na impressão em tamanho real,
// reaproveitando a mesma lógica de divisão usada no PDF (dividir-molde-em-folhas.js, com a
// mesma área de desenho por folha de desenhar-molde-em-pdf.js) — assim o número mostrado
// na tela, antes do download, sempre bate com o número real de páginas do PDF gerado.
// Função pura, em milímetros.
import { dividirMoldeEmFolhas } from './dividir-molde-em-folhas.js';
import { ÁREA_DE_DESENHO_POR_FOLHA } from './desenhar-molde-em-pdf.js';

export function contarFolhasDoMolde(retânguloEnvolvente) {
  const plano = dividirMoldeEmFolhas({ retânguloEnvolvente, ...ÁREA_DE_DESENHO_POR_FOLHA });
  return plano ? plano.folhas.length : 0;
}
