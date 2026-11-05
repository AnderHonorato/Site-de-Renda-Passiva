import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('healthcheck anônimo verifica o SQLite sem vazar metadados', async () => {
  const dir=mkdtempSync(join(tmpdir(),'portal-saude-'));
  const prevDB=process.env.PORTAL_BANCO,prevURL=process.env.URL_PUBLICA;
  process.env.PORTAL_BANCO=join(dir,'saude.sqlite');
  process.env.URL_PUBLICA='http://127.0.0.1:4400';
  let server,app;
  try{
    app=await import('../servidor/iniciar.mjs');
    server=await app.iniciar({porta:0,host:'127.0.0.1'});
    const res=await fetch('http://127.0.0.1:'+server.address().port+'/api/saude');
    assert.equal(res.status,200);
    assert.equal(res.headers.get('cache-control'),'no-store');
    assert.equal(res.headers.has('set-cookie'),false);
    assert.deepEqual(await res.json(),{estado:'ok'});
  }finally{
    if(server)await new Promise(resolve=>server.close(resolve));
    if(app)app.fecharBanco();
    if(prevDB===undefined)delete process.env.PORTAL_BANCO;else process.env.PORTAL_BANCO=prevDB;
    if(prevURL===undefined)delete process.env.URL_PUBLICA;else process.env.URL_PUBLICA=prevURL;
    rmSync(dir,{recursive:true,force:true});
  }
});
