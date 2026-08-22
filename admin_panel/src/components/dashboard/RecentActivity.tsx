import { CheckCircle2, FilePlus2, RefreshCcw } from 'lucide-react';

import type { ActivityEvent } from '@/contexts/ReportsContext';
import { formatRelativeTime, STATUS_LABEL } from '@/lib/reports';

function describe(event: ActivityEvent): { text: string; icon: typeof FilePlus2; tone: string } {
  if (event.kind === 'new') {
    return {
      text: `New complaint ${event.report.report_code} reported`,
      icon: FilePlus2,
      tone: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
    };
  }
  if (event.report.status === 'resolved') {
    return {
      text: `Complaint ${event.report.report_code} resolved`,
      icon: CheckCircle2,
      tone: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
    };
  }
  return {
    text: `Complaint ${event.report.report_code} marked as ${STATUS_LABEL[event.report.status]}`,
    icon: RefreshCcw,
    tone: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
  };
}

export function RecentActivity({ activity }: { activity: ActivityEvent[] }) {
  if (activity.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-slate-400">
        Live activity will appear here as new complaints come in.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {activity.slice(0, 6).map((event) => {
        const { text, icon: Icon, tone } = describe(event);
        return (
          <div key={event.key} className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-white/5">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}>
              <Icon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">{text}</p>
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
