/** Hash SHA local de texto ou arquivo, com comparação opcional por integridade. */
import { montarFerramenta, texto, ErroDeEntrada } from '../núcleo/montador.js';

export const LIMITE_ARQUIVO = 25 * 1024 * 1024;
const ALGORITMOS = { 'SHA-1':40,'SHA-256':64,'SHA-384':96,'SHA-512':128 };

export async function calcularHash(bytes, algoritmo='SHA-256') {
  if (!Object.hasOwn(ALGORITMOS,algoritmo)) {
    throw new ErroDeEntrada('Escolha um algoritmo suportado.', 'algoritmo');
  }
  if (!(bytes instanceof ArrayBuffer) && !ArrayBuffer.isView(bytes)) {
    throw new ErroDeEntrada('Informe texto ou selecione um arquivo.', 'conteudo');
  }
  const tamanho = bytes.byteLength;
  if (tamanho > LIMITE_ARQUIVO) {
    throw new ErroDeEntrada('Limite de 25 MB para não sobrecarregar o aparelho.', 'arquivo');
  }
  if (!globalThis.crypto?.subtle) {
    throw new Error('Este navegador não tem criptografia disponível. Abra a ferramenta via HTTPS.');
  }
  const resultado = await globalThis.crypto.subtle.digest(algoritmo,bytes);
  return Array.from(new Uint8Array(resultado), n=>n.toString(16).padStart(2,'0')).join('');
}

export function compararHash(calculado, esperado, algoritmo='SHA-256') {
  if(!Object.hasOwn(ALGORITMOS,algoritmo))throw new ErroDeEntrada('Algoritmo inválido.', 'algoritmo');
  const valor = String(esperado ?? '').trim().toLowerCase();
  if(!valor)return null;
  if(!new RegExp('^[0-9a-f]{'+ALGORITMOS[algoritmo]+'}$').test(valor)){
    throw new ErroDeEntrada('O hash esperado deve ter ' + ALGORITMOS[algoritmo] + ' caracteres hexadecimais.', 'esperado');
  }
  return calculado.toLowerCase()===valor;
}

export async function calcularHashNaTela(dados,arquivoSelecionado=null) {
  const modo=dados.modo;
  if(!['texto','arquivo'].includes(modo))throw new ErroDeEntrada('Selecione o tipo de entrada.', 'modo');
  const algoritmo=dados.algoritmo;
  if(!Object.hasOwn(ALGORITMOS,algoritmo))throw new ErroDeEntrada('Algoritmo não suportado.', 'algoritmo');
  let bytes, origem;
  if(modo==='arquivo'){
    if(!arquivoSelecionado)throw new ErroDeEntrada('Escolha um arquivo no seu aparelho.', 'arquivo');
    if(arquivoSelecionado.size>LIMITE_ARQUIVO)throw new ErroDeEntrada('Arquivo acima de 25 MB.', 'arquivo');
    bytes=await arquivoSelecionado.arrayBuffer();
    origem='Arquivo: '+arquivoSelecionado.name;
  }else{
    const conteudo=texto(dados,'conteudo',{rótulo:'Texto',máximo:200000});
    bytes=new TextEncoder().encode(conteudo);
    origem='Texto UTF-8 (sem alterações)';
  }
  const calculado=await calcularHash(bytes,algoritmo);
  const confere=compararHash(calculado,dados.esperado,algoritmo);
  const linhas=[['Algoritmo',algoritmo],['Origem',origem],
    ['Tamanho lido',bytes.byteLength.toLocaleString('pt-BR')+' bytes'],
    ['Hash hexadecimal',calculado],
    ['Comparação',confere===null?'Sem hash esperado':confere?'Correspondência exata':'Diferente do esperado']];
  const observações=[
    'O cálculo usa Web Crypto no navegador. O texto e os arquivos não são transmitidos nem salvos na sua conta.',
    'Hash igual ajuda a conferir integridade; não comprova que o arquivo seja seguro ou livre de malware.',
    algoritmo==='SHA-1'?'SHA-1 tem colisões conhecidas e não deve ser usado em aplicações de segurança. Prefira SHA-256 ou SHA-512.':
      'Compare o resultado com o checksum publicado por uma fonte confiável e no mesmo algoritmo.',
    'Arquivos têm limite de 25 MB para evitar falta de memória em celulares.',
  ];
  return {valor:confere===true?'Hash conferido':confere===false?'Hashes diferentes':'Hash calculado',
    resumo:algoritmo+' · '+bytes.byteLength.toLocaleString('pt-BR')+' bytes.',
    linhas,observações,texto:[origem,algoritmo+': '+calculado,
      'Conferência: '+(confere===null?'não solicitada':confere?'igual':'diferente'),...observações].join('\n')};
}

export default {
  instruções:{
    passos:[
      'Escolha texto digitado ou arquivo do aparelho.',
      'Selecione SHA-256 (recomendado), SHA-384, SHA-512 ou SHA-1 para compatibilidade.',
      'Se tiver o hash oficial do fabricante, cole-o em “Hash esperado”.',
      'Calcule e confira se os caracteres são exatamente iguais antes de considerar a integridade verificada.',
    ],
    exemplo:{texto:'O SHA-256 do texto abc em UTF-8 começa com ba7816bf. Ao comparar com o hash oficial completo, o resultado informa se é idêntico.'},
    limites:'Até 25 MB por arquivo e 200 mil caracteres de texto. Cálculo local pelo Web Crypto; SHA-1 não serve para segurança moderna. Hash não identifica malware e não garante que o fornecedor é confiável.',
    perguntas:[
      {p:'Meus arquivos são enviados?',r:'Não. A leitura e o cálculo acontecem apenas no navegador; a função de salvar na conta está desativada.'},
      {p:'Hash igual significa que o arquivo não tem vírus?',r:'Não. Significa apenas que os dados coincidem com o checksum informado, caso ele seja confiável.'},
    ],
  },
  montar(raiz,ferramenta){
    montarFerramenta(raiz,ferramenta,{
      rótuloDaAção:'Calcular hash',demorada:true,
      permitirSalvarTrabalho:false,registrarUsoAtivo:false,
      campos:[
        {nome:'modo',rótulo:'Entrada',tipo:'seleção',padrão:'texto',opções:[
          {valor:'texto',rótulo:'Texto digitado'},
          {valor:'arquivo',rótulo:'Arquivo local'},
        ]},
        {nome:'algoritmo',rótulo:'Algoritmo',tipo:'seleção',padrão:'SHA-256',opções:[
          {valor:'SHA-256',rótulo:'SHA-256 (recomendado)'},
          {valor:'SHA-512',rótulo:'SHA-512'},
          {valor:'SHA-384',rótulo:'SHA-384'},
          {valor:'SHA-1',rótulo:'SHA-1 (compatibilidade)'},
        ]},
        {nome:'conteudo',rótulo:'Texto para calcular',tipo:'área',linhas:4,padrão:'abc'},
        {nome:'arquivo',rótulo:'Arquivo (até 25 MB)',tipo:'file',dica:'Selecione um arquivo neste aparelho.'},
        {nome:'esperado',rótulo:'Hash esperado, opcional',exemplo:'Cole o checksum oficial completo'},
      ],
      calcular:(dados)=>calcularHashNaTela(dados,raiz.querySelector('[name="arquivo"]')?.files?.[0]??null),
      aoMontar(){
        const form=raiz.querySelector('#formulário');
        const atualizar=()=>{
          const modo=form.elements.modo.value;
          form.querySelector('[data-campo="conteudo"]').hidden=modo!=='texto';
          form.querySelector('[data-campo="arquivo"]').hidden=modo!=='arquivo';
        };
        form.addEventListener('change',atualizar);atualizar();
      },
    });
  },
};
