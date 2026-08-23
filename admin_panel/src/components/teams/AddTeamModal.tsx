import { CheckCircle2, Copy, Eye, EyeOff, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

import { Select } from '@/components/common/Select';
import { sendTeamCredentialsEmail } from '@/lib/emailjs';
import { createTeam, ZONES, type CreateTeamResult } from '@/lib/teams';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export function AddTeamModal({ onClose }: { onClose: () => void }) {
  const [teamName, setTeamName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [zone, setZone] = useState<string>(ZONES[0]);
  const [password, setPassword] = useState(generatePassword);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateTeamResult | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!teamName.trim() || !leaderName.trim() || !email.trim() || !password) {
      setError('Team name, leader name, email, and password are all required.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const team = await createTeam({
        team_name: teamName.trim(),
        leader_name: leaderName.trim(),
        email: email.trim(),
        password,
        zone,
        phone: phone.trim() || undefined,
      });
      setCreated(team);

      try {
        await sendTeamCredentialsEmail({
          to_email: team.email,
          team_name: team.team_name,
          leader_name: leaderName.trim(),
          team_code: team.team_code,
          password,
        });
      } catch (emailErr) {
        setEmailWarning(
          `Team created, but the credentials email couldn't be sent (${(emailErr as Error).message}). Share the details below manually.`
        );
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function copyCredentials() {
    if (!created) return;
    void navigator.clipboard.writeText(
      `SwachhLens Field Team login\nTeam: ${created.team_name} (${created.team_code})\nEmail: ${created.email}\nPassword: ${password}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#141c17]"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/10">
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">
            {created ? 'Team created' : 'Add Team'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        {created ? (
          <div className="space-y-4 p-5">
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="text-[13px] text-emerald-800 dark:text-emerald-300">
                <p className="font-semibold">
                  {created.team_code} &middot; {created.team_name}
                </p>
                <p className="mt-1">
                  {emailWarning ? emailWarning : `Login details were emailed to ${created.email}.`}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 text-[13px] dark:border-white/10">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Email</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{created.email}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Password</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-100">{password}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyCredentials}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
                <Copy size={14} /> {copied ? 'Copied' : 'Copy credentials'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-600">
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 p-5">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400">
                Team Name
              </label>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. City Center Team"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400">
                  Team Leader
                </label>
                <input
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400">
                  Zone
                </label>
                <Select
                  value={zone}
                  onChange={setZone}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                  options={ZONES.map((z) => ({ value: z, label: z }))}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="team@swachhlens.gov.in"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400">
                Phone <span className="text-slate-300">(optional)</span>
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400">
                Password
              </label>
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 pr-1.5 focus-within:border-brand-400 dark:border-white/10 dark:bg-white/5">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg bg-transparent px-3 py-2 text-[13px] outline-none dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  type="button"
                  title="Generate a new password"
                  onClick={() => setPassword(generatePassword())}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
                  <RefreshCw size={14} />
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                This is exactly what gets emailed to them and what they'll use to sign in on the mobile
                app's Field Team tab.
              </p>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 w-full rounded-xl bg-brand-500 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
              {submitting ? 'Creating team…' : 'Create Team'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
