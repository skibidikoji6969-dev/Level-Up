import { useEffect, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Swords,
  BookOpen,
  CalendarDays,
  ListTodo,
  NotebookPen,
  Trophy,
  BarChart3,
  Brain,
  Target,
  History,
  Database,
  Settings as SettingsIcon,
  Focus,
  Command,
  ClipboardList,
  Gauge,
  GraduationCap,
} from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/academic', label: 'Academic', icon: GraduationCap },
  { to: '/character', label: 'Character', icon: Swords },
  { to: '/study', label: 'Study', icon: BookOpen },
  { to: '/heatmap', label: 'Heatmap', icon: CalendarDays },
  { to: '/planner', label: 'Planner', icon: ListTodo },
  { to: '/journal', label: 'Journal', icon: NotebookPen },
  { to: '/achievements', label: 'Achievements', icon: Trophy },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/insights', label: 'Insights', icon: Brain },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/reviews', label: 'Reviews', icon: ClipboardList },
  { to: '/statistics', label: 'Statistics', icon: Gauge },
  { to: '/timeline', label: 'Timeline', icon: History },
  { to: '/data', label: 'Data', icon: Database },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { focusMode, setFocusMode, setCommandPaletteOpen } = useUIStore();
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (isMod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFocusMode(!focusMode);
      }
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode, setFocusMode, setCommandPaletteOpen]);

  return (
    <div className="min-h-screen flex">
      <AnimatePresence>
        {!focusMode && (
          <motion.aside
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -80, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="hidden md:flex flex-col w-60 shrink-0 border-r border-white/[0.06] bg-void-100/60 backdrop-blur-xl p-4 gap-1"
          >
            <div className="mb-6 px-2">
              <div className="font-display text-lg font-bold tracking-wide text-glow-blue text-electric">
                PROGRESS<span className="text-white/30">//</span>OS
              </div>
              <div className="text-[10px] font-mono text-white/30 mt-0.5">v1.0 · local-only</div>
            </div>

            <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-electric/10 text-electric border border-electric/30 shadow-glow-blue'
                        : 'text-white/50 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`
                  }
                >
                  <item.icon size={17} strokeWidth={2} />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="mt-2 flex items-center justify-between rounded-xl border border-white/[0.06] bg-void-300/50 px-3 py-2 text-xs text-white/40 hover:border-electric/30 hover:text-white/70 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Command size={13} /> Quick actions
              </span>
              <kbd className="font-mono text-[10px] bg-void-400 px-1.5 py-0.5 rounded">⌘K</kbd>
            </button>
            <button
              onClick={() => setFocusMode(true)}
              className="mt-1.5 flex items-center justify-between rounded-xl border border-white/[0.06] bg-void-300/50 px-3 py-2 text-xs text-white/40 hover:border-neon/30 hover:text-white/70 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Focus size={13} /> Focus mode
              </span>
              <kbd className="font-mono text-[10px] bg-void-400 px-1.5 py-0.5 rounded">⌘F</kbd>
            </button>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 min-w-0 relative">
        {focusMode && (
          <button
            onClick={() => setFocusMode(false)}
            className="fixed top-4 right-4 z-40 glass-card px-3 py-2 text-xs text-white/60 hover:text-white"
          >
            Exit focus mode (Esc)
          </button>
        )}
        <div className="max-w-[1400px] mx-auto p-4 md:p-8 pb-24">{children}</div>

        {/* Mobile bottom nav */}
        {!focusMode && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-white/[0.08] flex overflow-x-auto z-30">
            {NAV_ITEMS.slice(0, 6).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-4 py-2.5 text-[10px] shrink-0 ${
                    isActive ? 'text-electric' : 'text-white/40'
                  }`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </main>
    </div>
  );
}
