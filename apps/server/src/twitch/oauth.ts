import { existsSync, readFileSync, rmSync } from 'node:fs';
import { z } from 'zod';
import { atomicWrite } from '../storage/store.js';
export type TwitchConfig = { clientId: string; clientSecret: string; broadcasterId: string; redirectUri: string; consent: boolean; controlIds: string[] };
const TokensSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1), expires_in: z.number(), scope: z.array(z.string()), token_type: z.string() });
type Tokens = z.infer<typeof TokensSchema>;
const IdentitySchema = z.object({ client_id: z.string(), user_id: z.string().regex(/^\d+$/), scopes: z.array(z.string()), expires_in: z.number().nonnegative() });
export class TwitchError extends Error {
  constructor(readonly code: 'unconfigured' | 'revoked' | 'unavailable' | 'rate-limited' | 'wrong-identity' | 'subscription-failed', readonly retryAfterMs = 0) { super(code); }
}
export class TwitchAuth {
  private tokens: Tokens | null = null;
  private refreshing: { version: number; promise: Promise<void> } | null = null;
  private credentialVersion = 0;
  constructor(readonly config: TwitchConfig, private tokenPath: string, private fetcher: typeof fetch = fetch) {
    if (existsSync(tokenPath)) {
      try { this.tokens = TokensSchema.parse(JSON.parse(readFileSync(tokenPath, 'utf8'))); }
      catch { throw new Error('Invalid private token file. Remove that file and authorize again.'); }
    }
  }
  configured(): boolean { return Boolean(this.config.clientId && this.config.clientSecret && /^\d+$/.test(this.config.broadcasterId) && this.config.consent); }
  hasToken(): boolean { return this.tokens !== null; }
  private async request(url: string, init?: RequestInit): Promise<Response> {
    try { return await this.fetcher(url, { ...init, signal: AbortSignal.timeout(8000), redirect: 'error' }); }
    catch { throw new TwitchError('unavailable'); }
  }
  authorizeUrl(state: string, purpose: 'chat' | 'control'): string {
    if (!this.config.clientId || !this.config.clientSecret || (purpose === 'chat' && !this.configured())) throw new TwitchError('unconfigured');
    const q = new URLSearchParams({ response_type: 'code', client_id: this.config.clientId, redirect_uri: this.config.redirectUri, state, force_verify: 'true', scope: purpose === 'chat' ? 'user:read:chat' : '' });
    return 'https://id.twitch.tv/oauth2/authorize?' + q;
  }
  async identity(accessToken: string) {
    const r = await this.request('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: `OAuth ${accessToken}` } });
    if (r.status === 401) throw new TwitchError('revoked');
    if (!r.ok) throw new TwitchError('unavailable');
    const id = IdentitySchema.safeParse(await r.json());
    if (!id.success || id.data.client_id !== this.config.clientId) throw new TwitchError('wrong-identity');
    if (id.data.expires_in <= 0) throw new TwitchError('revoked');
    return id.data;
  }
  private async exchange(form: URLSearchParams): Promise<Tokens> {
    form.set('client_id', this.config.clientId); form.set('client_secret', this.config.clientSecret);
    const r = await this.request('https://id.twitch.tv/oauth2/token', { method: 'POST', body: form });
    if (r.status === 400 || r.status === 401) throw new TwitchError('revoked');
    if (!r.ok) throw new TwitchError('unavailable');
    const tokens = TokensSchema.safeParse(await r.json());
    if (!tokens.success) throw new TwitchError('unavailable');
    return tokens.data;
  }
  async redeem(code: string, purpose: 'chat' | 'control') {
    const version = this.credentialVersion;
    const tokens = await this.exchange(new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: this.config.redirectUri }));
    const id = await this.identity(tokens.access_token);
    if (version !== this.credentialVersion) throw new TwitchError('revoked');
    if (purpose === 'control') {
      if (id.user_id !== this.config.broadcasterId && !this.config.controlIds.includes(id.user_id)) throw new TwitchError('wrong-identity');
      return { role: id.user_id === this.config.broadcasterId ? 'owner' as const : 'moderator' as const, accessToken: tokens.access_token };
    }
    this.assertBroadcaster(id);
    atomicWrite(this.tokenPath, JSON.stringify(tokens)); this.tokens = tokens; this.credentialVersion++;
    return { role: 'owner' as const, accessToken: tokens.access_token };
  }
  private assertBroadcaster(id: z.infer<typeof IdentitySchema>) {
    if (id.user_id !== this.config.broadcasterId || !id.scopes.includes('user:read:chat') || !this.config.consent) throw new TwitchError('wrong-identity');
  }
  private async refresh(): Promise<void> {
    const version = this.credentialVersion;
    if (this.refreshing?.version === version) return this.refreshing.promise;
    const promise: Promise<void> = (async () => {
      if (!this.tokens) throw new TwitchError('revoked');
      const tokens = await this.exchange(new URLSearchParams({ grant_type: 'refresh_token', refresh_token: this.tokens.refresh_token }));
      this.assertBroadcaster(await this.identity(tokens.access_token));
      if (version !== this.credentialVersion) throw new TwitchError('revoked');
      atomicWrite(this.tokenPath, JSON.stringify(tokens)); this.tokens = tokens; this.credentialVersion++;
    })().finally(() => { if (this.refreshing?.promise === promise) this.refreshing = null; });
    this.refreshing = { version, promise };
    return promise;
  }
  async validate(): Promise<void> {
    if (!this.configured() || !this.tokens) throw new TwitchError('unconfigured');
    const version = this.credentialVersion;
    try {
      const identity = await this.identity(this.tokens.access_token);
      if (version !== this.credentialVersion) { if (this.tokens) return this.validate(); throw new TwitchError('revoked'); }
      this.assertBroadcaster(identity);
    }
    catch (e) {
      if (version !== this.credentialVersion) { if (this.tokens) return this.validate(); throw new TwitchError('revoked'); }
      if (e instanceof TwitchError && e.code === 'revoked') {
        try { await this.refresh(); } catch (failure) {
          if (version !== this.credentialVersion && this.tokens) return this.validate();
          if (version === this.credentialVersion && failure instanceof TwitchError && ['revoked', 'wrong-identity'].includes(failure.code)) this.forget();
          throw failure;
        }
      } else throw e;
    }
  }
  async subscribe(sessionId: string): Promise<string> {
    if (!this.tokens) throw new TwitchError('revoked');
    const request = () => this.request('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.tokens!.access_token}`, 'Client-Id': this.config.clientId },
      body: JSON.stringify({ type: 'channel.chat.message', version: '1', condition: { broadcaster_user_id: this.config.broadcasterId, user_id: this.config.broadcasterId }, transport: { method: 'websocket', session_id: sessionId } }),
    });
    let r = await request();
    if (r.status === 401) { await this.refresh(); r = await request(); }
    if (r.status === 429) {
      const reset = Number(r.headers.get('Ratelimit-Reset')) * 1000;
      throw new TwitchError('rate-limited', Math.min(3600000, Math.max(1000, reset - Date.now() || 60000)));
    }
    if (r.status === 401 || r.status === 403) throw new TwitchError('revoked');
    if (r.status !== 202) throw new TwitchError('subscription-failed');
    const body = z.object({ data: z.array(z.object({ id: z.string(), status: z.literal('enabled'), type: z.literal('channel.chat.message'), version: z.literal('1') })).min(1) }).safeParse(await r.json());
    if (!body.success) throw new TwitchError('subscription-failed');
    return body.data.data[0].id;
  }
  forget() { this.credentialVersion++; this.tokens = null; rmSync(this.tokenPath, { force: true }); }
}
