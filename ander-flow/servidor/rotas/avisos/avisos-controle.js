// avisos-controle.js — consultas e montagem da resposta pública dos avisos (docs/contratos.md §7, §11).

import { avisoVigente, publicoCompativel } from './avisos-validacao.js';

/** Traduz uma linha do banco para o formato público, no idioma pedido. */
export function avisoParaApi(linha, codigo, lidos) {
  const emIngles = codigo === 'en';
  return {
    id: linha.id,
    tipo: linha.tipo,
    titulo: emIngles ? linha.titulo_en : linha.titulo_pt_br,
    corpo: emIngles ? linha.corpo_en : linha.corpo_pt_br,
    link_url: linha.link_url,
    link_rotulo: linha.link_url ? (emIngles ? linha.link_rotulo_en : linha.link_rotulo_pt_br) : null,
    inicio_em: linha.inicio_em,
    lido: lidos ? lidos.has(linha.id) : false,
  };
}

export function criarConsultasAvisos(banco) {
  const buscarPorTipo = banco.prepare('SELECT * FROM avisos WHERE tipo = ? ORDER BY inicio_em DESC');
  const buscarPorId = banco.prepare('SELECT * FROM avisos WHERE id = ?');
  const buscarLidosDoUsuario = banco.prepare('SELECT aviso_id FROM avisos_lidos WHERE usuario_id = ?');
  const marcarLido = banco.prepare('INSERT OR IGNORE INTO avisos_lidos (usuario_id, aviso_id) VALUES (?, ?)');

  function listarVigentes(tipo, usuario, agoraIso = new Date().toISOString()) {
    return buscarPorTipo
      .all(tipo)
      .filter((linha) => avisoVigente(linha, agoraIso))
      .filter((linha) => publicoCompativel(linha.publico, usuario));
  }

  function conjuntoDeLidos(usuario) {
    if (!usuario) return new Set();
    return new Set(buscarLidosDoUsuario.all(usuario.id).map((linha) => linha.aviso_id));
  }

  return {
    listarVigentes,
    conjuntoDeLidos,
    obterPorId: (id) => buscarPorId.get(id) ?? null,
    marcarLido: (usuarioId, avisoId) => marcarLido.run(usuarioId, avisoId),
  };
}
