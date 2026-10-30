// =============================================================================
// TopBar.tsx
// The bar across the top of the game screen: logo, room code with a Copy
// button, connection status, game clock, score with income per second, and
// the button that opens or collapses the player list
// =============================================================================

import { useState } from 'react';
import { formatClock, formatMoney } from '../types';
import Icon from './Icon';

// The props (inputs) this component accepts
type Props = {
  roomId: string;
  score: number;
  incomePerSecond: number;
  timeSeconds: number;
  connected: boolean;
  playerCount: number;
  rosterOpen: boolean;
  onToggleRoster: () => void;
};

// The component
export default function TopBar({ roomId, score, incomePerSecond, timeSeconds, connected, playerCount, rosterOpen, onToggleRoster }: Props) {
  // True for 1.5 seconds after a successful copy, so the button can say "Copied"
  const [copied, setCopied] = useState(false);

  // Copies the room code to the clipboard, "async" because the clipboard API returns a Promise
  const copyRoom = async () => {
    try {
      // Put the room code on the clipboard and wait for it to finish
      await navigator.clipboard.writeText(roomId);
      // Show "Copied"
      setCopied(true);
      // Switch back to "Copy" after 1500 ms
      setTimeout(() => setCopied(false), 1500);
    // If copying failed
    } catch {
    }
  };

  // Draws the bar
  return (
    <header className="gg-topbar">
      <div className="gg-brand">
        {/* Diamond logo */}
        <Icon name="grid" />
        {/* Game name */}
        <h1>GridGame</h1>
        {/* The room chip */}
        <span className="gg-room">
          {/* "Room" label and the code */}
          Room <strong>{roomId}</strong>
          {/* Copy button. aria-label gives screen readers a fuller name than "Copy" */}
          <button type="button" onClick={copyRoom} aria-label={`Copy room code ${roomId}`}>
            {/* Button text switches for 1.5s after copying */}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </span>
      </div>

      {/* Connection indicator. role="status" makes screen readers announce changes. The "online" class turns the dot green. */}
      <span className={`gg-conn${connected ? ' online' : ''}`} role="status">
        <i aria-hidden="true" />
        {connected ? 'Online' : 'Offline'}
      </span>

      {/* Game clock */}
      <div className="gg-readout">
        {/* Small label */}
        <span>Time</span>
        <strong>{formatClock(timeSeconds)}</strong>
      </div>

      {/* Score, The "money" class makes the number yellow */}
      <div className="gg-readout money">
        <span>Score</span>
        <strong>{formatMoney(score)}</strong>
        <span className="rate">+{formatMoney(incomePerSecond)}/s</span>
      </div>

      {/* Players button, aria-pressed shows it as a toggle */}
      <button type="button" className="gg-icon-btn" onClick={onToggleRoster} aria-pressed={rosterOpen} aria-controls="player-roster">
        <Icon name="users" />
        Players {playerCount}
      </button>
    </header>
  );
}
