import { ChevronLeft, ChevronRight, Crosshair } from 'lucide-react';
import { useState } from 'react';

import { SEVERITY_BADGE } from '@/lib/badges';
import { formatRelativeTime } from '@/lib/reports';
import type { HotspotCluster } from '@/lib/hotspots';

const PAGE_SIZE = 8;

export function HotspotsOverviewTable({
  clusters,
  selectedCellKey,
  onSelect,
}: {
  clusters: HotspotCluster[];
  selectedCellKey: string | null;
  onSelect: (cluster: HotspotCluster) => void;
}) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(clusters.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = clusters.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (clusters.length === 0) {
    return <p className="py-10 text-center text-[13px] text-slate-400">No hotspots match your filters yet.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left text-[12.5px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wide text-slate-400">
              <th className="w-[10%] px-2 py-2.5 font-medium">ID</th>
              <th className="w-[26%] px-2 py-2.5 font-medium">Location</th>
              <th className="w-[11%] px-2 py-2.5 font-medium">Intensity</th>
              <th className="w-[13%] px-2 py-2.5 font-medium">Waste Type</th>
              <th className="w-[12%] px-2 py-2.5 font-medium">Complaints</th>
              <th className="w-[9%] px-2 py-2.5 font-medium">Trend</th>
              <th className="w-[12%] px-2 py-2.5 font-medium">Last Reported</th>
              <th className="w-[7%] px-2 py-2.5 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((c) => (
              <tr
                key={c.cellKey}
                onClick={() => onSelect(c)}
                className={`cursor-pointer border-t border-slate-100 text-slate-700 transition-colors dark:border-white/5 dark:text-slate-200 ${
                  selectedCellKey === c.cellKey ? 'bg-brand-50/60 dark:bg-brand-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                }`}>
                <td className="truncate px-2 py-2.5 font-semibold text-brand-600">{c.id}</td>
                <td className="truncate px-2 py-2.5" title={c.address}>
                  {c.address}
                </td>
                <td className="px-2 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_BADGE[c.intensity]}`}>
                    {c.intensity}
                  </span>
                </td>
                <td className="truncate px-2 py-2.5 text-slate-500 dark:text-slate-400">{c.category}</td>
                <td className="truncate px-2 py-2.5">{c.totalComplaints}</td>
                <td className="truncate px-2 py-2.5">
                  {c.trendPercent === null ? (
                    <span className="text-slate-400">New</span>
                  ) : (
                    <span className={c.trendPercent >= 0 ? 'font-semibold text-red-500' : 'font-semibold text-emerald-600'}>
                      {c.trendPercent >= 0 ? '↑' : '↓'} {Math.abs(c.trendPercent)}%
                    </span>
                  )}
                </td>
                <td className="truncate px-2 py-2.5 text-slate-500 dark:text-slate-400">
                  {formatRelativeTime(c.lastReportedAt)}
                </td>
                <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onSelect(c)}
                    title="Locate on map"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200">
                    <Crosshair size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-[12px] text-slate-400">
        <span>
          Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, clusters.length)} of{' '}
          {clusters.length} hotspots
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/5">
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((p, i, arr) => (
              <span key={p} className="flex items-center">
                {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-slate-300">…</span>}
                <button
                  type="button"
                  onClick={() => setPage(p)}
                  className={`h-7 w-7 rounded-lg text-[12px] font-semibold ${
                    p === currentPage ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
                  }`}>
                  {p}
                </button>
              </span>
            ))}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/5">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
