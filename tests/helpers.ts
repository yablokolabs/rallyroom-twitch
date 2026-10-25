import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Config } from '../apps/server/src/config.js';
export function testConfig(mode: Config['mode'] = 'simulation'): Config {
  return { port: 34000 + Math.floor(Math.random() * 20000), directory: mkdtempSync(join(tmpdir(),'rallyroom-test-')), mode, controlKey:'test-control-key-at-least-24-chars', salt:'test-only-hmac-salt', retentionDays:7, production:true,
    twitch: {clientId:'test-client',clientSecret:'test-secret',broadcasterId:'123',redirectUri:'http://localhost:3000/auth/twitch/callback',consent:true,controlIds:['456']} };
}
export const cleanup = (cfg: Config) => rmSync(cfg.directory,{recursive:true,force:true});
