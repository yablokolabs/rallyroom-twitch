import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Room } from '../../apps/server/src/rooms/room.js';
import { Journal } from '../../apps/server/src/storage/store.js';
import { EventSub, ingestNotification, reconnectUrl } from '../../apps/server/src/twitch/eventsub.js';
import { TwitchAuth, TwitchError } from '../../apps/server/src/twitch/oauth.js';
import { cleanup, testConfig } from '../helpers.js';
const configs: ReturnType<typeof testConfig>[]=[];
function room() { const cfg=testConfig('live');configs.push(cfg);const r=new Room('live',new Journal(cfg.directory),'test-salt');r.transport('connected');return r; }
function notification(r: Room,text='!rally join',message='m1') { return {metadata:{message_id:'event-'+message,message_type:'notification',message_timestamp:new Date(r.roundOpenedAt+1).toISOString(),subscription_type:'channel.chat.message',subscription_version:'1'},payload:{subscription:{id:'sub1',type:'channel.chat.message',version:'1',condition:{broadcaster_user_id:'123',user_id:'123'}},event:{broadcaster_user_id:'123',chatter_user_id:'456',message_id:message,message:{text}}}}; }
afterEach(()=>{vi.useRealTimers();configs.splice(0).forEach(cleanup);});
describe('provider adapter boundary',()=>{
  it('preserves provider reconnect paths and query strings as issued',()=>{const url='wss://eventsub.wss.twitch.tv?token=synthetic';expect(reconnectUrl(url)).toBe(url);expect(reconnectUrl('wss://eventsub.wss.twitch.tv/new-path?handoff=1')).toBe('wss://eventsub.wss.twitch.tv/new-path?handoff=1');});
  it('accepts authenticated, scoped notifications and deduplicates',()=>{const r=room();const msg=notification(r);expect(ingestNotification(msg,r,'123','sub1').accepted).toBe(true);expect(ingestNotification(msg,r,'123','sub1').reason).toBe('duplicate');expect(r.snapshot().state.participantCount).toBe(1);});
  it('rejects wrong channel, subscription and stale delivery',()=>{const r=room();let msg=notification(r);msg.payload.event.broadcaster_user_id='999';expect(ingestNotification(msg,r,'123','sub1').reason).toBe('wrong-channel');msg=notification(r);expect(ingestNotification(msg,r,'123','other').reason).toBe('wrong-channel');msg.metadata.message_timestamp=new Date(r.roundOpenedAt-10000).toISOString();expect(ingestNotification(msg,r,'123','sub1').reason).toBe('stale-event');});
  it('rejects malformed messages and arbitrary instructions',()=>{const r=room();expect(ingestNotification({},r,'123','sub1').accepted).toBe(false);expect(ingestNotification(notification(r,'<script>alert(1)</script>'),r,'123','sub1').reason).toBe('unknown-command');});
  it('accepts only the exact Twitch reconnect origin',()=>{expect(reconnectUrl('wss://eventsub.wss.twitch.tv/ws?session=abc')).toContain('session=abc');for(const x of ['ws://eventsub.wss.twitch.tv/ws','wss://eventsub.wss.twitch.tv.evil.example/ws','wss://eventsub.wss.twitch.tv@evil.example/ws','https://localhost/','wss://eventsub.wss.twitch.tv:444/ws','file:///secret'])expect(reconnectUrl(x)).toBeNull();});
  it('separates simulator from live ingestion and pauses on gaps',()=>{const r=room();expect(r.ingest('!rally join','x','e','m',r.state.roundId,'simulation').reason).toBe('wrong-mode');ingestNotification(notification(r),r,'123','sub1');r.control('start');r.transport('reconnecting',true);expect(r.state.paused).toBe(true);expect(r.snapshot().gap).toBe(true);expect(r.control('resume').reason).toBe('connect-twitch-first');r.transport('connected');expect(r.state.paused).toBe(true);expect(r.control('resume').accepted).toBe(true);});
});
class FakeSocket extends EventEmitter {
  readyState=1;
  close(){this.readyState=3;this.emit('close');}
  terminate(){this.close();}
  send(type:string,payload:unknown={}){this.emit('message',Buffer.from(JSON.stringify({metadata:{message_id:'meta',message_type:type,message_timestamp:new Date().toISOString()},payload})));}
}
const welcome={session:{id:'session1',keepalive_timeout_seconds:10,reconnect_url:null}};
describe('EventSub lifecycle using fake provider sockets',()=>{
  it('keeps a stopped adapter stopped when startup validation completes late',async()=>{
    vi.useFakeTimers();const r=room();let finish!:()=>void;
    const auth={validate:vi.fn().mockImplementationOnce(()=>new Promise<void>(resolve=>{finish=resolve;})).mockResolvedValue(undefined),subscribe:vi.fn(),forget:vi.fn(),config:{broadcasterId:'123'}};
    const sockets:FakeSocket[]=[];
    const adapter=new EventSub(auth as unknown as TwitchAuth,r,()=>{},()=>{const s=new FakeSocket();sockets.push(s);return s as never;});
    const pending=adapter.start();adapter.stop();finish();await pending;
    await vi.advanceTimersByTimeAsync(3600001);
    expect(sockets).toHaveLength(0);expect(auth.validate).toHaveBeenCalledOnce();adapter.stop();
  });
  it('ignores a failed earlier startup after a newer connection is ready',async()=>{
    const r=room();let rejectFirst!:(error:Error)=>void;
    const auth={validate:vi.fn().mockImplementationOnce(()=>new Promise<void>((_resolve,reject)=>{rejectFirst=reject;})).mockResolvedValue(undefined),subscribe:vi.fn().mockResolvedValue('sub1'),forget:vi.fn(),config:{broadcasterId:'123'}};
    const sockets:FakeSocket[]=[];
    const adapter=new EventSub(auth as unknown as TwitchAuth,r,()=>{},()=>{const s=new FakeSocket();sockets.push(s);return s as never;});
    try {
      const earlier=adapter.start();await adapter.start();sockets[0].send('session_welcome',welcome);
      await vi.waitFor(()=>expect(r.status).toBe('connected'));
      rejectFirst(new TwitchError('revoked'));await earlier;
      expect(r.status).toBe('connected');expect(sockets[0].readyState).toBe(1);expect(auth.forget).not.toHaveBeenCalled();
    } finally {adapter.stop();}
  });
  it('subscribes after welcome, hands off reconnect without resubscription, and revokes',async()=>{
    const r=room(),sockets:FakeSocket[]=[];
    const auth={validate:vi.fn().mockResolvedValue(undefined),subscribe:vi.fn().mockResolvedValue('sub1'),forget:vi.fn(),config:{broadcasterId:'123'}};
    const revoke=vi.fn();const adapter=new EventSub(auth as unknown as TwitchAuth,r,revoke,()=>{const s=new FakeSocket();sockets.push(s);return s as never;});
    await adapter.start();sockets[0].send('session_welcome',welcome);await vi.waitFor(()=>expect(r.status).toBe('connected'));
    expect(auth.subscribe).toHaveBeenCalledOnce();sockets[0].send('session_reconnect',{session:{reconnect_url:'wss://eventsub.wss.twitch.tv/ws?handoff=1'}});expect(sockets).toHaveLength(2);expect(sockets[0].readyState).toBe(1);
    sockets[1].send('session_welcome',welcome);await vi.waitFor(()=>expect(sockets[0].readyState).toBe(3));expect(auth.subscribe).toHaveBeenCalledOnce();
    sockets[1].send('revocation',{subscription:{id:'sub1',status:'authorization_revoked'}});expect(r.status).toBe('revoked');expect(revoke).toHaveBeenCalledOnce();expect(auth.forget).toHaveBeenCalledOnce();adapter.stop();
  });
  it('expires keepalive, marks the gap, and subscribes a fresh connection',async()=>{
    vi.useFakeTimers();const r=room(),sockets:FakeSocket[]=[];
    const auth={validate:vi.fn().mockResolvedValue(undefined),subscribe:vi.fn().mockResolvedValue('sub1'),forget:vi.fn(),config:{broadcasterId:'123'}};
    const adapter=new EventSub(auth as unknown as TwitchAuth,r,()=>{},()=>{const s=new FakeSocket();sockets.push(s);return s as never;});
    await adapter.start();sockets[0].send('session_welcome',welcome);await Promise.resolve();await Promise.resolve();
    await vi.advanceTimersByTimeAsync(11001);expect(r.status).toBe('reconnecting');expect(r.gap).toBe(true);
    await vi.advanceTimersByTimeAsync(1000);expect(sockets.length).toBe(2);sockets[1].send('session_welcome',welcome);await Promise.resolve();await Promise.resolve();expect(auth.subscribe).toHaveBeenCalledTimes(2);adapter.stop();
  });
});
