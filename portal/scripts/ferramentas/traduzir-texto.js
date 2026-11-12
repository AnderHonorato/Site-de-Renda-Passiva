/** F195 — tradução local com a API Translator do navegador, quando disponível. */
export const IDIOMAS = Object.freeze({pt:'Português',en:'Inglês',es:'Espanhol'});
export function validarTraducao(texto,origem,destino){
  if(typeof texto!=='string'||!texto.trim())throw new Error('Digite o texto que deseja traduzir.');
  if(contarCaracteres(texto)>10000)throw new Error('Limite de 10.000 caracteres por tradução.');
  if(!IDIOMAS[origem]||!IDIOMAS[destino])throw new Error('Escolha um idioma válido.');
  if(origem===destino)throw new Error('Selecione idiomas diferentes.');
  return texto.trim();
}
export function validarArquivoTexto(arquivo){
 if(!arquivo || !/\.(txt|md)$/i.test(arquivo.name||''))throw new Error('Selecione um arquivo TXT ou Markdown.');
 if(arquivo.size>40000)throw new Error('Arquivo muito grande. Limite de 40 KB.');
 return true;
}
export function validarConteudoImportado(texto){
 if(typeof texto!=='string'||!texto.trim())throw new Error('O arquivo está vazio.');
 const limpo=texto.replace(/^\uFEFF/,'');
 if(!limpo.trim())throw new Error('O arquivo está vazio.');
 if(contarCaracteres(limpo)>10000)throw new Error('O texto ultrapassa 10.000 caracteres.');
 return limpo;
}
export function obterDisponibilidade(api){
  return typeof api?.create==='function' && typeof api?.availability==='function';
}
export function contarCaracteres(texto){return [...String(texto)].length;}
export function exportarComparacaoCsv(original,traducao,origem,destino){
  if(!traducao || !original || !IDIOMAS[origem] || !IDIOMAS[destino])throw new Error('Tradução inválida para exportação.');
  const celula=(valor)=>{const texto=String(valor).replace(/^[\s\uFEFF]*([=+@-])/u,'\'$1');return '"'+texto.replace(/"/g,'""')+'"';};
  return '\uFEFF'+[['idioma_origem','idioma_destino','texto_original','texto_traduzido'],[origem,destino,original,traducao]].map(linha=>linha.map(celula).join(';')).join('\r\n')+'\r\n';
}
export function exportarComparacaoJson(original,traducao,origem,destino){
  if(!original?.trim()||!traducao?.trim()||!IDIOMAS[origem]||!IDIOMAS[destino]||origem===destino)throw new Error('Tradução inválida para exportação.');
  return JSON.stringify({idioma_origem:origem,idioma_destino:destino,texto_original:original,texto_traduzido:traducao},null,2)+'\n';
}
export function exportarComparacaoHtml(original,traducao,origem,destino){
 if(!original?.trim()||!traducao?.trim()||!IDIOMAS[origem]||!IDIOMAS[destino]||origem===destino)throw new Error('Tradução inválida para exportação.');
 const escapar=(texto)=>String(texto).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
 return '<!doctype html>\n<html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comparação de tradução — Ander Flow</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#202020}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:1rem}section{border:1px solid #aaa;border-radius:12px;padding:1rem;overflow-wrap:anywhere}p{white-space:pre-wrap}@media print{body{margin:0}section{break-inside:avoid}}</style><h1>Comparação de tradução</h1><main><section><h2>'+escapar(IDIOMAS[origem])+'</h2><p>'+escapar(original)+'</p></section><section><h2>'+escapar(IDIOMAS[destino])+'</h2><p>'+escapar(traducao)+'</p></section></main><footer>Ander Flow · Revise a tradução automática antes de utilizar.</footer></html>\n';
}
/** Substitui termos na revisão sem expressões regulares e sem alterar o texto de origem. */
export function substituirTermoTraduzido(texto,termo,substituto){
 if(typeof texto!=='string'||typeof termo!=='string'||typeof substituto!=='string')throw new Error('Informe textos válidos.');
 if(!termo.trim())throw new Error('Digite o termo que deseja substituir.');
 if(contarCaracteres(termo)>100||contarCaracteres(substituto)>200)throw new Error('Termo muito longo para revisão.');
 const ocorrencias=texto.split(termo).length-1;
 if(!ocorrencias)return {texto,ocorrencias:0};
 const revisado=texto.split(termo).join(substituto);
 if(contarCaracteres(revisado)>20000)throw new Error('Revisão ultrapassa o limite de 20.000 caracteres.');
 return {texto:revisado,ocorrencias};
}
/** Reabre uma comparação exportada anteriormente sem chamar serviço externo. */
export function importarComparacaoJson(conteudo){
 if(typeof conteudo!=='string'||new TextEncoder().encode(conteudo).length>60000)throw new Error('Comparação inválida ou maior que 60 KB.');
 let dados;
 try{dados=JSON.parse(conteudo.replace(/^\uFEFF/,''));}catch{throw new Error('O arquivo não contém JSON válido.');}
 if(!dados||Array.isArray(dados)||typeof dados!=='object')throw new Error('Comparação JSON inválida.');
 const {idioma_origem:origem,idioma_destino:destino,texto_original:original,texto_traduzido:traducao}=dados;
 if(typeof original!=='string'||typeof traducao!=='string'||!original.trim()||!traducao.trim())throw new Error('A comparação precisa conter os dois textos.');
 if(!IDIOMAS[origem]||!IDIOMAS[destino]||origem===destino)throw new Error('Idiomas da comparação inválidos.');
 if(contarCaracteres(original)>10000||contarCaracteres(traducao)>20000)throw new Error('A comparação ultrapassa o limite de caracteres.');
 return {origem,destino,original,traducao};
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
  const importar=criar('input');importar.type='file';importar.accept='.txt,.md,text/plain,text/markdown';importar.setAttribute('aria-label','Importar arquivo TXT ou Markdown');
  const restaurar=criar('input');restaurar.type='file';restaurar.accept='.json,application/json';restaurar.setAttribute('aria-label','Reabrir comparação JSON salva');
  const limpar=criar('button','botão','Limpar texto');limpar.type='button';
  const linha=criar('div');linha.style.cssText='display:flex;flex-wrap:wrap;gap:12px;margin:12px 0';
  const selecionar=(nome,valor)=>{const s=criar('select');s.setAttribute('aria-label',nome);for(const [id,rotulo] of Object.entries(IDIOMAS)){const o=criar('option','',rotulo);o.value=id;s.append(o);}s.value=valor;return s;};
  const origem=selecionar('Idioma de origem','pt'),destino=selecionar('Idioma de destino','en');
  const inverter=criar('button','botão','Inverter idiomas');inverter.type='button';inverter.setAttribute('aria-label','Inverter idiomas de origem e destino');
  linha.append(origem,inverter,destino);
  const contador=criar('p','suave');contador.setAttribute('aria-live','polite');
  const atualizarContador=()=>{contador.textContent=`${contarCaracteres(entrada.value).toLocaleString('pt-BR')} caracteres · máximo 10.000`;};
  entrada.addEventListener('input',atualizarContador);atualizarContador();
  const executar=criar('button','botão botão--primário','Traduzir');executar.type='button';
  const cancelar=criar('button','botão','Cancelar');cancelar.type='button';cancelar.disabled=true;
  const copiar=criar('button','botão','Copiar tradução');copiar.type='button';copiar.disabled=true;
  const baixar=criar('button','botão','Baixar TXT');baixar.type='button';baixar.disabled=true;
  const baixarCsv=criar('button','botão','Exportar comparação CSV');baixarCsv.type='button';baixarCsv.disabled=true;
  const baixarJson=criar('button','botão','Exportar JSON');baixarJson.type='button';baixarJson.disabled=true;
  const baixarHtml=criar('button','botão','Comparação para imprimir');baixarHtml.type='button';baixarHtml.disabled=true;
  const botoes=criar('div');botoes.style.cssText='display:flex;flex-wrap:wrap;gap:12px;margin:12px 0';botoes.append(executar,cancelar,copiar,baixar,baixarCsv,baixarJson,baixarHtml);
  const status=criar('p','suave','Pronto para traduzir');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const resultado=criar('textarea');resultado.readOnly=true;resultado.rows=7;resultado.placeholder='A tradução aparecerá aqui. Você pode revisar e editar o resultado antes de exportar.';resultado.setAttribute('aria-label','Texto traduzido, editável para revisão');
  const revisao=criar('div');revisao.style.cssText='display:flex;flex-wrap:wrap;gap:12px;margin:12px 0';
  const termo=criar('input');termo.type='text';termo.maxLength=100;termo.placeholder='Termo na tradução';termo.setAttribute('aria-label','Termo a substituir na tradução');
  const substituto=criar('input');substituto.type='text';substituto.maxLength=200;substituto.placeholder='Substituir por';substituto.setAttribute('aria-label','Novo termo na tradução');
  const aplicarTermo=criar('button','botão','Substituir termo');aplicarTermo.type='button';aplicarTermo.disabled=true;
  revisao.append(termo,substituto,aplicarTermo);
  painel.append(titulo,aviso,entrada,importar,restaurar,limpar,contador,linha,botoes,status,resultado,revisao);raiz.append(painel);
  let controlador=null,tradutor=null,geracao=0;
  const encerrar=(id)=>{if(id!==geracao)return;executar.disabled=false;cancelar.disabled=true;controlador=null;};
  const invalidar=()=>{geracao++;controlador?.abort();tradutor?.destroy?.();tradutor=null;controlador=null;executar.disabled=false;cancelar.disabled=true;copiar.disabled=baixar.disabled=baixarCsv.disabled=baixarJson.disabled=baixarHtml.disabled=true;resultado.value='';resultado.readOnly=true;aplicarTermo.disabled=true;};
  limpar.addEventListener('click',()=>{invalidar();entrada.value='';importar.value='';atualizarContador();status.textContent='Texto limpo.';});
  importar.addEventListener('change',async()=>{
    const arquivo=importar.files?.[0];if(!arquivo)return;
    invalidar();const idImportacao=geracao;
    try{
      validarArquivoTexto(arquivo);
      const texto=validarConteudoImportado(await arquivo.text());
      if(idImportacao!==geracao)return;
      entrada.value=texto;atualizarContador();status.textContent='Arquivo importado. Escolha os idiomas e traduza.';
    }catch(erro){if(idImportacao===geracao)status.textContent=erro.message||'Falha ao importar arquivo.';}
    finally{importar.value='';}
  });
  restaurar.addEventListener('change',async()=>{
    const arquivo=restaurar.files?.[0];if(!arquivo)return;
    invalidar();const idImportacao=geracao;
    try{
      if(!/\.json$/i.test(arquivo.name||'')||arquivo.size>60000)throw new Error('Selecione um JSON de comparação de até 60 KB.');
      const dados=importarComparacaoJson(await arquivo.text());
      if(idImportacao!==geracao)return;
      origem.value=dados.origem;destino.value=dados.destino;entrada.value=dados.original;resultado.value=dados.traducao;
      resultado.readOnly=false;aplicarTermo.disabled=false;
      copiar.disabled=baixar.disabled=baixarCsv.disabled=baixarJson.disabled=baixarHtml.disabled=false;
      atualizarContador();status.textContent='Comparação restaurada. Revise e exporte sem traduzir novamente.';
    }catch(erro){if(idImportacao===geracao)status.textContent=erro.message||'Não foi possível restaurar a comparação.';}
    finally{restaurar.value='';}
  });
  cancelar.addEventListener('click',()=>{invalidar();status.textContent='Tradução cancelada.';});
  inverter.addEventListener('click',()=>{const anterior=resultado.value;invalidar();[origem.value,destino.value]=[destino.value,origem.value];if(anterior)entrada.value=anterior;status.textContent='Idiomas invertidos. Traduza novamente.';atualizarContador();});
  entrada.addEventListener('input',()=>{invalidar();resultado.value='';status.textContent='Texto alterado. Traduza novamente.';});
  entrada.addEventListener('keydown',evento=>{if((evento.ctrlKey||evento.metaKey)&&evento.key==='Enter'){evento.preventDefault();if(!executar.disabled)executar.click();}});
  origem.addEventListener('change',invalidar);destino.addEventListener('change',invalidar);
  executar.addEventListener('click',async()=>{
   if(controlador)return;
   const id=geracao+1;
   try{
    const texto=validarTraducao(entrada.value,origem.value,destino.value);
    const api=globalThis.Translator;
    if(!obterDisponibilidade(api))throw new Error('Este navegador não oferece tradução local. Experimente uma versão atualizada do Chrome com Translator API.');
    controlador=new AbortController();const sinal=controlador.signal;geracao=id;
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
    resultado.value=traducao;resultado.readOnly=false;aplicarTermo.disabled=false;copiar.disabled=baixar.disabled=baixarCsv.disabled=baixarJson.disabled=baixarHtml.disabled=false;
    status.textContent='Tradução concluída. Revise expressões e termos técnicos.';
   }catch(e){if((id===geracao||(id===geracao+1&&!controlador))&&e?.name!=='AbortError')status.textContent=e?.message||'Não foi possível traduzir.';}
   finally{if(id===geracao){tradutor?.destroy?.();tradutor=null;encerrar(id);}}
  });
  resultado.addEventListener('input',()=>{const temTexto=Boolean(resultado.value.trim());aplicarTermo.disabled=!temTexto;copiar.disabled=baixar.disabled=baixarCsv.disabled=baixarJson.disabled=baixarHtml.disabled=!temTexto;status.textContent=temTexto?'Tradução revisada manualmente. Exporte a versão editada.':'Resultado vazio. Traduza novamente ou escreva a revisão.';});
  aplicarTermo.addEventListener('click',()=>{
    try{
      if(resultado.readOnly)throw new Error('Traduza antes de revisar os termos.');
      const revisao=substituirTermoTraduzido(resultado.value,termo.value,substituto.value);
      resultado.value=revisao.texto;
      resultado.dispatchEvent(new Event('input',{bubbles:true}));
      status.textContent=revisao.ocorrencias?`${revisao.ocorrencias} ocorrência(s) substituída(s). Exporte a revisão.`:'Termo não encontrado na tradução.';
    }catch(erro){status.textContent=erro.message||'Não foi possível substituir o termo.';}
  });
  copiar.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(resultado.value);status.textContent='Tradução copiada.';}catch{status.textContent='Não foi possível copiar automaticamente. Selecione o resultado.';}});
  baixarHtml.addEventListener('click',()=>{if(!resultado.value)return;const html=exportarComparacaoHtml(entrada.value,resultado.value,origem.value,destino.value);const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=criar('a');a.href=url;a.download='comparacao-traducao-ander-flow.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  baixarJson.addEventListener('click',()=>{if(!resultado.value)return;const json=exportarComparacaoJson(entrada.value,resultado.value,origem.value,destino.value);const url=URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));const a=criar('a');a.href=url;a.download='comparacao-traducao-ander-flow.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  baixarCsv.addEventListener('click',()=>{if(!resultado.value)return;const csv=exportarComparacaoCsv(entrada.value,resultado.value,origem.value,destino.value);const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=criar('a');a.href=url;a.download='comparacao-traducao-ander-flow.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  baixar.addEventListener('click',()=>{if(!resultado.value)return;const url=URL.createObjectURL(new Blob([resultado.value],{type:'text/plain;charset=utf-8'}));const a=criar('a');a.href=url;a.download='traducao-ander-flow.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 }
};
