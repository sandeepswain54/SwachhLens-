import { X } from 'lucide-react';
import { useState } from 'react';

import { formatRelativeTime, type ReportRow } from '@/lib/reports';
import { approveAssignment, requestAssignmentChanges, type AssignmentRow, type TeamRow } from '@/lib/teams';

// Lets an admin see the citizen's original "before" photo side-by-side with
// the field team's "after" evidence for one pending_review assignment, and
// either approve it (-> reports.status becomes 'resolved', the team gets a
// "Task approved" notification) or send it back for rework (-> assignment
// returns to 'in_progress', the team gets a "Changes requested" notification
// with this note). Both actions are handled by
// admin_panel/supabase/007_task_review_feedback.sql's triggers — see
// approveAssignment / requestAssignmentChanges in lib/teams.ts.
export function ReviewAssignmentModal({
  assignment,
  report,
  team,
  onClose,
}: {
  assignment: AssignmentRow;
  report: ReportRow;
  team: TeamRow | null;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setSubmitting('approve');
    setError(null);
    try {
      await approveAssignment(assignment.id);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(null);
    }
  }

  async function handleRequestChanges() {
    setSubmitting('reject');
    setError(null);
    try {
      await requestAssignmentChanges(assignment.id, note);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-[#141c17]"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Review Submission</h2>
            <p className="text-[12px] text-slate-400">
              {assignment.assignment_code} &middot; {report.report_code} &middot; {team?.team_name ?? 'Unassigned'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Before</p>
              {report.media_type === 'image' ? (
                <img src={report.media_url} alt="Before" className="h-32 w-full rounded-xl object-cover" />
              ) : (
                <video src={report.media_url} controls className="h-32 w-full rounded-xl object-cover" />
              )}
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                After ({assignment.progress_photos.length})
              </p>
              {assignment.progress_photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {assignment.progress_photos.map((url) => (
                    <img key={url} src={url} alt="After" className="h-[60px] w-full rounded-lg object-cover" />
                  ))}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-xl bg-slate-50 text-[11px] text-slate-400 dark:bg-white/5">
                  No photos
                </div>
              )}
            </div>
          </div>

          {assignment.progress_notes && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Field Team Notes
              </p>
              <p className="rounded-lg bg-slate-50 p-3 text-[13px] text-slate-600 dark:bg-white/5 dark:text-slate-300">
                {assignment.progress_notes}
              </p>
            </div>
          )}

          {assignment.submitted_for_review_at && (
            <p className="text-[11.5px] text-slate-400">
              Submitted {formatRelativeTime(assignment.submitted_for_review_at)}
            </p>
          )}

          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400">
              Note to team <span className="text-slate-300">(sent only if requesting changes)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. Please clear the remaining debris near the drain."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRequestChanges}
              disabled={submitting !== null}
              className="flex-1 rounded-xl border border-red-200 px-4 py-2.5 text-[13px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10">
              {submitting === 'reject' ? 'Sending…' : 'Request Changes'}
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={submitting !== null}
              className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
              {submitting === 'approve' ? 'Approving…' : 'Approve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
