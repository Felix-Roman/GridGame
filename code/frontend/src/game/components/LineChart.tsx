// =============================================================================
// LineChart.tsx
// A tiny live line chart drawn with SVG so no chart library needed
// Each series is a list of numbers, oldest first, one per second
// =============================================================================

export type Series = { name: string; color: string; values: number[] };

type Props = {
  series: Series[];
  unit: string;
  minY?: number;
  maxY?: number;
  reference?: number;
  decimals?: number;
  points: number;
};

const W = 400, H = 120; // SVG coordinate size; the chart stretches to fill its box

export default function LineChart({ series, unit, minY, maxY, reference, decimals = 0, points }: Props) {
  const all = series.flatMap((s) => s.values);
  if (all.length === 0) return <div className="gg-plot">Collecting data… the chart fills in as the game runs.</div>;

  // Axis range: fixed if given, otherwise the data's range with a little padding.
  let lo = minY ?? Math.min(...all, reference ?? Infinity);
  let hi = maxY ?? Math.max(...all, reference ?? -Infinity);
  if (hi - lo < 1e-6) { hi += 1; lo -= 1; }
  const pad = minY === undefined && maxY === undefined ? (hi - lo) * 0.08 : 0;
  lo -= pad; hi += pad;

  const x = (i: number, n: number) => W - ((n - 1 - i) / Math.max(1, points - 1)) * W; // newest point at the right edge
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i, vals.length).toFixed(1)},${y(v).toFixed(1)}`).join('');

  return (
    <div className="gg-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Chart: ${series.map((s) => s.name).join(', ')}`}>
        {/* Faint horizontal grid lines at 25 / 50 / 75 %. */}
        {[0.25, 0.5, 0.75].map((f) => <line key={f} className="gg-chart-grid" x1={0} x2={W} y1={H * f} y2={H * f} />)}
        {reference !== undefined && reference > lo && reference < hi && (
          <line className="gg-chart-ref" x1={0} x2={W} y1={y(reference)} y2={y(reference)} />
        )}
        {series.map((s) => (
          <path key={s.name} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        ))}
      </svg>
      {/* Axis labels as normal text so they don't stretch with the SVG. */}
      <span className="gg-chart-y top">{hi.toFixed(decimals)} {unit}</span>
      <span className="gg-chart-y bottom">{lo.toFixed(decimals)} {unit}</span>
      <span className="gg-chart-x">{Math.round(points / 60)} min ago</span>
      <span className="gg-chart-x now">now</span>
    </div>
  );
}
