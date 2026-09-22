// planos.js — botão "Assinar o Plus" explica que a liberação hoje é manual (sem cobrança automática).
import { confirmar } from '/estatico/compartilhado/compartilhado-aviso.js';
import { t } from '/estatico/compartilhado/compartilhado-idioma.js';

const botaoAssinar = document.querySelector('[data-acao="assinar-plus"]');

botaoAssinar?.addEventListener('click', () => {
  confirmar({
    titulo: t('planos.plus.modal.titulo'),
    texto: t('planos.plus.modal.texto'),
    rotuloConfirmar: t('planos.plus.modal.entendi'),
  });
});
