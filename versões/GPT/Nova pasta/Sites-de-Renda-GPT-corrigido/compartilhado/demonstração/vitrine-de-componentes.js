// compartilhado/demonstração/vitrine-de-componentes.js
// Liga os scripts de interface a esta página de desenvolvimento para testar
// visualmente cada função — não é publicado com os produtos.

import { configurarNavegação } from '../scripts/interface/configurar-navegação.js';
import { configurarMenuMais } from '../scripts/interface/configurar-menu-mais.js';
import { configurarTecladoVirtual } from '../scripts/interface/configurar-teclado-virtual.js';
import { abrirDiálogo } from '../scripts/interface/abrir-diálogo.js';
import { confirmarAção } from '../scripts/interface/confirmar-ação.js';
import { exibirMensagem } from '../scripts/interface/exibir-mensagem.js';
import { mostrarErroDeCampo } from '../scripts/interface/mostrar-erro-de-campo.js';
import { limparErrosDeCampo } from '../scripts/interface/limpar-erros-de-campo.js';
import { focarPrimeiroErro } from '../scripts/interface/focar-primeiro-erro.js';
import { criarElemento } from '../scripts/interface/criar-elemento.js';

const TEXTOS_DE_MENSAGEM = {
  informação: 'Isto é uma mensagem informativa.',
  sucesso: 'Ação concluída com sucesso.',
  erro: 'Não foi possível concluir a ação.',
  aviso: 'Fique atento a este detalhe antes de continuar.',
};

function ligarDiálogoDeDemonstração() {
  const botão = document.querySelector('[data-abrir-diálogo-demonstração]');
  const diálogo = document.getElementById('diálogo-demonstração');
  if (botão && diálogo) {
    botão.addEventListener('click', () => abrirDiálogo(diálogo));
  }
}

function ligarPreferênciasDePrivacidade() {
  const diálogo = document.getElementById('preferências-de-privacidade');
  if (!diálogo) return;
  for (const gatilho of document.querySelectorAll('[data-abrir-preferências-de-privacidade]')) {
    gatilho.addEventListener('click', () => abrirDiálogo(diálogo));
  }
}

function ligarConsentimentoDeDemonstração() {
  const consentimento = document.getElementById('consentimento');
  const diálogoDePreferências = document.getElementById('preferências-de-privacidade');
  for (const botão of document.querySelectorAll('[data-consentimento]')) {
    botão.addEventListener('click', () => {
      const escolha = botão.dataset.consentimento;
      if (escolha === 'personalizar') {
        if (diálogoDePreferências) abrirDiálogo(diálogoDePreferências);
        return;
      }
      if (consentimento) consentimento.hidden = true;
      exibirMensagem(
        escolha === 'aceitar' ? 'Preferências salvas: opcionais aceitos.' : 'Preferências salvas: opcionais rejeitados.',
        { tipo: 'sucesso' },
      );
    });
  }
}

function ligarFaixaDeApoio() {
  const faixa = document.querySelector('[data-faixa-de-apoio]');
  const botão = document.querySelector('[data-dispensar-apoio]');
  if (faixa && botão) {
    botão.addEventListener('click', () => {
      faixa.hidden = true;
    });
  }
}

function ligarPublicidadeDeDemonstração() {
  const botão = document.querySelector('[data-alternar-publicidade]');
  if (!botão) return;
  botão.addEventListener('click', () => {
    const ativa = document.documentElement.classList.toggle('publicidade-ativa');
    botão.textContent = ativa ? 'Desativar publicidade simulada' : 'Simular publicidade ativa';
  });
}

function ligarNotificaçõesDeDemonstração() {
  for (const botão of document.querySelectorAll('[data-testar-mensagem]')) {
    botão.addEventListener('click', () => {
      const tipo = botão.dataset.testarMensagem;
      exibirMensagem(TEXTOS_DE_MENSAGEM[tipo] || 'Mensagem de teste.', { tipo });
    });
  }
}

function ligarCópiaDoCódigoPix() {
  const botão = document.querySelector('[data-copiar-alvo]');
  if (!botão) return;
  botão.addEventListener('click', async () => {
    const campo = document.getElementById(botão.dataset.copiarAlvo);
    if (!(campo instanceof HTMLTextAreaElement)) return;
    try {
      await navigator.clipboard.writeText(campo.value);
      exibirMensagem('Código copiado.', { tipo: 'sucesso' });
    } catch {
      campo.select();
      exibirMensagem('Não deu para copiar automaticamente — selecionamos o código para você copiar.', { tipo: 'aviso' });
    }
  });
}

function removerLinhaEditável(linha) {
  linha.setAttribute('data-saindo', '');
  const remover = () => linha.remove();
  linha.addEventListener('animationend', remover, { once: true });
  setTimeout(remover, 300);
}

function criarLinhaDeIngrediente(número) {
  const idIngrediente = `v-ing-din-${número}`;
  const idQuantidade = `v-qtd-din-${número}`;

  const botãoRemover = criarElemento(
    'button',
    { classe: 'botão botão-ícone botão-fantasma', atributos: { type: 'button', 'aria-label': 'Remover ingrediente' }, dados: { removerLinha: '' } },
  );

  const linha = criarElemento('div', { classe: 'linha-editável' }, [
    criarElemento('div', { classe: 'campo' }, [
      criarElemento('label', { texto: 'Ingrediente', atributos: { for: idIngrediente } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idIngrediente, type: 'text', placeholder: 'Novo ingrediente' } }),
    ]),
    criarElemento('div', { classe: 'campo campo-estreito' }, [
      criarElemento('label', { texto: 'Qtde.', atributos: { for: idQuantidade } }),
      criarElemento('input', { classe: 'entrada', atributos: { id: idQuantidade, type: 'text', inputmode: 'decimal', placeholder: '0' } }),
    ]),
    botãoRemover,
  ]);

  const íconeRemover = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  íconeRemover.setAttribute('class', 'ícone');
  íconeRemover.setAttribute('aria-hidden', 'true');
  íconeRemover.setAttribute('focusable', 'false');
  const uso = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  uso.setAttribute('href', '../recursos/ícones/ícones.svg#remover');
  íconeRemover.append(uso);
  botãoRemover.append(íconeRemover);

  return linha;
}

function ligarLinhasEditáveisDeDemonstração() {
  const lista = document.querySelector('.linhas-editáveis');
  const botãoAdicionar = document.querySelector('.linhas-editáveis-adicionar');
  if (!lista) return;

  let contador = 0;

  if (botãoAdicionar) {
    botãoAdicionar.addEventListener('click', () => {
      contador += 1;
      const novaLinha = criarLinhaDeIngrediente(contador);
      botãoAdicionar.insertAdjacentElement('beforebegin', novaLinha);
    });
  }

  lista.addEventListener('click', (evento) => {
    const botãoRemover = evento.target instanceof Element ? evento.target.closest('[data-remover-linha]') : null;
    if (!botãoRemover) return;
    const linha = botãoRemover.closest('.linha-editável');
    if (linha) removerLinhaEditável(linha);
  });
}

function ligarFormulárioDeDemonstração() {
  const formulário = document.getElementById('formulário-de-demonstração');
  if (!formulário) return;

  formulário.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const encontrouErro = focarPrimeiroErro(formulário);
    exibirMensagem(encontrouErro ? 'Corrija os campos destacados antes de continuar.' : 'Formulário validado com sucesso.', {
      tipo: encontrouErro ? 'erro' : 'sucesso',
    });
  });

  const botãoTestarErro = document.querySelector('[data-testar-erro-de-campo]');
  if (botãoTestarErro) {
    botãoTestarErro.addEventListener('click', () => {
      const campoNome = document.getElementById('v-nome');
      if (campoNome) {
        mostrarErroDeCampo(campoNome, 'Dê um nome para a receita antes de continuar.');
        focarPrimeiroErro(formulário);
      }
    });
  }

  const botãoLimparErros = document.querySelector('[data-limpar-erros]');
  if (botãoLimparErros) {
    botãoLimparErros.addEventListener('click', () => {
      limparErrosDeCampo(formulário);
      exibirMensagem('Erros do formulário limpos.', { tipo: 'informação' });
    });
  }
}

function ligarAçãoContextualDeDemonstração() {
  const botão = document.querySelector('.ação-contextual .botão');
  const valor = document.querySelector('.ferramenta-resultado .resultado-valor');
  if (!botão) return;
  botão.addEventListener('click', () => {
    if (valor) {
      valor.removeAttribute('data-atualizado');
      // Força reflow para reiniciar a animação de entrada do valor.
      void valor.offsetWidth;
      valor.setAttribute('data-atualizado', '');
    }
    exibirMensagem('Recalculado.', { tipo: 'sucesso', duração: 2500 });
  });
}

function ligarExclusãoDeSalvosDeDemonstração() {
  for (const botão of document.querySelectorAll('.item-salvo .botão-perigo')) {
    botão.addEventListener('click', async () => {
      const item = botão.closest('.item-salvo');
      const título = item?.querySelector('.item-salvo-título')?.textContent || 'este item';
      const confirmou = await confirmarAção({
        título: 'Excluir cálculo salvo?',
        mensagem: `“${título}” será removido dos seus salvos. Essa ação não pode ser desfeita.`,
        confirmar: 'Excluir',
        cancelar: 'Cancelar',
        perigosa: true,
      });
      if (confirmou && item) {
        item.remove();
        exibirMensagem('Item removido de "Salvos".', { tipo: 'sucesso' });
      }
    });
  }
}

configurarNavegação();
configurarMenuMais();
configurarTecladoVirtual();
ligarDiálogoDeDemonstração();
ligarPreferênciasDePrivacidade();
ligarConsentimentoDeDemonstração();
ligarFaixaDeApoio();
ligarPublicidadeDeDemonstração();
ligarNotificaçõesDeDemonstração();
ligarCópiaDoCódigoPix();
ligarLinhasEditáveisDeDemonstração();
ligarFormulárioDeDemonstração();
ligarAçãoContextualDeDemonstração();
ligarExclusãoDeSalvosDeDemonstração();
