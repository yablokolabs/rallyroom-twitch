import WebSocket from 'ws';
import { z } from 'zod';
import { Room } from '../rooms/room.js';
import { TwitchAuth, TwitchError } from './oauth.js';
const Envelope = z.object({ metadata: z.object({ message_id: z.string().min(1).max(128), message_type: z.string(), message_timestamp: z.string().max(50), subscription_type: z.string().optional(), subscription_version: z.string().optional() }), payload: z.record(z.string(), z.unknown()) });
const Session = z.object({ session: z.object({ id: z.string().min(1).max(512), keepalive_timeout_seconds: z.number().min(10).max(600).nullable(), reconnect_url: z.string().nullable().optional() }) });
const Chat = z.object({ subscription: z.object({ id: z.string(), type: z.literal('channel.chat.message'), version: z.literal('1'), condition: z.object({ broadcaster_user_id: z.string(), user_id: z.string() }) }), event: z.object({ broadcaster_user_id: z.string(), chatter_user_id: z.string().regex(/^\d+$/), message_id: z.string().min(1).max(128), message: z.object({ text: z.string().max(2000) }) }) });
export function reconnectUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 4096) return null;
  try { const u = new URL(value); return u.protocol === 'wss:' && u.hostname === 'eventsub.wss.twitch.tv' && !u.username && !u.password && !u.port && u.pathname === '/ws' ? value : null; } catch { return null; }
}
/** Only this module converts authenticated provider messages into game input. */
export function ingestNotification(raw: unknown, room: Room, broadcasterId: string, subscriptionId: string, now = Date.now()) {
  const envelope = Envelope.safeParse(raw);
  if (!envelope.success || envelope.data.metadata.message_type !== 'notification' || envelope.data.metadata.subscription_type !== 'channel.chat.message' || envelope.data.metadata.subscription_version !== '1') return { accepted: false, reason: 'invalid-envelope' };
  const { metadata, payload } = envelope.data;
  const chat = Chat.safeParse(payload);
  if (!chat.success) return { accepted: false, reason: 'invalid-chat' };
  const { event, subscription } = chat.data;
  if (subscription.id !== subscriptionId || subscription.condition.broadcaster_user_id !== broadcasterId || subscription.condition.user_id !== broadcasterId || event.broadcaster_user_id !== broadcasterId) return { accepted: false, reason: 'wrong-channel' };
  const sent = Date.parse(metadata.message_timestamp);
  if (!Number.isFinite(sent) || sent < room.roundOpenedAt || now - sent > 30000 || sent > now + 5000) return { accepted: false, reason: 'stale-event' };
  // Messages queued before mission start cannot become resource actions in that mission.
  if (room.startedAt && sent < room.startedAt && !['!rally join', '!rally help'].includes(event.message.text)) return { accepted: false, reason: 'prior-phase' };
  return room.ingest(event.message.text, event.chatter_user_id, metadata.message_id, event.message_id, room.state.roundId, 'live');
}
type Socket = Pick<WebSocket, 'on' | 'close' | 'terminate' | 'readyState'>;
type Connection = { socket: Socket; welcomed: boolean; timeout: ReturnType<typeof setTimeout> | null; keepalive: number; migrating: boolean };
export class EventSub {
  private active: Connection | null = null;
  private pending: Connection | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private validation: ReturnType<typeof setInterval> | null = null;
  private subscriptionId = '';
  private stopped = true;
  private failures = 0;
  constructor(private auth: TwitchAuth, private room: Room, private onRevoke: () => void, private socketFactory: (url: string) => Socket = url => new WebSocket(url, { maxPayload: 65536, handshakeTimeout: 10000, followRedirects: false })) {}
  async start() {
    this.stop(); this.stopped = false; this.room.transport('connecting');
    try { await this.auth.validate(); if (!this.stopped) this.open('wss://eventsub.wss.twitch.tv/ws', false); }
    catch (e) { this.failed(e); return; }
    this.validation = setInterval(() => { void this.auth.validate().catch(e => this.failed(e)); }, 60 * 60 * 1000);
  }
  stop() {
    this.stopped = true;
    if (this.retry) clearTimeout(this.retry); this.retry = null;
    if (this.validation) clearInterval(this.validation); this.validation = null;
    for (const c of [this.active, this.pending]) if (c) { if (c.timeout) clearTimeout(c.timeout); c.socket.terminate(); }
    this.active = null; this.pending = null;
  }
  private arm(c: Connection, ms: number) {
    if (c.timeout) clearTimeout(c.timeout);
    c.timeout = setTimeout(() => { if (!this.stopped) this.failed(new TwitchError('unavailable')); }, ms);
  }
  private open(url: string, migrating: boolean) {
    if (this.stopped) return;
    const c: Connection = { socket: this.socketFactory(url), welcomed: false, timeout: null, keepalive: 10000, migrating };
    if (migrating) this.pending = c; else this.active = c;
    this.arm(c, 10000);
    c.socket.on('message', (data: WebSocket.RawData) => { void this.message(c, data).catch(e => this.failed(e)); });
    c.socket.on('error', () => { /* close or watchdog handles connection failure; never log provider payloads */ });
    c.socket.on('close', () => {
      if (c.timeout) clearTimeout(c.timeout);
      if (this.stopped || (this.active !== c && this.pending !== c)) return;
      this.failed(new TwitchError('unavailable'));
    });
  }
  private async message(c: Connection, data: WebSocket.RawData) {
    if (this.stopped || (c !== this.active && c !== this.pending)) return;
    let raw: unknown;
    try { if (data.toString().length > 65536) return; raw = JSON.parse(data.toString()); } catch { return; }
    const parsed = Envelope.safeParse(raw); if (!parsed.success) return;
    const { metadata, payload } = parsed.data;
    if (metadata.message_type === 'session_welcome') {
      if (c.welcomed) return;
      const session = Session.safeParse(payload); if (!session.success) return;
      c.welcomed = true; c.keepalive = (session.data.session.keepalive_timeout_seconds ?? 10) * 1000;
      if (!c.migrating) {
        const id = await this.auth.subscribe(session.data.session.id);
        if (this.stopped || this.active !== c) return;
        this.subscriptionId = id;
      } else {
        const old = this.active; this.active = c; this.pending = null;
        if (old && old !== c) { if (old.timeout) clearTimeout(old.timeout); old.socket.close(); }
      }
      this.failures = 0; this.arm(c, c.keepalive + 1000); this.room.transport('connected'); return;
    }
    if (!c.welcomed) return;
    if (metadata.message_type === 'session_keepalive' || metadata.message_type === 'notification') this.arm(c, c.keepalive + 1000);
    if (metadata.message_type === 'notification') ingestNotification(raw, this.room, this.auth.config.broadcasterId, this.subscriptionId);
    if (metadata.message_type === 'session_reconnect' && c === this.active && !this.pending) {
      const candidate = (payload.session as { reconnect_url?: unknown } | undefined)?.reconnect_url;
      const url = reconnectUrl(candidate);
      if (!url) { this.failed(new TwitchError('unavailable')); return; }
      this.room.transport('reconnecting'); this.open(url, true);
    }
    if (metadata.message_type === 'revocation') {
      const subscription = payload.subscription as { id?: string } | undefined;
      if (subscription?.id === this.subscriptionId) this.failed(new TwitchError('revoked'));
    }
  }
  private failed(error: unknown) {
    if (this.stopped) return;
    const fatal = error instanceof TwitchError && ['revoked', 'wrong-identity', 'unconfigured'].includes(error.code);
    const delay = error instanceof TwitchError && error.retryAfterMs ? error.retryAfterMs : Math.min(30000, 1000 * 2 ** Math.min(this.failures++, 5));
    this.stop();
    if (fatal) { this.auth.forget(); this.room.transport('revoked', true); this.onRevoke(); return; }
    this.room.transport('reconnecting', true); this.stopped = false;
    this.retry = setTimeout(() => { void this.start(); }, delay);
  }
}
