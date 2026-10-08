import { montarPágina, escapar } from './modelo-de-página.mjs';
import { site } from '../dados/site.js';
import { ícone } from '../scripts/núcleo/ícones.js';
import { gerarPainelBanners } from './painel-banners.mjs';

const textos = {
  'pt-BR': {
    entrar: ['Entrar', 'Acesse sua conta para conversar e guardar suas preferências.', 'E-mail', 'Senha', 'Entrar', 'Criar conta', 'Esqueci minha senha'],
    criar: ['Criar conta', 'Crie sua conta para usar a comunidade e guardar seus dados.', 'Como quer ser chamado', '@usuário', 'E-mail', 'Senha', 'Idade', 'Confirmo que li os termos e tenho pelo menos 13 anos para usar o chat.', 'Criar conta'],
    recuperar: ['Recuperar senha', 'Informe seu e-mail para receber as instruções de recuperação de senha.', 'E-mail', 'Enviar instruções'],
    redefinir: ['Definir nova senha', 'Escolha uma nova senha para proteger sua conta.', 'Nova senha', 'Salvar nova senha'],
    conta: ['Minha conta', 'Gerencie seus dados, perfil e segurança.', 'Como quer ser chamado', '@usuário', 'Biografia', 'De onde é', 'Salvar perfil', 'Trocar senha', 'Senha atual', 'Nova senha', 'Atualizar senha', 'Meus dados', 'Exportar meus dados', 'Excluir minha conta', 'Sair', 'Minhas amizades', 'Solicitações', 'Enviar pedido', 'Preferências', 'Idioma', 'Tema', 'Salvar preferências'],
    moderar: ['Moderação do chat', 'Analise denúncias e tome medidas sobre o chat.', 'Atualizar denúncias'],
    perfil: ['Perfil', 'Conheça as pessoas da comunidade e gerencie suas conexões.'],
    suporte: ['Mensagens', 'Converse com a equipe sobre sua conta e acompanhe as respostas.'],
    trabalhos: ['Meus trabalhos', 'Reabra, renomeie ou apague os valores que você escolheu salvar nas ferramentas.'],
    niveis: ['Níveis e medalhas', 'Veja como sua participação no portal evolui o nível, as medalhas e as personalizações do perfil.'],
    usuarios: ['Usuários', 'Gerencie contas e planos pelo painel administrativo.'],
    adminSuporte: ['Suporte', 'Responda às mensagens enviadas pelos usuários.'],
    novidades: ['Novidades', 'Edite a apresentação de novidades, sua ordem e as datas de publicação.'],
    publicidade: ['Publicidade', 'Configure os blocos de anúncios e confira as posições na prévia local.'],
    banners: ['Avisos prioritários', 'Crie avisos abaixo do cabeçalho, com imagem, textos, links e carrossel.'],
  },
  en: {
    entrar: ['Sign in', 'Access your account to chat and save your preferences.', 'Email', 'Password', 'Sign in', 'Create account', 'Forgot password'],
    criar: ['Create account', 'Create an account to use the community and save your data.', 'What should we call you?', '@username', 'Email', 'Password', 'Age', 'I have read the terms and I am at least 13 to use chat.', 'Create account'],
    recuperar: ['Reset password', 'Enter your email to receive password reset instructions.', 'Email', 'Send instructions'],
    redefinir: ['Set a new password', 'Choose a new password to protect your account.', 'New password', 'Save new password'],
    conta: ['My account', 'Manage your data, profile, and security.', 'What should we call you?', '@username', 'Bio', 'Where are you from?', 'Save profile', 'Change password', 'Current password', 'New password', 'Update password', 'My data', 'Export my data', 'Delete my account', 'Sign out', 'My friends', 'Requests', 'Send request', 'Preferences', 'Language', 'Theme', 'Save preferences'],
    moderar: ['Chat moderation', 'Review reports and take action on chat content.', 'Refresh reports'],
    perfil: ['Profile', 'Meet community members and manage your connections.'],
    suporte: ['Messages', 'Contact the team about your account and follow replies.'],
    trabalhos: ['My works', 'Reopen, rename, or delete the values you chose to save in tools.'],
    niveis: ['Levels and medals', 'See how your activity evolves your level, medals, and profile customizations.'],
    usuarios: ['Users', 'Manage accounts and plans in the admin panel.'],
    adminSuporte: ['Support', 'Reply to messages sent by users.'],
    novidades: ['News', 'Edit news, their order and publication dates.'],
    publicidade: ['Advertising', 'Configure ad units and inspect their positions in the local preview.'],
    banners: ['Priority announcements', 'Create announcements below the header with images, text, links, and a carousel.'],
  },
};

function campo(id, rotulo, tipo = 'text', attrs = '') {
  return `<label class="conta__campo"><span>${escapar(rotulo)}</span><input id="${id}" name="${id}" type="${tipo}" ${attrs}></label>`;
}

function quadro(titulo, descricao, interior, id) {
  const modo = ['conta', 'perfil'].includes(id) ? 'conta--modal' : 'conta--drawer';
  return `<section class="conta ${modo}"><div class="painel conta__painel" id="${id}">
    <div class="conta__barra-topo">
      <div><p class="rótulo">${escapar(titulo)}</p><h1>${escapar(titulo)}</h1></div>
      <button class="conta__fechar-painel" type="button" aria-label="Fechar">${ícone('fechar')}</button>
    </div>
    <p class="suave conta__descricao">${escapar(descricao)}</p>
    <div class="conta__rolagem">${interior}</div>
    <p class="conta__estado" role="status" aria-live="polite"></p>
  </div></section>`;
}


/** Cadastro mantém seus dados e segurança; atividade e visual ficam na edição do perfil. */
function separarCadastro(html,en){
  return html
    .replace(/<nav class="conta__acoes-rapidas"[\s\S]*?<\/nav>/,'')
    .replace(/<button[^>]*data-conta-aba="(?:aparencia|amizades)"[^>]*>[\s\S]*?<\/button>/g,'')
    .replace(/<section class="conta__aba" data-conta-painel="(?:aparencia|amizades|trabalhos|favoritos|mensagens|planos)"[^>]*>[\s\S]*?<\/section>/g,'')
    .replace(/<div class="conta__subtitulo"><div><h2>(?:Ferramentas recomendadas|Recommended tools)<\/h2>[\s\S]*?<form id="form-recomendadas"[\s\S]*?<\/form>/,'')
    .replace(/<label class="conta__campo conta__campo--inteiro">[\s\S]*?<\/label>/,'')
    .replace(/<label class="conta__campo"><span>[^<]*<\/span><input id="local"[^>]*><\/label>/,'')
    .replace(/<div class="conta__visibilidade">[\s\S]*?<\/div>/,'')
    .replace(/<fieldset class="conta__sociais">[\s\S]*?<\/fieldset>/,'')
    .replace(/<nav id="conta-admin"[\s\S]*?<\/nav>/,'')
    .replace(/Gerencie seus dados, perfil e segurança\./,'Gerencie seus dados de cadastro e a segurança da conta.')
    .replace(/Manage your data, profile, and security\./,'Manage your registration details and account security.')
    .replace(/(<button[^>]*data-conta-aba="perfil"[^>]*>)[\s\S]*?(<\/button>)/,'$1'+(en?'Registration details':'Dados cadastrais')+'$2')
    .replace(/[ \t]+(?=\r?\n)/g,'')
    .replace(/\n[ \t]*\n[ \t]*\n/g,'\n\n');
}

export function paginasConta(ctx) {
  const t = textos[ctx.código] || textos['pt-BR'];
  const prefixo = ctx.idioma.pasta;
  const raiz = prefixo ? '../' : '';
  const en = ctx.código === 'en';
  const montarConta = () => quadro(t.conta[0], t.conta[1], `<div id="conta-conteudo" hidden>
      <nav class="conta__acoes-rapidas" aria-label="${en ? 'Quick actions' : 'Ações rápidas'}">
        <button class="conta__acao" type="button" data-conta-aba="perfil">${ícone('pessoas')}<span>${en ? 'Profile' : 'Perfil'}</span></button>
        <button class="conta__acao" type="button" data-conta-aba="trabalhos">${ícone('pasta')}<span>${en ? 'Works' : 'Trabalhos'}</span></button>
        <button class="conta__acao" type="button" data-conta-aba="favoritos">${ícone('estrela')}<span>${en ? 'Favorites' : 'Favoritos'}</span></button>
        <button class="conta__acao" type="button" data-conta-aba="mensagens">${ícone('balão')}<span>${en ? 'Messages' : 'Mensagens'}</span></button>
        <button class="conta__acao" type="button" data-conta-aba="planos">${ícone('estrela')}<span>${en ? 'Plans' : 'Planos'}</span></button>
        <button class="conta__acao conta__acao--sair" id="sair-conta" type="button">${ícone('seta')}<span>${escapar(t.conta[14])}</span></button>
      </nav>

      <div id="conta-resumo-slot"></div>

      <nav class="conta__abas" aria-label="${en ? 'Account sections' : 'Seções da conta'}">
        <button type="button" data-conta-aba="perfil" aria-pressed="true">${ícone('pessoas')}${en ? 'Profile' : 'Perfil'}</button>
        <button type="button" data-conta-aba="aparencia" aria-pressed="false">${ícone('estrela')}${en ? 'Style' : 'Visual'}</button>
        <button type="button" data-conta-aba="preferencias" aria-pressed="false">${ícone('engrenagem')}${en ? 'Settings' : 'Preferências'}</button>
        <button type="button" data-conta-aba="seguranca" aria-pressed="false">${ícone('escudo')}${en ? 'Security' : 'Segurança'}</button>
        <button type="button" data-conta-aba="amizades" aria-pressed="false">${ícone('pessoas')}${en ? 'Friends' : 'Amigos'}</button>
      </nav>

      <section class="conta__aba" data-conta-painel="perfil">
        <form id="form-perfil" class="conta__form conta__form--compacta">
          <div class="conta__editor-avatar">
            <div id="avatar-preview" class="conta__avatar"></div>
            <div>
              <strong>${en ? 'Profile image' : 'Imagem do perfil'}</strong>
              <p class="suave pequeno">${en ? 'Choose an illustrated avatar or use your own photo.' : 'Escolha um avatar ilustrado ou use sua própria foto.'}</p>
              <div class="ações">
                <label class="botão botão--linha conta__upload" for="foto-perfil">${ícone('imagem')}${en ? 'Use photo' : 'Usar foto'}</label>
                <input class="sr-só" id="foto-perfil" type="file" accept="image/png,image/jpeg,image/webp">
                <button class="botão botão--linha" id="recortar-foto" type="button" hidden>${ícone('imagem')}${en ? 'Crop photo' : 'Recortar foto'}</button>
                <button class="botão botão--texto" id="remover-foto" type="button" hidden>${ícone('lixeira')}${en ? 'Remove photo' : 'Remover foto'}</button>
              </div>
            </div>
          </div>
          <input name="avatar" type="hidden" value="sol">
          <div id="avatar-opcoes" class="conta__avatar-opcoes" aria-label="${en ? 'Illustrated avatars' : 'Avatares ilustrados'}"></div>
          <div class="conta__campos-duplos">
            ${campo('nome', t.conta[2], 'text', 'autocomplete="name" maxlength="80" required')}
            ${campo('usuario', t.conta[3], 'text', 'readonly')}
          </div>
          <label class="conta__campo conta__campo--inteiro"><span>${escapar(t.conta[4])}</span><textarea name="bio" maxlength="280" rows="3"></textarea></label>
          ${campo('local', t.conta[5], 'text', 'maxlength="80"')}
          <div class="conta__visibilidade">
            <label class="conta__aceite"><input name="bioVisivel" type="checkbox" checked><span>${en ? 'Public bio' : 'Biografia pública'}</span></label>
            <label class="conta__aceite"><input name="localVisivel" type="checkbox" checked><span>${en ? 'Public location' : 'Localização pública'}</span></label>
          </div>
          <fieldset class="conta__sociais">
            <legend>${en ? 'Links on your public profile' : 'Links no perfil público'}</legend>
            ${campo('site', 'Site', 'url', 'placeholder="https://..." maxlength="300"')}
            ${campo('instagram', 'Instagram', 'text', 'placeholder="@usuario" maxlength="51"')}
            ${campo('tiktok', 'TikTok', 'text', 'placeholder="@usuario" maxlength="51"')}
            ${campo('x', 'X', 'text', 'placeholder="@usuario" maxlength="51"')}
            ${campo('facebook', 'Facebook', 'text', 'placeholder="@usuario" maxlength="51"')}
            ${campo('whatsapp', 'WhatsApp', 'tel', 'placeholder="5511999999999" maxlength="20"')}
          </fieldset>
        </form>

        <div class="conta__subtitulo"><div><h2>${en ? 'Recommended tools' : 'Ferramentas recomendadas'}</h2><p class="suave pequeno">${en ? 'Choose up to five tools you have used.' : 'Escolha até cinco ferramentas que você já usou.'}</p></div></div>
        <form id="form-recomendadas" class="conta__form conta__form--sem-caixa"><div id="opcoes-recomendadas" class="conta__recomendadas"></div></form>
      </section>

      <section class="conta__aba" data-conta-painel="aparencia" hidden>
        <div class="conta__subtitulo"><div><h2>${en ? 'Plan and progress' : 'Plano e evolução'}</h2><p class="suave pequeno">${en ? 'Your activity unlocks new profile styles.' : 'Sua atividade desbloqueia novos visuais para o perfil.'}</p></div></div>
        <button type="button" id="plano-visual" class="conta__plano" data-conta-aba="planos"></button>
        <div id="progresso-nivel" class="conta__progresso"></div>
        <button type="button" id="previa-conquista" class="botão botão--linha">${ícone('estrela')}${en ? 'Replay level celebration' : 'Ver animação do nível'}</button>

        <a class="conta__como-evoluir" href="../niveis.html">${ícone('ajuda')}${en ? 'How levels and medals work' : 'Como funcionam níveis e medalhas'}</a>

        <div class="conta__subtitulo"><div><h2>${en ? 'Profile banner' : 'Banner do perfil'}</h2><p class="suave pequeno">${en ? 'One style unlocks at each milestone.' : 'Novos estilos são desbloqueados conforme o nível.'}</p></div></div>
        <div id="opcoes-banner" class="conta__personalizacoes"></div>
        <div class="conta__subtitulo"><div><h2>${en ? 'Profile frame' : 'Moldura do perfil'}</h2></div></div>
        <div id="opcoes-moldura" class="conta__personalizacoes"></div>
      </section>

      <section class="conta__aba" data-conta-painel="preferencias" hidden>
        <form id="form-preferencias" class="conta__form conta__form--compacta">
          <label class="conta__campo"><span>${escapar(t.conta[19])}</span><select name="idioma"><option value="pt-BR">Português</option><option value="en">English</option></select></label>
          <label class="conta__campo"><span>${escapar(t.conta[20])}</span><select name="tema"><option value="sistema">${en ? 'System' : 'Sistema'}</option><option value="claro">${en ? 'Light' : 'Claro'}</option><option value="escuro">${en ? 'Dark' : 'Escuro'}</option></select></label>
          <label class="conta__aceite"><input id="sons-ativos" type="checkbox"><span>${en ? 'Sounds for messages, achievements and chat' : 'Sons para mensagens, conquistas e chat'}</span></label>
          <p class="suave pequeno">${en ? 'Short, quiet sounds. This choice is saved on this device.' : 'Sons curtos e discretos. Esta escolha fica salva neste aparelho.'}</p>
        </form>
      </section>

      <section class="conta__aba" data-conta-painel="seguranca" hidden>
        <h2>${escapar(t.conta[7])}</h2>
        <form id="form-senha" class="conta__form conta__form--compacta">${campo('senhaAtual', t.conta[8], 'password', 'autocomplete="current-password" required')}${campo('novaSenha', t.conta[9], 'password', 'autocomplete="new-password" minlength="12" maxlength="128" required')}<button class="botão botão--primário" type="submit">${escapar(t.conta[10])}</button></form>
        <h2>${escapar(t.conta[11])}</h2>
        <div class="conta__dados-acoes"><button class="botão" id="exportar-conta" type="button">${ícone('baixar')}${escapar(t.conta[12])}</button><button class="botão botão--linha" id="excluir-conta" type="button">${ícone('lixeira')}${escapar(t.conta[13])}</button></div>
        <form id="form-excluir" class="conta__form" hidden><p>${en ? 'This permanently deletes your account and data. Enter your password to confirm.' : 'Isso exclui definitivamente sua conta e seus dados. Digite sua senha para confirmar.'}</p>
          ${campo('senhaExclusao', t.conta[8], 'password', 'autocomplete="current-password" required')}
          <div class="ações"><button class="botão" type="submit">${escapar(t.conta[13])}</button><button class="botão botão--linha" id="cancelar-exclusao" type="button">${en ? 'Cancel' : 'Cancelar'}</button></div>
        </form>
      </section>

      <section class="conta__aba" data-conta-painel="amizades" hidden>
        <h2>${escapar(t.conta[15])}</h2><div id="amizades" class="conta__amizades"></div>
        <form id="form-amizade" class="conta__form conta__form--linha">${campo('amigo', '@usuário', 'text', 'autocomplete="off"')}<button class="botão" type="submit">${ícone('mais')}${escapar(t.conta[17])}</button></form>
      </section>

      <section class="conta__aba" data-conta-painel="trabalhos" hidden>
        <h2>${en ? 'Your saved works' : 'Seus trabalhos salvos'}</h2><p id="trabalhos-resumo" class="suave pequeno"></p><div id="lista-trabalhos"></div>
      </section>
      <section class="conta__aba" data-conta-painel="planos" hidden>
        <h2>${en ? 'Plans and account limits' : 'Planos e limites da conta'}</h2><div id="conta-planos" class="conta__planos"></div>
        <p class="suave pequeno">${en ? 'Paid plans are granted by the administrator. There is no automatic checkout.' : 'Planos pagos são liberados pelo administrador. Não há cobrança automática.'}</p>
        <button type="button" class="botão botão--linha" data-conta-aba="mensagens">${en ? 'Contact support' : 'Falar com o suporte'}</button>
      </section>
      <section class="conta__aba" data-conta-painel="favoritos" hidden>
        <h2>${en ? 'Your favorite tools' : 'Suas ferramentas favoritas'}</h2><div id="conta-favoritos" class="conta__colecao"></div>
      </section>
      <section class="conta__aba" data-conta-painel="mensagens" hidden>
        <h2>${en ? 'Messages to support' : 'Mensagens ao suporte'}</h2>
        <form id="form-suporte" class="conta__form">${campo('assunto', en ? 'Subject' : 'Assunto', 'text', 'minlength="3" maxlength="100" required')}<label class="conta__campo"><span>${en ? 'Message' : 'Mensagem'}</span><textarea name="texto" minlength="10" maxlength="2000" rows="3" required></textarea></label><button class="botão" type="submit">${en ? 'Send message' : 'Enviar mensagem'}</button></form><div id="lista-suporte"></div>
      </section>

      <nav id="conta-admin" class="conta__admin" hidden><a class="conta__acao" href="../admin/chat/">${ícone('escudo')}${en ? 'Chat moderation' : 'Moderação'}</a><a class="conta__acao" href="../admin/usuarios/">${ícone('pessoas')}${en ? 'Users' : 'Usuários'}</a><a class="conta__acao" href="../admin/suporte/">${ícone('balão')}${en ? 'Support' : 'Suporte'}</a><a class="conta__acao" href="../admin/publicidade/">${ícone('balão')}${en ? 'Advertising' : 'Publicidade'}</a><a class="conta__acao" href="../admin/banners/">${ícone('megafone')}${en ? 'Announcements' : 'Avisos'}</a><a class="conta__acao" href="../admin/novidades/">${ícone('balão')}${en ? 'News' : 'Novidades'}</a></nav>

      <div id="conta-salvar" class="conta-salvar" hidden>
        <span>${en ? 'You have unsaved changes' : 'Você alterou algumas coisas'}</span>
        <div><button id="cancelar-alteracoes" class="botão botão--linha" type="button">${en ? 'Cancel changes' : 'Cancelar alterações'}</button><button id="salvar-alteracoes" class="botão botão--primário" type="button">${en ? 'Save changes' : 'Salvar alterações'}</button></div>
      </div>
    </div>`, 'conta');
  const paginas = [
    ['entrar.html', 'entrar', quadro(t.entrar[0], t.entrar[1], `<form id="form-entrar" class="conta__form">
      ${campo('email', t.entrar[2], 'email', 'autocomplete="username" required')}
      ${campo('senha', t.entrar[3], 'password', 'autocomplete="current-password" required')}
      <button class="botão botão--primário" type="submit">${escapar(t.entrar[4])}</button></form>
      <div class="conta__links"><a href="criar-conta.html">${escapar(t.entrar[5])}</a><a href="recuperar-senha.html">${escapar(t.entrar[6])}</a></div>`, 'entrar')],
    ['criar-conta.html', 'criar', quadro(t.criar[0], t.criar[1], `<form id="form-criar" class="conta__form">
      ${campo('nome', t.criar[2], 'text', 'autocomplete="name" maxlength="80" required')}
      ${campo('usuario', t.criar[3], 'text', 'autocomplete="username" minlength="3" maxlength="20" pattern="[a-z0-9_]{3,20}" required')}
      <small id="usuario-disponibilidade" aria-live="polite"></small>
      ${campo('email', t.criar[4], 'email', 'autocomplete="email" required')}
      ${campo('senha', t.criar[5], 'password', 'autocomplete="new-password" minlength="12" maxlength="128" required')}
      ${campo('idade', t.criar[6], 'number', 'min="13" max="120" inputmode="numeric" required')}
      <label class="conta__aceite"><input name="aceitaTermos" type="checkbox" required><span>${escapar(t.criar[7])} <a href="termos.html">${en ? 'Terms' : 'Termos'}</a></span></label>
      <button class="botão botão--primário" type="submit">${escapar(t.criar[8])}</button></form>`, 'criar')],
    ['recuperar-senha.html', 'recuperar', quadro(t.recuperar[0], t.recuperar[1], `<form id="form-recuperar" class="conta__form">${campo('email', t.recuperar[2], 'email', 'autocomplete="email" required')}<button class="botão botão--primário" type="submit">${escapar(t.recuperar[3])}</button></form>`, 'recuperar')],
    ['redefinir-senha.html', 'redefinir', quadro(t.redefinir[0], t.redefinir[1], `<form id="form-redefinir" class="conta__form">${campo('senha', t.redefinir[2], 'password', 'autocomplete="new-password" minlength="12" maxlength="128" required')}<button class="botão botão--primário" type="submit">${escapar(t.redefinir[3])}</button></form>`, 'redefinir')],
    ['conta/index.html','conta',montarConta()],
    ['conta/perfil.html','conta',montarConta().replace(/Minha conta/g, 'Editar perfil').replace(/My account/g, 'Edit profile')],
    ['niveis.html', 'niveis', quadro(t.niveis[0], t.niveis[1], `<div id="niveis-progresso"></div>
      <section class="niveis__bloco"><h2>${en ? 'How the level grows' : 'Como o nível sobe'}</h2><p>${en ? 'Completed tool uses and useful community interactions add points. Repetitive activity is limited per day so spam does not become a shortcut.' : 'Usos concluídos de ferramentas e interações úteis na comunidade somam pontos. Atividade repetitiva tem limite diário para que spam não vire atalho.'}</p></section>
      <section class="niveis__bloco"><h2>${en ? 'Medals' : 'Medalhas'}</h2><div class="niveis__lista">
        <article id="explorador"><b>${en ? 'Explorer' : 'Explorador'}</b><p>${en ? 'Use different tools.' : 'Use ferramentas diferentes.'}</p></article>
        <article id="pratica"><b>${en ? 'Hands on' : 'Mão na massa'}</b><p>${en ? 'Complete tool uses.' : 'Conclua usos de ferramentas.'}</p></article>
        <article id="conversa"><b>${en ? 'Community voice' : 'Voz da comunidade'}</b><p>${en ? 'Participate in conversations without spam.' : 'Participe das conversas sem spam.'}</p></article>
        <article id="colecao"><b>${en ? 'Collector' : 'Colecionador'}</b><p>${en ? 'Build your favorite tools collection.' : 'Monte sua coleção de ferramentas favoritas.'}</p></article>
        <article id="projetos"><b>${en ? 'Builder' : 'Construtor'}</b><p>${en ? 'Save works to continue later.' : 'Salve trabalhos para continuar depois.'}</p></article>
        <article id="conexoes"><b>${en ? 'Connections' : 'Conexões'}</b><p>${en ? 'Create accepted friendships.' : 'Crie amizades aceitas.'}</p></article>
        <article id="veterano"><b>${en ? 'Veteran' : 'Veterano'}</b><p>${en ? 'Your account age evolves this medal automatically.' : 'O tempo desde a criação da conta evolui esta medalha automaticamente.'}</p></article>
      </div></section>
      <section class="niveis__bloco"><h2>${en ? 'Visual evolution' : 'Evolução visual'}</h2><p>${en ? 'Medals progress through Bronze, Silver, Gold, Crystal, Neon, Legendary and Mythic stages. The last three stages gain increasingly noticeable animation. Profile banners and frames also unlock at level milestones.' : 'As medalhas evoluem por Bronze, Prata, Ouro, Cristal, Neon, Lendária e Mítica. Os três últimos estágios ganham animações cada vez mais marcantes. Banners e molduras do perfil também são desbloqueados por marcos de nível.'}</p></section>`, 'niveis')],
    ['admin/chat/index.html', 'moderar', quadro(t.moderar[0], t.moderar[1], `<nav class="conta__links"><a href="../usuarios/">${en ? 'Users' : 'Usuários'}</a><a href="../suporte/">${en ? 'Support' : 'Suporte'}</a></nav><button class="botão" id="atualizar-denuncias" type="button">${escapar(t.moderar[2])}</button><div id="denuncias"></div>`, 'moderar')],
    ['perfil.html', 'perfil', quadro(t.perfil[0], t.perfil[1], '<div id="perfil-pessoa"></div>', 'perfil')],
    ['conta/mensagens.html', 'suporte', quadro(t.suporte[0], t.suporte[1], `<form id="form-suporte" class="conta__form">${campo('assunto', en ? 'Subject' : 'Assunto', 'text', 'minlength="3" maxlength="100" required')}<label class="conta__campo"><span>${en ? 'Message' : 'Mensagem'}</span><textarea name="texto" minlength="10" maxlength="2000" rows="5" required></textarea></label><button class="botão" type="submit">${en ? 'Send message' : 'Enviar mensagem'}</button></form><div id="lista-suporte"></div>`, 'suporte')],
    ['conta/trabalhos.html', 'trabalhos', quadro(t.trabalhos[0], t.trabalhos[1], `<div class="conta__trabalhos-cabeçalho"><p id="trabalhos-resumo" class="suave pequeno"></p><a class="botão botão--linha" href="../ferramentas.html">${en ? 'Open tools' : 'Abrir ferramentas'}</a></div><div id="lista-trabalhos"></div><p class="suave pequeno">${en ? 'Free accounts can save 3 works. Plus can save 500. Premium currently inherits the Plus account quota until its final limits are defined.' : 'Contas Grátis podem salvar 3 trabalhos. Plus pode salvar 500. Premium herda por enquanto a cota de conta do Plus até os limites finais serem definidos.'}</p>`, 'trabalhos')],
    ['admin/usuarios/index.html', 'usuarios', quadro(t.usuarios[0], t.usuarios[1], '<div id="lista-usuarios"></div>', 'usuarios')],
    ['admin/suporte/index.html', 'adminSuporte', quadro(t.adminSuporte[0], t.adminSuporte[1], '<div id="lista-admin-suporte"></div>', 'admin-suporte')],
    ['admin/novidades/index.html', 'novidades', quadro(t.novidades[0], t.novidades[1], `<nav class="conta__links"><a href="../chat/">${en ? 'Moderation' : 'Moderação'}</a><a href="../usuarios/">${en ? 'Users' : 'Usuários'}</a><a href="../suporte/">${en ? 'Support' : 'Suporte'}</a></nav>
      <button class="botão botão--linha" type="button" id="nova-novidade">${en ? 'New item' : 'Nova novidade'}</button>
      <form id="form-novidade" class="conta__form" hidden>
        ${['pt','en'].map(l=>`<fieldset><legend>${l === 'pt' ? 'Português' : 'English'}</legend>
          ${campo(`titulo_${l}`,en ? 'Title' : 'Título','text','maxlength="120" required')}
          <label class="conta__campo"><span>${en ? 'Text' : 'Texto'}</span><textarea name="texto_${l}" rows="4" maxlength="2000" required></textarea></label>
          ${campo(`botao_${l}`,en ? 'Button label (optional)' : 'Texto do botão (opcional)','text','maxlength="60"')}
          ${campo(`alt_${l}`,en ? 'Image description' : 'Descrição da imagem','text','maxlength="200"')}
        </fieldset>`).join('')}
        ${campo('url',en ? 'Button destination (e.g. /ferramentas.html)' : 'Destino do botão (ex.: /ferramentas.html)','text','maxlength="500"')}
        ${campo('ordem',en ? 'Order (lower numbers first)' : 'Ordem (números menores primeiro)','number','min="0" max="9999" value="0" required')}
        ${campo('publicar_em',en ? 'Publish at (your local time; empty = immediately)' : 'Publicar em (seu horário local; vazio = agora)','datetime-local')}
        ${campo('retirar_em',en ? 'Withdraw at (optional)' : 'Retirar em (opcional)','datetime-local')}
        <label class="conta__campo"><span>${en ? 'Image (PNG, JPEG, WebP, up to 1 MB)' : 'Imagem (PNG, JPEG, WebP, até 1 MB)'}</span><input type="file" name="imagem" accept="image/png,image/jpeg,image/webp"></label>
        <label><input type="checkbox" name="remover_imagem"> ${en ? 'Remove current image' : 'Remover imagem atual'}</label>
        <label><input type="checkbox" name="ativo"> ${en ? 'Publish (leave off to save a draft)' : 'Publicar (desmarque para guardar rascunho)'}</label>
        <p class="suave pequeno">${en ? 'Up to 20 enabled items, including scheduled news. Both languages are required. Every content update appears again to visitors.' : 'Até 20 itens ligados, incluindo agendados. As duas traduções são obrigatórias. Ao atualizar o conteúdo publicado, ele volta a aparecer aos visitantes.'}</p>
        <div class="ações"><button class="botão" type="submit">${en ? 'Save' : 'Salvar'}</button><button class="botão botão--linha" id="prever-novidade" type="button">${en ? 'Preview' : 'Pré-visualizar'}</button><button class="botão botão--texto" id="cancelar-novidade" type="button">${en ? 'Cancel' : 'Cancelar'}</button></div>
      </form><div id="lista-novidades"></div>`, 'novidades')],
    ['admin/publicidade/index.html', 'publicidade', quadro(t.publicidade[0],t.publicidade[1],`<form id="form-publicidade" class="conta__form" hidden>
      <label><input type="checkbox" name="ativo"> ${en ? 'Enable advertising' : 'Ligar publicidade'}</label>
      <label id="opcao-demonstracao"><input type="checkbox" name="demonstracao"> ${en ? 'Local preview (no Google requests)' : 'Demonstração local (sem chamadas ao Google)'}</label>
      <label><input type="checkbox" name="teste"> ${en ? 'AdSense test mode' : 'Modo de teste do AdSense'}</label>
      ${campo('editor',en ? 'Publisher ID' : 'ID do editor','text','placeholder="ca-pub-0000000000000000" maxlength="23"')}
      ${['resultado','lista','rodape'].map(p=>campo(p,en ? {resultado:'After result and instructions',lista:'Catalog list',rodape:'Before footer'}[p] : {resultado:'Depois do resultado e das instruções',lista:'Lista do catálogo',rodape:'Antes do rodapé'}[p],'text','inputmode="numeric" maxlength="20"')).join('')}
      <p class="suave pequeno">${en ? 'Paid accounts, account/profile pages, chat and study tools do not show ads. Ads only load after a privacy choice. Local preview is blocked in production.' : 'Contas pagas, páginas de conta/perfil, chat e ferramentas de estudo não exibem anúncios. Os blocos só carregam depois da escolha de privacidade. A demonstração local é bloqueada em produção.'}</p>
      <button type="submit" class="botão">${en ? 'Save settings' : 'Salvar configuração'}</button>
      </form><p id="publicidade-status" class="suave"></p><nav class="conta__links"><a href="../../ferramentas.html">${en ? 'Inspect catalog' : 'Conferir catálogo'}</a><a href="../../">${en ? 'Inspect home page' : 'Conferir início'}</a></nav>`,'publicidade')],
    ['admin/banners/index.html','banners',quadro(t.banners[0],t.banners[1],gerarPainelBanners(en),'banners')],
  ];
  return paginas.map(([arquivo, chave, conteúdoOriginal]) => {
    const conteúdo = arquivo === 'conta/index.html' ? separarCadastro(conteúdoOriginal, en) : conteúdoOriginal;
    const profundidade = arquivo.split('/').length - 1;
    const base = '../'.repeat(profundidade);
    const raizSite = profundidade ? `${base}${raiz}` : raiz;
    const atualNoIdioma = `${'../'.repeat(profundidade)}${arquivo}`;
    const alternativas = en
      ? { en: atualNoIdioma, 'pt-BR': `${'../'.repeat(profundidade + 1)}${arquivo}` }
      : { 'pt-BR': atualNoIdioma, en: `${'../'.repeat(profundidade)}en/${arquivo}` };
    const titulo=arquivo==='conta/perfil.html'?(en?'Edit profile':'Editar perfil'):t[chave][0];
    return [`${prefixo}${arquivo}`, montarPágina({ctx, título: `${titulo} — ${site.nome}`, descrição: t[chave][1], base, raiz: raizSite, conteúdo,
      scripts: [`páginas/conta/${chave === 'adminSuporte' ? 'admin-suporte' : chave}.js`], estilos: ['conta.css'], semÍndice: true, alternativas})];
  });
}
