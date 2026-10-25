import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { request as httpRequest } from 'node:http';
import { createApp } from '../../apps/server/src/server.js';
import { cleanup, testConfig } from '../helpers.js';
type App=Awaited<ReturnType<typeof createApp>>;
const running:{app:App;cfg:ReturnType<typeof testConfig>}[]=[];
async function setup(mode:'simulation'|'live'|'replay'='simulation'){
  const cfg=testConfig(mode),app=await createApp(cfg);await app.listen();running.push({app,cfg});const base=`http://127.0.0.1:${cfg.port}`;
  const req=(path:string,value?:unknown,headers:Record<string,string>={})=>fetch(base+path,{method:value===undefined?'GET':'POST',headers:{Origin:base,'Content-Type':'application/json',...headers},body:value===undefined?undefined:JSON.stringify(value)});
  const login=await req('/api/login',{key:cfg.controlKey});const cookie=login.headers.get('set-cookie')!.split(';')[0];const data=await login.json();
  return{app,cfg,base,req,headers:{Cookie:cookie,'X-CSRF-Token':data.csrf}};
}
afterEach(async()=>{for(const{app,cfg}of running.splice(0)){await app.close();cleanup(cfg);}});
describe('HTTP control and view boundaries',()=>{
  it('requires a session, exact origin and CSRF',async()=>{const{req,headers}=await setup();expect((await req('/api/control',{action:'start'})).status).toBe(401);expect((await req('/api/control',{action:'start'},{Cookie:headers.Cookie})).status).toBe(403);expect((await req('/api/control',{action:'start'},{...headers,Origin:'https://evil.example'})).status).toBe(403);expect((await req('/api/control',{action:'start'},headers)).status).toBe(409);});
  it('rejects DNS rebinding host and oversized bodies',async()=>{const{base,req,headers}=await setup();const status=await new Promise<number>((resolve,reject)=>{const request=httpRequest(base+'/api/state',{headers:{Host:'evil.example'}},response=>{response.resume();resolve(response.statusCode!);});request.on('error',reject);request.end();});expect(status).toBe(403);expect((await req('/api/control',{action:'start',padding:'x'.repeat(5000)},headers)).status).toBe(413);});
  it('runs simulation join/start/pause and validates action requests',async()=>{const{app,req,headers}=await setup();let r=await req('/api/simulate',{actor:'scout-1',text:'!rally join',roundId:app.room.state.roundId},headers);expect((await r.json()).accepted).toBe(true);expect((await req('/api/control',{action:'start'},headers)).status).toBe(200);expect((await req('/api/control',{action:'pause'},headers)).status).toBe(200);r=await req('/api/simulate',{actor:'scout-1',text:'!rally scout',roundId:app.room.state.roundId},headers);expect((await r.json()).reason).toBe('paused');expect((await req('/api/control',{action:'shell',text:'echo bad'},headers)).status).toBe(400);});
  it('allows a delegated moderator to pause but not reset or inject',async()=>{const{app,req,headers}=await setup();await req('/api/simulate',{actor:'scout-1',text:'!rally join',roundId:app.room.state.roundId},headers);await req('/api/control',{action:'start'},headers);const s=app.sessions.create('moderator'),mod={Cookie:`rally_session=${s.id}`,'X-CSRF-Token':s.csrf};expect((await req('/api/control',{action:'pause'},mod)).status).toBe(200);expect((await req('/api/control',{action:'reset'},mod)).status).toBe(403);expect((await req('/api/simulate',{actor:'scout-1',text:'!rally scout',roundId:app.room.state.roundId},mod)).status).toBe(403);});
  it.each(['live','replay'] as const)('does not expose simulation injection in %s',async mode=>{const{req,headers}=await setup(mode);expect((await req('/api/simulate',{actor:'scout-1',text:'!rally join',roundId:'x'},headers)).status).toBe(404);});
  it('redacts identities and secrets from public snapshots',async()=>{const{app,req,cfg,headers}=await setup();await req('/api/simulate',{actor:'scout-1',text:'!rally join',roundId:app.room.state.roundId},headers);const r=await req('/api/state');const text=await r.text();for(const secret of [cfg.controlKey,cfg.salt,cfg.twitch.clientSecret,'scout-1','participants','access_token'])expect(text).not.toContain(secret);expect(r.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");});
  it('limits repeated login attempts',async()=>{const{req}=await setup();for(let i=0;i<4;i++)expect((await req('/api/login',{key:'wrong'})).status).toBe(401);expect((await req('/api/login',{key:'wrong'})).status).toBe(429);});
  it('rejects OAuth callback without a browser-bound state',async()=>{const{req}=await setup();expect((await req('/auth/twitch/callback?state=forged&code=test')).status).toBe(403);});
  it('view websocket receives snapshots and closes on attempted mutation',async()=>{
    const{base}=await setup();const ws=new WebSocket(base.replace('http','ws')+'/ws/room/main',{origin:base});
    const message=await new Promise<string>((resolve,reject)=>{ws.once('message',x=>resolve(x.toString()));ws.once('error',reject);});expect(JSON.parse(message).state.phase).toBe('lobby');
    const closed=new Promise<number>(resolve=>ws.once('close',resolve));ws.send(JSON.stringify({action:'start'}));expect(await closed).toBe(1008);
  });
  it('websocket denies wrong origins and unknown rooms',async()=>{const{base}=await setup();for(const[path,origin]of[['/ws/room/main','https://evil.example'],['/ws/room/other',base]]){const ws=new WebSocket(base.replace('http','ws')+path,{origin});const status=await new Promise<number>(resolve=>{ws.on('unexpected-response',(_req,res)=>{res.resume();resolve(res.statusCode!);ws.terminate();});ws.on('error',()=>{});});expect(status).toBe(403);}});
});
