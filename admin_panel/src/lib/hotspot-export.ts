import * as XLSX from 'xlsx';

import { formatAbsoluteDateTime } from './reports';
import type { HotspotBandCounts, HotspotCluster, HotspotInsights } from './hotspots';

// The free "xlsx" (SheetJS community) build only writes cell values + column
// widths — no fill/bold styling — but that's enough for a genuinely useful
// .xlsx export: real columns, real widths, a second summary sheet, opened
// directly in Excel/Sheets rather than a flat .csv dump.
export function exportHotspotsToExcel(params: {
  clusters: HotspotCluster[];
  insights: HotspotInsights;
  bandCounts: HotspotBandCounts;
  dateRangeLabel: string;
}) {
  const { clusters, insights, bandCounts, dateRangeLabel } = params;

  const overviewRows = clusters.map((c) => ({
    'Hotspot ID': c.id,
    Location: c.address,
    Area: c.locality,
    Intensity: c.intensity,
    'Intensity Score': c.intensityScore,
    'Primary Waste Type': c.category,
    'Total Complaints': c.totalComplaints,
    'Weekly Trend': c.trendPercent === null ? 'New' : `${c.trendPercent > 0 ? '+' : ''}${c.trendPercent}%`,
    'Last Reported': formatAbsoluteDateTime(c.lastReportedAt),
    Latitude: Number(c.lat.toFixed(6)),
    Longitude: Number(c.lng.toFixed(6)),
  }));

  const overviewSheet = XLSX.utils.json_to_sheet(overviewRows);
  overviewSheet['!cols'] = [
    { wch: 11 }, // Hotspot ID
    { wch: 40 }, // Location
    { wch: 18 }, // Area
    { wch: 10 }, // Intensity
    { wch: 14 }, // Intensity Score
    { wch: 20 }, // Primary Waste Type
    { wch: 16 }, // Total Complaints
    { wch: 13 }, // Weekly Trend
    { wch: 20 }, // Last Reported
    { wch: 11 }, // Latitude
    { wch: 11 }, // Longitude
  ];
  // Freezes the header row so it stays visible while scrolling — supported
  // by the free build via the sheet view property (Excel/LibreOffice honor
  // it; Google Sheets ignores it harmlessly on import).
  overviewSheet['!freeze'] = { xSplit: 0, ySplit: 1 };

  const totalComplaints = clusters.reduce((sum, c) => sum + c.totalComplaints, 0);

  const summaryRows = [
    { Metric: 'Report generated', Value: formatAbsoluteDateTime(new Date().toISOString()) },
    { Metric: 'Date range', Value: dateRangeLabel },
    { Metric: '', Value: '' },
    { Metric: 'Total hotspots', Value: bandCounts.total },
    { Metric: 'Critical hotspots', Value: bandCounts.Critical },
    { Metric: 'High priority hotspots', Value: bandCounts.High },
    { Metric: 'Medium priority hotspots', Value: bandCounts.Medium },
    { Metric: 'Low priority hotspots', Value: bandCounts.Low },
    { Metric: 'Total complaints across hotspots', Value: totalComplaints },
    { Metric: '', Value: '' },
    { Metric: 'Most common waste type', Value: insights.mostCommonCategory ?? '—' },
    { Metric: 'Peak reporting window', Value: insights.peakTimeLabel ?? '—' },
    { Metric: 'Affected areas', Value: insights.affectedAreas },
    {
      Metric: 'Est. waste volume (AI, approximate)',
      Value:
        insights.estimatedVolumeTons === null
          ? '—'
          : `${insights.estimatedVolumeTons.toFixed(1)} tons (${insights.volumeSampleCount} reports with AI volume data)`,
    },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows, { skipHeader: true });
  summarySheet['!cols'] = [{ wch: 34 }, { wch: 46 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Hotspots Overview');

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `waste-hotspots-report-${stamp}.xlsx`);
}
