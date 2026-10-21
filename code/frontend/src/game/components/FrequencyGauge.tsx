// FrequencyGauge.tsx
// Draws 58–62 Hz on a half circle with colored
// zones red/orange/green/orange/red, a needle pointing at the
// current frequency, and a status colored arc from 60 Hz to the reading so
// the size of the error is visible at a glance, Next to it, the number, and a 
// status pill Stable/Drifting/Near trip limit, and a reminder of the lose condition

// Constants and helpers from types.ts, the trip limits, the 60 Hz setpoint, and status lookups.
import { FREQ_MAX, FREQ_MIN, FREQ_SETPOINT, frequencyStatus, statusLabel } from '../types';
// The check/diamond/triangle shape for each status
import { StatusIcon } from './Icon';

// Gauge geometry in SVG units, CX,CY = the needle's pivot point, R = the arc's radius.
const CX = 160, CY = 158, R = 126;
// How many Hz the gauge covers (62 - 58 = 4).
const span = FREQ_MAX - FREQ_MIN;

// Converts Hz to a 0 to 1 position along the arc 58 Hz = 0, 60 Hz = 0.5, 62 Hz = 1, clamped so it never leaves the gauge
const toT = (hz: number) => Math.min(1, Math.max(0, (hz - FREQ_MIN) / span));
// Converts a 0 to 1 position into an x,y point on a circle of radius r around the pivot
const point = (t: number, r = R) => {
  // Angle in radians, t = 0 is the far left pi, t = 1 is the far right 0
  const a = Math.PI * (1 - t);
  // cos gives the horizontal offset, sin the vertical, SVG's y axis points down, so it is subtracted
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const;
};
// Builds an SVG path string for an arc between two frequencies, at radius r.
const arc = (hz0: number, hz1: number, r = R) => {
  // Start point at the lower of the two frequencies
  const [x0, y0] = point(toT(Math.min(hz0, hz1)), r);
  // End point at the higher one
  const [x1, y1] = point(toT(Math.max(hz0, hz1)), r);
  // M moves to the start, A r r 0 0 1 x y draws a clockwise circular arc to the end
  return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
};

// The colored zones, from Hz, to Hz, color, Green is within 0.5 Hz of 60
const zones: [number, number, string][] = [
  [58, 58.5, 'var(--trip)'],               // red: about to trip low
  [58.5, 59.5, 'var(--warn)'],             // orange: drifting low
  [59.5, 60.5, 'var(--ok)'],               // green: stable
  [60.5, 61.5, 'var(--warn)'],             // orange: drifting high
  [61.5, 62, 'var(--trip)'],               // red: about to trip high
];

// The component, It receives the current frequency in Hz
export default function FrequencyGauge({ frequency }: { frequency: number }) {
  // stable, drifting or critical, based on how far from 60 Hz we are
  const status = frequencyStatus(frequency);
  // Position of the current frequency along the arc 0 to 1
  const t = toT(frequency);
  // Needle rotation in degrees, -90 = pointing left 58 Hz, 0 = straight up 60 Hz, +90 = right 62 Hz
  const needleDeg = (t - 0.5) * 180;
  // How far off we are positive = too high, negative = too low
  const error = frequency - FREQ_SETPOINT;

  // Build the tick marks, one every 0.25 Hz, with longer bigger ticks on whole numbers
  const ticks = [];
  // Loop from 58 to 62 in 0.25 steps, the tiny 1e-9 makes sure 62 itself is included despite rounding
  for (let hz = FREQ_MIN; hz <= FREQ_MAX + 1e-9; hz += 0.25) {
    // True when hz is a whole number 58, 59, ...etc.,
    const major = Math.abs(hz - Math.round(hz)) < 1e-6;
    // Outer end of the tick, just inside the arc
    const [x0, y0] = point(toT(hz), R - 16);
    // Inner end: Bigger ticks are longer and reach further in
    const [x1, y1] = point(toT(hz), R - (major ? 30 : 24));
    // Add the tick line, Bigger ticks also get the major class for brighter styling.
    ticks.push(<line key={hz} className={`gauge-tick${major ? ' major' : ''}`} x1={x0} y1={y0} x2={x1} y2={y1} />);
  }

  // Draws the card
  return (
    // The card, is-<status> sets the status color used by the glow, the arc and the pill
    <section className={`gg-card gg-freq is-${status}`} aria-labelledby="freq-title">
      {/* The gauge drawing, viewBox leaves margin around the arc for the number labels, Hidden from screen readers, which read the text readout instead */}
      <svg viewBox="-24 -12 368 180" aria-hidden="true">
        {/* Dark background arc across the full range */}
        <path className="gauge-track" d={arc(FREQ_MIN, FREQ_MAX)} />
        {/* The five colored zones, drawn semi transparent on top of the track */}
        {zones.map(([a, b, c]) => (
          // One zone arc, key = its starting Hz
          <path key={a} className="gauge-zone" d={arc(a, b)} stroke={c} opacity={0.35} />
        ))}
        {/* Status colored arc from 60 Hz to the current reading, just outside the track, Skipped when we're basically at 60 */}
        {Math.abs(error) > 0.002 && <path className="gauge-glow" d={arc(FREQ_SETPOINT, frequency, R + 12)} />}
        {/* All the tick marks built above */}
        {ticks}
        {/* Number labels at each whole Hz, placed outside the arc */}
        {[58, 59, 60, 61, 62].map((hz) => {
          // Position of this label
          const [x, y] = point(toT(hz), R + 30);
          return (
            // y + 5 nudges the text down so it is vertically centered on the point, textAnchor centers it horizontally
            <text key={hz} className="gauge-label" x={x} y={y + 5} textAnchor="middle">{hz}</text>
          );
        })}
        {/* The needle, The group rotates around the bottom center of its box, which is the pivot point */}
        <g
          // CSS class adds a springy transition so the needle swings smoothly
          className="gauge-needle"
          // rotate() turns it, transformOrigin 50% 100% + transformBox fill-box = pivot at the line's bottom center
          style={{ transform: `rotate(${needleDeg}deg)`, transformOrigin: '50% 100%', transformBox: 'fill-box' }}
        >
          {/* A vertical line from the pivot up to just inside the arc, the rotation above aims it */}
          <line x1={CX} y1={CY} x2={CX} y2={CY - R + 8} />
        </g>
        {/* The round hub covering the needle's base */}
        <circle className="gauge-hub" cx={CX} cy={CY} r={10} />
      </svg>

      {/* Text readout, aria-live="polite" makes screen readers announce changes when they're idle */}
      <div className="gg-freq-readout" aria-live="polite">
        {/* Card title, also names the whole section via aria-labelled by above */}
        <h3 id="freq-title">Grid frequency</h3>
        {/* The big number, 3 decimal places, followed by a smaller Hz */}
        <div className="gg-freq-value">
          {frequency.toFixed(3)}<small>Hz</small>
        </div>
        {/* The status badge */}
        <span className="status-pill">
          {/* Shape for this status */}
          <StatusIcon status={status} />
          {/* Word for this status Stable, Drifting, Near trip limit */}
          {statusLabel[status]}
          {/* Extra detail only screen readers hear, e.g., -0.800 Hz from 60 */}
          <span className="sr-only">, {error >= 0 ? '+' : ''}{error.toFixed(3)} Hz from 60</span>
        </span>
        {/* Reminder of the lose condition */}
        <p className="gg-freq-note">Keep it near 60 Hz. Below 58 or above 62 trips the grid and ends the game.</p>
      </div>
    </section>
  );
}
