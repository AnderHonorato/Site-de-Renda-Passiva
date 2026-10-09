/** Leitor por arquivo, com cancelamento e prazo sem bloquear a interface. */
export function criarLeitorXlsx() {
  const trabalhador = new Worker(new URL('./trabalhador-planilha.js', import.meta.url), { type: 'module' });
  const pendentes = new Map();
  let sequencia = 0, encerrado = false;
  function fechar(mensagem = 'A leitura foi cancelada.') {
    encerrado = true;trabalhador.terminate();
    for (const pedido of pendentes.values()) { clearTimeout(pedido.timer);pedido.rejeitar(new Error(mensagem)); }
    pendentes.clear();
  }
  trabalhador.addEventListener('message', ({ data }) => {
    const pedido = pendentes.get(data.id);if (!pedido) return;
    clearTimeout(pedido.timer);pendentes.delete(data.id);
    if (data.erro) pedido.rejeitar(new Error(data.erro));else pedido.resolver(data.resultado);
  });
  trabalhador.addEventListener('error', evento => { evento.preventDefault();fechar('Não foi possível carregar o leitor de XLSX. Tente novamente ou use CSV.'); });
  function chamar(acao, dados = {}, transferir = []) {
    if (encerrado) return Promise.reject(new Error('Escolha novamente o arquivo XLSX para retomar a leitura.'));
    return new Promise((resolver, rejeitar) => {
      const id = ++sequencia;
      const timer = setTimeout(() => fechar('A leitura demorou demais. Tente uma aba menor ou salve como CSV.'), 20000);
      pendentes.set(id, { resolver, rejeitar, timer });
      trabalhador.postMessage({ id, acao, ...dados }, transferir);
    });
  }
  return { abrir: bytes => chamar('abrir', { bytes }, [bytes]), lerAba: indice => chamar('aba', { indice }), fechar };
}
