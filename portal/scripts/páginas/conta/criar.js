import { api, dados, en, estado, ligar, obterSessao } from './comum.js';

const campo = document.querySelector('#form-criar [name="usuario"]');
let temporizador;
campo?.addEventListener('input', () => {
  clearTimeout(temporizador);
  const alvo = document.getElementById('usuario-disponibilidade');
  const usuario = campo.value.toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(usuario)) { alvo.textContent = ''; return; }
  temporizador = setTimeout(async () => {
    try {
      const resposta = await api(`/api/perfil/disponibilidade?usuario=${encodeURIComponent(usuario)}`);
      if (campo.value.toLowerCase() !== usuario) return;
      alvo.textContent = resposta.disponivel ? (en ? 'Available' : 'Disponível') :
        `${en ? 'Unavailable' : 'Indisponível'}${Array.isArray(resposta.sugestoes) ? `: ${resposta.sugestoes.map((s) => `@${s}`).join(', ')}` : ''}`;
    } catch { alvo.textContent = ''; }
  }, 400);
});
ligar('form-criar', async (form) => {
  const valores = dados(form);
  valores.usuario = valores.usuario.toLowerCase();
  valores.idade = Number(valores.idade);
  valores.aceitaTermos = Boolean(valores.aceitaTermos);
  await api('/api/autenticacao/criar-conta', { metodo: 'POST', dados: valores });
  estado(en ? 'Account created.' : 'Conta criada.');
  location.assign(document.documentElement.dataset.raizIdioma + 'conta/');
});
