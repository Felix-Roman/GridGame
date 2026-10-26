// =============================================================================
// Shared game types, These match the PlayerState shape in backend/src/games.ts
//
// the frequency limits (58 / 60 / 62 Hz), defined once so every file uses the same numbers
// helper function turning a frequency into "Stable"/"Drifting", and formatting time and money for display
// Keeping these in one place means changing, say, the "Drifting" threshold here updates the gauge
// =============================================================================

// The three automatic-control settings
export type PidGains = {
  main: number; // Kp
  sum: number;  // Ki
  rat: number;  // Kd
};

// One player as the server broadcasts them in "room_players" (shown in the player list)
export type PlayerData = {
  // Their socket connection id which is unique per tab, Used as the React key in the list
  id: string;
  // Display name
  username: string;
  guest?: boolean;
  // Their money
  score: number;
  // How long they've been playing, in seconds
  timeSeconds: number;
  // Energy in their battery 
  battery: number;
  // Their grid frequency
  frequency: number;
  // Their automatic-control settings
  pid: PidGains;
  batteryCapacity?: number; // that player's battery size
  tripped?: boolean; // their grid has tripped
};

// One power contract on the Market tab (matches Contract in backend/src/market.ts).
// A contract is always in exactly one of these four states ("|" means "or"). Any other text is a compile error.
export type ContractStatus = 'open' | 'active' | 'done' | 'cancelled';
// The contract itself, as the server sends it.
export type Contract = {
  // Short random id; the Buy and Cancel buttons send it back to the server.
  id: string;
  // Seller's name.
  seller: string;
  // Buyer's name, or null while nobody has bought it. ("string | null" = one or the other.)
  buyer: string | null;
  // Power in kW, and how long it runs in real seconds.
  powerKw: number;
  durationS: number;
  // Price per kWh, and the full price (worked out by the server).
  pricePerKwh: number;
  totalPrice: number;
  // Where it is in its life.
  status: ContractStatus;
  endsAt: number | null; // server clock in miliseconds
};

// What the player owns
export interface ResourceState {
  // battery capacity
  storageUnits: number; 
  // Number of wind turbines
  windUnits: number;
  // Number of hydro generators
  hydroUnits: number;
  // Number of connected customers
  customerUnits: number;
}

// The target frequency
export const FREQ_SETPOINT = 60;
// The trip limits, FrequencyGauge uses these for the ends of its arc
export const FREQ_MIN = 58;
export const FREQ_MAX = 62;

// The three status levels shown on the gauge, the status pill, and the player list's avatar rings
export type FreqStatus = 'stable' | 'drifting' | 'critical';

// Turns a frequency into one of the three statuses
export function frequencyStatus(hz: number): FreqStatus {
  // How far from 60 Hz, ignoring direction (Math.abs turns -0.8 into 0.8), so too high and too low are treated alike.
  const off = Math.abs(hz - FREQ_SETPOINT);
  // Within 0.5 Hz (59.5–60.5) green
  if (off < 0.5) return 'stable';
  // Within 1.5 Hz (58.5–61.5) orange
  if (off < 1.5) return 'drifting';
  // Further out (within 0.5 Hz of tripping) red
  return 'critical';
}

// The words shown on screen for each status
export const statusLabel: Record<FreqStatus, string> = {
  stable: 'Stable',
  drifting: 'Drifting',
  critical: 'Near trip limit',
};

// Turns a number of seconds into a clock format
export function formatClock(totalSeconds: number) {
  // Whole hours, 3600 seconds per hour
  const h = Math.floor(totalSeconds / 3600);
  // Whole minutes left over
  const m = Math.floor((totalSeconds % 3600) / 60);
  // Seconds left over
  const s = totalSeconds % 60;
  // Makes every number at least 2 digits by adding a leading zero
  const pad = (n: number) => n.toString().padStart(2, '0');
  // Join them with colons, Hours aren't padded with extra zeros atm
  return `${h}:${pad(m)}:${pad(s)}`;
}

// Turns a number into money text
export function formatMoney(n: number) {
  return '$' + Math.floor(n).toLocaleString('en-US');
}