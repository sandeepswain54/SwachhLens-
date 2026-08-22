import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Hourglass,
  Maximize2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Card } from '@/components/dashboard/Card';
import { DonutChart, type DonutSlice } from '@/components/dashboard/DonutChart';
import { HotspotMap } from '@/components/dashboard/HotspotMap';
import { LatestComplaintsTable } from '@/components/dashboard/LatestComplaintsTable';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { RecentAlerts } from '@/components/dashboard/RecentAlerts';
import { StatCard } from '@/components/dashboard/StatCard';
import { TeamStatusPlaceholder } from '@/components/dashboard/TeamStatusPlaceholder';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { Topbar } from '@/components/layout/Topbar';
import { useReports } from '@/contexts/ReportsContext';
import { CATEGORY_COLOR, SEVERITY_COLOR } from '@/lib/palette';
import type { SeverityLabel } from '@/lib/reports';
import {
  computeAvgResolutionDays,
  computeCategoryBreakdown,
  computeRecentAlerts,
  computeSeverityBreakdown,
  computeStatusCounts,
  computeTrend,
  computeWeekOverWeek,
} from '@/lib/stats';

const SEVERITY_FILTERS: Array<{ label: string; value: SeverityLabel | 'all' }> = [
  { label: 'All Hotspots', value: 'all' },
  { label: 'Critical', value: 'Critical' },
  { label: 'High', value: 'High' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Low', value: 'Low' },
];

export default function Dashboard() {
  const { reports, loading, error, activity } = useReports();
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityLabel | 'all'>('all');
  const [mapExpanded, setMapExpanded] = useState(false);

  const statusCounts = useMemo(() => computeStatusCounts(reports), [reports]);
  const weekDelta = useMemo(() => computeWeekOverWeek(reports), [reports]);
  const trend = useMemo(() => computeTrend(reports, 7), [reports]);
  const avgResolutionDays = useMemo(() => computeAvgResolutionDays(reports), [reports]);
  const alerts = useMemo(() => computeRecentAlerts(reports, 5), [reports]);

  const categorySlices: DonutSlice[] = useMemo(
    () =>
      computeCategoryBreakdown(reports).map((c) => ({
        name: c.name,
        count: c.count,
        percent: c.percent,
        color: CATEGORY_COLOR[c.name] ?? CATEGORY_COLOR.Others,
      })),
    [reports]
  );

  const severitySlices: DonutSlice[] = useMemo(
    () =>
      computeSeverityBreakdown(reports).map((s) => ({
        name: s.label,
        count: s.count,
        percent: s.percent,
        color: SEVERITY_COLOR[s.label],
      })),
    [reports]
  );

  const mapReports = useMemo(
    () => (severityFilter === 'all' ? reports : reports.filter((r) => r.severity_label === severityFilter)),
    [reports, severityFilter]
  );

  const hotspotCounts = useMemo(() => {
    const result = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    mapReports.forEach((r) => {
      result[r.severity_label] += 1;
    });
    return result;
  }, [mapReports]);

  const filteredComplaints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? reports.filter((r) =>
          [r.report_code, r.category, r.address, r.severity_label]
            .join(' ')
            .toLowerCase()
            .includes(q)
        )
      : reports;
    return list.slice(0, 8);
  }, [reports, searchQuery]);

  return (
    <div className="flex min-h-full flex-col">
      <Topbar
        title="Dashboard"
        subtitle="Overview of city cleanliness operations"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex-1 space-y-5 p-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            Couldn't load reports: {error}. Make sure you're signed in with an account that can view
            all reports.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total Complaints"
            value={statusCounts.total}
            icon={ClipboardList}
            iconBg="#eaf6ef"
            iconColor="#1B6B3A"
            deltaPercent={weekDelta.total.deltaPercent}
          />
          <StatCard
            label="Active Complaints"
            value={statusCounts.active}
            icon={FileText}
            iconBg="#e8f0fe"
            iconColor="#2563eb"
            deltaPercent={weekDelta.active.deltaPercent}
          />
          <StatCard
            label="Resolved Complaints"
            value={statusCounts.resolved}
            icon={CheckCircle2}
            iconBg="#fef3e2"
            iconColor="#d97706"
            deltaPercent={weekDelta.resolved.deltaPercent}
          />
          <StatCard
            label="In Progress"
            value={statusCounts.inProgress}
            icon={Hourglass}
            iconBg="#f1ecfd"
            iconColor="#7c3aed"
            deltaCaption="currently active"
          />
          <StatCard
            label="Critical / High Priority"
            value={statusCounts.critical}
            icon={AlertTriangle}
            iconBg="#fde8e8"
            iconColor="#dc2626"
            deltaPercent={weekDelta.critical.deltaPercent}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card title="Complaints Trend" className="xl:col-span-5" action={<span className="text-[12px] text-slate-400">Weekly</span>}>
            <TrendChart data={trend} />
          </Card>

          <Card title="Complaints by Category" className="xl:col-span-4">
            <DonutChart data={categorySlices} centerValue={statusCounts.total} centerLabel="Total" />
          </Card>

          <Card
            title="Recent Alerts"
            className="xl:col-span-3"
            action={<span className="text-[12px] font-medium text-brand-600">View All</span>}>
            <RecentAlerts alerts={alerts} />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card
            title="Waste Hotspots Map"
            className="xl:col-span-5"
            action={
              <div className="flex items-center gap-2">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as SeverityLabel | 'all')}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-600 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  {SEVERITY_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setMapExpanded(true)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5">
                  <Maximize2 size={14} />
                </button>
              </div>
            }>
            <div className="h-[320px] overflow-hidden rounded-xl">
              <HotspotMap reports={mapReports} />
            </div>
            <div className="mt-3 flex items-center justify-center gap-5 text-[12px]">
              {(Object.keys(hotspotCounts) as SeverityLabel[]).map((label) => (
                <span key={label} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLOR[label] }} />
                  {label} <span className="font-semibold text-slate-700 dark:text-slate-200">{hotspotCounts[label]}</span>
                </span>
              ))}
            </div>
          </Card>

          <div className="flex flex-col gap-4 xl:col-span-4">
            <Card title="Complaints by Severity">
              <DonutChart data={severitySlices} centerValue={statusCounts.total} centerLabel="Total" />
            </Card>
            <Card title="Average Resolution Time">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {avgResolutionDays === null ? '—' : `${avgResolutionDays.toFixed(1)} Days`}
                  </p>
                  <p className="text-[12px] text-slate-400">
                    {avgResolutionDays === null ? 'No resolved complaints yet' : 'Across all resolved complaints'}
                  </p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10">
                  <Clock size={18} />
                </span>
              </div>
            </Card>
          </div>

          <Card title="Team Status" className="xl:col-span-3">
            <TeamStatusPlaceholder />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card
            title="Latest Complaints"
            className="xl:col-span-9"
            action={<span className="text-[12px] font-medium text-brand-600">View All</span>}>
            <LatestComplaintsTable reports={filteredComplaints} />
          </Card>

          <Card
            title="Recent Activity"
            className="xl:col-span-3"
            action={<span className="text-[12px] font-medium text-brand-600">View All</span>}>
            <RecentActivity activity={activity} />
          </Card>
        </div>

        {loading && (
          <p className="text-center text-[12px] text-slate-400">Loading reports…</p>
        )}
      </div>

      {mapExpanded && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#0b100d]">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-white/10">
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Waste Hotspots Map</h2>
            <button
              type="button"
              onClick={() => setMapExpanded(false)}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">
              Close
            </button>
          </div>
          <div className="flex-1">
            <HotspotMap reports={mapReports} />
          </div>
        </div>
      )}
    </div>
  );
}
