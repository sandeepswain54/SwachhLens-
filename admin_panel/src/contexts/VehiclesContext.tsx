import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import {
  getAllMaintenance,
  getAllVehicleActivity,
  getAllVehicles,
  subscribeToMaintenanceChanges,
  subscribeToVehicleActivity,
  subscribeToVehicleChanges,
  type VehicleActivityRow,
  type VehicleMaintenanceRow,
  type VehicleRow,
} from '@/lib/vehicles';

type VehiclesContextValue = {
  vehicles: VehicleRow[];
  activity: VehicleActivityRow[];
  maintenance: VehicleMaintenanceRow[];
  loading: boolean;
  error: string | null;
  connected: boolean;
};

const VehiclesContext = createContext<VehiclesContextValue | null>(null);

const MAX_ACTIVITY = 100;

export function VehiclesProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [activity, setActivity] = useState<VehicleActivityRow[]>([]);
  const [maintenance, setMaintenance] = useState<VehicleMaintenanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const seenActivityIds = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;

    Promise.all([getAllVehicles(), getAllVehicleActivity(), getAllMaintenance()])
      .then(([vehicleRows, activityRows, maintenanceRows]) => {
        if (cancelled) return;
        setVehicles(vehicleRows);
        setActivity(activityRows);
        activityRows.forEach((a) => seenActivityIds.current.add(a.id));
        setMaintenance(maintenanceRows);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    const unsubVehicles = subscribeToVehicleChanges({
      onInsert: (row) => {
        setVehicles((prev) => (prev.some((v) => v.id === row.id) ? prev : [...prev, row]));
      },
      onUpdate: (row) => {
        setVehicles((prev) => prev.map((v) => (v.id === row.id ? row : v)));
      },
    });

    const unsubActivity = subscribeToVehicleActivity((row) => {
      if (seenActivityIds.current.has(row.id)) return;
      seenActivityIds.current.add(row.id);
      setActivity((prev) => [row, ...prev].slice(0, MAX_ACTIVITY));
    });

    const unsubMaintenance = subscribeToMaintenanceChanges({
      onInsert: (row) => {
        setMaintenance((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      },
      onUpdate: (row) => {
        setMaintenance((prev) => prev.map((m) => (m.id === row.id ? row : m)));
      },
    });

    setConnected(true);

    return () => {
      cancelled = true;
      setConnected(false);
      unsubVehicles();
      unsubActivity();
      unsubMaintenance();
    };
  }, []);

  return (
    <VehiclesContext.Provider value={{ vehicles, activity, maintenance, loading, error, connected }}>
      {children}
    </VehiclesContext.Provider>
  );
}

export function useVehicles() {
  const ctx = useContext(VehiclesContext);
  if (!ctx) throw new Error('useVehicles must be used within VehiclesProvider');
  return ctx;
}
