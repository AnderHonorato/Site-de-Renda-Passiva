import {montarFerramenta,baixarCsv,baixarPlanilha,comCampo} from './montador.js';
import {calcularLote,DEFINICOES} from './motores-ecommerce-lote.js';
export function criarFerramentaLote(slug){
 const def=DEFINICOES[slug];if(!def)throw Error('Ferramenta não cadastrada.');
 return {instruções:{passos:['Confira o exemplo editável e substitua os valores.','Use ponto e vírgula entre colunas e vírgula para decimais.','Calcule e exporte o relatório completo.'],limites:'Até 500 registros, sem upload para servidor. Simulação gerencial; confira os dados.',perguntas:[{p:'Meus dados saem do aparelho?',r:'Não. O cálculo acontece no navegador.'}]},
 montar(raiz,ferramenta){montarFerramenta(raiz,ferramenta,{rótuloDaAção:'Analisar registros',campos:[{nome:'tabela',rótulo:'Dados de entrada (CSV com ponto e vírgula)',tipo:'área',linhas:9,padrão:def.exemplo,dica:'Exemplo preenchido e editável · até 500 linhas'}],
 calcular(dados){const r=comCampo('tabela',()=>calcularLote(slug,dados.tabela));const tabela=[r.cabecalho,...r.linhas];return {valor:String(r.total)+(r.unidade==='R$'?' R$':' '+r.unidade),resumo:r.linhas.length+' registros analisados',linhas:[['Registros',String(r.linhas.length)],['Total',String(r.total)+' '+r.unidade]],tabela:{cabeçalho:r.cabecalho,linhas:r.linhas.slice(0,20),semExportação:true},observações:[r.observacao,'Prévia de até 20 linhas; exportações incluem todas.'],arquivos:[{rótulo:'Exportar CSV completo',gerar:()=>baixarCsv(tabela,slug)},{rótulo:'Exportar Excel',gerar:()=>baixarPlanilha(tabela,slug,{aba:'Análise'})}]};}});}
 };
}
