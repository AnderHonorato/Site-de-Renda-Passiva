import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as esperar } from 'node:timers/promises';
import { PDFDocument } from '../../recursos/pdf-lib.esm.min.js';

test('Central PDF valida Premium, isola donos e entrega o ZIP do processamento real', {timeout: 60000}, async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'portal-api-pdf-'));
  process.env.PORTAL_BANCO = join(pasta, 'teste.sqlite');
  const { iniciar, fecharBanco } = await import('../../servidor/iniciar.mjs');
  const servidor = await iniciar({porta: 0});
  const host = 'http://127.0.0.1:' + servidor.address().port;
  const db = new DatabaseSync(process.env.PORTAL_BANCO);
  const base = '/api/central-pdf/trabalhos';
  function cliente() {
    const cookies = new Map();
    return async (url, method='GET', dados, cabecalhos={}) => {
      const binario = Buffer.isBuffer(dados);
      const r = await fetch(host+url, {method, headers: {
        Origin: 'http://127.0.0.1:4400', 'X-CSRF-Token': cookies.get('csrf') || '',
        Cookie: [...cookies].map(([k,v])=>k+'='+v).join('; '),
        'Content-Type': binario?'application/pdf':'application/json', ...cabecalhos
      }, body: dados===undefined?undefined:binario?dados:JSON.stringify(dados)});
      for (const c of r.headers.getSetCookie()) {
        const [k,v]=c.split(';')[0].split('='); cookies.set(k,v);
      }
      return r;
    };
  }
  const dono = cliente(), outro = cliente();
  async function cadastrar(chamar, nome) {
    await chamar('/api/autenticacao/sessao');
    const r = await chamar('/api/autenticacao/criar-conta','POST',{
      usuario: nome, nome, email: nome+'@example.test', idade:30, aceitaTermos:true, senha:'Senha-teste-forte-322!'
    });
    assert.equal(r.status,201);
  }
  const plano = (nome, valor) => db.prepare('UPDATE usuarios SET plano=? WHERE usuario=?').run(valor,nome);
  try {
    await dono('/api/autenticacao/sessao');
    assert.equal((await dono(base,'POST',{})).status,401);
    await cadastrar(dono,'pdf_primeiro'); await cadastrar(outro,'pdf_segundo');
    assert.equal((await dono(base,'POST',{})).status,403);
    plano('pdf_primeiro','premium'); plano('pdf_segundo','premium');
    const pdf = await PDFDocument.create(); pdf.addPage([150,150]).drawText('PDF de teste');
    const bytes = Buffer.from(await pdf.save());
    const lote = {arquivos:[{nome:'entrada.pdf',tamanho:bytes.length}],opcoes:{perfil:'equilibrado'}};
    assert.equal((await dono(base,'POST',lote,{'X-CSRF-Token':'incorreto'})).status,403);
    assert.equal((await dono(base,'POST',{...lote,arquivos:[{nome:'a.pdf',tamanho:11000000}]})).status,413);
    const criacao = await dono(base,'POST',lote);
    assert.equal(criacao.status,201);
    const {trabalho} = await criacao.json();
    const url = base+'/'+trabalho.id;
    assert.equal((await outro(url)).status,404);
    assert.equal((await outro(url+'/entradas/0','PUT',bytes)).status,404);
    assert.equal((await dono(url+'/iniciar','POST')).status,409);
    assert.equal((await dono(url+'/entradas/0','PUT',Buffer.alloc(bytes.length))).status,400);
    assert.equal((await dono(url+'/entradas/0','PUT',bytes)).status,200);
    assert.equal((await dono(url+'/iniciar','POST')).status,202);
    let resultado;
    for (let i=0;i<200;i++) {
      resultado=(await (await dono(url)).json()).trabalho;
      if (resultado.estado!=='processando') break;
      await esperar(150);
    }
    assert.equal(resultado.estado,'concluido',resultado.mensagem);
    const zip=resultado.arquivos.find(a=>a.nome.endsWith('.zip'));
    assert.ok(zip);
    assert.equal('caminho' in zip,false);
    const download=url+'/arquivos/'+zip.indice;
    assert.equal((await outro(download)).status,404);
    const r=await dono(download);
    assert.equal(r.status,200);
    assert.match(r.headers.get('cache-control'),/no-store/);
    assert.match(r.headers.get('content-disposition'),/attachment/);
    assert.equal(Buffer.from(await r.arrayBuffer()).readUInt32LE(),0x04034b50);
    plano('pdf_primeiro','gratuito');
    assert.equal((await dono(download)).status,403);
    plano('pdf_primeiro','premium');
    assert.equal((await dono(url,'DELETE')).status,200);
    assert.equal((await dono(download)).status,404);
  } finally {
    await new Promise(resolve=>servidor.close(resolve)); db.close(); fecharBanco();
    await rm(pasta,{recursive:true,force:true});
  }
});
