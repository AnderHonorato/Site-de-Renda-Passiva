// Página "Checklist do evento": lista de tarefas editável, com marcação de concluída,
// cópia de texto, impressão em versão limpa e salvamento neste aparelho.
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { copiarTexto } from '../comum/apoio/copiar-texto.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { obterRaiz } from '../comum/interface/obter-raiz.js';
import { configurarLinhasEditáveis } from '../interface/configurar-linhas-editáveis.js';

const COLEÇÃO = 'checklists';
const TAREFAS_INICIAIS = ['Definir data e horário', 'Fazer a lista de convidados', 'Planejar o cardápio', 'Comprar bebidas e gelo', 'Confirmar equipamentos (mesas, cadeiras, som)', 'Organizar a lista de compras final'];

const formulário = document.getElementById('formulário-checklist');
const formulárioDeSalvar = document.getElementById('formulário-salvar-checklist');
const contêinerDeTarefas = document.querySelector('[data-linhas-de-tarefas]');
const botãoAdicionarTarefa = document.querySelector('[data-adicionar-tarefa]');
const campo = (id) => document.getElementById(id);
let contador = 0;
let registroAtual = null;

function criarLinhaDeTarefa(texto = '', concluída = false) {
  const sufixo = `tarefa-${contador++}`;
  const caixaConcluída = criarElemento('input', { atributos: { type: 'checkbox', id: `${sufixo}-concluída`, checked: concluída ? true : undefined }, dados: { campo: 'concluída' } });
  const entradaTexto = criarElemento('input', { classe: 'entrada', atributos: { id: `${sufixo}-texto`, type: 'text', maxlength: 200, value: texto, placeholder: 'Ex.: Comprar carvão' }, dados: { campo: 'texto' } });
  const botãoRemover = criarElemento('button', { classe: 'botão botão-ícone botão-fantasma', atributos: { type: 'button', 'aria-label': 'Remover tarefa' }, dados: { removerLinha: '' } }, [
    criarElemento('svg', { classe: 'ícone', atributos: { 'aria-hidden': 'true', focusable: 'false' } }, [criarElemento('use', { atributos: { href: `${obterRaiz()}recursos/ícones/ícones.svg#remover` } })]),
  ]);
  return criarElemento('div', { classe: 'linha-editável', dados: { linha: '' } }, [
    criarElemento('div', {}, [criarElemento('label', { classe: 'visualmente-oculto', texto: 'Tarefa concluída', atributos: { for: `${sufixo}-concluída` } }), caixaConcluída]),
    criarElemento('div', { classe: 'campo' }, [criarElemento('label', { classe: 'visualmente-oculto', texto: 'Descrição da tarefa', atributos: { for: `${sufixo}-texto` } }), entradaTexto]),
    botãoRemover,
  ]);
}

function popularComTarefasIniciais() {
  contêinerDeTarefas.querySelectorAll('[data-linha]').forEach((linha) => linha.remove());
  for (const texto of TAREFAS_INICIAIS) contêinerDeTarefas.insertBefore(criarLinhaDeTarefa(texto), botãoAdicionarTarefa);
}

configurarLinhasEditáveis({ contêiner: contêinerDeTarefas, botãoAdicionar: botãoAdicionarTarefa, criarLinha: () => criarLinhaDeTarefa(), mínimo: 1 });
popularComTarefasIniciais();

function lerTarefas() {
  return [...contêinerDeTarefas.querySelectorAll('[data-linha]')]
    .map((linha) => ({ texto: linha.querySelector('[data-campo="texto"]').value.trim(), concluída: linha.querySelector('[data-campo="concluída"]').checked }))
    .filter((tarefa) => tarefa.texto.length > 0);
}

function textoDoChecklist(tarefas) {
  return tarefas.map((tarefa) => `${tarefa.concluída ? '[x]' : '[ ]'} ${tarefa.texto}`).join('\n');
}

document.querySelector('[data-copiar]')?.addEventListener('click', async () => {
  const tarefas = lerTarefas();
  if (tarefas.length === 0) {
    exibirMensagem('Adicione ao menos uma tarefa antes de copiar.', { tipo: 'erro' });
    return;
  }
  const copiou = await copiarTexto(textoDoChecklist(tarefas));
  exibirMensagem(copiou ? 'Checklist copiado.' : 'Não foi possível copiar automaticamente. Selecione o texto manualmente.', { tipo: copiou ? 'sucesso' : 'erro' });
});

document.querySelector('[data-imprimir]')?.addEventListener('click', () => imprimirPágina());

formulário?.addEventListener('submit', (evento) => evento.preventDefault());

formulárioDeSalvar?.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulárioDeSalvar);
  const nome = campo('nome-do-checklist').value.trim();
  if (!nome || nome.length > 120) {
    mostrarErroDeCampo(campo('nome-do-checklist'), 'Dê um nome de 1 a 120 caracteres.');
    campo('nome-do-checklist').focus();
    return;
  }
  const tarefas = lerTarefas();
  if (tarefas.length === 0) {
    exibirMensagem('Adicione ao menos uma tarefa antes de salvar.', { tipo: 'erro' });
    return;
  }
  const salvo = salvarRegistroLocal(COLEÇÃO, { ...(registroAtual ?? {}), nome, tarefas });
  if (!salvo.salvo) {
    exibirMensagem(salvo.erro, { tipo: 'erro' });
    return;
  }
  registroAtual = salvo.registro;
  exibirMensagem('Checklist salvo neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

const idSalvo = new URLSearchParams(window.location.search).get('registro');
if (idSalvo) {
  const registro = lerRegistroLocal(COLEÇÃO, idSalvo);
  if (registro) {
    registroAtual = registro;
    campo('nome-do-checklist').value = registro.nome;
    contêinerDeTarefas.querySelectorAll('[data-linha]').forEach((linha) => linha.remove());
    for (const tarefa of registro.tarefas) contêinerDeTarefas.insertBefore(criarLinhaDeTarefa(tarefa.texto, tarefa.concluída), botãoAdicionarTarefa);
  } else {
    exibirMensagem('O checklist salvo não foi encontrado neste aparelho.', { tipo: 'erro' });
  }
}
