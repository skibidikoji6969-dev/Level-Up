import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import GlassCard from './ui/GlassCard';
import ProgressRing from './ui/ProgressRing';
import { db } from '@/db/database';
import { useUIStore } from '@/store/useUIStore';

export default function PomodoroTimer({ taskId, onComplete }: { taskId: string | null; onComplete: () => void }) {
  const settings = useLiveQuery(() => db.settings.get('settings'), []);
  const focusMin = settings?.pomodoroMin ?? 25;
  const breakMin = settings?.breakMin ?? 5;

  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [secondsLeft, setSecondsLeft] = useState(focusMin * 60);
  const [running, setRunning] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const pushToast = useUIStore((s) => s.pushToast);

  useEffect(() => {
    if (!running) {
      setSecondsLeft(mode === 'focus' ? focusMin * 60 : breakMin * 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMin, breakMin, mode]);

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            const finishingFocus = mode === 'focus';
            setMode(finishingFocus ? 'break' : 'focus');
            if (finishingFocus) {
              setCompletedCount((c) => c + 1);
              onComplete();
              pushToast({ title: 'Pomodoro complete', description: 'Time for a short break', variant: 'info' });
            } else {
              pushToast({ title: 'Break over', description: 'Back to focus', variant: 'info' });
            }
            return finishingFocus ? breakMin * 60 : focusMin * 60;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode, focusMin, breakMin, onComplete, pushToast]);

  const total = (mode === 'focus' ? focusMin : breakMin) * 60;
  const percent = ((total - secondsLeft) / total) * 100;
  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const ss = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <GlassCard glow={mode === 'focus' ? 'blue' : 'green'} className="flex flex-col items-center text-center">
      <div className="text-xs uppercase tracking-widest text-white/40 font-mono mb-3">
        {mode === 'focus' ? 'Focus' : 'Break'} {taskId ? '· linked to task' : ''}
      </div>
      <ProgressRing percent={percent} color={mode === 'focus' ? '#3B82F6' : '#39FF88'} size={140}>
        <div className="font-mono text-3xl font-bold">{mm}:{ss}</div>
      </ProgressRing>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setRunning((r) => !r)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-electric/15 border border-electric/40 text-electric text-sm font-medium hover:shadow-glow-blue transition-all"
        >
          {running ? <Pause size={15} /> : <Play size={15} />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setSecondsLeft((mode === 'focus' ? focusMin : breakMin) * 60);
          }}
          className="p-2 rounded-xl bg-void-300/50 border border-white/[0.08] text-white/40 hover:text-white transition-colors"
        >
          <RotateCcw size={15} />
        </button>
      </div>
      <div className="mt-3 text-xs text-white/30">{completedCount} pomodoros this session</div>
    </GlassCard>
  );
}
