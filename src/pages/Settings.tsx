import { useLiveQuery } from 'dexie-react-hooks';
import GlassCard from '@/components/ui/GlassCard';
import { db } from '@/db/database';

export default function Settings() {
  const settings = useLiveQuery(() => db.settings.get('settings'), []);

  if (!settings) return null;

  async function patch(field: string, value: any) {
    await db.settings.update('settings', { [field]: value });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-white/40 text-sm mt-1">Tune the system to how you actually work.</p>
      </header>

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
