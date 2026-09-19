import test from 'node:test';
import assert from 'node:assert/strict';
import { ferramentas as g1 } from '../scripts/ferramentas/grupo-1/index.js';
import { ferramentas as g2 } from '../scripts/ferramentas/grupo-2/index.js';
import { ferramentas as g3 } from '../scripts/ferramentas/grupo-3/index.js';
import { paginas } from '../scripts/ferramentas/grupo-2/pdf-base.js';
import { validarBackup } from '../scripts/armazenamento.js';
const ferramentas = [...g1,...g2,...g3];
const get = id => ferramentas.find(f=>f.id===id);
const run = (id,dados={}) => {const t=get(id);return t.executar({...Object.fromEntries((t.campos??[]).map(c=>[c.nome,c.valor])),...dados});};

test('auditoria: 150 ferramentas únicas e 15 categorias de 10',()=>{
 assert.deepEqual([g1.length,g2.length,g3.length],[50,50,50]);
 assert.equal(new Set(ferramentas.map(f=>f.id)).size,150);
 const categorias=Map.groupBy(ferramentas,f=>f.categoria);
 assert.equal(categorias.size,15); for(const a of categorias.values()) assert.equal(a.length,10);
});
test('auditoria: perdas inteiras exatas não perdem uma unidade por erro binário',async()=>{
 for(const perda of [7,28,56,57,58]) {const r=await run('rendimento-com-perdas',{unidades:'100',perda:String(perda),custo:'80'});assert.equal(r.resumo,`${100-perda} unidades aproveitáveis`);}
});
test('auditoria: raiz quadrática muito pequena não é apresentada como zero',async()=>{
 const r=await run('equacao-segundo-grau',{a:'1',b:'1000000000000',c:'1'});
 assert.doesNotMatch(r.resumo,/x₂ = -?0(?:;|$)/);
});
test('auditoria: idade no fim de fevereiro respeita último dia do mês',async()=>{
 const r=await run('idade-calendario',{nascimento:'2024-01-31',referencia:'2024-02-29'});
 assert.equal(r.resumo,'0 anos, 1 meses e 0 dias');
});
test('auditoria: semana ISO atravessa o ano civil',async()=>{
 assert.equal((await run('numero-da-semana',{data:'2021-01-01'})).resumo,'2020-W53');
 assert.equal((await run('numero-da-semana',{data:'2024-12-30'})).resumo,'2025-W01');
});
test('auditoria: feriado em folga não desconta em dobro',async()=>{
 const r=await run('dias-uteis-configuraveis',{inicio:'2026-09-12',fim:'2026-09-15',folgas:'0,6',feriados:'2026-09-13\n2026-09-14'});
 assert.equal(r.resumo,'1 dias úteis');
});
test('auditoria: datas civis impossíveis são recusadas',async()=>{
 await assert.rejects(run('idade-calendario',{nascimento:'2025-02-29'}));
 await assert.rejects(run('numero-da-semana',{data:'2026-04-31'}));
});
test('auditoria: corte orientado de folha com espaços não cobra margem externa',async()=>{
 assert.equal((await run('aproveitamento-de-folha',{folhaW:101,folhaH:101,pecaW:50,pecaH:50,espaco:1})).resumo,'4 peças por folha');
});
test('auditoria: seleção PDF preserva ordem e recusa repetição e página inexistente',()=>{
 assert.deepEqual(paginas('3,1-2',3),[2,0,1]);
 for(const s of ['0','4','3-2','1,1','1-3,2','1e2'])assert.throws(()=>paginas(s,3));
});
test('auditoria: exportação SVG escapa marcação fornecida pelo usuário',async()=>{
 const r=await run('folhas-de-caligrafia',{texto:'<script>alert(1)</script>'});
 const svg=await r.arquivo.blob.text();
 assert.match(svg,/&lt;script&gt;/);assert.doesNotMatch(svg,/<script>/);
 assert.match(svg,/width="210mm"/);
});
test('auditoria: gabarito do ditado não entra na folha do aluno',async()=>{
 const r=await run('gerador-de-ditado',{palavras:'Segredo azul\nCanção dourada'});
 assert.doesNotMatch(await r.arquivo.blob.text(),/Segredo azul|Canção dourada/);
 assert.match(await r.arquivos[0].blob.text(),/Segredo azul/);
});
test('auditoria: resultado TXT mantém os custos e preparo da ficha',async()=>{
 const r=await run('ficha-tecnica-de-receita',{nome:'Bolo maçã',ingredientes:'Farinha; 100; g; 2',etapas:'Misture com cuidado.'});
 const s=await r.arquivo.blob.text();assert.match(s,/Bolo maçã/);assert.match(s,/Farinha/);assert.match(s,/Misture com cuidado/);
});
test('auditoria: backup não aceita chaves de protótipo ou ferramenta inexistente',()=>{
 const payload={versao:1,registros:[{nome:'A',ferramenta:'porcentagem',dados:JSON.parse('{"__proto__":"x"}')} ]};
 assert.throws(()=>validarBackup(JSON.stringify(payload),ferramentas.map(f=>f.id)));
 assert.throws(()=>validarBackup(JSON.stringify({versao:1,registros:[{nome:'A',ferramenta:'desconhecida',dados:{}}]}),ferramentas.map(f=>f.id)));
});
test('auditoria: senha não oferece persistência local',()=>{assert.equal(get('gerador-de-senha').sensivel,true);assert.equal(get('gerador-de-senha').persistir,false);});
