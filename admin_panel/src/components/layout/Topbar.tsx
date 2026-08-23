import { LogOut, Menu, Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useReports } from '@/contexts/ReportsContext';
import { useTheme } from '@/contexts/ThemeContext';

import { DateRangePicker, lastNDays, type DateRange } from './DateRangePicker';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationBell';

export function Topbar({
  title,
  subtitle,
  breadcrumb,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  showSearch = true,
  dateRange,
  onDateRangeChange,
  action,
}: {
  title: string;
  subtitle?: string;
  /** When provided, renders as a "Dashboard > Complaints > All Complaints" trail instead of `subtitle`. */
  breadcrumb?: string[];
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Set to false to hide the global search bar for pages that don't need it. */
  showSearch?: boolean;
  /** Controlled date range; pages that don't care about it can leave this unset. */
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
  action?: ReactNode;
}) {
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const { connected } = useReports();

  const [internalSearch, setInternalSearch] = useState('');
  const [internalRange, setInternalRange] = useState<DateRange>(() => lastNDays(7));
  const search = searchQuery ?? internalSearch;
  const setSearch = onSearchChange ?? setInternalSearch;
  const range = dateRange ?? internalRange;
  const setRange = onDateRangeChange ?? setInternalRange;

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
        {breadcrumb ? (
          <p className="truncate text-[13px] text-slate-400">
            {breadcrumb.map((crumb, i) => (
              <span key={crumb}>
                {i > 0 && <span className="mx-1.5 text-slate-300">/</span>}
                <span className={i === breadcrumb.length - 1 ? 'text-slate-500 dark:text-slate-300' : ''}>
                  {crumb}
                </span>
              </span>
            ))}
          </p>
        ) : (
          <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>

      <DateRangePicker value={range} onChange={setRange} />

      {showSearch && <GlobalSearch value={search} onChange={setSearch} placeholder={searchPlaceholder} />}

      {action}

      <button
        type="button"
        onClick={toggleTheme}
        title="Toggle theme"
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <NotificationBell />

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
