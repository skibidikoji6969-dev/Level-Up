import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { Trophy, Flame, BookOpen } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { db } from '@/db/database';
import { getLevelInfo } from '@/lib/xp';

interface MonthSummary {
  key: string;
  label: string;
  xp: number;
  hours: number;
  sessions: number;
  achievements: { title: string }[];
  endLevel: number;
}

export default function Timeline() {
  const xpEvents = useLiveQuery(() => db.xpEvents.toArray(), []) ?? [];
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const achievements = useLiveQuery(() => db.achievements.filter((a) => !!a.unlockedAt).toArray(), []) ?? [];

  const months = useMemo(() => {
    const map = new Map<string, MonthSummary>();
    const ensure = (key: string) => {
      if (!map.has(key)) {
        const [y, m] = key.split('-');
        const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        map.set(key, { key, label, xp: 0, hours: 0, sessions: 0, achievements: [], endLevel: 1 });
      }
      return map.get(key)!;
    };

    let cumulativeXP = 0;
    const sortedEvents = [...xpEvents].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    for (const e of sortedEvents) {
      const key = e.date.slice(0, 7);
      const m = ensure(key);
      m.xp += e.amount;
      cumulativeXP += e.amount;
      m.endLevel = getLevelInfo(cumulativeXP).level;
    }
    for (const s of sessions) {
      const key = s.date.slice(0, 7);
      const m = ensure(key);
      m.hours += s.durationMin / 60;
      m.sessions += 1;
    }
    for (const a of achievements) {
      if (!a.unlockedAt) continue;
      const key = a.unlockedAt.slice(0, 7);
      const m = ensure(key);
      m.achievements.push({ title: a.title });
    }

    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [xpEvents, sessions, achievements]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Progress Timeline</h1>
        <p className="text-white/40 text-sm mt-1">Every month, every milestone, in one scroll.</p>
      </header>

      {months.length === 0 ? (
        <GlassCard className="text-center py-16 text-white/40 text-sm">
          Your timeline will fill in as you log activity across months.
        </GlassCard>
      ) : (
        <div className="relative pl-6 border-l-2 border-white/[0.06] space-y-6">
          {months.map((m, i) => (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative"
            >
              <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-electric shadow-glow-blue" />
              <GlassCard glow="blue">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <h3 className="font-display font-bold text-lg">{m.label}</h3>
                  <span className="text-xs font-mono text-electric">Ended at Level {m.endLevel}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <MiniStat icon={Flame} label="XP Earned" value={m.xp.toLocaleString()} color="#3B82F6" />
                  <MiniStat icon={BookOpen} label="Study Hours" value={m.hours.toFixed(1)} color="#39FF88" />
                  <MiniStat icon={Trophy} label="Sessions" value={m.sessions} color="#A855F7" />
                </div>
                {m.achievements.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.06]">
                    {m.achievements.map((a, idx) => (
                      <span key={idx} className="text-[11px] px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        🏆 {a.title}
                      </span>
                    ))}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="text-center">
      <Icon size={16} className="mx-auto mb-1" style={{ color }} />
      <div className="text-sm font-bold font-mono" style={{ color }}>{value}</div>
      <div className="text-[9px] text-white/30 uppercase">{label}</div>
    </div>
  );
}
