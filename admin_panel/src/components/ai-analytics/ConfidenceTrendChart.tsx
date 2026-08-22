import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useTheme } from '@/contexts/ThemeContext';
import type { ConfidenceTrendPoint } from '@/lib/ai-stats';
import { CHART_INK } from '@/lib/palette';

// Real per-day averages of the AI's own confidence/score fields
// (category_confidence, analysis.volume.confidencePercent, severity_score)
// — a genuine stand-in for "model performance over time" that doesn't
// require ground-truth labels the platform doesn't store. See the comment
// on computeConfidenceTrend in lib/ai-stats.ts.
const SERIES = [
  { key: 'classification', label: 'Classification', color: '#2a78d6' },
  { key: 'volume', label: 'Volume', color: '#7c3aed' },
  { key: 'severity', label: 'Severity/Priority', color: '#eb6834' },
] as const;

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { color: string; name: string; value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-lg dark:border-white/10 dark:bg-[#1a2420]">
      <p className="mb-1 font-semibold text-slate-700 dark:text-slate-200">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-semibold">{p.value.toFixed(1)}%</span>
        </p>
      ))}
    </div>
  );
}

export function ConfidenceTrendChart({ data }: { data: ConfidenceTrendPoint[] }) {
  const { theme } = useTheme();
  const ink = CHART_INK[theme];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4">
        {SERIES.map((s) => (
          <span
            key={s.key}
            className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={ink.grid} />
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
            width={40}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<TrendTooltip />} />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
