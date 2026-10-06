/**
 * Trabalhador (Web Worker) que converte os quadros em um GIF.
 *
 * Escolher as cores e comprimir dezenas de quadros pode levar vários segundos. Rodando aqui, a página continua respondendo,
 * mostra o andamento e dá para cancelar: quem chamou ENCERRA o trabalhador (`terminate()`), coisa impossível com uma conta
 * que travou a thread da página.
 *
 * Mensagem recebida:  { largura, altura, quadros: ArrayBuffer[] (RGBA, transferidos), sequência, atrasoCs, repetições, transparência, suavizar }
 * Mensagens devolvidas: { tipo: 'progresso', fração, texto } | { tipo: 'pronto', bytes, coresUsadas, transparente } | { tipo: 'erro', mensagem }
 */
import { gerarGif } from '../../cálculos/criar-gif.js';

self.onmessage = async ({ data }) => {
  try {
    const quadros = data.quadros.map((buffer) => new Uint8ClampedArray(buffer));
    const resultado = await gerarGif({ ...data, quadros }, {
      aoProgredir: (fração, texto) => self.postMessage({ tipo: 'progresso', fração, texto }),
    });
    self.postMessage({ tipo: 'pronto', bytes: resultado.bytes, coresUsadas: resultado.coresUsadas, transparente: resultado.transparente }, [resultado.bytes.buffer]);
  } catch (erro) {
    self.postMessage({ tipo: 'erro', mensagem: String(erro?.message ?? erro) });
  }
};
