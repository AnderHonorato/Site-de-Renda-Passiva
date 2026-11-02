import test from 'node:test';
import assert from 'node:assert/strict';
import {ferramentas} from '../scripts/ferramentas/grupo-1/index.js';
const byId=new Map(ferramentas.map(f=>[f.id,f]));
const defaults=f=>Object.fromEntries(f.campos.map(c=>[c.nome,c.valor]));
const run=(id,data={})=>{const f=byId.get(id);assert.ok(f,id);return f.executar({...defaults(f),...data});};
const content=r=>[r.resumo,...r.linhas].join('\n');
test('grupo 1: 50 ferramentas únicas, 10 por categoria e metadados completos',()=>{
 assert.equal(ferramentas.length,50);assert.equal(byId.size,50);
 for(let c=1;c<=5;c++)assert.equal(ferramentas.filter(f=>f.categoria===c).length,10);
 for(const f of ferramentas){assert.ok(f.titulo&&f.descricao&&f.metodologia);assert.ok(f.campos.length);}
});
for(const f of ferramentas){
 test(f.id+': exemplo inicial utilizável',async()=>{const r=await f.executar(defaults(f));assert.equal(typeof r.resumo,'string');assert.ok(Array.isArray(r.linhas));assert.ok(r.arquivo.blob.size>0);assert.doesNotMatch(content(r),/NaN|Infinity|undefined/);});
 for(const c of f.campos.filter(c=>c.tipo==='number'))test(f.id+': valida '+c.nome,async()=>{for(const value of ['','abc','Infinity','NaN','-1'])await assert.rejects(f.executar({...defaults(f),[c.nome]:value}),Error);});
}
const examples=[
 ['custo-da-receita',{ingredientes:'Ingrediente; 80; 80; 80',extras:0,rendimento:50},/1,60/],
 ['preco-de-venda',{},/114,2857/],
 ['ajuste-de-receitas',{},/Farinha: 500 g/],
 ['lista-de-compras-da-producao',{},/Farinha: 3 pacotes; sobra 300/],
 ['orcamento-de-doces',{},/114,50/],
 ['conversor-de-formas',{},/Fator 2,25/],
 ['rendimento-com-perdas',{},/95 unidades/],
 ['ficha-tecnica-de-receita',{},/12,00/],
 ['cronograma-de-fornadas',{},/155 minutos/],
 ['quantidade-de-cobertura',{diametro:20,altura:10,consumo:1,reserva:0},/942,4778/],
 ['preco-de-peca-artesanal',{margem:0},/50,00/],
 ['valor-da-hora-artesanal',{},/30,00/],
 ['custo-do-fio-consumido',{},/5,00/],
 ['planejador-de-encomendas',{},/5 dias produtivos/],
 ['orcamento-artesanal',{},/150,00/],
 ['simulador-de-desconto-artesanal',{},/Contribuição: R\$\s30,00/],
 ['conversor-de-amostras-de-pontos',{},/70 pontos/],
 ['controle-de-materiais-local',{},/75 g/],
 ['distribuidor-de-aumentos',{},/3, 8, 13, 18, 23, 28, 33, 38/],
 ['metragem-de-tecido',{},/0,64 m/],
 ['calculadora-de-churrasco',{},/4 kg/],
 ['planejador-de-festa-infantil',{},/100 salgados/],
 ['quantidade-para-almoco',{},/Arroz: 1,2 kg/],
 ['calculadora-de-bebidas',{},/Água: 9 L/],
 ['orcamento-de-festa',{},/440,00/],
 ['divisor-de-despesas',{},/75,00/],
 ['cronograma-de-evento',{},/2026-09-20 16:00/],
 ['lista-de-convidados-local',{},/1 confirmados/],
 ['distribuicao-de-mesas',{},/7 mesas/],
 ['planejador-de-gelo',{},/3 sacos/],
 ['area-de-paredes',{},/10 m²/],
 ['quantidade-de-tinta',{},/8 L/],
 ['piso-por-caixa',{},/10 caixas/],
 ['quantidade-de-rodape',{},/9 barras/],
 ['papel-de-parede',{},/8 faixas/],
 ['orcamento-de-acabamento',{},/1\.300,00/],
 ['area-de-rejunte-estimada',{area:1,a:9,b:9,junta:1,profundidade:1,densidade:1,perda:0},/0,19 kg/],
 ['comparador-de-embalagens-de-tinta',{},/Lata A: R\$\s25,00\/L/],
 ['argamassa-por-saco',{},/7 sacos/],
 ['escala-de-planta',{},/8 cm/],
];
for(const[id,data,pattern]of examples)test(id+': cálculo independente',async()=>assert.match(content(await run(id,data)),pattern));
test('vírgula decimal, limites e denominadores',async()=>{
 assert.match(content(await run('valor-da-hora-artesanal',{meta:'3000,00',custos:'0',horas:'100,0'})),/30,00/);
 for(const[id,data]of [['valor-da-hora-artesanal',{horas:0}],['custo-do-fio-consumido',{peso:0}],['conversor-de-amostras-de-pontos',{amostra:0}],['quantidade-de-tinta',{rendimento:0}],['piso-por-caixa',{caixa:0}],['escala-de-planta',{escala:0}],['divisor-de-despesas',{pagantes:0}],['preco-de-venda',{margem:60,taxas:40}],['area-de-paredes',{aberturas:13}],['rendimento-com-perdas',{perda:100}],['rendimento-com-perdas',{unidades:1,perda:99}],['papel-de-parede',{roloComprimento:1}],['metragem-de-tecido',{largura:1}],['lista-de-convidados-local',{convidados:'Ana; talvez; -'}],['calculadora-de-bebidas',{alcool:'sim',adultos:false}]])await assert.rejects(run(id,data),Error,id);
});
test('compras somam ingredientes repetidos e rejeitam embalagem inconsistente',async()=>{
 assert.match(content(await run('lista-de-compras-da-producao',{itens:'Farinha; 600; 500\nfarinha; 600; 500'})),/3 pacotes/);
 await assert.rejects(run('lista-de-compras-da-producao',{itens:'Farinha; 600; 500\nfarinha; 600; 1000'}));
});
test('rateio fecha centavos e desconto pode revelar contribuição negativa',async()=>{
 assert.match(content(await run('divisor-de-despesas',{total:10,pagantes:3})),/1 pessoa\(s\) pagam R\$\s3,34/);
 assert.match(content(await run('simulador-de-desconto-artesanal',{preco:100,custo:60,desconto:50})),/-R\$\s10,00/);
});
test('matemática produz 10 exercícios e 10 respostas corretas',async()=>{
 const r=await run('atividades-matematicas'),key=await r.arquivos[0].blob.text();const a=key.split('\n');assert.equal(a.length,10);
 for(const line of a){const m=line.match(/\d+\) (\d+) \+ (\d+) = (\d+)/);assert.ok(m);assert.equal(+m[1]+ +m[2],+m[3]);}
 assert.equal((r.svg.match(/______</g)||[]).length,10);assert.doesNotMatch(r.svg,/<script/);
});
test('tabuada gera 7 até 70 em arquivo separado',async()=>{const r=await run('tabuada-para-imprimir'),key=await r.arquivos[0].blob.text();assert.equal(key.split('\n').length,10);assert.match(key,/7 × 10 = 70/);assert.doesNotMatch(r.svg,/ = 70/);});
test('caça-palavras tem todas as palavras nas coordenadas do gabarito',async()=>{
 const r=await run('caca-palavras'),key=await r.arquivos[0].blob.text();const cells=[...r.svg.matchAll(/font-size="4.5">([A-Z])<\/text>/g)].map(m=>m[1]);assert.equal(cells.length,144);
 for(const line of key.split('\n')){const m=line.match(/(\w+): linha (\d+), coluna (\d+), (.+)/);assert.ok(m);let actual='';for(let i=0;i<m[1].length;i++)actual+=cells[(+m[2]-1)*12+(+m[3]-1)+(m[4].startsWith('direita')?-i:i)];assert.equal(actual,m[1]);}
 await assert.rejects(run('caca-palavras',{palavras:'PALAVRAMUITOCOMPRIDA',tamanho:5}));
});
test('SVG de caligrafia preserva acentos e escapa markup',async()=>{
 const r=await run('folhas-de-caligrafia',{texto:'João <script>alert(1)</script>'});assert.match(r.svg,/João &lt;script&gt;/);assert.doesNotMatch(r.svg,/<script>/);assert.match(r.svg,/width="210mm" height="297mm"/);
});
test('bingo cartelas são únicas e têm números distintos no intervalo',async()=>{
 const r=await run('bingo-de-numeros',{cartelas:10});const files=[r.arquivo,...r.arquivos].filter(f=>f.nome.endsWith('.svg'));assert.equal(files.length,10);const signatures=[];
 for(const f of files){const svg=await f.blob.text(),values=[...svg.matchAll(/font-size="7">(\d+)<\/text>/g)].map(m=>+m[1]);assert.equal(values.length,25);assert.equal(new Set(values).size,25);assert.ok(values.every(v=>v>=1&&v<=75));signatures.push(values.join(','));}assert.equal(new Set(signatures).size,10);
 const sort=await r.arquivos.find(f=>f.nome.endsWith('.txt')).blob.text();assert.equal(new Set(sort.split(', ')).size,75);
 await assert.rejects(run('bingo-de-numeros',{maximo:10,lado:5}));
});
test('papel quadriculado inclui medida física de calibração',async()=>{const r=await run('papel-quadriculado');assert.match(r.svg,/width="10" height="10"/);assert.match(r.svg,/M12 28V260/);assert.match(r.svg,/M17 28V260/);});
test('flashcards geram pares frente-verso e versos espelhados',async()=>{const r=await run('flashcards-imprimiveis');assert.equal(r.arquivos.length,1);const back=await r.arquivos[0].blob.text();assert.match(r.svg,/x="16" y="57"[^>]*>Brasil/);assert.match(back,/x="110" y="57"[^>]*>Brasília/);assert.doesNotMatch(r.svg,/Brasília/);});
test('estudos soma estudo e pausas, atravessando meia-noite',async()=>{const r=await run('planejador-de-estudos',{inicio:'23:30'});assert.match(content(r),/Estudo: 60 min/);assert.match(content(r),/Pausas: 5 min/);assert.match(content(r),/D\+1 00:35/);});
test('ditado não mostra respostas na folha do aluno',async()=>{const r=await run('gerador-de-ditado');assert.doesNotMatch(r.svg,/Coração/);assert.match(await r.arquivos[0].blob.text(),/Coração/);});
test('frações geram gabarito colorido e rejeitam denominador zero',async()=>{const r=await run('fracionario-visual');assert.doesNotMatch(r.svg,/#89b9c3/);assert.match(await r.arquivos[0].blob.text(),/#89b9c3/);await assert.rejects(run('fracionario-visual',{fracoes:'1/0'}));});
