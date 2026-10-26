// =============================================================================
// Account.tsx
// The page at /Account for the lobby for players who are logged in
//
// It looks identical to the Home page because it is the same page
// So this file's only job is to give logged-in players their own address
// that being /Account which App.tsx can protect
// =============================================================================

import Lobby from '../Lobby';

// Same page as Home; Lobby shows "Log out" because you're signed in
// App.tsx wraps this route in ProtectedRoute, so only logged-in users get here
export default function Account() {
  return <Lobby />;
}
