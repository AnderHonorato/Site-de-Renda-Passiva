import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  DADOS_MAXIMO_BYTES,
  dadosDeTrabalhoValidos,
  limitesDoPlano,
  limiteDadosDoPlano,
  limiteArmazenamento,
  bytesUsados,
  planosPublicos,
  validarEdicaoTrabalho,
  validarNovoTrabalho,
} from '../servidor/trabalhos.mjs';

test('cotas de conta preservam Grátis/Plus e diferenciam o arquivo Premium', () => {
  assert.deepEqual(limitesDoPlano('gratuito'), { favoritos: 10, trabalhos: 3, lote_arquivos: 3 });
  assert.deepEqual(limitesDoPlano('plus'), { favoritos: 500, trabalhos: 500, lote_arquivos: 100 });
  assert.deepEqual(limitesDoPlano('premium'), { favoritos:500,trabalhos:2000,lote_arquivos:100 });
  const premium = planosPublicos().find((plano) => plano.id === 'premium');
  assert.equal(premium.provisorio, false);assert.equal(premium.dados_maximo_bytes,512*1024);
});

test('espaço por trabalho é verificado em bytes UTF-8 e acompanha o plano',()=>{
  for(const p of ['gratuito','plus','premium']){
    const max=limiteDadosDoPlano(p);assert.equal(dadosDeTrabalhoValidos({x:'a'.repeat(max-8)},p),true);assert.equal(dadosDeTrabalhoValidos({x:'a'.repeat(max-7)},p),false);
  }
  const dado={x:'á'.repeat(11000)};assert.equal(dadosDeTrabalhoValidos(dado,'gratuito'),false);assert.equal(dadosDeTrabalhoValidos(dado,'plus'),true);
  const grande={x:'a'.repeat(70000)};assert.equal(validarNovoTrabalho({ferramenta_slug:'porcentagem',titulo:'Grande',dados:grande},'plus'),false);assert.equal(validarNovoTrabalho({ferramenta_slug:'porcentagem',titulo:'Grande',dados:grande},'premium'),true);
  assert.equal(validarEdicaoTrabalho({dados:grande},'premium'),true);assert.equal(dadosDeTrabalhoValidos(grande,'desconhecido'),false);
});

test('armazenamento total soma bytes UTF-8 apenas do proprietário e usa a cota segura para plano desconhecido',()=>{
  assert.equal(limiteArmazenamento('gratuito'),60*1024);
  assert.equal(limiteArmazenamento('plus'),8*1024*1024);
  assert.equal(limiteArmazenamento('premium'),32*1024*1024);
  assert.equal(limiteArmazenamento('desconhecido'),60*1024);
  const db=new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE trabalhos(usuario_id TEXT,dados TEXT)');
    const inserir=db.prepare('INSERT INTO trabalhos VALUES(?,?)');
    const dados=JSON.stringify({texto:'á😊'});
    inserir.run('a',dados);inserir.run('a','{}');inserir.run('b','{}');
    assert.equal(bytesUsados(db,'a'),Buffer.byteLength(dados,'utf8')+2);
    assert.equal(bytesUsados(db,'b'),2);assert.equal(bytesUsados(db,'vazio'),0);
  } finally { db.close(); }
});

test('trabalho salvo aceita apenas payload pequeno, simples e válido', () => {
  const base = { ferramenta_slug: 'porcentagem', titulo: 'Meu cálculo', dados: { valor: '25' }, situacao: 'salvo' };
  assert.equal(validarNovoTrabalho(base), true);
  assert.equal(validarNovoTrabalho({ ...base, ferramenta_slug: '../segredo' }), false);
  assert.equal(validarNovoTrabalho({ ...base, titulo: ' '.repeat(2) }), false);
  assert.equal(validarNovoTrabalho({ ...base, dados: ['não', 'aceitar'] }), false);
  assert.equal(validarNovoTrabalho({ ...base, situacao: 'publico' }), false);
  assert.equal(validarEdicaoTrabalho({ titulo: 'Novo nome' }), true);
  assert.equal(validarEdicaoTrabalho({}), false);
});

test('limite de dados do trabalho é 20 kB de JSON', () => {
  const pequeno = { texto: 'a'.repeat(100) };
  const grande = { texto: 'a'.repeat(DADOS_MAXIMO_BYTES + 100) };
  assert.equal(dadosDeTrabalhoValidos(pequeno), true);
  assert.equal(dadosDeTrabalhoValidos(grande), false);
});
