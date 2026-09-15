// Sincronizado de compartilhado/scripts/apoio/configurar-faixa-de-apoio.js — edite a origem e rode "npm run sincronizar" na raiz.
// Faixa discreta de apoio voluntário: pode ser dispensada por 30 dias.
import { criarArmazenamento } from '../armazenamento/criar-armazenamento.js';
import { exibirMensagem } from '../interface/exibir-mensagem.js';

const DIAS_DE_DISPENSA = 30;

export function configurarFaixaDeApoio() {
  const faixa = document.querySelector('[data-faixa-de-apoio]');
  if (!faixa) return;
  const armazenamento = criarArmazenamento();
  const dispensadaAté = armazenamento.ler('apoio-dispensado-até');
  if (typeof dispensadaAté === 'number' && dispensadaAté > Date.now()) {
    faixa.hidden = true;
    return;
  }
  faixa.querySelector('[data-dispensar-apoio]')?.addEventListener('click', () => {
    armazenamento.gravar('apoio-dispensado-até', Date.now() + DIAS_DE_DISPENSA * 86_400_000);
    faixa.hidden = true;
    exibirMensagem(`Pedido de apoio dispensado por ${DIAS_DE_DISPENSA} dias.`, { tipo: 'informação' });
  });
}
