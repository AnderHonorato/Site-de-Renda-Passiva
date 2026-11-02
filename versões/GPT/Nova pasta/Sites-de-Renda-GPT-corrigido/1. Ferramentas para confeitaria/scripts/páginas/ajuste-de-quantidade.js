// Página "Ajuste de quantidade": escala uma receita salva ou um rendimento digitado
// para uma nova quantidade, por fator contínuo ou por lotes inteiros, com campos para
// corrigir manualmente tempo, forno e desperdício (que não escalam automaticamente).
import { listarRegistrosLocais } from '../comum/armazenamento/listar-registros-locais.js';
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularAjusteDeQuantidade } from '../cálculos/calcular-ajuste-de-quantidade.js';
import { escalarIngredientes } from '../cálculos/escalar-ingredientes.js';

const formulário = document.getElementById('formulário-ajuste');
const seleçãoDeReceita = document.getElementById('receita-salva');
const avisoSemReceitas = document.querySelector('[data-sem-receitas]');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);

function radioSelecionado(nome) {
  return document.querySelector(`input[name="${nome}"]:checked`)?.value;
}

function atualizarFonteVisível() {
  const fonte = radioSelecionado('fonte');
  document.querySelector('[data-fonte="manual"]').hidden = fonte !== 'manual';
  document.querySelector('[data-fonte="salva"]').hidden = fonte !== 'salva';
}
for (const rádio of formulário.querySelectorAll('input[name="fonte"]')) rádio.addEventListener('change', atualizarFonteVisível);

const receitasSalvas = listarRegistrosLocais('receitas');
if (receitasSalvas.length === 0) {
  avisoSemReceitas.hidden = false;
  formulário.querySelector('input[name="fonte"][value="salva"]').disabled = true;
} else {
  seleçãoDeReceita.replaceChildren(...receitasSalvas.map((receita) => criarElemento('option', { texto: `${receita.nome} (rende ${receita.rendimentoAproveitável})`, atributos: { value: receita.id } })));
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function lerEntradas() {
  limparErrosDeCampo(formulário);
  const fonte = radioSelecionado('fonte');
  let rendimentoOriginal = null;
  let receitaEscolhida = null;

  if (fonte === 'salva') {
    receitaEscolhida = lerRegistroLocal('receitas', seleçãoDeReceita.value);
    if (!receitaEscolhida) {
      exibirMensagem('Escolha uma receita salva válida.', { tipo: 'erro' });
      return null;
    }
    rendimentoOriginal = receitaEscolhida.rendimentoAproveitável;
  } else {
    const verificação = validarQuantidade(campo('rendimento-manual').value, { rótulo: 'Rendimento original', mínimo: 1, máximo: 100000, inteiro: true });
    if (!verificação.válido) {
      mostrarErroDeCampo(campo('rendimento-manual'), verificação.erro);
      focarPrimeiroErro(formulário);
      return null;
    }
    rendimentoOriginal = verificação.valor;
  }

  const quantidade = validarQuantidade(campo('quantidade-desejada').value, { rótulo: 'Quantidade desejada', mínimo: 1, máximo: 1000000, inteiro: true });
  if (!quantidade.válido) {
    mostrarErroDeCampo(campo('quantidade-desejada'), quantidade.erro);
    focarPrimeiroErro(formulário);
    return null;
  }

  return { rendimentoOriginal, quantidadeDesejada: quantidade.valor, modo: radioSelecionado('modo'), receitaEscolhida };
}

function mostrarIngredientesEscalados(receita, multiplicador) {
  const bloco = resultado.querySelector('[data-bloco-de-ingredientes]');
  if (!receita) {
    bloco.hidden = true;
    return;
  }
  const escalados = escalarIngredientes(receita.ingredientes, multiplicador);
  resultado.querySelector('[data-corpo-da-tabela]').replaceChildren(
    ...receita.ingredientes.map((original, índice) =>
      criarElemento('tr', {}, [
        criarElemento('td', { texto: original.nome }),
        criarElemento('td', { texto: `${formatarNúmero(original.quantidadeUsada, { casas: 3 })} ${original.unidadeUsada}` }),
        criarElemento('td', { texto: `${formatarNúmero(escalados[índice].quantidadeUsada, { casas: 3 })} ${original.unidadeUsada}` }),
      ]),
    ),
  );
  bloco.hidden = false;
}

function mostrarAjustesManuais() {
  const tempo = campo('tempo-ajustado').value.trim();
  const forno = campo('nota-de-forno').value.trim();
  const desperdício = campo('desperdício-ajustado').value.trim();
  const painel = resultado.querySelector('[data-ajustes-manuais]');
  const entradas = [tempo ? linha('Tempo ajustado', `${tempo} min`) : null, forno ? linha('Observação sobre o forno', forno) : null, desperdício ? linha('Desperdício estimado', `${desperdício}%`) : null].filter(Boolean);
  painel.replaceChildren(...entradas);
  painel.hidden = entradas.length === 0;
}

function calcular() {
  const entradas = lerEntradas();
  if (!entradas) return;
  const cálculo = calcularAjusteDeQuantidade(entradas);
  if (!cálculo.válido) {
    exibirMensagem(cálculo.erro, { tipo: 'erro' });
    return;
  }

  const modoFator = entradas.modo === 'fator';
  const multiplicadorEscolhido = modoFator ? cálculo.fatorDeEscala : cálculo.lotesInteiros;
  const rendimentoFinal = modoFator ? cálculo.rendimentoComFator : cálculo.rendimentoComLotesInteiros;

  resultado.querySelector('[data-rótulo-principal]').textContent = modoFator ? 'Rendimento final (fator contínuo)' : 'Rendimento final (lotes inteiros)';
  resultado.querySelector('[data-rendimento-final]').textContent = `${formatarNúmero(rendimentoFinal, { casas: 2 })} unidades`;

  resultado.querySelector('[data-lista]').replaceChildren(
    linha('Fator de escala', `${formatarNúmero(cálculo.fatorDeEscala, { casas: 2 })}×`),
    linha('Lotes inteiros sugeridos', `${cálculo.lotesInteiros} lote${cálculo.lotesInteiros === 1 ? '' : 's'}`),
    linha('Rendimento com fator contínuo', `${formatarNúmero(cálculo.rendimentoComFator, { casas: 2 })} unidades`),
    linha('Rendimento com lotes inteiros', `${cálculo.rendimentoComLotesInteiros} unidades`),
  );

  mostrarIngredientesEscalados(entradas.receitaEscolhida, multiplicadorEscolhido);
  mostrarAjustesManuais();

  resultado.querySelector('[data-memória]').replaceChildren(
    criarElemento('li', { texto: `Fator de escala = quantidade desejada ÷ rendimento original = ${entradas.quantidadeDesejada} ÷ ${entradas.rendimentoOriginal} = ${formatarNúmero(cálculo.fatorDeEscala, { casas: 4 })}.` }),
    criarElemento('li', { texto: `Lotes inteiros = arredondar para cima de (${entradas.quantidadeDesejada} ÷ ${entradas.rendimentoOriginal}) = ${cálculo.lotesInteiros}, rendendo ${cálculo.rendimentoComLotesInteiros} unidades ao repetir a receita completa.` }),
    criarElemento('li', { texto: `Modo escolhido: ${modoFator ? 'fator contínuo' : 'lotes inteiros'} → ingredientes multiplicados por ${formatarNúmero(multiplicadorEscolhido, { casas: 4 })}.` }),
  );

  estadoVazio.hidden = true;
  resultado.hidden = false;
}

formulário.addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcular();
});

atualizarFonteVisível();
