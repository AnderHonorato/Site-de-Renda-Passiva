/** Texto de imagens, reconhecido localmente e disponível para revisão. */
import { montarOCR } from './auxiliares/ocr-interface.js';
export default {
  instruções: {
    passos: [
      'Escolha uma foto ou um print em JPG, PNG ou WebP. Confira a imagem na prévia, ou experimente o documento de exemplo.',
      'Selecione português, inglês ou espanhol de acordo com o texto da imagem.',
      'Toque em “Reconhecer texto”. O motor será carregado do próprio site na primeira utilização e o reconhecimento acontece no seu aparelho.',
      'Revise as letras, os acentos e os números no resultado. Copie o texto revisado ou baixe um arquivo TXT.',
    ],
    exemplo: { texto: 'Uma foto de recibo pode virar “Cliente: Ana Silva / Valor total: R$ 1.250,00”. O botão de exemplo prepara uma imagem real e usa o mesmo reconhecimento dos seus arquivos.' },
    limites: 'Uma imagem por vez, até 10 MB, 20 megapixels e 16.384 pixels de lado. Imagens grandes são reduzidas para até 8 megapixels durante o reconhecimento, com aviso. JPG, PNG e WebP; animações, SVG e HEIC não são aceitos. O resultado tem até um milhão de caracteres. Funciona melhor com texto impresso, reto, legível e bem iluminado. Letras manuscritas, fundos estampados, sombras e documentos inclinados podem gerar erros. A confiança estimada não garante a precisão. O motor e os idiomas são recursos locais carregados conforme o uso; aparelhos com pouca memória podem precisar de uma imagem menor. Nenhuma imagem é enviada a um serviço de reconhecimento.',
    perguntas: [
      { p: 'É preciso uma chave de IA para reconhecer o texto?', r: 'Não. O reconhecimento usa Tesseract no navegador, sem chave de IA e sem enviar a imagem a um servidor de OCR.' },
      { p: 'Dá para corrigir o texto antes de baixar?', r: 'Sim. O campo de resultado pode ser editado. Copiar texto e baixar TXT usam a revisão que estiver nesse campo.' },
      { p: 'Por que alguns números ou acentos saíram trocados?', r: 'O reconhecimento depende do idioma e da nitidez. Confira esses dados e tente outra foto, com o documento reto e sem sombras.' },
    ],
  },
  montar(raiz, ferramenta) { montarOCR(raiz, ferramenta); },
};
