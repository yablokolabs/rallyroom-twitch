import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve, join } from 'node:path';
import { ModeSchema, type Mode } from '../../../packages/game/src/schema.js';
import { atomicWrite } from './storage/store.js';
import type { TwitchConfig } from './twitch/oauth.js';
export type Config = { port: number; directory: string; mode: Mode; controlKey: string; salt: string; retentionDays: number; production: boolean; twitch: TwitchConfig };
function localSecret(directory: string, name: string): string {
  const path = join(directory, name);
  if (existsSync(path)) return readFileSync(path, 'utf8').trim();
  const secret = randomBytes(32).toString('base64url'); atomicWrite(path, secret + '\n'); return secret;
}
export function config(): Config {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const directory = resolve(process.env.RALLY_DATA_DIR ?? '.data'); mkdirSync(directory, { recursive: true, mode: 0o700 });
  const port = Number(process.env.PORT ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const controlKey = process.env.CONTROL_KEY || localSecret(directory, 'control-key');
  if (controlKey.length < 24) throw new Error('CONTROL_KEY must have at least 24 characters');
  const retentionDays = Number(process.env.RETENTION_DAYS ?? '7');
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 30) throw new Error('RETENTION_DAYS must be 1–30');
  const redirectUri = process.env.TWITCH_REDIRECT_URI || `http://localhost:${port}/auth/twitch/callback`;
  if (redirectUri !== `http://localhost:${port}/auth/twitch/callback` && redirectUri !== `http://127.0.0.1:${port}/auth/twitch/callback`) throw new Error('OAuth redirect must use this local server and callback path');
  return {
    port, directory, controlKey, salt: localSecret(directory, 'actor-salt'), retentionDays,
    mode: ModeSchema.parse(process.env.RALLY_MODE ?? 'simulation'), production: process.env.NODE_ENV === 'production' || process.argv[1]?.endsWith('.js'),
    twitch: { clientId: process.env.TWITCH_CLIENT_ID ?? '', clientSecret: process.env.TWITCH_CLIENT_SECRET ?? '', broadcasterId: process.env.TWITCH_BROADCASTER_ID ?? '', redirectUri, consent: process.env.TWITCH_CHANNEL_CONSENT === 'true', controlIds: (process.env.TWITCH_CONTROL_USER_IDS ?? '').split(',').filter(x => /^\d+$/.test(x)) },
  };
}
