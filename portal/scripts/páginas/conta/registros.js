const acoes = {
  anterior: ['Versão anterior', 'Previous version'],
  salvar_rascunho: ['Rascunho salvo', 'Draft saved'],
  restaurar_rascunho: ['Rascunho restaurado', 'Draft restored'],
  publicar: ['Versão publicada', 'Version published'],
  salvar_editorial: ['Conteúdo salvo em rascunho', 'Content saved to draft'],
  restaurar_editorial: ['Revisão restaurada', 'Revision restored'],
  publicar_editorial: ['Conteúdo publicado', 'Content published'],
  recuperar_editorial: ['Publicação recuperada', 'Publication recovered'],
  desbloquear_trafego: ['Restrição de tráfego liberada', 'Traffic restriction released'],
  editar_publicidade: ['Publicidade atualizada', 'Advertising updated'],
  criar_novidade: ['Novidade criada', 'Announcement created'],
  editar_novidade: ['Novidade atualizada', 'Announcement updated'],
  remover_novidade: ['Novidade removida', 'Announcement removed'],
  imagem_novidade: ['Imagem da novidade atualizada', 'Announcement image updated'],
  remover_imagem_novidade: ['Imagem da novidade removida', 'Announcement image removed'],
  editar_usuario: ['Cadastro ou plano atualizado', 'Account or plan updated'],
  responder_suporte: ['Mensagem de suporte respondida', 'Support message answered'],
  remover_mensagem: ['Mensagem moderada', 'Message moderated'],
  silenciar: ['Participante silenciado', 'Participant muted'],
  banir: ['Participante bloqueado', 'Participant banned'],
  liberar: ['Participante liberado', 'Participant restriction removed'],
  denuncia_resolvida: ['Denúncia resolvida', 'Report resolved'],
  denuncia_descartada: ['Denúncia descartada', 'Report dismissed'],
  denuncia_silenciar: ['Silenciamento por denúncia', 'Participant muted after report'],
  denuncia_banir: ['Bloqueio por denúncia', 'Participant banned after report'],
  erro_interno: ['Falha interna', 'Internal error'],
};

export function tituloRegistro(codigo, en = false) {
  return acoes[codigo]?.[en ? 1 : 0] || (en ? 'Administrative action' : 'Ação administrativa');
}

export function dataRegistro(valor, en = false) {
  if(!valor)return en ? 'Date unavailable' : 'Data indisponível';
  // CURRENT_TIMESTAMP do SQLite é UTC, sem o sufixo de fuso.
  const iso = typeof valor === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(valor)
    ? valor.replace(' ', 'T') + 'Z' : valor;
  const data = new Date(iso);
  return Number.isFinite(data.getTime())
    ? data.toLocaleString(en ? 'en' : 'pt-BR')
    : (en ? 'Date unavailable' : 'Data indisponível');
}
