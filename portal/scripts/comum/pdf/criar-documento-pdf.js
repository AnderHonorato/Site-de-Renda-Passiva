// Gerador mínimo de PDF vetorial, sem dependências, executado no navegador.
// Coordenadas em milímetros a partir do canto superior esquerdo; texto em
// Helvetica/Helvetica-Bold (WinAnsiEncoding, cobre o português). Adequado para
// folhas de atividades, moldes com linhas de corte/dobra e documentos simples.
import { codificarWinAnsi } from './codificar-winansi.js';
import { medirTextoHelvetica } from './medir-texto-helvetica.js';
import { site } from '../../../dados/site.js';

const PONTOS_POR_MM = 72 / 25.4;

function número(valor) {
  const arredondado = Math.round(valor * 1000) / 1000;
  return Object.is(arredondado, -0) ? '0' : String(arredondado);
}

function corPdf(cor) {
  const hexadecimal = /^#([0-9a-f]{6})$/i.exec(String(cor));
  if (!hexadecimal) return '0 0 0';
  const valor = parseInt(hexadecimal[1], 16);
  return [(valor >> 16) & 255, (valor >> 8) & 255, valor & 255].map((canal) => número(canal / 255)).join(' ');
}

function textoPdfEmBytes(bytes) {
  let resultado = '';
  for (const byte of bytes) {
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) resultado += `\\${String.fromCharCode(byte)}`;
    else if (byte < 0x20 || byte > 0x7e) resultado += `\\${byte.toString(8).padStart(3, '0')}`;
    else resultado += String.fromCharCode(byte);
  }
  return resultado;
}

function textoUtf16Hexadecimal(texto) {
  let resultado = 'FEFF';
  for (const caractere of String(texto)) {
    const código = caractere.codePointAt(0);
    if (código > 0xffff) {
      const ajustado = código - 0x10000;
      resultado += (0xd800 + (ajustado >> 10)).toString(16).padStart(4, '0');
      resultado += (0xdc00 + (ajustado & 0x3ff)).toString(16).padStart(4, '0');
    } else {
      resultado += código.toString(16).padStart(4, '0');
    }
  }
  return `<${resultado.toUpperCase()}>`;
}

function bytesJpegValidos(entrada, largura, altura) {
  const bytes = entrada instanceof Uint8Array ? entrada : entrada instanceof ArrayBuffer ? new Uint8Array(entrada) : null;
  if (!bytes || bytes.length < 4 || bytes.length > 20 * 1024 * 1024 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) {
    throw new TypeError('A imagem deve ser um JPEG válido em bytes.');
  }
  if (!Number.isInteger(largura) || !Number.isInteger(altura) || largura < 1 || altura < 1 || largura > 16000 || altura > 16000 || largura * altura > 100_000_000) {
    throw new RangeError('As dimensões do JPEG são inválidas.');
  }
  // Confere as dimensões declaradas no frame JPEG, sem decodificar nem alterar os bytes.
  let índice = 2;
  let dimensõesEncontradas = false;
  while (índice + 3 < bytes.length) {
    if (bytes[índice] !== 0xff) { índice += 1; continue; }
    while (bytes[índice] === 0xff) índice += 1;
    const marcador = bytes[índice++];
    if (marcador === 0xd9 || marcador === 0xda) break;
    if (marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) continue;
    if (índice + 1 >= bytes.length) break;
    const tamanho = bytes[índice] * 256 + bytes[índice + 1];
    if (tamanho < 2 || índice + tamanho > bytes.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marcador)) {
      const alturaReal = bytes[índice + 3] * 256 + bytes[índice + 4];
      const larguraReal = bytes[índice + 5] * 256 + bytes[índice + 6];
      dimensõesEncontradas = larguraReal === largura && alturaReal === altura;
      break;
    }
    índice += tamanho;
  }
  if (!dimensõesEncontradas) throw new TypeError('As dimensões informadas não correspondem ao JPEG.');
  return bytes;
}

export function criarDocumentoPdf({ título = 'Documento', autor = site.autor, largura = 210, altura = 297 } = {}) {
  const páginas = [];
  const imagens = [];
  let atual = null;
  let substituídos = 0;
  const x = (mm) => número(mm * PONTOS_POR_MM);
  const y = (mm) => número((altura - mm) * PONTOS_POR_MM);

  function traço({ espessura = 0.3, tracejado = null, cor = '#000000' } = {}) {
    const padrão = Array.isArray(tracejado) && tracejado.length ? `[${tracejado.map((mm) => número(mm * PONTOS_POR_MM)).join(' ')}] 0 d` : '[] 0 d';
    return `${corPdf(cor)} RG ${número(espessura * PONTOS_POR_MM)} w ${padrão} 1 J 1 j`;
  }

  const api = {
    largura,
    altura,
    novaPágina() {
      atual = [];
      páginas.push(atual);
      return api;
    },
    larguraDoTexto(texto, tamanho = 11, negrito = false) {
      return medirTextoHelvetica(texto, tamanho, negrito) / PONTOS_POR_MM;
    },
    texto(xMm, yMm, conteúdo, { tamanho = 11, negrito = false, contorno = false, cor = '#000000', alinhamento = 'esquerda' } = {}) {
      if (!atual) api.novaPágina();
      const codificado = codificarWinAnsi(conteúdo);
      substituídos += codificado.substituídos;
      const larguraMm = api.larguraDoTexto(conteúdo, tamanho, negrito);
      const deslocamento = alinhamento === 'centro' ? -larguraMm / 2 : alinhamento === 'direita' ? -larguraMm : 0;
      const modo = contorno ? `1 Tr ${corPdf(cor)} RG ${número(0.25 * PONTOS_POR_MM)} w` : `0 Tr ${corPdf(cor)} rg`;
      atual.push(`BT /${negrito ? 'F2' : 'F1'} ${número(tamanho)} Tf ${modo} ${x(xMm + deslocamento)} ${y(yMm)} Td (${textoPdfEmBytes(codificado.bytes)}) Tj ET`);
      return api;
    },
    linha(x1, y1, x2, y2, estilo = {}) {
      if (!atual) api.novaPágina();
      atual.push(`q ${traço(estilo)} ${x(x1)} ${y(y1)} m ${x(x2)} ${y(y2)} l S Q`);
      return api;
    },
    polilinha(pontos, { fechar = false, ...estilo } = {}) {
      if (!atual) api.novaPágina();
      if (!Array.isArray(pontos) || pontos.length < 2) return api;
      const [primeiro, ...demais] = pontos;
      const trajeto = [`${x(primeiro[0])} ${y(primeiro[1])} m`, ...demais.map(([px, py]) => `${x(px)} ${y(py)} l`)].join(' ');
      atual.push(`q ${traço(estilo)} ${trajeto} ${fechar ? 'h ' : ''}S Q`);
      return api;
    },
    retângulo(xMm, yMm, larguraMm, alturaMm, { preenchimento = null, contorno = true, ...estilo } = {}) {
      if (!atual) api.novaPágina();
      const operação = preenchimento && contorno ? 'B' : preenchimento ? 'f' : 'S';
      const cheio = preenchimento ? `${corPdf(preenchimento)} rg ` : '';
      atual.push(`q ${traço(estilo)} ${cheio}${x(xMm)} ${y(yMm + alturaMm)} ${número(larguraMm * PONTOS_POR_MM)} ${número(alturaMm * PONTOS_POR_MM)} re ${operação} Q`);
      return api;
    },
    imagemJpeg(xMm, yMm, larguraMm, alturaMm, entrada, { larguraPixels, alturaPixels } = {}) {
      if (!atual) api.novaPágina();
      if (![xMm, yMm, larguraMm, alturaMm].every(Number.isFinite) || larguraMm <= 0 || alturaMm <= 0) {
        throw new RangeError('A posição e o tamanho da imagem são inválidos.');
      }
      const bytes = bytesJpegValidos(entrada, larguraPixels, alturaPixels);
      const nome = `Im${imagens.length + 1}`;
      imagens.push({ nome, bytes, larguraPixels, alturaPixels });
      atual.push(`q ${número(larguraMm * PONTOS_POR_MM)} 0 0 ${número(alturaMm * PONTOS_POR_MM)} ${x(xMm)} ${y(yMm + alturaMm)} cm /${nome} Do Q`);
      return api;
    },
    caracteresSubstituídos() {
      return substituídos;
    },
    gerarBytes() {
      if (páginas.length === 0) api.novaPágina();
      const objetos = [];
      const totalDePáginas = páginas.length;
      const primeiroObjetoDePágina = 6;
      const primeiroObjetoDeImagem = primeiroObjetoDePágina + totalDePáginas * 2;
      const referênciasDePáginas = páginas.map((_, índice) => `${primeiroObjetoDePágina + índice * 2} 0 R`).join(' ');
      objetos[1] = '<< /Type /Catalog /Pages 2 0 R >>';
      objetos[2] = `<< /Type /Pages /Kids [${referênciasDePáginas}] /Count ${totalDePáginas} >>`;
      objetos[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
      objetos[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
      objetos[5] = `<< /Title ${textoUtf16Hexadecimal(título)} /Author ${textoUtf16Hexadecimal(autor)} /Producer (Gerador local) >>`;
      páginas.forEach((comandos, índice) => {
        const númeroDaPágina = primeiroObjetoDePágina + índice * 2;
        const conteúdo = comandos.join('\n');
        const nomesUsados = new Set(comandos.flatMap((comando) => [...comando.matchAll(/\/(Im\d+) Do/g)].map((correspondência) => correspondência[1])));
        const recursosImagem = imagens.filter((imagem) => nomesUsados.has(imagem.nome)).map((imagem) => `/${imagem.nome} ${primeiroObjetoDeImagem + imagens.indexOf(imagem)} 0 R`).join(' ');
        objetos[númeroDaPágina] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${número(largura * PONTOS_POR_MM)} ${número(altura * PONTOS_POR_MM)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${recursosImagem ? ` /XObject << ${recursosImagem} >>` : ''} >> /Contents ${númeroDaPágina + 1} 0 R >>`;
        objetos[númeroDaPágina + 1] = `<< /Length ${conteúdo.length} >>\nstream\n${conteúdo}\nendstream`;
      });
      imagens.forEach((imagem, índice) => {
        let fluxo = '';
        for (const byte of imagem.bytes) fluxo += String.fromCharCode(byte);
        objetos[primeiroObjetoDeImagem + índice] = `<< /Type /XObject /Subtype /Image /Width ${imagem.larguraPixels} /Height ${imagem.alturaPixels} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imagem.bytes.length} >>\nstream\n${fluxo}\nendstream`;
      });

      let saída = '%PDF-1.4\n%âãÏÓ\n';
      const posições = [];
      for (let número_ = 1; número_ < objetos.length; número_ += 1) {
        posições[número_] = saída.length;
        saída += `${número_} 0 obj\n${objetos[número_]}\nendobj\n`;
      }
      const inícioDaTabela = saída.length;
      saída += `xref\n0 ${objetos.length}\n0000000000 65535 f \n`;
      for (let número_ = 1; número_ < objetos.length; número_ += 1) saída += `${String(posições[número_]).padStart(10, '0')} 00000 n \n`;
      saída += `trailer\n<< /Size ${objetos.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${inícioDaTabela}\n%%EOF\n`;

      const bytes = new Uint8Array(saída.length);
      for (let índice = 0; índice < saída.length; índice += 1) bytes[índice] = saída.charCodeAt(índice) & 0xff;
      return bytes;
    },
  };
  return api;
}
