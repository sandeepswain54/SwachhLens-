import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp } from 'lucide-react';

// Same visual language as dashboard/StatCard, but takes a pre-formatted
// `value` string (e.g. "91.4%") instead of a raw number — several AI
// Analytics metrics are percentages/rates rather than plain counts.
export function AIStatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  deltaPercent,
  deltaCaption = 'from last week',
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  deltaPercent?: number | null;
  deltaCaption?: string;
}) {
  const hasDelta = deltaPercent !== undefined && deltaPercent !== null;
  const isUp = hasDelta && deltaPercent! >= 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card dark:border-white/10 dark:bg-[#111814]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] text-slate-500 dark:text-slate-400">{label}</p>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: iconBg }}>
          <Icon size={17} style={{ color: iconColor }} strokeWidth={2.2} />
        </span>
      </div>
      <p className="text-[26px] font-extrabold leading-none text-slate-900 dark:text-white">{value}</p>
      {hasDelta ? (
        <p
          className={`flex items-center gap-1 text-[12px] font-semibold ${
            isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
          }`}>
          {isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {Math.abs(deltaPercent!).toFixed(1)}% <span className="font-normal text-slate-400">{deltaCaption}</span>
        </p>
      ) : (
        <p className="text-[12px] text-slate-400">{deltaCaption}</p>
      )}
    </div>
  );
}
