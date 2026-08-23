import { useState } from 'react';

import { Select } from '@/components/common/Select';
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
import { VEHICLE_STATUS_LABEL, type VehicleRow } from '@/lib/vehicles';

export function AssignmentTab({
  report,
  assignment,
  teams,
  vehicles,
}: {
  report: ReportRow;
  assignment: AssignmentRow | null;
  teams: TeamRow[];
  vehicles: VehicleRow[];
}) {
  const [teamId, setTeamId] = useState(assignment?.team_id ?? '');
  const [vehicleId, setVehicleId] = useState(assignment?.vehicle_id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = assignment?.status ?? 'unassigned';
  const dirty = teamId !== (assignment?.team_id ?? '') || vehicleId !== (assignment?.vehicle_id ?? '');
  const availableVehicles = vehicles.filter(
    (v) => v.status === 'idle' || v.status === 'on_duty' || v.id === assignment?.vehicle_id
  );

  async function handleUpdate() {
    if (!teamId) {
      setError('Pick a team to assign.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await assignTeamToReport({ reportId: report.id, teamId, vehicleId: vehicleId || null });
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
            <Select
              value={teamId}
              onChange={setTeamId}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              options={[
                { value: '', label: 'Unassigned' },
                ...teams.map((t) => ({
                  value: t.id,
                  label: `${t.team_code} · ${t.team_name} (${TEAM_STATUS_LABEL[t.status]})`,
                })),
              ]}
            />
          )}
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400">
            Assigned Vehicle
          </label>
          {availableVehicles.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
              No available vehicles.
            </p>
          ) : (
            <Select
              value={vehicleId}
              onChange={setVehicleId}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              options={[
                { value: '', label: 'No vehicle' },
                ...availableVehicles.map((v) => ({
                  value: v.id,
                  label: `${v.vehicle_no} · ${v.vehicle_type} (${VEHICLE_STATUS_LABEL[v.status]})`,
                })),
              ]}
            />
          )}
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
