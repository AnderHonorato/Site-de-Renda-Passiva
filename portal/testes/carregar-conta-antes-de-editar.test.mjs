import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('perfil não aparece editável antes do cadastro de eventos e da carga completa',async()=>{
 const source=await readFile(new URL('../scripts/páginas/conta/conta.js',import.meta.url),'utf8');
 const load=source.indexOf("const respostas = await Promise.all([");
 const listener=source.indexOf("form.addEventListener('input', marcarAlterado)");
 const show=source.indexOf("document.getElementById('conta-conteudo').hidden = false;");
 assert.ok(load>0&&listener>load&&show>listener);
 assert.match(source,/Carregando sua conta/);
 assert.match(source,/estado\(''\);/);
});
