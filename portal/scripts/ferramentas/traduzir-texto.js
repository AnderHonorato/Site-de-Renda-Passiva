/** F195 — tradução local com a API Translator do navegador, quando disponível. */
export const IDIOMAS = Object.freeze({pt:'Português',en:'Inglês',es:'Espanhol'});
export function validarTraducao(texto,origem,destino){
  if(typeof texto!=='string'||!texto.trim())throw new Error('Digite o texto que deseja traduzir.');
  if(texto.length>10000)throw new Error('Limite de 10.000 caracteres por tradução.');
  if(!IDIOMAS[origem]||!IDIOMAS[destino])throw new Error('Escolha um idioma válido.');
  if(origem===destino)throw new Error('Selecione idiomas diferentes.');
  return texto.trim();
}
export function obterDisponibilidade(api){
  return typeof api?.create==='function' && typeof api?.availability==='function';
}
export default {
 instruções:{
  passos:['Digite ou cole o texto.','Escolha o idioma de origem e o de destino.','Clique em Traduzir.','Revise o resultado antes de usar.'],
  limites:'Requer navegador compatível com Translator API e seu pacote de idioma. Pode baixar modelos no primeiro uso; não utiliza tradutores externos. A disponibilidade varia conforme o navegador e o idioma.',
  perguntas:[{p:'Meu texto é enviado ao site?',r:'Não. Esta ferramenta usa exclusivamente o tradutor integrado ao navegador; se ele não estiver disponível, não há tradução simulada.'}]
 },
 montar(raiz){
  raiz.replaceChildren();
  const criar=(tag,classe,texto)=>{const e=document.createElement(tag);if(classe)e.className=classe;if(texto!==undefined)e.textContent=texto;return e;};
  const painel=criar('section','ferramenta-formulario');
  const titulo=criar('h2','', 'Tradutor de textos');
  const aviso=criar('p','suave','Tradução no próprio navegador, sem enviar seu texto ao portal.');
  const entrada=criar('textarea');entrada.rows=7;entrada.maxLength=10000;entrada.placeholder='Cole aqui um texto para traduzir…';entrada.setAttribute('aria-label','Texto original');
  entrada.value='Olá! Gostaria de saber o prazo de entrega do meu pedido.';
  const linha=criar('div');linha.style.cssText='display:flex;flex-wrap:wrap;gap:12px;margin:12px 0';
  const selecionar=(nome,valor)=>{const s=criar('select');s.setAttribute('aria-label',nome);for(const [id,rotulo] of Object.entries(IDIOMAS)){const o=criar('option','',rotulo);o.value=id;s.append(o);}s.value=valor;return s;};
  const origem=selecionar('Idioma de origem','pt'),destino=selecionar('Idioma de destino','en');
  linha.append(origem,destino);
  const executar=criar('button','botão botão--primário','Traduzir');executar.type='button';
  const cancelar=criar('button','botão','Cancelar');cancelar.type='button';cancelar.disabled=true;
  const copiar=criar('button','botão','Copiar tradução');copiar.type='button';copiar.disabled=true;
  const baixar=criar('button','botão','Baixar TXT');baixar.type='button';baixar.disabled=true;
  const botoes=criar('div');botoes.style.cssText='display:flex;flex-wrap:wrap;gap:12px;margin:12px 0';botoes.append(executar,cancelar,copiar,baixar);
  const status=criar('p','suave','Pronto para traduzir');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const resultado=criar('textarea');resultado.readOnly=true;resultado.rows=7;resultado.placeholder='A tradução aparecerá aqui';resultado.setAttribute('aria-label','Texto traduzido');
  painel.append(titulo,aviso,entrada,linha,botoes,status,resultado);raiz.append(painel);
  let controlador=null,tradutor=null;
  const encerrar=()=>{executar.disabled=false;cancelar.disabled=true;controlador=null;};
  cancelar.addEventListener('click',()=>{controlador?.abort();tradutor?.destroy?.();tradutor=null;status.textContent='Tradução cancelada.';encerrar();});
  executar.addEventListener('click',async()=>{
   if(controlador)return;
   try{
    const texto=validarTraducao(entrada.value,origem.value,destino.value);
    const api=globalThis.Translator;
    if(!obterDisponibilidade(api))throw new Error('Este navegador não oferece tradução local. Experimente uma versão atualizada do Chrome com Translator API.');
    controlador=new AbortController();const sinal=controlador.signal;
    executar.disabled=true;cancelar.disabled=false;copiar.disabled=true;baixar.disabled=true;resultado.value='';
    status.textContent='Verificando pacote de idioma…';
    const disponibilidade=await api.availability({sourceLanguage:origem.value,targetLanguage:destino.value});
    if(sinal.aborted)return;
    if(disponibilidade==='unavailable')throw new Error('Este par de idiomas não está disponível neste navegador.');
    status.textContent=disponibilidade==='downloadable'?'Preparando modelo de idioma…':'Traduzindo…';
    tradutor=await api.create({sourceLanguage:origem.value,targetLanguage:destino.value,signal,monitor(m){m.addEventListener('downloadprogress',e=>{if(!sinal.aborted)status.textContent='Baixando modelo: '+Math.round(e.loaded*100)+'%';});}});
    if(sinal.aborted)return;
    const traducao=await tradutor.translate(texto,{signal});
    if(sinal.aborted)return;
    resultado.value=traducao;copiar.disabled=baixar.disabled=false;
    status.textContent='Tradução concluída. Revise expressões e termos técnicos.';
   }catch(e){if(e?.name!=='AbortError')status.textContent=e?.message||'Não foi possível traduzir.';}
   finally{tradutor?.destroy?.();tradutor=null;encerrar();}
  });
  copiar.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(resultado.value);status.textContent='Tradução copiada.';}catch{status.textContent='Não foi possível copiar automaticamente. Selecione o resultado.';}});
  baixar.addEventListener('click',()=>{if(!resultado.value)return;const url=URL.createObjectURL(new Blob([resultado.value],{type:'text/plain;charset=utf-8'}));const a=criar('a');a.href=url;a.download='traducao-ander-flow.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 }
};
