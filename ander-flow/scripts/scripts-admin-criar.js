// scripts/scripts-admin-criar.js — cria o primeiro admin ou promove um usuário existente
// (contratos.md §7, §9.4). Nenhuma senha padrão em lugar nenhum.
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { obterBanco, fecharBanco } from '../banco/banco.js';
import { migrar } from '../banco/banco-migrador.js';

const raizProjeto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAMANHO_MINIMO_SENHA = 10;

export function analisarArgumentos(argv) {
  const resultado = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--email') resultado.email = argv[i + 1];
    if (argv[i] === '--nome') resultado.nome = argv[i + 1];
  }
  return resultado;
}

function perguntar(pergunta) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(pergunta, (resposta) => {
      rl.close();
      resolve(resposta.trim());
    });
  });
}

// Lê uma linha de senha do terminal sem ecoar os caracteres (TTY).
function perguntarSenhaTty(pergunta) {
  return new Promise((resolve) => {
    const saida = process.stdout;
    const entrada = process.stdin;
    saida.write(pergunta);

    const modoRawOriginal = entrada.isRaw ?? false;
    entrada.setRawMode?.(true);
    entrada.resume();
    entrada.setEncoding('utf8');

    let senha = '';
    const finalizar = () => {
      entrada.setRawMode?.(modoRawOriginal);
      entrada.pause();
      entrada.removeListener('data', aoReceberDados);
      saida.write('\n');
    };

    function aoReceberDados(fragmento) {
      for (const caractere of fragmento) {
        if (caractere === '\n' || caractere === '\r') {
          finalizar();
          resolve(senha);
          return;
        }
        if (caractere === '') {
          // Ctrl+C
          finalizar();
          process.exit(1);
        }
        if (caractere === '' || caractere === '\b') {
          senha = senha.slice(0, -1);
          continue;
        }
        senha += caractere;
      }
    }

    entrada.on('data', aoReceberDados);
  });
}

// Modo não interativo (para testes): lê a senha inteira da entrada padrão.
function lerSenhaDeEntradaPadrao() {
  return new Promise((resolve, reject) => {
    let dados = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (fragmento) => {
      dados += fragmento;
    });
    process.stdin.on('end', () => resolve(dados.split(/\r?\n/)[0] ?? ''));
    process.stdin.on('error', reject);
  });
}

export async function obterCredenciais(argumentos, { ehTty = process.stdin.isTTY === true } = {}) {
  let { email, nome } = argumentos;
  let senha;

  if (ehTty) {
    if (!email) email = await perguntar('E-mail: ');
    if (!nome) nome = await perguntar('Nome: ');

    for (;;) {
      const primeira = await perguntarSenhaTty(`Senha (mínimo ${TAMANHO_MINIMO_SENHA} caracteres): `);
      if (primeira.length < TAMANHO_MINIMO_SENHA) {
        console.error(`A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
        continue;
      }
      const confirmacao = await perguntarSenhaTty('Confirme a senha: ');
      if (primeira !== confirmacao) {
        console.error('As senhas não coincidem. Tente de novo.');
        continue;
      }
      senha = primeira;
      break;
    }
  } else {
    if (!email || !nome) {
      throw new Error('Em modo não interativo, informe --email e --nome.');
    }
    senha = await lerSenhaDeEntradaPadrao();
    if (!senha || senha.length < TAMANHO_MINIMO_SENHA) {
      throw new Error(`A senha lida da entrada padrão precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
    }
  }

  if (!email || !email.includes('@')) {
    throw new Error('E-mail inválido.');
  }
  if (!nome) {
    throw new Error('Nome não pode ser vazio.');
  }

  return { email: email.trim().toLowerCase(), nome: nome.trim(), senha };
}

export async function importarGerarHashSenha() {
  const caminhoModulo = path.join(raizProjeto, 'servidor', 'seguranca', 'seguranca-senha.js');
  let modulo;
  try {
    modulo = await import(pathToFileURL(caminhoModulo).href);
  } catch (erro) {
    throw new Error(
      'Não foi possível importar gerarHashSenha de servidor/seguranca/seguranca-senha.js ' +
        '(módulo escrito por outro agente; crie-o antes de rodar este script). ' +
        `Detalhe: ${erro.message}`
    );
  }
  if (typeof modulo.gerarHashSenha !== 'function') {
    throw new Error('servidor/seguranca/seguranca-senha.js não exporta gerarHashSenha.');
  }
  return modulo.gerarHashSenha;
}

/**
 * Cria o usuário com papel admin, ou promove o existente (mesmo e-mail) a
 * admin. Não altera a senha de quem já existe.
 */
export function criarOuPromoverAdmin(banco, { email, nome, senhaHash }) {
  const existente = banco.prepare('SELECT id, papel FROM usuarios WHERE email = ?').get(email);
  const agora = new Date().toISOString();

  if (existente) {
    if (existente.papel === 'admin') {
      return { id: existente.id, criado: false, promovido: false };
    }
    banco.prepare('UPDATE usuarios SET papel = ?, atualizado_em = ? WHERE id = ?').run('admin', agora, existente.id);
    return { id: existente.id, criado: false, promovido: true };
  }

  const resultado = banco
    .prepare(
      `INSERT INTO usuarios (email, nome, senha_hash, papel, criado_em, atualizado_em)
       VALUES (?, ?, ?, 'admin', ?, ?)`
    )
    .run(email, nome, senhaHash, agora, agora);

  return { id: resultado.lastInsertRowid, criado: true, promovido: false };
}

async function executarPrincipal() {
  const argumentos = analisarArgumentos(process.argv.slice(2));
  const { email, nome, senha } = await obterCredenciais(argumentos);
  const gerarHashSenha = await importarGerarHashSenha();
  const senhaHash = await gerarHashSenha(senha);

  const banco = obterBanco();
  try {
    migrar(banco);
    const resultado = criarOuPromoverAdmin(banco, { email, nome, senhaHash });
    if (resultado.criado) {
      console.log(`Usuário admin criado: ${email} (id ${resultado.id}).`);
    } else if (resultado.promovido) {
      console.log(`Usuário ${email} promovido a admin (id ${resultado.id}).`);
    } else {
      console.log(`Usuário ${email} já era admin (id ${resultado.id}).`);
    }
  } finally {
    fecharBanco();
  }
}

const ehExecucaoDireta = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (ehExecucaoDireta) {
  executarPrincipal().catch((erro) => {
    console.error(erro.message);
    process.exitCode = 1;
  });
}
