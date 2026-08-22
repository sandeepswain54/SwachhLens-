import { MapPin, X } from 'lucide-react';

import { SEVERITY_BADGE, STATUS_BADGE } from '@/lib/badges';
import { formatRelativeTime, STATUS_LABEL, type ReportRow } from '@/lib/reports';

export function ReportDetailModal({ report, onClose }: { report: ReportRow; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#141c17]"
        onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          {report.media_type === 'image' ? (
            <img src={report.media_url} alt={report.category} className="h-48 w-full object-cover" />
          ) : (
            <video src={report.media_url} controls className="h-48 w-full object-cover" />
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-bold text-brand-600">{report.report_code}</p>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_BADGE[report.status]}`}>
              {STATUS_LABEL[report.status]}
            </span>
          </div>
          <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{report.category}</h3>

          <div className="mt-2 flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-slate-400">
            <MapPin size={13} />
            <span className="truncate">{report.address}</span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${SEVERITY_BADGE[report.severity_label]}`}>
              {report.severity_label} severity
            </span>
            <span className="text-[12px] text-slate-400">{formatRelativeTime(report.created_at)}</span>
          </div>

          {report.comments && (
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-[13px] text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {report.comments}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
