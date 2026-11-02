export function baixar(blob,nome){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=nome;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
