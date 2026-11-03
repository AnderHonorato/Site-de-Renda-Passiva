/** Formatação profissional local via Prettier e SQL Formatter empacotados. */
import { montarFerramenta, baixar, ErroDeEntrada, nomeDeArquivo } from '../núcleo/montador.js';
import { validarFormato, extensaoDoCodigo } from './auxiliares/formatador-regras.js';

const PRAZO_MS = 18000;
export function processarFormatadorEmWorker(dados, criarWorker = (url) => new Worker(url, {type:'module'})) {
  let entrada;
  try { entrada = validarFormato(dados); }
  catch(e) {throw new ErroDeEntrada(e.message,e.campo??'codigo');}
  if(typeof Worker==='undefined' && arguments.length<2)
    throw new ErroDeEntrada('Seu navegador não permite execução isolada; abra pelo HTTPS em navegador atualizado.','codigo');
  return new Promise((resolve,reject) => {
    let worker;
    try { worker = criarWorker(new URL('./auxiliares/formatador-trabalhador.js', import.meta.url));}
    catch { reject(new ErroDeEntrada('Não foi possível iniciar o motor local de formatação.','codigo'));return;}
    let finalizado=false;
    const concluir=()=>{
      if(finalizado)return false;
      finalizado=true;clearTimeout(temporizador);worker.terminate();return true;
    };
    const temporizador=setTimeout(()=>{
      if(concluir())reject(new ErroDeEntrada('Formatação interrompida após 18 segundos. Experimente um trecho menor.','codigo'));
    },PRAZO_MS);
    worker.onmessage=({data})=>{
      if(!concluir())return;
      if(data?.ok)resolve(data.resultado);
      else reject(new ErroDeEntrada(data?.erro?.mensagem??'Erro ao formatar.',data?.erro?.campo??'codigo'));
    };
    worker.onerror=()=>{
      if(concluir())reject(new ErroDeEntrada('O motor não conseguiu carregar. Recarregue o site e tente novamente.','codigo'));
    };
    worker.onmessageerror=()=>{
      if(concluir())reject(new ErroDeEntrada('Erro ao receber código do motor isolado.','codigo'));
    };
    try{worker.postMessage(entrada);}
    catch {if(concluir())reject(new ErroDeEntrada('Falha ao processar entrada.','codigo'));}
  });
}

export default {
  instruções:{
    passos:[
      'Escolha JavaScript, TypeScript, SQL, HTML, CSS ou JSON.',
      'Cole seu código no campo; para SQL escolha também o dialeto do banco.',
      'Clique em Formatar. O Prettier ou SQL Formatter analisará a sintaxe no navegador, sem executar seu código.',
      'Confira a saída e copie ou baixe o arquivo; para JSON também é possível minificar sem alterar os dados.',
    ],
    exemplo:{texto:'A consulta SELECT id,nome FROM produtos WHERE ativo=1 é reorganizada em cláusulas e recuos. O conteúdo SQL não é executado nem enviado ao banco de dados.'},
    limites:'Códigos de até 65 mil caracteres. Minificação oferecida somente para JSON (nas demais linguagens uma remoção cega de espaços poderia alterar a lógica). Formatação não verifica a segurança nem a semântica. Bibliotecas Prettier 3.9.10 e SQL Formatter 15.9.0 são carregadas do próprio portal; é necessário navegador moderno com Web Worker.',
    perguntas:[
      {p:'O site executa meu JavaScript ou minhas consultas SQL?',r:'Não. O código é lido como texto por parsers locais, sem executá-lo e sem enviá-lo a servidores.'},
      {p:'Por que uma consulta SQL não foi formatada?',r:'Escolha o dialeto apropriado. O formatador não substitui o validador de sintaxe do seu banco nem aceita todas as construções especializadas.'},
    ],
  },
  montar(raiz,ferramenta) {
    const pre=document.createElement('pre');
    pre.className='codigo-formatado';pre.hidden=true;pre.setAttribute('aria-label','Código formatado');
    montarFerramenta(raiz,ferramenta,{
      rótuloDaAção:'Formatar código',demorada:true,permitirSalvarTrabalho:false,registrarUsoAtivo:false,
      campos:[
        {nome:'linguagem',rótulo:'Linguagem',tipo:'seleção',padrão:'javascript',opções:[
          {valor:'javascript',rótulo:'JavaScript'}, {valor:'typescript',rótulo:'TypeScript'},
          {valor:'sql',rótulo:'SQL'}, {valor:'html',rótulo:'HTML'},
          {valor:'css',rótulo:'CSS'}, {valor:'json',rótulo:'JSON'},
        ]},
        {nome:'dialeto',rótulo:'Dialeto SQL',tipo:'seleção',padrão:'sql',opções:[
          {valor:'sql',rótulo:'SQL padrão'}, {valor:'postgresql',rótulo:'PostgreSQL'},
          {valor:'mysql',rótulo:'MySQL'}, {valor:'mariadb',rótulo:'MariaDB'},
          {valor:'sqlite',rótulo:'SQLite'}, {valor:'transactsql',rótulo:'SQL Server'},
          {valor:'bigquery',rótulo:'BigQuery'},
        ]},
        {nome:'acao',rótulo:'Operação',tipo:'seleção',padrão:'formatar',opções:[
          {valor:'formatar',rótulo:'Formatar e organizar'},
          {valor:'minificar',rótulo:'Minificar JSON'},
        ]},
        {nome:'espacos',rótulo:'Indentação',tipo:'seleção',padrão:'2',opções:[
          {valor:'2',rótulo:'2 espaços'},{valor:'4',rótulo:'4 espaços'},
        ]},
        {nome:'codigo',rótulo:'Código original',tipo:'área',linhas:8,
          padrão:'function teste(){const valor={produto:"Camiseta",preco:49.9};return valor}'},
      ],
      calcular:async(dados)=>{
        pre.hidden=true;
        const formatado=await processarFormatadorEmWorker(dados);
        pre.textContent=formatado;pre.hidden=false;
        const ext=extensaoDoCodigo(dados.linguagem);
        const titulo='Código formatado · '+dados.linguagem.toUpperCase();
        const originalBytes=new TextEncoder().encode(dados.codigo).byteLength;
        const finalBytes=new TextEncoder().encode(formatado).byteLength;
        const observações=[
          'O código é formatado no navegador, em ambiente isolado. Nenhum dado é enviado ao portal.',
          'A formatação ajusta espaços e quebras de linha, mas não valida execução, semântica, segurança ou desempenho.',
          dados.linguagem==='sql'?'O dialeto selecionado influencia o reconhecimento de palavras-chave.':'O Prettier preserva a estrutura do programa sempre que a entrada é sintaticamente válida.',
        ];
        return {valor:titulo,
          resumo:'Saída pronta para copiar ou baixar, exibida logo abaixo.',
          linhas:[['Linguagem',dados.linguagem],['Entrada',originalBytes+' bytes'],
            ['Saída',finalBytes+' bytes'],['Operação',dados.acao==='minificar'?'Minificação JSON':'Formatação']],
          observações,texto:formatado,
          arquivos:[{rótulo:'Baixar arquivo .'+ext,ícone:'baixar',
            gerar:()=>baixar(formatado,nomeDeArquivo('codigo-formatado')+'.'+ext,'text/plain;charset=utf-8')}],
        };
      },
      aoMontar(){
        raiz.querySelector('#resultado').after(pre);
        const form=raiz.querySelector('#formulário');
        function atualizar(){
          const linguagem=form.elements.linguagem.value;
          form.querySelector('[data-campo="dialeto"]').hidden=linguagem!=='sql';
          if(linguagem!=='json' && form.elements.acao.value==='minificar')
            form.elements.acao.value='formatar';
          form.elements.acao.querySelector('[value="minificar"]').disabled=linguagem!=='json';
        }
        form.addEventListener('change',atualizar);
        form.addEventListener('reset',()=>{pre.hidden=true;});
        atualizar();
      },
    });
  },
};
