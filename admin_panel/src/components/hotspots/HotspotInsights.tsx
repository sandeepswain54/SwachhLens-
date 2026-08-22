import { Clock, Layers, MapPin, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { HotspotInsights as HotspotInsightsData } from '@/lib/hotspots';

function Tile({
  label,
  value,
  sub,
  icon: Icon,
  bg,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  bg: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 p-3 dark:border-white/10">
      <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: bg }}>
        <Icon size={15} style={{ color }} strokeWidth={2.2} />
      </span>
      <p className="mt-2 truncate text-[14px] font-bold text-slate-900 dark:text-white" title={value}>
        {value}
      </p>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="text-[10px] text-slate-400">{sub}</p>
    </div>
  );
}

export function HotspotInsights({ insights, rangeLabel }: { insights: HotspotInsightsData; rangeLabel: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile
        label="Most Common Waste"
        value={insights.mostCommonCategory ?? '—'}
        sub={rangeLabel}
        icon={Trash2}
        bg="#eaf6ef"
        color="#1B6B3A"
      />
      <Tile
        label="Est. Waste Volume"
        value={insights.estimatedVolumeTons === null ? '—' : `${insights.estimatedVolumeTons.toFixed(1)} Tons`}
        sub={insights.volumeSampleCount > 0 ? `AI est. · ${insights.volumeSampleCount} reports` : 'No AI volume data yet'}
        icon={Layers}
        bg="#f1ecfd"
        color="#7c3aed"
      />
      <Tile
        label="Peak Time"
        value={insights.peakTimeLabel ?? '—'}
        sub="Most reports"
        icon={Clock}
        bg="#fef3e2"
        color="#d97706"
      />
      <Tile
        label="Affected Areas"
        value={String(insights.affectedAreas)}
        sub={rangeLabel}
        icon={MapPin}
        bg="#e3f3ea"
        color="#1baf7a"
      />
    </div>
  );
}
