// Inicialização comum a todas as páginas: navegação, teclado virtual, faixa de apoio,
// consentimento, anúncios (somente com configuração e consentimento), apoio e salvos.
// Cada etapa é isolada: uma falha não impede as demais nem as ferramentas.
import { configurarFaixaDeApoio } from './apoio/configurar-faixa-de-apoio.js';
import { configurarPáginaDeApoio } from './apoio/configurar-página-de-apoio.js';
import { configurarPáginaDeSalvos } from './armazenamento/configurar-página-de-salvos.js';
import { carregarConfiguração } from './configuração/carregar-configuração.js';
import { configurarMenuMais } from './interface/configurar-menu-mais.js';
import { configurarNavegação } from './interface/configurar-navegação.js';
import { configurarTecladoVirtual } from './interface/configurar-teclado-virtual.js';
import { configurarPáginaDeOrçamentoCompartilhado } from './orçamento/configurar-página-de-orçamento-compartilhado.js';
import { configurarConsentimento } from './privacidade/configurar-consentimento.js';
import { carregarAnúncios } from './publicidade/carregar-anúncios.js';
import { podeCarregarAnúncios } from './publicidade/pode-carregar-anúncios.js';

function executarEtapa(nome, etapa) {
  try {
    return etapa();
  } catch (erro) {
    console.error(`Falha ao iniciar ${nome}:`, erro);
    return undefined;
  }
}

export async function iniciarAplicaçãoComum({ coleçõesLocais = [] } = {}) {
  executarEtapa('navegação', configurarNavegação);
  executarEtapa('menu Mais', configurarMenuMais);
  executarEtapa('teclado virtual', configurarTecladoVirtual);
  executarEtapa('faixa de apoio', configurarFaixaDeApoio);

  const { configuração } = await carregarConfiguração();
  const página = { permiteAnúncios: document.documentElement.dataset.anúncios !== 'não' };

  const tentarCarregarAnúncios = (consentimento) => {
    if (podeCarregarAnúncios({ configuração, consentimento, página }).pode) carregarAnúncios(configuração);
  };
  const consentimento = executarEtapa('consentimento', () => configurarConsentimento(configuração, { aoMudar: tentarCarregarAnúncios }));
  if (consentimento) executarEtapa('publicidade', () => tentarCarregarAnúncios(consentimento.obterConsentimento()));

  if (document.querySelector('[data-apoio-formulário]')) executarEtapa('página de apoio', () => configurarPáginaDeApoio(configuração));
  if (document.querySelector('[data-salvos]')) executarEtapa('página de salvos', () => configurarPáginaDeSalvos(coleçõesLocais));
  if (document.querySelector('[data-orçamento-compartilhado]')) {
    configurarPáginaDeOrçamentoCompartilhado().catch((erro) => console.error('Falha ao abrir o orçamento compartilhado:', erro));
  }
}
