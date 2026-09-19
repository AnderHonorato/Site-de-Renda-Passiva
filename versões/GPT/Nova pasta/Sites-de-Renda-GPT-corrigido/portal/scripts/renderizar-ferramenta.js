import {elemento,botao} from './elemento.js';
import {baixar} from './baixar.js';
import {ler,guardar} from './armazenamento.js';
import {notificar} from './notificar.js';
let limparMontagem;let urls=[];let versao=0;
function limpar(){limparMontagem?.();limparMontagem=undefined;urls.forEach(u=>URL.revokeObjectURL(u));urls=[];versao++;}
function urlBlob(blob){const url=URL.createObjectURL(blob);urls.push(url);return url;}
export function renderizarFerramenta(f,categoria,restaurado){
 limpar();const dialogo=document.getElementById('ferramenta-dialogo');const corpo=document.getElementById('ferramenta-corpo');corpo.replaceChildren();dialogo.classList.remove('saida-grafica');
 document.getElementById('ferramenta-titulo').textContent=f.titulo;document.getElementById('ferramenta-categoria').textContent=categoria.nome;document.getElementById('ferramenta-descricao').textContent=f.descricao;
 corpo.style.setProperty('--destaque',categoria.cor);
 if(f.montar){const espaco=elemento('div','painel');corpo.append(espaco);limparMontagem=f.montar(espaco);}
 const layout=elemento('div','ferramenta-layout');const form=elemento('form');const campos=elemento('div','campos');const resultado=elemento('section','resultado');resultado.setAttribute('aria-live','polite');resultado.append(elemento('p','resultado-vazio','Seu resultado aparece aqui. Confira os campos e escolha Calcular / gerar.'));
 const controles=new Map();
 for(const c of f.campos??[]){
  const caixa=elemento('div','campo'+(['textarea','file'].includes(c.tipo)?' largo':''));const label=elemento('label','',c.rotulo);const id='campo-'+c.nome;label.htmlFor=id;
  let entrada=elemento(c.tipo==='textarea'?'textarea':c.tipo==='select'?'select':'input');entrada.id=id;entrada.name=c.nome;
  if(c.tipo==='select'){for(const opcao of c.opcoes??[]){const opt=elemento('option','',typeof opcao==='string'?opcao:opcao.rotulo);opt.value=typeof opcao==='string'?opcao:opcao.valor;entrada.append(opt);}}
  else if(c.tipo!=='textarea'){entrada.type=c.tipo==='number'?'text':c.tipo??'text';if(c.tipo==='number')entrada.inputMode='decimal';}
  if(c.tipo==='file'){entrada.accept=c.aceita??'';entrada.multiple=!!c.multiplo;}
  else if(c.tipo==='checkbox'){entrada.checked=!!(restaurado?.dados?.[c.nome]??c.valor);}
  else entrada.value=restaurado?.dados?.[c.nome]??c.valor??'';
  if(c.obrigatorio)entrada.required=true;
  if(c.placeholder)entrada.placeholder=c.placeholder;
  if(c.tipo!=='file'&&c.tipo!=='select'&&c.tipo!=='checkbox')entrada.maxLength=c.maxLength??50000;
  if(c.tipo==='textarea')entrada.rows=c.linhas??5;
  caixa.append(label,entrada);if(c.ajuda)caixa.append(elemento('small','',c.ajuda));campos.append(caixa);controles.set(c.nome,{c,entrada});
 }
 const acoes=elemento('div','acoes');const executar=elemento('button','botao primario',f.acao??'Calcular / gerar');executar.type='submit';acoes.append(executar);const erro=elemento('p','erro');erro.hidden=true;erro.setAttribute('role','alert');erro.tabIndex=-1;
 form.append(campos,acoes,erro);layout.append(form,resultado);if(f.campos?.length||f.executar)corpo.append(layout);
 const detalhes=elemento('details','metodologia');detalhes.append(elemento('summary','','Como funciona e o que considerar'),elemento('p','',f.metodologia??'Resultados calculados a partir dos dados informados.'));corpo.append(detalhes);
 const obterDados=()=>Object.fromEntries([...controles].map(([nome,{c,entrada}])=>[nome,c.tipo==='file'?(c.multiplo?[...entrada.files]:entrada.files[0]):c.tipo==='checkbox'?entrada.checked:entrada.value]));
 form.addEventListener('input',()=>{urls.forEach(u=>URL.revokeObjectURL(u));urls=[];versao++;resultado.replaceChildren(elemento('p','resultado-vazio','Os campos foram alterados. Calcule novamente para atualizar o resultado.'));erro.hidden=true;});
 form.onsubmit=async e=>{e.preventDefault();erro.hidden=true;executar.disabled=true;executar.textContent='Preparando resultado...';const atual=++versao;
  try{
   const dados=obterDados();for(const {c,entrada} of controles.values()){if(c.obrigatorio&&c.tipo==='file'&&!entrada.files.length)throw Error(`Selecione: ${c.rotulo}.`);}
   const r=await f.executar(dados);if(atual!==versao||!dialogo.open)return;
   urls.forEach(u=>URL.revokeObjectURL(u));urls=[];resultado.replaceChildren(elemento('span','sobretitulo','SEU RESULTADO'),elemento('h3','',String(r.resumo??'Pronto')));
   dialogo.classList.toggle('saida-grafica',!!r.svg);const dadosImpressao=elemento('div','dados-impressao');for(const c of f.campos??[]){if(c.tipo!=='file')dadosImpressao.append(elemento('p','',c.rotulo+': '+String(dados[c.nome]??'')));}resultado.append(dadosImpressao);for(const linha of r.linhas??[])resultado.append(elemento('p','',String(linha)));
   if(r.svg||r.imagem){const previa=elemento('div','preview');const img=elemento('img');img.alt='Prévia do resultado gerado';if(r.svg){img.src=urlBlob(new Blob([r.svg],{type:'image/svg+xml'}));const doc=new DOMParser().parseFromString(r.svg,'image/svg+xml');const largura=doc.documentElement.getAttribute('width');if(/^\d+(\.\d+)?mm$/.test(largura??''))img.style.width=largura;}else img.src=r.imagem instanceof Blob?urlBlob(r.imagem):r.imagem;previa.append(img);resultado.append(previa);}
   const botoes=elemento('div','acoes');
   botoes.append(botao('Copiar resultado',async()=>{try{await navigator.clipboard.writeText([f.titulo,r.resumo,...(r.linhas??[])].join('\n'));notificar('Resultado copiado.');}catch{notificar('Não foi possível copiar. Selecione o texto do resultado.');}}));
   botoes.append(botao('Imprimir',()=>window.print()));
   const arquivos=[...(r.arquivo?[r.arquivo]:[]),...(r.arquivos??[])];if(r.svg&&!arquivos.length)arquivos.push({nome:f.id+'.svg',blob:new Blob([r.svg],{type:'image/svg+xml'})});
   for(const arquivo of arquivos){if(arquivo.blob instanceof Blob){botoes.append(botao('Baixar '+arquivo.nome,()=>baixar(arquivo.blob,arquivo.nome)));if(arquivo.blob.type==='image/svg+xml')botoes.append(botao('PDF: '+arquivo.nome.replace(/\.svg$/i,''),async e=>{const b=e.currentTarget;b.disabled=true;try{const {svgParaPdf}=await import('./svg-para-pdf.js');baixar(await svgParaPdf(arquivo.blob),arquivo.nome.replace(/\.svg$/i,'')+'.pdf');}catch(erro){notificar(erro.message);}finally{b.disabled=false;}}));}}
   resultado.append(botoes);
   if(f.persistir!==false&&!f.sensivel){const area=elemento('div','salvar-area');const label=elemento('label','','Nome deste registro');label.htmlFor='nome-registro';const nome=elemento('input','nome-registro');nome.id='nome-registro';nome.maxLength=120;nome.value=restaurado?.nome??f.titulo;area.append(label,nome,botao(restaurado?'Atualizar salvo':'Salvar no aparelho',()=>{
     const registros=ler('registros',[]);if(registros.length>=200&&!restaurado){notificar('Limite de 200 registros. Exporte sua cópia e exclua alguns.');return;}
     const valores=Object.fromEntries(Object.entries(dados).filter(([,v])=>['string','boolean','number'].includes(typeof v)));
     const registro={id:restaurado?.id??crypto.randomUUID(),nome:nome.value.trim()||f.titulo,ferramenta:f.id,dados:valores,data:new Date().toISOString()};
     const indice=registros.findIndex(x=>x.id===registro.id);if(indice>=0)registros[indice]=registro;else registros.unshift(registro);
     if(guardar('registros',registros)){restaurado=registro;notificar('Registro salvo neste navegador.');}else notificar('Não foi possível salvar. O armazenamento pode estar cheio ou bloqueado.');
    }));resultado.append(area);}
  }catch(e){if(atual===versao){erro.textContent=e.message||'Não foi possível gerar o resultado. Revise os dados.';erro.hidden=false;erro.focus();}}
  finally{executar.disabled=false;executar.textContent=f.acao??'Calcular / gerar';}
 };
 dialogo.onclose=()=>{limpar();corpo.replaceChildren();};dialogo.showModal();
}


