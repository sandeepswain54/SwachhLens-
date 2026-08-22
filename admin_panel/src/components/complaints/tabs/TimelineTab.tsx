import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';

import { formatAbsoluteDateTime, type ReportRow } from '@/lib/reports';
import type { AssignmentRow, TeamRow } from '@/lib/teams';

type Step = { key: string; label: string; at: string | null; tone: 'done' | 'alert' | 'pending' };

export function TimelineTab({
  report,
  assignment,
  team,
}: {
  report: ReportRow;
  assignment: AssignmentRow | null;
  team: TeamRow | null;
}) {
  const reached: Step[] = [{ key: 'submitted', label: 'Complaint Submitted', at: report.created_at, tone: 'done' }];

  if (assignment?.assigned_at) {
    reached.push({
      key: 'assigned',
      label: `Assigned to ${team?.team_name ?? 'a team'}`,
      at: assignment.assigned_at,
      tone: 'done',
    });
  }
  if (assignment?.started_at) {
    reached.push({ key: 'started', label: 'Cleanup Started', at: assignment.started_at, tone: 'done' });
  }
  if (report.escalated_at) {
    reached.push({ key: 'escalated', label: 'Escalated for Priority Attention', at: report.escalated_at, tone: 'alert' });
  }
  const resolvedAt = assignment?.completed_at ?? report.resolved_at;
  if (resolvedAt) {
    reached.push({ key: 'resolved', label: 'Resolved', at: resolvedAt, tone: 'done' });
  }

  // Chronological order for whatever has actually happened...
  reached.sort((a, b) => new Date(a.at!).getTime() - new Date(b.at!).getTime());

  // ...then whatever's still ahead, greyed out, in the natural order it'll happen.
  const pending: Step[] = [];
  if (!assignment) pending.push({ key: 'p-assigned', label: 'Awaiting Team Assignment', at: null, tone: 'pending' });
  else if (!assignment.started_at)
    pending.push({ key: 'p-started', label: 'Awaiting Cleanup Start', at: null, tone: 'pending' });
  if (!resolvedAt) pending.push({ key: 'p-resolved', label: 'Awaiting Resolution', at: null, tone: 'pending' });

  const steps = [...reached, ...pending];

  return (
    <div className="py-1">
      {steps.map((step, i) => (
        <div key={step.key} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                step.tone === 'done'
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                  : step.tone === 'alert'
                    ? 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400'
                    : 'bg-slate-100 text-slate-300 dark:bg-white/5 dark:text-slate-600'
              }`}>
              {step.tone === 'done' ? (
                <CheckCircle2 size={14} />
              ) : step.tone === 'alert' ? (
                <AlertTriangle size={14} />
              ) : (
                <Circle size={10} />
              )}
            </span>
            {i < steps.length - 1 && <span className="w-px flex-1 bg-slate-200 dark:bg-white/10" />}
          </div>
          <div className={`min-w-0 pb-6 ${step.tone === 'pending' ? 'opacity-50' : ''}`}>
            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{step.label}</p>
            <p className="text-[12px] text-slate-400">
              {step.at ? formatAbsoluteDateTime(step.at) : 'Not yet reached'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
