/** QR Code de link, texto, Wi-Fi ou contato, gerado no navegador. */
import { montarFerramenta, texto, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { gerarSvgQr } from '../comum/qr/gerar-svg-qr.js';

/** Escapa os caracteres reservados do formato WIFI: e MECARD:. */
const escaparCampo = (valor) => String(valor).replace(/([\\;,:"])/g, '\\$1');

/** Monta o conteúdo do QR conforme o tipo escolhido. */
function montarConteúdo(dados) {
  if (dados.tipo === 'link') {
    const endereço = texto(dados, 'principal', { rótulo: 'Endereço', máximo: 2000 });
    if (!/^https?:\/\//i.test(endereço)) {
      throw new ErroDeEntrada('O endereço precisa começar com http:// ou https://.', 'principal');
    }
    return endereço;
  }
  if (dados.tipo === 'wifi') {
    const rede = texto(dados, 'principal', { rótulo: 'Nome da rede', máximo: 60 });
    const senha = texto(dados, 'secundário', { rótulo: 'Senha da rede', obrigatório: false, máximo: 120 });
    const segurança = senha ? 'WPA' : 'nopass';
    return `WIFI:T:${segurança};S:${escaparCampo(rede)};${senha ? `P:${escaparCampo(senha)};` : ''};`;
  }
  if (dados.tipo === 'contato') {
    const nome = texto(dados, 'principal', { rótulo: 'Nome', máximo: 80 });
    const telefone = texto(dados, 'secundário', { rótulo: 'Telefone', obrigatório: false, máximo: 30 });
    return `MECARD:N:${escaparCampo(nome)};${telefone ? `TEL:${escaparCampo(telefone)};` : ''};`;
  }
  return texto(dados, 'principal', { rótulo: 'Texto', máximo: 1200 });
}

export default {
  instruções: {
    passos: [
      'Escolha o tipo: link, texto livre, rede Wi-Fi ou contato.',
      'Preencha os campos. O segundo campo muda de sentido conforme o tipo.',
      'O código aparece na hora. Confira apontando a câmera do celular antes de imprimir.',
      'Baixe em SVG para impressão em qualquer tamanho, ou em PNG para usar na tela.',
    ],
    exemplo: {
      texto: 'Para o Wi-Fi da loja: tipo "rede Wi-Fi", nome da rede no primeiro campo e senha no segundo. '
        + 'Quem apontar a câmera se conecta sem digitar nada.',
    },
    limites: 'O QR é gerado dentro do seu navegador: nem o link nem a senha do Wi-Fi saem do aparelho. '
      + 'O SVG é vetorial e não perde qualidade ao ampliar; prefira ele para impressão. '
      + 'Textos muito longos geram códigos densos e difíceis de ler: para links grandes, use um encurtador antes.',
    perguntas: [
      { p: 'O QR Code expira?', r: 'Não. Ele contém o conteúdo em si, não um link para este site. Funciona para sempre, mesmo se o portal sair do ar.' },
      { p: 'Posso colocar a senha do meu Wi-Fi?', r: 'Pode: ela é codificada aqui no seu navegador e nunca é enviada. Lembre que quem escanear o código terá a senha, então cuidado com onde você cola o papel.' },
    ],
  },

  montar(raiz, ferramenta) {
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Gerar QR Code',
      campos: [
        {
          nome: 'tipo', rótulo: 'Tipo de conteúdo', tipo: 'seleção', padrão: 'link',
          opções: [
            { valor: 'link', rótulo: 'Link (endereço da web)' },
            { valor: 'texto', rótulo: 'Texto livre' },
            { valor: 'wifi', rótulo: 'Rede Wi-Fi' },
            { valor: 'contato', rótulo: 'Contato' },
          ],
        },
        { nome: 'principal', rótulo: 'Endereço', exemplo: 'https://exemplo.com.br' },
        { nome: 'secundário', rótulo: 'Campo complementar', dica: 'Senha da rede ou telefone do contato, conforme o tipo.' },
      ],
      async calcular(dados) {
        const conteúdo = montarConteúdo(dados);
        const { default: qrcode } = await import('../../recursos/qrcode.mjs');
        const { svg, módulos } = gerarSvgQr(conteúdo, qrcode, { escala: 8 });

        // Mostra o código já na área de resultado, acima dos botões.
        queueMicrotask(() => {
          const alvo = raiz.querySelector('#resultado .resultado__valor');
          if (alvo) {
            alvo.innerHTML = svg;
            alvo.classList.add('qr-prévia');
          }
        });

        return {
          valor: 'QR Code gerado',
          resumo: `${módulos} × ${módulos} módulos · ${conteúdo.length} caracteres codificados.`,
          texto: conteúdo,
          arquivos: [
            {
              rótulo: 'Baixar SVG',
              ícone: 'baixar',
              gerar: () => baixar(svg, `${nomeDeArquivo('qr-code')}.svg`, 'image/svg+xml;charset=utf-8'),
            },
            {
              rótulo: 'Baixar PNG',
              ícone: 'imagem',
              gerar: () => {
                const imagem = new Image();
                const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                imagem.addEventListener('load', () => {
                  const tela = document.createElement('canvas');
                  tela.width = 1024;
                  tela.height = 1024;
                  const pincel = tela.getContext('2d');
                  pincel.fillStyle = '#ffffff';
                  pincel.fillRect(0, 0, 1024, 1024);
                  pincel.imageSmoothingEnabled = false;
                  pincel.drawImage(imagem, 0, 0, 1024, 1024);
                  tela.toBlob((png) => {
                    if (png) baixar(png, `${nomeDeArquivo('qr-code')}.png`, 'image/png');
                    URL.revokeObjectURL(url);
                  }, 'image/png');
                });
                imagem.src = url;
              },
            },
          ],
          observações: ['Confira o código com a câmera do celular antes de imprimir ou publicar.'],
        };
      },
      aoMontar(elemento) {
        // Os rótulos dos campos acompanham o tipo escolhido.
        const RÓTULOS = {
          link: ['Endereço', 'Não usado neste tipo'],
          texto: ['Texto', 'Não usado neste tipo'],
          wifi: ['Nome da rede (SSID)', 'Senha da rede'],
          contato: ['Nome do contato', 'Telefone'],
        };
        const seleção = elemento.querySelector('#campo-tipo');
        const principal = elemento.querySelector('label[for="campo-principal"]');
        const secundário = elemento.querySelector('label[for="campo-secundário"]');
        const campoSecundário = elemento.querySelector('#campo-secundário');
        const sincronizar = () => {
          const [a, b] = RÓTULOS[seleção.value];
          principal.textContent = a;
          secundário.textContent = b;
          const usado = seleção.value === 'wifi' || seleção.value === 'contato';
          campoSecundário.disabled = !usado;
          campoSecundário.closest('.campo').classList.toggle('campo--inativo', !usado);
        };
        seleção.addEventListener('change', sincronizar);
        sincronizar();
      },
    });
  },
};
