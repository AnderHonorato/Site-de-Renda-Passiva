/**
 * Gera a matriz de ferramentas da documentação a partir do catálogo.
 *
 * A matriz é gerada, nunca escrita à mão: assim ela não descola do código.
 * Uso: node portal/ferramentas/gerar-documentos.mjs
 */
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ferramentas, ferramentasProntas } from '../dados/catálogo.js';
import { categorias } from '../dados/categorias.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const escaparCélula = (v) => String(v ?? '').replace(/\|/g, '\|').replace(/\n/g, ' ');

const porCategoria = categorias.map((c) => {
  const lista = ferramentas.filter((f) => f.cat === c.id);
  const prontas = lista.filter((f) => f.status === 'pronta').length;
  const linhas = lista.map((f) => [
    f.id, f.nome, `\`${f.slug}\``, escaparCélula(f.problema),
    escaparCélula(f.entra), escaparCélula(f.sai),
    f.exporta.length ? f.exporta.join(', ') : '—',
    f.plano, f.local ? 'navegador' : 'servidor',
    f.status === 'pronta' ? '**pronta**' : 'planejada',
    f.unifica.length ? `unifica ${f.unifica.length}` : '—',
  ].join(' | '));

  return `### ${c.nome} (${prontas}/${lista.length} prontas)

${c.resumo}

| ID | Nome | Slug | Problema resolvido | Entrada | Saída | Exporta | Plano | Processa | Situação | Unificação |
|---|---|---|---|---|---|---|---|---|---|---|
| ${linhas.join(' |\n| ')} |`;
}).join('\n\n');

const unificadas = ferramentas.filter((f) => f.unifica.length > 0);
const aPortar = ferramentas.filter((f) => f.origem === 'porte');

const documento = `# Matriz de ferramentas

Gerado por \`portal/ferramentas/gerar-documentos.mjs\` a partir de \`portal/dados/catálogo.js\`.
Não edite este arquivo à mão: edite o catálogo e gere de novo.

**${ferramentas.length} ferramentas únicas · ${ferramentasProntas.length} prontas · ${ferramentas.length - ferramentasProntas.length} planejadas**

## Como ler a situação

- **pronta** — abre, valida a entrada, calcula, trata erro, exporta o que promete e tem teste automático. Tem página própria em \`/portal/f/<slug>/\`.
- **planejada** — a ficha existe e aparece no catálogo, mas a ferramenta ainda não foi implementada. Não abre tela vazia: leva ao catálogo com a descrição do que fará.

Toda ferramenta é projetada para funcionar no celular; por isso não existe coluna "mobile": seria sempre "sim".

## Ferramentas que absorveram outras (${unificadas.length})

Em vez de criar variações artificiais, estas reúnem num lugar só o que seria várias ferramentas quase iguais:

${unificadas.map((f) => `- **${f.nome}** (\`${f.slug}\`) reúne: ${f.unifica.join(' · ')}`).join('\n')}

## Ferramentas cuja lógica será portada dos seis sites existentes (${aPortar.length})

Estas já funcionam nas pastas numeradas da raiz do repositório e serão trazidas para o portal reaproveitando o cálculo já testado, não reescrevendo do zero:

${aPortar.map((f) => `- ${f.id} ${f.nome} (\`${f.slug}\`)`).join('\n')}

## Catálogo por categoria

${porCategoria}
`;

await writeFile(join(RAIZ, 'documentação', 'catalogo-ferramentas.md'), documento, 'utf8');
console.log(`Matriz gerada com ${ferramentas.length} ferramentas.`);
