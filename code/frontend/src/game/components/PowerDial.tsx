// =============================================================================
// PowerDial.tsx
// The Grid Power Control knob. Range -1000..1000 over a 270° sweep, with 0 at
// the top. Per the EE document: positive values send battery energy out to the
// grid (discharging), negative values pull grid energy into the battery
// (charging). Works three ways: drag with mouse/touch, keyboard (it is an
// ARIA slider), and the -100 / Zero / +100 buttons.
// =============================================================================

// useRef keeps values between renders without redrawing; KeyboardEvent and PointerEvent are TypeScript types only.
import { useRef, type KeyboardEvent, type PointerEvent } from 'react';

// Value limits, and SWEEP = how many degrees each side of 0 the dial turns (135 left + 135 right = 270).
const MIN = -1000, MAX = 1000, SWEEP = 135;
// Dial geometry in SVG units: C = center x and y, R = radius of the track arc.
const C = 120, R = 94;

// Converts a value to an angle in degrees (-1000 = -135°, 0 = 0°, 1000 = +135°).
const toDeg = (v: number) => (v / MAX) * SWEEP;
// Converts an angle (0° = straight up, clockwise positive) and radius into an x,y point around the center.
const pt = (deg: number, r: number) => {
  // Degrees to radians.
  const a = (deg * Math.PI) / 180;
  // sin gives the horizontal offset, cos the vertical. SVG's y axis points down, so it is subtracted.
  return [C + r * Math.sin(a), C - r * Math.cos(a)] as const;
// Closes pt.
};
// Builds an SVG path string for an arc between two angles, at radius r (defaults to the track radius).
const arcPath = (d0: number, d1: number, r = R) => {
  // Always draw from the smaller angle to the larger one.
  const a = Math.min(d0, d1), b = Math.max(d0, d1);
  // Start point.
  const [x0, y0] = pt(a, r);
  // End point.
  const [x1, y1] = pt(b, r);
  // "A" draws a circular arc. The large-arc flag is 1 when the arc covers more than 180°; the final 1 means clockwise.
  return `M ${x0} ${y0} A ${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x1} ${y1}`;
// Closes arcPath.
};
// Rounds to a whole number and keeps it within -1000..1000.
const clamp = (v: number) => Math.max(MIN, Math.min(MAX, Math.round(v)));

// Describes the power flow for a value: a CSS class plus the text shown under the dial.
export function flowOf(value: number) {
  // Positive: battery is pushing power out to the grid.
  if (value > 0) return { cls: 'discharging', title: 'Discharging to grid', sub: 'Battery is supplying power' };
  // Negative: grid power is going into the battery.
  if (value < 0) return { cls: 'charging', title: 'Charging battery', sub: 'Grid power is being stored' };
  // Exactly 0: nothing moving.
  return { cls: 'idle', title: 'Idle', sub: 'No power in or out' };
// Closes flowOf.
}

// The component. value = current dial setting, onChange = called with the new setting.
export default function PowerDial({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  // Reference to the <svg> element, so we can measure where it is on screen.
  const ref = useRef<SVGSVGElement>(null);
  // True while the player is holding the pointer down on the dial (no redraw needed, so useRef, not useState).
  const dragging = useRef(false);

  // Converts a pointer position (mouse or finger) into a dial value.
  const fromPointer = (e: PointerEvent) => {
    // The SVG element.
    const el = ref.current;
    // Safety check: do nothing if it isn't on the page.
    if (!el) return;
    // Its position and size on screen.
    const rect = el.getBoundingClientRect();
    // Pointer's horizontal distance from the dial's center (right is positive).
    const x = e.clientX - (rect.left + rect.width / 2);
    // Pointer's vertical distance from the center (down is positive).
    const y = e.clientY - (rect.top + rect.height / 2);
    // Angle of the pointer around the center: 0° at the top, clockwise positive.
    let deg = (Math.atan2(x, -y) * 180) / Math.PI; // 0 at top, clockwise positive
    // Stop at the ends of the sweep, so dragging past -1000/1000 doesn't wrap around.
    deg = Math.max(-SWEEP, Math.min(SWEEP, deg));
    // Convert the angle back to a value and report it.
    onChange(clamp((deg / SWEEP) * MAX));
  // Closes fromPointer.
  };

  // Keyboard controls while the dial has focus.
  const onKeyDown = (e: KeyboardEvent) => {
    // Arrow keys move by 10, or by 100 when Shift is held.
    const big = e.shiftKey ? 100 : 10;
    // Maps each supported key to the value it should produce.
    const map: Record<string, number> = {
      ArrowRight: value + big, ArrowUp: value + big,     // increase
      ArrowLeft: value - big, ArrowDown: value - big,    // decrease
      PageUp: value + 100, PageDown: value - 100,        // jump by 100
      Home: MIN, End: MAX, '0': 0,                       // go to -1000, 1000, or 0
    // Closes the key map.
    };
    // Only act on keys in the map.
    if (e.key in map) {
      // Stop the browser's default action (e.g. arrow keys scrolling the page).
      e.preventDefault();
      // Report the new value, kept within range.
      onChange(clamp(map[e.key]));
    // Closes the if.
    }
  // Closes onKeyDown.
  };

  // Current angle of the dial.
  const deg = toDeg(value);
  // Current flow description (class + text).
  const flow = flowOf(value);
  // Position of the yellow pointer dot on the knob (radius 49, just inside the knob's edge).
  const [px, py] = pt(deg, 49);

  // Draws the card.
  return (
    // The card, named by its title.
    <section className="gg-card gg-dial" aria-labelledby="dial-title">
      {/* Header: title and hint. */}
      <div className="gg-card-head">
        {/* Title (also the slider's name for screen readers). */}
        <h3 id="dial-title">Grid power control</h3>
        {/* Usage hint (hidden by CSS when the card is narrow). */}
        <p>Drag the knob or use arrow keys</p>
      </div>
      {/* Dial on top, status + buttons below. */}
      <div className="gg-dial-wrap">
        {/* The dial drawing. It is also the interactive slider. */}
        <svg
          // Lets fromPointer measure this element.
          ref={ref}
          // Styling (size, grab cursor, round focus ring).
          className="gg-dial-svg"
          // Coordinate system, with margin around the 240x240 dial for the number labels.
          viewBox="-14 -6 268 252"
          // Screen readers announce it as a slider.
          role="slider"
          // Makes it reachable with the Tab key.
          tabIndex={0}
          // Named "Grid power control".
          aria-labelledby="dial-title"
          // Lowest value.
          aria-valuemin={MIN}
          // Highest value.
          aria-valuemax={MAX}
          // Current value.
          aria-valuenow={value}
          // What screen readers say, e.g. "-420, Charging battery".
          aria-valuetext={`${value}, ${flow.title}`}
          // Keyboard controls.
          onKeyDown={onKeyDown}
          // Pointer pressed: start dragging, keep receiving pointer events even if it leaves the dial, and jump to that spot.
          onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e); }}
          // Pointer moved: follow it, but only while dragging.
          onPointerMove={(e) => { if (dragging.current) fromPointer(e); }}
          // Pointer released: stop dragging and release the capture.
          onPointerUp={(e) => { dragging.current = false; e.currentTarget.releasePointerCapture(e.pointerId); }}
        // End of the opening <svg> tag.
        >
          {/* Reusable definitions for this SVG. */}
          <defs>
            {/* Shading for the knob: lighter near the top-left, darker at the edges, so it looks rounded. */}
            <radialGradient id="knobGrad" cx="35%" cy="30%" r="80%">
              {/* Center color. */}
              <stop offset="0%" stopColor="#4a6276" />
              {/* Edge color. */}
              <stop offset="100%" stopColor="#1a2733" />
            </radialGradient>
          </defs>
          {/* Dark background track across the full sweep. */}
          <path className="dial-track" d={arcPath(-SWEEP, SWEEP)} />
          {/* Colored arc from 0 to the current value (blue when charging, yellow when discharging). Skipped at exactly 0. */}
          {value !== 0 && <path className={`dial-fill ${flow.cls}`} d={arcPath(0, deg)} />}
          {/* Eleven tick marks spaced 27° apart (270° / 10 gaps), inside the track. */}
          {Array.from({ length: 11 }, (_, i) => {
            // Angle of this tick.
            const d = -SWEEP + i * 27;
            // Outer end of the tick.
            const [x0, y0] = pt(d, R - 14);
            // Inner end of the tick.
            const [x1, y1] = pt(d, R - 20);
            // The tick line.
            return <line key={i} className="dial-tick" x1={x0} y1={y0} x2={x1} y2={y1} />;
          // Closes the tick loop.
          })}
          {/* Number labels around the outside of the track. */}
          {[-1000, -500, 0, 500, 1000].map((v) => {
            // Position just outside the track.
            const [x, y] = pt(toDeg(v), R + 19); // just outside the track
            // The label; y + 4 centers it vertically, textAnchor centers it horizontally.
            return <text key={v} className="dial-label" x={x} y={y + 4} textAnchor="middle">{v}</text>;
          // Closes the label loop.
          })}
          {/* The knob in the middle. */}
          <circle className="dial-knob" cx={C} cy={C} r={58} />
          {/* Yellow dot on the knob that shows where it is pointing. */}
          <circle className="dial-pointer" cx={px} cy={py} r={5} />
          {/* The current value in large text on the knob. */}
          <text className="dial-value" x={C} y={C + 10} textAnchor="middle">{value}</text>
          {/* The word "power" under the value. */}
          <text className="dial-unit" x={C} y={C + 30} textAnchor="middle">power</text>
        </svg>

        {/* Row under the dial. */}
        <div className="gg-dial-side">
          {/* Flow status. aria-live makes screen readers announce it when it changes. */}
          <div className={`gg-flow ${flow.cls}`} aria-live="polite">
            {/* E.g. "Charging battery". */}
            <strong>{flow.title}</strong>
            {/* E.g. "Grid power is being stored". */}
            <span>{flow.sub}</span>
          </div>
          {/* The nudge buttons, grouped and named for screen readers. */}
          <div className="gg-nudges" role="group" aria-label="Adjust power">
            {/* Lower by 100 (never below -1000). */}
            <button type="button" className="gg-btn small" onClick={() => onChange(clamp(value - 100))}>−100</button>
            {/* Back to 0. */}
            <button type="button" className="gg-btn small" onClick={() => onChange(0)}>Zero</button>
            {/* Raise by 100 (never above 1000). */}
            <button type="button" className="gg-btn small" onClick={() => onChange(clamp(value + 100))}>+100</button>
          </div>
        </div>
      </div>
    </section>
  // Closes the return statement.
  );
// Closes PowerDial.
}
