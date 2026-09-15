// Página "Divisor de despesas": soma uma lista de gastos ou um total informado e divide
// entre as pessoas pagantes do evento (que não são necessariamente todas as presentes),
// em partes iguais ou por pesos. Nenhum dado bancário é pedido.
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { copiarTexto } from '../comum/apoio/copiar-texto.js';
import { formatarCentavos } from '../comum/formatação/formatar-centavos.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { obterRaiz } from '../comum/interface/obter-raiz.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { calcularDivisãoDeDespesas } from '../cálculos/calcular-divisao-de-despesas.js';
import { configurarLinhasEditáveis } from '../interface/configurar-linhas-editáveis.js';

const COLEÇÃO = 'divisões-de-despesas';
const formulário = document.getElementById('formulário-divisor');
const formulárioDeSalvar = document.getElementById('formulário-salvar-divisão');
const contêinerDeGastos = document.querySelector('[data-linhas-de-gastos]');
const botãoAdicionarGasto = document.querySelector('[data-adicionar-gasto]');
const contêinerDePagantes = document.querySelector('[data-linhas-de-pagantes]');
const botãoAdicionarPagante = document.querySelector('[data-adicionar-pagante]');
const estadoVazio = document.querySelector('[data-estado-vazio]');
const resultado = document.querySelector('[data-resultado]');
const campo = (id) => document.getElementById(id);
// Começa em 1 porque a primeira linha estática do HTML já usa o sufixo "0" nos ids
// (gasto-0-…, pagante-0-…); assim, linhas criadas por JavaScript nunca colidem com ela.
let contador = 1;
let últimoResultado = null;
let registroAtual = null;

function criarLinhaDeGasto() {
  const sufixo = `gasto-${contador++}`;
  const entradaDescrição = criarElemento('input', { classe: 'entrada', atributos: { id: `${sufixo}-descrição`, type: 'text', maxlength: 120, placeholder: 'Ex.: Carnes' }, dados: { campo: 'descrição' } });
  const entradaValor = criarElemento('input', { classe: 'entrada', atributos: { id: `${sufixo}-valor`, type: 'text', inputmode: 'decimal', placeholder: 'Ex.: 180,00' }, dados: { campo: 'valor' } });
  const botãoRemover = criarElemento('button', { classe: 'botão botão-ícone botão-fantasma', atributos: { type: 'button', 'aria-label': 'Remover gasto' }, dados: { removerLinha: '' } }, [
    criarElemento('svg', { classe: 'ícone', atributos: { 'aria-hidden': 'true', focusable: 'false' } }, [criarElemento('use', { atributos: { href: `${obterRaiz()}recursos/ícones/ícones.svg#remover` } })]),
  ]);
  return criarElemento('div', { classe: 'linha-editável', dados: { linha: '' } }, [
    criarElemento('div', { classe: 'campo' }, [criarElemento('label', { classe: 'visualmente-oculto', texto: 'Descrição do gasto', atributos: { for: `${sufixo}-descrição` } }), entradaDescrição]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [criarElemento('label', { classe: 'visualmente-oculto', texto: 'Valor do gasto (R$)', atributos: { for: `${sufixo}-valor` } }), entradaValor]),
    botãoRemover,
  ]);
}

function criarLinhaDePagante() {
  const sufixo = `pagante-${contador++}`;
  const entradaNome = criarElemento('input', { classe: 'entrada', atributos: { id: `${sufixo}-nome`, type: 'text', maxlength: 80, placeholder: 'Ex.: Ana' }, dados: { campo: 'nome' } });
  const entradaPeso = criarElemento('input', {
    classe: 'entrada',
    atributos: { id: `${sufixo}-peso`, type: 'text', inputmode: 'decimal', placeholder: 'Ex.: 1', value: '1' },
    dados: { campo: 'peso' },
  });
  const campoPeso = criarElemento('div', { classe: 'campo campo-estreito', dados: { campoDePeso: '' } }, [criarElemento('label', { classe: 'visualmente-oculto', texto: 'Peso da divisão', atributos: { for: `${sufixo}-peso` } }), entradaPeso]);
  campoPeso.hidden = campo('modo').value !== 'pesos';
  const botãoRemover = criarElemento('button', { classe: 'botão botão-ícone botão-fantasma', atributos: { type: 'button', 'aria-label': 'Remover pessoa pagante' }, dados: { removerLinha: '' } }, [
    criarElemento('svg', { classe: 'ícone', atributos: { 'aria-hidden': 'true', focusable: 'false' } }, [criarElemento('use', { atributos: { href: `${obterRaiz()}recursos/ícones/ícones.svg#remover` } })]),
  ]);
  return criarElemento('div', { classe: 'linha-editável', dados: { linha: '' } }, [
    criarElemento('div', { classe: 'campo' }, [criarElemento('label', { classe: 'visualmente-oculto', texto: 'Nome da pessoa pagante', atributos: { for: `${sufixo}-nome` } }), entradaNome]),
    campoPeso,
    botãoRemover,
  ]);
}

contêinerDeGastos.querySelector('.linha-editável')?.setAttribute('data-linha', '');
contêinerDePagantes.querySelector('.linha-editável')?.setAttribute('data-linha', '');
configurarLinhasEditáveis({ contêiner: contêinerDeGastos, botãoAdicionar: botãoAdicionarGasto, criarLinha: criarLinhaDeGasto, mínimo: 0 });
configurarLinhasEditáveis({ contêiner: contêinerDePagantes, botãoAdicionar: botãoAdicionarPagante, criarLinha: criarLinhaDePagante, mínimo: 1 });

function atualizarVisibilidadeDePeso() {
  const modoPesos = campo('modo').value === 'pesos';
  for (const bloco of contêinerDePagantes.querySelectorAll('[data-campo-de-peso]')) bloco.hidden = !modoPesos;
}
campo('modo').addEventListener('change', atualizarVisibilidadeDePeso);

function lerGastos() {
  const linhas = [...contêinerDeGastos.querySelectorAll('[data-linha]')];
  const itens = [];
  let válido = true;
  linhas.forEach((linha, índice) => {
    const entradaDescrição = linha.querySelector('[data-campo="descrição"]');
    const entradaValor = linha.querySelector('[data-campo="valor"]');
    if (!entradaDescrição.value.trim() && !entradaValor.value.trim()) return;
    if (!entradaDescrição.value.trim()) {
      mostrarErroDeCampo(entradaDescrição, `Gasto ${índice + 1}: informe uma descrição.`);
      válido = false;
      return;
    }
    const valor = validarQuantidade(entradaValor.value, { rótulo: `Gasto ${índice + 1}, valor`, mínimo: 0, máximo: 1e8, casasMáximas: 2 });
    if (!valor.válido) {
      mostrarErroDeCampo(entradaValor, valor.erro);
      válido = false;
      return;
    }
    itens.push({ descrição: entradaDescrição.value.trim(), valor: valor.valor });
  });
  if (!válido) return null;
  return itens;
}

function lerPagantes() {
  const modoPesos = campo('modo').value === 'pesos';
  const linhas = [...contêinerDePagantes.querySelectorAll('[data-linha]')];
  const pagantes = [];
  let válido = true;
  linhas.forEach((linha, índice) => {
    const entradaNome = linha.querySelector('[data-campo="nome"]');
    const entradaPeso = linha.querySelector('[data-campo="peso"]');
    if (!entradaNome.value.trim()) return; // linha em branco: ignora
    let peso = 1;
    if (modoPesos) {
      const verificação = validarQuantidade(entradaPeso.value, { rótulo: `Peso de ${entradaNome.value.trim()}`, mínimo: 0.01, máximo: 1000, casasMáximas: 2 });
      if (!verificação.válido) {
        mostrarErroDeCampo(entradaPeso, verificação.erro);
        válido = false;
        return;
      }
      peso = verificação.valor;
    }
    pagantes.push({ nome: entradaNome.value.trim(), peso });
  });
  if (!válido) return null;
  return pagantes;
}

function lerTotalDireto() {
  if (campo('modo-de-entrada').value !== 'total') return { ok: true, valor: null };
  const verificação = validarQuantidade(campo('total-direto').value, { rótulo: 'Total dos gastos', mínimo: 0.01, máximo: 1e8, casasMáximas: 2 });
  if (!verificação.válido) {
    mostrarErroDeCampo(campo('total-direto'), verificação.erro);
    return { ok: false };
  }
  return { ok: true, valor: verificação.valor };
}

function linha(rótulo, valor) {
  return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
}

function textoDaDivisão(cálculo) {
  return [`Total: ${formatarCentavos(cálculo.totalEmCentavos)}`, '', ...cálculo.partes.map((parte) => `${parte.nome}: ${formatarCentavos(parte.valorEmCentavos)}`)].join('\n');
}

function esconderResultado() {
  resultado.hidden = true;
  estadoVazio.hidden = false;
}

function calcular() {
  limparErrosDeCampo(formulário);
  const usaTotalDireto = campo('modo-de-entrada').value === 'total';
  const itens = usaTotalDireto ? [] : lerGastos();
  const totalDireto = lerTotalDireto();
  const pagantes = lerPagantes();
  if ((!usaTotalDireto && !itens) || !totalDireto.ok || !pagantes) {
    esconderResultado();
    focarPrimeiroErro(formulário);
    return;
  }
  if (!usaTotalDireto && itens.length === 0) {
    esconderResultado();
    exibirMensagem('Adicione ao menos um gasto com descrição e valor, ou escolha informar um total único.', { tipo: 'erro' });
    return;
  }
  const cálculo = calcularDivisãoDeDespesas({
    itens: usaTotalDireto ? undefined : itens,
    totalInformadoEmCentavos: usaTotalDireto ? Math.round(totalDireto.valor * 100) : null,
    pagantes,
    modo: campo('modo').value,
  });
  if (!cálculo.válido) {
    esconderResultado();
    exibirMensagem(cálculo.erro, { tipo: 'erro' });
    return;
  }
  últimoResultado = cálculo;

  resultado.querySelector('[data-total]').textContent = formatarCentavos(cálculo.totalEmCentavos);
  resultado.querySelector('[data-resumo]').replaceChildren(linha('Pessoas pagantes', String(cálculo.quantidadeDePagantes)), linha('Modo de divisão', campo('modo').value === 'pesos' ? 'Por pesos' : 'Partes iguais'));
  resultado.querySelector('[data-tabela-de-partes]').replaceChildren(
    criarElemento('div', { classe: 'tabela-rolável' }, [
      criarElemento('table', { classe: 'tabela' }, [
        criarElemento('thead', {}, [criarElemento('tr', {}, [criarElemento('th', { texto: 'Pessoa', atributos: { scope: 'col' } }), criarElemento('th', { texto: 'Valor', atributos: { scope: 'col' } })])]),
        criarElemento(
          'tbody',
          {},
          cálculo.partes.map((parte) => criarElemento('tr', {}, [criarElemento('td', { texto: parte.nome }), criarElemento('td', { dados: { numérico: '' }, texto: formatarCentavos(parte.valorEmCentavos) })])),
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

campo('modo-de-entrada').addEventListener('change', () => {
  const usaTotal = campo('modo-de-entrada').value === 'total';
  document.querySelector('[data-bloco-de-gastos]').hidden = usaTotal;
  document.querySelector('[data-bloco-de-total]').hidden = !usaTotal;
});

document.querySelector('[data-copiar]')?.addEventListener('click', async () => {
  if (!últimoResultado) return;
  const copiou = await copiarTexto(textoDaDivisão(últimoResultado));
  exibirMensagem(copiou ? 'Divisão copiada.' : 'Não foi possível copiar automaticamente. Selecione o texto manualmente.', { tipo: copiou ? 'sucesso' : 'erro' });
});

document.querySelector('[data-imprimir]')?.addEventListener('click', () => imprimirPágina());

formulárioDeSalvar?.addEventListener('submit', (evento) => {
  evento.preventDefault();
  limparErrosDeCampo(formulárioDeSalvar);
  const nome = campo('nome-da-divisão').value.trim();
  if (!nome || nome.length > 120) {
    mostrarErroDeCampo(campo('nome-da-divisão'), 'Dê um nome de 1 a 120 caracteres.');
    campo('nome-da-divisão').focus();
    return;
  }
  // O registro salvo sempre guarda uma lista de itens: quando a pessoa usa "Total
  // único", esse total vira um item sintético "Total informado", para não perder o
  // valor ao salvar e para que reabrir o registro sempre preencha a lista de gastos.
  let itens;
  if (campo('modo-de-entrada').value === 'total') {
    const totalDireto = lerTotalDireto();
    if (!totalDireto.ok || totalDireto.valor === null) {
      focarPrimeiroErro(formulário);
      return;
    }
    itens = [{ descrição: 'Total informado', valor: totalDireto.valor }];
  } else {
    itens = lerGastos();
    if (!itens) {
      focarPrimeiroErro(formulário);
      return;
    }
    if (itens.length === 0) {
      exibirMensagem('Adicione ao menos um gasto com descrição e valor antes de salvar.', { tipo: 'erro' });
      return;
    }
  }
  const pagantes = lerPagantes();
  if (!pagantes) {
    focarPrimeiroErro(formulário);
    return;
  }
  const salvo = salvarRegistroLocal(COLEÇÃO, { ...(registroAtual ?? {}), nome, modo: campo('modo').value, itens, pagantes });
  if (!salvo.salvo) {
    exibirMensagem(salvo.erro, { tipo: 'erro' });
    return;
  }
  registroAtual = salvo.registro;
  exibirMensagem('Divisão salva neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
});

const idSalvo = new URLSearchParams(window.location.search).get('registro');
if (idSalvo) {
  const registro = lerRegistroLocal(COLEÇÃO, idSalvo);
  if (registro) {
    registroAtual = registro;
    campo('nome-da-divisão').value = registro.nome;
    campo('modo').value = registro.modo;
    atualizarVisibilidadeDePeso();
    if (registro.itens.length > 0) {
      campo('modo-de-entrada').value = 'itens';
      document.querySelector('[data-bloco-de-gastos]').hidden = false;
      document.querySelector('[data-bloco-de-total]').hidden = true;
      contêinerDeGastos.querySelectorAll('[data-linha]').forEach((linhaAtual) => linhaAtual.remove());
      for (const gasto of registro.itens) {
        const novaLinha = criarLinhaDeGasto();
        contêinerDeGastos.insertBefore(novaLinha, botãoAdicionarGasto);
        novaLinha.querySelector('[data-campo="descrição"]').value = gasto.descrição;
        novaLinha.querySelector('[data-campo="valor"]').value = String(gasto.valor).replace('.', ',');
      }
    }
    contêinerDePagantes.querySelectorAll('[data-linha]').forEach((linhaAtual) => linhaAtual.remove());
    for (const pagante of registro.pagantes) {
      const novaLinha = criarLinhaDePagante();
      contêinerDePagantes.insertBefore(novaLinha, botãoAdicionarPagante);
      novaLinha.querySelector('[data-campo="nome"]').value = pagante.nome;
      novaLinha.querySelector('[data-campo="peso"]').value = String(pagante.peso).replace('.', ',');
    }
    atualizarVisibilidadeDePeso();
    calcular();
  } else {
    exibirMensagem('A divisão salva não foi encontrada neste aparelho.', { tipo: 'erro' });
  }
}
