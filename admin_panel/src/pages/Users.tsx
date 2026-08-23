import { Ban, ClipboardList, ShieldCheck, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';

import { AIStatCard } from '@/components/ai-analytics/AIStatCard';
import { Card } from '@/components/dashboard/Card';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { Topbar } from '@/components/layout/Topbar';
import { RecentUserActivityTable } from '@/components/users/RecentUserActivityTable';
import { UserTypeOverviewList } from '@/components/users/UserTypeOverviewList';
import { UsersByStatusChart } from '@/components/users/UsersByStatusChart';
import { UsersTable } from '@/components/users/UsersTable';
import { useProfiles } from '@/contexts/ProfilesContext';
import { useReports } from '@/contexts/ReportsContext';
import { useTeams } from '@/contexts/TeamsContext';
import {
  buildUserRows,
  computeRecentUserActivity,
  computeUserTypeDistribution,
  computeUserTypeOverview,
  computeUserWeekOverWeek,
  computeUsersByStatusBars,
} from '@/lib/users-stats';

export default function Users() {
  const { reports } = useReports();
  const { teams, activity: teamActivity } = useTeams();
  const { profiles, authMeta, loading, error, activity: profileActivity } = useProfiles();

  const [searchQuery, setSearchQuery] = useState('');

  const users = useMemo(() => buildUserRows(profiles, teams, reports, authMeta), [profiles, teams, reports, authMeta]);
  const weekDelta = useMemo(() => computeUserWeekOverWeek(users), [users]);
  const distribution = useMemo(() => computeUserTypeDistribution(users), [users]);
  const statusBars = useMemo(() => computeUsersByStatusBars(users), [users]);
  const typeOverview = useMemo(() => computeUserTypeOverview(users), [users]);
  const recentActivity = useMemo(
    () => computeRecentUserActivity(profileActivity, teamActivity, reports, profiles, 8),
    [profileActivity, teamActivity, reports, profiles]
  );

  return (
    <div className="flex min-h-full flex-col">
      <Topbar
        title="Users"
        breadcrumb={['Dashboard', 'Users', 'All Users']}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search users..."
      />

      <div className="flex-1 space-y-4 p-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            Couldn't load users: {error}.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AIStatCard
            label="Total Users"
            value={weekDelta.total.value.toLocaleString()}
            icon={UsersRound}
            iconBg="#eaf6ef"
            iconColor="#1B6B3A"
            deltaPercent={weekDelta.total.deltaPercent}
          />
          <AIStatCard
            label="Citizen Users"
            value={weekDelta.citizen.value.toLocaleString()}
            icon={ClipboardList}
            iconBg="#e8f0fe"
            iconColor="#2563eb"
            deltaPercent={weekDelta.citizen.deltaPercent}
          />
          <AIStatCard
            label="Field Team Users"
            value={weekDelta.fieldTeam.value.toLocaleString()}
            icon={ShieldCheck}
            iconBg="#fef3e2"
            iconColor="#d97706"
            deltaPercent={weekDelta.fieldTeam.deltaPercent}
          />
          <AIStatCard
            label="Blocked Users"
            value={weekDelta.blocked.value.toLocaleString()}
            icon={Ban}
            iconBg="#fde8e8"
            iconColor="#dc2626"
            deltaPercent={weekDelta.blocked.deltaPercent}
            deltaCaption="from last week"
          />
        </div>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
          {/* Recent User Activity lives inside this stacked left column (not
              as its own row below) so it starts right after the table
              instead of waiting on the taller right column's height. */}
          <div className="flex flex-col gap-4 xl:col-span-8">
            <Card title="All Users">
              <UsersTable users={users} search={searchQuery} />
            </Card>

            <Card title="Recent User Activity">
              <RecentUserActivityTable items={recentActivity} />
            </Card>
          </div>

          <div className="flex flex-col gap-4 xl:col-span-4">
            <Card title="User Distribution">
              <DonutChart data={distribution} centerValue={users.length} centerLabel="Total" />
            </Card>

            <Card title="Users by Status">
              <UsersByStatusChart data={statusBars} />
            </Card>

            <Card title="User Type Overview">
              <UserTypeOverviewList rows={typeOverview} />
            </Card>
          </div>
        </div>

        {loading && <p className="text-center text-[12px] text-slate-400">Loading users…</p>}
      </div>
    </div>
  );
}
