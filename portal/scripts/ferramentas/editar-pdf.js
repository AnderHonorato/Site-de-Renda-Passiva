import { montarFerramenta, ErroDeEntrada, nomeDeArquivo } from '../núcleo/montador.js';
import { baixarPdf } from '../núcleo/exportar.js';
import { montarEscolhaDeArquivos, validarPdfDaEscolha } from './auxiliares/escolher-arquivos.js';
import { abrirComPdfjsParaTexto } from './auxiliares/pdfjs-textos.js';
import { carregarBiblioteca, ERRO_DE_BIBLIOTECA } from './auxiliares/biblioteca-pdf.js';
import { prepararExecução } from './auxiliares/execução-longa.js';
import { aplicarEdiçõesPdf, LIMITE_DE_OPERACOES, LIMITE_DE_IMAGEM_BYTES, LIMITE_DE_PIXELS_POR_IMAGEM } from '../cálculos/editar-pdf.js';
import { conferirImagem } from '../cálculos/imagens-em-pdf.js';

const limitePdf = 20 * 1024 * 1024, maxPaginas = 100;
const el = (tag, attrs = {}, texto = '') => { const n = document.createElement(tag); Object.entries(attrs).forEach(([k,v]) => n.setAttribute(k,v)); if (texto) n.textContent = texto; return n; };
const svgEl = (tag, attrs = {}) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.entries(attrs).forEach(([k,v]) => n.setAttribute(k,String(v))); return n; };

export default {
  instruções: {
    passos: ['Escolha um PDF de até 20 MB e 100 páginas. A página escolhida aparece na prévia.', 'Selecione Texto ou Imagem. Toque na página para adicionar; arraste a caixa para mover e use o canto inferior direito para redimensionar. Também pode apagar, desfazer e refazer.', 'Toque em Exportar PDF. As anotações são adicionadas sobre as páginas originais; o texto já existente no PDF não é editado.'],
    exemplo: { texto: 'Acrescente uma observação à página 2 ou uma imagem PNG/JPG à página escolhida; todas as outras páginas permanecem no arquivo.' },
    limites: 'PDF até 20 MB e 100 páginas; até 100 anotações; imagens PNG/JPG até 5 MB cada e 15 MB no total. Os arquivos são processados neste navegador. Esta ferramenta adiciona conteúdo por cima; não altera texto existente e não oferece redação segura. A fonte PDF padrão aceita português e pontuação comum, mas não emojis nem alfabetos asiáticos.'
  },
  montar(raiz, ferramenta) {
    let escolha, execução, doc = null, ops = [], histórico = [], futuro = [], urlsImagem = new Set(), páginaAtual = 1, zoom = 1, renderSeq = 0;
    let canvas, overlay, frame, status, count, controls, imagePick, pageSize = { largura: 1, altura: 1 };
    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Exportar PDF', demorada: true,
      campos: [{ nome: 'arquivo', rótulo: 'Arquivo PDF', tipo: 'file', dica: 'Até 20 MB e 100 páginas. O arquivo permanece no aparelho.' }],
      async calcular() {
        const arquivo = escolha.itens()[0]?.arquivo;
        if (!arquivo) throw new ErroDeEntrada('Escolha um PDF antes de exportar.', 'arquivo');
        if (!ops.length) throw new ErroDeEntrada('Adicione ao menos um texto ou imagem à página.', 'arquivo');
        return execução.executar(async () => {
          execução.progresso.andar(5, 'Carregando a biblioteca de PDF…');
          let biblioteca; try { biblioteca = await carregarBiblioteca(); } catch { throw new Error(ERRO_DE_BIBLIOTECA); }
          const bytes = new Uint8Array(await arquivo.arrayBuffer());
          const r = await aplicarEdiçõesPdf({ nome: arquivo.name, bytes }, { biblioteca, operações: ops, cancelado: execução.cancelado, aoProgredir: ({ atual,total }) => execução.progresso.andar(10 + 85 * atual / Math.max(total,1), `Anotação ${atual} de ${total}`) });
          if (!r.ok) throw new ErroDeEntrada(mensagem(r.erro), 'arquivo');
          const base = nomeDeArquivo(arquivo.name.replace(/\.pdf$/i,'')) || 'documento';
          return { valor: 'PDF editado', resumo: `${arquivo.name} · ${r.páginas} páginas · ${r.bytes.length.toLocaleString('pt-BR')} bytes`, arquivos: [{ rótulo: 'Baixar PDF editado', gerar: () => baixarPdf(r.bytes, `${base}-editado`) }], observações: ['As anotações foram adicionadas como conteúdo sobre as páginas. O texto original não foi alterado.'] };
        });
      },
      aoMontar(elemento) {
        const input = elemento.querySelector('#campo-arquivo');
        const panel = el('section', { class: 'editor-pdf t-3', 'aria-label': 'Editor de PDF' });
        panel.innerHTML = `<div class="editor-pdf__barra"><div class="editor-pdf__grupo" role="group" aria-label="Ferramentas"><button type="button" data-mode="texto" aria-pressed="true">Texto</button><button type="button" data-mode="imagem" aria-pressed="false">Imagem PNG/JPG</button><button type="button" data-mode="retangulo" aria-pressed="false">Retângulo</button><button type="button" data-mode="linha" aria-pressed="false">Linha</button><button type="button" data-action="undo" disabled>Desfazer</button><button type="button" data-action="redo" disabled>Refazer</button><button type="button" data-action="delete" disabled>Excluir seleção</button></div><div class="editor-pdf__grupo"><label>Texto <input data-text value="Observação" maxlength="500"></label><label>Fonte <select data-font><option value="sans">Sem serifa</option><option value="serif">Com serifa</option></select></label><label>Tamanho <input data-size type="number" min="6" max="96" value="20"></label><label>Cor <input data-color type="color" value="#a94f3d"></label><label>Zoom <select data-zoom><option value="0.75">75%</option><option value="1" selected>100%</option><option value="1.25">125%</option><option value="1.5">150%</option></select></label><button type="button" data-page="prev" disabled>← Página</button><span data-count>Página 0 de 0</span><button type="button" data-page="next" disabled>Página →</button><input data-image type="file" accept="image/png,image/jpeg" hidden></div></div><p class="editor-pdf__nota" role="note">Clique/toque na página para inserir. Arraste uma anotação para mover; arraste o canto para redimensionar. O texto original não é editado. Retângulos brancos não apagam nem redigem conteúdo. A fonte aceita português e pontuação comum; não aceita emojis nem alfabetos asiáticos.</p><div class="editor-pdf__viewport"><div data-frame class="editor-pdf__frame"><canvas data-canvas aria-label="Prévia da página do PDF"></canvas><svg data-overlay role="group" aria-label="Anotações selecionáveis"></svg></div></div><p data-status role="status" aria-live="polite">Escolha um PDF para começar.</p><nav class="editor-pdf__links" aria-label="Outras ferramentas PDF"><span>Outras ferramentas:</span><a href="../girar-pdf/">Girar</a><a href="../organizar-pdf/">Organizar páginas</a><a href="../assinar-pdf/">Assinar</a><a href="../ocultar-informacoes-do-pdf/">Redigir informações</a></nav>`;
        input.closest('.campo')?.after(panel);
        canvas = panel.querySelector('[data-canvas]'); overlay = panel.querySelector('[data-overlay]'); frame = panel.querySelector('[data-frame]'); status = panel.querySelector('[data-status]'); count = panel.querySelector('[data-count]'); controls = panel;
        const modeButtons = [...panel.querySelectorAll('[data-mode]')]; let mode = 'texto', selected = null, activePointer = null;
        const message = (s) => { status.textContent = s; };
        const save = () => { histórico.push(structuredClone(ops)); if (histórico.length > 30) histórico.shift(); futuro = []; refreshButtons(); };
        const refreshButtons = () => { panel.querySelector('[data-action="undo"]').disabled = !histórico.length; panel.querySelector('[data-action="redo"]').disabled = !futuro.length; panel.querySelector('[data-action="delete"]').disabled = selected === null; };
        const point = (event) => { const r = overlay.getBoundingClientRect(); return { x: Math.max(0,Math.min((event.clientX-r.left)*canvas.width/r.width,canvas.width)), y: Math.max(0,Math.min((event.clientY-r.top)*canvas.height/r.height,canvas.height)) }; };
        const renderOverlay = () => {
          overlay.replaceChildren(); overlay.setAttribute('viewBox', `0 0 ${pageSize.largura||1} ${pageSize.altura||1}`);
          // O SVG usa viewBox em pontos da página (não em pixels do canvas);
          // manter os valores em pontos faz a posição vista coincidir com o PDF exportado.
          ops.forEach((op,i) => { if (op.pagina !== páginaAtual) return; const x=op.x,y=op.y,w=op.largura,h=op.altura;
            const tipoRótulo={texto:'Texto',imagem:'Imagem',retangulo:'Retângulo',linha:'Linha'}[op.tipo]??'Anotação';
            const g=svgEl('g',{ tabindex:'0', role:'button', 'aria-label':`${tipoRótulo} ${i+1}, selecionável`, 'data-i':i }); g.style.cursor='move';
            if(op.tipo==='texto'){ const t=svgEl('text',{x:x+3,y:y+h,fill:op.cor,'font-size':op.tamanho,'font-family':op.fonte==='serif'?'Georgia,serif':'Arial,sans-serif'}); t.textContent=op.texto; g.append(t); }
            else if(op.tipo==='imagem'){ const im=svgEl('image',{x,y,width:w,height:h,href:op.url,'preserveAspectRatio':'none'}); g.append(im); }
            else if(op.tipo==='retangulo'){ g.append(svgEl('rect',{x,y,width:w,height:h,fill:'none',stroke:op.cor,'stroke-width':Math.max(1,op.espessura??2)})); }
            else if(op.tipo==='linha'){ g.append(svgEl('line',{x1:op.x,y1:op.y,x2:op.x2,y2:op.y2,stroke:op.cor,'stroke-width':Math.max(1,op.espessura??2)})); }
            const box=svgEl('rect',{x,y,width:w,height:h,fill:'transparent',stroke:i===selected?'#a94f3d':'#98766c','stroke-width':2,'stroke-dasharray':i===selected?'none':'5 4'}); g.append(box);
            const handle=svgEl('rect',{x:x+w-10,y:y+h-10,width:10,height:10,fill:'#a94f3d','data-resize':'1'}); g.append(handle); overlay.append(g);
            g.addEventListener('pointerdown',e=>{ e.stopPropagation(); selected=i; activePointer={i,start:point(e),orig:{x:op.x,y:op.y,w:op.largura,h:op.altura,x2:op.x2,y2:op.y2},resize:e.target.hasAttribute('data-resize')}; g.setPointerCapture?.(e.pointerId); renderOverlay(); });
            g.addEventListener('keydown',e=>{ if(e.key==='Delete'||e.key==='Backspace'){ e.preventDefault(); removeSelected(); } else if(e.key.startsWith('Arrow')){ e.preventDefault(); save(); const step=e.shiftKey?10:1; op.x+=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0; op.y+=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0; renderOverlay(); } });
          });
        };
        const renderPage = async () => { const seq=++renderSeq; if(!doc) return; const n=Math.max(1,Math.min(páginaAtual,doc.páginas)); páginaAtual=n; count.textContent=`Página ${n} de ${doc.páginas}`; panel.querySelectorAll('[data-page]').forEach(b=>b.disabled=(b.dataset.page==='prev'?n===1:n===doc.páginas)); const w=Math.min(760,Math.max(280,frame.parentElement.clientWidth-24))*zoom; const m=await doc.desenharNaTela(n,canvas,w); if(seq!==renderSeq)return; pageSize={largura:m.largura,altura:m.altura}; for(const op of ops) if(op.pagina===n){op.pageW=m.largura;op.pageH=m.altura;} renderOverlay(); };
        overlay.addEventListener('pointermove',e=>{ if(!activePointer)return; const op=ops[activePointer.i],p=point(e),dx=(p.x-activePointer.start.x)*op.pageW/canvas.width,dy=(p.y-activePointer.start.y)*op.pageH/canvas.height; if(op.tipo==='linha'){if(activePointer.resize){op.x2=Math.min(op.pageW,Math.max(0,activePointer.orig.x2+dx));op.y2=Math.min(op.pageH,Math.max(0,activePointer.orig.y2+dy));op.largura=Math.max(1,op.x2-op.x);op.altura=Math.max(1,op.y2-op.y);}else{op.x=Math.min(op.pageW-op.largura,Math.max(0,activePointer.orig.x+dx));op.y=Math.min(op.pageH-op.altura,Math.max(0,activePointer.orig.y+dy));op.x2=activePointer.orig.x2+(op.x-activePointer.orig.x);op.y2=activePointer.orig.y2+(op.y-activePointer.orig.y);}}else if(activePointer.resize){op.largura=Math.min(op.pageW-op.x,Math.max(12,activePointer.orig.w+dx));op.altura=Math.min(op.pageH-op.y,Math.max(12,activePointer.orig.h+dy));}else{op.x=Math.min(op.pageW-op.largura,Math.max(0,activePointer.orig.x+dx));op.y=Math.min(op.pageH-op.altura,Math.max(0,activePointer.orig.y+dy));}renderOverlay(); });
        overlay.addEventListener('pointerup',()=>{ if(activePointer){activePointer=null;save();} });
        overlay.addEventListener('pointerdown',e=>{ if(e.target!==overlay)return; if(!doc||ops.length>=LIMITE_DE_OPERACOES)return; const p=point(e),pageW=pageSize.largura,pageH=pageSize.altura; save(); const x=p.x*pageW/canvas.width,y=p.y*pageH/canvas.height; const op={tipo:mode,pagina:páginaAtual,x,y,largura:mode==='texto'?Math.min(pageW*.45,200):120,altura:mode==='texto'?36:70,pageW,pageH,cor:panel.querySelector('[data-color]').value,tamanho:Number(panel.querySelector('[data-size]').value),fonte:panel.querySelector('[data-font]').value,texto:panel.querySelector('[data-text]').value.trim()||'Observação'}; if(mode==='imagem'){historicoPending=op;panel.querySelector('[data-image]').click();return;} if(mode==='linha'){op.x2=Math.min(pageW,x+120);op.y2=Math.min(pageH,y+70);op.largura=Math.max(1,op.x2-x);op.altura=Math.max(1,op.y2-y);} else if(mode==='retangulo'){op.largura=Math.min(120,pageW-x);op.altura=Math.min(70,pageH-y);} ops.push(op); selected=ops.length-1; renderOverlay(); message(`${mode==='retangulo'?'Retângulo':mode==='linha'?'Linha':'Anotação'} adicionada à página ${páginaAtual}.`); });
        let historicoPending=null;
        const removeSelected=()=>{ if(selected===null)return; save(); ops.splice(selected,1); selected=null;renderOverlay();refreshButtons(); };
        panel.querySelector('[data-image]').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file||!historicoPending)return;if(file.size>LIMITE_DE_IMAGEM_BYTES){message('A imagem passa do limite de 5 MB.');historicoPending=null;return;}if(!['image/png','image/jpeg'].includes(file.type)){message('Escolha uma imagem PNG ou JPG.');historicoPending=null;return;}const bytes=new Uint8Array(await file.arrayBuffer());const checked=conferirImagem({nome:file.name,bytes});if(!checked.ok||checked.info.tipo!== (file.type==='image/png'?'png':'jpg')){message('Não foi possível ler a imagem. Escolha um PNG ou JPG válido.');historicoPending=null;return;}if(checked.info.largura*checked.info.altura>LIMITE_DE_PIXELS_POR_IMAGEM){message('A imagem tem mais de 8 megapixels. Reduza as dimensões e tente de novo.');historicoPending=null;return;}historicoPending.bytes=bytes;historicoPending.formato=file.type==='image/png'?'png':'jpg';historicoPending.url=URL.createObjectURL(file);urlsImagem.add(historicoPending.url);ops.push(historicoPending);selected=ops.length-1;historicoPending=null;renderOverlay();refreshButtons();});
        panel.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;modeButtons.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));message(mode==='texto'?'Clique na página para inserir o texto definido.':'Clique na página e escolha uma imagem PNG ou JPG.');}));
        panel.querySelector('[data-action="delete"]').addEventListener('click',removeSelected);
        panel.querySelector('[data-action="undo"]').addEventListener('click',()=>{if(!histórico.length)return;futuro.push(structuredClone(ops));ops=histórico.pop();selected=null;renderOverlay();refreshButtons();});
        panel.querySelector('[data-action="redo"]').addEventListener('click',()=>{if(!futuro.length)return;histórico.push(structuredClone(ops));ops=futuro.pop();selected=null;renderOverlay();refreshButtons();});
        panel.querySelector('[data-zoom]').addEventListener('change',e=>{zoom=Number(e.target.value)||1;renderPage();});
        panel.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{páginaAtual+=b.dataset.page==='prev'?-1:1;renderPage();}));
        const limparUrls = () => { for (const url of urlsImagem) URL.revokeObjectURL(url); urlsImagem.clear(); };
        escolha=montarEscolhaDeArquivos(elemento,{campo:'arquivo',rótuloDoBotão:'Escolher PDF',accept:'application/pdf,.pdf',rótuloDaLista:'PDF escolhido',textoDoVazio:'Nenhum PDF escolhido ainda.',textoDeSolte:'Solte o PDF para escolher.',async validar(file,begin){if(file.size>limitePdf)return {erro:'O PDF passa do limite de 20 MB.'};const v=await validarPdfDaEscolha(file,begin);if(v.erro)return v;let novo;try{novo=await abrirComPdfjsParaTexto(new Uint8Array(await file.arrayBuffer()));if(novo.páginas>maxPaginas){await novo.fechar();return {erro:'O limite é de 100 páginas.'};}}catch{return {erro:'Não foi possível abrir este PDF. Confira se não está danificado ou protegido por senha.'};}if(doc)await doc.fechar().catch(()=>{});limparUrls();doc=novo;ops=[];histórico=[];futuro=[];páginaAtual=1;selected=null;await renderPage();message(`${file.name}: ${doc.páginas} páginas. Escolha uma ferramenta e clique na página.`);refreshButtons();return {extra:`${doc.páginas} páginas`};},aoMudar:async itens=>{if(!itens.length){if(doc)await doc.fechar().catch(()=>{});doc=null;limparUrls();ops=[];histórico=[];futuro=[];canvas.width=canvas.height=0;overlay.replaceChildren();count.textContent='Página 0 de 0';message('Escolha um PDF para começar.');}}});
        execução=prepararExecução(elemento,{escolha});
        elemento.querySelector('#formulário').addEventListener('reset',()=>{renderSeq++;doc?.fechar().catch(()=>{});doc=null;limparUrls();ops=[];histórico=[];futuro=[];});
      }
    });
  }
};

function mensagem(code){return ({cancelado:'Operação cancelada.',geometria_fora_da_pagina:'Uma anotação ficou fora da página. Mova-a para dentro e tente de novo.',imagem_grande:'Uma imagem passa do limite de 5 MB.',imagens_demais:'O conjunto das imagens passa de 15 MB.',operacoes_demais:'O limite é de 100 anotações.',pdf_páginas_demais:'O limite é de 100 páginas.',texto_fonte_nao_suportada:'O texto contém símbolo não coberto pela fonte PDF padrão. Remova emojis ou use letras e pontuação comum.'})[code]||`Não foi possível exportar as anotações (${code}).`}
