// Sincronizado de compartilhado/scripts/apoio/configurar-página-de-apoio.js — edite a origem e rode "npm run sincronizar" na raiz.
// Fluxo da página Apoiar: escolher valor → revisar valor e recebedor → gerar QR Code
// e Copia e Cola → copiar, baixar ou fechar. Nunca confirma pagamento.
// Chave e recebedor vêm somente da configuração publicada, nunca da URL.
import { baixarArquivo } from '../armazenamento/baixar-arquivo.js';
import { formatarCentavos } from '../formatação/formatar-centavos.js';
import { exibirMensagem } from '../interface/exibir-mensagem.js';
import { limparErrosDeCampo } from '../interface/limpar-erros-de-campo.js';
import { mostrarErroDeCampo } from '../interface/mostrar-erro-de-campo.js';
import { copiarTexto } from './copiar-texto.js';
import { gerarPayloadPix } from './gerar-payload-pix.js';
import { renderizarCódigoQr } from './renderizar-código-qr.js';
import { validarValorPix } from './validar-valor-pix.js';

export function configurarPáginaDeApoio(configuração) {
  const formulário = document.querySelector('[data-apoio-formulário]');
  if (!formulário) return;
  const campos = formulário.querySelector('[data-apoio-campos]');
  const valorLivre = formulário.querySelector('#valor-livre');
  const revisão = document.querySelector('[data-apoio-revisão]');
  const código = document.querySelector('[data-apoio-código]');
  const áreaDoQr = document.querySelector('[data-apoio-qr]');
  const copiaECola = document.querySelector('[data-pix-copia-e-cola]');
  const { apoio } = configuração;
  let centavosEmRevisão = null;
  let payloadAtual = '';

  if (!apoio.ativo) {
    campos.disabled = true;
    return;
  }
  document.querySelector('[data-apoio-indisponível]')?.remove();

  const opções = () => [...formulário.querySelectorAll('input[name="valor"]')];

  function invalidarCódigo() {
    centavosEmRevisão = null;
    payloadAtual = '';
    revisão.hidden = true;
    código.hidden = true;
    áreaDoQr.replaceChildren();
    copiaECola.value = '';
  }

  const parâmetro = new URLSearchParams(window.location.search).get('valor');
  if (parâmetro && /^\d{1,7}$/.test(parâmetro)) {
    const sugerido = validarValorPix(Number(parâmetro));
    if (sugerido.válido) {
      const opção = opções().find((entrada) => Number(entrada.value) === sugerido.centavos);
      if (opção) opção.checked = true;
      else valorLivre.value = formatarCentavos(sugerido.centavos).replace(/^R\$\s?/, '');
    }
  }

  formulário.addEventListener('change', (evento) => {
    if (evento.target.name === 'valor') valorLivre.value = '';
    invalidarCódigo();
  });
  valorLivre.addEventListener('input', () => {
    if (valorLivre.value.trim()) for (const opção of opções()) opção.checked = false;
    invalidarCódigo();
  });

  formulário.addEventListener('submit', (evento) => {
    evento.preventDefault();
    limparErrosDeCampo(formulário);
    const texto = valorLivre.value.trim();
    const escolhida = opções().find((opção) => opção.checked);
    const resultado = texto ? validarValorPix(texto) : escolhida ? validarValorPix(Number(escolhida.value)) : { válido: false, erro: 'Escolha um dos valores ou digite outro valor.' };
    if (!resultado.válido) {
      mostrarErroDeCampo(valorLivre, resultado.erro);
      valorLivre.focus();
      return;
    }
    centavosEmRevisão = resultado.centavos;
    revisão.querySelector('[data-revisão-valor]').textContent = formatarCentavos(resultado.centavos);
    revisão.querySelector('[data-revisão-recebedor]').textContent = apoio.nomeDoRecebedor;
    revisão.querySelector('[data-revisão-cidade]').textContent = apoio.cidadeDoRecebedor;
    revisão.querySelector('[data-revisão-chave]').textContent = `${apoio.chavePix} (${apoio.tipoDeChave})`;
    código.hidden = true;
    revisão.hidden = false;
    revisão.focus();
  });

  revisão.querySelector('[data-alterar-valor]').addEventListener('click', () => {
    invalidarCódigo();
    const campoParaFocar = valorLivre.value.trim() ? valorLivre : opções().find((opção) => opção.checked) ?? opções()[0];
    campoParaFocar.focus();
  });

  revisão.querySelector('[data-gerar-pix]').addEventListener('click', async () => {
    if (centavosEmRevisão === null) return;
    const centavos = centavosEmRevisão;
    try {
      payloadAtual = gerarPayloadPix({ chave: apoio.chavePix, nome: apoio.nomeDoRecebedor, cidade: apoio.cidadeDoRecebedor, centavos });
      const qr = await renderizarCódigoQr(payloadAtual, { rótulo: `QR Code Pix de ${formatarCentavos(centavos)} para ${apoio.nomeDoRecebedor}` });
      if (centavos !== centavosEmRevisão) return;
      áreaDoQr.replaceChildren(qr);
      copiaECola.value = payloadAtual;
      código.querySelector('[data-código-valor]').textContent = formatarCentavos(centavos);
      revisão.hidden = true;
      código.hidden = false;
      código.focus();
    } catch (erro) {
      invalidarCódigo();
      exibirMensagem(`Não foi possível gerar o código: ${erro.message}`, { tipo: 'erro' });
    }
  });

  código.querySelector('[data-copiar-pix]').addEventListener('click', async () => {
    if (!payloadAtual) return;
    if (await copiarTexto(payloadAtual)) {
      exibirMensagem('Código Pix copiado. Cole no aplicativo do seu banco.', { tipo: 'sucesso' });
    } else {
      copiaECola.focus();
      copiaECola.select();
      exibirMensagem('Não foi possível copiar automaticamente. O código está selecionado: copie manualmente.', { tipo: 'erro' });
    }
  });

  código.querySelector('[data-baixar-qr]').addEventListener('click', () => {
    const svg = áreaDoQr.querySelector('svg');
    if (!svg || !payloadAtual) return;
    const valor = copiaECola.value && centavosEmRevisão !== null ? String(centavosEmRevisão) : 'pix';
    baixarArquivo(`qr-code-pix-${valor}-centavos.svg`, new XMLSerializer().serializeToString(svg), 'image/svg+xml;charset=utf-8');
  });

  código.querySelector('[data-fechar-código]').addEventListener('click', () => {
    invalidarCódigo();
    formulário.querySelector('button[type="submit"]').focus();
  });
}
