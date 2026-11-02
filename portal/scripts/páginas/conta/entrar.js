import { api, dados, ligar, obterSessao, voltaSegura } from './comum.js';

ligar('form-entrar', async (form) => {
  await api('/api/autenticacao/entrar', { metodo: 'POST', dados: dados(form) });
  location.assign(voltaSegura(new URLSearchParams(location.search).get('volta')));
});
