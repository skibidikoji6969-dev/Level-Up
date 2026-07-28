import type { LucideIcon } from 'lucide-react';

interface StatChipProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: string;
}

export default function StatChip({ icon: Icon, label, value, color = '#3B82F6' }: StatChipProps) {
  return (
    <div className="stat-chip">
      <Icon size={16} style={{ color }} />
      <div className="flex flex-col leading-none">
        <span className="text-[10px] uppercase tracking-wider text-white/40 font-mono">{label}</span>
        <span className="text-sm font-semibold text-white">{value}</span>
      </div>
    </div>
  );
}
