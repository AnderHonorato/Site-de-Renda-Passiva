// margem-de-contribuicao.js — interface: o que sobra de cada venda.
import { ligarFormularioDeFerramenta } from '/estatico/compartilhado/compartilhado-ferramenta-formulario.js';
import { formatarMoeda, formatarNumero, formatarPercentual, lerNumero } from '/estatico/compartilhado/compartilhado-formatar.js';
import { t } from '/estatico/compartilhado/compartilhado-idioma.js';
import { calcularMargemDeContribuicao } from '/estatico/ferramentas/margem-de-contribuicao/margem-de-contribuicao-calculo.js';

const SLUG = 'margem-de-contribuicao';

const campos = {
  preco: document.getElementById('campo-preco'),
  custoVariavel: document.getElementById('campo-custoVariavel'),
  percentualVariavel: document.getElementById('campo-percentualVariavel'),
  quantidade: document.getElementById('campo-quantidade'),
  custosFixos: document.getElementById('campo-custosFixos'),
};

const mostrador = {
  margem: document.getElementById('resultado-margem'),
  indice: document.getElementById('resultado-indice'),
  total: document.getElementById('resultado-total'),
  resultado: document.getElementById('resultado-resultado'),
  equilibrio: document.getElementById('resultado-equilibrio'),
  conta: document.getElementById('conta-formula-texto'),
  avisoNegativa: document.getElementById('aviso-margem-negativa'),
};

function numeroOuZero(texto) {
  return texto?.trim() ? lerNumero(texto) : 0;
}

function lerEntradas(valores) {
  return {
    preco: lerNumero(valores.preco),
    custoVariavel: numeroOuZero(valores.custoVariavel),
    percentualVariavel: numeroOuZero(valores.percentualVariavel) / 100,
    quantidade: numeroOuZero(valores.quantidade),
    custosFixos: numeroOuZero(valores.custosFixos),
  };
}

function limparMostrador() {
  const traco = t('compartilhado.simbolos.sem_valor');
  for (const chave of ['margem', 'indice', 'total', 'resultado', 'equilibrio']) mostrador[chave].textContent = traco;
  mostrador.conta.textContent = t(`${SLUG}.conta.formula`);
  mostrador.avisoNegativa.hidden = true;
}

function linhasDoResumo(resultado) {
  const linhas = [
    [t(`${SLUG}.resultado.titulo`), formatarMoeda(resultado.margemUnitaria)],
    [t(`${SLUG}.resultado.indice`), formatarPercentual(resultado.indice, 1)],
    [t(`${SLUG}.resultado.total`), formatarMoeda(resultado.total)],
    [t(`${SLUG}.resultado.resultado`), formatarMoeda(resultado.resultado)],
  ];
  if (resultado.quantidadeDeEquilibrio !== null) {
    linhas.push([
      t(`${SLUG}.resultado.equilibrio`),
      t(`${SLUG}.resultado.unidades`, { quantidade: formatarNumero(resultado.quantidadeDeEquilibrio, 0) }),
    ]);
  }
  return linhas;
}

function mostrar(resultado, entradas) {
  mostrador.margem.textContent = formatarMoeda(resultado.margemUnitaria);
  mostrador.indice.textContent = formatarPercentual(resultado.indice, 1);
  mostrador.total.textContent = formatarMoeda(resultado.total);
  mostrador.resultado.textContent = formatarMoeda(resultado.resultado);
  mostrador.equilibrio.textContent = resultado.quantidadeDeEquilibrio === null
    ? t('compartilhado.simbolos.sem_valor')
    : t(`${SLUG}.resultado.unidades`, { quantidade: formatarNumero(resultado.quantidadeDeEquilibrio, 0) });
  mostrador.avisoNegativa.hidden = !resultado.margemNegativa;

  mostrador.conta.textContent = `${t(`${SLUG}.conta.formula`)}\n${t(`${SLUG}.conta.linha`, {
    margem: formatarMoeda(resultado.margemUnitaria),
    preco: formatarMoeda(entradas.preco),
    custo: formatarMoeda(entradas.custoVariavel),
    percentual: formatarPercentual(entradas.percentualVariavel, 1),
  })}`;
}

limparMostrador();

ligarFormularioDeFerramenta({
  slug: SLUG,
  campos,
  lerEntradas,
  calcular: calcularMargemDeContribuicao,
  mostrar,
  limparMostrador,
  linhasDoResumo,
  exemplo: { preco: '80,00', custoVariavel: '32,00', percentualVariavel: '12', quantidade: '150', custosFixos: '4.000,00' },
  tituloDoTrabalho: (resultado) => t(`${SLUG}.trabalho.titulo_padrao`, { margem: formatarMoeda(resultado.margemUnitaria) }),
});
