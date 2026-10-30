// =============================================================================
// FrequencyGauge.tsx
// The hero of the control deck
// Draws 58–62 Hz on a half-circle with colored zones (red / orange / green / orange / red)
// a needle pointing at the current frequency, and a status-colored arc from 60 Hz to the reading so the size of the error is visible at a glance
// Next to it is the number, a status pill Stable, Drifting, Near trip limit, and a reminder of the lose condition
// =============================================================================

import { FREQ_MAX, FREQ_MIN, FREQ_SETPOINT, frequencyStatus, statusLabel } from '../types';
import { StatusIcon } from './Icon';

// Gauge geometry in SVG units: CX,CY = the needle's pivot point, R = the arc's radius
const CX = 160, CY = 158, R = 126;

// How many Hz the gauge covers, should be 4 
const span = FREQ_MAX - FREQ_MIN;

// Converts Hz to a position along the arc (58 Hz = 0, 60 Hz = 0.5, 62 Hz = 1) clamped so it never leaves the gauge
const toT = (hz: number) => Math.min(1, Math.max(0, (hz - FREQ_MIN) / span));
// Converts a position into an x,y point on a circle of radius r around the pivot
const point = (t: number, r = R) => {
  // radian math, yuck
  const a = Math.PI * (1 - t);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const;
};

// Builds an SVG path string for an arc between two frequencies, at radius r
const arc = (hz0: number, hz1: number, r = R) => {
  // Start point at the lower of the two frequencies
  const [x0, y0] = point(toT(Math.min(hz0, hz1)), r);
  // End point at the higher one
  const [x1, y1] = point(toT(Math.max(hz0, hz1)), r);
  return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
};

// The colored zones, from Hz, to Hz, color Green is within 0.5 Hz of 60
const zones: [number, number, string][] = [
  [58, 58.5, 'var(--trip)'],
  [58.5, 59.5, 'var(--warn)'],
  [59.5, 60.5, 'var(--ok)'],
  [60.5, 61.5, 'var(--warn)'],
  [61.5, 62, 'var(--trip)'],
];

// frequency in Hz rocof = rate of change of frequency in Hz per second
export default function FrequencyGauge({ frequency, rocof }: { frequency: number; rocof: number }) {
  // 'stable', 'drifting' or 'critical', based on how far from 60 Hz we are
  const status = frequencyStatus(frequency);
  // Position of the current frequency along the arc
  const t = toT(frequency);
  // Needle rotation in degrees: -90 = pointing left (58 Hz), 0 = straight up (60 Hz), +90 = right (62 Hz).
  const needleDeg = (t - 0.5) * 180;
  // How far off we are
  const error = frequency - FREQ_SETPOINT;

  // Build the tick marks, one every 0.25 Hz, with longer "major" ticks on whole numbers
  const ticks = [];
  for (let hz = FREQ_MIN; hz <= FREQ_MAX + 1e-9; hz += 0.25) {
    const major = Math.abs(hz - Math.round(hz)) < 1e-6;
    const [x0, y0] = point(toT(hz), R - 16);
    const [x1, y1] = point(toT(hz), R - (major ? 30 : 24));
    ticks.push(<line key={hz} className={`gauge-tick${major ? ' major' : ''}`} x1={x0} y1={y0} x2={x1} y2={y1} />);
  }

  // Draws the damned card again, sorry I hate this part ~ Michael
  return (
    <section className={`gg-card gg-freq is-${status}`} aria-labelledby="freq-title">
      <svg viewBox="-24 -12 368 180" aria-hidden="true">
        <path className="gauge-track" d={arc(FREQ_MIN, FREQ_MAX)} />
        {zones.map(([a, b, c]) => (
          <path key={a} className="gauge-zone" d={arc(a, b)} stroke={c} opacity={0.35} />
        ))}
        {Math.abs(error) > 0.002 && <path className="gauge-glow" d={arc(FREQ_SETPOINT, frequency, R + 12)} />}
        {ticks}
        {/* Number labels at each whole Hz, placed outside the arc */}
        {[58, 59, 60, 61, 62].map((hz) => {
          // Position of this label
          const [x, y] = point(toT(hz), R + 30);
          // Returns the label text
          return (
            <text key={hz} className="gauge-label" x={x} y={y + 5} textAnchor="middle">{hz}</text>
          // Closes the return
          );
        // Closes the map
        })}
        <g
          className="gauge-needle"
          style={{ transform: `rotate(${needleDeg}deg)`, transformOrigin: '50% 100%', transformBox: 'fill-box' }}
        >
          <line x1={CX} y1={CY} x2={CX} y2={CY - R + 8} />
        </g>
        {/* The round hub covering the needle's base */}
        <circle className="gauge-hub" cx={CX} cy={CY} r={10} />
      </svg>

      <div className="gg-freq-readout" aria-live="polite">
        <h3 id="freq-title">Grid frequency</h3>
        {/* The big number, 3 decimal places, followed by a smaller "Hz" */}
        <div className="gg-freq-value">
          {frequency.toFixed(3)}<small>Hz</small>
        </div>
        {/* The statis badge */}
        <span className="status-pill">
          {/* Shape for this status */}
          <StatusIcon status={status} />
          {statusLabel[status]}
          <span className="sr-only">, {error >= 0 ? '+' : ''}{error.toFixed(3)} Hz from 60</span>
        </span>
        {/* Rate of change of frequency, how fast the needle is moving, and which way */}
        <div className="gg-rocof" title="Rate of change of frequency (ROCOF): how fast the needle is moving">
          <span>ROCOF</span>
          <strong className={Math.abs(rocof) > 0.1 ? 'fast' : undefined}>
            {rocof >= 0 ? '+' : '−'}{Math.abs(rocof).toFixed(3)} Hz/s
          </strong>
        </div>
        {/* Reminder of the lose condition */}
        <p className="gg-freq-note">Keep it near 60 Hz. Below 58 or above 62 trips the grid and ends the game.</p>
      </div>
    </section>
  );
}
