// =============================================================================
// Game.tsx
// The main game screen. It owns the game's state (score, time, owned assets,
// the player list) and the Socket.IO connection, and it lays out the four
// visual pieces of the screen:
//
//   TopBar        (score, time, room code, players toggle)
//   [Players rail] [Control deck: always visible] [Operations tabs]
//
// Every child component only draws what it is given and reports clicks back
// up through callback props, so all of the game logic lives in this file.
//
// Simulation: engine.ts models the physics (swing equation + PID control);
// useGridSim runs it 10 times a second. Money, assets, the market and the
// game-over screen are handled here.
//
// Joining: the URL is /game/<gameId>. The page connects, asks the server to
// join (sending your name + the remembered password), and shows JoinScreen
// until the server says yes. Guests and logged-in players both work.
// =============================================================================

// React hooks: useEffect runs side effects (timers, sockets), useState stores values that redraw the screen when they change, useRef holds a value without redrawing.
import { useEffect, useRef, useState } from 'react';
// Router helpers: useParams reads :roomId from the URL, Navigate redirects.
import { useParams, Navigate } from 'react-router-dom';
// Socket is the TypeScript type for a connection object.
import type { Socket } from 'socket.io-client';
// "import type" pulls in only TypeScript types (no runtime code) that describe the shape of our data.
import type { Contract, PidGains, PlayerData, ResourceState } from './types';
// The simulation and its tuning numbers.
import { SIM } from './engine';
import { useGridSim } from './useGridSim';
// The "Grid tripped" screen.
import GameOver from './components/GameOver';
// The bar across the top of the screen.
import TopBar from './components/TopBar';
// The collapsible list of players on the left.
import PlayerRoster from './components/PlayerRoster';
// The always-visible center panel: frequency gauge, battery, power dial, automatic control.
import ControlDeck from './components/ControlDeck';
// The right-hand panel with the Overview / Generation & load / Security / Market / Assets tabs.
import OpsPanel from './components/OpsPanel';
// The "Joining… / enter password / can't join" screen shown before you're in.
import JoinScreen, { type JoinPhase } from './JoinScreen';
// Who is logged in (null = guest).
import { useAuth } from '../AuthContext';
// Opens the Socket.IO connection to the same server that served this page.
import { connectSocket } from '../socket';
// Remembered guest name, per-tab player id, and game passwords.
import { getGamePassword, getGuestName, getPlayerKey, rememberGamePassword, setGuestName } from '../playerSession';
// Loads the stylesheet for the whole game screen (Vite injects it into the page).
import './game.css';

// What every player starts with (GridGame2017 values). Restart goes back to these.
const START_SCORE = 1200;
const START_RESOURCES: ResourceState = {
  storageUnits: 1000, // battery capacity in kWh (each purchase adds 100)
  windUnits: 15, // wind turbines
  hydroUnits: 20, // hydro generators (steady power + inertia)
  customerUnits: 3, // customers (each pays $10/s and adds load)
};

// Sends a socket event and waits for the server's reply
function request<T>(s: Socket, event: string, payload: unknown): Promise<T | { ok: false; error: string }> {
  return new Promise((resolve) => {
    s.timeout(8000).emit(event, payload, (err: Error | null, res: T) => {
      resolve(err ? { ok: false, error: 'The server did not answer. Try again.' } : res);
    });
  });
}

// The server's possible answers to "join_game"
type JoinError =
  | 'not_found'
  | 'need_password'
  | 'bad_password'
  | 'bad_name'
  | 'name_taken'
  | 'full'
  | 'too_many_tries'
  | 'busy';
type JoinReply = { ok: true; name: string; gameName: string; isPublic: boolean } | { ok: false; error: JoinError };

// What to tell the player for each answer.
const JOIN_MESSAGES: Record<JoinError, string> = {
  not_found: "This game doesn't exist anymore. Games close a minute after everyone leaves.",
  need_password: '',
  bad_password: 'Wrong password. Try again.',
  bad_name: 'Enter a name (1–20 characters).',
  name_taken: 'Someone in this game is already using that name.',
  full: 'This game is full.',
  too_many_tries: 'Too many wrong passwords. Go back to the lobby and try again later.',
  busy: '',
};

// The component React draws for the /game/:roomId route. "export default" lets App.tsx import it as Game.
export default function Game() {
  // Reads the game code from the URL
  const { roomId } = useParams();
  // The account name if logged in, null for guests
  const { username: account, loading: authLoading } = useAuth();

  // The live Socket.IO connection
  const [socket, setSocket] = useState<Socket | null>(null);
  // True while connected to the server; drives the Online/Offline dot in the top bar
  const [connected, setConnected] = useState(false);
  // Where we are in joining: 'joined' means the game screen is showing
  const [phase, setPhase] = useState<JoinPhase | 'joined'>('connecting');
  // Text shown on the join screen
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  // The name the server accepted for us
  const [myName, setMyName] = useState('');
  // Lets the join screen's form re-run the join attempt
  const joinRef = useRef<() => void>(() => {});
  // Everyone in this room, as last broadcast by the server
  const [players, setPlayers] = useState<PlayerData[]>([]);
  // Whether the player list is expanded. Starts open on wide screens (1440px+), collapsed on smaller ones
  const [rosterOpen, setRosterOpen] = useState(() => window.innerWidth >= 1440);
  // The player's money/score. Starts at $1,200
  const [localScore, setLocalScore] = useState(START_SCORE);
  // How many seconds the game has been running
  const [secondsPassed, setSecondsPassed] = useState(0);
  // What the player owns.
  const [resources, setResources] = useState<ResourceState>(START_RESOURCES);
  // Automatic control on/off. When on, the PID controller turns the dial
  const [autoOn, setAutoOn] = useState(true);
  // Main / Sum / Rate gains (Kp / Ki / Kd). Defaults match GridGame2017
  const [gains, setGains] = useState<PidGains>({ main: 200, sum: 10, rat: 0 });
  // The dial position when automatic control is off
  const [manualDial, setManualDial] = useState(0);
  // Every contract in this game, as last sent by the server
  const [contracts, setContracts] = useState<Contract[]>([]);
  // Local clock minus server clock, so countdowns are right even if the clocks differ
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const joined = phase === 'joined';
  // Power from running contracts
  const activeKw = (role: 'buyer' | 'seller') =>
    contracts.filter((c) => c.status === 'active' && c[role] === myName).reduce((sum, c) => sum + c.powerKw, 0);
  const purchasedKw = activeKw('buyer');
  const soldKw = activeKw('seller');
  const { sim, history, reset: resetSim } = useGridSim(joined, {
    resources,
    autoOn,
    gains,
    manualDial,
    purchasedKw,
    soldKw,
  });
  const tripped = sim.tripped !== null;

  // Socket connection. Hooks must always run in the same order, so they all
  // sit above the roomId redirect check further down.
  useEffect(() => {
    // No room code means nothing to join. Also wait until we know if you're logged in.
    if (!roomId || authLoading) return;
    // Opens the connection to the backend server.
    const s = connectSocket();
    // Saves the connection so other code in this component can send messages on it.
    setSocket(s);

    // Asks the server to put us in this game. Runs on connect, on every reconnect, and from the join form.
    const join = () => {
      // Logged-in players use their account name; guests use the name they typed in the lobby.
      const name = account ?? getGuestName();
      if (!name) {
        setPhase('need-name');
        return;
      }
      s.timeout(10_000).emit(
        'join_game',
        { gameId: roomId, name, password: getGamePassword(roomId), playerKey: getPlayerKey() },
        (err: Error | null, res: JoinReply) => {
          if (err) {
            setPhase('ended');
            setJoinMessage('The server did not answer. Refresh the page to try again.');
            return;
          }
          if (res.ok) {
            setMyName(res.name);
            setJoinMessage(null);
            setPhase('joined');
            return;
          }
          if (res.error === 'busy'){
            return;
          }
          setJoinMessage(JOIN_MESSAGES[res.error] || null);
          if (res.error === 'need_password' || res.error === 'bad_password') setPhase('need-password');
          // Guests can pick another name, account names can't change, so that's a dead end for them
          else if ((res.error === 'bad_name' || res.error === 'name_taken') && !account) setPhase('need-name');
          else setPhase('ended');
        },
      );
    };
    joinRef.current = join;

    // Runs once the connection succeeds
    s.on('connect', () => {
      // Turns the top bar's dot green
      setConnected(true);
      join();
    });
    // If the connection drops, show Offline. Socket.IO reconnects by itself and we re-join on 'connect'
    s.on('disconnect', () => setConnected(false));
    // Whenever the server broadcasts the room's player list, store it so the roster redraws
    s.on('room_players', (updated: PlayerData[]) => setPlayers(updated));
    // The game's market: all contracts plus the server's clock
    s.on('market', (m: { contracts: Contract[]; serverNow: number }) => {
      setContracts(m.contracts);
      setServerOffsetMs(Date.now() - m.serverNow);
    });
    // A contract you're part of just started: the buyer pays, the seller gets paid
    s.on('market_trade', (t: { role: 'buyer' | 'seller'; amount: number }) => {
      setLocalScore((prev) => (t.role === 'buyer' ? prev - t.amount : prev + t.amount));
    });
    // The same player opened this game in another tab, so the server closed this one
    s.on('replaced', () => {
      setPhase('ended');
      setJoinMessage('You opened this game somewhere else, so this tab was disconnected.');
    });
    // Cleanup: when leaving the page, close the connection so no "ghost" player stays in the room
    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
  // Re-run this effect only if the game code or login state changes
  }, [roomId, authLoading, account]);

  // Game clock: every second, add 1 to the timer and $10 per customer to the score
  // Only runs while you're in the game and your grid is up
  useEffect(() => {
    if (!joined || tripped) return;
    // setInterval calls this function every 1000 ms
    const timer = setInterval(() => {
      // Adds one second. The (sec) => form uses the latest value, avoiding stale numbers
      setSecondsPassed((sec) => sec + 1);
      // Adds income: $10 for each customer the player has
      setLocalScore((prev) => prev + SIM.INCOME_PER_CUSTOMER * resources.customerUnits);
    // Fire every 1000 ms.
    }, 1000);
    // Cleanup: stop the old timer before a new one starts (or when leaving the page)
    return () => clearInterval(timer);
  // Restart the timer when the customer count changes, so income uses the new count
  }, [resources.customerUnits, joined, tripped]);

  // Once a second (and whenever the score changes), send our numbers to the server so other players see them.
  useEffect(() => {
    // Only send once we're in the game and connected ("?." safely skips when socket is null).
    if (!joined || !socket?.connected) return;
    socket.emit('update_state', {
      score: localScore,
      timeSeconds: secondsPassed,
      battery: sim.battery,
      frequency: sim.frequency,
      pid: gains,
      batteryCapacity: resources.storageUnits,
      tripped,
    });
  // sim is left out on purpose: it changes 10x a second, and the clock already triggers a send every second.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localScore, secondsPassed, socket, joined, tripped, gains, resources.storageUnits]);

  // If the URL had no room code, send the player back to the Home page. This is after all hooks on purpose.
  if (!roomId) return <Navigate to="/" replace />;

  // The join screen's form: save what was typed, then try joining again.
  const handleJoinAnswer = ({ name, password }: { name?: string; password?: string }) => {
    if (name !== undefined) setGuestName(name);
    if (password !== undefined) rememberGamePassword(roomId, password);
    setJoinMessage(null);
    setPhase('connecting');
    joinRef.current();
  };

  // Not in the game yet, show the join screen instead of the game
  if (!joined) {
    return (
      <JoinScreen
        phase={phase}
        message={joinMessage}
        defaultName={getGuestName()}
        onSubmit={handleJoinAnswer}
      />
    );
  }

  // Switching automatic control. Turning it off leaves the dial where the controller had it
  const handleToggleAuto = () => {
    if (autoOn) setManualDial(Math.round(sim.dial));
    setAutoOn((on) => !on);
  };

  // Start a fresh grid after a trip: money, assets, battery and the clock go back to the start
  const handleRestart = () => {
    resetSim();
    setLocalScore(START_SCORE);
    setResources(START_RESOURCES);
    setSecondsPassed(0);
    setManualDial(0);
  };

  // Market actions the server checks and records them, then tells everyone
  const handleOffer = async (offer: { powerKw: number; durationS: number; pricePerKwh: number }) => {
    if (!socket?.connected) return 'Not connected to the server.';
    const res = await request<{ ok: boolean; error?: string }>(socket, 'market_offer', offer);
    return res.ok ? null : res.error ?? 'Could not post the offer.';
  };
  const handleAccept = async (id: string) => {
    if (!socket?.connected) return 'Not connected to the server.';
    const res = await request<{ ok: boolean; error?: string }>(socket, 'market_accept', { id });
    return res.ok ? null : res.error ?? 'Could not buy that contract.';
  };
  const handleCancel = (id: string) => {
    socket?.emit('market_cancel', { id });
  };

  // Shared purchase helper: if the player can afford "cost", subtract it and apply "change" to their resources.
  const buy = (cost: number, change: (r: ResourceState) => ResourceState) => {
    // Only buy if the player has enough money.
    if (localScore >= cost) {
      // Takes the money
      setLocalScore((p) => p - cost);
      // Applies the purchase (for example, +1 wind unit)
      setResources(change);
    }
  };
  // Storage costs $100 and adds 100 battery capacity. "...r" copies all other resources unchanged.
  const handleBuyStorage = () => buy(100, (r) => ({ ...r, storageUnits: r.storageUnits + 100 }));
  // A wind turbine costs $100 and adds 1 wind unit.
  const handleBuyWind = () => buy(100, (r) => ({ ...r, windUnits: r.windUnits + 1 }));
  // A hydro generator costs $1,000 and adds 1 hydro unit.
  const handleBuyHydro = () => buy(1000, (r) => ({ ...r, hydroUnits: r.hydroUnits + 1 }));
  // Customers are free, but only allowed when score > customers x 1000 (GridGame2017 rule).
  // A new customer's demand ramps in over 10 seconds (see engine.ts).
  const handleAddCustomer = () => {
    // Checks the unlock rule.
    if (localScore > resources.customerUnits * 1000) {
      // Adds one customer
      setResources((r) => ({ ...r, customerUnits: r.customerUnits + 1 }));
    }
  };

  // Money earned per second, shown under the score in the top bar and in the Overview tab
  const incomePerSecond = tripped ? 0 : SIM.INCOME_PER_CUSTOMER * resources.customerUnits;

  // Everything below is what gets drawn on screen
  return (
    <div className="gg-app">
      {/* The top bar. Each prop hands it a value to show, or a function to call when clicked. */}
      <TopBar
        // Game code shown in the "Room" chip
        roomId={roomId}
        // Current score
        score={localScore}
        // Shown as "+$300/s" under the score
        incomePerSecond={incomePerSecond}
        // Shown as the h:mm:ss clock
        timeSeconds={secondsPassed}
        // Online/Offline indicator
        connected={connected}
        // Number on the "Players" button
        playerCount={players.length}
        // Whether the Players button shows as pressed
        rosterOpen={rosterOpen}
        // Clicking Players flips the roster between open and collapsed
        onToggleRoster={() => setRosterOpen((o) => !o)}
      // Closes the TopBar element
      />
      <div className="gg-body">
        <PlayerRoster
          // Everyone in the room
          players={players}
          // Used to mark "You" and list you first
          currentUsername={myName}
          // Collapsed is the opposite of open
          collapsed={!rosterOpen}
          // The arrow button inside the roster also toggles it
          onToggle={() => setRosterOpen((o) => !o)}
          // Used to size each player's battery bar
          batteryCapacity={resources.storageUnits}
        // Closes the PlayerRoster element
        />
        <ControlDeck
          frequency={sim.frequency}
          rocof={sim.rocof}
          battery={sim.battery}
          batteryCapacity={resources.storageUnits}
          batteryFlowKw={sim.batteryKw}
          spilledKw={sim.spilledKw}
          dial={autoOn ? sim.dial : manualDial}
          autoOn={autoOn}
          gains={gains}
          onDialChange={setManualDial}
          onGainsChange={setGains}
          onToggleAuto={handleToggleAuto}
        />
        <OpsPanel
          // Available funds shown in the shop
          score={localScore}
          // Owned counts shown in the shop and Overview
          resources={resources}
          // Income shown in the Overview tab
          incomePerSecond={incomePerSecond}
          // Called by the "Buy for $100" storage button
          onBuyStorage={handleBuyStorage}
          // Called by the wind turbine button
          onBuyWind={handleBuyWind}
          // Called by the hydro generator button
          onBuyHydro={handleBuyHydro}
          // Called by the "Add customer" button
          onAddCustomer={handleAddCustomer}
          // Live values for the Overview tab and chart history for Generation & load
          sim={sim}
          history={history}
          // Market tab
          contracts={contracts}
          myName={myName}
          serverOffsetMs={serverOffsetMs}
          onOffer={handleOffer}
          onAccept={handleAccept}
          onCancel={handleCancel}
        />
      </div>
      {/* When the frequency leaves 58–62 Hz: the game-over screen with a Restart button. */}
      {sim.tripped && (
        <GameOver
          reason={sim.tripped}
          timeSeconds={secondsPassed}
          score={localScore}
          deliveredKwh={sim.deliveredKwh}
          wastedKwh={sim.wastedKwh}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
