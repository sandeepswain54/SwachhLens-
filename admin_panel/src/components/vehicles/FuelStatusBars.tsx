import type { FuelBucket } from '@/lib/vehicle-stats';

export function FuelStatusBars({ buckets }: { buckets: FuelBucket[] }) {
  const maxPercent = Math.max(...buckets.map((b) => b.percent), 1);

  return (
    <div className="flex flex-col gap-3.5">
      {buckets.map((b) => (
        <div key={b.label}>
          <div className="mb-1 flex items-center justify-between text-[12.5px]">
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
              {b.label}
            </span>
            <span className="text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-100">{b.count}</span> ({b.percent.toFixed(1)}%)
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div
              className="h-full rounded-full"
              style={{ width: `${(b.percent / maxPercent) * 100}%`, backgroundColor: b.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
