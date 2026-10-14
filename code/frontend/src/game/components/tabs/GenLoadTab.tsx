// Generation / load details. Chart shells with the series names from
// GridGame2017, ready for the engine to feed data into.

const charts = [
  {
    title: 'Generation',
    series: [['Base', '#e4ebf1'], ['Renewable', 'var(--wind)'], ['Purchased', 'var(--ok)'], ['Storage', 'var(--storage)']],
  },
  {
    title: 'Loads',
    series: [['Commercial', '#e4ebf1'], ['Residential', 'var(--customer)'], ['Industrial (DR)', 'var(--signal)']],
  },
  {
    title: 'Grid quality',
    series: [['Frequency error', '#e4ebf1'], ['Phase error', 'var(--trip)'], ['Quality', 'var(--ok)']],
  },
];

export default function GenLoadTab() {
  return (
    <>
      <div className="gg-tabpanel-head"><h2>Generation &amp; load</h2></div>
      {charts.map((c) => (
        <section className="gg-shell" key={c.title} aria-label={`${c.title} chart`}>
          <div className="gg-shell-head">
            <h3>{c.title}</h3>
            <ul className="gg-legend">
              {c.series.map(([name, color]) => (
                <li key={name}><i style={{ ['--c' as string]: color }} />{name}</li>
              ))}
            </ul>
          </div>
          <div className="gg-plot">The live chart starts once the engine sends {c.title.toLowerCase()} data.</div>
        </section>
      ))}
    </>
  );
}
