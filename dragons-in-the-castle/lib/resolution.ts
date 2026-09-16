import type { Result } from './engine';

export const RESOLUTION_DURATION = 2400;
export const RESOLUTION_IMPACT = 650;
export type ResolutionCue = 'begin' | 'impact' | 'settled';
export type ResolutionEffect =
  | 'theft'
  | 'blocked'
  | 'guard'
  | 'count'
  | 'investigate'
  | 'empty'
  | 'missed';

// Accept only the player's private result. Never infer totals or occupants from
// claims, another player's actions, or even a previous round's private result.
export function resolutionEffect(result?: Result): ResolutionEffect {
  if (!result) return 'missed';
  if (result.action === 'Steal Coins')
    return result.blocked
      ? 'blocked'
      : (result.stolen ?? 0) > 0
        ? 'theft'
        : 'empty';
  if (result.action === 'Guard Room')
    return result.blocked ? 'blocked' : 'guard';
  if (result.action === 'Count Coins') return 'count';
  return 'investigate';
}

// Denominations keep even a 100-coin theft legible without 100 moving nodes.
export function coinTokens(stolen: number): number[] {
  const count = Number.isFinite(stolen)
    ? Math.max(0, Math.min(100, Math.floor(stolen)))
    : 0;
  const length = Math.min(8, count);
  return Array.from(
    { length },
    (_, index) => Math.floor(count / length) + (index < count % length ? 1 : 0),
  );
}

export function resolutionStage(
  startedAt: number | null,
  now: number,
  reducedMotion = false,
): ResolutionCue {
  if (
    startedAt === null ||
    reducedMotion ||
    now - startedAt >= RESOLUTION_DURATION
  )
    return 'settled';
  return now - startedAt >= RESOLUTION_IMPACT ? 'impact' : 'begin';
}

export function createResolutionTimeline(startedAt: number | null) {
  let finished = startedAt === null;
  return {
    advance(now: number, stop = false): ResolutionCue {
      const stage = resolutionStage(startedAt, now, stop || finished);
      if (stage === 'settled') finished = true;
      return stage;
    },
  };
}
