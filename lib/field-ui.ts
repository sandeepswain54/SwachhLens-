// Shared badge styling for a report's urgency, used across every field-team
// screen (Home, Task Details, On the Way, Work in Progress, Submitted).
export const PRIORITY_META: Record<string, { label: string; bg: string; text: string }> = {
  Urgent: { label: 'High', bg: '#fce4e1', text: '#c0392b' },
  High: { label: 'Medium', bg: '#fdecd2', text: '#b9770e' },
  Normal: { label: 'Low', bg: '#e3f3ea', text: '#1B6B3A' },
};

export function priorityMeta(urgency: string) {
  return PRIORITY_META[urgency] ?? PRIORITY_META.Normal;
}
