import { motion } from 'framer-motion';
import { Flame, Trophy, Clock, Target, TrendingUp, CalendarCheck, Sparkles, Shield } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import ProgressRing from '@/components/ui/ProgressRing';
import XPBar from '@/components/ui/XPBar';
import StatChip from '@/components/ui/StatChip';
import { useProgressData } from '@/hooks/useProgressData';
import { formatMinutes } from '@/lib/stats';

export default function Dashboard() {
  const {
    levelInfo,
    rank,
    disciplineScore,
    disciplineColor,
    disciplineLabel,
    currentStreak,
    longestStreak,
    todayStudyMin,
    dailyScore,
    weeklyScore,
    monthlyScore,
    overallCompletion,
    characterStats,
    totalHours,
  } = useProgressData();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Your evolution, quantified.</p>
      </header>

      {/* Hero row: Level card + Discipline ring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <GlassCard glow="blue" className="lg:col-span-2 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-electric/10 rounded-full blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center gap-6">
            <ProgressRing percent={levelInfo.progress * 100} color="#3B82F6" size={140} strokeWidth={10}>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Level</div>
                <div className="text-4xl font-display font-bold text-electric text-glow-blue">{levelInfo.level}</div>
              </div>
            </ProgressRing>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Shield size={14} className="text-violet" />
                <span className="text-sm font-semibold text-violet text-glow-purple">{rank}</span>
              </div>
              <div className="font-display text-xl font-bold mb-3">
                {levelInfo.totalXP.toLocaleString()} XP Total
              </div>
              <XPBar
                progress={levelInfo.progress}
                label={`${levelInfo.currentLevelXP} / ${levelInfo.xpForCurrentLevelSpan} XP to Level ${levelInfo.level + 1}`}
              />
              <div className="flex flex-wrap gap-2 mt-4">
                <StatChip icon={Flame} label="Streak" value={`${currentStreak}d`} color="#F97316" />
                <StatChip icon={Trophy} label="Longest" value={`${longestStreak}d`} color="#A855F7" />
                <StatChip icon={Clock} label="Study Today" value={formatMinutes(todayStudyMin)} color="#3B82F6" />
                <StatChip icon={TrendingUp} label="Total Hours" value={`${totalHours.toFixed(1)}h`} color="#39FF88" />
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard glow="purple" delay={0.05} className="flex flex-col items-center justify-center text-center">
          <div className="text-xs uppercase tracking-widest text-white/40 font-mono mb-2">Discipline</div>
          <ProgressRing percent={disciplineScore} color={disciplineColor} size={130} strokeWidth={11}>
            <div>
              <div className="text-3xl font-display font-bold" style={{ color: disciplineColor }}>
                {disciplineScore}%
              </div>
            </div>
          </ProgressRing>
          <div className="mt-2 text-sm font-semibold" style={{ color: disciplineColor }}>
            {disciplineLabel}
          </div>
          <div className="text-xs text-white/30 mt-1">30-day rolling window</div>
        </GlassCard>
      </div>

      {/* Score row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard icon={Sparkles} label="Daily Score" value={dailyScore} color="#3B82F6" delay={0.1} />
        <ScoreCard icon={CalendarCheck} label="Weekly Score" value={weeklyScore} color="#A855F7" delay={0.15} />
        <ScoreCard icon={Target} label="Monthly Score" value={monthlyScore} color="#39FF88" delay={0.2} />
        <ScoreCard icon={Trophy} label="Overall Completion" value={overallCompletion} color="#F97316" delay={0.25} />
      </div>

      {/* Character mini stats */}
      <GlassCard delay={0.3}>
        <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4">Character Snapshot</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(characterStats).map(([key, value]) => (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="capitalize text-white/60">{key}</span>
                <span className="text-white/80 font-mono">{Math.round(value)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-void-400 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full bg-gradient-to-r from-electric to-violet"
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function ScoreCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
  delay: number;
}) {
  return (
    <GlassCard delay={delay} className="text-center">
      <Icon size={20} className="mx-auto mb-2" style={{ color }} />
      <div className="text-2xl font-display font-bold" style={{ color }}>
        {value}%
      </div>
      <div className="text-[11px] text-white/40 mt-1 font-mono uppercase tracking-wide">{label}</div>
    </GlassCard>
  );
}
