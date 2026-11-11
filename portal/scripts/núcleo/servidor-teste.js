// Direciona para o último túnel público em um Gist; nunca aceita domínio arbitrário.
// Não é backend nem faz login: só encontra o endereço atual do servidor de testes.
const ID_GIST = 'a888f4b63bc461e46552e3b651f1102e';
export function destinoSeguro(endereco, rota='') {
  if(typeof endereco!=='string')return null;
  let url;
  try{url=new URL(endereco);}catch{return null;}
  if(url.protocol!=='https:'||url.username||url.password||url.port||
     url.pathname!=='/'||url.search||url.hash||
     !/^[a-z0-9]+(?:-[a-z0-9]+)*\.trycloudflare\.com$/i.test(url.hostname))
    return null;
  const rotas={
    entrar:'/entrar.html',cadastro:'/criar-conta.html',admin:'/admin/',
    ruptura:'/f/risco-ruptura-produtos/',
    frete:'/f/simulador-frete-gratis/',
    fornecedores:'/f/impacto-reajuste-fornecedores/',
    expedicao:'/f/capacidade-expedicao-turnos/',
    estornos:'/f/margem-pedidos-estornos/',
    descontos:'/f/descontos-progressivos-lote/',
    parado:'/f/estoque-parado-capital/',
    capital:'/f/ciclo-financeiro-capital-giro/',
    pagamentos:'/f/auditoria-taxas-pagamentos/',
    faixas:'/f/politica-frete-faixas/',
    seguranca:'/f/estoque-seguranca-estatistico/',
    cancelamentos:'/f/custo-cancelamentos-pedidos/',
    armazenagem:'/f/ocupacao-armazenagem/',
    orcamento:'/f/compras-priorizadas-orcamento/',
    assinaturas:'/f/projecao-assinaturas-recorrentes/'
  };
  return url.origin+(rotas[rota]||'/');
}
async function abrir() {
  const situacao=document.querySelector('#situacao');
  const link=document.querySelector('#acessar');
  const repetir=document.querySelector('#repetir');
  situacao.textContent='Consultando o endereço atual do túnel seguro…';
  link.hidden=true;
  repetir.hidden=true;
  try{
    const resposta=await fetch('https://api.github.com/gists/'+ID_GIST+'?v='+Date.now(),{
      cache:'no-store',signal:AbortSignal.timeout(13000)
    });
    if(!resposta.ok)throw new Error('endereco_nao_disponivel');
    const gist=await resposta.json();
    const valor=gist?.files?.['endereco-teste.json']?.content;
    if(typeof valor!=='string')throw new Error('arquivo_nao_disponivel');
    const destino=destinoSeguro(JSON.parse(valor).url,new URLSearchParams(location.search).get('abrir')||'');
    if(!destino)throw new Error('endereco_invalido');
    link.href=destino;link.hidden=false;
    situacao.textContent='Endereço localizado. Abrindo o site de testes…';
    location.replace(destino);
  }catch{
    situacao.textContent='O endereço de testes não está disponível no momento. Confira se o PC AS está ligado e entre novamente.';
    repetir.hidden=false;
  }
}
if(typeof document!=='undefined'){
  document.querySelector('#repetir')?.addEventListener('click',abrir);
  void abrir();
}
