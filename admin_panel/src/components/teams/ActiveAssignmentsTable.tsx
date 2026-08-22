import { ChevronLeft, ChevronRight, Eye, Search, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ReportDetailModal } from '@/components/dashboard/ReportDetailModal';
import { useVehicles } from '@/contexts/VehiclesContext';
import { ASSIGNMENT_STATUS_BADGE, PRIORITY_BADGE } from '@/lib/badges';
import { formatRelativeTime, type ReportRow } from '@/lib/reports';
import { ASSIGNMENT_STATUS_LABEL, updateAssignmentStatus, type AssignmentRow, type TeamRow } from '@/lib/teams';
import { buildAssignmentViews, type AssignmentView } from '@/lib/team-stats';

import { AssignTeamModal } from './AssignTeamModal';

type TabValue = 'all' | 'pending' | 'in_progress' | 'completed';

const PAGE_SIZE = 8;

export function ActiveAssignmentsTable({
  reports,
  assignments,
  teams,
}: {
  reports: ReportRow[];
  assignments: AssignmentRow[];
  teams: TeamRow[];
}) {
  const [tab, setTab] = useState<TabValue>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<ReportRow | null>(null);
  const [assigning, setAssigning] = useState<AssignmentView | null>(null);
  const { vehicles } = useVehicles();

  const views = useMemo(() => buildAssignmentViews(reports, assignments, teams, 80), [reports, assignments, teams]);

  const counts = useMemo(
    () => ({
      all: views.length,
      pending: views.filter((v) => v.status === 'pending' || v.status === 'unassigned').length,
      in_progress: views.filter((v) => v.status === 'in_progress').length,
      completed: views.filter((v) => v.status === 'completed').length,
    }),
    [views]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return views.filter((v) => {
      if (tab === 'pending' && v.status !== 'pending' && v.status !== 'unassigned') return false;
      if (tab === 'in_progress' && v.status !== 'in_progress') return false;
      if (tab === 'completed' && v.status !== 'completed') return false;
      if (
        q &&
        !`${v.report.report_code} ${v.report.category} ${v.report.address} ${v.team?.team_name ?? ''}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [views, tab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function changeFilter(fn: () => void) {
    fn();
    setPage(1);
  }

  async function advance(view: AssignmentView) {
    if (!view.assignment) return;
    const next = view.status === 'pending' ? 'in_progress' : 'completed';
    await updateAssignmentStatus(view.assignment.id, next);
  }

  const TABS: Array<{ label: string; value: TabValue }> = [
    { label: `All (${counts.all})`, value: 'all' },
    { label: `Pending (${counts.pending})`, value: 'pending' },
    { label: `In Progress (${counts.in_progress})`, value: 'in_progress' },
    { label: `Completed (${counts.completed})`, value: 'completed' },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-white/10">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => changeFilter(() => setTab(t.value))}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                tab === t.value
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-500 focus-within:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => changeFilter(() => setSearch(e.target.value))}
            placeholder="Search assignments..."
            className="w-44 bg-transparent outline-none placeholder:text-slate-400 dark:text-slate-200"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-slate-400">No assignments match your filters yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2.5 font-medium">Assignment ID</th>
                <th className="px-3 py-2.5 font-medium">Complaint ID</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 font-medium">Location</th>
                <th className="px-3 py-2.5 font-medium">Priority</th>
                <th className="px-3 py-2.5 font-medium">Assigned To</th>
                <th className="px-3 py-2.5 font-medium">Vehicle</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Assigned At</th>
                <th className="px-3 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((v) => (
                <tr
                  key={v.report.id}
                  className="border-t border-slate-100 text-slate-700 dark:border-white/5 dark:text-slate-200">
                  <td className="px-3 py-2.5 font-semibold text-brand-600">
                    {v.assignment?.assignment_code ?? '—'}
                  </td>
                  <td className="px-3 py-2.5">#{v.report.report_code}</td>
                  <td className="px-3 py-2.5">{v.report.category}</td>
                  <td className="max-w-[140px] truncate px-3 py-2.5 text-slate-500 dark:text-slate-400">
                    {v.report.address}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_BADGE[v.priority]}`}>
                      {v.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {v.team ? (
                      <button
                        type="button"
                        onClick={() => setAssigning(v)}
                        className="font-medium text-brand-600 hover:underline"
                        title="Reassign">
                        {v.team.team_code}
                      </button>
                    ) : (
                      <span className="text-slate-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
                    {v.assignment?.vehicle_label || '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ASSIGNMENT_STATUS_BADGE[v.status]}`}>
                      {v.status === 'unassigned' ? 'Unassigned' : ASSIGNMENT_STATUS_LABEL[v.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-500 dark:text-slate-400">
                    {v.assignment?.assigned_at ? formatRelativeTime(v.assignment.assigned_at) : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewing(v.report)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200">
                        <Eye size={15} />
                      </button>
                      {v.status === 'unassigned' ? (
                        <button
                          type="button"
                          onClick={() => setAssigning(v)}
                          title="Assign a team"
                          className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10">
                          <UserPlus size={15} />
                        </button>
                      ) : v.status !== 'completed' ? (
                        <button
                          type="button"
                          onClick={() => void advance(v)}
                          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10">
                          {v.status === 'pending' ? 'Start' : 'Complete'}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-[12px] text-slate-400">
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{' '}
            {filtered.length} assignments
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/5">
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`h-7 w-7 rounded-lg text-[12px] font-semibold ${
                  p === currentPage
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
                }`}>
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/5">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {viewing && <ReportDetailModal report={viewing} onClose={() => setViewing(null)} />}
      {assigning && (
        <AssignTeamModal
          report={assigning.report}
          teams={teams}
          vehicles={vehicles}
          existingAssignment={assigning.assignment}
          onClose={() => setAssigning(null)}
        />
      )}
    </div>
  );
}
