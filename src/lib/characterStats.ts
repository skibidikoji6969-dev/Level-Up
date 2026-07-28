import type { CharacterStats, DailyLog, StudySession, Task, Topic } from '@/types';

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Derives the 8 RPG-style character stats from raw activity data
 * over a rolling window (typically the last 14-30 days).
 */
export function computeCharacterStats(input: {
  logs: DailyLog[];
  sessions: StudySession[];
  tasks: Task[];
  topics: Topic[];
  disciplineScore: number;
}): CharacterStats {
  const { logs, sessions, tasks, topics, disciplineScore } = input;

  // Discipline — directly from the discipline engine
  const discipline = disciplineScore;

  // Consistency — active-day ratio across the window
  const activeDays = new Set(sessions.map((s) => s.date)).size;
  const consistency = clamp((activeDays / Math.max(1, logs.length || 14)) * 100);

  // Focus — average focus rating from sessions (1-5) + no-phone bonus
  const focusRatings = sessions.filter((s) => s.focusRating);
  const avgFocus = focusRatings.length
    ? focusRatings.reduce((s, x) => s + x.focusRating, 0) / focusRatings.length
    : 3;
  const noPhoneRatio = sessions.length
    ? sessions.filter((s) => s.noPhone).length / sessions.length
    : 0;
  const focus = clamp(((avgFocus - 1) / 4) * 80 + noPhoneRatio * 20);

  // Productivity — task completion rate + task volume signal
  const doneCount = tasks.filter((t) => t.done).length;
  const completionRate = tasks.length ? doneCount / tasks.length : 0.5;
  const productivity = clamp(completionRate * 85 + Math.min(15, doneCount / 2));

  // Energy — from logs' self-reported energy + sleep + workout signal
  const energyLogs = logs.filter((l) => l.energy !== null);
  const avgEnergy = energyLogs.length
    ? energyLogs.reduce((s, l) => s + (l.energy ?? 3), 0) / energyLogs.length
    : 3;
  const workoutRatio = logs.length
    ? logs.filter((l) => l.workoutDone).length / logs.length
    : 0;
  const energy = clamp(((avgEnergy - 1) / 4) * 70 + workoutRatio * 30);

  // Knowledge — mastery-weighted topic progress + total study hours signal
  const masteryWeights: Record<string, number> = {
    not_started: 0,
    learning: 25,
    practicing: 55,
    revising: 75,
    mastered: 100,
  };
  const avgMastery = topics.length
    ? topics.reduce((s, t) => s + (masteryWeights[t.status] ?? 0), 0) / topics.length
    : 0;
  const totalStudyHours = sessions.reduce((s, x) => s + x.durationMin, 0) / 60;
  const knowledge = clamp(avgMastery * 0.7 + Math.min(30, totalStudyHours));

  // Health — workout + reading + sleep consistency + low screen time
  const sleepDays = logs.filter((l) => l.bedTimeConsistent !== null);
  const sleepRatio = sleepDays.length
    ? sleepDays.filter((l) => l.bedTimeConsistent).length / sleepDays.length
    : 0.5;
  const screenDays = logs.filter((l) => l.screenTimeMin !== null);
  const avgScreen = screenDays.length
    ? screenDays.reduce((s, l) => s + (l.screenTimeMin ?? 0), 0) / screenDays.length
    : 120;
  const screenHealthScore = clamp(100 - (avgScreen / 240) * 100);
  const health = clamp(
    workoutRatio * 35 + sleepRatio * 35 + (screenHealthScore / 100) * 30
  );

  // Confidence — average topic confidence + mood signal
  const avgTopicConfidence = topics.length
    ? topics.reduce((s, t) => s + t.confidence, 0) / topics.length
    : 50;
  const moodLogs = logs.filter((l) => l.mood !== null);
  const avgMood = moodLogs.length
    ? moodLogs.reduce((s, l) => s + (l.mood ?? 3), 0) / moodLogs.length
    : 3;
  const confidence = clamp(avgTopicConfidence * 0.6 + ((avgMood - 1) / 4) * 100 * 0.4);

  return {
    discipline,
    consistency,
    focus,
    productivity,
    energy,
    knowledge,
    health,
    confidence,
  };
}
