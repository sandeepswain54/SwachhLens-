import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useMemo, useState } from 'react';

import { formatRelativeTime } from '@/lib/reports';
import type { FeedbackView } from '@/lib/feedback-stats';

const PAGE_SIZE = 10;

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={13}
          className={n <= rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200 dark:fill-white/10 dark:text-white/10'}
        />
      ))}
    </div>
  );
}

export function FeedbackTable({ views, search }: { views: FeedbackView[]; search: string }) {
  const [ratingFilter, setRatingFilter] = useState<'all' | number>('all');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let list = views;
    if (ratingFilter !== 'all') list = list.filter((v) => v.feedback.rating === ratingFilter);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          (v.report?.report_code ?? '').toLowerCase().includes(q) ||
          (v.report?.category ?? '').toLowerCase().includes(q) ||
          (v.team?.team_name ?? '').toLowerCase().includes(q) ||
          (v.feedback.comment ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [views, ratingFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={ratingFilter}
          onChange={(e) => {
            setRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value));
            setPage(0);
          }}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-600 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <option value="all">All Ratings</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} Star{n > 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-3 pb-2 font-medium">Report</th>
              <th className="px-3 pb-2 font-medium">Team</th>
              <th className="px-3 pb-2 font-medium">Rating</th>
              <th className="px-3 pb-2 font-medium">Comment</th>
              <th className="px-3 pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((v) => (
              <tr
                key={v.feedback.id}
                className="border-t border-slate-100 align-top text-slate-700 dark:border-white/5 dark:text-slate-200">
                <td className="whitespace-nowrap px-3 py-2.5">
                  <p className="font-semibold text-brand-600">#{v.report?.report_code ?? '—'}</p>
                  <p className="text-[11.5px] text-slate-400">{v.report?.category ?? 'Unknown report'}</p>
                </td>
                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{v.team?.team_name ?? '—'}</td>
                <td className="px-3 py-2.5">
                  <StarRow rating={v.feedback.rating} />
                </td>
                <td className="max-w-[280px] px-3 py-2.5 text-slate-600 dark:text-slate-300">
                  {v.feedback.comment || <span className="text-slate-400">No comment</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-500 dark:text-slate-400">
                  {formatRelativeTime(v.feedback.created_at)}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[13px] text-slate-400">
                  No reviews match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-[12px] text-slate-400">
        <span>
          Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1} to{' '}
          {Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)} of {filtered.length.toLocaleString()} reviews
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/5">
            <ChevronLeft size={15} />
          </button>
          <span className="px-2 text-slate-600 dark:text-slate-300">
            Page {safePage + 1} of {pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/5">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
