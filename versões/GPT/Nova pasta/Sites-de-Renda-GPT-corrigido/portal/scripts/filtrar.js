export function normalizar(texto){return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');}
export function filtrar(ferramentas,{busca='',categoria=0,favoritos=null},categorias){const termos=normalizar(busca).trim().split(/\s+/).filter(Boolean);return ferramentas.filter(f=>(!Number(categoria)||f.categoria===Number(categoria))&&(!favoritos||favoritos.includes(f.id))&&termos.every(t=>normalizar(`${f.titulo} ${f.descricao} ${categorias.find(c=>c.id===f.categoria)?.nome}`).includes(t)));}

