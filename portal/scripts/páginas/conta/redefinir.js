import { api, dados, en, estado, ligar, obterSessao } from './comum.js';

const token = new URLSearchParams(location.hash.slice(1)).get('token');
history.replaceState(null, '', location.pathname + location.search);
if (!token) estado(en ? 'Recovery link is missing or invalid.' : 'O link de recuperação está ausente ou inválido.', true);
ligar('form-redefinir', async (form) => {
  if (!token) throw new Error('token_ausente');
  await api('/api/autenticacao/redefinir-senha', { metodo: 'POST', dados: { token, ...dados(form) } });
  form.reset();
  estado(en ? 'Password updated. You can sign in now.' : 'Senha atualizada. Agora você pode entrar.');
});
