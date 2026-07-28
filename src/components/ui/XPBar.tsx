import { motion } from 'framer-motion';

interface XPBarProps {
  progress: number; // 0-1
  label?: string;
  height?: number;
}

export default function XPBar({ progress, label, height = 14 }: XPBarProps) {
  return (
    <div className="w-full">
      {label && <div className="mb-1.5 text-xs font-mono text-white/50">{label}</div>}
      <div
        className="w-full rounded-full bg-void-400/80 border border-white/[0.06] overflow-hidden relative"
        style={{ height }}
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-electric via-electric-glow to-violet relative overflow-hidden"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ boxShadow: '0 0 12px rgba(59,130,246,0.6)' }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse-glow" />
        </motion.div>
      </div>
    </div>
  );
}
