import type { ComplaintStatus } from './complaints';
import type { ReportStatus, SeverityLabel } from './reports';
import type { Priority } from './team-stats';
import type { AssignmentStatus, TeamStatus } from './teams';

export const SEVERITY_BADGE: Record<SeverityLabel, string> = {
  Critical: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  High: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
  Medium: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  Low: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
};

export const STATUS_BADGE: Record<ReportStatus, string> = {
  submitted: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  team_assigned: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  in_progress: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
  resolved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
};

export const COMPLAINT_STATUS_BADGE: Record<ComplaintStatus, string> = {
  ...STATUS_BADGE,
  escalated: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
};

export const TEAM_STATUS_BADGE: Record<TeamStatus, string> = {
  on_duty: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  available: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  maintenance: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
};

export const ASSIGNMENT_STATUS_BADGE: Record<AssignmentStatus | 'unassigned', string> = {
  unassigned: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  in_progress: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
};

export const PRIORITY_BADGE: Record<Priority, string> = {
  High: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  Medium: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  Low: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
};
