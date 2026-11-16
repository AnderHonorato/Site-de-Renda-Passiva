/** Scanner de documentos: edição explícita das fotos, sem serviço remoto ou correção de perspectiva simulada. */
import {
  montarFerramenta,
  ErroDeEntrada,
  baixar,
  nomeDeArquivo,
} from "../núcleo/montador.js";
import { criarProgresso } from "../núcleo/interface.js";
import {
  carregarBiblioteca,
  ERRO_DE_BIBLIOTECA,
} from "./auxiliares/biblioteca-pdf.js";
import { lerImagem } from "../cálculos/imagens-em-pdf.js";
import {
  ajusteInicial,
  geometriaDigitalizacao,
  tratarPixels,
  gerarPdfDigitalizado,
  validarAjuste,
  LIMITE_IMAGENS,
  LIMITE_IMAGEM_BYTES,
  LIMITE_TOTAL_BYTES,
  LIMITE_PIXELS,
} from "../cálculos/digitalizar-para-pdf.js";

const el = (tag, classe, texto) => {
  const n = document.createElement(tag);
  if (classe) n.className = classe;
  if (texto !== undefined) n.textContent = texto;
  return n;
};
const blobDaTela = (canvas, tipo = "image/jpeg", qualidade = 0.92) =>
  new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(
              Error(
                "Não foi possível preparar a imagem. Reduza as dimensões da foto e tente de novo.",
              ),
            ),
      tipo,
      qualidade,
    ),
  );

async function desenharFoto(pagina, canvas, ladoMaximo) {
  let bitmap;
  try {
    // O navegador aplica EXIF inclusive espelhos e giro de 180°. Não aplique a orientação duas vezes.
    bitmap = await createImageBitmap(pagina.arquivo, {
      imageOrientation: "from-image",
    });
    const g = geometriaDigitalizacao(
      bitmap.width,
      bitmap.height,
      pagina.ajuste,
      ladoMaximo,
    );
    canvas.width = g.largura;
    canvas.height = g.altura;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx)
      throw Error(
        "Seu navegador não conseguiu preparar a imagem. Tente uma foto menor.",
      );
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(g.largura / g.recorteLargura, g.altura / g.recorteAltura);
    ctx.translate(-g.x, -g.y);
    ctx.translate(g.giradaLargura / 2, g.giradaAltura / 2);
    ctx.rotate((pagina.ajuste.giro * Math.PI) / 180);
    ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    ctx.restore();
    if (pagina.ajuste.modo !== "cores" || pagina.ajuste.contraste !== 0) {
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      tratarPixels(pixels.data, pagina.ajuste);
      ctx.putImageData(pixels, 0, 0);
    }
    return g;
  } catch (erro) {
    if (erro instanceof Error && erro.constructor === Error) throw erro;
    throw Error(
      "Não foi possível abrir esta foto. Escolha um JPG, PNG ou WebP válido.",
    );
  } finally {
    bitmap?.close();
  }
}

export default {
  instruções: {
    passos: [
      "Escolha as fotos dos documentos ou use Fotografar para abrir a câmera disponível no celular. Os arquivos ficam neste navegador.",
      "Abra cada página para girar, cortar as bordas em porcentagem e ajustar cor, contraste ou preto e branco. A prévia mostra o corte final.",
      "Use as setas para ordenar as páginas e a lixeira para retirar uma foto. Escolha A4 ou tamanho da imagem e a qualidade do PDF.",
      "Toque em Gerar PDF. Confira a prévia do arquivo pronto e baixe o documento.",
    ],
    exemplo: {
      texto:
        "Use Carregar exemplo para editar uma foto de demonstração, ajustar o preto e branco e gerar um PDF de verdade.",
    },
    limites:
      "Até 20 fotos JPG, PNG ou WebP; 10 MB e 20 megapixels por foto, 60 MB somados. A prévia tem até 900 px no maior lado; o PDF usa fotos tratadas de até 3.000 px no maior lado, convertidas em JPEG. A4 tem margem de 6,35 mm; tamanho da imagem usa 150 dpi. O corte é manual e retangular; não detecta cantos nem corrige perspectiva. Não faz OCR nem torna o PDF pesquisável; use OCR de PDF depois. A câmera depende do seletor de arquivos do aparelho.",
    perguntas: [
      {
        p: "Preciso enviar meus documentos?",
        r: "Não. As fotos são lidas e o PDF é montado no próprio navegador.",
      },
      {
        p: "A folha torta é corrigida automaticamente?",
        r: "Não. Você pode girar em passos de 90° e cortar as bordas manualmente. Para melhores resultados, fotografe com a câmera paralela ao papel.",
      },
      {
        p: "O PDF permite pesquisar o texto?",
        r: "Este scanner cria páginas com fotos. Para reconhecer as letras, passe o arquivo na ferramenta OCR de PDF.",
      },
    ],
  },
  montar(raiz, ferramenta) {
    let paginas = [],
      ativa = 0,
      painel,
      lista,
      tela,
      editor,
      vazio,
      status,
      controles,
      input,
      escolher,
      form,
      cancelar,
      progresso;
    let carregando = false,
      exportando = false,
      versao = 0,
      renderVersao = 0,
      erroDeAjuste = "";
    const urls = new Set();
    const mensagem = (texto, erro = false) => {
      status.textContent = texto;
      status.dataset.erro = String(erro);
    };
    const invalidar = () => {
      form.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const liberar = (pagina) => {
      if (pagina.miniatura) {
        URL.revokeObjectURL(pagina.miniatura);
        urls.delete(pagina.miniatura);
      }
    };
    const travar = () => {
      const ocupada = carregando || exportando;
      painel.querySelectorAll("button,input,select").forEach((c) => {
        c.disabled = ocupada;
      });
      input.disabled = ocupada;
      escolher.disabled = ocupada;
      form.querySelector("button[type=submit]").disabled = ocupada;
      for (const c of form.querySelectorAll(
        '[data-campo="tamanho"] select,[data-campo="qualidade"] select,[data-campo="nome"] input',
      ))
        c.disabled = ocupada;
      painel.setAttribute("aria-busy", String(ocupada));
      if (!ocupada) {
        painel.querySelectorAll('[data-ordem="anterior"]').forEach((b, i) => {
          b.disabled = i === 0;
        });
        painel.querySelectorAll('[data-ordem="proxima"]').forEach((b, i) => {
          b.disabled = i === paginas.length - 1;
        });
      }
    };
    const desenharAtiva = async () => {
      const pagina = paginas[ativa],
        v = ++renderVersao;
      editor.hidden = !pagina;
      vazio.hidden = Boolean(pagina);
      erroDeAjuste = "";
      if (!pagina) {
        tela.width = tela.height = 0;
        return;
      }
      controles.querySelectorAll("[data-ajuste]").forEach((c) => {
        c.value = pagina.ajuste[c.dataset.ajuste];
        c.removeAttribute("aria-invalid");
      });
      painel.querySelector("[data-selecionada]").textContent =
        `Página ${ativa + 1} · ${pagina.nome}`;
      painel.querySelector("[data-limiar-grupo]").hidden =
        pagina.ajuste.modo !== "pb";
      const temporaria = document.createElement("canvas");
      try {
        const g = await desenharFoto(pagina, temporaria, 900);
        if (v !== renderVersao || paginas[ativa] !== pagina) return;
        tela.width = temporaria.width;
        tela.height = temporaria.height;
        tela.getContext("2d").drawImage(temporaria, 0, 0);
        tela.setAttribute(
          "aria-label",
          `Prévia da página ${ativa + 1}, ${g.largura} por ${g.altura} pixels. Corte e tratamento aplicados.`,
        );
        mensagem(
          `${paginas.length} ${paginas.length === 1 ? "página" : "páginas"} · Prévia com até 900 px; exportação com até 3.000 px no maior lado.`,
        );
      } catch (erro) {
        if (v === renderVersao) mensagem(erro.message, true);
      } finally {
        temporaria.width = temporaria.height = 0;
      }
    };
    const desenharLista = () => {
      lista.replaceChildren();
      paginas.forEach((pagina, i) => {
        const li = el("li", "scanner-doc__pagina");
        li.dataset.ativa = String(i === ativa);
        const abrir = el("button", "scanner-doc__abrir");
        abrir.type = "button";
        abrir.setAttribute(
          "aria-label",
          `Abrir página ${i + 1}: ${pagina.nome}`,
        );
        abrir.setAttribute("aria-pressed", String(i === ativa));
        const img = el("img");
        img.src = pagina.miniatura;
        img.alt = "";
        img.width = 120;
        img.height = 98;
        abrir.append(
          img,
          el("b", "", `Página ${i + 1}`),
          el("span", "scanner-doc__nome", pagina.nome),
        );
        abrir.addEventListener("click", () => {
          ativa = i;
          desenharLista();
          void desenharAtiva();
        });
        const ordem = el("div", "scanner-doc__ordem");
        for (const [acao, texto, rotulo] of [
          ["anterior", "←", "Mover para antes"],
          ["proxima", "→", "Mover para depois"],
          ["excluir", "×", "Excluir página"],
        ]) {
          const b = el("button", "", texto);
          b.type = "button";
          b.dataset.ordem = acao;
          b.setAttribute("aria-label", `${rotulo} ${i + 1}`);
          b.addEventListener("click", () => {
            if (carregando || exportando) return;
            const selecionada = paginas[ativa];
            if (acao === "excluir") {
              liberar(paginas[i]);
              paginas.splice(i, 1);
              ativa = Math.max(0, paginas.indexOf(selecionada));
            } else {
              const destino = i + (acao === "anterior" ? -1 : 1);
              if (destino < 0 || destino >= paginas.length) return;
              [paginas[i], paginas[destino]] = [paginas[destino], paginas[i]];
              ativa = paginas.indexOf(selecionada);
            }
            versao++;
            invalidar();
            desenharLista();
            void desenharAtiva();
          });
          ordem.append(b);
        }
        li.append(abrir, ordem);
        lista.append(li);
      });
      travar();
    };
    const adicionar = async (arquivos) => {
      if (carregando || exportando || !arquivos.length) return;
      const operacao = ++versao,
        novos = [];
      carregando = true;
      travar();
      try {
        if (paginas.length + arquivos.length > LIMITE_IMAGENS)
          throw Error(
            "O limite é de 20 fotos por PDF. Retire algumas fotos antes de adicionar outras.",
          );
        if (
          [...paginas.map((p) => p.arquivo), ...arquivos].reduce(
            (s, f) => s + f.size,
            0,
          ) > LIMITE_TOTAL_BYTES
        )
          throw Error(
            "As fotos somadas passam de 60 MB. Escolha menos fotos ou arquivos menores.",
          );
        for (const arquivo of arquivos) {
          mensagem(`Preparando ${arquivo.name}…`);
          if (!arquivo.size || arquivo.size > LIMITE_IMAGEM_BYTES)
            throw Error(
              `“${arquivo.name}” precisa ter conteúdo e no máximo 10 MB.`,
            );
          const info = lerImagem(new Uint8Array(await arquivo.arrayBuffer()));
          if (
            !["jpg", "png", "webp"].includes(info.tipo) ||
            !info.largura ||
            !info.altura
          )
            throw Error(
              `“${arquivo.name}” não é uma foto JPG, PNG ou WebP válida.`,
            );
          if (info.largura * info.altura > LIMITE_PIXELS)
            throw Error(
              `“${arquivo.name}” passa de 20 megapixels. Reduza as dimensões antes de adicionar.`,
            );
          const pagina = {
            arquivo,
            nome: arquivo.name,
            ajuste: ajusteInicial(),
            miniatura: "",
          };
          const thumb = document.createElement("canvas");
          try {
            await desenharFoto(pagina, thumb, 240);
            const blob = await blobDaTela(thumb, "image/jpeg", 0.76);
            if (operacao !== versao) return;
            pagina.miniatura = URL.createObjectURL(blob);
            urls.add(pagina.miniatura);
            novos.push(pagina);
          } finally {
            thumb.width = thumb.height = 0;
          }
        }
        if (operacao !== versao) return;
        ativa = paginas.length;
        paginas.push(...novos);
        novos.length = 0;
        invalidar();
        desenharLista();
        await desenharAtiva();
      } catch (erro) {
        if (operacao === versao)
          mensagem(
            erro.message ||
              "Não foi possível abrir a foto. Escolha outra imagem.",
            true,
          );
      } finally {
        novos.forEach(liberar);
        if (operacao === versao) {
          carregando = false;
          travar();
        }
        input.value = "";
      }
    };
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: "Gerar PDF",
      demorada: true,
      invalidarAoEditar: true,
      permitirSalvarTrabalho: false,
      campos: [
        {
          nome: "arquivos",
          rótulo: "Fotos dos documentos",
          tipo: "file",
          dica: "JPG, PNG ou WebP. Até 20 fotos, 10 MB e 20 MP cada; 60 MB no total. Você também pode arrastar as fotos para esta área.",
        },
        {
          nome: "tamanho",
          rótulo: "Página do PDF",
          tipo: "seleção",
          padrão: "a4",
          opções: [
            { valor: "a4", rótulo: "A4 em pé" },
            { valor: "a4-auto", rótulo: "A4: orientação da foto" },
            { valor: "adaptar", rótulo: "Tamanho da imagem (150 dpi)" },
          ],
        },
        {
          nome: "qualidade",
          rótulo: "Qualidade das fotos",
          tipo: "seleção",
          padrão: "nitida",
          opções: [
            { valor: "nitida", rótulo: "Nítida · JPEG 92%" },
            { valor: "compacta", rótulo: "Compacta · JPEG 78%" },
          ],
        },
        {
          nome: "nome",
          rótulo: "Nome do PDF",
          tipo: "text",
          padrão: "documentos-digitalizados",
          máximo: 100,
        },
      ],
      async calcular(dados) {
        if (carregando || exportando)
          throw new ErroDeEntrada(
            "Espere as fotos terminarem de abrir.",
            "arquivos",
          );
        if (!paginas.length)
          throw new ErroDeEntrada(
            "Adicione pelo menos uma foto do documento.",
            "arquivos",
          );
        if (erroDeAjuste)
          throw Error(
            `Revise os cortes da página selecionada. ${erroDeAjuste}`,
          );
        let biblioteca;
        try {
          biblioteca = await carregarBiblioteca();
        } catch {
          throw Error(ERRO_DE_BIBLIOTECA);
        }
        const execucao = ++versao;
        exportando = true;
        cancelar.hidden = false;
        travar();
        try {
          const bytes = await gerarPdfDigitalizado(paginas, {
            biblioteca,
            tamanho: dados.tamanho,
            cancelado: () => execucao !== versao,
            renderizar: async (pagina) => {
              const canvas = document.createElement("canvas");
              try {
                const medida = await desenharFoto(pagina, canvas, 3000);
                const blob = await blobDaTela(
                  canvas,
                  "image/jpeg",
                  dados.qualidade === "compacta" ? 0.78 : 0.92,
                );
                return {
                  largura: medida.largura,
                  altura: medida.altura,
                  bytes: new Uint8Array(await blob.arrayBuffer()),
                };
              } finally {
                canvas.width = canvas.height = 0;
              }
            },
            aoProgredir: ({ pagina, total }) =>
              progresso.andar(
                (100 * pagina) / total,
                `Preparando página ${pagina} de ${total}…`,
              ),
          });
          const nome = `${nomeDeArquivo((dados.nome || "documentos-digitalizados").replace(/\.pdf$/i, "")).slice(0, 100) || "documentos-digitalizados"}.pdf`;
          return {
            valor: `${paginas.length} ${paginas.length === 1 ? "página digitalizada" : "páginas digitalizadas"}`,
            resumo: `PDF com ${paginas.length} ${paginas.length === 1 ? "foto tratada" : "fotos tratadas"}, na ordem da lista · ${(bytes.length / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} MB.`,
            linhas: paginas.map((p, i) => [
              `Página ${i + 1}`,
              `${p.nome} · ${{ cores: "cores", cinza: "tons de cinza", pb: "preto e branco" }[p.ajuste.modo]}`,
            ]),
            previaPdf: { bytes, nome },
            arquivos: [
              {
                rótulo: "Baixar PDF",
                ícone: "baixar",
                gerar: () => baixar(bytes, nome, "application/pdf"),
              },
            ],
            observações: [
              "Confira o documento na prévia antes de compartilhar. O PDF tem páginas de imagem; OCR de PDF pode reconhecer o texto depois.",
            ],
          };
        } finally {
          exportando = false;
          cancelar.hidden = true;
          travar();
        }
      },
      aoMontar(elemento) {
        input = elemento.querySelector("#campo-arquivos");
        input.multiple = true;
        input.accept = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
        input.hidden = true;
        escolher = el("button", "botão botão--linha", "Escolher fotos");
        escolher.type = "button";
        escolher.setAttribute("aria-controls", input.id);
        escolher.addEventListener("click", () => input.click());
        input.after(escolher);
        form = elemento.querySelector("#formulário");
        progresso = criarProgresso(elemento.querySelector("#progresso"), {
          tipo: "arquivo",
        });
        painel = el("section", "scanner-doc");
        painel.setAttribute("aria-label", "Preparar as páginas digitalizadas");
        painel.innerHTML = `<header class="scanner-doc__topo"><div><h3>Seu documento, página por página</h3><p>Recorte, organize e confira antes de baixar.</p></div><div class="scanner-doc__botoes"><button type="button" data-camera>Fotografar</button><button type="button" data-exemplo>Carregar exemplo</button></div></header><input type="file" data-captura accept="image/jpeg,image/png,image/webp" capture="environment" hidden><ol class="scanner-doc__lista" aria-label="Páginas na ordem do PDF"></ol><div class="scanner-doc__vazio"><div class="scanner-doc__papel" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><b>Da foto ao documento</b><span>Adicione suas fotos ou experimente um exemplo editável.</span></div><div class="scanner-doc__editor" hidden><div class="scanner-doc__vista"><canvas data-previa role="img" aria-label="Prévia da página digitalizada"></canvas></div><div class="scanner-doc__controles"><b data-selecionada></b><div class="scanner-doc__botoes"><button type="button" data-girar>Girar 90° ↻</button><button type="button" data-restaurar>Restaurar página</button></div><label>Cor da página<select data-ajuste="modo"><option value="cores">Cores originais</option><option value="cinza">Tons de cinza</option><option value="pb">Preto e branco</option></select></label><label>Contraste<input data-ajuste="contraste" aria-label="Contraste" type="range" min="-100" max="100" value="0"></label><label data-limiar-grupo hidden>Limiar preto/branco<input data-ajuste="limiar" aria-label="Limiar preto/branco" type="range" min="0" max="255" value="160"></label><fieldset><legend>Cortar bordas (%)</legend><div class="scanner-doc__cortes"><label>Esquerda<input data-ajuste="esquerda" aria-label="Corte à esquerda (%)" type="number" min="0" max="90" step="1" value="0"></label><label>Direita<input data-ajuste="direita" aria-label="Corte à direita (%)" type="number" min="0" max="90" step="1" value="0"></label><label>Topo<input data-ajuste="topo" aria-label="Corte no topo (%)" type="number" min="0" max="90" step="1" value="0"></label><label>Base<input data-ajuste="base" aria-label="Corte na base (%)" type="number" min="0" max="90" step="1" value="0"></label></div></fieldset></div></div><p class="scanner-doc__estado" data-status role="status" aria-live="polite">Adicione fotos para começar.</p><p class="scanner-doc__nota">Fotografe de frente e com boa iluminação. O corte é manual e retangular; não há correção automática de perspectiva. A exportação usa até 3.000 px no maior lado de cada foto.</p>`;
        input.closest(".campos").after(painel);
        lista = painel.querySelector("ol");
        tela = painel.querySelector("[data-previa]");
        editor = painel.querySelector(".scanner-doc__editor");
        vazio = painel.querySelector(".scanner-doc__vazio");
        status = painel.querySelector("[data-status]");
        controles = painel.querySelector(".scanner-doc__controles");
        vazio.insertBefore(
          el("span", "scanner-doc__demo-rotulo", "Exemplo visual"),
          vazio.querySelector("b"),
        );
        input.addEventListener("change", () => {
          void adicionar([...input.files]);
        });
        const campo = input.closest(".campo");
        campo.addEventListener("dragover", (e) => {
          e.preventDefault();
        });
        campo.addEventListener("drop", (e) => {
          e.preventDefault();
          void adicionar([...e.dataTransfer.files]);
        });
        const captura = painel.querySelector("[data-captura]");
        painel
          .querySelector("[data-camera]")
          .addEventListener("click", () => captura.click());
        captura.addEventListener("change", () => {
          void adicionar([...captura.files]);
          captura.value = "";
        });
        painel.querySelector("[data-girar]").addEventListener("click", () => {
          if (!paginas[ativa]) return;
          paginas[ativa].ajuste.giro = (paginas[ativa].ajuste.giro + 90) % 360;
          versao++;
          invalidar();
          void desenharAtiva();
        });
        painel
          .querySelector("[data-restaurar]")
          .addEventListener("click", () => {
            if (!paginas[ativa]) return;
            paginas[ativa].ajuste = ajusteInicial();
            versao++;
            invalidar();
            void desenharAtiva();
          });
        controles.querySelectorAll("[data-ajuste]").forEach((c) =>
          c.addEventListener("input", () => {
            if (!paginas[ativa] || carregando || exportando) return;
            const valor =
              c.dataset.ajuste === "modo" ? c.value : Number(c.value);
            const proximo = {
              ...paginas[ativa].ajuste,
              [c.dataset.ajuste]: valor,
            };
            try {
              validarAjuste(proximo);
              paginas[ativa].ajuste = proximo;
              versao++;
              invalidar();
              void desenharAtiva();
            } catch (erro) {
              erroDeAjuste = erro.message;
              c.setAttribute("aria-invalid", "true");
              mensagem(erro.message, true);
            }
          }),
        );
        painel
          .querySelector("[data-exemplo]")
          .addEventListener("click", async () => {
            const canvas = document.createElement("canvas");
            canvas.width = 1000;
            canvas.height = 1300;
            const c = canvas.getContext("2d");
            c.fillStyle = "#d5c1a6";
            c.fillRect(0, 0, 1000, 1300);
            c.fillStyle = "#fff9e9";
            c.fillRect(70, 70, 860, 1160);
            c.fillStyle = "#a64f39";
            c.font = "bold 45px Arial";
            c.fillText("DOCUMENTO DE EXEMPLO", 125, 175);
            c.fillStyle = "#3c3430";
            c.font = "28px Arial";
            [
              "Uma foto pode virar uma página organizada.",
              "Corte as bordas, gire e escolha a cor.",
              "",
              "Nome: Maria da Silva",
              "Data: 16 de novembro de 2026",
              "",
              "Este é um exemplo editável do scanner.",
              "Nenhum arquivo pessoal foi carregado.",
            ].forEach((linha, i) => c.fillText(linha, 125, 280 + i * 67));
            try {
              const blob = await blobDaTela(canvas, "image/png");
              await adicionar([
                new File([blob], "documento-exemplo.png", {
                  type: "image/png",
                }),
              ]);
            } finally {
              canvas.width = canvas.height = 0;
            }
          });
        cancelar = el("button", "botão botão--linha", "Cancelar");
        cancelar.type = "button";
        cancelar.hidden = true;
        cancelar.addEventListener("click", () => {
          versao++;
          mensagem("Cancelando a geração…");
        });
        form.querySelector(".ações").append(cancelar);
        form.addEventListener("reset", () => {
          versao++;
          renderVersao++;
          paginas.forEach(liberar);
          paginas = [];
          ativa = 0;
          carregando = false;
          exportando = false;
          cancelar.hidden = true;
          desenharLista();
          void desenharAtiva();
          mensagem("Adicione fotos para começar.");
        });
        window.addEventListener("pagehide", (evento) => {
          if (evento.persisted) return;
          versao++;
          renderVersao++;
          for (const url of urls) URL.revokeObjectURL(url);
          urls.clear();
        });
      },
    });
  },
};
