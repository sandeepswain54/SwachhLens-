import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useMemo, useState } from 'react';

import { hasModernAnalysis } from '@/lib/analysis';
import { SEVERITY_BADGE } from '@/lib/badges';
import { formatRelativeTime, type ReportRow } from '@/lib/reports';

import { AIAnalysisModal } from './AIAnalysisModal';

const PAGE_SIZE = 5;

function DuplicateBadge({ report }: { report: ReportRow }) {
  const dup = report.analysis?.duplicate;
  if (!dup || dup.status === 'not_available') {
    return <span className="text-[12px] text-slate-400">—</span>;
  }
  if (dup.status === 'none') {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
        No Duplicate
      </span>
    );
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        dup.status === 'yes'
          ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
      }`}>
      Duplicate ({dup.duplicateConfidencePercent}%)
    </span>
  );
}

export function RecentAIResultsTable({ reports }: { reports: ReportRow[] }) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ReportRow | null>(null);

  // hasModernAnalysis, not a bare `analysis !== null` check — some early
  // reports carry an older, differently-shaped analysis blob that this
  // table (and the modal it opens) can't render.
  const analyzed = useMemo(() => reports.filter((r) => hasModernAnalysis(r.analysis)), [reports]);
  const pageCount = Math.max(1, Math.ceil(analyzed.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = analyzed.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  if (analyzed.length === 0) {
    return <p className="py-10 text-center text-[13px] text-slate-400">No AI-analyzed reports yet.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-3 pb-2 font-medium">Report ID</th>
              <th className="px-3 pb-2 font-medium">Image</th>
              <th className="px-3 pb-2 font-medium">Predicted Category</th>
              <th className="px-3 pb-2 font-medium">Confidence</th>
              <th className="px-3 pb-2 font-medium">Volume (Estimated)</th>
              <th className="px-3 pb-2 font-medium">Severity</th>
              <th className="px-3 pb-2 font-medium">Duplicate Check</th>
              <th className="px-3 pb-2 font-medium">Priority Score</th>
              <th className="px-3 pb-2 font-medium">Analyzed At</th>
              <th className="px-3 pb-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 text-slate-700 dark:border-white/5 dark:text-slate-200">
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-brand-600">{r.report_code}</td>
                <td className="px-3 py-2.5">
                  {r.media_type === 'image' ? (
                    <img src={r.media_url} alt={r.category} className="h-9 w-9 rounded-lg object-cover" />
                  ) : (
                    <video src={r.media_url} className="h-9 w-9 rounded-lg object-cover" />
                  )}
                </td>
                <td className="px-3 py-2.5">{r.category}</td>
                <td className="px-3 py-2.5">
                  {r.category_confidence === null ? (
                    '—'
                  ) : (
                    <span
                      className={
                        r.category_confidence >= 85
                          ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                          : r.category_confidence >= 70
                            ? 'font-semibold text-amber-600 dark:text-amber-400'
                            : 'font-semibold text-red-500 dark:text-red-400'
                      }>
                      {r.category_confidence.toFixed(1)}%
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-500 dark:text-slate-400">
                  {hasModernAnalysis(r.analysis)
                    ? `${r.analysis.volume.size} (${r.analysis.volume.estimatedVolumeLiters})`
                    : '—'}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_BADGE[r.severity_label]}`}>
                    {r.severity_label}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <DuplicateBadge report={r} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-200">
                  {r.severity_score} / 100
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-500 dark:text-slate-400">
                  {formatRelativeTime(r.created_at)}
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200">
                    <Eye size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-[12px] text-slate-400">
        <span>
          Showing {safePage * PAGE_SIZE + 1} to {Math.min(analyzed.length, (safePage + 1) * PAGE_SIZE)} of{' '}
          {analyzed.length.toLocaleString()} results
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/5">
            <ChevronLeft size={15} />
          </button>
          <span className="px-2 text-slate-600 dark:text-slate-300">
            Page {safePage + 1} of {pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/5">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {selected && <AIAnalysisModal report={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
