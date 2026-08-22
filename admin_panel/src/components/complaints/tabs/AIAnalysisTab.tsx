import { AlertTriangle, Box, CheckCircle2, Sparkles } from 'lucide-react';

import type { ReportRow } from '@/lib/reports';

import { SeverityGauge } from '../SeverityGauge';

function StatBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-0.5 text-[14px] font-bold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

export function AIAnalysisTab({ report }: { report: ReportRow }) {
  const analysis = report.analysis;

  if (!analysis) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/5">
          <Sparkles size={18} />
        </span>
        <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">
          AI analysis not available
        </p>
        <p className="max-w-[220px] text-[12px] text-slate-400">
          This complaint was submitted before detailed AI analysis was recorded.
        </p>
      </div>
    );
  }

  const dup = analysis.duplicate;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[13px] font-bold text-slate-900 dark:text-white">
        <Sparkles size={15} className="text-brand-600" /> AI Analysis Summary
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatBlock
          label="Waste Category"
          value={analysis.wasteType.primaryType}
          sub={`${Math.round(analysis.wasteType.confidencePercent)}% confidence`}
        />
        <StatBlock
          label="Estimated Volume"
          value={analysis.volume.size}
          sub={analysis.volume.estimatedVolumeLiters}
        />
      </div>

      {analysis.wasteType.detectedObjects.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Box size={12} /> Detected Objects
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.wasteType.detectedObjects.map((obj) => (
              <span
                key={obj}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600 dark:bg-white/5 dark:text-slate-300">
                {obj}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-around rounded-xl border border-slate-100 py-4 dark:border-white/10">
        <SeverityGauge score={report.severity_score} level={report.severity_label} />
        <div className="max-w-[160px] text-[12px] text-slate-500 dark:text-slate-400">
          {analysis.severity.reason}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] text-slate-400">Duplicate Check</p>
        {!dup || dup.status === 'not_available' ? (
          <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
            Duplicate check not available for this complaint.
          </p>
        ) : dup.status === 'none' ? (
          <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 size={15} /> No duplicate found
          </p>
        ) : (
          <div
            className={`rounded-lg px-3 py-2 text-[13px] ${
              dup.status === 'yes'
                ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
            }`}>
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle size={15} />
              {dup.status === 'yes' ? 'Likely duplicate' : 'Possible duplicate'} of {dup.similarComplaintId}
            </p>
            <p className="mt-1 text-[12px] opacity-80">
              {dup.locationDistanceMeters}m away &middot; reported {dup.timeDescription} &middot;{' '}
              {dup.duplicateConfidencePercent}% confidence
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
