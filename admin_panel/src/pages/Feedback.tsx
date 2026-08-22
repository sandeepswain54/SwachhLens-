import { MessageSquareWarning, Star, ThumbsUp, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import { AIStatCard } from '@/components/ai-analytics/AIStatCard';
import { Card } from '@/components/dashboard/Card';
import { FeedbackTable } from '@/components/feedback/FeedbackTable';
import { Topbar } from '@/components/layout/Topbar';
import { useFeedback } from '@/contexts/FeedbackContext';
import { useReports } from '@/contexts/ReportsContext';
import { useTeams } from '@/contexts/TeamsContext';
import { buildFeedbackViews, computeFeedbackStats, computeRatingDistribution } from '@/lib/feedback-stats';

export default function Feedback() {
  const { feedback, loading, error } = useFeedback();
  const { reports } = useReports();
  const { teams } = useTeams();
  const [searchQuery, setSearchQuery] = useState('');

  const views = useMemo(() => buildFeedbackViews(feedback, reports, teams), [feedback, reports, teams]);
  const stats = useMemo(() => computeFeedbackStats(feedback), [feedback]);
  const distribution = useMemo(() => computeRatingDistribution(feedback), [feedback]);
  const maxBucket = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <div className="flex min-h-full flex-col">
      <Topbar
        title="Feedback"
        breadcrumb={['Dashboard', 'Feedback', 'Citizen Reviews']}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search reviews..."
      />

      <div className="flex-1 space-y-4 p-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            Couldn't load feedback: {error}.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AIStatCard
            label="Average Rating"
            value={stats.avgRating === null ? '—' : `${stats.avgRating.toFixed(1)} / 5`}
            icon={Star}
            iconBg="#fef3e2"
            iconColor="#d97706"
            deltaCaption="across all reviews"
          />
          <AIStatCard
            label="Total Reviews"
            value={stats.total.toLocaleString()}
            icon={ThumbsUp}
            iconBg="#eaf6ef"
            iconColor="#1B6B3A"
            deltaCaption="all time"
          />
          <AIStatCard
            label="This Week"
            value={stats.thisWeekCount.toLocaleString()}
            icon={TrendingUp}
            iconBg="#e8f0fe"
            iconColor="#2563eb"
            deltaCaption="new reviews"
          />
          <AIStatCard
            label="Needs Attention (1-2★)"
            value={stats.lowRatingCount.toLocaleString()}
            icon={MessageSquareWarning}
            iconBg="#fde8e8"
            iconColor="#dc2626"
            deltaCaption="low ratings"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card title="All Reviews" className="xl:col-span-8">
            <FeedbackTable views={views} search={searchQuery} />
          </Card>

          <Card title="Rating Distribution" className="xl:col-span-4">
            <div className="space-y-3">
              {distribution.map((bucket) => (
                <div key={bucket.rating} className="flex items-center gap-3">
                  <span className="w-8 shrink-0 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                    {bucket.rating}★
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${(bucket.count / maxBucket) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-[12px] text-slate-400">{bucket.count}</span>
                </div>
              ))}
              {stats.total === 0 && (
                <p className="text-center text-[12.5px] text-slate-400">No reviews yet.</p>
              )}
            </div>
          </Card>
        </div>

        {loading && <p className="text-center text-[12px] text-slate-400">Loading feedback…</p>}
      </div>
    </div>
  );
}
