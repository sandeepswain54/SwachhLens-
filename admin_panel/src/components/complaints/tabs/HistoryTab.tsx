import { AlertTriangle, CheckCircle2, FilePlus2, PlayCircle, UserPlus } from 'lucide-react';

import type { ProfileRow } from '@/lib/profiles';
import { formatRelativeTime, type ReportRow } from '@/lib/reports';
import type { AssignmentRow, TeamRow } from '@/lib/teams';

type Entry = { key: string; icon: typeof FilePlus2; className: string; text: string; at: string };

// A flat, most-recent-first audit log — distinct from the Timeline tab's
// forward-looking stepper. Built entirely from timestamp columns already on
// `reports`/`assignments` (created_at, assigned_at, started_at,
// completed_at, escalated_at); there's no separate audit_log table, so this
// is the real, complete history rather than a fabricated one.
export function HistoryTab({
  report,
  assignment,
  team,
  reporter,
  escalatedBy,
}: {
  report: ReportRow;
  assignment: AssignmentRow | null;
  team: TeamRow | null;
  reporter: ProfileRow | undefined;
  escalatedBy: ProfileRow | undefined;
}) {
  const entries: Entry[] = [
    {
      key: 'submitted',
      icon: FilePlus2,
      className: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
      text: `Submitted by ${reporter?.full_name ?? 'a citizen'}`,
      at: report.created_at,
    },
  ];

  if (assignment?.assigned_at) {
    entries.push({
      key: 'assigned',
      icon: UserPlus,
      className: 'text-brand-600 bg-brand-50 dark:bg-brand-500/10',
      text: `Assigned to ${team?.team_name ?? team?.team_code ?? 'a team'}`,
      at: assignment.assigned_at,
    });
  }
  if (assignment?.started_at) {
    entries.push({
      key: 'started',
      icon: PlayCircle,
      className: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
      text: 'Cleanup started',
      at: assignment.started_at,
    });
  }
  if (report.escalated_at) {
    entries.push({
      key: 'escalated',
      icon: AlertTriangle,
      className: 'text-red-500 bg-red-50 dark:bg-red-500/10',
      text: `Escalated${escalatedBy ? ` by ${escalatedBy.full_name}` : ''}`,
      at: report.escalated_at,
    });
  }
  const resolvedAt = assignment?.completed_at ?? report.resolved_at;
  if (resolvedAt) {
    entries.push({
      key: 'resolved',
      icon: CheckCircle2,
      className: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
      text: 'Marked resolved',
      at: resolvedAt,
    });
  }

  entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="flex flex-col gap-1">
      {entries.map((entry) => {
        const Icon = entry.icon;
        return (
          <div key={entry.key} className="flex items-start gap-3 rounded-xl px-1 py-2">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${entry.className}`}>
              <Icon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">{entry.text}</p>
            </div>
            <span className="shrink-0 whitespace-nowrap pt-0.5 text-[11px] text-slate-400">
              {formatRelativeTime(entry.at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
