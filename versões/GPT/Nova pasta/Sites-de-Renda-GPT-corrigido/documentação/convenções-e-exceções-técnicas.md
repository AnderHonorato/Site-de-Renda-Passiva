# Convenções e exceções técnicas

## Convenção

Texto autoral, documentação, comentários, nomes de arquivos, funções, variáveis, propriedades de dados, classes CSS, variáveis CSS e atributos `data-*` autorais usam português brasileiro com acentuação correta, em UTF-8 e normalização Unicode **NFC**. Exemplos reais do projeto: `calcularPreçoDeVenda`, `validar-precificação-salva.js`, `.navegação-inferior`, `--cor-texto-destaque`, `data-abrir-preferências-de-privacidade`, `configuração-pública.json`.

Uma função autoral nomeada por arquivo, com nome de arquivo em kebab-case igual ao nome da função (`gerar-payload-pix.js` → `gerarPayloadPix`).

## Exceções técnicas (mantidas no original)

| Exceção | Motivo |
|---|---|
| Palavras reservadas e APIs de JavaScript, DOM, CSS e HTML (`import`, `export`, `addEventListener`, `querySelector`, `display`, `aria-*`, `role`, `hidden`) | Definidas pelas plataformas. |
| `index.html`, `package.json`, `package-lock.json`, `node_modules`, `.gitignore`, `.htaccess`, `robots.txt`, `sitemap.xml`, `ads.txt`, `favicon.svg` | Nomes exigidos por servidores, npm, Git, buscadores e Google. |
| Campo `name` de cada `package.json` (ex.: `ferramentas-para-confeitaria`) | O npm só aceita letras minúsculas ASCII nesse campo. |
| `.claude/agents`, `.claude/launch.json` e o frontmatter `name`, `description`, `model` | Convenção do Claude Code. |
| `br.gov.bcb.pix`, identificadores EMV (`00`, `26`, `52`, `53`, `54`, `58`, `59`, `60`, `62`, `63`) | Manual de Padrões para Iniciação do Pix. |
| `adsbygoogle`, `data-ad-client`, `data-ad-slot`, `data-ad-format`, `data-full-width-responsive`, `ca-pub-` | API do Google AdSense. |
| Diretivas HTTP (`Content-Security-Policy`, `X-Content-Type-Options` etc.) | Padrões HTTP. |
| Arquivos de fontes (`figtree-latin-400-normal.woff2`), `qrcode.mjs`, `LICENSE-qrcode-generator.txt`, `OFL-*.txt`, `LICENÇA-lucide.txt` (conteúdo) | Dependências de terceiros preservam nomes e licenças originais. |
| Identificadores dos ícones de produto (`cake`, `paint-roller`) no sprite | São os nomes originais do Lucide, para facilitar a rastreabilidade; os ícones comuns têm identificadores em português (`início`, `apoiar`). |
| Nomes de pacotes npm (`jsqr`, `lucide-static`, `@fontsource/figtree`) | Nomes oficiais. |

Palavras que não levam acento não receberam acento artificial.

## Caminhos com espaço e acento

- No terminal, sempre entre aspas: `cd "1. Ferramentas para confeitaria"`.
- Scripts Node resolvem caminhos com `path` e `fileURLToPath`; nada é montado por concatenação de texto do sistema operacional.
- Navegadores codificam caminhos UTF-8 em percentuais (`/p%C3%A1ginas/…`); o servidor local decodifica e normaliza para NFC; Apache e Nginx fazem o mesmo quando os arquivos estão gravados em UTF-8 NFC.
- `npm run verificar` recusa arquivos fora da normalização NFC e confere todos os links e importações.
- Servidores Linux diferenciam maiúsculas de minúsculas; o projeto usa apenas minúsculas em caminhos autorais, exceto `LEIA-ME.md` e `LICENÇA.txt`, referenciados sempre com a mesma grafia.
- Ao enviar por FTP, use um cliente que preserve UTF-8 nos nomes (por exemplo, FileZilla com “forçar UTF-8”). Confira depois abrindo uma página com acento no endereço.
