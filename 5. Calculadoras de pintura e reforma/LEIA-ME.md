# Demão Certa

Calculadoras gratuitas de pintura e reforma: área de paredes, quantidade de tinta, piso por caixa, rodapé e orçamento estimado.

Parte do projeto “Sites de Renda Passiva”, criado por Anderson. Site estático: tudo roda no navegador, sem cadastro e sem banco de dados. Marca provisória: verifique conflitos de marca e domínio antes de publicar.

## Executar localmente

Requer Node.js 20+. Se for a primeira vez no projeto, rode `npm install`, `npm run preparar` e `npm run sincronizar` na raiz. Depois, nesta pasta:

```bash
npm run gerar
```

```bash
npm run servir
```

Abra `http://127.0.0.1:4315/`. Use sempre `http://`: os módulos JavaScript não funcionam abrindo o arquivo com dois cliques.

## Testar e verificar

```bash
npm run testar
```

```bash
npm run verificar
```

## Gerar o pacote para publicar

```bash
npm run construir
```

O pacote fica em `publicação/` (fora do Git). Para visualizar exatamente o que será publicado, em `http://127.0.0.1:4325/`:

```bash
npm run visualizar
```

Envie o conteúdo de `publicação/` para a raiz do domínio ou para uma subpasta. Os caminhos são relativos e funcionam nos dois casos; para a página 404 e o canonical, preencha `publicação.endereçoBase`. O `.htaccess` aplica os cabeçalhos de segurança no Apache; para Nginx, veja `../documentação/hospedagem/nginx-exemplo.conf`.

## Alterar identidade, contato, Pix e publicidade

Tudo fica em `configurações/configuração-pública.json` (arquivo público). Campos e efeitos: `../documentação/dados-que-o-proprietário-precisa-preencher.md`. Depois de alterar, rode `npm run construir`.

- Nome e contato: `site.marca`, `criador.portfólio`, `criador.contato`.
- Pix: `apoio.ativo`, `apoio.chavePix`, `apoio.nomeDoRecebedor`, `apoio.cidadeDoRecebedor`.
- AdSense: `documentação/como-conectar-o-adsense.md`.
- Cores: `configurações/identidade-visual.json` e, na raiz, `node compartilhado/ferramentas-da-raiz/preparar-recursos.mjs --produto 5`.

## Privacidade

O aviso da primeira visita controla o carregamento de publicidade. O que o site guarda no aparelho está descrito na política de privacidade (`conteúdo/blocos/armazenamento-local.html`). O visitante pode apagar os itens na página Salvos.

## Estrutura

- `conteúdo/` textos das páginas (fonte); `conteúdo/comum/` vem sincronizado do projeto.
- `scripts/` JavaScript modular; `scripts/comum/` vem sincronizado (não edite aqui, edite `compartilhado/`).
- `estilos/` CSS; `estilos/site.css` é gerado.
- `testes/` testes automáticos; `ferramentas/` scripts de geração, servidor e pacote.
