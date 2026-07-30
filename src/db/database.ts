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
  AcademicProfile,
  AcademicChapter,
  TopicRevision,
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
  // Sprint 1 — Academic Intelligence
  academicProfile!: Table<AcademicProfile, string>;
  /** @deprecated kept only to avoid dropping any data written by an earlier build; unused going forward. */
  academicChapters!: Table<AcademicChapter, string>;
  topicRevisions!: Table<TopicRevision, string>;

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

    // Sprint 1: additive migration only. Existing v1 stores/data are left
    // completely untouched — Dexie carries forward any table definition
    // that isn't redeclared here.
    this.version(2).stores({
      academicProfile: 'id',
      academicChapters: 'id, goal, subjectName, chapterName, status, nextRevision',
    });

    // Sprint 1 fixes: syllabus chapters now live as real Subject/Topic rows
    // (see lib/actions.ts#generateSyllabusForGoal) instead of a separate
    // academicChapters table. We do NOT delete academicChapters here —
    // deleting a store in a Dexie migration is unnecessary risk for a
    // table nothing reads anymore, and the instruction is "never delete
    // existing user data." We only add the new revision-history table.
    this.version(3).stores({
      topicRevisions: 'id, topicId, date',
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
