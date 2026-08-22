import { CheckCircle2, Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { generateAIReport, type AIReportInput } from '@/lib/ai-report';

export function GenerateReportButton({ buildInput }: { buildInput: () => AIReportInput }) {
  const [state, setState] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setState('generating');
    setError(null);
    try {
      await generateAIReport(buildInput());
      setState('done');
      setTimeout(() => setState('idle'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the report.');
      setState('error');
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={state === 'generating'}
        className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-600 disabled:opacity-70">
        {state === 'generating' ? (
          <>
            <Loader2 size={15} className="animate-spin" /> Generating…
          </>
        ) : state === 'done' ? (
          <>
            <CheckCircle2 size={15} /> Report Downloaded
          </>
        ) : (
          <>
            <Download size={15} /> Generate AI Report
          </>
        )}
      </button>

      {error && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-700 shadow-lg dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
