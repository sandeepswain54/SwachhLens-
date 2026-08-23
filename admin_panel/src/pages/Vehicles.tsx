import { ClipboardCheck, Fuel, Plus, Route, Truck, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Card } from '@/components/dashboard/Card';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { Topbar } from '@/components/layout/Topbar';
import { AddVehicleModal } from '@/components/vehicles/AddVehicleModal';
import { FuelStatusBars } from '@/components/vehicles/FuelStatusBars';
import { RecentVehicleActivity } from '@/components/vehicles/RecentVehicleActivity';
import { VehicleDetailsPanel } from '@/components/vehicles/VehicleDetailsPanel';
import { VehiclesTable } from '@/components/vehicles/VehiclesTable';
import { StatCard } from '@/components/dashboard/StatCard';
import { useTeams } from '@/contexts/TeamsContext';
import { useVehicles } from '@/contexts/VehiclesContext';
import {
  computeFuelBuckets,
  computeStatusDistribution,
  computeTypeDistribution,
  computeVehicleStatCounts,
  computeVehicleWeekOverWeek,
  VEHICLE_STATUS_COLOR,
} from '@/lib/vehicle-stats';

export default function Vehicles() {
  const { vehicles, activity, maintenance, loading, error } = useVehicles();
  const { teams } = useTeams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link support: the global search (and any other link) can jump
  // straight to a vehicle via /vehicles?id=<vehicle_id>.
  useEffect(() => {
    const linkedId = searchParams.get('id');
    if (!linkedId || loading) return;
    if (vehicles.some((v) => v.id === linkedId)) setSelectedId(linkedId);
    setSearchParams(
      (params) => {
        params.delete('id');
        return params;
      },
      { replace: true }
    );
  }, [searchParams, vehicles, loading, setSearchParams]);

  const counts = useMemo(() => computeVehicleStatCounts(vehicles), [vehicles]);
  const weekDelta = useMemo(() => computeVehicleWeekOverWeek(vehicles, activity), [vehicles, activity]);
  const statusSlices = useMemo(() => computeStatusDistribution(vehicles), [vehicles]);
  const typeSlices = useMemo(() => computeTypeDistribution(vehicles), [vehicles]);
  const fuelBuckets = useMemo(() => computeFuelBuckets(vehicles), [vehicles]);

  const selectedVehicle = useMemo(() => vehicles.find((v) => v.id === selectedId) ?? null, [vehicles, selectedId]);

  return (
    <div className="flex min-h-full flex-col">
      <Topbar
        title="Vehicles"
        breadcrumb={['Dashboard', 'Vehicles', 'All Vehicles']}
        action={
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-600">
            <Plus size={15} /> Add Vehicle
          </button>
        }
      />

      <div className="flex-1 space-y-4 p-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            Couldn't load vehicles: {error}. Have you run admin_panel/supabase/004_vehicles.sql yet?
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total Vehicles"
            value={counts.total}
            icon={Truck}
            iconBg="#eaf6ef"
            iconColor="#1B6B3A"
            deltaPercent={weekDelta.total.deltaPercent}
            deltaCaption={weekDelta.total.deltaPercent === null ? 'All Vehicles' : 'from last week'}
          />
          <StatCard
            label="On Duty"
            value={counts.onDuty}
            icon={Route}
            iconBg="#e8f0fe"
            iconColor="#2563eb"
            deltaPercent={weekDelta.onDuty.deltaPercent}
            deltaCaption={weekDelta.onDuty.deltaPercent === null ? 'Active Vehicles' : 'from last week'}
          />
          <StatCard
            label="Assigned"
            value={counts.assigned}
            icon={ClipboardCheck}
            iconBg="#f1ecfd"
            iconColor="#7c3aed"
            deltaPercent={weekDelta.assigned.deltaPercent}
            deltaCaption={weekDelta.assigned.deltaPercent === null ? 'Currently Assigned' : 'from last week'}
          />
          <StatCard
            label="Maintenance"
            value={counts.maintenance}
            icon={Wrench}
            iconBg="#fef3e2"
            iconColor="#d97706"
            deltaPercent={weekDelta.maintenance.deltaPercent}
            deltaCaption={weekDelta.maintenance.deltaPercent === null ? 'Under Maintenance' : 'from last week'}
          />
          <StatCard
            label="Fuel Efficiency (Avg.)"
            value={Number(weekDelta.avgEfficiency.value.toFixed(1))}
            icon={Fuel}
            iconBg="#e3f3ea"
            iconColor="#1baf7a"
            deltaPercent={weekDelta.avgEfficiency.deltaPercent}
            deltaCaption={weekDelta.avgEfficiency.deltaPercent === null ? 'km/l this week' : 'from last week'}
          />
        </div>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
          <Card className="xl:col-span-8">
            <VehiclesTable vehicles={vehicles} teams={teams} selectedId={selectedId} onSelect={(v) => setSelectedId(v.id)} />
          </Card>

          <div className="xl:col-span-4">
            {selectedVehicle ? (
              <VehicleDetailsPanel
                vehicle={selectedVehicle}
                teams={teams}
                activity={activity}
                maintenance={maintenance}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <Card>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/5">
                    <Truck size={19} />
                  </span>
                  <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">No vehicle selected</p>
                  <p className="max-w-[220px] text-[12px] text-slate-400">
                    Click a vehicle in the list (or the eye icon) to see its details, live location, and maintenance
                    schedule here.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Vehicle Status Overview">
            <DonutChart
              data={statusSlices.map((s) => ({ name: s.name, count: s.count, percent: s.percent, color: VEHICLE_STATUS_COLOR[s.status] }))}
              centerValue={counts.total}
              centerLabel="Total"
            />
          </Card>
          <Card title="Fuel Status">
            <FuelStatusBars buckets={fuelBuckets} />
          </Card>
          <Card title="Vehicle Type Distribution">
            <DonutChart data={typeSlices} centerValue={counts.total} centerLabel="Total" />
          </Card>
        </div>

        <Card title="Recent Vehicle Activity">
          <RecentVehicleActivity activity={activity} vehicles={vehicles} />
        </Card>

        {loading && <p className="text-center text-[12px] text-slate-400">Loading vehicles…</p>}
      </div>

      {adding && <AddVehicleModal onClose={() => setAdding(false)} />}
    </div>
  );
}
