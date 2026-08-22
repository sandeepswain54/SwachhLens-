import { AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { formatRelativeTime } from '@/lib/reports';
import type { HotspotCluster, HotspotIntensity } from '@/lib/hotspots';

type AlertTone = 'critical' | 'warning' | 'success';

type HotspotAlert = {
  id: string;
  tone: AlertTone;
  title: string;
  subtitle: string;
  at: string;
};

type ClusterSnapshot = { intensity: HotspotIntensity; total: number; resolved: number };

const MAX_ALERTS = 8;

const TONE_STYLE: Record<AlertTone, { icon: typeof AlertTriangle; iconColor: string; iconBg: string }> = {
  critical: { icon: AlertTriangle, iconColor: '#dc2626', iconBg: '#fde8e8' },
  warning: { icon: TrendingUp, iconColor: '#d97706', iconBg: '#fef3e2' },
  success: { icon: CheckCircle2, iconColor: '#1B6B3A', iconBg: '#eaf6ef' },
};

// Takes the *unfiltered* (all reports, all time) cluster set — see
// WasteHotspots.tsx — and diffs it against the previous snapshot on every
// change to surface what actually happened since the last render: a hotspot
// crossing into Critical, a burst of new reports at an existing one, or a
// hotspot going fully resolved. There's no dedicated "hotspot events" table
// in the database, so this reconstructs that feed from the same live
// `reports` stream ReportsContext already subscribes to.
export function useHotspotAlerts(clusters: HotspotCluster[]): HotspotAlert[] {
  const [alerts, setAlerts] = useState<HotspotAlert[]>([]);
  const prevRef = useRef<Map<string, ClusterSnapshot> | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    const next = new Map<string, ClusterSnapshot>();
    const fresh: HotspotAlert[] = [];
    const now = new Date().toISOString();

    for (const c of clusters) {
      const resolvedCount = c.reports.filter((r) => r.status === 'resolved').length;
      const snapshot: ClusterSnapshot = { intensity: c.intensity, total: c.totalComplaints, resolved: resolvedCount };
      next.set(c.cellKey, snapshot);

      // First run just establishes the baseline — nothing "changed" yet, so
      // no alerts fire on initial load (only on real subsequent updates).
      if (!prev) continue;

      const before = prev.get(c.cellKey);

      if (!before) {
        if (c.intensity === 'Critical' || c.intensity === 'High') {
          fresh.push({
            id: `${c.cellKey}-new-${now}`,
            tone: c.intensity === 'Critical' ? 'critical' : 'warning',
            title: `New ${c.intensity.toLowerCase()} priority hotspot detected near ${c.locality}`,
            subtitle: c.category,
            at: now,
          });
        }
        continue;
      }

      if (before.intensity !== 'Critical' && c.intensity === 'Critical') {
        fresh.push({
          id: `${c.cellKey}-critical-${now}`,
          tone: 'critical',
          title: `${c.locality} escalated to a critical hotspot`,
          subtitle: `${c.totalComplaints} complaints total`,
          at: now,
        });
      } else if (c.totalComplaints - before.total >= 2) {
        fresh.push({
          id: `${c.cellKey}-increase-${now}`,
          tone: 'warning',
          title: `Increase in ${c.category.toLowerCase()} reports near ${c.locality}`,
          subtitle: `+${c.totalComplaints - before.total} new reports`,
          at: now,
        });
      }

      const justFullyResolved = resolvedCount === c.totalComplaints && before.resolved !== before.total;
      if (justFullyResolved) {
        fresh.push({
          id: `${c.cellKey}-cleared-${now}`,
          tone: 'success',
          title: `Hotspot cleared: ${c.locality}`,
          subtitle: `All ${c.totalComplaints} complaints resolved`,
          at: now,
        });
      }
    }

    prevRef.current = next;
    if (fresh.length > 0) {
      setAlerts((old) => [...fresh, ...old].slice(0, MAX_ALERTS));
    }
  }, [clusters]);

  return alerts;
}

export function RecentHotspotAlerts({ alerts }: { alerts: HotspotAlert[] }) {
  if (alerts.length === 0) {
    return (
      <p className="py-6 text-center text-[12px] text-slate-400">
        No alerts yet — this updates live as new hotspots emerge or clear.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((a) => {
        const style = TONE_STYLE[a.tone];
        const Icon = style.icon;
        return (
          <div key={a.id} className="flex items-start gap-2.5">
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: style.iconBg }}>
              <Icon size={13} style={{ color: style.iconColor }} />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium leading-snug text-slate-700 dark:text-slate-200">{a.title}</p>
              <p className="text-[11px] text-slate-400">
                {a.subtitle} &middot; {formatRelativeTime(a.at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
