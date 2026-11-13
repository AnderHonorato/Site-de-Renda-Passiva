/** Gera um único arquivo fora da interface. Cancelar na tela encerra este trabalhador. */
import { arquivosDoRelatorio } from './arquivos.js';

self.onmessage = async ({ data }) => {
  self.onmessage = null;
  try {
    if (!data || typeof data.rotulo !== 'string' || typeof data.slug !== 'string') {
      throw new Error('Pedido de exportação inválido. Execute a análise novamente.');
    }
    const gerador = arquivosDoRelatorio(data.relatorio, data.slug).find(item => item.rótulo === data.rotulo);
    if (!gerador) throw new Error('Este formato não está disponível para o relatório.');
    const arquivo = await gerador.gerar();
    if (!(arquivo?.bytes instanceof Uint8Array) || !arquivo.bytes.length || typeof arquivo.nome !== 'string' || typeof arquivo.tipo !== 'string') {
      throw new Error('Não foi possível gerar um arquivo válido. Tente novamente.');
    }
    self.postMessage({ ok: true, arquivo }, [arquivo.bytes.buffer]);
  } catch (erro) {
    self.postMessage({ ok: false, mensagem: erro instanceof Error ? erro.message.slice(0, 400) : 'Não foi possível gerar o arquivo. Tente novamente.' });
  }
};
