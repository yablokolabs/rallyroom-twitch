import { appendFileSync, chmodSync, closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { Input, State } from '../../../../packages/game/src/schema.js';
export type AcceptedEvent = { eventId: string; roundId: string; actorId: string | null; command: string; seq: number; timestamp: string; input: Input };
export type Stored = { state: State; events: AcceptedEvent[]; savedAt: string };
// Private local files only. Each journal line is one complete recoverable transaction.
export function atomicWrite(path: string, text: string): void {
  const tmp = path + '.tmp';
  writeFileSync(tmp, text, { mode: 0o600 });
  chmodSync(tmp, 0o600);
  const fd = openSync(tmp, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(tmp, path);
}
export class Journal {
  private path: string;
  constructor(directory: string, private retentionDays = 7, private maxBytes = 16 * 1024 * 1024) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.path = join(directory, 'room.jsonl');
  }
  load(): Stored | null {
    if (!existsSync(this.path)) return null;
    if (statSync(this.path).size > this.maxBytes * 2) throw new Error('Local journal exceeds recovery bound');
    const text = readFileSync(this.path, 'utf8');
    // A killed write can leave a partial final line. Only newline-committed frames count.
    const lines = text.slice(0, text.lastIndexOf('\n') + 1).trim().split('\n');
    let data: Stored | null = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (!lines[i]) continue;
      const parsed = z.object({ state: z.object({ version: z.literal(1), roundId: z.string(), seq: z.number().int(), atMs: z.number().nonnegative(), phase: z.enum(['lobby', 'running', 'success', 'timeout', 'recap']), mode: z.enum(['simulation', 'live', 'replay']) }).passthrough(), events: z.array(z.unknown()), savedAt: z.iso.datetime() }).safeParse(JSON.parse(lines[i]));
      if (!parsed.success) throw new Error('Invalid local journal; restore a backup or clear local history');
      data = parsed.data as Stored; break;
    }
    if (!data || Date.now() - Date.parse(data.savedAt) > this.retentionDays * 86400000) return null;
    // Repair truncated tail before new appends.
    if (!text.endsWith('\n')) atomicWrite(this.path, JSON.stringify(data) + '\n');
    return data;
  }
  save(data: Stored): void {
    const record = JSON.stringify(data) + '\n';
    if (Buffer.byteLength(record) > this.maxBytes) throw new Error('Local state exceeds journal capacity');
    if (existsSync(this.path) && statSync(this.path).size + Buffer.byteLength(record) > this.maxBytes) atomicWrite(this.path, record);
    else {
      appendFileSync(this.path, record, { mode: 0o600 });
      const fd = openSync(this.path, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); }
    }
  }
  clear(data: Stored): void { atomicWrite(this.path, JSON.stringify(data) + '\n'); }
}
