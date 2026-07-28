import { db, uid, nowISO, todayISO } from '@/db/database';
import type {
  Subject,
  Topic,
  StudySession,
  Task,
  DailyLog,
  Goal,
  XPSourceType,
  TaskCategory,
  TaskPriority,
  TopicStatus,
} from '@/types';
import { XP_TABLE, getLevelInfo } from './xp';
import { useUIStore } from '@/store/useUIStore';
import { ACHIEVEMENT_DEFS, evaluateUnlockedAchievements } from './achievements';
import { computeStreaks, totalStudyHours } from './stats';

// ---------------- XP ----------------

export async function awardXP(source: XPSourceType, customAmount?: number, customLabel?: string) {
  const settings = await db.settings.get('settings');
  const multiplier = settings?.xpMultiplier ?? 1;
  const table = XP_TABLE[source];
  const baseAmount = customAmount ?? table?.amount ?? 10;
  const amount = Math.round(baseAmount * multiplier);
  const label = customLabel ?? table?.label ?? 'XP earned';

  const totalBefore = await getTotalXP();
  const levelBefore = getLevelInfo(totalBefore).level;

  await db.xpEvents.add({
    id: uid(),
    amount,
    source,
    label,
    date: todayISO(),
    timestamp: nowISO(),
  });

  const totalAfter = totalBefore + amount;
  const levelAfter = getLevelInfo(totalAfter).level;

  useUIStore.getState().pushToast({ title: `+${amount} XP`, description: label, variant: 'xp' });

  if (levelAfter > levelBefore) {
    useUIStore.getState().pushToast({
      title: `Level Up!`,
      description: `You reached Level ${levelAfter}`,
      variant: 'levelup',
    });
  }

  await checkAchievements();
  return amount;
}

export async function getTotalXP(): Promise<number> {
  const events = await db.xpEvents.toArray();
  return events.reduce((s, e) => s + e.amount, 0);
}

// ---------------- Subjects & Topics ----------------

export async function createSubject(name: string, color: string): Promise<Subject> {
  const subject: Subject = { id: uid(), name, color, createdAt: nowISO() };
  await db.subjects.add(subject);
  return subject;
}

export async function deleteSubject(id: string) {
  await db.subjects.delete(id);
  const topics = await db.topics.where('subjectId').equals(id).toArray();
  await db.topics.bulkDelete(topics.map((t) => t.id));
}

export async function createTopic(subjectId: string, name: string, difficulty: 1 | 2 | 3 | 4 | 5 = 3): Promise<Topic> {
  const topic: Topic = {
    id: uid(),
    subjectId,
    name,
    status: 'not_started',
    confidence: 30,
    difficulty,
    timeSpentMin: 0,
    questionsSolved: 0,
    lastRevised: null,
    revisionIntervalDays: 3,
    createdAt: nowISO(),
  };
  await db.topics.add(topic);
  return topic;
}

export async function updateTopic(id: string, patch: Partial<Topic>) {
  await db.topics.update(id, patch);
}

export async function setTopicStatus(id: string, status: TopicStatus) {
  await db.topics.update(id, { status });
}

export async function deleteTopic(id: string) {
  await db.topics.delete(id);
}

// ---------------- Study Sessions ----------------

export async function logStudySession(input: {
  subjectId: string;
  topicId: string | null;
  durationMin: number;
  questionsSolved: number;
  focusRating: number;
  noPhone: boolean;
  notes?: string;
  startedAt?: string;
}): Promise<StudySession> {
  const session: StudySession = {
    id: uid(),
    subjectId: input.subjectId,
    topicId: input.topicId,
    date: todayISO(),
    startedAt: input.startedAt ?? nowISO(),
    durationMin: input.durationMin,
    questionsSolved: input.questionsSolved,
    focusRating: input.focusRating,
    noPhone: input.noPhone,
    notes: input.notes,
  };
  await db.sessions.add(session);

  if (input.topicId) {
    const topic = await db.topics.get(input.topicId);
    if (topic) {
      await db.topics.update(input.topicId, {
        timeSpentMin: topic.timeSpentMin + input.durationMin,
        questionsSolved: topic.questionsSolved + input.questionsSolved,
        lastRevised: todayISO(),
        status: topic.status === 'not_started' ? 'learning' : topic.status,
      });
    }
  }

  // roll session minutes into today's daily log
  await upsertDailyLogPatch(todayISO(), (log) => ({
    ...log,
    studyMin: log.studyMin + input.durationMin,
  }));

  await awardXP('study_session');
  if (input.noPhone) await awardXP('no_phone_study');

  return session;
}

export async function logRevision(topicId?: string) {
  if (topicId) {
    const topic = await db.topics.get(topicId);
    if (topic) {
      await db.topics.update(topicId, {
        lastRevised: todayISO(),
        status: topic.status === 'not_started' || topic.status === 'learning' ? 'revising' : topic.status,
      });
    }
  }
  await awardXP('revision');
}

export async function logMockTest(subjectId?: string, score?: number) {
  await awardXP('mock_test', undefined, subjectId && score !== undefined ? `Mock test (${score}%)` : undefined);
}

// ---------------- Tasks ----------------

export async function createTask(input: {
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  estimatedMin: number;
  deadline: string | null;
  date: string;
}): Promise<Task> {
  const task: Task = {
    id: uid(),
    title: input.title,
    category: input.category,
    priority: input.priority,
    estimatedMin: input.estimatedMin,
    deadline: input.deadline,
    date: input.date,
    done: false,
    doneAt: null,
    pomodoroCount: 0,
    progress: 0,
    createdAt: nowISO(),
  };
  await db.tasks.add(task);
  return task;
}

export async function toggleTaskDone(id: string) {
  const task = await db.tasks.get(id);
  if (!task) return;
  const done = !task.done;
  await db.tasks.update(id, {
    done,
    doneAt: done ? nowISO() : null,
    progress: done ? 100 : task.progress,
  });
  if (done) {
    await awardXP('task_complete', undefined, `Completed: ${task.title}`);
  }
}

export async function deleteTask(id: string) {
  await db.tasks.delete(id);
}

export async function incrementPomodoro(id: string) {
  const task = await db.tasks.get(id);
  if (!task) return;
  await db.tasks.update(id, { pomodoroCount: task.pomodoroCount + 1 });
}

// ---------------- Daily Logs ----------------

export function emptyDailyLog(date: string): DailyLog {
  return {
    id: date,
    date,
    wokeOnTime: null,
    sleepHours: null,
    bedTimeConsistent: null,
    workoutDone: false,
    readingMin: 0,
    meditationMin: 0,
    screenTimeMin: null,
    procrastinationRating: null,
    lateStart: false,
    tasksCompleted: 0,
    tasksMissed: 0,
    studyMin: 0,
    mood: null,
    energy: null,
    journalNotes: '',
    reflection: '',
    wins: '',
    failures: '',
    lessons: '',
    tomorrowFocus: '',
  };
}

export async function getOrCreateDailyLog(date: string): Promise<DailyLog> {
  const existing = await db.dailyLogs.get(date);
  if (existing) return existing;
  const fresh = emptyDailyLog(date);
  await db.dailyLogs.add(fresh);
  return fresh;
}

async function upsertDailyLogPatch(date: string, patcher: (log: DailyLog) => DailyLog) {
  const log = await getOrCreateDailyLog(date);
  const patched = patcher(log);
  await db.dailyLogs.put(patched);
  return patched;
}

export async function updateDailyLog(date: string, patch: Partial<DailyLog>) {
  const log = await getOrCreateDailyLog(date);
  const updated = { ...log, ...patch };
  await db.dailyLogs.put(updated);

  // Award relevant XP for boolean milestones flipping true
  if (patch.wokeOnTime === true && log.wokeOnTime !== true) await awardXP('wake_on_time');
  if (patch.workoutDone === true && log.workoutDone !== true) await awardXP('workout');
  if (patch.meditationMin !== undefined && patch.meditationMin > 0 && log.meditationMin === 0) {
    await awardXP('meditation');
  }
  if (patch.readingMin !== undefined && patch.readingMin > 0 && log.readingMin === 0) {
    await awardXP('reading');
  }

  await maybeAwardPerfectDay(date);
  return updated;
}

async function maybeAwardPerfectDay(date: string) {
  const log = await db.dailyLogs.get(date);
  if (!log) return;
  const tasksForDay = await db.tasks.where('date').equals(date).toArray();
  const allTasksDone = tasksForDay.length > 0 && tasksForDay.every((t) => t.done);
  const isPerfect =
    allTasksDone &&
    log.wokeOnTime === true &&
    log.workoutDone === true &&
    log.studyMin >= 60 &&
    (log.procrastinationRating ?? 3) <= 2;

  if (isPerfect) {
    const alreadyAwarded = await db.xpEvents
      .where('date')
      .equals(date)
      .and((e) => e.source === 'perfect_day')
      .first();
    if (!alreadyAwarded) {
      await awardXP('perfect_day');
    }
  }
}

// ---------------- Goals ----------------

export async function createGoal(input: Omit<Goal, 'id' | 'createdAt' | 'currentValue' | 'completed'>): Promise<Goal> {
  const goal: Goal = {
    ...input,
    id: uid(),
    createdAt: nowISO(),
    currentValue: 0,
    completed: false,
  };
  await db.goals.add(goal);
  return goal;
}

export async function updateGoalProgress(id: string, currentValue: number) {
  const goal = await db.goals.get(id);
  if (!goal) return;
  const completed = currentValue >= goal.targetValue;
  await db.goals.update(id, { currentValue, completed });
}

export async function deleteGoal(id: string) {
  await db.goals.delete(id);
}

// ---------------- Achievements ----------------

export async function checkAchievements() {
  const [sessions, logs, tasks, xpEvents] = await Promise.all([
    db.sessions.toArray(),
    db.dailyLogs.toArray(),
    db.tasks.toArray(),
    db.xpEvents.toArray(),
  ]);

  const totalXP = xpEvents.reduce((s, e) => s + e.amount, 0);
  const level = getLevelInfo(totalXP).level;
  const { current, longest } = computeStreaks(sessions.map((s) => s.date));
  const totalHours = totalStudyHours(sessions);
  const mockTestCount = xpEvents.filter((e) => e.source === 'mock_test').length;
  const revisionCount = xpEvents.filter((e) => e.source === 'revision').length;
  const totalReadingMin = logs.reduce((s, l) => s + l.readingMin, 0);

  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const monthAgo = now - 30 * 86400000;
  const perfectDaysThisWeek = xpEvents.filter(
    (e) => e.source === 'perfect_day' && new Date(e.timestamp).getTime() >= weekAgo
  ).length;
  const perfectDaysThisMonth = xpEvents.filter(
    (e) => e.source === 'perfect_day' && new Date(e.timestamp).getTime() >= monthAgo
  ).length;

  const shouldBeUnlocked = evaluateUnlockedAchievements({
    totalHours,
    currentStreak: current,
    longestStreak: longest,
    level,
    logs,
    sessions,
    tasks,
    mockTestCount,
    revisionCount,
    totalReadingMin,
    perfectDaysThisWeek,
    perfectDaysThisMonth,
  });

  const existing = await db.achievements.toArray();
  const existingIds = new Set(existing.map((a) => a.id));

  for (const def of ACHIEVEMENT_DEFS) {
    if (shouldBeUnlocked.has(def.id) && !existingIds.has(def.id)) {
      await db.achievements.add({ ...def, unlockedAt: nowISO() });
      useUIStore.getState().pushToast({
        title: 'Achievement Unlocked',
        description: def.title,
        variant: 'achievement',
      });
    } else if (!existing.find((a) => a.id === def.id)) {
      // ensure a locked placeholder exists so the UI can render the full list
      await db.achievements.add({ ...def, unlockedAt: null });
    }
  }
}

// ---------------- Data management ----------------

export async function exportAllData(): Promise<string> {
  const data = {
    subjects: await db.subjects.toArray(),
    topics: await db.topics.toArray(),
    sessions: await db.sessions.toArray(),
    tasks: await db.tasks.toArray(),
    xpEvents: await db.xpEvents.toArray(),
    dailyLogs: await db.dailyLogs.toArray(),
    statSnapshots: await db.statSnapshots.toArray(),
    goals: await db.goals.toArray(),
    achievements: await db.achievements.toArray(),
    settings: await db.settings.toArray(),
    exportedAt: nowISO(),
    version: 1,
  };
  return JSON.stringify(data, null, 2);
}

export async function importAllData(json: string) {
  const data = JSON.parse(json);
  await db.transaction(
    'rw',
    [db.subjects, db.topics, db.sessions, db.tasks, db.xpEvents, db.dailyLogs, db.statSnapshots, db.goals, db.achievements, db.settings],
    async () => {
      if (data.subjects) await db.subjects.bulkPut(data.subjects);
      if (data.topics) await db.topics.bulkPut(data.topics);
      if (data.sessions) await db.sessions.bulkPut(data.sessions);
      if (data.tasks) await db.tasks.bulkPut(data.tasks);
      if (data.xpEvents) await db.xpEvents.bulkPut(data.xpEvents);
      if (data.dailyLogs) await db.dailyLogs.bulkPut(data.dailyLogs);
      if (data.statSnapshots) await db.statSnapshots.bulkPut(data.statSnapshots);
      if (data.goals) await db.goals.bulkPut(data.goals);
      if (data.achievements) await db.achievements.bulkPut(data.achievements);
      if (data.settings) await db.settings.bulkPut(data.settings);
    }
  );
}

export async function resetAllData() {
  await db.transaction(
    'rw',
    [db.subjects, db.topics, db.sessions, db.tasks, db.xpEvents, db.dailyLogs, db.statSnapshots, db.goals, db.achievements, db.settings],
    async () => {
      await Promise.all([
        db.subjects.clear(),
        db.topics.clear(),
        db.sessions.clear(),
        db.tasks.clear(),
        db.xpEvents.clear(),
        db.dailyLogs.clear(),
        db.statSnapshots.clear(),
        db.goals.clear(),
        db.achievements.clear(),
      ]);
    }
  );
}

export async function ensureSettings() {
  const existing = await db.settings.get('settings');
  if (!existing) {
    await db.settings.add({
      id: 'settings',
      xpMultiplier: 1,
      pomodoroMin: 25,
      breakMin: 5,
      soundEffects: true,
      animations: true,
      dailyStudyGoalMin: 180,
      levelScalingFactor: 1.06,
      primaryColor: '#3B82F6',
      secondaryColor: '#A855F7',
      accentColor: '#39FF88',
    });
  }
}
