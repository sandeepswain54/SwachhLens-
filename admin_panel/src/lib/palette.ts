// Validated against the dataviz skill's default palette
// (node scripts/validate_palette.js) — see admin_panel/DASHBOARD.md for the
// exact runs. Do not hand-pick replacement hues without re-validating.

// Fixed status scale — reserved meaning, never reused for series identity.
export const STATUS_COLOR = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const;

export const SEVERITY_COLOR: Record<'Low' | 'Medium' | 'High' | 'Critical', string> = {
  Low: STATUS_COLOR.good,
  Medium: STATUS_COLOR.warning,
  High: STATUS_COLOR.serious,
  Critical: STATUS_COLOR.critical,
};

// Categorical slots 1-5 (blue, orange, aqua, yellow, magenta) in the fixed
// order validated for adjacent-pair CVD safety, plus a neutral "Others"
// bucket. Slice order in the donut must stay fixed (not re-sorted by live
// count) so on-screen adjacency always matches this validated sequence.
export const CATEGORY_COLOR: Record<string, string> = {
  'Garbage Dump': '#2a78d6',
  'Overflowing Bin': '#eb6834',
  'Plastic Waste': '#1baf7a',
  'Construction Debris': '#eda100',
  'Drain Blockage': '#e87ba4',
  Others: '#a3a29b',
};

// Trend line series — validated all-pairs safe trio (blue/orange/aqua).
export const TREND_COLOR = {
  total: '#2a78d6',
  active: '#eb6834',
  resolved: '#1baf7a',
} as const;

export const CHART_INK = {
  light: {
    primary: '#0b0b0b',
    secondary: '#52514e',
    muted: '#898781',
    grid: '#e1e0d9',
    axis: '#c3c2b7',
  },
  dark: {
    primary: '#ffffff',
    secondary: '#c3c2b7',
    muted: '#898781',
    grid: '#2c2c2a',
    axis: '#383835',
  },
};
