import { api } from '../../núcleo/api.js';
import { atualizarNivel,celebrarMissao } from '../../núcleo/evolução.js';
import { criarAvatar } from '../../núcleo/nível.js';
import { ícone } from '../../núcleo/ícones.js';

const el=(tag,classe,texto)=>{const n=document.createElement(tag);if(classe)n.className=classe;if(texto!==undefined)n.textContent=texto;return n;};
export function ligarMissoes(area,sessao,{ingles=false,raiz='./',aoAtualizar=()=>{}}={}) {
  const en=ingles,detalhes=el('details','recompensas');detalhes.id='missoes';const sum=el('summary','',en?'Missions, events and ranking':'Missões, eventos e ranking');const icone=el('span');icone.innerHTML=ícone('estrela');sum.prepend(icone);
  const conteudo=el('div','recompensas__conteudo'),status=el('p','suave pequeno'),tentar=el('button','botão botão--linha',en?'Try again':'Tentar novamente');status.setAttribute('role','status');tentar.type='button';tentar.hidden=true;tentar.onclick=()=>{carregado=false;void carregar();};conteudo.append(status,tentar);detalhes.append(sum,conteudo);area.append(detalhes);
  let carregado=false,ocupado=false;
  async function ranking(areaRanking) {
    try{const {participantes}=await api('/api/recompensas/ranking');areaRanking.replaceChildren();
      for(const p of participantes){const li=el('li');li.dataset.proprio=String(p.proprio);const a=el('a','',`@${p.usuario}`);a.href=`${raiz}perfil.html?usuario=${encodeURIComponent(p.usuario)}`;li.append(el('span','',`${p.posicao}º`),criarAvatar(p.avatar,{nome:p.usuario}),a,el('strong','',`${p.xp.toLocaleString(en?'en':'pt-BR')} XP`));areaRanking.append(li);}
      if(!participantes.length)areaRanking.append(el('li','',en?'Nobody has joined yet.':'Ninguém entrou no ranking ainda.'));
    }catch{areaRanking.replaceChildren(el('li','',en?'Ranking unavailable. Reopen this panel to retry.':'Ranking indisponível. Reabra este painel para tentar novamente.'));carregado=false;}
  }
  async function carregar() {
    if(ocupado)return;ocupado=true;tentar.hidden=true;status.textContent=en?'Loading your missions…':'Carregando suas missões…';
    try{const resposta=await api('/api/recompensas');conteudo.replaceChildren(status,tentar);status.textContent='';
      conteudo.append(el('p','suave pequeno',en?'Complete different tools, then claim your XP. Days and weeks use UTC; weeks start on Monday. Repeating one tool does not advance these missions.':'Conclua ferramentas diferentes e receba seu XP. Dias e semanas usam UTC; a semana começa na segunda. Repetir a mesma ferramenta não avança estas missões.'));
      const grade=el('div','recompensas__grade');
      for(const m of resposta.missoes){const card=el('article','recompensas__missao');card.dataset.missao=m.tipo;const anel=el('div','recompensas__anel'),perc=Math.max(0,Math.min(100,Math.round(m.valor/m.meta*100)));
        anel.setAttribute('aria-label',`${m.valor} ${en?'of':'de'} ${m.meta}`);anel.innerHTML=`<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27"/><circle cx="32" cy="32" r="27" pathLength="100" stroke-dasharray="${perc} 100"/></svg>`;anel.append(el('b','',`${m.valor}/${m.meta}`));
        const corpo=el('div');corpo.append(el('small','',m.tipo==='diaria'?(en?'DAILY':'DIÁRIA'):m.tipo==='semanal'?(en?'WEEKLY':'SEMANAL'):(en?'EVENT':'EVENTO')),el('h3','',en?m.titulo_en:m.titulo_pt),el('p','',en?m.texto_en:m.texto_pt),el('p','',`${m.inicio} → ${m.fim} · +${m.xp} XP`));
        const b=el('button','botão botão--linha',m.resgatada?(en?'Received':'Recebido'):m.agendada?(en?'Scheduled':'Agendada'):m.disponivel?(en?`Claim ${m.xp} XP`:`Receber ${m.xp} XP`):(en?'In progress':'Em andamento'));b.type='button';b.disabled=!m.disponivel;
        b.onclick=async()=>{b.disabled=true;try{const r=await api('/api/recompensas/resgatar',{metodo:'POST',dados:{tipo:m.tipo,...(m.tipo==='evento'?{evento_id:m.evento_id}:{})}});if(r.resgatada){celebrarMissao({titulo:en?r.missao.titulo_en:r.missao.titulo_pt,xp:r.missao.xp});atualizarNivel(sessao,r.nivel);}await carregar();await aoAtualizar();}catch{status.textContent=en?'Could not claim this reward. Reopen the panel to check your progress.':'Não foi possível receber agora. Reabra o painel para conferir o progresso.';carregado=false;b.disabled=false;}};
        corpo.append(b);card.append(anel,corpo);grade.append(card);
      }conteudo.append(grade);
      const explorar=el('a','botão botão--linha',en?'Explore tools':'Explorar ferramentas');explorar.href=`${raiz}ferramentas.html`;conteudo.append(explorar);
      conteudo.append(el('h3','',en?'Community ranking':'Ranking da comunidade'),el('p','suave pequeno',en?'Optional, visible only to signed-in members. Shows your username, avatar and activity + mission XP, without medal bonuses. All plans use the same points rules. Blocked accounts are hidden.':'Opcional e visível somente para membros conectados. Mostra seu @usuário, avatar e XP de atividade + missões, sem bônus de medalhas. Todos os planos usam as mesmas regras de pontos. Contas bloqueadas ficam ocultas.'));
      const label=el('label','recompensas__opcao'),check=el('input');check.type='checkbox';check.checked=resposta.ranking;label.append(check,el('span','',en?'Show my profile in the ranking. I can leave at any time.':'Mostrar meu perfil no ranking. Posso sair a qualquer momento.'));
      const lista=el('ol','recompensas__ranking');lista.setAttribute('aria-label',en?'Top 50 participants':'50 primeiros participantes');
      check.onchange=async()=>{const anterior=!check.checked;check.disabled=true;try{await api('/api/recompensas/preferencias',{metodo:'PATCH',dados:{ranking:check.checked}});await ranking(lista);status.textContent=en?'Ranking preference saved.':'Preferência do ranking salva.';}catch{check.checked=anterior;status.textContent=en?'Could not save. Try again.':'Não foi possível salvar. Tente novamente.';}finally{check.disabled=false;}};
      conteudo.append(label,lista);await ranking(lista);
      if(resposta.resgates.length){conteudo.append(el('h3','',en?'Recently received':'Recebidas recentemente'));const historico=el('ul','recompensas__historico');for(const r of resposta.resgates){const li=el('li','',`${en?r.titulo_en:r.titulo_pt} · +${r.xp} XP · ${r.criado_em}`);if(String(r.id)===new URLSearchParams(location.search).get('missao'))li.classList.add('recompensas__destaque');historico.append(li);}conteudo.append(historico);}
      carregado=true;
    }catch{status.textContent=en?'Missions could not load. Try again; your profile remains available.':'Não consegui carregar as missões. Tente novamente; seu perfil continua disponível.';carregado=false;tentar.hidden=false;}finally{ocupado=false;}
  }
  detalhes.addEventListener('toggle',()=>{if(detalhes.open){history.replaceState(history.state,'',location.pathname+location.search+'#missoes');if(!carregado)void carregar();}else{carregado=false;}});
  if(location.hash==='#missoes'||new URLSearchParams(location.search).has('missao'))detalhes.open=true;
}
