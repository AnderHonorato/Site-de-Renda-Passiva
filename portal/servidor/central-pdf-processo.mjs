import { executarLotePdf } from './central-pdf-motor.mjs';

process.umask(0o077);
const controlador = new AbortController();
let concluido = false;

process.once('disconnect', () => {
  if (concluido) return;
  controlador.abort();
  // O pai cria um grupo exclusivo no Unix. Encerra também o Ghostscript se a API caiu.
  if (process.platform !== 'win32') {
    try { process.kill(-process.pid, 'SIGKILL'); } catch {}
  }
});
function terminar(resultado) {
  concluido = true;
  if (process.connected) process.send(resultado, () => { if (process.connected) process.disconnect(); });
}
process.once('message', async dados => {
  try {
    const resultado = await executarLotePdf({
      ...dados, signal: controlador.signal,
      progresso: (percentual, etapa) => {
        if (process.connected) process.send({ percentual, etapa }, () => {});
      },
    });
    terminar({ resultado });
  } catch (erro) {
    const mensagem = erro.status >= 400 && erro.status <= 599 ? erro.message : 'Não foi possível processar este lote de PDFs.';
    terminar({ mensagem });
  }
});
