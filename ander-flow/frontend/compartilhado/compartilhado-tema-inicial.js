// compartilhado-tema-inicial.js — script clássico (NÃO é módulo), síncrono, o primeiro no <head>.
// Aplica data-tema antes da primeira pintura, para não piscar. Não usa import/export.
(function aplicarTemaInicial() {
  try {
    var escolha = null;
    try {
      escolha = window.localStorage.getItem('af-tema');
    } catch (erroArmazenamento) {
      escolha = null;
    }
    if (escolha !== 'claro' && escolha !== 'escuro' && escolha !== 'sistema') {
      var partesCookie = document.cookie ? document.cookie.split(';') : [];
      for (var i = 0; i < partesCookie.length; i++) {
        var parte = partesCookie[i].trim();
        if (parte.indexOf('tema=') === 0) {
          escolha = decodeURIComponent(parte.slice('tema='.length));
          break;
        }
      }
    }
    var efetivo;
    if (escolha === 'claro' || escolha === 'escuro') {
      efetivo = escolha;
    } else {
      var prefereEscuro = false;
      try {
        prefereEscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } catch (erroMidia) {
        prefereEscuro = false;
      }
      efetivo = prefereEscuro ? 'escuro' : 'claro';
    }
    document.documentElement.dataset.tema = efetivo;
  } catch (erroInesperado) {
    document.documentElement.dataset.tema = 'claro';
  }
})();
