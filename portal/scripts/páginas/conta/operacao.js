import { api,en,estado,mensagemErro,obterSessao } from './comum.js';
const el=(tag,texto)=>{const n=document.createElement(tag);n.textContent=texto;return n;};
async function carregar(){try{const s=await obterSessao();if(s.usuario?.papel!=='admin')throw {message:'acesso_negado'};const r=await api('/api/admin/operacao'),area=document.getElementById('operacao-bloqueios');area.replaceChildren();
  for(const b of r.bloqueios){const p=el('article',`${b.grupo} · ${b.id.slice(0,12)} · ${b.reincidencias} · ${b.ativo?(en?'Restricted until ':'Restrito até ')+new Date(b.bloqueado_ate).toLocaleString(en?'en':'pt-BR'):(en?'Released':'Liberado')}`);p.className='painel';
    if(b.ativo){const btn=el('button',en?'Release restriction':'Liberar restrição');btn.type='button';btn.className='botão botão--linha';btn.onclick=async()=>{btn.disabled=true;try{await api('/api/admin/operacao/desbloquear',{metodo:'POST',dados:{id:b.id,versao:b.bloqueado_ate}});await carregar();estado(en?'Restriction released.':'Restrição liberada.');}catch(e){estado(mensagemErro(e),true);btn.disabled=false;}};p.append(btn);}area.append(p);
  }if(!r.bloqueios.length)area.append(el('p',en?'No restrictions recorded.':'Nenhuma restrição registrada.'));
  for(const tipo of ['auditoria','erros']){const a=document.getElementById(`operacao-${tipo}`);a.replaceChildren();for(const v of r[tipo])a.append(el('p',`${v.criado_em} · ${v.acao||v.codigo} ${v.metodo||''}`));if(!r[tipo].length)a.append(el('p',en?'No records.':'Nenhum registro.'));}
}catch(e){estado(mensagemErro(e),true);}}
document.getElementById('operacao-atualizar').onclick=carregar;await carregar();
