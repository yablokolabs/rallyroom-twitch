import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TwitchAuth, TwitchError } from '../../apps/server/src/twitch/oauth.js';
import { atomicWrite } from '../../apps/server/src/storage/store.js';
import { cleanup, testConfig } from '../helpers.js';
const configs:ReturnType<typeof testConfig>[]=[];
const token={access_token:'test-access-value',refresh_token:'test-refresh-value',expires_in:3600,scope:['user:read:chat'],token_type:'bearer'};
const id={client_id:'test-client',user_id:'123',scopes:['user:read:chat'],expires_in:3600};
const response=(data:unknown,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers});
function setup(fetcher:typeof fetch,stored=true){const cfg=testConfig('live');configs.push(cfg);const path=join(cfg.directory,'tokens.json');if(stored)atomicWrite(path,JSON.stringify(token));return{auth:new TwitchAuth(cfg.twitch,path,fetcher),path,cfg};}
afterEach(()=>configs.splice(0).forEach(cleanup));
describe('OAuth boundaries with mocked HTTP responses',()=>{
  it('keeps a new grant when an older refresh finishes after reauthorization',async()=>{
    let finishOld!:(response:Response)=>void,newGrantChecks=0;
    const grant={...token,access_token:'new-grant-access',refresh_token:'new-grant-refresh'};
    const rotated={...token,access_token:'new-refreshed-access',refresh_token:'new-refreshed-refresh'};
    const fetcher=vi.fn().mockImplementation((url:string,init:RequestInit)=>{
      if(url.endsWith('/validate')) {
        const access=(init.headers as Record<string,string>).Authorization;
        if(access==='OAuth test-access-value')return Promise.resolve(response({},401));
        if(access==='OAuth new-grant-access'&&++newGrantChecks===2)return Promise.resolve(response({},401));
        return Promise.resolve(response(id));
      }
      const form=init.body as URLSearchParams;
      if(form.get('grant_type')==='authorization_code')return Promise.resolve(response(grant));
      if(form.get('refresh_token')==='test-refresh-value')return new Promise<Response>(resolve=>{finishOld=resolve;});
      return Promise.resolve(response(rotated));
    });
    const{auth,path}=setup(fetcher as never);
    const oldResult=auth.validate().then(()=>true,()=>false);
    await vi.waitFor(()=>expect(finishOld).toBeTypeOf('function'));
    auth.forget();await auth.redeem('new-code','chat');
    const newResult=auth.validate().then(()=>true,()=>false);
    await vi.waitFor(()=>expect(newGrantChecks).toBe(2));
    finishOld(response({...token,access_token:'old-refresh-result'}));
    await oldResult;
    expect(await newResult).toBe(true);
    expect(auth.hasToken()).toBe(true);
    expect(JSON.parse(readFileSync(path,'utf8')).access_token).toBe(rotated.access_token);
  });
  it('rechecks current credentials when a concurrent validation returns a late 401',async()=>{
    let finishLate!:(response:Response)=>void,oldChecks=0;
    const rotated={...token,access_token:'fresh-access',refresh_token:'fresh-refresh'};
    const fetcher=vi.fn().mockImplementation((url:string,init:RequestInit)=>{
      if(url.endsWith('/token'))return Promise.resolve(response(rotated));
      if((init.headers as Record<string,string>).Authorization==='OAuth test-access-value') {
        if(++oldChecks===1)return Promise.resolve(response({},401));
        return new Promise<Response>(resolve=>{finishLate=resolve;});
      }
      return Promise.resolve(response(id));
    });
    const{auth}=setup(fetcher as never);
    const first=auth.validate(),second=auth.validate();
    await first;finishLate(response({},401));
    await expect(second).resolves.toBeUndefined();
    expect(auth.hasToken()).toBe(true);
  });
  it('does not restore forgotten credentials after a pending refresh completes',async()=>{
    let finish!:(response:Response)=>void;
    const fetcher=vi.fn().mockResolvedValueOnce(response({},401)).mockImplementationOnce(()=>new Promise<Response>(resolve=>{finish=resolve;})).mockResolvedValue(response(id));
    const{auth,path}=setup(fetcher as never);
    const pending=auth.validate();await vi.waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2));
    auth.forget();finish(response({...token,access_token:'rotated-after-forget'}));
    await expect(pending).rejects.toMatchObject({code:'revoked'});expect(auth.hasToken()).toBe(false);expect(existsSync(path)).toBe(false);
  });
  it('rejects a pending authorization grant cancelled by disconnect',async()=>{
    let finish!:(response:Response)=>void;
    const fetcher=vi.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>{finish=resolve;})).mockResolvedValue(response(id));
    const{auth,path}=setup(fetcher as never,false);
    const pending=auth.redeem('cancelled-code','chat');auth.forget();finish(response(token));
    await expect(pending).rejects.toMatchObject({code:'revoked'});expect(existsSync(path)).toBe(false);
  });
  it('requests only read-chat and binds state',()=>{const {auth}=setup(vi.fn() as never);const url=new URL(auth.authorizeUrl('bound-state','chat'));expect(url.searchParams.get('scope')).toBe('user:read:chat');expect(url.searchParams.get('state')).toBe('bound-state');expect(url.searchParams.get('response_type')).toBe('code');expect(new URL(auth.authorizeUrl('control-state','control')).searchParams.get('scope')).toBe('');});
  it('validates client, broadcaster and scope independently',async()=>{for(const identity of [{...id,client_id:'other'},{...id,user_id:'999'},{...id,scopes:[]}]){const {auth}=setup(vi.fn().mockResolvedValue(response(identity)) as never);await expect(auth.validate()).rejects.toMatchObject({code:'wrong-identity'});}});
  it('refreshes once after 401 and saves rotated tokens server-side',async()=>{
    const rotated={...token,access_token:'rotated-test-access',refresh_token:'rotated-test-refresh'};
    const fetcher=vi.fn().mockResolvedValueOnce(response({},401)).mockResolvedValueOnce(response(rotated)).mockResolvedValueOnce(response(id));
    const {auth,path}=setup(fetcher as never);await auth.validate();expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[1][0]).toBe('https://id.twitch.tv/oauth2/token');
    expect(String(fetcher.mock.calls[1][1].body)).toContain('grant_type=refresh_token');expect(JSON.parse(readFileSync(path,'utf8')).refresh_token).toBe(rotated.refresh_token);
  });
  it('forgets unusable tokens after refresh is revoked',async()=>{const fetcher=vi.fn().mockResolvedValueOnce(response({},401)).mockResolvedValueOnce(response({},400));const{auth,path}=setup(fetcher as never);await expect(auth.validate()).rejects.toMatchObject({code:'revoked'});expect(auth.hasToken()).toBe(false);expect(existsSync(path)).toBe(false);});
  it('uses user-token chat subscription condition and no sending API',async()=>{
    const fetcher=vi.fn().mockResolvedValue(response({data:[{id:'subscription1',status:'enabled',type:'channel.chat.message',version:'1'}]},202));const{auth}=setup(fetcher as never);expect(await auth.subscribe('session1')).toBe('subscription1');
    const request=JSON.parse(fetcher.mock.calls[0][1].body);expect(request).toEqual({type:'channel.chat.message',version:'1',condition:{broadcaster_user_id:'123',user_id:'123'},transport:{method:'websocket',session_id:'session1'}});
  });
  it('uses provider rate-limit reset instead of retrying in a tight loop',async()=>{const fetcher=vi.fn().mockResolvedValue(response({},429,{'Ratelimit-Reset':String(Math.ceil(Date.now()/1000)+60)}));const{auth}=setup(fetcher as never);try{await auth.subscribe('s1');throw new Error('expected failure');}catch(e){expect(e).toBeInstanceOf(TwitchError);expect((e as TwitchError).retryAfterMs).toBeGreaterThan(50000);}expect(fetcher).toHaveBeenCalledOnce();});
  it('rejects controller identity outside server-side numeric allowlist',async()=>{const f=vi.fn().mockResolvedValueOnce(response(token)).mockResolvedValueOnce(response({...id,user_id:'999'}));const{auth}=setup(f as never,false);await expect(auth.redeem('test-code','control')).rejects.toMatchObject({code:'wrong-identity'});});
  it('grants moderator controls only to an explicitly allowed ID',async()=>{const f=vi.fn().mockResolvedValueOnce(response(token)).mockResolvedValueOnce(response({...id,user_id:'456',scopes:[]}));const{auth}=setup(f as never,false);expect((await auth.redeem('test-code','control')).role).toBe('moderator');expect(auth.hasToken()).toBe(false);});
});
