import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, Clock, Target, X, ChevronRight } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { db } from '@/db/database';
import { createSubject, createTopic, logStudySession, setTopicStatus, updateTopic, logRevision, logMockTest } from '@/lib/actions';
import type { Topic, TopicStatus } from '@/types';
import { formatMinutes } from '@/lib/stats';

const SUBJECT_COLORS = ['#3B82F6', '#A855F7', '#39FF88', '#F97316', '#EC4899', '#06B6D4', '#EAB308'];

const STATUS_META: Record<TopicStatus, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: '#6B7280' },
  learning: { label: 'Learning', color: '#3B82F6' },
  practicing: { label: 'Practicing', color: '#EAB308' },
  revising: { label: 'Revising', color: '#F97316' },
  mastered: { label: 'Mastered', color: '#39FF88' },
};

export default function StudyTracker() {
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) ?? [];
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showLogSession, setShowLogSession] = useState(false);

  const topics = useLiveQuery(
    () => (selectedSubject ? db.topics.where('subjectId').equals(selectedSubject).toArray() : Promise.resolve<Topic[]>([])),
    [selectedSubject]
  ) ?? [];

  const activeSubject = subjects.find((s) => s.id === selectedSubject);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Study Tracker</h1>
          <p className="text-white/40 text-sm mt-1">Subjects, topics, and every session that builds them.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowLogSession(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-electric/15 border border-electric/40 text-electric text-sm font-medium hover:shadow-glow-blue transition-all"
          >
            <Clock size={15} /> Log Session
          </button>
          <button
            onClick={() => logRevision()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/15 border border-orange-500/40 text-orange-400 text-sm font-medium hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all"
            title="+30 XP"
          >
            Revision Done
          </button>
          <button
            onClick={() => logMockTest()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon/15 border border-neon/40 text-neon text-sm font-medium hover:shadow-glow-green transition-all"
            title="+50 XP"
          >
            Mock Test Done
          </button>
          <button
            onClick={() => setShowAddSubject(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet/15 border border-violet/40 text-violet text-sm font-medium hover:shadow-glow-purple transition-all"
          >
            <Plus size={15} /> Add Subject
          </button>
        </div>
      </header>

      {subjects.length === 0 ? (
        <GlassCard className="text-center py-16">
          <BookOpen className="mx-auto mb-3 text-white/20" size={40} />
          <p className="text-white/40 text-sm">No subjects yet. Add your first subject to begin tracking.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s, i) => (
            <SubjectCard key={s.id} subjectId={s.id} name={s.name} color={s.color} delay={i * 0.05} onOpen={() => setSelectedSubject(s.id)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {activeSubject && (
          <TopicPanel
            subjectId={activeSubject.id}
            subjectName={activeSubject.name}
            subjectColor={activeSubject.color}
            topics={topics}
            onClose={() => setSelectedSubject(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddSubject && <AddSubjectModal onClose={() => setShowAddSubject(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showLogSession && <LogSessionModal subjects={subjects} onClose={() => setShowLogSession(false)} />}
      </AnimatePresence>
    </div>
  );
}

function SubjectCard({
  subjectId,
  name,
  color,
  delay,
  onOpen,
}: {
  subjectId: string;
  name: string;
  color: string;
  delay: number;
  onOpen: () => void;
}) {
  const topics = useLiveQuery(() => db.topics.where('subjectId').equals(subjectId).toArray(), [subjectId]) ?? [];
  const sessions = useLiveQuery(() => db.sessions.where('subjectId').equals(subjectId).toArray(), [subjectId]) ?? [];
  const totalMin = sessions.reduce((s, x) => s + x.durationMin, 0);
  const mastered = topics.filter((t) => t.status === 'mastered').length;
  const avgConfidence = topics.length ? Math.round(topics.reduce((s, t) => s + t.confidence, 0) / topics.length) : 0;

  return (
    <GlassCard delay={delay} className="cursor-pointer group" glow="blue">
      <div onClick={onOpen}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
            <span className="font-display font-semibold">{name}</span>
          </div>
          <ChevronRight size={16} className="text-white/20 group-hover:text-white/60 transition-colors" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold font-mono" style={{ color }}>{formatMinutes(totalMin)}</div>
            <div className="text-[10px] text-white/30 uppercase">Studied</div>
          </div>
          <div>
            <div className="text-lg font-bold font-mono" style={{ color }}>{mastered}/{topics.length}</div>
            <div className="text-[10px] text-white/30 uppercase">Mastered</div>
          </div>
          <div>
            <div className="text-lg font-bold font-mono" style={{ color }}>{avgConfidence}%</div>
            <div className="text-[10px] text-white/30 uppercase">Confidence</div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function TopicPanel({
  subjectId,
  subjectName,
  subjectColor,
  topics,
  onClose,
}: {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  topics: Topic[];
  onClose: () => void;
}) {
  const [newTopic, setNewTopic] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6"
        style={{ borderColor: `${subjectColor}40` }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl font-bold" style={{ color: subjectColor }}>{subjectName}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 mb-5">
          <input
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="New topic name..."
            className="flex-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:border-electric/40"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTopic.trim()) {
                createTopic(subjectId, newTopic.trim());
                setNewTopic('');
              }
            }}
          />
          <button
            onClick={() => {
              if (newTopic.trim()) {
                createTopic(subjectId, newTopic.trim());
                setNewTopic('');
              }
            }}
            className="px-3 py-2 rounded-lg bg-electric/15 border border-electric/40 text-electric text-sm"
          >
            Add
          </button>
        </div>

        <div className="space-y-2">
          {topics.length === 0 && <div className="text-white/30 text-sm text-center py-6">No topics yet.</div>}
          {topics.map((t) => (
            <div key={t.id} className="rounded-xl bg-void-300/40 border border-white/[0.06] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t.name}</span>
                <select
                  value={t.status}
                  onChange={(e) => setTopicStatus(t.id, e.target.value as TopicStatus)}
                  className="text-xs bg-void-400 border border-white/[0.08] rounded-md px-2 py-1 outline-none"
                  style={{ color: STATUS_META[t.status].color }}
                >
                  {Object.entries(STATUS_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/40">
                <span>{formatMinutes(t.timeSpentMin)}</span>
                <span>·</span>
                <span>{t.questionsSolved} Qs</span>
                <span>·</span>
                <span className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={t.confidence}
                    onChange={(e) => updateTopic(t.id, { confidence: Number(e.target.value) })}
                    className="w-full accent-electric"
                  />
                </span>
                <span className="font-mono text-white/60 w-10 text-right">{t.confidence}%</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AddSubjectModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card glow-border-purple w-full max-w-sm p-6"
      >
        <h3 className="font-display text-lg font-bold mb-4">New Subject</h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Physics"
          className="w-full bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:border-violet/40 mb-4"
        />
        <div className="flex gap-2 mb-5">
          {SUBJECT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full transition-transform"
              style={{ background: c, transform: color === c ? 'scale(1.2)' : 'scale(1)', boxShadow: color === c ? `0 0 10px ${c}` : 'none' }}
            />
          ))}
        </div>
        <button
          onClick={() => {
            if (name.trim()) {
              createSubject(name.trim(), color);
              onClose();
            }
          }}
          className="w-full py-2.5 rounded-lg bg-violet/15 border border-violet/40 text-violet font-medium hover:shadow-glow-purple transition-all"
        >
          Create Subject
        </button>
      </motion.div>
    </motion.div>
  );
}

function LogSessionModal({ subjects, onClose }: { subjects: { id: string; name: string; color: string }[]; onClose: () => void }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const topics = useLiveQuery(() => (subjectId ? db.topics.where('subjectId').equals(subjectId).toArray() : Promise.resolve<Topic[]>([])), [subjectId]) ?? [];
  const [topicId, setTopicId] = useState<string>('');
  const [duration, setDuration] = useState(45);
  const [questions, setQuestions] = useState(0);
  const [focus, setFocus] = useState(3);
  const [noPhone, setNoPhone] = useState(false);

  if (subjects.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
        <div className="glass-card p-6 text-center text-white/50 text-sm" onClick={(e) => e.stopPropagation()}>
          Add a subject first before logging a session.
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card glow-border-blue w-full max-w-md p-6 space-y-4"
      >
        <h3 className="font-display text-lg font-bold">Log Study Session</h3>

        <div>
          <label className="text-xs text-white/40 uppercase tracking-wide">Subject</label>
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setTopicId('');
            }}
            className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {topics.length > 0 && (
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Topic (optional)</label>
            <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none">
              <option value="">— None —</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Duration (min)</label>
            <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Questions Solved</label>
            <input type="number" value={questions} onChange={(e) => setQuestions(Number(e.target.value))} className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
        </div>

        <div>
          <label className="text-xs text-white/40 uppercase tracking-wide">Focus Rating: {focus}/5</label>
          <input type="range" min={1} max={5} value={focus} onChange={(e) => setFocus(Number(e.target.value))} className="w-full accent-electric mt-1" />
        </div>

        <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
          <input type="checkbox" checked={noPhone} onChange={(e) => setNoPhone(e.target.checked)} className="accent-neon" />
          No phone during this session (+20 XP)
        </label>

        <button
          onClick={() => {
            logStudySession({ subjectId, topicId: topicId || null, durationMin: duration, questionsSolved: questions, focusRating: focus, noPhone });
            onClose();
          }}
          className="w-full py-2.5 rounded-lg bg-electric/15 border border-electric/40 text-electric font-medium hover:shadow-glow-blue transition-all flex items-center justify-center gap-2"
        >
          <Target size={16} /> Log Session
        </button>
      </motion.div>
    </motion.div>
  );
}
