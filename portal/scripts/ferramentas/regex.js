/** Laboratório Regex profissional: execução isolada com timeout, grupos e destaque seguro. */
import {montarFerramenta, ErroDeEntrada} from '../núcleo/montador.js';
import {escapar} from '../núcleo/texto.js';
import {validarRegex} from './auxiliares/regex-motor.js';

const PRAZO_MS=1600;
function executarIsolado(entrada){
  const v=validarRegex(entrada);
  if(typeof Worker==='undefined')throw new ErroDeEntrada('Este navegador não oferece Web Worker para execução segura de expressões.','expressao');
  return new Promise((resolver,rejeitar)=>{
    let worker,fechado=false,timeout;
    const terminar=()=>{
      if(fechado)return false;fechado=true;
      clearTimeout(timeout);
      worker?.terminate();
      return true;
    };
    try{worker=new Worker(new URL('./auxiliares/regex-trabalhador.js',import.meta.url),{type:'module'});}
    catch{rejeitar(new ErroDeEntrada('Não foi possível iniciar o ambiente isolado.','expressao'));return;}
    timeout=setTimeout(()=>{
      if(terminar())rejeitar(new ErroDeEntrada('O padrão demorou demais e foi interrompido. Revise quantificadores e retrocesso.','expressao'));
    },PRAZO_MS);
    worker.onmessage=(evento)=>{
      if(!terminar())return;
      const resposta=evento.data;
      if(resposta?.ok)resolver(resposta.resultado);
      else rejeitar(new ErroDeEntrada(resposta?.erro?.mensagem??'Não foi possível testar.',resposta?.erro?.campo??'expressao'));
    };
    worker.onerror=()=>{
      if(terminar())rejeitar(new ErroDeEntrada('Falha ao executar o teste no ambiente isolado.','expressao'));
    };
    worker.onmessageerror=()=>{
      if(terminar())rejeitar(new ErroDeEntrada('Resultado não pôde ser recebido do ambiente isolado.','expressao'));
    };
    try{worker.postMessage(v);}
    catch{if(terminar())rejeitar(new ErroDeEntrada('Falha ao enviar os dados para teste local.','expressao'));}
  });
}
export function realcarCorrespondencias(texto,correspondencias){
  let saida='',cursor=0;
  for(const m of correspondencias){
    if(m.inicio<cursor||m.fim<m.inicio||m.fim>texto.length)continue;
    saida+=escapar(texto.slice(cursor,m.inicio));
    const segmento=texto.slice(m.inicio,m.fim);
    saida+=segmento?'<mark>'+escapar(segmento)+'</mark>':'';
    cursor=m.fim;
  }
  return saida+escapar(texto.slice(cursor));
}
export default{
  instruções:{
    passos:[
      'Digite uma expressão regular em JavaScript (sem as barras /.../) e defina os sinalizadores, como g, i ou m.',
      'Cole o texto de teste. Escolha buscar ou buscar e substituir.',
      'Execute para conferir correspondências destacadas, posição, capturas numeradas e grupos nomeados.',
      'Opcionalmente informe texto de substituição. Use $1 ou $<nome> para capturas, conforme a sintaxe JavaScript.',
    ],
    exemplo:{texto:'Padrão (?<codigo>\\d+) com flag g em SKU 123 e SKU 456 encontra duas correspondências; substituição ID-$<codigo> vira SKU ID-123 e SKU ID-456.'},
    limites:'Até 350 caracteres de expressão e 30 mil de texto. Exibe até 150 correspondências. Um Worker independente tem limite de 1,6 segundo, depois é interrompido; isso reduz riscos de travamento por ReDoS, mas não substitui revisão de segurança de regex em servidores. Não executa código JavaScript nem envia textos a terceiros.',
    perguntas:[
      {p:'Por que minha expressão foi interrompida?',r:'Padrões com retrocesso excessivo podem travar. Aqui eles são executados em um Worker que é encerrado ao ultrapassar o limite.'},
      {p:'A substituição altera o texto original?',r:'Não. O resultado é exibido separadamente e o original permanece no campo.'},
    ],
  },
  montar(raiz,ferramenta){
    const previa=document.createElement('section');
    previa.className='regex-previa';
    previa.hidden=true;
    previa.setAttribute('aria-label','Prévia das correspondências');
    const titulo=document.createElement('h3');titulo.textContent='Correspondências no texto';
    const pre=document.createElement('pre');
    const novo=document.createElement('div');novo.className='regex-substituicao';
    previa.append(titulo,pre,novo);
    montarFerramenta(raiz,ferramenta,{
      rótuloDaAção:'Testar expressão',demorada:true,
      permitirSalvarTrabalho:false,registrarUsoAtivo:false,
      campos:[
        {nome:'expressao',rótulo:'Expressão regular',padrão:'(?<codigo>\\d+)',dica:'Digite o padrão sem barras, por exemplo: \\d+'},
        {nome:'flags',rótulo:'Sinalizadores (g, i, m...)',padrão:'g',exemplo:'gim'},
        {nome:'texto',rótulo:'Texto de teste',tipo:'área',linhas:5,padrão:'SKU 123 e SKU 456'},
        {nome:'substituir',rótulo:'Substituir também',tipo:'caixa'},
        {nome:'substituicao',rótulo:'Texto de substituição',padrão:'ID-$<codigo>'},
      ],
      calcular:async(dados)=>{
        previa.hidden=true;
        const resultado=await executarIsolado(dados);
        const list=resultado.correspondencias;
        pre.innerHTML=realcarCorrespondencias(resultado.texto,list);
        if(resultado.substituiu){
          novo.hidden=false;
          const rotulo=document.createElement('h3');rotulo.textContent='Texto após substituição';
          const saida=document.createElement('pre');saida.textContent=resultado.substituido;
          novo.replaceChildren(rotulo,saida);
        }else{novo.hidden=true;novo.replaceChildren();}
        previa.hidden=false;
        const linhas=[
          ['Correspondências exibidas',String(list.length)+(resultado.limite?' (limite atingido)':'')],
          ['Sinalizadores',resultado.flags||'Nenhum'],
          ['Substituição',resultado.substituiu?'Aplicada no resultado':'Desativada'],
        ];
        const tabela=list.length?{
          cabeçalho:['#','Início','Final','Trecho','Grupos (capturas)'],
          linhas:list.map((m,i)=>[
            String(i+1),String(m.inicio),String(m.fim),m.trecho,
            Object.entries(m.nomes).length?
              Object.entries(m.nomes).map(([k,v])=>k+'='+String(v??'não capturado')).join('; '):
              m.grupos.map((v,j)=>(j+1)+'='+String(v??'não capturado')).join('; ')||'—',
          ]),
        }:null;
        const observações=[
          'O texto e a expressão são processados apenas no Worker do seu aparelho; não são enviados nem salvos na conta.',
          'Posições são índices de unidades UTF-16, como em JavaScript (um emoji pode ocupar duas unidades).',
          resultado.limite?'O limite de 150 resultados foi atingido; a lista pode estar incompleta.':'Correspondências mostradas até o fim da busca solicitada.',
        ];
        return {valor:list.length+' correspondência(s)',
          resumo:resultado.substituiu?'Substituição disponível abaixo.':'Veja as correspondências destacadas abaixo.',
          linhas,tabela,observações,
          texto:['Laboratório Regex',...linhas.map(([k,v])=>k+': '+v),
            ...list.map((m,i)=>(i+1)+'. ['+m.inicio+','+m.fim+'] '+m.trecho),
            resultado.substituiu?'Substituído:\n'+resultado.substituido:'',
            ...observações].join('\n')};
      },
      aoMontar(){
        const formulario=raiz.querySelector('#formulário');
        raiz.querySelector('#resultado').after(previa);
        const ativar=()=>{
          formulario.querySelector('[data-campo="substituicao"]').hidden=!formulario.elements.substituir.checked;
        };
        formulario.addEventListener('change',ativar);
        formulario.addEventListener('reset',()=>{previa.hidden=true;novo.replaceChildren();});
        ativar();
      },
    });
  },
};
