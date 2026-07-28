import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileDown } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { db } from '@/db/database';
import { computeStreaks, totalStudyHours, completionPercent, formatMinutes } from '@/lib/stats';
import { calculateDisciplineScore } from '@/lib/discipline';
import { generateStatsReportPDF } from '@/lib/pdfExport';

export default function Statistics() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const logs = useLiveQuery(() => db.dailyLogs.toArray(), []) ?? [];
  const xpEvents = useLiveQuery(() => db.xpEvents.toArray(), []) ?? [];
  const achievements = useLiveQuery(() => db.achievements.toArray(), []) ?? [];

  const stats = useMemo(() => {
    const { current, longest } = computeStreaks(sessions.map((s) => s.date));
    const totalHours = totalStudyHours(sessions);
    const activeDays = new Set(sessions.map((s) => s.date)).size;
    const longestSession = sessions.reduce((max, s) => Math.max(max, s.durationMin), 0);
    const avgSession = sessions.length ? sessions.reduce((s, x) => s + x.durationMin, 0) / sessions.length : 0;
    const totalReadingMin = logs.reduce((s, l) => s + l.readingMin, 0);
    const workouts = logs.filter((l) => l.workoutDone).length;
    const meditationSessions = logs.filter((l) => l.meditationMin > 0).length;
    const screenDays = logs.filter((l) => l.screenTimeMin !== null);
    const avgScreenTime = screenDays.length ? screenDays.reduce((s, l) => s + (l.screenTimeMin ?? 0), 0) / screenDays.length : 0;
    const doneCount = tasks.filter((t) => t.done).length;
    const missedCount = tasks.filter((t) => !t.done && t.deadline && t.deadline < new Date().toISOString().slice(0, 10)).length;
    const discipline = calculateDisciplineScore({ logs, tasks });
    const productivity = completionPercent(tasks);
    const consistency = logs.length ? Math.round((activeDays / logs.length) * 100) : 0;

    return {
      'Total Study Hours': totalHours.toFixed(1),
      'Total XP': xpEvents.reduce((s, e) => s + e.amount, 0).toLocaleString(),
      'Total Sessions': sessions.length,
      'Longest Session': formatMinutes(longestSession),
      'Average Session': formatMinutes(Math.round(avgSession)),
      'Days Active': activeDays,
      'Current Streak': `${current} days`,
      'Longest Streak': `${longest} days`,
      'Tasks Completed': doneCount,
      'Tasks Missed (overdue)': missedCount,
      'Books / Reading Logged': formatMinutes(totalReadingMin),
      Workouts: workouts,
      'Meditation Sessions': meditationSessions,
      'Avg Screen Time': formatMinutes(Math.round(avgScreenTime)),
      'Productivity %': `${productivity}%`,
      'Consistency %': `${consistency}%`,
      'Discipline %': `${discipline}%`,
    };
  }, [sessions, tasks, logs, xpEvents]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Statistics</h1>
          <p className="text-white/40 text-sm mt-1">Every lifetime number, in one place.</p>
        </div>
        <button
          onClick={() => generateStatsReportPDF(stats, achievements)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon/15 border border-neon/40 text-neon text-sm font-medium hover:shadow-glow-green transition-all"
        >
          <FileDown size={15} /> Export PDF
        </button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.entries(stats).map(([label, value], i) => (
          <GlassCard key={label} delay={i * 0.02} className="text-center">
            <div className="text-xl font-display font-bold text-electric">{value}</div>
            <div className="text-[10px] text-white/40 mt-1 font-mono uppercase tracking-wide leading-tight">{label}</div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
