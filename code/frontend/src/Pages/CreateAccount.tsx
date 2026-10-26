// =============================================================================
// CreateAccount.tsx
// The sign-up page at /CreateAccountForm.
//
// This page never handles passwords beyond typing them
// it doesn't store, hash, or check them. That's all done on the server
// =============================================================================

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './LoginForm.css';

export default function CreateAccount() {
  // What's typed in each box, they all start empty
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // The red error message, or null when there isn't one
  const [error, setError] = useState<string | null>(null);
  // true while waiting for the server, so the button can't be double-clicked
  const [busy, setBusy] = useState(false);
  // Take just the register function out of the shared auth system
  const { register } = useAuth();
  // A function that moves to another page
  const navigate = useNavigate();

  // Runs when the form is submitted
  const handleSubmit = async (e: FormEvent) => {
    // Stop the browser's default behavior of reloading the page
    e.preventDefault();
    // Clear any old error
    setError(null);
    // Disable the button and show "Creating…"
    setBusy(true);
    // Send the details to the server and wait. register() returns null on success, or the error text to show.
    const err = await register(username, email, password);
    // enable the button
    setBusy(false);
    // Failed
    if (err) setError(err);
    // go to their account page
    else navigate('/Account');
  };

  return (
    <div className="wrapper">
      <form onSubmit={handleSubmit}>
        <h2>Create Account</h2>
        {error && <p className="form-error" role="alert">{error}</p>}
        <input
          type="text"
          placeholder="Username (3–20 characters)"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={3}
          maxLength={20}
          pattern="[A-Za-z0-9_\-]{3,20}"
          title="3–20 letters, numbers, _ or -"
          required
        />
        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password (8+ characters)"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          maxLength={72}
          required
        />
        <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create Account'}</button>
        <p className="form-links">
          Already have one? <Link to="/LoginForm">Log in</Link> · <Link to="/">Back to home</Link>
        </p>
      </form>
    </div>
  );
}
