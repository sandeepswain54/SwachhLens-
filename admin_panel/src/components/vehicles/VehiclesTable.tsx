import { ChevronLeft, ChevronRight, Eye, RotateCcw, Search, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Select } from '@/components/common/Select';
import { VEHICLE_STATUS_BADGE } from '@/lib/badges';
import { fuelLevelColor } from '@/lib/vehicle-stats';
import {
  FUEL_TYPES,
  VEHICLE_LOCATIONS,
  VEHICLE_STATUS_LABEL,
  VEHICLE_TYPES,
  type VehicleRow,
  type VehicleStatus,
} from '@/lib/vehicles';
import type { TeamRow } from '@/lib/teams';

const PAGE_SIZE = 8;

export function VehiclesTable({
  vehicles,
  teams,
  selectedId,
  onSelect,
}: {
  vehicles: VehicleRow[];
  teams: TeamRow[];
  selectedId: string | null;
  onSelect: (vehicle: VehicleRow) => void;
}) {
  const [status, setStatus] = useState<VehicleStatus | 'all'>('all');
  const [vehicleType, setVehicleType] = useState<string>('all');
  const [location, setLocation] = useState<string>('all');
  const [fuelType, setFuelType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const teamByI = useMemo(() => new Map(teams.map((t) => [t.id, t] as [string, TeamRow])), [teams]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>(Object.keys(VEHICLE_LOCATIONS));
    vehicles.forEach((v) => v.location_label && set.add(v.location_label));
    return [...set].sort();
  }, [vehicles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (status !== 'all' && v.status !== status) return false;
      if (vehicleType !== 'all' && v.vehicle_type !== vehicleType) return false;
      if (location !== 'all' && v.location_label !== location) return false;
      if (fuelType !== 'all' && v.fuel_type !== fuelType) return false;
      if (q && !`${v.vehicle_no} ${v.driver_name ?? ''} ${v.model ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [vehicles, status, vehicleType, location, fuelType, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function changeFilter(fn: () => void) {
    fn();
    setPage(1);
  }

  function resetFilters() {
    setStatus('all');
    setVehicleType('all');
    setLocation('all');
    setFuelType('all');
    setSearch('');
    setPage(1);
  }

  const selectClass =
    'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-600 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3 dark:border-white/10">
        <Select
          value={status}
          onChange={(v) => changeFilter(() => setStatus(v as VehicleStatus | 'all'))}
          className={selectClass}
          options={[
            { value: 'all', label: 'All Status' },
            ...(Object.keys(VEHICLE_STATUS_LABEL) as VehicleStatus[]).map((s) => ({ value: s, label: VEHICLE_STATUS_LABEL[s] })),
          ]}
        />
        <Select
          value={vehicleType}
          onChange={(v) => changeFilter(() => setVehicleType(v))}
          className={selectClass}
          options={[{ value: 'all', label: 'All Types' }, ...VEHICLE_TYPES.map((t) => ({ value: t, label: t }))]}
        />
        <Select
          value={location}
          onChange={(v) => changeFilter(() => setLocation(v))}
          className={selectClass}
          options={[{ value: 'all', label: 'All Locations' }, ...locationOptions.map((l) => ({ value: l, label: l }))]}
        />
        <Select
          value={fuelType}
          onChange={(v) => changeFilter(() => setFuelType(v))}
          className={selectClass}
          options={[{ value: 'all', label: 'All Fuel Types' }, ...FUEL_TYPES.map((f) => ({ value: f, label: f }))]}
        />

        <label className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-500 focus-within:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => changeFilter(() => setSearch(e.target.value))}
            placeholder="Search by vehicle no., driver..."
            className="w-44 bg-transparent outline-none placeholder:text-slate-400 dark:text-slate-200"
          />
        </label>
        <button
          type="button"
          onClick={resetFilters}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-slate-400">No vehicles match your filters yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                <th className="w-[14%] px-3 py-2.5 font-medium">Vehicle No.</th>
                <th className="w-[11%] px-3 py-2.5 font-medium">Vehicle Type</th>
                <th className="w-[9%] px-3 py-2.5 font-medium">Capacity</th>
                <th className="w-[11%] px-3 py-2.5 font-medium">Driver</th>
                <th className="w-[10%] px-3 py-2.5 font-medium">Status</th>
                <th className="w-[14%] px-3 py-2.5 font-medium">Location</th>
                <th className="w-[14%] px-3 py-2.5 font-medium">Fuel Level</th>
                <th className="w-[9%] px-3 py-2.5 font-medium">Assigned To</th>
                <th className="w-[8%] px-3 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((v) => {
                const team = v.assigned_team_id ? teamByI.get(v.assigned_team_id) : undefined;
                return (
                  <tr
                    key={v.id}
                    onClick={() => onSelect(v)}
                    className={`cursor-pointer border-t border-slate-100 text-slate-700 transition-colors dark:border-white/5 dark:text-slate-200 ${
                      selectedId === v.id ? 'bg-brand-50/60 dark:bg-brand-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}>
                    <td className="px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        {v.image_url ? (
                          <img src={v.image_url} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/10">
                            <Truck size={13} />
                          </span>
                        )}
                        <span className="truncate font-semibold text-brand-600">{v.vehicle_no}</span>
                      </div>
                    </td>
                    <td className="truncate px-3 py-2.5">{v.vehicle_type}</td>
                    <td className="truncate px-3 py-2.5 text-slate-500 dark:text-slate-400">
                      {v.capacity_tons ? `${v.capacity_tons} Ton` : '—'}
                    </td>
                    <td className="truncate px-3 py-2.5 text-slate-500 dark:text-slate-400">{v.driver_name || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${VEHICLE_STATUS_BADGE[v.status]}`}>
                        {VEHICLE_STATUS_LABEL[v.status]}
                      </span>
                    </td>
                    <td className="truncate px-3 py-2.5 text-slate-500 dark:text-slate-400">{v.location_label || '—'}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${v.fuel_level}%`, backgroundColor: fuelLevelColor(v.fuel_level) }}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-right text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                          {v.fuel_level}%
                        </span>
                      </div>
                    </td>
                    <td className="truncate px-3 py-2.5 text-slate-500 dark:text-slate-400">{team?.team_code ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(v);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200">
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-[12px] text-slate-400">
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{' '}
            {filtered.length} vehicles
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/5">
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`h-7 w-7 rounded-lg text-[12px] font-semibold ${
                  p === currentPage ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'
                }`}>
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/5">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
