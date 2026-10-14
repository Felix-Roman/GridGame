import { formatMoney, type ResourceState } from '../../types';

// Main Monitor. Shows what the client already knows; the rest is marked
// as waiting on the simulation engine instead of showing fake numbers.

export default function OverviewTab({ resources, incomePerSecond }: { resources: ResourceState; incomePerSecond: number }) {
  const known = [
    { label: 'Wind turbines', value: resources.windUnits },
    { label: 'Hydro generators', value: resources.hydroUnits },
    { label: 'Customers', value: resources.customerUnits },
    { label: 'Battery capacity', value: resources.storageUnits.toLocaleString('en-US') },
    { label: 'Grid inertia', value: (resources.hydroUnits * 0.01).toFixed(2) },
    { label: 'Income', value: `${formatMoney(incomePerSecond)}/s` },
  ];
  const pending = ['Total generation', 'Total load', 'Energy delivered', 'Net cost', 'Wasted energy', 'Time of day'];

  return (
    <>
      <div className="gg-tabpanel-head"><h2>Overview</h2></div>
      <h3 className="gg-section-title">Your grid</h3>
      <div className="gg-tiles">
        {known.map((t) => (
          <div className="gg-tile" key={t.label}><span>{t.label}</span><strong>{t.value}</strong></div>
        ))}
      </div>
      <h3 className="gg-section-title">From the simulation engine</h3>
      <div className="gg-tiles">
        {pending.map((label) => (
          <div className="gg-tile pending" key={label}>
            <span>{label}</span>
            <strong aria-label="Not available yet">—</strong>
          </div>
        ))}
      </div>
    </>
  );
}
