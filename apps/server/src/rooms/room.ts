import { createHmac, randomUUID } from 'node:crypto';
import { GameClock } from '../../../../packages/game/src/clock.js';
import { parseCommand } from '../../../../packages/game/src/commands.js';
import { catchUp, initialState, publicState, reduce } from '../../../../packages/game/src/reducer.js';
import type { Input, Mode, State } from '../../../../packages/game/src/schema.js';
import { Journal, type AcceptedEvent } from '../storage/store.js';
import { missionFixture } from '../../../../fixtures/scenarios/mission.js';
export type TransportStatus = 'simulation' | 'offline' | 'connecting' | 'connected' | 'reconnecting' | 'revoked' | 'replay';
export class Room {
  state: State;
  events: AcceptedEvent[] = [];
  status: TransportStatus;
  gap = false;
  roundOpenedAt = Date.now();
  startedAt: number | null = null;
  private clock: GameClock;
  private listeners = new Set<() => void>();
  private rates = new Map<string, { at: number; count: number }>();
  private replayIndex = 0;
  private replayInputs = missionFixture();
  private storageFailed = false;
  constructor(readonly mode: Mode, private journal: Journal, private salt: string, private retentionDays = 7) {
    const saved = journal.load();
    this.state = saved?.state.mode === mode ? saved.state : initialState(randomUUID(), mode);
    if (mode === 'replay') this.state = initialState('fixture-northstar', 'replay');
    this.events = saved?.state.mode === mode ? saved.events : [];
    if (mode === 'replay') this.events = [];
    this.clock = new GameClock(this.state.atMs);
    this.status = mode === 'simulation' ? 'simulation' : mode === 'replay' ? 'replay' : 'offline';
    if (this.state.phase === 'running') {
      this.state = { ...this.state, paused: true, pauseReason: 'Recovered after restart. Controller must resume.', seq: this.state.seq + 1 };
      this.gap = mode === 'live';
    }
    this.persist();
  }
  pseudonym(providerId: string): string { return createHmac('sha256', this.salt).update(providerId).digest('hex').slice(0, 24); }
  snapshot() { return { state: publicState(this.state), transport: this.status, gap: this.gap }; }
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private publish() { this.listeners.forEach(fn => fn()); }
  private persist() {
    this.events = this.events.filter(event => Date.now() - Date.parse(event.timestamp) <= this.retentionDays * 86400000);
    this.journal.save({ state: this.state, events: this.events, savedAt: new Date().toISOString() });
  }
  private apply(input: Input) {
    if (this.storageFailed) return { state: this.state, accepted: false, reason: 'storage-unavailable' };
    const result = reduce(this.state, input);
    const oldState = this.state, oldEvents = this.events;
    this.state = result.state;
    if (result.accepted) {
      const record: AcceptedEvent = {
        eventId: input.kind === 'chat' ? input.eventId : randomUUID(), roundId: this.state.roundId,
        actorId: input.kind === 'chat' ? input.actorId : null,
        command: input.kind === 'chat' ? input.command : input.kind === 'control' ? input.action : 'tick',
        seq: this.state.seq, timestamp: new Date().toISOString(), input,
      };
      this.events = [...this.events, record].slice(-2000);
    }
    try { if (result.state !== oldState) this.persist(); }
    catch (error) {
      this.storageFailed = true; this.events = oldEvents;
      this.state = { ...oldState, paused: true, pauseReason: 'Storage unavailable. Restart after checking local storage.', seq: oldState.seq + 1 };
      this.publish(); throw error;
    }
    if (result.accepted || oldState.phase !== this.state.phase) this.publish();
    return result;
  }
  tick() {
    if (this.mode === 'replay') { const input = this.replayInputs[this.replayIndex++]; if (input) this.apply(input); return; }
    if (this.state.phase === 'running' && !this.state.paused) this.apply({ kind: 'tick', atMs: this.clock.now() });
  }
  control(action: 'start' | 'pause' | 'resume' | 'reset' | 'recap') {
    if (this.mode === 'replay') return { accepted: false, reason: 'replay-read-only' };
    if (this.mode === 'live' && ['start', 'resume'].includes(action) && this.status !== 'connected') return { accepted: false, reason: 'connect-twitch-first' };
    const result = this.apply({ kind: 'control', action, atMs: this.clock.now(), nextRoundId: action === 'reset' ? randomUUID() : undefined });
    if (result.accepted && action === 'start') this.startedAt = Date.now();
    if (result.accepted && action === 'reset') { this.roundOpenedAt = Date.now(); this.startedAt = null; this.rates.clear(); }
    return { accepted: result.accepted, reason: result.reason };
  }
  ingest(text: unknown, providerActor: string, eventId: string, messageId: string, roundId: string, source: 'simulation' | 'live') {
    if (this.mode !== source || (source === 'live' && this.status !== 'connected' && this.status !== 'reconnecting')) return { accepted: false, reason: 'wrong-mode' };
    const command = parseCommand(text);
    if (!command) return { accepted: false, reason: 'unknown-command' };
    const actorId = this.pseudonym(providerActor);
    const now = this.clock.now();
    // Bounded per-identity ingress window in addition to the reducer's accepted-action cooldown.
    let rate = this.rates.get(actorId);
    if (!rate || now - rate.at >= 10000) rate = { at: now, count: 0 };
    rate.count++;
    this.rates.set(actorId, rate);
    if (this.rates.size > 2000) this.rates.delete(this.rates.keys().next().value!);
    if (rate.count > 12) return { accepted: false, reason: 'rate-limited' };
    const result = this.apply({ kind: 'chat', command, actorId, eventId: this.pseudonym(eventId), messageId: this.pseudonym(messageId), roundId, atMs: now });
    return { accepted: result.accepted, reason: result.reason, help: catchUp(this.state, actorId) };
  }
  transport(status: TransportStatus, gap = false) {
    this.status = status;
    this.gap = this.gap || gap;
    if ((gap || status === 'revoked' || status === 'offline') && this.state.phase === 'running' && !this.state.paused) {
      this.apply({ kind: 'control', action: 'pause', atMs: this.clock.now(), reason: status === 'revoked' ? 'Twitch authorization revoked. Reauthorize to continue.' : 'Chat connection interrupted. Missed messages cannot be recovered.' });
    }
    this.publish();
  }
  clearHistory() {
    const state = initialState(this.mode === 'replay' ? 'fixture-northstar' : randomUUID(), this.mode, this.mode === 'replay' ? 0 : this.clock.now(), this.state.seq + 1);
    this.journal.clear({ state, events: [], savedAt: new Date().toISOString() });
    this.state = state;
    this.events = []; this.rates.clear(); this.gap = false; this.roundOpenedAt = Date.now(); this.startedAt = null;
    this.replayIndex = 0; this.storageFailed = false;
    this.publish();
  }
}
