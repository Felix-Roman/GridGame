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
  // What's typed in each box
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // The red error message, or null when there isn't one
  const [error, setError] = useState<string | null>(null);
  // true while waiting for the server also this disables the button
  const [busy, setBusy] = useState(false);
  // Take just the login function out of the shared auth system
  const { login } = useAuth();
  // A function that moves a user to another page
  const navigate = useNavigate();

  // Runs when the form is submitted
  const handleSubmit = async (e: FormEvent) => {
    // Stop the browser from reloading the page
    e.preventDefault();
    // Clear any old error
    setError(null);
    // Disable the button and show "Logging in…"
    setBusy(true);
    // Send the username and password to the server and wait
    const err = await login(username, password);
    // enable the button
    setBusy(false);
    // Wrong details or the server is unreachable
    if (err) setError(err);
    else navigate('/Account');
  };

  // Draws the page
  return (
    <div className="wrapper">
      {/* The form. onSubmit runs handleSubmit */}
      <form onSubmit={handleSubmit}>
        <h2>Login</h2>
        {/* The red error, only when there is one, role="alert" makes screen readers announce it immediately */}
        {error && <p className="form-error" role="alert">{error}</p>}
        {/* Username box */}
        <input
          type="text"
          placeholder="Username"
          // Lets password managers fill in a saved username
          autoComplete="username"
          // the box shows the state, and every keystroke updates it.
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        {/* Password box */}
        <input
          // Dots instead of letters
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {/* Submit button */}
        <button type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Login'}</button>
        {/* Links to sign-up and the home page */}
        <p className="form-links">
          No account? <Link to="/CreateAccountForm">Create one</Link> · <Link to="/">Back to home</Link>
        </p>
      </form>
    </div>
  );
};

// Make the component available to App.tsx which imports it as LoginForm
export default LoginForm;