/**
 * Texto para fala (F193).
 *
 * O navegador real (voz, som) é conferido à mão e pelo teste de navegador; aqui o sintetizador é de mentira,
 * o que permite conferir a fila de trechos, pausa, parágrafo anterior e seguinte, erro e prazo sem som algum.
 *
 * Contas conferidas à mão: o exemplo de "Como usar" tem 14 + 5 = 19 palavras; 19 ÷ 150 palavras por minuto
 * × 60 = 7,6 s, que arredonda para 8 s; a 2× é 3,8 s, que arredonda para 4 s.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  dividirEmParágrafos, dividirParágrafo, prepararLeitura, conferirTexto, contarPalavras, estimarSegundos, lerEscala,
  listarVozes, rotularVoz, explicarFaltaDeVozes, acharVoz, criarLeitor,
  LIMITE_DE_CARACTERES, TAMANHO_DO_TRECHO, PRAZO_PARA_COMEÇAR_MS, VELOCIDADES, TONS,
} from '../scripts/cálculos/texto-para-fala.js';
import { iniciarLeitura, TEXTO_DE_EXEMPLO } from '../scripts/ferramentas/texto-para-fala.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';

/* ------------------------------------------------------------------ sintetizador de mentira */

function criarSintetizadorFalso({ cancelaDisparaEnd = false } = {}) {
  const s = {
    falas: [], cancelamentos: 0, pausas: 0, retomadas: 0, speaking: false, pending: false, paused: false,
    speak(fala) { s.falas.push(fala); s.speaking = true; },
    cancel() {
      s.cancelamentos += 1;
      const velha = s.falas[s.falas.length - 1];
      s.speaking = false;
      s.paused = false;
      // Alguns navegadores avisam o fim da fala cancelada na hora; o leitor não pode tratar isso como "avançar".
      if (cancelaDisparaEnd && velha && !velha.encerrada) { velha.encerrada = true; velha.onend?.(); }
    },
    pause() { s.pausas += 1; s.paused = true; },
    resume() { s.retomadas += 1; s.paused = false; },
    /** Termina a última fala em andamento, como a voz faria. */
    terminar() {
      const fala = s.falas[s.falas.length - 1];
      fala.encerrada = true;
      s.speaking = false;
      fala.onend?.();
    },
    falou(índice) { return s.falas[índice]?.text; },
  };
  return s;
}
const criarFala = (texto) => ({ text: texto, voice: null, rate: 1, pitch: 1, lang: '', onstart: null, onend: null, onerror: null });
const voz = (nome, lang = 'pt-BR', localService = true) => ({ voiceURI: nome, name: nome, lang, localService });

const trechosDe = (...parágrafos) => parágrafos.flatMap((p, i) => (Array.isArray(p) ? p : [p]).map((texto) => ({ parágrafo: i, texto })));

/* ------------------------------------------------------------------ preparo do texto */

test('parágrafos: uma linha com texto é um parágrafo; linha vazia, só pontuação e caracteres invisíveis são descartados', () => {
  assert.deepEqual(dividirEmParágrafos('Olá, mundo.\r\n\r\n   \nSegunda   linha aqui.\n---\n...'), ['Olá, mundo.', 'Segunda linha aqui.']);
  assert.deepEqual(dividirEmParágrafos('a\u200Bb\u202Ec\u0007d'), ['abcd']);
  assert.deepEqual(dividirEmParágrafos(''), []);
  assert.deepEqual(dividirEmParágrafos(null), []);
  assert.deepEqual(dividirEmParágrafos('1234'), ['1234']);
});

test('trechos: parágrafo curto fica inteiro; o comprido quebra em fim de frase, depois em vírgula, depois em palavra', () => {
  assert.deepEqual(dividirParágrafo('Frase curta.'), ['Frase curta.']);
  const frase = (n) => `${'palavra '.repeat(n).trim()}.`;
  const dois = dividirParágrafo(`${frase(15)} ${frase(15)}`); // cada frase tem 15 × 8 − 1 + 1 = 120 caracteres
  assert.equal(dois.length, 2);
  assert.ok(dois.every((t) => t.endsWith('.')));
  // Uma frase só, comprida e cheia de vírgulas, quebra nas vírgulas.
  const vírgulas = Array.from({ length: 30 }, (_, i) => `item número ${i}`).join(', ');
  const trechos = dividirParágrafo(`${vírgulas}.`);
  assert.ok(trechos.length > 1 && trechos.every((t) => t.length <= TAMANHO_DO_TRECHO));
  assert.ok(trechos.slice(0, -1).every((t) => t.endsWith(',')));
});

test('propriedade: todo trecho cabe no limite e juntar os trechos devolve o parágrafo, em qualquer entrada', () => {
  const casos = [
    'a'.repeat(5000),
    'palavra '.repeat(900).trim(),
    `${'Frase número um, com vírgula; e ponto e vírgula: dois pontos. '.repeat(40)}`.trim(),
    `${'x'.repeat(199)} ${'y'.repeat(2)} ${'z'.repeat(201)}`,
    '€'.repeat(450),
    `${'Ok! '.repeat(200)}`.trim(),
  ];
  for (const caso of casos) {
    const trechos = dividirParágrafo(caso);
    assert.ok(trechos.every((t) => t.length > 0 && t.length <= TAMANHO_DO_TRECHO), `limite: ${caso.slice(0, 20)}`);
    const junto = trechos.join(' ');
    // Palavra gigante cortada ao meio não ganha espaço no meio: compara sem espaços.
    assert.equal(junto.replace(/ /g, ''), caso.replace(/ /g, ''));
  }
});

test('texto de 30.000 caracteres vira trechos sem demora e cada parágrafo mantém o seu número', () => {
  const texto = Array.from({ length: 300 }, (_, i) => `Parágrafo ${i}. ${'Mais uma frase de enchimento para dar tamanho. '.repeat(2)}`).join('\n').slice(0, LIMITE_DE_CARACTERES);
  const t0 = performance.now();
  const leitura = prepararLeitura(texto);
  assert.ok(performance.now() - t0 < 1000);
  assert.ok(leitura.trechos.length >= leitura.parágrafos.length);
  const números = leitura.trechos.map((t) => t.parágrafo);
  assert.deepEqual(números, [...números].sort((a, b) => a - b));
  assert.equal(números[números.length - 1], leitura.parágrafos.length - 1);
});

test('conferirTexto: vazio, só símbolos, no limite e um acima, enorme', () => {
  assert.match(conferirTexto(''), /Escreva ou cole/);
  assert.match(conferirTexto('   \n  '), /Escreva ou cole/);
  assert.match(conferirTexto('!!! ??? ---'), /não tem letras nem números/);
  assert.equal(conferirTexto('a'.repeat(LIMITE_DE_CARACTERES)), null);
  assert.match(conferirTexto('a'.repeat(LIMITE_DE_CARACTERES + 1)), /limite é 30\.000/);
  assert.match(conferirTexto('a '.repeat(LIMITE_DE_CARACTERES * 3)), /Leia por partes/);
  const t0 = performance.now();
  assert.match(conferirTexto('x'.repeat(5_000_000)), /grande demais/);
  assert.ok(performance.now() - t0 < 500, 'texto enorme é recusado sem processar');
  assert.equal(conferirTexto(undefined) !== null, true);
});

test('o exemplo de "Como usar" confere: 2 parágrafos, 19 palavras, 8 s a 1× e 4 s a 2×', () => {
  const leitura = prepararLeitura(TEXTO_DE_EXEMPLO);
  assert.equal(leitura.parágrafos.length, 2);
  assert.equal(leitura.palavras, 19);
  assert.equal(estimarSegundos(leitura.palavras, 1), 8);
  assert.equal(estimarSegundos(leitura.palavras, 2), 4);
});

test('palavras e estimativa: 150 palavras levam 60 s, 30 s a 2×; velocidade inválida dá 0', () => {
  assert.equal(contarPalavras('um dois três'), 3);
  assert.equal(contarPalavras("não-fale d'água 10"), 3);
  assert.equal(contarPalavras('!!!'), 0);
  assert.equal(estimarSegundos(150, 1), 60);
  assert.equal(estimarSegundos(150, 2), 30);
  assert.equal(estimarSegundos(150, 0.5), 120);
  assert.equal(estimarSegundos(150, 0), 0);
  assert.equal(estimarSegundos(0, 1), 0);
});

test('escalas de velocidade e tom: aceita vírgula, recusa fora da faixa e lixo', () => {
  const faixa = { mín: 0.5, máx: 2, padrão: 1 };
  assert.equal(lerEscala('1,25', faixa), 1.25);
  assert.equal(lerEscala('0.5', faixa), 0.5);
  assert.equal(lerEscala('2', faixa), 2);
  for (const ruim of ['3', '0', '-1', 'abc', '', undefined, 'Infinity', 'NaN']) assert.equal(lerEscala(ruim, faixa), 1, String(ruim));
  assert.ok(VELOCIDADES.every((v) => lerEscala(v.valor, faixa) === Number(v.valor)));
  assert.ok(TONS.every((v) => lerEscala(v.valor, { mín: 0.5, máx: 1.5, padrão: 1 }) === Number(v.valor)));
});

/* ------------------------------------------------------------------ vozes */

const VOZES = [
  voz('Google US English', 'en-US', false),
  voz('Microsoft Maria', 'pt-BR', true),
  voz('Google português do Brasil', 'pt_BR', false),
  voz('Microsoft Helia', 'pt-PT', true),
  voz('Microsoft Daniel', 'pt-BR', true),
  voz('Alex', 'en-US', true),
  { voiceURI: 7, name: 'quebrada', lang: 'pt-BR', localService: true },
];

test('vozes: português do Brasil primeiro, só as do aparelho por padrão, outros idiomas e rede quando pedidos', () => {
  assert.deepEqual(listarVozes(VOZES).map((v) => v.name), ['Microsoft Daniel', 'Microsoft Maria', 'Microsoft Helia']);
  assert.deepEqual(listarVozes(VOZES, { sóDoAparelho: false }).map((v) => v.name), ['Microsoft Daniel', 'Microsoft Maria', 'Google português do Brasil', 'Microsoft Helia']);
  assert.deepEqual(listarVozes(VOZES, { todosOsIdiomas: true, sóDoAparelho: false }).map((v) => v.name),
    ['Microsoft Daniel', 'Microsoft Maria', 'Google português do Brasil', 'Microsoft Helia', 'Alex', 'Google US English']);
  assert.deepEqual(listarVozes([]), []);
  assert.equal(rotularVoz(VOZES[2]), 'Google português do Brasil (pt-BR) — de rede');
  assert.equal(rotularVoz(VOZES[1]), 'Microsoft Maria (pt-BR) — no aparelho');
});

test('vozes: escolher pelo identificador, com a primeira como padrão', () => {
  const lista = listarVozes(VOZES);
  assert.equal(acharVoz(lista, 'Microsoft Helia').name, 'Microsoft Helia');
  assert.equal(acharVoz(lista, 'sumiu').name, 'Microsoft Daniel');
  assert.equal(acharVoz([], 'x'), null);
});

test('falta de voz: cada caso diz o que fazer', () => {
  const filtros = { todosOsIdiomas: false, sóDoAparelho: true };
  assert.match(explicarFaltaDeVozes([], filtros), /não informou nenhuma voz.*Configurações/);
  assert.match(explicarFaltaDeVozes([voz('Alex', 'en-US')], filtros), /Não há voz em português.*outros idiomas/);
  assert.match(explicarFaltaDeVozes([voz('Google PT', 'pt-BR', false)], filtros), /são de rede.*Desmarque/);
  assert.match(explicarFaltaDeVozes([voz('Google EN', 'en-US', false)], { todosOsIdiomas: true, sóDoAparelho: true }), /As vozes deste navegador são de rede/);
});

/* ------------------------------------------------------------------ o leitor */

test('lê os trechos em fila, na ordem, e termina no fim', () => {
  const s = criarSintetizadorFalso();
  const situações = [];
  const leitor = criarLeitor({ sintetizador: s, criarFala, trechos: trechosDe(['um', 'dois'], 'três'), voz: voz('V'), velocidade: 1.5, tom: 0.75, aoMudar: (x) => situações.push(x.estado) });
  leitor.iniciar();
  assert.equal(s.falou(0), 'um');
  assert.equal(s.falas[0].rate, 1.5);
  assert.equal(s.falas[0].pitch, 0.75);
  assert.equal(s.falas[0].voice.name, 'V');
  assert.equal(s.falas[0].lang, 'pt-BR');
  assert.equal(leitor.situação.parágrafo, 0);
  s.terminar();
  assert.equal(s.falou(1), 'dois');
  s.terminar();
  assert.equal(s.falou(2), 'três');
  assert.equal(leitor.situação.parágrafo, 1);
  assert.equal(leitor.situação.totalDeParágrafos, 2);
  s.terminar();
  assert.equal(leitor.situação.estado, 'fim');
  assert.equal(s.falas.length, 3);
  assert.equal(situações.at(-1), 'fim');
});

test('pausar e continuar; aparelho que cancela em vez de pausar recomeça o trecho', () => {
  const s = criarSintetizadorFalso();
  const leitor = criarLeitor({ sintetizador: s, criarFala, trechos: trechosDe('um', 'dois') });
  leitor.iniciar();
  leitor.pausar();
  assert.equal(leitor.situação.estado, 'pausado');
  assert.equal(s.pausas, 1);
  leitor.continuar();
  assert.equal(leitor.situação.estado, 'lendo');
  assert.equal(s.retomadas, 1);
  assert.equal(s.falas.length, 1, 'pausa que funciona não repete a fala');

  // Segundo aparelho: pausar cancela, e `speaking` vira falso.
  const s2 = criarSintetizadorFalso();
  const l2 = criarLeitor({ sintetizador: s2, criarFala, trechos: trechosDe('um', 'dois') });
  l2.iniciar();
  l2.pausar();
  s2.speaking = false;
  l2.continuar();
  assert.equal(s2.falas.length, 2);
  assert.equal(s2.falou(1), 'um');
  // Pausar e continuar sem estar lendo não faz nada.
  const l3 = criarLeitor({ sintetizador: criarSintetizadorFalso(), criarFala, trechos: trechosDe('x') });
  l3.pausar();
  l3.continuar();
  assert.equal(l3.situação.estado, 'parado');
});

test('parar cancela e ignora o fim atrasado da fala velha', () => {
  for (const cancelaDisparaEnd of [false, true]) {
    const s = criarSintetizadorFalso({ cancelaDisparaEnd });
    const leitor = criarLeitor({ sintetizador: s, criarFala, trechos: trechosDe('um', 'dois', 'três') });
    leitor.iniciar();
    const velha = s.falas[0];
    leitor.parar();
    assert.equal(leitor.situação.estado, 'parado');
    velha.onend?.(); // o navegador avisa depois do cancelamento
    assert.equal(s.falas.length, 1, `nada novo falado (cancelaDisparaEnd=${cancelaDisparaEnd})`);
    assert.equal(leitor.situação.estado, 'parado');
  }
});

test('parágrafo seguinte e anterior: pulam, e "anterior" no meio do parágrafo volta ao começo dele', () => {
  const s = criarSintetizadorFalso({ cancelaDisparaEnd: true });
  const leitor = criarLeitor({ sintetizador: s, criarFala, trechos: trechosDe(['a1', 'a2'], ['b1', 'b2'], 'c1') });
  leitor.iniciar();
  leitor.mover(1);
  assert.equal(s.falas.at(-1).text, 'b1');
  assert.equal(leitor.situação.parágrafo, 1);
  s.terminar();
  assert.equal(s.falas.at(-1).text, 'b2');
  leitor.mover(-1); // no meio do parágrafo b: volta ao começo de b
  assert.equal(s.falas.at(-1).text, 'b1');
  leitor.mover(-1); // no começo de b: vai para o parágrafo a
  assert.equal(s.falas.at(-1).text, 'a1');
  leitor.mover(-1); // no começo do primeiro: recomeça o primeiro
  assert.equal(s.falas.at(-1).text, 'a1');
  leitor.mover(1);
  leitor.mover(1);
  assert.equal(s.falas.at(-1).text, 'c1');
  const antes = s.falas.length;
  leitor.mover(1); // já no último parágrafo: nada
  assert.equal(s.falas.length, antes);
  // A leitura continua do ponto novo.
  s.terminar();
  assert.equal(leitor.situação.estado, 'fim');
});

test('pular de parágrafo estando pausado retoma a leitura e destrava o sintetizador', () => {
  const s = criarSintetizadorFalso();
  const leitor = criarLeitor({ sintetizador: s, criarFala, trechos: trechosDe('a', 'b') });
  leitor.iniciar();
  leitor.pausar();
  leitor.mover(1);
  assert.equal(leitor.situação.estado, 'lendo');
  assert.equal(s.paused, false);
  assert.equal(s.falas.at(-1).text, 'b');
});

test('erros da voz viram mensagem; cancelamento nosso não é erro', () => {
  const s = criarSintetizadorFalso();
  const situações = [];
  const leitor = criarLeitor({ sintetizador: s, criarFala, trechos: trechosDe('um', 'dois'), aoMudar: (x) => situações.push(x) });
  leitor.iniciar();
  s.falas[0].onerror({ error: 'interrupted' });
  s.falas[0].onerror({ error: 'canceled' });
  assert.equal(leitor.situação.estado, 'lendo');
  s.falas[0].onerror({ error: 'voice-unavailable' });
  assert.equal(leitor.situação.estado, 'erro');
  assert.match(leitor.situação.mensagem, /Escolha outra voz/);
  // Depois do erro, um fim atrasado não reativa a fila.
  s.falas[0].onend();
  assert.equal(s.falas.length, 1);

  const l2 = criarLeitor({ sintetizador: criarSintetizadorFalso(), criarFala, trechos: trechosDe('x') });
  const s2 = criarSintetizadorFalso();
  const l3 = criarLeitor({ sintetizador: s2, criarFala, trechos: trechosDe('x') });
  l3.iniciar();
  s2.falas[0].onerror({ error: 'not-allowed' });
  assert.match(l3.situação.mensagem, /bloqueou a fala/);
  l2.iniciar();
  assert.equal(l2.situação.estado, 'lendo');
});

test('voz que não começa a falar no prazo: a leitura para com uma mensagem, em vez de ficar muda', () => {
  const s = criarSintetizadorFalso();
  const agenda = [];
  const leitor = criarLeitor({
    sintetizador: s, criarFala, trechos: trechosDe('um'),
    agendar: (f, ms) => { agenda.push({ f, ms }); return agenda.length; }, cancelarAgenda: (id) => { agenda[id - 1].f = null; },
  });
  leitor.iniciar();
  assert.equal(agenda.at(-1).ms, PRAZO_PARA_COMEÇAR_MS);
  agenda.at(-1).f();
  assert.equal(leitor.situação.estado, 'erro');
  assert.match(leitor.situação.mensagem, /não respondeu/);

  // Voz que começa: o relógio é desarmado.
  const s2 = criarSintetizadorFalso();
  const agenda2 = [];
  const l2 = criarLeitor({ sintetizador: s2, criarFala, trechos: trechosDe('um'), agendar: (f) => { agenda2.push(f); return agenda2.length; }, cancelarAgenda: (id) => { agenda2[id - 1] = null; } });
  l2.iniciar();
  s2.falas[0].onstart();
  assert.equal(agenda2[0], null);
});

test('leitor sem trechos não faz nada', () => {
  const s = criarSintetizadorFalso();
  const leitor = criarLeitor({ sintetizador: s, criarFala, trechos: [] });
  leitor.iniciar();
  leitor.mover(1);
  assert.equal(s.falas.length, 0);
  assert.equal(leitor.situação.estado, 'parado');
});

/* ------------------------------------------------------------------ a tela (iniciarLeitura) */

const dadosBons = { texto: TEXTO_DE_EXEMPLO, voz: 'Microsoft Maria', velocidade: '1', tom: '1', sóDoAparelho: 'sim', todosOsIdiomas: 'não' };

test('iniciar a leitura: fala o primeiro trecho com a voz escolhida e mostra voz, duração e o aviso de que não há áudio', () => {
  const s = criarSintetizadorFalso();
  const { leitor, saída, leitura } = iniciarLeitura({ ...dadosBons, velocidade: '2' }, { sintetizador: s, criarFala, vozes: VOZES });
  assert.equal(s.falou(0), 'Bom dia, pessoal. A reunião de hoje começa às dez horas, na sala dois.');
  assert.equal(s.falas[0].rate, 2);
  assert.equal(s.falas[0].voice.name, 'Microsoft Maria');
  assert.equal(leitura.parágrafos.length, 2);
  assert.equal(saída.valor, 'Lendo em voz alta');
  assert.ok(saída.linhas.some(([r, v]) => r === 'Duração estimada' && v === '0:04'));
  assert.ok(saída.linhas.some(([r, v]) => r === 'Velocidade' && v === '2×'));
  assert.ok(saída.linhas.some(([r, v]) => r === 'Tom' && v === '1'));
  assert.match(saída.observações.join(' '), /Não é gerado arquivo de áudio/);
  assert.equal(saída.texto, 'Bom dia, pessoal. A reunião de hoje começa às dez horas, na sala dois.\n\nTragam o relatório do mês.');
  leitor.parar();
});

test('voz de rede avisa que o texto pode sair do aparelho; voz do aparelho não', () => {
  const rede = iniciarLeitura({ ...dadosBons, voz: 'Google português do Brasil', sóDoAparelho: 'não' }, { sintetizador: criarSintetizadorFalso(), criarFala, vozes: VOZES });
  assert.match(rede.saída.observações.join(' '), /voz é de rede.*enviar o texto/);
  assert.ok(rede.saída.linhas.some(([r, v]) => r === 'Onde a voz roda' && /na rede/.test(v)));
  const local = iniciarLeitura(dadosBons, { sintetizador: criarSintetizadorFalso(), criarFala, vozes: VOZES });
  assert.doesNotMatch(local.saída.observações.join(' '), /voz é de rede/);
});

test('voz escolhida que sumiu da lista cai na primeira; velocidade e tom ruins viram o padrão', () => {
  const s = criarSintetizadorFalso();
  iniciarLeitura({ ...dadosBons, voz: 'não existe', velocidade: '99', tom: 'abc' }, { sintetizador: s, criarFala, vozes: VOZES });
  assert.equal(s.falas[0].voice.name, 'Microsoft Daniel');
  assert.equal(s.falas[0].rate, 1);
  assert.equal(s.falas[0].pitch, 1);
});

test('erros no campo certo: texto vazio, texto grande demais, nenhuma voz', () => {
  const ambiente = { sintetizador: criarSintetizadorFalso(), criarFala, vozes: VOZES };
  for (const [dados, campo, padrão] of [
    [{ ...dadosBons, texto: '' }, 'texto', /Escreva ou cole/],
    [{ ...dadosBons, texto: 'a'.repeat(LIMITE_DE_CARACTERES + 1) }, 'texto', /limite é/],
    [{ ...dadosBons, texto: '??' }, 'texto', /não tem letras/],
  ]) {
    try {
      iniciarLeitura(dados, ambiente);
      assert.fail('era esperada uma recusa');
    } catch (erro) {
      assert.ok(erro instanceof ErroDeEntrada);
      assert.equal(erro.campo, campo);
      assert.match(erro.message, padrão);
    }
  }
  assert.equal(ambiente.sintetizador.falas.length, 0, 'recusar não fala nada');
  for (const vozes of [[], [voz('Alex', 'en-US')]]) {
    try {
      iniciarLeitura(dadosBons, { sintetizador: criarSintetizadorFalso(), criarFala, vozes });
      assert.fail('era esperada uma recusa');
    } catch (erro) {
      assert.ok(erro instanceof ErroDeEntrada);
      assert.equal(erro.campo, 'voz');
    }
  }
});
