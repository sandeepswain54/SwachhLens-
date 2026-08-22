import { ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { TEAM_STATUS_BADGE } from '@/lib/badges';
import { computeTeamWorkload } from '@/lib/team-stats';
import { TEAM_STATUS_LABEL, ZONES, type AssignmentRow, type TeamRow, type TeamStatus } from '@/lib/teams';

const TABS: Array<{ label: string; value: TeamStatus | 'all' }> = [
  { label: 'All Teams', value: 'all' },
  { label: 'On Duty', value: 'on_duty' },
  { label: 'Available', value: 'available' },
  { label: 'Maintenance', value: 'maintenance' },
];

const PAGE_SIZE = 8;

function workloadBarColor(percent: number): string {
  if (percent >= 80) return '#d03b3b';
  if (percent >= 60) return '#eb6834';
  return '#0ca30c';
}

export function TeamsTable({
  teams,
  assignments,
  selectedTeamId,
  onSelectTeam,
}: {
  teams: TeamRow[];
  assignments: AssignmentRow[];
  selectedTeamId: string | null;
  onSelectTeam: (team: TeamRow) => void;
}) {
  const [tab, setTab] = useState<TeamStatus | 'all'>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teams.filter((t) => {
      if (tab !== 'all' && t.status !== tab) return false;
      if (zoneFilter !== 'all' && t.zone !== zoneFilter) return false;
      if (q && !`${t.team_name} ${t.leader_name} ${t.team_code}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [teams, tab, zoneFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function changeFilter(fn: () => void) {
    fn();
    setPage(1);
  }

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

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-500 focus-within:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            <Search size={14} />
            <input
              value={search}
              onChange={(e) => changeFilter(() => setSearch(e.target.value))}
              placeholder="Search teams by name, leader..."
              className="w-44 bg-transparent outline-none placeholder:text-slate-400 dark:text-slate-200"
            />
          </label>
          <select
            value={zoneFilter}
            onChange={(e) => changeFilter(() => setZoneFilter(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-600 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            <option value="all">All Zones</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
          <select
            value={tab}
            onChange={(e) => changeFilter(() => setTab(e.target.value as TeamStatus | 'all'))}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-600 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            <option value="all">All Status</option>
            {(Object.keys(TEAM_STATUS_LABEL) as TeamStatus[]).map((s) => (
              <option key={s} value={s}>
                {TEAM_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-slate-400">No teams match your filters yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2.5 font-medium">Team ID</th>
                <th className="px-3 py-2.5 font-medium">Team Name</th>
                <th className="px-3 py-2.5 font-medium">Team Leader</th>
                <th className="px-3 py-2.5 font-medium">Zone</th>
                <th className="px-3 py-2.5 font-medium">Members</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Current Workload</th>
                <th className="px-3 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((team) => {
                const workload = computeTeamWorkload(team, assignments);
                return (
                  <tr
                    key={team.id}
                    onClick={() => onSelectTeam(team)}
                    className={`cursor-pointer border-t border-slate-100 text-slate-700 transition-colors dark:border-white/5 dark:text-slate-200 ${
                      selectedTeamId === team.id
                        ? 'bg-brand-50/60 dark:bg-brand-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}>
                    <td className="px-3 py-2.5 font-semibold text-brand-600">{team.team_code}</td>
                    <td className="px-3 py-2.5">{team.team_name}</td>
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{team.leader_name}</td>
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{team.zone}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {team.member_count} / {team.member_capacity}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TEAM_STATUS_BADGE[team.status]}`}>
                        {TEAM_STATUS_LABEL[team.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${workload.percent}%`, backgroundColor: workloadBarColor(workload.percent) }}
                          />
                        </div>
                        <span className="w-9 text-right text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                          {workload.percent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTeam(team);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200">
                        <Eye size={15} />
                      </button>
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
            {filtered.length} teams
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
    </div>
  );
}
