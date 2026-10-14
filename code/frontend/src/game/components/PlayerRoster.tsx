import { formatClock, formatMoney, frequencyStatus, statusLabel, type PlayerData } from '../types';
import Icon from './Icon';

// Players in this room (replaces LeftPanel). Collapses to an avatar rail.
// PID gains moved from a hover-only tooltip into a <details> so keyboard
// and touch players can open them too.

type Props = {
  players: PlayerData[];
  currentUsername: string;
  collapsed: boolean;
  onToggle: () => void;
  batteryCapacity: number;
};

const initials = (name: string) => name.trim().slice(0, 2).toUpperCase() || '?';

export default function PlayerRoster({ players, currentUsername, collapsed, onToggle, batteryCapacity }: Props) {
  // Show the local player first.
  const sorted = [...players].sort((a, b) =>
    a.username === currentUsername ? -1 : b.username === currentUsername ? 1 : b.score - a.score,
  );

  return (
    <aside id="player-roster" className={`gg-panel gg-roster${collapsed ? ' collapsed' : ''}`} aria-label="Players in this room">
      <div className="gg-roster-head">
        {!collapsed && (
          <h2>Players <span className="count">{players.length}</span></h2>
        )}
        <button
          type="button"
          className="gg-collapse"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls="player-roster"
          aria-label={collapsed ? 'Expand player list' : 'Collapse player list'}
        >
          <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} />
        </button>
      </div>

      {players.length === 0 && !collapsed && (
        <p className="gg-roster-empty">Connecting to the game server. Players appear here once you join.</p>
      )}

      <ul className="gg-roster-list">
        {sorted.map((p) => {
          const me = p.username === currentUsername;
          const status = frequencyStatus(p.frequency);
          const batteryPct = Math.min(100, Math.max(0, (p.battery / batteryCapacity) * 100));

          return (
            <li key={p.id} className={`gg-player is-${status}${me ? ' me' : ''}`} title={collapsed ? `${p.username}: ${statusLabel[status]}` : undefined}>
              <div className="gg-player-top">
                <span className="gg-avatar" aria-hidden="true">{initials(p.username)}</span>
                {collapsed ? (
                  <span className="sr-only">{p.username}{me ? ' (you)' : ''}, {statusLabel[status]}</span>
                ) : (
                  <div style={{ minWidth: 0 }}>
                    <div className="gg-player-name">
                      {p.username}{me && <small>You</small>}
                    </div>
                    <div className="gg-player-sub">{formatMoney(p.score)} in {formatClock(p.timeSeconds)}</div>
                  </div>
                )}
              </div>

              {!collapsed && (
                <>
                  <dl className="gg-player-stats">
                    <div>
                      <dt>Battery</dt>
                      <dd className="gg-bar" aria-hidden="true"><span style={{ width: `${batteryPct}%` }} /></dd>
                      <dd>{p.battery.toFixed(0)}</dd>
                    </div>
                    <div>
                      <dt>Freq</dt>
                      <dd style={{ color: 'var(--status)', textAlign: 'left', fontWeight: 600 }}>{statusLabel[status]}</dd>
                      <dd>{p.frequency.toFixed(3)} Hz</dd>
                    </div>
                  </dl>
                  <details>
                    <summary>Control settings</summary>
                    <div className="gg-pid">
                      <div><span>Main</span><strong>{p.pid.main}</strong></div>
                      <div><span>Sum</span><strong>{p.pid.sum}</strong></div>
                      <div><span>Rate</span><strong>{p.pid.rat}</strong></div>
                    </div>
                  </details>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
