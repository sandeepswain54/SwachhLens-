import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { getAllReports, subscribeToReportChanges, type ReportRow } from '@/lib/reports';

export type ActivityEvent = {
  key: string;
  report: ReportRow;
  kind: 'new' | 'status';
  previousStatus?: ReportRow['status'];
  at: string;
};

type ReportsContextValue = {
  reports: ReportRow[];
  loading: boolean;
  error: string | null;
  activity: ActivityEvent[];
  connected: boolean;
};

const ReportsContext = createContext<ReportsContextValue | null>(null);

const MAX_ACTIVITY = 30;

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const eventCounter = useRef(0);

  useEffect(() => {
    let cancelled = false;

    getAllReports()
      .then((rows) => {
        if (cancelled) return;
        setReports(rows);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    const unsubscribe = subscribeToReportChanges({
      onInsert: (row) => {
        setReports((prev) => (prev.some((r) => r.id === row.id) ? prev : [row, ...prev]));
        eventCounter.current += 1;
        setActivity((prev) =>
          [
            {
              key: `new-${row.id}-${eventCounter.current}`,
              report: row,
              kind: 'new' as const,
              at: new Date().toISOString(),
            },
            ...prev,
          ].slice(0, MAX_ACTIVITY)
        );
      },
      onUpdate: (row) => {
        setReports((prev) => {
          const previous = prev.find((r) => r.id === row.id);
          if (previous && previous.status !== row.status) {
            eventCounter.current += 1;
            setActivity((prevActivity) =>
              [
                {
                  key: `status-${row.id}-${eventCounter.current}`,
                  report: row,
                  kind: 'status' as const,
                  previousStatus: previous.status,
                  at: new Date().toISOString(),
                },
                ...prevActivity,
              ].slice(0, MAX_ACTIVITY)
            );
          }
          return prev.map((r) => (r.id === row.id ? row : r));
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
    <ReportsContext.Provider value={{ reports, loading, error, activity, connected }}>
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error('useReports must be used within ReportsProvider');
  return ctx;
}
