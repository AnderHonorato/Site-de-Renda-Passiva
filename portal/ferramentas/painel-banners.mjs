/** Static admin body; the account generator supplies its panel and page shell. */
export function gerarPainelBanners(en=false) {
  const t=(pt,english)=>en?english:pt;
  const campo=(nome,rotulo,tipo='text',attrs='')=>`<label class="conta__campo"><span>${rotulo}</span><input name="${nome}" type="${tipo}" ${attrs}></label>`;
  const area=(nome,rotulo)=>`<label class="conta__campo conta__campo--inteiro"><span>${rotulo}</span><textarea name="${nome}" maxlength="700" rows="3"></textarea></label>`;
  const selecao=(nome,rotulo,opcoes)=>`<label class="conta__campo"><span>${rotulo}</span><select name="${nome}">${opcoes.map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select></label>`;
  return `<div class="ações"><button type="button" class="botão" id="novo-banner">${t('Criar aviso','Create announcement')}</button><button type="button" class="botão botão--linha" id="atualizar-banners">${t('Atualizar lista','Refresh list')}</button></div>
    <div id="lista-banners" aria-live="polite"></div>
    <form id="form-banner" hidden>
      <p class="suave">${t('Os avisos aparecem abaixo do cabeçalho. Use até 12 avisos ativos; todos os campos de texto são exibidos como texto, sem HTML.','Announcements appear below the header. Use up to 12 active announcements; text fields are displayed as text, without HTML.')}</p>
      <div class="conta__grade">
      ${campo('titulo_pt',t('Título em português','Portuguese title'),'text','required maxlength="120"')}${campo('titulo_en',t('Título em inglês','English title'),'text','required maxlength="120"')}
      ${area('texto_pt',t('Texto em português','Portuguese text'))}${area('texto_en',t('Texto em inglês','English text'))}
      ${campo('botao_pt',t('Texto do link em português','Portuguese link label'),'text','maxlength="60"')}${campo('botao_en',t('Texto do link em inglês','English link label'),'text','maxlength="60"')}
      ${campo('url',t('Link interno / ou externo https://','Internal / or external https:// link'),'text','maxlength="700"')}
      ${campo('ordem',t('Ordem no carrossel','Carousel order'),'number','min="0" max="9999" value="0" required')}
      ${campo('cor_texto',t('Cor do texto','Text color'),'color','value="#fff7ed"')}${campo('cor_fundo',t('Cor do fundo','Background color'),'color','value="#452c24"')}
      ${selecao('alinhamento',t('Alinhamento','Alignment'),[['inicio',t('Início','Start')],['centro',t('Centro','Center')]])}
      ${selecao('peso',t('Peso do título','Title weight'),[[600,t('Seminegrito','Semibold')],[700,t('Negrito','Bold')],[400,t('Normal','Normal')]])}
      ${selecao('fonte',t('Fonte do título','Title font'),[['site',t('Texto do site','Site text')],['titulo',t('Títulos do site','Site headings')]])}
      ${selecao('animacao',t('Transição','Transition'),[['deslizar',t('Deslizar','Slide')],['suave',t('Suave','Fade')],['nenhuma',t('Sem animação','No animation')]])}
      ${campo('publicar_em',t('Publicar em (horário local)','Publish at (local time)'),'datetime-local')}${campo('retirar_em',t('Retirar em (horário local)','Withdraw at (local time)'),'datetime-local')}
      ${campo('imagem',t('Imagem de fundo PNG, JPEG ou WebP até 1 MB','Background PNG, JPEG or WebP up to 1 MB'),'file','accept="image/png,image/jpeg,image/webp"')}
      ${campo('alt_pt',t('Descrição da imagem em português','Portuguese image description'),'text','maxlength="200"')}${campo('alt_en',t('Descrição da imagem em inglês','English image description'),'text','maxlength="200"')}
      </div>
      <label class="conta__check"><input type="checkbox" name="remover_imagem">${t('Remover imagem atual','Remove current image')}</label>
      <label class="conta__check"><input type="checkbox" name="ativo">${t('Aviso ativo','Active announcement')}</label>
      <div class="ações"><button type="submit" class="botão">${t('Salvar aviso','Save announcement')}</button><button type="button" class="botão botão--linha" id="cancelar-banner">${t('Cancelar','Cancel')}</button></div>
    </form>`;
}
