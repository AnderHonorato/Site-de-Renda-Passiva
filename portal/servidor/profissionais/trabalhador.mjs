/** Um cálculo isolado: sem persistência, sem rede e com orçamento de memória/tempo no chamador. */
import { parentPort, workerData } from 'node:worker_threads';
import { especificacaoPorSlug } from '../../dados/profissionais.js';
import { exigir, validarRelatorio, numeroFinito } from './comum.mjs';

try {
  const { slug, dados } = workerData;
  const spec = especificacaoPorSlug[slug];
  exigir(Boolean(spec), 'Ferramenta profissional desconhecida.');
  exigir(dados && typeof dados === 'object' && !Array.isArray(dados), 'Informe um objeto de dados.');
  exigir(dados.opcoes === undefined || (dados.opcoes !== null && typeof dados.opcoes === 'object' && !Array.isArray(dados.opcoes)), 'Opções inválidas.');
  const opcoes = dados.opcoes ?? {};
  exigir(Object.keys(opcoes).every(k => (spec.opcoes ?? []).some(o => o.nome === k)), 'Uma opção não pertence a esta ferramenta.');
  for (const o of spec.opcoes ?? []) {
    const v = opcoes[o.nome] ?? o.padrao;
    if (o.tipo === 'numero') numeroFinito(v, o.rotulo, o.minimo ?? -1e12, o.maximo ?? 1e12);
    else exigir(typeof v === 'string' && v.length <= 32767, `Opção inválida: ${o.rotulo}.`);
  }
  const entrada = spec.entrada === 'documento' ? dados.texto : dados.csv;
  exigir(typeof entrada === 'string' && entrada.trim() && Buffer.byteLength(entrada, 'utf8') <= 1000000, 'Importe ou preencha dados com até 1 MB.');
  exigir(!entrada.includes('\u0000'), 'O conteúdo contém dados binários; importe um formato compatível.');
  const { executar } = await import(`./${spec.dominio}.mjs`);
  const relatorio = validarRelatorio(await executar(slug, dados));
  parentPort.postMessage({ relatorio });
} catch (e) {
  // Erros internos não expõem stack, caminhos ou os dados recebidos.
  parentPort.postMessage(e?.name === 'ErroProfissional'
    ? { erro: e.name, mensagem: e.message.slice(0, 400) }
    : { erro: 'falha_processamento', mensagem: 'Não foi possível concluir esta análise.' });
}
