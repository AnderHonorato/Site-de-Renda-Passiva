import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analisarRomaneio, calcularRomaneioNaTela } from '../scripts/ferramentas/romaneio.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
import { arquivoBaixado } from './auxiliares/pdf-baixado.mjs';
const base={numero:'ROM-001',remetente:'Loja Alfa',data:'2026-11-02',transporte:'',
 volumes:'V01; Camisetas; 2,5; Cliente A\nV02; Calçados; 3,0; Cliente B'};
test('romaneio soma pesos e organiza volumes',()=>{
 const r=calcularRomaneioNaTela(base);
 assert.equal(r.valor,'2 volume(s)');
 assert.equal(r.tabela.linhas.length,2);
 assert.equal(analisarRomaneio([{volume:'V1',conteudo:'A',pesoKg:1,destinatario:'B'}]).pesoTotal,1);
 assert.match(r.texto,/5,5 kg/);
});
test('romaneio exporta PDF A4 válido',async()=>{
 const {nome,tipo,bytes}=await arquivoBaixado(calcularRomaneioNaTela(base).arquivos[0].gerar);
 assert.equal(nome,'romaneio-rom-001.pdf');
 assert.equal(tipo,'application/pdf');
 assert.match(new TextDecoder('latin1').decode(bytes.slice(0,8)),/%PDF-1/);
});
test('romaneio rejeita volume repetido, peso errado e datas falsas',()=>{
 for(const [campo,valor] of [['data','2026-02-30'],
 ['volumes','V01; A; 1; B\nv01; C; 3; D'],['volumes','V01; A; -1; B'],
 ['volumes','V01; A; 0; B'],['volumes','V01; A; abc; B'],
 ['volumes','V01; A; 2']]) {
  assert.throws(()=>calcularRomaneioNaTela({...base,[campo]:valor}),
    e=>e instanceof ErroDeEntrada&&e.campo===campo,campo);
 }
});
test('arquivo PDF não é vendido como nota fiscal',()=>{
 assert.match(calcularRomaneioNaTela(base).observações.join(' '),/não nota fiscal/);
});
