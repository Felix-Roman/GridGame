// =============================================================================
// GameOver.tsx
// Shown over the game when the frequency leaves 58–62 Hz and the grid trips.
// =============================================================================
import { Link } from 'react-router-dom';
import { formatClock, formatMoney } from '../types';

// inputs or props
type Props = {
  reason: 'low' | 'high';
  timeSeconds: number;
  score: number;
  deliveredKwh: number;
  wastedKwh: number;
  onRestart: () => void;
};

// draws the funny card
export default function GameOver({ reason, timeSeconds, score, deliveredKwh, wastedKwh, onRestart }: Props) {
  return (
    <div className="gg-over" role="alertdialog" aria-modal="true" aria-labelledby="over-title" aria-describedby="over-why">
      <section className="gg-over-card">
        <h2 id="over-title">Grid tripped</h2>
        <p id="over-why">
          {reason === 'low'
            ? 'Frequency fell below 58 Hz: there wasn’t enough generation for the load, so the protection relays disconnected your grid.'
            : 'Frequency rose above 62 Hz: generation far exceeded load, so the protection relays disconnected your grid.'}
        </p>
        <dl className="gg-over-stats">
          <div><dt>Survived</dt><dd>{formatClock(timeSeconds)}</dd></div>
          <div><dt>Final score</dt><dd>{formatMoney(score)}</dd></div>
          <div><dt>Energy delivered</dt><dd>{Math.round(deliveredKwh).toLocaleString('en-US')} kWh</dd></div>
          <div><dt>Energy lost</dt><dd>{Math.round(wastedKwh).toLocaleString('en-US')} kWh</dd></div>
        </dl>
        <div className="gg-over-actions">
          <button type="button" className="gg-btn primary" onClick={onRestart} autoFocus>Restart</button>
          <Link className="gg-btn" to="/">Back to lobby</Link>
        </div>
      </section>
    </div>
  );
}
