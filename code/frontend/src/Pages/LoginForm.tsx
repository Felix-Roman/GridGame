// =============================================================================
// LoginForm.tsx
// The login page at /LoginForm
// same layout as create account, same CSS, same submit pattern but two boxes instead of three
// and it calls login() instead of register()
// =============================================================================

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './LoginForm.css';

// The page component, written as an arrow function stored in a constant
const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // The 6-digit code, and whether we're on the "enter your code" part of login
  const [code, setCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { login, loginCode } = useAuth();
  const navigate = useNavigate();

  // Go back to the username/password part (also used when the 5-minute pending login expires)
  const startOver = () => {
    setNeedsCode(false);
    setCode('');
    setPassword('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    if (!needsCode) {
      // Part 1: username + password
      const result = await login(username, password);
      setBusy(false);
      if (result.error) setError(result.error);
      else if (result.twoFactorRequired) setNeedsCode(true);
      else navigate('/Account');
      return;
    }

    // Part 2: the 6-digit code from the authenticator app
    const err = await loginCode(code);
    setBusy(false);
    if (!err) return navigate('/Account');
    setError(err);
    // The pending login ran out, so they need to type their password again
    if (err.includes('expired')) startOver();
  };

  return (
    <div className="wrapper">
      <form onSubmit={handleSubmit}>
        <h2>{needsCode ? 'Enter your code' : 'Login'}</h2>
        {error && <p className="form-error" role="alert">{error}</p>}

        {needsCode ? (
          <>
            <p className="form-note">Open your authenticator app and type the 6-digit code for GridGame.</p>
            {/* inputMode numeric = number keypad on phones; one-time-code lets phones autofill it */}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="6-digit authentication code"
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
              required
            />
            <button type="submit" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Verify'}</button>
            <p className="form-links">
              <button type="button" className="link-btn" onClick={startOver}>Use a different account</button>
            </p>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="Username"
              aria-label="Username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              aria-label="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Login'}</button>
            <p className="form-links">
              No account? <Link to="/CreateAccountForm">Create one</Link> · <Link to="/">Back to home</Link>
            </p>
          </>
        )}
      </form>
    </div>
  );
};

export default LoginForm;