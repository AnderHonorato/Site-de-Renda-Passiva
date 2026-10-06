import { montarPágina, escapar } from './modelo-de-página.mjs';
import { site } from '../dados/site.js';

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
    usuarios: ['Usuários', 'Gerencie contas e planos pelo painel administrativo.'],
    adminSuporte: ['Suporte', 'Responda às mensagens enviadas pelos usuários.'],
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
    usuarios: ['Users', 'Manage accounts and plans in the admin panel.'],
    adminSuporte: ['Support', 'Reply to messages sent by users.'],
  },
};

function campo(id, rotulo, tipo = 'text', attrs = '') {
  return `<label class="conta__campo"><span>${escapar(rotulo)}</span><input id="${id}" name="${id}" type="${tipo}" ${attrs}></label>`;
}

function quadro(titulo, descricao, interior, id) {
  return `<section class="largura conta"><div class="painel conta__painel" id="${id}"><p class="rótulo">${escapar(titulo)}</p><h1>${escapar(titulo)}</h1><p class="suave">${escapar(descricao)}</p>${interior}<p class="conta__estado" role="status" aria-live="polite"></p></div></section>`;
}

export function paginasConta(ctx) {
  const t = textos[ctx.código] || textos['pt-BR'];
  const prefixo = ctx.idioma.pasta;
  const raiz = prefixo ? '../' : '';
  const en = ctx.código === 'en';
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
    ['conta/index.html', 'conta', quadro(t.conta[0], t.conta[1], `<div id="conta-conteudo" hidden>
      <form id="form-perfil" class="conta__form">${campo('nome', t.conta[2], 'text', 'autocomplete="name" maxlength="80" required')}${campo('usuario', t.conta[3], 'text', 'readonly')}
      <label class="conta__campo"><span>${escapar(t.conta[4])}</span><textarea name="bio" maxlength="280" rows="3"></textarea></label>${campo('local', t.conta[5], 'text', 'maxlength="80"')}
      <label class="conta__campo"><span>${en ? 'Avatar' : 'Avatar'}</span><select name="avatar"><option value="sol">${en ? 'Sun' : 'Sol'}</option><option value="folha">${en ? 'Leaf' : 'Folha'}</option><option value="estrela">${en ? 'Star' : 'Estrela'}</option></select></label><div id="avatar-preview" class="conta__avatar"></div>
      <label class="conta__aceite"><input name="bioVisivel" type="checkbox" checked><span>${en ? 'Show my bio to other members' : 'Mostrar minha biografia a outros membros'}</span></label>
      <label class="conta__aceite"><input name="localVisivel" type="checkbox" checked><span>${en ? 'Show my location to other members' : 'Mostrar de onde sou a outros membros'}</span></label>
      <button class="botão botão--primário" type="submit">${escapar(t.conta[6])}</button></form>
      <h2>${en ? 'Recommended tools' : 'Ferramentas recomendadas'}</h2><p class="suave pequeno">${en ? 'Choose up to five tools you have used.' : 'Escolha até cinco ferramentas que você já usou.'}</p><form id="form-recomendadas" class="conta__form"><div id="opcoes-recomendadas"></div><button class="botão" type="submit">${en ? 'Save recommendations' : 'Salvar recomendações'}</button></form>
      <h2>${escapar(t.conta[18])}</h2><form id="form-preferencias" class="conta__form">
      <label class="conta__campo"><span>${escapar(t.conta[19])}</span><select name="idioma"><option value="pt-BR">Português</option><option value="en">English</option></select></label>
      <label class="conta__campo"><span>${escapar(t.conta[20])}</span><select name="tema"><option value="sistema">${en ? 'System' : 'Sistema'}</option><option value="claro">${en ? 'Light' : 'Claro'}</option><option value="escuro">${en ? 'Dark' : 'Escuro'}</option></select></label>
      <button class="botão" type="submit">${escapar(t.conta[21])}</button></form>
      <h2>${escapar(t.conta[7])}</h2><form id="form-senha" class="conta__form">${campo('senhaAtual', t.conta[8], 'password', 'autocomplete="current-password" required')}${campo('novaSenha', t.conta[9], 'password', 'autocomplete="new-password" minlength="12" maxlength="128" required')}<button class="botão" type="submit">${escapar(t.conta[10])}</button></form>
      <h2>${escapar(t.conta[11])}</h2><button class="botão" id="exportar-conta" type="button">${escapar(t.conta[12])}</button> <button class="botão botão--linha" id="excluir-conta" type="button">${escapar(t.conta[13])}</button>
      <form id="form-excluir" class="conta__form" hidden><p>${en ? 'This permanently deletes your account and data. Enter your password to confirm.' : 'Isso exclui definitivamente sua conta e seus dados. Digite sua senha para confirmar.'}</p>
      ${campo('senhaExclusao', t.conta[8], 'password', 'autocomplete="current-password" required')}
      <button class="botão" type="submit">${escapar(t.conta[13])}</button><button class="botão botão--linha" id="cancelar-exclusao" type="button">${en ? 'Cancel' : 'Cancelar'}</button></form>
      <h2>${escapar(t.conta[15])}</h2><div id="amizades"></div><form id="form-amizade" class="conta__form">${campo('amigo', '@usuário', 'text', 'autocomplete="off"')}<button class="botão" type="submit">${escapar(t.conta[17])}</button></form>
      <a href="mensagens.html">${en ? 'My messages' : 'Minhas mensagens'}</a><nav id="conta-admin" class="conta__links" hidden><a href="../admin/chat/">${en ? 'Chat moderation' : 'Moderação do chat'}</a><a href="../admin/usuarios/">${en ? 'Users' : 'Usuários'}</a><a href="../admin/suporte/">${en ? 'Support' : 'Suporte'}</a></nav>
      <button class="botão botão--texto" id="sair-conta" type="button">${escapar(t.conta[14])}</button></div>`, 'conta')],
    ['admin/chat/index.html', 'moderar', quadro(t.moderar[0], t.moderar[1], `<nav class="conta__links"><a href="../usuarios/">${en ? 'Users' : 'Usuários'}</a><a href="../suporte/">${en ? 'Support' : 'Suporte'}</a></nav><button class="botão" id="atualizar-denuncias" type="button">${escapar(t.moderar[2])}</button><div id="denuncias"></div>`, 'moderar')],
    ['perfil.html', 'perfil', quadro(t.perfil[0], t.perfil[1], '<div id="perfil-pessoa"></div>', 'perfil')],
    ['conta/mensagens.html', 'suporte', quadro(t.suporte[0], t.suporte[1], `<form id="form-suporte" class="conta__form">${campo('assunto', en ? 'Subject' : 'Assunto', 'text', 'minlength="3" maxlength="100" required')}<label class="conta__campo"><span>${en ? 'Message' : 'Mensagem'}</span><textarea name="texto" minlength="10" maxlength="2000" rows="5" required></textarea></label><button class="botão" type="submit">${en ? 'Send message' : 'Enviar mensagem'}</button></form><div id="lista-suporte"></div>`, 'suporte')],
    ['admin/usuarios/index.html', 'usuarios', quadro(t.usuarios[0], t.usuarios[1], '<div id="lista-usuarios"></div>', 'usuarios')],
    ['admin/suporte/index.html', 'adminSuporte', quadro(t.adminSuporte[0], t.adminSuporte[1], '<div id="lista-admin-suporte"></div>', 'admin-suporte')],
  ];
  return paginas.map(([arquivo, chave, conteúdo]) => {
    const profundidade = arquivo.split('/').length - 1;
    const base = '../'.repeat(profundidade);
    const raizSite = profundidade ? `${base}${raiz}` : raiz;
    return [`${prefixo}${arquivo}`, montarPágina({ctx, título: `${t[chave][0]} — ${site.nome}`, descrição: t[chave][1], base, raiz: raizSite, conteúdo,
      scripts: [`páginas/conta/${chave === 'adminSuporte' ? 'admin-suporte' : chave}.js`], estilos: ['conta.css'], semÍndice: true})];
  });
}
