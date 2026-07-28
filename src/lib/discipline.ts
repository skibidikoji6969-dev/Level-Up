import type { DailyLog, Task } from '@/types';

// ============================================================
// Discipline Score Engine
// Blends multiple weighted signals into a single 0-100 score.
// Designed to reward consistency over perfection — a single bad
// day barely moves the needle, but sustained patterns do.
// ============================================================

export interface DisciplineInputs {
  logs: DailyLog[]; // chronological, most relevant window (e.g. last 30 days)
  tasks: Task[];
}

const WEIGHTS = {
  taskCompletion: 0.22,
  studyHours: 0.18,
  sleepConsistency: 0.14,
  wakeConsistency: 0.12,
  workout: 0.1,
  reading: 0.08,
  screenTime: 0.08,
  procrastination: 0.08,
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function calculateDisciplineScore(inputs: DisciplineInputs): number {
  const { logs, tasks } = inputs;
  if (logs.length === 0 && tasks.length === 0) return 0;

  // Task completion %
  const doneCount = tasks.filter((t) => t.done).length;
  const taskCompletionPct = tasks.length ? (doneCount / tasks.length) * 100 : 50;

  // Study hours — normalized against a 3hr/day target
  const avgStudyMin = logs.length
    ? logs.reduce((s, l) => s + l.studyMin, 0) / logs.length
    : 0;
  const studyScore = clamp((avgStudyMin / 180) * 100);

  // Sleep consistency — % of days marked consistent
  const sleepDays = logs.filter((l) => l.bedTimeConsistent !== null);
  const sleepScore = sleepDays.length
    ? (sleepDays.filter((l) => l.bedTimeConsistent).length / sleepDays.length) * 100
    : 50;

  // Wake consistency
  const wakeDays = logs.filter((l) => l.wokeOnTime !== null);
  const wakeScore = wakeDays.length
    ? (wakeDays.filter((l) => l.wokeOnTime).length / wakeDays.length) * 100
    : 50;

  // Workout frequency
  const workoutScore = logs.length
    ? (logs.filter((l) => l.workoutDone).length / logs.length) * 100
    : 0;

  // Reading — normalized against 20min/day
  const avgReadingMin = logs.length
    ? logs.reduce((s, l) => s + l.readingMin, 0) / logs.length
    : 0;
  const readingScore = clamp((avgReadingMin / 20) * 100);

  // Screen time — lower is better, normalized against a 4hr ceiling
  const screenDays = logs.filter((l) => l.screenTimeMin !== null);
  const avgScreenMin = screenDays.length
    ? screenDays.reduce((s, l) => s + (l.screenTimeMin ?? 0), 0) / screenDays.length
    : 120;
  const screenScore = clamp(100 - (avgScreenMin / 240) * 100);

  // Procrastination — lower rating is better (1 = low, 5 = high)
  const procDays = logs.filter((l) => l.procrastinationRating !== null);
  const avgProc = procDays.length
    ? procDays.reduce((s, l) => s + (l.procrastinationRating ?? 3), 0) / procDays.length
    : 3;
  const procScore = clamp(100 - ((avgProc - 1) / 4) * 100);

  const weighted =
    taskCompletionPct * WEIGHTS.taskCompletion +
    studyScore * WEIGHTS.studyHours +
    sleepScore * WEIGHTS.sleepConsistency +
    wakeScore * WEIGHTS.wakeConsistency +
    workoutScore * WEIGHTS.workout +
    readingScore * WEIGHTS.reading +
    screenScore * WEIGHTS.screenTime +
    procScore * WEIGHTS.procrastination;

  return Math.round(clamp(weighted));
}

export function disciplineColor(score: number): string {
  if (score < 20) return '#EF4444'; // red
  if (score < 40) return '#F97316'; // orange
  if (score < 60) return '#EAB308'; // yellow
  if (score < 75) return '#22C55E'; // green
  if (score < 90) return '#3B82F6'; // blue
  return '#A855F7'; // purple — elite tier
}

export function disciplineLabel(score: number): string {
  if (score < 20) return 'Critical';
  if (score < 40) return 'Inconsistent';
  if (score < 60) return 'Developing';
  if (score < 75) return 'Disciplined';
  if (score < 90) return 'Elite';
  return 'Transcendent';
}
