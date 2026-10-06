# Licenças de terceiros

Todas as dependências são gratuitas, com versão fixada em `package.json` e licença preservada.

| Componente | Versão | Licença | Uso | Vai para o site publicado? |
|---|---|---|---|---|
| Inter variável (via @fontsource-variable/inter) | 5.3.0 | SIL Open Font License 1.1 | Interface, títulos e vitrine animada | Sim — `recursos/fontes/` e `vitrine/fontes/`, com `OFL-inter.txt` em cada `licenças/` |
| Lucide (lucide-static) | 1.46.0 | ISC | Ícones (somente os usados, em sprite) | Sim — `recursos/ícones/ícones.svg` + `LICENÇA-lucide.txt` |
| qrcode-generator (Kazuhiko Arase) | 2.0.4 | MIT | Gerar o QR Code do Pix | Sim — `recursos/bibliotecas/qrcode.mjs` + `LICENSE-qrcode-generator.txt` |
| pdf-lib (Andrew Dillon), com @pdf-lib/standard-fonts, @pdf-lib/upng, pako e tslib embutidos no build | 1.17.1 | MIT (pako: MIT e Zlib; tslib 1.x: Apache-2.0, cabeçalho preservado no build) | Juntar PDF, no próprio navegador | Sim — `portal/recursos/pdf-lib.esm.min.js` (build ES module `dist/pdf-lib.esm.min.js`, copiado sem alteração) + `portal/recursos/LICENSE-pdf-lib.txt`; carregado por import dinâmico só na página Juntar PDF |
| jsQR (cozmo/jsQR) | 1.4.0 | Apache-2.0 | Ler QR Code de imagem (Ler QR Code), quando o navegador não tem o leitor nativo `BarcodeDetector`; também conferência independente do gerador de QR nos testes | Sim — `portal/recursos/jsQR.js` (`dist/jsQR.js` do pacote npm `jsqr@1.4.0`, copiado sem alteração; integridade `sha512-dxLob7q65Xg2DvstYkRpkYtmKm2sPJ9oFhrhmudT1dZvNFFTlroai3AWSpLey/w5vMcLBXRgOJsbXpdN9HzU/A==`) + `portal/recursos/LICENSE-jsQR.txt` (LICENSE do repositório oficial github.com/cozmo/jsQR, mesmo blob `8f71f43`); carregado por import dinâmico só na página Ler QR Code |

As fontes são hospedadas localmente (nenhuma requisição ao Google Fonts). O símbolo espiral e as ilustrações são autorais, derivados do modelo `modelo/Modelo de Site.dc.html` fornecido pelo proprietário. Nenhuma imagem, personagem ou molde de terceiros foi incorporado.

Código e conteúdo autorais: © 2026 Anderson, todos os direitos reservados (arquivo `LICENÇA.txt` de cada produto). O proprietário pode trocar essa licença.
