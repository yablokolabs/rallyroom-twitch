import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
export type Session = { id: string; csrf: string; role: 'owner' | 'moderator'; expires: number };
export function equal(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y);
}
export class Sessions {
  private sessions = new Map<string, Session>();
  create(role: Session['role']): Session {
    for (const [id, s] of this.sessions) if (s.expires < Date.now()) this.sessions.delete(id);
    if (this.sessions.size >= 32) this.sessions.delete(this.sessions.keys().next().value!);
    const s = { id: randomBytes(32).toString('hex'), csrf: randomBytes(32).toString('hex'), role, expires: Date.now() + 8 * 3600000 };
    this.sessions.set(s.id, s); return s;
  }
  get(req: IncomingMessage): Session | null {
    const id = /(?:^|;\s*)rally_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie ?? '')?.[1];
    const s = id ? this.sessions.get(id) : null;
    return s && s.expires > Date.now() ? s : null;
  }
  end(id: string) { this.sessions.delete(id); }
  revokeAll() { this.sessions.clear(); }
  cookie(s: Session): string { return `rally_session=${s.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`; }
}
