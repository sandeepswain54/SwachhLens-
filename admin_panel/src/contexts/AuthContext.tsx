import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Municipality logins (created via "Register Your Municipality" — see
// admin_panel/supabase/functions/register-municipality, which tags them
// `user_metadata.role: 'municipality'`) should only reach this dashboard
// once they've actually paid for a plan on their status page. Every other
// account (admin/team test logins, anything without that role tag) is
// unaffected — this only adds a gate for municipality accounts.
async function municipalityAccessDenialReason(session: Session): Promise<string | null> {
  if (session.user.user_metadata?.role !== 'municipality') return null;

  const { data, error } = await supabase
    .from('municipality_registrations')
    .select('status, payment_status')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return 'Could not find your municipality registration. Please contact support.';
  }
  if (data.status !== 'approved') {
    return 'Your municipality registration is not approved yet. Please wait for admin approval before signing in here.';
  }
  if (data.payment_status !== 'paid') {
    return 'Please choose a plan and complete payment on your status page before accessing the dashboard.';
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session && (await municipalityAccessDenialReason(data.session))) {
        // A previously-persisted session that no longer (or never did)
        // qualifies — e.g. a municipality that hasn't paid yet. Drop it
        // silently; Login will just show the sign-in form again.
        await supabase.auth.signOut();
        setSession(null);
        setLoading(false);
        return;
      }
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    const denialReason = data.session ? await municipalityAccessDenialReason(data.session) : null;
    if (denialReason) {
      await supabase.auth.signOut();
      throw new Error(denialReason);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
