import { CheckCircle2, ClipboardList, Clock3, Recycle } from 'lucide-react';
import { useMemo, useState } from 'react';

import { AIStatCard } from '@/components/ai-analytics/AIStatCard';
import { Card } from '@/components/dashboard/Card';
import { Topbar } from '@/components/layout/Topbar';
import { AIAssistantChat } from '@/components/reports-insights/AIAssistantChat';
import { RecentInsightsList } from '@/components/reports-insights/RecentInsightsList';
import { useReports } from '@/contexts/ReportsContext';
import { useTeams } from '@/contexts/TeamsContext';
import { useVehicles } from '@/contexts/VehiclesContext';
import { buildLocalityOptions, deriveLocality } from '@/lib/complaints';
import { computeOperationsInsights, computeWasteCollectedWeekOverWeek } from '@/lib/ops-insights';
import { computeWeekOverWeek } from '@/lib/stats';

const DATE_RANGE_OPTIONS = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'quarter', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
] as const;
type DateRangeValue = (typeof DATE_RANGE_OPTIONS)[number]['value'];

const selectClass =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-600 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300';

export default function ReportsInsights() {
  const { reports, loading: reportsLoading, error: reportsError } = useReports();
  const { teams, assignments } = useTeams();
  const { vehicles } = useVehicles();

  const [dateRange, setDateRange] = useState<DateRangeValue>('week');
  const [locationFilter, setLocationFilter] = useState('all');

  const dateRangeLabel = DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.label ?? 'This Week';
  const locationLabel = locationFilter === 'all' ? 'All Locations' : locationFilter;
  const localityOptions = useMemo(() => buildLocalityOptions(reports), [reports]);

  // The AI Assistant and Recent Insights answer within whatever locality is
  // selected; the Quick Stats column keeps its own fixed "vs last week"
  // window regardless — same convention as AI Analytics/Dashboard's top
  // stat rows, so those five numbers don't jitter as the picker changes.
  const scopedReports = useMemo(
    () => (locationFilter === 'all' ? reports : reports.filter((r) => deriveLocality(r.address) === locationFilter)),
    [reports, locationFilter]
  );

  const weekDelta = useMemo(() => computeWeekOverWeek(reports), [reports]);
  const wasteCollected = useMemo(() => computeWasteCollectedWeekOverWeek(reports), [reports]);
  const insights = useMemo(
    () => computeOperationsInsights(scopedReports, teams, assignments),
    [scopedReports, teams, assignments]
  );

  return (
    <div className="flex min-h-full flex-col">
      <Topbar
        title="Reports & Insights"
        breadcrumb={['Dashboard', 'Reports & Insights', 'AI Assistant']}
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
          </div>
        }
      />

      <div className="flex-1 space-y-4 p-6">
        {reportsError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            Couldn't load reports: {reportsError}.
          </div>
        )}

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
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card className="xl:col-span-8">
            <AIAssistantChat
              reports={reports}
              teams={teams}
              assignments={assignments}
              vehicles={vehicles}
              dateRangeLabel={dateRangeLabel}
              locationLabel={locationLabel}
            />
          </Card>

          <div className="flex flex-col gap-4 xl:col-span-4">
            <Card title="Quick Stats">
              <div className="grid grid-cols-2 gap-3">
                <AIStatCard
                  label="Total Complaints"
                  value={weekDelta.total.value.toLocaleString()}
                  icon={ClipboardList}
                  iconBg="#e8f0fe"
                  iconColor="#2563eb"
                  deltaPercent={weekDelta.total.deltaPercent}
                />
                <AIStatCard
                  label="Resolved Complaints"
                  value={weekDelta.resolved.value.toLocaleString()}
                  icon={CheckCircle2}
                  iconBg="#fef3e2"
                  iconColor="#d97706"
                  deltaPercent={weekDelta.resolved.deltaPercent}
                />
                <AIStatCard
                  label="Pending Complaints"
                  value={weekDelta.active.value.toLocaleString()}
                  icon={Clock3}
                  iconBg="#f1ecfd"
                  iconColor="#7c3aed"
                  deltaPercent={weekDelta.active.deltaPercent}
                />
                <AIStatCard
                  label="Waste Collected"
                  value={`${wasteCollected.value.toLocaleString()} Tonnes`}
                  icon={Recycle}
                  iconBg="#eaf6ef"
                  iconColor="#1B6B3A"
                  deltaPercent={wasteCollected.deltaPercent}
                />
              </div>
            </Card>

            <Card title="Recent Insights" className="flex-1">
              <RecentInsightsList insights={insights} />
            </Card>
          </div>
        </div>

        {reportsLoading && <p className="text-center text-[12px] text-slate-400">Loading reports…</p>}
      </div>
    </div>
  );
}
