/**
 * Assinar PDF: uma assinatura DESENHADA, DIGITADA ou em IMAGEM colocada na página, com data
 * e legenda opcionais.
 *
 * ATENÇÃO: isto NÃO é assinatura digital com certificado (como a do ICP-Brasil). É só uma
 * marca visual no papel digital: não prova quem assinou, não detecta alteração posterior
 * no documento e pode não ter o valor que quem recebe exige. A assinatura com certificado
 * é outra coisa, e não está nesta ferramenta.
 *
 * A assinatura entra como conteúdo da página: o traço desenhado e o texto digitado são
 * vetores (nítidos em qualquer zoom); a imagem entra como imagem. Tudo é calculado na
 * página como a pessoa a vê, com a rotação (/Rotate) e a área visível (CropBox) consideradas.
 * A posição e o tamanho são frações da página, por isso valem igual em páginas de tamanhos
 * diferentes. Sem DOM: a pdf-lib entra por parâmetro.
 */
import {
  carregarPdf, interpretarPáginas, geometriaDaPágina, matrizVisualParaPdf, inserirOperadores, primeiroCaractereForaDaFonte,
  mensagemDeErroDoPdfÚnico, textoDePáginas,
} from './pdf-páginas.js';
import {
  prepararImagem, incorporarImagem, matrizDaImagem, exifTrocaOsLados, mensagemDeErroDaImagem,
} from './imagens-em-pdf.js';

export const LARGURA_MÍN = 5;
export const LARGURA_MÁX = 80;
export const LIMITE_DO_TEXTO = 60;
export const LIMITE_DA_LEGENDA = 100;
export const LIMITE_DE_TRAÇOS = 300;
export const LIMITE_DE_PONTOS = 30_000;
/** Pontos de PDF entre a assinatura e a margem de segurança: nenhuma assinatura passa de metade da altura da página. */
export const ALTURA_MÁXIMA_DA_ASSINATURA = 0.5;

/** Tintas da assinatura desenhada e digitada (valores de 0 a 1). */
export const TINTAS = Object.freeze({
  preto: [0.05, 0.05, 0.05],
  azul: [0.05, 0.15, 0.6],
  vermelho: [0.75, 0.1, 0.1],
  verde: [0.1, 0.45, 0.2],
});

/** Fontes inclinadas, que parecem escrita à mão sem precisar de arquivo de fonte (nenhuma fonte nova no portal). */
export const FONTES_DA_ASSINATURA = Object.freeze({
  'times-itálico': 'TimesRomanItalic',
  'times-negrito-itálico': 'TimesRomanBoldItalic',
  'helvetica-itálico': 'HelveticaOblique',
  'courier-itálico': 'CourierOblique',
});

export const TIPOS = Object.freeze(['desenho', 'texto', 'imagem']);

export function mensagemDeErroDeAssinatura(erro, extras = {}) {
  const mensagens = {
    tipo_inválido: 'Escolha como assinar: desenhando, digitando ou com uma imagem.',
    desenho_vazio: 'Desenhe a assinatura no quadro antes de assinar.',
    desenho_inválido: 'O desenho da assinatura não é válido. Limpe o quadro e desenhe de novo.',
    desenho_grande: `O desenho tem traços demais (o limite é ${LIMITE_DE_TRAÇOS} traços e ${LIMITE_DE_PONTOS.toLocaleString('pt-BR')} pontos). Limpe o quadro e desenhe de novo, mais simples.`,
    texto_vazio: 'Digite o texto da assinatura, por exemplo o seu nome.',
    texto_longo: `O texto da assinatura passou de ${LIMITE_DO_TEXTO} caracteres.`,
    texto_caractere: `O caractere "${extras.caractere ?? ''}" não existe na fonte do PDF. Use letras, números e a pontuação comum.`,
    legenda_longa: `O texto abaixo da assinatura passou de ${LIMITE_DA_LEGENDA} caracteres.`,
    legenda_caractere: `O caractere "${extras.caractere ?? ''}" do texto abaixo da assinatura não existe na fonte do PDF. Use letras, números e a pontuação comum.`,
    sem_imagem: 'Escolha a imagem da assinatura (JPG ou PNG).',
    largura_inválida: `A largura da assinatura vai de ${LARGURA_MÍN}% a ${LARGURA_MÁX}% da largura da página.`,
    posição_inválida: 'A posição da assinatura precisa ficar entre 0% e 100% da página.',
    cor_inválida: 'Escolha uma cor da lista.',
    fonte_inválida: 'Escolha um estilo de letra da lista.',
  };
  return mensagens[erro] ?? (erro.startsWith('imagem_') ? mensagemDeErroDaImagem(erro, extras) : mensagemDeErroDoPdfÚnico(erro, extras));
}

/** "última" e "primeira" valem como números; o resto é a faixa de páginas de sempre. */
export function faixaComPalavras(texto, total) {
  return String(texto ?? '')
    .replace(/(?<![\p{L}])(última|ultima)(?![\p{L}])/giu, String(total))
    .replace(/(?<![\p{L}])primeira(?![\p{L}])/giu, '1');
}

/**
 * Confere e mede um desenho: lista de traços, cada um uma lista de pontos [x, y] no espaço do quadro de desenho (y para baixo).
 * @returns {{ok: true, traços: number[][][], caixa: {minX: number, minY: number, largura: number, altura: number}} | {ok: false, erro: string}}
 */
export function medirDesenho(traços, espessura = 2.5) {
  if (!Array.isArray(traços) || traços.length === 0) return { ok: false, erro: 'desenho_vazio' };
  if (traços.length > LIMITE_DE_TRAÇOS) return { ok: false, erro: 'desenho_grande' };
  let pontos = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const limpos = [];
  for (const traço of traços) {
    if (!Array.isArray(traço)) return { ok: false, erro: 'desenho_inválido' };
    const limpo = [];
    for (const ponto of traço) {
      if (!Array.isArray(ponto) || ponto.length < 2 || !Number.isFinite(ponto[0]) || !Number.isFinite(ponto[1])) return { ok: false, erro: 'desenho_inválido' };
      limpo.push([ponto[0], ponto[1]]);
      minX = Math.min(minX, ponto[0]); maxX = Math.max(maxX, ponto[0]);
      minY = Math.min(minY, ponto[1]); maxY = Math.max(maxY, ponto[1]);
    }
    pontos += limpo.length;
    if (pontos > LIMITE_DE_PONTOS) return { ok: false, erro: 'desenho_grande' };
    if (limpo.length) limpos.push(limpo);
  }
  if (limpos.length === 0 || pontos < 2) return { ok: false, erro: 'desenho_vazio' };
  const folga = espessura;
  const largura = Math.max(maxX - minX, 1) + 2 * folga;
  const altura = Math.max(maxY - minY, 1) + 2 * folga;
  // Um risco só horizontal ou só vertical não é assinatura: some em silêncio se for menor que a espessura da caneta.
  if (maxX - minX < espessura && maxY - minY < espessura) return { ok: false, erro: 'desenho_vazio' };
  return { ok: true, traços: limpos, caixa: { minX: minX - folga, minY: minY - folga, maxY: maxY + folga, largura, altura } };
}

/**
 * Largura ÷ altura de um texto digitado, com as medidas da fonte do PDF. A tela usa para
 * desenhar a prévia no mesmo formato que o arquivo terá.
 * @returns {Promise<number>}
 */
export async function proporçãoDoTexto(biblioteca, texto, fonte = 'times-itálico') {
  const documento = await biblioteca.PDFDocument.create();
  const f = await documento.embedFont(biblioteca.StandardFonts[FONTES_DA_ASSINATURA[fonte] ?? FONTES_DA_ASSINATURA['times-itálico']]);
  return f.widthOfTextAtSize(texto || ' ', 100) / f.heightAtSize(100, { descender: true });
}

function temAssinaturaDigital(documento, b) {
  try {
    return documento.getForm().getFields().some((c) => c instanceof b.PDFSignature && c.acroField.dict.has(b.PDFName.of('V')));
  } catch {
    return false;
  }
}

/**
 * Assina o PDF.
 *
 * @param {{nome: string, bytes: Uint8Array}} arquivo
 * @param {{
 *   biblioteca: any,
 *   assinatura: {tipo: 'desenho', traços: number[][][], espessura?: number}
 *     | {tipo: 'texto', texto: string, fonte?: string}
 *     | {tipo: 'imagem', imagem: {nome: string, bytes: Uint8Array}, converter?: Function, fundoTransparente?: boolean},
 *   cor?: string, esquerda?: number, topo?: number, largura?: number, páginas?: string,
 *   legenda?: string, data?: string,
 *   aoProgredir?: Function, cancelado?: () => boolean,
 * }} opções `esquerda`, `topo` e `largura` são porcentagens da página como aparece (o canto superior esquerdo da assinatura)
 * @returns {Promise<
 *   {ok: true, bytes: Uint8Array, páginas: number, assinadas: number[], ajustadas: number[], avisos: string[]}
 *   | {ok: false, erro: string, extras?: object}
 * >}
 */
export async function assinarPdf(arquivo, {
  biblioteca, assinatura, cor = 'preto', esquerda = 60, topo = 80, largura = 25, páginas = '', legenda = '', data = '',
  aoProgredir, cancelado,
} = {}) {
  // Opções primeiro: recusar barato antes de abrir um PDF de 100 MB.
  const tipo = assinatura?.tipo;
  if (!TIPOS.includes(tipo)) return { ok: false, erro: 'tipo_inválido' };
  if (!(cor in TINTAS)) return { ok: false, erro: 'cor_inválida' };
  if (!Number.isFinite(largura) || largura < LARGURA_MÍN || largura > LARGURA_MÁX) return { ok: false, erro: 'largura_inválida' };
  if (![esquerda, topo].every((n) => Number.isFinite(n) && n >= 0 && n <= 100)) return { ok: false, erro: 'posição_inválida' };
  const linhaDeBaixo = [String(legenda ?? '').normalize('NFC').trim(), String(data ?? '').normalize('NFC').trim()].filter(Boolean).join('  ·  ');
  if (String(legenda ?? '').trim().length > LIMITE_DA_LEGENDA || String(data ?? '').trim().length > LIMITE_DA_LEGENDA) return { ok: false, erro: 'legenda_longa' };
  const foraDaLegenda = primeiroCaractereForaDaFonte(linhaDeBaixo);
  if (foraDaLegenda !== null) return { ok: false, erro: 'legenda_caractere', extras: { caractere: foraDaLegenda } };

  let desenho;
  let textoDaAssinatura = '';
  let preparada;
  if (tipo === 'desenho') {
    desenho = medirDesenho(assinatura.traços, assinatura.espessura ?? 2.5);
    if (!desenho.ok) return desenho;
  } else if (tipo === 'texto') {
    textoDaAssinatura = String(assinatura.texto ?? '').normalize('NFC').trim();
    if (!((assinatura.fonte ?? 'times-itálico') in FONTES_DA_ASSINATURA)) return { ok: false, erro: 'fonte_inválida' };
    if (textoDaAssinatura === '') return { ok: false, erro: 'texto_vazio' };
    if (textoDaAssinatura.length > LIMITE_DO_TEXTO) return { ok: false, erro: 'texto_longo' };
    const fora = primeiroCaractereForaDaFonte(textoDaAssinatura);
    if (fora !== null) return { ok: false, erro: 'texto_caractere', extras: { caractere: fora } };
  } else {
    if (!assinatura.imagem) return { ok: false, erro: 'sem_imagem' };
    preparada = await prepararImagem(assinatura.imagem, { converter: assinatura.converter });
    if (!preparada.ok) return preparada;
  }

  const aberto = await carregarPdf(arquivo, { biblioteca });
  if (!aberto.ok) return aberto;
  const { documento, páginas: total } = aberto;
  const faixa = interpretarPáginas(faixaComPalavras(páginas, total), total);
  if (!faixa.ok) return faixa;

  const b = biblioteca;
  const { StandardFonts, rgb, pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawText, drawObject, setGraphicsState } = b;
  const { moveTo, lineTo, stroke, setLineWidth, setLineCap, setLineJoin, setStrokingColor, LineCapStyle, LineJoinStyle } = b;
  const tinta = TINTAS[cor];

  // Tamanho natural da assinatura (a proporção que ela sempre mantém).
  let fonteDaAssinatura;
  let proporção; // largura ÷ altura da parte da assinatura
  let imagemPdf;
  if (tipo === 'desenho') {
    proporção = desenho.caixa.largura / desenho.caixa.altura;
  } else if (tipo === 'texto') {
    fonteDaAssinatura = await documento.embedFont(StandardFonts[FONTES_DA_ASSINATURA[assinatura.fonte ?? 'times-itálico']]);
    proporção = fonteDaAssinatura.widthOfTextAtSize(textoDaAssinatura, 100) / fonteDaAssinatura.heightAtSize(100, { descender: true });
  } else {
    const trocada = exifTrocaOsLados(preparada.imagem.orientação);
    const vistaL = trocada ? preparada.imagem.altura : preparada.imagem.largura;
    const vistaA = trocada ? preparada.imagem.largura : preparada.imagem.altura;
    proporção = vistaL / vistaA;
    const embutida = await incorporarImagem(documento, preparada.imagem);
    if (!embutida.ok) return { ok: false, erro: embutida.erro, extras: { nome: assinatura.imagem.nome } };
    imagemPdf = embutida.imagem;
  }
  const fonteDaLinha = linhaDeBaixo ? await documento.embedFont(StandardFonts.Helvetica) : null;

  const assinadas = [];
  const ajustadas = [];
  for (const [vez, índice] of faixa.índices.entries()) {
    if (cancelado?.()) return { ok: false, erro: 'cancelado' };
    const página = documento.getPage(índice);
    const g = geometriaDaPágina(página);

    // Tamanho nesta página: o pedido; se a assinatura ficaria alta demais, ela encolhe mantendo a proporção.
    let w = (g.largura * largura) / 100;
    let h = w / proporção;
    if (h > g.altura * ALTURA_MÁXIMA_DA_ASSINATURA) {
      h = g.altura * ALTURA_MÁXIMA_DA_ASSINATURA;
      w = h * proporção;
      ajustadas.push(índice + 1);
    }
    const tamanhoDaLinha = fonteDaLinha ? Math.min(Math.max(h * 0.28, 7), 12) : 0;
    const alturaDaLinha = fonteDaLinha ? tamanhoDaLinha * 1.4 : 0;
    let larguraDaLinha = fonteDaLinha ? fonteDaLinha.widthOfTextAtSize(linhaDeBaixo, tamanhoDaLinha) : 0;
    let tamanhoFinalDaLinha = tamanhoDaLinha;
    // A linha de baixo nunca passa da largura da assinatura nem da página: encolhe a letra.
    const larguraDisponível = Math.min(Math.max(w, g.largura * 0.3), g.largura);
    if (larguraDaLinha > larguraDisponível) {
      tamanhoFinalDaLinha = (tamanhoDaLinha * larguraDisponível) / larguraDaLinha;
      larguraDaLinha = larguraDisponível;
    }
    const largTotal = Math.max(w, larguraDaLinha);
    const altTotal = h + alturaDaLinha;

    // Canto superior esquerdo pedido, sem sair da página.
    let vx = (g.largura * esquerda) / 100;
    let vyTopo = g.altura - (g.altura * topo) / 100;
    const vxAntes = vx;
    const vyAntes = vyTopo;
    vx = Math.min(Math.max(vx, 0), Math.max(g.largura - largTotal, 0));
    vyTopo = Math.min(Math.max(vyTopo, altTotal), g.altura);
    if (Math.abs(vx - vxAntes) > 1e-6 || Math.abs(vyTopo - vyAntes) > 1e-6) ajustadas.push(índice + 1);
    const vyBase = vyTopo - altTotal;
    // A assinatura em si fica em cima; a linha de baixo, por baixo dela.
    const caixaDaAssinatura = { x: vx + (largTotal - w) / 2, y: vyBase + alturaDaLinha, largura: w, altura: h };
    const paraPdf = matrizVisualParaPdf(g);

    página.node.normalize();
    const operadores = [pushGraphicsState(), concatTransformationMatrix(...paraPdf)];

    if (tipo === 'desenho') {
      const espessura = assinatura.espessura ?? 2.5;
      const escala = w / desenho.caixa.largura;
      operadores.push(
        pushGraphicsState(),
        concatTransformationMatrix(escala, 0, 0, escala, caixaDaAssinatura.x, caixaDaAssinatura.y),
        setStrokingColor(rgb(...tinta)), setLineWidth(espessura), setLineCap(LineCapStyle.Round), setLineJoin(LineJoinStyle.Round),
      );
      for (const traço of desenho.traços) {
        const converte = ([x, y]) => [x - desenho.caixa.minX, desenho.caixa.maxY - y];
        const [x0, y0] = converte(traço[0]);
        operadores.push(moveTo(x0, y0));
        // Um ponto só (toque sem arrasto) vira um pontinho: o traço de comprimento zero com ponta redonda.
        if (traço.length === 1) operadores.push(lineTo(x0 + 0.01, y0));
        for (const ponto of traço.slice(1)) {
          const [x, y] = converte(ponto);
          operadores.push(lineTo(x, y));
        }
        operadores.push(stroke());
      }
      operadores.push(popGraphicsState());
    } else if (tipo === 'texto') {
      const tamanho = (w / fonteDaAssinatura.widthOfTextAtSize(textoDaAssinatura, 100)) * 100;
      const nomeDaFonte = página.node.newFontDictionary('Assinatura', fonteDaAssinatura.ref);
      const descida = fonteDaAssinatura.heightAtSize(tamanho, { descender: true }) - fonteDaAssinatura.heightAtSize(tamanho, { descender: false });
      operadores.push(...drawText(fonteDaAssinatura.encodeText(textoDaAssinatura), {
        color: rgb(...tinta), font: nomeDaFonte, size: tamanho, rotate: b.degrees(0), xSkew: b.degrees(0), ySkew: b.degrees(0),
        x: caixaDaAssinatura.x, y: caixaDaAssinatura.y + descida,
      }));
    } else {
      const nomeDoObjeto = página.node.newXObject('Assinatura', imagemPdf.ref);
      // Multiplicar faz o branco da imagem sumir sobre o papel: assinatura escaneada sem recorte fica sem a caixa branca.
      const estado = assinatura.fundoTransparente !== false
        ? página.node.newExtGState('AssinaturaMultiplicar', documento.context.obj({ Type: 'ExtGState', BM: 'Multiply' }))
        : null;
      const matriz = matrizDaImagem(preparada.imagem.orientação, caixaDaAssinatura);
      operadores.push(pushGraphicsState());
      if (estado) operadores.push(setGraphicsState(estado));
      operadores.push(concatTransformationMatrix(...matriz), drawObject(nomeDoObjeto), popGraphicsState());
    }

    if (fonteDaLinha) {
      const nomeDaFonteDaLinha = página.node.newFontDictionary('AssinaturaLinha', fonteDaLinha.ref);
      operadores.push(...drawText(fonteDaLinha.encodeText(linhaDeBaixo), {
        color: rgb(...tinta), font: nomeDaFonteDaLinha, size: tamanhoFinalDaLinha, rotate: b.degrees(0), xSkew: b.degrees(0), ySkew: b.degrees(0),
        x: vx + (largTotal - larguraDaLinha) / 2, y: vyBase + tamanhoFinalDaLinha * 0.3,
      }));
    }
    operadores.push(popGraphicsState());
    inserirOperadores(documento, página, operadores, 'acima');
    assinadas.push(índice + 1);
    aoProgredir?.({ página: vez + 1, total: faixa.índices.length });
    if ((vez + 1) % 20 === 0) await new Promise((resolver) => { setTimeout(resolver, 0); });
  }

  const avisos = [];
  if (temAssinaturaDigital(documento, b)) avisos.push('assinatura_existente');
  if (ajustadas.length) avisos.push('assinatura_ajustada');
  documento.setProducer('Portal de Ferramentas');
  const bytes = await documento.save();
  if (cancelado?.()) return { ok: false, erro: 'cancelado' };
  return { ok: true, bytes, páginas: total, assinadas, ajustadas: [...new Set(ajustadas)], avisos };
}

export { textoDePáginas };
