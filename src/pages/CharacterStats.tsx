import { useEffect } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import GlassCard from '@/components/ui/GlassCard';
import { useProgressData } from '@/hooks/useProgressData';
import { db, todayISO, uid } from '@/db/database';
import { useLiveQuery } from 'dexie-react-hooks';

const STAT_META: Record<string, { color: string; label: string }> = {
  discipline: { color: '#3B82F6', label: 'Discipline' },
  consistency: { color: '#A855F7', label: 'Consistency' },
  focus: { color: '#39FF88', label: 'Focus' },
  productivity: { color: '#F97316', label: 'Productivity' },
  energy: { color: '#EAB308', label: 'Energy' },
  knowledge: { color: '#06B6D4', label: 'Knowledge' },
  health: { color: '#EF4444', label: 'Health' },
  confidence: { color: '#EC4899', label: 'Confidence' },
};

export default function CharacterStats() {
  const { characterStats } = useProgressData();
  const snapshots = useLiveQuery(() => db.statSnapshots.orderBy('date').toArray(), []) ?? [];

  // Auto-record today's snapshot once per day so the history graph fills in over time
  useEffect(() => {
    (async () => {
      const today = todayISO();
      const existing = await db.statSnapshots.where('date').equals(today).first();
      if (!existing) {
        await db.statSnapshots.add({ id: uid(), date: today, ...characterStats });
      } else {
        await db.statSnapshots.update(existing.id, { ...characterStats });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(characterStats)]);

  const radarData = Object.entries(characterStats).map(([key, value]) => ({
    stat: STAT_META[key]?.label ?? key,
    value: Math.round(value),
    fullMark: 100,
  }));

  const historyData = snapshots.slice(-30).map((s) => ({
    date: s.date.slice(5),
    discipline: s.discipline,
    consistency: s.consistency,
    focus: s.focus,
    knowledge: s.knowledge,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Character Sheet</h1>
        <p className="text-white/40 text-sm mt-1">Eight stats. One evolving character: you.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassCard glow="blue">
          <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4">Attribute Radar</h2>
          <ResponsiveContainer width="100%" height={340}>
            <RadarChart data={radarData} outerRadius="75%">
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="stat" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Stats" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.35} />
              <Tooltip contentStyle={{ background: '#161619', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard glow="purple">
          <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4">Stat Breakdown</h2>
          <div className="space-y-3">
            {Object.entries(characterStats).map(([key, value]) => {
              const meta = STAT_META[key];
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">{meta?.label ?? key}</span>
                    <span className="font-mono font-semibold" style={{ color: meta?.color }}>
                      {Math.round(value)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-void-400 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${value}%`, background: meta?.color, boxShadow: `0 0 8px ${meta?.color}80` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      <GlassCard glow="green">
        <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4">Progression History</h2>
        {historyData.length < 2 ? (
          <div className="text-center py-16 text-white/30 text-sm">
            Keep logging daily — your stat history graph will build up over the coming days.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#161619', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="discipline" stroke="#3B82F6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="consistency" stroke="#A855F7" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="focus" stroke="#39FF88" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="knowledge" stroke="#06B6D4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </GlassCard>
    </div>
  );
}
