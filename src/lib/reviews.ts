import type { DailyLog, StudySession, Subject, Task, XPEvent } from '@/types';
import { toISO, addDays, completionPercent } from '@/lib/stats';
import { calculateDisciplineScore } from '@/lib/discipline';
import { getLevelInfo } from '@/lib/xp';

function rangeDates(start: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(start, i));
}

function dayName(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
}

export interface WeeklyReview {
  weekStart: string;
  weekEnd: string;
  totalStudyMin: number;
  avgDailyStudyMin: number;
  bestDay: { date: string; min: number } | null;
  worstDay: { date: string; min: number } | null;
  mostProductiveSubject: { name: string; min: number } | null;
  leastStudiedSubject: { name: string; min: number } | null;
  mostConsistentTime: string | null;
  disciplineTrend: number[]; // one score per day (7)
  completionPct: number;
  streakAtWeekEnd: number;
  xpEarned: number;
  levelStart: number;
  levelEnd: number;
  suggestions: string[];
}

export function computeWeeklyReview(input: {
  weekStart: string; // ISO Sunday
  sessions: StudySession[];
  tasks: Task[];
  logs: DailyLog[];
  subjects: Subject[];
  xpEvents: XPEvent[];
  xpTotalBeforeWeek: number;
}): WeeklyReview {
  const { weekStart, sessions, tasks, logs, subjects, xpEvents, xpTotalBeforeWeek } = input;
  const weekEnd = addDays(weekStart, 6);
  const days = rangeDates(weekStart, 7);

  const weekSessions = sessions.filter((s) => days.includes(s.date));
  const weekTasks = tasks.filter((t) => days.includes(t.date));
  const weekLogs = logs.filter((l) => days.includes(l.date));
  const weekXP = xpEvents.filter((e) => days.includes(e.date));

  const totalStudyMin = weekSessions.reduce((s, x) => s + x.durationMin, 0);
  const avgDailyStudyMin = Math.round(totalStudyMin / 7);

  const perDay = days.map((d) => ({
    date: d,
    min: weekSessions.filter((s) => s.date === d).reduce((s, x) => s + x.durationMin, 0),
  }));
  const active = perDay.filter((d) => d.min > 0);
  const bestDay = active.length ? active.reduce((a, b) => (b.min > a.min ? b : a)) : null;
  const worstDay = active.length ? active.reduce((a, b) => (b.min < a.min ? b : a)) : null;

  const bySubject = subjects
    .map((s) => ({ name: s.name, min: weekSessions.filter((x) => x.subjectId === s.id).reduce((s2, x) => s2 + x.durationMin, 0) }))
    .filter((s) => s.min > 0);
  const mostProductiveSubject = bySubject.length ? bySubject.reduce((a, b) => (b.min > a.min ? b : a)) : null;
  const leastStudiedSubject = bySubject.length ? bySubject.reduce((a, b) => (b.min < a.min ? b : a)) : null;

  const hourBuckets: Record<string, number> = {};
  for (const s of weekSessions) {
    const h = new Date(s.startedAt).getHours();
    const bucket = h < 8 ? 'Early Morning' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night';
    hourBuckets[bucket] = (hourBuckets[bucket] || 0) + 1;
  }
  const mostConsistentTime = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const disciplineTrend = days.map((d, i) => {
    const logsUpToDay = weekLogs.filter((l) => l.date <= d);
    const tasksUpToDay = weekTasks.filter((t) => t.date <= d);
    return calculateDisciplineScore({ logs: logsUpToDay, tasks: tasksUpToDay });
  });

  const completionPct = completionPercent(weekTasks);

  // streak at week end — count consecutive active days ending on weekEnd
  let streakAtWeekEnd = 0;
  let cursor = weekEnd;
  const activeSet = new Set(sessions.map((s) => s.date));
  while (activeSet.has(cursor)) {
    streakAtWeekEnd++;
    cursor = addDays(cursor, -1);
  }

  const xpEarned = weekXP.reduce((s, e) => s + e.amount, 0);
  const levelStart = getLevelInfo(xpTotalBeforeWeek).level;
  const levelEnd = getLevelInfo(xpTotalBeforeWeek + xpEarned).level;

  const suggestions: string[] = [];
  if (leastStudiedSubject && mostProductiveSubject && leastStudiedSubject.name !== mostProductiveSubject.name) {
    suggestions.push(`${leastStudiedSubject.name} got the least attention this week — consider giving it the next available slot.`);
  }
  if (completionPct < 60) {
    suggestions.push('Task completion was under 60% this week. Try trimming your daily list to fewer, higher-impact items.');
  }
  if (worstDay && worstDay.min === 0) {
    suggestions.push(`${dayName(worstDay.date)} had no logged study — a short 20-minute session would keep the streak alive next time.`);
  }
  if (avgDailyStudyMin < 60) {
    suggestions.push('Average daily study was under an hour. Even one extra focused session can shift the weekly total meaningfully.');
  }
  if (suggestions.length === 0) {
    suggestions.push('Strong, balanced week — keep the same rhythm going into next week.');
  }

  return {
    weekStart,
    weekEnd,
    totalStudyMin,
    avgDailyStudyMin,
    bestDay,
    worstDay,
    mostProductiveSubject,
    leastStudiedSubject,
    mostConsistentTime,
    disciplineTrend,
    completionPct,
    streakAtWeekEnd,
    xpEarned,
    levelStart,
    levelEnd,
    suggestions,
  };
}

export interface MonthlyReview {
  monthLabel: string;
  totalHours: number;
  avgHoursPerDay: number;
  subjectsRanked: { name: string; hours: number }[];
  strongestSubject: string | null;
  weakestSubject: string | null;
  longestStreak: number;
  missedDays: number;
  mostProductiveWeekLabel: string;
  mostProductiveWeekHours: number;
  improvementPct: number | null; // vs previous month, by total hours
  xpEarned: number;
  prevMonthXP: number;
}

export function computeMonthlyReview(input: {
  monthKey: string; // yyyy-mm
  sessions: StudySession[];
  subjects: Subject[];
  xpEvents: XPEvent[];
}): MonthlyReview {
  const { monthKey, sessions, subjects, xpEvents } = input;
  const [y, m] = monthKey.split('-').map(Number);
  const monthLabel = new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(y, m, 0).getDate();

  const monthSessions = sessions.filter((s) => s.date.startsWith(monthKey));
  const totalMin = monthSessions.reduce((s, x) => s + x.durationMin, 0);
  const totalHours = totalMin / 60;
  const avgHoursPerDay = totalHours / daysInMonth;

  const subjectsRanked = subjects
    .map((s) => ({ name: s.name, hours: monthSessions.filter((x) => x.subjectId === s.id).reduce((sum, x) => sum + x.durationMin, 0) / 60 }))
    .filter((s) => s.hours > 0)
    .sort((a, b) => b.hours - a.hours);

  const strongestSubject = subjectsRanked[0]?.name ?? null;
  const weakestSubject = subjectsRanked[subjectsRanked.length - 1]?.name ?? null;

  const activeDates = new Set(monthSessions.map((s) => s.date));
  let longestStreak = 0;
  let run = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthKey}-${String(d).padStart(2, '0')}`;
    if (activeDates.has(dateStr)) {
      run++;
      longestStreak = Math.max(longestStreak, run);
    } else {
      run = 0;
    }
  }
  const missedDays = daysInMonth - activeDates.size;

  // most productive week: group by week-of-month (chunks of 7)
  let bestWeekMin = -1;
  let bestWeekIndex = 0;
  for (let w = 0; w < Math.ceil(daysInMonth / 7); w++) {
    const startDay = w * 7 + 1;
    const endDay = Math.min(daysInMonth, startDay + 6);
    let sum = 0;
    for (let d = startDay; d <= endDay; d++) {
      const dateStr = `${monthKey}-${String(d).padStart(2, '0')}`;
      sum += monthSessions.filter((s) => s.date === dateStr).reduce((s2, x) => s2 + x.durationMin, 0);
    }
    if (sum > bestWeekMin) {
      bestWeekMin = sum;
      bestWeekIndex = w;
    }
  }

  const monthXP = xpEvents.filter((e) => e.date.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0);

  // previous month
  const prevDate = new Date(y, m - 2, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const prevSessions = sessions.filter((s) => s.date.startsWith(prevMonthKey));
  const prevHours = prevSessions.reduce((s, x) => s + x.durationMin, 0) / 60;
  const prevMonthXP = xpEvents.filter((e) => e.date.startsWith(prevMonthKey)).reduce((s, e) => s + e.amount, 0);
  const improvementPct = prevHours > 0 ? ((totalHours - prevHours) / prevHours) * 100 : null;

  return {
    monthLabel,
    totalHours,
    avgHoursPerDay,
    subjectsRanked,
    strongestSubject,
    weakestSubject,
    longestStreak,
    missedDays,
    mostProductiveWeekLabel: `Week ${bestWeekIndex + 1}`,
    mostProductiveWeekHours: bestWeekMin / 60,
    improvementPct,
    xpEarned: monthXP,
    prevMonthXP,
  };
}
