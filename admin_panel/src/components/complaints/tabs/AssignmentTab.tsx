import { useState } from 'react';

import { ASSIGNMENT_STATUS_BADGE } from '@/lib/badges';
import type { ReportRow } from '@/lib/reports';
import {
  ASSIGNMENT_STATUS_LABEL,
  assignTeamToReport,
  TEAM_STATUS_LABEL,
  updateAssignmentStatus,
  type AssignmentRow,
  type AssignmentStatus,
  type TeamRow,
} from '@/lib/teams';

export function AssignmentTab({
  report,
  assignment,
  teams,
}: {
  report: ReportRow;
  assignment: AssignmentRow | null;
  teams: TeamRow[];
}) {
  const [teamId, setTeamId] = useState(assignment?.team_id ?? '');
  const [vehicle, setVehicle] = useState(assignment?.vehicle_label ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = assignment?.status ?? 'unassigned';
  const dirty = teamId !== (assignment?.team_id ?? '') || vehicle !== (assignment?.vehicle_label ?? '');

  async function handleUpdate() {
    if (!teamId) {
      setError('Pick a team to assign.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await assignTeamToReport({ reportId: report.id, teamId, vehicleLabel: vehicle });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdvance(next: AssignmentStatus) {
    if (!assignment) return;
    setAdvancing(true);
    try {
      await updateAssignmentStatus(assignment.id, next);
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400">
            Assigned To
          </label>
          {teams.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
              No teams yet.
            </p>
          ) : (
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
              <option value="">Unassigned</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.team_code} &middot; {t.team_name} ({TEAM_STATUS_LABEL[t.status]})
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400">
            Assigned Vehicle
          </label>
          <input
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            placeholder="e.g. Mini Truck OD-02-AB-1234"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-slate-400">Status</p>
          <span
            className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${ASSIGNMENT_STATUS_BADGE[status]}`}>
            {status === 'unassigned' ? 'Unassigned' : ASSIGNMENT_STATUS_LABEL[status]}
          </span>
        </div>
        {assignment && status !== 'completed' && (
          <button
            type="button"
            onClick={() => void handleAdvance(status === 'pending' ? 'in_progress' : 'completed')}
            disabled={advancing}
            className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-60 dark:hover:bg-brand-500/10">
            {status === 'pending' ? 'Start Work' : 'Mark Completed'}
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleUpdate()}
        disabled={submitting || !dirty || teams.length === 0}
        className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
        {submitting ? 'Updating…' : 'Update Assignment'}
      </button>
    </div>
  );
}
