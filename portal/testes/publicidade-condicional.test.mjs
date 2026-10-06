import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAVE_CONSENTIMENTO, consentimentoVigente, consultarConfiguracaoAnuncios, estadoDoBloco, paginaPodeExibirAnuncios, textoRotuloPublicidade, validarRespostaAnuncios } from '../scripts/publicidade/anúncios-condicionais.js';

const respostaBoa = { ativo: true, editor: 'ca-pub-1234567890123456', blocos: { resultado: '123456', lista: '987654' }, teste: true, permitido: true };

test('aceita apenas configuração de editor e IDs de bloco com formato válido', () => {
  assert.deepEqual(validarRespostaAnuncios(respostaBoa), { editor: respostaBoa.editor, blocos: respostaBoa.blocos, teste: true });
  assert.equal(validarRespostaAnuncios({ ...respostaBoa, editor: 'ca-pub-123<script>' }), null);
  assert.equal(validarRespostaAnuncios({ ...respostaBoa, blocos: { resultado: 'x' } }), null);
  assert.equal(validarRespostaAnuncios({ ...respostaBoa, permitido: false }), null);
  assert.equal(validarRespostaAnuncios({ ...respostaBoa, ativo: false }), null);
});

test('limita o contrato de slots às posições conhecidas e ignora HTML/configuração inválidos', () => {
  const validada = validarRespostaAnuncios({ ...respostaBoa, blocos: { resultado: '123456', xss: '<img>', rodape: '123456789012345678901' } });
  assert.deepEqual(validada.blocos, { resultado: '123456' });
});

test('só um consentimento versionado e ainda válido libera a consulta de anúncios', () => {
  assert.equal(CHAVE_CONSENTIMENTO, 'consentimento-portal-v1');
  assert.equal(consentimentoVigente({ versao: '1', expiraEm: 2000, escolha: 'aceitar' }, 1000), true);
  assert.equal(consentimentoVigente({ versao: '1', expiraEm: 2000, escolha: 'essencial' }, 1000), true);
  assert.equal(consentimentoVigente({ versao: '1', expiraEm: 2000, escolha: 'recusar' }, 1000), false);
  assert.equal(consentimentoVigente({ versao: '0', expiraEm: 2000, escolha: 'aceitar' }, 1000), false);
  assert.equal(consentimentoVigente({ versao: '1', expiraEm: 900, escolha: 'aceitar' }, 1000), false);
});

test('não permite anúncio em conta, login, área legal, impressão ou páginas infantis', () => {
  assert.equal(paginaPodeExibirAnuncios({ pathname: '/ferramentas/calculadora' }), true);
  for (const pathname of ['/conta', '/entrar', '/termos', '/privacidade', '/admin', '/imprimir', '/escolar/atividade', '/criar-conta.html', '/redefinir-senha.html', '/termos.html', '/en/privacy.html']) {
    assert.equal(paginaPodeExibirAnuncios({ pathname }), false, pathname);
  }
  assert.equal(paginaPodeExibirAnuncios({ pathname: '/ferramenta', paginaMarcada: false }), false);
  assert.equal(paginaPodeExibirAnuncios({ pathname: '/ferramenta', infantil: true }), false);
});

test('só revela bloco filled e recolhe unfilled', () => {
  assert.equal(estadoDoBloco('filled'), 'preenchido');
  assert.equal(estadoDoBloco('unfilled'), 'vazio');
  assert.equal(estadoDoBloco('loading'), 'pendente');
});

test('rótulo da publicidade acompanha o idioma da página', () => {
  assert.equal(textoRotuloPublicidade('pt-BR'), 'Publicidade');
  assert.equal(textoRotuloPublicidade('en'), 'Advertisement');
});

test('fecha em segurança quando a API de anúncios falha ou devolve erro', async () => {
  assert.equal(await consultarConfiguracaoAnuncios(async () => { throw new Error('offline'); }, '/ferramenta'), null);
  assert.equal(await consultarConfiguracaoAnuncios(async () => ({ ok: false }), '/ferramenta'), null);
});
