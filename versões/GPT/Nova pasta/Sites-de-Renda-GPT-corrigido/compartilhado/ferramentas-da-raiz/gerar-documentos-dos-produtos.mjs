// Gera o LEIA-ME.md de cada produto e o guia de AdSense do produto a partir do cadastro central.
// Uso: npm run documentos (na raiz). Sobrescreve apenas estes dois arquivos por produto.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { produtos } from './produtos.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function leiaMe(produto) {
  return `# ${produto.marca}

${produto.descrição}

Parte do projeto “Sites de Renda Passiva”, criado por Anderson. Site estático: tudo roda no navegador, sem cadastro e sem banco de dados. Marca provisória: verifique conflitos de marca e domínio antes de publicar.

## Executar localmente

Requer Node.js 20+. Se for a primeira vez no projeto, rode \`npm install\`, \`npm run preparar\` e \`npm run sincronizar\` na raiz. Depois, nesta pasta:

\`\`\`bash
npm run gerar
\`\`\`

\`\`\`bash
npm run servir
\`\`\`

Abra \`http://127.0.0.1:${produto.porta}/\`. Use sempre \`http://\`: os módulos JavaScript não funcionam abrindo o arquivo com dois cliques.

## Testar e verificar

\`\`\`bash
npm run testar
\`\`\`

\`\`\`bash
npm run verificar
\`\`\`

## Gerar o pacote para publicar

\`\`\`bash
npm run construir
\`\`\`

O pacote fica em \`publicação/\` (fora do Git). Para visualizar exatamente o que será publicado, em \`http://127.0.0.1:${produto.porta + 10}/\`:

\`\`\`bash
npm run visualizar
\`\`\`

Envie o conteúdo de \`publicação/\` para a raiz do domínio ou para uma subpasta. Os caminhos são relativos e funcionam nos dois casos; para a página 404 e o canonical, preencha \`publicação.endereçoBase\`. O \`.htaccess\` aplica os cabeçalhos de segurança no Apache; para Nginx, veja \`../documentação/hospedagem/nginx-exemplo.conf\`.

## Alterar identidade, contato, Pix e publicidade

Tudo fica em \`configurações/configuração-pública.json\` (arquivo público). Campos e efeitos: \`../documentação/dados-que-o-proprietário-precisa-preencher.md\`. Depois de alterar, rode \`npm run construir\`.

- Nome e contato: \`site.marca\`, \`criador.portfólio\`, \`criador.contato\`.
- Pix: \`apoio.ativo\`, \`apoio.chavePix\`, \`apoio.nomeDoRecebedor\`, \`apoio.cidadeDoRecebedor\`.
- AdSense: \`documentação/como-conectar-o-adsense.md\`.
- Cores: \`configurações/identidade-visual.json\` e, na raiz, \`node compartilhado/ferramentas-da-raiz/preparar-recursos.mjs --produto ${produto.número}\`.

## Privacidade

O aviso da primeira visita controla o carregamento de publicidade. O que o site guarda no aparelho está descrito na política de privacidade (\`conteúdo/blocos/armazenamento-local.html\`). O visitante pode apagar os itens na página Salvos.

## Estrutura

- \`conteúdo/\` textos das páginas (fonte); \`conteúdo/comum/\` vem sincronizado do projeto.
- \`scripts/\` JavaScript modular; \`scripts/comum/\` vem sincronizado (não edite aqui, edite \`compartilhado/\`).
- \`estilos/\` CSS; \`estilos/site.css\` é gerado.
- \`testes/\` testes automáticos; \`ferramentas/\` scripts de geração, servidor e pacote.
`;
}

function guiaDeAdsense(produto) {
  const escolar = produto.número === 2
    ? '\n**Atenção — conteúdo que pode ser usado por crianças:** antes de ativar, leia `publicidade-e-público-infantil.md` nesta pasta e configure o tratamento para público infantil conforme a política oficial. Anúncios nunca aparecem dentro da atividade nem no PDF.\n'
    : '';
  return `# Como conectar o AdSense — ${produto.marca}

Siga o guia completo em \`../../documentação/como-conectar-o-adsense.md\`. Neste site:

- Arquivo de configuração: \`configurações/configuração-pública.json\` (bloco \`publicidade\`).
- Posição reservada: \`após-resultado\` (depois do resultado de cada ferramenta). Um bloco \`padrão\` pode ser usado para todos os espaços.
- Páginas sem anúncio: Apoiar, orçamento compartilhado, página 404, contato, privacidade e termos.
- Prefixo de armazenamento deste site: \`${produto.prefixo}\`.
${escolar}
Resumo:

1. Publicar com HTTPS e preencher \`publicação.endereçoBase\`.
2. Adicionar o domínio no AdSense e verificar a propriedade.
3. Colocar \`ca-pub-…\` e os blocos na configuração, ainda com \`"ativa": false\`.
4. Publicar o \`ads.txt\` na raiz do domínio.
5. Configurar a mensagem de privacidade (CMP) e marcar \`"consentimentoConfigurado": true\`.
6. Aplicar o perfil de CSP com anúncios na hospedagem.
7. Marcar \`"ativa": true\`, rodar \`npm run construir\`, publicar e validar aceitar, rejeitar e revogar.
8. Para desligar: \`"ativa": false\` e \`npm run construir\`.
`;
}

for (const produto of produtos) {
  const pasta = path.join(raiz, produto.pasta);
  fs.writeFileSync(path.join(pasta, 'LEIA-ME.md'), leiaMe(produto), 'utf8');
  fs.mkdirSync(path.join(pasta, 'documentação'), { recursive: true });
  fs.writeFileSync(path.join(pasta, 'documentação', 'como-conectar-o-adsense.md'), guiaDeAdsense(produto), 'utf8');
  console.log(`${produto.pasta}: LEIA-ME.md e documentação/como-conectar-o-adsense.md gerados.`);
}
