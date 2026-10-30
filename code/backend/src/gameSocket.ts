// =============================================================================
// gameSocket.ts
// Socket.IO events
// watch_lobby and unwatch_lobby then server sends the games or the live list
// join_game update_state leave_game
//
// Guests and logged-in players both connect. The login cookie (if any) decides the account namme
//
// Normal web requests (like /api/games) are one question, one answer, done.
// A game needs the server to PUSH updates the moment something changes, so each open tab keeps one socket open to the server
// Socket.IO handles that connection. Both sides talk with named events
// socket.emit('name', data) which is used to send an event
// socket.on('name', handler) which runs the handler when that event arrives
//
// this file figures out what each new connection is, either a guest or an account
// it handles every event a browser can send those being join, update, market, and leave
// and it runs a timer 4 times a second that sends batched updates to everyone
// =============================================================================

import type { Server } from 'socket.io';
import bcrypt from 'bcryptjs';
import { COOKIE_NAME, verifyToken } from './auth';
import { allGames, cleanName, clearLobbyDirty, getGame, listGames, lobbyIsDirty, markLobbyDirty, maxPlayers, playersOf, sweepEmptyGames, type GameRoom, type PlayerState, } from './games';
import { acceptOffer, cancelOffer, cancelOffersBy, expireContracts, makeOffer, publicContracts } from './market';

// The name of the Socket.IO room for everyone looking at the Home/Account page
const LOBBY_ROOM = 'lobby:list';
// How often the broadcast loop runs, every 250 ms
const TICK_MS = 250;
// The lobby list is sent at most once a second
const LOBBY_PUSH_MS = 1000;
// After 10 wrong game passwords on one connection that connection is cut off
const MAX_WRONG_PASSWORDS = 10;

// ---------------------------------------------------------------- reply shapes
// Every reason a join can fail. "|" means "or": a JoinError is exactly one of these words.
// Game.tsx has the same list and picks a message for each.
type JoinError =
  // No game with that code (or it closed).
  | 'not_found'
  // It's a password game and no password was sent.
  | 'need_password'
  // Wrong password.
  | 'bad_password'
  // The name is empty or too long.
  | 'bad_name'
  // Someone else in this game already uses that name.
  | 'name_taken'
  // The game has hit the player limit.
  | 'full'
  // Too many wrong passwords.
  | 'too_many_tries'
  // A join from this tab is already being processed.
  | 'busy';
// The answer to a join: either success (with the accepted name and game info) or failure (with a reason).
// TypeScript knows that when ok is true there's a name, and when ok is false there's an error.
type JoinReply = { ok: true; name: string; gameName: string; isPublic: boolean } | { ok: false; error: JoinError };

// The browser sends all its cookies as one line of text "theme=dark; token=eyJhbGci..."
// This finds the one we have made and returns its value, or undefined
function readCookie(header: string | undefined, name: string): string | undefined {
  // No cookies at all
  if (!header) return undefined;

  // Split the line at each ";" and look at each "name=value" piece
  for (const part of header.split(';')) {
    // Position of the "="
    const i = part.indexOf('=');

    // Skip pieces with no "=" and "continue" jumps to the next piece.
    if (i < 0 || part.slice(0, i).trim() !== name) continue;

    // Cookie values can be "URL-encoded" (a space stored as %20) decodeURIComponent turns that back
    // It can and probably will throw an error on malformed text, hence try/catch
    try {
      // Everything after the "=", trimmed and decoded
      return decodeURIComponent(part.slice(i + 1).trim());
    // Malformed value
    } catch {
      // Not usable
      return undefined;
    }
  }
  // Went through every piece without finding that delicious chocolate goodie
  return undefined;
}

// Accept only finite numbers in a sane range
// Used on numbers sent by browsers, which could send anything like "abc", Infinity, or just a huge number
const num = (v: unknown, min: number, max: number): number | undefined => typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined;

// Builds the starting info for a player who just joined the browser then updates these numbers right after
function newPlayerState(id: string, username: string, guest: boolean): PlayerState {
  return {
    // their socket id
    id,
    // their name
    username,
    // Guest or account
    guest,
    // Placeholder numbers until their first update arrives
    score: 0,
    // Time
    timeSeconds: 0,
    // Battery number
    battery: 500,
    // Current Frequency number
    frequency: 60.0,
    // Default automatic-control gains
    pid: { main: 200, sum: 10, rat: 0 },
    // Default battery size
    batteryCapacity: 1000,
    // Their grid is up
    tripped: false,
  };
}

// The market as clients receive it with the server clock for countdowns
// serverNow lets each browser work out how far its own clock differs from the server's
const marketPayload = (game: GameRoom) => ({ contracts: publicContracts(game.market), serverNow: Date.now() });

// server.ts calls this once, passing in the Socket.IO server, everything below is set up inside it
export function attachGameSockets(io: Server) {
  // io.use() is Socket.IO, it runs once for each new connection, before any events
  // Runs once per connection, no cookie just means "guest"
  io.use((socket, next) => {
    // The browser sends its cookies when it opens the connection socket.handshake.headers.cookie
    // Find our cookie and check it, exactly like auth.ts does for web requests cause Im lazy and it works and I also think it might be the standard but im unsure
    const user = verifyToken(readCookie(socket.handshake.headers.cookie, COOKIE_NAME));
    // socket.data is a place to store our own info on this connection
    socket.data.account = user?.username ?? null;
    // Let the connection through
    next();
  });

  // This function runs once for EVERY new connection and everything inside belongs to that one connection
  io.on('connection', (socket) => {
    // Which game this socket is in
    let gameId: string | null = null;
    // true while a join is being processed this is so a double-click can't run two joins at once
    let joining = false;
    // How many wrong game passwords this connection has tried
    let wrongPasswords = 0;

    // Takes this connection out of its current game this is used for leave_game, disconnect, and before a new user joins
    const leave = () => {
      if (!gameId) return;
      // Find the game, it might already be gone
      const game = getGame(gameId);
      // Leave the Socket.IO room so this tab stops receiving that games broadcasts
      socket.leave(gameId);
      // tell the system to remember we're in no game now
      gameId = null;
      // Find this connection's player entry
      const member = game?.members.get(socket.id);
      // If the game and player exist then remove the player
      if (game && member && game.members.delete(socket.id)) {
        // Their unsold offers are withdrawn, unless the same name is still in the game this is a bug and needs to be fixed
        const name = member.state.username;
        // if no one with that name is left, cancel their open market offers
        if (![...game.members.values()].some((m) => m.state.username === name)) cancelOffersBy(game.market, name);
        // If the game is now empty, start its 60 second countdown to closing
        if (game.members.size === 0) game.emptySince = Date.now();
        // The player list changed so broadcast it on the next tick
        game.dirty = true;
        // The lobby's player counts changed too
        markLobbyDirty();
      }
    };

    // The Home/Account page sends this when it opens
    socket.on('watch_lobby', () => {
      // Join the lobby room, so the broadcast loop's list updates reach this tab
      socket.join(LOBBY_ROOM);
      // Send the current list right away, so the page doesn't wait up to a second
      socket.emit('games', listGames());
    });

    // Stop sending me the list and go away function
    socket.on('unwatch_lobby', () => {
      // Leave the lobby room
      socket.leave(LOBBY_ROOM);
    });

    // payload { gameId, name, password?, playerKey } and reply via ack(JoinReply)
    // ack is a callback function the browser sends along with the event
    // Calling ack(answer) sends the answer straight back to that browser
    // "async" because checking a password with bcrypt takes time and I wanna slow hackers down
    socket.on('join_game', async (payload: unknown, ack: unknown) => {
      // If the browser didn't send a reply function, there's no way to answer, so ignore it
      if (typeof ack !== 'function') return;
      // Give it a proper type so TypeScript checks every reply we send
      const reply = ack as (r: JoinReply) => void;
      // A join from this tab is already in progress so answer "busy" and stop
      if (joining) return reply({ ok: false, error: 'busy' });
      // Mark that a join is now in progress
      joining = true;
      try {
        // Make sure the payload is an object if it aint then use an empty one so reading fields can't crash
        // Record<string, unknown> is an object with any fields whose values still have to be checked
        const p = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
        // If this tab was already in a game, leave it first
        leave();

        // Look up the game
        let game = getGame(p.gameId);
        // if no such game then tell the browser
        if (!game) return reply({ ok: false, error: 'not_found' });

        // The account name from the cookie or null for a guest.
        const account = (socket.data.account as string | null) ?? null;
        // Logged in players always use their account name while guests use their cleaned typed name
        const name = account ?? cleanName(p.name);
        // if no usable name then tell the browser and the guest gets a "Pick a name" form
        if (!name) return reply({ ok: false, error: 'bad_name' });
        // The tab's random id
        const playerKey = typeof p.playerKey === 'string' ? p.playerKey.slice(0, 64) : '';

        // Password check only for password games
        if (game.passwordHash) {
          // Too many wrong guesses on this connection already?
          if (wrongPasswords >= MAX_WRONG_PASSWORDS) {
            // Tell them why they are naughty
            reply({ ok: false, error: 'too_many_tries' });
            // and close their connection
            socket.disconnect(true);
            return;
          }
          // the browser shows the password form
          if (typeof p.password !== 'string' || !p.password) return reply({ ok: false, error: 'need_password' });
          // Compare the typed password, max 64 characters, with the stored hash "await" waits for bcrypt
          if (!(await bcrypt.compare(p.password.slice(0, 64), game.passwordHash))) {
            // Wrong, count it for the max number of wrong guesses 
            wrongPasswords++;
            return reply({ ok: false, error: 'bad_password' });
          }
          // While we were waiting for bcrypt, the game may have closed, so look it up again
          game = getGame(p.gameId);
          // if its gone then tell the browser.
          if (!game) return reply({ ok: false, error: 'not_found' });
        }

        // Names are unique inside a game so if the same tab/account is reconnecting it takes its seat back and the stale connection is closed
        // Compare in lowercase so "Michael" and "michael" count as the same name, dont change this or you'll break things
        const lower = name.toLowerCase();
        // Look at every player in the game then [sid, member] unpacks each Map entry into its key socket id and value
        for (const [sid, member] of game.members) {
          // diferent name but not a conflict then skip to the next player
          if (member.state.username.toLowerCase() !== lower) continue;
          // Same name
          const sameAccount = account !== null && member.account === account;
          // or the same browser tab so same playerKey?
          const samePlayer = playerKey !== '' && member.playerKey === playerKey;
          // Neither it's someone else, so the name is taken
          if (!sameAccount && !samePlayer) return reply({ ok: false, error: 'name_taken' });
          // It's the same person reconnecting: remove their old spot
          game.members.delete(sid);
          // find their old connection, if it's still open
          const old = io.sockets.sockets.get(sid);
          // If it exists and isn't THIS connection
          if (old && old.id !== socket.id) {
            // tell that old tab why it's being closed
            old.emit('replaced');
            // close it.
            old.disconnect(true);
          }
        }

        // Tracks player limit, infinity makes this not applicable 
        if (game.members.size >= maxPlayers()) return reply({ ok: false, error: 'full' });

        // All checks passed then add the player
        // "account === null" is true for guests
        game.members.set(socket.id, { account, playerKey, state: newPlayerState(socket.id, name, account === null) });
        // Someone is in the game, so cancel any closing countdown
        game.emptySince = null;
        // Remember which game this connection is in
        gameId = game.id;
        // Join the game's Socket.IO room, so this tab receives its broadcasts
        socket.join(game.id);
        // The lobby's player counts changed
        markLobbyDirty();

        // Tell the browser it's in it switches from the join screen to the game
        reply({ ok: true, name, gameName: game.name, isPublic: game.passwordHash === null });
        // Send the updated player list to everyone in the game right away including the new player
        io.to(game.id).emit('room_players', playersOf(game));
        // We just broadcast, so there's nothing pending for the next tick
        game.dirty = false;
        // Send the new player the current market
        socket.emit('market', marketPayload(game));
        // Log it in the terminal
        console.log(`${name}${account ? '' : ' (guest)'} joined ${game.name} [${game.id}]`);
      // Something unexpected went wrong
      } catch (err) {
        // Print the details in the terminal
        console.error('[join_game]', err);
        // give the browser a safe answer
        reply({ ok: false, error: 'not_found' });
      } finally {
        // The join is finished so another one may start
        joining = false;
      }
    });

    // Each browser sends its numbers about once a second in Game.tsx We store them and the loop broadcasts them
    socket.on('update_state', (data: unknown) => {
      // Ignore it if this tab isn't in a game or the data isn't an object
      if (!gameId || !data || typeof data !== 'object') return;
      // Find the game
      const game = getGame(gameId);
      // this specific player in it
      const member = game?.members.get(socket.id);
      // Either missing then just ignore it
      if (!game || !member){
        return;
      }

      // Copy only known numeric fields, id/username/guest can never be changed by the users
      // Treat the data as an object with fields we must check
      const d = data as Record<string, unknown>;
      // A short name for this player's public info
      const s = member.state;
      // For each number num() gives a checked value, or undefined then "?? s.score" keeps the old value if it is undefined
      // The ranges are generous atm we should probably change this they only stop absurd values like 1e300 or negative time
      s.score = num(d.score, -1e12, 1e12) ?? s.score;
      s.timeSeconds = num(d.timeSeconds, 0, 1e9) ?? s.timeSeconds;
      s.battery = num(d.battery, -1e9, 1e9) ?? s.battery;
      s.frequency = num(d.frequency, 0, 1000) ?? s.frequency;
      s.batteryCapacity = num(d.batteryCapacity, 0, 1e9) ?? s.batteryCapacity;
      // tripped must be exactly true or false
      if (typeof d.tripped === 'boolean') s.tripped = d.tripped;
      // The automatic-control gains, if sent, as an object
      if (d.pid && typeof d.pid === 'object') {
        // Treat it as an object with fields to check
        const pid = d.pid as Record<string, unknown>;
        // Same check-or-keep pattern for Main, Sum and Rate
        s.pid.main = num(pid.main, -1e6, 1e6) ?? s.pid.main;
        s.pid.sum = num(pid.sum, -1e6, 1e6) ?? s.pid.sum;
        s.pid.rat = num(pid.rat, -1e6, 1e6) ?? s.pid.rat;
      }
      // Mark the game as changed then the loop sends one update for everyone at the next tick
      game.dirty = true;
    });




    // Finds this socket's game and player or null if it isn't in one
    const me = () => {
      // The game if this tab is in one
      const game = gameId ? getGame(gameId) : undefined;
      // This player in it
      const member = game?.members.get(socket.id);
      // return them together otherwise null
      return game && member ? { game, member } : null;
    };


    // Sends an event to a player by ame
    const sendToPlayer = (game: GameRoom, name: string, event: string, data: unknown) => {
      // Check every player in the game
      for (const [sid, m] of game.members) {
        // if the name matches find that connection and send the event
        if (m.state.username === name) io.sockets.sockets.get(sid)?.emit(event, data);
      }
    };

    // "Sell power" the browser sends powerKw, durationS, pricePerKwh and waits for a reply
    socket.on('market_offer', (payload: unknown, ack: unknown) => {
      // Use the reply function if there is one otherwise a do-nothing function so calling reply never crashes
      const reply = typeof ack === 'function' ? (ack as (r: unknown) => void) : () => {};
      // Who's asking and which game
      const ctx = me();
      // Not in a game then refuse
      if (!ctx) return reply({ ok: false, error: 'Join the game first.' });
      // market.ts checks the numbers and records the offer under this player's name
      const res = makeOffer(ctx.game.market, ctx.member.state.username, payload);
      // Reply success, or pass on market.ts's error message
      reply(res.ok ? { ok: true } : res);
    });

    // the browser sends id of the offer it wants
    socket.on('market_accept', (payload: unknown, ack: unknown) => {
      // Same safe reply function as above
      const reply = typeof ack === 'function' ? (ack as (r: unknown) => void) : () => {};
      // Who's asking and which game
      const ctx = me();
      // if they arent in a game then refuse
      if (!ctx) return reply({ ok: false, error: 'Join the game first.' });
      // read the offer id from the payload or undefined if the payload isn't an object
      const id = payload && typeof payload === 'object' ? (payload as Record<string, unknown>).id : undefined;
      // Find that offer in this game's market
      const offer = ctx.game.market.contracts.find((c) => c.id === id);
      // Is the seller still in the game
      const sellerPresent = !!offer && [...ctx.game.members.values()].some((m) => m.state.username === offer.seller);
      // market.ts decides, is it still open, not theirs, can they afford it
      const res = acceptOffer(ctx.game.market, ctx.member.state.username, id, ctx.member.state.score, sellerPresent);
      // Refused, pass on the reason
      if (!res.ok) return reply(res);
      // Money changes hands once at the start each browser applies it to its own score
      // Tell the buyer to subtract the price
      sendToPlayer(ctx.game, res.contract.buyer!, 'market_trade', { role: 'buyer', amount: res.contract.totalPrice, id: res.contract.id });
      // Tell the seller to add the price
      sendToPlayer(ctx.game, res.contract.seller, 'market_trade', { role: 'seller', amount: res.contract.totalPrice, id: res.contract.id });
      // Confirm to the buyer's tab that it worked
      reply({ ok: true });
    });

    // the seller withdraws an open offer, No reply needed
    socket.on('market_cancel', (payload: unknown) => {
      // Who asking and which game
      const ctx = me();
      // Not in a game, ignore em
      if (!ctx) return;
      // Read the offer id
      const id = payload && typeof payload === 'object' ? (payload as Record<string, unknown>).id : undefined;
      // market.ts only cancels it if it's still open AND belongs to this player
      cancelOffer(ctx.game.market, ctx.member.state.username, id);
    });

    // The browser asked to leave the game
    socket.on('leave_game', leave);
    // The connection closed Socket.IO should fire this automatically
    socket.on('disconnect', leave);
  });

  // Broadcast loop. Batching updates keeps traffic at (players x 4/sec) per room
  // instead of (players x players) every time anyone's number changes
  // When the lobby list was last sent (0 = never)
  let lastLobbyPush = 0;
  // setInterval(fn, ms) runs fn every ms milliseconds, forever, until stopped
  const timer = setInterval(() => {
    // The current time, read once and reused below
    const now = Date.now();
    // Go through every game
    for (const game of allGames()) {
      // Mark contracts whose time is up as done
      expireContracts(game.market, now);
      // Did the market change
      if (game.market.dirty) {
        // Reset the flag
        game.market.dirty = false;
        // send the new market to everyone in that game
        io.to(game.id).emit('market', marketPayload(game));
      }
      // Player list unchanged then skip to the next game
      if (!game.dirty) continue;
      // Reset the flag again
      game.dirty = false;
      // end everyone in the game the full, current player list one message per player per tick at most
      io.to(game.id).emit('room_players', playersOf(game));
    // Closes the loop over games.
    }

    // Close games that have been empty for more than 60 seconds
    sweepEmptyGames(now);
    // If the lobby list changed AND at least a second has passed since the last send
    if (lobbyIsDirty() && now - lastLobbyPush >= LOBBY_PUSH_MS) {
      // reset the flag
      clearLobbyDirty();
      // remember when we sent it
      lastLobbyPush = now;
      // send the new list to everyone on the Home/Account page
      io.to(LOBBY_ROOM).emit('games', listGames());
    }
  // Every TICK_MS 250 milliseconds or 4 times a sec
  }, TICK_MS);


  // Normally a running timer keeps Node from exiting. unref() says "don't stay alive just for me"
  timer.unref();

  // Give server.ts a function that stops the loop it should call it during a clean shutdown
  return () => clearInterval(timer);
}