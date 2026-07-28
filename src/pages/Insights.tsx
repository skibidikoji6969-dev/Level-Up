import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { db } from '@/db/database';
import { generateInsights } from '@/lib/insights';

const TONE_META = {
  positive: { icon: TrendingUp, color: '#39FF88' },
  warning: { icon: TrendingDown, color: '#F97316' },
  neutral: { icon: Minus, color: '#3B82F6' },
};

export default function Insights() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const logs = useLiveQuery(() => db.dailyLogs.toArray(), []) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) ?? [];

  const insights = useMemo(
    () => generateInsights({ sessions, logs, tasks, subjects }),
    [sessions, logs, tasks, subjects]
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Brain className="text-violet" /> Insights
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Rule-based pattern analysis over your own data. Fully offline — nothing leaves this device.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, i) => {
          const meta = TONE_META[insight.tone];
          const Icon = meta.icon;
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <GlassCard className="flex gap-3 items-start h-full">
                <div className="p-2 rounded-lg shrink-0" style={{ background: `${meta.color}15` }}>
                  <Icon size={16} style={{ color: meta.color }} />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-mono text-white/30 mb-1">{insight.category}</div>
                  <p className="text-sm text-white/80 leading-relaxed">{insight.text}</p>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
