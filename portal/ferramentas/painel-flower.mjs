/** Flower provider settings panel. API secrets are entered into a password field and never rendered back. */
export function painelFlower(en = false) {
  const t=(pt,english)=>en?english:pt;
  const field=(name,label,type='text',attrs='')=>`<label class="conta__campo"><span>${label}</span><input name="${name}" type="${type}" ${attrs}></label>`;
  const providers=[['openai','OpenAI · Responses'],['anthropic','Anthropic · Messages'],['gemini','Google Gemini'],['groq','Groq'],['deepseek','DeepSeek'],['mistral','Mistral'],['xai','xAI'],['openrouter','OpenRouter'],['cohere','Cohere'],['custom',t('OpenAI compatível personalizado','Custom OpenAI-compatible')]];
  return `<p class="suave">${t('As chaves ficam cifradas no servidor e nunca são exibidas novamente. O modelo é configurado como texto livre, sem uma lista fixa de modelos.','Keys are encrypted on the server and never shown again. Enter the model as free text; the model list is not fixed.')}</p>
    <p id="flower-admin-notice" class="flower-admin__notice" role="status" aria-live="polite">${t('Carregando configuração do servidor…','Loading server configuration…')}</p>
    <form id="flower-admin-form"><div class="conta__grade">
      <label class="conta__campo"><span>${t('Provedor','Provider')}</span><select name="provider">${providers.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label>
      ${field('model',t('ID do modelo','Model ID'),'text','maxlength="120" required autocomplete="off"')}
      <label class="conta__campo"><span>${t('Chave de API','API key')}</span><input name="apiKey" type="password" maxlength="500" autocomplete="new-password" spellcheck="false" placeholder="••••••••" aria-describedby="flower-key-help"></label>
      <span id="flower-key-help" class="flower-admin__key-help suave">${t('Deixe em branco para manter a chave atual. Este campo nunca é preenchido com a chave salva.','Leave blank to keep the current key. This field is never populated with the saved key.')}</span>
      ${field('baseUrl',t('URL base HTTPS','HTTPS base URL'),'url','maxlength="300" placeholder="https://api.exemplo.com" autocomplete="url"')}
    </div>
    <label class="conta__check"><input name="enabled" type="checkbox">${t('Habilitar respostas de IA online','Enable online AI replies')}</label>
    <label class="conta__check"><input name="clearKey" type="checkbox">${t('Apagar a chave salva','Delete saved key')}</label>
    <div class="ações"><button type="submit" class="botão" id="flower-admin-save">${t('Salvar configuração','Save configuration')}</button></div></form>`;
}
