// =============================================================================
// AuthContext.tsx
// The browser side of the account system. It keeps track of WHO is logged in
// and it shares this with every page, plus the functions to log in, sign up and log out
// =============================================================================

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
export const API_URL: string = import.meta.env.VITE_API_URL ?? '';

// The shape of what the context provides orwhat useAuth() returns
interface AuthCtx {
  // username, or null if they are a guest or logged out
  username: string | null;
  // true until the first "who am I?" check finishes. Pages wait on this so they don't
  // wrongly treat you as logged out for a split second on page load
  loading: boolean;
  login: (u: string, p: string) => Promise<string | null>;
  // Sign up with username, email, password
  register: (u: string, e: string, p: string) => Promise<string | null>;
  // Log out
  logout: () => Promise<void>;
}
// Create the shared value. The starting value doesn't matter because AuthProvider always supplies the real one
// "null!" tells TypeScript "trust me, this won't actually be null when used"
const Ctx = createContext<AuthCtx>(null!);
// The hook pages use
export const useAuth = () => useContext(Ctx);

// A shared helper for the three POST requests /api/auth/login, /register, /logout
async function post(path: string, body?: object) {
  // fetch throws if the server can't be reached
  try {
    // Send the request and wait for the reply
    const res = await fetch(`${API_URL}/api/auth/${path}`, {
      method: 'POST',
      // Without this, the browser would ignore the Set-Cookie in the reply, and logging in wouldn't stick
      credentials: 'include',
      // The body needs to be JSON
      headers: { 'Content-Type': 'application/json' },
      // Turn the object into JSON text, or send no body at all if there isn't one
      body: body ? JSON.stringify(body) : undefined,
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  // The server couldn't be reached at all
  } catch {
    // Same shape as a normal failure so the callers don't need a special case
    return { ok: false, data: { error: 'Cannot reach the server' } };
  }
}

// The component that holds the login state and shares it. App.tsx wraps the whole app in it.
// "children" = whatever is placed between <AuthProvider> and </AuthProvider> (the routes and pages).
export function AuthProvider({ children }: { children: ReactNode }) {
  // Who's logged in (null = nobody yet).
  const [username, setUsername] = useState<string | null>(null);
  // Starts true: we don't know yet until the server answers.
  const [loading, setLoading] = useState(true);

  // On page load, ask the server "who am I?". If the login cookie from an earlier visit is still valid
  // you're logged in without typing anything. The empty [] at the end means "run this only once"
  useEffect(() => {
    // GET /api/auth/me, sending the cookie. This uses .then() chains instead of await;
    // they do the same job: each .then runs when the previous step finishes
    fetch(`${API_URL}/api/auth/me`, { credentials: 'include' })
      // If the reply is OK, read its JSON; otherwise carry on with null
      .then((r) => (r.ok ? r.json() : null))
      // The server answers { username: "michael" } or { username: null } (guest). "d?." handles d being null
      .then((d) => setUsername(d?.username ?? null))
      // Any failure (server down, bad reply): treat as logged out
      .catch(() => setUsername(null))
      // Whatever happened, the check is finished, so pages can stop waiting
      .finally(() => setLoading(false));
  }, []);

  // Log in
  const login = async (u: string, p: string) => {
    // Send the username and password
    const { ok, data } = await post('login', { username: u, password: p });
    // Success, remember the name
    if (ok) setUsername(data.username);
    // null for success otherwise the server's message, or a generic one
    return ok ? null : data.error ?? 'Login failed';
  };
  // Sign up. Same pattern, with an email too. The server logs you in straight away on success
  const register = async (u: string, e: string, p: string) => {
    const { ok, data } = await post('register', { username: u, email: e, password: p });
    if (ok) setUsername(data.username);
    return ok ? null : data.error ?? 'Sign-up failed';
  };
  // Log out: ask the server to delete the cookie, then forget the name here
  const logout = async () => {
    // Wait for the server
    await post('logout');
    // Everyone using useAuth() now sees you as a guest
    setUsername(null);
  };

  // Share the state and the three functions with everything inside, then draw the children
  return <Ctx.Provider value={{ username, loading, login, register, logout }}>{children}</Ctx.Provider>;
}