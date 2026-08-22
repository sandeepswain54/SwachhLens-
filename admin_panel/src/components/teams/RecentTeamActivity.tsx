import { CheckCircle2, PlayCircle, UserPlus, Users } from 'lucide-react';

import type { TeamActivityEvent } from '@/contexts/TeamsContext';
import { formatRelativeTime } from '@/lib/reports';

const TONE_STYLE: Record<TeamActivityEvent['tone'], { icon: typeof UserPlus; className: string }> = {
  new: { icon: UserPlus, className: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' },
  progress: { icon: PlayCircle, className: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' },
  done: { icon: CheckCircle2, className: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
  team: { icon: Users, className: 'text-brand-600 bg-brand-50 dark:bg-brand-500/10' },
};

export function RecentTeamActivity({ activity }: { activity: TeamActivityEvent[] }) {
  if (activity.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-slate-400">
        Live activity will appear here as teams and assignments change.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {activity.slice(0, 6).map((event) => {
        const { icon: Icon, className } = TONE_STYLE[event.tone];
        return (
          <div key={event.key} className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-white/5">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${className}`}>
              <Icon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">{event.text}</p>
            </div>
            <span className="shrink-0 whitespace-nowrap pt-0.5 text-[11px] text-slate-400">
              {formatRelativeTime(event.at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
