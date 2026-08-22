import { ImageOff } from 'lucide-react';

import { SEVERITY_BADGE } from '@/lib/badges';
import { SEVERITY_COLOR } from '@/lib/palette';
import type { HotspotCluster } from '@/lib/hotspots';

export function TopHotspotsList({
  clusters,
  selectedCellKey,
  onSelect,
}: {
  clusters: HotspotCluster[];
  selectedCellKey: string | null;
  onSelect: (cluster: HotspotCluster) => void;
}) {
  if (clusters.length === 0) {
    return <p className="py-6 text-center text-[12px] text-slate-400">No hotspots yet — new reports will appear here.</p>;
  }

  return (
    <div className="space-y-1">
      {clusters.map((c, i) => (
        <button
          key={c.cellKey}
          type="button"
          onClick={() => onSelect(c)}
          className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors ${
            selectedCellKey === c.cellKey ? 'bg-brand-50/60 dark:bg-brand-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'
          }`}>
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: SEVERITY_COLOR[c.intensity] }}>
            {i + 1}
          </span>
          {c.imageUrl ? (
            <img src={c.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-white/5">
              <ImageOff size={15} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">{c.locality}</p>
            <p className="truncate text-[11px] text-slate-400">{c.category}</p>
          </div>
          <div className="shrink-0 text-right">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_BADGE[c.intensity]}`}>
              {c.intensity}
            </span>
            <p className="mt-1 text-[10px] text-slate-400">
              {c.totalComplaints} complaint{c.totalComplaints === 1 ? '' : 's'}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
