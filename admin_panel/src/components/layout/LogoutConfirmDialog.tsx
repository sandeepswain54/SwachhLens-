import { LogOut } from 'lucide-react';
import { useState } from 'react';

export function LogoutConfirmDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => Promise<void> }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#141c17]"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/15">
            <LogOut size={18} />
          </span>
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Log out?</h3>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          Are you sure you want to logout?
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-200 px-3.5 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={submitting}
            className="rounded-lg bg-red-500 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-red-600 disabled:opacity-60">
            {submitting ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
}
