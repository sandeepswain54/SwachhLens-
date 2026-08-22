import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import {
  getAllProfiles,
  getUsersAuthMeta,
  subscribeToProfileChanges,
  type AuthMeta,
  type ProfileRow,
} from '@/lib/profiles';

export type ProfileActivityEvent = {
  key: string;
  profile: ProfileRow;
  kind: 'new_user' | 'blocked' | 'unblocked';
  at: string;
};

// Only mounted on the Users page (see App.tsx) — every other page already
// gets the `full_name`/`email` it needs for "Reported By" via a one-off
// getAllProfiles() call inside ReportsContext. This one is realtime (new
// signups and block/unblock show up live) since that's what the Users page
// is actually about.
type ProfilesContextValue = {
  profiles: ProfileRow[];
  authMeta: AuthMeta[];
  loading: boolean;
  error: string | null;
  connected: boolean;
  // Session-only, same honest limitation as ReportsContext/TeamsContext's
  // own `activity` feeds (see admin_panel/README.md "Known limitations") —
  // there's no persisted audit log, just events seen while this tab is open.
  activity: ProfileActivityEvent[];
};

const ProfilesContext = createContext<ProfilesContextValue | null>(null);

const MAX_ACTIVITY = 30;

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [authMeta, setAuthMeta] = useState<AuthMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [activity, setActivity] = useState<ProfileActivityEvent[]>([]);
  const eventCounter = useRef(0);

  useEffect(() => {
    let cancelled = false;

    getAllProfiles()
      .then((rows) => {
        if (cancelled) return;
        setProfiles(rows);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    // Best-effort: last-sign-in metadata is a nice-to-have enrichment, not
    // required for the page's core table/stats, so a failure here (e.g. the
    // edge function isn't deployed yet) is swallowed rather than surfaced.
    getUsersAuthMeta()
      .then((rows) => {
        if (!cancelled) setAuthMeta(rows);
      })
      .catch(() => {
        if (!cancelled) setAuthMeta([]);
      });

    const unsubscribe = subscribeToProfileChanges({
      onInsert: (row) => {
        setProfiles((prev) => (prev.some((p) => p.id === row.id) ? prev : [row, ...prev]));
        eventCounter.current += 1;
        setActivity((prev) =>
          [{ key: `new-${row.id}-${eventCounter.current}`, profile: row, kind: 'new_user' as const, at: new Date().toISOString() }, ...prev].slice(
            0,
            MAX_ACTIVITY
          )
        );
      },
      onUpdate: (row) => {
        setProfiles((prev) => {
          const previous = prev.find((p) => p.id === row.id);
          if (previous && previous.is_blocked !== row.is_blocked) {
            eventCounter.current += 1;
            setActivity((prevActivity) =>
              [
                {
                  key: `block-${row.id}-${eventCounter.current}`,
                  profile: row,
                  kind: row.is_blocked ? ('blocked' as const) : ('unblocked' as const),
                  at: new Date().toISOString(),
                },
                ...prevActivity,
              ].slice(0, MAX_ACTIVITY)
            );
          }
          return prev.map((p) => (p.id === row.id ? row : p));
        });
      },
    });
    setConnected(true);

    return () => {
      cancelled = true;
      setConnected(false);
      unsubscribe();
    };
  }, []);

  return (
    <ProfilesContext.Provider value={{ profiles, authMeta, loading, error, connected, activity }}>
      {children}
    </ProfilesContext.Provider>
  );
}

export function useProfiles() {
  const ctx = useContext(ProfilesContext);
  if (!ctx) throw new Error('useProfiles must be used within ProfilesProvider');
  return ctx;
}
