import { AnimatePresence, motion } from 'framer-motion';
import { Zap, Trophy, TrendingUp, Info } from 'lucide-react';
import { useEffect } from 'react';
import { useUIStore } from '@/store/useUIStore';

const ICONS = {
  xp: Zap,
  achievement: Trophy,
  levelup: TrendingUp,
  info: Info,
};

const COLORS = {
  xp: { text: 'text-electric', border: 'border-electric/40', glow: 'shadow-glow-blue' },
  achievement: { text: 'text-neon', border: 'border-neon/40', glow: 'shadow-glow-green' },
  levelup: { text: 'text-violet', border: 'border-violet/40', glow: 'shadow-glow-purple' },
  info: { text: 'text-white/60', border: 'border-white/20', glow: '' },
};

function ToastItem({ toast }: { toast: ReturnType<typeof useUIStore.getState>['toasts'][number] }) {
  const dismiss = useUIStore((s) => s.dismissToast);
  const Icon = ICONS[toast.variant];
  const c = COLORS[toast.variant];

  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), 3800);
    return () => clearTimeout(t);
  }, [toast.id, dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`glass-card ${c.border} ${c.glow} min-w-[240px] max-w-[320px] px-4 py-3 flex items-start gap-3 cursor-pointer`}
      onClick={() => dismiss(toast.id)}
    >
      <Icon size={18} className={`${c.text} mt-0.5 shrink-0`} />
      <div className="min-w-0">
        <div className={`text-sm font-semibold ${c.text}`}>{toast.title}</div>
        {toast.description && <div className="text-xs text-white/50 mt-0.5 truncate">{toast.description}</div>}
      </div>
    </motion.div>
  );
}

export default function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
