// Stored energy in the microgrid's internal battery. Capacity comes from
// the player's storage units, so buying storage visibly grows the cell's range.

export default function BatteryMeter({ energy, capacity }: { energy: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(100, Math.max(0, (energy / capacity) * 100)) : 0;

  return (
    <section className="gg-card gg-battery" aria-labelledby="battery-title">
      <div className="gg-card-head">
        <h3 id="battery-title">Stored energy</h3>
      </div>
      <div className="gg-battery-body">
        <div
          className="gg-cell"
          role="meter"
          aria-labelledby="battery-title"
          aria-valuemin={0}
          aria-valuemax={capacity}
          aria-valuenow={Math.round(energy)}
          aria-valuetext={`${Math.round(energy)} of ${capacity}, ${Math.round(pct)} percent`}
        >
          <div className="gg-cell-fill" style={{ height: `max(0px, calc(${pct}% - 6px))` }} />
          <div className="gg-cell-lines" aria-hidden="true"><i /><i /><i /></div>
        </div>
        <div className="gg-battery-stats">
          <span className="big">{energy.toFixed(0)}</span>
          <span className="of">of {capacity.toLocaleString('en-US')} capacity</span>
          <span className="pct">{pct.toFixed(0)}% full</span>
        </div>
      </div>
    </section>
  );
}
