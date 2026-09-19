# Contrato do portal Doce Ofício

Escopo: portal estático único com exatamente 150 ferramentas, 15 categorias com 10 ferramentas cada. Preservar os 120 itens de documentação/dados-do-catálogo.mjs e acrescentar 2 úteis por categoria. Nenhuma ferramenta fictícia ou mera variação numérica.

Cada executor escreve apenas seu grupo em scripts/ferramentas/grupo-N/ e seu teste em testes/grupo-N.test.mjs. Exportação de grupo-N/index.js: `export const ferramentas = [...]`. Cada ferramenta tem arquivo próprio e objeto:

```js
export default {
 id: 'slug-ascii-unico', categoria: 1, titulo: 'Título', descricao: 'Descrição útil.',
 metodologia: 'Fórmula, limitações e unidades.',
 campos: [{nome:'valor',rotulo:'Valor (R$)',tipo:'number',valor:80,min:0,max:1000000,passo:'any',obrigatorio:true},
 {nome:'modo',rotulo:'Modo',tipo:'select',valor:'a',opcoes:[{valor:'a',rotulo:'Modo A'}]},
 {nome:'texto',rotulo:'Texto',tipo:'textarea',valor:'Exemplo'},
 {nome:'arquivo',rotulo:'Arquivo',tipo:'file',aceita:'.pdf',multiplo:false}],
 executar: async (dados) => ({resumo:'R$ 80,00',linhas:['Explicação','Memória de cálculo'],
   arquivo: {nome:'resultado.txt',blob:new Blob(['conteúdo'],{type:'text/plain'})},
   arquivos:[], imagem:undefined, svg:undefined }),
 // Apenas cronômetro e temporizador: montar(elemento) opcional, retorna função de limpeza.
};
```

`dados` contém strings para campos comuns, File para file simples e File[] para múltiplos. Valores numéricos podem conter vírgula brasileira: validar explicitamente, rejeitar vazio/NaN/Infinity/faixas inválidas. Erros devem lançar Error com mensagem em português. O renderizador exibe resultados como texto seguro. `svg` é markup SVG gerado pela própria ferramenta, com escape de textos do usuário; `imagem` pode ser Blob ou data URL produzida localmente. Arquivos opcionais, download pela UI. Não usar HTML livre. Campos tipo date, time, color, checkbox (boolean) também suportados. Campos number na UI usam input text com inputmode decimal, validar no executor.

Salvar/restaurar entradas, favoritos, imprimir, copiar resultado, busca e consentimento são implementados pelo integrador. Ferramentas não modificam configuração, navegação nem estado global. Ferramentas com arquivo não devem ler o arquivo no import. Dependências de PDF serão locais em recursos/bibliotecas/pdf-lib.min.js (global PDFLib) e recursos/bibliotecas/pdf.mjs + pdf.worker.mjs (PDF.js). QR local em recursos/bibliotecas/qrcode.mjs, exportação default.

Não editar package.json nem recursos compartilhados. Podem reutilizar cálculos existentes copiando/adaptando para dentro do grupo, sem dependência do projeto original nem das outras seis pastas. Tests usam node:test e cobrem exemplos independentes, rejeição de entradas e contagem. Código/browser-only deve carregar apenas ao executar. Sem serviços externos, emojis ou glifos usados como ícones. Metodologias não devem fornecer aconselhamento médico, legal ou financeiro; são contas com premissas explícitas.
