import { ClipboardList, LayoutGrid, Search, Truck, Users2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useReports } from '@/contexts/ReportsContext';
import { useTeams } from '@/contexts/TeamsContext';
import { useVehicles } from '@/contexts/VehiclesContext';
import { MAIN_NAV, SYSTEM_NAV } from '@/lib/nav';

type ResultGroup = 'Pages' | 'Complaints' | 'Teams' | 'Vehicles';

type SearchResult = {
  id: string;
  group: ResultGroup;
  title: string;
  subtitle: string;
  path: string;
};

const GROUP_ICON: Record<ResultGroup, LucideIcon> = {
  Pages: LayoutGrid,
  Complaints: ClipboardList,
  Teams: Users2,
  Vehicles: Truck,
};

const GROUP_ORDER: ResultGroup[] = ['Pages', 'Complaints', 'Teams', 'Vehicles'];

export function GlobalSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const navigate = useNavigate();
  const { reports } = useReports();
  const { teams } = useTeams();
  const { vehicles } = useVehicles();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
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

  const results = useMemo<SearchResult[]>(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];

    const pages: SearchResult[] = [...MAIN_NAV, ...SYSTEM_NAV]
      .filter((item) => item.label.toLowerCase().includes(q))
      .map((item) => ({ id: `page-${item.path}`, group: 'Pages', title: item.label, subtitle: 'Page', path: item.path }));

    const complaints: SearchResult[] = reports
      .filter((r) =>
        [r.report_code, r.category, r.address, r.severity_label, r.status].join(' ').toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((r) => ({
        id: `report-${r.id}`,
        group: 'Complaints',
        title: r.report_code,
        subtitle: `${r.category} · ${r.address}`,
        path: `/complaints?id=${r.id}`,
      }));

    const teamResults: SearchResult[] = teams
      .filter((t) => [t.team_code, t.team_name, t.leader_name, t.zone].join(' ').toLowerCase().includes(q))
      .slice(0, 5)
      .map((t) => ({
        id: `team-${t.id}`,
        group: 'Teams',
        title: t.team_name,
        subtitle: `${t.team_code} · ${t.zone}`,
        path: `/teams?id=${t.id}`,
      }));

    const vehicleResults: SearchResult[] = vehicles
      .filter((v) =>
        [v.vehicle_no, v.vehicle_type, v.model ?? '', v.driver_name ?? ''].join(' ').toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((v) => ({
        id: `vehicle-${v.id}`,
        group: 'Vehicles',
        title: v.vehicle_no,
        subtitle: v.driver_name ? `${v.vehicle_type} · ${v.driver_name}` : v.vehicle_type,
        path: `/vehicles?id=${v.id}`,
      }));

    return [...pages, ...complaints, ...teamResults, ...vehicleResults];
  }, [value, reports, teams, vehicles]);

  const grouped = useMemo(() => {
    return GROUP_ORDER.map((group) => ({ group, items: results.filter((r) => r.group === group) })).filter(
      (g) => g.items.length > 0
    );
  }, [results]);

  function goTo(result: SearchResult) {
    setOpen(false);
    onChange('');
    navigate(result.path);
  }

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-500 focus-within:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
        <Search size={15} />
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) goTo(results[0]);
          }}
          placeholder={placeholder ?? 'Search anything...'}
          className="w-40 bg-transparent text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 lg:w-56"
        />
      </label>

      {open && value.trim() && (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-[#161f1a]">
          {grouped.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-slate-400">No results for "{value}"</p>
          ) : (
            <div className="max-h-80 overflow-y-auto py-2">
              {grouped.map(({ group, items }) => {
                const Icon = GROUP_ICON[group];
                return (
                  <div key={group}>
                    <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {group}
                    </p>
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => goTo(item)}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5">
                        <Icon size={14} className="shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">
                            {item.title}
                          </span>
                          <span className="block truncate text-[12px] text-slate-400">{item.subtitle}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
