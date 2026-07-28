import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import GlassCard from '@/components/ui/GlassCard';
import { db, todayISO } from '@/db/database';
import { getOrCreateDailyLog, updateDailyLog } from '@/lib/actions';
import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Smile } from 'lucide-react';
import { addDays } from '@/lib/stats';
import type { DailyLog } from '@/types';

const MOOD_EMOJI = ['😞', '😕', '😐', '🙂', '😄'];

export default function Journal() {
  const [date, setDate] = useState(todayISO());
  const log = useLiveQuery(() => db.dailyLogs.get(date), [date]);
  const [local, setLocal] = useState<Record<string, any>>({});

  useEffect(() => {
    getOrCreateDailyLog(date);
  }, [date]);

  useEffect(() => {
    setLocal({});
  }, [date]);

  const val = (field: string, fallback: any) =>
    field in local ? local[field] : (log as DailyLog | undefined)?.[field as keyof DailyLog] ?? fallback;

  function commit(field: string, value: any) {
    setLocal((prev) => ({ ...prev, [field]: value }));
    updateDailyLog(date, { [field]: value } as any);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Journal</h1>
          <p className="text-white/40 text-sm mt-1">Reflect, log, and calibrate tomorrow.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDate(addDays(date, -1))} className="p-2 rounded-lg glass hover:text-electric">
            <ChevronLeft size={18} />
          </button>
          <span className="font-mono text-sm text-white/60 w-28 text-center">{date}</span>
          <button
            onClick={() => setDate(addDays(date, 1))}
            disabled={date >= todayISO()}
            className="p-2 rounded-lg glass hover:text-electric disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <GlassCard glow="blue" className="lg:col-span-1">
          <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
            <Smile size={15} /> Mood & Energy
          </h2>
          <div className="mb-5">
            <div className="text-xs text-white/40 mb-2">Mood</div>
            <div className="flex gap-2 justify-between">
              {MOOD_EMOJI.map((e, i) => (
                <button
                  key={i}
                  onClick={() => commit('mood', i + 1)}
                  className={`text-2xl p-2 rounded-xl transition-all ${
                    val('mood', 0) === i + 1 ? 'bg-electric/20 scale-110 shadow-glow-blue' : 'opacity-40 hover:opacity-80'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/40 mb-2">Energy: {val('energy', 3)}/5</div>
            <input
              type="range"
              min={1}
              max={5}
              value={val('energy', 3)}
              onChange={(e) => commit('energy', Number(e.target.value))}
              className="w-full accent-neon"
            />
          </div>

          <div className="mt-5 space-y-3">
            <ToggleRow label="Woke up on time" value={val('wokeOnTime', false)} onChange={(v) => commit('wokeOnTime', v)} />
            <ToggleRow label="Late start today" value={val('lateStart', false)} onChange={(v) => commit('lateStart', v)} />
            <ToggleRow label="Workout done" value={val('workoutDone', false)} onChange={(v) => commit('workoutDone', v)} />
            <ToggleRow label="Consistent bedtime" value={val('bedTimeConsistent', false)} onChange={(v) => commit('bedTimeConsistent', v)} />
            <div>
              <label className="text-xs text-white/40">Sleep (hours)</label>
              <input
                type="number"
                step={0.5}
                value={val('sleepHours', 0)}
                onChange={(e) => commit('sleepHours', Number(e.target.value))}
                className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-white/40">Reading (min)</label>
              <input
                type="number"
                value={val('readingMin', 0)}
                onChange={(e) => commit('readingMin', Number(e.target.value))}
                className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-white/40">Meditation (min)</label>
              <input
                type="number"
                value={val('meditationMin', 0)}
                onChange={(e) => commit('meditationMin', Number(e.target.value))}
                className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-white/40">Screen time (min)</label>
              <input
                type="number"
                value={val('screenTimeMin', 0)}
                onChange={(e) => commit('screenTimeMin', Number(e.target.value))}
                className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-white/40">Procrastination today: {val('procrastinationRating', 3)}/5</label>
              <input
                type="range"
                min={1}
                max={5}
                value={val('procrastinationRating', 3)}
                onChange={(e) => commit('procrastinationRating', Number(e.target.value))}
                className="w-full accent-orange-500 mt-1"
              />
            </div>
          </div>
        </GlassCard>

        <GlassCard glow="purple" className="lg:col-span-2 space-y-4">
          <h2 className="font-display text-sm uppercase tracking-widest text-white/50">Reflection</h2>
          <JournalField label="Notes" field="journalNotes" val={val} commit={commit} />
          <JournalField label="Wins today" field="wins" val={val} commit={commit} />
          <JournalField label="Failures / setbacks" field="failures" val={val} commit={commit} />
          <JournalField label="Lessons learned" field="lessons" val={val} commit={commit} />
          <JournalField label="Tomorrow's focus" field="tomorrowFocus" val={val} commit={commit} />
        </GlassCard>
      </div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/60">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-neon/40' : 'bg-void-400'}`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`}
          style={value ? { boxShadow: '0 0 8px #39FF88' } : {}}
        />
      </button>
    </div>
  );
}

function JournalField({ label, field, val, commit }: { label: string; field: string; val: any; commit: any }) {
  return (
    <div>
      <label className="text-xs text-white/40 uppercase tracking-wide">{label}</label>
      <textarea
        value={val(field, '')}
        onChange={(e) => commit(field, e.target.value)}
        rows={2}
        className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:border-violet/40 resize-none"
        placeholder="..."
      />
    </div>
  );
}
