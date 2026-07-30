import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { X, Repeat, Clock, BookOpen } from 'lucide-react';
import { db } from '@/db/database';
import { updateTopic, logTopicRevision, getTopicRevisionHistory } from '@/lib/actions';
import { computeTopicReadiness } from '@/lib/academic';
import { formatMinutes } from '@/lib/stats';
import type { TopicRevision, StudySession } from '@/types';

export default function TopicDetailModal({
  topicId,
  subjectColor,
  onClose,
}: {
  topicId: string;
  subjectColor: string;
  onClose: () => void;
}) {
  const topic = useLiveQuery(() => db.topics.get(topicId), [topicId]);

  const [notes, setNotes] = useState('');
  const [mistakes, setMistakes] = useState('');
  const [formulae, setFormulae] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (topic && !hydrated) {
      setNotes(topic.notes ?? '');
      setMistakes(topic.mistakes ?? '');
      setFormulae(topic.formulae ?? '');
      setHydrated(true);
    }
  }, [topic, hydrated]);

  const sessions = useLiveQuery(() => db.sessions.where('topicId').equals(topicId).toArray(), [topicId]) ?? [];

  const [revisionHistory, setRevisionHistory] = useState<TopicRevision[]>([]);
  useEffect(() => {
    getTopicRevisionHistory(topicId).then(setRevisionHistory);
  }, [topicId, topic?.revisionCount]);

  if (!topic) return null;

  const readiness = computeTopicReadiness(topic);

  function saveNotes() {
    if (topic && notes !== (topic.notes ?? '')) updateTopic(topic.id, { notes });
  }
  function saveMistakes() {
    if (topic && mistakes !== (topic.mistakes ?? '')) updateTopic(topic.id, { mistakes });
  }
  function saveFormulae() {
    if (topic && formulae !== (topic.formulae ?? '')) updateTopic(topic.id, { formulae });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-6"
        style={{ borderColor: `${subjectColor}40` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-bold" style={{ color: subjectColor }}>
              {topic.name}
            </h3>
            <p className="text-xs text-white/40 mt-0.5">Readiness: {readiness}%</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Editable core fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Completion: {topic.completionPct ?? 0}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={topic.completionPct ?? 0}
              onChange={(e) => updateTopic(topic.id, { completionPct: Number(e.target.value) })}
              className="w-full accent-electric mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Confidence: {topic.confidence}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={topic.confidence}
              onChange={(e) => updateTopic(topic.id, { confidence: Number(e.target.value) })}
              className="w-full accent-electric mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Questions Solved</label>
            <input
              type="number"
              value={topic.questionsSolved}
              onChange={(e) => updateTopic(topic.id, { questionsSolved: Number(e.target.value) })}
              className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:border-electric/40"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wide">Next Revision</label>
            <input
              type="date"
              value={topic.nextRevision ?? ''}
              onChange={(e) => updateTopic(topic.id, { nextRevision: e.target.value || null })}
              className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:border-electric/40"
            />
          </div>
        </div>

        <button
          onClick={() => logTopicRevision(topic.id)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/15 border border-orange-500/40 text-orange-400 text-sm font-medium hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all"
          title="+30 XP"
        >
          <Repeat size={15} /> Log Revision ({topic.revisionCount ?? 0} so far)
        </button>

        {/* Notes / Mistakes / Formulae */}
        <div className="space-y-4">
          <FieldArea label="Notes" value={notes} onChange={setNotes} onBlur={saveNotes} placeholder="Key takeaways, summaries..." />
          <FieldArea label="Mistakes" value={mistakes} onChange={setMistakes} onBlur={saveMistakes} placeholder="Common errors to avoid..." />
          <FieldArea label="Important Formulae" value={formulae} onChange={setFormulae} onBlur={saveFormulae} placeholder="Key formulae for this chapter..." />
        </div>

        {/* Revision History */}
        <div>
          <h4 className="text-xs uppercase tracking-widest text-white/40 mb-2 flex items-center gap-2">
            <Repeat size={13} /> Revision History
          </h4>
          {revisionHistory.length === 0 ? (
            <p className="text-white/30 text-sm">No revisions logged yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {revisionHistory.map((r) => (
                <span key={r.id} className="text-xs px-2 py-1 rounded-md bg-void-300/50 border border-white/[0.06] text-white/60">
                  {r.date}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Study Sessions */}
        <div>
          <h4 className="text-xs uppercase tracking-widest text-white/40 mb-2 flex items-center gap-2">
            <Clock size={13} /> Study Sessions
          </h4>
          {sessions.length === 0 ? (
            <p className="text-white/30 text-sm">No sessions logged for this chapter yet.</p>
          ) : (
            <div className="space-y-1.5">
              {sessions
                .slice()
                .sort((a: StudySession, b: StudySession) => (a.date < b.date ? 1 : -1))
                .map((s: StudySession) => (
                  <div key={s.id} className="flex items-center justify-between text-xs text-white/50 bg-void-300/40 border border-white/[0.06] rounded-lg px-3 py-2">
                    <span className="flex items-center gap-2">
                      <BookOpen size={12} /> {s.date}
                    </span>
                    <span>{formatMinutes(s.durationMin)} · {s.questionsSolved} Qs</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function FieldArea({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-white/40 uppercase tracking-wide">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={3}
        className="w-full mt-1 bg-void-300/60 border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:border-electric/40 resize-none"
      />
    </div>
  );
}
