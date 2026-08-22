import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import {
  getAllAssignments,
  getAllTeams,
  subscribeToAssignmentChanges,
  subscribeToTeamChanges,
  type AssignmentRow,
  type TeamRow,
} from '@/lib/teams';

export type TeamActivityEvent = {
  key: string;
  text: string;
  tone: 'new' | 'progress' | 'done' | 'team';
  at: string;
};

type TeamsContextValue = {
  teams: TeamRow[];
  assignments: AssignmentRow[];
  loading: boolean;
  error: string | null;
  activity: TeamActivityEvent[];
  connected: boolean;
};

const TeamsContext = createContext<TeamsContextValue | null>(null);

const MAX_ACTIVITY = 30;

export function TeamsProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<TeamActivityEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const eventCounter = useRef(0);
  const teamsRef = useRef<TeamRow[]>([]);
  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  function pushActivity(entry: Omit<TeamActivityEvent, 'key' | 'at'>) {
    eventCounter.current += 1;
    setActivity((prev) =>
      [{ ...entry, key: `evt-${eventCounter.current}`, at: new Date().toISOString() }, ...prev].slice(
        0,
        MAX_ACTIVITY
      )
    );
  }

  useEffect(() => {
    let cancelled = false;

    Promise.all([getAllTeams(), getAllAssignments()])
      .then(([teamRows, assignmentRows]) => {
        if (cancelled) return;
        setTeams(teamRows);
        setAssignments(assignmentRows);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    const unsubTeams = subscribeToTeamChanges({
      onInsert: (row) => {
        setTeams((prev) => (prev.some((t) => t.id === row.id) ? prev : [...prev, row]));
        pushActivity({ text: `New team ${row.team_code} (${row.team_name}) created`, tone: 'team' });
      },
      onUpdate: (row) => {
        setTeams((prev) => {
          const previous = prev.find((t) => t.id === row.id);
          if (previous && previous.status !== row.status) {
            pushActivity({ text: `${row.team_code} status changed to ${row.status.replace('_', ' ')}`, tone: 'team' });
          }
          return prev.map((t) => (t.id === row.id ? row : t));
        });
      },
    });

    const unsubAssignments = subscribeToAssignmentChanges({
      onInsert: (row) => {
        setAssignments((prev) => (prev.some((a) => a.id === row.id) ? prev : [row, ...prev]));
        const team = teamsRef.current.find((t) => t.id === row.team_id);
        pushActivity({
          text: `Complaint ${row.assignment_code} assigned to ${team?.team_code ?? 'a team'}`,
          tone: 'new',
        });
      },
      onUpdate: (row) => {
        setAssignments((prev) => {
          const previous = prev.find((a) => a.id === row.id);
          if (previous && previous.status !== row.status) {
            if (row.status === 'completed') {
              pushActivity({ text: `Completed complaint ${row.assignment_code}`, tone: 'done' });
            } else if (row.status === 'in_progress') {
              pushActivity({ text: `${row.assignment_code} started`, tone: 'progress' });
            }
          }
          return prev.map((a) => (a.id === row.id ? row : a));
        });
      },
    });

    setConnected(true);

    return () => {
      cancelled = true;
      setConnected(false);
      unsubTeams();
      unsubAssignments();
    };
  }, []);

  return (
    <TeamsContext.Provider value={{ teams, assignments, loading, error, activity, connected }}>
      {children}
    </TeamsContext.Provider>
  );
}

export function useTeams() {
  const ctx = useContext(TeamsContext);
  if (!ctx) throw new Error('useTeams must be used within TeamsProvider');
  return ctx;
}
