import { ArrowUp, CheckCircle2, MapPin, Users2 } from 'lucide-react';

import type { OperationsInsight } from '@/lib/ops-insights';
import { formatShortDateTime } from '@/lib/reports';

// Same tone palette as AI Analytics' AIInsightsPanel, plus a couple of
// operations-flavored icons (hotspot pin, team) since these insights span
// complaints/hotspots/teams rather than AI-analysis metrics specifically.
const TONE_STYLE: Record<OperationsInsight['tone'], { bg: string; fg: string }> = {
  critical: { bg: 'bg-red-50 dark:bg-red-500/10', fg: 'text-red-500' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-500/10', fg: 'text-amber-500' },
  info: { bg: 'bg-blue-50 dark:bg-blue-500/10', fg: 'text-blue-500' },
  success: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', fg: 'text-emerald-500' },
};

function iconFor(insight: OperationsInsight) {
  if (insight.id === 'top-hotspot') return MapPin;
  if (insight.id === 'top-team') return Users2;
  if (insight.tone === 'success') return CheckCircle2;
  return ArrowUp;
}

export function RecentInsightsList({ insights }: { insights: OperationsInsight[] }) {
  if (insights.length === 0) {
    return <p className="py-6 text-center text-[13px] text-slate-400">Not enough activity yet for insights.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {insights.map((insight) => {
        const tone = TONE_STYLE[insight.tone];
        const Icon = iconFor(insight);
        return (
          <div key={insight.id} className="flex items-start gap-3 rounded-xl px-1 py-2 hover:bg-slate-50 dark:hover:bg-white/5">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone.bg}`}>
              <Icon size={14} className={tone.fg} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium leading-snug text-slate-800 dark:text-slate-100">{insight.title}</p>
              <p className="truncate text-[12px] text-slate-400">{insight.subtitle}</p>
              <span className="text-[11px] text-slate-400">{formatShortDateTime(insight.at)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
