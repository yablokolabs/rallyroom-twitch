import { ROLES, ROLE_ACTION, type Role } from './commands.js';
import { COOLDOWN_MS, ROLE_COOLDOWN_MS, DURATION_MS, TARGETS, MAX_PARTICIPANTS, MAX_SEEN, DEDUP_MS } from './balance.js';
import type { State, Input, Result, Mode, PublicState } from './schema.js';

export function initialState(roundId: string, mode: Mode = 'simulation', atMs = 0, seq = 0): State {
  return { version: 1, roundId, mode, seq, phase: 'lobby', paused: false, pauseReason: null,
    outcome: null, atMs, elapsedMs: 0, durationMs: DURATION_MS, startedParticipants: 0,
    targets: { ...TARGETS }, progress: { scout: 0, build: 0, charge: 0 }, participants: {}, seen: [] };
}
export function objective(s: State): 'scout' | 'build' | 'charge' | 'done' {
  return s.progress.scout < s.targets.scout ? 'scout' : s.progress.build < s.targets.build ? 'build' : s.progress.charge < s.targets.charge ? 'charge' : 'done';
}
export function advance(s: State, atMs: number): State {
  const now = Math.max(s.atMs, atMs);
  const elapsedMs = Math.min(s.durationMs, s.elapsedMs + (s.phase === 'running' && !s.paused ? now - s.atMs : 0));
  return { ...s, atMs: now, elapsedMs, ...(s.phase === 'running' && elapsedMs >= s.durationMs ? { phase: 'timeout', outcome: 'timeout', paused: false, pauseReason: null } as const : {}) };
}
export function reduce(previous: State, input: Input): Result {
  if (!Number.isFinite(input.atMs) || input.atMs < previous.atMs) return { state: previous, accepted: false, reason: 'stale-clock' };
  let s = advance(previous, input.atMs);
  const reject = (reason: string): Result => ({ state: s, accepted: false, reason });
  const accept = (reason: string): Result => ({ state: { ...s, seq: previous.seq + 1 }, accepted: true, reason });
  if (input.kind === 'tick') return accept('clock');
  if (input.kind === 'control') {
    switch (input.action) {
      case 'start':
        if (s.phase !== 'lobby') return reject('round-already-started');
        if (!Object.keys(s.participants).length) return reject('join-first');
        s = { ...s, phase: 'running', startedParticipants: Object.keys(s.participants).length };
        return accept('mission-started');
      case 'pause':
        if (s.phase !== 'running' || s.paused) return reject('not-running');
        s = { ...s, paused: true, pauseReason: input.reason ?? 'Paused by controller' };
        return accept('paused');
      case 'resume':
        if (s.phase !== 'running' || !s.paused) return reject('not-paused');
        s = { ...s, paused: false, pauseReason: null };
        return accept('resumed');
      case 'recap':
        if (s.phase !== 'success' && s.phase !== 'timeout') return reject('mission-incomplete');
        s = { ...s, phase: 'recap' }; return accept('recap');
      case 'reset':
        if (!input.nextRoundId || input.nextRoundId === s.roundId) return reject('new-round-id-required');
        s = { ...initialState(input.nextRoundId, s.mode, s.atMs, s.seq), seen: s.seen };
        return accept('new-lobby');
    }
  }
  if (input.roundId !== s.roundId) return reject('prior-round');
  // Pseudonyms and provider IDs never become prototype keys supplied by chat text.
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(input.actorId) || ['__proto__', 'constructor', 'prototype'].includes(input.actorId)) return reject('invalid-actor');
  const ids = ['e:' + input.eventId, 'm:' + input.messageId];
  const seen = s.seen.filter(e => s.atMs - e.atMs <= DEDUP_MS);
  if (seen.some(e => ids.includes(e.id))) return reject('duplicate');
  s = { ...s, seen: [...seen, ...ids.map(id => ({ id, atMs: s.atMs }))].slice(-MAX_SEEN) };
  if (input.command === 'help') return reject(`help:${objective(s)}`);
  if (s.paused) return reject('paused');
  if (s.phase !== 'lobby' && s.phase !== 'running') return reject('round-finished');
  const participant = s.participants[input.actorId];
  if (input.command === 'join') {
    if (participant) return reject('already-joined');
    if (Object.keys(s.participants).length >= MAX_PARTICIPANTS) return reject('room-full');
    const counts = roles(s);
    const role = ROLES.reduce((best, next) => counts[next] < counts[best] ? next : best, 'scout');
    s = { ...s, participants: { ...s.participants, [input.actorId]: { role, lastActionMs: -COOLDOWN_MS, lastRoleMs: -ROLE_COOLDOWN_MS, contributions: 0 } } };
    return accept(`joined:${role}`);
  }
  if (!participant) return reject('join-first');
  if (input.command.startsWith('role ')) {
    const role = input.command.slice(5) as Role;
    if (!ROLES.includes(role)) return reject('unknown-role');
    if (participant.role === role) return reject('same-role');
    if (s.atMs - participant.lastRoleMs < ROLE_COOLDOWN_MS) return reject('role-cooldown');
    s = { ...s, participants: { ...s.participants, [input.actorId]: { ...participant, role, lastRoleMs: s.atMs } } };
    return accept(`role:${role}`);
  }
  if (s.phase !== 'running') return reject('wait-for-start');
  if (ROLE_ACTION[participant.role] !== input.command) return reject('wrong-role');
  if (objective(s) !== input.command) return reject(`objective:${objective(s)}`);
  if (s.atMs - participant.lastActionMs < COOLDOWN_MS) return reject('cooldown');
  const key = input.command as keyof State['progress'];
  s = { ...s, progress: { ...s.progress, [key]: s.progress[key] + 1 }, participants: { ...s.participants, [input.actorId]: { ...participant, lastActionMs: s.atMs, contributions: participant.contributions + 1 } } };
  if (objective(s) === 'done') s = { ...s, phase: 'success', outcome: 'success' };
  return accept(`contribution:${key}`);
}
export function roles(s: State): Record<Role, number> {
  const counts = { scout: 0, builder: 0, engineer: 0 };
  Object.values(s.participants).forEach(p => counts[p.role]++);
  return counts;
}
export function publicState(s: State): PublicState {
  const { participants, seen: _seen, atMs: _atMs, ...safe } = s;
  const goal = objective(s);
  return { ...safe, participantCount: Object.keys(participants).length, roles: roles(s),
    contributions: Object.values(participants).reduce((n, p) => n + p.contributions, 0),
    objective: { scout: 'Reveal the route', build: 'Build the bridge', charge: 'Power the rescue beacon', done: 'Crew rescued!' }[goal],
    usefulCommand: goal === 'done' ? '!rally join' : `!rally ${goal}` };
}
export function catchUp(s: State, actorId?: string): string {
  const p = actorId ? s.participants[actorId] : undefined;
  const goal = objective(s);
  if (!p) return `Type !rally join. ${publicState(s).objective}. ${Math.ceil((s.durationMs - s.elapsedMs) / 1000)} seconds left.`;
  if (s.paused) return 'Mission paused. Your next action will count after the controller resumes.';
  if (goal === 'done') return 'Crew rescued. Wait for the next mission.';
  if (s.phase === 'lobby') return `You are a ${p.role}. Wait for the controller to start.`;
  const usefulRole = ({ scout: 'scout', build: 'builder', charge: 'engineer' } as const)[goal];
  return p.role === usefulRole ? `You are a ${p.role}. Type !rally ${goal}. One action every 5 seconds.` : `Next: ${publicState(s).objective}. Type !rally role ${usefulRole} to help now.`;
}
