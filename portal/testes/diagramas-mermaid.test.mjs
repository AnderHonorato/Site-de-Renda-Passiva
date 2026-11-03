import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validarDiagrama,ErroDeDiagrama,nomeSeguroDoDiagrama}
  from '../scripts/ferramentas/auxiliares/diagramas-regras.js';

const linhas=(...itens)=>itens.join(String.fromCharCode(10));

test('fluxograma, sequência, classes e cronograma são aceitos',()=>{
 const modelos=[
  linhas('flowchart LR',' A --> B'),
  linhas('sequenceDiagram',' Alice->>Bob: Olá'),
  linhas('classDiagram',' A <|-- B'),
  linhas('gantt',' title Teste'),
  linhas('mindmap',' root((Projeto))'),
 ];
 for(const codigo of modelos)assert.ok(validarDiagrama({codigo,tema:'neutro'}).tipo,codigo);
});
test('recusa HTML ativo, links, diretivas e esquemas perigosos',()=>{
 const inválidos=[
  linhas('flowchart LR',' click A href "https://site.example"'),
  linhas('%%{init: {"securityLevel":"loose"}}%%','flowchart LR',' A-->B'),
  linhas('flowchart TD',' A[<script>alert(1)</script>]'),
  linhas('flowchart TD',' A[javascript:alert(1)]'),
  linhas('flowchart TD',' A[@import url(https://site.example)]'),
 ];
 for(const codigo of inválidos)
  assert.throws(()=>validarDiagrama({codigo}),e=>e instanceof ErroDeDiagrama,codigo);
});
test('limita caracteres e quantidade real de linhas',()=>{
 assert.throws(()=>validarDiagrama({codigo:linhas('flowchart LR','A'.repeat(8100))}),/8.000/);
 assert.throws(()=>validarDiagrama({codigo:linhas('flowchart LR',
  ...Array(145).fill('A-->B'))}),/140/);
});
test('normaliza nomes de arquivo sem travessia',()=>{
 assert.equal(nomeSeguroDoDiagrama('../../Relatório Comercial.svg'),'relatorio-comercial-svg');
 assert.equal(nomeSeguroDoDiagrama('---'),'fluxograma');
});
test('permite temas predefinidos, bloqueia valores externos',()=>{
 assert.equal(validarDiagrama({codigo:linhas('flowchart LR','A-->B'),tema:'claro'}).tema,'claro');
 assert.equal(validarDiagrama({codigo:linhas('flowchart LR','A-->B'),tema:'escuro'}).tema,'escuro');
 assert.throws(()=>validarDiagrama({codigo:linhas('flowchart LR','A-->B'),tema:'injetado'}),
  e=>e instanceof ErroDeDiagrama&&e.campo==='tema');
});
