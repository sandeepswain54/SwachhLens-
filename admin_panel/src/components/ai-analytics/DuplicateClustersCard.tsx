import { Copy } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { DuplicateCluster, DuplicateOverview } from '@/lib/ai-stats';

export function DuplicateClustersCard({
  overview,
  clusters,
}: {
  overview: DuplicateOverview;
  clusters: DuplicateCluster[];
}) {
  const isUp = (overview.deltaPercent ?? 0) >= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
          <Copy size={18} />
        </span>
        <div>
          <p className="text-2xl font-extrabold leading-none text-slate-900 dark:text-white">
            {overview.potentialDuplicates.toLocaleString()}
          </p>
          <p className="text-[12px] text-slate-400">Potential Duplicates</p>
        </div>
      </div>

      <div>
        <p className="text-lg font-bold text-slate-900 dark:text-white">{overview.detectionRate.toFixed(1)}%</p>
        <p className="text-[12px] text-slate-400">
          Detection Rate
          {overview.deltaPercent !== null && (
            <span className={isUp ? 'ml-1 text-emerald-600 dark:text-emerald-400' : 'ml-1 text-red-500 dark:text-red-400'}>
              {isUp ? '+' : ''}
              {overview.deltaPercent.toFixed(1)}% from last week
            </span>
          )}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Top Duplicate Clusters</p>
        {clusters.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-400 dark:bg-white/5">
            No duplicate clusters detected yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {clusters.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 text-[13px]">
                <span className="text-slate-600 dark:text-slate-300">
                  {c.id} <span className="text-slate-400">({c.locality})</span>
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{c.count} reports</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        to="/complaints"
        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-center text-[12px] font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
        View All Duplicates
      </Link>
    </div>
  );
}
