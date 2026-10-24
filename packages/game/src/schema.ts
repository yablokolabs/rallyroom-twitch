import { z } from 'zod';
import type { Command, Role } from './commands.js';
export const ModeSchema = z.enum(['simulation', 'live', 'replay']);
export type Mode = z.infer<typeof ModeSchema>;
export type Phase = 'lobby' | 'running' | 'success' | 'timeout' | 'recap';
export type Participant = { role: Role; lastActionMs: number; lastRoleMs: number; contributions: number };
export type State = {
  version: 1; roundId: string; seq: number; mode: Mode; phase: Phase;
  paused: boolean; pauseReason: string | null; outcome: 'success' | 'timeout' | null;
  atMs: number; elapsedMs: number; durationMs: number;
  startedParticipants: number; targets: { scout: number; build: number; charge: number };
  progress: { scout: number; build: number; charge: number };
  participants: Record<string, Participant>;
  seen: { id: string; atMs: number }[];
};
export type Input =
  | { kind: 'tick'; atMs: number }
  | { kind: 'control'; action: 'start' | 'pause' | 'resume' | 'recap' | 'reset'; atMs: number; nextRoundId?: string; reason?: string }
  | { kind: 'chat'; atMs: number; eventId: string; messageId: string; roundId: string; actorId: string; command: Command };
export type Result = { state: State; accepted: boolean; reason: string };
export type PublicState = Omit<State, 'participants' | 'seen' | 'atMs'> & {
  participantCount: number; roles: Record<Role, number>; contributions: number;
  objective: string; usefulCommand: string;
};
