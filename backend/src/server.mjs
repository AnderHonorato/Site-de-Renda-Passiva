import http from "node:http";
import { URL } from "node:url";
import { prisma } from "./db.mjs";
import { criarSessao, usuarioDaRequisicao } from "./auth.mjs";

const port = Number(process.env.PORT || 4490);
const headers = {"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"GET,POST,DELETE,OPTIONS"};

function send(res,status,data){res.writeHead(status,headers);res.end(JSON.stringify(data));}
async function body(req){let s="";for await(const c of req)s+=c;return s?JSON.parse(s):{};}

const server=http.createServer(async(req,res)=>{
  try {
    if(req.method==="OPTIONS"){res.writeHead(204,headers);return res.end();}
    const url=new URL(req.url, `http://127.0.0.1:${port}`);
    if(req.method==="GET" && url.pathname==="/health") return send(res,200,{ok:true,service:"renda-passiva-api"});
    if(req.method==="GET" && url.pathname==="/api/notices") return send(res,200,await prisma.notice.findMany({where:{active:true},orderBy:{position:"asc"}}));
    if(req.method==="GET" && url.pathname==="/api/banners") return send(res,200,await prisma.banner.findMany({where:{active:true},orderBy:{position:"asc"}}));

    const user=await usuarioDaRequisicao(req);
    if(req.method==="GET" && url.pathname==="/api/me") return send(res,200,{user});
    if(!user) return send(res,401,{error:"AUTH_REQUIRED"});

    if(req.method==="GET" && url.pathname==="/api/recent") return send(res,200,await prisma.recentView.findMany({where:{userId:user.id},orderBy:{viewedAt:"desc"},take:12}));
    if(req.method==="POST" && url.pathname==="/api/recent"){
      const b=await body(req);
      return send(res,200,await prisma.recentView.upsert({where:{userId_toolId:{userId:user.id,toolId:b.toolId}},update:{toolName:b.toolName,viewedAt:new Date()},create:{userId:user.id,toolId:b.toolId,toolName:b.toolName}}));
    }
    if(req.method==="GET" && url.pathname==="/api/downloads") return send(res,200,await prisma.download.findMany({where:{userId:user.id},orderBy:{createdAt:"desc"},take:100}));
    if(req.method==="POST" && url.pathname==="/api/downloads"){
      const b=await body(req);
      return send(res,201,await prisma.download.create({data:{userId:user.id,toolId:b.toolId,toolName:b.toolName,fileName:b.fileName,mimeType:b.mimeType,storageKey:b.storageKey}}));
    }
    return send(res,404,{error:"NOT_FOUND"});
  } catch(e){ console.error(e); return send(res,500,{error:"SERVER_ERROR"}); }
});
server.listen(port,()=>console.log(`API em http://127.0.0.1:${port}`));