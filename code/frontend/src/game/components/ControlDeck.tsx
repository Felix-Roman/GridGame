import { useEffect, useState } from 'react';
import type { ControlState, PidGains } from '../types';
import FrequencyGauge from './FrequencyGauge';
import BatteryMeter from './BatteryMeter';
import PowerDial from './PowerDial';
import AutoControl from './AutoControl';

// The always-visible center of the game (replaces MiddlePanel).
// Owns the same local state MiddlePanel did and reports it upward through
// onStateChange, so the socket payload is unchanged.

type Props = {
  batteryCapacity: number;
  onStateChange?: (state: Partial<ControlState>) => void;
};

export default function ControlDeck({ batteryCapacity, onStateChange }: Props) {
  // TODO(engine): energy and frequency should come from the simulation engine.
  const [energy] = useState(500);
  const [frequency] = useState(60.0);
  const [gridPower, setGridPower] = useState(100);
  const [gains, setGains] = useState<PidGains>({ main: 200, sum: 10, rat: 0 });
  const [autoOn, setAutoOn] = useState(true);

  useEffect(() => {
    onStateChange?.({ battery: energy, frequency, pid: gains });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [energy, frequency, gains]);

  return (
    <main className="gg-panel gg-deck" aria-label="Control deck">
      <FrequencyGauge frequency={frequency} />
      <div className="gg-deck-row">
        <BatteryMeter energy={energy} capacity={batteryCapacity} />
        <PowerDial value={gridPower} onChange={setGridPower} />
      </div>
      <AutoControl gains={gains} isOn={autoOn} onGainsChange={setGains} onToggle={() => setAutoOn((v) => !v)} />
    </main>
  );
}
