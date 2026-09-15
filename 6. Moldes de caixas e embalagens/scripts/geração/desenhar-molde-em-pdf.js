// Desenha uma peça de molde (segmentos de corte/dobra + retângulo envolvente) dentro de um
// documento PDF já criado (criar-documento-pdf.js), em tamanho real (1:1 em mm). Se a peça
// não couber na área útil de uma folha A4, divide automaticamente em várias folhas
// numeradas com faixa de sobreposição marcada — nunca reduz a escala. Cada folha recebe
// título, legenda (corte contínuo × dobra tracejada, distinguíveis mesmo em preto e
// branco), aviso de impressão em 100% e o quadrado de calibração de 50 mm. Efeito
// colateral sobre "documento": não é uma função pura, mas fica isolada e testável (o PDF
// resultante é conferido nos testes por leitura dos bytes).
import { dividirMoldeEmFolhas } from './dividir-molde-em-folhas.js';
import { recortarSegmentoEmRetângulo } from './recortar-segmento-em-retângulo.js';
import { desenharCalibraçãoEmPdf } from './desenhar-calibração-em-pdf.js';

const LARGURA_PÁGINA_MM = 210;
const ALTURA_PÁGINA_MM = 297;
const MARGEM_MM = 10;
const CABEÇALHO_MM = 26;
const RODAPÉ_MM = 68;
const SOBREPOSIÇÃO_MM = 12;

const TOPO_DO_DESENHO_MM = MARGEM_MM + CABEÇALHO_MM;
const BASE_DO_DESENHO_MM = ALTURA_PÁGINA_MM - MARGEM_MM - RODAPÉ_MM;
const LARGURA_ÚTIL_MM = LARGURA_PÁGINA_MM - 2 * MARGEM_MM;
const ALTURA_ÚTIL_MM = BASE_DO_DESENHO_MM - TOPO_DO_DESENHO_MM;

function desenharCabeçalho(documento, { títuloDaPeça, folha, plano }) {
  documento.texto(MARGEM_MM, MARGEM_MM + 6, títuloDaPeça, { tamanho: 13, negrito: true });
  documento.texto(MARGEM_MM, MARGEM_MM + 12, 'Imprima em 100% (tamanho real), sem ajustar à página.', { tamanho: 9, cor: '#444444' });
  if (plano.folhas.length > 1) {
    documento.texto(MARGEM_MM, MARGEM_MM + 17, `Folha ${folha.número} de ${plano.folhas.length} — recorte e sobreponha a faixa cinza para montar as folhas.`, { tamanho: 9, cor: '#444444' });
  }
  // Legenda: amostra de corte (linha contínua) e de dobra (linha tracejada).
  const yLegenda = MARGEM_MM + CABEÇALHO_MM - 4;
  documento.linha(MARGEM_MM, yLegenda, MARGEM_MM + 10, yLegenda, { espessura: 0.35, cor: '#000000' });
  documento.texto(MARGEM_MM + 12, yLegenda + 1.5, 'Corte', { tamanho: 8 });
  documento.linha(MARGEM_MM + 30, yLegenda, MARGEM_MM + 40, yLegenda, { espessura: 0.3, cor: '#000000', tracejado: [1.4, 1] });
  documento.texto(MARGEM_MM + 42, yLegenda + 1.5, 'Dobra', { tamanho: 8 });
}

function desenharFaixaDeSobreposição(documento, folha, plano) {
  const cor = '#dddddd';
  if (folha.coluna < plano.colunas - 1) {
    const xMm = MARGEM_MM + folha.larguraMm - SOBREPOSIÇÃO_MM;
    documento.retângulo(xMm, TOPO_DO_DESENHO_MM, SOBREPOSIÇÃO_MM, folha.alturaMm, { preenchimento: cor, contorno: false });
    documento.texto(xMm + 1, TOPO_DO_DESENHO_MM + folha.alturaMm / 2, `→ folha ${folha.número + 1}`, { tamanho: 7, cor: '#777777' });
  }
  if (folha.linha < plano.linhas - 1) {
    const yMm = TOPO_DO_DESENHO_MM + folha.alturaMm - SOBREPOSIÇÃO_MM;
    documento.retângulo(MARGEM_MM, yMm, folha.larguraMm, SOBREPOSIÇÃO_MM, { preenchimento: cor, contorno: false });
    documento.texto(MARGEM_MM + 1, yMm + SOBREPOSIÇÃO_MM - 1.5, `↓ folha ${folha.número + plano.colunas}`, { tamanho: 7, cor: '#777777' });
  }
}

export function desenharMoldeEmPdf(documento, { segmentosDeCorte, segmentosDeDobra, retânguloEnvolvente, títuloDaPeça }) {
  const plano = dividirMoldeEmFolhas({ retânguloEnvolvente, larguraÚtilMm: LARGURA_ÚTIL_MM, alturaÚtilMm: ALTURA_ÚTIL_MM, sobreposiçãoMm: SOBREPOSIÇÃO_MM });
  if (!plano) return documento;

  for (const folha of plano.folhas) {
    documento.novaPágina();
    desenharCabeçalho(documento, { títuloDaPeça, folha, plano });
    if (plano.folhas.length > 1) desenharFaixaDeSobreposição(documento, folha, plano);

    const janela = { x: folha.x, y: folha.y, larguraMm: folha.larguraMm, alturaMm: folha.alturaMm };
    const desenharGrupo = (segmentos, estilo) => {
      for (const segmento of segmentos) {
        const recortado = recortarSegmentoEmRetângulo(segmento, janela);
        if (!recortado) continue;
        documento.linha(
          MARGEM_MM + (recortado.x1 - folha.x),
          TOPO_DO_DESENHO_MM + (recortado.y1 - folha.y),
          MARGEM_MM + (recortado.x2 - folha.x),
          TOPO_DO_DESENHO_MM + (recortado.y2 - folha.y),
          estilo,
        );
      }
    };
    desenharGrupo(segmentosDeDobra, { espessura: 0.3, cor: '#000000', tracejado: [1.4, 1] });
    desenharGrupo(segmentosDeCorte, { espessura: 0.35, cor: '#000000' });

    desenharCalibraçãoEmPdf(documento, MARGEM_MM, BASE_DO_DESENHO_MM + 8);
  }
  return documento;
}

// Nomes iguais aos parâmetros de dividirMoldeEmFolhas, para poder ser espalhado
// diretamente: dividirMoldeEmFolhas({ retânguloEnvolvente, ...ÁREA_DE_DESENHO_POR_FOLHA }).
export const ÁREA_DE_DESENHO_POR_FOLHA = { larguraÚtilMm: LARGURA_ÚTIL_MM, alturaÚtilMm: ALTURA_ÚTIL_MM };
