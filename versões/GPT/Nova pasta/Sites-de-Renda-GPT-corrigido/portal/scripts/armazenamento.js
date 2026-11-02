const prefixo='doce-oficio-gpt-v1:';
export function ler(chave,padrao){try{return JSON.parse(localStorage.getItem(prefixo+chave))??padrao;}catch{return padrao;}}
export function guardar(chave,valor){try{localStorage.setItem(prefixo+chave,JSON.stringify(valor));return true;}catch{return false;}}
export function validarBackup(texto,ids){
 if(texto.length>2000000)throw Error('A cópia deve ter até 2 MB.');
 const dados=JSON.parse(texto);
 if(dados?.versao!==1||!Array.isArray(dados.registros)||dados.registros.length>200)throw Error('Formato de cópia inválido.');
 const registros=dados.registros.map(r=>{
  if(!r||!ids.includes(r.ferramenta)||typeof r.nome!=='string'||r.nome.length>120||!r.dados||typeof r.dados!=='object'||Array.isArray(r.dados))throw Error('Registro inválido na cópia.');
  const campos=Object.create(null);
  for(const [k,v] of Object.entries(r.dados)){
   if(['__proto__','prototype','constructor'].includes(k)||k.length>100||!['string','boolean','number'].includes(typeof v)||String(v).length>50000)throw Error('Campo inválido na cópia.');
   campos[k]=v;
  }
  return {id:crypto.randomUUID(),nome:r.nome,ferramenta:r.ferramenta,dados:campos,data:new Date().toISOString()};
 });
 return registros;
}
