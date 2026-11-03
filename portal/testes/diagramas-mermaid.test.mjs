import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validarDiagrama,ErroDeDiagrama,nomeSeguroDoDiagrama} from '../scripts/ferramentas/auxiliares/diagramas-regras.js';
test('fluxograma, sequência, classes e cronograma válidos',()=>{
 for(const codigo of [
  'flowchart LR\\n A --> B','sequenceDiagram\\n Alice->>Bob: Olá',
  'classDiagram\\n A <|-- B','gantt\\n title Teste',
  'mindmap\\n root((Projeto))',
 ]){
  const r=validarDiagrama({codigo:codigo.replaceAll('\\\\n','\n'),tema:'neutro'});
  assert.ok(r.tipo);
 }
});
test('recusa HTML ativo, links executáveis, diretivas Mermaid e esquemas perigosos',()=>{
 for(const codigo of [
  'flowchart LR\\n click A href "https://site.example"',
  '%%{init: {"securityLevel":"loose"}}%%\\nflowchart LR\\n A-->B',
  'flowchart TD\\n A[<script>alert(1)</script>]',
  'flowchart TD\\n A[javascript:alert(1)]',
  'flowchart TD\\n A[@import url(https://site.example)]',
 ])assert.throws(()=>validarDiagrama({codigo:codigo.replaceAll('\\\\n','\n')}),
   e=>e instanceof ErroDeDiagrama);
});
test('limita tamanho e quantidade de linhas',()=>{
 assert.throws(()=>validarDiagrama({codigo:'flowchart LR\\n'+'A'.repeat(8100)}),/8.000/);
 assert.throws(()=>validarDiagrama({codigo:'flowchart LR\\n'+'A-->B\\n'.repeat(145)}),/140/);
});
test('normaliza nomes de arquivo sem travessia de pastas',()=>{
 assert.equal(nomeSeguroDoDiagrama('../../Relatório Comercial.svg'),'relatorio-comercial-svg');
 assert.equal(nomeSeguroDoDiagrama('---'),'fluxograma');
});
test('respeita tema de exportação sem executá-lo como configuração externa',()=>{
 assert.equal(validarDiagrama({codigo:'flowchart LR\\n A-->B',tema:'claro'}).tema,'claro');
 assert.throws(()=>validarDiagrama({codigo:'flowchart LR\\n A-->B',tema:'injetado'}),
  e=>e instanceof ErroDeDiagrama&&e.campo==='tema');
});
