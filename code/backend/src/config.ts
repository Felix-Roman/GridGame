// =============================================================================
// config.ts
// Reads every setting from backend/.env in ONE place, so the rest of the code
// never touches process.env directly. Import this first in server.ts
//
// Settings like the database address or the JWT secret are different on PC and on AWS, and some are secret.
// They live in a plain text file, backend/.env as cpnstants
// 
// loads backend/.env into process.env (Node's built-in list of "environment variables": settings handed to a program from outside)
// checks each value and fills in a sensible default when one is missing
// exports ONE object, "config", that every other file then imports
//
// Everything in .env arrives as TEXT, even numbers, so most of the work below is turning text like "30" into the real number 30
// =============================================================================

// "path" is Npde's built-in helper for building file paths that work on Windows (\) and Linux (/)
import path from 'path';
// "dotenv" is the library that reads a .env file and copies its lines into process.env
import dotenv from 'dotenv';
 
// Load backend/.env no matter which folder the server was started from
// __dirname is backend/src when running with tsx, backend/dist after a build
// __dirname = the folder THIS file is in. "../.env" = go up one folder to backend/ and find .env
//
// path.resolve joins those into one full path like C:\...\code\backend\.env
// quiet when true stops dotenv from printing a log line every time it loads
const envOptions = { path: path.resolve(__dirname, '../.env'), quiet: true };
// After this line process.env.PORT, process.env.JWT_SECRET, etc. hold the .env values
dotenv.config(envOptions);
 
// on/off settings
// value is the text from .env, or undefined if the line is missing ("string | undefined" = either)
// fallback is what to use when it's missing
// Returns true, false, or the word auto
function parseFlag(value: string | undefined, fallback: boolean | 'auto'): boolean | 'auto' {
  // Trim and set the text to lowercase
  const v = value?.trim().toLowerCase();
  // Missing or empty then use the fallback should be auto
  if (!v) return fallback;
  // The special word "auto" is kept as-is
  if (v === 'auto') return 'auto';
  // Anything in this list means "on"; everything else like "false", "0", "no", typos, etc means "off"
  // .includes(v) is true if v is one of the four words
  return ['1', 'true', 'yes', 'on'].includes(v);
}
 
// the proxy setting
// Express trustproxy accepts true or false, a hop count, or names
// Cloudflare's tunnel program "cloudflared" runs on a personal PC and forwards visitors to this server from a port
function parseTrustProxy(value: string | undefined): boolean | number | string {
  // Remove spaces.
  const v = value?.trim();
  // if its missing, trust only programs on this same computer ("loopback" = 127.0.0.1), which is where cloudflared runs
  // if using cloudflare make sure nginx running on this same machine
  if (!v) return 'loopback';
  // "true" = trust any forwarder this is only safe if nothing can reach the server except through the proxy
  if (v === 'true') return true;
  // "false" = trust no forwarder, use the raw connection info
  if (v === 'false') return false;
  // Only digits (regular expression: ^ start, \d+ one or more digits, $ end)? Then it's a number of proxy "hops" to trust
  if (/^\d+$/.test(v)) return Number(v);
  // Anything else (like "loopback" or an IP address) is passed to Express exactly as written
  return v;
}
 
// whole numbers
// Whole numbers >= 0. 0 means "no limit" where noted.
// Turns text like "30" into the number 30, or uses the fallback if the text is missing or isn't a valid count
function parseCount(value: string | undefined, fallback: number): number {
  const n = Number(value);
  // Use n only if ALL of these are true otherwise yse the fallback
  // value !== undefined then the line exists in .env
  // value.trim() !== '' then it isn't blank (Number('') would be 0, which we don't want to sneak in)
  // Number.isInteger(n) then it's a whole number (rules out "2.5" and NaN)
  // n >= 0 then it isn't negative
  return value !== undefined && value.trim() !== '' && Number.isInteger(n) && n >= 0 ? n : fallback;
}
 
// the JWT secret (required)
// Read the secret that signs login tokens
const jwtSecret = process.env.JWT_SECRET?.trim() ?? '';
// No secret? Stop the server immediately with a clear message. Running without one would make every login forgeable!
if (!jwtSecret) {
  throw new Error(
    // The message you'll see in the terminal with no jwt token
    'JWT_SECRET is not set. Add a long random string to backend/.env (see backend/.env.example).',
  );
}
// A short secret is easier to guess. I'll leave this in for now but this should also stop the program instead of just warning you
if (jwtSecret.length < 32) {
  // console.warn prints to the terminal like console.log, marked as a warning.
  console.warn('[config] JWT_SECRET is shorter than 32 characters. Use a longer random value.');
}
 
// the settings object
// The one object the rest of the backend uses like config.port in server.ts or config.jwtSecret in auth.ts
// "export" makes it importable and "const" means the variable can't be reassigned
export const config = {
  // The port number the server listens on. Missing or invalid PORT uses 3000 instead
  port: parseCount(process.env.PORT, 3000),
  // 0.0.0.0 = accept connections from other machines which is needed on AWS. Use 127.0.0.1 to keep it private
  // "||" picks the right side when the left is empty or missing
  host: process.env.HOST?.trim() || '0.0.0.0',
  // 127.0.0.1 instead of "localhost" avoids an IPv6 (::1) mismatch with a local MongoDB install
  // This uses MongoDB on this computer, its standard port 27017, a database named "gridgame"
  mongoUri: process.env.MONGO_URI?.trim() || 'mongodb://127.0.0.1:27017/gridgame',
  // the checked jwt secret from above
  jwtSecret,
  // auto = mark the login cookie "Secure" only when the visitor is on https
  // Missing COOKIE_SECURE -> 'auto'
  cookieSecure: parseFlag(process.env.COOKIE_SECURE, 'auto'),
  // Which proxies to believe server.ts passes this to app.set('trust proxy', ...)
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  // Only needed if the frontend is hosted on a DIFFERENT domain than this server
  // Empty string = "same site", so server.ts doesn't turn CORS on at all
  clientOrigin: process.env.CLIENT_ORIGIN?.trim() || '',
  // 0 = unlimited players per game, games.ts turns 0 into Infinity
  maxPlayersPerGame: parseCount(process.env.MAX_PLAYERS_PER_GAME, 30),
  // The most games that can exist at once which protects the server's memory and a PC
  // The extra "|| 200" also turns 0 into 200, because "0 games allowed" would make the site useless, believe it not this was infact a bug for a bit, I am not a smart man.
  maxGames: parseCount(process.env.MAX_GAMES, 200) || 200,
  // The built React app (npm run build in frontend/)
  // if FRONTEND_DIST is set (and not blank)
  frontendDist: process.env.FRONTEND_DIST?.trim()
    // use that folder (path.resolve makes it a full path)
    ? path.resolve(process.env.FRONTEND_DIST.trim())
    // otherwise go up two folders from this file (src -> backend -> code) and into frontend/dist
    : path.resolve(__dirname, '../../frontend/dist'),
};
