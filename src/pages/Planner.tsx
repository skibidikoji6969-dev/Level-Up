import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, Trash2, TimerIcon } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { db, todayISO } from '@/db/database';
import { createTask, toggleTaskDone, deleteTask, incrementPomodoro } from '@/lib/actions';
import type { TaskCategory, TaskPriority } from '@/types';
import PomodoroTimer from '@/components/PomodoroTimer';

const PRIORITY_META: Record<TaskPriority, { color: string; label: string }> = {
  low: { color: '#6B7280', label: 'Low' },
  medium: { color: '#3B82F6', label: 'Medium' },
  high: { color: '#F97316', label: 'High' },
  critical: { color: '#EF4444', label: 'Critical' },
};

const CATEGORY_LABEL: Record<TaskCategory, string> = {
  study: 'Study',
  health: 'Health',
  mind: 'Mind',
  personal: 'Personal',
  work: 'Work',
};

export default function Planner() {
  const today = todayISO();
  const tasks = useLiveQuery(() => db.tasks.where('date').equals(today).toArray(), [today]) ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [activeTimerTask, setActiveTimerTask] = useState<string | null>(null);

  const pending = tasks.filter((t) => !t.done).sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });
  const done = tasks.filter((t) => t.done);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Daily Planner</h1>
          <p className="text-white/40 text-sm mt-1">{today} · {done.length}/{tasks.length} complete</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-electric/15 border border-electric/40 text-electric text-sm font-medium hover:shadow-glow-blue transition-all"
        >
          <Plus size={15} /> Add Task
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          <AnimatePresence>
            {pending.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <GlassCard className="flex items-center gap-3 py-3">
                  <button
                    onClick={() => toggleTaskDone(t.id)}
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 hover:shadow-glow-green transition-all"
                    style={{ borderColor: PRIORITY_META[t.priority].color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-white/30">
                      <span className="px-1.5 py-0.5 rounded bg-void-400">{CATEGORY_LABEL[t.category]}</span>
                      <span style={{ color: PRIORITY_META[t.priority].color }}>{PRIORITY_META[t.priority].label}</span>
                      <span>{t.estimatedMin}m est.</span>
                      {t.pomodoroCount > 0 && <span>🍅 {t.pomodoroCount}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTimerTask(t.id)}
                    className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-electric transition-colors"
                    title="Start pomodoro"
                  >
                    <TimerIcon size={16} />
                  </button>
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>

          {pending.length === 0 && tasks.length > 0 && (
            <GlassCard className="text-center py-10 text-white/40 text-sm">All tasks complete. Perfect day territory. 🔥</GlassCard>
          )}
          {tasks.length === 0 && (
            <GlassCard className="text-center py-10 text-white/40 text-sm">No tasks yet today. Add your first one.</GlassCard>
          )}

          {done.length > 0 && (
            <div className="pt-4">
              <div className="text-xs uppercase tracking-widest text-white/30 font-mono mb-2">Completed</div>
              <div className="space-y-2">
                {done.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-void-200/40 border border-white/[0.04]">
                    <div className="w-5 h-5 rounded-full bg-neon/20 border border-neon flex items-center justify-center shrink-0">
                      <Check size={12} className="text-neon" />
                    </div>
                    <span className="text-sm text-white/40 line-through truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <PomodoroTimer taskId={activeTimerTask} onComplete={() => activeTimerTask && incrementPomodoro(activeTimerTask)} />
        </div>
      </div>

      <AnimatePresence>{showAdd && <AddTaskModal onClose={() => setShowAdd(false)} />}</AnimatePresence>
    </div>
  );
}

function AddTaskModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('study');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [estimatedMin, setEstimatedMin] = useState(30);
  const [deadline, setDeadline] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card glow-border-blue w-full max-w-md p-6 space-y-4"
      >
        <h3 className="font-display text-lg font-bold">New Task</h3>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to get done?"
          className="w-full bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:border-electric/40"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none">
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none">
              {Object.entries(PRIORITY_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Estimated Minutes</label>
            <input type="number" value={estimatedMin} onChange={(e) => setEstimatedMin(Number(e.target.value))} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Deadline</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
        </div>
        <button
          onClick={() => {
            if (title.trim()) {
              createTask({ title: title.trim(), category, priority, estimatedMin, deadline: deadline || null, date: todayISO() });
              onClose();
            }
          }}
          className="w-full py-2.5 rounded-lg bg-electric/15 border border-electric/40 text-electric font-medium hover:shadow-glow-blue transition-all"
        >
          Add Task
        </button>
      </motion.div>
    </motion.div>
  );
}
