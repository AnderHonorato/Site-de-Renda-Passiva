// seguranca-limite-trafego.test.js — limitador de tráfego progressivo, com relógio falso
// e banco :memory: (esquema real da migração 001).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { criarLimitador, chaveIp, resumirChave } from '../../servidor/seguranca/seguranca-limite-trafego.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CAMINHO_MIGRACAO = join(__dirname, '..', '..', 'banco', 'migracoes', 'banco-migracao-001-inicial.sql');

function criarBancoDeTeste() {
  const banco = new Database(':memory:');
  banco.pragma('foreign_keys = ON');
  banco.exec(readFileSync(CAMINHO_MIGRACAO, 'utf8'));
  return banco;
}

function criarRelogioFalso(inicioMs = 1_700_000_000_000) {
  let agoraMs = inicioMs;
  return {
    agora: () => agoraMs,
    avancar(ms) {
      agoraMs += ms;
    },
  };
}

const REGRAS_TESTE = {
  api: { limite: 3, janelaSegundos: 60 },
  entrar_falhas: { limiteFalhas: 5, janelaSegundos: 900 },
};

describe('seguranca-limite-trafego', () => {
  test('middleware conta requisições e bloqueia ao estourar o limite', () => {
    const banco = criarBancoDeTeste();
    const relogio = criarRelogioFalso();
    const limitador = criarLimitador({ banco, regras: REGRAS_TESTE, agora: relogio.agora });
    const mw = limitador.middleware('api', { chave: () => '203.0.113.9' });

    let ultimoErro;
    const next = (erro) => {
      ultimoErro = erro;
    };
    const res = { headers: {}, set(nome, valor) { this.headers[nome] = valor; } };
    const req = {};

    mw(req, res, next); // 1
    mw(req, res, next); // 2
    mw(req, res, next); // 3 (limite = 3, ainda passa)
    assert.equal(ultimoErro, undefined);

    mw(req, res, next); // 4 — estourou
    assert.ok(ultimoErro);
    assert.equal(ultimoErro.status, 429);
    assert.equal(ultimoErro.codigo, 'muitas_tentativas');
    assert.equal(ultimoErro.extras.tentar_de_novo_em_segundos, 60); // 1ª infração = 1 min
    assert.equal(res.headers['Retry-After'], '60');

    limitador._pararLimpezaParaTestes();
  });

  test('progressão de bloqueio 1 → 5 → 15 → 60 → 360 → 1440 min com relógio falso', () => {
    const banco = criarBancoDeTeste();
    const relogio = criarRelogioFalso();
    const limitador = criarLimitador({ banco, regras: REGRAS_TESTE, agora: relogio.agora });
    const chave = 'entrar_falhas-chave';

    const duracoesEsperadasMin = [1, 5, 15, 60, 360, 1440]; // 6ª reincidência = 1440 (teto)

    for (const minutosEsperados of duracoesEsperadasMin) {
      // Estoura o limite de falhas (5) para gerar uma infração.
      for (let i = 0; i < 6; i++) {
        limitador.registrarFalha('entrar_falhas', chave);
      }
      const status = limitador.verificar('entrar_falhas', chave);
      assert.equal(status.bloqueado, true);
      assert.equal(status.segundosRestantes, minutosEsperados * 60);
      // Avança o relógio para além do bloqueio e limpa as falhas para a próxima rodada.
      relogio.avancar(minutosEsperados * 60 * 1000 + 1000);
      limitador.limparFalhas('entrar_falhas', chave);
    }

    limitador._pararLimpezaParaTestes();
  });

  test('reincidência zera depois de 24h sem infração', () => {
    const banco = criarBancoDeTeste();
    const relogio = criarRelogioFalso();
    const limitador = criarLimitador({ banco, regras: REGRAS_TESTE, agora: relogio.agora });
    const chave = 'chave-reincidencia';

    function provocarInfracao() {
      for (let i = 0; i < 6; i++) limitador.registrarFalha('entrar_falhas', chave);
    }

    provocarInfracao();
    let status = limitador.verificar('entrar_falhas', chave);
    assert.equal(status.segundosRestantes, 60); // 1ª infração = 1 min

    // Passa bem mais de 24h sem nova infração.
    relogio.avancar(25 * 60 * 60 * 1000);
    limitador.limparFalhas('entrar_falhas', chave);

    provocarInfracao();
    status = limitador.verificar('entrar_falhas', chave);
    assert.equal(status.segundosRestantes, 60); // reincidência zerou, volta para 1 min

    limitador._pararLimpezaParaTestes();
  });

  test('bloqueio sobrevive a uma nova instância do limitador com o mesmo banco', () => {
    const banco = criarBancoDeTeste();
    const relogio = criarRelogioFalso();
    const chave = 'chave-persistente';

    const limitador1 = criarLimitador({ banco, regras: REGRAS_TESTE, agora: relogio.agora });
    for (let i = 0; i < 6; i++) limitador1.registrarFalha('entrar_falhas', chave);
    assert.equal(limitador1.verificar('entrar_falhas', chave).bloqueado, true);
    limitador1._pararLimpezaParaTestes();

    // Nova instância — memória zerada, mas o banco é o mesmo (simula reinício do processo).
    const limitador2 = criarLimitador({ banco, regras: REGRAS_TESTE, agora: relogio.agora });
    const status = limitador2.verificar('entrar_falhas', chave);
    assert.equal(status.bloqueado, true);
    assert.ok(status.segundosRestantes > 0);

    limitador2._pararLimpezaParaTestes();
  });

  test('desbloquear libera a chave imediatamente', () => {
    const banco = criarBancoDeTeste();
    const relogio = criarRelogioFalso();
    const limitador = criarLimitador({ banco, regras: REGRAS_TESTE, agora: relogio.agora });
    const chave = 'chave-para-desbloquear';

    for (let i = 0; i < 6; i++) limitador.registrarFalha('entrar_falhas', chave);
    assert.equal(limitador.verificar('entrar_falhas', chave).bloqueado, true);

    limitador.desbloquear('entrar_falhas', chave);
    assert.equal(limitador.verificar('entrar_falhas', chave).bloqueado, false);

    limitador._pararLimpezaParaTestes();
  });

  test('listarBloqueios só traz bloqueios ativos', () => {
    const banco = criarBancoDeTeste();
    const relogio = criarRelogioFalso();
    const limitador = criarLimitador({ banco, regras: REGRAS_TESTE, agora: relogio.agora });

    for (let i = 0; i < 6; i++) limitador.registrarFalha('entrar_falhas', 'chave-ativa');
    assert.deepEqual(
      limitador.listarBloqueios().map((b) => b.chave),
      ['chave-ativa'],
    );

    relogio.avancar(2 * 60 * 1000); // passa do 1 min de bloqueio
    assert.deepEqual(limitador.listarBloqueios(), []);

    limitador._pararLimpezaParaTestes();
  });

  test('6ª falha de login em 15 min → bloqueado (a rota traduz isso em 429 com Retry-After)', () => {
    const banco = criarBancoDeTeste();
    const relogio = criarRelogioFalso();
    const limitador = criarLimitador({ banco, regras: REGRAS_TESTE, agora: relogio.agora });
    const chave = '203.0.113.5|usuario@exemplo.com';

    for (let i = 1; i <= 5; i++) {
      const resultado = limitador.registrarFalha('entrar_falhas', chave);
      assert.equal(resultado.bloqueado, false, `falha ${i} não deveria bloquear ainda`);
    }
    const sexta = limitador.registrarFalha('entrar_falhas', chave);
    assert.equal(sexta.bloqueado, true);
    assert.equal(sexta.segundosRestantes, 60);

    limitador._pararLimpezaParaTestes();
  });

  test('login certo (limparFalhas) zera o contador, sem novas falhas', () => {
    const banco = criarBancoDeTeste();
    const relogio = criarRelogioFalso();
    const limitador = criarLimitador({ banco, regras: REGRAS_TESTE, agora: relogio.agora });
    const chave = 'chave-login-certo';

    for (let i = 0; i < 4; i++) limitador.registrarFalha('entrar_falhas', chave);
    limitador.limparFalhas('entrar_falhas', chave);
    for (let i = 0; i < 4; i++) {
      const resultado = limitador.registrarFalha('entrar_falhas', chave);
      assert.equal(resultado.bloqueado, false);
    }

    limitador._pararLimpezaParaTestes();
  });

  test('chaveIp normaliza IPv4 mapeado em IPv6', () => {
    assert.equal(chaveIp({ ip: '::ffff:203.0.113.9' }), '203.0.113.9');
    assert.equal(chaveIp({ ip: '203.0.113.9' }), '203.0.113.9');
    assert.equal(chaveIp({}), '');
  });

  test('resumirChave mascara e-mail e último octeto de IPv4', () => {
    const resumo = resumirChave('203.0.113.9|Usuario@Exemplo.com');
    assert.doesNotMatch(resumo, /Usuario@Exemplo\.com/i);
    assert.match(resumo, /203\.0\.113\.xxx/);
    assert.match(resumo, /email:[0-9a-f]{8}/);
  });
});
