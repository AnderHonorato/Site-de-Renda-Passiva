// Página "Lista de convidados local": nomes, confirmação e se é criança, tudo salvo só
// neste aparelho. Mostra totais de confirmados, pendentes e recusados.
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { copiarTexto } from '../comum/apoio/copiar-texto.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { obterRaiz } from '../comum/interface/obter-raiz.js';
import { calcularContagemDeConvidados } from '../cálculos/calcular-contagem-de-convidados.js';
import { configurarLinhasEditáveis } from '../interface/configurar-linhas-editáveis.js';

const COLEÇÃO = 'listas-de-convidados';
const ESTADOS = [
  { valor: 'confirmado', rótulo: 'Confirmado' },
  { valor: 'pendente', rótulo: 'Pendente' },
  { valor: 'recusado', rótulo: 'Recusado' },
];

const formulárioDeSalvar = document.getElementById('formulário-salvar-lista');
const contêinerDeConvidados = document.querySelector('[data-linhas-de-convidados]');
const botãoAdicionarConvidado = document.querySelector('[data-adicionar-convidado]');
const resumo = document.querySelector('[data-resumo-de-convidados]');
const campo = (id) => document.getElementById(id);
let contador = 0;
let registroAtual = null;

function criarLinhaDeConvidado(nome = '', estado = 'pendente', éCriança = false) {
  const sufixo = `convidado-${contador++}`;
  const entradaNome = criarElemento('input', { classe: 'entrada', atributos: { id: `${sufixo}-nome`, type: 'text', maxlength: 80, value: nome, placeholder: 'Ex.: Ana' }, dados: { campo: 'nome' } });
  const seleçãoEstado = criarElemento(
    'select',
    { classe: 'entrada seleção', atributos: { id: `${sufixo}-estado` }, dados: { campo: 'estado' } },
    ESTADOS.map((item) => criarElemento('option', { texto: item.rótulo, atributos: { value: item.valor, selected: item.valor === estado ? true : undefined } })),
  );
  const caixaCriança = criarElemento('input', { atributos: { type: 'checkbox', id: `${sufixo}-criança`, checked: éCriança ? true : undefined }, dados: { campo: 'criança' } });
  const botãoRemover = criarElemento('button', { classe: 'botão botão-ícone botão-fantasma', atributos: { type: 'button', 'aria-label': 'Remover convidado' }, dados: { removerLinha: '' } }, [
    criarElemento('svg', { classe: 'ícone', atributos: { 'aria-hidden': 'true', focusable: 'false' } }, [criarElemento('use', { atributos: { href: `${obterRaiz()}recursos/ícones/ícones.svg#remover` } })]),
  ]);
  return criarElemento('div', { classe: 'linha-editável', dados: { linha: '' } }, [
    criarElemento('div', { classe: 'campo' }, [criarElemento('label', { classe: 'visualmente-oculto', texto: 'Nome do convidado', atributos: { for: `${sufixo}-nome` } }), entradaNome]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [criarElemento('label', { classe: 'visualmente-oculto', texto: 'Estado da confirmação', atributos: { for: `${sufixo}-estado` } }), seleçãoEstado]),
    criarElemento('div', {}, [criarElemento('label', { classe: 'visualmente-oculto', texto: 'É criança', atributos: { for: `${sufixo}-criança` } }), caixaCriança]),
    botãoRemover,
  ]);
}

configurarLinhasEditáveis({ contêiner: contêinerDeConvidados, botãoAdicionar: botãoAdicionarConvidado, criarLinha: () => criarLinhaDeConvidado(), mínimo: 0, aoMudar: atualizarResumo });

function lerConvidados() {
  return [...contêinerDeConvidados.querySelectorAll('[data-linha]')]
    .map((linha) => ({
      nome: linha.querySelector('[data-campo="nome"]').value.trim(),
      estado: linha.querySelector('[data-campo="estado"]').value,
      éCriança: linha.querySelector('[data-campo="criança"]').checked,
    }))
    .filter((convidado) => convidado.nome.length > 0);
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: String(valor) })]);
}

function atualizarResumo() {
  const contagem = calcularContagemDeConvidados(lerConvidados());
  resumo.replaceChildren(
    linha('Total', contagem.totalDeConvidados),
    linha('Confirmados', `${contagem.confirmados} (${contagem.adultosConfirmados} adultos, ${contagem.criançasConfirmadas} crianças)`),
    linha('Pendentes', contagem.pendentes),
    linha('Recusados', contagem.recusados),
  );
}

contêinerDeConvidados.addEventListener('input', atualizarResumo);
contêinerDeConvidados.addEventListener('change', atualizarResumo);
atualizarResumo();

document.querySelector('[data-copiar]')?.addEventListener('click', async () => {
  const convidados = lerConvidados();
  if (convidados.length === 0) {
    exibirMensagem('Adicione ao menos um convidado antes de copiar.', { tipo: 'erro' });
    return;
  }
  const rótulos = { confirmado: 'Confirmado', pendente: 'Pendente', recusado: 'Recusado' };
  const texto = convidados.map((convidado) => `${convidado.nome}${convidado.éCriança ? ' (criança)' : ''} — ${rótulos[convidado.estado]}`).join('\n');
  const copiou = await copiarTexto(texto);
  exibirMensagem(copiou ? 'Lista de convidados copiada.' : 'Não foi possível copiar automaticamente. Selecione o texto manualmente.', { tipo: copiou ? 'sucesso' : 'erro' });
});

document.querySelector('[data-imprimir]')?.addEventListener('click', () => imprimirPágina());

formulárioDeSalvar?.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulárioDeSalvar);
  const nome = campo('nome-da-lista').value.trim();
  if (!nome || nome.length > 120) {
    mostrarErroDeCampo(campo('nome-da-lista'), 'Dê um nome de 1 a 120 caracteres.');
    campo('nome-da-lista').focus();
    return;
  }
  const convidados = lerConvidados();
  const salvo = salvarRegistroLocal(COLEÇÃO, { ...(registroAtual ?? {}), nome, convidados });
  if (!salvo.salvo) {
    exibirMensagem(salvo.erro, { tipo: 'erro' });
    return;
  }
  registroAtual = salvo.registro;
  exibirMensagem('Lista salva neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

const idSalvo = new URLSearchParams(window.location.search).get('registro');
if (idSalvo) {
  const registro = lerRegistroLocal(COLEÇÃO, idSalvo);
  if (registro) {
    registroAtual = registro;
    campo('nome-da-lista').value = registro.nome;
    contêinerDeConvidados.querySelectorAll('[data-linha]').forEach((linhaAtual) => linhaAtual.remove());
    for (const convidado of registro.convidados) contêinerDeConvidados.insertBefore(criarLinhaDeConvidado(convidado.nome, convidado.estado, convidado.éCriança), botãoAdicionarConvidado);
    atualizarResumo();
  } else {
    exibirMensagem('A lista salva não foi encontrada neste aparelho.', { tipo: 'erro' });
  }
}
