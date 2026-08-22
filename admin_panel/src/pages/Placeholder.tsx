import { Construction } from 'lucide-react';

import { Topbar } from '@/components/layout/Topbar';

export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex min-h-full flex-col">
      <Topbar title={title} subtitle="This section is coming soon" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/5">
          <Construction size={24} />
        </span>
        <p className="text-[14px] font-medium text-slate-600 dark:text-slate-300">{title} is coming soon</p>
        <p className="max-w-sm text-center text-[13px] text-slate-400">
          The Dashboard is wired up to live data first. This page will follow in a later pass.
        </p>
      </div>
    </div>
  );
}
