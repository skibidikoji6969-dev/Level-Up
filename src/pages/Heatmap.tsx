import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { db } from '@/db/database';
import { toISO } from '@/lib/stats';

function intensityColor(min: number): string {
  if (min <= 0) return 'rgba(255,255,255,0.04)';
  if (min < 30) return 'rgba(59,130,246,0.25)';
  if (min < 60) return 'rgba(59,130,246,0.5)';
  if (min < 120) return 'rgba(59,130,246,0.75)';
  return '#3B82F6';
}

export default function Heatmap() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const xpEvents = useLiveQuery(() => db.xpEvents.toArray(), []) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const [hovered, setHovered] = useState<{ date: string; x: number; y: number } | null>(null);

  const dayMap = useMemo(() => {
    const map = new Map<string, { min: number; xp: number; tasks: number }>();
    for (const s of sessions) {
      const cur = map.get(s.date) ?? { min: 0, xp: 0, tasks: 0 };
      cur.min += s.durationMin;
      map.set(s.date, cur);
    }
    for (const e of xpEvents) {
      const cur = map.get(e.date) ?? { min: 0, xp: 0, tasks: 0 };
      cur.xp += e.amount;
      map.set(e.date, cur);
    }
    for (const t of tasks.filter((t) => t.done)) {
      const d = t.doneAt?.slice(0, 10) ?? t.date;
      const cur = map.get(d) ?? { min: 0, xp: 0, tasks: 0 };
      cur.tasks += 1;
      map.set(d, cur);
    }
    return map;
  }, [sessions, xpEvents, tasks]);

  const weeks = useMemo(() => {
    const today = new Date();
    const days: string[] = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(toISO(d));
    }
    // pad start to align to Sunday
    const firstDow = new Date(days[0]).getDay();
    const padded = [...Array(firstDow).fill(null), ...days];
    const chunked: (string | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      chunked.push(padded.slice(i, i + 7));
    }
    return chunked;
  }, []);

  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = '';
    weeks.forEach((week, wi) => {
      const firstValid = week.find((d) => d);
      if (!firstValid) return;
      const month = new Date(firstValid).toLocaleDateString('en-US', { month: 'short' });
      if (month !== lastMonth) {
        labels.push({ label: month, weekIndex: wi });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  const totalActiveDays = Array.from(dayMap.values()).filter((v) => v.min > 0).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Study Heatmap</h1>
        <p className="text-white/40 text-sm mt-1">{totalActiveDays} active days in the last year.</p>
      </header>

      <GlassCard glow="blue" className="overflow-x-auto">
        <div className="min-w-[780px] relative">
          <div className="flex gap-[3px] pl-8 mb-1 relative h-4">
            {monthLabels.map((m) => (
              <span
                key={m.label + m.weekIndex}
                className="absolute text-[10px] text-white/30 font-mono"
                style={{ left: m.weekIndex * 15 }}
              >
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            <div className="flex flex-col gap-[3px] pr-1 justify-between text-[9px] text-white/25 font-mono h-[91px]">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((date, di) => {
                  if (!date) return <div key={di} className="w-3 h-3" />;
                  const data = dayMap.get(date);
                  return (
                    <motion.div
                      key={date}
                      whileHover={{ scale: 1.4 }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHovered({ date, x: rect.x, y: rect.y });
                      }}
                      onMouseLeave={() => setHovered(null)}
                      className="w-3 h-3 rounded-[3px] cursor-pointer"
                      style={{ background: intensityColor(data?.min ?? 0) }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] text-white/30 font-mono">
            <span>Less</span>
            {[0, 20, 45, 90, 150].map((v) => (
              <div key={v} className="w-3 h-3 rounded-[3px]" style={{ background: intensityColor(v) }} />
            ))}
            <span>More</span>
          </div>
        </div>
      </GlassCard>

      {hovered && dayMap.get(hovered.date) && (
        <div
          className="fixed z-50 glass-card px-3 py-2 text-xs pointer-events-none"
          style={{ left: hovered.x, top: hovered.y - 70 }}
        >
          <div className="font-semibold text-white/90">{hovered.date}</div>
          <div className="text-white/50">{dayMap.get(hovered.date)!.min} min studied</div>
          <div className="text-white/50">{dayMap.get(hovered.date)!.xp} XP · {dayMap.get(hovered.date)!.tasks} tasks</div>
        </div>
      )}
    </div>
  );
}
