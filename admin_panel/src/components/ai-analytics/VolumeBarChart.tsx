import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useTheme } from '@/contexts/ThemeContext';
import type { VolumeBucket } from '@/lib/ai-stats';
import { CHART_INK } from '@/lib/palette';

function VolumeTooltip({ active, payload }: { active?: boolean; payload?: { payload: VolumeBucket }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-lg dark:border-white/10 dark:bg-[#1a2420]">
      <p className="font-semibold text-slate-700 dark:text-slate-200">
        {point.label} {point.rangeLabel}
      </p>
      <p className="text-slate-500 dark:text-slate-400">
        ~{point.tons.toLocaleString()} tons &middot; {point.reportCount.toLocaleString()} reports
      </p>
    </div>
  );
}

export function VolumeBarChart({ data }: { data: VolumeBucket[] }) {
  const { theme } = useTheme();
  const ink = CHART_INK[theme];

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={ink.grid} />
          <XAxis
            dataKey="label"
            tick={{ fill: ink.muted, fontSize: 11 }}
            axisLine={{ stroke: ink.axis }}
            tickLine={false}
          />
          <YAxis tick={{ fill: ink.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<VolumeTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
          <Bar dataKey="tons" fill="#7c3aed" radius={[6, 6, 0, 0]} maxBarSize={54} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        {data.map((d) => (
          <span key={d.label}>
            {d.label} {d.rangeLabel}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">
        AI-estimated tons, approximate — derived from each report's estimated volume, not a measured weight.
      </p>
    </div>
  );
}
