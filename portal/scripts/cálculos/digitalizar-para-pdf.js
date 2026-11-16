import { site } from "../../dados/site.js";

/** Geometria e tratamento do scanner. Sem DOM; os pixels são tratados antes de entrar no PDF. */
export const LIMITE_IMAGENS = 20;
export const LIMITE_IMAGEM_BYTES = 10 * 1024 * 1024;
export const LIMITE_TOTAL_BYTES = 60 * 1024 * 1024;
export const LIMITE_PIXELS = 20_000_000;
export const LADO_EXPORTACAO = 3000;

export function ajusteInicial() {
  return {
    giro: 0,
    modo: "cores",
    contraste: 0,
    limiar: 160,
    esquerda: 0,
    direita: 0,
    topo: 0,
    base: 0,
  };
}

export function validarAjuste(ajuste) {
  const a = { ...ajusteInicial(), ...ajuste };
  if (![0, 90, 180, 270].includes(a.giro))
    throw Error("Escolha uma rotação de 0°, 90°, 180° ou 270°.");
  if (!["cores", "cinza", "pb"].includes(a.modo))
    throw Error("Escolha cores, tons de cinza ou preto e branco.");
  for (const lado of ["esquerda", "direita", "topo", "base"]) {
    if (!Number.isFinite(a[lado]) || a[lado] < 0 || a[lado] > 90)
      throw Error("O corte deve ficar entre 0% e 90% em cada lado.");
  }
  if (a.esquerda + a.direita > 95 || a.topo + a.base > 95)
    throw Error(
      "O corte precisa deixar pelo menos 5% da foto em cada direção.",
    );
  if (!Number.isFinite(a.contraste) || a.contraste < -100 || a.contraste > 100)
    throw Error("O contraste deve ficar entre −100 e 100.");
  if (!Number.isFinite(a.limiar) || a.limiar < 0 || a.limiar > 255)
    throw Error("O limiar deve ficar entre 0 e 255.");
  return a;
}

/** Os cortes se referem à foto depois do giro. O mesmo cálculo serve à prévia e à exportação. */
export function geometriaDigitalizacao(
  largura,
  altura,
  ajuste,
  ladoMaximo = LADO_EXPORTACAO,
) {
  const a = validarAjuste(ajuste);
  if (
    ![largura, altura].every((v) => Number.isFinite(v) && v > 0) ||
    !Number.isFinite(ladoMaximo) ||
    ladoMaximo < 1
  )
    throw Error("A imagem não tem dimensões válidas.");
  const troca = a.giro === 90 || a.giro === 270;
  const giradaLargura = troca ? altura : largura,
    giradaAltura = troca ? largura : altura;
  const x = (giradaLargura * a.esquerda) / 100,
    y = (giradaAltura * a.topo) / 100;
  const recorteLargura = (giradaLargura * (100 - a.esquerda - a.direita)) / 100;
  const recorteAltura = (giradaAltura * (100 - a.topo - a.base)) / 100;
  const escala = Math.min(
    1,
    ladoMaximo / Math.max(recorteLargura, recorteAltura),
  );
  return {
    x,
    y,
    giradaLargura,
    giradaAltura,
    recorteLargura,
    recorteAltura,
    largura: Math.max(1, Math.round(recorteLargura * escala)),
    altura: Math.max(1, Math.round(recorteAltura * escala)),
    reduzida: escala < 1,
  };
}

/** RGBA é composto sobre branco. Preto e branco usa o limiar ajustável, sem fingir limpeza por IA. */
export function tratarPixels(pixels, ajuste) {
  const a = validarAjuste(ajuste),
    fator = (259 * (a.contraste + 255)) / (255 * (259 - a.contraste));
  const ajustar = (valor) =>
    Math.max(0, Math.min(255, fator * (valor - 128) + 128));
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] / 255;
    let r = ajustar(pixels[i] * alpha + 255 * (1 - alpha));
    let g = ajustar(pixels[i + 1] * alpha + 255 * (1 - alpha));
    let b = ajustar(pixels[i + 2] * alpha + 255 * (1 - alpha));
    if (a.modo !== "cores") {
      let cinza = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (a.modo === "pb") cinza = cinza >= a.limiar ? 255 : 0;
      r = g = b = cinza;
    }
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = 255;
  }
  return pixels;
}

export function encaixeDaPagina(largura, altura, tamanho = "a4") {
  if (![largura, altura].every((v) => Number.isFinite(v) && v > 0))
    throw Error("Não foi possível medir a página.");
  if (!["a4", "a4-auto", "adaptar"].includes(tamanho))
    throw Error("Escolha um tamanho de página válido.");
  if (tamanho === "adaptar") {
    // 150 pixels por polegada: tamanho previsível, preservando a proporção da imagem.
    return {
      largura: (largura * 72) / 150,
      altura: (altura * 72) / 150,
      x: 0,
      y: 0,
      imagemLargura: (largura * 72) / 150,
      imagemAltura: (altura * 72) / 150,
    };
  }
  const paisagem = tamanho === "a4-auto" && largura > altura;
  const w = paisagem ? 841.89 : 595.28,
    h = paisagem ? 595.28 : 841.89;
  const fator = Math.min((w - 36) / largura, (h - 36) / altura);
  return {
    largura: w,
    altura: h,
    x: (w - largura * fator) / 2,
    y: (h - altura * fator) / 2,
    imagemLargura: largura * fator,
    imagemAltura: altura * fator,
  };
}

/** Renderiza e incorpora uma foto por vez: não mantém vinte imagens decodificadas na memória. */
export async function gerarPdfDigitalizado(
  paginas,
  {
    biblioteca,
    renderizar,
    tamanho = "a4",
    cancelado = () => false,
    aoProgredir = () => {},
  } = {},
) {
  if (!Array.isArray(paginas) || !paginas.length)
    throw Error("Adicione pelo menos uma foto para criar o PDF.");
  if (paginas.length > LIMITE_IMAGENS)
    throw Error(`O limite é de ${LIMITE_IMAGENS} fotos por PDF.`);
  const doc = await biblioteca.PDFDocument.create();
  doc.setTitle("Documentos digitalizados");
  doc.setCreator(site.nome);
  for (let i = 0; i < paginas.length; i++) {
    if (cancelado()) {
      const e = Error(
        "Digitalização cancelada. Suas fotos continuam na lista.",
      );
      e.cancelado = true;
      throw e;
    }
    const imagem = await renderizar(paginas[i]);
    if (cancelado()) {
      const e = Error(
        "Digitalização cancelada. Suas fotos continuam na lista.",
      );
      e.cancelado = true;
      throw e;
    }
    const medida = encaixeDaPagina(imagem.largura, imagem.altura, tamanho);
    const jpg = await doc.embedJpg(imagem.bytes);
    doc
      .addPage([medida.largura, medida.altura])
      .drawImage(jpg, {
        x: medida.x,
        y: medida.y,
        width: medida.imagemLargura,
        height: medida.imagemAltura,
      });
    aoProgredir({ pagina: i + 1, total: paginas.length });
  }
  const bytes = await doc.save();
  if (cancelado()) {
    const e = Error("Digitalização cancelada. Suas fotos continuam na lista.");
    e.cancelado = true;
    throw e;
  }
  if (bytes.length > 60 * 1024 * 1024)
    throw Error(
      "O PDF ficou grande demais para este navegador. Use menos fotos ou a qualidade compacta.",
    );
  return bytes;
}
