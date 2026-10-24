export const ROLES = ['scout', 'builder', 'engineer'] as const;
export type Role = typeof ROLES[number];
export type Command = 'join' | 'help' | 'scout' | 'build' | 'charge' | `role ${Role}`;
const grammar = /^!rally (join|help|scout|build|charge|role (?:scout|builder|engineer))$/;
/** Deliberately exact ASCII grammar. No trim, Unicode normalization, HTML or URLs. */
export function parseCommand(text: unknown): Command | null {
  if (typeof text !== 'string' || text.length > 40 || !/^[\x20-\x7e]+$/.test(text)) return null;
  return (grammar.exec(text)?.[1] as Command | undefined) ?? null;
}
export const ROLE_ACTION: Record<Role, Command> = { scout: 'scout', builder: 'build', engineer: 'charge' };
