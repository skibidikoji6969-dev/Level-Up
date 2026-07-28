import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import GlassCard from '@/components/ui/GlassCard';
import { db } from '@/db/database';
import { movingAverage, toISO } from '@/lib/stats';

const TOOLTIP_STYLE = { background: '#161619', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 };

export default function Analytics() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) ?? [];
  const xpEvents = useLiveQuery(() => db.xpEvents.toArray(), []) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];

  const last30Days = useMemo(() => {
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(toISO(d));
    }
    return days;
  }, []);

  const dailyMinutes = last30Days.map((date) => sessions.filter((s) => s.date === date).reduce((s, x) => s + x.durationMin, 0));
  const dailySeries = last30Days.map((date, i) => ({
    date: date.slice(5),
    minutes: dailyMinutes[i],
    ma7: null as number | null,
  }));
  const ma7 = movingAverage(dailyMinutes, 7);
  dailySeries.forEach((d, i) => (d.ma7 = Math.round(ma7[i])));

  const dailyXP = last30Days.map((date) => ({
    date: date.slice(5),
    xp: xpEvents.filter((e) => e.date === date).reduce((s, e) => s + e.amount, 0),
  }));

  const subjectDistribution = subjects.map((s) => ({
    name: s.name,
    value: Math.round(sessions.filter((sess) => sess.subjectId === s.id).reduce((sum, x) => sum + x.durationMin, 0)),
    color: s.color,
  })).filter((d) => d.value > 0);

  // weekly comparison (this week vs last week) per weekday
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);

  const weekdayComparison = weekdayLabels.map((label, i) => {
    const thisDate = new Date(thisWeekStart);
    thisDate.setDate(thisWeekStart.getDate() + i);
    const lastDate = new Date(lastWeekStart);
    lastDate.setDate(lastWeekStart.getDate() + i);
    const thisISO = toISO(thisDate);
    const lastISO = toISO(lastDate);
    return {
      day: label,
      thisWeek: sessions.filter((s) => s.date === thisISO).reduce((s, x) => s + x.durationMin, 0),
      lastWeek: sessions.filter((s) => s.date === lastISO).reduce((s, x) => s + x.durationMin, 0),
    };
  });

  const taskCategoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks.filter((t) => t.done)) {
      map.set(t.category, (map.get(t.category) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const PIE_COLORS = ['#3B82F6', '#A855F7', '#39FF88', '#F97316', '#EC4899'];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Analytics</h1>
        <p className="text-white/40 text-sm mt-1">The full shape of your effort.</p>
      </header>

      <GlassCard glow="blue">
        <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4">Study Minutes — Last 30 Days (7-day moving average)</h2>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={dailySeries}>
            <defs>
              <linearGradient id="minutesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="minutes" stroke="#3B82F6" fill="url(#minutesGrad)" strokeWidth={2} />
            <Line type="monotone" dataKey="ma7" stroke="#A855F7" strokeWidth={2} dot={false} name="7-day avg" />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassCard glow="purple">
          <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4">XP Earned — Last 30 Days</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailyXP}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} interval={3} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="xp" fill="#A855F7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard glow="green">
          <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4">Time by Subject</h2>
          {subjectDistribution.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">Log sessions to see subject distribution.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={subjectDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {subjectDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4">This Week vs Last Week</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={weekdayComparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="thisWeek" stroke="#3B82F6" strokeWidth={2} name="This Week" />
            <Line type="monotone" dataKey="lastWeek" stroke="rgba(255,255,255,0.3)" strokeWidth={2} strokeDasharray="4 4" name="Last Week" />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>

      {taskCategoryData.length > 0 && (
        <GlassCard>
          <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4">Completed Tasks by Category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={taskCategoryData} dataKey="value" nameKey="name" outerRadius={80} label>
                {taskCategoryData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
      )}
    </div>
  );
}
