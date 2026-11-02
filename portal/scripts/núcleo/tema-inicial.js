/**
 * Aplica o tema salvo antes da primeira pintura.
 *
 * É um script clássico (não módulo) e carregado sem `defer` de propósito:
 * precisa rodar antes do corpo aparecer, senão o modo escuro pisca branco.
 * Fica em arquivo próprio porque a política de segurança do site não permite
 * script embutido no HTML.
 */
(function aplicarTemaSalvo() {
  try {
    var salvo = JSON.parse(localStorage.getItem('portal.tema') || '"sistema"');
    if (salvo === 'claro' || salvo === 'escuro') {
      document.documentElement.setAttribute('data-tema', salvo);
    }
  } catch (erro) {
    // Navegador em modo privado ou com armazenamento bloqueado: segue o sistema.
  }
})();
