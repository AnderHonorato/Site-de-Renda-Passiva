import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escaparCoringasLike,
  grupoEChaveValidos,
  linkUrlValido,
  paginaValida,
  validarAjusteFerramenta,
  validarAtualizacaoUsuario,
  validarAviso,
} from '../../servidor/rotas/admin/admin-validacao.js';

test('escaparCoringasLike escapa %, _ e \\ para uso seguro em LIKE', () => {
  assert.equal(escaparCoringasLike('100%'), '100\\%');
  assert.equal(escaparCoringasLike('a_b'), 'a\\_b');
  assert.equal(escaparCoringasLike('a\\b'), 'a\\\\b');
});

test('paginaValida aceita inteiro ≥ 1 e cai para 1 em qualquer outra entrada', () => {
  assert.equal(paginaValida('3'), 3);
  assert.equal(paginaValida(undefined), 1);
  assert.equal(paginaValida('0'), 1);
  assert.equal(paginaValida('-2'), 1);
  assert.equal(paginaValida('abc'), 1);
});

test('linkUrlValido aceita https:// e caminho relativo; recusa javascript: e // disfarçado', () => {
  assert.equal(linkUrlValido('https://exemplo.com/x'), true);
  assert.equal(linkUrlValido('/planos'), true);
  assert.equal(linkUrlValido(null), true);
  assert.equal(linkUrlValido('javascript:alert(1)'), false);
  assert.equal(linkUrlValido('//evil.example.com'), false);
  assert.equal(linkUrlValido('http://sem-https.com'), false);
});

test('validarAjusteFerramenta aceita ativa/plano/destaque e recusa tipos errados', () => {
  const boa = validarAjusteFerramenta({ ativa: false, plano: 'plus', destaque: true });
  assert.deepEqual(boa.campos, {});
  assert.deepEqual(boa.mudancas, { ativa: 0, plano: 'plus', destaque: 1 });

  const ruim = validarAjusteFerramenta({ ativa: 'sim', plano: 'ouro' });
  assert.equal(ruim.campos.ativa, 'formato_invalido');
  assert.equal(ruim.campos.plano, 'formato_invalido');
});

test('validarAtualizacaoUsuario recusa valores fora do domínio', () => {
  const boa = validarAtualizacaoUsuario({ plano: 'plus', papel: 'admin', situacao: 'ativo' });
  assert.deepEqual(boa.campos, {});

  const ruim = validarAtualizacaoUsuario({ situacao: 'banido' });
  assert.equal(ruim.campos.situacao, 'formato_invalido');
});

test('validarAviso exige os campos de texto na criação e aceita parcial no PATCH', () => {
  const semCorpo = validarAviso({ tipo: 'sistema', publico: 'todos' });
  assert.equal(semCorpo.campos.titulo_pt_br, 'campo_obrigatorio');
  assert.equal(semCorpo.campos.corpo_pt_br, 'campo_obrigatorio');

  const parcial = validarAviso({ ativo: false }, { parcial: true });
  assert.deepEqual(parcial.campos, {});
  assert.deepEqual(parcial.mudancas, { ativo: 0 });
});

test('validarAviso recusa link javascript: e aceita link relativo ou https', () => {
  const comLinkRuim = validarAviso(
    { tipo: 'popup', publico: 'todos', link_url: 'javascript:alert(1)' },
    { parcial: true },
  );
  assert.equal(comLinkRuim.campos.link_url, 'formato_invalido');

  const comLinkBom = validarAviso({ link_url: '/planos' }, { parcial: true });
  assert.deepEqual(comLinkBom.campos, {});
  assert.equal(comLinkBom.mudancas.link_url, '/planos');
});

test('grupoEChaveValidos exige as duas strings não vazias', () => {
  assert.equal(grupoEChaveValidos({ grupo: 'admin', chave: '1' }), true);
  assert.equal(grupoEChaveValidos({ grupo: '', chave: '1' }), false);
  assert.equal(grupoEChaveValidos({ grupo: 'admin', chave: '' }), false);
});
