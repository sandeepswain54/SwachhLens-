import type { ReactNode } from 'react';

export function Card({
  title,
  action,
  className = '',
  children,
}: {
  title?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/70 bg-white p-5 shadow-card dark:border-white/10 dark:bg-[#111814] ${className}`}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
