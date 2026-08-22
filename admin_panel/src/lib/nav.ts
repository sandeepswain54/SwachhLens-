import {
  Bell,
  ClipboardList,
  FileBarChart2,
  Gauge,
  History,
  LayoutDashboard,
  MapPinned,
  Recycle,
  Settings,
  Truck,
  Users2,
  UsersRound,
} from 'lucide-react';

export type NavItem = {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
};

export const MAIN_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Complaints', path: '/complaints', icon: ClipboardList },
  { label: 'AI Analytics', path: '/ai-analytics', icon: Gauge },
  { label: 'Waste Hotspots', path: '/waste-hotspots', icon: MapPinned },
  { label: 'Teams & Assignments', path: '/teams', icon: UsersRound },
  { label: 'Vehicles', path: '/vehicles', icon: Truck },
  { label: 'Recycling Partners', path: '/recycling-partners', icon: Recycle },
  { label: 'Reports & Insights', path: '/reports-insights', icon: FileBarChart2 },
];

export const SYSTEM_NAV: NavItem[] = [
  { label: 'Users', path: '/users', icon: Users2 },
  { label: 'Notifications', path: '/notifications', icon: Bell },
  { label: 'Settings', path: '/settings', icon: Settings },
  { label: 'Audit Logs', path: '/audit-logs', icon: History },
];
