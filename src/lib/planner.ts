import type {
  AppSettings,
  Subject,
  Topic,
  Goal,
  Task,
  PlannerSlot,
  SlotTaskType,
  SlotStatus,
  EnergyLevel,
  TimeOfDay,
  TaskPriority,
} from '@/types';
import { computeTopicReadiness } from './academic';

// ============================================================
// Energy profile
// ============================================================
const DEFAULT_ENERGY_PROFILE: Record<TimeOfDay, EnergyLevel> = {
  morning: 'high',
  afternoon: 'medium',
  evening: 'medium',
  night: 'low',
};

export function getEnergyProfile(settings: AppSettings | undefined | null): Record<TimeOfDay, EnergyLevel> {
  return {
    morning: settings?.energyMorning ?? DEFAULT_ENERGY_PROFILE.morning,
    afternoon: settings?.energyAfternoon ?? DEFAULT_ENERGY_PROFILE.afternoon,
    evening: settings?.energyEvening ?? DEFAULT_ENERGY_PROFILE.evening,
    night: settings?.energyNight ?? DEFAULT_ENERGY_PROFILE.night,
  };
}

/** Classifies an 'HH:mm' time string into a time-of-day bucket. */
export function timeOfDayFor(time: string): TimeOfDay {
  const hour = parseInt(time.split(':')[0] ?? '0', 10);
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night'; // 21:00–04:59
}

// ============================================================
// Task type metadata
// ============================================================
export const TASK_TYPE_LABELS: Record<SlotTaskType, string> = {
  new_learning: 'New Learning',
  practice: 'Practice',
  revision: 'Revision',
  mock_test: 'Mock Test',
  assignment: 'Assignment',
  other: 'Other',
};

export const TASK_TYPE_DEFAULT_DURATION: Record<SlotTaskType, number> = {
  new_learning: 45,
  practice: 30,
  revision: 20,
  mock_test: 90,
  assignment: 30,
  other: 30,
};

export const TASK_TYPE_DEFAULT_ENERGY: Record<SlotTaskType, EnergyLevel> = {
  new_learning: 'high',
  practice: 'medium',
  revision: 'low',
  mock_test: 'high',
  assignment: 'medium',
  other: 'low',
};

// ============================================================
// Time helpers ('HH:mm' arithmetic, no Date object churn)
// ============================================================
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(min: number): string {
  const h = Math.floor((((min % 1440) + 1440) % 1440) / 60);
  const m = Math.round(((min % 60) + 60) % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addDaysISO(dateISO: string, delta: number): string {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

// ============================================================
// Missed-slot detection (derived, never persisted as its own status —
// see the note on SlotStatus for why)
// ============================================================
export function isSlotMissed(slot: PlannerSlot, now: Date = new Date()): boolean {
  if (slot.status !== 'planned' && slot.status !== 'in_progress') return false;
  const slotEnd = new Date(`${slot.date}T${slot.endTime}:00`);
  return slotEnd.getTime() < now.getTime();
}

/** UI-facing status: same as slot.status, except a stale 'planned'/'in_progress' slot reads as 'missed'. */
export function getEffectiveSlotStatus(slot: PlannerSlot, now: Date = new Date()): SlotStatus | 'missed' {
  return isSlotMissed(slot, now) ? 'missed' : slot.status;
}

// ============================================================
// Next available window
// Scans forward day by day (today first) for a gap of `durationMin`
// minutes that isn't already occupied by an existing slot, staying within
// a reasonable planning day (07:00–23:00) and skipping the exact slot
// being rescheduled.
// ============================================================
export interface TimeWindow {
  date: string;
  startTime: string;
  endTime: string;
}

const DAY_START_MIN = 7 * 60;
const DAY_END_MIN = 23 * 60;
const MIN_GAP_MIN = 10;

export function findNextAvailableWindow(
  allSlots: PlannerSlot[],
  durationMin: number,
  fromDate: string,
  excludeSlotId?: string,
  maxDaysAhead = 14
): TimeWindow | null {
  for (let dayOffset = 0; dayOffset <= maxDaysAhead; dayOffset++) {
    const date = addDaysISO(fromDate, dayOffset);
    const daySlots = allSlots
      .filter((s) => s.date === date && s.id !== excludeSlotId && s.status !== 'skipped' && s.status !== 'rescheduled')
      .map((s) => [timeToMinutes(s.startTime), timeToMinutes(s.endTime)] as [number, number])
      .sort((a, b) => a[0] - b[0]);

    let cursor = DAY_START_MIN;
    for (const [start, end] of daySlots) {
      if (start - cursor >= durationMin + MIN_GAP_MIN) {
        return { date, startTime: minutesToTime(cursor), endTime: minutesToTime(cursor + durationMin) };
      }
      cursor = Math.max(cursor, end + MIN_GAP_MIN);
    }
    if (DAY_END_MIN - cursor >= durationMin) {
      return { date, startTime: minutesToTime(cursor), endTime: minutesToTime(cursor + durationMin) };
    }
  }
  return null;
}

// ============================================================
// Smart Daily Plan generator
// ============================================================
export interface DraftSlot {
  date: string;
  startTime: string;
  endTime: string;
  subjectId: string | null;
  topicId: string | null;
  taskType: SlotTaskType;
  priority: TaskPriority;
  estimatedDuration: number;
  energyRequirement: EnergyLevel;
  notes: string;
  reason: string; // shown in the preview so the pick is never a black box
}

interface Candidate {
  subjectId: string | null;
  topicId: string | null;
  taskType: SlotTaskType;
  priority: TaskPriority;
  duration: number;
  energy: EnergyLevel;
  notes: string;
  reason: string;
  rank: number; // lower = higher priority bucket
}

export interface GeneratePlanInput {
  date: string;
  windows: TimeWindow[]; // free time the user has today
  subjects: Subject[];
  topics: Topic[];
  goals: Goal[];
  tasks: Task[]; // today's + upcoming (for deadlines)
  energyProfile: Record<TimeOfDay, EnergyLevel>;
  existingSlots: PlannerSlot[]; // already-planned slots today, to avoid overlap
}

const LONG_BREAK_AFTER_CONSECUTIVE = 2;
const SHORT_BREAK_MIN = 10;
const LONG_BREAK_MIN = 20;

export function generateDailyPlan(input: GeneratePlanInput): DraftSlot[] {
  const { date, subjects, topics, goals, tasks, energyProfile } = input;
  const subjectName = (id: string | null) => subjects.find((s) => s.id === id)?.name ?? 'General';

  // ---- Build a prioritized candidate queue from real data ----
  const candidates: Candidate[] = [];

  // 1. Overdue revisions
  const overdue = topics.filter((t) => t.nextRevision && t.nextRevision < date);
  for (const t of overdue) {
    candidates.push({
      subjectId: t.subjectId,
      topicId: t.id,
      taskType: 'revision',
      priority: 'critical',
      duration: TASK_TYPE_DEFAULT_DURATION.revision,
      energy: TASK_TYPE_DEFAULT_ENERGY.revision,
      notes: t.name,
      reason: `Revision overdue since ${t.nextRevision}`,
      rank: 0,
    });
  }

  // 2. Weak chapters (readiness < 50, not already queued as overdue)
  const overdueIds = new Set(overdue.map((t) => t.id));
  const weak = topics
    .filter((t) => !overdueIds.has(t.id))
    .map((t) => ({ topic: t, readiness: computeTopicReadiness(t) }))
    .filter((x) => x.readiness < 50)
    .sort((a, b) => a.readiness - b.readiness);
  for (const { topic: t, readiness } of weak) {
    const inProgress = (t.completionPct ?? 0) > 0;
    candidates.push({
      subjectId: t.subjectId,
      topicId: t.id,
      taskType: inProgress ? 'practice' : 'new_learning',
      priority: 'high',
      duration: inProgress ? TASK_TYPE_DEFAULT_DURATION.practice : TASK_TYPE_DEFAULT_DURATION.new_learning,
      energy: inProgress ? TASK_TYPE_DEFAULT_ENERGY.practice : TASK_TYPE_DEFAULT_ENERGY.new_learning,
      notes: `${subjectName(t.subjectId)} · ${t.name}`,
      reason: `Weak chapter (readiness ${readiness}%)`,
      rank: 1,
    });
  }

  // 3. High-priority goals (incomplete, nearest deadline first)
  const activeGoals = goals
    .filter((g) => !g.completed)
    .sort((a, b) => (a.deadline ?? '9999-99-99').localeCompare(b.deadline ?? '9999-99-99'));
  for (const g of activeGoals.slice(0, 3)) {
    candidates.push({
      subjectId: null,
      topicId: null,
      taskType: 'assignment',
      priority: 'high',
      duration: TASK_TYPE_DEFAULT_DURATION.assignment,
      energy: TASK_TYPE_DEFAULT_ENERGY.assignment,
      notes: g.title,
      reason: g.deadline ? `Goal due ${g.deadline}` : 'Active goal',
      rank: 2,
    });
  }

  // 4. Upcoming deadlines (undone tasks with a deadline, nearest first)
  const deadlineTasks = tasks
    .filter((t) => !t.done && t.deadline)
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''));
  for (const t of deadlineTasks.slice(0, 3)) {
    candidates.push({
      subjectId: null,
      topicId: null,
      taskType: 'assignment',
      priority: t.priority,
      duration: t.estimatedMin || TASK_TYPE_DEFAULT_DURATION.assignment,
      energy: TASK_TYPE_DEFAULT_ENERGY.assignment,
      notes: t.title,
      reason: `Deadline ${t.deadline}`,
      rank: 3,
    });
  }

  // 5. Practice (decent completion, low question count, not already queued)
  const queuedIds = new Set(candidates.map((c) => c.topicId).filter(Boolean));
  const practiceCandidates = topics
    .filter((t) => !queuedIds.has(t.id) && (t.completionPct ?? 0) >= 40 && (t.questionsSolved ?? 0) < 20)
    .sort((a, b) => (a.questionsSolved ?? 0) - (b.questionsSolved ?? 0));
  for (const t of practiceCandidates) {
    candidates.push({
      subjectId: t.subjectId,
      topicId: t.id,
      taskType: 'practice',
      priority: 'medium',
      duration: TASK_TYPE_DEFAULT_DURATION.practice,
      energy: TASK_TYPE_DEFAULT_ENERGY.practice,
      notes: `${subjectName(t.subjectId)} · ${t.name}`,
      reason: 'Needs more practice questions',
      rank: 4,
    });
  }

  // 6. New learning (not started, not already queued)
  const newLearning = topics.filter((t) => !queuedIds.has(t.id) && t.status === 'not_started');
  for (const t of newLearning) {
    candidates.push({
      subjectId: t.subjectId,
      topicId: t.id,
      taskType: 'new_learning',
      priority: 'medium',
      duration: TASK_TYPE_DEFAULT_DURATION.new_learning,
      energy: TASK_TYPE_DEFAULT_ENERGY.new_learning,
      notes: `${subjectName(t.subjectId)} · ${t.name}`,
      reason: 'Not started yet',
      rank: 5,
    });
  }

  candidates.sort((a, b) => a.rank - b.rank);

  // ---- Fill the user's free windows, balancing task types and leaving breaks ----
  const drafts: DraftSlot[] = [];
  const usedTopicIds = new Set<string>();
  const recentTypes: SlotTaskType[] = [];

  function pickNextCandidate(preferredEnergy: EnergyLevel): Candidate | null {
    const pool = candidates.filter((c) => !c.topicId || !usedTopicIds.has(c.topicId));
    if (!pool.length) return null;

    const sameTypeStreak =
      recentTypes.length >= LONG_BREAK_AFTER_CONSECUTIVE &&
      recentTypes.slice(-LONG_BREAK_AFTER_CONSECUTIVE).every((t) => t === recentTypes[recentTypes.length - 1]);

    const energyMatch = pool.filter((c) => c.energy === preferredEnergy);
    const searchIn = energyMatch.length ? energyMatch : pool;

    if (sameTypeStreak) {
      const lastType = recentTypes[recentTypes.length - 1];
      const alt = searchIn.find((c) => c.taskType !== lastType) ?? pool.find((c) => c.taskType !== lastType);
      if (alt) return alt;
    }
    return searchIn[0] ?? pool[0];
  }

  for (const window of [...input.windows].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))) {
    let cursor = timeToMinutes(window.startTime);
    const windowEnd = timeToMinutes(window.endTime);
    const windowEnergy = energyProfile[timeOfDayFor(window.startTime)];
    let consecutiveInWindow = 0;

    while (cursor < windowEnd) {
      const candidate = pickNextCandidate(windowEnergy);
      if (!candidate) break;

      const remaining = windowEnd - cursor;
      if (candidate.duration > remaining) {
        const idx = candidates.indexOf(candidate);
        if (idx >= 0) candidates.splice(idx, 1);
        continue;
      }

      drafts.push({
        date,
        startTime: minutesToTime(cursor),
        endTime: minutesToTime(cursor + candidate.duration),
        subjectId: candidate.subjectId,
        topicId: candidate.topicId,
        taskType: candidate.taskType,
        priority: candidate.priority,
        estimatedDuration: candidate.duration,
        energyRequirement: candidate.energy,
        notes: candidate.notes,
        reason: candidate.reason,
      });

      if (candidate.topicId) usedTopicIds.add(candidate.topicId);
      const cIdx = candidates.indexOf(candidate);
      if (cIdx >= 0) candidates.splice(cIdx, 1);
      recentTypes.push(candidate.taskType);
      consecutiveInWindow++;

      cursor += candidate.duration;
      const breakMin = consecutiveInWindow % (LONG_BREAK_AFTER_CONSECUTIVE + 1) === 0 ? LONG_BREAK_MIN : SHORT_BREAK_MIN;
      cursor += breakMin; // never fill every available minute — always leave a breather
    }
  }

  return drafts;
}
