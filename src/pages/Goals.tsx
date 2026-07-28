import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Target } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { db } from '@/db/database';
import { createGoal, updateGoalProgress, deleteGoal } from '@/lib/actions';
import type { GoalPeriod } from '@/types';

const PERIOD_COLOR: Record<GoalPeriod, string> = {
  daily: '#3B82F6',
  weekly: '#A855F7',
  monthly: '#39FF88',
  yearly: '#F97316',
};

export default function Goals() {
  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<GoalPeriod | 'all'>('all');

  const filtered = filter === 'all' ? goals : goals.filter((g) => g.period === filter);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Goals</h1>
          <p className="text-white/40 text-sm mt-1">Set the target. Track the climb.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-electric/15 border border-electric/40 text-electric text-sm font-medium hover:shadow-glow-blue transition-all"
        >
          <Plus size={15} /> New Goal
        </button>
      </header>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === p ? 'bg-electric/15 text-electric border border-electric/40' : 'text-white/40 border border-white/[0.06] hover:text-white/70'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <GlassCard className="col-span-full text-center py-16">
            <Target className="mx-auto mb-3 text-white/20" size={36} />
            <p className="text-white/40 text-sm">No goals in this view yet.</p>
          </GlassCard>
        )}
        <AnimatePresence>
          {filtered.map((g, i) => {
            const pct = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
            const color = PERIOD_COLOR[g.period];
            return (
              <motion.div key={g.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }}>
                <GlassCard>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider" style={{ color }}>{g.period}</span>
                      <h3 className="font-semibold text-sm mt-0.5">{g.title}</h3>
                    </div>
                    <button onClick={() => deleteGoal(g.id)} className="text-white/20 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="h-2 rounded-full bg-void-400 overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}80` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/40">
                    <span>{g.currentValue} / {g.targetValue} {g.unit}</span>
                    <span className="font-mono" style={{ color }}>{pct}%</span>
                  </div>
                  <input
                    type="number"
                    value={g.currentValue}
                    onChange={(e) => updateGoalProgress(g.id, Number(e.target.value))}
                    className="w-full mt-2 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs outline-none"
                  />
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>{showAdd && <AddGoalModal onClose={() => setShowAdd(false)} />}</AnimatePresence>
    </div>
  );
}

function AddGoalModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState<GoalPeriod>('weekly');
  const [target, setTarget] = useState(10);
  const [unit, setUnit] = useState('hours');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="glass-card glow-border-blue w-full max-w-md p-6 space-y-4">
        <h3 className="font-display text-lg font-bold">New Goal</h3>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Study 20 hours" className="w-full bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none" />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-white/40">Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value as GoalPeriod)} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-2 py-2 text-sm outline-none">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40">Target</label>
            <input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-2 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs text-white/40">Unit</label>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-2 py-2 text-sm outline-none" />
          </div>
        </div>
        <button
          onClick={() => {
            if (title.trim()) {
              createGoal({ title: title.trim(), period, targetValue: target, unit, deadline: null });
              onClose();
            }
          }}
          className="w-full py-2.5 rounded-lg bg-electric/15 border border-electric/40 text-electric font-medium hover:shadow-glow-blue transition-all"
        >
          Create Goal
        </button>
      </motion.div>
    </motion.div>
  );
}
