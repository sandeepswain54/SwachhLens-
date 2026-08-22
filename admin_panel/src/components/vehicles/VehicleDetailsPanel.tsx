import {
  Calendar,
  CheckCircle2,
  Droplet,
  Gauge,
  MapPinned,
  Phone,
  ShieldCheck,
  Truck,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Card } from '@/components/dashboard/Card';
import { VEHICLE_STATUS_BADGE } from '@/lib/badges';
import type { TeamRow } from '@/lib/teams';
import {
  computeVehicleWeekComparison,
  fuelLevelColor,
} from '@/lib/vehicle-stats';
import {
  completeMaintenance,
  daysUntil,
  refuelVehicle,
  setVehicleStatus,
  vehicleLocationCenter,
  VEHICLE_STATUS_LABEL,
  type VehicleActivityRow,
  type VehicleMaintenanceRow,
  type VehicleRow,
} from '@/lib/vehicles';

import { ScheduleMaintenanceModal } from './ScheduleMaintenanceModal';
import { VehicleMiniMap } from './VehicleMiniMap';

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 text-[13px]">
      <Icon size={14} className="shrink-0 text-slate-400" />
      <span className="min-w-0 flex-1 truncate text-slate-400">{label}</span>
      <span className="max-w-[55%] shrink-0 truncate text-right font-medium text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

const KIND_HEADING: Record<VehicleMaintenanceRow['kind'], string> = {
  service: 'Next Service',
  inspection: 'Next Inspection',
  replacement: 'Next Replacement',
};

const KIND_ICON_TONE: Record<VehicleMaintenanceRow['kind'], string> = {
  service: 'bg-red-50 text-red-500 dark:bg-red-500/10',
  inspection: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10',
  replacement: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10',
};

function OverviewTile({
  label,
  value,
  deltaPercent,
}: {
  label: string;
  value: string;
  deltaPercent: number | null;
}) {
  const hasDelta = deltaPercent !== null;
  const isUp = hasDelta && deltaPercent >= 0;
  return (
    <div className="rounded-xl border border-slate-100 p-3 dark:border-white/10">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 text-[16px] font-bold text-slate-900 dark:text-white">{value}</p>
      {hasDelta ? (
        <p className={`mt-0.5 text-[11px] font-semibold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
          {isUp ? '↑' : '↓'} {Math.abs(deltaPercent).toFixed(1)}%
        </p>
      ) : (
        <p className="mt-0.5 text-[11px] text-slate-300">No trips last week</p>
      )}
    </div>
  );
}

export function VehicleDetailsPanel({
  vehicle,
  teams,
  activity,
  maintenance,
  onClose,
}: {
  vehicle: VehicleRow;
  teams: TeamRow[];
  activity: VehicleActivityRow[];
  maintenance: VehicleMaintenanceRow[];
  onClose: () => void;
}) {
  const [scheduling, setScheduling] = useState(false);
  const [showAllMaintenance, setShowAllMaintenance] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const team = vehicle.assigned_team_id ? teams.find((t) => t.id === vehicle.assigned_team_id) : undefined;
  const center = vehicleLocationCenter(vehicle);
  const week = useMemo(() => computeVehicleWeekComparison(vehicle.id, activity), [vehicle.id, activity]);

  const tasks = useMemo(
    () =>
      maintenance
        .filter((m) => m.vehicle_id === vehicle.id && !m.completed)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    [maintenance, vehicle.id]
  );
  const visibleTasks = showAllMaintenance ? tasks : tasks.slice(0, 3);

  async function handleRefuel() {
    const input = window.prompt('How many liters were added?', '20');
    if (!input) return;
    const liters = Number(input);
    if (!liters || liters <= 0) return;
    setBusy(true);
    setError(null);
    try {
      await refuelVehicle(vehicle, Math.round(liters));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleMaintenance() {
    setBusy(true);
    setError(null);
    try {
      await setVehicleStatus(vehicle, vehicle.status === 'maintenance' ? 'idle' : 'maintenance');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCompleteTask(task: VehicleMaintenanceRow) {
    setBusy(true);
    setError(null);
    try {
      await completeMaintenance(task, vehicle);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-3 flex items-start justify-between">
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Vehicle Details</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        <div className="relative mb-3 h-32 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5">
          {vehicle.image_url ? (
            <img src={vehicle.image_url} alt={vehicle.vehicle_no} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
              <Truck size={32} />
            </div>
          )}
          <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${VEHICLE_STATUS_BADGE[vehicle.status]}`}>
            {VEHICLE_STATUS_LABEL[vehicle.status]}
          </span>
        </div>

        <p className="text-[15px] font-bold text-slate-900 dark:text-white">{vehicle.vehicle_no}</p>
        <p className="text-[12px] text-slate-400">
          {vehicle.vehicle_type}
          {team ? ` · Assigned to ${team.team_code}` : ''}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-x-4 divide-y divide-slate-100 dark:divide-white/5">
          <InfoRow icon={User} label="Driver" value={vehicle.driver_name || '—'} />
          <InfoRow icon={Truck} label="Model" value={vehicle.model || '—'} />
          <InfoRow icon={Phone} label="Contact" value={vehicle.driver_contact || '—'} />
          <InfoRow icon={Calendar} label="Registered" value={formatDate(vehicle.registration_date)} />
          <InfoRow icon={Gauge} label="Capacity" value={vehicle.capacity_tons ? `${vehicle.capacity_tons} Ton` : '—'} />
          <InfoRow icon={ShieldCheck} label="Insurance Till" value={formatDate(vehicle.insurance_valid_till)} />
          <InfoRow icon={Droplet} label="Fuel Type" value={vehicle.fuel_type} />
          <InfoRow icon={ShieldCheck} label="Fitness Till" value={formatDate(vehicle.fitness_valid_till)} />
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[12px]">
            <span className="text-slate-400">Fuel Level</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{vehicle.fuel_level}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div
              className="h-full rounded-full"
              style={{ width: `${vehicle.fuel_level}%`, backgroundColor: fuelLevelColor(vehicle.fuel_level) }}
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>
        )}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void handleRefuel()}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
            <Droplet size={13} /> Refuel
          </button>
          <button
            type="button"
            onClick={() => void handleToggleMaintenance()}
            disabled={busy}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-semibold disabled:opacity-50 ${
              vehicle.status === 'maintenance'
                ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/10'
                : 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/10'
            }`}>
            <Wrench size={13} /> {vehicle.status === 'maintenance' ? 'Mark Idle' : 'Send to Maintenance'}
          </button>
        </div>
      </Card>

      <Card title="Live Location" action={
        <a
          href={`https://www.google.com/maps?q=${center[0]},${center[1]}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:underline">
          <MapPinned size={12} /> View Full Map
        </a>
      }>
        <div className="h-[180px] overflow-hidden rounded-xl">
          <VehicleMiniMap center={center} color={fuelLevelColor(vehicle.fuel_level)} />
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          {vehicle.location_label || 'Location unknown'} · updates live as jobs are assigned and completed.
        </p>
      </Card>

      <Card title="This Week Overview">
        <div className="grid grid-cols-2 gap-2.5">
          <OverviewTile label="Distance" value={`${week.distanceKm.value} km`} deltaPercent={week.distanceKm.deltaPercent} />
          <OverviewTile label="Fuel Used" value={`${week.fuelUsedL.value} L`} deltaPercent={week.fuelUsedL.deltaPercent} />
          <OverviewTile label="Trips" value={`${week.trips.value}`} deltaPercent={week.trips.deltaPercent} />
          <OverviewTile
            label="Avg Efficiency"
            value={week.avgEfficiency.value > 0 ? `${week.avgEfficiency.value} km/l` : '—'}
            deltaPercent={week.avgEfficiency.deltaPercent}
          />
        </div>
      </Card>

      <Card
        title="Maintenance Schedule"
        action={
          tasks.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllMaintenance((v) => !v)}
              className="text-[11px] font-medium text-brand-600 hover:underline">
              {showAllMaintenance ? 'Show Less' : 'View All'}
            </button>
          )
        }>
        {visibleTasks.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-slate-400">No maintenance scheduled.</p>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
            {visibleTasks.map((task) => {
              const days = daysUntil(task.due_date);
              return (
                <div key={task.id} className="flex items-center gap-3 py-2.5">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${KIND_ICON_TONE[task.kind]}`}>
                    <Wrench size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">{KIND_HEADING[task.kind]}</p>
                    <p className="truncate text-[12px] text-slate-400">
                      {task.task} · {days < 0 ? `Overdue by ${Math.abs(days)}d` : days === 0 ? 'Due today' : `Due in ${days} days`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] text-slate-400">{formatDate(task.due_date)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCompleteTask(task)}
                    disabled={busy}
                    title="Mark done"
                    className="shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50 dark:hover:bg-emerald-500/10">
                    <CheckCircle2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setScheduling(true)}
          className="mt-3 w-full rounded-xl bg-brand-500 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-600">
          Schedule Maintenance
        </button>
      </Card>

      {scheduling && <ScheduleMaintenanceModal vehicle={vehicle} onClose={() => setScheduling(false)} />}
    </div>
  );
}
