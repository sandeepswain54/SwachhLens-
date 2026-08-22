import { AlertTriangle, CheckCircle2, ChevronRight, Info, TrendingUp } from 'lucide-react';

import type { AIInsight } from '@/lib/ai-stats';

const TONE_STYLE: Record<AIInsight['tone'], { bg: string; fg: string; icon: typeof AlertTriangle }> = {
  critical: { bg: 'bg-red-50 dark:bg-red-500/10', fg: 'text-red-500', icon: AlertTriangle },
  warning: { bg: 'bg-amber-50 dark:bg-amber-500/10', fg: 'text-amber-500', icon: TrendingUp },
  info: { bg: 'bg-blue-50 dark:bg-blue-500/10', fg: 'text-blue-500', icon: Info },
  success: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', fg: 'text-emerald-500', icon: CheckCircle2 },
};

export function AIInsightsPanel({ insights }: { insights: AIInsight[] }) {
  if (insights.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-slate-400">
        Not enough activity yet to generate insights.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {insights.map((insight) => {
        const tone = TONE_STYLE[insight.tone];
        const Icon = tone.icon;
        return (
          <div
            key={insight.id}
            className="flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone.bg}`}>
              <Icon size={15} className={tone.fg} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium leading-snug text-slate-800 dark:text-slate-100">
                {insight.title}
              </p>
              <p className="truncate text-[12px] text-slate-400">{insight.subtitle}</p>
            </div>
            <ChevronRight size={14} className="mt-1 shrink-0 text-slate-300" />
          </div>
        );
      })}
    </div>
  );
}
