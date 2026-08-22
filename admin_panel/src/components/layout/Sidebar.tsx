import { Sprout } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { MAIN_NAV, SYSTEM_NAV, type NavItem } from '@/lib/nav';

function NavRow({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-brand-500 text-white'
            : 'text-brand-100/70 hover:bg-white/5 hover:text-white'
        }`
      }>
      <Icon size={18} strokeWidth={2} />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

export function Sidebar() {
  const { session } = useAuth();
  const email = session?.user.email ?? 'Admin';
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-[#0b1712] text-white">
      <div className="flex items-center gap-2 px-5 pb-5 pt-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500">
          <Sprout size={20} strokeWidth={2.4} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold leading-tight">SwachhLens</p>
          <p className="truncate text-[11px] text-brand-100/60">Admin Panel</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-2 pt-2 text-[10px] font-bold tracking-wider text-brand-100/40">
          MAIN
        </p>
        <div className="flex flex-col gap-1">
          {MAIN_NAV.map((item) => (
            <NavRow key={item.path} item={item} />
          ))}
        </div>

        <p className="px-3 pb-2 pt-5 text-[10px] font-bold tracking-wider text-brand-100/40">
          SYSTEM
        </p>
        <div className="flex flex-col gap-1">
          {SYSTEM_NAV.map((item) => (
            <NavRow key={item.path} item={item} />
          ))}
        </div>
      </nav>

      <div className="flex items-center gap-2.5 border-t border-white/10 px-4 py-4">
        <div className="relative shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-400 text-xs font-bold">
            {initials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0b1712] bg-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">Admin User</p>
          <p className="truncate text-[11px] text-brand-100/50" title={email}>
            Super Admin
          </p>
        </div>
      </div>
    </aside>
  );
}
