// servidor-porta.js — escolha de porta livre e escuta com novas tentativas.
// Ver docs/contratos.md §8.5.
import net from 'node:net';

const TEMPO_LIMITE_MS = 300;

/**
 * Testa se algo já responde em <host>:<porta> dentro de 300 ms.
 * Qualquer falha (recusado, sem rota, IPv6 indisponível, tempo esgotado) conta como "não responde".
 * @returns {Promise<boolean>}
 */
export function portaRespondendo(porta, host) {
  return new Promise((resolver) => {
    const soquete = net.connect({ port: porta, host });
    let concluido = false;

    const finalizar = (respondeu) => {
      if (concluido) return;
      concluido = true;
      soquete.removeAllListeners();
      soquete.destroy();
      resolver(respondeu);
    };

    soquete.setTimeout(TEMPO_LIMITE_MS);
    soquete.once('connect', () => finalizar(true));
    soquete.once('timeout', () => finalizar(false));
    soquete.once('error', () => finalizar(false));
  });
}

/**
 * Tenta escutar na porta indicada (todas as interfaces) e fecha em seguida.
 * @returns {Promise<boolean>} true se o listen funcionou.
 */
export function conseguirEscutar(porta) {
  return new Promise((resolver) => {
    const servidor = net.createServer();
    let concluido = false;

    const finalizar = (conseguiu) => {
      if (concluido) return;
      concluido = true;
      servidor.removeAllListeners();
      if (conseguiu) {
        servidor.close(() => resolver(true));
      } else {
        resolver(false);
      }
    };

    servidor.once('error', () => finalizar(false));
    servidor.once('listening', () => finalizar(true));
    servidor.listen(porta);
  });
}

/**
 * Percorre [inicial, final], pulando as proibidas, e devolve a primeira porta
 * em que nada responde (nem 127.0.0.1 nem ::1) e o listen de teste funciona.
 * @returns {Promise<number>}
 */
export async function encontrarPortaLivre(inicial, final, proibidas = []) {
  for (let porta = inicial; porta <= final; porta++) {
    if (proibidas.includes(porta)) continue;

    const respondeV4 = await portaRespondendo(porta, '127.0.0.1');
    if (respondeV4) continue;

    const respondeV6 = await portaRespondendo(porta, '::1');
    if (respondeV6) continue;

    const consegueEscutar = await conseguirEscutar(porta);
    if (consegueEscutar) return porta;
  }
  throw new Error(`Nenhuma porta livre entre ${inicial} e ${final}.`);
}

/**
 * Faz o `servidorHttp` (já com os handlers configurados) escutar a partir de `inicial`,
 * pulando proibidas e avançando em EADDRINUSE, até `final`.
 * @returns {Promise<{ porta: number, tentadas: number[] }>}
 */
export function escutarComTentativas(servidorHttp, { inicial, final, proibidas = [] }) {
  return new Promise((resolver, rejeitar) => {
    const tentadas = [];

    const tentar = (porta) => {
      if (porta > final) {
        rejeitar(new Error(`Nenhuma porta livre entre ${inicial} e ${final}.`));
        return;
      }
      if (proibidas.includes(porta)) {
        tentar(porta + 1);
        return;
      }

      tentadas.push(porta);

      const aoErro = (erro) => {
        servidorHttp.removeListener('listening', aoEscutar);
        if (erro && erro.code === 'EADDRINUSE') {
          tentar(porta + 1);
          return;
        }
        rejeitar(erro);
      };
      const aoEscutar = () => {
        servidorHttp.removeListener('error', aoErro);
        resolver({ porta, tentadas });
      };

      servidorHttp.once('error', aoErro);
      servidorHttp.once('listening', aoEscutar);
      servidorHttp.listen(porta);
    };

    tentar(inicial);
  });
}
