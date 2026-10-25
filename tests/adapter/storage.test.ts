import { appendFileSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Journal } from '../../apps/server/src/storage/store.js';
import { Room } from '../../apps/server/src/rooms/room.js';
import { initialState } from '../../packages/game/src/reducer.js';
import { cleanup, testConfig } from '../helpers.js';
describe('journal recovery',()=>{
  it('recovers when the first journal transaction was interrupted',()=>{
    const cfg=testConfig();
    try {
      writeFileSync(join(cfg.directory,'room.jsonl'),'{"partial":');
      const journal=new Journal(cfg.directory);
      expect(journal.load()).toBeNull();
      journal.save({state:initialState('recovered'),events:[],savedAt:new Date().toISOString()});
      expect(new Journal(cfg.directory).load()?.state.roundId).toBe('recovered');
    } finally {cleanup(cfg);}
  });
  it('clears a generated replay and plays it again from its first input',()=>{
    const cfg=testConfig('replay');
    try {
      const room=new Room('replay',new Journal(cfg.directory),'salt');
      for(let i=0;i<5;i++)room.tick();
      room.clearHistory();
      for(let i=0;i<15;i++)room.tick();
      expect(room.state.phase).toBe('success');
      expect(room.snapshot().state.contributions).toBe(11);
    } finally {cleanup(cfg);}
  });
  it('preserves the current mission if clearing the journal fails',()=>{
    const cfg=testConfig();
    try {
      const room=new Room('simulation',new Journal(cfg.directory),'salt');
      room.ingest('!rally join','a','e','m',room.state.roundId,'simulation');
      const roundId=room.state.roundId;
      renameSync(join(cfg.directory,'room.jsonl'),join(cfg.directory,'room.jsonl.bak'));
      mkdirSync(join(cfg.directory,'room.jsonl'));
      expect(()=>room.clearHistory()).toThrow();
      expect(room.state.roundId).toBe(roundId);
      expect(room.snapshot().state.participantCount).toBe(1);
    } finally {cleanup(cfg);}
  });
  it('recovers sequence and freezes a previously running timer',()=>{const cfg=testConfig();try{const r=new Room('simulation',new Journal(cfg.directory),'salt');r.ingest('!rally join','a','e','m',r.state.roundId,'simulation');r.control('start');const seq=r.state.seq;const restored=new Room('simulation',new Journal(cfg.directory),'salt');expect(restored.state.phase).toBe('running');expect(restored.state.paused).toBe(true);expect(restored.state.seq).toBeGreaterThan(seq);expect(restored.events.length).toBeGreaterThan(0);expect(restored.control('resume').accepted).toBe(true);}finally{cleanup(cfg);}});
  it('repairs a truncated final transaction and bounds disk retention',()=>{const cfg=testConfig();try{const j=new Journal(cfg.directory,7,1500);const record={state:initialState('r'),events:[],savedAt:new Date().toISOString()};j.save(record);appendFileSync(join(cfg.directory,'room.jsonl'),'{"partial":');expect(j.load()?.state.roundId).toBe('r');for(let i=0;i<20;i++)j.save(record);expect(statSync(join(cfg.directory,'room.jsonl')).size).toBeLessThan(1500);expect(readFileSync(join(cfg.directory,'room.jsonl'),'utf8').endsWith('\n')).toBe(true);}finally{cleanup(cfg);}});
  it('does not recover history past the configured age',()=>{const cfg=testConfig();try{const j=new Journal(cfg.directory);j.save({state:initialState('r'),events:[],savedAt:new Date(Date.now()-8*86400000).toISOString()});expect(j.load()).toBeNull();}finally{cleanup(cfg);}});
  it('bounds per-account spam separately from accepted contribution cooldown',()=>{const cfg=testConfig();try{const r=new Room('simulation',new Journal(cfg.directory),'salt');for(let i=0;i<12;i++)r.ingest('!rally help','a',`e${i}`,`m${i}`,r.state.roundId,'simulation');expect(r.ingest('!rally join','a','last','last',r.state.roundId,'simulation').reason).toBe('rate-limited');expect(r.state.participants).toEqual({});}finally{cleanup(cfg);}});
});
