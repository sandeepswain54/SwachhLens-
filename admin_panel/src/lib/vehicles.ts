import { supabase } from './supabase';

export type VehicleStatus = 'on_duty' | 'assigned' | 'maintenance' | 'idle';
export type FuelType = 'Diesel' | 'Petrol' | 'CNG' | 'Electric';

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  on_duty: 'On Duty',
  assigned: 'Assigned',
  maintenance: 'Maintenance',
  idle: 'Idle',
};

export const VEHICLE_TYPES = ['Compactor Truck', 'Tipper Truck', 'Mini Truck', 'Tractor', 'Other'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const FUEL_TYPES: FuelType[] = ['Diesel', 'Petrol', 'CNG', 'Electric'];

// Common Bhubaneswar-area stand names a vehicle can be based out of/parked
// at, each with an approximate map position — used for the Live Location
// mini map until a job's real report location moves it (see
// 004_vehicles.sql's sync_assignment_to_vehicle trigger).
export const VEHICLE_LOCATIONS: Record<string, [number, number]> = {
  'Khandagiri Road': [20.27, 85.77],
  'Unit-6 Area': [20.29, 85.84],
  'Patia Main Road': [20.355, 85.818],
  'Jayadev Vihar': [20.301, 85.825],
  Workshop: [20.275, 85.81],
  Rasulgarh: [20.298, 85.858],
  Bomikhal: [20.276, 85.848],
  Nayapalli: [20.296, 85.815],
};

export const DEFAULT_VEHICLE_LOCATION: [number, number] = [20.2961, 85.8245];

export function vehicleLocationCenter(vehicle: Pick<VehicleRow, 'latitude' | 'longitude' | 'location_label'>): [number, number] {
  if (vehicle.latitude != null && vehicle.longitude != null) return [vehicle.latitude, vehicle.longitude];
  if (vehicle.location_label && VEHICLE_LOCATIONS[vehicle.location_label]) {
    return VEHICLE_LOCATIONS[vehicle.location_label];
  }
  return DEFAULT_VEHICLE_LOCATION;
}

export type VehicleRow = {
  id: string;
  vehicle_no: string;
  vehicle_type: string;
  capacity_tons: number | null;
  model: string | null;
  driver_name: string | null;
  driver_contact: string | null;
  fuel_type: FuelType;
  fuel_level: number;
  status: VehicleStatus;
  location_label: string | null;
  latitude: number | null;
  longitude: number | null;
  assigned_team_id: string | null;
  image_url: string | null;
  odometer_km: number;
  registration_date: string | null;
  insurance_valid_till: string | null;
  fitness_valid_till: string | null;
  created_at: string;
  updated_at: string;
};

const VEHICLE_COLUMNS =
  'id, vehicle_no, vehicle_type, capacity_tons, model, driver_name, driver_contact, fuel_type, fuel_level, status, location_label, latitude, longitude, assigned_team_id, image_url, odometer_km, registration_date, insurance_valid_till, fitness_valid_till, created_at, updated_at';

export async function getAllVehicles(): Promise<VehicleRow[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select(VEHICLE_COLUMNS)
    .order('vehicle_no', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as VehicleRow[];
}

export function subscribeToVehicleChanges(handlers: {
  onInsert: (row: VehicleRow) => void;
  onUpdate: (row: VehicleRow) => void;
}) {
  const channel = supabase
    .channel('admin-vehicle-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vehicles' }, (payload) =>
      handlers.onInsert(payload.new as VehicleRow)
    )
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vehicles' }, (payload) =>
      handlers.onUpdate(payload.new as VehicleRow)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export type CreateVehicleParams = {
  vehicle_no: string;
  vehicle_type: string;
  capacity_tons?: number | null;
  model?: string;
  driver_name?: string;
  driver_contact?: string;
  fuel_type: FuelType;
  fuel_level?: number;
  status?: VehicleStatus;
  location_label?: string;
  image_url?: string | null;
  registration_date?: string;
  insurance_valid_till?: string;
  fitness_valid_till?: string;
};

export async function createVehicle(params: CreateVehicleParams): Promise<VehicleRow> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const center = params.location_label ? VEHICLE_LOCATIONS[params.location_label] : undefined;

  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      vehicle_no: params.vehicle_no.trim().toUpperCase(),
      vehicle_type: params.vehicle_type,
      capacity_tons: params.capacity_tons ?? null,
      model: params.model?.trim() || null,
      driver_name: params.driver_name?.trim() || null,
      driver_contact: params.driver_contact?.trim() || null,
      fuel_type: params.fuel_type,
      fuel_level: params.fuel_level ?? 100,
      status: params.status ?? 'idle',
      location_label: params.location_label || null,
      latitude: center?.[0] ?? null,
      longitude: center?.[1] ?? null,
      image_url: params.image_url ?? null,
      registration_date: params.registration_date || null,
      insurance_valid_till: params.insurance_valid_till || null,
      fitness_valid_till: params.fitness_valid_till || null,
      created_by: user?.id ?? null,
    })
    .select(VEHICLE_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  const vehicle = data as VehicleRow;

  await logVehicleActivity({
    vehicleId: vehicle.id,
    activityType: 'created',
    description: 'Vehicle added to fleet',
    location: vehicle.location_label,
  });

  return vehicle;
}

export async function updateVehicle(id: string, patch: Partial<CreateVehicleParams>): Promise<void> {
  const update: Record<string, unknown> = { ...patch };
  if (patch.vehicle_no) update.vehicle_no = patch.vehicle_no.trim().toUpperCase();
  if (patch.location_label) {
    const center = VEHICLE_LOCATIONS[patch.location_label];
    if (center) {
      update.latitude = center[0];
      update.longitude = center[1];
    }
  }
  const { error } = await supabase.from('vehicles').update(update).eq('id', id);
  if (error) throw new Error(error.message);
}

// Manual status change from the Vehicle Details panel (e.g. sending a
// vehicle to Maintenance, or bringing it back to Idle once work is done) —
// distinct from the automatic assigned/on_duty/idle flips driven by the
// assignment-lifecycle trigger in 004_vehicles.sql.
export async function setVehicleStatus(vehicle: VehicleRow, status: VehicleStatus): Promise<void> {
  const { error } = await supabase.from('vehicles').update({ status }).eq('id', vehicle.id);
  if (error) throw new Error(error.message);

  await logVehicleActivity({
    vehicleId: vehicle.id,
    activityType: status === 'maintenance' ? 'maintenance_started' : 'status_changed',
    description:
      status === 'maintenance'
        ? 'Maintenance started'
        : `Status changed to ${VEHICLE_STATUS_LABEL[status]}`,
    location: vehicle.location_label,
  });
}

export async function refuelVehicle(vehicle: VehicleRow, liters: number): Promise<void> {
  // Rough tank-size assumption (~70L) just to turn a liters amount into a
  // sensible fuel-level percentage bump — there's no per-vehicle tank
  // capacity field, and this keeps the number on the gauge realistic.
  const percent = Math.max(1, Math.round((liters / 70) * 100));
  const nextLevel = Math.min(100, vehicle.fuel_level + percent);

  const { error } = await supabase.from('vehicles').update({ fuel_level: nextLevel }).eq('id', vehicle.id);
  if (error) throw new Error(error.message);

  await logVehicleActivity({
    vehicleId: vehicle.id,
    activityType: 'fuel_refilled',
    description: `Fuel refilled (${liters} L)`,
    location: vehicle.location_label,
  });
}

export async function uploadVehicleImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from('vehicle-photos').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Could not upload image: ${error.message}`);

  const { data } = supabase.storage.from('vehicle-photos').getPublicUrl(path);
  return data.publicUrl;
}

// ---------------- activity feed ----------------

export type VehicleActivityType =
  | 'assigned'
  | 'trip_started'
  | 'trip_completed'
  | 'fuel_refilled'
  | 'maintenance_started'
  | 'maintenance_completed'
  | 'inspection_completed'
  | 'status_changed'
  | 'created';

export type VehicleActivityRow = {
  id: string;
  vehicle_id: string;
  activity_type: VehicleActivityType;
  description: string;
  location: string | null;
  distance_km: number | null;
  fuel_used_l: number | null;
  performed_by: string;
  created_at: string;
};

export async function getAllVehicleActivity(limit = 200): Promise<VehicleActivityRow[]> {
  const { data, error } = await supabase
    .from('vehicle_activity')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as VehicleActivityRow[];
}

export function subscribeToVehicleActivity(onInsert: (row: VehicleActivityRow) => void) {
  const channel = supabase
    .channel('admin-vehicle-activity')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vehicle_activity' }, (payload) =>
      onInsert(payload.new as VehicleActivityRow)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

async function logVehicleActivity(params: {
  vehicleId: string;
  activityType: VehicleActivityType;
  description: string;
  location?: string | null;
  distanceKm?: number;
  fuelUsedL?: number;
}): Promise<void> {
  const { error } = await supabase.from('vehicle_activity').insert({
    vehicle_id: params.vehicleId,
    activity_type: params.activityType,
    description: params.description,
    location: params.location ?? null,
    distance_km: params.distanceKm ?? null,
    fuel_used_l: params.fuelUsedL ?? null,
    performed_by: 'Admin User',
  });
  if (error) throw new Error(error.message);
}

// ---------------- maintenance schedule ----------------

export type MaintenanceKind = 'service' | 'inspection' | 'replacement';

export type VehicleMaintenanceRow = {
  id: string;
  vehicle_id: string;
  task: string;
  kind: MaintenanceKind;
  due_date: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

export async function getAllMaintenance(): Promise<VehicleMaintenanceRow[]> {
  const { data, error } = await supabase
    .from('vehicle_maintenance')
    .select('*')
    .order('due_date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as VehicleMaintenanceRow[];
}

export function subscribeToMaintenanceChanges(handlers: {
  onInsert: (row: VehicleMaintenanceRow) => void;
  onUpdate: (row: VehicleMaintenanceRow) => void;
}) {
  const channel = supabase
    .channel('admin-vehicle-maintenance')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vehicle_maintenance' }, (payload) =>
      handlers.onInsert(payload.new as VehicleMaintenanceRow)
    )
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vehicle_maintenance' }, (payload) =>
      handlers.onUpdate(payload.new as VehicleMaintenanceRow)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function scheduleMaintenance(
  vehicle: VehicleRow,
  params: { task: string; kind: MaintenanceKind; dueDate: string }
): Promise<void> {
  const { error } = await supabase.from('vehicle_maintenance').insert({
    vehicle_id: vehicle.id,
    task: params.task.trim(),
    kind: params.kind,
    due_date: params.dueDate,
  });
  if (error) throw new Error(error.message);

  // Scheduling due-today/overdue work reads as starting it right away;
  // future-dated work just gets queued without touching the live status.
  if (new Date(params.dueDate) <= new Date() && vehicle.status !== 'maintenance') {
    await setVehicleStatus(vehicle, 'maintenance');
  }
}

export async function completeMaintenance(
  task: VehicleMaintenanceRow,
  vehicle: VehicleRow | undefined
): Promise<void> {
  const { error } = await supabase
    .from('vehicle_maintenance')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', task.id);
  if (error) throw new Error(error.message);

  await logVehicleActivity({
    vehicleId: task.vehicle_id,
    activityType: task.kind === 'inspection' ? 'inspection_completed' : 'maintenance_completed',
    description: `${task.task} completed`,
    location: vehicle?.location_label,
  });

  if (vehicle && vehicle.status === 'maintenance') {
    await setVehicleStatus({ ...vehicle, status: 'maintenance' }, 'idle');
  }
}

export function daysUntil(dateIso: string): number {
  const due = new Date(dateIso);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
