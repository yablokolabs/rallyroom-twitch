import type { Snapshot } from '../useRoom';
import { RescueMap } from './Map';
export const ROLE_DETAILS = [
  { role: 'scout' as const, name: 'Scouts', icon: '⌁', command: 'scout', task: 'Reveal the route', color: 'orange' },
  { role: 'builder' as const, name: 'Builders', icon: '⌂', command: 'build', task: 'Build the bridge', color: 'aqua' },
  { role: 'engineer' as const, name: 'Engineers', icon: 'ϟ', command: 'charge', task: 'Power the beacon', color: 'gold' },
];
export function ModeLabel({ snapshot }: { snapshot: Snapshot }) {
  return <span className={`mode-label ${snapshot.state.mode}`} data-testid="mode-label"><i/>{snapshot.state.mode === 'simulation' ? 'SIMULATION · LOCAL FIXTURES' : snapshot.state.mode === 'replay' ? 'REPLAY · GENERATED FIXTURE' : `TWITCH · ${snapshot.transport.toUpperCase()}`}</span>;
}
export function RoleCards({ snapshot }: { snapshot: Snapshot }) {
  const s = snapshot.state;
  return <div className="role-cards">{ROLE_DETAILS.map(r => {
    const k = r.command as keyof typeof s.progress, done = s.progress[k] >= s.targets[k];
    const active = s.usefulCommand === `!rally ${r.command}` && s.phase !== 'lobby';
    return <article className={`role-card ${r.color} ${active ? 'active' : ''}`} key={r.role}>
      <div className="role-head"><span className="role-icon" aria-hidden="true">{r.icon}</span><strong>{r.name}</strong><span className="role-count">{s.roles[r.role]} joined</span></div>
      <div className="role-task"><span>{r.task}</span><b>{done ? '✓' : `${s.progress[k]}/${s.targets[k]}`}</b></div>
      <div className="progress-track" role="progressbar" aria-label={r.task} aria-valuenow={s.progress[k]} aria-valuemin={0} aria-valuemax={s.targets[k]}><i style={{ width: `${s.progress[k] / s.targets[k] * 100}%` }}/></div>
      <code>!rally {r.command}</code><span className="role-state">{done ? 'Complete' : active ? 'Your turn' : 'Stand by'}</span>
    </article>;
  })}</div>;
}
export function Mission({ snapshot, online, overlay = false }: { snapshot: Snapshot; online: boolean; overlay?: boolean }) {
  const s = snapshot.state;
  const seconds = Math.max(0, Math.ceil((s.durationMs - s.elapsedMs) / 1000));
  const time = `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  const terminal = ['success','timeout','recap'].includes(s.phase);
  const usefulRole = s.progress.scout < s.targets.scout ? 'scout' : s.progress.build < s.targets.build ? 'builder' : 'engineer';
  return <section className={`mission ${overlay?'overlay-mission':''}`} aria-label="Rescue mission">
    <div className="mission-top"><div><p className="eyebrow">MISSION 01 <span> / </span> NORTHSTAR</p><h2>{s.outcome === 'success' ? 'You brought them home.' : s.outcome === 'timeout' ? 'The rescue window closed.' : 'Bring the crew home.'}</h2></div><div className={`timer ${seconds<30?'urgent':''}`}><span>{s.paused?'PAUSED':s.phase==='lobby'?'MISSION WINDOW':terminal?'TIME REMAINING':'TIME LEFT'}</span><strong data-testid="countdown">{time}</strong></div></div>
    {!online && <div className="connection-alert" role="alert">Overlay disconnected. Reconnecting to the local server… The displayed state may be stale.</div>}
    {s.paused && <div className="connection-alert" role="status">Ⅱ {s.pauseReason}</div>}
    {snapshot.gap && <div className="gap-note">A chat gap occurred. Missed commands were not recovered.</div>}
    <div className="map-stage"><RescueMap state={s}/><div className="map-status"><span className="mission-indicator"/>{s.phase === 'lobby' ? 'Crew assembling' : s.paused ? 'Mission on hold' : s.phase === 'running' ? s.objective : s.outcome === 'success' ? 'Rescue complete' : 'Mission complete'}</div><div className="map-crew"><strong>{s.participantCount}</strong> crew joined <span>·</span> <strong>{s.contributions}</strong> contributions</div></div>
    <RoleCards snapshot={snapshot}/>
    <div className="catch-up" aria-label="Late joiner help"><div className="catch-up-icon" aria-hidden="true">↳</div><div><strong>Just arrived? There’s room for you.</strong><p>Type <code>!rally join</code>. {s.phase==='lobby'?'Pick a role with !rally role scout, builder or engineer.':terminal?'The controller will open the next lobby.':<>To help now, choose <code>!rally role {usefulRole}</code>.</>}</p></div><code className="useful-command">{s.usefulCommand}</code></div>
  </section>;
}
