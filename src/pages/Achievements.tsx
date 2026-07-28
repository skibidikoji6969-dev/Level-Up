import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Lock } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { db } from '@/db/database';
import { checkAchievements } from '@/lib/actions';
import { ACHIEVEMENT_DEFS } from '@/lib/achievements';

const TIER_STYLE: Record<string, { border: string; text: string; glow: string }> = {
  bronze: { border: 'border-orange-700/40', text: 'text-orange-400', glow: 'shadow-[0_0_16px_rgba(194,120,3,0.3)]' },
  silver: { border: 'border-slate-400/40', text: 'text-slate-300', glow: 'shadow-[0_0_16px_rgba(203,213,225,0.3)]' },
  gold: { border: 'border-yellow-500/40', text: 'text-yellow-400', glow: 'shadow-[0_0_16px_rgba(234,179,8,0.35)]' },
  platinum: { border: 'border-violet/40', text: 'text-violet', glow: 'shadow-glow-purple' },
};

export default function Achievements() {
  useEffect(() => {
    checkAchievements();
  }, []);

  const unlocked = useLiveQuery(() => db.achievements.toArray(), []) ?? [];
  const unlockedMap = new Map(unlocked.map((a) => [a.id, a]));
  const unlockedCount = unlocked.filter((a) => a.unlockedAt).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Achievements</h1>
        <p className="text-white/40 text-sm mt-1">
          {unlockedCount} / {ACHIEVEMENT_DEFS.length} unlocked
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {ACHIEVEMENT_DEFS.map((def, i) => {
          const record = unlockedMap.get(def.id);
          const isUnlocked = !!record?.unlockedAt;
          const IconComp = (Icons as any)[def.icon] ?? Icons.Award;
          const style = TIER_STYLE[def.tier];

          return (
            <motion.div
              key={def.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
            >
              <GlassCard
                className={`text-center relative overflow-hidden ${isUnlocked ? `${style.border} ${style.glow}` : 'opacity-50 grayscale'}`}
              >
                {isUnlocked && (
                  <div className={`absolute top-2 right-2 text-[9px] uppercase font-mono tracking-wider ${style.text}`}>
                    {def.tier}
                  </div>
                )}
                <div className="flex justify-center mb-2">
                  {isUnlocked ? (
                    <IconComp size={28} className={style.text} />
                  ) : (
                    <Lock size={24} className="text-white/20" />
                  )}
                </div>
                <div className="text-sm font-semibold">{def.title}</div>
                <div className="text-[11px] text-white/40 mt-1 leading-tight">{def.description}</div>
                {record?.unlockedAt && (
                  <div className="text-[10px] text-white/25 mt-2 font-mono">
                    {new Date(record.unlockedAt).toLocaleDateString()}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
