import { Worker } from 'node:worker_threads';
import { ErroProfissional } from './comum.mjs';

let ativos = 0;
const usuariosAtivos = new Set();
export class ErroExecucaoProfissional extends Error {
  constructor(mensagem, status = 503) { super(mensagem); this.name = 'ErroExecucaoProfissional'; this.status = status; }
}

export function executarProfissional(slug, dados, { usuario, signal, prazoMs = 15000 } = {}) {
  if (ativos >= 2 || usuariosAtivos.has(usuario)) {
    return Promise.reject(new ErroExecucaoProfissional('Há análises em execução. Aguarde a conclusão e tente novamente.', 429));
  }
  if (signal?.aborted) return Promise.reject(new ErroExecucaoProfissional('Análise cancelada.', 499));
  ativos += 1;
  usuariosAtivos.add(usuario);
  return new Promise((resolve, reject) => {
    let terminou = false, timer, worker;
    const concluir = (erro, valor) => {
      if (terminou) return;
      terminou = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancelar);
      // A vaga só é devolvida quando a thread realmente termina, inclusive ao cancelar.
      Promise.resolve(worker?.terminate()).catch(() => {}).finally(() => {
        ativos -= 1;
        usuariosAtivos.delete(usuario);
        if (erro) reject(erro); else resolve(valor);
      });
    };
    const cancelar = () => concluir(new ErroExecucaoProfissional('Análise cancelada.', 499));
    try {
      worker = new Worker(new URL('./trabalhador.mjs', import.meta.url), {
        workerData: { slug, dados },
        resourceLimits: { maxOldGenerationSizeMb: 128, stackSizeMb: 4 },
        // O processo de testes pode usar flags incompatíveis com arquivos de workers.
        execArgv: [],
      });
      timer = setTimeout(() => concluir(new ErroExecucaoProfissional('A análise excedeu 15 segundos. Reduza o lote e tente novamente.')), prazoMs);
      signal?.addEventListener('abort', cancelar, { once: true });
      worker.once('message', mensagem => {
        if (mensagem.relatorio) concluir(null, mensagem.relatorio);
        else if (mensagem.erro === 'ErroProfissional') concluir(new ErroProfissional(mensagem.mensagem));
        else concluir(new ErroExecucaoProfissional('Não foi possível concluir esta análise. Revise os dados e tente novamente.'));
      });
      worker.once('error', () => concluir(new ErroExecucaoProfissional('A análise ultrapassou os recursos disponíveis. Reduza o lote.')));
      worker.once('exit', () => { if (!terminou) concluir(new ErroExecucaoProfissional('O processamento foi interrompido. Tente novamente.')); });
    } catch {
      concluir(new ErroExecucaoProfissional('O serviço de análises está temporariamente indisponível.'));
    }
  });
}
