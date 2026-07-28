import { useRef, useState } from 'react';
import { Download, Upload, Trash2, ShieldAlert, DatabaseZap } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { exportAllData, importAllData, resetAllData } from '@/lib/actions';
import { useUIStore } from '@/store/useUIStore';

export default function DataManagement() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const pushToast = useUIStore((s) => s.pushToast);

  async function handleExport() {
    const json = await exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ title: 'Export complete', description: 'Your backup file has been downloaded', variant: 'info' });
  }

  async function handleImport(file: File) {
    const text = await file.text();
    await importAllData(text);
    pushToast({ title: 'Import complete', description: 'Your data has been restored', variant: 'info' });
  }

  async function handleReset() {
    await resetAllData();
    setConfirmReset(false);
    pushToast({ title: 'Data reset', description: 'All local data has been cleared', variant: 'info' });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Data</h1>
        <p className="text-white/40 text-sm mt-1">Everything lives in this browser's IndexedDB. No cloud, ever.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <GlassCard glow="blue">
          <div className="flex items-center gap-3 mb-3">
            <Download size={20} className="text-electric" />
            <h2 className="font-display font-semibold">Export</h2>
          </div>
          <p className="text-sm text-white/40 mb-4">
            Download a complete JSON snapshot of every subject, topic, session, task, journal entry, and achievement.
          </p>
          <button onClick={handleExport} className="w-full py-2.5 rounded-lg bg-electric/15 border border-electric/40 text-electric font-medium hover:shadow-glow-blue transition-all">
            Export as JSON
          </button>
        </GlassCard>

        <GlassCard glow="purple">
          <div className="flex items-center gap-3 mb-3">
            <Upload size={20} className="text-violet" />
            <h2 className="font-display font-semibold">Import / Restore</h2>
          </div>
          <p className="text-sm text-white/40 mb-4">
            Restore from a previously exported backup file. Existing records with matching IDs will be overwritten.
          </p>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()} className="w-full py-2.5 rounded-lg bg-violet/15 border border-violet/40 text-violet font-medium hover:shadow-glow-purple transition-all">
            Import from File
          </button>
        </GlassCard>
      </div>

      <GlassCard className="border-red-500/20">
        <div className="flex items-center gap-3 mb-3">
          <ShieldAlert size={20} className="text-red-400" />
          <h2 className="font-display font-semibold text-red-400">Danger Zone</h2>
        </div>
        <p className="text-sm text-white/40 mb-4">
          Permanently erase every subject, session, task, journal entry, goal, and achievement from this device. This cannot be undone — export a backup first.
        </p>
        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/20 transition-all">
            <Trash2 size={16} /> Reset All Data
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleReset} className="px-4 py-2.5 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-all">
              Confirm — Delete Everything
            </button>
            <button onClick={() => setConfirmReset(false)} className="px-4 py-2.5 rounded-lg border border-white/[0.1] text-white/60 hover:text-white transition-all">
              Cancel
            </button>
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-3 mb-2">
          <DatabaseZap size={18} className="text-neon" />
          <h2 className="font-display font-semibold text-sm">Storage</h2>
        </div>
        <p className="text-xs text-white/40">
          Data is stored in this browser's IndexedDB (database name: <code className="text-white/60">progress-os-db</code>). Clearing your
          browser's site data for this app will erase it — export regularly if that matters to you.
        </p>
      </GlassCard>
    </div>
  );
}
