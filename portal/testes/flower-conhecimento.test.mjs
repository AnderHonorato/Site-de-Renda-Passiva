import { ferramentas, ferramentasProntas } from '../dados/catálogo.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { topicosFAQ, idsFAQ, consultarFAQ } from '../scripts/núcleo/flower-conhecimento.js';
import { respostaFAQ } from '../scripts/núcleo/flower-faq.js';

test('Flower offline: base ampla, tópicos e contrato dos resultados',()=>{
  assert.ok(topicosFAQ.length>=10);
  assert.ok(topicosFAQ.every(t=>t.id&&t.rotulo&&t.pergunta));
  const r=consultarFAQ('Como juntar PDF?');
  assert.deepEqual(Object.keys(r).sort(),['id','links','sugestoes','texto','topico']);
  assert.equal(r.id,'pdf-juntar'); assert.equal(r.topico,'pdf');
  assert.match(r.texto,/organize a ordem/u);
  assert.ok(r.sugestoes.length);
  assert.ok(r.links.some(l=>l.href==='f/juntar-pdf/'));
});

test('Flower offline: intenções específicas vencem termos gerais e reconhecem variação de escrita',()=>{
  assert.equal(consultarFAQ('Como editar um PDF?')?.id,'pdf-editar');
  assert.equal(consultarFAQ('Como editar uma imagem?')?.id,'imagem-editar');
  assert.equal(consultarFAQ('Como editar um DOCX?')?.id,'office-docx');
  assert.equal(consultarFAQ('Como cortar e converter áudio?')?.id,'audio-converter');
  assert.equal(consultarFAQ('como juntar pdfs??')?.id,'pdf-juntar');
  assert.equal(consultarFAQ('Como remover paginas do PDF')?.id,'pdf-remover-paginas');
  assert.equal(consultarFAQ('Como edtiar um pfd?')?.id,'pdf-editar');
  assert.equal(consultarFAQ('Como converter CSV para JSON?')?.id,'dados-csv-json');
  assert.equal(consultarFAQ('O que é este portal?'),null);
});

test('Flower offline: tópico mantém contexto de perguntas curtas e id seleciona resposta',()=>{
  assert.equal(consultarFAQ('e como baixar?',{topico:'arquivos'})?.id,'arquivo-download');
  assert.equal(consultarFAQ('e como baixar?',{topico:'pdf'})?.id,'pdf-baixar');
  assert.equal(consultarFAQ('e juntar?',{topico:'pdf'})?.id,'pdf-juntar');
  assert.equal(consultarFAQ('e como baixo?',{topico:'imagens'})?.id,'arquivo-download');
  assert.equal(consultarFAQ('e como baixo?',{topico:'imagens'})?.topico,'imagens');
  assert.equal(consultarFAQ('e converter?',{topico:'pdf'})?.id,'pdf-imagem');
  assert.match(consultarFAQ('e como faço isso?',{topico:'pdf'})?.texto,/Escolha uma tarefa/u);
  assert.equal(consultarFAQ('qualquer texto',{id:'office-formulas'})?.id,'office-formulas');
  assert.equal(consultarFAQ('e baixar?',{topico:'inexistente'}),null);
  assert.equal(consultarFAQ('como consertar um motor de carro?',{topico:'pdf'}),null);
  assert.equal(consultarFAQ('qualquer frase sem intenção'),null);
});

test('Flower offline: limites reais, recursos planejados, contas e privacidade',()=>{
  assert.equal(consultarFAQ('A Flower pode ler meu arquivo?'),null);
  assert.equal(consultarFAQ('Pode consultar minha conta e ver meus dados?'),null);
  assert.match(consultarFAQ('PDF escaneado precisa de OCR?')?.texto,/OCR de PDF.*PDF pesquisável/u);
  assert.match(consultarFAQ('',{id:'imagem-ocr'})?.texto,/Abra Texto da imagem.*TXT/u);
  assert.match(consultarFAQ('',{id:'indisponivel-ferramenta'})?.texto,/tem OCR de imagem e OCR de PDF/u);
  assert.doesNotMatch(consultarFAQ('',{topico:'imagens'})?.texto,/planejad|não está pronto/u);
  assert.match(consultarFAQ('O portal transcreve áudio ou vídeo?')?.texto,/não encontrei.*transcrição/iu);
  assert.match(consultarFAQ('Quais são os planos e preços?')?.texto,/podem mudar/u);
  assert.match(consultarFAQ('Quantas ferramentas estão prontas?')?.texto,new RegExp(`${ferramentas.length} ferramentas.*${ferramentasProntas.length} ferramentas prontas`, 'u'));
  assert.equal(respostaFAQ('Pode ler meu arquivo e dizer o que tem nele?'),null);
});

test('Flower offline: links internos relativos apontam para páginas existentes no portal',()=>{
  const vistos=new Set();
  for(const topico of topicosFAQ) for(const id of [undefined,...[]]) {
    const res=consultarFAQ('',{topico:topico.id,id}); if(res) for(const l of res.links) vistos.add(l.href.split(/[?#]/u)[0]);
  }
  for(const id of idsFAQ) {
    const res=consultarFAQ('',{id}); assert.ok(res,`entrada ${id}`);
    for(const l of res.links) {
      assert.equal(l.href.startsWith('/'),false); assert.equal(l.href.includes('..'),false); assert.equal(l.href.includes('://'),false);
      const caminho=l.href.split(/[?#]/u)[0];
      if(caminho && caminho!=='ferramentas.html') assert.ok(existsSync(new URL('../' + caminho + (caminho.endsWith('/') ? 'index.html' : ''), import.meta.url)),`${id}: ${l.href}`);
    }
  }
});

test('Flower offline: wrapper legado conserva respostas cobertas pelo teste anterior',()=>{
  assert.match(respostaFAQ('Olá!'),/sou a Flower/u);
  assert.match(respostaFAQ('Quantas ferramentas prontas existem?'),new RegExp(`${ferramentasProntas.length} ferramentas prontas`, "u"));
  assert.match(respostaFAQ('As ferramentas são grátis?'),/públicas gratuitas.*Plus ou Premium/u);
  assert.match(respostaFAQ('Como editar um PDF?'),/não altera o texto que já existe/u);
  assert.match(respostaFAQ('Como editar uma imagem?'),/navegador.*original fica intacto/u);
  assert.match(respostaFAQ('Como cortar e converter áudio?'),/WAV, MP3/u);
  assert.match(respostaFAQ('Como editar um DOCX?'),/DOCX ou TXT/u);
  assert.match(respostaFAQ('Como editar um PPTX?'),/PPTX/u);
  assert.match(respostaFAQ('Como editar uma planilha XLSX?'),/XLSX ou CSV/u);
  assert.match(respostaFAQ('Como encontro o portal?'),/página Ferramentas/u);
  assert.equal(respostaFAQ('x'.repeat(1600)),null);
});


test('Flower: fichas atuais ampliam suporte ao catálogo e mantêm limites de dados privados', async()=>{
  const {consultarCatalogo}=await import('../scripts/núcleo/flower-catalogo.js');
  const qr=consultarCatalogo('Como usar Gerador de QR Code?');
  assert.ok(qr?.texto.includes('QR Code'));
  assert.ok(qr.links.some(l=>l.href.includes('/qr-code/')));
  const formatos=consultarCatalogo('',{id:qr.sugestoes.find(s=>s.id.endsWith(':saida')).id});
  assert.ok(formatos.texto.length>80);assert.equal(consultarCatalogo('Analise meu arquivo privado'),null);
  assert.equal(consultarCatalogo('Qual a capital da Mongólia?'),null);
  assert.equal(consultarCatalogo('Escreva um texto sobre animais'),null);
  assert.equal(consultarFAQ('PDF')?.topico,'pdf');assert.ok(consultarFAQ('Ajuda')?.sugestoes.length);
});
