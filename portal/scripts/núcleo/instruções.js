import { escapar } from './texto.js';

/** As mesmas instruções no HTML gerado e na montagem da ferramenta. */
export function instrucoesEmHtml(instruções = {}) {
  const partes=[];
  if(instruções.passos?.length) partes.push(`<ol>${instruções.passos.map(p=>`<li>${escapar(p)}</li>`).join('')}</ol>`);
  if(instruções.exemplo) partes.push(`<h3>${escapar(instruções.exemplo.título ?? 'Exemplo')}</h3><p>${escapar(instruções.exemplo.texto)}</p>`);
  if(instruções.limites) partes.push(`<h3>Limites e premissas</h3><p>${escapar(instruções.limites)}</p>`);
  if(instruções.perguntas?.length) partes.push('<h3>Perguntas frequentes</h3>'+instruções.perguntas.map(q=>`<details><summary>${escapar(q.p)}</summary><p>${escapar(q.r)}</p></details>`).join(''));
  return partes.join('');
}
