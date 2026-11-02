// autenticacao-email.js — monta e grava o e-mail de recuperação de senha (docs/contratos.md §11).
// `emailModo` é sempre 'arquivo' (§8.1): grava em `.execucao/emails/<data>-<id>.txt`, traduzido
// no idioma do usuário. Sem provedor de e-mail integrado (docs/decisoes.md #11).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MODELOS = {
  'pt-BR': JSON.parse(readFileSync(join(__dirname, 'autenticacao-email-pt-br.json'), 'utf8')),
  en: JSON.parse(readFileSync(join(__dirname, 'autenticacao-email-en.json'), 'utf8')),
};

function substituirVariaveis(texto, variaveis) {
  return texto.replace(/\{(\w+)\}/g, (correspondencia, nome) => (nome in variaveis ? String(variaveis[nome]) : correspondencia));
}

/** Monta assunto e corpo traduzidos — função pura, sem tocar disco. */
export function montarEmailRecuperacao({ idioma, nome, link }) {
  const modelo = MODELOS[idioma] ?? MODELOS['pt-BR'];
  const dados = modelo.autenticacao.email.recuperar_senha;
  const variaveis = { nome, link };
  return {
    assunto: substituirVariaveis(dados.assunto, variaveis),
    corpo: substituirVariaveis(dados.corpo, variaveis),
  };
}

function nomeArquivoSeguro(data) {
  return data.toISOString().replace(/[:.]/g, '-');
}

/**
 * Grava o e-mail de recuperação em `.execucao/emails/<data>-<id>.txt` e devolve o caminho.
 * `usuarioId` compõe o nome do arquivo (não o conteúdo sensível: token nunca é gravado em claro
 * fora do link, e o link em si é de uso único e expira em 1 h).
 */
export function gravarEmailRecuperacao({ pastaExecucao, usuarioId, idioma, nome, link, agora = () => new Date() }) {
  const pastaEmails = join(pastaExecucao, 'emails');
  mkdirSync(pastaEmails, { recursive: true });

  const { assunto, corpo } = montarEmailRecuperacao({ idioma, nome, link });
  const caminho = join(pastaEmails, `${nomeArquivoSeguro(agora())}-${usuarioId}.txt`);
  writeFileSync(caminho, `Assunto: ${assunto}\n\n${corpo}\n`, 'utf8');
  return caminho;
}
