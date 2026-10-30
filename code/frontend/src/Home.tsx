// =============================================================================
// Home.tsx
// basic home page, similar to the LoginForm.tsx page.
// =============================================================================


import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Lobby from './Lobby';

// Guests see the lobby here. Logged-in players get the same lobby on /Account
// (with a Log out button instead of Create account / Log in).
export default function Home() {
  const { username, loading } = useAuth();
  if (loading) return null;
  if (username) return <Navigate to="/Account" replace />;
  return <Lobby />;
}
