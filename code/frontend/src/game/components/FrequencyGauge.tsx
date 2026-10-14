import { FREQ_MAX, FREQ_MIN, FREQ_SETPOINT, frequencyStatus, statusLabel } from '../types';
import { StatusIcon } from './Icon';

// The hero of the control deck. Shows 58–62 Hz on a half-circle with the
// stable band in the middle, and draws a colored arc from 60 Hz to the
// current reading so the size of the error is visible at a glance.

const CX = 160, CY = 158, R = 126;
const span = FREQ_MAX - FREQ_MIN;

const toT = (hz: number) => Math.min(1, Math.max(0, (hz - FREQ_MIN) / span));
const point = (t: number, r = R) => {
  const a = Math.PI * (1 - t);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const;
};
const arc = (hz0: number, hz1: number, r = R) => {
  const [x0, y0] = point(toT(Math.min(hz0, hz1)), r);
  const [x1, y1] = point(toT(Math.max(hz0, hz1)), r);
  return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
};

const zones: [number, number, string][] = [
  [58, 58.5, 'var(--trip)'],
  [58.5, 59.5, 'var(--warn)'],
  [59.5, 60.5, 'var(--ok)'],
  [60.5, 61.5, 'var(--warn)'],
  [61.5, 62, 'var(--trip)'],
];

export default function FrequencyGauge({ frequency }: { frequency: number }) {
  const status = frequencyStatus(frequency);
  const t = toT(frequency);
  const needleDeg = (t - 0.5) * 180;
  const error = frequency - FREQ_SETPOINT;

  const ticks = [];
  for (let hz = FREQ_MIN; hz <= FREQ_MAX + 1e-9; hz += 0.25) {
    const major = Math.abs(hz - Math.round(hz)) < 1e-6;
    const [x0, y0] = point(toT(hz), R - 16);
    const [x1, y1] = point(toT(hz), R - (major ? 30 : 24));
    ticks.push(<line key={hz} className={`gauge-tick${major ? ' major' : ''}`} x1={x0} y1={y0} x2={x1} y2={y1} />);
  }

  return (
    <section className={`gg-card gg-freq is-${status}`} aria-labelledby="freq-title">
      <svg viewBox="-24 -12 368 180" aria-hidden="true">
        <path className="gauge-track" d={arc(FREQ_MIN, FREQ_MAX)} />
        {zones.map(([a, b, c]) => (
          <path key={a} className="gauge-zone" d={arc(a, b)} stroke={c} opacity={0.35} />
        ))}
        {Math.abs(error) > 0.002 && <path className="gauge-glow" d={arc(FREQ_SETPOINT, frequency, R + 12)} />}
        {ticks}
        {[58, 59, 60, 61, 62].map((hz) => {
          const [x, y] = point(toT(hz), R + 30);
          return (
            <text key={hz} className="gauge-label" x={x} y={y + 5} textAnchor="middle">{hz}</text>
          );
        })}
        <g
          className="gauge-needle"
          style={{ transform: `rotate(${needleDeg}deg)`, transformOrigin: '50% 100%', transformBox: 'fill-box' }}
        >
          <line x1={CX} y1={CY} x2={CX} y2={CY - R + 8} />
        </g>
        <circle className="gauge-hub" cx={CX} cy={CY} r={10} />
      </svg>

      <div className="gg-freq-readout" aria-live="polite">
        <h3 id="freq-title">Grid frequency</h3>
        <div className="gg-freq-value">
          {frequency.toFixed(3)}<small>Hz</small>
        </div>
        <span className="status-pill">
          <StatusIcon status={status} />
          {statusLabel[status]}
          <span className="sr-only">, {error >= 0 ? '+' : ''}{error.toFixed(3)} Hz from 60</span>
        </span>
        <p className="gg-freq-note">Keep it near 60 Hz. Below 58 or above 62 trips the grid and ends the game.</p>
      </div>
    </section>
  );
}
