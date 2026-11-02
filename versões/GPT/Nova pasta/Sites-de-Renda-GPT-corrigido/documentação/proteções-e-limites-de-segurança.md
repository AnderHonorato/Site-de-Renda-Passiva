# Proteções e limites de segurança

Escopo: seis sites estáticos, sem backend de aplicação. Esta análise lista ameaças, a proteção implementada, onde verificá-la e o que **não** é possível garantir.

## Ameaças e proteções

| Ameaça | Proteção implementada | Onde / evidência |
|---|---|---|
| XSS por texto digitado, item salvo, cópia importada ou link de orçamento | Todo conteúdo dinâmico entra por `textContent`/`criarElemento`; `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` e `new Function` são proibidos e barrados por `npm run verificar`; CSP sem `unsafe-inline` | `scripts/comum/interface/criar-elemento.js`, `ferramentas/verificar-projeto.mjs`; teste no navegador com `<script>` no nome (exibido como texto) |
| Estilos, scripts ou manipuladores em linha | Proibidos no HTML gerado e barrados pelo verificador; a CSP `style-src 'self'`/`script-src 'self'` os bloquearia | `verificar-projeto.mjs` |
| Cópia de segurança maliciosa | Limite de tamanho (2 MB) e de profundidade; remoção de `__proto__`, `constructor` e `prototype`; esquema e versão do produto; somente coleções conhecidas; validador rigoroso por registro; dados importados nunca alcançam Pix, anúncios ou consentimento | `armazenamento/analisar-json-seguro.js`, `importar-cópia-local.js`; `compartilhado/testes/armazenamento.test.js` |
| Troca da chave Pix | Chave, nome e cidade vêm **somente** de `configurações/configuração-pública.json` publicado; nunca da URL, do armazenamento local ou de importação; formato validado (CPF/CNPJ com dígitos, telefone, e-mail, chave aleatória); código recusado se algum dado faltar | `configuração/validar-configuração.js`, `apoio/gerar-payload-pix.js`; testes de Pix |
| Pix com valor divergente | Valor em centavos inteiros, validado; QR e Copia e Cola vêm do mesmo texto; mudar o valor apaga o código anterior; CRC conferido e QR decodificado por leitor independente (jsQR) | `compartilhado/testes/pix.test.js`; teste no navegador |
| Falsa confirmação de pagamento | Não existe confirmação: a interface agradece a intenção e explica que a conferência é do recebedor | `conteúdo/comum/apoiar.html` |
| Link de orçamento adulterado ou malicioso | Fragmento `#` (não vai ao servidor); tamanho máximo do código (12 000); descompressão limitada a 64 KB (contra “bomba”); JSON seguro; revalidação completa; aviso ao cliente de que o site não confere os valores; página com `noindex` | `orçamento/decodificar-orçamento-do-link.js`; `compartilhado/testes/orçamento.test.js` |
| Injeção em arquivos exportados | SVG/XML com `escaparXml`; planilha grava texto como string em linha (nunca fórmula); CSV neutraliza `= + - @`; PDF escapa parênteses e barras | `validação/escapar-*.js`, `exportação/gerar-planilha-xlsx.js`, `pdf/criar-documento-pdf.js`; testes |
| URLs perigosas na configuração | Portfólio e contato só `https:` ou `mailto:`; `javascript:`, `data:`, `http:` e credenciais em URL são recusados | `validação/validar-url-externa.js`; testes |
| Publicidade antes do consentimento | Nenhum script de anúncio é carregado sem configuração completa **e** aceite; carregamento único; falha de rede recolhe os espaços | `publicidade/*.js`; teste no navegador (0 scripts carregados após recusa) |
| Enquadramento (clickjacking), MIME sniffing, vazamento de referência | `frame-ancestors 'none'` e `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` via cabeçalho HTTP | `.htaccess` gerado em `publicação/`, `hospedagem/nginx-exemplo.conf`, `ferramentas/servir.mjs` |
| Dependências | Uma única biblioteca em tempo de execução (qrcode-generator, MIT), carregada sob demanda; versões fixadas; `npm audit` sem vulnerabilidades na instalação | `package.json`, `licenças-de-terceiros.md` |
| Segredos no pacote | Não há segredos: a configuração é pública por definição; o construtor recusa arquivos de teste, `.env`, mapas de código e referências fora do produto | `ferramentas/construir.mjs` |

## Política de segurança de conteúdo (CSP)

**Perfil sem anúncios (atual, aplicado):**

```text
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```

Enviado como cabeçalho HTTP pelo `.htaccess` (Apache) e pelo exemplo Nginx. Uma tag `<meta>` não substitui `frame-ancestors`; por isso não é usada.

**Perfil com anúncios (pendente de configuração e validação com a conta real):** a orientação atual do Google para AdSense recomenda CSP estrita com **nonce** e `'strict-dynamic'`. Um nonce precisa ser imprevisível e novo a cada resposta, o que uma hospedagem apenas de arquivos não faz. Caminhos possíveis, a decidir quando a publicidade for ativada:

1. Servidor que injete o nonce por resposta (por exemplo, Nginx com `sub_filter` e a variável `$request_id`, ou uma função de borda da hospedagem), aplicando o mesmo valor ao cabeçalho e aos `<script>` do HTML, sem cache compartilhado de HTML entre respostas.
2. Enquanto isso, publicar a política de anúncios em modo `Content-Security-Policy-Report-Only` para diagnóstico, mantendo a política estrita sem anúncios em vigor até a validação.

Não foi inventada uma lista fixa de domínios publicitários. Antes de ligar os anúncios, siga `como-conectar-o-adsense.md` e revalide esta seção.

## Anticlonagem: objetivo realista

HTML, CSS, JavaScript e imagens entregues ao navegador **podem ser copiados**. Não existe anticlonagem absoluta de site estático. O que foi feito:

- identificação de autoria (“Criado por Anderson”, `meta author`, `LICENÇA.txt` com direitos reservados);
- `manifesto-de-integridade.json` com SHA-256 de cada arquivo publicado, para provar a versão original;
- recursos autorais identificáveis (paletas, símbolo espiral, textos);
- nenhum mapa de código publicado.

Não foi feito, de propósito: bloqueio de botão direito, seleção ou atalhos, código que se autodestrói, redirecionamento de cópias ou bloqueio de domínio em JavaScript (removível e prejudicial à acessibilidade). `ads.txt` protege a venda do inventário publicitário, não o código. CSP protege a execução, não impede download.

## Limites conhecidos

- Prefixos de armazenamento (`doce-ofício:`, `folha-pronta:` …) evitam colisões, **mas não isolam** produtos publicados na mesma origem: páginas da mesma origem podem ler o armazenamento umas das outras. Para isolamento real, publique cada produto em subdomínio próprio.
- Um link de orçamento pode ser forjado por qualquer pessoa; sem servidor, não há assinatura verificável. A página avisa isso.
- Testes automatizados reduzem, mas não eliminam, a possibilidade de defeitos.
- HSTS fica comentado no `.htaccess`: ative somente depois de confirmar HTTPS em todo o domínio e subdomínios.
- Backend (seção 18 do prompt): não aplicável.
