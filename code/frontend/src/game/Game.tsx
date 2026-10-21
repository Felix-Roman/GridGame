// Game.tsx
// The main game screen, It owns the game's state score, time, owned assets,
// the player list and the Socket.IO connection, and it lays out the four
// visual pieces of the screen,
//
//   TopBar        (score, time, room code, players toggle)
//   [Players rail] [Control deck, always visible] [Operations tabs]
//
// Every child component only draws what it is given and reports clicks back
// up through callback props, so all of the game logic lives in this file.
// =============================================================================

// React hooks, useEffect runs side effects timers, sockets, useState stores values that redraw the screen when they change
import { useEffect, useState } from 'react';
// Router helpers: useParams reads roomId from the URL, useLocation reads hidden data passed from Home, Navigate redirects
import { useParams, useLocation, Navigate } from 'react-router-dom';
// io() opens a connection to the backend server, Socket is the TypeScript type for that connection object
import { io, Socket } from 'socket.io-client';
// "import type" pulls in only TypeScript types (no runtime code) that describe the shape of our data.
import type { ControlState, PlayerData, ResourceState } from './types';
// The bar across the top of the screen
import TopBar from './components/TopBar';
// The collapsible list of players on the left
import PlayerRoster from './components/PlayerRoster';
// The always-visible center panel, frequency gauge, battery, power dial, automatic control
import ControlDeck from './components/ControlDeck';
// The right-hand panel with the Overview/Generation&load/Security/Market/Assets tabs
import OpsPanel from './components/OpsPanel';
// Loads the stylesheet for the whole game screen Vite injects it into the page
import './game.css';

// Address of the backend Socket.IO server (backend/src/server.ts listens on port 3000)
const SERVER_URL = 'http://localhost:3000';

// The component React draws for the /game/:roomId route. export default lets App.tsx import it as Game
export default function Game() {
  // Reads the room code from the URL, e.g. /game/k7q2x gives roomId = k7q2x
  const { roomId } = useParams();
  // Gets the current location object, which carries the state Home.tsx passed when it navigated here
  const location = useLocation();
  // The name the player typed on the Home screen, or LocalPlayer if they opened the URL directly
  const username: string = location.state?.username || 'LocalPlayer';

  // The live Socket.IO connection null until it is created in the effect below
  const [socket, setSocket] = useState<Socket | null>(null);
  // True while connected to the server, drives the Online/Offline dot in the top bar
  const [connected, setConnected] = useState(false);
  // Everyone in this room, as last broadcast by the server
  const [players, setPlayers] = useState<PlayerData[]>([]);
  // Whether the player list is expanded, Starts open on wide screens 1440px+, collapsed on smaller ones
  const [rosterOpen, setRosterOpen] = useState(() => window.innerWidth >= 1440);

  // The player's money/score, Starts at $1,200.
  const [localScore, setLocalScore] = useState(1200);
  // How many seconds the game has been running
  const [secondsPassed, setSecondsPassed] = useState(0);
  // What the player owns
  const [resources, setResources] = useState<ResourceState>({
    // Battery capacity each storage purchase adds 100
    storageUnits: 1000,
    // Number of wind turbines
    windUnits: 15,
    // Number of hydro generators each one adds 0.01 grid inertia
    hydroUnits: 20,
    // Number of customers each one earns $100 per second
    customerUnits: 3,
  });

  // Socket connection, Hooks must always run in the same order, so they all
  // sit above the roomId redirect check further down.
  useEffect(() => {
    // No room code means nothing to join, so skip connecting the redirect below handles this case
    if (!roomId) return;
    // Opens the connection to the backend server
    const s = io(SERVER_URL);
    // Saves the connection so other code in this component can send messages on it
    setSocket(s);
    // Runs once the connection succeeds
    s.on('connect', () => {
      // Turns the top bar's dot green
      setConnected(true);
      // Tells the server which room to put us in and what our name is
      s.emit('join_room', { username, roomId });
    // Closes the connect handler
    });
    // If the connection drops, show Offline
    s.on('disconnect', () => setConnected(false));
    // Whenever the server broadcasts the room's player list, store it so the roster redraws
    s.on('room_players', (updated: PlayerData[]) => setPlayers(updated));
    // Cleanup, when leaving the page or if username/roomId change, close the connection so no ghost player stays in the room
    return () => { s.disconnect(); };
  // Rerun this effect only if the username or room code changes
  }, [username, roomId]);

  // Game clock, every second, add 1 to the timer and $100 per customer to the score
  useEffect(() => {
    // setInterval calls this function every 1000 ms 1 second
    const timer = setInterval(() => {
      // Adds one second The sec => form uses the latest value, avoiding stale numbers
      setSecondsPassed((sec) => sec + 1);
      // Adds income, $100 for each customer the player has
      setLocalScore((prev) => prev + 100 * resources.customerUnits);
    // Fire every 1000 ms
    }, 1000);
    // Cleanup, stop the old timer before a new one starts or when leaving the page
    return () => clearInterval(timer);
  // Restart the timer when the customer count changes, so income uses the new count
  }, [resources.customerUnits]);

  // Every time score or time changes, send them to the server so other players see our live numbers
  useEffect(() => {
    // Only send if the socket exists and is connected (?. safely skips when socket is null)
    if (socket?.connected) socket.emit('update_state', { score: localScore, timeSeconds: secondsPassed });
  // Rerun whenever the score, the time, or the socket changes.
  }, [localScore, secondsPassed, socket]);

  // If the URL had no room code, send the player back to the Home page
  if (!roomId) return <Navigate to="/" replace />;

  // Called by ControlDeck when its battery, frequency or PID gains change, forwards them to the server
  const handleControlChange = (state: Partial<ControlState>) => {
    // Sends the control values plus the current score/time, if connected
    if (socket?.connected) socket.emit('update_state', { ...state, score: localScore, timeSeconds: secondsPassed });
  };

  // Shared purchase helper, if the player can afford cost, subtract it and apply change to their resources
  const buy = (cost: number, change: (r: ResourceState) => ResourceState) => {
    // Only buy if the player has enough money.
    if (localScore >= cost) {
      // Takes the money
      setLocalScore((p) => p - cost);
      // Applies the purchase for example, +1 wind unit
      setResources(change);
    }
  };
  // Storage costs $100 and adds 100 battery capacity, ...r copies all other resources unchanged
  const handleBuyStorage = () => buy(100, (r) => ({ ...r, storageUnits: r.storageUnits + 100 }));
  // A wind turbine costs $100 and adds 1 wind unit
  const handleBuyWind = () => buy(100, (r) => ({ ...r, windUnits: r.windUnits + 1 }));
  // A hydro generator costs $1,000 and adds 1 hydro unit
  const handleBuyHydro = () => buy(1000, (r) => ({ ...r, hydroUnits: r.hydroUnits + 1 }));
  // Customers are free, but only allowed when score > customers x 1000
  const handleAddCustomer = () => {
    // Checks the unlock rule
    if (localScore > resources.customerUnits * 1000) {
      // Adds one customer
      setResources((r) => ({ ...r, customerUnits: r.customerUnits + 1 }));
    }
  };

  // Money earned per second, shown under the score in the top bar and in the Overview tab
  const incomePerSecond = 100 * resources.customerUnits;

  // Everything below is what gets drawn on screen
  return (
    // Outer wrapper, The .gg-app class in game.css makes it a full-screen grid, top bar row + body row
    <div className="gg-app">
      {/* The top bar, Each prop hands it a value to show, or a function to call when clicked */}
      <TopBar
        // Room code shown in the Room chip with a Copy button
        roomId={roomId}
        // Current score
        score={localScore}
        // Shown as +$300/s under the score
        incomePerSecond={incomePerSecond}
        // Shown as the h:mm:ss clock
        timeSeconds={secondsPassed}
        // Online/Offline indicator
        connected={connected}
        // Number on the Players button
        playerCount={players.length}
        // Whether the Players button shows as pressed
        rosterOpen={rosterOpen}
        // Clicking Players flips the roster between open and collapsed
        onToggleRoster={() => setRosterOpen((o) => !o)}
      />
      {/* The body row, .gg-body in game.css splits it into three columns */}
      <div className="gg-body">
        {/* Column 1, the player list */}
        <PlayerRoster
          // Everyone in the room
          players={players}
          // Used to mark You and list you first
          currentUsername={username}
          // Collapsed is the opposite of open
          collapsed={!rosterOpen}
          // The arrow button inside the roster also toggles it
          onToggle={() => setRosterOpen((o) => !o)}
          // Used to size each player's battery bar
          batteryCapacity={resources.storageUnits}
        />
        {/* Column 2, the control deck, It reports control changes through handleControlChange */}
        <ControlDeck batteryCapacity={resources.storageUnits} onStateChange={handleControlChange} />
        {/* Column 3, the operations tabs, including the asset shop. */}
        <OpsPanel
          // Available funds shown in the shop
          score={localScore}
          // Owned counts shown in the shop and Overview
          resources={resources}
          // Income shown in the Overview tab
          incomePerSecond={incomePerSecond}
          // Called by the Buy for $100 storage button
          onBuyStorage={handleBuyStorage}
          // Called by the wind turbine button
          onBuyWind={handleBuyWind}
          // Called by the hydro generator button.
          onBuyHydro={handleBuyHydro}
          // Called by the Add customer button
          onAddCustomer={handleAddCustomer}
        />
      {/* Closes .gg-body */}
      </div>
    {/* Closes .gg-app */}
    </div>
  );
}
