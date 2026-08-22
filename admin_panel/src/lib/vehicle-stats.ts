import type { VehicleActivityRow, VehicleRow, VehicleStatus } from './vehicles';

function delta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? null : 100;
  return ((curr - prev) / prev) * 100;
}

export type VehicleStatCounts = {
  total: number;
  onDuty: number;
  assigned: number;
  maintenance: number;
  idle: number;
};

export function computeVehicleStatCounts(vehicles: VehicleRow[]): VehicleStatCounts {
  return {
    total: vehicles.length,
    onDuty: vehicles.filter((v) => v.status === 'on_duty').length,
    assigned: vehicles.filter((v) => v.status === 'assigned').length,
    maintenance: vehicles.filter((v) => v.status === 'maintenance').length,
    idle: vehicles.filter((v) => v.status === 'idle').length,
  };
}

// Distance/fuel from real logged trips only (see 004_vehicles.sql's
// sync_assignment_to_vehicle trigger) — never fabricated, so this is null
// whenever no cleanup run has actually completed in the window yet.
export function computeAvgEfficiency(activity: VehicleActivityRow[], sinceMs: number): number | null {
  const trips = activity.filter(
    (a) => a.activity_type === 'trip_completed' && new Date(a.created_at).getTime() >= sinceMs
  );
  const distance = trips.reduce((sum, t) => sum + (t.distance_km ?? 0), 0);
  const fuel = trips.reduce((sum, t) => sum + (t.fuel_used_l ?? 0), 0);
  if (fuel <= 0) return null;
  return distance / fuel;
}

export type WeekDelta = { value: number; deltaPercent: number | null };

export type VehicleWeekDeltas = {
  total: WeekDelta;
  onDuty: WeekDelta;
  assigned: WeekDelta;
  maintenance: WeekDelta;
  avgEfficiency: WeekDelta;
};

// Real week-over-week signal reconstructed from immutable facts: a
// vehicle's created_at for fleet growth, and the vehicle_activity log (never
// rewritten after the fact) for how much dispatch/maintenance/trip activity
// happened this week vs the week before.
export function computeVehicleWeekOverWeek(
  vehicles: VehicleRow[],
  activity: VehicleActivityRow[]
): VehicleWeekDeltas {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(now.getDate() - 14);

  const totalNow = vehicles.length;
  const totalWeekAgo = vehicles.filter((v) => new Date(v.created_at) <= weekAgo).length;

  function countInWindow(type: VehicleActivityRow['activity_type'], from: Date, to: Date | null): number {
    return activity.filter((a) => {
      if (a.activity_type !== type) return false;
      const t = new Date(a.created_at);
      return t >= from && (to === null || t < to);
    }).length;
  }

  const onDutyThis = countInWindow('trip_started', weekAgo, null);
  const onDutyPrior = countInWindow('trip_started', twoWeeksAgo, weekAgo);
  const assignedThis = countInWindow('assigned', weekAgo, null);
  const assignedPrior = countInWindow('assigned', twoWeeksAgo, weekAgo);
  const maintenanceThis = countInWindow('maintenance_started', weekAgo, null);
  const maintenancePrior = countInWindow('maintenance_started', twoWeeksAgo, weekAgo);

  const effThis = computeAvgEfficiency(activity, weekAgo.getTime()) ?? 0;
  const effPrior =
    computeAvgEfficiency(
      activity.filter((a) => new Date(a.created_at) < weekAgo),
      twoWeeksAgo.getTime()
    ) ?? 0;

  return {
    total: { value: totalNow, deltaPercent: delta(totalNow, totalWeekAgo) },
    onDuty: { value: vehicles.filter((v) => v.status === 'on_duty').length, deltaPercent: delta(onDutyThis, onDutyPrior) },
    assigned: { value: vehicles.filter((v) => v.status === 'assigned').length, deltaPercent: delta(assignedThis, assignedPrior) },
    maintenance: {
      value: vehicles.filter((v) => v.status === 'maintenance').length,
      deltaPercent: delta(maintenanceThis, maintenancePrior),
    },
    avgEfficiency: { value: effThis, deltaPercent: effPrior > 0 ? delta(effThis, effPrior) : null },
  };
}

export type VehicleWeekComparison = {
  distanceKm: WeekDelta;
  fuelUsedL: WeekDelta;
  trips: WeekDelta;
  avgEfficiency: WeekDelta;
};

// Per-vehicle "This Week Overview" tile deltas — this week's trip_completed
// log entries vs the same window the week before, for one specific vehicle.
export function computeVehicleWeekComparison(vehicleId: string, activity: VehicleActivityRow[]): VehicleWeekComparison {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(now.getDate() - 14);

  const trips = activity.filter((a) => a.vehicle_id === vehicleId && a.activity_type === 'trip_completed');
  const thisWeek = trips.filter((a) => new Date(a.created_at) >= weekAgo);
  const priorWeek = trips.filter((a) => {
    const t = new Date(a.created_at);
    return t >= twoWeeksAgo && t < weekAgo;
  });

  const sum = (rows: VehicleActivityRow[], key: 'distance_km' | 'fuel_used_l') =>
    rows.reduce((total, r) => total + (r[key] ?? 0), 0);

  const distanceThis = sum(thisWeek, 'distance_km');
  const distancePrior = sum(priorWeek, 'distance_km');
  const fuelThis = sum(thisWeek, 'fuel_used_l');
  const fuelPrior = sum(priorWeek, 'fuel_used_l');
  const effThis = fuelThis > 0 ? distanceThis / fuelThis : 0;
  const effPrior = fuelPrior > 0 ? distancePrior / fuelPrior : 0;

  return {
    distanceKm: { value: Math.round(distanceThis * 10) / 10, deltaPercent: delta(distanceThis, distancePrior) },
    fuelUsedL: { value: Math.round(fuelThis * 10) / 10, deltaPercent: delta(fuelThis, fuelPrior) },
    trips: { value: thisWeek.length, deltaPercent: delta(thisWeek.length, priorWeek.length) },
    avgEfficiency: {
      value: Math.round(effThis * 10) / 10,
      deltaPercent: effPrior > 0 ? delta(effThis, effPrior) : null,
    },
  };
}

export const VEHICLE_STATUS_COLOR: Record<VehicleStatus, string> = {
  on_duty: '#0ca30c',
  assigned: '#2a78d6',
  maintenance: '#eda100',
  idle: '#a3a29b',
};

export type StatusSlice = { name: string; status: VehicleStatus; count: number; percent: number };

export function computeStatusDistribution(vehicles: VehicleRow[]): StatusSlice[] {
  const total = vehicles.length;
  const order: { status: VehicleStatus; name: string }[] = [
    { status: 'on_duty', name: 'On Duty' },
    { status: 'assigned', name: 'Assigned' },
    { status: 'maintenance', name: 'Maintenance' },
    { status: 'idle', name: 'Idle' },
  ];
  return order.map(({ status, name }) => {
    const count = vehicles.filter((v) => v.status === status).length;
    return { name, status, count, percent: total > 0 ? (count / total) * 100 : 0 };
  });
}

export const VEHICLE_TYPE_COLOR: Record<string, string> = {
  'Compactor Truck': '#2a78d6',
  'Tipper Truck': '#eb6834',
  'Mini Truck': '#1baf7a',
  Tractor: '#e87ba4',
  Others: '#a3a29b',
};

export type TypeSlice = { name: string; count: number; percent: number; color: string };

export function computeTypeDistribution(vehicles: VehicleRow[]): TypeSlice[] {
  const total = vehicles.length;
  const counts = new Map<string, number>();
  for (const v of vehicles) {
    const key = VEHICLE_TYPE_COLOR[v.vehicle_type] ? v.vehicle_type : 'Others';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, percent: total > 0 ? (count / total) * 100 : 0, color: VEHICLE_TYPE_COLOR[name] }))
    .sort((a, b) => b.count - a.count);
}

export type FuelBucket = { label: string; min: number; max: number; count: number; percent: number; color: string };

export function computeFuelBuckets(vehicles: VehicleRow[]): FuelBucket[] {
  const total = vehicles.length;
  const buckets: Omit<FuelBucket, 'count' | 'percent'>[] = [
    { label: 'Above 75%', min: 75, max: 100, color: '#0ca30c' },
    { label: '50% - 75%', min: 50, max: 74.999, color: '#3f9668' },
    { label: '25% - 50%', min: 25, max: 49.999, color: '#eda100' },
    { label: 'Below 25%', min: 0, max: 24.999, color: '#d03b3b' },
  ];
  return buckets.map((b) => {
    const count = vehicles.filter((v) => v.fuel_level >= b.min && v.fuel_level <= b.max).length;
    return { ...b, count, percent: total > 0 ? (count / total) * 100 : 0 };
  });
}

export function fuelLevelColor(level: number): string {
  if (level >= 75) return '#0ca30c';
  if (level >= 50) return '#3f9668';
  if (level >= 25) return '#eda100';
  return '#d03b3b';
}
