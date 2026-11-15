import { api } from '../../núcleo/api.js';

const en=document.documentElement.lang?.startsWith('en');
const t=(pt,english)=>en?english:pt;
const form=document.getElementById('flower-admin-form');
const notice=document.getElementById('flower-admin-notice');
const save=document.getElementById('flower-admin-save');
if(form&&notice&&save){
  let config=null,busy=false;
  const say=(text,bad=false)=>{notice.textContent=text;notice.classList.toggle('flower-admin__notice--error',bad);};
  const errorText=e=>({
    flower_desatualizada:t('Outra alteração foi salva. Atualize a página antes de editar.','Another change was saved. Refresh this page before editing.'),
    flower_config_incompleta:t('Informe um modelo e salve uma chave de API antes de habilitar a IA online.','Enter a model and save an API key before enabling online AI.'),
    flower_chave_nova_obrigatoria:t('Ao trocar o provedor ou endereço, informe a chave nova antes de habilitar a IA.','When changing the provider or endpoint, enter the new key before enabling AI.'),
    flower_chave_ambigua:t('Informe uma chave nova ou marque para apagar a atual, sem selecionar as duas opções.','Enter a new key or choose to delete the saved one, not both.'),
    flower_base_url_invalida:t('Use uma URL HTTPS pública, sem credenciais, parâmetros ou porta personalizada.','Use a public HTTPS URL without credentials, query parameters, or a custom port.'),
    csrf_invalido:t('A sessão de segurança expirou. Atualize a página e tente novamente.','The security session expired. Refresh the page and try again.'),
    acesso_negado:t('Somente administradores podem alterar esta configuração.','Only administrators can change this setting.'),
    sessao_necessaria:t('Entre com uma conta administradora para editar a configuração.','Sign in with an administrator account to edit this setting.'),
  })[e.message]||t('Não foi possível acessar a configuração. Confira se o servidor do portal está online.','The configuration could not be reached. Check that the portal server is online.');
  const provider=form.elements.provider,base=form.elements.baseUrl;
  function syncBase(){const custom=provider.value==='custom';base.closest('label').hidden=!custom;base.required=custom;}
  provider.addEventListener('change',syncBase);
  async function load(){
    try {
      config=await api('/api/admin/flower');
      provider.value=config.provider;form.elements.model.value=config.model;form.elements.baseUrl.value=config.baseUrl||'';
      form.elements.enabled.checked=config.enabled;form.elements.apiKey.value='';form.elements.clearKey.checked=false;
      say(config.hasKey?t('Há uma chave cifrada salva. Informe uma nova chave apenas para substituí-la.','An encrypted key is saved. Enter a new key only to replace it.'):t('Nenhuma chave está configurada. A Flower usa respostas padrão até o servidor receber uma chave válida.','No key is configured. Flower uses standard replies until the server receives a valid key.'));
      syncBase();for(const el of form.elements)el.disabled=false;save.disabled=false;
    } catch(e) {
      for(const el of form.elements)el.disabled=true;save.disabled=true;
      if([401,403].includes(e.status))say(errorText(e),true);
      else say(t('Esta página estática não pode salvar chaves. Configure um servidor online do portal para habilitar este painel.','This static page cannot save API keys. Run the portal server online to enable this panel.'),true);
    }
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(busy||!config)return;
    busy=true;save.disabled=true;
    try {
      config=await api('/api/admin/flower',{metodo:'PUT',dados:{provider:provider.value,model:form.elements.model.value,apiKey:form.elements.apiKey.value,baseUrl:form.elements.baseUrl.value,enabled:form.elements.enabled.checked,clearKey:form.elements.clearKey.checked,revision:config.revision},prazoMs:20000});
      form.elements.apiKey.value='';form.elements.clearKey.checked=false;form.elements.enabled.checked=config.enabled;
      window.dispatchEvent(new Event('portal:flower-configurada'));
      say(t('Configuração salva. A chave permanece cifrada no servidor.','Configuration saved. The key remains encrypted on the server.'));
    } catch(e) { say(errorText(e),true); }
    finally {busy=false;save.disabled=false;}
  });
  load();
}
