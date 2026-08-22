import { useMemo, useState } from 'react';

import { formatRelativeTime } from '@/lib/reports';
import type { VehicleActivityRow, VehicleRow } from '@/lib/vehicles';

const PREVIEW_COUNT = 6;

export function RecentVehicleActivity({ activity, vehicles }: { activity: VehicleActivityRow[]; vehicles: VehicleRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v] as [string, VehicleRow])), [vehicles]);

  const rows = expanded ? activity.slice(0, 40) : activity.slice(0, PREVIEW_COUNT);

  if (activity.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-slate-400">
        Vehicle activity will appear here as jobs are assigned, started, and completed.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Vehicle No.</th>
              <th className="px-3 py-2 font-medium">Activity</th>
              <th className="px-3 py-2 font-medium">Location</th>
              <th className="px-3 py-2 font-medium">Performed By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 text-slate-700 dark:border-white/5 dark:text-slate-200">
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">{formatRelativeTime(a.created_at)}</td>
                <td className="px-3 py-2.5 font-semibold text-brand-600">{vehicleById.get(a.vehicle_id)?.vehicle_no ?? '—'}</td>
                <td className="px-3 py-2.5">{a.description}</td>
                <td className="max-w-[160px] truncate px-3 py-2.5 text-slate-500 dark:text-slate-400">{a.location || '—'}</td>
                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{a.performed_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activity.length > PREVIEW_COUNT && (
        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[12px] font-medium text-brand-600 hover:underline">
            {expanded ? 'Show Less' : 'View All Activity'}
          </button>
        </div>
      )}
    </div>
  );
}
