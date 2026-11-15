/** Um motor privado por operação. Os arquivos ficam no worker do aparelho. */
export const LIMITES_MOTOR = Object.freeze({ entrada: 96 * 1024 * 1024, saida: 100 * 1024 * 1024, tempoMs: 180000 });
const nomeSeguro = nome => typeof nome === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/u.test(nome) && !nome.includes('..');
let emExecucao = false;

export class ErroMidia extends Error {
  constructor(codigo, mensagem, opcoes) { super(mensagem, opcoes); this.name = 'ErroMidia'; this.codigo = codigo; }
}
const erroCancelado = () => Object.assign(new Error('A edição foi cancelada. Seus arquivos originais continuam disponíveis.'), { name: 'AbortError', cancelado: true });

export function validarTrabalhoMidia({ arquivos, argumentos, saida, limiteTempoMs = LIMITES_MOTOR.tempoMs }) {
  if (!Array.isArray(arquivos) || arquivos.length < 1 || arquivos.length > 12 || !nomeSeguro(saida)) throw new ErroMidia('entrada', 'Escolha arquivos e um formato de saída válidos.');
  let tamanho = 0;
  const nomes = new Set();
  for (const arquivo of arquivos) {
    if (!nomeSeguro(arquivo.nome) || nomes.has(arquivo.nome) || !(arquivo.bytes instanceof Uint8Array) || !arquivo.bytes.length) throw new ErroMidia('entrada', 'Não foi possível abrir um dos arquivos. Escolha-o novamente.');
    nomes.add(arquivo.nome); tamanho += arquivo.bytes.byteLength;
  }
  if (nomes.has(saida)) throw new ErroMidia('entrada', 'O arquivo de saída precisa ter um nome diferente do original.');
  if (tamanho > LIMITES_MOTOR.entrada) throw new ErroMidia('limite', 'Os arquivos juntos passam de 96 MB. Use arquivos menores para editar neste aparelho.');
  if (!Array.isArray(argumentos) || argumentos.length < 2 || argumentos.length > 160 || argumentos.some(a => typeof a !== 'string' || a.length > 4096 || /\u0000|(?:https?|ftp|file|data):/iu.test(a))) throw new ErroMidia('argumentos', 'Confira as opções de edição e tente novamente.');
  if (!Number.isFinite(limiteTempoMs) || limiteTempoMs < 1000 || limiteTempoMs > LIMITES_MOTOR.tempoMs) throw new ErroMidia('limite', 'O prazo de processamento precisa ficar entre 1 e 180 segundos.');
  return { tamanho, limiteTempoMs };
}

export async function processarMidia({ arquivos, argumentos, saida, signal, onProgress, onLog, limiteTempoMs = LIMITES_MOTOR.tempoMs }) {
  validarTrabalhoMidia({ arquivos, argumentos, saida, limiteTempoMs });
  if (signal?.aborted) throw erroCancelado();
  if (emExecucao) throw new ErroMidia('ocupado', 'Há outra edição sendo preparada. Aguarde o resultado ou cancele para começar novamente.');
  emExecucao = true;
  let motor, temporizador, expirou = false, carregou = false;
  const avisar = evento => { try { onProgress?.(evento); } catch { /* progresso decorativo não interfere no arquivo */ } };
  const cancelar = () => motor?.terminate();
  try {
    avisar({ etapa: 'carregando' });
    const { FFmpeg } = await import('../../terceiros/midia/index.js');
    if (signal?.aborted) throw erroCancelado();
    motor = new FFmpeg();
    if (typeof onLog === 'function') motor.on('log', ({ message }) => { try { onLog(String(message).slice(0, 2000)); } catch { /* diagnóstico opcional e local */ } });
    signal?.addEventListener('abort', cancelar, { once: true });
    temporizador = setTimeout(() => { expirou = true; motor.terminate(); }, limiteTempoMs);
    motor.on('progress', ({ progress, time }) => avisar({ etapa: 'processando', ...(Number.isFinite(progress) ? { progress: Math.max(0, Math.min(1, progress)) } : {}), time }));
    await motor.load({
      coreURL: new URL('../../../recursos/midia/ffmpeg-core.js', import.meta.url).href,
      wasmURL: new URL('../../../recursos/midia/ffmpeg-core.wasm', import.meta.url).href,
    });
    carregou = true;
    if (signal?.aborted) throw erroCancelado();
    for (const arquivo of arquivos) await motor.writeFile(arquivo.nome, arquivo.bytes.slice());
    avisar({ etapa: 'processando' });
    if (argumentos.at(-1) !== saida) throw new ErroMidia('argumentos', 'O destino da exportação não corresponde ao arquivo escolhido.');
    const retorno = await motor.exec(['-hide_banner', '-nostdin', '-y', '-threads', '1', '-filter_threads', '1', '-filter_complex_threads', '1', ...argumentos.slice(0, -1), '-threads', '1', saida], limiteTempoMs);
    if (signal?.aborted) throw erroCancelado();
    if (retorno !== 0) throw new ErroMidia('formato', 'Não consegui concluir com estas opções. Confira o trecho, a resolução e o formato ou tente um arquivo menor.');
    const bytes = await motor.readFile(saida);
    if (!(bytes instanceof Uint8Array) || !bytes.byteLength) throw new ErroMidia('vazio', 'O trecho escolhido não produziu um arquivo. Confira os tempos de início e fim.');
    if (bytes.byteLength > LIMITES_MOTOR.saida) throw new ErroMidia('limite', 'O resultado passou de 100 MB. Reduza a duração, a resolução ou a qualidade e tente novamente.');
    return { bytes: bytes.slice() };
  } catch (erro) {
    if (signal?.aborted || erro?.name === 'AbortError') throw erroCancelado();
    if (expirou) throw new ErroMidia('tempo', 'Esta edição demorou além do limite do aparelho. Experimente um trecho menor ou uma resolução mais baixa.');
    if (erro instanceof ErroMidia) throw erro;
    throw new ErroMidia(carregou ? 'processamento' : 'motor', carregou
      ? 'O aparelho não conseguiu concluir neste formato. Experimente outro formato de saída ou um trecho menor.'
      : 'Não consegui preparar o editor agora. Confira sua conexão para carregar o motor local e tente novamente.', { cause: erro });
  } finally {
    clearTimeout(temporizador); signal?.removeEventListener('abort', cancelar);
    try { motor?.terminate(); } catch { /* worker já encerrado */ }
    emExecucao = false;
  }
}
