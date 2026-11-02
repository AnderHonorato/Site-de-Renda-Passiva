import assert from 'node:assert/strict';
import net from 'node:net';
import http from 'node:http';
import { test } from 'node:test';
import {
  conseguirEscutar,
  encontrarPortaLivre,
  escutarComTentativas,
  portaRespondendo,
} from '../../servidor/servidor-porta.js';

function ocupar(porta) {
  return new Promise((resolver, rejeitar) => {
    const servidor = net.createServer();
    servidor.on('error', rejeitar);
    servidor.listen(porta, () => resolver(servidor));
  });
}

function fechar(servidor) {
  return new Promise((resolver) => servidor.close(resolver));
}

// As portas efêmeras do SO (listen(0)) vivem numa faixa concorrida; para testes que precisam
// de várias portas livres *consecutivas*, procuramos um bloco fora dessa faixa.
async function encontrarBlocoLivre(tamanho, inicioBusca = 41000, tentativasMax = 3000) {
  for (let inicio = inicioBusca; inicio < inicioBusca + tentativasMax; inicio++) {
    let blocoOk = true;
    for (let i = 0; i < tamanho; i++) {
      const livre = await conseguirEscutar(inicio + i);
      if (!livre) {
        blocoOk = false;
        break;
      }
    }
    if (blocoOk) return inicio;
  }
  throw new Error(`Não achei bloco de ${tamanho} portas livres para o teste.`);
}

test('portaRespondendo: true quando algo está escutando', async () => {
  const ocupante = await ocupar(0);
  const porta = ocupante.address().port;
  try {
    assert.equal(await portaRespondendo(porta, '127.0.0.1'), true);
  } finally {
    await fechar(ocupante);
  }
});

test('portaRespondendo: false quando nada escuta', async () => {
  const inicio = await encontrarBlocoLivre(1);
  assert.equal(await portaRespondendo(inicio, '127.0.0.1'), false);
});

test('conseguirEscutar: true numa porta livre, depois fecha', async () => {
  const consegue = await conseguirEscutar(0);
  assert.equal(consegue, true);
});

test('conseguirEscutar: false numa porta ocupada', async () => {
  const ocupante = await ocupar(0);
  const porta = ocupante.address().port;
  try {
    assert.equal(await conseguirEscutar(porta), false);
  } finally {
    await fechar(ocupante);
  }
});

test('encontrarPortaLivre: pula porta ocupada e pula proibidas', async () => {
  const inicial = await encontrarBlocoLivre(11);
  const ocupante = await ocupar(inicial);
  const proibidas = [inicial + 1, inicial + 2];
  try {
    const porta = await encontrarPortaLivre(inicial, inicial + 10, proibidas);
    assert.equal(porta, inicial + 3);
  } finally {
    await fechar(ocupante);
  }
});

test('encontrarPortaLivre: lança quando não há porta livre no intervalo', async () => {
  const inicial = await encontrarBlocoLivre(1);
  const ocupante = await ocupar(inicial);
  try {
    await assert.rejects(() => encontrarPortaLivre(inicial, inicial, []), /Nenhuma porta livre/);
  } finally {
    await fechar(ocupante);
  }
});

test('escutarComTentativas: avança em EADDRINUSE até achar porta livre', async () => {
  const inicial = await encontrarBlocoLivre(11);
  const ocupante = await ocupar(inicial);
  const servidorHttp = http.createServer((req, res) => res.end('ok'));
  try {
    const { porta, tentadas } = await escutarComTentativas(servidorHttp, {
      inicial,
      final: inicial + 10,
      proibidas: [],
    });
    assert.equal(porta, inicial + 1);
    assert.deepEqual(tentadas, [inicial, inicial + 1]);
  } finally {
    await fechar(ocupante);
    await new Promise((r) => servidorHttp.close(r));
  }
});

test('escutarComTentativas: pula proibidas sem tentar escutar nelas', async () => {
  const livre = await encontrarBlocoLivre(6);
  const servidorHttp = http.createServer((req, res) => res.end('ok'));
  try {
    const { porta, tentadas } = await escutarComTentativas(servidorHttp, {
      inicial: livre,
      final: livre + 5,
      proibidas: [livre, livre + 1],
    });
    assert.equal(porta, livre + 2);
    assert.ok(!tentadas.includes(livre));
    assert.ok(!tentadas.includes(livre + 1));
  } finally {
    await new Promise((r) => servidorHttp.close(r));
  }
});
