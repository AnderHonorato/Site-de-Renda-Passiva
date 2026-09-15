// Página "Cronograma do evento": a partir do horário da festa, encadeia as etapas de
// preparação de trás para frente e mostra o horário de início de cada uma.
import { copiarTexto } from '../comum/apoio/copiar-texto.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { obterRaiz } from '../comum/interface/obter-raiz.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularCronogramaDoEvento } from '../cálculos/calcular-cronograma-do-evento.js';
import { configurarLinhasEditáveis } from '../interface/configurar-linhas-editáveis.js';

const ETAPAS_INICIAIS = [
  { nome: 'Montagem do espaço', duração: '120' },
  { nome: 'Preparo da comida', duração: '90' },
  { nome: 'Compras', duração: '60' },
];

const formulário = document.getElementById('formulário-cronograma');
const contêinerDeEtapas = document.querySelector('[data-linhas-de-etapas]');
const botãoAdicionarEtapa = document.querySelector('[data-adicionar-etapa]');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
let contador = 0;
let últimoResultado = null;

function criarLinhaDeEtapa(nome = '', duração = '') {
  const sufixo = `etapa-${contador++}`;
  const entradaNome = criarElemento('input', { classe: 'entrada', atributos: { id: `${sufixo}-nome`, type: 'text', maxlength: 80, value: nome, placeholder: 'Ex.: Preparo da comida' }, dados: { campo: 'nome' } });
  const entradaDuração = criarElemento('input', { classe: 'entrada', atributos: { id: `${sufixo}-duração`, type: 'text', inputmode: 'numeric', value: duração, placeholder: 'Minutos' }, dados: { campo: 'duração' } });
  const botãoRemover = criarElemento('button', { classe: 'botão botão-ícone botão-fantasma', atributos: { type: 'button', 'aria-label': 'Remover etapa' }, dados: { removerLinha: '' } }, [
    criarElemento('svg', { classe: 'ícone', atributos: { 'aria-hidden': 'true', focusable: 'false' } }, [criarElemento('use', { atributos: { href: `${obterRaiz()}recursos/ícones/ícones.svg#remover` } })]),
  ]);
  return criarElemento('div', { classe: 'linha-editável', dados: { linha: '' } }, [
    criarElemento('div', { classe: 'campo' }, [criarElemento('label', { classe: 'visualmente-oculto', texto: 'Nome da etapa', atributos: { for: `${sufixo}-nome` } }), entradaNome]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [criarElemento('label', { classe: 'visualmente-oculto', texto: 'Duração em minutos', atributos: { for: `${sufixo}-duração` } }), entradaDuração]),
    botãoRemover,
  ]);
}

for (const etapa of ETAPAS_INICIAIS) contêinerDeEtapas.insertBefore(criarLinhaDeEtapa(etapa.nome, etapa.duração), botãoAdicionarEtapa);
configurarLinhasEditáveis({ contêiner: contêinerDeEtapas, botãoAdicionar: botãoAdicionarEtapa, criarLinha: () => criarLinhaDeEtapa(), mínimo: 1 });

function lerEtapas() {
  const linhas = [...contêinerDeEtapas.querySelectorAll('[data-linha]')];
  const etapas = [];
  let válido = true;
  linhas.forEach((linha, índice) => {
    const entradaNome = linha.querySelector('[data-campo="nome"]');
    const entradaDuração = linha.querySelector('[data-campo="duração"]');
    if (!entradaNome.value.trim() && !entradaDuração.value.trim()) return;
    if (!entradaNome.value.trim()) {
      mostrarErroDeCampo(entradaNome, `Etapa ${índice + 1}: informe um nome.`);
      válido = false;
      return;
    }
    const duração = validarQuantidade(entradaDuração.value, { rótulo: `${entradaNome.value.trim()}: duração`, mínimo: 1, máximo: 1440, inteiro: true });
    if (!duração.válido) {
      mostrarErroDeCampo(entradaDuração, duração.erro);
      válido = false;
      return;
    }
    etapas.push({ nome: entradaNome.value.trim(), duraçãoEmMinutos: duração.valor });
  });
  if (!válido) return null;
  return etapas;
}

function esconderResultado() {
  resultado.hidden = true;
  estadoVazio.hidden = false;
}

function calcular() {
  limparErrosDeCampo(formulário);
  const horário = campo('horário-da-festa').value;
  const etapas = lerEtapas();
  if (!etapas) {
    esconderResultado();
    focarPrimeiroErro(formulário);
    return;
  }
  if (etapas.length === 0) {
    esconderResultado();
    exibirMensagem('Adicione ao menos uma etapa de preparação.', { tipo: 'erro' });
    return;
  }
  const cálculo = calcularCronogramaDoEvento({ horárioDaFesta: horário, etapas });
  if (!cálculo.válido) {
    esconderResultado();
    mostrarErroDeCampo(campo('horário-da-festa'), cálculo.erro);
    focarPrimeiroErro(formulário);
    return;
  }
  últimoResultado = cálculo;
  resultado.querySelector('[data-início]').textContent = cálculo.horárioDeInício;
  resultado.querySelector('[data-tabela-de-etapas]').replaceChildren(
    criarElemento('div', { classe: 'tabela-rolável' }, [
      criarElemento('table', { classe: 'tabela' }, [
        criarElemento('thead', {}, [criarElemento('tr', {}, [criarElemento('th', { texto: 'Etapa', atributos: { scope: 'col' } }), criarElemento('th', { texto: 'Início', atributos: { scope: 'col' } }), criarElemento('th', { texto: 'Fim', atributos: { scope: 'col' } })])]),
        criarElemento(
          'tbody',
          {},
          cálculo.etapas.map((etapa) =>
            criarElemento('tr', {}, [
              criarElemento('td', { texto: etapa.começaNoDiaAnterior ? `${etapa.nome} (dia anterior)` : etapa.nome }),
              criarElemento('td', { dados: { numérico: '' }, texto: etapa.início }),
              criarElemento('td', { dados: { numérico: '' }, texto: etapa.fim }),
            ]),
          ),
        ),
      ]),
    ]),
  );
  estadoVazio.hidden = true;
  resultado.hidden = false;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcular();
});

document.querySelector('[data-copiar]')?.addEventListener('click', async () => {
  if (!últimoResultado) return;
  const texto = [`Início da preparação: ${últimoResultado.horárioDeInício}`, '', ...últimoResultado.etapas.map((etapa) => `${etapa.início} – ${etapa.fim}: ${etapa.nome}`)].join('\n');
  const copiou = await copiarTexto(texto);
  exibirMensagem(copiou ? 'Cronograma copiado.' : 'Não foi possível copiar automaticamente. Selecione o texto manualmente.', { tipo: copiou ? 'sucesso' : 'erro' });
});

document.querySelector('[data-imprimir]')?.addEventListener('click', () => imprimirPágina());
