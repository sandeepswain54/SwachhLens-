import { Ban, CheckCircle2, FileText, LogIn, UserPlus, Users2 } from 'lucide-react';

import { formatRelativeTime } from '@/lib/reports';
import type { UserActivityItem } from '@/lib/users-stats';

const ICON_FOR: Record<string, typeof UserPlus> = {
  'New User Registered': UserPlus,
  'User Blocked': Ban,
  'User Unblocked': CheckCircle2,
  'Team Status Changed': Users2,
  'Complaint Submitted': FileText,
};

const DOT_FOR: Record<string, string> = {
  'New User Registered': 'bg-blue-500',
  'User Blocked': 'bg-red-500',
  'User Unblocked': 'bg-emerald-500',
  'Team Status Changed': 'bg-amber-500',
  'Complaint Submitted': 'bg-slate-400',
};

export function RecentUserActivityTable({ items }: { items: UserActivityItem[] }) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-[13px] text-slate-400">No activity yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-slate-400">
            <th className="px-3 pb-2 font-medium">Activity</th>
            <th className="px-3 pb-2 font-medium">User</th>
            <th className="px-3 pb-2 font-medium">User Type</th>
            <th className="px-3 pb-2 font-medium">Details</th>
            <th className="px-3 pb-2 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const Icon = ICON_FOR[item.activity] ?? LogIn;
            return (
              <tr key={item.id} className="border-t border-slate-100 text-slate-700 dark:border-white/5 dark:text-slate-200">
                <td className="whitespace-nowrap px-3 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${DOT_FOR[item.activity] ?? 'bg-slate-400'}`} />
                    <Icon size={13} className="text-slate-400" />
                    {item.activity}
                  </span>
                </td>
                <td className="px-3 py-2.5">{item.userName}</td>
                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
                  {item.userType === 'citizen' ? 'Citizen' : item.userType === 'field_team' ? 'Field Team' : '—'}
                </td>
                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{item.details}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">{formatRelativeTime(item.at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
