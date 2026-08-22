import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useTheme } from '@/contexts/ThemeContext';
import { CHART_INK } from '@/lib/palette';
import type { DailyWorkload } from '@/lib/team-stats';

function barColor(percent: number): string {
  if (percent >= 80) return '#d03b3b';
  if (percent >= 60) return '#eb6834';
  return '#0ca30c';
}

function WorkloadTooltip({ active, payload }: { active?: boolean; payload?: { payload: DailyWorkload }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-lg dark:border-white/10 dark:bg-[#1a2420]">
      <p className="font-semibold text-slate-700 dark:text-slate-200">{point.label}</p>
      <p className="text-slate-500 dark:text-slate-400">{point.percent}% of daily capacity</p>
    </div>
  );
}

export function TeamWorkloadChart({ data }: { data: DailyWorkload[] }) {
  const { theme } = useTheme();
  const ink = CHART_INK[theme];

  return (
    <div className="h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: ink.muted, fontSize: 11 }}
            axisLine={{ stroke: ink.axis }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: ink.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<WorkloadTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
          <Bar dataKey="percent" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.label} fill={barColor(d.percent)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
