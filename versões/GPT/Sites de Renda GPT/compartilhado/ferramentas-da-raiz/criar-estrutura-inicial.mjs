// Cria o esqueleto de cada produto sem sobrescrever nada que já exista.
import fs from 'node:fs';
import path from 'node:path';
import { produtos } from './produtos.mjs';

function escreverSeAusente(caminho, conteúdo) {
  if (fs.existsSync(caminho)) return false;
  fs.mkdirSync(path.dirname(caminho), { recursive: true });
  fs.writeFileSync(caminho, conteúdo, 'utf8');
  return true;
}

function json(dados) {
  return `${JSON.stringify(dados, null, 2)}\n`;
}

export function criarEstruturaInicial(raiz) {
  const criados = [];
  for (const produto of produtos) {
    const pasta = path.join(raiz, produto.pasta);
    for (const subpasta of ['conteúdo/páginas', 'conteúdo/blocos', 'scripts/páginas', 'scripts/cálculos', 'estilos/produto', 'testes', 'documentação', 'recursos/imagens']) {
      fs.mkdirSync(path.join(pasta, subpasta), { recursive: true });
    }
    const arquivos = {
      'package.json': json({
        name: produto.pacote,
        private: true,
        version: '1.0.0',
        type: 'module',
        description: produto.descrição,
        license: 'SEE LICENSE IN LICENÇA.txt',
        scripts: {
          gerar: 'node ferramentas/gerar-páginas.mjs',
          servir: `node ferramentas/servir.mjs . --porta ${produto.porta}`,
          testar: 'node --test "testes/**/*.test.js"',
          verificar: 'node ferramentas/verificar-projeto.mjs',
          construir: 'node ferramentas/construir.mjs',
          visualizar: `node ferramentas/servir.mjs publicação --porta ${produto.porta + 10}`,
        },
      }),
      'configurações/configuração-pública.json': json({
        versãoDoEsquema: 1,
        site: { marca: produto.marca, marcaDestaque: produto.marcaDestaque, descrição: produto.descrição, prefixoDeArmazenamento: produto.prefixo, versão: '1.0.0' },
        criador: { nome: 'Anderson', portfólio: '', contato: '' },
        publicação: { endereçoBase: '' },
        privacidade: { versãoDaPolítica: '2026-09-14', validadeDoConsentimentoEmDias: 180, contatoDePrivacidade: '' },
        publicidade: { ativa: false, identificadorDoPublicador: '', blocos: {}, consentimentoConfigurado: false, cmp: 'nenhuma' },
        apoio: { ativo: false, chavePix: '', nomeDoRecebedor: '', cidadeDoRecebedor: '', valoresSugeridosEmCentavos: [100, 500, 1000, 2000, 3000, 5000, 10000] },
      }),
      'configurações/identidade-visual.json': json(produto.identidade),
      'configurações/ícones-do-produto.json': json(produto.ícones),
      'LICENÇA.txt': `${produto.marca} — © 2026 Anderson. Todos os direitos reservados.

O código-fonte, os textos, a identidade visual e as ilustrações autorais deste site
pertencem a Anderson. Não é permitido copiar, redistribuir ou publicar este site, ou
partes dele, sem autorização por escrito. O uso das ferramentas pelo navegador é livre
e gratuito.

Componentes de terceiros mantêm suas próprias licenças, incluídas no pacote:
- Fontes Caprasimo, Figtree e Caveat — SIL Open Font License 1.1 (recursos/fontes/licenças).
- Ícones Lucide — licença ISC (recursos/ícones/LICENÇA-lucide.txt).
- qrcode-generator, de Kazuhiko Arase — licença MIT (recursos/bibliotecas).

A integridade de cada versão publicada pode ser conferida em manifesto-de-integridade.json.
`,
    };
    for (const [relativo, conteúdo] of Object.entries(arquivos)) {
      if (escreverSeAusente(path.join(pasta, relativo), conteúdo)) criados.push(`${produto.pasta}/${relativo}`);
    }
  }
  return criados;
}
