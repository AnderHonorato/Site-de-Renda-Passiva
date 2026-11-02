/** Preencher formulário em PDF: lista os campos do PDF para você preencher e grava os valores, no próprio navegador. */
import { montarFerramenta, ErroDeEntrada, nomeDeArquivo } from '../núcleo/montador.js';
import { baixarPdf } from '../núcleo/exportar.js';
import { formatarTamanho, TAMANHO_MÁXIMO_POR_ARQUIVO } from '../cálculos/pdf.js';
import { mensagemDeErroDoPdfÚnico } from '../cálculos/pdf-páginas.js';
import {
  lerCamposDoFormulário, preencherFormulário, mensagemDeErroDeFormulário, textoDePáginas, LIMITE_DE_CAMPOS, LIMITE_DO_VALOR,
} from '../cálculos/preencher-formulario-pdf.js';
import { montarEscolhaDeArquivos, validarPdfDaEscolha } from './auxiliares/escolher-arquivos.js';
import { prepararExecução } from './auxiliares/execução-longa.js';
import { carregarBiblioteca, ERRO_DE_BIBLIOTECA } from './auxiliares/biblioteca-pdf.js';

const número = (valor) => valor.toLocaleString('pt-BR');

export default {
  instruções: {
    passos: [
      'Toque em "Escolher PDF" ou arraste o arquivo para o quadro. Ele é lido no seu navegador, sem envio para servidor. Se o PDF tiver campos de formulário, eles aparecem numa lista logo abaixo.',
      'Preencha os campos: escreva nos de texto, marque as caixas, escolha uma opção nos botões de opção e nas listas. Campos protegidos pelo próprio PDF aparecem desligados.',
      'Se quiser que ninguém mais edite os campos, marque "Achatar o formulário". Sem isso, o PDF continua preenchível.',
      'Toque em "Gerar PDF preenchido" e baixe o arquivo. O original continua intacto no seu aparelho.',
    ],
    exemplo: {
      texto: 'Um formulário com os campos "nome", "cidade" (lista) e "aceite" (caixa): você escreve Ana Teste, escolhe Recife e marca o aceite. '
        + 'Sem achatar, o PDF gerado ainda tem os três campos, já preenchidos. Achatando, os campos desaparecem e "Ana Teste" passa a ser parte fixa da página.',
    },
    limites: `PDF de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}, com até ${LIMITE_DE_CAMPOS.toLocaleString('pt-BR')} campos e até ${LIMITE_DO_VALOR.toLocaleString('pt-BR')} caracteres por campo de texto. `
      + 'O arquivo é reconhecido pelo conteúdo, não pela extensão. PDF protegido por senha não pode ser preenchido: salve uma cópia sem proteção. '
      + 'Só funcionam PDFs que JÁ TÊM campos de formulário (AcroForm). Se o PDF não tiver, a ferramenta avisa: ela não cria campos nem escreve em qualquer lugar da página. '
      + 'Formulários no formato XFA (alguns documentos antigos de governo) não são suportados. Num formulário que traz os dois formatos, o XFA é removido para valerem os campos preenchidos. '
      + 'Os valores usam uma fonte padrão do PDF: letras com acento e a pontuação comum funcionam; setas, emojis e letras de outros alfabetos não. '
      + 'Campos calculados por programação (JavaScript) do PDF não são recalculados aqui. Preencher um PDF que já tem assinatura digital invalida essa assinatura. '
      + 'Campos de assinatura e botões não são preenchidos. A biblioteca usada é a pdf-lib (licença MIT), que roda dentro da página.',
    perguntas: [
      {
        p: 'Meu PDF é enviado para algum servidor?',
        r: 'Não. A biblioteca é baixada com a página e roda no seu navegador; o arquivo não sai do aparelho.',
      },
      {
        p: 'A ferramenta disse que o PDF não tem campos. O que faço?',
        r: 'Ele é um PDF comum, em que o formulário é só um desenho. Esta ferramenta preenche apenas campos de formulário de verdade. Peça uma versão preenchível ao emissor do documento.',
      },
      {
        p: 'O que significa achatar?',
        r: 'É transformar os campos preenchidos em conteúdo fixo da página, como se tivessem sido impressos. O arquivo fica sem campos, não dá mais para editar os valores, e o texto continua selecionável.',
      },
      {
        p: 'Os nomes dos campos são estranhos, como "txt_a1". Por quê?',
        r: 'São os nomes que quem fez o PDF deu aos campos. A lista mostra também a página de cada campo e o valor que já estava preenchido, para ajudar a achá-los.',
      },
    ],
  },

  montar(raiz, ferramenta) {
    let escolha;
    let execução;
    let blocoDosCampos;
    /** Campos lidos do arquivo escolhido e os elementos da tela que os controlam. */
    let lidos = null;
    /** @type {{campo: any, ler: () => any}[]} */
    let controles = [];

    function limparCampos() {
      lidos = null;
      controles = [];
      blocoDosCampos.replaceChildren();
      blocoDosCampos.hidden = true;
    }

    /** Desenha um controle por campo com `textContent` e `value`: nome e valores vêm do PDF e nunca entram como HTML. */
    function desenharCampos({ campos, avisos }) {
      blocoDosCampos.replaceChildren();
      controles = [];
      const título = document.createElement('h3');
      título.textContent = 'Campos do formulário';
      blocoDosCampos.append(título);

      if (avisos.includes('xfa')) aviso('Este PDF também traz um formulário XFA. Ele será removido na saída para valerem os campos preenchidos.');
      if (avisos.includes('calculado')) aviso('Este formulário tem campos calculados por programação do PDF. Os cálculos não são refeitos aqui: confira os totais.');
      if (avisos.includes('assinado')) aviso('Este PDF tem uma assinatura digital. Preencher o formulário invalida essa assinatura.');

      let páginaAtual = null;
      for (const [i, campo] of campos.entries()) {
        if (campo.página !== páginaAtual) {
          páginaAtual = campo.página;
          const cabeça = document.createElement('h4');
          cabeça.textContent = páginaAtual ? `Página ${páginaAtual}` : 'Página não identificada';
          blocoDosCampos.append(cabeça);
        }
        const id = `pdfcampo-${i}`;
        const bloco = document.createElement('div');
        bloco.className = 'campo';
        const rótulo = (para, texto) => {
          const l = document.createElement('label');
          if (para) l.htmlFor = para;
          l.textContent = texto;
          return l;
        };
        const nota = (texto) => {
          const n = document.createElement('span');
          n.className = 'campo__dica';
          n.textContent = texto;
          return n;
        };
        const sufixo = campo.obrigatório ? ' (obrigatório)' : '';

        if (campo.tipo === 'texto') {
          const entrada = campo.multilinha ? document.createElement('textarea') : document.createElement('input');
          if (campo.multilinha) entrada.rows = 4; else entrada.type = campo.senha ? 'password' : 'text';
          entrada.id = id;
          entrada.value = campo.valor ?? '';
          entrada.maxLength = Math.min(campo.tamanhoMáximo ?? LIMITE_DO_VALOR, LIMITE_DO_VALOR);
          entrada.autocomplete = 'off';
          entrada.disabled = campo.somenteLeitura;
          bloco.append(rótulo(id, `${campo.nome}${sufixo}`), entrada);
          if (campo.tamanhoMáximo) bloco.append(nota(`Até ${número(campo.tamanhoMáximo)} caracteres.`));
          controles.push({ campo, ler: () => entrada.value });
        } else if (campo.tipo === 'caixa') {
          bloco.className = 'campo campo--linha';
          const entrada = document.createElement('input');
          entrada.type = 'checkbox';
          entrada.id = id;
          entrada.checked = Boolean(campo.valor);
          entrada.disabled = campo.somenteLeitura;
          bloco.append(entrada, rótulo(id, `${campo.nome}${sufixo}`));
          controles.push({ campo, ler: () => entrada.checked });
        } else if (campo.tipo === 'opções') {
          // Grupo de botões de opção sem <fieldset>, que traria a borda padrão do navegador.
          const grupo = document.createElement('div');
          grupo.setAttribute('role', 'radiogroup');
          grupo.setAttribute('aria-labelledby', `${id}-título`);
          const legenda = document.createElement('p');
          legenda.id = `${id}-título`;
          legenda.className = 'rótulo';
          legenda.textContent = `${campo.nome}${sufixo}`;
          grupo.append(legenda);
          const nomeDoGrupo = `${id}-opção`;
          const opções = ['', ...campo.opções];
          const entradas = opções.map((opção, k) => {
            const linha = document.createElement('div');
            linha.className = 'campo campo--linha';
            const r = document.createElement('input');
            r.type = 'radio';
            r.name = nomeDoGrupo;
            r.id = `${id}-${k}`;
            r.value = opção;
            r.checked = (campo.valor ?? '') === opção;
            r.disabled = campo.somenteLeitura;
            linha.append(r, rótulo(r.id, opção === '' ? '(nenhuma)' : opção));
            grupo.append(linha);
            return r;
          });
          bloco.append(grupo);
          controles.push({ campo, ler: () => { const marcada = entradas.find((e) => e.checked); return marcada && marcada.value !== '' ? marcada.value : null; } });
        } else if (campo.tipo === 'lista') {
          const seleção = document.createElement('select');
          seleção.id = id;
          seleção.disabled = campo.somenteLeitura;
          if (campo.múltipla) {
            seleção.multiple = true;
            seleção.size = Math.min(6, Math.max(3, campo.opções.length));
          } else {
            const vazio = document.createElement('option');
            vazio.value = '';
            vazio.textContent = '(nenhuma)';
            seleção.append(vazio);
          }
          const marcadas = new Set(campo.múltipla ? campo.valor : [campo.valor]);
          for (const opção of campo.opções) {
            const o = document.createElement('option');
            o.value = opção;
            o.textContent = opção;
            o.selected = marcadas.has(opção);
            seleção.append(o);
          }
          bloco.append(rótulo(id, `${campo.nome}${sufixo}`), seleção);
          if (campo.múltipla) bloco.append(nota('Para marcar mais de uma, mantenha Ctrl (ou Cmd) pressionado.'));
          controles.push({
            campo,
            ler: () => (campo.múltipla ? [...seleção.selectedOptions].map((o) => o.value) : (seleção.value === '' ? null : seleção.value)),
          });
        } else {
          const nomeDoTipo = campo.tipo === 'assinatura' ? 'campo de assinatura' : campo.tipo === 'botão' ? 'botão' : 'campo';
          const p = document.createElement('p');
          p.className = 'pequeno suave';
          p.textContent = `${campo.nome}: ${nomeDoTipo}, não é preenchido aqui.`;
          bloco.append(p);
        }
        blocoDosCampos.append(bloco);
      }
      blocoDosCampos.hidden = false;
    }

    function aviso(texto) {
      const p = document.createElement('p');
      p.className = 'pequeno';
      p.setAttribute('role', 'note');
      p.textContent = texto;
      blocoDosCampos.append(p);
    }

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Gerar PDF preenchido',
      demorada: true,
      campos: [
        {
          nome: 'arquivo', rótulo: 'Arquivo PDF', tipo: 'file',
          dica: `Um PDF com campos de formulário, de até ${formatarTamanho(TAMANHO_MÁXIMO_POR_ARQUIVO)}. Ele é lido no seu navegador e não sai do aparelho.`,
        },
        { nome: 'achatar', rótulo: 'Achatar o formulário (os campos viram texto fixo e deixam de ser editáveis)', tipo: 'caixa', padrão: false },
      ],

      async calcular(dados) {
        const itens = escolha.itens();
        if (itens.length === 0 || !lidos) throw new ErroDeEntrada(mensagemDeErroDoPdfÚnico('sem_arquivo'), 'arquivo');
        // Os valores vêm da tela; só o que mudou será gravado pelo cálculo.
        const valores = {};
        for (const { campo, ler } of controles) {
          if (['texto', 'caixa', 'opções', 'lista'].includes(campo.tipo) && !campo.somenteLeitura) valores[campo.nome] = ler();
        }

        return execução.executar(async () => {
          const { progresso } = execução;
          progresso.andar(4, 'Preparando a biblioteca de PDF…');
          let biblioteca;
          try {
            biblioteca = await carregarBiblioteca();
          } catch {
            throw new Error(ERRO_DE_BIBLIOTECA);
          }
          progresso.andar(10, 'Lendo o arquivo…');
          const { nome, arquivo } = itens[0];
          const bytes = new Uint8Array(await arquivo.arrayBuffer());

          progresso.andar(20, 'Gravando os valores…');
          const r = await preencherFormulário({ nome, bytes }, {
            biblioteca, valores, achatar: dados.achatar === 'sim', cancelado: execução.cancelado,
            aoProgredir: ({ campo, total }) => progresso.andar(20 + (70 * campo) / total, `Campo ${número(campo)} de ${número(total)}`),
          });

          if (!r.ok) {
            if (r.erro === 'cancelado') throw new Error(mensagemDeErroDoPdfÚnico('cancelado'));
            const campoDoErro = r.erro === 'achatar_falhou' ? 'achatar' : 'arquivo';
            // Erro de valor aponta o campo do PDF no texto da mensagem; o campo da tela é o do arquivo.
            throw new ErroDeEntrada(mensagemDeErroDeFormulário(r.erro, { nome, ...r.extras }), campoDoErro);
          }

          const base = nomeDeArquivo(nome.replace(/\.pdf$/i, '')) || 'documento';
          const observações = [];
          if (r.avisos.includes('xfa_removido')) observações.push('O formulário XFA que acompanhava os campos foi removido, para valerem os valores preenchidos.');
          if (r.ignorados.length) observações.push(`${r.ignorados.length} ${r.ignorados.length === 1 ? 'campo não pôde' : 'campos não puderam'} ser preenchido${r.ignorados.length === 1 ? '' : 's'} (somente leitura, assinatura ou botão).`);
          observações.push('O arquivo foi lido no seu navegador e nada foi enviado. O original continua intacto no seu aparelho.');
          return {
            valor: `${número(r.alterados.length)} ${r.alterados.length === 1 ? 'campo preenchido' : 'campos preenchidos'}`,
            resumo: `${nome}: ${textoDePáginas(r.páginas)} · ${r.achatado ? 'campos achatados (não editáveis)' : 'continua preenchível'} · ${formatarTamanho(r.bytes.length)}.`,
            linhas: r.alterados.slice(0, 6).map((n) => ['Campo', n]).concat(r.alterados.length > 6 ? [['…', `e mais ${número(r.alterados.length - 6)}`]] : []),
            arquivos: [{ rótulo: 'Baixar PDF', ícone: 'baixar', gerar: () => baixarPdf(r.bytes, `${base}-preenchido`) }],
            observações,
          };
        });
      },

      aoMontar(elemento) {
        blocoDosCampos = document.createElement('div');
        blocoDosCampos.className = 'prosa t-3';
        // Ocupa a largura toda: os campos do PDF não devem ficar espremidos ao lado da lista do arquivo.
        blocoDosCampos.style.gridColumn = '1 / -1';
        blocoDosCampos.hidden = true;
        blocoDosCampos.setAttribute('role', 'group');
        blocoDosCampos.setAttribute('aria-label', 'Campos do formulário');

        escolha = montarEscolhaDeArquivos(elemento, {
          campo: 'arquivo',
          rótuloDoBotão: 'Escolher PDF',
          accept: 'application/pdf,.pdf',
          rótuloDaLista: 'PDF escolhido',
          textoDoVazio: 'Nenhum PDF escolhido ainda. Arraste o arquivo para este quadro ou use o botão "Escolher PDF".',
          textoDeSolte: 'Solte o PDF para escolher.',
          async validar(arquivo, começo) {
            const básica = await validarPdfDaEscolha(arquivo, começo);
            if (básica.erro) return básica;
            // Abre já na escolha: senha, dano e falta de campos aparecem agora, e os campos alimentam a tela.
            let biblioteca;
            try {
              biblioteca = await carregarBiblioteca();
            } catch {
              return { erro: ERRO_DE_BIBLIOTECA };
            }
            const r = await lerCamposDoFormulário({ nome: arquivo.name, bytes: new Uint8Array(await arquivo.arrayBuffer()) }, { biblioteca });
            if (!r.ok) return { erro: mensagemDeErroDeFormulário(r.erro, r.extras) };
            lidos = r;
            desenharCampos(r);
            return { extra: `${textoDePáginas(r.páginas)} · ${número(r.preenchíveis)} ${r.preenchíveis === 1 ? 'campo' : 'campos'} para preencher` };
          },
          aoMudar: (itens) => { if (itens.length === 0) limparCampos(); },
        });
        execução = prepararExecução(elemento, { escolha });
        // Os campos entram logo depois da lista do arquivo, antes das opções de saída.
        elemento.querySelector('[aria-label="PDF escolhido"]').after(blocoDosCampos);
        elemento.querySelector('#formulário').addEventListener('reset', limparCampos);
      },
    });
  },
};
