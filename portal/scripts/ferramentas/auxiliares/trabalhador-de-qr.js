/**
 * Trabalhador (Web Worker) que procura QR Codes nos pixels de uma imagem com a jsQR.
 *
 * A jsQR é síncrona e pode levar minutos numa imagem com muito ruído ou textura. Rodando aqui, a página
 * continua respondendo, e quem chamou pode ENCERRAR o trabalhador quando o prazo estoura (`terminate()`),
 * coisa impossível com uma chamada que travou a thread da página.
 *
 * Mensagem recebida:  { largura, altura, buffer }  (buffer: ArrayBuffer RGBA, transferido)
 * Mensagem devolvida: { ok: true, achados: [{texto}] }  ou  { ok: false, erro }
 */
import { procurarCódigos, textoDoAchado } from '../../cálculos/scanner-de-qr-code.js';

let jsQR;

self.onmessage = async ({ data }) => {
  try {
    if (!jsQR) {
      // A jsQR é um arquivo UMD: ao ser importado como módulo, ela se registra em `self.jsQR`.
      await import('../../../recursos/jsQR.js');
      jsQR = self.jsQR;
    }
    const imagem = { data: new Uint8ClampedArray(data.buffer), width: data.largura, height: data.altura };
    const achados = procurarCódigos(imagem, (pixels, largura, altura) => {
      const achado = jsQR(pixels, largura, altura, { inversionAttempts: 'attemptBoth' });
      return achado ? { data: textoDoAchado(achado), location: achado.location } : null;
    });
    self.postMessage({ ok: true, achados: achados.map((a) => ({ texto: a.texto })) });
  } catch (erro) {
    self.postMessage({ ok: false, erro: String(erro?.message ?? erro) });
  }
};
