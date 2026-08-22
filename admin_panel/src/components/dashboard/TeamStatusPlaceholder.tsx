import { UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';

export function TeamStatusPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/5">
        <UsersRound size={19} />
      </span>
      <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">No teams set up yet</p>
      <p className="max-w-[200px] text-[12px] text-slate-400">
        Configure cleanup teams in{' '}
        <Link to="/teams" className="font-medium text-brand-600 hover:underline">
          Teams &amp; Assignments
        </Link>{' '}
        to see live workload here.
      </p>
    </div>
  );
}
