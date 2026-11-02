export const N=(nome,rotulo,valor,min=0,max=1000000)=>({nome,rotulo,tipo:'number',valor,min,max,passo:'any',obrigatorio:true});
export const T=(nome,rotulo,valor='')=>({nome,rotulo,tipo:'textarea',valor,obrigatorio:true});
export const S=(nome,rotulo,valor,pares)=>({nome,rotulo,tipo:'select',valor,opcoes:pares.map(([valor,rotulo])=>({valor,rotulo}))});
export const F=(nome='arquivo',rotulo='Arquivo',aceita='.png,.jpg,.jpeg,.webp',multiplo=false)=>({nome,rotulo,tipo:'file',aceita,multiplo,obrigatorio:true});
export const D=(nome,rotulo,valor='2026-03-01')=>({nome,rotulo,tipo:'date',valor,obrigatorio:true});
export const C=(nome,rotulo,valor=false)=>({nome,rotulo,tipo:'checkbox',valor});
export function n(d,k,min=0,max=1000000){const s=String(d[k]??'').trim().replace(',','.');if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))throw Error('Preencha '+k+' com um número válido.');const v=Number(s);if(!Number.isFinite(v)||v<min||v>max)throw Error(k+': use um valor entre '+min+' e '+max+'.');return v;}
export function inteiro(d,k,min=0,max=1000000){const v=n(d,k,min,max);if(!Number.isInteger(v))throw Error(k+' deve ser inteiro.');return v;}
export function texto(d,k,vazio=false){const s=String(d[k]??'');if(!vazio&&!s.trim())throw Error('Preencha '+k+'.');if(s.length>200000)throw Error('Texto muito longo: limite de 200 mil caracteres.');return s;}
export function opcao(d,k,opcoes){if(!opcoes.includes(d[k]))throw Error('Escolha uma opção válida para '+k+'.');return d[k];}
export function lista(d,k){return texto(d,k).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);}
export const fmt=v=>Number(v.toFixed(4)).toLocaleString('pt-BR');
export const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export const arquivoTexto=(s,nome='resultado.txt')=>({nome,blob:new Blob([s],{type:'text/plain;charset=utf-8'})});
export const saidaTexto=(s,linhas=[])=>({resumo:s,linhas,arquivo:arquivoTexto(s)});
export const definir=(id,categoria,titulo,descricao,metodologia,campos,executar)=>({id,categoria,titulo,descricao,metodologia,campos,executar});
export function data(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s)))throw Error('Informe uma data no formato AAAA-MM-DD.');const d=new Date(s+'T12:00:00Z');if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==s)throw Error('Data inválida.');return d;}
export function iso(d){if(!Number.isFinite(+d)||d.getUTCFullYear()<1||d.getUTCFullYear()>9999)throw Error('Data fora do intervalo suportado.');return d.toISOString().slice(0,10);}
export function file(d,k='arquivo',max=30*1024*1024){const f=d[k];if(!f||typeof f.arrayBuffer!=='function'||f.size===0)throw Error('Selecione um arquivo não vazio.');if(f.size>max)throw Error('Arquivo grande demais: limite '+Math.round(max/1024/1024)+' MB.');return f;}
export const palavras=s=>s.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)||[];

