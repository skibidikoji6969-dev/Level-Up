// ============================================================
// PROGRESS//OS — core domain types
// ============================================================

export type TopicStatus = 'not_started' | 'learning' | 'practicing' | 'revising' | 'mastered';

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  status: TopicStatus;
  confidence: number; // 0-100
  difficulty: 1 | 2 | 3 | 4 | 5;
  timeSpentMin: number;
  questionsSolved: number;
  lastRevised: string | null; // ISO date
  revisionIntervalDays: number;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string; // hex accent for charts
  createdAt: string;
}

export interface StudySession {
  id: string;
  subjectId: string;
  topicId: string | null;
  date: string; // ISO date (yyyy-mm-dd)
  startedAt: string; // ISO datetime
  durationMin: number;
  questionsSolved: number;
  focusRating: number; // 1-5
  noPhone: boolean;
  notes?: string;
}

export type TaskCategory = 'study' | 'health' | 'mind' | 'personal' | 'work';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  estimatedMin: number;
  deadline: string | null; // ISO date
  date: string; // the day it's scheduled for, ISO date
  done: boolean;
  doneAt: string | null;
  pomodoroCount: number;
  progress: number; // 0-100
  createdAt: string;
}

export type XPSourceType =
  | 'wake_on_time'
  | 'study_session'
  | 'workout'
  | 'reading'
  | 'meditation'
  | 'no_phone_study'
  | 'revision'
  | 'mock_test'
  | 'perfect_day'
  | 'task_complete'
  | 'manual';

export interface XPEvent {
  id: string;
  amount: number;
  source: XPSourceType;
  label: string;
  date: string; // ISO date
  timestamp: string; // ISO datetime
}

export interface DailyLog {
  id: string; // == date, ISO date, one per day
  date: string;
  wokeOnTime: boolean | null;
  sleepHours: number | null;
  bedTimeConsistent: boolean | null;
  workoutDone: boolean;
  readingMin: number;
  meditationMin: number;
  screenTimeMin: number | null;
  procrastinationRating: number | null; // 1-5, 5 = high procrastination
  lateStart: boolean;
  tasksCompleted: number;
  tasksMissed: number;
  studyMin: number;
  mood: number | null; // 1-5
  energy: number | null; // 1-5
  journalNotes: string;
  reflection: string;
  wins: string;
  failures: string;
  lessons: string;
  tomorrowFocus: string;
}

export interface CharacterStats {
  discipline: number;
  consistency: number;
  focus: number;
  productivity: number;
  energy: number;
  knowledge: number;
  health: number;
  confidence: number;
}

export interface StatSnapshot extends CharacterStats {
  id: string;
  date: string; // ISO date
}

export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Goal {
  id: string;
  title: string;
  period: GoalPeriod;
  targetValue: number;
  currentValue: number;
  unit: string;
  createdAt: string;
  deadline: string | null;
  completed: boolean;
}

export type AchievementId =
  | 'first_session'
  | 'hours_10'
  | 'hours_100'
  | 'hours_500'
  | 'hours_1000'
  | 'streak_7'
  | 'streak_30'
  | 'streak_100'
  | 'no_missed_week'
  | 'early_bird'
  | 'night_owl'
  | 'bookworm'
  | 'perfect_week'
  | 'perfect_month'
  | 'level_10'
  | 'level_25'
  | 'level_50'
  | 'level_100'
  | 'mock_master'
  | 'revision_streak';

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  icon: string; // lucide icon name
  unlockedAt: string | null;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface AppSettings {
  id: 'settings';
  xpMultiplier: number;
  pomodoroMin: number;
  breakMin: number;
  soundEffects: boolean;
  animations: boolean;
  dailyStudyGoalMin: number;
  levelScalingFactor: number; // exponent for level formula
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}
