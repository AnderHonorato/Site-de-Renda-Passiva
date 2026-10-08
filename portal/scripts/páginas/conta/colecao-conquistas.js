import { api } from './comum.js';
import { criarIconeMedalha } from '../../núcleo/emblemas.js';

export function escolherDestaques(perfil) {
  const ganhas=(perfil.medalhas||[]).filter(m=>m.desbloqueada).sort((a,b)=>b.tier-a.tier||b.valor-a.valor);
  return Array.isArray(perfil.conquistas_destaque)
    ? perfil.conquistas_destaque.map(id=>ganhas.find(m=>m.id===id)).filter(Boolean).slice(0,5) : ganhas.slice(0,3);
}

export function montarColecao(perfil, {proprio=false, ingles=false, detalhe, aoSalvar}={}) {
  const t=(pt,en)=>ingles?en:pt;
  const el=(tag,classe,texto)=>{const no=document.createElement(tag);if(classe)no.className=classe;if(texto!==undefined)no.textContent=texto;return no;};
  const secao=el('section','colecao-conquistas');
  secao.id='colecao-conquistas';
  const titulo=el('div','colecao-conquistas__topo');
  titulo.append(el('h2','',t('Coleção de conquistas','Achievement collection')),
    el('p','',t('Cada conquista tem seus próprios marcos. Veja o que ganhou e o próximo objetivo.','Each achievement has its own milestones. Explore your rewards and next goal.')));
  secao.append(titulo);
  const resumo=el('div','colecao-conquistas__resumo');
  const lista=perfil.medalhas||[];
  const ganhas=lista.filter(m=>m.desbloqueada).length;
  resumo.append(el('b','',t(`${ganhas} / ${lista.length} conquistas iniciadas`,`${ganhas} / ${lista.length} achievements started`)));
  const filtros=el('div','colecao-conquistas__filtros');filtros.setAttribute('role','group');filtros.setAttribute('aria-label',t('Filtrar conquistas','Filter achievements'));
  let filtro='todas';
  const grade=el('div','colecao-conquistas__grade');
  let selecionadas=escolherDestaques(perfil).map(m=>m.id);
  let salvando=false;
  const escolhas=el('div','colecao-conquistas__escolhas');
  const status=el('p','colecao-conquistas__status');status.setAttribute('role','status');
  const salvar=el('button','botão',t('Salvar destaques','Save featured achievements'));salvar.type='button';
  function pintarEscolhas(){
    escolhas.replaceChildren(el('b','',t('Posições de honra · escolha e ordene até 5','Honour slots · choose and order up to 5')));
    selecionadas.forEach((id,i)=>{
      const medalha=lista.find(m=>m.id===id);if(!medalha)return;
      const linha=el('div','colecao-conquistas__ordem');linha.append(el('span','',`${i+1}. ${medalha.nome}`));
      for(const [texto,delta]of [[t('Mover antes','Move earlier'),-1],[t('Mover depois','Move later'),1]]){
        const b=el('button','botão botão--linha',delta===-1?'←':'→');b.type='button';b.setAttribute('aria-label',`${texto}: ${medalha.nome}`);b.disabled=salvando||i+delta<0||i+delta>=selecionadas.length;
        b.addEventListener('click',()=>{[selecionadas[i],selecionadas[i+delta]]=[selecionadas[i+delta],selecionadas[i]];pintarEscolhas();});linha.append(b);
      }
      escolhas.append(linha);
    });
    escolhas.append(salvar,status);
  }
  function pintar(){
    grade.replaceChildren();
    const filtradas=lista.filter(m=>filtro==='todas'||(filtro==='ganhas'?m.desbloqueada:!m.completa));
    for(const medalha of filtradas){
      const card=el('article','colecao-conquistas__card');card.dataset.desbloqueada=medalha.desbloqueada?'sim':'nao';card.dataset.tier=String(medalha.tier||0);
      const simbolo=el('button','colecao-conquistas__simbolo');simbolo.type='button';simbolo.dataset.conquista=medalha.id;
      simbolo.setAttribute('aria-label',t('Ver conquista: ','View achievement: ')+medalha.nome);simbolo.append(criarIconeMedalha(medalha));simbolo.addEventListener('click',()=>detalhe?.(simbolo,medalha));
      const texto=el('div','colecao-conquistas__texto');
      texto.append(el('h3','',medalha.nome),el('span','colecao-conquistas__patamar',medalha.desbloqueada?medalha.patamar:t('Ainda bloqueada','Locked')),el('p','',medalha.descricao));
      const progresso=el('progress');progresso.max=100;progresso.value=medalha.completa?100:Number(medalha.percentual)||0;progresso.setAttribute('aria-label',t('Progresso: ','Progress: ')+medalha.nome);
      texto.append(progresso,el('small','',medalha.completa?t('Todos os marcos conquistados','All milestones earned'):`${medalha.valor} / ${medalha.meta} · ${t('próximo marco','next milestone')}`));
      card.append(simbolo,texto);
      const etapas=el('div','colecao-conquistas__etapas');
      for(const etapa of medalha.etapas||[]){const marco=el('span','',etapa.desbloqueada?'✓':'◇');marco.dataset.ganha=etapa.desbloqueada?'sim':'nao';marco.title=`${etapa.nome}: ${etapa.meta}`;marco.setAttribute('aria-label',`${etapa.nome}: ${etapa.meta} · ${etapa.desbloqueada?t('conquistada','earned'):t('bloqueada','locked')}`);etapas.append(marco);}
      card.append(etapas);
      if(proprio&&medalha.desbloqueada){
        const equipar=el('button','botão botão--linha',selecionadas.includes(medalha.id)?t('Retirar destaque','Unfeature'):t('Destacar','Feature'));equipar.type='button';equipar.dataset.destacar=medalha.id;equipar.setAttribute('aria-pressed',String(selecionadas.includes(medalha.id)));equipar.disabled=salvando;
        equipar.addEventListener('click',()=>{if(selecionadas.includes(medalha.id))selecionadas=selecionadas.filter(id=>id!==medalha.id);else if(selecionadas.length<5)selecionadas.push(medalha.id);else {status.textContent=t('Você pode destacar até 5. Retire uma para escolher outra.','Feature up to 5. Remove one to choose another.');return;}status.textContent=t('Alterações ainda não salvas.','Changes have not been saved yet.');pintar();pintarEscolhas();});card.append(equipar);
      }
      grade.append(card);
    }
    if(!filtradas.length)grade.append(el('p','',t('Nenhuma conquista neste filtro.','No achievements in this filter.')));
    for(const botao of filtros.children)botao.setAttribute('aria-pressed',String(botao.dataset.filtro===filtro));
  }
  for(const [id,pt,en]of [['todas','Todas','All'],['ganhas','Conquistadas','Earned'],['proximas','Em progresso','In progress']]){
    const b=el('button','botão botão--linha',t(pt,en));b.type='button';b.dataset.filtro=id;b.addEventListener('click',()=>{filtro=id;pintar();});filtros.append(b);
  }
  salvar.addEventListener('click',async()=>{
    salvando=true;salvar.disabled=true;pintar();pintarEscolhas();
    try{await api('/api/perfil/conquistas',{metodo:'PATCH',dados:{selecionadas}});status.textContent=t('Destaques salvos.','Featured achievements saved.');await aoSalvar?.(selecionadas);}
    catch{status.textContent=t('Não foi possível salvar. Suas escolhas continuam aqui; tente novamente.','Could not save. Your choices are still here; try again.');}
    finally{salvando=false;salvar.disabled=false;pintar();pintarEscolhas();}
  });
  resumo.append(filtros);secao.append(resumo,grade);if(proprio){pintarEscolhas();secao.append(escolhas);}pintar();return secao;
}
