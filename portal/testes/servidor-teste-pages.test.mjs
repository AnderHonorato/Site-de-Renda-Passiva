import test from 'node:test';
import assert from 'node:assert/strict';
import { deveSerPublicado } from '../ferramentas/política-de-segurança.mjs';
import { destinoSeguro } from '../scripts/núcleo/servidor-teste.js';

test('link fixo de testes é publicado no Pages e código do navegador é permitido',()=>{
  assert.equal(deveSerPublicado('servidor-teste.html'),true);
  assert.equal(deveSerPublicado('scripts/núcleo/servidor-teste.js'),true);
  assert.equal(deveSerPublicado('estilos/servidor-teste.css'),true);
});
test('redirecionamento aceita apenas túnel público HTTPS e rotas predefinidas',()=>{
  const ok='https://announcement-over-consensus-carlos.trycloudflare.com';
  assert.equal(destinoSeguro(ok),ok+'/');
  assert.equal(destinoSeguro(ok,'cadastro'),ok+'/criar-conta.html');
  assert.equal(destinoSeguro(ok,'entrar'),ok+'/entrar.html');
  assert.equal(destinoSeguro(ok,'admin'),ok+'/admin/');
  const fixo='https://brave-fox-7c41e09b.tunnl.gg';
  assert.equal(destinoSeguro(fixo),fixo+'/');
  assert.equal(destinoSeguro(fixo,'entrar'),fixo+'/entrar.html');
  assert.equal(destinoSeguro(fixo,'orcamento'),fixo+'/f/compras-priorizadas-orcamento/');
  const ferramentas={
    ruptura:'risco-ruptura-produtos',frete:'simulador-frete-gratis',
    fornecedores:'impacto-reajuste-fornecedores',expedicao:'capacidade-expedicao-turnos',
    estornos:'margem-pedidos-estornos',
    descontos:'descontos-progressivos-lote',
    parado:'estoque-parado-capital',
    capital:'ciclo-financeiro-capital-giro',
    pagamentos:'auditoria-taxas-pagamentos',
    faixas:'politica-frete-faixas',
    seguranca:'estoque-seguranca-estatistico',
    cancelamentos:'custo-cancelamentos-pedidos',
    armazenagem:'ocupacao-armazenagem',
    orcamento:'compras-priorizadas-orcamento',
    assinaturas:'projecao-assinaturas-recorrentes'
  };
  for(const [acao,slug] of Object.entries(ferramentas)){
    assert.equal(destinoSeguro(ok,acao),ok+'/f/'+slug+'/');
  }
  assert.equal(destinoSeguro(ok,'../../api/admin'),ok+'/');
  for(const x of [
    'https://evil.example.com','http://abc.trycloudflare.com',
    'https://abc.trycloudflare.com.evil.example','https://abc.trycloudflare.com/segredo',
    'https://user:pass@abc.trycloudflare.com',
    'https://abc.trycloudflare.com:8443',
    'https://abc.trycloudflare.com/?a=1','javascript:alert(1)',
    'https://abc..trycloudflare.com',
    'https://abc_.trycloudflare.com',
    'https://tunnl.gg','https://attacker.tunnl.gg.evil.com',
    'http://abc.tunnl.gg','https://user@abc.tunnl.gg',
    'https://abc.tunnl.gg/roubar','https://abc.tunnl.gg:443',
    'https://abc_.tunnl.gg',''
  ])assert.equal(destinoSeguro(x),null,x);
});

test('Pages não redireciona automaticamente para um Cloudflare antigo', async()=>{
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(new URL('../scripts/núcleo/servidor-teste.js',import.meta.url),'utf8');
  assert.match(source,/hostname\.endsWith\('\.trycloudflare\.com'\)/);
  assert.match(source,/O túnel antigo foi desativado/);
});
