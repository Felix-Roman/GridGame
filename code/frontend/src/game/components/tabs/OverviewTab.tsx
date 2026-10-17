// OverviewTab.tsx
// The Overview tab the old Main Monitor, The top group shows what the
// browser already knows about your grid. The bottom group lists values that
// will come from the simulation engine, until then they show a dash instead
// of made-up numbers.

// formatMoney turns 300 into $300; ResourceState is the type for owned assets
import { formatMoney, type ResourceState } from '../../types';

// The component, It receives the owned assets and the income per second
export default function OverviewTab({ resources, incomePerSecond }: { resources: ResourceState; incomePerSecond: number }) {
  // Tiles with real values: a label and the value to show
  const known = [
    { label: 'Wind turbines', value: resources.windUnits },                              // owned wind units
    { label: 'Hydro generators', value: resources.hydroUnits },                          // owned hydro units
    { label: 'Customers', value: resources.customerUnits },                              // connected customers (being players)
    { label: 'Battery capacity', value: resources.storageUnits.toLocaleString('en-US') }, // with a thousands comma
    { label: 'Grid inertia', value: (resources.hydroUnits * 0.01).toFixed(2) },          // 0.01 per hydro unit
    { label: 'Income', value: `${formatMoney(incomePerSecond)}/s` },                     // e.g. $300/s
  ];
  // Labels for values the engine will provide later
  const pending = ['Total generation', 'Total load', 'Energy delivered', 'Net cost', 'Wasted energy', 'Time of day'];

  return (
    // Fragment: returns several elements without a wrapper
    <>
      {/* Tab heading */}
      <div className="gg-tabpanel-head"><h2>Overview</h2></div>
      {/* First group heading */}
      <h3 className="gg-section-title">Your grid</h3>
      {/* Grid of tiles that fills as many columns as fit */}
      <div className="gg-tiles">
        {/* One tile per known value */}
        {known.map((t) => (
          // Label on top, big value below.
          <div className="gg-tile" key={t.label}><span>{t.label}</span><strong>{t.value}</strong></div>
        ))}
      </div>
      {/* Second group heading */}
      <h3 className="gg-section-title">From the simulation engine</h3>
      {/* Grid of placeholder tiles */}
      <div className="gg-tiles">
        {/* One tile per pending value */}
        {pending.map((label) => (
          // pending dims the value
          <div className="gg-tile pending" key={label}>
            {/* Label */}
            <span>{label}</span>
            {/* A dash on screen, screen readers hear Not available yet instead */}
            <strong aria-label="Not available yet">—</strong>
          </div>
        ))}
      </div>
    </>
  );
}
