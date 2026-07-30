import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { Clock, TrendingDown, TrendingUp, Frown, Repeat, GraduationCap, BookOpenCheck } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { db } from '@/db/database';
import { computeCountdown, computeStudyPace, computeAcademicAnalytics } from '@/lib/academic';

const GOAL_LABELS: Record<string, string> = {
  jee_main: 'JEE Main',
  jee_advanced: 'JEE Advanced',
  neet: 'NEET',
  class_11: 'Class 11',
  class_12: 'Class 12',
  custom: 'Custom Goal',
};

export default function AcademicDashboard() {
  const profile = useLiveQuery(() => db.academicProfile.get('academic'), []);
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) ?? [];
  const topics = useLiveQuery(() => db.topics.toArray(), []) ?? [];

  if (!profile) return null;

  const countdown = computeCountdown(profile.examDate);
  const pace = computeStudyPace(topics, countdown);
  const analytics = computeAcademicAnalytics(subjects, topics);

  const goalLabel =
    profile.goal === 'custom' ? profile.customGoalName || 'Custom Goal' : GOAL_LABELS[profile.goal ?? ''] ?? '—';

  const preferredOrder = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
  const orderedSubjects = [...analytics.subjectReadiness].sort(
    (a, b) => preferredOrder.indexOf(a.subjectName) - preferredOrder.indexOf(b.subjectName)
  );
  const topThree = orderedSubjects.slice(0, 3);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Academic Intelligence</h1>
          <p className="text-white/40 text-sm mt-1 flex items-center gap-1.5">
            <GraduationCap size={14} /> {goalLabel}
          </p>
        </div>
      </header>

      {/* Countdown */}
      <GlassCard glow="blue">
        <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
          <Clock size={14} /> Countdown to {goalLabel}
        </h2>
        {!profile.examDate || !countdown ? (
          <p className="text-white/40 text-sm">
            No exam date set yet. Add one from <span className="text-electric">Settings → Academic</span>.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <CountdownBlock label="Days" value={countdown.daysLeft} />
              <CountdownBlock label="Hours" value={countdown.hoursLeft} />
              <CountdownBlock label="Minutes" value={countdown.minutesLeft} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <StatRow label="Projected Completion" value={`${pace.projectedCompletionPct}%`} />
              <StatRow label="Required Study Pace" value={`${pace.requiredDailyStudyHours} hrs/day`} />
              <StatRow label="Estimated Remaining Hours" value={`${pace.estimatedRemainingHours} hrs`} />
            </div>
          </>
        )}
      </GlassCard>

      {/* Readiness Meter */}
      <div>
        <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-3">Readiness Meter</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {topThree.map((s) => (
            <ReadinessCard key={s.subjectName} label={`${s.subjectName} Readiness`} value={s.readiness} />
          ))}
          <ReadinessCard label="Overall Readiness" value={analytics.overallReadiness} highlight />
        </div>
      </div>

      {/* Real Analytics (Fix 2) */}
      <div>
        <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-3">Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InsightCard
            icon={TrendingDown}
            glow="blue"
            title="Weakest Subject"
            value={analytics.weakestSubject ? `${analytics.weakestSubject.subjectName} (${analytics.weakestSubject.readiness}%)` : '—'}
          />
          <InsightCard
            icon={TrendingUp}
            glow="green"
            title="Strongest Subject"
            value={analytics.strongestSubject ? `${analytics.strongestSubject.subjectName} (${analytics.strongestSubject.readiness}%)` : '—'}
          />
          <InsightCard
            icon={TrendingDown}
            glow="purple"
            title="Weakest Chapter"
            value={analytics.weakestChapter?.name ?? '—'}
            subtitle={analytics.weakestChapter?.subjectName}
          />
          <InsightCard
            icon={TrendingUp}
            glow="green"
            title="Strongest Chapter"
            value={analytics.strongestChapter?.name ?? '—'}
            subtitle={analytics.strongestChapter?.subjectName}
          />
          <InsightCard
            icon={Frown}
            glow="purple"
            title="Most Ignored Chapter"
            value={analytics.mostIgnoredChapter?.name ?? '—'}
            subtitle={analytics.mostIgnoredChapter?.lastRevised ? `Last studied ${analytics.mostIgnoredChapter.lastRevised}` : 'Never studied'}
          />
          <InsightCard
            icon={Repeat}
            glow="blue"
            title="Most Revised Chapter"
            value={analytics.mostRevisedChapter?.name ?? '—'}
            subtitle={analytics.mostRevisedChapter ? `${analytics.mostRevisedChapter.revisionCount ?? 0} revisions` : undefined}
          />
          <InsightCard
            icon={TrendingUp}
            glow="green"
            title="Highest Confidence Chapter"
            value={analytics.highestConfidenceChapter?.name ?? '—'}
            subtitle={analytics.highestConfidenceChapter ? `${analytics.highestConfidenceChapter.confidence}% confidence` : undefined}
          />
          <InsightCard
            icon={TrendingDown}
            glow="purple"
            title="Lowest Confidence Chapter"
            value={analytics.lowestConfidenceChapter?.name ?? '—'}
            subtitle={analytics.lowestConfidenceChapter ? `${analytics.lowestConfidenceChapter.confidence}% confidence` : undefined}
          />
          <InsightCard icon={BookOpenCheck} glow="blue" title="Total Questions Solved" value={`${analytics.totalQuestionsSolved}`} />
          <InsightCard icon={Clock} glow="blue" title="Total Study Hours" value={`${analytics.totalStudyHours} hrs`} />
          <InsightCard icon={Repeat} glow="green" title="Revision Progress" value={`${analytics.revisionProgressPct}%`} subtitle="Chapters revised at least once" />
        </div>
      </div>

      {!topics.length && (
        <GlassCard>
          <p className="text-white/40 text-sm">
            No chapters yet. If you picked Class 11, Class 12, or a Custom Goal, add subjects and topics from the{' '}
            <span className="text-electric">Study</span> page — those goals don't ship with a pre-built chapter list.
          </p>
        </GlassCard>
      )}
    </div>
  );
}

function CountdownBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center rounded-xl bg-void-300/50 border border-white/[0.06] py-4">
      <div className="font-display text-3xl md:text-4xl font-bold text-electric text-glow-blue">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/40 mt-1">{label}</div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-void-300/40 border border-white/[0.06] px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-white/35">{label}</div>
      <div className="font-display text-sm font-semibold text-white/80 mt-0.5">{value}</div>
    </div>
  );
}

function ReadinessCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <GlassCard glow={highlight ? 'green' : 'blue'}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/50">{label}</span>
        <span className={`font-display text-sm font-bold ${highlight ? 'text-neon' : 'text-electric'}`}>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-void-400 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${highlight ? 'bg-neon' : 'bg-electric'}`}
        />
      </div>
    </GlassCard>
  );
}

function InsightCard({
  icon: Icon,
  glow,
  title,
  value,
  subtitle,
}: {
  icon: typeof TrendingUp;
  glow?: 'blue' | 'purple' | 'green';
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <GlassCard glow={glow}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/50">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-white/35">{title}</div>
          <div className="font-display text-sm font-semibold text-white/85 mt-0.5 truncate">{value}</div>
          {subtitle && <div className="text-xs text-white/35 mt-0.5">{subtitle}</div>}
        </div>
      </div>
    </GlassCard>
  );
}
