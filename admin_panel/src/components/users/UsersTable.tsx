import { Ban, CheckCircle2, ChevronLeft, ChevronRight, Eye, MoreVertical, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { formatAbsoluteDateTime } from '@/lib/reports';
import type { AppUser, UserType } from '@/lib/users-stats';

import { BlockUserDialog } from './BlockUserDialog';
import { UserDetailModal } from './UserDetailModal';

const PAGE_SIZE = 10;

export type UsersTab = 'all' | 'citizen' | 'field_team' | 'blocked';

const TABS: Array<{ value: UsersTab; label: string }> = [
  { value: 'all', label: 'All Users' },
  { value: 'citizen', label: 'Citizen Users' },
  { value: 'field_team', label: 'Field Team Users' },
  { value: 'blocked', label: 'Blocked Users' },
];

const selectClass =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-600 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300';

function StatusBadge({ status }: { status: AppUser['status'] }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        status === 'active'
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
          : 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400'
      }`}>
      {status === 'active' ? 'Active' : 'Blocked'}
    </span>
  );
}

function TypeBadge({ userType }: { userType: UserType }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        userType === 'citizen'
          ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
          : 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400'
      }`}>
      {userType === 'citizen' ? 'Citizen' : 'Field Team'}
    </span>
  );
}

export function UsersTable({ users, search }: { users: AppUser[]; search: string }) {
  const [tab, setTab] = useState<UsersTab>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | UserType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AppUser['status']>('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<AppUser | null>(null);
  const [pendingBlock, setPendingBlock] = useState<{ user: AppUser; blocking: boolean } | null>(null);

  const zoneOptions = useMemo(
    () => [...new Set(users.map((u) => u.zone).filter((z): z is string => !!z))].sort((a, b) => a.localeCompare(b)),
    [users]
  );

  const filtered = useMemo(() => {
    let list = users;
    if (tab === 'citizen') list = list.filter((u) => u.userType === 'citizen');
    else if (tab === 'field_team') list = list.filter((u) => u.userType === 'field_team');
    else if (tab === 'blocked') list = list.filter((u) => u.status === 'blocked');

    if (typeFilter !== 'all') list = list.filter((u) => u.userType === typeFilter);
    if (statusFilter !== 'all') list = list.filter((u) => u.status === statusFilter);
    if (zoneFilter !== 'all') list = list.filter((u) => u.zone === zoneFilter);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.displayId.toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, tab, typeFilter, statusFilter, zoneFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function resetFilters() {
    setTypeFilter('all');
    setStatusFilter('all');
    setZoneFilter('all');
    setPage(0);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-100 dark:border-white/5">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setTab(t.value);
              setPage(0);
            }}
            className={`border-b-2 px-3 py-2 text-[13px] font-medium transition-colors ${
              tab === t.value
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as 'all' | UserType);
            setPage(0);
          }}
          className={selectClass}>
          <option value="all">All Types</option>
          <option value="citizen">Citizen Users</option>
          <option value="field_team">Field Team Users</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'all' | AppUser['status']);
            setPage(0);
          }}
          className={selectClass}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
        <select
          value={zoneFilter}
          onChange={(e) => {
            setZoneFilter(e.target.value);
            setPage(0);
          }}
          className={selectClass}>
          <option value="all">All Zones</option>
          {zoneOptions.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={resetFilters}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-3 pb-2 font-medium">User ID</th>
              <th className="px-3 pb-2 font-medium">Name</th>
              <th className="px-3 pb-2 font-medium">User Type</th>
              <th className="px-3 pb-2 font-medium">Role</th>
              <th className="px-3 pb-2 font-medium">Email</th>
              <th className="px-3 pb-2 font-medium">Zone / Area</th>
              <th className="px-3 pb-2 font-medium">Status</th>
              <th className="px-3 pb-2 font-medium">Joined On</th>
              <th className="px-3 pb-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 text-slate-700 dark:border-white/5 dark:text-slate-200">
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-brand-600">{u.displayId}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                      {u.fullName.slice(0, 1).toUpperCase()}
                    </span>
                    {u.fullName}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <TypeBadge userType={u.userType} />
                </td>
                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{u.role}</td>
                <td className="max-w-[160px] truncate px-3 py-2.5 text-slate-500 dark:text-slate-400">{u.email ?? '—'}</td>
                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{u.zone ?? '—'}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={u.status} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-500 dark:text-slate-400">
                  {formatAbsoluteDateTime(u.joinedAt)}
                </td>
                <td className="relative px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewing(u)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200">
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMenuOpenId(menuOpenId === u.id ? null : u.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200">
                      <MoreVertical size={15} />
                    </button>
                  </div>

                  {menuOpenId === u.id && (
                    <div className="absolute right-3 top-9 z-10 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-[#1a231d]">
                      <button
                        type="button"
                        onClick={() => {
                          setPendingBlock({ user: u, blocking: u.status === 'active' });
                          setMenuOpenId(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5">
                        {u.status === 'active' ? (
                          <>
                            <Ban size={13} /> Block User
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} /> Unblock User
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-[13px] text-slate-400">
                  No users match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-[12px] text-slate-400">
        <span>
          Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1} to{' '}
          {Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)} of {filtered.length.toLocaleString()} users
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/5">
            <ChevronLeft size={15} />
          </button>
          <span className="px-2 text-slate-600 dark:text-slate-300">
            Page {safePage + 1} of {pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/5">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {viewing && (
        <UserDetailModal
          user={viewing}
          onClose={() => setViewing(null)}
          onBlockToggle={(u) => {
            setViewing(null);
            setPendingBlock({ user: u, blocking: u.status === 'active' });
          }}
        />
      )}

      {pendingBlock && (
        <BlockUserDialog
          user={pendingBlock.user}
          blocking={pendingBlock.blocking}
          onClose={() => setPendingBlock(null)}
          onDone={() => setPendingBlock(null)}
        />
      )}
    </div>
  );
}
