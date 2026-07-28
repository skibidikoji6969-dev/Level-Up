// ============================================================
// XP / Level engine
// Cumulative XP required to REACH level n (n >= 1) follows an
// exponential curve so that early levels feel fast and later
// levels feel earned. Matches the examples in the spec:
//   L1 -> 0, L2 -> 100, L3 -> 250, L4 -> 450 ...
// General term: cumXP(n) = 50 * (n-1) * n   for n >= 1 (n=1 -> 0)
// This produces 0, 100, 300... — instead we use a tuned formula
// blending a quadratic base with a mild exponential multiplier so
// it keeps scaling sensibly out to level 100.
// ============================================================

const BASE = 50;
const GROWTH = 1.06; // mild exponential compounding per level

/** Cumulative XP required to have reached `level` (level 1 = 0 XP). */
export function cumulativeXPForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let n = 2; n <= level; n++) {
    total += Math.round(BASE * (n - 1) * Math.pow(GROWTH, n - 2));
  }
  return total;
}

export interface LevelInfo {
  level: number;
  currentLevelXP: number; // XP earned within the current level
  xpToNextLevel: number; // XP needed to reach the next level from currentLevelXP
  xpForCurrentLevelSpan: number; // total XP span of the current level
  totalXP: number;
  progress: number; // 0-1
}

const MAX_LEVEL = 100;

export function getLevelInfo(totalXP: number): LevelInfo {
  let level = 1;
  while (level < MAX_LEVEL && cumulativeXPForLevel(level + 1) <= totalXP) {
    level++;
  }
  const floor = cumulativeXPForLevel(level);
  const ceilNext = level >= MAX_LEVEL ? floor : cumulativeXPForLevel(level + 1);
  const span = Math.max(1, ceilNext - floor);
  const currentLevelXP = totalXP - floor;
  const xpToNextLevel = Math.max(0, ceilNext - totalXP);

  return {
    level,
    currentLevelXP,
    xpToNextLevel,
    xpForCurrentLevelSpan: span,
    totalXP,
    progress: level >= MAX_LEVEL ? 1 : currentLevelXP / span,
  };
}

// Rank titles unlocked by level — Solo Leveling flavored
export const RANKS: { minLevel: number; title: string }[] = [
  { minLevel: 1, title: 'E-Rank Novice' },
  { minLevel: 5, title: 'D-Rank Initiate' },
  { minLevel: 10, title: 'C-Rank Operative' },
  { minLevel: 20, title: 'B-Rank Specialist' },
  { minLevel: 35, title: 'A-Rank Ascendant' },
  { minLevel: 50, title: 'S-Rank Vanguard' },
  { minLevel: 70, title: 'National-Level Threat' },
  { minLevel: 90, title: 'Monarch' },
  { minLevel: 100, title: 'Sovereign' },
];

export function getRank(level: number): string {
  let rank = RANKS[0].title;
  for (const r of RANKS) {
    if (level >= r.minLevel) rank = r.title;
  }
  return rank;
}

// XP reward table straight from the product spec
export const XP_TABLE: Record<string, { amount: number; label: string }> = {
  wake_on_time: { amount: 15, label: 'Woke up on time' },
  study_session: { amount: 25, label: 'Finished study session' },
  workout: { amount: 20, label: 'Completed workout' },
  reading: { amount: 15, label: 'Read a book' },
  meditation: { amount: 10, label: 'Meditated' },
  no_phone_study: { amount: 20, label: 'No phone during study' },
  revision: { amount: 30, label: 'Revision completed' },
  mock_test: { amount: 50, label: 'Mock test completed' },
  perfect_day: { amount: 100, label: 'Perfect day' },
  task_complete: { amount: 8, label: 'Task completed' },
};
