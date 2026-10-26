// =============================================================================
// ControlDeck.tsx
// The always-visible center panel
// FrequencyGauge  (top)
// BatteryMeter and PowerDial  (middle row)
// AutoControl  (bottom)
// It only draws, every number comes from the simulation in Game.tsx, and every
// change (dial, gains, auto switch) is reported back up through callbacks
// =============================================================================

// TypeScript type for { main, sum, rat }
import type { PidGains } from '../types';
// The four pieces of the deck
import FrequencyGauge from './FrequencyGauge';
import BatteryMeter from './BatteryMeter';
import PowerDial from './PowerDial';
import AutoControl from './AutoControl';

// The props (inputs) this component accepts
type Props = {
  frequency: number;
  rocof: number;
  battery: number;
  batteryCapacity: number;
  batteryFlowKw: number;
  spilledKw: number;
  dial: number;
  autoOn: boolean;
  gains: PidGains;
  onDialChange: (kw: number) => void;
  onGainsChange: (g: PidGains) => void;
  onToggleAuto: () => void;
};

// The component
export default function ControlDeck(p: Props) {
  // Draws the panel
  return (
    <main className="gg-panel gg-deck" aria-label="Control deck">
      {/* the frequency gauge and ROCOF */}
      <FrequencyGauge frequency={p.frequency} rocof={p.rocof} />
      {/* battery and dial side by side */}
      <div className="gg-deck-row">
        {/* Battery, sized against the purchased capacity */}
        <BatteryMeter energy={p.battery} capacity={p.batteryCapacity} flowKw={p.batteryFlowKw} spilledKw={p.spilledKw} />
        {/* Power dial. Locked (read-only) while automatic control is turning it */}
        <PowerDial
          value={Math.round(p.dial)}
          onChange={p.onDialChange}
          locked={p.autoOn}
          flowKw={p.batteryFlowKw}
          spilledKw={p.spilledKw}
        />
      </div>
      {/* automatic control */}
      <AutoControl gains={p.gains} isOn={p.autoOn} onGainsChange={p.onGainsChange} onToggle={p.onToggleAuto} />
    </main>
  );
}
