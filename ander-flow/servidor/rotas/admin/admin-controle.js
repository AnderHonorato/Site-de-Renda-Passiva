// admin-controle.js — acesso a dados das rotas de administração (docs/contratos.md §11, bloco "Admin").
// Funções recebem `banco` explicitamente para serem testáveis com um banco `:memory:` isolado.

const COLUNAS_AVISO = [
  'tipo',
  'publico',
  'titulo_pt_br',
  'titulo_en',
  'corpo_pt_br',
  'corpo_en',
  'link_url',
  'link_rotulo_pt_br',
  'link_rotulo_en',
  'inicio_em',
  'fim_em',
  'ativo',
];

/** Grava uma linha em `registros_admin`. `detalhes` nunca deve conter senha, token ou corpo de mensagem. */
export function registrarAcaoAdmin(banco, { usuarioId, acao, alvo, detalhes }) {
  banco
    .prepare('INSERT INTO registros_admin (usuario_id, acao, alvo, detalhes) VALUES (?, ?, ?, ?)')
    .run(usuarioId ?? null, acao, alvo != null ? String(alvo) : null, detalhes ? JSON.stringify(detalhes) : null);
}

/** Usuário completo (sem `senha_hash`) para as telas de administração. */
export function usuarioPublicoAdmin(linha) {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    plano: linha.plano,
    papel: linha.papel,
    situacao: linha.situacao,
    idioma: linha.idioma,
    tema: linha.tema,
    criado_em: linha.criado_em,
    ultimo_acesso_em: linha.ultimo_acesso_em,
  };
}

export function avisoPublicoAdmin(linha) {
  return {
    id: linha.id,
    tipo: linha.tipo,
    publico: linha.publico,
    titulo_pt_br: linha.titulo_pt_br,
    titulo_en: linha.titulo_en,
    corpo_pt_br: linha.corpo_pt_br,
    corpo_en: linha.corpo_en,
    link_url: linha.link_url,
    link_rotulo_pt_br: linha.link_rotulo_pt_br,
    link_rotulo_en: linha.link_rotulo_en,
    inicio_em: linha.inicio_em,
    fim_em: linha.fim_em,
    ativo: Boolean(linha.ativo),
    criado_em: linha.criado_em,
    atualizado_em: linha.atualizado_em,
  };
}

export function mensagemPublicaAdmin(linha) {
  return {
    id: linha.id,
    autor: linha.autor,
    corpo: linha.corpo,
    criado_em: linha.criado_em,
    lida: linha.lida_em != null,
  };
}

/** Só as colunas de `mudancas` que existem na tabela `avisos`, na ordem da tabela. */
export function colunasAvisoPresentes(mudancas) {
  return COLUNAS_AVISO.filter((coluna) => Object.prototype.hasOwnProperty.call(mudancas, coluna));
}

export function resumoAdmin(banco, { catalogo, limitador }) {
  const usuarios = banco.prepare('SELECT COUNT(*) AS total FROM usuarios').get().total;
  const plus = banco.prepare("SELECT COUNT(*) AS total FROM usuarios WHERE plano = 'plus'").get().total;
  const mensagensNaoLidas = banco
    .prepare("SELECT COUNT(*) AS total FROM mensagens WHERE autor = 'usuario' AND lida_em IS NULL")
    .get().total;

  return {
    ferramentas: catalogo.contagens(),
    usuarios: { total: usuarios, plus },
    bloqueios_ativos: limitador.listarBloqueios().length,
    mensagens_nao_lidas: mensagensNaoLidas,
  };
}

/** Mapa `slug -> total de usos` (usos + documentos) nos últimos 30 dias. */
export function usosPorFerramentaEm30Dias(banco) {
  const cortes = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const linhas = banco
    .prepare('SELECT ferramenta_slug, SUM(contagem) AS total FROM usos_ferramentas WHERE dia >= ? GROUP BY ferramenta_slug')
    .all(cortes);
  return new Map(linhas.map((linha) => [linha.ferramenta_slug, linha.total]));
}

export function listarFerramentasAdmin(banco, catalogo) {
  const usos = usosPorFerramentaEm30Dias(banco);
  return catalogo.listar({ idioma: 'pt-BR', incluirInativas: true }).map((ferramenta) => ({
    slug: ferramenta.slug,
    nome: ferramenta.nome,
    estado: ferramenta.estado,
    categoria: ferramenta.categoria,
    ativa: ferramenta.ativa,
    plano_efetivo: ferramenta.plano,
    destaque: ferramenta.destaque,
    usos_30d: usos.get(ferramenta.slug) ?? 0,
  }));
}

export function obterFerramentaAdmin(banco, catalogo, slug) {
  const ferramenta = catalogo.obter(slug, { idioma: 'pt-BR' });
  if (!ferramenta) return null;
  const usos = usosPorFerramentaEm30Dias(banco);
  return {
    slug: ferramenta.slug,
    nome: ferramenta.nome,
    estado: ferramenta.estado,
    categoria: ferramenta.categoria,
    ativa: ferramenta.ativa,
    plano_efetivo: ferramenta.plano,
    destaque: ferramenta.destaque,
    usos_30d: usos.get(slug) ?? 0,
  };
}

/** Aplica o UPSERT em `ferramentas_ajustes`, mantendo os campos não alterados do ajuste atual. */
export function ajustarFerramenta(banco, { slug, mudancas, adminId }) {
  const atual = banco.prepare('SELECT * FROM ferramentas_ajustes WHERE ferramenta_slug = ?').get(slug);
  const linha = {
    ferramenta_slug: slug,
    ativa: mudancas.ativa ?? atual?.ativa ?? 1,
    plano: 'plano' in mudancas ? mudancas.plano : atual?.plano ?? null,
    destaque: mudancas.destaque ?? atual?.destaque ?? 0,
    atualizado_por: adminId,
  };

  banco
    .prepare(
      `INSERT INTO ferramentas_ajustes (ferramenta_slug, ativa, plano, destaque, atualizado_por)
       VALUES (@ferramenta_slug, @ativa, @plano, @destaque, @atualizado_por)
       ON CONFLICT (ferramenta_slug) DO UPDATE SET
         ativa = excluded.ativa,
         plano = excluded.plano,
         destaque = excluded.destaque,
         atualizado_em = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
         atualizado_por = excluded.atualizado_por`,
    )
    .run(linha);
}
