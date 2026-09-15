// Orquestrador comum às três ferramentas de planejamento (churrasco, festa infantil e
// almoço/encontro): monta a lista de itens editável a partir do catálogo padrão do
// perfil, valida as entradas, calcula o plano com calcularPlanoDeConsumo, mostra o
// resultado com premissas visíveis, e permite salvar, reabrir, copiar e imprimir.
// Cada página de ferramenta (churrasco.js, festa-infantil.js, almoço.js) só chama
// configurarPáginaDePlanejamento com o seu perfil e a sua coleção local.
import { lerRegistroLocal } from '../comum/armazenamento/ler-registro-local.js';
import { salvarRegistroLocal } from '../comum/armazenamento/salvar-registro-local.js';
import { copiarTexto } from '../comum/apoio/copiar-texto.js';
import { formatarCentavos } from '../comum/formatação/formatar-centavos.js';
import { formatarNúmero } from '../comum/formatação/formatar-número.js';
import { imprimirPágina } from '../comum/impressão/imprimir-página.js';
import { criarElemento } from '../comum/interface/criar-elemento.js';
import { exibirMensagem } from '../comum/interface/exibir-mensagem.js';
import { focarPrimeiroErro } from '../comum/interface/focar-primeiro-erro.js';
import { limparErrosDeCampo } from '../comum/interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../comum/interface/mostrar-erro-de-campo.js';
import { validarQuantidade } from '../comum/validação/validar-quantidade.js';
import { arredondarParaCentavos } from '../comum/matemática/arredondar-para-centavos.js';
import { calcularPlanoDeConsumo, DURAÇÃO_DE_REFERÊNCIA_EM_HORAS } from '../cálculos/calcular-plano-de-consumo.js';
import { montarCatálogoDeItensPadrão } from '../cálculos/montar-catálogo-de-itens-padrão.js';

const RÓTULO_DA_UNIDADE = { g: 'g', ml: 'ml', un: 'un.' };
const RÓTULO_DA_UNIDADE_DE_COMPRA = { g: 'kg', ml: 'litro', un: 'unidade' };

function formatarQuantidade(valor, unidadeBase) {
  if (unidadeBase === 'un') return `${formatarNúmero(Math.ceil(valor - 1e-9), { casas: 0 })} un.`;
  if (valor >= 1000) return `${formatarNúmero(valor / 1000, { casas: 3 })} ${unidadeBase === 'g' ? 'kg' : 'L'}`;
  return `${formatarNúmero(valor, { casas: 0 })} ${unidadeBase}`;
}

export function configurarPáginaDePlanejamento({ perfil, coleção }) {
  const formulário = document.getElementById('formulário-plano');
  if (!formulário) return;
  const formulárioDeSalvar = document.getElementById('formulário-salvar-plano');
  const contêinerDeItens = document.querySelector('[data-itens]');
  const estadoVazio = document.querySelector('[data-estado-vazio]');
  const resultado = document.querySelector('[data-resultado]');
  const campo = (id) => document.getElementById(id);

  const catálogo = montarCatálogoDeItensPadrão(perfil);
  const linhasPorChave = new Map();
  let últimoResultado = null;
  let últimosItensUsados = null;
  let registroAtual = null;

  function rótuloDeEmbalagem(item) {
    if (item.unidadeBase === 'un') return 'Unidades por pacote';
    return `Embalagem (${RÓTULO_DA_UNIDADE[item.unidadeBase]})`;
  }
  // O rótulo do preço precisa corresponder exatamente à unidade de compra usada no
  // cálculo (calcularCustoDeCompra): por quilo/litro para itens em g/ml, por pacote
  // quando o item em unidade tem embalagem informada, ou por unidade avulsa quando não.
  function rótuloDePreço(item) {
    if (item.unidadeBase === 'un') return item.embalagemNaUnidadeBase ? 'Preço por pacote (R$)' : 'Preço por unidade (R$)';
    return `Preço por ${RÓTULO_DA_UNIDADE_DE_COMPRA[item.unidadeBase]} (R$)`;
  }

  function criarLinhaDeItem(item) {
    const idIncluir = `item-${item.chave}-incluir`;
    const idDescrição = `item-${item.chave}-descrição`;
    const idQuantidade = `item-${item.chave}-quantidade`;
    const idEmbalagem = `item-${item.chave}-embalagem`;
    const idPreço = `item-${item.chave}-preço`;

    const caixaIncluir = criarElemento('input', { atributos: { type: 'checkbox', id: idIncluir, checked: item.incluído !== false ? true : undefined } });
    const entradaDescrição = criarElemento('input', { classe: 'entrada', atributos: { id: idDescrição, type: 'text', maxlength: 120, value: item.descrição, 'aria-label': `Nome do item: ${item.descrição}` } });
    const entradaQuantidade = criarElemento('input', {
      classe: 'entrada',
      atributos: { id: idQuantidade, type: 'text', inputmode: 'decimal', value: formatarNúmero(item.quantidadePorAdulto, { casas: 3 }).replace(/\s/g, ''), 'aria-label': `${item.descrição}: quantidade por adulto em ${RÓTULO_DA_UNIDADE[item.unidadeBase]}` },
    });
    const entradaEmbalagem = criarElemento('input', {
      classe: 'entrada',
      atributos: { id: idEmbalagem, type: 'text', inputmode: 'decimal', value: item.embalagemNaUnidadeBase ? String(item.embalagemNaUnidadeBase).replace('.', ',') : '', placeholder: 'Opcional', 'aria-label': `${item.descrição}: ${rótuloDeEmbalagem(item).toLowerCase()}` },
    });
    const entradaPreço = criarElemento('input', {
      classe: 'entrada',
      atributos: { id: idPreço, type: 'text', inputmode: 'decimal', placeholder: 'Opcional', 'aria-label': `${item.descrição}: ${rótuloDePreço(item).toLowerCase()}` },
    });
    const rótuloPreçoVisível = criarElemento('label', { classe: 'visualmente-oculto', texto: rótuloDePreço(item), atributos: { for: idPreço } });
    // Para itens em unidade, o preço é por pacote quando há embalagem informada, ou por
    // unidade avulsa quando não há. O rótulo acompanha o campo de embalagem ao vivo,
    // para nunca ficar descolado do que o cálculo realmente usa.
    if (item.unidadeBase === 'un') {
      entradaEmbalagem.addEventListener('input', () => {
        const itemAtual = { ...item, embalagemNaUnidadeBase: entradaEmbalagem.value.trim() ? 1 : null };
        const rótulo = rótuloDePreço(itemAtual);
        rótuloPreçoVisível.textContent = rótulo;
        entradaPreço.setAttribute('aria-label', `${item.descrição}: ${rótulo.toLowerCase()}`);
      });
    }

    const notas = [];
    if (item.comOsso) notas.push(`com osso, ${item.perdaDoOssoPercentual}% de perda`);
    if (item.cru) notas.push('comprado cru');
    if (item.fonte) notas.push('premissa com fonte pública, ver metodologia');
    else notas.push('premissa inicial do site, ajuste à sua realidade');

    const linha = criarElemento('tr', { dados: { linhaDeItem: item.chave } }, [
      criarElemento('td', {}, [criarElemento('label', { classe: 'visualmente-oculto', texto: `Incluir ${item.descrição}`, atributos: { for: idIncluir } }), caixaIncluir]),
      criarElemento('td', {}, [criarElemento('label', { classe: 'visualmente-oculto', texto: 'Nome do item', atributos: { for: idDescrição } }), entradaDescrição, criarElemento('p', { classe: 'campo-ajuda', texto: notas.join('; ') })]),
      criarElemento('td', { dados: { numérico: '' } }, [criarElemento('label', { classe: 'visualmente-oculto', texto: 'Quantidade por adulto', atributos: { for: idQuantidade } }), entradaQuantidade]),
      criarElemento('td', { dados: { numérico: '' } }, [criarElemento('label', { classe: 'visualmente-oculto', texto: rótuloDeEmbalagem(item), atributos: { for: idEmbalagem } }), entradaEmbalagem]),
      criarElemento('td', { dados: { numérico: '' } }, [rótuloPreçoVisível, entradaPreço]),
    ]);

    linhasPorChave.set(item.chave, { item, caixaIncluir, entradaDescrição, entradaQuantidade, entradaEmbalagem, entradaPreço });
    return linha;
  }

  function montarTabelaDeItens() {
    const corpo = criarElemento('tbody', {}, catálogo.map((item) => criarLinhaDeItem(item)));
    const tabela = criarElemento('table', { classe: 'tabela' }, [
      criarElemento('thead', {}, [
        criarElemento('tr', {}, [
          criarElemento('th', { texto: 'Incluir', atributos: { scope: 'col' } }),
          criarElemento('th', { texto: 'Item', atributos: { scope: 'col' } }),
          criarElemento('th', { texto: 'Por adulto', atributos: { scope: 'col' } }),
          criarElemento('th', { texto: 'Embalagem', atributos: { scope: 'col' } }),
          criarElemento('th', { texto: 'Preço pago', atributos: { scope: 'col' } }),
        ]),
      ]),
      corpo,
    ]);
    contêinerDeItens.replaceChildren(criarElemento('div', { classe: 'tabela-rolável' }, [tabela]));
  }

  function lerEntradasGerais() {
    limparErrosDeCampo(formulário);
    const regras = {
      adultos: { rótulo: 'Adultos', mínimo: 0, máximo: 5000, inteiro: true },
      crianças: { rótulo: 'Crianças', mínimo: 0, máximo: 5000, inteiro: true },
      'duração-em-horas': { rótulo: 'Duração', mínimo: 0.5, máximo: 72, casasMáximas: 1 },
      vegetarianos: { rótulo: 'Pessoas vegetarianas', mínimo: 0, máximo: 5000, inteiro: true },
      'sem-carne-vermelha': { rótulo: 'Pessoas sem carne vermelha', mínimo: 0, máximo: 5000, inteiro: true },
      'álcool-adultos': { rótulo: 'Adultos que consomem álcool', mínimo: 0, máximo: 5000, inteiro: true },
    };
    const valores = {};
    let válido = true;
    for (const [id, regra] of Object.entries(regras)) {
      const verificação = validarQuantidade(campo(id).value, regra);
      if (!verificação.válido) {
        mostrarErroDeCampo(campo(id), verificação.erro);
        válido = false;
      } else {
        valores[id] = verificação.valor;
      }
    }
    if (!válido) return null;
    return {
      adultos: valores.adultos,
      crianças: valores.crianças,
      duraçãoEmHoras: valores['duração-em-horas'],
      apetite: campo('apetite').value,
      vegetarianos: valores.vegetarianos,
      semCarneVermelha: valores['sem-carne-vermelha'],
      adultosComConsumoDeÁlcool: valores['álcool-adultos'],
    };
  }

  function lerItens() {
    const itens = [];
    let válido = true;
    for (const { item, caixaIncluir, entradaDescrição, entradaQuantidade, entradaEmbalagem, entradaPreço } of linhasPorChave.values()) {
      const incluído = caixaIncluir.checked;
      const descrição = entradaDescrição.value.trim() || item.descrição;
      if (!incluído) {
        itens.push({ ...item, descrição, incluído: false });
        continue;
      }
      const quantidade = validarQuantidade(entradaQuantidade.value, { rótulo: `${descrição}: quantidade por adulto`, mínimo: 0.001, máximo: 1e6, casasMáximas: 3 });
      if (!quantidade.válido) {
        mostrarErroDeCampo(entradaQuantidade, quantidade.erro);
        válido = false;
        continue;
      }
      const embalagem = validarQuantidade(entradaEmbalagem.value, { rótulo: `${descrição}: embalagem`, mínimo: 0.001, máximo: 1e6, casasMáximas: 3, obrigatório: false });
      if (!embalagem.válido) {
        mostrarErroDeCampo(entradaEmbalagem, embalagem.erro);
        válido = false;
        continue;
      }
      const preço = validarQuantidade(entradaPreço.value, { rótulo: `${descrição}: preço`, mínimo: 0, máximo: 1e8, casasMáximas: 2, obrigatório: false });
      if (!preço.válido) {
        mostrarErroDeCampo(entradaPreço, preço.erro);
        válido = false;
        continue;
      }
      itens.push({
        ...item,
        descrição,
        incluído: true,
        quantidadePorAdulto: quantidade.valor,
        embalagemNaUnidadeBase: embalagem.valor,
        preçoPorUnidadeDeCompraEmCentavos: preço.valor === null ? null : arredondarParaCentavos(preço.valor),
      });
    }
    if (!válido) return null;
    return itens;
  }

  function linha(rótulo, valor) {
    return criarElemento('div', {}, [criarElemento('dt', { texto: rótulo }), criarElemento('dd', { texto: valor })]);
  }

  function textoDaQuantidade(item) {
    if (item.quantidadeParaComprar === 0) {
      return item.notas.find((nota) => nota.startsWith('Não incluído')) ?? `Não incluído (0 ${item.unidadeBase})`;
    }
    return formatarQuantidade(item.quantidadeParaComprar, item.unidadeBase);
  }

  function textoDaListaDeCompras(cálculo) {
    // Itens não incluídos por escolha (por exemplo, cerveja com 0 consumidores de
    // álcool) não entram na lista de compras copiável: nada vai realmente ser comprado.
    return cálculo.itens
      .filter((item) => item.quantidadeParaComprar > 0)
      .map((item) => `${formatarQuantidade(item.quantidadeParaComprar, item.unidadeBase)} — ${item.descrição}`)
      .join('\n');
  }

  function esconderResultado() {
    resultado.hidden = true;
    estadoVazio.hidden = false;
  }

  function mostrarResultado(entradas, itensUsados, cálculo) {
    últimoResultado = cálculo;
    últimosItensUsados = itensUsados;

    const linhasDaTabela = cálculo.itens.map((item) =>
      criarElemento('tr', {}, [
        criarElemento('td', { texto: item.descrição }),
        criarElemento('td', { dados: { numérico: '' }, texto: textoDaQuantidade(item) }),
        criarElemento('td', { dados: { numérico: '' }, texto: item.custoEmCentavos === null ? '—' : formatarCentavos(item.custoEmCentavos) }),
      ]),
    );
    const tabela = criarElemento('div', { classe: 'tabela-rolável' }, [
      criarElemento('table', { classe: 'tabela' }, [
        criarElemento('thead', {}, [criarElemento('tr', {}, [criarElemento('th', { texto: 'Item', atributos: { scope: 'col' } }), criarElemento('th', { texto: 'Comprar', atributos: { scope: 'col' } }), criarElemento('th', { texto: 'Custo', atributos: { scope: 'col' } })])]),
        criarElemento('tbody', {}, linhasDaTabela),
      ]),
    ]);

    resultado.querySelector('[data-tabela-de-itens]').replaceChildren(tabela);

    const valorPrincipal = resultado.querySelector('[data-total]');
    valorPrincipal.textContent = cálculo.quantidadeDeItensComPreço > 0 ? formatarCentavos(cálculo.totalEmCentavos) : 'Informe os preços para ver o total';

    resultado.querySelector('[data-resumo]').replaceChildren(
      linha('Pessoas', `${cálculo.totalDePessoas} (${entradas.adultos} adultos, ${entradas.crianças} crianças)`),
      linha('Fator de apetite aplicado', `${formatarNúmero(cálculo.fatorApetite, { casas: 2 })}×`),
      linha('Fator de duração aplicado', `${formatarNúmero(cálculo.fatorDuração, { casas: 2 })}× (referência de ${DURAÇÃO_DE_REFERÊNCIA_EM_HORAS} h)`),
      linha('Redução por acompanhamentos', cálculo.reduzCarnePorAcompanhamentos ? 'Sim, 10% a menos na carne (3 ou mais acompanhamentos incluídos)' : 'Não se aplica'),
    );

    const notasDeItens = cálculo.itens.filter((item) => item.notas.length > 0);
    resultado.querySelector('[data-memória]').replaceChildren(
      ...(notasDeItens.length
        ? notasDeItens.map((item) => criarElemento('li', { texto: `${item.descrição}: ${item.notas.join('; ')}` }))
        : [criarElemento('li', { texto: 'Nenhum ajuste especial de osso, cru/cozido ou embalagem se aplicou aos itens incluídos.' })]),
    );
    if (cálculo.algumItemSemPreço) {
      exibirMensagem('Alguns itens ficaram sem preço informado e não entram no total em reais; a quantidade a comprar aparece normalmente.', { tipo: 'informação' });
    }

    estadoVazio.hidden = true;
    resultado.hidden = false;
  }

  function calcular() {
    const entradas = lerEntradasGerais();
    const itens = lerItens();
    if (!entradas || !itens) {
      esconderResultado();
      focarPrimeiroErro(formulário);
      return;
    }
    const cálculo = calcularPlanoDeConsumo({ ...entradas, itens });
    if (!cálculo.válido) {
      esconderResultado();
      exibirMensagem(cálculo.erro, { tipo: 'erro' });
      return;
    }
    mostrarResultado(entradas, itens, cálculo);
  }

  function preencherFormulário(registro) {
    campo('adultos').value = String(registro.adultos);
    campo('crianças').value = String(registro.crianças);
    campo('duração-em-horas').value = String(registro.duraçãoEmHoras).replace('.', ',');
    campo('apetite').value = registro.apetite;
    campo('vegetarianos').value = String(registro.vegetarianos);
    campo('sem-carne-vermelha').value = String(registro.semCarneVermelha);
    campo('álcool-adultos').value = String(registro.adultosComConsumoDeÁlcool);
    campo('nome-do-plano').value = registro.nome;
    for (const itemSalvo of registro.itens) {
      const linhaAtual = linhasPorChave.get(itemSalvo.chave);
      if (!linhaAtual) continue;
      linhaAtual.caixaIncluir.checked = itemSalvo.incluído !== false;
      if (typeof itemSalvo.descrição === 'string') linhaAtual.entradaDescrição.value = itemSalvo.descrição;
      linhaAtual.entradaQuantidade.value = formatarNúmero(itemSalvo.quantidadePorAdulto, { casas: 3 }).replace(/\s/g, '');
      linhaAtual.entradaEmbalagem.value = itemSalvo.embalagemNaUnidadeBase ? String(itemSalvo.embalagemNaUnidadeBase).replace('.', ',') : '';
      linhaAtual.entradaPreço.value = typeof itemSalvo.preçoPorUnidadeDeCompraEmCentavos === 'number' ? formatarNúmero(itemSalvo.preçoPorUnidadeDeCompraEmCentavos / 100, { casas: 2 }) : '';
    }
  }

  montarTabelaDeItens();

  // Atalhos de tamanho comum de evento (10, 20, 30, 50 pessoas): preenchem os mesmos
  // campos da ferramenta e calculam na hora, sem levar a páginas separadas por número.
  document.querySelector('[data-atalhos-de-pessoas]')?.addEventListener('click', (evento) => {
    const botão = evento.target.closest('[data-atalho]');
    if (!botão) return;
    campo('adultos').value = botão.dataset.atalho;
    campo('crianças').value = '0';
    calcular();
  });

  formulário.addEventListener('submit', (evento) => {
    evento.preventDefault();
    calcular();
  });

  formulárioDeSalvar?.addEventListener('submit', (evento) => {
    evento.preventDefault();
    limparErrosDeCampo(formulárioDeSalvar);
    const nome = campo('nome-do-plano').value.trim();
    if (!nome || nome.length > 120) {
      mostrarErroDeCampo(campo('nome-do-plano'), 'Dê um nome de 1 a 120 caracteres para este plano.');
      campo('nome-do-plano').focus();
      return;
    }
    if (!últimosItensUsados) return;
    const entradas = lerEntradasGerais();
    if (!entradas) {
      focarPrimeiroErro(formulário);
      return;
    }
    const salvo = salvarRegistroLocal(coleção, {
      ...(registroAtual ?? {}),
      nome,
      perfil,
      ...entradas,
      itens: últimosItensUsados.map((item) => ({
        chave: item.chave,
        descrição: item.descrição,
        incluído: item.incluído !== false,
        quantidadePorAdulto: item.quantidadePorAdulto,
        embalagemNaUnidadeBase: item.embalagemNaUnidadeBase,
        preçoPorUnidadeDeCompraEmCentavos: item.preçoPorUnidadeDeCompraEmCentavos,
      })),
    });
    if (!salvo.salvo) {
      exibirMensagem(salvo.erro, { tipo: 'erro' });
      return;
    }
    registroAtual = salvo.registro;
    exibirMensagem('Plano salvo neste aparelho. Veja em Salvos.', { tipo: 'sucesso' });
  });

  document.querySelector('[data-copiar-lista]')?.addEventListener('click', async () => {
    if (!últimoResultado) return;
    const copiou = await copiarTexto(textoDaListaDeCompras(últimoResultado));
    exibirMensagem(copiou ? 'Lista de compras copiada.' : 'Não foi possível copiar automaticamente. Selecione o texto manualmente.', { tipo: copiou ? 'sucesso' : 'erro' });
  });

  document.querySelector('[data-imprimir]')?.addEventListener('click', () => imprimirPágina());

  const idSalvo = new URLSearchParams(window.location.search).get('registro');
  if (idSalvo) {
    const registro = lerRegistroLocal(coleção, idSalvo);
    if (registro) {
      registroAtual = registro;
      preencherFormulário(registro);
      calcular();
    } else {
      exibirMensagem('O plano salvo não foi encontrado neste aparelho.', { tipo: 'erro' });
    }
  }
}
