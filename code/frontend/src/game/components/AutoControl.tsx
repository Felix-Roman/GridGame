// The Automatic Control card: an On/Off switch and the three PID gains
// Main = Kp (proportional), Sum = Ki (integral), Rate = Kd (derivative)

// The TypeScript type for the three gains ({ main, sum, rat })
import type { PidGains } from '../types';

// The props (inputs) this component accepts
type Props = {
  gains: PidGains;                         // current Main / Sum / Rate values
  isOn: boolean;                           // whether automatic control is switched on
  onGainsChange: (g: PidGains) => void;    // called with the new gains when an input changes
  onToggle: () => void;                    // called when the On/Off switch is clicked
// Closes Props
};

// One entry per input field, so the three fields can be drawn with a single loop
const fields: { key: keyof PidGains; label: string; abbr: string; hint: string }[] = [
  { key: 'main', label: 'Main', abbr: 'Kp', hint: 'Reacts to how far frequency is from 60 Hz' },    // proportional gain
  { key: 'sum', label: 'Sum', abbr: 'Ki', hint: 'Removes small offsets that build up over time' },  // integral gain
  { key: 'rat', label: 'Rate', abbr: 'Kd', hint: 'Damps fast swings of the needle' },               // derivative gain
// Closes the fields list
];

// The component
export default function AutoControl({ gains, isOn, onGainsChange, onToggle }: Props) {
  // Draws the card
  return (
    // The card, named by its title
    <section className="gg-card gg-auto" aria-labelledby="auto-title">
      {/* Left column: title above the switch. */}
      <div className="gg-auto-title">
        {/* Card title also names the switch */}
        <h3 id="auto-title">Automatic control</h3>
        {/* The On/Off switch, role="switch" + aria-checked tells viewer it is a toggle and whether it is on */}
        <button type="button" role="switch" aria-checked={isOn} aria-labelledby="auto-title" className="gg-switch" onClick={onToggle}>
          {/* The sliding track and thumb styled in game.css, the thumb moves when aria-checked is true */}
          <span className="track"><span className="thumb" /></span>
          {/* Visible text next to the switch */}
          {isOn ? 'On' : 'Off'}
        </button>
      </div>

      {/* Right column: the three gain inputs in a row */}
      <div className="gg-gains">
        {/* Draw one label + input for each entry in fields */}
        {fields.map((f) => (
          // One field, key = which gain it edits
          <div className="gg-field" key={f.key}>
            {/* Label linked to its input by html For/id, so clicking the label focuses the input, title shows the hint on hover */}
            <label htmlFor={`pid-${f.key}`} title={f.hint}>
              {/* Main/Sum/Rate */}
              {f.label}
              {/* Kp/Ki/Kd, with the hint as a hover tooltip */}
              <abbr title={f.hint}>{f.abbr}</abbr>
            </label>
            {/* The number input */}
            <input
              // Matches the label htmlFor.
              id={`pid-${f.key}`}
              // Styling
              className="gg-input"
              // Numeric input with up/down spinner
              type="number"
              // Shows a number keypad with decimal point on phones
              inputMode="decimal"
              // Current value of this gain
              value={gains[f.key]}
              // Screen readers also read the hint text below
              aria-describedby={`pid-${f.key}-hint`}
              // On every edit, send back a copy of the gains with just this one changed, [f.key] picks which property.
              onChange={(e) => onGainsChange({ ...gains, [f.key]: Number(e.target.value) })}
            />
            {/* The hint, visible only to viewer */}
            <span id={`pid-${f.key}-hint`} className="sr-only">{f.hint}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
