import { cpus, platform, arch, totalmem } from 'node:os';
import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { initialState, reduce, publicState } from '../packages/game/src/reducer.js';
import { missionFixture } from '../fixtures/scenarios/mission.js';
import type { Input } from '../packages/game/src/schema.js';
const rows=[];
for (const actors of [10,100,500]) {
  const inputs=missionFixture(actors); const repeated=inputs.flatMap<Input>(x=>x.kind==='chat'?[x,x]:[x]);
  const timings:number[]=[];let hash='';let duplicates=0,accepted=0,doubleCounted=0;let deterministic=true;
  const started=performance.now();
  for(let sample=0;sample<20;sample++){
    let state=initialState('fixture-northstar');let sampleDuplicates=0,sampleAccepted=0;
    for(const input of repeated){const begin=performance.now();const result=reduce(state,input);timings.push(performance.now()-begin);state=result.state;sampleDuplicates+=Number(result.reason==='duplicate');sampleAccepted+=Number(result.accepted);}
    const next=createHash('sha256').update(JSON.stringify(publicState(state))).digest('hex');if(hash&&hash!==next)deterministic=false;hash=next;
    duplicates=sampleDuplicates;accepted=sampleAccepted;
    doubleCounted = Math.max(doubleCounted, sampleAccepted - inputs.length);
    if (sampleDuplicates !== inputs.filter(input => input.kind === 'chat').length) throw new Error('Duplicate rejection count mismatch');
    if(state.phase!=='success'||state.progress.scout!==3||state.progress.build!==4||state.progress.charge!==4)throw new Error('Invalid final state');
  }
  const elapsed=performance.now()-started;timings.sort((a,b)=>a-b);
  rows.push({actors,samples:20,processed:repeated.length*20,acceptedPerSample:accepted,duplicateRejectionsPerSample:duplicates,doubleCounted,deterministic,elapsedMs:+elapsed.toFixed(3),processedPerSecond:Math.round(repeated.length*20/(elapsed/1000)),p50Ms:+timings[Math.floor(timings.length*.5)].toFixed(4),p95Ms:+timings[Math.floor(timings.length*.95)].toFixed(4),finalStateSha256:hash});
}
const report={label:'SYNTHETIC ENGINE MICROBENCHMARK. No network, persistence, browser, Twitch or unique-person fairness measurements.',timestamp:new Date().toISOString(),runtime:process.version,hardware:{cpu:cpus()[0]?.model,logicalCpus:cpus().length,totalMemoryGiB:+(totalmem()/1024**3).toFixed(2),platform:platform(),arch:arch()},rows};
mkdirSync('docs/evidence',{recursive:true});writeFileSync('docs/evidence/synthetic-evaluation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
