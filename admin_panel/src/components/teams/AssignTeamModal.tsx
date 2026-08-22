import { X } from 'lucide-react';
import { useState } from 'react';

import { TEAM_STATUS_BADGE } from '@/lib/badges';
import type { ReportRow } from '@/lib/reports';
import { assignTeamToReport, TEAM_STATUS_LABEL, type AssignmentRow, type TeamRow } from '@/lib/teams';

export function AssignTeamModal({
  report,
  teams,
  existingAssignment,
  onClose,
}: {
  report: ReportRow;
  teams: TeamRow[];
  existingAssignment: AssignmentRow | null;
  onClose: () => void;
}) {
  const [teamId, setTeamId] = useState(existingAssignment?.team_id ?? '');
  const [vehicle, setVehicle] = useState(existingAssignment?.vehicle_label ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) {
      setError('Pick a team to assign.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await assignTeamToReport({ reportId: report.id, teamId, vehicleLabel: vehicle });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#141c17]"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">
              {existingAssignment ? 'Reassign Team' : 'Assign Team'}
            </h2>
            <p className="text-[12px] text-slate-400">
              {report.report_code} &middot; {report.category}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 p-5">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400">Team</label>
            {teams.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
                No teams yet — create one first from Add Team.
              </p>
            ) : (
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
                <option value="">Select a team…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.team_code} &middot; {t.team_name} ({TEAM_STATUS_LABEL[t.status]})
                  </option>
                ))}
              </select>
            )}
          </div>

          {teamId && (
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${TEAM_STATUS_BADGE[teams.find((t) => t.id === teamId)?.status ?? 'available']}`}>
              {TEAM_STATUS_LABEL[teams.find((t) => t.id === teamId)?.status ?? 'available']}
            </span>
          )}

          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400">
              Assigned Vehicle <span className="text-slate-300">(optional)</span>
            </label>
            <input
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              placeholder="e.g. Mini Truck OD-02-AB-1234"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || teams.length === 0}
            className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
            {submitting ? 'Assigning…' : existingAssignment ? 'Reassign' : 'Assign Team'}
          </button>
        </form>
      </div>
    </div>
  );
}
