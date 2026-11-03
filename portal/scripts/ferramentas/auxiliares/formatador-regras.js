/** Regras puras para evitar códigos gigantes ou formatos não suportados. */
export const LINGUAGENS = Object.freeze(['sql','javascript','typescript','html','css','json']);
export const DIALETOS = Object.freeze(['sql','postgresql','mysql','mariadb','sqlite','transactsql','bigquery']);
export const LIMITE_CODIGO = 65000;
export class ErroDeFormato extends Error {
  constructor(mensagem,campo='codigo') { super(mensagem);this.name='ErroDeFormato';this.campo=campo; }
}
export function validarFormato(dados) {
  const linguagem = String(dados.linguagem??'');
  const codigo = String(dados.codigo??'');
  const dialeto = String(dados.dialeto??'sql');
  const acao = String(dados.acao??'formatar');
  const espacos = Number(dados.espacos??2);
  if (!LINGUAGENS.includes(linguagem))
    throw new ErroDeFormato('Escolha uma linguagem válida.','linguagem');
  if(!codigo.trim()||codigo.length>LIMITE_CODIGO)
    throw new ErroDeFormato('Informe código de até 65 mil caracteres.','codigo');
  if(!['formatar','minificar'].includes(acao))
    throw new ErroDeFormato('Selecione a operação.','acao');
  if (![2,4].includes(espacos))
    throw new ErroDeFormato('Use indentação de 2 ou 4 espaços.','espacos');
  if (linguagem==='sql'&&!DIALETOS.includes(dialeto))
    throw new ErroDeFormato('Selecione um dialeto SQL reconhecido.','dialeto');
  if (acao==='minificar'&&linguagem!=='json')
    throw new ErroDeFormato('Minificação segura disponível apenas para JSON. Formate as demais linguagens.','acao');
  return {linguagem,codigo,dialeto,acao,espacos};
}
export function extensaoDoCodigo(linguagem) {
  return {sql:'sql',javascript:'js',typescript:'ts',html:'html',css:'css',json:'json'}[linguagem]??'txt';
}
