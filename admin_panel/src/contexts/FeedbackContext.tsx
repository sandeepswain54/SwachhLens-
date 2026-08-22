import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { getAllFeedback, subscribeToFeedbackChanges, type FeedbackRow } from '@/lib/feedback';

// Only mounted on the Feedback page (see App.tsx) — same reasoning as
// ProfilesContext: no other page needs citizen review data.
type FeedbackContextValue = {
  feedback: FeedbackRow[];
  loading: boolean;
  error: string | null;
  connected: boolean;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getAllFeedback()
      .then((rows) => {
        if (cancelled) return;
        setFeedback(rows);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    const unsubscribe = subscribeToFeedbackChanges((row) => {
      setFeedback((prev) => (prev.some((f) => f.id === row.id) ? prev : [row, ...prev]));
    });
    setConnected(true);

    return () => {
      cancelled = true;
      setConnected(false);
      unsubscribe();
    };
  }, []);

  return (
    <FeedbackContext.Provider value={{ feedback, loading, error, connected }}>{children}</FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider');
  return ctx;
}
