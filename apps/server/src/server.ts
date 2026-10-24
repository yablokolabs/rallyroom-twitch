import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';
import { Room } from './rooms/room.js';
import { Journal } from './storage/store.js';
import { Sessions, equal } from './auth/sessions.js';
import { TwitchAuth, TwitchError } from './twitch/oauth.js';
import { EventSub } from './twitch/eventsub.js';
import type { Config } from './config.js';
type Vite = { middlewares: (req: IncomingMessage, res: ServerResponse, next: () => void) => void; close: () => Promise<void> };
class HttpError extends Error { constructor(readonly status: number, message: string) { super(message); } }
async function body(req: IncomingMessage): Promise<unknown> {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, 'JSON body required');
  let bytes = 0; const chunks: Buffer[] = [];
  for await (const chunk of req) { bytes += chunk.length; if (bytes > 4096) throw new HttpError(413, 'Request too large'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new HttpError(400, 'Invalid JSON'); }
}
function json(res: ServerResponse, status: number, payload: unknown) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(payload)); }
const Control = z.object({ action: z.enum(['start', 'pause', 'resume', 'reset', 'recap']) }).strict();
const Simulate = z.object({ actor: z.enum(['scout-1', 'builder-1', 'engineer-1', 'late-joiner']), text: z.string().max(40), roundId: z.string().max(80) }).strict();
export async function createApp(cfg: Config, options: { vite?: boolean; twitchAuth?: TwitchAuth } = {}) {
  const journal = new Journal(cfg.directory, cfg.retentionDays);
  const room = new Room(cfg.mode, journal, cfg.salt);
  const sessions = new Sessions();
  const auth = options.twitchAuth ?? new TwitchAuth(cfg.twitch, join(cfg.directory, 'twitch-tokens.json'));
  const oauth = new Map<string, { binding: string; expires: number; purpose: 'chat' | 'control' }>();
  const controlTokens = new Map<string, string>();
  const eventsub = new EventSub(auth, room, () => { sessions.revokeAll(); controlTokens.clear(); });
  let vite: Vite | undefined;
  const limiter = new Map<string, { count: number; at: number }>();
  function rate(key: string, max: number, window: number) {
    let value = limiter.get(key); if (!value || Date.now() - value.at >= window) value = { count: 0, at: Date.now() };
    value.count++; limiter.set(key, value); if (value.count > max) throw new HttpError(429, 'Too many requests; wait before trying again');
    if (limiter.size > 100) limiter.delete(limiter.keys().next().value!);
  }
  const hosts = new Set([`127.0.0.1:${cfg.port}`, `localhost:${cfg.port}`]);
  const origins = new Set([...hosts].map(h => `http://${h}`));
  function checkHost(req: IncomingMessage) { if (!hosts.has(req.headers.host ?? '')) throw new HttpError(403, 'Invalid host'); }
  function checkOrigin(req: IncomingMessage) { if (!origins.has(req.headers.origin ?? '')) throw new HttpError(403, 'Same-origin request required'); }
  async function authorize(req: IncomingMessage, owner = false) {
    checkOrigin(req);
    const s = sessions.get(req); if (!s) throw new HttpError(401, 'Unlock the dashboard first');
    if (!equal(String(req.headers['x-csrf-token'] ?? ''), s.csrf)) throw new HttpError(403, 'Invalid CSRF token');
    if (owner && s.role !== 'owner') throw new HttpError(403, 'Owner control required');
    const token = controlTokens.get(s.id);
    if (token) {
      try { const identity = await auth.identity(token); if (identity.user_id !== cfg.twitch.broadcasterId && !cfg.twitch.controlIds.includes(identity.user_id)) throw new Error('removed'); }
      catch { sessions.end(s.id); controlTokens.delete(s.id); throw new HttpError(401, 'Twitch control authorization expired; sign in again'); }
    }
    return s;
  }
  function oauthStart(res: ServerResponse, purpose: 'chat' | 'control') {
    for (const [id, item] of oauth) if (item.expires < Date.now()) oauth.delete(id);
    if (oauth.size >= 16) throw new HttpError(429, 'Too many authorization attempts');
    const state = randomBytes(32).toString('hex'), binding = randomBytes(32).toString('hex');
    const url = auth.authorizeUrl(state, purpose);
    oauth.set(state, { binding, purpose, expires: Date.now() + 600000 });
    res.setHeader('Set-Cookie', `rally_oauth=${binding}; HttpOnly; SameSite=Lax; Path=/auth/twitch; Max-Age=600`);
    return url;
  }
  const server = createServer((req, res) => { void handle(req, res).catch(error => {
    if (res.headersSent) { res.end(); return; }
    if (error instanceof HttpError) json(res, error.status, { error: error.message });
    else if (error instanceof TwitchError) json(res, 503, { error: `Twitch: ${error.code}. Check setup and retry.` });
    else if (error instanceof z.ZodError) json(res, 400, { error: 'Invalid request fields' });
    else { console.error('RallyRoom request failed; provider payload and credentials omitted.'); json(res, 500, { error: 'Local operation failed; check storage and configuration' }); }
  }); });
  async function handle(req: IncomingMessage, res: ServerResponse) {
    checkHost(req);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self'${cfg.production ? '' : " 'unsafe-inline'"}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://localhost:${cfg.port} ws://127.0.0.1:${cfg.port}; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`);
    const url = new URL(req.url ?? '/', `http://localhost:${cfg.port}`);
    const path = url.pathname;
    if (req.method === 'GET' && path === '/api/health') return json(res, 200, { ok: true, mode: cfg.mode });
    if (req.method === 'GET' && path === '/api/state') return json(res, 200, room.snapshot());
    if (req.method === 'GET' && path === '/api/session') {
      const s = sessions.get(req);
      return json(res, 200, { authenticated: Boolean(s), role: s?.role, csrf: s?.csrf, configured: auth.configured(), hasToken: auth.hasToken(), mode: cfg.mode });
    }
    if (req.method === 'POST' && path === '/api/login') {
      checkOrigin(req); rate('login', 5, 60000);
      const data = z.object({ key: z.string().max(256) }).strict().parse(await body(req));
      if (!equal(data.key, cfg.controlKey)) throw new HttpError(401, 'Incorrect control key');
      const s = sessions.create('owner'); res.setHeader('Set-Cookie', sessions.cookie(s)); return json(res, 200, { csrf: s.csrf, role: s.role });
    }
    if (req.method === 'POST' && path === '/api/logout') {
      const s = await authorize(req); sessions.end(s.id); controlTokens.delete(s.id);
      res.setHeader('Set-Cookie', 'rally_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && path === '/api/control') {
      const s = await authorize(req); rate('controls', 30, 10000);
      const data = Control.parse(await body(req));
      if (s.role === 'moderator' && !['pause', 'resume'].includes(data.action)) throw new HttpError(403, 'Moderators can pause or resume only');
      const result = room.control(data.action); return json(res, result.accepted ? 200 : 409, result);
    }
    if (req.method === 'POST' && path === '/api/simulate' && cfg.mode === 'simulation') {
      await authorize(req, true); rate('simulation', 100, 10000);
      const data = Simulate.parse(await body(req)), id = randomUUID();
      return json(res, 200, room.ingest(data.text, data.actor, id, id, data.roundId, 'simulation'));
    }
    if (req.method === 'POST' && path === '/api/history/clear') {
      await authorize(req, true); room.clearHistory(); return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && path === '/api/twitch/connect' && cfg.mode === 'live') {
      await authorize(req, true); return json(res, 200, { url: oauthStart(res, 'chat') });
    }
    if (req.method === 'POST' && path === '/api/twitch/reconnect' && cfg.mode === 'live') {
      await authorize(req, true); rate('connect', 3, 60000); await eventsub.start(); return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && path === '/api/twitch/disconnect' && cfg.mode === 'live') {
      await authorize(req, true); eventsub.stop(); auth.forget(); room.transport('offline', true); sessions.revokeAll(); controlTokens.clear(); return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && path === '/auth/twitch/control') {
      checkOrigin(req); rate('oauth', 5, 60000); return json(res, 200, { url: oauthStart(res, 'control') });
    }
    if (req.method === 'GET' && path === '/auth/twitch/callback') {
      const state = url.searchParams.get('state') ?? '', pending = oauth.get(state); oauth.delete(state);
      const binding = /(?:^|;\s*)rally_oauth=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie ?? '')?.[1] ?? '';
      if (!pending || pending.expires < Date.now() || !equal(binding, pending.binding)) throw new HttpError(403, 'OAuth state expired or does not match this browser');
      res.setHeader('Set-Cookie', 'rally_oauth=; HttpOnly; SameSite=Lax; Path=/auth/twitch; Max-Age=0');
      if (url.searchParams.has('error')) throw new HttpError(401, 'Twitch authorization declined');
      const code = url.searchParams.get('code'); if (!code || code.length > 2048) throw new HttpError(400, 'Missing authorization code');
      const identity = await auth.redeem(code, pending.purpose);
      if (pending.purpose === 'chat') await eventsub.start();
      else { const s = sessions.create(identity.role); controlTokens.set(s.id, identity.accessToken); res.setHeader('Set-Cookie', [sessions.cookie(s), 'rally_oauth=; HttpOnly; SameSite=Lax; Path=/auth/twitch; Max-Age=0']); }
      res.writeHead(303, { Location: '/' }); res.end(); return;
    }
    if (path.startsWith('/api/') || path.startsWith('/auth/')) throw new HttpError(404, 'Endpoint unavailable');
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Read-only resource');
    if (vite) { vite.middlewares(req, res, () => { if (!res.writableEnded) json(res, 404, { error: 'Not found' }); }); return; }
    const root = resolve('dist/web');
    const relative = path === '/' || path === '/overlay' ? 'index.html' : decodeURIComponent(path).slice(1);
    const file = resolve(root, relative);
    if (!file.startsWith(root + '/') || !existsSync(file)) throw new HttpError(404, 'Not found');
    const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' }); res.end(req.method === 'HEAD' ? '' : readFileSync(file));
  }
  const ws = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  server.on('upgrade', (req, socket, head) => {
    try { checkHost(req); checkOrigin(req); if (req.url !== '/ws/room/main' || ws.clients.size >= 20) throw new Error('invalid subscription'); }
    catch { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return; }
    ws.handleUpgrade(req, socket, head, client => ws.emit('connection', client));
  });
  ws.on('connection', client => {
    client.send(JSON.stringify(room.snapshot()));
    client.on('message', () => client.close(1008, 'Read-only room subscription'));
    client.on('error', () => { /* peer transport errors contain no game data */ });
  });
  const unsubscribe = room.subscribe(() => {
    const message = JSON.stringify(room.snapshot());
    for (const client of ws.clients) if (client.readyState === WebSocket.OPEN) { if (client.bufferedAmount > 1024 * 1024) client.terminate(); else client.send(message); }
  });
  const timer = setInterval(() => {
    try { room.tick(); } catch { console.error('Local journal write failed. Stopping clock; restart after checking storage.'); clearInterval(timer); eventsub.stop(); room.state = { ...room.state, paused: true, pauseReason: 'Storage unavailable. Restart after checking local storage.' }; }
  }, 1000);
  if (options.vite) {
    const { createServer: createVite } = await import('vite');
    vite = await createVite({ server: { middlewareMode: true, hmr: false, allowedHosts: ['localhost', '127.0.0.1'] }, appType: 'spa' });
  }
  return {
    server, room, sessions, auth, eventsub,
    async listen() { await new Promise<void>((done, fail) => { server.once('error', fail); server.listen(cfg.port, '127.0.0.1', done); }); if (cfg.mode === 'live' && auth.hasToken()) await eventsub.start(); },
    async close() { clearInterval(timer); unsubscribe(); eventsub.stop(); for (const c of ws.clients) c.terminate(); ws.close(); await vite?.close(); await new Promise<void>(done => server.close(() => done())); },
  };
}
