// =============================================================================
// GenLoadTab.tsx
// Live charts of the last 3 minutes 
// where power comes from, where it goes, and how the frequency is behaving
//
// This tab doesn't draw any lines itself
// it receives "history" one snapshot of the grid per second, collected by useGridSim.ts from Game.tsx through OpsPanel.tsx
// =============================================================================


import LineChart, { type Series } from '../LineChart';
import type { HistoryPoint } from '../../useGridSim';

// How many seconds the x axis covers. useGridSim keeps the same amount (180 points), so the charts are always full width
// 3 minutes at 1 point per second
const POINTS = 180;

// The component. Its only prop is a history or array of HistoryPoint objects
export default function GenLoadTab({ history }: { history: HistoryPoint[] }) {
  // A small helper that pulls one value out of every history point, making one line's list of numbers
  const col = (f: (p: HistoryPoint) => number) => history.map(f);

  // The four charts, described as data
  const charts: { title: string; unit: string; series: Series[]; minY?: number; maxY?: number; reference?: number; decimals?: number; note?: string }[] = [
    {
      // Heading.
      title: 'Generation',
      // Axis unit.
      unit: 'kW',
      // Four lines
      series: [
        // Power from hydro generators each second
        { name: 'Hydro', color: 'var(--hydro)', values: col((p) => p.hydroKw) },
        // Power from wind turbines this one wiggles with the wind
        { name: 'Wind', color: 'var(--wind)', values: col((p) => p.windKw) },
        // Power bought from other players on the Market
        { name: 'Purchased', color: 'var(--ok)', values: col((p) => p.purchasedKw) },
        // Power the battery is supplying to the grid
        { name: 'Battery out', color: 'var(--signal)', values: col((p) => p.batteryOutKw) },
      ],
      minY: 0,
    },
    {
      // Heading
      title: 'Loads',
      // Axis unit
      unit: 'kW',
      // Three lines
      series: [
        // What the customers are using
        { name: 'Customers', color: 'var(--customer)', values: col((p) => p.loadKw) },
        // Power you're sending to other players through Market contracts
        { name: 'Sold', color: 'var(--ok)', values: col((p) => p.soldKw) },
        // Power going into the battery
        { name: 'Battery charging', color: 'var(--storage)', values: col((p) => p.batteryInKw) },
      ],
      minY: 0,
    },
    {
      // Heading
      title: 'Grid frequency',
      // Axis unit
      unit: 'Hz',
      // One line
      series: [{ name: 'Frequency', color: '#e4ebf1', values: col((p) => p.frequency) }],
      // The axis always shows exactly 58–62 Hz
      minY: 58,
      maxY: 62,
      // A dashed line at 60 Hz
      reference: 60,
      // Axis labels as whole numbers ("62 Hz", "58 Hz")
      decimals: 0,
      // Reminder added to the legend
      note: 'Trips at 58 and 62 Hz',
    },
    {
      // Heading
      title: 'Rate of change of frequency',
      // Axis unit
      unit: 'Hz/s',
      series: [{ name: 'ROCOF', color: 'var(--warn)', values: col((p) => p.rocof) }],
      reference: 0,
      // ROCOF values are small, so show 2 decimal places
      decimals: 2,
    },
  ];

  // Draws the tab
  return (
    <>
      <div className="gg-tabpanel-head"><h2>Generation &amp; load</h2></div>
      {/* One section per chart: .map turns each chart description "c" into markup. */}
      {charts.map((c) => (
        // The frame around one chart and key is its title
        // aria-label names the section for screen readers
        <section className="gg-shell" key={c.title} aria-label={`${c.title} chart`}>
          <div className="gg-shell-head">
            <h3>{c.title}</h3>
            <ul className="gg-legend">
              {c.series.map((s) => (
                <li key={s.name}><i style={{ ['--c' as string]: s.color }} />{s.name}</li>
              ))}
              {c.note && <li>{c.note}</li>}
            </ul>
          </div>
          <LineChart series={c.series} unit={c.unit} minY={c.minY} maxY={c.maxY} reference={c.reference} decimals={c.decimals} points={POINTS} />
        </section>
      ))}
    </>
  );
}