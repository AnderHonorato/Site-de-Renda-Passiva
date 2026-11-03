/** Mermaid 11.17.2 local e fixado; compila para navegador sem CDN. */
import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const raiz=join(dirname(fileURLToPath(import.meta.url)),'..');
const destino=join(raiz,'scripts','terceiros','diagramas.js');
await mkdir(dirname(destino),{recursive:true});
const r=await build({
 entryPoints:[join(raiz,'ferramentas','entradas','diagramas.mjs')],
 outfile:destino,bundle:true,platform:'browser',format:'esm',
 target:'es2022',minify:true,sourcemap:false,legalComments:'inline',
 metafile:true,logLevel:'warning',
});
const saida=Object.values(r.metafile.outputs).find(x=>x.entryPoint?.endsWith('diagramas.mjs'));
if(!saida||saida.imports.length||saida.bytes<100000)
 throw new Error('O motor Mermaid não gerou um pacote JavaScript autossuficiente.');
const extras=Object.entries(r.metafile.outputs).filter(([nome])=>!nome.endsWith('diagramas.js'));
if(extras.length)throw new Error('O motor Mermaid gerou arquivos adicionais não previstos: '+extras.map(([nome])=>nome).join(', '));
console.log('Motor Mermaid local montado ('+saida.bytes+' bytes).');
