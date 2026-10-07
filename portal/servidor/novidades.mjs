import { erro } from './seguranca.mjs';

export const MAX_IMAGEM = 1024 * 1024;
const colunas = ['titulo_pt', 'texto_pt', 'titulo_en', 'texto_en', 'botao_pt', 'botao_en', 'url', 'alt_pt', 'alt_en', 'publicar_em', 'retirar_em', 'ordem', 'ativo'];
const transacao = (db, acao) => {
  db.exec('BEGIN IMMEDIATE');
  try { const resultado = acao(); db.exec('COMMIT'); return resultado; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
};

export function validarNovidade(b) {
  const v = {};
  for (const [campo, max, min] of [['titulo_pt',120,1],['texto_pt',2000,1],['titulo_en',120,1],['texto_en',2000,1],['botao_pt',60,0],['botao_en',60,0],['url',500,0],['alt_pt',200,0],['alt_en',200,0]]) {
    if (b[campo] !== undefined && typeof b[campo] !== 'string') throw erro(400,'dados_invalidos');
    v[campo] = (b[campo] || '').trim();
    if (v[campo].length < min || v[campo].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v[campo])) throw erro(400,'dados_invalidos');
  }
  if (v.url && !(v.url.startsWith('/') && !/^\/[/\\]/u.test(v.url) && !/[\\\s]/u.test(v.url) && !/^\/%2f/iu.test(v.url) && !/%5c/iu.test(v.url))) throw erro(400,'link_invalido');
  if (v.url) {
    try { const u = new URL(v.url,'https://portal.invalid'), caminho = new URL(decodeURIComponent(u.pathname),'https://portal.invalid');
      if (u.origin !== 'https://portal.invalid' || caminho.origin !== u.origin || /^\/(api|admin)(\/|$)/u.test(caminho.pathname) || /^\/en\/admin(\/|$)/u.test(caminho.pathname)) throw Error();
    } catch { throw erro(400,'link_invalido'); }
  }
  if (!!v.url !== !!v.botao_pt || !!v.url !== !!v.botao_en) throw erro(400,'dados_invalidos');
  for (const campo of ['publicar_em','retirar_em']) {
    const data = b[campo];
    if (data !== null && data !== undefined && data !== '' && (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?Z$/u.test(data) || !Number.isFinite(Date.parse(data)))) throw erro(400,'data_invalida');
    v[campo] = data ? new Date(data).toISOString() : null;
    if (data && v[campo].slice(0,16) !== data.slice(0,16)) throw erro(400,'data_invalida');
  }
  if (v.retirar_em && Date.parse(v.retirar_em) <= Date.parse(v.publicar_em || new Date().toISOString())) throw erro(400,'data_invalida');
  if (!Number.isInteger(b.ordem) || b.ordem < 0 || b.ordem > 9999 || typeof b.ativo !== 'boolean') throw erro(400,'dados_invalidos');
  v.ordem = b.ordem; v.ativo = Number(b.ativo);
  return v;
}

export function imagemValida(bytes, mime) {
  if (!bytes.length || bytes.length > MAX_IMAGEM) return false;
  if (mime === 'image/png') return bytes.length > 8 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === 'image/jpeg') return bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === 'image/webp') return bytes.length > 12 && bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP';
  return false;
}

export function itemAdmin(db, id) {
  const item = db.prepare(`SELECT id,${colunas.join(',')},versao,revisao,imagem_mime FROM novidades WHERE id=?`).get(id);
  if (!item) throw erro(404,'novidade_nao_localizada');
  return { ...item, ativo: !!item.ativo, imagem_url: item.imagem_mime ? `/api/admin/novidades/${id}/imagem?v=${item.versao}` : null };
}

export function salvarNovidade(db, b, id = null) {
  const v = validarNovidade(b);
  return transacao(db, () => {
    const anterior = id ? itemAdmin(db,id) : null;
    if (anterior && anterior.versao !== b.versao) throw erro(409,'novidade_desatualizada');
    if (anterior?.imagem_mime && (!v.alt_pt || !v.alt_en)) throw erro(400,'alt_obrigatorio');
    if (v.ativo && db.prepare('SELECT COUNT(*) n FROM novidades WHERE ativo=1 AND id<>?').get(id || 0).n >= 20) throw erro(400,'limite_novidades');
    if (id) db.prepare(`UPDATE novidades SET ${colunas.map(c=>`${c}=?`).join(',')},versao=versao+1,revisao=0 WHERE id=?`).run(...colunas.map(c=>v[c]),id);
    else id = Number(db.prepare(`INSERT INTO novidades(${colunas.join(',')}) VALUES(${colunas.map(()=>'?').join(',')})`).run(...colunas.map(c=>v[c])).lastInsertRowid);
    return itemAdmin(db,id);
  });
}

export function removerNovidade(db, id, versao) {
  return transacao(db, () => {
    if (itemAdmin(db,id).versao !== versao) throw erro(409,'novidade_desatualizada');
    db.prepare('DELETE FROM novidades WHERE id=?').run(id);
  });
}

export function salvarImagem(db, id, versao, bytes, mime) {
  if (bytes && !imagemValida(bytes,mime)) throw erro(400,'imagem_invalida');
  return transacao(db, () => {
    const item = itemAdmin(db,id);
    if (item.versao !== versao) throw erro(409,'novidade_desatualizada');
    if (bytes && (!item.alt_pt || !item.alt_en)) throw erro(400,'alt_obrigatorio');
    db.prepare('UPDATE novidades SET imagem=?,imagem_mime=?,versao=versao+1,revisao=0 WHERE id=?').run(bytes || null,bytes ? mime : null,id);
    return itemAdmin(db,id);
  });
}

// A revisão nasce quando a publicação entra no ar, inclusive para itens agendados.
// Assim um agendamento criado antes não fica escondido pelo cookie de uma publicação posterior.
export function novidadesPublicas(db, idioma = 'pt-BR', agora = Date.now()) {
  const data = new Date(agora).toISOString();
  return transacao(db, () => {
    const itens = db.prepare('SELECT * FROM novidades WHERE ativo=1 AND (publicar_em IS NULL OR publicar_em<=?) AND (retirar_em IS NULL OR retirar_em>?) ORDER BY ordem,id').all(data,data);
    for (const item of itens) if (!item.revisao) {
      item.revisao = Number(db.prepare('INSERT INTO novidades_publicacoes DEFAULT VALUES').run().lastInsertRowid);
      db.prepare('UPDATE novidades SET revisao=? WHERE id=?').run(item.revisao,item.id);
    }
    const lingua = idioma === 'en' ? 'en' : 'pt';
    return { itens: itens.map(item=>({ id:item.id,revisao:item.revisao,titulo:item[`titulo_${lingua}`],texto:item[`texto_${lingua}`],botao:item[`botao_${lingua}`],url:item.url,alt:item[`alt_${lingua}`],imagem_url:item.imagem_mime ? `/api/novidades/${item.id}/imagem?v=${item.versao}` : null })), revisao: Math.max(1,...itens.map(i=>i.revisao)) };
  });
}
