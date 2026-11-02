import { api } from './api.js';
import { obterSessao } from './sessão.js';
import { atualizarNivel } from './evolução.js';

const registrados = new Set();

/** Um resultado concluído conta uma vez por página; recomputar a cada tecla não dá pontos. */
export async function registrarUso(slug) {
  if (typeof slug !== 'string' || !/^[a-z0-9-]{2,80}$/.test(slug) || registrados.has(slug)) return;
  registrados.add(slug);
  try {
    const sessao = await obterSessao();
    if (!sessao.usuario) return;
    const resposta = await api(`/api/ferramentas/${slug}/uso`, { metodo: 'POST', dados: {} });
    atualizarNivel(sessao, resposta.nivel);
  } catch { /* Conta indisponível nunca impede o resultado local. */ }
}
