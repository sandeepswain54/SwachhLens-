import { X } from 'lucide-react';
import { useState } from 'react';

import { Select } from '@/components/common/Select';
import { scheduleMaintenance, type MaintenanceKind, type VehicleRow } from '@/lib/vehicles';

const KIND_LABEL: Record<MaintenanceKind, string> = {
  service: 'Service',
  inspection: 'Inspection',
  replacement: 'Replacement',
};

export function ScheduleMaintenanceModal({ vehicle, onClose }: { vehicle: VehicleRow; onClose: () => void }) {
  const [task, setTask] = useState('');
  const [kind, setKind] = useState<MaintenanceKind>('service');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task.trim()) {
      setError('Give the maintenance task a name.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await scheduleMaintenance(vehicle, { task, kind, dueDate });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100';

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#141c17]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Schedule Maintenance</h2>
            <p className="text-[12px] text-slate-400">{vehicle.vehicle_no}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 p-5">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400">Task</label>
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Engine Oil Change"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400">Kind</label>
              <Select
                value={kind}
                onChange={(v) => setKind(v as MaintenanceKind)}
                className={inputClass}
                options={(Object.keys(KIND_LABEL) as MaintenanceKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Due today or earlier moves this vehicle to Maintenance right away; future dates just queue the task.
          </p>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
            {submitting ? 'Scheduling…' : 'Schedule Maintenance'}
          </button>
        </form>
      </div>
    </div>
  );
}
