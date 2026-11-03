/** Validação conservadora de diagramas antes de passar ao renderizador. */
export const LIMITES_DIAGRAMA=Object.freeze({caracteres:8000,linhas:140});
export class ErroDeDiagrama extends Error{
 constructor(mensagem,campo='codigo'){super(mensagem);this.name='ErroDeDiagrama';this.campo=campo;}
}
const TIPOS=new Set(['flowchart','graph','sequenceDiagram','classDiagram','stateDiagram-v2',
 'stateDiagram','erDiagram','gantt','journey','mindmap','timeline']);
export function validarDiagrama(dados){
 const codigo=String(dados.codigo??'').trim(),tema=String(dados.tema??'neutro');
 if(!codigo||codigo.length>LIMITES_DIAGRAMA.caracteres)
  throw new ErroDeDiagrama('Escreva um diagrama com até 8.000 caracteres.');
 if(codigo.split(/\r?\n/).length>LIMITES_DIAGRAMA.linhas)
  throw new ErroDeDiagrama('O diagrama deve ter até 140 linhas.');
 if(!['neutro','claro','escuro'].includes(tema))
  throw new ErroDeDiagrama('Tema inválido.','tema');
 const primeiras=codigo.split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('%%'));
 const tipo=primeiras[0]?.split(/\s+/)[0]??'';
 if(!TIPOS.has(tipo))
  throw new ErroDeDiagrama('Use flowchart, sequenceDiagram, classDiagram, gantt, timeline ou outra sintaxe Mermaid aceita.');
 // Impede diretivas de inicialização ou links, mesmo com o renderizador em modo estrito.
 if(/%%\s*\{|^\s*click\s|^\s*accDescr\s*:/im.test(codigo)
    || /<\s*(script|iframe|object|foreignObject)\b|javascript:|data:text\/html|@import\b/i.test(codigo))
  throw new ErroDeDiagrama('Diretivas, links executáveis e HTML incorporado não são permitidos neste editor.');
 return {codigo,tema,tipo};
}
export function nomeSeguroDoDiagrama(nome){
 const s=String(nome??'fluxograma').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,45).toLowerCase();
 return s||'fluxograma';
}
