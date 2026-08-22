import type { FieldTask } from './field-tasks';
import { SIZE_KG_ESTIMATE } from './reports';

export type ReportPeriod = 'today' | 'week' | 'month';

export type PeriodRange = {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  label: string;
  deltaCaption: string;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // days since Monday
  const x = startOfDay(d);
  x.setDate(x.getDate() - diff);
  return x;
}

function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

// Every range pairs the selected period with the immediately-preceding
// period of equal length, so "+12% vs last week" etc. are real deltas
// reconstructed from immutable timestamps, not placeholders.
export function getPeriodRange(period: ReportPeriod, now: Date = new Date()): PeriodRange {
  if (period === 'today') {
    const start = startOfDay(now);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 1);
    return { start, end: now, prevStart, prevEnd: start, label: 'Today', deltaCaption: 'vs yesterday' };
  }
  if (period === 'month') {
    const start = startOfMonth(now);
    const prevStart = new Date(start);
    prevStart.setMonth(prevStart.getMonth() - 1);
    return { start, end: now, prevStart, prevEnd: start, label: 'This Month', deltaCaption: 'vs last month' };
  }
  const start = startOfWeek(now);
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - 7);
  return { start, end: now, prevStart, prevEnd: start, label: 'This Week', deltaCaption: 'vs last week' };
}

function inRange(iso: string | null, range: { start: Date; end: Date }): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}

// Same "explicitly an approximation, not a measured weight" estimate used
// for the citizen impact stats and the field Task Details screen — reused
// here rather than reinvented, so every "tons collected" number in the app
// traces back to the same one assumption.
export function kgFor(task: FieldTask): number {
  const size = task.report.analysis?.volume?.size;
  return size ? (SIZE_KG_ESTIMATE[size] ?? 0) : 0;
}

export type Delta = { value: number; deltaPercent: number | null };

function delta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? null : 100;
  return ((curr - prev) / prev) * 100;
}

export type ReportStats = {
  tasksCompleted: Delta;
  tonsCollected: Delta;
  avgResponseHrs: { value: number | null; deltaPercent: number | null };
  urgentCompleted: Delta;
};

export function computeReportStats(tasks: FieldTask[], range: PeriodRange): ReportStats {
  const completed = tasks.filter((t) => t.status === 'completed');
  const curr = completed.filter((t) => inRange(t.completed_at, range));
  const prev = completed.filter((t) => inRange(t.completed_at, { start: range.prevStart, end: range.prevEnd }));

  const currKg = curr.reduce((sum, t) => sum + kgFor(t), 0);
  const prevKg = prev.reduce((sum, t) => sum + kgFor(t), 0);

  function avgResponseHrsFor(list: FieldTask[]): number | null {
    const withTimes = list.filter((t) => t.assigned_at && t.completed_at);
    if (withTimes.length === 0) return null;
    const totalMs = withTimes.reduce(
      (sum, t) => sum + (new Date(t.completed_at as string).getTime() - new Date(t.assigned_at as string).getTime()),
      0
    );
    return totalMs / withTimes.length / 3600000;
  }
  const currResp = avgResponseHrsFor(curr);
  const prevResp = avgResponseHrsFor(prev);

  const currUrgent = curr.filter((t) => t.report.urgency_label === 'Urgent').length;
  const prevUrgent = prev.filter((t) => t.report.urgency_label === 'Urgent').length;

  return {
    tasksCompleted: { value: curr.length, deltaPercent: delta(curr.length, prev.length) },
    tonsCollected: { value: currKg / 1000, deltaPercent: delta(currKg, prevKg) },
    avgResponseHrs: {
      value: currResp,
      deltaPercent: currResp !== null && prevResp !== null ? delta(currResp, prevResp) : null,
    },
    urgentCompleted: { value: currUrgent, deltaPercent: delta(currUrgent, prevUrgent) },
  };
}

export type TrendPoint = { label: string; value: number };

export function computeTrend(tasks: FieldTask[], period: ReportPeriod, range: PeriodRange): TrendPoint[] {
  const completed = tasks.filter((t) => t.status === 'completed' && t.completed_at);

  function countBetween(start: Date, end: Date): number {
    return completed.filter((t) => {
      const ts = new Date(t.completed_at as string).getTime();
      return ts >= start.getTime() && ts < end.getTime();
    }).length;
  }

  if (period === 'today') {
    const labels = ['12am', '4am', '8am', '12pm', '4pm', '8pm'];
    return labels.map((label, i) => {
      const bucketStart = new Date(range.start);
      bucketStart.setHours(i * 4, 0, 0, 0);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setHours(bucketStart.getHours() + 4);
      return { label, value: countBetween(bucketStart, bucketEnd) };
    });
  }

  if (period === 'month') {
    const points: TrendPoint[] = [];
    let weekStart = new Date(range.start);
    let i = 1;
    while (weekStart < range.end && i <= 6) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      points.push({ label: `Week ${i}`, value: countBetween(weekStart, weekEnd) });
      weekStart = weekEnd;
      i += 1;
    }
    return points;
  }

  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return labels.map((label, i) => {
    const dayStart = new Date(range.start);
    dayStart.setDate(dayStart.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return { label, value: countBetween(dayStart, dayEnd) };
  });
}

export type CategoryBucket = { category: string; kg: number; percent: number };

export const CATEGORY_COLOR: Record<string, string> = {
  'Garbage Dump': '#1B6B3A',
  'Overflowing Bin': '#2563eb',
  'Plastic Waste': '#0ea5e9',
  'Construction Debris': '#d97706',
  'Organic Waste': '#65a30d',
  'E-Waste': '#7c3aed',
  'Hazardous Waste': '#c0392b',
  'Drain Blockage': '#0f766e',
};

export function colorForCategory(category: string): string {
  return CATEGORY_COLOR[category] ?? '#6b7770';
}

export function computeCategoryBreakdown(tasks: FieldTask[], range: PeriodRange): CategoryBucket[] {
  const completed = tasks.filter((t) => t.status === 'completed' && inRange(t.completed_at, range));
  const totals = new Map<string, number>();
  completed.forEach((t) => {
    const kg = kgFor(t);
    totals.set(t.report.category, (totals.get(t.report.category) ?? 0) + kg);
  });
  const totalKg = [...totals.values()].reduce((sum, v) => sum + v, 0);
  return [...totals.entries()]
    .map(([category, kg]) => ({ category, kg, percent: totalKg > 0 ? (kg / totalKg) * 100 : 0 }))
    .sort((a, b) => b.kg - a.kg);
}
