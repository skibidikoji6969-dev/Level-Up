import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  BookOpen,
  Target,
  Repeat,
  FileCheck,
  ClipboardList,
  MoreHorizontal,
  CheckCircle2,
  Trash2,
  Zap,
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { db, todayISO } from '@/db/database';
import {
  createPlannerSlot,
  updatePlannerSlot,
  deletePlannerSlot,
  completePlannerSlot,
  rescheduleMissedSlot,
  savePlannerDrafts,
  updateEnergyProfile,
} from '@/lib/actions';
import {
  getEnergyProfile,
  getEffectiveSlotStatus,
  generateDailyPlan,
  TASK_TYPE_LABELS,
  TASK_TYPE_DEFAULT_DURATION,
  TASK_TYPE_DEFAULT_ENERGY,
  type DraftSlot,
  type TimeWindow,
} from '@/lib/planner';
import type { PlannerSlot, SlotTaskType, TaskPriority, EnergyLevel, TimeOfDay, Topic, Subject, Goal, Task } from '@/types';

const TASK_TYPE_ICON: Record<SlotTaskType, typeof BookOpen> = {
  new_learning: BookOpen,
  practice: Target,
  revision: Repeat,
  mock_test: FileCheck,
  assignment: ClipboardList,
  other: MoreHorizontal,
};

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: '#6B7280',
  medium: '#3B82F6',
  high: '#F97316',
  critical: '#EF4444',
};

const ENERGY_COLOR: Record<EnergyLevel, string> = {
  low: '#6B7280',
  medium: '#3B82F6',
  high: '#F97316',
};

function weekDatesFor(dateISO: string): string[] {
  const d = new Date(dateISO);
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd.toISOString().slice(0, 10);
  });
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SlotPlanner() {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [creatingForDate, setCreatingForDate] = useState<string | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);

  const subjects = useLiveQuery(() => db.subjects.toArray(), []) ?? [];
  const topics = useLiveQuery(() => db.topics.toArray(), []) ?? [];
  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const settings = useLiveQuery(() => db.settings.get('settings'), []);
  const allSlots = useLiveQuery(() => db.plannerSlots.toArray(), []) ?? [];

  const energyProfile = getEnergyProfile(settings);
  const weekDates = weekDatesFor(selectedDate);

  const slotsFor = (date: string) => allSlots.filter((s) => s.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-4">
      <GlassCard glow="green">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="font-display text-sm uppercase tracking-widest text-white/50">Energy Profile</h2>
          <span className="text-[11px] text-white/30">Used to match tasks with your natural energy by time of day</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <EnergySelect label="Morning" value={energyProfile.morning} onChange={(v) => updateEnergyProfile({ energyMorning: v })} />
          <EnergySelect label="Afternoon" value={energyProfile.afternoon} onChange={(v) => updateEnergyProfile({ energyAfternoon: v })} />
          <EnergySelect label="Evening" value={energyProfile.evening} onChange={(v) => updateEnergyProfile({ energyEvening: v })} />
          <EnergySelect label="Night" value={energyProfile.night} onChange={(v) => updateEnergyProfile({ energyNight: v })} />
        </div>
      </GlassCard>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-void-300/50 border border-white/[0.08] rounded-xl p-1">
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'day' ? 'bg-electric/20 text-electric' : 'text-white/40'}`}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'week' ? 'bg-electric/20 text-electric' : 'text-white/40'}`}
          >
            Week
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGenerate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon/15 border border-neon/40 text-neon text-sm font-medium hover:shadow-glow-green transition-all"
          >
            <Sparkles size={15} /> {selectedDate === todayISO() ? "Generate Today's Plan" : 'Generate Plan'}
          </button>
          <button
            onClick={() => setCreatingForDate(selectedDate)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-electric/15 border border-electric/40 text-electric text-sm font-medium hover:shadow-glow-blue transition-all"
          >
            <Plus size={15} /> Add Slot
          </button>
        </div>
      </div>

      {viewMode === 'day' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <DateNav
              date={selectedDate}
              onPrev={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().slice(0, 10));
              }}
              onNext={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().slice(0, 10));
              }}
            />
          </div>

          {slotsFor(selectedDate).length === 0 ? (
            <GlassCard className="text-center py-12 text-white/40 text-sm">No time slots for this day yet.</GlassCard>
          ) : (
            <div className="space-y-2">
              {slotsFor(selectedDate).map((s) => (
                <SlotRow key={s.id} slot={s} subjects={subjects} topics={topics} onOpen={() => setEditingSlotId(s.id)} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-center gap-3 mb-3">
            <DateNav
              date={weekDates[0]}
              rangeLabel={`${weekDates[0]} – ${weekDates[6]}`}
              onPrev={() => {
                const d = new Date(weekDates[0]);
                d.setDate(d.getDate() - 7);
                setSelectedDate(d.toISOString().slice(0, 10));
              }}
              onNext={() => {
                const d = new Date(weekDates[0]);
                d.setDate(d.getDate() + 7);
                setSelectedDate(d.toISOString().slice(0, 10));
              }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {weekDates.map((date, i) => (
              <div key={date} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <div className="text-xs font-display font-semibold text-white/70">{WEEKDAY_LABELS[i]}</div>
                    <div className="text-[10px] text-white/30">{date.slice(5)}</div>
                  </div>
                  <button
                    onClick={() => setCreatingForDate(date)}
                    className="p-1 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-electric transition-colors"
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {slotsFor(date).map((s) => (
                    <SlotChip key={s.id} slot={s} subjects={subjects} onOpen={() => setEditingSlotId(s.id)} />
                  ))}
                  {slotsFor(date).length === 0 && <div className="text-[11px] text-white/20 text-center py-3">—</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {editingSlotId && (
          <SlotEditModal
            slotId={editingSlotId}
            subjects={subjects}
            topics={topics}
            onClose={() => setEditingSlotId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {creatingForDate && (
          <SlotCreateModal date={creatingForDate} subjects={subjects} topics={topics} onClose={() => setCreatingForDate(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGenerate && (
          <GeneratePlanModal
            date={selectedDate}
            subjects={subjects}
            topics={topics}
            goals={goals}
            tasks={tasks}
            energyProfile={energyProfile}
            existingSlots={allSlots.filter((s) => s.date === selectedDate)}
            onClose={() => setShowGenerate(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DateNav({ date, rangeLabel, onPrev, onNext }: { date: string; rangeLabel?: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onPrev} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors">
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm font-medium text-white/70 font-mono min-w-[140px] text-center">{rangeLabel ?? date}</span>
      <button onClick={onNext} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function EnergySelect({ label, value, onChange }: { label: string; value: EnergyLevel; onChange: (v: EnergyLevel) => void }) {
  return (
    <div>
      <label className="text-[10px] text-white/40 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as EnergyLevel)}
        className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs outline-none"
        style={{ color: ENERGY_COLOR[value] }}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
    </div>
  );
}

function subjectColorFor(subjects: { id: string; color: string }[], subjectId: string | null) {
  return subjects.find((s) => s.id === subjectId)?.color ?? '#6B7280';
}
function subjectNameFor(subjects: { id: string; name: string }[], subjectId: string | null) {
  return subjects.find((s) => s.id === subjectId)?.name ?? null;
}
function topicNameFor(topics: Topic[], topicId: string | null) {
  return topics.find((t) => t.id === topicId)?.name ?? null;
}

function SlotRow({
  slot,
  subjects,
  topics,
  onOpen,
}: {
  slot: PlannerSlot;
  subjects: { id: string; name: string; color: string }[];
  topics: Topic[];
  onOpen: () => void;
}) {
  const Icon = TASK_TYPE_ICON[slot.taskType];
  const status = getEffectiveSlotStatus(slot);
  const color = subjectColorFor(subjects, slot.subjectId);
  const title =
  topicNameFor(topics, slot.topicId) ??
  subjectNameFor(subjects, slot.subjectId) ??
  (slot.notes || TASK_TYPE_LABELS[slot.taskType]);

  return (
    <GlassCard delay={0} className="cursor-pointer" glow={status === 'missed' ? undefined : 'blue'}>
      <div onClick={onOpen} className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}22`, color }}
        >
          <Icon size={17} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{title}</span>
            {status === 'completed' && <CheckCircle2 size={14} className="text-neon shrink-0" />}
            {status === 'missed' && <AlertTriangle size={14} className="text-orange-400 shrink-0" />}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-white/35">
            <span className="font-mono">{slot.startTime}–{slot.endTime}</span>
            <span>·</span>
            <span>{TASK_TYPE_LABELS[slot.taskType]}</span>
            <span>·</span>
            <span style={{ color: PRIORITY_COLOR[slot.priority] }}>{slot.priority}</span>
            <span>·</span>
            <span className="flex items-center gap-1" style={{ color: ENERGY_COLOR[slot.energyRequirement] }}>
              <Zap size={10} /> {slot.energyRequirement}
            </span>
          </div>
        </div>
      </div>

      {status === 'missed' && <MissedSlotQuickActions slotId={slot.id} />}
    </GlassCard>
  );
}

function MissedSlotQuickActions({ slotId }: { slotId: string }) {
  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/[0.06]" onClick={(e) => e.stopPropagation()}>
      <span className="text-[11px] text-orange-400/80 flex items-center gap-1 mr-1">
        <AlertTriangle size={11} /> Missed —
      </span>
      <button onClick={() => rescheduleMissedSlot(slotId, 'tonight')} className="text-[11px] px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-white/60 hover:text-white">
        Tonight
      </button>
      <button onClick={() => rescheduleMissedSlot(slotId, 'tomorrow')} className="text-[11px] px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-white/60 hover:text-white">
        Tomorrow
      </button>
      <button onClick={() => rescheduleMissedSlot(slotId, 'next_available')} className="text-[11px] px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-white/60 hover:text-white">
        Next Available
      </button>
    </div>
  );
}

function SlotChip({ slot, subjects, onOpen }: { slot: PlannerSlot; subjects: { id: string; name: string; color: string }[]; onOpen: () => void }) {
  const Icon = TASK_TYPE_ICON[slot.taskType];
  const status = getEffectiveSlotStatus(slot);
  const color = subjectColorFor(subjects, slot.subjectId);
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-lg border px-2 py-1.5 text-[11px] transition-colors"
      style={{
        borderColor: status === 'missed' ? '#F9731660' : `${color}30`,
        background: status === 'completed' ? `${color}14` : 'transparent',
      }}
    >
      <div className="flex items-center gap-1.5">
        <Icon size={11} style={{ color }} />
        <span className="font-mono text-white/50">{slot.startTime}</span>
        {status === 'missed' && <AlertTriangle size={10} className="text-orange-400" />}
        {status === 'completed' && <CheckCircle2 size={10} className="text-neon" />}
      </div>
      <div className="truncate text-white/70 mt-0.5">{slot.notes || TASK_TYPE_LABELS[slot.taskType]}</div>
    </button>
  );
}

// ============================================================
// Manual create modal
// ============================================================
function SlotCreateModal({
  date,
  subjects,
  topics,
  onClose,
}: {
  date: string;
  subjects: { id: string; name: string; color: string }[];
  topics: Topic[];
  onClose: () => void;
}) {
  const [startTime, setStartTime] = useState('18:00');
  const [taskType, setTaskType] = useState<SlotTaskType>('practice');
  const [subjectId, setSubjectId] = useState<string>('');
  const [topicId, setTopicId] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [duration, setDuration] = useState(TASK_TYPE_DEFAULT_DURATION.practice);
  const [energy, setEnergy] = useState<EnergyLevel>(TASK_TYPE_DEFAULT_ENERGY.practice);
  const [notes, setNotes] = useState('');

  const subjectTopics = topics.filter((t) => t.subjectId === subjectId);

  function addMinutes(time: string, min: number) {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + min;
    const hh = Math.floor(((total % 1440) + 1440) % 1440 / 60);
    const mm = ((total % 60) + 60) % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card glow-border-blue w-full max-w-md p-6 space-y-4"
      >
        <h3 className="font-display text-lg font-bold">New Time Slot — {date}</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Start Time</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Duration (min)</label>
            <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
        </div>

        <div>
          <label className="text-xs text-white/40 uppercase tracking-wide">Task Type</label>
          <select
            value={taskType}
            onChange={(e) => {
              const tt = e.target.value as SlotTaskType;
              setTaskType(tt);
              setDuration(TASK_TYPE_DEFAULT_DURATION[tt]);
              setEnergy(TASK_TYPE_DEFAULT_ENERGY[tt]);
            }}
            className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none"
          >
            {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Subject</label>
            <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId(''); }} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none">
              <option value="">— None —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Topic</label>
            <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none" disabled={!subjectId}>
              <option value="">— None —</option>
              {subjectTopics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Energy Needed</label>
            <select value={energy} onChange={(e) => setEnergy(e.target.value as EnergyLevel)} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-white/40 uppercase tracking-wide">Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none" />
        </div>

        <button
          onClick={() => {
            createPlannerSlot({
              date,
              startTime,
              endTime: addMinutes(startTime, duration),
              subjectId: subjectId || null,
              topicId: topicId || null,
              taskType,
              priority,
              estimatedDuration: duration,
              energyRequirement: energy,
              notes,
            });
            onClose();
          }}
          className="w-full py-2.5 rounded-lg bg-electric/15 border border-electric/40 text-electric font-medium hover:shadow-glow-blue transition-all"
        >
          Create Slot
        </button>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Edit modal (also handles missed-slot reschedule + manual move + complete)
// ============================================================
function SlotEditModal({
  slotId,
  subjects,
  topics,
  onClose,
}: {
  slotId: string;
  subjects: { id: string; name: string; color: string }[];
  topics: Topic[];
  onClose: () => void;
}) {
  const slot = useLiveQuery(() => db.plannerSlots.get(slotId), [slotId]);
  const [draft, setDraft] = useState<PlannerSlot | null>(null);

  useEffect(() => {
    if (slot && !draft) setDraft(slot);
  }, [slot, draft]);

  if (!slot || !draft) return null;

  const status = getEffectiveSlotStatus(slot);
  const isMissed = status === 'missed';
  const subjectTopics = topics.filter((t) => t.subjectId === draft.subjectId);

  function handleSave() {
    if (!draft) return;
    if (isMissed) {
      rescheduleMissedSlot(slot!.id, 'manual', { date: draft.date, startTime: draft.startTime, endTime: draft.endTime });
    } else {
      updatePlannerSlot(slot!.id, {
        date: draft.date,
        startTime: draft.startTime,
        endTime: draft.endTime,
        subjectId: draft.subjectId,
        topicId: draft.topicId,
        taskType: draft.taskType,
        priority: draft.priority,
        energyRequirement: draft.energyRequirement,
        notes: draft.notes,
      });
    }
    onClose();
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Edit Time Slot</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>

        {isMissed && <MissedSlotQuickActions slotId={slot.id} />}

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="text-xs text-white/40 uppercase tracking-wide">Date</label>
            <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-2 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Start</label>
            <input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-2 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">End</label>
            <input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-2 py-2 text-sm outline-none" />
          </div>
        </div>

        <div>
          <label className="text-xs text-white/40 uppercase tracking-wide">Task Type</label>
          <select value={draft.taskType} onChange={(e) => setDraft({ ...draft, taskType: e.target.value as SlotTaskType })} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none">
            {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Subject</label>
            <select value={draft.subjectId ?? ''} onChange={(e) => setDraft({ ...draft, subjectId: e.target.value || null, topicId: null })} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none">
              <option value="">— None —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Topic</label>
            <select value={draft.topicId ?? ''} onChange={(e) => setDraft({ ...draft, topicId: e.target.value || null })} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none" disabled={!draft.subjectId}>
              <option value="">— None —</option>
              {subjectTopics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Priority</label>
            <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as TaskPriority })} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Energy Needed</label>
            <select value={draft.energyRequirement} onChange={(e) => setDraft({ ...draft, energyRequirement: e.target.value as EnergyLevel })} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-white/40 uppercase tracking-wide">Notes</label>
          <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none resize-none" />
        </div>

        <div className="flex gap-2 pt-2">
          {slot.status !== 'completed' && (
            <button
              onClick={() => { completePlannerSlot(slot.id); onClose(); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-neon/15 border border-neon/40 text-neon font-medium hover:shadow-glow-green transition-all"
            >
              <CheckCircle2 size={16} /> Mark Complete
            </button>
          )}
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-lg bg-electric/15 border border-electric/40 text-electric font-medium hover:shadow-glow-blue transition-all">
            Save Changes
          </button>
          <button
            onClick={() => { deletePlannerSlot(slot.id); onClose(); }}
            className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Generate Plan wizard
// ============================================================
function GeneratePlanModal({
  date,
  subjects,
  topics,
  goals,
  tasks,
  energyProfile,
  existingSlots,
  onClose,
}: {
  date: string;
  subjects: Subject[];
  topics: Topic[];
  goals: Goal[];
  tasks: Task[];
  energyProfile: Record<TimeOfDay, EnergyLevel>;
  existingSlots: PlannerSlot[];
  onClose: () => void;
}) {
  const [windows, setWindows] = useState<TimeWindow[]>([{ date, startTime: '18:00', endTime: '21:00' }]);
  const [drafts, setDrafts] = useState<DraftSlot[] | null>(null);

  function updateWindow(i: number, patch: Partial<TimeWindow>) {
    setWindows((w) => w.map((win, idx) => (idx === i ? { ...win, ...patch } : win)));
  }

  function generate() {
    const result = generateDailyPlan({
      date,
      windows,
      subjects,
      topics,
      goals,
      tasks,
      energyProfile,
      existingSlots,
    });
    setDrafts(result);
  }

  async function save() {
    if (drafts) await savePlannerDrafts(drafts);
    onClose();
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card glow-border-green w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold flex items-center gap-2"><Sparkles size={18} className="text-neon" /> Generate Plan — {date}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>

        {!drafts ? (
          <>
            <p className="text-xs text-white/40">Tell us your free windows today. We'll fill them using overdue revisions, weak chapters, goals, deadlines, practice, and new learning — in that priority order — while keeping breaks and mixing task types.</p>

            <div className="space-y-2">
              {windows.map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="time" value={w.startTime} onChange={(e) => updateWindow(i, { startTime: e.target.value })} className="flex-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none" />
                  <span className="text-white/30">–</span>
                  <input type="time" value={w.endTime} onChange={(e) => updateWindow(i, { endTime: e.target.value })} className="flex-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none" />
                  <button onClick={() => setWindows((ws) => ws.filter((_, idx) => idx !== i))} className="p-2 text-white/30 hover:text-red-400">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setWindows((ws) => [...ws, { date, startTime: '19:00', endTime: '20:00' }])}
                className="text-xs text-electric flex items-center gap-1"
              >
                <Plus size={12} /> Add another window
              </button>
            </div>

            <button onClick={generate} className="w-full py-2.5 rounded-lg bg-neon/15 border border-neon/40 text-neon font-medium hover:shadow-glow-green transition-all">
              Generate Preview
            </button>
          </>
        ) : (
          <>
            {drafts.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-6">No slots could be generated — try widening your free windows.</p>
            ) : (
              <div className="space-y-2">
                {drafts.map((d, i) => {
                  const Icon = TASK_TYPE_ICON[d.taskType];
                  return (
                    <div key={i} className="rounded-lg bg-void-300/40 border border-white/[0.06] p-2.5 flex items-start gap-2">
                      <Icon size={15} className="text-white/40 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-white/50">{d.startTime}–{d.endTime}</span>
                          <span className="text-white/70 truncate">{d.notes}</span>
                        </div>
                        <div className="text-[10px] text-white/30 mt-0.5">{TASK_TYPE_LABELS[d.taskType]} · {d.reason}</div>
                      </div>
                      <button onClick={() => setDrafts((ds) => ds!.filter((_, idx) => idx !== i))} className="text-white/20 hover:text-red-400">
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setDrafts(null)} className="flex-1 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 font-medium">
                Back
              </button>
              <button
                onClick={save}
                disabled={!drafts.length}
                className="flex-1 py-2.5 rounded-lg bg-neon/15 border border-neon/40 text-neon font-medium hover:shadow-glow-green transition-all disabled:opacity-40"
              >
                Save Plan
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
