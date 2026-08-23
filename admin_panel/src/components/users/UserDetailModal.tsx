import { Ban, CheckCircle2, Mail, MapPin, ShieldCheck, UserRound, X } from 'lucide-react';

import { formatAbsoluteDateTime, formatRelativeTime } from '@/lib/reports';
import type { AppUser } from '@/lib/users-stats';

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}

export function UserDetailModal({
  user,
  onClose,
  onBlockToggle,
}: {
  user: AppUser;
  onClose: () => void;
  onBlockToggle: (user: AppUser) => void;
}) {
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#141c17]"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[15px] font-bold text-white">
              {user.fullName
                .split(' ')
                .map((p) => p[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
            <div>
              <p className="text-[15px] font-bold text-slate-900 dark:text-white">{user.fullName}</p>
              <p className="text-[12px] text-slate-400">
                {user.displayId} &middot; {user.role}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        <span
          className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            user.status === 'active'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
              : 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400'
          }`}>
          {user.status === 'active' ? <CheckCircle2 size={12} /> : <Ban size={12} />}
          {user.status === 'active' ? 'Active' : 'Blocked'}
        </span>

        <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 dark:bg-white/5">
          <Row icon={Mail} label="Email" value={user.email ?? 'Not provided'} />
          <Row icon={MapPin} label="Zone / Area" value={user.zone ?? 'Unknown'} />
          <Row icon={UserRound} label="Joined On" value={formatAbsoluteDateTime(user.joinedAt)} />
          <Row
            icon={ShieldCheck}
            label="Last Sign-In"
            value={user.lastSignInAt ? formatRelativeTime(user.lastSignInAt) : 'Never / unavailable'}
          />
        </div>

        {user.userType === 'citizen' && (
          <p className="mt-3 text-[12.5px] text-slate-500 dark:text-slate-400">
            Has submitted <strong className="text-slate-700 dark:text-slate-200">{user.reportCount}</strong> complaint
            {user.reportCount === 1 ? '' : 's'}.
          </p>
        )}
        {user.userType === 'field_team' && user.teamCode && (
          <p className="mt-3 text-[12.5px] text-slate-500 dark:text-slate-400">
            Leads team <strong className="text-slate-700 dark:text-slate-200">{user.teamCode}</strong>.
          </p>
        )}

        <button
          type="button"
          onClick={() => onBlockToggle(user)}
          className={`mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold text-white ${
            user.status === 'active' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
          }`}>
          {user.status === 'active' ? <Ban size={14} /> : <CheckCircle2 size={14} />}
          {user.status === 'active' ? 'Block User' : 'Unblock User'}
        </button>
      </div>
    </div>
  );
}
