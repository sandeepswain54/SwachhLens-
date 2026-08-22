import { SEVERITY_COLOR } from '@/lib/palette';
import type { SeverityLabel } from '@/lib/reports';

const SIZE = 116;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SeverityGauge({ score, level }: { score: number; level: SeverityLabel }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = SEVERITY_COLOR[level];
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-slate-100 dark:stroke-white/10"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold leading-none text-slate-900 dark:text-white">
            {Math.round(clamped)}
          </span>
          <span className="text-[10px] text-slate-400">/ 100</span>
        </div>
      </div>
      <span
        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
        style={{ backgroundColor: `${color}1a`, color }}>
        {level} severity
      </span>
    </div>
  );
}
