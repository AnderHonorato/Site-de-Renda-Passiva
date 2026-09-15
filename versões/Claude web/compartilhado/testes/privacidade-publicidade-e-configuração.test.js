import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarArmazenamento } from '../scripts/armazenamento/criar-armazenamento.js';
import { validarConfiguração } from '../scripts/configuração/validar-configuração.js';
import { lerConsentimento } from '../scripts/privacidade/ler-consentimento.js';
import { revogarConsentimento } from '../scripts/privacidade/revogar-consentimento.js';
import { salvarConsentimento } from '../scripts/privacidade/salvar-consentimento.js';
import { podeCarregarAnúncios } from '../scripts/publicidade/pode-carregar-anúncios.js';

function armazenamentoEmMemória() {
  const dados = new Map();
  return criarArmazenamento({
    prefixo: 'teste',
    armazenamento: {
      get length() {
        return dados.size;
      },
      key: (índice) => [...dados.keys()][índice] ?? null,
      getItem: (chave) => (dados.has(chave) ? dados.get(chave) : null),
      setItem: (chave, valor) => dados.set(chave, String(valor)),
      removeItem: (chave) => dados.delete(chave),
    },
  });
}

const configuraçãoCompleta = {
  site: { marca: 'Doce Ofício', marcaDestaque: 'Ofício', prefixoDeArmazenamento: 'doce-ofício' },
  criador: { nome: 'Anderson', portfólio: 'https://exemplo.com.br', contato: 'mailto:contato@exemplo.com.br' },
  publicação: { endereçoBase: 'https://exemplo.com.br/confeitaria' },
  privacidade: { versãoDaPolítica: '2026-09-14', validadeDoConsentimentoEmDias: 180 },
  publicidade: { ativa: true, identificadorDoPublicador: 'ca-pub-1234567890123456', blocos: { 'após-resultado': '1234567890' }, consentimentoConfigurado: true },
  apoio: { ativo: true, chavePix: '123e4567-e12b-12d1-a456-426655440000', nomeDoRecebedor: 'Fulano de Tal', cidadeDoRecebedor: 'Brasília' },
};

test('sem escolha não há consentimento; escolha vale com versão e prazo', () => {
  const armazenamento = armazenamentoEmMemória();
  assert.equal(lerConsentimento({ armazenamento, versão: 'v1' }), null);
  const agora = Date.UTC(2026, 8, 14);
  salvarConsentimento({ publicidade: true }, { armazenamento, versão: 'v1', validadeEmDias: 180, agora });
  assert.equal(lerConsentimento({ armazenamento, versão: 'v1', agora: agora + 1000 }).publicidade, true);
  assert.equal(lerConsentimento({ armazenamento, versão: 'v2', agora: agora + 1000 }), null, 'mudança de política pede nova escolha');
  assert.equal(lerConsentimento({ armazenamento, versão: 'v1', agora: agora + 181 * 86_400_000 }), null, 'escolha expirada');
  revogarConsentimento({ armazenamento, versão: 'v1', agora: agora + 2000 });
  assert.equal(lerConsentimento({ armazenamento, versão: 'v1', agora: agora + 3000 }).publicidade, false);
});

test('consentimento adulterado no armazenamento é ignorado', () => {
  const armazenamento = armazenamentoEmMemória();
  armazenamento.gravar('consentimento', { publicidade: 'sim', medição: false, versão: 'v1', expiraEm: Date.now() + 1e6 });
  assert.equal(lerConsentimento({ armazenamento, versão: 'v1' }), null);
});

test('anúncios só carregam com configuração completa, página permitida e consentimento', () => {
  const { configuração } = validarConfiguração(configuraçãoCompleta);
  const aceito = { publicidade: true };
  assert.equal(podeCarregarAnúncios({ configuração, consentimento: aceito }).pode, true);
  assert.equal(podeCarregarAnúncios({ configuração, consentimento: null }).pode, false);
  assert.equal(podeCarregarAnúncios({ configuração, consentimento: { publicidade: false } }).pode, false);
  assert.equal(podeCarregarAnúncios({ configuração, consentimento: aceito, página: { permiteAnúncios: false } }).pode, false);
  assert.equal(podeCarregarAnúncios({ configuração, consentimento: aceito, página: { impressão: true } }).pode, false);
  const semBloco = validarConfiguração({ ...configuraçãoCompleta, publicidade: { ...configuraçãoCompleta.publicidade, blocos: {} } });
  assert.equal(podeCarregarAnúncios({ configuração: semBloco.configuração, consentimento: aceito }).pode, false);
  const idFalso = validarConfiguração({ ...configuraçãoCompleta, publicidade: { ...configuraçãoCompleta.publicidade, identificadorDoPublicador: 'ca-pub-123' } });
  assert.equal(idFalso.publicidadeDisponível, false);
  assert.ok(idFalso.problemas.some((problema) => problema.campo === 'publicidade'));
});

test('configuração vazia mantém Pix e anúncios indisponíveis e lista pendências', () => {
  const resultado = validarConfiguração({});
  assert.equal(resultado.apoioDisponível, false);
  assert.equal(resultado.publicidadeDisponível, false);
  const campos = resultado.problemas.map((problema) => problema.campo);
  for (const campo of ['site.marca', 'criador.portfólio', 'criador.contato', 'publicação.endereçoBase', 'apoio']) assert.ok(campos.includes(campo), campo);
  assert.deepEqual(resultado.configuração.apoio.valoresSugeridosEmCentavos, [100, 500, 1000, 2000, 3000, 5000, 10000]);
});

test('configuração completa ativa Pix com dados normalizados', () => {
  const resultado = validarConfiguração(configuraçãoCompleta);
  assert.equal(resultado.apoioDisponível, true);
  assert.equal(resultado.configuração.apoio.cidadeDoRecebedor, 'Brasilia');
  assert.equal(resultado.configuração.publicação.endereçoBaseVálido, 'https://exemplo.com.br/confeitaria/');
  assert.equal(resultado.configuração.criador.portfólioVálido, 'https://exemplo.com.br/');
});

test('dados perigosos na configuração são recusados', () => {
  const resultado = validarConfiguração({
    ...configuraçãoCompleta,
    criador: { nome: 'Anderson', portfólio: 'javascript:alert(1)', contato: 'http://inseguro.com' },
    apoio: { ...configuraçãoCompleta.apoio, chavePix: '111.111.111-11' },
    publicidade: { ...configuraçãoCompleta.publicidade, blocos: { 'após-resultado': '<script>' } },
  });
  assert.equal(resultado.configuração.criador.portfólioVálido, null);
  assert.equal(resultado.configuração.criador.contatoVálido, null);
  assert.equal(resultado.apoioDisponível, false);
  assert.equal(resultado.publicidadeDisponível, false);
});
