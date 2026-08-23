import { Calendar } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type DateRange = { start: Date; end: Date };

function fmt(d: Date) {
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toInputValue(d: Date) {
  const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function endOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}

export function lastNDays(n: number): DateRange {
  const end = endOfDay(new Date());
  const start = startOfDay(new Date());
  start.setDate(start.getDate() - (n - 1));
  return { start, end };
}

function thisMonth(): DateRange {
  const now = new Date();
  return { start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), end: endOfDay(now) };
}

function lastMonth(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return { start: startOfDay(start), end: endOfDay(end) };
}

const PRESETS: Array<{ label: string; range: () => DateRange }> = [
  { label: 'Last 7 Days', range: () => lastNDays(7) },
  { label: 'Last 14 Days', range: () => lastNDays(14) },
  { label: 'Last 30 Days', range: () => lastNDays(30) },
  { label: 'This Month', range: thisMonth },
  { label: 'Last Month', range: lastMonth },
];

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(toInputValue(value.start));
  const [customEnd, setCustomEnd] = useState(toInputValue(value.end));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomStart(toInputValue(value.start));
    setCustomEnd(toInputValue(value.end));
  }, [value]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function applyPreset(range: DateRange) {
    onChange(range);
    setOpen(false);
  }

  function applyCustom() {
    if (!customStart || !customEnd) return;
    const start = startOfDay(new Date(`${customStart}T00:00:00`));
    const end = endOfDay(new Date(`${customEnd}T00:00:00`));
    if (start.getTime() > end.getTime()) return;
    onChange({ start, end });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
        <Calendar size={14} />
        {fmt(value.start)} - {fmt(value.end)}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-[#161f1a]">
          <div className="flex flex-col gap-0.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.range())}
                className="rounded-lg px-2.5 py-1.5 text-left text-[13px] text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5">
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-2 border-t border-slate-100 pt-2 dark:border-white/10">
            <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Custom Range
            </p>
            <div className="flex items-center gap-1.5 px-2.5">
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[12px] text-slate-600 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              />
              <span className="text-slate-400">–</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[12px] text-slate-600 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              />
            </div>
            <button
              type="button"
              onClick={applyCustom}
              className="mt-2 w-full rounded-lg bg-brand-500 px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-600">
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
