import type { StudySession, Task } from '@/types';

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, delta: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + delta);
  return toISO(d);
}

/** Computes current streak (consecutive days up to today with activity) and the longest streak ever. */
export function computeStreaks(activeDates: string[]): { current: number; longest: number } {
  const uniqueDates = Array.from(new Set(activeDates)).sort();
  if (uniqueDates.length === 0) return { current: 0, longest: 0 };

  const dateSet = new Set(uniqueDates);
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of uniqueDates) {
    if (prev && addDays(prev, 1) === d) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = d;
  }

  // current streak: walk backwards from today (or yesterday if today has no activity yet)
  let current = 0;
  let cursor = toISO(new Date());
  if (!dateSet.has(cursor)) {
    cursor = addDays(cursor, -1);
  }
  while (dateSet.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, longest };
}

export function totalStudyHours(sessions: StudySession[]): number {
  return sessions.reduce((s, x) => s + x.durationMin, 0) / 60;
}

export function completionPercent(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100);
}

export function movingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
