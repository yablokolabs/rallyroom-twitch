export const COOLDOWN_MS = 5000;
export const ROLE_COOLDOWN_MS = 5000;
export const DURATION_MS = 180000;
export const MAX_PARTICIPANTS = 500;
export const DEDUP_MS = 10 * 60 * 1000;
export const MAX_SEEN = 12000;
// Fixed for all group sizes. Late joins never raise a target.
export const TARGETS = { scout: 3, build: 4, charge: 4 } as const;
