import { useState } from 'react';
import { formatClock, formatMoney } from '../types';
import Icon from './Icon';

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

export default function TopBar({ roomId, score, incomePerSecond, timeSeconds, connected, playerCount, rosterOpen, onToggleRoster }: Props) {
  const [copied, setCopied] = useState(false);

  const copyRoom = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard can be blocked; the code is still visible */
    }
  };

  return (
    <header className="gg-topbar">
      <div className="gg-brand">
        <Icon name="grid" />
        <h1>GridGame</h1>
        <span className="gg-room">
          Room <strong>{roomId}</strong>
          <button type="button" onClick={copyRoom} aria-label={`Copy room code ${roomId}`}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </span>
      </div>

      <span className={`gg-conn${connected ? ' online' : ''}`} role="status">
        <i aria-hidden="true" />
        {connected ? 'Online' : 'Offline'}
      </span>

      <div className="gg-readout">
        <span>Time</span>
        <strong>{formatClock(timeSeconds)}</strong>
      </div>

      <div className="gg-readout money">
        <span>Score</span>
        <strong>{formatMoney(score)}</strong>
        <span className="rate">+{formatMoney(incomePerSecond)}/s</span>
      </div>

      <button type="button" className="gg-icon-btn" onClick={onToggleRoster} aria-pressed={rosterOpen} aria-controls="player-roster">
        <Icon name="users" />
        Players {playerCount}
      </button>
    </header>
  );
}
