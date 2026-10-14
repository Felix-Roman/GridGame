import { useRef, type KeyboardEvent, type PointerEvent } from 'react';

// Grid power control. -1000..1000 over a 270° sweep with 0 at the top.
// Per the EE document: positive sends battery energy out to the grid,
// negative pulls grid energy into the battery.
// Works with mouse/touch drag and with the keyboard (role="slider").

const MIN = -1000, MAX = 1000, SWEEP = 135;
const C = 120, R = 94;

const toDeg = (v: number) => (v / MAX) * SWEEP;
const pt = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)] as const;
};
const arcPath = (d0: number, d1: number, r = R) => {
  const a = Math.min(d0, d1), b = Math.max(d0, d1);
  const [x0, y0] = pt(a, r);
  const [x1, y1] = pt(b, r);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};
const clamp = (v: number) => Math.max(MIN, Math.min(MAX, Math.round(v)));

export function flowOf(value: number) {
  if (value > 0) return { cls: 'discharging', title: 'Discharging to grid', sub: 'Battery is supplying power' };
  if (value < 0) return { cls: 'charging', title: 'Charging battery', sub: 'Grid power is being stored' };
  return { cls: 'idle', title: 'Idle', sub: 'No power in or out' };
}

export default function PowerDial({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const ref = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const fromPointer = (e: PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    let deg = (Math.atan2(x, -y) * 180) / Math.PI; // 0 at top, clockwise positive
    deg = Math.max(-SWEEP, Math.min(SWEEP, deg));
    onChange(clamp((deg / SWEEP) * MAX));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const big = e.shiftKey ? 100 : 10;
    const map: Record<string, number> = {
      ArrowRight: value + big, ArrowUp: value + big,
      ArrowLeft: value - big, ArrowDown: value - big,
      PageUp: value + 100, PageDown: value - 100,
      Home: MIN, End: MAX, '0': 0,
    };
    if (e.key in map) {
      e.preventDefault();
      onChange(clamp(map[e.key]));
    }
  };

  const deg = toDeg(value);
  const flow = flowOf(value);
  const [px, py] = pt(deg, 49);

  return (
    <section className="gg-card gg-dial" aria-labelledby="dial-title">
      <div className="gg-card-head">
        <h3 id="dial-title">Grid power control</h3>
        <p>Drag the knob or use arrow keys</p>
      </div>
      <div className="gg-dial-wrap">
        <svg
          ref={ref}
          className="gg-dial-svg"
          viewBox="-14 -6 268 252"
          role="slider"
          tabIndex={0}
          aria-labelledby="dial-title"
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={value}
          aria-valuetext={`${value}, ${flow.title}`}
          onKeyDown={onKeyDown}
          onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e); }}
          onPointerMove={(e) => { if (dragging.current) fromPointer(e); }}
          onPointerUp={(e) => { dragging.current = false; e.currentTarget.releasePointerCapture(e.pointerId); }}
        >
          <defs>
            <radialGradient id="knobGrad" cx="35%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#4a6276" />
              <stop offset="100%" stopColor="#1a2733" />
            </radialGradient>
          </defs>
          <path className="dial-track" d={arcPath(-SWEEP, SWEEP)} />
          {value !== 0 && <path className={`dial-fill ${flow.cls}`} d={arcPath(0, deg)} />}
          {Array.from({ length: 11 }, (_, i) => {
            const d = -SWEEP + i * 27;
            const [x0, y0] = pt(d, R - 14);
            const [x1, y1] = pt(d, R - 20);
            return <line key={i} className="dial-tick" x1={x0} y1={y0} x2={x1} y2={y1} />;
          })}
          {[-1000, -500, 0, 500, 1000].map((v) => {
            const [x, y] = pt(toDeg(v), R + 19); // just outside the track
            return <text key={v} className="dial-label" x={x} y={y + 4} textAnchor="middle">{v}</text>;
          })}
          <circle className="dial-knob" cx={C} cy={C} r={58} />
          <circle className="dial-pointer" cx={px} cy={py} r={5} />
          <text className="dial-value" x={C} y={C + 10} textAnchor="middle">{value}</text>
          <text className="dial-unit" x={C} y={C + 30} textAnchor="middle">power</text>
        </svg>

        <div className="gg-dial-side">
          <div className={`gg-flow ${flow.cls}`} aria-live="polite">
            <strong>{flow.title}</strong>
            <span>{flow.sub}</span>
          </div>
          <div className="gg-nudges" role="group" aria-label="Adjust power">
            <button type="button" className="gg-btn small" onClick={() => onChange(clamp(value - 100))}>−100</button>
            <button type="button" className="gg-btn small" onClick={() => onChange(0)}>Zero</button>
            <button type="button" className="gg-btn small" onClick={() => onChange(clamp(value + 100))}>+100</button>
          </div>
        </div>
      </div>
    </section>
  );
}
