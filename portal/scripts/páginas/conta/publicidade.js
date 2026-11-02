import { api,en,estado,mensagemErro,obterSessao } from './comum.js';
const t = (pt,english)=>en ? english : pt;
const form=document.getElementById('form-publicidade');
function preencher(config) {
  for(const campo of ['ativo','teste','demonstracao']) form.elements[campo].checked=config[campo];
  form.elements.editor.value=config.editor||'';
  for(const campo of ['resultado','lista','rodape']) form.elements[campo].value=config.blocos[campo]||'';
  document.getElementById('publicidade-status').textContent=!config.ativo ? t('Publicidade desligada.','Advertising is off.') : config.demonstracao ? t('Demonstração local ligada. Não gera receita.','Local preview enabled. No revenue generated.') : t('AdSense configurado. A exibição depende da aprovação do site, dos blocos e do consentimento.','AdSense configured. Display depends on site approval, ad units, and consent.');
}
function erroClaro(e) {
  const erros={editor_invalido:t('Confira o ID ca-pub com 16 números.','Check the ca-pub ID with 16 digits.'),bloco_invalido:t('Os blocos precisam ter de 6 a 20 números.','Ad unit IDs must contain 6 to 20 digits.'),configuracao_incompleta:t('Informe um editor e ao menos um bloco ou use a demonstração local.','Enter a publisher and at least one ad unit or use local preview.'),demonstracao_local:t('Demonstração só está disponível no ambiente local.','Preview is only available locally.')};
  return erros[e.message]||mensagemErro(e);
}
try {
  if((await obterSessao()).usuario?.papel!=='admin') location.replace(`../../entrar.html?volta=${encodeURIComponent(location.pathname)}`);
  else {
    const b=await api('/api/admin/publicidade');preencher(b.config);form.hidden=false;
    if(!b.local) { document.getElementById('opcao-demonstracao').hidden=true;form.elements.demonstracao.checked=false; }
    form.addEventListener('submit',async ev=>{
      ev.preventDefault();const botao=form.querySelector('[type="submit"]');if(botao.disabled)return;botao.disabled=true;
      const dados={ativo:form.elements.ativo.checked,teste:form.elements.teste.checked,demonstracao:form.elements.demonstracao.checked,editor:form.elements.editor.value.trim(),blocos:Object.fromEntries(['resultado','lista','rodape'].map(p=>[p,form.elements[p].value.trim()]))};
      try { const r=await api('/api/admin/publicidade',{metodo:'PUT',dados});preencher(r.config);estado(t('Configuração salva. Reabra a página de prévia para conferir.','Settings saved. Reopen the preview page to inspect.')); }
      catch(e) { estado(erroClaro(e),true); }
      finally { botao.disabled=false; }
    });
  }
} catch(e) { estado(erroClaro(e),true); }
