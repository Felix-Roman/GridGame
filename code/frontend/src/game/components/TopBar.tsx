// TopBar.tsx
// The bar across the top of the game screen, logo, room code with a Copy
// button, connection status, game clock, score with income per second, and
// the button that opens or collapses the player list

// useState stores the Copied flag for the copy button
import { useState } from 'react';
// Formatting helpers, seconds -> 0:00:02, number -> $1,800
import { formatClock, formatMoney } from '../types';
// The icon component
import Icon from './Icon';

// The props (inputs) this component accepts
type Props = {
  roomId: string;                          // the room code
  score: number;                           // current score/money
  incomePerSecond: number;                 // money earned per second
  timeSeconds: number;                     // seconds since the game started
  connected: boolean;                      // whether the socket is connected
  playerCount: number;                     // how many players are in the room
  rosterOpen: boolean;                     // whether the player list is expanded
  onToggleRoster: () => void;              // called when the Players button is clicked
};

// The component
export default function TopBar({ roomId, score, incomePerSecond, timeSeconds, connected, playerCount, rosterOpen, onToggleRoster }: Props) {
  // True for 1.5 seconds after a successful copy, so the button can say Copied
  const [copied, setCopied] = useState(false);

  // Copies the room code to the clipboard, asyn" because the clipboard API returns a Promise
  const copyRoom = async () => {
    // try/catch, because some browsers block clipboard access
    try {
      // Put the room code on the clipboard and wait for it to finish
      await navigator.clipboard.writeText(roomId);
      // Show Copied
      setCopied(true);
      // Switch back to Copy after 1500 ms
      setTimeout(() => setCopied(false), 1500);
    // If copying failed
    } catch {
      /* clipboard can be blocked. the code is still visible */
    }
  };

  // Draws the bar
  return (
    // <header> marks the top bar for screen readers
    <header className="gg-topbar">
      {/* Left group, logo, name and room chip, Its auto right margin pushes everything else to the right edge */}
      <div className="gg-brand">
        {/* Diamond logo */}
        <Icon name="grid" />
        {/* Game name */}
        <h1>GridGame</h1>
        {/* The room chip */}
        <span className="gg-room">
          {/* Room, label and the code */}
          Room <strong>{roomId}</strong>
          {/* Copy button, aria-label gives screen readers a fuller name than Copy */}
          <button type="button" onClick={copyRoom} aria-label={`Copy room code ${roomId}`}>
            {/* Button text switches for 1.5s after copying */}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </span>
      </div>

      {/* Connection indicator, role="status" makes screen readers announce changes, The online class turns the dot green */}
      <span className={`gg-conn${connected ? ' online' : ''}`} role="status">
        {/* The dot decorative */}
        <i aria-hidden="true" />
        {/* The word */}
        {connected ? 'Online' : 'Offline'}
      </span>

      {/* Game clock */}
      <div className="gg-readout">
        {/* Small label */}
        <span>Time</span>
        {/* E.g. 0:00:02 */}
        <strong>{formatClock(timeSeconds)}</strong>
      </div>

      {/* Scor, The money class makes the number yellow */}
      <div className="gg-readout money">
        {/* Small label */}
        <span>Score</span>
        {/* E.g., $1,800 */}
        <strong>{formatMoney(score)}</strong>
        {/* E.g., +$300/s in green */}
        <span className="rate">+{formatMoney(incomePerSecond)}/s</span>
      </div>

      {/* Players button, aria-pressed shows it as a toggle and turns its border yellow when open */}
      <button type="button" className="gg-icon-btn" onClick={onToggleRoster} aria-pressed={rosterOpen} aria-controls="player-roster">
        {/* People icon */}
        <Icon name="users" />
        {/* E.g., Players 3 */}
        Players {playerCount}
      </button>
    </header>
  );
}
