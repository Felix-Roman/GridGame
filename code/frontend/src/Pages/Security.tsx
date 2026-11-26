// =============================================================================
// Security.tsx
// The page at /Security where logged in players turn on two factor authentication
//
// 1. Load /api/auth/2fa/status to see if 2FA is already on
// 2. "Set up 2FA" calls /setup, which returns a QR code + the key as text
// 3. They scan it, type the first code, and /enable turns 2FA on
// =============================================================================
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../AuthContext';
import './LoginForm.css';

// Same fetch pattern as AuthContext: always send the cookie, never crash on bad JSON
async function call(path: string, method: 'GET' | 'POST' = 'GET', body?: object) {
  try {
    const res = await fetch(`${API_URL}/api/auth/2fa/${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  } catch {
    return { ok: false, data: { error: 'Cannot reach the server' } };
  }
}

export default function Security() {
  // null = still loading
  const [enabled, setEnabled] = useState<boolean | null>(null);
  // Set after "Set up 2FA" is clicked
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Ask the server whether 2FA is on when the page opens
  useEffect(() => {
    call('status').then(({ ok, data }) => {
      if (ok) setEnabled(data.enabled);
      else setError(data.error ?? 'Could not load your 2FA status');
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    if (!qr) {
      // First click: start setup and get the QR code
      const { ok, data } = await call('setup', 'POST');
      setBusy(false);
      if (!ok) return setError(data.error ?? 'Could not start setup');
      setQr(data.qr);
      setSecret(data.secret);
      return;
    }

    // Second part: confirm the first code from their app
    const { ok, data } = await call('enable', 'POST', { code });
    setBusy(false);
    if (!ok) return setError(data.error ?? 'Could not turn on 2FA');
    // Done: forget the secret on this page and show the "on" state
    setEnabled(true);
    setQr(null);
    setSecret(null);
    setCode('');
  };

  return (
    <div className="wrapper">
      <form onSubmit={handleSubmit}>
        <h2>Two-factor authentication</h2>
        {error && <p className="form-error" role="alert">{error}</p>}

        {enabled === null && !error && <p className="form-note">Loading…</p>}

        {enabled === true && (
          <p className="form-note" role="status">
            ✅ 2FA is on. You'll be asked for a code from your authenticator app each time you log in.
          </p>
        )}

        {enabled === false && !qr && (
          <>
            <p className="form-note">
              Add a second step to your login using an authenticator app like Google Authenticator,
              Microsoft Authenticator, or Authy.
            </p>
            <button type="submit" disabled={busy}>{busy ? 'Starting…' : 'Set up 2FA'}</button>
          </>
        )}

        {enabled === false && qr && (
          <>
            <p className="form-note">1. Scan this QR code with your authenticator app.</p>
            <img className="form-qr" src={qr} alt="QR code to add GridGame to your authenticator app" />
            <p className="form-note">Can't scan it? Enter this key in the app instead:</p>
            {/* Grouped in 4s so it's easier to type */}
            <code className="form-secret">{secret?.match(/.{1,4}/g)?.join(' ')}</code>
            <p className="form-note">2. Type the 6-digit code the app shows.</p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="6-digit code from your authenticator app"
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
            />
            <button type="submit" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Turn on 2FA'}</button>
          </>
        )}

        <p className="form-links">
          <Link to="/Account">Back to lobby</Link>
        </p>
      </form>
    </div>
  );
}