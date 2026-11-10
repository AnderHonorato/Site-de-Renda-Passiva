import { api, dados, ligar, obterSessao, voltaSegura } from './comum.js';
import { confirmarSessaoAposAutenticacao } from '../../núcleo/sessão.js';
const destino = () => voltaSegura(new URLSearchParams(location.search).get('volta'));

ligar('form-entrar', async (form) => {
  await api('/api/autenticacao/entrar', { metodo: 'POST', dados: dados(form) });
  await confirmarSessaoAposAutenticacao();
  location.assign(destino());
});

function seAutenticado() {
  void obterSessao({ renovar: true }).then(s => {
    if (s?.usuario) location.replace(destino());
  }).catch(() => { /* Mantém formulário disponível se API estiver indisponível. */ });
}
seAutenticado();
window.addEventListener('pageshow', evento => { if (evento.persisted) seAutenticado(); });
