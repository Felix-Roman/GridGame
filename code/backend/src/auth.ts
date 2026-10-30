//=============================================================================
// auth.ts
// Account routes (register / login / logout / me) and helpers that read the login cookie.
// Accounts are optional: guests can still play with any name.
//
// Register/Login: the browser sends a username + password. 
// We check them, then hand the browser a token stored in a cookie.
// Every later request: the browser sends that cookie back automatically.
// We check the token's signature to know who is asking, with no database lookup needed.
// Logout: we tell the browser to delete the cookie.
//
// Passwords are NEVER stored. We store a bcrypt "hash" which is a scrambled version that can check a password but can't be turned back into it.
// Along with that the hash uses salt which means users with the same passwords dont get the same hash code.
//=============================================================================

// Pull tools out of Express the frontend web server library
// Router is a mini-app that groups related routes.
// Request is a TypeScript type for an incoming request what the browser sent usually http ot https I think
// Response is a TypeScript type for the reply we send back
// NextFunction is a TypeScript type for "hand the request to the next step"
// CookieOptions is the TypeScript type for cookie settings, or the tokens.
import { Router, type Request, type Response, type NextFunction, type CookieOptions } from 'express';
// bcryptjs turns a password into a slow, salted hash and later checks a password against that hash. DO NOT EXPOSE PASSWORDS PLEASE
import bcrypt from 'bcryptjs';
// jsonwebtoken creates and checks JWTs (JSON Web Tokens): small signed text tokens that say who you are aka cookies.
import jwt from 'jsonwebtoken';
// express-rate-limit counts requests per IP address and blocks anyone sending too many (stops password guessing so please dont touch)
import rateLimit from 'express-rate-limit';
// The MongoDB "User" model from models/User.ts. It's how we create,store, and find users in the database
import { User } from './models/User';
// All settings read from backend/.env mainly the JWT secret, cookie settings, etc.)
import { config } from './config';

// The name of the cookie that holds the login token and "export" lets server.ts / gameSocket.ts use it too.
export const COOKIE_NAME = 'GridGame2026';
// How long a login will last in milliseconds: 1000 ms * 60 sec * 60 min * 24 hours * 7 days = 7 days in seconds
const SESSION_MS = 1000 * 60 * 60 * 24 * 7;
// A regular expression that usernames MUST match
// ^ ... $ = the WHOLE string must match, not just part of it
// [A-Za-z0-9_-] = letters, digits, underscore or dash
// {3,20} = between 3 and 20 of those characters
const USERNAME_RE = /^[A-Za-z0-9_-]{3,20}$/;

// Builds the cookie settings which is a function (not a constant) because "secure" depends on the request
// Built per request so "secure" can follow whether the visitor is on https, s as in secure
function cookieOptions(req: Request): CookieOptions {
  // Returning the object with these four settings
  return {
    // httpOnly means JavaScript running in the page can't read this cookie, so a malicious script can't steal it
    httpOnly: true,
    // sameSite 'lax': the browser won't send the cookie when another website secretly submits a form to gridgame
    // protects against cross-site request forgery
    sameSite: 'lax',
    // only send the cookie over https. With COOKIE_SECURE=auto we copy wheather THIS request came over https so req.secure is true through Cloudflare, false on plain http://localhost
    secure: config.cookieSecure === 'auto' ? req.secure : config.cookieSecure,
    // send the cookie with requests to every page and API route on this site
    path: '/',
  };
}

// Creates a login token for a user with an arrow function
// payload { sub: id, username } = what the token says ("sub" = subject = the user's database id)
// secret config.jwtSecret = the private key from .env; only our server knows it, so only we can make valid tokens, unless someone steals it like the declaration of indepence (Nicholas Cage)
// options expiresIn '7d' = the token stops being valid after 7 days
// The result is a random looking string that people shouldn't be able to break into it's secret parts
const sign = (id: string, username: string) => jwt.sign({ sub: id, username }, config.jwtSecret, { expiresIn: '7d' });

// This interface describes what a TokenUser should look like
export interface TokenUser {
  // The user's MongoDB id
  id: string;
  // The user's name
  username: string;
}

// Returns the logged-in user from a token, or null for guests and bad tokens
// "token: unknown" means we accept anything and check it ourselves, because it comes from the outside world
// "TokenUser | null" means it returns either a user or null
export function verifyToken(token: unknown): TokenUser | null {
  // No token, not text, or an empty string? Then this is a guest and return null
  if (typeof token !== 'string' || !token){
        return null;
    }
  // jwt.verify THROWS an error for fake, edited or expired tokens then catch turns that into null
  try {
    // Check the signature with our secret and the expiry date. If it's valid, we get the payload back
    const p = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    // Extra safety, make sure the payload really contains the two fields we put in it
    if (typeof p.sub !== 'string' || typeof p.username !== 'string'){
         return null;
    }
    // Valid token? return who it belongs to if so
    return { id: p.sub, username: p.username };
  // bad signature, expired, or garbage then treat as a guest
  } catch {
    // null = not logged in
    return null;
  }
}

// Reads the login cookie on an HTTP request    null = guest
export function readUser(req: Request): TokenUser | null {
  // req.cookies is filled in by the cookie-parser middleware in server.ts
  // "?." means: if req.cookies is missing, don't crash, just give undefined
  // [COOKIE_NAME] picks the cookie called whatever we set it as then verifyToken checks it
  return verifyToken(req.cookies?.[COOKIE_NAME]);
}

// A Request that may also carry the logged-in user which is added by requireAuth below
// "extends Request" = everything a normal Request has, plus "user"
export interface AuthedRequest extends Request {
  // "?" is optional as it's only there after requireAuth has run
  user?: TokenUser;
}

// the function Express runs BEFORE the route handler so Felix and Nicholas put this on any route that needs a logged-in user
// It either stops the request with an error, or calls next() to let it continue.
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  // Who is asking? null if not logged in
  const user = readUser(req);
  // Not logged in then reply with HTTP status 401 "Unauthorized" and an error message
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  // Logged in then attach the user to the request so the route handler then can use req.user
  req.user = user;
  // Pass the request on to the next step the actual route
  next();
}

// Create the router. server.ts mounts it at /api/auth, so '/register' below becomes /api/auth/register
export const authRouter = Router();

// Only login/register are rate limited. (The old code limited the whole router,
// so /me, called on every page load, could lock people out after 50 refreshes.)
const credentialLimiter = rateLimit({
  // The counting window is 15 minutes in milliseconds
  windowMs: 15 * 60 * 1000,
  // At most 20 counted requests per IP address in that window
  limit: 20,
  // Successful logins/registrations don't count; only failures do, so real users are rarely affected, do not change this please
  skipSuccessfulRequests: true,
  // The reply sent once someone goes over the limit with HTTP status 429 "Too Many Requests"
  message: { error: 'Too many attempts. Try again in a few minutes.' },
});

// POST /api/auth/register. first credentialLimiter then the handler.
// "async" lets us use "await" to wait for slow things (hashing, the database) without freezing the server or the developers PC
authRouter.post('/register', credentialLimiter, async (req, res) => {
  // req.body is the JSON the browser sent (parsed by express.json() in server.ts)
  // "?? {}" means: if there's no body at all, use an empty object so the next line can't crash
  const { username, email, password } = req.body ?? {};
  // typeof checks also block NoSQL-injection payloads like { "$ne": "" }
  // a hacker could send an OBJECT instead of text to trick a MongoDB query, so we should insist on strings and block objects
  // .some(...) is true if ANY of the three is not a string to prevent potential Hacker mentioned above
  if ([username, email, password].some((v) => typeof v !== 'string')) {
    // 400 = "Bad Request": the input itself is wrong.
    return res.status(400).json({ error: 'Invalid input' });
  }

  // Remove spaces from the start and end of the username
  const name = username.trim();

  // Does the username match the allowed pattern (3–20 letters, numbers, _ or -)? If not, reject it
  if (!USERNAME_RE.test(name)) {
    // Explain what's allowed to the user on the page
    return res.status(400).json({ error: 'Username must be 3–20 letters, numbers, _ or -' });
  }

  // Felix if you add 2FA you'll probably find yourself here, This section is the current way I check emails validity
  // A simple email check: something@something.something, with no spaces (\S = any non-space character, + = one or more)
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    // Reject obviously invalid emails
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  // bcrypt only uses the first 72 bytes, so cap it instead of ignoring the rest and taking up extra stuff
  if (password.length < 8 || password.length > 72) {
    // Too short (weak) or too long (bcrypt would ignore the end)
    return res.status(400).json({ error: 'Password must be 8–72 characters' });
  }

  // Everything below talks to the database, which can fail, so it's wrapped in try/catch
  try {
    // Hash the password. 12 is the "cost": bcrypt repeats its work 2^12 = 4,096 times, so each guess takes a hacker real time
    // bcrypt also adds a random salt, so two users with the same password get different hashes
    const passwordHash = await bcrypt.hash(password, 12);
    // Save the new user in MongoDB. Only the hash is stored, never the password itself, DO NOT STORE THE PASSWORD
    const user = await User.create({ username: name, email: email.trim(), passwordHash });
    // Log them in right away set the cookie to a freshly signed token.
    res.cookie(COOKIE_NAME, sign(user.id, user.username), { ...cookieOptions(req), maxAge: SESSION_MS });
    // Send back the username so the page can show the user they are signed in
    res.status(201).json({ username: user.username });
  // If anything above threw an error, we end up here and "err: any" because errors can be any shape at this point
  } catch (err: any) {
    // MongoDB error code 11000 is "duplicate key" the username or email is already used both have to be unique
    if (err?.code === 11000) return res.status(409).json({ error: 'Username or email already taken' });
    // if Mongoose rejected the data then it breaks a rule in the User schema
    if (err?.name === 'ValidationError') return res.status(400).json({ error: 'Invalid username or email' });
    // Something unexpected so print the full error in the server terminal and prepare to cry as you dont know why its broken
    console.error('[register]', err);
    // only tell the browser a generic message, Internal Server Error, never internal details
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login, also rate limited
authRouter.post('/login', credentialLimiter, async (req, res) => {
  // Pull the username and password out of the JSON body.
  const { username, password } = req.body ?? {};
  // Both must be text same NoSQL-injection or input sanitization protection as above using the typeof
  if (typeof username !== 'string' || typeof password !== 'string') {
    // Reject anything else.
    return res.status(400).json({ error: 'Invalid input' });
  }

  // Look up the user in MongoDB by username which should return the user, or null if there isn't one
  const user = await User.findOne({ username: username.trim() });
  // Same message for "no such user" and "wrong password" so attackers can't probe usernames
  // bcrypt.compare hashes the typed password the same way and checks it matches the stored hash
  // "||" stops early: if there's no user, compare never runs, never feed the hackers vital info
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    // error code 401 is "Unauthorized"
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  // if the correct password uis given set the login cookie same as at the end of register
  res.cookie(COOKIE_NAME, sign(user.id, user.username), { ...cookieOptions(req), maxAge: SESSION_MS });
  // send default status 200 "OK", then send back the username
  res.json({ username: user.username });
});

// POST /api/auth/logout 
// Not async! nothing slow happens here
// The token itself can't be "cancelled" it's valid until it expires or manually deleted
// logging out works by deleting the browser's only copy of it
authRouter.post('/logout', (req, res) => {
  // Tell the browser to delete the cookie. The settings must match the ones used to set it, or the browser won't delete it.
  res.clearCookie(COOKIE_NAME, cookieOptions(req));
  // Confirm it worked
  res.json({ ok: true });
});

// GET /api/auth/me 
// The frontend calls this on page load to learn "am I logged in?"
// Guests get { username: null }
authRouter.get('/me', (req, res) => {
  // readUser(req) are they user or null "?.username" gets the name only if there is a user
  // "?? null" turns "undefined" into null, so the reply is always { username: "name" } or { username: null }
  res.json({ username: readUser(req)?.username ?? null });
});