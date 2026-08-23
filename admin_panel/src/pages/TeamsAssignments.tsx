import { CheckCircle2, ClipboardList, Plus, Timer, UserCheck, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Card } from '@/components/dashboard/Card';
import { StatCard } from '@/components/dashboard/StatCard';
import { Topbar } from '@/components/layout/Topbar';
import { ActiveAssignmentsTable } from '@/components/teams/ActiveAssignmentsTable';
import { AddTeamModal } from '@/components/teams/AddTeamModal';
import { RecentTeamActivity } from '@/components/teams/RecentTeamActivity';
import { TeamDetailsPanel } from '@/components/teams/TeamDetailsPanel';
import { TeamsTable } from '@/components/teams/TeamsTable';
import { useReports } from '@/contexts/ReportsContext';
import { useTeams } from '@/contexts/TeamsContext';
import { computeAvgResponseHrs, computeTeamStatCounts, computeTeamWeekOverWeek } from '@/lib/team-stats';
import type { TeamRow } from '@/lib/teams';

export default function TeamsAssignments() {
  const { reports } = useReports();
  const { teams, assignments, loading, error, activity } = useTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [addingTeam, setAddingTeam] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link support: the global search (and any other link) can jump
  // straight to a team via /teams?id=<team_id>.
  useEffect(() => {
    const linkedId = searchParams.get('id');
    if (!linkedId || loading) return;
    if (teams.some((t) => t.id === linkedId)) setSelectedTeamId(linkedId);
    setSearchParams(
      (params) => {
        params.delete('id');
        return params;
      },
      { replace: true }
    );
  }, [searchParams, teams, loading, setSearchParams]);

  const counts = useMemo(() => computeTeamStatCounts(teams, assignments), [teams, assignments]);
  const weekDelta = useMemo(() => computeTeamWeekOverWeek(teams, assignments), [teams, assignments]);
  const avgResponseHrs = useMemo(() => computeAvgResponseHrs(assignments, reports), [assignments, reports]);

  const selectedTeam: TeamRow | null = useMemo(
    () => teams.find((t) => t.id === selectedTeamId) ?? null,
    [teams, selectedTeamId]
  );

  return (
    <div className="flex min-h-full flex-col">
      <Topbar
        title="Teams & Assignments"
        subtitle="Manage cleanup teams and complaint assignments"
        action={
          <button
            type="button"
            onClick={() => setAddingTeam(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-600">
            <Plus size={15} /> Add Team
          </button>
        }
      />

      <div className="flex-1 space-y-5 p-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            Couldn't load teams: {error}.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total Teams"
            value={counts.totalTeams}
            icon={Users}
            iconBg="#eaf6ef"
            iconColor="#1B6B3A"
            deltaCaption="Active Teams"
          />
          <StatCard
            label="Teams On Duty"
            value={counts.onDuty}
            icon={UserCheck}
            iconBg="#e8f0fe"
            iconColor="#2563eb"
            deltaPercent={weekDelta.onDuty.deltaPercent}
          />
          <StatCard
            label="Active Assignments"
            value={counts.activeAssignments}
            icon={ClipboardList}
            iconBg="#f1ecfd"
            iconColor="#7c3aed"
            deltaPercent={weekDelta.activeAssignments.deltaPercent}
          />
          <StatCard
            label="Completed (This Week)"
            value={counts.completedThisWeek}
            icon={CheckCircle2}
            iconBg="#fef3e2"
            iconColor="#d97706"
            deltaPercent={weekDelta.completedThisWeek.deltaPercent}
          />
          <StatCard
            label="Avg Response Time"
            value={avgResponseHrs === null ? 0 : Number(avgResponseHrs.toFixed(1))}
            icon={Timer}
            iconBg="#fde8e8"
            iconColor="#dc2626"
            deltaCaption={avgResponseHrs === null ? 'No assignments this week' : 'hrs to assign a team'}
          />
        </div>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
          <Card title="All Teams" className="xl:col-span-8">
            <TeamsTable
              teams={teams}
              assignments={assignments}
              selectedTeamId={selectedTeamId}
              onSelectTeam={(t) => setSelectedTeamId(t.id)}
            />
          </Card>

          <div className="xl:col-span-4">
            {selectedTeam ? (
              <TeamDetailsPanel
                team={selectedTeam}
                assignments={assignments}
                reports={reports}
                onClose={() => setSelectedTeamId(null)}
              />
            ) : (
              <Card>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/5">
                    <Users size={19} />
                  </span>
                  <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">No team selected</p>
                  <p className="max-w-[220px] text-[12px] text-slate-400">
                    Click a team in the list (or the eye icon) to see its details, live location, and
                    workload here.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card title="Active Assignments" className="xl:col-span-9">
            <ActiveAssignmentsTable reports={reports} assignments={assignments} teams={teams} />
          </Card>

          <Card title="Recent Activity" className="xl:col-span-3">
            <RecentTeamActivity activity={activity} />
          </Card>
        </div>

        {loading && <p className="text-center text-[12px] text-slate-400">Loading teams…</p>}
      </div>

      {addingTeam && <AddTeamModal onClose={() => setAddingTeam(false)} />}
    </div>
  );
}
