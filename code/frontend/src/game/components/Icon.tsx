// Small inline icon set so the game has no icon-library dependency.
// All icons are 24x24, stroke-based, and inherit currentColor.

const paths = {
  grid: (
    <>
      <path d="M12 2 22 12 12 22 2 12Z" fill="currentColor" stroke="none" />
      <path d="M7 7l10 10M17 7 7 17M12 2v20M2 12h20" stroke="var(--panel, #1a2733)" strokeWidth="1.2" />
    </>
  ),
  wind: (
    <>
      <path d="M3 8h11a3 3 0 1 0-3-3" />
      <path d="M3 12h16a3 3 0 1 1-3 3" />
      <path d="M3 16h7" />
    </>
  ),
  hydro: <path d="M12 3c3.5 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.5-6.5 6-11Z" />,
  battery: (
    <>
      <rect x="6" y="5" width="12" height="16" rx="2" />
      <path d="M10 2h4M10 13l2-4v3h2l-2 4v-3h-2" />
    </>
  ),
  customer: (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.4 3.6 5.2" />
    </>
  ),
  overview: (
    <>
      <path d="M4 18a8 8 0 1 1 16 0" />
      <path d="M12 18l4-5" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-5 3 3 5-7" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 6v6c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V6Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  market: (
    <>
      <path d="M7 7h12l-3-3M17 17H5l3 3" />
    </>
  ),
  assets: (
    <>
      <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />
    </>
  ),
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  check: <path d="m5 12 5 5 9-10" />,
  diamond: <path d="M12 4 20 12 12 20 4 12Z" />,
  alert: (
    <>
      <path d="M12 3 2 20h20Z" />
      <path d="M12 10v4M12 17v.5" />
    </>
  ),
  plug: (
    <>
      <path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0Z" />
      <path d="M12 17v5" />
    </>
  ),
} as const;

export type IconName = keyof typeof paths;

export default function Icon({ name, title }: { name: IconName; title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {paths[name]}
    </svg>
  );
}

// Status shapes so frequency state never relies on color alone.
export function StatusIcon({ status }: { status: 'stable' | 'drifting' | 'critical' }) {
  const name: IconName = status === 'stable' ? 'check' : status === 'drifting' ? 'diamond' : 'alert';
  return <Icon name={name} />;
}
