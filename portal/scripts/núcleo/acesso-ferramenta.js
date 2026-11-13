/** A interface só monta ferramentas pagas depois de consultar a sessão do servidor. */
import { obterSessao, caminhoDoIdioma } from './sessão.js';
import { ícone } from './ícones.js';

export function temAcessoFerramenta(plano, usuario) {
  if (plano === 'gratuito') return true;
  if (!['plus', 'premium'].includes(plano) || !usuario) return false;
  if (usuario.situacao && usuario.situacao !== 'ativo') return false;
  if (usuario.papel === 'admin') return true;
  return usuario.plano === 'premium' || (plano === 'plus' && usuario.plano === 'plus');
}

function elemento(tag, classe, texto) {
  const no = document.createElement(tag);
  if (classe) no.className = classe;
  if (texto) no.textContent = texto;
  return no;
}

function mostrarAcesso(raiz, plano, estado, tentar) {
  const premium = plano === 'premium';
  const nome = premium ? 'Premium' : 'Plus';
  const caixa = elemento('section', 'acesso-ferramenta');
  caixa.dataset.acesso = estado;
  caixa.setAttribute('aria-labelledby', 'acesso-ferramenta-titulo');
  const simbolo = elemento('span', 'acesso-ferramenta__icone');
  simbolo.setAttribute('aria-hidden', 'true');
  simbolo.innerHTML = ícone('cadeado');
  const titulo = elemento('h2', '', `Recurso exclusivo ${nome}`);
  titulo.id = 'acesso-ferramenta-titulo';
  const descricao = elemento('p', '', premium
    ? 'Esta ferramenta exige o plano Premium ativo.'
    : 'Esta ferramenta está incluída nos planos Plus e Premium.');
  const mensagens = {
    verificando: 'Verificando o acesso da sua conta…',
    visitante: `Entre na sua conta com o plano ${premium ? 'Premium' : 'Plus ou Premium'} ativo para executar.`,
    plano: 'Seu plano atual não inclui esta ferramenta. A execução está bloqueada.',
    indisponivel: 'Não foi possível verificar seu acesso. A execução permanece bloqueada.',
    falha: 'Seu acesso foi confirmado, mas não foi possível carregar a ferramenta.',
  };
  const status = elemento('p', 'pequeno suave', mensagens[estado]);
  status.setAttribute('role', 'status');
  const acoes = elemento('div', 'ações acesso-ferramenta__acoes');
  const bloqueado = elemento('button', 'botão botão--linha', 'Execução bloqueada');
  bloqueado.type = 'button';
  bloqueado.disabled = true;
  acoes.append(bloqueado);
  if (estado === 'visitante') {
    const entrar = elemento('a', 'botão', 'Entrar na conta');
    entrar.href = `${caminhoDoIdioma('entrar.html')}?volta=${encodeURIComponent(location.pathname + location.search)}`;
    acoes.append(entrar);
  }
  if (estado === 'indisponivel' || estado === 'falha') {
    const repetir = elemento('button', 'botão', 'Tentar novamente');
    repetir.type = 'button';
    repetir.addEventListener('click', () => { repetir.disabled = true; tentar(); });
    acoes.append(repetir);
  }
  if (estado !== 'verificando') {
    const planos = elemento('a', 'botão botão--texto', 'Ver planos');
    planos.href = caminhoDoIdioma('planos.html');
    acoes.append(planos);
  }
  caixa.append(simbolo, titulo, descricao, status, acoes);
  raiz.replaceChildren(caixa);
}

/** Revalida ao voltar à aba, ao histórico ou após autenticação; nunca usa plano local. */
export async function protegerFerramenta({ raiz, ferramenta, montar }) {
  let emCurso = null, pendente = false, montada = false, usuarioMontado = null;
  mostrarAcesso(raiz, ferramenta.plano, 'verificando');

  function atualizar({ renovar = false } = {}) {
    raiz.inert = montada;
    raiz.setAttribute('aria-busy', 'true');
    if (emCurso) {
      pendente = true;
      return emCurso;
    }
    emCurso = (async () => {
      let renovarAgora = renovar;
      do {
        pendente = false;
        let sessao;
        try { sessao = await obterSessao({ renovar: renovarAgora }); }
        catch {
          if (pendente) { renovarAgora = true; continue; }
          montada = false;
          mostrarAcesso(raiz, ferramenta.plano, 'indisponivel', revalidar);
          break;
        }
        renovarAgora = true;
        if (pendente) continue;
        if (!temAcessoFerramenta(ferramenta.plano, sessao?.usuario)) {
          montada = false;
          usuarioMontado = null;
          mostrarAcesso(raiz, ferramenta.plano, sessao?.usuario ? 'plano' : 'visitante', revalidar);
        } else if (!montada || usuarioMontado !== sessao.usuario.id) {
          try {
            montada = await montar(() => !pendente);
            usuarioMontado = sessao.usuario.id;
          } catch {
            montada = false;
            if (!pendente) mostrarAcesso(raiz, ferramenta.plano, 'falha', revalidar);
          }
        }
      } while (pendente);
    })().finally(() => {
      emCurso = null;
      raiz.inert = document.visibilityState === 'hidden';
      raiz.removeAttribute('aria-busy');
    });
    return emCurso;
  }
  const revalidar = () => atualizar({ renovar: true });
  document.addEventListener('portal:sessao-alterada', revalidar);
  window.addEventListener('focus', revalidar);
  window.addEventListener('pageshow', evento => { if (evento.persisted) void revalidar(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') raiz.inert = true;
    else void revalidar();
  });
  await atualizar();
}
