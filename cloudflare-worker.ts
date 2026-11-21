/** API do Lash Germano em Cloudflare Workers + D1. Sem Express ou armazenamento local. */
import { z } from 'zod';

type Service = { id: string; name: string; application: number; maintenance: number; image: string | null };
type Config = { studioName: string; tagline: string; whatsapp: string; days: number[]; startTime: string; endTime: string; interval: number; blockedDates: string[]; services: Service[] };
type Database = { prepare(sql: string): { bind(...args: unknown[]): { first<T = Record<string, unknown>>(): Promise<T | null>; run(): Promise<unknown> } } };
type Env = { DB: Database; ADMIN_PASSWORD: string; SESSION_SECRET: string; ASSETS: { fetch(request: Request): Promise<Response> } };
const names = ['Brasileiro 3D', 'Fox Eyes', 'Sirena', 'Glow', 'Glamour', 'Efeito Wispy', 'Efeito Suave'];
const apps = [90,95,85,100,90,120,100];
const upkeep = [70,70,65,75,70,80,75];
const defaults: Config = { studioName:'Lash Germano', tagline:'Seu olhar, sua essência.', whatsapp:'', days:[1,2,3,4,5,6], startTime:'09:00', endTime:'18:00', interval:60, blockedDates:[], services:names.map((name,i)=>({id:`modelo-${i+1}`,name,application:apps[i],maintenance:upkeep[i],image:null})) };
const limit = 1_500_000;
const sessionLength = 8*60*60*1000;
const enc = new TextEncoder();
function reply(body: unknown, status=200): Response { return new Response(JSON.stringify(body), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}); }
function error(message:string,status=400) { return reply({error:message},status); }
function bytesToHex(data:Uint8Array) { return Array.from(data,x=>x.toString(16).padStart(2,'0')).join(''); }
function hexToBytes(hex:string) { return Uint8Array.from(hex.match(/../g)??[],pair=>parseInt(pair,16)); }
async function mac(secret:string,msg:string) { const key = await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']); return bytesToHex(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(msg)))); }
function same(a:Uint8Array,b:Uint8Array) { if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a[i]^b[i];return x===0; }
function cookie(req:Request) { const all=req.headers.get('cookie')??''; const found=all.split(';').map(s=>s.trim()).find(s=>s.startsWith('__Host-lash_admin='));return found?.slice('__Host-lash_admin='.length)??''; }
function setCookie(value:string,maxAge:number) { return `__Host-lash_admin=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`; }
async function authed(req:Request,env:Env) { const raw=cookie(req);const [exp,nonce,signature]=raw.split('.');if(!exp||!nonce||!signature||!/^[0-9]{13}$/.test(exp)||!/^[a-f0-9]{64}$/.test(nonce)||!/^[a-f0-9]{64}$/.test(signature)||Number(exp)<Date.now())return false; if(!same(hexToBytes(signature),hexToBytes(await mac(env.SESSION_SECRET,`session:${exp}:${nonce}`))))return false; const session=await env.DB.prepare('SELECT id FROM sessions WHERE id=? AND until>?').bind(nonce,Date.now()).first();return !!session; }
async function getConfig(env:Env):Promise<Config> { const row=await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('config').first<{value:string}>();return row?JSON.parse(row.value) as Config: structuredClone(defaults); }
async function saveConfig(env:Env,config:Config) { await env.DB.prepare('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('config',JSON.stringify(config)).run(); }
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const serviceInput = z.object({id:z.string(),name:z.string().trim().min(2).max(80),application:z.number().min(0).max(100000),maintenance:z.number().min(0).max(100000),image:z.string().nullable()});
const configInput = z.object({studioName:z.string().trim().min(2).max(80),tagline:z.string().trim().max(160),whatsapp:z.string().regex(/^(|[1-9][0-9]{9,14})$/),days:z.array(z.number().int().min(0).max(6)).min(1).max(7),startTime:hhmm,endTime:hhmm,interval:z.number().int().min(15).max(240),blockedDates:z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(365),services:z.array(serviceInput).length(7)}).strict();
async function jsonBody(req:Request) { const str=await req.text(); if(str.length>25000) throw new Error('too_large');return JSON.parse(str); }
function allowedFormat(buf:Uint8Array):string|null { if(buf.length>=4&&buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff)return 'image/jpeg';if(buf.length>=8&&buf[0]===137&&buf[1]===80&&buf[2]===78&&buf[3]===71&&buf[4]===13&&buf[5]===10&&buf[6]===26&&buf[7]===10)return 'image/png';if(buf.length>=12&&new TextDecoder().decode(buf.slice(0,4))==='RIFF'&&new TextDecoder().decode(buf.slice(8,12))==='WEBP')return 'image/webp';return null; }
function security(res:Response) { res.headers.set('X-Content-Type-Options','nosniff');res.headers.set('Referrer-Policy','strict-origin-when-cross-origin');res.headers.set('X-Frame-Options','DENY');return res; }
async function handle(request:Request,env:Env):Promise<Response> {
 const url=new URL(request.url),path=url.pathname,method=request.method;
 if(!env.DB||!env.ADMIN_PASSWORD||env.ADMIN_PASSWORD.length<16||!env.SESSION_SECRET||env.SESSION_SECRET.length<32)return error('Configuração administrativa incompleta.',503);
 if(path.startsWith('/api/')||path.startsWith('/uploads/')) {
   if(!['GET','HEAD','OPTIONS'].includes(method)&&request.headers.get('Origin')!==url.origin)return error('Origem não autorizada.',403);
   if(method==='GET'&&path==='/api/public')return reply(await getConfig(env));
   if(method==='GET'&&path==='/api/admin/session')return reply({authenticated:await authed(request,env)});
   if(method==='GET'&&path.startsWith('/uploads/')) {
      const id=path.slice('/uploads/'.length); if(!/^[a-z0-9-]{15,80}$/.test(id))return error('Imagem não encontrada.',404);
      const image=await env.DB.prepare('SELECT mime,data FROM images WHERE id = ?').bind(id).first<{mime:string;data:number[]}>();
      if(!image)return error('Imagem não encontrada.',404);
      return new Response(Uint8Array.from(image.data),{headers:{'Content-Type':image.mime,'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});
   }
   if(method==='POST'&&path==='/api/admin/login') {
      const ip=request.headers.get('cf-connecting-ip')??'unknown'; const key=await mac(env.SESSION_SECRET,`ip:${ip}`);const now=Date.now();
      const rec=await env.DB.prepare('SELECT count,until FROM attempts WHERE id = ?').bind(key).first<{count:number;until:number}>();
      if(rec&&rec.until>now&&rec.count>=8)return error('Muitas tentativas. Tente novamente mais tarde.',429);
      let body:unknown;try{body=await jsonBody(request);}catch{return error('Solicitação inválida.');}
      const parsed=z.object({password:z.string().min(1).max(256)}).safeParse(body);
      const supplied=parsed.success?parsed.data.password:'invalid';
      const good=same(hexToBytes(await mac(env.SESSION_SECRET,`login:${supplied}`)),hexToBytes(await mac(env.SESSION_SECRET,`login:${env.ADMIN_PASSWORD}`)));
      if(!parsed.success||!good) {
         const count=rec&&rec.until>now?rec.count+1:1;
         await env.DB.prepare('INSERT INTO attempts(id,count,until) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET count=excluded.count,until=excluded.until').bind(key,count,now+15*60*1000).run();
         return error('Senha incorreta.',401);
      }
      await env.DB.prepare('DELETE FROM attempts WHERE id=?').bind(key).run();
      const exp=String(Date.now()+sessionLength);const nonce=bytesToHex(crypto.getRandomValues(new Uint8Array(32)));const sig=await mac(env.SESSION_SECRET,`session:${exp}:${nonce}`);
      await env.DB.prepare('INSERT INTO sessions(id,until) VALUES(?,?)').bind(nonce,Number(exp)).run();
      const out=reply({authenticated:true});out.headers.set('Set-Cookie',setCookie(`${exp}.${nonce}.${sig}`,Math.floor(sessionLength/1000)));return out;
   }
   if(!await authed(request,env))return error('Acesso restrito.',401);
   if(method==='POST'&&path==='/api/admin/logout') { const nonce=cookie(request).split('.')[1];if(nonce)await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(nonce).run(); const out=reply({ok:true});out.headers.set('Set-Cookie',setCookie('',0));return out; }
   if(method==='PUT'&&path==='/api/admin/config') {
      let body:unknown;try{body=await jsonBody(request);}catch{return error('Dados inválidos.');}
      const parsed=configInput.safeParse(body);if(!parsed.success)return error('Confira os campos e os valores.');
      const next=parsed.data,prev=await getConfig(env);
      if(next.startTime>=next.endTime||new Set(next.days).size!==next.days.length||new Set(next.blockedDates).size!==next.blockedDates.length)return error('Dias ou horários inválidos.');
      if(next.services.some((s,i)=>s.id!==defaults.services[i].id||s.image!==prev.services[i].image))return error('Fotos e identificadores só podem ser alterados pelo gerenciamento de imagens.');
      await saveConfig(env,next);return reply(next);
   }
   const match=/^\/api\/admin\/services\/(modelo-[1-7])\/image$/.exec(path);
   if(match&&['POST','DELETE'].includes(method)) {
     const cfg=await getConfig(env); const service=cfg.services.find(s=>s.id===match[1]);if(!service)return error('Modelo inexistente.',404);
     if(method==='DELETE') {const old=service.image;service.image=null;await saveConfig(env,cfg);if(old?.startsWith('/uploads/'))await env.DB.prepare('DELETE FROM images WHERE id=?').bind(old.slice(9)).run();return reply({image:null});}
     const ct=request.headers.get('content-type')??'';if(!ct.startsWith('multipart/form-data'))return error('Selecione uma imagem.');
     const size=Number(request.headers.get('content-length')??0);if(size>2_200_000)return error('Imagem muito grande. Envie uma foto menor.',413);
     const fd=await request.formData();const file=fd.get('image');if(!(file instanceof File))return error('Envie uma fotografia.');
     if(file.size>limit)return error('A imagem deve ter até 1,5 MB após a otimização.',413);
     const buffer=new Uint8Array(await file.arrayBuffer());const mime=allowedFormat(buffer);
     if(!mime||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.type!==mime)return error('Formato inválido. Use JPEG, PNG ou WebP.',415);
     const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO images(id,mime,data) VALUES(?,?,?)').bind(id,mime,buffer.buffer).run();
     const old=service.image;service.image=`/uploads/${id}`;
     try {await saveConfig(env,cfg);}catch(e){await env.DB.prepare('DELETE FROM images WHERE id=?').bind(id).run();throw e;}
     if(old?.startsWith('/uploads/'))await env.DB.prepare('DELETE FROM images WHERE id=?').bind(old.slice(9)).run();
     return reply({image:service.image});
   }
   return error('Rota inexistente.',404);
 }
 return env.ASSETS.fetch(request);
}
export default { async fetch(request:Request,env:Env) { try {return security(await handle(request,env));}catch(e){console.error('Lash API:', e instanceof Error?e.message:'Erro inesperado');return security(error('Ocorreu um erro no servidor. Tente novamente.',500));} } };
