import { api, en, mensagemErro, obterSessao } from './comum.js';
import { criarIconeNivel } from '../../núcleo/nível.js';
import { criarIconeMedalha } from '../../núcleo/emblemas.js';

const area = document.getElementById('niveis-progresso');

function elemento(tag, classe, texto) {
  const no = document.createElement(tag);
  if (classe) no.className = classe;
  if (texto !== undefined) no.textContent = texto;
  return no;
}

try {
  const sessao = await obterSessao();
  if (!sessao.usuario) {
    area.append(
      elemento(
        'p',
        'niveis__aviso',
        en
          ? 'Sign in to see your current progress.'
          : 'Entre na conta para ver seu progresso atual.'
      )
    );
  } else {
    const resposta = await api('/api/perfil/' + encodeURIComponent(sessao.usuario.usuario));
    const perfil = resposta.perfil || resposta;
    const card = elemento('section', 'niveis__atual');
    const icone = elemento('div', 'niveis__icone');
    icone.append(criarIconeNivel(perfil.nivel || 1));

    const texto = elemento('div', 'niveis__atual-texto');
    texto.append(
      elemento('strong', '', (en ? 'Your level: ' : 'Seu nível: ') + (perfil.nivel || 1)),
      elemento(
        'span',
        '',
        String(perfil.progresso_nivel?.pontos || 0) + ' pts · '
          + String(perfil.progresso_nivel?.faltam || 0)
          + (en ? ' to the next level' : ' para o próximo nível')
      )
    );

    const barra = elemento('div', 'niveis__barra');
    const progresso = elemento('span');
    progresso.style.width = String(perfil.progresso_nivel?.percentual || 0) + '%';
    barra.append(progresso);

    const medalhas = elemento('div', 'niveis__medalhas');
    for (const medalha of perfil.medalhas || []) {
      const item = elemento('a', 'niveis__medalha');
      item.href = '#' + encodeURIComponent(medalha.id);
      item.dataset.tier = String(medalha.tier || 0);
      item.append(criarIconeMedalha(medalha));
      item.append(
        elemento('b', '', medalha.nome),
        elemento(
          'small',
          '',
          medalha.desbloqueada
            ? medalha.patamar + ' · ' + medalha.valor + (medalha.completa ? '' : ' / ' + medalha.meta)
            : medalha.valor + ' / ' + medalha.meta
        )
      );
      medalhas.append(item);
    }

    card.append(icone, texto, barra, medalhas);
    area.replaceChildren(card);
  }
} catch (erro) {
  area.append(elemento('p', 'niveis__aviso', mensagemErro(erro)));
}
