import type { Achievement, AchievementId, DailyLog, StudySession, Task } from '@/types';

export const ACHIEVEMENT_DEFS: Omit<Achievement, 'unlockedAt'>[] = [
  { id: 'first_session', title: 'First Step', description: 'Complete your first study session', icon: 'Sparkles', tier: 'bronze' },
  { id: 'hours_10', title: 'Warming Up', description: 'Reach 10 total hours studied', icon: 'Flame', tier: 'bronze' },
  { id: 'hours_100', title: 'Centurion', description: 'Reach 100 total hours studied', icon: 'Flame', tier: 'silver' },
  { id: 'hours_500', title: 'Relentless', description: 'Reach 500 total hours studied', icon: 'Flame', tier: 'gold' },
  { id: 'hours_1000', title: 'Grandmaster', description: 'Reach 1000 total hours studied', icon: 'Trophy', tier: 'platinum' },
  { id: 'streak_7', title: 'One Week Strong', description: 'Maintain a 7-day streak', icon: 'Zap', tier: 'bronze' },
  { id: 'streak_30', title: 'Iron Will', description: 'Maintain a 30-day streak', icon: 'Zap', tier: 'silver' },
  { id: 'streak_100', title: 'Unbreakable', description: 'Maintain a 100-day streak', icon: 'Zap', tier: 'platinum' },
  { id: 'no_missed_week', title: 'Flawless Week', description: 'Complete every task in a 7-day span', icon: 'ShieldCheck', tier: 'silver' },
  { id: 'early_bird', title: 'Early Bird', description: 'Wake on time 10 times', icon: 'Sunrise', tier: 'bronze' },
  { id: 'night_owl', title: 'Night Owl', description: 'Log 10 study sessions after 9PM', icon: 'Moon', tier: 'bronze' },
  { id: 'bookworm', title: 'Bookworm', description: 'Log 500 minutes of reading', icon: 'BookOpen', tier: 'silver' },
  { id: 'perfect_week', title: 'Perfect Week', description: 'Hit a Perfect Day 5+ times in one week', icon: 'Star', tier: 'gold' },
  { id: 'perfect_month', title: 'Perfect Month', description: 'Hit a Perfect Day 20+ times in one month', icon: 'Star', tier: 'platinum' },
  { id: 'level_10', title: 'Rising Hunter', description: 'Reach character level 10', icon: 'Swords', tier: 'bronze' },
  { id: 'level_25', title: 'Seasoned Hunter', description: 'Reach character level 25', icon: 'Swords', tier: 'silver' },
  { id: 'level_50', title: 'Elite Hunter', description: 'Reach character level 50', icon: 'Swords', tier: 'gold' },
  { id: 'level_100', title: 'Sovereign', description: 'Reach character level 100', icon: 'Crown', tier: 'platinum' },
  { id: 'mock_master', title: 'Mock Master', description: 'Complete 10 mock tests', icon: 'ClipboardCheck', tier: 'gold' },
  { id: 'revision_streak', title: 'Retention Expert', description: 'Complete 20 revisions', icon: 'RotateCcw', tier: 'silver' },
];

interface AchievementCheckInput {
  totalHours: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  logs: DailyLog[];
  sessions: StudySession[];
  tasks: Task[];
  mockTestCount: number;
  revisionCount: number;
  totalReadingMin: number;
  perfectDaysThisWeek: number;
  perfectDaysThisMonth: number;
}

/** Returns the set of achievement IDs that SHOULD be unlocked given current data. */
export function evaluateUnlockedAchievements(input: AchievementCheckInput): Set<AchievementId> {
  const unlocked = new Set<AchievementId>();

  if (input.sessions.length >= 1) unlocked.add('first_session');
  if (input.totalHours >= 10) unlocked.add('hours_10');
  if (input.totalHours >= 100) unlocked.add('hours_100');
  if (input.totalHours >= 500) unlocked.add('hours_500');
  if (input.totalHours >= 1000) unlocked.add('hours_1000');

  if (input.longestStreak >= 7) unlocked.add('streak_7');
  if (input.longestStreak >= 30) unlocked.add('streak_30');
  if (input.longestStreak >= 100) unlocked.add('streak_100');

  const wokeOnTimeCount = input.logs.filter((l) => l.wokeOnTime).length;
  if (wokeOnTimeCount >= 10) unlocked.add('early_bird');

  const nightSessions = input.sessions.filter((s) => new Date(s.startedAt).getHours() >= 21).length;
  if (nightSessions >= 10) unlocked.add('night_owl');

  if (input.totalReadingMin >= 500) unlocked.add('bookworm');

  if (input.perfectDaysThisWeek >= 5) unlocked.add('perfect_week');
  if (input.perfectDaysThisMonth >= 20) unlocked.add('perfect_month');

  if (input.level >= 10) unlocked.add('level_10');
  if (input.level >= 25) unlocked.add('level_25');
  if (input.level >= 50) unlocked.add('level_50');
  if (input.level >= 100) unlocked.add('level_100');

  if (input.mockTestCount >= 10) unlocked.add('mock_master');
  if (input.revisionCount >= 20) unlocked.add('revision_streak');

  // No-missed-task week: look at the most recent 7 days of tasks
  const last7 = input.tasks.filter((t) => {
    const days = (Date.now() - new Date(t.date).getTime()) / 86400000;
    return days <= 7;
  });
  if (last7.length >= 5 && last7.every((t) => t.done)) unlocked.add('no_missed_week');

  return unlocked;
}
