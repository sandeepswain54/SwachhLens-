import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Download,
  Flame,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Select } from '@/components/common/Select';
import { Card } from '@/components/dashboard/Card';
import { HotspotInsights } from '@/components/hotspots/HotspotInsights';
import { HotspotsMap } from '@/components/hotspots/HotspotsMap';
import { HotspotsOverviewTable } from '@/components/hotspots/HotspotsOverviewTable';
import { RecentHotspotAlerts, useHotspotAlerts } from '@/components/hotspots/RecentHotspotAlerts';
import { TopHotspotsList } from '@/components/hotspots/TopHotspotsList';
import { Topbar } from '@/components/layout/Topbar';
import { useReports } from '@/contexts/ReportsContext';
import { buildCategoryOptions, buildLocalityOptions, deriveLocality } from '@/lib/complaints';
import { exportHotspotsToExcel } from '@/lib/hotspot-export';
import {
  buildHotspotClusters,
  computeHotspotInsights,
  computeHotspotWeekOverWeek,
  type HotspotCluster,
  type HotspotIntensity,
} from '@/lib/hotspots';
import { STATUS_LABEL, type ReportRow, type ReportStatus } from '@/lib/reports';

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

function StatTile({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  deltaCount,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  deltaCount: number;
}) {
  const isUp = deltaCount > 0;
  const isFlat = deltaCount === 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-card dark:border-white/10 dark:bg-[#111814]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] text-slate-500 dark:text-slate-400">{label}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: iconBg }}>
          <Icon size={17} style={{ color: iconColor }} strokeWidth={2.2} />
        </span>
      </div>
      <p className="text-[26px] font-extrabold leading-none text-slate-900 dark:text-white">{value.toLocaleString()}</p>
      {isFlat ? (
        <p className="text-[12px] text-slate-400">No change from last week</p>
      ) : (
        <p
          className={`flex items-center gap-1 text-[12px] font-semibold ${
            isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
          }`}>
          {isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {Math.abs(deltaCount)} <span className="font-normal text-slate-400">from last week</span>
        </p>
      )}
    </div>
  );
}

export default function WasteHotspots() {
  const { reports, loading, error } = useReports();

  const [intensityFilter, setIntensityFilter] = useState<HotspotIntensity | 'all'>('all');
  const [wasteTypeFilter, setWasteTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>('all');
  const [localityFilter, setLocalityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [moreOpen, setMoreOpen] = useState(false);

  const [mapView, setMapView] = useState<'map' | 'heatmap'>('map');
  const [mapExpanded, setMapExpanded] = useState(false);
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<[number, number] | null>(null);

  const categoryOptions = useMemo(() => buildCategoryOptions(reports), [reports]);
  const localityOptions = useMemo(() => buildLocalityOptions(reports), [reports]);
  const dateRangeLabel = DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.label ?? 'All Time';

  // Page-level stat cards read off *all* reports, unaffected by the filter
  // row below — same convention as Dashboard's top stat row vs its table's
  // own search/filter state.
  const bandWeekDelta = useMemo(() => computeHotspotWeekOverWeek(reports), [reports]);

  // Unfiltered, all-time clusters — feeds only the alert feed, which needs a
  // stable frame of reference so toggling a page filter never masquerades as
  // a hotspot appearing/disappearing.
  const allClusters = useMemo(() => buildHotspotClusters(reports), [reports]);
  const alerts = useHotspotAlerts(allClusters);

  const filteredReports = useMemo(() => {
    let list = filterByDateRange(reports, dateRange);
    if (wasteTypeFilter !== 'all') list = list.filter((r) => r.category === wasteTypeFilter);
    if (localityFilter !== 'all') list = list.filter((r) => deriveLocality(r.address) === localityFilter);
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter);
    return list;
  }, [reports, dateRange, wasteTypeFilter, localityFilter, statusFilter]);

  const insights = useMemo(() => computeHotspotInsights(filteredReports), [filteredReports]);

  const baseClusters = useMemo(() => buildHotspotClusters(filteredReports), [filteredReports]);
  const filteredClusters = useMemo(
    () => (intensityFilter === 'all' ? baseClusters : baseClusters.filter((c) => c.intensity === intensityFilter)),
    [baseClusters, intensityFilter]
  );

  const topHotspots = filteredClusters.slice(0, 5);

  function resetFilters() {
    setIntensityFilter('all');
    setWasteTypeFilter('all');
    setDateRange('all');
    setLocalityFilter('all');
    setStatusFilter('all');
  }

  function selectCluster(cluster: HotspotCluster) {
    setSelectedCellKey(cluster.cellKey);
    setFocusTarget([cluster.lat, cluster.lng]);
  }

  function handleExport() {
    exportHotspotsToExcel({
      clusters: filteredClusters,
      insights,
      bandCounts: {
        Critical: bandWeekDelta.Critical.value,
        High: bandWeekDelta.High.value,
        Medium: bandWeekDelta.Medium.value,
        Low: bandWeekDelta.Low.value,
        total: bandWeekDelta.total.value,
      },
      dateRangeLabel,
    });
  }

  const mapEl = (
    <HotspotsMap
      clusters={filteredClusters}
      reports={filteredReports}
      view={mapView}
      onViewChange={setMapView}
      focusTarget={focusTarget}
      onSelectCluster={selectCluster}
      onExpandFullScreen={mapExpanded ? undefined : () => setMapExpanded(true)}
    />
  );

  return (
    <div className="flex min-h-full flex-col">
      <Topbar title="Waste Hotspots" breadcrumb={['Dashboard', 'Map & Hotspots', 'Waste Hotspots']} />

      <div className="flex-1 space-y-4 p-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            Couldn't load reports: {error}.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile
            label="Critical Hotspots"
            value={bandWeekDelta.Critical.value}
            icon={AlertTriangle}
            iconBg="#fde8e8"
            iconColor="#dc2626"
            deltaCount={bandWeekDelta.Critical.deltaCount}
          />
          <StatTile
            label="High Priority Hotspots"
            value={bandWeekDelta.High.value}
            icon={Flame}
            iconBg="#fef1e8"
            iconColor="#ea580c"
            deltaCount={bandWeekDelta.High.deltaCount}
          />
          <StatTile
            label="Medium Priority Hotspots"
            value={bandWeekDelta.Medium.value}
            icon={ShieldAlert}
            iconBg="#fef3e2"
            iconColor="#d97706"
            deltaCount={bandWeekDelta.Medium.deltaCount}
          />
          <StatTile
            label="Low Priority Hotspots"
            value={bandWeekDelta.Low.value}
            icon={CheckCircle2}
            iconBg="#eaf6ef"
            iconColor="#1B6B3A"
            deltaCount={bandWeekDelta.Low.deltaCount}
          />
          <StatTile
            label="Total Hotspots"
            value={bandWeekDelta.total.value}
            icon={Layers}
            iconBg="#f1ecfd"
            iconColor="#7c3aed"
            deltaCount={bandWeekDelta.total.deltaCount}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={intensityFilter}
            onChange={(v) => setIntensityFilter(v as HotspotIntensity | 'all')}
            className={selectClass}
            options={[
              { value: 'all', label: 'All Levels' },
              { value: 'Critical', label: 'Critical' },
              { value: 'High', label: 'High' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Low', label: 'Low' },
            ]}
          />

          <Select
            value={wasteTypeFilter}
            onChange={setWasteTypeFilter}
            className={selectClass}
            options={[{ value: 'all', label: 'All Types' }, ...categoryOptions.map((c) => ({ value: c, label: c }))]}
          />

          <Select
            value={dateRange}
            onChange={(v) => setDateRange(v as DateRangeValue)}
            className={selectClass}
            options={DATE_RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />

          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className={`${selectClass} flex items-center gap-1.5`}>
              More Filters <ChevronDown size={13} />
            </button>
            {moreOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 w-56 space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-[#1a231d]">
                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">Location</label>
                  <Select
                    value={localityFilter}
                    onChange={setLocalityFilter}
                    className={`${selectClass} w-full`}
                    options={[{ value: 'all', label: 'All Locations' }, ...localityOptions.map((l) => ({ value: l, label: l }))]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-400">Status</label>
                  <Select
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v as ReportStatus | 'all')}
                    className={`${selectClass} w-full`}
                    options={[
                      { value: 'all', label: 'All Status' },
                      ...(Object.keys(STATUS_LABEL) as ReportStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] })),
                    ]}
                  />
                </div>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
                  Reset All Filters
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-600">
            <Download size={15} /> Export Report
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card title="Hotspots Map" className="xl:col-span-8">
            <div className="h-[420px]">{mapEl}</div>
          </Card>

          <div className="flex flex-col gap-4 xl:col-span-4">
            <Card title="Hotspot Insights" action={<span className="text-[12px] font-medium text-brand-600">View Details</span>}>
              <HotspotInsights insights={insights} rangeLabel={dateRangeLabel} />
            </Card>
            <Card title="Top Hotspots" action={<span className="text-[12px] font-medium text-brand-600">View All</span>}>
              <TopHotspotsList clusters={topHotspots} selectedCellKey={selectedCellKey} onSelect={selectCluster} />
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card title="Hotspots Overview" className="xl:col-span-8">
            <HotspotsOverviewTable clusters={filteredClusters} selectedCellKey={selectedCellKey} onSelect={selectCluster} />
          </Card>

          <Card title="Recent Hotspot Alerts" className="xl:col-span-4">
            <RecentHotspotAlerts alerts={alerts} />
          </Card>
        </div>

        {loading && <p className="text-center text-[12px] text-slate-400">Loading reports…</p>}
      </div>

      {mapExpanded && (
        <div className="fixed inset-0 z-[1200] flex flex-col bg-white dark:bg-[#0b100d]">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-white/10">
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Hotspots Map</h2>
            <button
              type="button"
              onClick={() => setMapExpanded(false)}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">
              Close
            </button>
          </div>
          <div className="flex-1">
            <HotspotsMap
              clusters={filteredClusters}
              reports={filteredReports}
              view={mapView}
              onViewChange={setMapView}
              focusTarget={focusTarget}
              onSelectCluster={selectCluster}
            />
          </div>
        </div>
      )}
    </div>
  );
}
