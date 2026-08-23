import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export type DonutSlice = {
  name: string;
  count: number;
  percent: number;
  color: string;
};

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DonutSlice }[];
}) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-lg dark:border-white/10 dark:bg-[#1a2420]">
      <p className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: slice.color }} />
        {slice.name}
      </p>
      <p className="text-slate-500 dark:text-slate-400">
        {slice.count.toLocaleString()} ({slice.percent.toFixed(1)}%)
      </p>
    </div>
  );
}

export function DonutChart({
  data,
  centerValue,
  centerLabel,
}: {
  data: DonutSlice[];
  centerValue: number;
  centerLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 @[360px]:flex-row @[360px]:items-center">
      <div className="relative h-[190px] w-[190px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              innerRadius={62}
              outerRadius={90}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="none"
              isAnimationActive={false}>
              {data.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {centerValue.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400">{centerLabel}</p>
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-2.5">
        {data.map((slice) => (
          <div key={slice.name} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px]">
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
              <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">{slice.name}</span>
            </span>
            <span className="shrink-0 whitespace-nowrap text-right">
              <span className="font-semibold text-slate-800 dark:text-slate-100">{slice.count.toLocaleString()}</span>{' '}
              <span className="text-slate-400">({slice.percent.toFixed(1)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
