// =============================================================================
// AutoControl.tsx
// The Automatic Control card: an On/Off switch and the three PID gains
// Main = Kp (proportional), Sum = Ki (integral), Rate = Kd (derivative)
// See the EE document for what each gain does to the frequency
//
// When automatic control is On, engine.ts turns the battery dial for the user 10 times a second
// Main (Kp): the bigger the error RIGHT NOW, the harder it pushes
// Sum  (Ki): keeps pushing while a small error lingers, until it's gone
// Rate (Kd): pushes against FAST changes, so the needle doesn't overshoot
// =============================================================================

import type { PidGains } from '../types';

// The inputs this component accepts
type Props = {
  gains: PidGains;
  isOn: boolean;
  onGainsChange: (g: PidGains) => void;
  onToggle: () => void;
};

// One entry per input field, so the three fields can be drawn with a single loop
// keyof PidGains means key must be one of PidGains' field names: 'main', 'sum' or 'rat'
// That's what lets gains[f.key] below safely read the right value
const fields: { key: keyof PidGains; label: string; abbr: string; hint: string }[] = [
  { key: 'main', label: 'Main', abbr: 'Kp', hint: 'Reacts to how far frequency is from 60 Hz' },
  { key: 'sum', label: 'Sum', abbr: 'Ki', hint: 'Removes small offsets that build up over time' },
  { key: 'rat', label: 'Rate', abbr: 'Kd', hint: 'Damps fast swings of the needle' },
];

// The component, The four inputs above are pulled out into variables
export default function AutoControl({ gains, isOn, onGainsChange, onToggle }: Props) {
  // Draws the card
  return (
    // The card named by its title
    <section className="gg-card gg-auto" aria-labelledby="auto-title">
      <div className="gg-auto-title">
        {/* Card title */}
        <h3 id="auto-title">Automatic control</h3>
        {/* The On/Off switch. It's a real <button>, so it works with mouse, keyboard (Space/Enter) and touch */}
        <button type="button" role="switch" aria-checked={isOn} aria-labelledby="auto-title" className="gg-switch" onClick={onToggle}>
          <span className="track"><span className="thumb" /></span>
          {/* Visible text next to the switch */}
          {isOn ? 'On' : 'Off'}
        </button>
      </div>

      {/* the three gain inputs in a row */}
      <div className="gg-gains">
        {/* Draw one label and input for each entry in "fields" */}
        {fields.map((f) => (
          <div className="gg-field" key={f.key}>
            <label htmlFor={`pid-${f.key}`} title={f.hint}>
              {f.label}
              <abbr title={f.hint}>{f.abbr}</abbr>
            </label>
            {/* The number input, Another "controlled input" its value always comes from the gains prop */}
            <input
              // Matches the label
              id={`pid-${f.key}`}
              // Styling
              className="gg-input"
              // Numeric input with up and down spinner
              type="number"
              // Shows a number keypad
              inputMode="decimal"
              value={gains[f.key]}
              // Screen readers also read the hint text below
              aria-describedby={`pid-${f.key}-hint`}
              onChange={(e) => onGainsChange({ ...gains, [f.key]: Number(e.target.value) })}
            />
            <span id={`pid-${f.key}-hint`} className="sr-only">{f.hint}</span>
          </div>
        ))}
      </div>
    </section>
  );
}