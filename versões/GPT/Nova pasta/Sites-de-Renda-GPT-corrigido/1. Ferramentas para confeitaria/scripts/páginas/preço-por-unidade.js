// Página "Preço por unidade": compara de duas a quatro embalagens pelo preço por
// quilo, litro ou unidade, e aponta a mais econômica entre embalagens compatíveis.
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { formatarMoeda } from '../comum/formatação/formatar-moeda.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularPreçoPorUnidade } from '../cálculos/calcular-preço-por-unidade.js';
import { configurarLinhasEditáveis } from '../interface/configurar-linhas-editáveis.js';

const MÁXIMO_DE_EMBALAGENS = 4;
const UNIDADES = ['g', 'kg', 'ml', 'L', 'unidade'];

const formulário = document.getElementById('formulário-comparação');
const contêiner = document.querySelector('[data-linhas-de-embalagens]');
const botãoAdicionar = document.querySelector('[data-adicionar-embalagem]');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
let contadorDeLinhas = 2;

function criarLinhaDeEmbalagem() {
  const sufixo = contadorDeLinhas++;
  const entradaNome = criarElemento('input', { classe: 'entrada', atributos: { id: `embalagem-nome-${sufixo}`, type: 'text', maxlength: 60, placeholder: 'Ex.: Pacote extra' }, dados: { campo: 'nome' } });
  const campoNome = criarElemento('div', { classe: 'campo' }, [criarElemento('label', { texto: 'Embalagem', atributos: { for: `embalagem-nome-${sufixo}` } }), entradaNome]);

  const entradaQuantidade = criarElemento('input', { classe: 'entrada', atributos: { id: `embalagem-quantidade-${sufixo}`, type: 'text', inputmode: 'decimal', placeholder: 'Ex.: 750' }, dados: { campo: 'quantidade' } });
  const campoQuantidade = criarElemento('div', { classe: 'campo campo-estreito' }, [criarElemento('label', { texto: 'Quantidade', atributos: { for: `embalagem-quantidade-${sufixo}` } }), entradaQuantidade]);

  const seleçãoUnidade = criarElemento(
    'select',
    { classe: 'entrada seleção', atributos: { id: `embalagem-unidade-${sufixo}` }, dados: { campo: 'unidade' } },
    UNIDADES.map((unidade) => criarElemento('option', { texto: unidade, atributos: { value: unidade, selected: unidade === 'g' ? true : undefined } })),
  );
  const campoUnidade = criarElemento('div', { classe: 'campo campo-estreito' }, [criarElemento('label', { texto: 'Unidade', atributos: { for: `embalagem-unidade-${sufixo}` } }), seleçãoUnidade]);

  const entradaPreço = criarElemento('input', { classe: 'entrada', atributos: { id: `embalagem-preço-${sufixo}`, type: 'text', inputmode: 'decimal', placeholder: 'Ex.: 15,00' }, dados: { campo: 'preço' } });
  const campoPreço = criarElemento('div', { classe: 'campo campo-estreito' }, [criarElemento('label', { texto: 'Preço (R$)', atributos: { for: `embalagem-preço-${sufixo}` } }), entradaPreço]);

  const botãoRemover = criarElemento('button', { classe: 'botão botão-secundário', texto: 'Remover', atributos: { type: 'button', 'aria-label': 'Remover embalagem' }, dados: { removerLinha: '' } });

  return criarElemento('div', { classe: 'linha-editável', dados: { linha: '' } }, [campoNome, campoQuantidade, campoUnidade, campoPreço, botãoRemover]);
}

function atualizarBotãoAdicionar() {
  const total = contêiner.querySelectorAll('[data-linha]').length;
  botãoAdicionar.disabled = total >= MÁXIMO_DE_EMBALAGENS;
}

configurarLinhasEditáveis({ contêiner, botãoAdicionar, criarLinha: criarLinhaDeEmbalagem, mínimo: 2, aoMudar: atualizarBotãoAdicionar });
atualizarBotãoAdicionar();

function lerEmbalagens() {
  limparErrosDeCampo(formulário);
  const linhas = [...contêiner.querySelectorAll('[data-linha]')];
  const embalagens = [];
  let válido = true;
  linhas.forEach((linha, índice) => {
    const entradaNome = linha.querySelector('[data-campo="nome"]');
    const entradaQuantidade = linha.querySelector('[data-campo="quantidade"]');
    const seleçãoUnidade = linha.querySelector('[data-campo="unidade"]');
    const entradaPreço = linha.querySelector('[data-campo="preço"]');
    const nome = entradaNome.value.trim() || `Embalagem ${índice + 1}`;

    const quantidade = validarQuantidade(entradaQuantidade.value, { rótulo: `${nome}: quantidade`, mínimo: 0.0001, máximo: 1e7, casasMáximas: 4 });
    if (!quantidade.válido) {
      mostrarErroDeCampo(entradaQuantidade, quantidade.erro);
      válido = false;
      return;
    }
    const preço = validarQuantidade(entradaPreço.value, { rótulo: `${nome}: preço`, mínimo: 0.01, máximo: 1e7, casasMáximas: 2 });
    if (!preço.válido) {
      mostrarErroDeCampo(entradaPreço, preço.erro);
      válido = false;
      return;
    }
    embalagens.push({ nome, quantidade: quantidade.valor, unidade: seleçãoUnidade.value, preço: preço.valor });
  });
  if (!válido) return null;
  return embalagens;
}

function calcular() {
  const embalagens = lerEmbalagens();
  if (!embalagens) return;
  const cálculo = calcularPreçoPorUnidade({ embalagens });
  if (!cálculo.válido) {
    exibirMensagem(cálculo.erro, { tipo: 'erro' });
    return;
  }

  resultado.querySelector('[data-mais-econômica]').textContent = cálculo.maisEconômicaNome;
  resultado.querySelector('[data-corpo-da-tabela]').replaceChildren(
    ...cálculo.embalagens.map((embalagem) =>
      criarElemento('tr', { atributos: { 'data-vencedora': embalagem.nome === cálculo.maisEconômicaNome ? '' : undefined } }, [
        criarElemento('td', { texto: embalagem.nome }),
        criarElemento('td', { texto: `${formatarNúmero(embalagem.quantidade, { casas: 3 })} ${embalagem.unidade}` }),
        criarElemento('td', { texto: formatarMoeda(embalagem.preço) }),
        criarElemento('td', { texto: `${formatarMoeda(embalagem.preçoPorUnidadeDeReferência)} / ${cálculo.unidadeDeReferência}` }),
      ]),
    ),
  );

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcular();
});
