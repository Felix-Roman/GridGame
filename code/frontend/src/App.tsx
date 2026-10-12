import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Game from './Game';

// this method should be used as a controller or router to determine what page the user is on
// Look at the import statements at the top of this file and navigate to hose .tsx files to edit that page or moduel
// cuurent pages: Home and Game
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* The :roomId parameter allows for unique game instances */}
        <Route path="/game/:roomId" element={<Game />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;