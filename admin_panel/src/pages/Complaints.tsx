import { ClipboardList } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Card } from '@/components/dashboard/Card';
import { ComplaintDetailsPanel, type PanelTab } from '@/components/complaints/ComplaintDetailsPanel';
import { ComplaintsTable } from '@/components/complaints/ComplaintsTable';
import { Topbar } from '@/components/layout/Topbar';
import { useReports } from '@/contexts/ReportsContext';
import { useTeams } from '@/contexts/TeamsContext';
import { useVehicles } from '@/contexts/VehiclesContext';
import type { ProfileRow } from '@/lib/profiles';

export default function Complaints() {
  const { reports, profiles, loading, error } = useReports();
  const { teams, assignments } = useTeams();
  const { vehicles } = useVehicles();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>('details');
  const [panelNonce, setPanelNonce] = useState(0);

  // Deep-link support: the global search (and any other link) can jump
  // straight to a complaint via /complaints?id=<report_id>.
  useEffect(() => {
    const linkedId = searchParams.get('id');
    if (!linkedId || loading) return;
    const report = reports.find((r) => r.id === linkedId);
    if (report) {
      setSelectedId(report.id);
      setPanelTab('details');
      setPanelNonce((n) => n + 1);
    }
    setSearchParams(
      (params) => {
        params.delete('id');
        return params;
      },
      { replace: true }
    );
  }, [searchParams, reports, loading, setSearchParams]);

  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p] as [string, ProfileRow])), [profiles]);

  const selectedReport = useMemo(() => reports.find((r) => r.id === selectedId) ?? null, [reports, selectedId]);
  const selectedAssignment = useMemo(
    () => (selectedReport ? (assignments.find((a) => a.report_id === selectedReport.id) ?? null) : null),
    [assignments, selectedReport]
  );
  const selectedTeam = useMemo(
    () => (selectedAssignment?.team_id ? (teams.find((t) => t.id === selectedAssignment.team_id) ?? null) : null),
    [teams, selectedAssignment]
  );

  function focusReport(report: (typeof reports)[number], tab: PanelTab) {
    setSelectedId(report.id);
    setPanelTab(tab);
    setPanelNonce((n) => n + 1);
  }

  return (
    <div className="flex min-h-full flex-col">
      <Topbar
        title="Complaints"
        breadcrumb={['Dashboard', 'Complaints', 'All Complaints']}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search complaints by ID, location..."
      />

      <div className="flex-1 space-y-4 p-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            Couldn't load complaints: {error}.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card className="xl:col-span-8">
            <ComplaintsTable
              reports={reports}
              assignments={assignments}
              search={searchQuery}
              selectedId={selectedId}
              onSelect={(report) => focusReport(report, 'details')}
              onAssign={(report) => focusReport(report, 'assignment')}
            />
          </Card>

          <div className="xl:col-span-4">
            {selectedReport ? (
              <ComplaintDetailsPanel
                key={panelNonce}
                report={selectedReport}
                assignment={selectedAssignment}
                team={selectedTeam}
                teams={teams}
                vehicles={vehicles}
                reporter={profileById.get(selectedReport.user_id)}
                escalatedBy={selectedReport.escalated_by ? profileById.get(selectedReport.escalated_by) : undefined}
                initialTab={panelTab}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <Card>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/5">
                    <ClipboardList size={19} />
                  </span>
                  <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">No complaint selected</p>
                  <p className="max-w-[220px] text-[12px] text-slate-400">
                    Click a complaint (or the eye icon) to see its full details, AI analysis, and assignment here.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {loading && <p className="text-center text-[12px] text-slate-400">Loading complaints…</p>}
      </div>
    </div>
  );
}
