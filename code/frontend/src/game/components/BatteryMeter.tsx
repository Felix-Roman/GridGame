// =============================================================================
// BatteryMeter.tsx
// Shows the energy stored in the microgrid's internal battery as a battery
// icon that fills up, plus the numbers next to it. Capacity comes from the
// player's storage units, so buying storage visibly changes how full it looks.
// =============================================================================

// The component. energy = how much is stored now, capacity = the battery's maximum.
export default function BatteryMeter({ energy, capacity }: { energy: number; capacity: number }) {
  // Percent full, clamped to 0..100. If capacity is 0, show 0 instead of dividing by zero.
  const pct = capacity > 0 ? Math.min(100, Math.max(0, (energy / capacity) * 100)) : 0;

  // Draws the card.
  return (
    // The card. aria-labelledby names it after the title below.
    <section className="gg-card gg-battery" aria-labelledby="battery-title">
      {/* Card header. */}
      <div className="gg-card-head">
        {/* Card title. */}
        <h3 id="battery-title">Stored energy</h3>
      </div>
      {/* Battery drawing on the left, numbers on the right. */}
      <div className="gg-battery-body">
        {/* The battery outline. role="meter" tells screen readers it shows a level within a range. */}
        <div
          // Styled by .gg-cell in game.css (the terminal nub on top is a CSS ::before).
          className="gg-cell"
          // Screen readers announce it as a meter.
          role="meter"
          // Named "Stored energy".
          aria-labelledby="battery-title"
          // Lowest possible value.
          aria-valuemin={0}
          // Highest possible value.
          aria-valuemax={capacity}
          // Current value, rounded.
          aria-valuenow={Math.round(energy)}
          // What screen readers actually say, e.g. "500 of 1000, 50 percent".
          aria-valuetext={`${Math.round(energy)} of ${capacity}, ${Math.round(pct)} percent`}
        // End of the opening <div> tag.
        >
          {/* The blue fill. Its height is the percent, minus 6px for the inner padding, never below 0. */}
          <div className="gg-cell-fill" style={{ height: `max(0px, calc(${pct}% - 6px))` }} />
          {/* Three divider lines across the cell (decorative, hidden from screen readers). */}
          <div className="gg-cell-lines" aria-hidden="true"><i /><i /><i /></div>
        </div>
        {/* The numbers column. */}
        <div className="gg-battery-stats">
          {/* Stored energy, no decimals. */}
          <span className="big">{energy.toFixed(0)}</span>
          {/* Capacity with a thousands comma, e.g. "of 1,000 capacity". */}
          <span className="of">of {capacity.toLocaleString('en-US')} capacity</span>
          {/* Percent full, no decimals. */}
          <span className="pct">{pct.toFixed(0)}% full</span>
        </div>
      </div>
    </section>
  // Closes the return statement.
  );
// Closes BatteryMeter.
}
