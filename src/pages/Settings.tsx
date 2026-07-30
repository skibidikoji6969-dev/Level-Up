import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import GlassCard from '@/components/ui/GlassCard';
import { db } from '@/db/database';
import { updateExamDate, resetAcademicProgress, generateSyllabusForGoal } from '@/lib/actions';
import type { AcademicGoalType } from '@/types';

const GOAL_OPTIONS: { id: AcademicGoalType; label: string }[] = [
  { id: 'jee_main', label: 'JEE Main' },
  { id: 'jee_advanced', label: 'JEE Advanced' },
  { id: 'neet', label: 'NEET' },
  { id: 'class_11', label: 'Class 11' },
  { id: 'class_12', label: 'Class 12' },
  { id: 'custom', label: 'Custom Goal' },
];

const GOAL_LABELS: Record<string, string> = {
  jee_main: 'JEE Main',
  jee_advanced: 'JEE Advanced',
  neet: 'NEET',
  class_11: 'Class 11',
  class_12: 'Class 12',
  custom: 'Custom Goal',
};

export default function Settings() {
  const settings = useLiveQuery(() => db.settings.get('settings'), []);
  const academicProfile = useLiveQuery(() => db.academicProfile.get('academic'), []);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [pendingGoal, setPendingGoal] = useState<AcademicGoalType | null>(null);
  const [pendingCustomName, setPendingCustomName] = useState('');
  const [confirmingGoalChange, setConfirmingGoalChange] = useState(false);

  if (!settings) return null;

  async function patch(field: string, value: any) {
    await db.settings.update('settings', { [field]: value });
  }

  async function handleResetAcademic() {
    if (!confirmingReset) {
      setConfirmingReset(true);
      return;
    }
    await resetAcademicProgress();
    setConfirmingReset(false);
  }

  async function handleConfirmGoalChange() {
    if (!pendingGoal || !academicProfile) return;
    if (!confirmingGoalChange) {
      setConfirmingGoalChange(true);
      return;
    }
    await generateSyllabusForGoal(pendingGoal, academicProfile.examDate, pendingCustomName.trim() || undefined);
    setPendingGoal(null);
    setPendingCustomName('');
    setConfirmingGoalChange(false);
  }

  const goalLabel = academicProfile
    ? academicProfile.goal === 'custom'
      ? academicProfile.customGoalName || 'Custom Goal'
      : GOAL_LABELS[academicProfile.goal ?? ''] ?? 'Not set'
    : 'Not set';

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-white/40 text-sm mt-1">Tune the system to how you actually work.</p>
      </header>

      {academicProfile && (
        <GlassCard glow="green">
          <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4">Academic</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wide">Goal</label>
              <div className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/70">
                {goalLabel}
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.06]">
              <label className="text-xs text-white/40 uppercase tracking-wide">Change Goal</label>
              <p className="text-[11px] text-white/30 mt-0.5 mb-2">
                Switching regenerates your syllabus (Physics/Chemistry/etc. chapters in Study Tracker) for the new
                goal. Your study sessions, XP, and any manually-added subjects are not affected.
              </p>
              <select
                value={pendingGoal ?? ''}
                onChange={(e) => {
                  setPendingGoal((e.target.value || null) as AcademicGoalType | null);
                  setConfirmingGoalChange(false);
                }}
                className="w-full bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:border-electric/40"
              >
                <option value="">Select a new goal…</option>
                {GOAL_OPTIONS.map((g) => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>

              {pendingGoal === 'custom' && (
                <input
                  type="text"
                  value={pendingCustomName}
                  onChange={(e) => setPendingCustomName(e.target.value)}
                  placeholder="Goal name"
                  className="w-full mt-2 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:border-electric/40"
                />
              )}

              {pendingGoal && (
                <button
                  onClick={handleConfirmGoalChange}
                  onBlur={() => setConfirmingGoalChange(false)}
                  className={`mt-2 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                    confirmingGoalChange
                      ? 'bg-red-500/20 border-red-500/40 text-red-300'
                      : 'bg-electric/15 border-electric/40 text-electric hover:shadow-glow-blue'
                  }`}
                >
                  {confirmingGoalChange ? 'Click again to confirm — regenerates your syllabus' : 'Update Goal'}
                </button>
              )}
            </div>

            <div>
              <label className="text-xs text-white/40 uppercase tracking-wide">Exam Date</label>
              <input
                type="date"
                value={academicProfile.examDate ?? ''}
                onChange={(e) => updateExamDate(e.target.value || null)}
                className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:border-electric/40"
              />
            </div>
            <div className="pt-2 border-t border-white/[0.06]">
              <button
                onClick={handleResetAcademic}
                onBlur={() => setConfirmingReset(false)}
                className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                  confirmingReset
                    ? 'bg-red-500/20 border-red-500/40 text-red-300'
                    : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80'
                }`}
              >
                {confirmingReset ? 'Click again to confirm — this wipes your syllabus & goal' : 'Reset Academic Progress'}
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard glow="blue">
        <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4">XP & Leveling</h2>
        <div className="space-y-4">
          <SliderRow
            label={`XP Multiplier: ${settings.xpMultiplier.toFixed(1)}x`}
            value={settings.xpMultiplier}
            min={0.5}
            max={2}
            step={0.1}
            onChange={(v) => patch('xpMultiplier', v)}
          />
          <NumberRow label="Daily Study Goal (minutes)" value={settings.dailyStudyGoalMin} onChange={(v) => patch('dailyStudyGoalMin', v)} />
        </div>
      </GlassCard>

      <GlassCard glow="purple">
        <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4">Pomodoro</h2>
        <div className="grid grid-cols-2 gap-4">
          <NumberRow label="Focus Duration (min)" value={settings.pomodoroMin} onChange={(v) => patch('pomodoroMin', v)} />
          <NumberRow label="Break Duration (min)" value={settings.breakMin} onChange={(v) => patch('breakMin', v)} />
        </div>
      </GlassCard>

      <GlassCard glow="green">
        <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4">Experience</h2>
        <div className="space-y-3">
          <ToggleRow label="Animations" value={settings.animations} onChange={(v) => patch('animations', v)} />
          <ToggleRow label="Sound effects" value={settings.soundEffects} onChange={(v) => patch('soundEffects', v)} />
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4">Theme Colors</h2>
        <div className="grid grid-cols-3 gap-4">
          <ColorRow label="Primary" value={settings.primaryColor} onChange={(v) => patch('primaryColor', v)} />
          <ColorRow label="Secondary" value={settings.secondaryColor} onChange={(v) => patch('secondaryColor', v)} />
          <ColorRow label="Accent" value={settings.accentColor} onChange={(v) => patch('accentColor', v)} />
        </div>
        <p className="text-xs text-white/30 mt-3">
          Color values are saved but the compiled Tailwind palette is what actually renders — edit{' '}
          <code className="text-white/50">tailwind.config.js</code> to permanently change the theme.
        </p>
      </GlassCard>
    </div>
  );
}

function SliderRow({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs text-white/40 uppercase tracking-wide">{label}</label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-electric mt-1" />
    </div>
  );
}

function NumberRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs text-white/40 uppercase tracking-wide">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:border-electric/40" />
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/60">{label}</span>
      <button onClick={() => onChange(!value)} className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-neon/40' : 'bg-void-400'}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-white/40 uppercase tracking-wide block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-9 h-9 rounded-lg bg-transparent border border-white/[0.08] cursor-pointer" />
        <span className="text-xs font-mono text-white/50">{value}</span>
      </div>
    </div>
  );
}
