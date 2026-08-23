import { X } from 'lucide-react';

import { AIAnalysisTab } from '@/components/complaints/tabs/AIAnalysisTab';
import { SEVERITY_BADGE } from '@/lib/badges';
import type { ReportRow } from '@/lib/reports';

export function AIAnalysisModal({ report, onClose }: { report: ReportRow; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-[#141c17]"
        onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          {report.media_type === 'image' ? (
            <img src={report.media_url} alt={report.category} className="h-44 w-full object-cover" />
          ) : (
            <video src={report.media_url} controls className="h-44 w-full object-cover" />
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
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${SEVERITY_BADGE[report.severity_label]}`}>
              {report.severity_label} severity
            </span>
          </div>
          <h3 className="mt-1 mb-4 text-lg font-bold text-slate-900 dark:text-white">{report.category}</h3>

          <AIAnalysisTab report={report} />
        </div>
      </div>
    </div>
  );
}
