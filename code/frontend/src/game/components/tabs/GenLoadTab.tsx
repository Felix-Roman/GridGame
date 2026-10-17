// =============================================================================
// GenLoadTab.tsx
// The Generation & load tab. Three chart frames with the same series names as
// GridGame2017's graphs, ready for the engine to feed data into. For now each
// frame shows a legend and an empty plot area with a short message.
// =============================================================================

// The three charts: a title, plus a list of [series name, line color] pairs for the legend.
const charts = [
  // Generation sources.
  {
    title: 'Generation',
    series: [['Base', '#e4ebf1'], ['Renewable', 'var(--wind)'], ['Purchased', 'var(--ok)'], ['Storage', 'var(--storage)']],
  },
  // Load types.
  {
    title: 'Loads',
    series: [['Commercial', '#e4ebf1'], ['Residential', 'var(--customer)'], ['Industrial (DR)', 'var(--signal)']],
  },
  // Grid quality measures.
  {
    title: 'Grid quality',
    series: [['Frequency error', '#e4ebf1'], ['Phase error', 'var(--trip)'], ['Quality', 'var(--ok)']],
  },
// Closes charts.
];

// The component (it needs no props).
export default function GenLoadTab() {
  // Draws the tab.
  return (
    // Fragment: returns several elements without a wrapper.
    <>
      {/* Tab heading. "&amp;" is how an "&" is written inside JSX text. */}
      <div className="gg-tabpanel-head"><h2>Generation &amp; load</h2></div>
      {/* One frame per chart. */}
      {charts.map((c) => (
        // The frame, named for screen readers (e.g. "Generation chart").
        <section className="gg-shell" key={c.title} aria-label={`${c.title} chart`}>
          {/* Header: title on the left, legend on the right. */}
          <div className="gg-shell-head">
            {/* Chart title. */}
            <h3>{c.title}</h3>
            {/* Legend list. */}
            <ul className="gg-legend">
              {/* One entry per series. [name, color] unpacks the pair. */}
              {c.series.map(([name, color]) => (
                // The colored swatch (its color is passed in as the --c CSS variable) and the series name.
                <li key={name}><i style={{ ['--c' as string]: color }} />{name}</li>
              ))}
            </ul>
          </div>
          {/* Empty plot area with grid lines and a message. */}
          <div className="gg-plot">The live chart starts once the engine sends {c.title.toLowerCase()} data.</div>
        </section>
      ))}
    </>
  // Closes the return statement.
  );
// Closes GenLoadTab.
}
