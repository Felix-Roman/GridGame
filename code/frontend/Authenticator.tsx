import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './LoginForm.css';

// The page component, written as an arrow function stored in a constant
const Authenticator = () => {
  // What's typed in each box
  const [logincode, setLoginCode] = useState('');
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
    //const err = await login(username, password);
    // enable the button
    setBusy(false);
    // Wrong details or the server is unreachable
    //if (err) setError(err);
    navigate('/Account');
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
          placeholder="code"
          // Lets password managers fill in a saved username
          autoComplete="code"
          // the box shows the state, and every keystroke updates it.
          value={logincode}
          //onChange={(e) => setUsername(e.target.value)}
          required
        />
        {/* Submit button */}
        <button type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Login'}</button>
        {/* Links to sign-up and the home page */}
      </form>
    </div>
  );
};

// Make the component available to App.tsx which imports it as LoginForm
export default Authenticator;