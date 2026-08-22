import { Calendar, ExternalLink, MapPin, Tag, User } from 'lucide-react';
import type { ReactNode } from 'react';

import type { ProfileRow } from '@/lib/profiles';
import { formatAbsoluteDateTime, type ReportRow } from '@/lib/reports';

function Field({
  icon: Icon,
  label,
  value,
  extra,
}: {
  icon: typeof User;
  label: string;
  value: string;
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">{value}</p>
        {extra}
      </div>
    </div>
  );
}

export function DetailsTab({ report, reporter }: { report: ReportRow; reporter: ProfileRow | undefined }) {
  const mapsUrl = `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl bg-slate-100 dark:bg-white/5">
        {report.media_type === 'image' ? (
          <img src={report.media_url} alt={report.category} className="h-52 w-full object-cover" />
        ) : (
          <video src={report.media_url} controls className="h-52 w-full object-cover" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        <Field icon={Tag} label="Type" value={report.category} />
        <Field icon={User} label="Reported By" value={reporter?.full_name ?? 'SwachhLens User'} />
        <Field
          icon={MapPin}
          label="Location"
          value={report.address}
          extra={
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:underline">
              View on Map <ExternalLink size={10} />
            </a>
          }
        />
        <Field icon={Calendar} label="Reported At" value={formatAbsoluteDateTime(report.created_at)} />
      </div>

      <div>
        <p className="mb-1 text-[11px] text-slate-400">Description</p>
        <p className="rounded-lg bg-slate-50 p-3 text-[13px] text-slate-600 dark:bg-white/5 dark:text-slate-300">
          {report.comments || 'No additional description provided.'}
        </p>
      </div>
    </div>
  );
}
