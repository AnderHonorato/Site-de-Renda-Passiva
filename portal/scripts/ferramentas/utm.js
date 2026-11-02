/** Construtor e auditor UTM: links de campanha preservando consulta e fragmento. */
import {montarFerramenta,texto,ErroDeEntrada} from '../núcleo/montador.js';
const CAMPOS=[
 ['utm_source','Origem','origem',true],
 ['utm_medium','Mídia','midia',true],
 ['utm_campaign','Campanha','campanha',true],
 ['utm_term','Termo','termo',false],
 ['utm_content','Conteúdo','conteudo',false],
];
export function validarUrlCampanha(entrada){
 if(typeof entrada!=='string'||entrada.trim().length<8||entrada.length>3000)
  throw new ErroDeEntrada('Informe uma URL completa de até 3.000 caracteres.','url');
 let url;
 try{url=new URL(entrada.trim());}
 catch{throw new ErroDeEntrada('URL inválida. Inclua https:// e o domínio.','url');}
 if(!['http:','https:'].includes(url.protocol)||!url.hostname)
  throw new ErroDeEntrada('Somente URLs HTTP e HTTPS são permitidas.','url');
 if(url.username||url.password)
  throw new ErroDeEntrada('Remova usuário e senha embutidos na URL.','url');
 return url;
}
export function normalizarParametro(v){
 return String(v??'').trim().normalize('NFKC').toLocaleLowerCase('pt-BR')
  .replace(/\s+/g,'_');
}
export function criarCampanhaUtm(dados){
 const url=validarUrlCampanha(dados.url);
 const valores={};
 for(const [nome,rotulo,chave,obrigatorio] of CAMPOS){
  const origem=String(dados[chave]??'').trim();
  if(obrigatorio&&!origem)throw new ErroDeEntrada('Preencha '+rotulo+'.',chave);
  if(origem.length>120)throw new ErroDeEntrada(rotulo+' permite até 120 caracteres.',chave);
  const normal=normalizarParametro(origem);
  if(normal.includes('\u0000'))throw new ErroDeEntrada('Remova caracteres inválidos.',chave);
  valores[nome]=normal;
 }
 const anteriores=CAMPOS.filter(([nome])=>url.searchParams.has(nome)).map(([nome])=>nome);
 for(const [nome] of CAMPOS){
  if(valores[nome])url.searchParams.set(nome,valores[nome]);
  else url.searchParams.delete(nome);
 }
 return {url:url.href,valores,anteriores,protocolo:url.protocol};
}
export function analisarCampanhaUtm(entrada){
 const url=validarUrlCampanha(entrada);
 const valores={},repetidos=[],ausentes=[];
 for(const [nome,,,obrigatorio] of CAMPOS){
  const todos=url.searchParams.getAll(nome);
  valores[nome]=todos[0]??'';
  if(todos.length>1)repetidos.push(nome);
  if(obrigatorio&&!todos[0])ausentes.push(nome);
 }
 const desconhecidos=[...new Set([...url.searchParams.keys()].filter(k=>k.toLowerCase().startsWith('utm_')
  &&!CAMPOS.some(([nome])=>nome===k)))];
 return {url:url.href,valores,repetidos,ausentes,desconhecidos,protocolo:url.protocol};
}
export function calcularUtmNaTela(dados){
 const modo=dados.modo;
 if(!['criar','analisar'].includes(modo))
  throw new ErroDeEntrada('Escolha criar ou analisar.','modo');
 const base=texto(dados,'url',{rótulo:'URL',máximo:3000});
 const dadosLink=modo==='criar'?criarCampanhaUtm({...dados,url:base}):analisarCampanhaUtm(base);
 const tabela={cabeçalho:['Parâmetro','Valor','Tipo'],linhas:CAMPOS.map(([chave,rotulo,,obrigatorio])=>[
  chave,dadosLink.valores[chave]||'—',obrigatorio?'Obrigatório':'Opcional'])};
 const avisos=[];
 if(dadosLink.protocolo==='http:')avisos.push('O link usa HTTP sem criptografia. Prefira HTTPS para campanhas públicas.');
 if(modo==='criar'){
  if(dadosLink.anteriores.length)avisos.push('UTMs antigas foram atualizadas: '+dadosLink.anteriores.join(', ')+'.');
  avisos.push('Origem, mídia e campanha foram padronizadas em minúsculas e com espaços convertidos em sublinhado.');
  avisos.push('Parâmetros não UTM e a âncora (#) existentes na URL foram preservados.');
 }else{
  if(dadosLink.ausentes.length)avisos.push('Parâmetros obrigatórios ausentes: '+dadosLink.ausentes.join(', ')+'.');
  else avisos.push('Os três parâmetros obrigatórios estão presentes.');
  if(dadosLink.repetidos.length)avisos.push('Parâmetros UTM duplicados: '+dadosLink.repetidos.join(', ')+'.');
  if(dadosLink.desconhecidos.length)avisos.push('Parâmetros UTM não reconhecidos: '+dadosLink.desconhecidos.join(', ')+'.');
 }
 avisos.push('A ferramenta não acessa Analytics nem confirma se a campanha está coletando dados. O link não é enviado a servidores do portal.');
 return {
  valor:modo==='criar'?'Link UTM gerado':dadosLink.ausentes.length||dadosLink.repetidos.length?'Revisão necessária':'Link analisado',
  resumo:modo==='criar'?'Pronto para copiar e testar.':'Auditoria dos parâmetros da URL fornecida.',
  linhas:[['URL',dadosLink.url],['Modo',modo==='criar'?'Montar campanha':'Auditar URL'],
   ['Situação',modo==='criar'?'Parâmetros gerados':dadosLink.ausentes.length||dadosLink.repetidos.length?'Verifique os avisos':'Campos essenciais presentes']],
  tabela,observações:avisos,texto:['UTM de campanha',dadosLink.url,tabela.cabeçalho.join('; '),
  ...tabela.linhas.map(l=>l.join('; ')),...avisos].join('\n'),
 };
}
export default{
 instruções:{
  passos:[
   'Escolha Montar link ou Analisar link pronto.',
   'Cole a URL completa com https:// (inclusive parâmetros ou # já existentes).',
   'No modo Montar, preencha origem, mídia e campanha; termo e conteúdo são opcionais.',
   'Confira a tabela e copie o link gerado. No modo Analisar, leia os alertas de parâmetros ausentes ou repetidos.',
  ],
  exemplo:{texto:'https://loja.exemplo/produto?ref=1#detalhes com origem Instagram, mídia Social e campanha Black Friday vira um link que mantém ref e #detalhes e acrescenta utm_source=instagram, utm_medium=social e utm_campaign=black_friday.'},
  limites:'Até 3.000 caracteres na URL e 120 por parâmetro. Aceita HTTP/HTTPS, rejeita credenciais na URL. Não rastreia cliques, não acessa Google Analytics nem encurta links. Valores devem refletir sua própria convenção de campanhas.',
  perguntas:[
   {p:'O link antigo perde os parâmetros?',r:'Não. O gerador preserva os demais parâmetros e a âncora. UTMs existentes com o mesmo nome são substituídas.'},
   {p:'A ferramenta garante que o Google Analytics vai registrar?',r:'Não. A medição depende de configuração, consentimento e funcionamento das ferramentas de analytics do site.'},
  ],
 },
 montar(raiz,ferramenta){
  montarFerramenta(raiz,ferramenta,{
   rótuloDaAção:'Processar campanha',permitirSalvarTrabalho:false,registrarUsoAtivo:false,
   campos:[
    {nome:'modo',rótulo:'Ação',tipo:'seleção',padrão:'criar',opções:[
     {valor:'criar',rótulo:'Montar link UTM'}, {valor:'analisar',rótulo:'Auditar link existente'}]},
    {nome:'url',rótulo:'URL completa (HTTP/HTTPS)',padrão:'https://loja.exemplo/produto?ref=1#detalhes'},
    {nome:'origem',rótulo:'Origem (utm_source)',padrão:'Instagram'},
    {nome:'midia',rótulo:'Mídia (utm_medium)',padrão:'Social'},
    {nome:'campanha',rótulo:'Campanha (utm_campaign)',padrão:'Black Friday'},
    {nome:'termo',rótulo:'Termo (opcional)',exemplo:'palavra-chave'},
    {nome:'conteudo',rótulo:'Conteúdo (opcional)',exemplo:'banner-a'},
   ],calcular:calcularUtmNaTela,
   aoMontar(){
    const f=raiz.querySelector('#formulário');
    const mudar=()=>{
     const criar=f.elements.modo.value==='criar';
     for(const nome of ['origem','midia','campanha','termo','conteudo'])
      f.querySelector('[data-campo="'+nome+'"]').hidden=!criar;
    };
    f.addEventListener('change',mudar);mudar();
   },
  });
 },
};
