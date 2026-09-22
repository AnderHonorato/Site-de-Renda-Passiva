// ponto-de-equilibrio.js — interface: quanto vender no mês para cobrir os custos.
import { ligarFormularioDeFerramenta } from '/estatico/compartilhado/compartilhado-ferramenta-formulario.js';
import { formatarMoeda, formatarNumero, formatarPercentual, lerNumero } from '/estatico/compartilhado/compartilhado-formatar.js';
import { t } from '/estatico/compartilhado/compartilhado-idioma.js';
import { calcularPontoDeEquilibrio } from '/estatico/ferramentas/ponto-de-equilibrio/ponto-de-equilibrio-calculo.js';

const SLUG = 'ponto-de-equilibrio';
const DIAS_DO_MES = 30;

const campos = {
  custosFixos: document.getElementById('campo-custosFixos'),
  lucroDesejado: document.getElementById('campo-lucroDesejado'),
  preco: document.getElementById('campo-preco'),
  custoVariavel: document.getElementById('campo-custoVariavel'),
  percentualVariavel: document.getElementById('campo-percentualVariavel'),
};

const mostrador = {
  quantidade: document.getElementById('resultado-quantidade'),
  receita: document.getElementById('resultado-receita'),
  margem: document.getElementById('resultado-margem'),
  indice: document.getElementById('resultado-indice'),
  porDia: document.getElementById('resultado-por-dia'),
  conta: document.getElementById('conta-formula-texto'),
};

function numeroOuZero(texto) {
  return texto?.trim() ? lerNumero(texto) : 0;
}

function lerEntradas(valores) {
  return {
    custosFixos: numeroOuZero(valores.custosFixos),
    lucroDesejado: numeroOuZero(valores.lucroDesejado),
    preco: lerNumero(valores.preco),
    custoVariavel: numeroOuZero(valores.custoVariavel),
    percentualVariavel: numeroOuZero(valores.percentualVariavel) / 100,
  };
}

function limparMostrador() {
  const traco = t('compartilhado.simbolos.sem_valor');
  for (const chave of ['quantidade', 'receita', 'margem', 'indice', 'porDia']) mostrador[chave].textContent = traco;
  mostrador.conta.textContent = t(`${SLUG}.conta.formula`);
}

function linhasDoResumo(resultado) {
  return [
    [t(`${SLUG}.resultado.titulo`), t(`${SLUG}.resultado.unidades`, { quantidade: formatarNumero(resultado.quantidade, 0) })],
    [t(`${SLUG}.resultado.receita`), formatarMoeda(resultado.receita)],
    [t(`${SLUG}.resultado.margem_unitaria`), formatarMoeda(resultado.margemUnitaria)],
    [t(`${SLUG}.resultado.indice`), formatarPercentual(resultado.indice, 1)],
    [t(`${SLUG}.resultado.por_dia`), t(`${SLUG}.resultado.unidades`, { quantidade: formatarNumero(Math.ceil(resultado.quantidade / DIAS_DO_MES), 0) })],
  ];
}

function mostrar(resultado, entradas) {
  mostrador.quantidade.textContent = t(`${SLUG}.resultado.unidades`, { quantidade: formatarNumero(resultado.quantidade, 0) });
  mostrador.receita.textContent = formatarMoeda(resultado.receita);
  mostrador.margem.textContent = formatarMoeda(resultado.margemUnitaria);
  mostrador.indice.textContent = formatarPercentual(resultado.indice, 1);
  mostrador.porDia.textContent = t(`${SLUG}.resultado.unidades`, {
    quantidade: formatarNumero(Math.ceil(resultado.quantidade / DIAS_DO_MES), 0),
  });
  mostrador.conta.textContent = `${t(`${SLUG}.conta.formula`)}\n${t(`${SLUG}.conta.linha`, {
    quantidade: formatarNumero(resultado.quantidade, 0),
    alvo: formatarMoeda(resultado.alvo),
    margem: formatarMoeda(resultado.margemUnitaria),
    preco: formatarMoeda(entradas.preco),
  })}`;
}

limparMostrador();

ligarFormularioDeFerramenta({
  slug: SLUG,
  campos,
  lerEntradas,
  calcular: calcularPontoDeEquilibrio,
  mostrar,
  limparMostrador,
  linhasDoResumo,
  exemplo: { custosFixos: '5.000,00', lucroDesejado: '', preco: '50,00', custoVariavel: '20,00', percentualVariavel: '10' },
  tituloDoTrabalho: (resultado) => t(`${SLUG}.trabalho.titulo_padrao`, { quantidade: formatarNumero(resultado.quantidade, 0) }),
});
