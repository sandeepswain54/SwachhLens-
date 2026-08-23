import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const { session, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 dark:bg-[#0b100d]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/adminback.png')" }}
      />
      <div className="absolute inset-0 bg-white/50 dark:bg-[#0b100d]/75" />

      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200/70 bg-white p-8 shadow-card dark:border-white/10 dark:bg-[#111814]">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <img src="/applogo.png" alt="SwachhLens" className="h-14 w-14 object-contain" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">SwachhLens Admin</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            Sign in with your SwachhLens account to manage city cleanliness operations.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-300">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-300">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-[12.5px] text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-lg bg-brand-500 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60">
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-[12px] text-slate-400">
          Credentials: sandeepbusy54@gmail.com password: 12345678
        </p>
      </div>
    </div>
  );
}
