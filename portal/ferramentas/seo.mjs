import { escapar } from './modelo-de-página.mjs';
import { site } from '../dados/site.js';

export function basePublica(valor = process.env.PORTAL_URL_SITE || process.env.URL_PUBLICA || '') {
  if(!valor) return null;
  try {
    const u=new URL(valor);
    if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||/^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/u.test(u.hostname)||/\.(invalid|test|local)$/u.test(u.hostname)||u.hostname.includes(':')) return null;
    return u.href.endsWith('/')?u.href:u.href+'/';
  } catch { return null; }
}

const jsonSeguro = valor => JSON.stringify(valor).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026');

export function completarSeo(html,caminho,{base=basePublica(),ferramenta}={}) {
  const titulo=html.match(/<title>([^<]*)<\/title>/u)?.[1]||'';
  const descricao=html.match(/<meta name="description" content="([^"]*)">/u)?.[1]||'';
  const privado=html.includes('name="robots" content="noindex,follow"');
  const url=base ? new URL(caminho.replace(/index\.html$/u,''),base).href : null;
  const extras=[`<meta property="og:title" content="${titulo}">`,`<meta property="og:description" content="${descricao}">`,`<meta property="og:type" content="website">`,`<meta name="twitter:card" content="summary">`];
  if(url&&!privado) {
    extras.push(`<link rel="canonical" href="${escapar(url)}">`,`<meta property="og:url" content="${escapar(url)}">`);
    html=html.replace(/<link rel="alternate" hreflang="([^"]+)" href="([^"]*)">/gu,(_,lingua,href)=>`<link rel="alternate" hreflang="${lingua}" href="${escapar(new URL(href.replaceAll('&amp;','&'),url).href)}">`);
    if(ferramenta) extras.push(`<script type="application/ld+json">${jsonSeguro({'@context':'https://schema.org','@graph':[
      {'@type':'WebApplication',name:ferramenta.nome,description:ferramenta.resumo,url,applicationCategory:'UtilitiesApplication',operatingSystem:'Any',inLanguage:'pt-BR',isAccessibleForFree:true},
      {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:site.nome,item:base},{'@type':'ListItem',position:2,name:'Ferramentas',item:new URL('ferramentas.html',base).href},{'@type':'ListItem',position:3,name:ferramenta.nome,item:url}]}
    ]})}</script>`);
    else if(caminho==='index.html'||caminho==='en/index.html') extras.push(`<script type="application/ld+json">${jsonSeguro({'@context':'https://schema.org','@type':'WebSite',name:site.nome,url:base,inLanguage:['pt-BR','en']})}</script>`);
  }
  return html.replace('</head>',`  ${extras.join('\n  ')}\n</head>`);
}
