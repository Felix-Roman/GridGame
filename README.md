# GridGame2026

## Project summary

### One-sentence description of the project

GridGame2026 is a real time multiplayer or single player browser game where each player runs their own microgrid and has to jeep its frequency between 58 Hz and 62 Hz by balancing wind, hydro, battery storage, customers, and power trades with other players.

### Additional information about the project

A real power grid has to match generation and demand every second of the day. When they drift apart, the grid's frequency moves away from 60 Hz, and if it moves too far, protection relays trip and the lights go out. GridGame2026 turns that balancing act into a game.

Every player starts with a small microgrid: 20 hydro generators, 15 wind turbines, a 1,000 kWh battery, and 3 customers who each pay $10 per second. From there:

Demand never stops moving. Each customer draws about 400 kW, wanders up and down on its own, follows a daily cycle that peaks at 5 PM, and grows the longer you play.

Wind is cheap but unreliable. Turbines gust and lull on their own schedule, while hydro is steady and adds inertia that slows down how fast the frequency can change.

The battery is your shock absorber. A dial charges or discharges it, either by hand or under automatic PID control, using the Main (Kp), Sum (Ki) and Rate (Kd) gains. If it's full, surplus energy is lost; if it's empty, it can't help.

Players can trade power. The Market lets you sell surplus to another player in the same game, or buy power when you're short.
Leave the 58–62 Hz band and your grid trips. The game ends and you can restart.

Under the hood, the frequency follows the swing equation used in power-systems engineering, df/dt = f₀ * (generation − load) / (2 * inertia), integrated on a fixed time step. The automatic control is a discrete PID controller with anti-windup. The game is meant to be fun, but the dynamics are a genuine (simplified) model, so the controls behave the way a controls engineer would expect.

Players can join as guests with any name, or create an account to keep a fixed username. Games can be public or password-protected, and the lobby shows every active game live.

Our Tech stack is React + TypeScript + Vite (frontend), Node.js + Express + Socket.IO (backend), MongoDB via Mongoose (accounts). It runs locally and through a Cloudflare Tunnel or on an AWS EC2 server.

## Installation

### Prerequisites

Git and Node.js 22
you can check Node version with 'node -v'

### NPM Packages

backend/package.json
express Web server: serves the API (/api/...) and the built website
socket.io: Live, two-way connection for the lobby list, players, and market updates
mongoose: Connects to MongoDB and defines the User model
bcryptjs: Hashes account and game passwords (passwords are never stored in plain text)
jsonwebtoken: Creates and checks the signed login token stored in a cookie
cookie-parser: Reads the login cookie on incoming requests
helmet: Adds security headers to every response
express-rate-limit: Slows down password guessing and game-creation spam
cors: Allows a frontend on a different domain (off by default; not needed normally)
dotenv: Loads settings and secrets from backend/.env
tsx, typescript: (dev) | Run and compile the TypeScript backend

frontend/package.json
react, react-dom: The user interface
react-router-dom: Page navigation
socket.io-client: The browser side of the live connection 
vite: Development server and production build

### Installation Steps

git clone <your-repo-url> GridGame2026
cd GridGame2026/code
npm run install:all

## Functionality

The top bar shows the room code, your connection status, the game clock, your money and income per second, and a **Players** button. Below it are three panels.

On The Left Side Are The Players
Everyone in the game, with their money, battery, frequency status and automatic-control settings. Your own card is outlined in yellow, and a player whose grid has tripped shows "Grid down".

The control deck
Grid frequency, A gauge from 58 to 62 Hz with green, orange and red zones, the exact reading, a status (Stable, Drifting, Near trip limit), and ROCOF, the rate of change of frequency in Hz/s
Stored energy, The battery level in kWh, and what it's doing right now: charging, supplying, idle, or "Full: losing X kW".
Grid power control, The battery dial, from −1000 kW (charge) to +1000 kW (discharge). Drag it, use the arrow keys, or use the −100 / Zero / +100 buttons. 
While automatic control is on, the dial moves by itself and is locked.
Automatic control, An on/off switch and the Main (Kp), Sum (Ki), and Rate (Kd) gains. Main reacts to how far frequency is from 60 Hz, Sum removes small offsets that linger, and Rate damps fast swings.

What you can buy
Battery storage costs $100 and gives +100 kWh of capacity
Wind turbine costs $100 and gives about 20 kW on average (up to 30 kW); varies with the wind
Hydro generator costs $1,000 and give steady 45 kW, plus 900 kWs of inertia
Customers ard free and give +$10/s income, but about 400 kW of new demand; unlocks when your money passes customers * $1,000

Playing
Demand rises through the afternoon toward its 5 PM peak, and grows the longer you play. If you do nothing, the battery drains covering the shortfall, and the frequency falls until the grid trips. Survive by:

Game over
If the frequency leaves 58–62 Hz, a Grid tripped screen explains why and shows how long you survived, your score, energy delivered and energy lost. Click Restart to start a fresh grid in the same game, or Back to lobby.

The simulation runs on a fixed time step set in frontend/src/game/engine.ts. DT = 0.1 s is the controller sample time, and SUBSTEPS = 5 integrates the swing equation in 0.02 s pieces. A fixed-timestep accumulator in useGridSim.ts keeps simulation time in step with real time, so the dynamics are deterministic regardless of small browser timing jitter. All tuning numbers live in the SIM block at the top of engine.ts.

## Known Problems

Money is tracked in each player's browser, so it can be faked. Each player's score lives in frontend/src/game/Game.tsx (localScore) and is reported to the server in update_state. The Market's affordability check (acceptOffer in backend/src/market.ts) trusts that reported score. Someone editing their browser's code could fake their money or their position in the player list. The fix is to keep each player's balance on the server. We may need to refactor to make this viable.

The game clock and income use a second, separate timer. The simulation uses the fixed-timestep loop in useGridSim.ts, but the Time display and income come from a separate one-second setInterval in Game.tsx with no catch-up. They can drift from simulation time, especially in a background tab. 
To reproduce, start a game, switch to another tab for a minute, then come back and compare the Time display with the Overview's time of day. The fix is to derive time and income from the simulation's own clock (sim.t), we'll need to update this in a later prototype

Background tabs slow the simulation down. Browsers throttle timers in hidden tabs, and the accumulator only catches up 2 seconds at a time (MAX_CATCH_UP_S in useGridSim.ts), so a hidden tab's grid falls behind real time. It doesn't trip unfairly, but it isn't running at full speed. Moving the simulation to a Web Worker or the server would fix this.

Games disappear when the server restarts. Running games and market contracts are kept in memory (backend/src/games.ts); only accounts are stored in MongoDB. Restarting the server closes every game.

Restart doesn't clear running market contracts. handleRestart in Game.tsx resets money, assets, the battery and the clock, but contracts that were active before the trip keep adding power to (or taking it from) the new grid until they expire.

Type definitions are duplicated between frontend and backend. PlayerData and Contracy in frontend/src/game/types.ts must match PlayerState in backend/src/games.ts and Contract in backend/src/market.ts. TIME_SCALE in backend/src/market.ts must also equal SIM.TIME_SCALE in engine.ts, or contract prices won't match the energy delivered. A shared folder imported by both sides would remove this risk.

The Security tab, Demand response (on the Market tab) and Configure (on the Assets tab) are placeholders.

No automated tests in the repository. The backend/tests folder is empty. The game logic and server rules were tested with standalone scripts during development, but no tests exists yet.

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Additional Documentation

TODO: Provide links to additional documentation that may exist in the repo, e.g.,
  * Sprint reports
  * User links

## License

