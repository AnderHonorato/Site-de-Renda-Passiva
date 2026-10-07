export const AVATARES = Object.freeze([
  'sol', 'folha', 'estrela', 'lua', 'orbita', 'chama', 'raio', 'flor', 'planeta',
  'nuvem', 'diamante', 'cometa', 'onda', 'coroa', 'borboleta',
]);

export const BANNERS = Object.freeze([
  { id: 'brisa', nome: 'Brisa', nivel: 1, animado: false },
  { id: 'grade', nome: 'Grade', nivel: 2, animado: false },
  { id: 'aurora', nome: 'Aurora', nivel: 3, animado: false },
  { id: 'papel', nome: 'Papel', nivel: 4, animado: false },
  { id: 'ondas', nome: 'Ondas', nivel: 5, animado: false },
  { id: 'areia', nome: 'Areia', nivel: 6, animado: false },
  { id: 'jardim', nome: 'Jardim', nivel: 7, animado: false },
  { id: 'noite', nome: 'Noite', nivel: 8, animado: false },
  { id: 'oceano', nome: 'Oceano', nivel: 9, animado: false },
  { id: 'grafite', nome: 'Grafite', nivel: 10, animado: false },
  { id: 'vidro', nome: 'Vidro', nivel: 11, animado: false },
  { id: 'prisma', nome: 'Prisma', nivel: 12, animado: false },
  { id: 'neon', nome: 'Neon vivo', nivel: 13, animado: true },
  { id: 'orbita', nome: 'Órbita viva', nivel: 14, animado: true },
  { id: 'lenda', nome: 'Lendário vivo', nivel: 15, animado: true },
]);

export const MOLDURAS = Object.freeze([
  { id: 'basica', nome: 'Básica', nivel: 1, animado: false },
  { id: 'cobre', nome: 'Cobre', nivel: 2, animado: false },
  { id: 'prata', nome: 'Prata', nivel: 3, animado: false },
  { id: 'titanio', nome: 'Titânio', nivel: 4, animado: false },
  { id: 'ouro', nome: 'Ouro', nivel: 5, animado: false },
  { id: 'rose', nome: 'Rosé', nivel: 6, animado: false },
  { id: 'esmeralda', nome: 'Esmeralda', nivel: 7, animado: false },
  { id: 'cristal', nome: 'Cristal', nivel: 8, animado: false },
  { id: 'safira', nome: 'Safira', nivel: 9, animado: false },
  { id: 'rubi', nome: 'Rubi', nivel: 10, animado: false },
  { id: 'ametista', nome: 'Ametista', nivel: 11, animado: false },
  { id: 'prisma', nome: 'Prisma', nivel: 12, animado: false },
  { id: 'neon', nome: 'Neon vivo', nivel: 13, animado: true },
  { id: 'constelacao', nome: 'Constelação viva', nivel: 14, animado: true },
  { id: 'mitica', nome: 'Mítica viva', nivel: 15, animado: true },
]);

const PATAMARES = Object.freeze([
  { nome: 'Iniciante', classe: 'ferro' },
  { nome: 'Bronze', classe: 'bronze' },
  { nome: 'Prata', classe: 'prata' },
  { nome: 'Ouro', classe: 'ouro' },
  { nome: 'Cristal', classe: 'cristal' },
  { nome: 'Neon', classe: 'neon' },
  { nome: 'Lendária', classe: 'lendaria' },
  { nome: 'Mítica', classe: 'mitica' },
]);

const MEDALHAS = Object.freeze([
  { id: 'explorador', nome: 'Explorador', descricao: 'Use ferramentas diferentes e descubra novas áreas do portal.', consulta: 'ferramentas', limites: [1, 3, 7, 15, 30, 55, 90, 140] },
  { id: 'pratica', nome: 'Mão na massa', descricao: 'Conclua usos de ferramentas. Quanto mais você resolve, mais ela evolui.', consulta: 'usos', limites: [3, 10, 30, 75, 160, 320, 650, 1200] },
  { id: 'conversa', nome: 'Voz da comunidade', descricao: 'Participe das conversas da comunidade sem spam.', consulta: 'mensagens', limites: [1, 8, 25, 70, 160, 300, 600, 1000] },
  { id: 'colecao', nome: 'Colecionador', descricao: 'Salve ferramentas nos favoritos para montar sua coleção.', consulta: 'favoritos', limites: [1, 4, 10, 20, 40, 75, 120, 180] },
  { id: 'projetos', nome: 'Construtor', descricao: 'Salve trabalhos para continuar depois sem perder o contexto.', consulta: 'trabalhos', limites: [1, 3, 8, 20, 45, 90, 170, 300] },
  { id: 'conexoes', nome: 'Conexões', descricao: 'Crie amizades aceitas dentro da comunidade.', consulta: 'amizades', limites: [1, 3, 7, 15, 30, 55, 90, 140] },
  { id: 'veterano', nome: 'Veterano', descricao: 'Permaneça na comunidade. O tempo conta desde a criação da conta.', consulta: 'dias', limites: [1, 7, 30, 90, 180, 365, 730, 1460] },
]);

export function nivelDePontos(pontos) {
  const p = Math.max(0, Number(pontos) || 0);
  return 1 + Math.floor(Math.sqrt(p / 10));
}

export function progressoDeNivel(pontos) {
  const p = Math.max(0, Number(pontos) || 0);
  const nivel = nivelDePontos(p);
  const inicio = 10 * (nivel - 1) ** 2;
  const proximo = 10 * nivel ** 2;
  return {
    nivel,
    pontos: p,
    inicio,
    proximo,
    faltam: Math.max(0, proximo - p),
    percentual: proximo === inicio ? 100 : Math.max(0, Math.min(100, Math.round(((p - inicio) / (proximo - inicio)) * 100))),
  };
}

export function personalizacoesDoNivel(nivel) {
  const n = Math.max(1, Number(nivel) || 1);
  return {
    banners: BANNERS.map(item => ({ ...item, desbloqueado: n >= item.nivel })),
    molduras: MOLDURAS.map(item => ({ ...item, desbloqueado: n >= item.nivel })),
  };
}

export function validarPersonalizacao({ avatar, banner, moldura }, nivel) {
  const n = Math.max(1, Number(nivel) || 1);
  if (avatar !== undefined && !AVATARES.includes(avatar)) return false;
  if (banner !== undefined) {
    const item = BANNERS.find(x => x.id === banner);
    if (!item || n < item.nivel) return false;
  }
  if (moldura !== undefined) {
    const item = MOLDURAS.find(x => x.id === moldura);
    if (!item || n < item.nivel) return false;
  }
  return true;
}

function urlHttp(valor) {
  if (!valor) return '';
  try {
    const url = new URL(String(valor).trim());
    return ['http:', 'https:'].includes(url.protocol) && url.href.length <= 300 ? url.href : null;
  } catch { return null; }
}

export function validarSociais(entrada) {
  if (entrada === undefined) return undefined;
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) return null;
  const saida = {};
  const permitidos = ['site', 'instagram', 'facebook', 'tiktok', 'x', 'whatsapp'];
  for (const [chave, bruto] of Object.entries(entrada)) {
    if (!permitidos.includes(chave) || typeof bruto !== 'string') return null;
    const valor = bruto.trim();
    if (!valor) continue;
    if (chave === 'site') {
      const seguro = urlHttp(valor);
      if (!seguro) return null;
      saida.site = seguro;
      continue;
    }
    if (chave === 'whatsapp') {
      const digitos = valor.replace(/\D/g, '');
      if (digitos.length < 8 || digitos.length > 15) return null;
      saida.whatsapp = digitos;
      continue;
    }
    let handle = valor.replace(/^@/, '');
    if (/^https?:\/\//i.test(valor)) {
      try {
        const url = new URL(valor);
        const hosts = { instagram: ['instagram.com','www.instagram.com'], facebook: ['facebook.com','www.facebook.com'], tiktok: ['tiktok.com','www.tiktok.com'], x: ['x.com','www.x.com','twitter.com','www.twitter.com'] };
        if (!hosts[chave]?.includes(url.hostname) || url.username || url.password || url.port || url.search || url.hash || !/^\/@?[A-Za-z0-9._-]+\/?$/.test(url.pathname)) return null;
        handle = url.pathname.replace(/^\/@?/, '').replace(/\/$/, '');
      } catch { return null; }
    }
    if (!/^[A-Za-z0-9._-]{1,50}$/.test(handle)) return null;
    saida[chave] = handle;
  }
  return saida;
}

function valorDaMedalha(db, usuario, tipo) {
  if (tipo === 'ferramentas') return Number(db.prepare('SELECT count(*) total FROM uso_ferramentas WHERE usuario_id=? AND total>0').get(usuario.id).total);
  if (tipo === 'usos') return Number(db.prepare('SELECT coalesce(sum(total),0) total FROM uso_ferramentas WHERE usuario_id=?').get(usuario.id).total);
  if (tipo === 'mensagens') return Number(db.prepare('SELECT count(*) total FROM mensagens WHERE autor_id=? AND removida_em IS NULL').get(usuario.id).total);
  if (tipo === 'favoritos') return Number(db.prepare('SELECT count(*) total FROM favoritos WHERE usuario_id=?').get(usuario.id).total);
  if (tipo === 'trabalhos') return Number(db.prepare('SELECT count(*) total FROM trabalhos WHERE usuario_id=?').get(usuario.id).total);
  if (tipo === 'amizades') return Number(db.prepare("SELECT count(*) total FROM amizades WHERE estado='aceita' AND (origem=? OR destino=?)").get(usuario.id, usuario.id).total);
  if (tipo === 'dias') {
    const inicio = Date.parse(String(usuario.criado_em || '').replace(' ', 'T') + (String(usuario.criado_em || '').includes('Z') ? '' : 'Z'));
    return Number.isFinite(inicio) ? Math.max(0, Math.floor((Date.now() - inicio) / 86_400_000)) : 0;
  }
  return 0;
}

export function medalhasDoUsuario(db, usuario) {
  return MEDALHAS.map(def => {
    const valor = valorDaMedalha(db, usuario, def.consulta);
    let tier = -1;
    for (let i = 0; i < def.limites.length; i++) if (valor >= def.limites[i]) tier = i;
    const atual = Math.max(0, tier);
    const proximoIndice = Math.min(def.limites.length - 1, Math.max(0, tier + 1));
    const meta = def.limites[proximoIndice];
    return {
      id: def.id,
      nome: def.nome,
      descricao: def.descricao,
      valor,
      desbloqueada: tier >= 0,
      tier: tier >= 0 ? tier : 0,
      patamar: PATAMARES[atual].nome,
      classe: PATAMARES[atual].classe,
      meta,
      completa: tier === def.limites.length - 1,
      percentual: tier < 0 ? Math.min(99, Math.round((valor / def.limites[0]) * 100))
        : tier === def.limites.length - 1 ? 100
          : Math.max(0, Math.min(100, Math.round(((valor - def.limites[tier]) / (meta - def.limites[tier])) * 100))),
    };
  });
}
