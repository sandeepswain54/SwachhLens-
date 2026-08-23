import { Box, Copy, ShieldAlert, Sparkles, Target } from 'lucide-react';
import { useMemo, useState } from 'react';

import { AIInsightsPanel } from '@/components/ai-analytics/AIInsightsPanel';
import { AIStatCard } from '@/components/ai-analytics/AIStatCard';
import { ConfidenceTrendChart } from '@/components/ai-analytics/ConfidenceTrendChart';
import { DuplicateClustersCard } from '@/components/ai-analytics/DuplicateClustersCard';
import { GenerateReportButton } from '@/components/ai-analytics/GenerateReportButton';
import { RecentAIResultsTable } from '@/components/ai-analytics/RecentAIResultsTable';
import { VolumeBarChart } from '@/components/ai-analytics/VolumeBarChart';
import { Card } from '@/components/dashboard/Card';
import { DonutChart, type DonutSlice } from '@/components/dashboard/DonutChart';
import { Topbar } from '@/components/layout/Topbar';
import { useReports } from '@/contexts/ReportsContext';
import {
  computeAIInsights,
  computeAIOverviewStats,
  computeConfidenceTrend,
  computeDuplicateClusters,
  computeDuplicateOverview,
  computePriorityScoreDistribution,
  computeVolumeBySizeBucket,
} from '@/lib/ai-stats';
import type { AIReportInput } from '@/lib/ai-report';
import { buildLocalityOptions, deriveLocality } from '@/lib/complaints';
import { CATEGORY_COLOR, SEVERITY_COLOR } from '@/lib/palette';
import type { ReportRow } from '@/lib/reports';
import { computeCategoryBreakdown, computeSeverityBreakdown } from '@/lib/stats';

const DATE_RANGE_OPTIONS = [
  { value: 'week', label: 'This Week', days: 7 },
  { value: 'month', label: 'Last 30 Days', days: 30 },
  { value: 'quarter', label: 'Last 90 Days', days: 90 },
  { value: 'all', label: 'All Time', days: null },
] as const;
type DateRangeValue = (typeof DATE_RANGE_OPTIONS)[number]['value'];

function filterByDateRange(reports: ReportRow[], range: DateRangeValue): ReportRow[] {
  const option = DATE_RANGE_OPTIONS.find((o) => o.value === range);
  if (!option || option.days === null) return reports;
  const cutoff = Date.now() - option.days * 24 * 60 * 60 * 1000;
  return reports.filter((r) => new Date(r.created_at).getTime() >= cutoff);
}

const selectClass =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-600 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300';

export default function AIAnalytics() {
  const { reports, loading, error } = useReports();

  const [dateRange, setDateRange] = useState<DateRangeValue>('week');
  const [locationFilter, setLocationFilter] = useState('all');

  const localityOptions = useMemo(() => buildLocalityOptions(reports), [reports]);
  const dateRangeLabel = DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.label ?? 'This Week';
  const locationLabel = locationFilter === 'all' ? 'All Locations' : locationFilter;

  // Stat cards read off *all* reports with their own week-over-week window —
  // same convention as Dashboard/Waste Hotspots' top rows — while everything
  // below responds to the date range + location filters.
  const overview = useMemo(() => computeAIOverviewStats(reports), [reports]);

  const filteredReports = useMemo(() => {
    let list = filterByDateRange(reports, dateRange);
    if (locationFilter !== 'all') list = list.filter((r) => deriveLocality(r.address) === locationFilter);
    return list;
  }, [reports, dateRange, locationFilter]);

  const categoryBreakdown = useMemo(() => computeCategoryBreakdown(filteredReports), [filteredReports]);
  const categorySlices: DonutSlice[] = useMemo(
    () =>
      categoryBreakdown.map((c) => ({
        name: c.name,
        count: c.count,
        percent: c.percent,
        color: CATEGORY_COLOR[c.name] ?? CATEGORY_COLOR.Others,
      })),
    [categoryBreakdown]
  );

  const severityBreakdown = useMemo(() => computeSeverityBreakdown(filteredReports), [filteredReports]);
  const severitySlices: DonutSlice[] = useMemo(
    () =>
      severityBreakdown.map((s) => ({
        name: s.label,
        count: s.count,
        percent: s.percent,
        color: SEVERITY_COLOR[s.label],
      })),
    [severityBreakdown]
  );

  const volumeBuckets = useMemo(() => computeVolumeBySizeBucket(filteredReports), [filteredReports]);
  const priorityDistribution = useMemo(() => computePriorityScoreDistribution(filteredReports), [filteredReports]);
  const prioritySlices: DonutSlice[] = priorityDistribution;

  const duplicateOverview = useMemo(() => computeDuplicateOverview(filteredReports), [filteredReports]);
  const duplicateClusters = useMemo(() => computeDuplicateClusters(filteredReports, 4), [filteredReports]);

  const confidenceTrend = useMemo(() => computeConfidenceTrend(filteredReports, 7), [filteredReports]);
  const insights = useMemo(() => computeAIInsights(filteredReports), [filteredReports]);

  const totalAnalyzed = filteredReports.filter((r) => r.analysis !== null).length;

  function buildReportInput(): AIReportInput {
    return {
      dateRangeLabel,
      locationLabel,
      totalReports: filteredReports.length,
      overview: computeAIOverviewStats(filteredReports),
      categoryBreakdown,
      severityBreakdown,
      volumeBuckets,
      priorityDistribution,
      duplicateOverview,
      duplicateClusters,
      insights,
    };
  }

  return (
    <div className="flex min-h-full flex-col">
      <Topbar
        title="AI Analytics"
        breadcrumb={['Dashboard', 'AI Analytics', 'Overview']}
        showSearch={false}
        action={
          <div className="hidden items-center gap-2 lg:flex">
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRangeValue)} className={selectClass}>
              {DATE_RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className={selectClass}>
              <option value="all">All Locations</option>
              {localityOptions.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <GenerateReportButton buildInput={buildReportInput} />
          </div>
        }
      />

      <div className="flex-1 space-y-5 p-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            Couldn't load reports: {error}.
          </div>
        )}

        {/* Filter row shown when the header action slot is collapsed on smaller screens. */}
        <div className="flex flex-wrap items-center gap-2 lg:hidden">
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRangeValue)} className={selectClass}>
            {DATE_RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className={selectClass}>
            <option value="all">All Locations</option>
            {localityOptions.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <GenerateReportButton buildInput={buildReportInput} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <AIStatCard
            label="AI Predictions"
            value={overview.totalPredictions.value.toLocaleString()}
            icon={Sparkles}
            iconBg="#f1ecfd"
            iconColor="#7c3aed"
            deltaPercent={overview.totalPredictions.deltaPercent}
          />
          <AIStatCard
            label="Classification Accuracy"
            value={`${overview.classificationAccuracy.value.toFixed(1)}%`}
            icon={Target}
            iconBg="#e8f0fe"
            iconColor="#2563eb"
            deltaPercent={overview.classificationAccuracy.deltaPercent}
          />
          <AIStatCard
            label="Volume Estimation Accuracy"
            value={`${overview.volumeAccuracy.value.toFixed(1)}%`}
            icon={Box}
            iconBg="#eaf6ef"
            iconColor="#1B6B3A"
            deltaPercent={overview.volumeAccuracy.deltaPercent}
          />
          <AIStatCard
            label="Duplicate Detection Rate"
            value={`${overview.duplicateDetectionRate.value.toFixed(1)}%`}
            icon={Copy}
            iconBg="#fef3e2"
            iconColor="#d97706"
            deltaPercent={overview.duplicateDetectionRate.deltaPercent}
          />
          <AIStatCard
            label="Needs Review (<70% Confidence)"
            value={overview.needsReview.value.toLocaleString()}
            icon={ShieldAlert}
            iconBg="#fde8e8"
            iconColor="#dc2626"
            deltaPercent={overview.needsReview.deltaPercent}
            deltaCaption="from last week"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card title="Waste Classification" className="xl:col-span-4" action={<span className="text-[12px] text-slate-400">{dateRangeLabel}</span>}>
            <DonutChart data={categorySlices} centerValue={filteredReports.length} centerLabel="Total" />
          </Card>

          <Card title="Volume Estimation (in Tons)" className="xl:col-span-4" action={<span className="text-[12px] text-slate-400">{dateRangeLabel}</span>}>
            <VolumeBarChart data={volumeBuckets} />
          </Card>

          <Card title="Severity Analysis" className="xl:col-span-4" action={<span className="text-[12px] text-slate-400">{dateRangeLabel}</span>}>
            <DonutChart data={severitySlices} centerValue={filteredReports.length} centerLabel="Total" />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card title="Duplicate Detection" className="xl:col-span-4">
            <DuplicateClustersCard overview={duplicateOverview} clusters={duplicateClusters} />
          </Card>

          <Card title="AI Priority Score Distribution" className="xl:col-span-4">
            <DonutChart data={prioritySlices} centerValue={filteredReports.length} centerLabel="Total" />
          </Card>

          <Card
            title="AI Confidence Trend"
            className="xl:col-span-4"
            action={<span className="text-[12px] text-slate-400">Last 7 days</span>}>
            <ConfidenceTrendChart data={confidenceTrend} />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card
            title="Recent AI Analysis Results"
            className="xl:col-span-8"
            action={<span className="text-[12px] text-slate-400">{totalAnalyzed.toLocaleString()} analyzed</span>}>
            <RecentAIResultsTable reports={filteredReports} />
          </Card>

          <Card title="AI Insights & Recommendations" className="xl:col-span-4">
            <AIInsightsPanel insights={insights} />
          </Card>
        </div>

        {loading && <p className="text-center text-[12px] text-slate-400">Loading reports…</p>}
      </div>
    </div>
  );
}
