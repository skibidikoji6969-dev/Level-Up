import { useState } from 'react';
import { motion } from 'framer-motion';
import { Atom, Stethoscope, GraduationCap, BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import type { AcademicGoalType } from '@/types';
import { setAcademicGoal } from '@/lib/actions';

const GOALS: { id: AcademicGoalType; label: string; description: string; icon: typeof Atom }[] = [
  { id: 'jee_main', label: 'JEE Main', description: 'Full Physics, Chemistry & Maths syllabus', icon: Atom },
  { id: 'jee_advanced', label: 'JEE Advanced', description: 'Full Physics, Chemistry & Maths syllabus', icon: Atom },
  { id: 'neet', label: 'NEET', description: 'Physics, Chemistry & Biology syllabus', icon: Stethoscope },
  { id: 'class_11', label: 'Class 11', description: 'Build your own subject list', icon: BookOpen },
  { id: 'class_12', label: 'Class 12', description: 'Build your own subject list', icon: BookOpen },
  { id: 'custom', label: 'Custom Goal', description: 'Name your own exam or target', icon: Sparkles },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [selected, setSelected] = useState<AcademicGoalType | null>(null);
  const [customName, setCustomName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [saving, setSaving] = useState(false);

  const canContinue = selected && (selected !== 'custom' || customName.trim().length > 0);

  async function handleContinue() {
    if (!selected || saving) return;
    setSaving(true);
    await setAcademicGoal(selected, examDate || null, customName.trim() || undefined);
    setSaving(false);
    onDone();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-void-100">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-3xl"
      >
        <div className="text-center mb-8">
          <div className="font-display text-2xl md:text-3xl font-bold text-glow-blue text-electric mb-2">
            Welcome to PROGRESS<span className="text-white/30">//</span>OS
          </div>
          <p className="text-white/50 text-sm md:text-base">
            What are you preparing for? We'll build your syllabus tracker automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {GOALS.map((g) => {
            const Icon = g.icon;
            const active = selected === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setSelected(g.id)}
                className="text-left"
              >
                <GlassCard glow={active ? 'blue' : undefined}>
                  <div className={`flex items-start gap-3 ${active ? 'ring-1 ring-electric/40 rounded-xl -m-1 p-1' : ''}`}>
                    <div
                      className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                        active ? 'bg-electric/20 text-electric' : 'bg-white/[0.06] text-white/50'
                      }`}
                    >
                      <Icon size={19} />
                    </div>
                    <div>
                      <div className={`font-display text-sm font-semibold ${active ? 'text-electric' : 'text-white/80'}`}>
                        {g.label}
                      </div>
                      <div className="text-xs text-white/40 mt-0.5">{g.description}</div>
                    </div>
                  </div>
                </GlassCard>
              </button>
            );
          })}
        </div>

        {selected === 'custom' && (
          <div className="mb-6">
            <GlassCard glow="purple">
              <label className="text-xs text-white/40 uppercase tracking-wide">Goal name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. CUET, Olympiad, Board Exams"
                className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:border-electric/40"
              />
            </GlassCard>
          </div>
        )}

        {selected && (
          <div className="mb-8">
            <GlassCard>
              <label className="text-xs text-white/40 uppercase tracking-wide flex items-center gap-2">
                <GraduationCap size={13} /> Target exam date (optional — you can set this later in Settings)
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:border-electric/40"
              />
            </GlassCard>
          </div>
        )}

        <div className="flex justify-center">
          <button
            disabled={!canContinue || saving}
            onClick={handleContinue}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-display text-sm font-semibold transition-all ${
              canContinue && !saving
                ? 'bg-electric/20 text-electric border border-electric/40 shadow-glow-blue hover:bg-electric/30'
                : 'bg-white/[0.04] text-white/30 border border-white/[0.06] cursor-not-allowed'
            }`}
          >
            {saving ? 'Setting up your syllabus…' : 'Start tracking'}
            {!saving && <ArrowRight size={16} />}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
