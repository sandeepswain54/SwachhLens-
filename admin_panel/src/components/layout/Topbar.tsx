import { Bell, LogOut, Menu, Moon, Search, Sun } from 'lucide-react';
import type { ReactNode } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useReports } from '@/contexts/ReportsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { computeStatusCounts } from '@/lib/stats';

function formatDateRange(days: number): string {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(start)} - ${fmt(end)}`;
}

export function Topbar({
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  action,
}: {
  title: string;
  subtitle: string;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  action?: ReactNode;
}) {
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const { reports, connected } = useReports();
  const criticalCount = computeStatusCounts(reports).critical;

  return (
    <header className="flex items-center gap-4 border-b border-black/5 bg-white px-6 py-4 dark:border-white/10 dark:bg-[#111814]">
      <button
        type="button"
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 lg:hidden">
        <Menu size={20} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <span
            className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
            title={connected ? 'Live updates connected' : 'Connecting…'}>
            <span
              className={`h-1.5 w-1.5 rounded-full ${connected ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`}
            />
            {connected ? 'Live' : 'Connecting'}
          </span>
        </div>
        <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>

      <div className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-600 dark:border-white/10 dark:text-slate-300 md:flex">
        <span>📅</span>
        {formatDateRange(7)}
      </div>

      <label className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-500 focus-within:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 sm:flex">
        <Search size={15} />
        <input
          value={searchQuery ?? ''}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search anything..."
          className="w-40 bg-transparent text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 lg:w-56"
        />
      </label>

      {action}

      <button
        type="button"
        onClick={toggleTheme}
        title="Toggle theme"
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <button
        type="button"
        title={`${criticalCount} critical/high priority complaint${criticalCount === 1 ? '' : 's'}`}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">
        <Bell size={18} />
        {criticalCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {criticalCount > 99 ? '99+' : criticalCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => void signOut()}
        title="Sign out"
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">
        <LogOut size={18} />
      </button>
    </header>
  );
}
