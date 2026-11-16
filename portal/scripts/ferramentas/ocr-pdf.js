/** PDF escaneado para PDF pesquisável e texto revisável, sem servidor de OCR. */
import { montarOCR } from './auxiliares/ocr-interface.js';
export default {
  instruções: {
    passos: [
      'Escolha um PDF escaneado, de até 20 MB e 20 páginas. A primeira página aparece na prévia.',
      'Escolha português, inglês ou espanhol e, se quiser, informe somente algumas páginas, como 1-3, 5.',
      'Toque em “Reconhecer PDF”. Cada página escolhida é desenhada como imagem e recebe uma camada de texto pesquisável.',
      'Confira a prévia do PDF gerado e baixe o arquivo pesquisável. Revise o texto separado antes de copiar ou baixar o TXT.',
    ],
    exemplo: { texto: 'Um contrato escaneado em que não dá para selecionar uma palavra ganha uma camada de texto. O botão de exemplo cria um PDF feito de imagem para você testar o reconhecimento real.' },
    limites: 'PDF de até 20 MB e 20 páginas; documentos com senha não são aceitos. O resultado contém somente as páginas escolhidas, na ordem do documento, e mantém suas dimensões e orientação visível. Cada página é rasterizada a até 300 dpi e 8 megapixels; a página original é substituída pela imagem com texto invisível. Links, formulários, anexos, camadas e assinaturas digitais não são preservados. O PDF final pode ter até 100 MB e o texto até um milhão de caracteres. O reconhecimento funciona melhor com texto impresso e pode trocar letras, acentos e números. A confiança estimada não garante a precisão. Corrigir o campo de texto altera copiar e baixar TXT, mas não reescreve a camada do PDF. O motor é carregado do próprio site e o processamento acontece neste navegador; nenhum documento é enviado a um serviço de OCR.',
    perguntas: [
      { p: 'O PDF continuará com a mesma aparência?', r: 'A orientação e as dimensões visíveis são mantidas, mas cada página vira uma imagem com uma camada de texto. A resolução é limitada e os recursos interativos do original não são preservados.' },
      { p: 'As correções no texto atualizam o PDF pesquisável?', r: 'Não. As correções são usadas ao copiar e baixar o TXT. O PDF mantém o texto que o motor reconheceu originalmente.' },
      { p: 'Meu PDF já tem texto selecionável. Preciso de OCR?', r: 'Normalmente não. Use “Extrair texto do PDF” para aproveitar o texto original, com mais velocidade e sem possíveis erros de reconhecimento.' },
    ],
  },
  montar(raiz, ferramenta) { montarOCR(raiz, ferramenta, { pdf: true }); },
};
