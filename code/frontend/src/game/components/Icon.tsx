// =============================================================================
// Icon.tsx
//
// A small built-in icon set, so the game doesn't need an icon library
// Every icon is drawn on a 24x24 grid with lines and uses "currentColor" 
// this means it takes on the text color of whatever it sits inside of
// Change the parent's CSS color and the icon changes with it.
// =============================================================================

// "paths" maps each icon name to the SVG shapes that draw it.
const paths = {
  // GridGame logo, a filled diamond with grid lines drawn over it
  grid: (
    // Fragment so we can return two shapes together
    <>
      <path d="M12 2 22 12 12 22 2 12Z" fill="currentColor" stroke="none" />
      <path d="M7 7l10 10M17 7 7 17M12 2v20M2 12h20" stroke="var(--panel, #1a2733)" strokeWidth="1.2" />
    </>
  ),
  // Wind, three gust lines, two ending in curls
  wind: (
    <>
      <path d="M3 8h11a3 3 0 1 0-3-3" />
      <path d="M3 12h16a3 3 0 1 1-3 3" />
      <path d="M3 16h7" />
    </>
  ),
  // Hydro, a single water drop
  hydro: <path d="M12 3c3.5 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.5-6.5 6-11Z" />,
  // Battery, a rounded rectangle with a terminal on top and a lightning bolt inside
  battery: (
    <>
      <rect x="6" y="5" width="12" height="16" rx="2" />
      <path d="M10 2h4M10 13l2-4v3h2l-2 4v-3h-2" />
    </>
  ),
  // Customer gets a little house
  customer: (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  // Users, two people, used on the "Players" button
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.4 3.6 5.2" />
    </>
  ),
  // Overview tab, a half-circle gauge with a needle
  overview: (
    <>
      <path d="M4 18a8 8 0 1 1 16 0" />
      <path d="M12 18l4-5" />
    </>
  ),
  // Generation & load tab, a line chart
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-5 3 3 5-7" />
    </>
  ),
  // Security tab, a shield with a check mark
  shield: (
    <>
      <path d="M12 3 4 6v6c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V6Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  // Market tab, two arrows pointing opposite ways
  market: (
    <>
      <path d="M7 7h12l-3-3M17 17H5l3 3" />
    </>
  ),
  // Assets tab, a lightning bolt
  assets: (
    <>
      <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />
    </>
  ),
  // Arrow pointing left
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  // Arrow pointing right
  chevronRight: <path d="m9 6 6 6-6 6" />,
  // Check mark
  check: <path d="m5 12 5 5 9-10" />,
  // Diamond outline
  diamond: <path d="M12 4 20 12 12 20 4 12Z" />,
  // Warning triangle
  alert: (
    <>
      <path d="M12 3 2 20h20Z" />
      <path d="M12 10v4M12 17v.5" />
    </>
  ),
  // used for "not connected yet" empty states
  plug: (
    <>
      <path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0Z" />
      <path d="M12 17v5" />
    </>
  ),
} as const;

// A type that only allows real icon names.
export type IconName = keyof typeof paths;

// The Icon component, "name" picks the icon and the optional "title" makes it announced by screen readers
export default function Icon({ name, title }: { name: IconName; title?: string }) {
  // Returns the SVG element
  return (
    <svg
      // Coordinate system
      viewBox="0 0 24 24"
      // Shapes are outlines
      fill="none"
      // Lines use the surrounding text color
      stroke="currentColor"
      // Line thickness of 2 units
      strokeWidth="2"
      // Rounded line ends
      strokeLinecap="round"
      // Rounded corners where lines meet
      strokeLinejoin="round"
      // With no title the icon is decorative so screen readers skip it
      aria-hidden={title ? undefined : true}
      // With a title, screen readers treat it as an image
      role={title ? 'img' : undefined}
    >
      {/* If a title was given, add a <title> element that screen readers read out */}
      {title && <title>{title}</title>}
      {/* Draw the shapes for the requested icon */}
      {paths[name]}
    </svg>
  );
}

// Status shapes, so frequency state never relies on color alone
export function StatusIcon({ status }: { status: 'stable' | 'drifting' | 'critical' }) {
  // Pick the icon name for this status
  const name: IconName = status === 'stable' ? 'check' : status === 'drifting' ? 'diamond' : 'alert';
  // Draw it with the normal Icon component
  return <Icon name={name} />;
}