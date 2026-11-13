/** Reprodução de exemplos fixos. Não contém motores, uploads ou chamadas de análise. */
import { criarVitrine } from '../../vitrine/vitrine-motor.js';
import { desenharDemonstracao } from './demonstracao-cenas.js';
import { htmlDemonstracao } from './demonstracao-html.js';
import { ícone } from './ícones.js';

const montadas = new WeakMap();
const amostras = new Map();
let estilos, dialogoAtual = null;

export function validarDemonstracao(d) {
  const texto = (v, max = 300) => typeof v === 'string' && v.length <= max;
  const valor = v => v === null || texto(v) || (typeof v === 'number' && Number.isFinite(v));
  const tabela = t => t && Array.isArray(t.colunas) && t.colunas.length <= 4 && t.colunas.every(c => texto(c, 80))
    && Array.isArray(t.linhas) && t.linhas.length <= 5 && t.linhas.every(l => Array.isArray(l) && l.length <= 4 && l.every(valor));
  if (!d || !texto(d.slug, 120) || !/^[a-z0-9-]+$/.test(d.slug) || !texto(d.nome, 200)
    || !['plus','premium'].includes(d.plano) || !['calculado','ilustrativo'].includes(d.tipo)
    || !d.entrada || !texto(d.entrada.rotulo) || (d.entrada.texto !== undefined && !texto(d.entrada.texto))
    || (d.entrada.colunas !== undefined && !tabela(d.entrada))
    || !Array.isArray(d.indicadores) || d.indicadores.length > 3 || !d.indicadores.every(x => Array.isArray(x) && x.length === 2 && texto(x[0], 80) && valor(x[1]))
    || !tabela(d.tabela) || !Array.isArray(d.series) || d.series.length > 6
    || !d.series.every(s => texto(s.rotulo, 80) && typeof s.valor === 'number' && Number.isFinite(s.valor))
    || !texto(d.metodo, 180) || !Array.isArray(d.notas) || d.notas.length > 4 || !d.notas.every(n => texto(n,180))
    || !Array.isArray(d.exporta) || d.exporta.length > 15 || !d.exporta.every(f => texto(f,30))) {
    throw new Error('O exemplo não está disponível neste momento.');
  }
  return d;
}

function paleta() {
  const s = getComputedStyle(document.documentElement);
  const cor = (v, fallback) => s.getPropertyValue(v).trim() || fallback;
  const marca = cor('--marca','#a8472a');
  const rgb = /^#([0-9a-f]{6})$/i.exec(marca)?.[1];
  const clara = rgb ? (parseInt(rgb.slice(0,2),16)*.2126 + parseInt(rgb.slice(2,4),16)*.7152 + parseInt(rgb.slice(4,6),16)*.0722)>150 : false;
  return { fundo:cor('--fundo','#f5f2ed'), papel:cor('--superfície','#fffdf9'), tinta:cor('--tinta','#1a1a1a'),
    suave:cor('--tinta-suave','#5c6270'), borda:cor('--borda','#ddd6cc'), marca, fraca:cor('--marca-fraca','#f6e3da'),
    alternada:cor('--superfície-2','#f9f6f1'), sombra:'rgba(26,26,26,.14)', sobre:clara?'#1a1a1a':'#fffdf9' };
}

export function montarDemonstracao(elemento) {
  if (montadas.has(elemento)) return montadas.get(elemento);
  const template = elemento.querySelector('template[data-demonstracao-dados]');
  const demo = validarDemonstracao(JSON.parse(template.content.textContent));
  const canvas = elemento.querySelector('canvas');
  if (!canvas.getContext('2d')) return null;
  const controles = elemento.querySelector('.demonstracao__controles');
  const etapas = elemento.querySelector('.demonstracao__etapas');
  const botao = elemento.querySelector('[data-demo-tocar]');
  const repetir = elemento.querySelector('[data-demo-repetir]');
  const posicao = elemento.querySelector('input[type=range]');
  const tempo = elemento.querySelector('output');
  let cores = paleta(), vitrine, tocando = false, reduzido = false, terminou = false, ultimoDecimo = -1;
  elemento.dataset.pronta = 'sim';

  const estado = ({ tocando: novo, reduzido: reduzir }) => {
    tocando = novo; reduzido = reduzir;
    const nome = reduzido ? 'Sem animação' : terminou ? 'Rever' : tocando ? 'Pausar' : 'Reproduzir';
    botao.innerHTML = ícone(tocando ? 'pausar' : 'reproduzir') + `<span>${nome}</span>`;
    botao.setAttribute('aria-label', `${nome} demonstração`);
    botao.disabled = reduzido;
    botao.setAttribute('aria-pressed', String(!tocando));
  };
  vitrine = criarVitrine(canvas, {
    quadroEstático:12,
    aoMudarEstado:estado,
    desenhar(ctx,t,palco) {
      desenharDemonstracao(ctx,t,palco,demo,cores);
      const decimo = Math.round(t*10);
      if(decimo !== ultimoDecimo) {
        ultimoDecimo=decimo;posicao.value=String(t);
        tempo.textContent=`0:${String(Math.min(15,Math.round(t))).padStart(2,'0')} / 0:15`;
        const cena=t<4.4?0:t<8.2?1:2;
        etapas.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===cena)));
        posicao.setAttribute('aria-valuetext', `${['Dados de exemplo','Análise do exemplo','Resultado do exemplo'][cena]}; ${Math.round(t)} de 15 segundos`);
      }
      if(t>=14.8 && tocando && !terminou) {
        terminou=true;
        queueMicrotask(()=>{ vitrine.pausar();vitrine.irPara(14.8); });
      }
    },
  });
  controles.hidden=false;etapas.hidden=false;
  const rever = () => { terminou=false;vitrine.irPara(reduzido?12:0);if(!reduzido)vitrine.tocar(); };
  botao.addEventListener('click',()=>terminou?rever():vitrine.alternar());
  repetir.addEventListener('click',rever);
  posicao.addEventListener('input',()=>{const t=Number(posicao.value);terminou=t>=14.8;vitrine.pausar();vitrine.quadroExato(t);});
  etapas.addEventListener('click',e=>{
    const b=e.target.closest('[data-demo-cena]');if(!b)return;
    vitrine.pausar();vitrine.irPara(Number(b.dataset.demoCena));
  });
  const atualizarTema = () => {cores=paleta();vitrine.repintar();};
  const tema = new MutationObserver(atualizarTema);
  tema.observe(document.documentElement,{attributes:true,attributeFilter:['data-tema']});
  const sistema=matchMedia('(prefers-color-scheme: dark)');sistema.addEventListener('change',atualizarTema);
  document.fonts?.ready.then(()=>{if(elemento.isConnected)vitrine.repintar();});
  const controle={
    demo, vitrine,
    destruir(){vitrine.destruir();tema.disconnect();sistema.removeEventListener('change',atualizarTema);montadas.delete(elemento);},
  };
  montadas.set(elemento,controle);
  return controle;
}

function carregarEstilos() {
  if (estilos) return estilos;
  if (document.querySelector('link[data-estilos-demonstracoes], link[href$="/demonstracoes.css"]')) return Promise.resolve();
  if (!estilos) estilos = new Promise((resolve,reject)=>{
    const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('../../estilos/demonstracoes.css',import.meta.url).href;link.dataset.estilosDemonstracoes='sim';
    link.onload=resolve;link.onerror=()=>{link.remove();estilos=null;reject(new Error('Não foi possível carregar a apresentação.'));};document.head.append(link);
  });
  return estilos;
}

async function obterExemplo(slug, base) {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Exemplo inválido.');
  if(amostras.has(slug))return amostras.get(slug);
  const url=new URL(`${base}f/${slug}/`,location.href);
  if(url.origin!==location.origin)throw new Error('Endereço de exemplo inválido.');
  const resposta=await fetch(url,{credentials:'same-origin',signal:AbortSignal.timeout(12000)});
  if(!resposta.ok)throw new Error('Não foi possível carregar o exemplo.');
  const html=await resposta.text();
  if(html.length>500000)throw new Error('O exemplo excedeu o tamanho esperado.');
  const documento=new DOMParser().parseFromString(html,'text/html');
  const template=documento.querySelector('template[data-demonstracao-dados]');
  if(!template)throw new Error('A demonstração ainda não está disponível.');
  const demo=validarDemonstracao(JSON.parse(template.content.textContent));
  if(demo.slug!==slug)throw new Error('O exemplo recebido não corresponde à ferramenta.');
  if(amostras.size>=10)amostras.delete(amostras.keys().next().value);
  amostras.set(slug,demo);return demo;
}

export async function abrirDemonstracao(slug,{base='',gatilho=null}={}) {
  await carregarEstilos();
  dialogoAtual?.close();
  const dialogo=document.createElement('dialog');dialogo.className='demonstracao-modal';dialogo.setAttribute('aria-labelledby','titulo-demonstracao-modal');
  const topo=document.createElement('div');topo.className='demonstracao-modal__topo';
  const titulo=document.createElement('h2');titulo.id='titulo-demonstracao-modal';titulo.textContent='Exemplo animado';
  const fechar=document.createElement('button');fechar.type='button';fechar.className='botão botão--linha';fechar.textContent='Fechar';fechar.addEventListener('click',()=>dialogo.close());
  const corpo=document.createElement('div');corpo.className='demonstracao-modal__corpo';corpo.setAttribute('role','status');corpo.textContent='Preparando o exemplo animado…';
  topo.append(titulo,fechar);dialogo.append(topo,corpo);document.body.append(dialogo);dialogoAtual=dialogo;
  let controle;
  dialogo.addEventListener('click',e=>{if(e.target===dialogo)dialogo.close();});
  dialogo.addEventListener('close',()=>{controle?.destruir();dialogo.remove();if(dialogoAtual===dialogo)dialogoAtual=null;if(gatilho){gatilho.disabled=false;gatilho.focus();}},{once:true});
  dialogo.showModal();
  const preencher = async () => {
    corpo.textContent='Preparando o exemplo animado…';
    try {
      const demo=await obterExemplo(slug,base);
      if(!dialogo.open)return;
      titulo.textContent=demo.nome;corpo.removeAttribute('role');corpo.innerHTML=htmlDemonstracao(demo,{id:'exemplo-na-lista'});controle=montarDemonstracao(corpo.querySelector('[data-demonstracao]'));
    } catch {
      if(!dialogo.open)return;
      corpo.textContent='Não foi possível abrir esta demonstração. ';
      const repetir=document.createElement('button');repetir.type='button';repetir.className='botão botão--linha';repetir.textContent='Tentar novamente';repetir.addEventListener('click',preencher);corpo.append(repetir);
    }
  };
  await preencher();
}
