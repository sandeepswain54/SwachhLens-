import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Eye, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { RowActionMenu } from '@/components/common/RowActionMenu';
import { Select } from '@/components/common/Select';
import { COMPLAINT_STATUS_BADGE, PRIORITY_BADGE } from '@/lib/badges';
import {
  buildCategoryOptions,
  buildLocalityOptions,
  complaintStatus,
  COMPLAINT_STATUS_LABEL,
  deriveLocality,
  duplicateFlagged,
  type ComplaintTab,
} from '@/lib/complaints';
import { formatRelativeTime, markReportResolved, setReportEscalated, type ReportRow } from '@/lib/reports';
import { priorityForSeverity, type Priority } from '@/lib/team-stats';
import type { AssignmentRow } from '@/lib/teams';

const PAGE_SIZE = 10;

const selectClass =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-600 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300';

const TABS: Array<{ label: string; value: ComplaintTab }> = [
  { label: 'All Complaints', value: 'all' },
  { label: 'New', value: 'submitted' },
  { label: 'Pending', value: 'team_assigned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Escalated', value: 'escalated' },
  { label: 'Duplicates', value: 'duplicates' },
];

export function ComplaintsTable({
  reports,
  assignments,
  search,
  selectedId,
  onSelect,
  onAssign,
}: {
  reports: ReportRow[];
  assignments: AssignmentRow[];
  search: string;
  selectedId: string | null;
  onSelect: (report: ReportRow) => void;
  onAssign: (report: ReportRow) => void;
}) {
  const [tab, setTab] = useState<ComplaintTab>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [localityFilter, setLocalityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const assignmentByReport = useMemo(() => new Map(assignments.map((a) => [a.report_id, a])), [assignments]);
  const categoryOptions = useMemo(() => buildCategoryOptions(reports), [reports]);
  const localityOptions = useMemo(() => buildLocalityOptions(reports), [reports]);

  function changeFilter(fn: () => void) {
    fn();
    setPage(1);
    setSelected(new Set());
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;

    return reports.filter((r) => {
      if (tab === 'duplicates') {
        if (!duplicateFlagged(r)) return false;
      } else if (tab !== 'all' && complaintStatus(r) !== tab) {
        return false;
      }

      if (priorityFilter !== 'all' && priorityForSeverity(r.severity_label) !== priorityFilter) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (localityFilter !== 'all' && deriveLocality(r.address) !== localityFilter) return false;

      const createdMs = new Date(r.created_at).getTime();
      if (from !== null && createdMs < from) return false;
      if (to !== null && createdMs > to) return false;

      if (q && !`${r.report_code} ${r.category} ${r.address}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [reports, tab, priorityFilter, categoryFilter, localityFilter, dateFrom, dateTo, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageRows.forEach((r) => next.delete(r.id));
      else pageRows.forEach((r) => next.add(r.id));
      return next;
    });
  }

  function resetAll() {
    changeFilter(() => {
      setTab('all');
      setPriorityFilter('all');
      setCategoryFilter('all');
      setLocalityFilter('all');
      setDateFrom('');
      setDateTo('');
    });
  }

  async function bulkEscalate() {
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map((id) => setReportEscalated(id, true)));
      setSelected(new Set());
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkResolve() {
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map((id) => markReportResolved(id)));
      setSelected(new Set());
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-3 dark:border-white/10">
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

      <div className="flex flex-wrap items-end gap-2 border-b border-slate-100 py-3 dark:border-white/10">
        <div>
          <label className="mb-1 block text-[11px] text-slate-400">Status</label>
          <Select
            value={tab === 'duplicates' ? 'all' : tab}
            onChange={(v) => changeFilter(() => setTab(v as ComplaintTab))}
            className={selectClass}
            options={[
              { value: 'all', label: 'All Status' },
              ...(Object.keys(COMPLAINT_STATUS_LABEL) as (keyof typeof COMPLAINT_STATUS_LABEL)[]).map((s) => ({
                value: s,
                label: COMPLAINT_STATUS_LABEL[s],
              })),
            ]}
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] text-slate-400">Priority</label>
          <Select
            value={priorityFilter}
            onChange={(v) => changeFilter(() => setPriorityFilter(v as Priority | 'all'))}
            className={selectClass}
            options={[
              { value: 'all', label: 'All Priority' },
              { value: 'High', label: 'High' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Low', label: 'Low' },
            ]}
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] text-slate-400">Category</label>
          <Select
            value={categoryFilter}
            onChange={(v) => changeFilter(() => setCategoryFilter(v))}
            className={selectClass}
            options={[{ value: 'all', label: 'All Categories' }, ...categoryOptions.map((c) => ({ value: c, label: c }))]}
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] text-slate-400">Location</label>
          <Select
            value={localityFilter}
            onChange={(v) => changeFilter(() => setLocalityFilter(v))}
            className={`max-w-[140px] ${selectClass}`}
            options={[{ value: 'all', label: 'All Locations' }, ...localityOptions.map((l) => ({ value: l, label: l }))]}
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] text-slate-400">Date Range</label>
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => changeFilter(() => setDateFrom(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-600 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            />
            <span className="text-slate-300">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => changeFilter(() => setDateTo(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-600 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={resetAll}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
            Reset
          </button>
          <button
            type="button"
            onClick={() => changeFilter(() => {})}
            title="Filters already apply live — this just jumps back to page 1"
            className="rounded-lg bg-brand-500 px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-600">
            Filters
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 text-[13px] dark:bg-brand-500/10">
          <span className="font-medium text-brand-700 dark:text-brand-300">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void bulkEscalate()}
              disabled={bulkBusy}
              className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10">
              Escalate
            </button>
            <button
              type="button"
              onClick={() => void bulkResolve()}
              disabled={bulkBusy}
              className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-500/10">
              Mark Resolved
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-slate-400">No complaints match your filters yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="w-8 px-3 py-2.5">
                  <input type="checkbox" checked={allPageSelected} onChange={togglePage} className="accent-brand-500" />
                </th>
                <th className="px-3 py-2.5 font-medium">ID</th>
                <th className="px-3 py-2.5 font-medium">Image</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 font-medium">Location</th>
                <th className="px-3 py-2.5 font-medium">Priority</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Reported At</th>
                <th className="px-3 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => {
                const priority = priorityForSeverity(r.severity_label);
                const status = complaintStatus(r);
                const assignment = assignmentByReport.get(r.id) ?? null;
                const isResolved = r.status === 'resolved';

                return (
                  <tr
                    key={r.id}
                    onClick={() => onSelect(r)}
                    className={`cursor-pointer border-t border-slate-100 text-slate-700 transition-colors dark:border-white/5 dark:text-slate-200 ${
                      selectedId === r.id ? 'bg-brand-50/60 dark:bg-brand-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleRow(r.id)}
                        className="accent-brand-500"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-brand-600">#{r.report_code}</td>
                    <td className="px-3 py-2.5">
                      <img src={r.media_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
                    </td>
                    <td className="px-3 py-2.5">{r.category}</td>
                    <td className="max-w-[140px] truncate px-3 py-2.5 text-slate-500 dark:text-slate-400">
                      {r.address}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_BADGE[priority]}`}>
                        {priority}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${COMPLAINT_STATUS_BADGE[status]}`}>
                        {COMPLAINT_STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-500 dark:text-slate-400">
                      {formatRelativeTime(r.created_at)}
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelect(r)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200">
                          <Eye size={15} />
                        </button>
                        <RowActionMenu width={176}>
                          {(close) => (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  onAssign(r);
                                  close();
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5">
                                <UserPlus size={13} /> {assignment ? 'Reassign Team' : 'Assign Team'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setReportEscalated(r.id, !r.escalated).catch((err: Error) => console.error(err));
                                  close();
                                }}
                                disabled={isResolved}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/5">
                                <AlertTriangle size={13} /> {r.escalated ? 'Un-escalate' : 'Escalate'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  markReportResolved(r.id).catch((err: Error) => console.error(err));
                                  close();
                                }}
                                disabled={isResolved}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/5">
                                <CheckCircle2 size={13} /> Mark Resolved
                              </button>
                            </>
                          )}
                        </RowActionMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-[12px] text-slate-400">
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{' '}
            {filtered.length.toLocaleString()} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/5">
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, i, arr) => (
                <span key={p} className="flex items-center">
                  {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-slate-300">…</span>}
                  <button
                    type="button"
                    onClick={() => setPage(p)}
                    className={`h-7 w-7 rounded-lg text-[12px] font-semibold ${
                      p === currentPage
                        ? 'bg-brand-500 text-white'
                        : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
                    }`}>
                    {p}
                  </button>
                </span>
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
    </div>
  );
}
