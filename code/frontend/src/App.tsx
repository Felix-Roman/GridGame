// =============================================================================
// App.tsx
// The top of the React app: it decides WHICH PAGE to show for each address
//
// main.tsx draws <App />, and App wraps everything in three layers
// <BrowserRouter> reads the address bar and lets pages change it
// <AuthProvider> shares "who's logged in" with every page below it
// <Routes> picks the ONE <Route> whose path matches the address
// Changing page (a Link click or navigate()) doesn't reload the website 
// React Router just swaps which component is drawn
// The server sends index.html for every page address, see server.ts, and this file takes it from there
// =============================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// The guest lobby at "/"
import Home from './Home';
// The game screen
import Game from './game/Game';
// The login page
import LoginForm from './Pages/LoginForm';
// The logged-in lobby
import Account from './Pages/Account';
// The sign-up page
import CreateAccount from './Pages/CreateAccount';
// Provides the shared login state to every page inside it
import { AuthProvider } from './AuthContext';
// A wrapper that only shows its contents to logged-in players
import ProtectedRoute from './ProtectedRoute';

// The root component
function App() {
  // Draws the three layers and the list of pages
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* The home page */}
          <Route path="/" element={<Home />} />
          {/* The login page */}
          <Route path="/LoginForm" element={<LoginForm />} />
          {/* The sign-up page */}
          <Route path="/CreateAccountForm" element={<CreateAccount />} />
          {/* The logged-in lobby */}
          <Route path="/Account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          {/* Not protected so guests can play too */}
          <Route path="/game/:roomId" element={<Game />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

// Make App available to main.tsx, which draws it into the page
export default App;