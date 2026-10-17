// =============================================================================
// ControlDeck.tsx
// The always-visible center panel (replaces the old MiddlePanel). It stacks:
//   1. FrequencyGauge  (top)
//   2. BatteryMeter + PowerDial  (middle row)
//   3. AutoControl  (bottom)
// It owns the same local state MiddlePanel did and reports it upward through
// onStateChange, so Game.tsx can forward it to the server unchanged.
// =============================================================================

// useEffect runs code after a render; useState stores values that redraw the panel when they change.
import { useEffect, useState } from 'react';
// TypeScript types: ControlState = what we report upward, PidGains = { main, sum, rat }.
import type { ControlState, PidGains } from '../types';
// The four pieces of the deck.
import FrequencyGauge from './FrequencyGauge';
import BatteryMeter from './BatteryMeter';
import PowerDial from './PowerDial';
import AutoControl from './AutoControl';

// The props (inputs) this component accepts.
type Props = {
  batteryCapacity: number;                                   // battery size, from purchased storage
  onStateChange?: (state: Partial<ControlState>) => void;    // optional: called when battery, frequency or gains change
// Closes Props.
};

// The component.
export default function ControlDeck({ batteryCapacity, onStateChange }: Props) {
  // TODO(engine): energy and frequency should come from the simulation engine.
  // Stored battery energy. Fixed at 500 for now (no setter until the engine drives it).
  const [energy] = useState(500);
  // Grid frequency in Hz. Fixed at 60 for now (no setter until the engine drives it).
  const [frequency] = useState(60.0);
  // The power dial's setting, -1000..1000. Starts at 100.
  const [gridPower, setGridPower] = useState(100);
  // The automatic control gains. Defaults match GridGame2017 (Main 200, Sum 10, Rate 0).
  const [gains, setGains] = useState<PidGains>({ main: 200, sum: 10, rat: 0 });
  // Whether automatic control is on.
  const [autoOn, setAutoOn] = useState(true);

  // Whenever energy, frequency or gains change, report them to Game.tsx (which sends them to the server).
  useEffect(() => {
    // "?." only calls onStateChange if it was provided.
    onStateChange?.({ battery: energy, frequency, pid: gains });
    // The list below says when to re-run: only when one of these three values changes.
    // onStateChange is deliberately left out, because Game.tsx creates a new function every render
    // and including it would re-send constantly. The next line tells the linter that is on purpose
    // (it must stay directly above the "}, [...]" line to work).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [energy, frequency, gains]);

  // Draws the panel.
  return (
    // <main> marks this as the page's main content for screen readers. The classes make it a 3-row grid (see game.css).
    <main className="gg-panel gg-deck" aria-label="Control deck">
      {/* Row 1: the frequency gauge. */}
      <FrequencyGauge frequency={frequency} />
      {/* Row 2: battery and dial side by side. */}
      <div className="gg-deck-row">
        {/* Battery, sized against the purchased capacity. */}
        <BatteryMeter energy={energy} capacity={batteryCapacity} />
        {/* Power dial. Turning it calls setGridPower with the new value. */}
        <PowerDial value={gridPower} onChange={setGridPower} />
      </div>
      {/* Row 3: automatic control. Editing gains calls setGains; the switch flips autoOn. */}
      <AutoControl gains={gains} isOn={autoOn} onGainsChange={setGains} onToggle={() => setAutoOn((v) => !v)} />
    </main>
  // Closes the return statement.
  );
// Closes ControlDeck.
}