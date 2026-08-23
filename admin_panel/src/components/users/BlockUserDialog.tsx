import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { setUserBlocked } from '@/lib/profiles';
import type { AppUser } from '@/lib/users-stats';

// Blocking bans the account at the Supabase Auth level (via the
// set-user-blocked edge function) — the effect is real and immediate: the
// user's next sign-in attempt, mobile app or admin panel, is rejected.
export function BlockUserDialog({
  user,
  blocking,
  onClose,
  onDone,
}: {
  user: AppUser;
  blocking: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await setUserBlocked(user.id, blocking);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this user.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#141c17]"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              blocking ? 'bg-red-50 text-red-500 dark:bg-red-500/15' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15'
            }`}>
            <AlertTriangle size={18} />
          </span>
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">
            {blocking ? 'Block this user?' : 'Unblock this user?'}
          </h3>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          {blocking ? (
            <>
              <strong className="text-slate-700 dark:text-slate-200">{user.fullName}</strong> will no longer be able to
              sign in to {user.userType === 'field_team' ? 'the mobile Field Team app' : 'the SwachhLens app'} until
              unblocked.
            </>
          ) : (
            <>
              <strong className="text-slate-700 dark:text-slate-200">{user.fullName}</strong> will be able to sign in
              again immediately.
            </>
          )}
        </p>

        {error && <p className="mt-3 text-[12.5px] text-red-500">{error}</p>}

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
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60 ${
              blocking ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
            }`}>
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {blocking ? 'Block User' : 'Unblock User'}
          </button>
        </div>
      </div>
    </div>
  );
}
