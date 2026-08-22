import type { ReportRow } from './reports';
import type { FeedbackRow } from './feedback';
import type { TeamRow } from './teams';

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export type FeedbackView = {
  feedback: FeedbackRow;
  report: ReportRow | null;
  team: TeamRow | null;
};

export function buildFeedbackViews(feedback: FeedbackRow[], reports: ReportRow[], teams: TeamRow[]): FeedbackView[] {
  const reportById = new Map(reports.map((r) => [r.id, r]));
  const teamById = new Map(teams.map((t) => [t.id, t]));
  return feedback.map((f) => ({
    feedback: f,
    report: reportById.get(f.report_id) ?? null,
    team: f.team_id ? (teamById.get(f.team_id) ?? null) : null,
  }));
}

export type FeedbackStats = {
  total: number;
  avgRating: number | null;
  thisWeekCount: number;
  lowRatingCount: number; // 1-2 stars, worth an admin's attention
};

// Every number here is real: a straight average/count over whatever rows
// have actually been submitted — no synthetic baseline when there's no data
// yet (avgRating is null, not 0, until at least one review exists).
export function computeFeedbackStats(feedback: FeedbackRow[]): FeedbackStats {
  const weekStart = startOfWeek(new Date());
  const total = feedback.length;
  const avgRating = total === 0 ? null : feedback.reduce((sum, f) => sum + f.rating, 0) / total;
  const thisWeekCount = feedback.filter((f) => new Date(f.created_at) >= weekStart).length;
  const lowRatingCount = feedback.filter((f) => f.rating <= 2).length;

  return { total, avgRating, thisWeekCount, lowRatingCount };
}

export type RatingBucket = { rating: number; count: number };

export function computeRatingDistribution(feedback: FeedbackRow[]): RatingBucket[] {
  return [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: feedback.filter((f) => f.rating === rating).length,
  }));
}
