// =============================================================================
// Lobby.tsx
// The page shared by Home ("/") and Account ("/Account"). They look the same
// the only difference is the top-right buttons:
//   guest      -> [Create an account] [Log in]
//   logged in  -> "Signed in as X" [Log out]
//
// Left card:  pick a name, create a game (public, or protected by a password)
// Right card: live list of active games, with Join (asks for the password if needed)
// =============================================================================
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { connectSocket } from './socket';
import { createGame, type GameSummary } from './api';
import { getGuestName, setGuestName, rememberGamePassword } from './playerSession';
import './Lobby.css';

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function Lobby() {
  const { username: account, logout } = useAuth();
  const navigate = useNavigate();

  // name
  const nameRef = useRef<HTMLInputElement>(null);
  const [guestName, setGuestNameText] = useState(getGuestName);
  const [nameError, setNameError] = useState<string | null>(null);
  const playerName = account ?? guestName.trim();

  // Create a game
  const [gameName, setGameName] = useState('');
  const [access, setAccess] = useState<'public' | 'password'>('public');
  const [gamePassword, setGamePassword] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Active games
  const [games, setGames] = useState<GameSummary[]>([]);
  const [live, setLive] = useState(false);
  const [passwordFor, setPasswordFor] = useState<string | null>(null); // which game's password box is open
  const [joinPassword, setJoinPassword] = useState('');

  useEffect(() => {
    const s = connectSocket();
    s.on('connect', () => {
      setLive(true);
      s.emit('watch_lobby'); // the server answers with "games" now and on every change
    });
    s.on('disconnect', () => setLive(false));
    s.on('games', (list: GameSummary[]) => setGames(list));
    return () => {
      s.disconnect();
    };
  }, []);

  // Makes sure there's a name before creating/joining. Returns it, or null
  const requireName = (): string | null => {
    if (playerName) {
      if (!account) setGuestName(playerName);
      return playerName;
    }
    setNameError('Enter a name first.');
    nameRef.current?.focus();
    return null;
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!requireName()) return;
    if (!gameName.trim()) return setCreateError('Give your game a name.');
    if (access === 'password' && gamePassword.length < 3) {
      return setCreateError('The game password needs at least 3 characters.');
    }
    setCreating(true);
    const result = await createGame({
      name: gameName.trim(),
      hostName: playerName,
      isPublic: access === 'public',
      password: access === 'password' ? gamePassword : undefined,
    });
    setCreating(false);
    if ('error' in result) return setCreateError(result.error);
    // Remember the password so the creator walks straight in.
    if (access === 'password') rememberGamePassword(result.id, gamePassword);
    navigate(`/game/${result.id}`);
  };

  const handleJoin = (game: GameSummary) => {
    if (!requireName()) return;
    if (!game.isPublic) {
      // First click opens the password box; the next click (or Enter) joins
      if (passwordFor !== game.id) {
        setPasswordFor(game.id);
        setJoinPassword('');
        return;
      }
      if (!joinPassword) return;
      rememberGamePassword(game.id, joinPassword); // the game page checks it with the server
    }
    navigate(`/game/${game.id}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="lb">
      <header className="lb-head">
        <div className="lb-brand">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
            <path d="M16 2 30 16 16 30 2 16Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <path d="M16 9 23 16 16 23 9 16Z" fill="currentColor" />
          </svg>
          <h1>Grid Game</h1>
        </div>
        <nav className="lb-auth">
          {account ? (
            <>
              <span className="lb-signed">
                Signed in as <strong>{account}</strong>
              </span>
              <button type="button" className="lb-btn" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <button type="button" className="lb-btn" onClick={() => navigate('/CreateAccountForm')}>
                Create an account
              </button>
              <button type="button" className="lb-btn primary" onClick={() => navigate('/LoginForm')}>
                Log in
              </button>
            </>
          )}
        </nav>
      </header>

      <main className="lb-grid">
        {/* ---------------- Left: name + create ---------------- */}
        <section className="lb-card" aria-labelledby="create-title">
          <h2 id="create-title">Start a game</h2>
          <form onSubmit={handleCreate} noValidate>
            <label className="lb-field">
              <span>Your name</span>
              <input
                ref={nameRef}
                value={account ?? guestName}
                readOnly={!!account}
                maxLength={20}
                placeholder="Any name you like"
                autoComplete="nickname"
                onChange={(e) => {
                  setGuestNameText(e.target.value);
                  setNameError(null);
                }}
              />
              <small>{account ? 'You play under your account name.' : 'No account needed. Pick any name.'}</small>
              {nameError && <small className="lb-error">{nameError}</small>}
            </label>

            <label className="lb-field">
              <span>Game name</span>
              <input
                value={gameName}
                maxLength={40}
                placeholder="e.g. Friday grid battle"
                onChange={(e) => setGameName(e.target.value)}
              />
            </label>

            <fieldset className="lb-field">
              <legend>Who can join</legend>
              <div className="lb-seg" role="radiogroup">
                <label className={access === 'public' ? 'on' : ''}>
                  <input
                    type="radio"
                    name="access"
                    checked={access === 'public'}
                    onChange={() => setAccess('public')}
                  />
                  Public
                </label>
                <label className={access === 'password' ? 'on' : ''}>
                  <input
                    type="radio"
                    name="access"
                    checked={access === 'password'}
                    onChange={() => setAccess('password')}
                  />
                  <LockIcon /> Password
                </label>
              </div>
              <small>{access === 'public' ? 'Anyone can join from the list.' : 'Players need the password to join.'}</small>
            </fieldset>

            {access === 'password' && (
              <label className="lb-field">
                <span>Game password</span>
                <input
                  type="password"
                  value={gamePassword}
                  maxLength={64}
                  autoComplete="new-password"
                  placeholder="At least 3 characters"
                  onChange={(e) => setGamePassword(e.target.value)}
                />
              </label>
            )}

            {createError && <p className="lb-error" role="alert">{createError}</p>}
            <button type="submit" className="lb-btn primary wide" disabled={creating}>
              {creating ? 'Creating…' : 'Create game'}
            </button>
          </form>
        </section>

        {/* ---------------- Right: active games ---------------- */}
        <section className="lb-card" aria-labelledby="games-title">
          <div className="lb-card-head">
            <h2 id="games-title">Active games</h2>
            <span className={`lb-live${live ? ' on' : ''}`}>
              <i aria-hidden="true" />
              {live ? 'Live' : 'Connecting…'}
            </span>
          </div>

          {games.length === 0 ? (
            <p className="lb-empty">No games running. Start one and it shows up here for everyone.</p>
          ) : (
            <ul className="lb-list">
              {games.map((g) => {
                const full = g.maxPlayers !== null && g.playerCount >= g.maxPlayers;
                const shown = g.players.slice(0, 8);
                const more = g.players.length - shown.length;
                const askPassword = !g.isPublic && passwordFor === g.id;
                return (
                  <li key={g.id} className="lb-game">
                    <div className="lb-game-info">
                      <div className="lb-game-title">
                        <h3>{g.name}</h3>
                        <span className={`lb-tag ${g.isPublic ? 'open' : 'locked'}`}>
                          {g.isPublic ? 'Public' : (<><LockIcon /> Password</>)}
                        </span>
                      </div>
                      <p className="lb-game-meta">
                        <strong>
                          {g.playerCount}
                          {g.maxPlayers !== null ? `/${g.maxPlayers}` : ''}
                        </strong>{' '}
                        players · hosted by {g.host}
                      </p>
                      <p className="lb-game-players">
                        {shown.length ? shown.join(', ') + (more > 0 ? ` +${more} more` : '') : 'Waiting for players'}
                      </p>
                    </div>
                    <form
                      className="lb-game-join"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleJoin(g);
                      }}
                    >
                      {askPassword && (
                        <input
                          type="password"
                          autoFocus
                          aria-label={`Password for ${g.name}`}
                          placeholder="Password"
                          value={joinPassword}
                          maxLength={64}
                          onChange={(e) => setJoinPassword(e.target.value)}
                        />
                      )}
                      <button type="submit" className="lb-btn primary" disabled={full}>
                        {full ? 'Full' : 'Join'}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
