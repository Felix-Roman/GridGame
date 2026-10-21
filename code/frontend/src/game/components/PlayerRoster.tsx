// PlayerRoster.tsx
// The list of players in this room, 
// Each card shows the player's score, time, battery and frequency status, The panel
// collapses to a narrow rail of avatars, each avatar has a colored ring that
// shows that player's frequency status,
// The PID gains moved from a hover only tooltip into a <details> section, so
// keyboard and touchscreen players can open them too

// Helpers and types from types.ts, clock/money formatting, status lookups, and the PlayerData shape
import { formatClock, formatMoney, frequencyStatus, statusLabel, type PlayerData } from '../types';
// The icon component used for the collapse arrow
import Icon from './Icon';

// The props the inputs this component accepts
type Props = {
  players: PlayerData[];                   // everyone in the room
  currentUsername: string;                 // this player's name, to mark "You"
  collapsed: boolean;                      // true = narrow avatar rail, false = full cards
  onToggle: () => void;                    // called when the collapse/expand arrow is clicked
  batteryCapacity: number;                 // used to scale the battery bars
};

// First two letters of a name in capitals "felix" -> FE, o "? if the name is blank
const initials = (name: string) => name.trim().slice(0, 2).toUpperCase() || '?';

// The component
export default function PlayerRoster({ players, currentUsername, collapsed, onToggle, batteryCapacity }: Props) {
  // Sort a copy of the list, you first, then everyone else by score, highest first
  // [players] copies the array, because sort() would otherwise change the original
  const sorted = [...players].sort((a, b) =>
    // If a is you, a goes first (-1), If b is you, b goes first (1), Otherwise higher score first
    a.username === currentUsername ? -1 : b.username === currentUsername ? 1 : b.score - a.score,
  );

  // Draws the panel
  return (
    // <aside> marks secondary content, The collapsed class switches to the narrow layout
    <aside id="player-roster" className={`gg-panel gg-roster${collapsed ? ' collapsed' : ''}`} aria-label="Players in this room">
      {/* Header row, title and collapse arrow */}
      <div className="gg-roster-head">
        {/* The title only shows when expanded */}
        {!collapsed && (
          // Players 3
          <h2>Players <span className="count">{players.length}</span></h2>
        )}
        {/* The arrow button that collapses or expands the panel */}
        <button
          // A plain button not a form submit
          type="button"
          // Styling
          className="gg-collapse"
          // Collapse or expand
          onClick={onToggle}
          // Tells screen readers whether the panel is currently expanded
          aria-expanded={!collapsed}
          // Tells screen readers which element this button controls
          aria-controls="player-roster"
          // The button has only an icon, so this gives it a spoken name
          aria-label={collapsed ? 'Expand player list' : 'Collapse player list'}
        >
          {/* Arrow pointing right when collapsed expands, left when expanded collapses */}
          <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} />
        </button>
      </div>

      {/* While the server hasn't sent anyone yet, explain why the list is empty expanded view only */}
      {players.length === 0 && !collapsed && (
        // Empty-state message
        <p className="gg-roster-empty">Connecting to the game server. Players appear here once you join.</p>
      )}

      {/* The list of players */}
      <ul className="gg-roster-list">
        {/* One card per player, in the sorted order */}
        {sorted.map((p) => {
          // True if this card is you
          const me = p.username === currentUsername;
          // That player's frequency status stable/drifting/critical
          const status = frequencyStatus(p.frequency);
          // Their battery as a percent of capacity, clamped to 0 to 100
          const batteryPct = Math.min(100, Math.max(0, (p.battery / batteryCapacity) * 100));

          // Returns this player's card
          return (
            // The card is-<status> colors the avatar ring, me adds the yellow highlight, When collapsed, hovering shows the name and status
            <li key={p.id} className={`gg-player is-${status}${me ? ' me' : ''}`} title={collapsed ? `${p.username}: ${statusLabel[status]}` : undefined}>
              {/* Avatar + name row */}
              <div className="gg-player-top">
                {/* The initials avatar decorative, the name is given as text */}
                <span className="gg-avatar" aria-hidden="true">{initials(p.username)}</span>
                {/* Collapsed, hide the name visually but keep it for screen readers, Expanded, show name and score */}
                {collapsed ? (
                  // E.g. Felix, Stable, heard only by screen readers
                  <span className="sr-only">{p.username}{me ? ' (you)' : ''}, {statusLabel[status]}</span>
                ) : (
                  // minWidth, 0 lets a long name shrink and get ... instead of pushing the card wider
                  <div style={{ minWidth: 0 }}>
                    {/* The name, plus a You tag on your own card */}
                    <div className="gg-player-name">
                      {p.username}{me && <small>You</small>}
                    </div>
                    {/* E.g. $1,800 in 0:00:02 */}
                    <div className="gg-player-sub">{formatMoney(p.score)} in {formatClock(p.timeSeconds)}</div>
                  </div>
                )}
              </div>

              {/* The stats and control settings only show when expanded */}
              {!collapsed && (
                // Fragment, groups the two blocks below without adding an element
                <>
                  {/* A definition list, dt = label, dd = value */}
                  <dl className="gg-player-stats">
                    {/* Battery row, label|bar|number */}
                    <div>
                      {/* Label */}
                      <dt>Battery</dt>
                      {/* The bar track, the inner span's width is the battery percent, Hidden from screen readers the number covers it */}
                      <dd className="gg-bar" aria-hidden="true"><span style={{ width: `${batteryPct}%` }} /></dd>
                      {/* Battery number no decimals */}
                      <dd>{p.battery.toFixed(0)}</dd>
                    </div>
                    {/* Frequency row, label|status word|Hz */}
                    <div>
                      {/* Label */}
                      <dt>Freq</dt>
                      {/* Status word, colored with that player's status color */}
                      <dd style={{ color: 'var(--status)', textAlign: 'left', fontWeight: 600 }}>{statusLabel[status]}</dd>
                      {/* Frequency with 3 decimals */}
                      <dd>{p.frequency.toFixed(3)} Hz</dd>
                    </div>
                  </dl>
                  {/* <details> is a built in expandable section, clicking <summary> opens it */}
                  <details>
                    {/* The clickable line */}
                    <summary>Control settings</summary>
                    {/* That player's PID gains */}
                    <div className="gg-pid">
                      {/* Main, Kp */}
                      <div><span>Main</span><strong>{p.pid.main}</strong></div>
                      {/* Sum, Ki */}
                      <div><span>Sum</span><strong>{p.pid.sum}</strong></div>
                      {/* Rate, Kd */}
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
