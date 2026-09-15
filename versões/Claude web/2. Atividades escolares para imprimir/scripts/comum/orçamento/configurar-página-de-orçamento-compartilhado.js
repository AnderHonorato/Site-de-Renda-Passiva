// Sincronizado de compartilhado/scripts/orçamento/configurar-página-de-orçamento-compartilhado.js — edite a origem e rode "npm run sincronizar" na raiz.
// Página que o cliente abre pelo link: lê o orçamento do fragmento (#o=…), valida,
// mostra com o visual do site e oferece PDF, planilha e impressão.
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

  const código = new URLSearchParams(window.location.hash.slice(1)).get('o');
  const resultado = código ? await decodificarOrçamentoDoLink(código) : { válido: false, erro: 'Nenhum orçamento foi encontrado neste link.' };
  if (!resultado.válido) {
    erro.textContent = resultado.erro;
    erro.hidden = false;
    return;
  }
  const { orçamento } = resultado;
  documento.replaceChildren(renderizarOrçamento(orçamento, { marca: obterIdentidadeDaPágina().marca }));
  document.title = `${orçamento.título} — ${orçamento.emissor.nome}`;
  aviso.hidden = false;
  ações.hidden = false;

  const executar = async (tarefa, falha) => {
    try {
      await tarefa();
    } catch {
      exibirMensagem(falha, { tipo: 'erro' });
    }
  };
  ações.querySelector('[data-baixar-pdf]').addEventListener('click', () => executar(() => baixarPdfDoOrçamento(orçamento), 'Não foi possível gerar o PDF.'));
  ações.querySelector('[data-baixar-planilha]').addEventListener('click', () => executar(() => baixarPlanilhaDoOrçamento(orçamento), 'Não foi possível gerar a planilha.'));
  ações.querySelector('[data-imprimir]').addEventListener('click', imprimirPágina);
}
