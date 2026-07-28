import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Search,
  LayoutDashboard,
  Swords,
  BookOpen,
  ListTodo,
  NotebookPen,
  Trophy,
  Target,
  Database,
  Settings as SettingsIcon,
  Sunrise,
  Dumbbell,
  BookMarked,
  ClipboardList,
  Gauge,
  RotateCcw,
  ClipboardCheck,
} from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { db } from '@/db/database';
import { awardXP, toggleTaskDone, logRevision, logMockTest } from '@/lib/actions';

interface Cmd {
  id: string;
  label: string;
  sub?: string;
  icon: any;
  action: () => void;
  group: string;
}

export default function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const tasks = useLiveQuery(() => db.tasks.filter((t) => !t.done).toArray(), []) ?? [];
  const topics = useLiveQuery(() => db.topics.toArray(), []) ?? [];
  const logs = useLiveQuery(() => db.dailyLogs.orderBy('date').reverse().limit(30).toArray(), []) ?? [];

  const staticCommands: Cmd[] = useMemo(
    () => [
      { id: 'nav-dash', label: 'Go to Dashboard', icon: LayoutDashboard, action: () => navigate('/'), group: 'Navigate' },
      { id: 'nav-char', label: 'Go to Character', icon: Swords, action: () => navigate('/character'), group: 'Navigate' },
      { id: 'nav-study', label: 'Go to Study Tracker', icon: BookOpen, action: () => navigate('/study'), group: 'Navigate' },
      { id: 'nav-planner', label: 'Go to Planner', icon: ListTodo, action: () => navigate('/planner'), group: 'Navigate' },
      { id: 'nav-journal', label: 'Go to Journal', icon: NotebookPen, action: () => navigate('/journal'), group: 'Navigate' },
      { id: 'nav-ach', label: 'Go to Achievements', icon: Trophy, action: () => navigate('/achievements'), group: 'Navigate' },
      { id: 'nav-goals', label: 'Go to Goals', icon: Target, action: () => navigate('/goals'), group: 'Navigate' },
      { id: 'nav-reviews', label: 'Go to Reviews', icon: ClipboardList, action: () => navigate('/reviews'), group: 'Navigate' },
      { id: 'nav-stats', label: 'Go to Statistics', icon: Gauge, action: () => navigate('/statistics'), group: 'Navigate' },
      { id: 'nav-data', label: 'Go to Data', icon: Database, action: () => navigate('/data'), group: 'Navigate' },
      { id: 'nav-settings', label: 'Go to Settings', icon: SettingsIcon, action: () => navigate('/settings'), group: 'Navigate' },
      {
        id: 'act-wake',
        label: 'Log: Woke up on time (+15 XP)',
        icon: Sunrise,
        action: () => awardXP('wake_on_time'),
        group: 'Quick Log',
      },
      {
        id: 'act-workout',
        label: 'Log: Workout completed (+20 XP)',
        icon: Dumbbell,
        action: () => awardXP('workout'),
        group: 'Quick Log',
      },
      {
        id: 'act-reading',
        label: 'Log: Reading session (+15 XP)',
        icon: BookMarked,
        action: () => awardXP('reading'),
        group: 'Quick Log',
      },
      {
        id: 'act-revision',
        label: 'Log: Revision completed (+30 XP)',
        icon: RotateCcw,
        action: () => logRevision(),
        group: 'Quick Log',
      },
      {
        id: 'act-mock',
        label: 'Log: Mock test completed (+50 XP)',
        icon: ClipboardCheck,
        action: () => logMockTest(),
        group: 'Quick Log',
      },
    ],
    [navigate]
  );

  const taskCommands: Cmd[] = tasks.slice(0, 6).map((t) => ({
    id: `task-${t.id}`,
    label: `Complete: ${t.title}`,
    sub: t.category,
    icon: ListTodo,
    action: () => toggleTaskDone(t.id),
    group: 'Tasks',
  }));

  const topicCommands: Cmd[] = topics.slice(0, 6).map((t) => ({
    id: `topic-${t.id}`,
    label: `Open topic: ${t.name}`,
    sub: t.status,
    icon: BookOpen,
    action: () => navigate('/study'),
    group: 'Topics',
  }));

  const journalMatches: Cmd[] = logs
    .filter((l) => l.journalNotes && l.journalNotes.toLowerCase().includes(query.toLowerCase()) && query.length > 1)
    .slice(0, 4)
    .map((l) => ({
      id: `journal-${l.id}`,
      label: `Journal entry — ${l.date}`,
      sub: l.journalNotes.slice(0, 60),
      icon: NotebookPen,
      action: () => navigate('/journal'),
      group: 'Journal',
    }));

  const all = [...staticCommands, ...taskCommands, ...topicCommands, ...journalMatches];
  const filtered = query
    ? all.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()) || c.sub?.toLowerCase().includes(query.toLowerCase()))
    : all;

  const groups = filtered.reduce<Record<string, Cmd[]>>((acc, c) => {
    (acc[c.group] ||= []).push(c);
    return acc;
  }, {});

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
        onClick={() => setOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl glass-card glow-border-blue overflow-hidden"
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
            <Search size={18} className="text-white/40" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search actions, tasks, topics, journal..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/30"
            />
            <kbd className="font-mono text-[10px] bg-void-400 px-1.5 py-0.5 rounded text-white/40">ESC</kbd>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-2">
            {Object.entries(groups).length === 0 && (
              <div className="text-center text-sm text-white/30 py-8">No matches found</div>
            )}
            {Object.entries(groups).map(([group, cmds]) => (
              <div key={group} className="mb-2">
                <div className="text-[10px] uppercase tracking-wider text-white/30 font-mono px-3 py-1">{group}</div>
                {cmds.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      c.action();
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-electric/10 text-left group transition-colors"
                  >
                    <c.icon size={16} className="text-white/40 group-hover:text-electric shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm text-white/80 group-hover:text-white truncate">{c.label}</div>
                      {c.sub && <div className="text-xs text-white/30 truncate">{c.sub}</div>}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
