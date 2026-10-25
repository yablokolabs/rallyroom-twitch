import { describe, expect, it } from 'vitest';
import { parseCommand, type Command } from '../../packages/game/src/commands.js';
import { initialState, reduce, publicState, catchUp } from '../../packages/game/src/reducer.js';
import { GameClock } from '../../packages/game/src/clock.js';
import { missionFixture } from '../../fixtures/scenarios/mission.js';
import type { Input, State } from '../../packages/game/src/schema.js';
let id = 0;
function chat(actor: string, command: Command, atMs = 0, overrides = {}): Input { const n = ++id; return { kind: 'chat', actorId: actor, command, atMs, eventId: `e${n}`, messageId: `m${n}`, roundId: 'r1', ...overrides }; }
function joined() { return reduce(initialState('r1'), chat('a', 'join')).state; }
function running() { return reduce(joined(), { kind: 'control', action: 'start', atMs: 0 }).state; }
describe('exact command grammar', () => {
  it.each(['!rally join','!rally help','!rally scout','!rally build','!rally charge','!rally role scout','!rally role builder','!rally role engineer'])('accepts %s', text => expect(parseCommand(text)).toBe(text.slice(7)));
  it.each([' !rally join','!rally join ','!RALLY join','!rally pause','!rally join\n','!rally\u00a0join','！rally join','!rally role owner','<img src=x onerror=alert(1)>','!rally join; rm -rf /','https://example.com','!rally '+'x'.repeat(2000)])('rejects untrusted syntax %s', text => expect(parseCommand(text)).toBeNull());
});
describe('mission authority', () => {
  it.each([1,2,3,10,100,500])('deterministic complete mission with %i fixture participants', count => {
    const play = () => missionFixture(count).reduce((s, input) => { const r = reduce(s,input); expect(r.accepted).toBe(true); return r.state; }, initialState('fixture-northstar'));
    const a = play(); expect(a).toEqual(play()); expect(a.phase).toBe('success'); expect(a.progress).toEqual({scout:3,build:4,charge:4});
  });
  it('enforces join, role, phase and cooldown boundary', () => {
    let s = running();
    expect(reduce(s,chat('b','scout')).reason).toBe('join-first');
    expect(reduce(s,chat('a','build')).reason).toBe('wrong-role');
    s=reduce(s,chat('a','scout')).state;
    expect(reduce(s,chat('a','scout',4999)).reason).toBe('cooldown');
    expect(reduce(s,chat('a','scout',5000)).accepted).toBe(true);
    s=reduce(s,chat('a','role builder',5000)).state;
    expect(reduce(s,chat('a','build',5000)).reason).toBe('objective:scout');
    expect(reduce(s,chat('a','role engineer',9999)).reason).toBe('role-cooldown');
    expect(reduce(s,chat('a','role engineer',10000)).accepted).toBe(true);
  });
  it('does not replenish action cooldown on role changes', () => {
    let s=running(); s=reduce(s,chat('a','scout')).state;
    s=reduce(s,chat('a','role builder',100)).state;
    expect(s.participants.a.lastActionMs).toBe(0);
  });
  it('deduplicates both delivery and chat identity, including after reset', () => {
    const event=chat('a','scout'); let s=reduce(running(),event).state;
    expect(reduce(s,event).reason).toBe('duplicate');
    expect(reduce(s,{...event,eventId:'new-delivery',atMs:5000} as Input).reason).toBe('duplicate');
    s=reduce(s,{kind:'control',action:'reset',atMs:5000,nextRoundId:'r2'}).state;
    expect(reduce(s,{...event,atMs:5000} as Input).reason).toBe('prior-round');
    expect(reduce(s,{...event,roundId:'r2',atMs:5000} as Input).reason).toBe('duplicate');
  });
  it('freezes time and rejects gameplay while paused', () => {
    let s=reduce(running(),{kind:'control',action:'pause',atMs:10000}).state;
    expect(reduce(s,chat('a','scout',20000)).reason).toBe('paused');
    s=reduce(s,{kind:'tick',atMs:60000}).state; expect(s.elapsedMs).toBe(10000);
    s=reduce(s,{kind:'control',action:'resume',atMs:60000}).state;
    s=reduce(s,{kind:'tick',atMs:65000}).state; expect(s.elapsedMs).toBe(15000);
  });
  it('rejects stale clock and times out before accepting boundary action', () => {
    let s=reduce(running(),{kind:'tick',atMs:1000}).state;
    expect(reduce(s,chat('a','scout',999)).reason).toBe('stale-clock');
    const r=reduce(s,chat('a','scout',180000)); expect(r.reason).toBe('round-finished'); expect(r.state.phase).toBe('timeout');
  });
  it('late joining leaves thresholds unchanged and supplies useful help', () => {
    const s=reduce(running(),chat('b','join',5000)).state;
    expect(s.targets).toEqual({scout:3,build:4,charge:4}); expect(s.startedParticipants).toBe(1);
    expect(catchUp(s,'b')).toContain('!rally role scout'); expect(catchUp(s)).toContain('175 seconds');
  });
  it('keeps raw identities out of public state and rejects prototype keys', () => {
    expect(publicState(joined())).not.toHaveProperty('participants'); expect(publicState(joined())).not.toHaveProperty('seen');
    expect(reduce(running(),chat('__proto__','join')).reason).toBe('invalid-actor');
  });
  it('bounds dedup retention and participant count', () => {
    let s=initialState('r1'); for(let i=0;i<501;i++) s=reduce(s,chat(`a${i}`,'join')).state;
    expect(Object.keys(s.participants)).toHaveLength(500);
    s={...s,seen:[{id:'e:ancient',atMs:0}],atMs:700000};
    expect(reduce(s,chat('a0','help',700000)).state.seen.some(x=>x.id==='e:ancient')).toBe(false);
  });
  it('requires terminal state for recap and resets the roster', () => {
    expect(reduce(running(),{kind:'control',action:'recap',atMs:0}).accepted).toBe(false);
    let s=reduce(running(),{kind:'tick',atMs:180000}).state;
    s=reduce(s,{kind:'control',action:'recap',atMs:180000}).state; expect(s.phase).toBe('recap');
    s=reduce(s,{kind:'control',action:'reset',atMs:180000,nextRoundId:'r2'}).state; expect(s.phase).toBe('lobby'); expect(s.participants).toEqual({});
  });
  it('reanchors a monotonic clock after recovery', () => {
    let now=100; const clock=new GameClock(5000,()=>now);now=350;expect(clock.now()).toBe(5250);now=50;expect(clock.now()).toBe(5000);
  });
});
