import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useTheme } from '@/contexts/ThemeContext';
import type { StatusBar } from '@/lib/users-stats';
import { CHART_INK } from '@/lib/palette';

function StatusTooltip({ active, payload }: { active?: boolean; payload?: { payload: StatusBar }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-lg dark:border-white/10 dark:bg-[#1a2420]">
      <p className="font-semibold text-slate-700 dark:text-slate-200">{point.label}</p>
      <p className="text-slate-500 dark:text-slate-400">{point.count.toLocaleString()} users</p>
    </div>
  );
}

export function UsersByStatusChart({ data }: { data: StatusBar[] }) {
  const { theme } = useTheme();
  const ink = CHART_INK[theme];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fill: ink.muted, fontSize: 11 }} axisLine={{ stroke: ink.axis }} tickLine={false} />
        <YAxis tick={{ fill: ink.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
        <Tooltip content={<StatusTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
