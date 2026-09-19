// Página que o cliente abre pelo link: lê o orçamento do fragmento (#o=…), valida,
// mostra com o visual do site e oferece PDF, planilha e impressão.
// Reage também à troca do fragmento sem recarregar (outro link aberto na mesma aba).
import { imprimirPágina } from '../impressão/imprimir-página.js';
import { exibirMensagem } from '../interface/exibir-mensagem.js';
import { baixarPdfDoOrçamento } from './baixar-pdf-do-orçamento.js';
import { baixarPlanilhaDoOrçamento } from './baixar-planilha-do-orçamento.js';
import { decodificarOrçamentoDoLink } from './decodificar-orçamento-do-link.js';
import { obterIdentidadeDaPágina } from './obter-identidade-da-página.js';
import { renderizarOrçamento } from './renderizar-orçamento.js';

export async function configurarPáginaDeOrçamentoCompartilhado() {
  const seção = document.querySelector('[data-orçamento-compartilhado]');
  if (!seção) return;
  const documento = seção.querySelector('[data-documento]');
  const ações = seção.querySelector('[data-ações-do-orçamento]');
  const aviso = seção.querySelector('[data-aviso-do-orçamento]');
  const erro = seção.querySelector('[data-erro-do-orçamento]');
  const títuloOriginal = document.title;
  let orçamentoAtual = null;
  let leitura = 0;

  async function mostrarDoFragmento() {
    const esta = (leitura += 1);
    const código = new URLSearchParams(window.location.hash.slice(1)).get('o');
    const resultado = código ? await decodificarOrçamentoDoLink(código) : { válido: false, erro: 'Nenhum orçamento foi encontrado neste link.' };
    if (esta !== leitura) return;
    orçamentoAtual = resultado.válido ? resultado.orçamento : null;
    erro.hidden = resultado.válido;
    erro.textContent = resultado.válido ? '' : resultado.erro;
    aviso.hidden = !resultado.válido;
    ações.hidden = !resultado.válido;
    if (!resultado.válido) {
      documento.replaceChildren();
      document.title = títuloOriginal;
      return;
    }
    documento.replaceChildren(renderizarOrçamento(orçamentoAtual, { marca: obterIdentidadeDaPágina().marca }));
    document.title = `${orçamentoAtual.título} — ${orçamentoAtual.emissor.nome}`;
  }

  const executar = async (tarefa, falha) => {
    if (!orçamentoAtual) return;
    try {
      await tarefa(orçamentoAtual);
    } catch {
      exibirMensagem(falha, { tipo: 'erro' });
    }
  };
  ações.querySelector('[data-baixar-pdf]').addEventListener('click', () => executar(baixarPdfDoOrçamento, 'Não foi possível gerar o PDF.'));
  ações.querySelector('[data-baixar-planilha]').addEventListener('click', () => executar(baixarPlanilhaDoOrçamento, 'Não foi possível gerar a planilha.'));
  ações.querySelector('[data-imprimir]').addEventListener('click', imprimirPágina);
  window.addEventListener('hashchange', () => {
    mostrarDoFragmento().catch(() => exibirMensagem('Não foi possível abrir este orçamento.', { tipo: 'erro' }));
  });

  await mostrarDoFragmento();
}
