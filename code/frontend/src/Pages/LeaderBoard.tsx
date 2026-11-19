// =============================================================================
// LeaderBoards.tsx
// LeaderBoards page, It ranks players three ways,
//   1. High score being the best single game also showning how long that game lasted
//   2. Total earned combining every game's score added together (individual player)
//   3. Longest survived in single game before game over
//
// Layout, top to bottom:
//   header        same as the Lobby, with Lobby/Leaderboards links
//   title row     "Leaderboards", the rank by switch and the period dropdown
//   podium        the top 3 cards, drawn in the order 2nd, 1st, 3rd
//   table         every player, with search and Previous/Next pages
//   your standing the signed in player's own stats
//
// The rows come from the server (GET /api/leaderboard, see backend/src/leaderboard.ts)
// The server only saves games from signed in players, at the moment their grid trips
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { getLeaderboard, type LeaderboardEntry } from '../api';
import { formatClock, formatMoney } from '../game/types';
import '../Lobby.css'; // Lobby.css lets us access it and gives us the shared look from lobby 
import './LeaderBoard.css'; // Leaderboards.css adds the pieces this page needs giving it the podium, table, etc.,

// Settings and types
// The three ways to rank, with each one being a key of LeaderboardEntry, so we can sort with entry[sortKey]
type SortKey = 'highScore' | 'totalEarned' | 'longestSurvived';

// Which games count, the server filters by this
type Period = 'all' | 'week' | 'today';

// The buttons in the rank by switch, in the order they're drawn
const SORT_OPTIONS: { key: SortKey; label: string; description: string }[] = [
  { key: 'highScore', label: 'High score', description: 'their high score from a single game' },
  { key: 'totalEarned', label: 'Total earned', description: 'total money earned across all games' },
  { key: 'longestSurvived', label: 'Longest survived', description: 'their longest single game before the grid tripped' },
];

// How many rows the table shows per page
const PAGE_SIZE = 10;

// Words for the podium places. Index 0 = 1st place
const PLACE_LABELS = ['1st', '2nd', '3rd'];

// Shows a stat the right way, seconds become a clock, money gets a $
function formatStat(key: SortKey, entry: LeaderboardEntry) {
  return key === 'longestSurvived' ? formatClock(entry.longestSurvived) : formatMoney(entry[key]);
}

// The small line under the big number on a podium card
// It only shows what makes sense for the current ranking, so it never looks like
// Someone with a bigger number is in the wrong place
function podiumDetail(key: SortKey, entry: LeaderboardEntry) {
  if (key === 'highScore') return `in ${formatClock(entry.highScoreTime)}`;
  if (key === 'totalEarned') return `across ${entry.gamesPlayed} games`;
  return `longest game · ${entry.gamesPlayed} games played`;
}

// A simple trophy icon, shown when nobody has played yet
function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// The page
export default function Leaderboards() {
  // Who's logged in, so we can highlight their row and show "Your standing"
  const { username: account, logout } = useAuth();
  const navigate = useNavigate();

  // What the player picked 
  const [sortKey, setSortKey] = useState<SortKey>('highScore'); // which ranking
  const [period, setPeriod] = useState<Period>('all');          // which games count 
  const [search, setSearch] = useState('');                     // text in the search box
  const [page, setPage] = useState(0);                          // which table page, 0 = first

  // The data
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]); // every player's stats from the server
  const [loading, setLoading] = useState(true);                    // true while we wait for the server
  const [loadError, setLoadError] = useState<string | null>(null); // a message if loading failed

  // Fetch the leaderboard when the page opens, and again whenever the period changes
  useEffect(() => {
    // If the player switches period again before the reply arrives, "cancelled" stops the
    // older, slower reply from overwriting the newer one
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getLeaderboard(period).then((result) => {
      if (cancelled) return;
      // getLeaderboard returns either a list or { error }
      if (Array.isArray(result)) setEntries(result);
      else setLoadError(result.error);
      setLoading(false);
    });
    // React runs this cleanup before the effect runs again, or when leaving the page
    return () => {
      cancelled = true;
    };
  }, [period]);

  // Rank everyone
  // useMemo reruns this only when entries or sortKey change, not on every keystroke
  // We copy the list with [...entries] first, because .sort() changes the array it's called on
  // Each player gets a "rank" here, before searching, so that when searching for a player, it still shows their real rank and not something different
  const ranked = useMemo(
    () =>
      [...entries]
        .sort((a, b) => b[sortKey] - a[sortKey]) // biggest first
        .map((entry, i) => ({ ...entry, rank: i + 1 })),
    [entries, sortKey],
  );

  // Search
  const query = search.trim().toLowerCase();
  const filtered = query ? ranked.filter((e) => e.name.toLowerCase().includes(query)) : ranked;

  // Paging
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // If a search shrinks the list, don't stay on a page that no longer exists
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const firstShown = filtered.length === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const lastShown = currentPage * PAGE_SIZE + pageRows.length;

  // Podium
  // Top three from the full ranking, We draw them as 2nd, 1st, 3rd so 1st sits in the middle
  // .filter(Boolean) drops any missing spot when fewer than 3 players exist
  const podium = [ranked[1], ranked[0], ranked[2]].filter(Boolean);

  // The signed in player's own row
  const me = account ? ranked.find((e) => e.name === account) : undefined;

  // The sentence under the title, "Ranked by their high score from a single game."
  const sortDescription = SORT_OPTIONS.find((o) => o.key === sortKey)!.description;

  // Changing the ranking or the search should jump back to the first page
  const pickSort = (key: SortKey) => {
    setSortKey(key);
    setPage(0);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="lb">
      {/* Header has the same look as the Lobby */}
      <header className="lb-head">
        <div className="lb-brand">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
            <path d="M16 2 30 16 16 30 2 16Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <path d="M16 9 23 16 16 23 9 16Z" fill="currentColor" />
          </svg>
          <h1>Grid Game</h1>
        </div>
        <nav className="lb-auth" aria-label="Main">
          {/* Sends the logged in players on to /Account automatically */}
          <Link className="lbd-nav" to="/">Lobby</Link>
          {/* Aria current tells screen readers "you are on this page" */}
          <Link className="lbd-nav on" to="/Leaderboards" aria-current="page">Leaderboards</Link>
          {account ? (
            <>
              <span className="lb-signed">
                Signed in as <strong>{account}</strong>
              </span>
              <button type="button" className="lb-btn" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <button type="button" className="lb-btn primary" onClick={() => navigate('/LoginForm')}>Log in</button>
          )}
        </nav>
      </header>

      <main className="lbd-main">
        {/* Title row, heading, rank-by switch, period */}
        <div className="lbd-titlebar">
          <div>
            <h2 className="lbd-title">Leaderboards</h2>
            <p className="lb-muted">The best grid operators. Ranked by {sortDescription}.</p>
          </div>

          <div className="lbd-controls">
            {/* A row of real buttons. aria pressed tells screen readers which one is on */}
            <div className="lbd-seg" role="group" aria-label="Rank by">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={sortKey === opt.key ? 'on' : ''}
                  aria-pressed={sortKey === opt.key}
                  onClick={() => pickSort(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <label className="lbd-period">
              Period
              <select
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value as Period);
                  setPage(0); // a new period starts back on the first page
                }}
              >
                <option value="all">All time</option>
                <option value="week">This week</option>
                <option value="today">Today</option>
              </select>
            </label>
          </div>
        </div>

        {/* While loading, or if loading failed, show one message instead of the board */}
        {loading ? (
          <section className="lb-card lbd-empty" aria-live="polite">
            <p>Loading the leaderboards…</p>
          </section>
        ) : loadError ? (
          <section className="lb-card lbd-empty" role="alert">
            <p className="lb-error">{loadError}</p>
            {/* Picking the same period again won't re-run the effect, so reload the page instead */}
            <button type="button" className="lb-btn" onClick={() => window.location.reload()}>Try again</button>
          </section>
        ) : ranked.length === 0 ? (
          // Nobody has played yet, so show one friendly message instead of an empty podium and table
          <section className="lb-card lbd-empty">
            <TrophyIcon />
            <p>No games saved yet. Be the first on the board!</p>
            <Link className="lb-btn primary" to="/">Play a game</Link>
          </section>
        ) : (
          <>
            {/* Podium, top three */}
            <section className="lbd-podium" aria-label="Top three">
              {podium.map((entry) => (
                // data place that lets the CSS give each place its own height and badge color
                <article key={entry.name} className="lbd-place" data-place={entry.rank}>
                  <div className="lbd-place-top">
                    <span className="lbd-badge" aria-hidden="true">{entry.rank}</span>
                    <span className="lbd-place-label">{PLACE_LABELS[entry.rank - 1]} place</span>
                  </div>
                  <h3>{entry.name}</h3>
                  <p className="lbd-place-stat">{formatStat(sortKey, entry)}</p>
                  <p className="lbd-place-detail">{podiumDetail(sortKey, entry)}</p>
                </article>
              ))}
            </section>

            {/* Table + your standing */}
            <div className="lbd-columns">
              <section className="lb-card lbd-board" aria-labelledby="all-title">
                <div className="lb-card-head">
                  <h2 id="all-title">All players</h2>
                  <label>
                    {/* The label text is hidden visually but still read by screen readers */}
                    <span className="lbd-sr-only">Search players</span>
                    <input
                      type="search"
                      className="lbd-search"
                      placeholder="Search players"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(0);
                      }}
                    />
                  </label>
                </div>

                {/* The wrapper scrolls sideways on small screens instead of squashing the table */}
                <div className="lbd-table-wrap">
                  <table className="lbd-table">
                    <thead>
                      <tr>
                        <th scope="col" className="lbd-rank">Rank</th>
                        <th scope="col">Player</th>
                        {/* "active" turns the column we're ranking to yellow */}
                        <th scope="col" className={`num ${sortKey === 'highScore' ? 'active' : ''}`}>High score</th>
                        <th scope="col" className={`num ${sortKey === 'totalEarned' ? 'active' : ''}`}>Total earned</th>
                        <th scope="col" className={`num ${sortKey === 'longestSurvived' ? 'active' : ''}`}>Longest survived</th>
                        <th scope="col" className="num">Games</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((entry) => {
                        const isMe = entry.name === account;
                        return (
                          <tr key={entry.name} className={isMe ? 'me' : ''}>
                            {/* Ranks 1-3 get their medal color through the data rank in the CSS */}
                            <td className="lbd-rank" data-rank={entry.rank}>{entry.rank}</td>
                            <td>
                              <span className="lbd-player">
                                <span className="lbd-avatar" aria-hidden="true">{entry.name.charAt(0).toUpperCase()}</span>
                                <span className="lbd-name">{entry.name}</span>
                                {isMe && <span className="lb-tag locked">You</span>}
                              </span>
                            </td>
                            <td className={`num ${sortKey === 'highScore' ? 'active' : ''}`}>
                              {formatMoney(entry.highScore)}
                              {/* The time of the high score game, on its own line */}
                              <span className="lbd-sub">in {formatClock(entry.highScoreTime)}</span>
                            </td>
                            <td className={`num ${sortKey === 'totalEarned' ? 'active' : ''}`}>{formatMoney(entry.totalEarned)}</td>
                            <td className={`num ${sortKey === 'longestSurvived' ? 'active' : ''}`}>{formatClock(entry.longestSurvived)}</td>
                            <td className="num lbd-games">{entry.gamesPlayed}</td>
                          </tr>
                        );
                      })}
                      {/* A search that matches nobody */}
                      {pageRows.length === 0 && (
                        <tr>
                          <td colSpan={6} className="lbd-nomatch">No players match “{search.trim()}”.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paging */}
                <div className="lbd-pager">
                  <span>
                    Showing {firstShown}–{lastShown} of {filtered.length} players
                  </span>
                  <span className="lbd-pager-btns">
                    <button type="button" className="lb-btn" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
                      Previous
                    </button>
                    <button type="button" className="lb-btn" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>
                      Next
                    </button>
                  </span>
                </div>
              </section>

              {/* Your standing  */}
              <aside className="lb-card lbd-you" aria-labelledby="you-title">
                <h2 id="you-title">Your standing</h2>
                {me ? (
                  // Signed in, and has saved games
                  <>
                    <p className="lbd-you-rank">
                      <strong>#{me.rank}</strong> of {ranked.length} players
                    </p>
                    <dl className="lbd-stats">
                      <div>
                        <dt>High score</dt>
                        <dd>{formatMoney(me.highScore)}</dd>
                        <dd className="lbd-sub">in {formatClock(me.highScoreTime)}</dd>
                      </div>
                      <div>
                        <dt>Total earned</dt>
                        <dd>{formatMoney(me.totalEarned)}</dd>
                      </div>
                      <div>
                        <dt>Longest survived</dt>
                        <dd>{formatClock(me.longestSurvived)}</dd>
                      </div>
                      <div>
                        <dt>Games</dt>
                        <dd>{me.gamesPlayed}</dd>
                      </div>
                    </dl>
                  </>
                ) : account ? (
                  // Signed in but hasn't finished a game yet
                  <p className="lb-muted">You're not on the board yet. Finish a game to get ranked.</p>
                ) : (
                  // Guest
                  <>
                    <p className="lb-muted">Guests can play, but only games from signed-in accounts are saved here.</p>
                    <button type="button" className="lb-btn wide" onClick={() => navigate('/LoginForm')}>Log in</button>
                  </>
                )}
                <Link className="lb-btn primary wide" to="/">Play a game</Link>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}