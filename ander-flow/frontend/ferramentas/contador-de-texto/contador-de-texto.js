// contador-de-texto.js — conta enquanto você digita. O texto não sai da memória do navegador.
import { mostrarAviso } from '/estatico/compartilhado/compartilhado-aviso.js';
import { copiarTexto, iniciarFerramenta, registrarUso } from '/estatico/compartilhado/compartilhado-ferramenta.js';
import { carregarRelacionadas } from '/estatico/compartilhado/compartilhado-ferramenta-formulario.js';
import { formatarNumero } from '/estatico/compartilhado/compartilhado-formatar.js';
import { aoTrocarIdioma, idiomaAtual, t } from '/estatico/compartilhado/compartilhado-idioma.js';
import { contarTexto, formatarDuracao } from '/estatico/ferramentas/contador-de-texto/contador-de-texto-calculo.js';

const SLUG = 'contador-de-texto';

// Limites comuns de onde o texto costuma ser colado. Nada de rede: é só uma tabela local.
const LIMITES = [
  { chave: 'x', maximo: 280 },
  { chave: 'sms', maximo: 160 },
  { chave: 'meta_descricao', maximo: 160 },
  { chave: 'titulo_pagina', maximo: 60 },
];

const area = document.getElementById('campo-texto');
const listaLimites = document.querySelector('.contador-de-texto__lista-limites');
const mostrador = {
  palavras: document.getElementById('resultado-palavras'),
  caracteres: document.getElementById('resultado-caracteres'),
  semEspaco: document.getElementById('resultado-sem-espaco'),
  frases: document.getElementById('resultado-frases'),
  paragrafos: document.getElementById('resultado-paragrafos'),
  leitura: document.getElementById('resultado-leitura'),
  fala: document.getElementById('resultado-fala'),
};

let ultima = contarTexto('');
let usoRegistrado = false;

function montarLimites(contagem) {
  while (listaLimites.firstChild) listaLimites.firstChild.remove();
  for (const limite of LIMITES) {
    const item = document.createElement('li');
    item.className = 'contador-de-texto__limite';

    const nome = document.createElement('span');
    nome.textContent = t(`${SLUG}.limites.${limite.chave}`);

    const restante = limite.maximo - contagem.caracteres;
    const valor = document.createElement('span');
    valor.className = restante < 0 ? 'etiqueta etiqueta--erro' : 'texto-2';
    valor.textContent = restante < 0
      ? t(`${SLUG}.limites.passou`, { quantidade: formatarNumero(Math.abs(restante), 0) })
      : t(`${SLUG}.limites.restam`, { quantidade: formatarNumero(restante, 0), total: formatarNumero(limite.maximo, 0) });

    item.append(nome, valor);
    listaLimites.append(item);
  }
}

function mostrar(contagem) {
  mostrador.palavras.textContent = t(`${SLUG}.resultado.palavras_valor`, { quantidade: formatarNumero(contagem.palavras, 0) });
  mostrador.caracteres.textContent = formatarNumero(contagem.caracteres, 0);
  mostrador.semEspaco.textContent = formatarNumero(contagem.caracteresSemEspaco, 0);
  mostrador.frases.textContent = formatarNumero(contagem.frases, 0);
  mostrador.paragrafos.textContent = formatarNumero(contagem.paragrafos, 0);
  mostrador.leitura.textContent = formatarDuracao(contagem.segundosDeLeitura);
  mostrador.fala.textContent = formatarDuracao(contagem.segundosDeFala);
  montarLimites(contagem);
}

function contar() {
  ultima = contarTexto(area.value, idiomaAtual());
  mostrar(ultima);
  if (!usoRegistrado && area.value.trim()) {
    usoRegistrado = true;
    registrarUso(SLUG);
  }
}

function textoDaContagem() {
  return [
    [t(`${SLUG}.resultado.titulo`), formatarNumero(ultima.palavras, 0)],
    [t(`${SLUG}.resultado.caracteres`), formatarNumero(ultima.caracteres, 0)],
    [t(`${SLUG}.resultado.caracteres_sem_espaco`), formatarNumero(ultima.caracteresSemEspaco, 0)],
    [t(`${SLUG}.resultado.frases`), formatarNumero(ultima.frases, 0)],
    [t(`${SLUG}.resultado.paragrafos`), formatarNumero(ultima.paragrafos, 0)],
    [t(`${SLUG}.resultado.leitura`), formatarDuracao(ultima.segundosDeLeitura)],
  ].map(([rotulo, valor]) => `${rotulo}: ${valor}`).join('\n');
}

area.addEventListener('input', contar);

document.querySelector('[data-acao="exemplo"]').addEventListener('click', () => {
  area.value = t(`${SLUG}.exemplo`);
  contar();
  area.focus();
});

document.querySelector('[data-acao="limpar"]').addEventListener('click', () => {
  area.value = '';
  contar();
  area.focus();
});

document.querySelector('[data-acao="copiar"]').addEventListener('click', async () => {
  await copiarTexto(textoDaContagem());
  mostrarAviso(t('compartilhado.acoes.copiado'));
});

aoTrocarIdioma(() => contar());

iniciarFerramenta({ slug: SLUG });
carregarRelacionadas(SLUG);
contar();
