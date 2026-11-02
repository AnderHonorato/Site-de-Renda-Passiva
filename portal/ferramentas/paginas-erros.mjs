import { montarPágina,escapar } from './modelo-de-página.mjs';
export function paginasErros(ctx){const en=ctx.código==='en',pasta=ctx.idioma.pasta;return [429,500].map(status=>{
  const titulo=status===429?(en?'Please wait a moment':'Aguarde um momento'):(en?'This part could not load':'Não consegui carregar esta parte');
  const texto=status===429?(en?'There were too many requests. Respect the waiting time before trying again. Other local tools remain available.':'Houve muitas solicitações. Respeite o tempo de espera antes de tentar novamente. As demais ferramentas locais continuam disponíveis.'):(en?'Try again shortly. Your saved data remains in your account.':'Tente novamente em instantes. Seus dados salvos permanecem na conta.');
  const arquivo=status===429?'429.html':'erro.html';
  return [`${pasta}${arquivo}`,montarPágina({ctx,título:titulo,descrição:texto,base:'',raiz:en?'../':'',semÍndice:true,conteúdo:`<section class="largura seção prosa"><p class="rótulo">${status}</p><h1>${escapar(titulo)}</h1><p>${escapar(texto)}</p><a class="botão" href="./">${en?'Back to home':'Voltar ao início'}</a></section>`})];
});}
