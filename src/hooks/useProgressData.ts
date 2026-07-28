import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayISO } from '@/db/database';
import { getLevelInfo, getRank } from '@/lib/xp';
import { calculateDisciplineScore, disciplineColor, disciplineLabel } from '@/lib/discipline';
import { computeCharacterStats } from '@/lib/characterStats';
import { computeStreaks, totalStudyHours, completionPercent } from '@/lib/stats';

const DAY = 86400000;

export function useProgressData() {
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) ?? [];
  const topics = useLiveQuery(() => db.topics.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const xpEvents = useLiveQuery(() => db.xpEvents.toArray(), []) ?? [];
  const dailyLogs = useLiveQuery(() => db.dailyLogs.toArray(), []) ?? [];
  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? [];
  const achievements = useLiveQuery(() => db.achievements.toArray(), []) ?? [];
  const settings = useLiveQuery(() => db.settings.get('settings'), []);

  const totalXP = xpEvents.reduce((s, e) => s + e.amount, 0);
  const levelInfo = getLevelInfo(totalXP);
  const rank = getRank(levelInfo.level);

  const now = Date.now();
  const last30Logs = dailyLogs.filter((l) => now - new Date(l.date).getTime() <= 30 * DAY);
  const last30Tasks = tasks.filter((t) => now - new Date(t.date).getTime() <= 30 * DAY);

  const disciplineScore = calculateDisciplineScore({ logs: last30Logs, tasks: last30Tasks });

  const { current: currentStreak, longest: longestStreak } = computeStreaks(sessions.map((s) => s.date));

  const characterStats = computeCharacterStats({
    logs: last30Logs,
    sessions: sessions.filter((s) => now - new Date(s.date).getTime() <= 30 * DAY),
    tasks: last30Tasks,
    topics,
    disciplineScore,
  });

  const today = todayISO();
  const todayLog = dailyLogs.find((l) => l.date === today);
  const todayStudyMin = sessions.filter((s) => s.date === today).reduce((s, x) => s + x.durationMin, 0);

  const weekAgo = now - 7 * DAY;
  const monthAgo = now - 30 * DAY;
  const weeklyXP = xpEvents.filter((e) => new Date(e.timestamp).getTime() >= weekAgo).reduce((s, e) => s + e.amount, 0);
  const monthlyXP = xpEvents.filter((e) => new Date(e.timestamp).getTime() >= monthAgo).reduce((s, e) => s + e.amount, 0);
  const dailyXP = xpEvents.filter((e) => e.date === today).reduce((s, e) => s + e.amount, 0);

  const weeklyTasks = tasks.filter((t) => now - new Date(t.date).getTime() <= 7 * DAY);
  const monthlyTasks = tasks.filter((t) => now - new Date(t.date).getTime() <= 30 * DAY);

  return {
    subjects,
    topics,
    sessions,
    tasks,
    xpEvents,
    dailyLogs,
    goals,
    achievements,
    settings,
    totalXP,
    levelInfo,
    rank,
    disciplineScore,
    disciplineColor: disciplineColor(disciplineScore),
    disciplineLabel: disciplineLabel(disciplineScore),
    currentStreak,
    longestStreak,
    characterStats,
    todayLog,
    todayStudyMin,
    dailyXP,
    weeklyXP,
    monthlyXP,
    dailyScore: Math.min(100, Math.round(dailyXP / 2)),
    weeklyScore: completionPercent(weeklyTasks),
    monthlyScore: completionPercent(monthlyTasks),
    overallCompletion: completionPercent(tasks),
    totalHours: totalStudyHours(sessions),
  };
}
