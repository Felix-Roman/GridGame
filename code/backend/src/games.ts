// =============================================================================
// games.ts
// The list of running game instances (kept in memory) plus the REST routes
// the lobby uses:  GET /api/games  and  POST /api/games
//
// Games live in server memory, so they disappear if the server restarts
// That's fine for now, eventually we may need to add persistant games or the ability to pause
// 
// This keeps the master list of games in a Map called "games"
// This also defines what a game, a player and a lobby-list entry look like the "interface" blocks, so TypeScript catches mistakes
// It gives other files small helper functions to look games up, list them, and clean out empty ones
// Finally this handles two web requests from the Home/Account page
// GET  /api/games  which is "give me the list of games"
// POST /api/games  which is "create a new game"
//
// Joining a game and live updates happen over Socket.IO in gameSocket.ts, which imports the helpers from this file
// =============================================================================
// Node's built-in crypto module this is used for secure random bytes to make game codes
import crypto from 'crypto';
// bcrypt hashes game passwords, exactly like account passwords in auth.ts, again PLEASE NEVER STORE PASSWORDS
import bcrypt from 'bcryptjs';
// Router groups the /api/games routes together and server.ts mounts it at /api/games
import { Router } from 'express';
// Limits how fast one IP address can create games, otherwise bad for AWS and bad for PC
import rateLimit from 'express-rate-limit';
// Settings from .env, max players per game, max games, etc
import { config } from './config';
// Reads the login cookie, so logged-in hosts use their account name I can change this later if needed.
import { readUser } from './auth';
// Each game gets its own power market from market.ts "type Market" imports just the TypeScript shape.
import { newMarket, type Market } from './market';
 
// What every user sees about each player this should matche frontend/src/game/types.ts
// This is what goes out in the "room_players" broadcast to everyone in the game
export interface PlayerState {
  // The player's Socket.IO connection id which is unique per open browser tab
  id: string;
  // The name shown in the player list
  username: string;
  // true = playing without an account
  guest: boolean;
  // Their current money
  score: number;
  // How long they've been playing in seconds
  timeSeconds: number;
  // Energy in their battery in kWh
  battery: number;
  // Their grid's frequency in Hz
  frequency: number;
  // Their automatic-control settings Main (Kp), Sum (Ki), Rate (Kd)
  pid: { main: number; sum: number; rat: number };
  // Their battery's size, so the roster can draw the battery bar to scale
  batteryCapacity: number;
  // Their grid has tripped and its game over for em.
  tripped: boolean;
}
 
// Server-only info kept next to each player's public state
// Other players should never see these two extra fields
export interface Member {
  state: PlayerState;
  // random per-tab id, lets a reconnecting tab take its own seat back
  playerKey: string;
  // account username, or null for guests
  account: string | null;
}
 
// One running game.
export interface GameRoom {
  // The 6-character code in the URL
  id: string;
  // The name the host typed like "Friday grid battle"
  name: string;
  // The User created it
  host: string;
  // The bcrypt hash of the game password, or null if the game is public
  passwordHash: string | null;
  // When it was created, as a timestamp
  createdAt: number;
  // Everyone in the as game socket ids that point to each Member
  members: Map<string, Member>;
  // A "something changed" flag. gameSocket.ts checks it 4 times a second and only re-sends the
  // player list when it's true, instead of sending on every single update.
  dirty: boolean;
  // When the last player left, or null while people are playing this is used to close empty games
  emptySince: number | null;
  // This game's power contracts
  market: Market;
}
 
// What the lobby list shows
// A deliberately smaller, safe version of GameRoom which is only what the "Active games" list needs
export interface GameSummary {
  // Game code
  id: string;
  // Game name
  name: string;
  // Host's name
  host: string;
  // true = no password needed
  isPublic: boolean;
  // How many players are in it
  playerCount: number;
  // The limit (30 by default), or null when unlimited, so the page shows "6/30" or just "6"
  maxPlayers: number | null;
  // The players' names, shown under the game in the list
  players: string[];
  // Used to sort newest first
  createdAt: number;
}
 
// Empty games stay listed this long, so a refresh or the creator's first join doesn't lose them
// 60_000 ms = 60 seconds
export const EMPTY_GAME_GRACE_MS = 60_000;
 
// THE master list of game lives in the server's memory (RAM)
// which is fast but is wiped when the server restarts. Not exported, so other files must use the helpers below
const games = new Map<string, GameRoom>();
// A flag meaning "the lobby list changed since we last sent it". gameSocket.ts sends an update when it's true
// "let" not "const" because it gets changed
let lobbyChanged = false;
 
// Set it "the list changed"
export const markLobbyDirty = () => { lobbyChanged = true; };
// Read it
export const lobbyIsDirty = () => lobbyChanged;
// Reset it after sending
export const clearLobbyDirty = () => { lobbyChanged = false; };
 
// The current player limit. MAX_PLAYERS_PER_GAME=0 in .env means "no limit", which we represent as Infinity
export const maxPlayers = () => (config.maxPlayersPerGame > 0 ? config.maxPlayersPerGame : Infinity);
 
// Trims and validates a display name and returns null if it isn't usable
// Used for player names (max 20 characters) and game names (passes 40)
// "maxLength = 20" gives the parameter a default value when it isn't passed
export function cleanName(value: unknown, maxLength = 20): string | null {
  // Must be text it comes from the browser, so it could potentionally be anything
  if (typeof value !== 'string') return null;
  // Clean it in three steps, chained one after another
  // delete invisible "control characters" (codes 0–31 and 127), which can break the display. \u0000 means "the character with code 0000"
  // .replace(/[\u0000-\u001f\u007f]/g, '')  
  // turn any run of spaces/tabs/newlines into a single space
  // .replace(/\s+/g, ' ')
  // remove spaces at the start and end
  // .trim()
  const s = value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  // Keep it only if it's 1 to maxLength characters long otherwise return null ("not usable")
  return s.length >= 1 && s.length <= maxLength ? s : null;
}
 
// 6-character codes without look-alike characters (no 0/o, 1/l/i).
// So a code read aloud or typed from a screenshot can't be confused. 31 characters in total.
const ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

// Makes a new unused game code
function newGameId(): string {
  // Declared outside the loop so it can be returned after it
  let id: string;
  do {
    // crypto.randomBytes(6)  is 6 random numbers from 0 to 255
    // Array.from(bytes, fn) turns each number into a letter doing b % 31
    // which picks a character from ID_ALPHABET and then .join('') glues the 6 letters into one string
    id = Array.from(crypto.randomBytes(6), (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('');
  // In the very rare case that code is already used by a running game, make another one, its like super low probability though so shouldn't spam make these
  } while (games.has(id));
  // return a unique code nobody else has
  return id;
}
 
// Finds a game by its code returns the GameRoom, or undefined if there's no such game
// Checks the id is text first, because it comes from the browser
export function getGame(id: unknown): GameRoom | undefined {
  // if it's a string, look it up in the Map otherwise undefined
  return typeof id === 'string' ? games.get(id) : undefined;
}
 
// Lets gameSocket.ts loop over every game for the 4-times-a-second broadcast loop
export const allGames = () => games.values();
 
// Turns a game's members into the plain list of PlayerState objects that gets sent to browsers
// .values() gives each Member a "(m) => m.state" and keeps only the public part dropping playerKey and account
export const playersOf = (game: GameRoom): PlayerState[] => Array.from(game.members.values(), (m) => m.state);
 
// Builds the safe lobby-list entry for one game
export function summarize(game: GameRoom): GameSummary {
  // .map turns each PlayerState into its username
  const players = playersOf(game).map((p) => p.username);
  // The current limit either a number or Infinity
  const limit = maxPlayers();
  // Build and return the summary object
  return {
    // Copy the basic fields
    id: game.id,
    name: game.name,
    host: game.host,
    // Public when there's no password hash
    isPublic: game.passwordHash === null,
    // How many names there are
    playerCount: players.length,
    // Infinity can't be sent as JSON, so send null for "no limit"
    maxPlayers: Number.isFinite(limit) ? limit : null,
    // Shorthand for "players: players"
    players,
    // For sorting
    createdAt: game.createdAt,
  };
}
 
// The full lobby list with every game summarized shwoing the newest first
export function listGames(): GameSummary[] {
  // Array.from(games.values(), summarize) runs summarize on each game
  // .sort((a, b) => b.createdAt - a.createdAt) sorts by creation time: a positive result puts b first
  return Array.from(games.values(), summarize).sort((a, b) => b.createdAt - a.createdAt);
}
 
// Removes games that have been empty longer than the grace period
// gameSocket.ts calls this 4 times a second
// "now = Date.now()" defaults to the current time
export function sweepEmptyGames(now = Date.now()) {
  // Look at every game
  for (const game of games.values()) {
    // Close it only if ALL are true nobody is in it, it has a recorded "empty since" time, and that was more than 60 seconds ago.
    if (game.members.size === 0 && game.emptySince !== null && now - game.emptySince > EMPTY_GAME_GRACE_MS) {
      // Remove it from the master list, I think this is a safe delete and not a memory leak
      games.delete(game.id);
      // The lobby list changed, so the next broadcast will tell everyone
      lobbyChanged = true;
      // Note it in the server terminal
      console.log(`Game closed (empty): ${game.name} [${game.id}]`);
    }
  }
}
 
// The router, server.ts mounts it at /api/games, so '/' below means /api/games
export const gamesRouter = Router();
 
// Stops one IP address from flooding the server with games
const createLimiter = rateLimit({
  // Count over 1 minute
  windowMs: 60 * 1000,
  // At most 10 new games per minute per IP
  limit: 10,
  // The reply once someone goes over (with HTTP status 429 "Too Many Requests")
  message: { error: 'Too many games created. Try again in a minute.' },
// Closes the settings
});
 
// The lobby's list of active games
// GET /api/games. "_req" starts with an underscore to show we don't use the request
gamesRouter.get('/', (_req, res) => {
  // Send the list as JSON.
  res.json(listGames());
});
 
// Create a game with Body: { name, hostName, isPublic, password? }
// POST /api/games the rate limiter runs first, then this handler, and then "async" because hashing takes time
gamesRouter.post('/', createLimiter, async (req, res) => {
  // Pull the four fields out of the JSON the browser sent
  // "?? {}" protects against a missing body
  const { name, hostName, isPublic, password } = req.body ?? {};
 
  // Logged-in players always host under their account name and guests use the name they typed, we can edit this later and probably will need too
  // readUser(req)?.username is the account name or undefined and "??" falls back to the cleaned typed name
  const host = readUser(req)?.username ?? cleanName(hostName);
  // No usable name? reply 400 ("Bad Request") and stop
  if (!host) return res.status(400).json({ error: 'Enter your name first (1–20 characters).' });
 
  // Game names may be up to 40 characters
  const gameName = cleanName(name, 40);

  // Missing or too long then reject
  if (!gameName) return res.status(400).json({ error: 'Give the game a name (1–40 characters).' });
 
  // isPublic must be exactly true or false, not "true" as text, not missing, and not wearing a fake mustache and glasses
  if (typeof isPublic !== 'boolean') return res.status(400).json({ error: 'Invalid input' });
 
  // Starts as null
  let passwordHash: string | null = null;
  // Password-protected game
  if (!isPublic) {
    // The password must be text, 3 to 64 characters
    if (typeof password !== 'string' || password.length < 3 || password.length > 64) {
      // Explain the rule
      return res.status(400).json({ error: 'Game password must be 3–64 characters.' });
    }
    // Store only a hash
    passwordHash = await bcrypt.hash(password, 10);
  }
 
  // Too many games running at once? Refuse them!
  // this uses error 503 "Service Unavailable" to protect the server's or PC's memory
  if (games.size >= config.maxGames) {
    // Friendly explanation
    return res.status(503).json({ error: 'The server is full of games right now. Join one or try later.' });
    // Unfriendly explanation
    //return res.status(503).json({ error: 'The server is full right now go away' });
  }
 
  // Build the new game
  const game: GameRoom = {
    // A fresh unique code
    id: newGameId(),
    // The cleaned name
    name: gameName,
    // Shorthand for "host: host"
    host,
    // The hash or null for public
    passwordHash,
    // timstamps duh
    createdAt: Date.now(),
    // No players yet, the user who made it joins over Socket.IO right after this
    members: new Map(),
    // Nothing to broadcast yet
    dirty: false,
    // starts empty, removed if nobody joins within the grace period
    // so a game whose creator closes the tab doesn't sit in the list forever
    emptySince: Date.now(),
    // An empty power market
    market: newMarket(),
  };

  // Add it to the master list
  games.set(game.id, game);
  // Tell the broadcast loop the lobby list changed, so everyone's aactive games list updates
  lobbyChanged = true;
  // Log it in the terminal
  console.log(`Game created: ${game.name} [${game.id}] by ${host} (${isPublic ? 'public' : 'password'})`);
  // Sends 201 Created code
  res.status(201).json({ id: game.id });
});
