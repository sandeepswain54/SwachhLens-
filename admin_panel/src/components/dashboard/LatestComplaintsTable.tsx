import { Eye } from 'lucide-react';
import { useState } from 'react';

import { SEVERITY_BADGE, STATUS_BADGE } from '@/lib/badges';
import { formatRelativeTime, STATUS_LABEL, type ReportRow } from '@/lib/reports';

import { ReportDetailModal } from './ReportDetailModal';

export function LatestComplaintsTable({ reports }: { reports: ReportRow[] }) {
  const [selected, setSelected] = useState<ReportRow | null>(null);

  if (reports.length === 0) {
    return <p className="py-10 text-center text-[13px] text-slate-400">No complaints match your search yet.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-3 pb-2 font-medium">ID</th>
              <th className="px-3 pb-2 font-medium">Category</th>
              <th className="px-3 pb-2 font-medium">Location</th>
              <th className="px-3 pb-2 font-medium">Severity</th>
              <th className="px-3 pb-2 font-medium">Time</th>
              <th className="px-3 pb-2 font-medium">Status</th>
              <th className="px-3 pb-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr
                key={r.id}
                className="border-t border-slate-100 text-slate-700 dark:border-white/5 dark:text-slate-200">
                <td className="px-3 py-2.5 font-semibold text-brand-600">{r.report_code}</td>
                <td className="px-3 py-2.5">{r.category}</td>
                <td className="max-w-[160px] truncate px-3 py-2.5 text-slate-500 dark:text-slate-400">
                  {r.address}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_BADGE[r.severity_label]}`}>
                    {r.severity_label}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-500 dark:text-slate-400">
                  {formatRelativeTime(r.created_at)}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
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

      {selected && <ReportDetailModal report={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
