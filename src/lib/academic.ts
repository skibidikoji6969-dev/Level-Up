import type { Subject, Topic } from '@/types';

// ============================================================
// Countdown
// ============================================================
export interface CountdownResult {
  daysLeft: number;
  hoursLeft: number;
  minutesLeft: number;
  totalHoursLeft: number;
  isPast: boolean;
}

export function computeCountdown(examDateISO: string | null, now: number = Date.now()): CountdownResult | null {
  if (!examDateISO) return null;
  const target = new Date(examDateISO).getTime();
  const diffMs = target - now;
  const isPast = diffMs <= 0;
  const abs = Math.abs(diffMs);

  const totalHoursLeft = abs / 3_600_000;
  const daysLeft = Math.floor(abs / 86_400_000);
  const hoursLeft = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutesLeft = Math.floor((abs % 3_600_000) / 60_000);

  return { daysLeft, hoursLeft, minutesLeft, totalHoursLeft, isPast };
}

// Baseline assumed study hours per chapter, used only to estimate remaining
// workload for the countdown widget. Topics don't store a per-chapter
// estimate (Fix 1 didn't ask for one), so this is an explicit, disclosed
// assumption rather than a hidden guess.
export const ASSUMED_HOURS_PER_CHAPTER = 6;

export interface PaceResult {
  projectedCompletionPct: number;
  requiredDailyStudyHours: number;
  estimatedRemainingHours: number;
}

export function computeStudyPace(topics: Topic[], countdown: CountdownResult | null): PaceResult {
  const completedFraction = topics.length
    ? topics.reduce((s, t) => s + (t.completionPct ?? 0) / 100, 0) / topics.length
    : 0;

  const estimatedRemainingHours = topics.reduce(
    (sum, t) => sum + ASSUMED_HOURS_PER_CHAPTER * (1 - (t.completionPct ?? 0) / 100),
    0
  );

  if (!countdown || countdown.isPast || countdown.daysLeft <= 0) {
    return {
      projectedCompletionPct: Math.round(completedFraction * 100),
      requiredDailyStudyHours: 0,
      estimatedRemainingHours: Math.round(estimatedRemainingHours),
    };
  }

  return {
    projectedCompletionPct: Math.round(completedFraction * 100),
    requiredDailyStudyHours: Math.round((estimatedRemainingHours / countdown.daysLeft) * 10) / 10,
    estimatedRemainingHours: Math.round(estimatedRemainingHours),
  };
}

// ============================================================
// FIX 3 — Centralized Readiness Formula
// This is the ONLY place readiness is calculated. Every page/component
// must import computeTopicReadiness / computeSubjectReadiness /
// computeOverallReadiness from here rather than re-deriving its own score.
// ============================================================

const READINESS_WEIGHTS = {
  completion: 0.3,
  questionsSolved: 0.15,
  revisionCount: 0.15,
  confidence: 0.2,
  studyHours: 0.1,
  spacedRepetition: 0.1,
};

/** Normalizes questions solved into a 0-100 score (soft cap at 50 questions). */
function questionsScore(questionsSolved: number): number {
  return Math.max(0, Math.min(100, (questionsSolved / 50) * 100));
}

/** Normalizes revision count into a 0-100 score (soft cap at 5 revisions). */
function revisionScore(revisionCount: number): number {
  return Math.max(0, Math.min(100, (revisionCount / 5) * 100));
}

/** Normalizes time spent into a 0-100 score (soft cap at 10 hours). */
function studyHoursScore(timeSpentMin: number): number {
  const hours = timeSpentMin / 60;
  return Math.max(0, Math.min(100, (hours / 10) * 100));
}

/**
 * Spaced-repetition score: rewards chapters that are on schedule for
 * revision and penalizes chapters that are overdue. Neutral (50) if the
 * topic has no revision schedule yet.
 */
function spacedRepetitionScore(nextRevision: string | null | undefined, now: number = Date.now()): number {
  if (!nextRevision) return 50;
  const dueTime = new Date(nextRevision).getTime();
  const overdueDays = (now - dueTime) / 86_400_000;
  if (overdueDays <= 0) return 100; // not yet due / on schedule
  // linearly decay to 0 by 14 days overdue
  return Math.max(0, 100 - (overdueDays / 14) * 100);
}

/** THE single readiness formula. Returns a 0-100 score for one topic/chapter. */
export function computeTopicReadiness(topic: Topic, now: number = Date.now()): number {
  const completion = topic.completionPct ?? 0;
  const questions = questionsScore(topic.questionsSolved ?? 0);
  const revisions = revisionScore(topic.revisionCount ?? 0);
  const confidence = topic.confidence ?? 0; // already 0-100
  const studyHours = studyHoursScore(topic.timeSpentMin ?? 0);
  const spacedRep = spacedRepetitionScore(topic.nextRevision, now);

  const score =
    completion * READINESS_WEIGHTS.completion +
    questions * READINESS_WEIGHTS.questionsSolved +
    revisions * READINESS_WEIGHTS.revisionCount +
    confidence * READINESS_WEIGHTS.confidence +
    studyHours * READINESS_WEIGHTS.studyHours +
    spacedRep * READINESS_WEIGHTS.spacedRepetition;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export interface SubjectReadiness {
  subjectName: string;
  readiness: number; // 0-100
  chapterCount: number;
}

export function computeSubjectReadiness(topics: Topic[], subjectNameOf: (t: Topic) => string): SubjectReadiness[] {
  const bySubject = new Map<string, Topic[]>();
  for (const t of topics) {
    const name = subjectNameOf(t);
    const list = bySubject.get(name) ?? [];
    list.push(t);
    bySubject.set(name, list);
  }

  return Array.from(bySubject.entries()).map(([subjectName, list]) => ({
    subjectName,
    readiness: list.length ? Math.round(list.reduce((s, t) => s + computeTopicReadiness(t), 0) / list.length) : 0,
    chapterCount: list.length,
  }));
}

export function computeOverallReadiness(topics: Topic[]): number {
  if (!topics.length) return 0;
  return Math.round(topics.reduce((s, t) => s + computeTopicReadiness(t), 0) / topics.length);
}

// ============================================================
// FIX 2 — Real analytics (no placeholders). Every field below is derived
// directly from stored Subject/Topic/Session data passed in by the caller.
// ============================================================
export interface TopicWithSubject extends Topic {
  subjectName: string;
}

export interface AcademicAnalytics {
  subjectReadiness: SubjectReadiness[];
  overallReadiness: number;
  weakestSubject: SubjectReadiness | null;
  strongestSubject: SubjectReadiness | null;
  weakestChapter: TopicWithSubject | null;
  strongestChapter: TopicWithSubject | null;
  mostIgnoredChapter: TopicWithSubject | null;
  mostRevisedChapter: TopicWithSubject | null;
  highestConfidenceChapter: TopicWithSubject | null;
  lowestConfidenceChapter: TopicWithSubject | null;
  totalQuestionsSolved: number;
  totalStudyHours: number;
  revisionProgressPct: number; // % of chapters revised at least once
}

export function computeAcademicAnalytics(subjects: Subject[], topics: Topic[]): AcademicAnalytics {
  const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));
  const withSubject: TopicWithSubject[] = topics.map((t) => ({
    ...t,
    subjectName: subjectNameById.get(t.subjectId) ?? 'Unknown',
  }));

  if (!withSubject.length) {
    return {
      subjectReadiness: [],
      overallReadiness: 0,
      weakestSubject: null,
      strongestSubject: null,
      weakestChapter: null,
      strongestChapter: null,
      mostIgnoredChapter: null,
      mostRevisedChapter: null,
      highestConfidenceChapter: null,
      lowestConfidenceChapter: null,
      totalQuestionsSolved: 0,
      totalStudyHours: 0,
      revisionProgressPct: 0,
    };
  }

  const subjectReadiness = computeSubjectReadiness(withSubject, (t) => t.subjectName);
  const overallReadiness = computeOverallReadiness(withSubject);

  const weakestSubject = subjectReadiness.reduce((min, s) => (s.readiness < min.readiness ? s : min), subjectReadiness[0]);
  const strongestSubject = subjectReadiness.reduce((max, s) => (s.readiness > max.readiness ? s : max), subjectReadiness[0]);

  const readinessOf = (t: Topic) => computeTopicReadiness(t);
  const weakestChapter = withSubject.reduce((min, t) => (readinessOf(t) < readinessOf(min) ? t : min), withSubject[0]);
  const strongestChapter = withSubject.reduce((max, t) => (readinessOf(t) > readinessOf(max) ? t : max), withSubject[0]);

  const mostIgnoredChapter = withSubject.reduce((oldest, t) => {
    const tTime = t.lastRevised ? new Date(t.lastRevised).getTime() : 0;
    const oldestTime = oldest.lastRevised ? new Date(oldest.lastRevised).getTime() : 0;
    return tTime < oldestTime ? t : oldest;
  }, withSubject[0]);

  const mostRevisedChapter = withSubject.reduce(
    (max, t) => ((t.revisionCount ?? 0) > (max.revisionCount ?? 0) ? t : max),
    withSubject[0]
  );

  const highestConfidenceChapter = withSubject.reduce((max, t) => (t.confidence > max.confidence ? t : max), withSubject[0]);
  const lowestConfidenceChapter = withSubject.reduce((min, t) => (t.confidence < min.confidence ? t : min), withSubject[0]);

  const totalQuestionsSolved = withSubject.reduce((s, t) => s + (t.questionsSolved ?? 0), 0);
  const totalStudyHours = Math.round((withSubject.reduce((s, t) => s + (t.timeSpentMin ?? 0), 0) / 60) * 10) / 10;
  const revisedCount = withSubject.filter((t) => (t.revisionCount ?? 0) > 0).length;
  const revisionProgressPct = Math.round((revisedCount / withSubject.length) * 100);

  return {
    subjectReadiness,
    overallReadiness,
    weakestSubject,
    strongestSubject,
    weakestChapter,
    strongestChapter,
    mostIgnoredChapter,
    mostRevisedChapter,
    highestConfidenceChapter,
    lowestConfidenceChapter,
    totalQuestionsSolved,
    totalStudyHours,
    revisionProgressPct,
  };
}
