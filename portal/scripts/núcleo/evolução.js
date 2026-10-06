import { criarIconeNivel } from './nível.js';

const en = () => document.documentElement.lang === 'en';

function elemento(tag, classe, texto) {
  const no = document.createElement(tag);
  if (classe) no.className = classe;
  if (texto !== undefined) no.textContent = texto;
  return no;
}

/** Celebra uma subida confirmada pelo servidor com o mesmo visual do chat. */
export function mostrarNovoNivel(anterior, atual) {
  const antes = Number(anterior), depois = Number(atual);
  if (!Number.isInteger(antes) || !Number.isInteger(depois) || depois <= antes) return;
  document.querySelector('.chat__nivel')?.remove();
  const dialogo = elemento('dialog', 'chat__nivel');
  const titulo = elemento('h2', '', en() ? `You reached level ${depois}!` : `Você chegou ao nível ${depois}!`);
  const selos = elemento('div', 'chat__nivel-selos');
  selos.append(criarIconeNivel(antes), criarIconeNivel(depois));
  const texto = elemento('p', '', en() ? 'Keep creating and talking with the community.' : 'Continue criando e conversando com a comunidade.');
  const fechar = elemento('button', 'botão', en() ? 'Continue' : 'Continuar');
  fechar.type = 'button';
  fechar.addEventListener('click', () => {
    if (typeof dialogo.close === 'function') dialogo.close(); else dialogo.remove();
  });
  dialogo.addEventListener('close', () => dialogo.remove());
  dialogo.append(titulo, selos, texto, fechar);
  document.body.append(dialogo);
  if (typeof dialogo.showModal === 'function') dialogo.showModal();
  else { dialogo.setAttribute('open', ''); dialogo.classList.add('chat__nivel--fallback'); }
}

/** Atualiza a sessão compartilhada e avisa os componentes visíveis. */
export function atualizarNivel(sessao, nivel) {
  if (!sessao?.usuario) return false;
  const atual = Number(nivel);
  if (!Number.isInteger(atual) || atual < 1) return false;
  const anterior = Number(sessao.usuario.nivel) || 1;
  if (atual <= anterior) return false;
  sessao.usuario.nivel = atual;
  document.dispatchEvent(new CustomEvent('portal:nivel-alterado', {
    detail: { usuarioId: sessao.usuario.id, anterior, atual },
  }));
  if (atual > anterior) mostrarNovoNivel(anterior, atual);
  return true;
}
