import { Mail, MapPin, Phone, User, Users, X } from 'lucide-react';

import { Card } from '@/components/dashboard/Card';
import { TEAM_STATUS_BADGE } from '@/lib/badges';
import {
  computeTeamLocation,
  computeTeamWorkload,
  computeWeeklyWorkload,
} from '@/lib/team-stats';
import { TEAM_STATUS_LABEL, type AssignmentRow, type TeamRow } from '@/lib/teams';
import type { ReportRow } from '@/lib/reports';

import { TeamMiniMap } from './TeamMiniMap';
import { TeamWorkloadChart } from './TeamWorkloadChart';

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 text-[13px]">
      <Icon size={14} className="shrink-0 text-slate-400" />
      <span className="w-20 shrink-0 text-slate-400">{label}</span>
      <span className="truncate font-medium text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  );
}

export function TeamDetailsPanel({
  team,
  assignments,
  reports,
  onClose,
}: {
  team: TeamRow;
  assignments: AssignmentRow[];
  reports: ReportRow[];
  onClose: () => void;
}) {
  const workload = computeTeamWorkload(team, assignments);
  const weekly = computeWeeklyWorkload(team, assignments);
  const location = computeTeamLocation(team, assignments, reports);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-1 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10">
              <Users size={18} />
            </span>
            <div>
              <p className="text-[12px] text-slate-400">{team.team_code}</p>
              <p className="text-[15px] font-bold text-slate-900 dark:text-white">{team.team_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TEAM_STATUS_BADGE[team.status]}`}>
              {TEAM_STATUS_LABEL[team.status]}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
          <InfoRow icon={User} label="Leader" value={team.leader_name} />
          <InfoRow icon={MapPin} label="Zone" value={team.zone} />
          <InfoRow icon={Users} label="Members" value={`${team.member_count} / ${team.member_capacity}`} />
          <InfoRow icon={Phone} label="Contact" value={team.phone || '—'} />
          <InfoRow icon={Mail} label="Email" value={team.email} />
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[12px]">
            <span className="text-slate-400">Current Workload</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{workload.percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${workload.percent}%` }}
            />
          </div>
        </div>
      </Card>

      <Card title="Team Location" action={<span className="text-[11px] text-slate-400">Realtime</span>}>
        <div className="h-[180px] overflow-hidden rounded-xl">
          <TeamMiniMap center={location.center} points={location.points} />
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          {location.source === 'assignments'
            ? "Centered on this team's currently assigned complaints — updates as assignments change."
            : `No active assignments yet — showing ${team.zone}'s default center.`}
        </p>
      </Card>

      <Card title="Team Workload" action={<span className="text-[12px] text-slate-400">This Week</span>}>
        <TeamWorkloadChart data={weekly} />
      </Card>
    </div>
  );
}
