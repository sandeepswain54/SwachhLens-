import { Ban, ShieldCheck, UsersRound } from 'lucide-react';

import type { UserTypeOverviewRow } from '@/lib/users-stats';

const ICON_FOR: Record<string, { icon: typeof UsersRound; bg: string; fg: string; bar: string }> = {
  'Citizen Users': { icon: UsersRound, bg: 'bg-blue-50 dark:bg-blue-500/10', fg: 'text-blue-600', bar: 'bg-blue-500' },
  'Field Team Users': { icon: ShieldCheck, bg: 'bg-orange-50 dark:bg-orange-500/10', fg: 'text-orange-600', bar: 'bg-orange-500' },
  'Blocked Users': { icon: Ban, bg: 'bg-red-50 dark:bg-red-500/10', fg: 'text-red-600', bar: 'bg-red-500' },
};

export function UserTypeOverviewList({ rows }: { rows: UserTypeOverviewRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      {rows.map((row) => {
        const style = ICON_FOR[row.label] ?? ICON_FOR['Citizen Users'];
        const Icon = style.icon;
        return (
          <div key={row.label} className="flex items-center gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.bg}`}>
              <Icon size={16} className={style.fg} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{row.label}</p>
                <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">{row.percent.toFixed(1)}%</p>
              </div>
              <p className="mb-1 text-[11px] text-slate-400">Total Users: {row.count.toLocaleString()}</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${Math.min(100, row.percent)}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
