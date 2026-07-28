import type { DailyLog, StudySession, Subject, Task } from '@/types';

export interface Insight {
  id: string;
  text: string;
  tone: 'positive' | 'neutral' | 'warning';
  category: string;
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function dayName(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Fully offline, rule-based pattern analysis over local data.
 * No network calls, no external AI — just statistics over your
 * own history, phrased as plain-language observations.
 */
export function generateInsights(input: {
  sessions: StudySession[];
  logs: DailyLog[];
  tasks: Task[];
  subjects: Subject[];
}): Insight[] {
  const { sessions, logs, tasks, subjects } = input;
  const insights: Insight[] = [];
  let idx = 0;
  const push = (text: string, tone: Insight['tone'], category: string) => {
    insights.push({ id: `insight-${idx++}`, text, tone, category });
  };

  if (sessions.length < 3) {
    push(
      'Not enough session history yet — log a few more study sessions and sharper insights will start appearing here.',
      'neutral',
      'General'
    );
    return insights;
  }

  // --- Trend: study efficiency (questions solved per hour) over time ---
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const half = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, half);
  const secondHalf = sorted.slice(half);
  const effRate = (arr: StudySession[]) => {
    const totalMin = arr.reduce((s, x) => s + x.durationMin, 0);
    const totalQ = arr.reduce((s, x) => s + x.questionsSolved, 0);
    return totalMin > 0 ? totalQ / (totalMin / 60) : 0;
  };
  const effFirst = effRate(firstHalf);
  const effSecond = effRate(secondHalf);
  if (effFirst > 0 && effSecond > 0) {
    const change = ((effSecond - effFirst) / effFirst) * 100;
    if (change > 8) {
      push(
        `Your study efficiency is increasing — you're solving roughly ${Math.round(change)}% more questions per hour than earlier in your history.`,
        'positive',
        'Efficiency'
      );
    } else if (change < -8) {
      push(
        `Your study efficiency has dipped about ${Math.round(Math.abs(change))}% recently. Worth checking sleep, screen time, or session length.`,
        'warning',
        'Efficiency'
      );
    }
  }

  // --- Best performing time window ---
  const hourBuckets: Record<string, number[]> = {
    'Early Morning (5-8AM)': [],
    'Morning (8-12PM)': [],
    'Afternoon (12-5PM)': [],
    'Evening (5-9PM)': [],
    'Night (9PM-1AM)': [],
  };
  for (const s of sessions) {
    const h = new Date(s.startedAt).getHours();
    const rate = s.durationMin > 0 ? s.questionsSolved / (s.durationMin / 60) : 0;
    if (h >= 5 && h < 8) hourBuckets['Early Morning (5-8AM)'].push(rate);
    else if (h >= 8 && h < 12) hourBuckets['Morning (8-12PM)'].push(rate);
    else if (h >= 12 && h < 17) hourBuckets['Afternoon (12-5PM)'].push(rate);
    else if (h >= 17 && h < 21) hourBuckets['Evening (5-9PM)'].push(rate);
    else hourBuckets['Night (9PM-1AM)'].push(rate);
  }
  let bestWindow = '';
  let bestScore = -1;
  for (const [window, rates] of Object.entries(hourBuckets)) {
    if (rates.length >= 3 && avg(rates) > bestScore) {
      bestScore = avg(rates);
      bestWindow = window;
    }
  }
  if (bestWindow) {
    push(`You perform noticeably better during ${bestWindow} — consider scheduling deep-focus subjects there.`, 'positive', 'Timing');
  }

  // --- Per-subject trend (last 14 days vs prior 14) ---
  const now = Date.now();
  for (const subj of subjects) {
    const subjSessions = sessions.filter((s) => s.subjectId === subj.id);
    if (subjSessions.length < 4) continue;
    const recent = subjSessions.filter((s) => (now - new Date(s.date).getTime()) / 86400000 <= 14);
    const prior = subjSessions.filter((s) => {
      const days = (now - new Date(s.date).getTime()) / 86400000;
      return days > 14 && days <= 28;
    });
    const recentMin = recent.reduce((s, x) => s + x.durationMin, 0);
    const priorMin = prior.reduce((s, x) => s + x.durationMin, 0);
    if (priorMin > 0) {
      const change = ((recentMin - priorMin) / priorMin) * 100;
      if (change > 15) {
        push(`${subj.name} productivity has increased by ${Math.round(change)}% over the last two weeks.`, 'positive', subj.name);
      } else if (change < -20) {
        push(`${subj.name} time has dropped ${Math.round(Math.abs(change))}% compared to two weeks ago — it may be sliding off your radar.`, 'warning', subj.name);
      }
    }
  }

  // --- Day-of-week skip pattern per subject ---
  for (const subj of subjects) {
    const subjSessions = sessions.filter((s) => s.subjectId === subj.id);
    if (subjSessions.length < 6) continue;
    const dayCounts: Record<string, number> = {};
    for (const s of subjSessions) {
      const d = dayName(s.date);
      dayCounts[d] = (dayCounts[d] || 0) + 1;
    }
    const totalDays = Object.values(dayCounts).reduce((a, b) => a + b, 0);
    const weakestDay = Object.entries(dayCounts).sort((a, b) => a[1] - b[1])[0];
    if (weakestDay && totalDays >= 6 && weakestDay[1] === 0) {
      // handled below by absence check
    }
  }
  // Absence check: days of week with zero sessions for a subject that's studied elsewhere
  const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (const subj of subjects) {
    const subjSessions = sessions.filter((s) => s.subjectId === subj.id);
    if (subjSessions.length < 8) continue;
    const daysCovered = new Set(subjSessions.map((s) => dayName(s.date)));
    const missingWeekdays = allDays.filter((d) => !daysCovered.has(d));
    // Look for a specific "day after X" pattern: e.g. missing Thursday consistently after Wednesday sessions elsewhere
    if (missingWeekdays.length > 0 && missingWeekdays.length <= 3) {
      push(`You tend to skip ${subj.name} on ${missingWeekdays.join(' and ')} — worth a deliberate short session on those days.`, 'neutral', subj.name);
    }
  }

  // --- Sleep vs discipline correlation ---
  const sleepLogs = logs.filter((l) => l.sleepHours !== null);
  if (sleepLogs.length >= 6) {
    const poorSleepDays = sleepLogs.filter((l) => (l.sleepHours ?? 8) < 6);
    const goodSleepDays = sleepLogs.filter((l) => (l.sleepHours ?? 8) >= 7);
    const poorAvgStudy = avg(poorSleepDays.map((l) => l.studyMin));
    const goodAvgStudy = avg(goodSleepDays.map((l) => l.studyMin));
    if (poorSleepDays.length >= 3 && goodSleepDays.length >= 3 && goodAvgStudy > poorAvgStudy * 1.15) {
      push('Your discipline and study output fall noticeably after nights of poor sleep. Protecting your sleep window may be your highest-leverage habit.', 'warning', 'Sleep');
    }
  }

  // --- Procrastination pattern ---
  const procLogs = logs.filter((l) => l.procrastinationRating !== null);
  if (procLogs.length >= 5) {
    const avgProc = avg(procLogs.map((l) => l.procrastinationRating ?? 3));
    if (avgProc >= 3.5) {
      push('Procrastination ratings have been elevated lately. Try starting your hardest task first, before checking your phone.', 'warning', 'Focus');
    } else if (avgProc <= 2) {
      push('Procrastination has been consistently low recently — whatever your current routine is, it is working.', 'positive', 'Focus');
    }
  }

  // --- Task completion trend ---
  if (tasks.length >= 10) {
    const recentTasks = tasks.filter((t) => (now - new Date(t.date).getTime()) / 86400000 <= 7);
    const priorTasks = tasks.filter((t) => {
      const days = (now - new Date(t.date).getTime()) / 86400000;
      return days > 7 && days <= 14;
    });
    const rate = (arr: Task[]) => (arr.length ? arr.filter((t) => t.done).length / arr.length : 0);
    const recentRate = rate(recentTasks);
    const priorRate = rate(priorTasks);
    if (priorTasks.length >= 3) {
      if (recentRate > priorRate + 0.1) {
        push(`Task completion is up this week (${Math.round(recentRate * 100)}% vs ${Math.round(priorRate * 100)}% last week). Momentum is building.`, 'positive', 'Tasks');
      } else if (recentRate < priorRate - 0.1) {
        push(`Task completion dipped this week (${Math.round(recentRate * 100)}% vs ${Math.round(priorRate * 100)}% last week). A lighter daily list might help rebuild momentum.`, 'warning', 'Tasks');
      }
    }
  }

  // --- Session length sweet spot ---
  if (sessions.length >= 8) {
    const buckets = { short: [] as number[], medium: [] as number[], long: [] as number[] };
    for (const s of sessions) {
      const rate = s.durationMin > 0 ? s.questionsSolved / (s.durationMin / 60) : 0;
      if (s.durationMin < 30) buckets.short.push(rate);
      else if (s.durationMin <= 60) buckets.medium.push(rate);
      else buckets.long.push(rate);
    }
    const scored = Object.entries(buckets)
      .filter(([, v]) => v.length >= 3)
      .map(([k, v]) => [k, avg(v)] as const)
      .sort((a, b) => b[1] - a[1]);
    if (scored.length) {
      const labelMap: Record<string, string> = { short: 'under 30 minutes', medium: '30-60 minutes', long: 'over an hour' };
      push(`Sessions ${labelMap[scored[0][0]]} tend to be your most productive length, based on questions solved per hour.`, 'neutral', 'Sessions');
    }
  }

  // --- Streak momentum ---
  const activeDates = new Set(sessions.map((s) => s.date));
  const last7Dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });
  const activeLast7 = last7Dates.filter((d) => activeDates.has(d)).length;
  if (activeLast7 >= 6) {
    push('You have shown up almost every day this week — this is exactly the kind of consistency that compounds into real mastery.', 'positive', 'Momentum');
  } else if (activeLast7 <= 2) {
    push('Only a couple of active days this week. A short, low-pressure session tomorrow can restart momentum without needing a "perfect" comeback.', 'warning', 'Momentum');
  }

  if (insights.length === 0) {
    push('Your patterns look stable right now — no strong trends detected yet. Keep logging and sharper insights will surface.', 'neutral', 'General');
  }

  return insights;
}
