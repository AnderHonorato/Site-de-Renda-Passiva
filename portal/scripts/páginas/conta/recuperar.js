import { api, dados, en, estado, ligar, obterSessao } from './comum.js';

ligar('form-recuperar', async (form) => {
  await api('/api/autenticacao/recuperar-senha', { metodo: 'POST', dados: dados(form) });
  estado(en ? 'If this email is registered, recovery instructions were sent.' : 'Se o e-mail estiver cadastrado, as instruções de recuperação foram enviadas.');
});
