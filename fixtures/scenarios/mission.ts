import type { Command, Role } from '../../packages/game/src/commands.js';
import type { Input } from '../../packages/game/src/schema.js';
/** Generated inputs with explicit virtual timestamps. Never evidence of Twitch use. */
export function missionFixture(count = 3): Input[] {
  const inputs: Input[] = [];
  let n = 0;
  const chat = (actor: number, command: Command, atMs: number) => inputs.push({ kind: 'chat', actorId: `fixture-${actor}`, command, atMs, roundId: 'fixture-northstar', eventId: `fixture-event-${++n}`, messageId: `fixture-message-${n}` });
  for (let i = 0; i < count; i++) chat(i, 'join', 0);
  inputs.push({ kind: 'control', action: 'start', atMs: 0 });
  let time = 0;
  for (const [role, command, target] of [['scout', 'scout', 3], ['builder', 'build', 4], ['engineer', 'charge', 4]] as [Role, Command, number][]) {
    const index = { scout: 0, builder: 1, engineer: 2 }[role];
    const actor = index < count ? index : 0;
    if (index >= count) { chat(actor, `role ${role}`, time); }
    for (let j = 0; j < target; j++) { chat(actor, command, time); time += 5000; }
  }
  return inputs;
}
