import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as esperar } from 'node:timers/promises';
import { especificacoes } from '../../dados/profissionais.js';

test('API profissional: sessão, Plus/Premium, CSRF, execução real e revogação durante upload', async () => {
  const pasta = mkdtempSync(join(tmpdir(), 'portal-profissionais-'));
  process.env.PORTAL_BANCO = join(pasta, 'teste.sqlite');
  const { iniciar, fecharBanco } = await import('../../servidor/iniciar.mjs');
  const servidor = await iniciar({porta:0});
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const banco = new DatabaseSync(process.env.PORTAL_BANCO);
  const plus = especificacoes.find(s => s.plano === 'plus' && s.dominio === 'dados');
  const premium = especificacoes.find(s => s.id === 'F277');
  const rota = s => '/api/profissionais/' + s.slug;
  const dados = s => ({[s.entrada === 'documento' ? 'texto' : 'csv']:s.id === 'F277' ? 'x;y\n1;2\n2;4\n3;5\n4;4\n5;5' : s.exemplo});
  let cookie = '', csrf = '';
  async function pedir(path, body, headers = {}) {
    const r = await fetch(base + path, {method:body ? 'POST' : 'GET', headers:{Cookie:cookie,
      ...(body ? {Origin:'http://127.0.0.1:4400','X-CSRF-Token':csrf,'Content-Type':'application/json'} : {}), ...headers},
      body:body ? JSON.stringify(body) : undefined});
    const mapa = new Map(cookie.split('; ').filter(Boolean).map(x=>x.split('=')));
    for (const item of r.headers.getSetCookie()) { const [k,v]=item.split(';')[0].split('='); mapa.set(k,v); }
    cookie = [...mapa].map(([k,v])=>`${k}=${v}`).join('; '); csrf = mapa.get('csrf') || csrf;
    return r;
  }
  try {
    await pedir('/api/autenticacao/sessao');
    assert.equal((await pedir(rota(plus),dados(plus))).status,401);
    assert.equal((await pedir('/api/autenticacao/criar-conta',{nome:'Teste Profissional',email:'profissionais@example.com',usuario:'profissionais',senha:'senha-forte-teste-123',idade:25,aceitaTermos:true})).status,201);
    assert.equal((await pedir(rota(plus),dados(plus))).status,403);
    banco.prepare("UPDATE usuarios SET plano='plus' WHERE usuario='profissionais'").run();
    assert.equal((await pedir(rota(premium),dados(premium))).status,403);
    assert.equal((await pedir(rota(plus),dados(plus),{'X-CSRF-Token':'invalido'})).status,403);
    assert.equal((await pedir(rota(plus),dados(plus),{Origin:'https://outro.example'})).status,403);
    const rp = await pedir(rota(plus),dados(plus));
    assert.equal(rp.status,200); assert.equal((await rp.json()).relatorio.titulo,plus.nome);
    banco.prepare("UPDATE usuarios SET plano='premium' WHERE usuario='profissionais'").run();
    const r = await pedir(rota(premium),dados(premium));
    assert.equal(r.status,200);
    const relatorio = (await r.json()).relatorio;
    assert.ok(Math.abs(relatorio.indicadores.find(x=>x[0]==='Inclinação')[1] - .6) < 1e-6);
    assert.ok(relatorio.notas.includes(premium.limites));
    assert.equal((await pedir('/api/profissionais/constructor',{})).status,404);
    assert.equal((await pedir('/api/profissionais/inexistente',{})).status,404);
    assert.equal((await pedir(rota(premium),{csv:'x;y\nNaN;2'})).status,400);
    assert.equal((await pedir(rota(premium),{...dados(premium),opcoes:{admin:true}})).status,400);
    assert.equal((await pedir(rota(premium),{csv:'x;y\n'+'a'.repeat(1000000)})).status,400);
    // O servidor pode ter lido o cookie antes do upload; revalida o plano após receber o corpo.
    const status = await new Promise((resolve,reject) => {
      const req = request(base + rota(premium),{method:'POST',headers:{Cookie:cookie,Origin:'http://127.0.0.1:4400','X-CSRF-Token':csrf,'Content-Type':'application/json','Content-Length':'2'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});
      req.on('error',reject); req.write('{');
      (async()=>{await esperar(60);banco.prepare("UPDATE usuarios SET plano='gratuito' WHERE usuario='profissionais'").run();req.end('}');})().catch(reject);
    });
    assert.equal(status,403);
    assert.equal(banco.prepare('SELECT count(*) n FROM trabalhos').get().n,0,'dados comerciais não são salvos como trabalho');
  } finally {
    banco.close(); await new Promise(resolve=>servidor.close(resolve)); fecharBanco(); rmSync(pasta,{recursive:true,force:true});
  }
});
