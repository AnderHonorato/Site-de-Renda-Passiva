import { api, en, mensagemErro, obterSessao } from './comum.js';
import { criarIconeMedalha } from '../../núcleo/emblemas.js';
import { criarSeloRank } from '../../núcleo/ranks.js';
import { RANKS, progressoDeRank } from '../../../dados/recompensas.js';

const area = document.getElementById('niveis-progresso');

function elemento(tag, classe, texto) {
  const no = document.createElement(tag);
  if (classe) no.className = classe;
  if (texto !== undefined) no.textContent = texto;
  return no;
}

const ranks=elemento('section','niveis__bloco');
ranks.append(elemento('h2','',en?'Your journey through the ranks':'Sua jornada pelos ranks'));
ranks.append(elemento('p','',en?'The first eight ranks have five subdivisions, I to V. Every five levels unlocks a new rank. Mythic starts at level 41.':'Os oito primeiros ranks têm cinco divisões, de I a V. A cada cinco níveis, um novo rank é desbloqueado. Mítico começa no nível 41.'));
const grade=elemento('div','niveis__ranks');
RANKS.forEach((rank,i)=>{
  const card=elemento('article');card.append(criarSeloRank(i*5+1,{ingles:en}),elemento('b','',en?rank.nome_en:rank.nome),elemento('small','',en?`Level ${i*5+1}${i===8?'+':`–${i*5+5}`}`:`Nível ${i*5+1}${i===8?'+':`–${i*5+5}`}`));grade.append(card);
});
ranks.append(grade);area.after(ranks);

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
    icone.append(criarSeloRank(perfil.nivel || 1,{ingles:en}));
    const rank=perfil.rank||progressoDeRank(perfil.progresso_nivel?.pontos||0);

    const texto = elemento('div', 'niveis__atual-texto');
    texto.append(
      elemento('strong', '', (en?rank.nome_en:rank.nome)+' '+rank.subnivel+' · '+(en?'Level ':'Nível ')+(perfil.nivel||1)),
      elemento(
        'span',
        '',
        String(perfil.progresso_nivel?.pontos || 0) + ' pts · '
          + String(perfil.progresso_nivel?.faltam || 0)
          + (en ? ' to the next level' : ' para o próximo nível')
      )
    );

    texto.append(elemento('small','',rank.proximo?(en?`${rank.faltam} XP to the next rank`:`Faltam ${rank.faltam} XP para ${rank.proximo} I`):(en?'Highest rank reached':'Rank máximo alcançado')));
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
