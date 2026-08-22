import { AlertTriangle, CheckCircle2, ChevronDown, Copy, MapPinned, X } from 'lucide-react';
import { useState } from 'react';

import { Card } from '@/components/dashboard/Card';
import { PRIORITY_BADGE } from '@/lib/badges';
import type { ProfileRow } from '@/lib/profiles';
import { markReportResolved, setReportEscalated, type ReportRow } from '@/lib/reports';
import { priorityForSeverity } from '@/lib/team-stats';
import type { AssignmentRow, TeamRow } from '@/lib/teams';
import type { VehicleRow } from '@/lib/vehicles';

import { AIAnalysisTab } from './tabs/AIAnalysisTab';
import { AssignmentTab } from './tabs/AssignmentTab';
import { DetailsTab } from './tabs/DetailsTab';
import { HistoryTab } from './tabs/HistoryTab';
import { TimelineTab } from './tabs/TimelineTab';

export type PanelTab = 'details' | 'ai' | 'timeline' | 'assignment' | 'history';

const TABS: Array<{ label: string; value: PanelTab }> = [
  { label: 'Details', value: 'details' },
  { label: 'AI Analysis', value: 'ai' },
  { label: 'Timeline', value: 'timeline' },
  { label: 'Assignment', value: 'assignment' },
  { label: 'History', value: 'history' },
];

export function ComplaintDetailsPanel({
  report,
  assignment,
  team,
  teams,
  vehicles,
  reporter,
  escalatedBy,
  initialTab,
  onClose,
}: {
  report: ReportRow;
  assignment: AssignmentRow | null;
  team: TeamRow | null;
  teams: TeamRow[];
  vehicles: VehicleRow[];
  reporter: ProfileRow | undefined;
  escalatedBy: ProfileRow | undefined;
  initialTab?: PanelTab;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<PanelTab>(initialTab ?? 'details');
  const [escalating, setEscalating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const priority = priorityForSeverity(report.severity_label);
  const isResolved = report.status === 'resolved';

  async function handleEscalateToggle() {
    setEscalating(true);
    setActionError(null);
    try {
      await setReportEscalated(report.id, !report.escalated);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setEscalating(false);
    }
  }

  async function handleMarkResolved() {
    setResolving(true);
    setActionError(null);
    try {
      await markReportResolved(report.id);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setResolving(false);
    }
  }

  return (
    <Card className="flex flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Complaint Details</h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[13px] font-bold text-brand-600">#{report.report_code}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_BADGE[priority]}`}>
              {priority} Priority
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5">
          <X size={16} />
        </button>
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-100 pb-2 dark:border-white/10">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
              tab === t.value
                ? 'bg-brand-500 text-white'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {tab === 'details' && <DetailsTab report={report} reporter={reporter} />}
        {tab === 'ai' && <AIAnalysisTab report={report} />}
        {tab === 'timeline' && <TimelineTab report={report} assignment={assignment} team={team} />}
        {tab === 'assignment' && <AssignmentTab report={report} assignment={assignment} teams={teams} vehicles={vehicles} />}
        {tab === 'history' && (
          <HistoryTab report={report} assignment={assignment} team={team} reporter={reporter} escalatedBy={escalatedBy} />
        )}
      </div>

      {actionError && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {actionError}
        </p>
      )}

      <div className="relative mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
        <button
          type="button"
          onClick={() => void handleEscalateToggle()}
          disabled={escalating || isResolved}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-semibold disabled:opacity-50 ${
            report.escalated
              ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400'
              : 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10'
          }`}>
          <AlertTriangle size={14} /> {report.escalated ? 'Un-escalate' : 'Escalate'}
        </button>

        <button
          type="button"
          onClick={() => void handleMarkResolved()}
          disabled={resolving || isResolved}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 px-3 py-2 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/10">
          <CheckCircle2 size={14} /> {isResolved ? 'Resolved' : 'Mark Resolved'}
        </button>

        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
          More <ChevronDown size={13} />
        </button>

        {moreOpen && (
          <div className="absolute bottom-full right-0 mb-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-[#1a231d]">
            <a
              href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-[12px] text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5">
              <MapPinned size={13} /> Open in Maps
            </a>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(report.report_code);
                setMoreOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5">
              <Copy size={13} /> Copy Complaint ID
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
