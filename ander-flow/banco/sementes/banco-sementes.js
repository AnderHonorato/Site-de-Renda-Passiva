// banco/sementes/banco-sementes.js — dados de exemplo, idempotentes (contratos.md §7).
// Não cria usuário nem senha.
import { pathToFileURL } from 'node:url';
import { obterBanco, fecharBanco } from '../banco.js';
import { migrar } from '../banco-migrador.js';

const avisosSemente = [
  {
    tipo: 'sistema',
    publico: 'todos',
    titulo_pt_br: 'Bem-vindo ao Ander Flow',
    titulo_en: 'Welcome to Ander Flow',
    corpo_pt_br: 'Ferramentas simples que calculam direto no seu navegador, sem enviar seus dados.',
    corpo_en: 'Simple tools that calculate right in your browser, without sending your data.',
    link_url: null,
    link_rotulo_pt_br: null,
    link_rotulo_en: null,
    ativo: 1,
  },
  {
    tipo: 'popup',
    publico: 'todos',
    titulo_pt_br: 'Experimente o plano Plus',
    titulo_en: 'Try the Plus plan',
    corpo_pt_br: 'Desbloqueie recursos extras nas suas ferramentas favoritas.',
    corpo_en: 'Unlock extra features on your favorite tools.',
    link_url: '/planos',
    link_rotulo_pt_br: 'Ver planos',
    link_rotulo_en: 'See plans',
    ativo: 0,
  },
];

const inserirAviso = (banco) =>
  banco.prepare(`
    INSERT INTO avisos (
      tipo, publico, titulo_pt_br, titulo_en, corpo_pt_br, corpo_en,
      link_url, link_rotulo_pt_br, link_rotulo_en, ativo
    ) VALUES (
      @tipo, @publico, @titulo_pt_br, @titulo_en, @corpo_pt_br, @corpo_en,
      @link_url, @link_rotulo_pt_br, @link_rotulo_en, @ativo
    )
  `);

const existeAviso = (banco) =>
  banco.prepare('SELECT 1 FROM avisos WHERE tipo = ? AND titulo_pt_br = ?');

/**
 * Insere os avisos de exemplo que ainda não existem (mesmo tipo + mesmo
 * título em pt-BR). Retorna os títulos efetivamente inseridos nesta chamada.
 */
export function semear(banco) {
  const inserir = inserirAviso(banco);
  const existe = existeAviso(banco);

  const inseridos = [];
  for (const aviso of avisosSemente) {
    if (existe.get(aviso.tipo, aviso.titulo_pt_br)) continue;
    inserir.run(aviso);
    inseridos.push(aviso.titulo_pt_br);
  }
  return inseridos;
}

const ehExecucaoDireta = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (ehExecucaoDireta) {
  const banco = obterBanco();
  try {
    migrar(banco);
    const inseridos = semear(banco);
    if (inseridos.length === 0) {
      console.log('Sementes já existentes; nada a fazer.');
    } else {
      console.log('Avisos de exemplo criados:');
      for (const titulo of inseridos) console.log(`  - ${titulo}`);
    }
  } catch (erro) {
    console.error(erro.message);
    process.exitCode = 1;
  } finally {
    fecharBanco();
  }
}
