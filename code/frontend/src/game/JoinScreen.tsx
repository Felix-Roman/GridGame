// =============================================================================
// JoinScreen.tsx
// Shown on /game/:roomId until the server lets you in
// or a form asking for a name or the game password or a message if you can't join
// =============================================================================

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import '../Lobby.css';

// The four possible phases, "export" so Game.tsx can use the same type when it picks one
export type JoinPhase = 'connecting' | 'need-name' | 'need-password' | 'ended';

// The props handed in by Game.tsx
interface Props {
  // Which screen to show
  phase: JoinPhase;
  // An explanation from the server's answer, or null for none
  message: string | null;
  // The guest name saved from last time, to pre-fill the name box
  defaultName: string;
  // Called with what the player typed
  onSubmit: (answer: { name?: string; password?: string }) => void;
}

// The component
export default function JoinScreen({ phase, message, defaultName, onSubmit }: Props) {
  // What's typed in the name box. Starts with the saved name, so a returning guest can just press Join
  const [name, setName] = useState(defaultName);
  // Whats typed in the password box
  const [password, setPassword] = useState('');

  // Runs when either form is submitted Both forms share this one function
  const submit = (e: FormEvent) => {
    // Stop the browser from reloading the page
    e.preventDefault();
    // send the name with spaces trimmed off the ends
    if (phase === 'need-name' && name.trim()) onSubmit({ name: name.trim() });
    // On the password form when something is typed, then send the password
    if (phase === 'need-password' && password) onSubmit({ password });
  };

  // Draws the screen
  return (
    <div className="lb lb-center">
      <section className="lb-card lb-join">
        {phase === 'connecting' && (
          <>
            <h2>Joining game…</h2>
            <p className="lb-muted">Connecting to the server.</p>
          </>
        )}

        {phase === 'need-name' && (
          <form onSubmit={submit}>
            <h2>Pick a name</h2>
            {message && <p className="lb-error" role="alert">{message}</p>}
            <label className="lb-field">
              <span>Your name</span>
              <input autoFocus maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <button type="submit" className="lb-btn primary wide">Join game</button>
          </form>
        )}

        {phase === 'need-password' && (
          <form onSubmit={submit}>
            <h2>This game has a password</h2>
            {message && <p className="lb-error" role="alert">{message}</p>}
            <label className="lb-field">
              <span>Game password</span>
              {/* The password box. Each attribute is on its own line just for readability. */}
              <input
                // Shows dots instead of the letters
                type="password"
                // Cursor goes straight into the box
                autoFocus
                // The server's limit
                maxLength={64}
                // the box shows the password state
                value={password}
                // every keystroke updates it.
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button type="submit" className="lb-btn primary wide">Join game</button>
          </form>
        )}

        {phase === 'ended' && (
          <>
            <h2>Can't join this game</h2>
            <p className="lb-muted">{message}</p>
          </>
        )}

        <Link className="lb-link" to="/">← Back to the lobby</Link>
      </section>
    </div>
  );
}