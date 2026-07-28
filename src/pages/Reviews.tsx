import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ChevronLeft, ChevronRight, FileDown, Lightbulb } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { db } from '@/db/database';
import { computeWeeklyReview, computeMonthlyReview } from '@/lib/reviews';
import { generateWeeklyReportPDF, generateMonthlyReportPDF } from '@/lib/pdfExport';
import { toISO, addDays } from '@/lib/stats';

function currentWeekStart(offsetWeeks = 0): string {
  const now = new Date();
  now.setDate(now.getDate() - now.getDay() + offsetWeeks * 7);
  return toISO(now);
}

const STAT_KEYS = ['discipline', 'consistency', 'focus', 'productivity', 'energy', 'knowledge', 'health', 'confidence'] as const;

export default function Reviews() {
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const logs = useLiveQuery(() => db.dailyLogs.toArray(), []) ?? [];
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) ?? [];
  const xpEvents = useLiveQuery(() => db.xpEvents.toArray(), []) ?? [];
  const achievements = useLiveQuery(() => db.achievements.toArray(), []) ?? [];
  const snapshots = useLiveQuery(() => db.statSnapshots.toArray(), []) ?? [];

  const weekStart = currentWeekStart(weekOffset);

  const weeklyReview = useMemo(() => {
    const xpTotalBeforeWeek = xpEvents.filter((e) => e.date < weekStart).reduce((s, e) => s + e.amount, 0);
    return computeWeeklyReview({ weekStart, sessions, tasks, logs, subjects, xpEvents, xpTotalBeforeWeek });
  }, [weekStart, sessions, tasks, logs, subjects, xpEvents]);

  const weekAchievements = achievements.filter((a) => {
    if (!a.unlockedAt) return false;
    const d = a.unlockedAt.slice(0, 10);
    return d >= weeklyReview.weekStart && d <= weeklyReview.weekEnd;
  });

  const now = new Date();
  const monthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

  const monthlyReview = useMemo(() => computeMonthlyReview({ monthKey, sessions, subjects, xpEvents }), [monthKey, sessions, subjects, xpEvents]);

  const monthAchievements = achievements.filter((a) => a.unlockedAt && a.unlockedAt.startsWith(monthKey));

  const prevMonthDate = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const radarComparison = useMemo(() => {
    const thisMonthSnaps = snapshots.filter((s) => s.date.startsWith(monthKey));
    const prevMonthSnaps = snapshots.filter((s) => s.date.startsWith(prevMonthKey));
    const avg = (snaps: typeof snapshots, key: (typeof STAT_KEYS)[number]) =>
      snaps.length ? Math.round(snaps.reduce((s, x) => s + x[key], 0) / snaps.length) : 0;
    return STAT_KEYS.map((key) => ({
      stat: key.charAt(0).toUpperCase() + key.slice(1),
      thisMonth: avg(thisMonthSnaps, key),
      prevMonth: avg(prevMonthSnaps, key),
    }));
  }, [snapshots, monthKey, prevMonthKey]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Reviews</h1>
          <p className="text-white/40 text-sm mt-1">Auto-generated summaries of your week and month.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('weekly')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'weekly' ? 'bg-electric/15 text-electric border border-electric/40' : 'text-white/40 border border-white/[0.06]'}`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTab('monthly')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'monthly' ? 'bg-violet/15 text-violet border border-violet/40' : 'text-white/40 border border-white/[0.06]'}`}
          >
            Monthly
          </button>
        </div>
      </header>

      {tab === 'weekly' ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekOffset((o) => o - 1)} className="p-2 rounded-lg glass hover:text-electric">
                <ChevronLeft size={16} />
              </button>
              <span className="font-mono text-sm text-white/60">{weeklyReview.weekStart} → {weeklyReview.weekEnd}</span>
              <button onClick={() => setWeekOffset((o) => Math.min(0, o + 1))} disabled={weekOffset >= 0} className="p-2 rounded-lg glass hover:text-electric disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={() => generateWeeklyReportPDF(weeklyReview, weekAchievements)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-electric/15 border border-electric/40 text-electric text-xs font-medium hover:shadow-glow-blue transition-all"
            >
              <FileDown size={14} /> Export PDF
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Metric label="Study Time" value={`${(weeklyReview.totalStudyMin / 60).toFixed(1)}h`} color="#3B82F6" />
            <Metric label="Avg / Day" value={`${weeklyReview.avgDailyStudyMin}m`} color="#A855F7" />
            <Metric label="Completion" value={`${weeklyReview.completionPct}%`} color="#39FF88" />
            <Metric label="XP Earned" value={weeklyReview.xpEarned} color="#F97316" />
          </div>

          <GlassCard glow="blue">
            <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4">Discipline Trend</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyReview.disciplineTrend.map((v, i) => ({ day: addDays(weeklyReview.weekStart, i).slice(5), score: v }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#161619', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <GlassCard>
              <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-3">Highlights</h2>
              <ul className="text-sm text-white/70 space-y-2">
                <li>Best day: <span className="text-neon">{weeklyReview.bestDay ? `${weeklyReview.bestDay.date} (${weeklyReview.bestDay.min}m)` : '—'}</span></li>
                <li>Worst day: <span className="text-orange-400">{weeklyReview.worstDay ? `${weeklyReview.worstDay.date} (${weeklyReview.worstDay.min}m)` : '—'}</span></li>
                <li>Most productive subject: <span className="text-electric">{weeklyReview.mostProductiveSubject?.name ?? '—'}</span></li>
                <li>Least studied subject: <span className="text-violet">{weeklyReview.leastStudiedSubject?.name ?? '—'}</span></li>
                <li>Most consistent time: <span className="text-white/90">{weeklyReview.mostConsistentTime ?? '—'}</span></li>
                <li>Streak at week end: <span className="text-white/90">{weeklyReview.streakAtWeekEnd} days</span></li>
                <li>Level: <span className="text-white/90">{weeklyReview.levelStart} → {weeklyReview.levelEnd}</span></li>
              </ul>
            </GlassCard>
            <GlassCard glow="green">
              <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-3 flex items-center gap-2">
                <Lightbulb size={14} className="text-neon" /> Suggestions
              </h2>
              <ul className="text-sm text-white/70 space-y-2">
                {weeklyReview.suggestions.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </GlassCard>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setMonthOffset((o) => o - 1)} className="p-2 rounded-lg glass hover:text-violet">
                <ChevronLeft size={16} />
              </button>
              <span className="font-mono text-sm text-white/60">{monthlyReview.monthLabel}</span>
              <button onClick={() => setMonthOffset((o) => Math.min(0, o + 1))} disabled={monthOffset >= 0} className="p-2 rounded-lg glass hover:text-violet disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={() => generateMonthlyReportPDF(monthlyReview, monthAchievements)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet/15 border border-violet/40 text-violet text-xs font-medium hover:shadow-glow-purple transition-all"
            >
              <FileDown size={14} /> Export PDF
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Metric label="Total Hours" value={monthlyReview.totalHours.toFixed(1)} color="#A855F7" />
            <Metric label="Avg Hours/Day" value={monthlyReview.avgHoursPerDay.toFixed(2)} color="#3B82F6" />
            <Metric label="Longest Streak" value={`${monthlyReview.longestStreak}d`} color="#39FF88" />
            <Metric
              label="vs Last Month"
              value={monthlyReview.improvementPct === null ? '—' : `${monthlyReview.improvementPct >= 0 ? '+' : ''}${monthlyReview.improvementPct.toFixed(0)}%`}
              color={monthlyReview.improvementPct !== null && monthlyReview.improvementPct < 0 ? '#F97316' : '#39FF88'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <GlassCard>
              <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-3">Subjects Ranked</h2>
              <div className="space-y-2">
                {monthlyReview.subjectsRanked.length === 0 && <div className="text-white/30 text-sm">No sessions logged this month.</div>}
                {monthlyReview.subjectsRanked.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <span className="text-white/70">#{i + 1} {s.name}</span>
                    <span className="font-mono text-white/90">{s.hours.toFixed(1)}h</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-white/[0.06] text-sm space-y-1 text-white/60">
                <div>Strongest: <span className="text-neon">{monthlyReview.strongestSubject ?? '—'}</span></div>
                <div>Weakest: <span className="text-orange-400">{monthlyReview.weakestSubject ?? '—'}</span></div>
                <div>Missed days: <span className="text-white/90">{monthlyReview.missedDays}</span></div>
                <div>Most productive: <span className="text-white/90">{monthlyReview.mostProductiveWeekLabel} ({monthlyReview.mostProductiveWeekHours.toFixed(1)}h)</span></div>
              </div>
            </GlassCard>

            <GlassCard glow="purple">
              <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-3">This Month vs Last Month</h2>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarComparison} outerRadius="75%">
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="stat" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="This Month" dataKey="thisMonth" stroke="#A855F7" fill="#A855F7" fillOpacity={0.35} />
                  <Radar name="Last Month" dataKey="prevMonth" stroke="rgba(255,255,255,0.3)" fill="transparent" strokeDasharray="4 4" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#161619', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <GlassCard className="text-center">
      <div className="text-2xl font-display font-bold" style={{ color }}>{value}</div>
      <div className="text-[11px] text-white/40 mt-1 font-mono uppercase tracking-wide">{label}</div>
    </GlassCard>
  );
}
