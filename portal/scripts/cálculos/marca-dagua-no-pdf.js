/**
 * Marca d'água no PDF: um texto ou uma imagem carimbados nas páginas, com
 * opacidade, rotação, posição, mosaico e escolha de camada.
 *
 * A marca é conteúdo da página (não anotação), então vale para quem imprime e é
 * mais difícil de tirar por engano. Mas NÃO é à prova de remoção: quem tem um
 * editor de PDF consegue apagá-la. Tudo é calculado na página como a pessoa a
 * vê, com a rotação (/Rotate) e a área visível (CropBox) já consideradas.
 */
import {
  carregarPdf, interpretarPáginas, geometriaDaPágina, paraEspaçoDoPdf, matrizVisualParaPdf, inserirOperadores,
  primeiroCaractereForaDaFonte, CORES, FONTES, mensagemDeErroDoPdfÚnico,
} from './pdf-páginas.js';
import {
  prepararImagem, incorporarImagem, matrizDaImagem, exifTrocaOsLados, compor, mensagemDeErroDaImagem,
} from './imagens-em-pdf.js';

export const LIMITE_DO_TEXTO = 100;
export const TAMANHO_MÍN = 6;
export const TAMANHO_MÁX = 400;
export const ESCALA_MÍN = 5;
export const ESCALA_MÁX = 100;
/** Marcas desenhadas no documento todo no modo mosaico; acima disso o arquivo ficaria pesado demais. */
export const MARCAS_MÁXIMAS_NO_MOSAICO = 100_000;

export const POSIÇÕES = Object.freeze([
  'cima-esquerda', 'cima-centro', 'cima-direita',
  'meio-esquerda', 'meio-centro', 'meio-direita',
  'baixo-esquerda', 'baixo-centro', 'baixo-direita',
]);

export function mensagemDeErroDeMarcaDágua(erro, extras = {}) {
  const mensagens = {
    texto_vazio: 'Escreva o texto da marca d\'água, por exemplo CONFIDENCIAL.',
    texto_longo: `O texto passou de ${LIMITE_DO_TEXTO} caracteres.`,
    texto_caractere: `O caractere "${extras.caractere ?? ''}" não existe na fonte do PDF. Use letras, números e a pontuação comum.`,
    sem_imagem: 'Escolha a imagem da marca d\'água (JPG ou PNG).',
    tipo_inválido: 'Escolha se a marca é um texto ou uma imagem.',
    tamanho_inválido: `O tamanho da letra vai de ${TAMANHO_MÍN} a ${TAMANHO_MÁX}.`,
    escala_inválida: `O tamanho da imagem vai de ${ESCALA_MÍN}% a ${ESCALA_MÁX}% da largura da página.`,
    opacidade_inválida: 'A opacidade vai de 1 a 100.',
    rotação_inválida: 'A rotação vai de -180 a 180 graus.',
    posição_inválida: 'Escolha uma posição da lista.',
    camada_inválida: 'Escolha se a marca fica acima ou abaixo do conteúdo.',
    cor_inválida: 'Escolha uma cor da lista.',
    fonte_inválida: 'Escolha uma fonte da lista.',
    mosaico_pesado: 'O mosaico teria marcas demais e deixaria o arquivo pesado. Aumente o texto ou a imagem, ou marque menos páginas.',
  };
  return mensagens[erro] ?? (erro.startsWith('imagem_') ? mensagemDeErroDaImagem(erro, extras) : mensagemDeErroDoPdfÚnico(erro, extras));
}

/** Caixa que contém a marca depois de girada em `graus`. */
export function caixaGirada(largura, altura, graus) {
  const radianos = (graus * Math.PI) / 180;
  const c = Math.abs(Math.cos(radianos));
  const s = Math.abs(Math.sin(radianos));
  return { largura: largura * c + altura * s, altura: largura * s + altura * c };
}

/**
 * Centros das marcas de uma página no modo mosaico, na página como aparece.
 * As linhas alternadas andam meia célula, como num azulejo.
 * Para quando passa de `máximo` marcas e devolve nulo, para uma página enorme
 * com uma marca minúscula não encher a memória.
 * @returns {{x: number, y: number}[] | null}
 */
export function centrosDoMosaico(largura, altura, caixa, máximo = Infinity) {
  const passoX = caixa.largura * 1.5;
  const passoY = caixa.altura * 1.5;
  const centros = [];
  let linha = 0;
  for (let y = -caixa.altura / 2; y < altura + caixa.altura; y += passoY) {
    const deslocamento = linha % 2 ? passoX / 2 : 0;
    for (let x = -caixa.largura / 2 + deslocamento; x < largura + caixa.largura; x += passoX) {
      centros.push({ x, y });
      if (centros.length > máximo) return null;
    }
    linha++;
  }
  return centros;
}

/** Centro de uma marca única, pela posição escolhida, deixando uma folga da borda. */
export function centroDaMarca(largura, altura, caixa, posição) {
  const folga = 0.04 * Math.min(largura, altura);
  const [vertical, lado] = posição.split('-');
  const x = lado === 'esquerda' ? folga + caixa.largura / 2
    : lado === 'direita' ? largura - folga - caixa.largura / 2
      : largura / 2;
  const y = vertical === 'baixo' ? folga + caixa.altura / 2
    : vertical === 'cima' ? altura - folga - caixa.altura / 2
      : altura / 2;
  return { x, y };
}

/**
 * Carimba o PDF.
 *
 * @param {{nome: string, bytes: Uint8Array}} arquivo
 * @param {{
 *   biblioteca: any, tipo?: 'texto'|'imagem',
 *   texto?: string, fonte?: string, tamanho?: number, cor?: string,
 *   imagem?: {nome: string, bytes: Uint8Array}, escala?: number, converter?: Function,
 *   opacidade?: number, rotação?: number, posição?: string, mosaico?: boolean, camada?: 'acima'|'abaixo', páginas?: string,
 *   aoProgredir?: Function, cancelado?: () => boolean, limiteDePáginas?: number,
 * }} opções
 * @returns {Promise<
 *   {ok: true, bytes: Uint8Array, páginas: number, marcadas: number[], reduzidas: number[], avisos: string[]}
 *   | {ok: false, erro: string, extras?: object}
 * >}
 */
export async function marcarPdf(arquivo, {
  biblioteca, tipo = 'texto', texto = '', fonte = 'helvetica-negrito', tamanho = 60, cor = 'cinza',
  imagem, escala = 40, converter, opacidade = 50, rotação = 45, posição = 'meio-centro', mosaico = false, camada = 'acima',
  páginas = '', aoProgredir, cancelado, limiteDePáginas,
} = {}) {
  // Opções primeiro: recusar barato antes de abrir um PDF de 100 MB.
  if (tipo !== 'texto' && tipo !== 'imagem') return { ok: false, erro: 'tipo_inválido' };
  if (!POSIÇÕES.includes(posição)) return { ok: false, erro: 'posição_inválida' };
  if (camada !== 'acima' && camada !== 'abaixo') return { ok: false, erro: 'camada_inválida' };
  if (!Number.isFinite(opacidade) || opacidade < 1 || opacidade > 100) return { ok: false, erro: 'opacidade_inválida' };
  if (!Number.isFinite(rotação) || rotação < -180 || rotação > 180) return { ok: false, erro: 'rotação_inválida' };
  const marca = String(texto ?? '').normalize('NFC').trim();
  if (tipo === 'texto') {
    if (!(cor in CORES)) return { ok: false, erro: 'cor_inválida' };
    if (!(fonte in FONTES)) return { ok: false, erro: 'fonte_inválida' };
    if (!Number.isFinite(tamanho) || tamanho < TAMANHO_MÍN || tamanho > TAMANHO_MÁX) return { ok: false, erro: 'tamanho_inválido' };
    if (marca === '') return { ok: false, erro: 'texto_vazio' };
    if (marca.length > LIMITE_DO_TEXTO) return { ok: false, erro: 'texto_longo' };
    const fora = primeiroCaractereForaDaFonte(marca);
    if (fora !== null) return { ok: false, erro: 'texto_caractere', extras: { caractere: fora } };
  } else {
    if (!imagem) return { ok: false, erro: 'sem_imagem' };
    if (!Number.isFinite(escala) || escala < ESCALA_MÍN || escala > ESCALA_MÁX) return { ok: false, erro: 'escala_inválida' };
  }

  // A imagem da marca também é conferida antes do PDF: ela é a que mais costuma vir quebrada.
  let preparada;
  if (tipo === 'imagem') {
    preparada = await prepararImagem(imagem, { converter });
    if (!preparada.ok) return preparada;
  }

  const aberto = await carregarPdf(arquivo, { biblioteca, limiteDePáginas });
  if (!aberto.ok) return aberto;
  const { documento, páginas: total } = aberto;
  const faixa = interpretarPáginas(páginas, total);
  if (!faixa.ok) return faixa;

  const { StandardFonts, rgb, degrees, drawText, pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject, setGraphicsState } = biblioteca;
  const alfa = opacidade / 100;
  let fontePdf;
  let imagemPdf;
  if (tipo === 'texto') {
    fontePdf = await documento.embedFont(StandardFonts[FONTES[fonte]]);
  } else {
    const embutida = await incorporarImagem(documento, preparada.imagem);
    if (!embutida.ok) return { ok: false, erro: embutida.erro, extras: { nome: imagem.nome } };
    imagemPdf = embutida.imagem;
  }
  const [r, g, b] = CORES[cor] ?? CORES.preto;

  const marcadas = [];
  const reduzidas = [];
  let desenhadas = 0;
  for (const [vez, índice] of faixa.índices.entries()) {
    if (cancelado?.()) return { ok: false, erro: 'cancelado' };
    const página = documento.getPage(índice);
    const geometria = geometriaDaPágina(página);
    const { largura, altura } = geometria;

    // Tamanho da marca nesta página: o pedido, reduzido se não couber (só em marca única).
    let tamanhoDaLetra = tamanho;
    let larguraDaMarca;
    let alturaDaMarca;
    const medir = (t) => {
      if (tipo === 'texto') {
        larguraDaMarca = fontePdf.widthOfTextAtSize(marca, t);
        alturaDaMarca = fontePdf.heightAtSize(t, { descender: false });
      } else {
        const trocada = exifTrocaOsLados(preparada.imagem.orientação);
        const vistaL = trocada ? preparada.imagem.altura : preparada.imagem.largura;
        const vistaA = trocada ? preparada.imagem.largura : preparada.imagem.altura;
        larguraDaMarca = (largura * t) / 100; // aqui `t` é a escala em %
        alturaDaMarca = (larguraDaMarca * vistaA) / vistaL;
      }
    };
    let medida = tipo === 'texto' ? tamanho : escala;
    medir(medida);
    let caixa = caixaGirada(larguraDaMarca, alturaDaMarca, rotação);
    if (!mosaico) {
      const ajuste = Math.min(1, (0.9 * largura) / caixa.largura, (0.9 * altura) / caixa.altura);
      if (ajuste < 1 - 1e-9) {
        medida *= ajuste;
        if (tipo === 'texto') tamanhoDaLetra = medida;
        medir(medida);
        caixa = caixaGirada(larguraDaMarca, alturaDaMarca, rotação);
        reduzidas.push(índice + 1);
      }
    }

    const centros = mosaico
      ? centrosDoMosaico(largura, altura, caixa, MARCAS_MÁXIMAS_NO_MOSAICO - desenhadas)
      : [centroDaMarca(largura, altura, caixa, posição)];
    if (!centros) return { ok: false, erro: 'mosaico_pesado' };
    desenhadas += centros.length;

    página.node.normalize();
    const estado = alfa < 1
      ? página.node.newExtGState('Marca', documento.context.obj({ Type: 'ExtGState', ca: alfa, CA: alfa }))
      : undefined;
    const radianos = (rotação * Math.PI) / 180;
    const operadores = [];

    if (tipo === 'texto') {
      const nomeDaFonte = página.node.newFontDictionary('Marca', fontePdf.ref);
      const codificado = fontePdf.encodeText(marca);
      for (const { x: cx, y: cy } of centros) {
        // O texto parte do canto inferior esquerdo da caixa, girada em torno do centro.
        const vx = cx - (larguraDaMarca / 2) * Math.cos(radianos) + (alturaDaMarca / 2) * Math.sin(radianos);
        const vy = cy - (larguraDaMarca / 2) * Math.sin(radianos) - (alturaDaMarca / 2) * Math.cos(radianos);
        const { x, y } = paraEspaçoDoPdf(geometria, vx, vy);
        operadores.push(...drawText(codificado, {
          color: rgb(r, g, b), font: nomeDaFonte, size: tamanhoDaLetra,
          rotate: degrees(rotação + geometria.rot), xSkew: degrees(0), ySkew: degrees(0), x, y, graphicsState: estado,
        }));
      }
    } else {
      const nomeDoObjeto = página.node.newXObject('Marca', imagemPdf.ref);
      const base = matrizDaImagem(preparada.imagem.orientação, { x: -larguraDaMarca / 2, y: -alturaDaMarca / 2, largura: larguraDaMarca, altura: alturaDaMarca });
      const giro = [Math.cos(radianos), Math.sin(radianos), -Math.sin(radianos), Math.cos(radianos), 0, 0];
      const paraPdf = matrizVisualParaPdf(geometria);
      for (const { x: cx, y: cy } of centros) {
        const matriz = compor(compor(compor(base, giro), [1, 0, 0, 1, cx, cy]), paraPdf);
        operadores.push(pushGraphicsState());
        if (estado) operadores.push(setGraphicsState(estado));
        operadores.push(concatTransformationMatrix(...matriz), drawObject(nomeDoObjeto), popGraphicsState());
      }
    }
    inserirOperadores(documento, página, operadores, camada);
    marcadas.push(índice + 1);
    aoProgredir?.({ página: vez + 1, total: faixa.índices.length });
    if ((vez + 1) % 20 === 0) await new Promise((resolver) => { setTimeout(resolver, 0); });
  }

  documento.setProducer('Portal de Ferramentas');
  const bytes = await documento.save();
  if (cancelado?.()) return { ok: false, erro: 'cancelado' };

  const avisos = [];
  if (camada === 'abaixo') avisos.push('camada_abaixo');
  if (reduzidas.length) avisos.push('marca_reduzida');
  return { ok: true, bytes, páginas: total, marcadas, reduzidas, avisos };
}
