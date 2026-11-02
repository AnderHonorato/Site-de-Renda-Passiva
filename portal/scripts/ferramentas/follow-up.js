/** Follow-up comercial: modelos locais editáveis, sem envio automático de mensagens. */
import { montarFerramenta, texto, ErroDeEntrada } from '../núcleo/montador.js';

const CONTEXTOS = ['proposta', 'retomada', 'agendamento', 'posvenda', 'pendencia'];
const TONS = ['cordial', 'formal', 'objetivo'];

export function criarFollowUp({ cliente, assunto, objetivo, tom, dataContato = '', detalhe = '' }) {
  if (!CONTEXTOS.includes(objetivo)) throw new ErroDeEntrada('Selecione o objetivo da mensagem.', 'objetivo');
  if (!TONS.includes(tom)) throw new ErroDeEntrada('Escolha um tom válido.', 'tom');
  if (dataContato && !/^\d{2}\/\d{2}\/\d{4}$/.test(dataContato)) {
    throw new ErroDeEntrada('Use a data no formato DD/MM/AAAA ou deixe em branco.', 'dataContato');
  }
  const chamamento=tom==='formal'?'Prezado(a) '+cliente+',':tom==='objetivo'?'Olá, '+cliente+'.':'Olá, '+cliente+'! Tudo bem?';
  const referencia=dataContato?' No nosso contato de '+dataContato+',':'';
  const base={
    proposta:'Gostaria de saber se você conseguiu avaliar a proposta sobre '+assunto+'.',
    retomada:'Estou retomando nosso contato sobre '+assunto+'.',
    agendamento:'Podemos combinar um horário para conversar sobre '+assunto+'?',
    posvenda:'Gostaria de saber se está tudo certo com '+assunto+' e se posso ajudar em mais alguma coisa.',
    pendencia:'Gostaria de verificar se existe alguma atualização sobre '+assunto+'.',
  };
  const fechamento=tom==='formal'?'Fico à disposição e agradeço o retorno.':
    tom==='objetivo'?'Aguardo seu retorno.':'Quando puder, me diga o que acha. Obrigado!';
  return [chamamento,referencia+ ' '+base[objetivo],
    detalhe?'Observação: '+detalhe:'',fechamento].filter((linha)=>linha.trim()).join('\n\n').trim();
}
export function calcularFollowUpNaTela(dados) {
 const cliente=texto(dados,'cliente',{rótulo:'Nome do cliente',máximo:80});
 const assunto=texto(dados,'assunto',{rótulo:'Assunto da conversa',máximo:160});
 const detalhe=texto(dados,'detalhe',{rótulo:'Observação',máximo:250,obrigatório:false});
 const dataContato=texto(dados,'dataContato',{rótulo:'Data do último contato',máximo:10,obrigatório:false});
 const mensagem=criarFollowUp({cliente,assunto,detalhe,dataContato,objetivo:dados.objetivo,tom:dados.tom});
 return {
  valor:'Mensagem pronta para copiar',
  resumo:mensagem,
  linhas:[['Destinatário',cliente],['Objetivo',dados.objetivo],['Tom',dados.tom]],
  texto:mensagem,
  observações:[
    'Revise a mensagem antes de copiar ou enviar; esta ferramenta não envia mensagens automaticamente.',
    'Não inventa prazos, descontos, pedidos ou respostas que o cliente não confirmou.',
  ],
 };
}
export default {
 instruções:{
  passos:[
   'Informe como quer chamar o cliente e o assunto da última conversa.',
   'Selecione o objetivo: proposta, retomada, agendamento, pós-venda ou pendência.',
   'Escolha o tom: cordial, formal ou objetivo. O último contato e as observações são opcionais.',
   'Copie a mensagem e revise os detalhes antes de enviar pelo canal que preferir.',
  ],
  exemplo:{texto:'Olá, Maria! Tudo bem? Estou retomando nosso contato sobre o orçamento do site. Quando puder, me diga o que acha. Obrigado!'},
  limites:'São modelos prontos, sem IA e sem envio automático. O texto é montado no próprio navegador; não consulta conversas nem históricos reais do cliente. Evite incluir dados pessoais desnecessários.',
  perguntas:[
   {p:'A ferramenta envia WhatsApp ou e-mail?',r:'Não. Ela cria o texto, e você decide se e como enviá-lo.'},
   {p:'Posso ajustar a mensagem?',r:'Sim. Copie a mensagem e edite no aplicativo em que vai enviá-la.'},
  ],
 },
 montar(raiz,ferramenta){
  montarFerramenta(raiz,ferramenta,{
   rótuloDaAção:'Criar mensagem',
   campos:[
    {nome:'cliente',rótulo:'Nome do cliente',padrão:'Maria'},
    {nome:'assunto',rótulo:'Assunto da conversa',padrão:'o orçamento enviado'},
    {nome:'objetivo',rótulo:'Objetivo do contato',tipo:'seleção',padrão:'retomada',opções:[
     {valor:'proposta',rótulo:'Pedir retorno sobre proposta'},
     {valor:'retomada',rótulo:'Retomar negociação'},
     {valor:'agendamento',rótulo:'Agendar conversa'},
     {valor:'posvenda',rótulo:'Acompanhamento após a venda'},
     {valor:'pendencia',rótulo:'Verificar uma pendência'},
    ]},
    {nome:'tom',rótulo:'Tom da mensagem',tipo:'seleção',padrão:'cordial',opções:[
     {valor:'cordial',rótulo:'Cordial'},
     {valor:'formal',rótulo:'Formal'},
     {valor:'objetivo',rótulo:'Objetivo'},
    ]},
    {nome:'dataContato',rótulo:'Data do último contato (opcional)',exemplo:'30/10/2026'},
    {nome:'detalhe',rótulo:'Observação (opcional)',tipo:'área',linhas:3},
   ],
   calcular:calcularFollowUpNaTela,
  });
 },
};
