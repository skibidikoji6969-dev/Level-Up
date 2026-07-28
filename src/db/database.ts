import Dexie, { type Table } from 'dexie';
import type {
  Subject,
  Topic,
  StudySession,
  Task,
  XPEvent,
  DailyLog,
  StatSnapshot,
  Goal,
  Achievement,
  AppSettings,
} from '@/types';

// ============================================================
// PROGRESS//OS local database (IndexedDB via Dexie)
// Everything lives on-device. No network calls are ever made.
// ============================================================
export class ProgressDB extends Dexie {
  subjects!: Table<Subject, string>;
  topics!: Table<Topic, string>;
  sessions!: Table<StudySession, string>;
  tasks!: Table<Task, string>;
  xpEvents!: Table<XPEvent, string>;
  dailyLogs!: Table<DailyLog, string>;
  statSnapshots!: Table<StatSnapshot, string>;
  goals!: Table<Goal, string>;
  achievements!: Table<Achievement, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('progress-os-db');
    this.version(1).stores({
      subjects: 'id, name, createdAt',
      topics: 'id, subjectId, status, name',
      sessions: 'id, subjectId, topicId, date, startedAt',
      tasks: 'id, date, done, category, priority',
      xpEvents: 'id, date, source, timestamp',
      dailyLogs: 'id, date',
      statSnapshots: 'id, date',
      goals: 'id, period, completed',
      achievements: 'id, unlockedAt',
      settings: 'id',
    });
  }
}

export const db = new ProgressDB();

export function uid(): string {
  return crypto.randomUUID();
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowISO(): string {
  return new Date().toISOString();
}
