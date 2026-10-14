import type { PidGains } from '../types';

// Automatic grid power control (PID). Main = Kp, Sum = Ki, Rate = Kd.

type Props = {
  gains: PidGains;
  isOn: boolean;
  onGainsChange: (g: PidGains) => void;
  onToggle: () => void;
};

const fields: { key: keyof PidGains; label: string; abbr: string; hint: string }[] = [
  { key: 'main', label: 'Main', abbr: 'Kp', hint: 'Reacts to how far frequency is from 60 Hz' },
  { key: 'sum', label: 'Sum', abbr: 'Ki', hint: 'Removes small offsets that build up over time' },
  { key: 'rat', label: 'Rate', abbr: 'Kd', hint: 'Damps fast swings of the needle' },
];

export default function AutoControl({ gains, isOn, onGainsChange, onToggle }: Props) {
  return (
    <section className="gg-card gg-auto" aria-labelledby="auto-title">
      <div className="gg-auto-title">
        <h3 id="auto-title">Automatic control</h3>
        <button type="button" role="switch" aria-checked={isOn} aria-labelledby="auto-title" className="gg-switch" onClick={onToggle}>
          <span className="track"><span className="thumb" /></span>
          {isOn ? 'On' : 'Off'}
        </button>
      </div>

      <div className="gg-gains">
        {fields.map((f) => (
          <div className="gg-field" key={f.key}>
            <label htmlFor={`pid-${f.key}`} title={f.hint}>
              {f.label}
              <abbr title={f.hint}>{f.abbr}</abbr>
            </label>
            <input
              id={`pid-${f.key}`}
              className="gg-input"
              type="number"
              inputMode="decimal"
              value={gains[f.key]}
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
