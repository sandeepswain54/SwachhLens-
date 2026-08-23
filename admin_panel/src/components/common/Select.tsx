import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type SelectOption = { value: string; label: string; disabled?: boolean };

// A fully custom-styled dropdown, used everywhere in place of a native
// <select>. Native <select> popups are painted by the OS/browser chrome —
// `color-scheme` is supposed to theme that popup, but it's unreliable in
// practice (confirmed broken here even with the CSS in place), so this
// renders its own listbox instead, matching the app's theme exactly in
// both light and dark mode. Rendered via a portal + fixed positioning
// (same approach as RowActionMenu) so it never gets clipped by an
// ancestor's overflow:auto.
export function Select({
  value,
  onChange,
  options,
  className = '',
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((o) => o.value === value);

  function toggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    function onDismiss() {
      setOpen(false);
    }
    document.addEventListener('click', onDismiss);
    window.addEventListener('scroll', onDismiss, true);
    window.addEventListener('resize', onDismiss);
    return () => {
      document.removeEventListener('click', onDismiss);
      window.removeEventListener('scroll', onDismiss, true);
      window.removeEventListener('resize', onDismiss);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className={`flex items-center justify-between gap-2 ${className}`}>
        <span className="min-w-0 flex-1 truncate text-left">{selected?.label ?? placeholder ?? ''}</span>
        <ChevronDown size={14} className="shrink-0 text-slate-400" />
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            style={{ position: 'fixed', top: coords.top, left: coords.left, minWidth: coords.width }}
            onClick={(e) => e.stopPropagation()}
            className="z-[1200] max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-[#1a231d]">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 whitespace-nowrap px-3 py-2 text-left text-[13px] hover:bg-slate-50 disabled:opacity-40 dark:hover:bg-white/5 ${
                  opt.value === value
                    ? 'font-semibold text-brand-600 dark:text-brand-400'
                    : 'text-slate-600 dark:text-slate-300'
                }`}>
                {opt.label}
                {opt.value === value && <Check size={13} className="shrink-0" />}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
