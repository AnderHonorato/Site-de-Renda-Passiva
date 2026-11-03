/**
 * Entradas reais dos formatadores usados no navegador.
 * Empacotadas pelo esbuild durante CI, sem CDN em runtime e sem executar código do usuário.
 * Licenças MIT: Prettier 3.9.10, sql-formatter 15.9.0.
 */
import * as prettier from 'prettier/standalone';
import * as babel from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';
import * as html from 'prettier/plugins/html';
import * as postcss from 'prettier/plugins/postcss';
import * as typescript from 'prettier/plugins/typescript';
import { format as formatarSql } from 'sql-formatter';

const REGRAS = Object.freeze({
  javascript: { parser: 'babel', plugins: [babel, estree, html, postcss] },
  typescript: { parser: 'typescript', plugins: [typescript, estree, html, postcss] },
  html: { parser: 'html', plugins: [html, babel, estree, postcss] },
  css: { parser: 'css', plugins: [postcss] },
  json: { parser: 'json', plugins: [babel, estree] },
});

/** API pequena e estável para isolar os motores reais do restante do portal. */
export async function formatarComBiblioteca({ codigo, linguagem, dialeto, espacos, acao }) {
  if (linguagem === 'sql') {
    if (acao !== 'formatar') throw new Error('Minificação segura de SQL não está disponível.');
    return formatarSql(codigo, {
      language: dialeto,
      tabWidth: espacos,
      keywordCase: 'upper',
      linesBetweenQueries: 1,
    });
  }
  if (acao === 'minificar') {
    if (linguagem !== 'json') throw new Error('Minificação disponível somente para JSON.');
    return JSON.stringify(JSON.parse(codigo));
  }
  const regra = REGRAS[linguagem];
  if (!regra) throw new Error('Linguagem não suportada.');
  return await prettier.format(codigo, {
    parser: regra.parser,
    plugins: regra.plugins,
    tabWidth: espacos,
    printWidth: 90,
    semi: true,
    singleQuote: true,
    htmlWhitespaceSensitivity: 'css',
  });
}
