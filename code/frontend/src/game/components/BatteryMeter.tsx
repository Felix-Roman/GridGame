// =============================================================================
// BatteryMeter.tsx
// Shows the energy stored in the microgrid's internal battery as a battery
// icon that fills up, plus the numbers next to it. Capacity comes from the
// player's storage units, so buying storage visibly changes how full it looks
// =============================================================================

// The inputs are energy/capacity in kWh and flowKw is actual battery power
// spilledKw is charging power that didn't fit because the battery is full
type Props = { energy: number; capacity: number; flowKw: number; spilledKw: number };

// The component
export default function BatteryMeter({ energy, capacity, flowKw, spilledKw }: Props) {
  // Percent full, clamped to 0..100. If capacity is 0, show 0 instead of dividing by zero
  const pct = capacity > 0 ? Math.min(100, Math.max(0, (energy / capacity) * 100)) : 0;
  // A short status line under the numbers
  const status =
    spilledKw > 0.5 ? { cls: 'spill', text: `Full: losing ${spilledKw.toFixed(0)} kW` }
    : flowKw < -0.5 ? { cls: 'in', text: `Charging ${(-flowKw).toFixed(0)} kW` }
    : flowKw > 0.5 ? { cls: 'out', text: `Supplying ${flowKw.toFixed(0)} kW` }
    : energy < 1 ? { cls: 'spill', text: 'Empty' }
    : { cls: '', text: 'Idle' };

  // Draws the card
  return (
    <section className="gg-card gg-battery" aria-labelledby="battery-title">
      <div className="gg-card-head">
        <h3 id="battery-title">Stored energy</h3>
      </div>
      {/* Battery drawing on the left and numbers on the right */}
      <div className="gg-battery-body">
        {/* The battery outline, role="meter" tells screen readers it shows a level within a range */}
        <div
          // Styled by .gg-cell in game.css
          className="gg-cell"
          // Screen readers announce it as a meter
          role="meter"
          // Named "Stored energy"
          aria-labelledby="battery-title"
          // Lowest possible value
          aria-valuemin={0}
          // Highest possible value
          aria-valuemax={capacity}
          // Current value, rounded
          aria-valuenow={Math.round(energy)}
          // What screen readers actually say
          aria-valuetext={`${Math.round(energy)} of ${capacity}, ${Math.round(pct)} percent`}
        >
          {/* The blue fill, Its height is the percent, minus 6px for the inner padding, never below */}
          <div className={`gg-cell-fill${spilledKw > 0.5 ? ' full' : ''}`} style={{ height: `max(0px, calc(${pct}% - 6px))` }} />
          {/* Three divider lines across the cell */}
          <div className="gg-cell-lines" aria-hidden="true"><i /><i /><i /></div>
        </div>
        <div className="gg-battery-stats">
          {/* Stored energy, no decimals */}
          <span className="big">{energy.toFixed(0)}</span>
          {/* Capacity with a thousands comma */}
          <span className="of">kWh of {capacity.toLocaleString('en-US')}</span>
          {/* Percent full, no decimals */}
          <span className="pct">{pct.toFixed(0)}% full</span>
          {/* What the battery is doing right now. Orange when energy is being lost or it's empty. */}
          <span className={`gg-batt-flow ${status.cls}`} aria-live="polite">{status.text}</span>
        </div>
      </div>
    </section>
  );
}
