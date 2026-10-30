// =============================================================================
// market.ts
// Power contracts between players in one game. The server is the referee.
// it keeps the list, makes sure an offer is only bought once, and tells the buyer and seller when money changes hands. 
// Each player's own browser applies the power to their grid while the contract is active
//
// Pricing uses the same game clock as the frontend battery (engine.ts):
// energy (kWh) = power (kW) * duration (s) * TIME_SCALE / 3600
// =============================================================================
import crypto from 'crypto';

// How many game seconds pass per real second, used in the price formula
// MUST MATCH SIM.TIME_SCALE in frontend/src/game/engine.ts
export const TIME_SCALE = 90;
// Each player can have at most 5 unsold offers at once
const MAX_OPEN_PER_SELLER = 5;
// The list is trimmed to about 40 contracts by removing old finished ones, so it can't grow forever
const MAX_KEPT = 40;

// The four possible states
export type ContractStatus = 'open' | 'active' | 'done' | 'cancelled';

// One contract
export interface Contract {
  // A short random id the Buy and Cancel buttons send it back
  id: string;
  // Who is selling, names are unique inside a game, so a name identifies a player
  seller: string;
  // Who bought it, or null while it's still open
  buyer: string | null;
  // How much power in kW
  powerKw: number;
  // How long it runs in real seconds
  durationS: number;
  // The asking price per kWh of energy
  pricePerKwh: number;
  // The full price worked out when the offer is made
  totalPrice: number;
  // what state it is currently in
  status: ContractStatus;
  // When it was created
  createdAt: number;
  // When an active contract ends
  endsAt: number | null;
}

// One game's market contracts and a "changed" flag
export interface Market {
  // Every contract in this game oldest first
  contracts: Contract[];
  // true when something changed so gameSocket.ts can broadcastsand reset it
  dirty: boolean;
}

// Makes an empty market that games.ts calls when a game is created
// "(): Market =>" is a function with no inputs that returns a Market
// The object is wrapped in ( ) so JavaScript reads { ... } as an object, not a block of code
export const newMarket = (): Market => ({ contracts: [], dirty: false });

// What makeOffer and acceptOffer return
export type MarketResult = { ok: true; contract: Contract } | { ok: false; error: string };

// Rounds to 2 decimal places for money
const round2 = (n: number) => Math.round(n * 100) / 100;

// Is v a real number between min and max rejects text, NaN and Infinity
const isNum = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

// Keeps the list from growing forever check the MAX_KEPT contracts
// the OLDEST finished or cancelled ones are removed, Open and active ones are never removed
function prune(m: Market) {
  // All finished or cancelled contracts oldest first
  const finished = m.contracts.filter((c) => c.status === 'done' || c.status === 'cancelled');
  // Under the limit or nothing that can be removed then do nothing
  if (m.contracts.length <= MAX_KEPT || finished.length === 0) return;
  // figure out how many are over the limit take that many of the oldest finished ones off
  const drop = new Set(finished.slice(0, m.contracts.length - MAX_KEPT).map((c) => c.id));
  // Rebuild the list without those ids
  m.contracts = m.contracts.filter((c) => !drop.has(c.id));
}

// A player offers power for sale.
export function makeOffer(m: Market, seller: string, body: unknown): MarketResult {
  // Make sure body is an object or use an empty one so reading its fields can't crash
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  // Check each number is real and within its range the same limits appear in MarketTab.tsx
  // but the browser's checks can be skipped by a cheater or hacker, so the server checks again
  if (!isNum(b.powerKw, 1, 1000)) return { ok: false, error: 'Power must be 1–1,000 kW.' };
  if (!isNum(b.durationS, 10, 600)) return { ok: false, error: 'Duration must be 10–600 seconds.' };
  if (!isNum(b.pricePerKwh, 0.01, 100)) return { ok: false, error: 'Price must be $0.01–$100 per kWh.' };
  // Count this seller's offers that are still open
  const open = m.contracts.filter((c) => c.seller === seller && c.status === 'open').length;
  // Already 5 or whatever max it is? Refuse em the dirty spammer
  if (open >= MAX_OPEN_PER_SELLER) return { ok: false, error: `You can have at most ${MAX_OPEN_PER_SELLER} open offers.` };

  // Tidy the numbers up to look pretty
  const powerKw = Math.round(b.powerKw);
  const durationS = Math.round(b.durationS);
  const pricePerKwh = round2(b.pricePerKwh);
  // The energy this contract delivers, in kWh
  const energyKwh = (powerKw * durationS * TIME_SCALE) / 3600;
  // Build the new contract
  const contract: Contract = {
    // 4 random bytes written as 8 hexadecimal characters
    id: crypto.randomBytes(4).toString('hex'),
    // seller: seller
    seller,
    // Nobody has bought it yet
    buyer: null,
    // The tidied numbers
    powerKw,
    durationS,
    pricePerKwh,
    // The full price, fixed now so it can't change after someone sees it
    totalPrice: round2(energyKwh * pricePerKwh),
    // Waiting for a buyer
    status: 'open',
    // timestamp
    createdAt: Date.now(),
    // Not running yet
    endsAt: null,
  };

  // Add it to the end of the list
  m.contracts.push(contract);
  // Something changed broadcast on the next tick
  m.dirty = true;
  // Trim old finished contracts if the list is too long
  prune(m);
  return { ok: true, contract };
}

// A player buys an open offer. buyerScore is the buyer's last reported money.
export function acceptOffer(m: Market, buyer: string, id: unknown, buyerScore: number, sellerPresent: boolean): MarketResult {
  // Find the contract with that id
  const c = m.contracts.find((x) => x.id === id);
  // Doesn't exist, or isn't open any more someone else bought it first, or it was cancelled
  // This one check is what guarantees an offer can only be sold once
  if (!c || c.status !== 'open') return { ok: false, error: 'That offer is no longer available.' };
  // No buying from yourself
  if (c.seller === buyer) return { ok: false, error: "You can't buy your own offer." };
  // The seller left and this offer somehow wasn't withdrawn yet cancel it now so nobody else tries
  if (!sellerPresent) {
    // Move it to cancelled
    c.status = 'cancelled';
    // broadcast the change
    m.dirty = true;
    // tell the buyer why.
    return { ok: false, error: 'The seller has left the game.' };
  }

  // Not enough money for the full price
  if (buyerScore < c.totalPrice) return { ok: false, error: 'You don’t have enough money for this contract.' };
  // All good it's now running
  c.status = 'active';
  // Record who bought it
  c.buyer = buyer;
  // It ends durations seconds from now
  c.endsAt = Date.now() + c.durationS * 1000;
  // Broadcast the change
  m.dirty = true;
  // gameSocket.ts then tells the buyer to pay and the seller to get paid
  return { ok: true, contract: c };
}

// The seller withdraws an open offer. Returns true if it was cancelled
export function cancelOffer(m: Market, seller: string, id: unknown): boolean {
  // Find the contract
  const c = m.contracts.find((x) => x.id === id);
  // Only cancel it if it exists and is still open and belongs to THIS player you can't cancel someone else's
  if (!c || c.status !== 'open' || c.seller !== seller) return false;
  // Withdraw it
  c.status = 'cancelled';
  // Broadcast the change
  m.dirty = true;
  return true;
}

// When a player leaves, their unsold offers are withdrawn
// gameSocket.ts calls this from leave()
export function cancelOffersBy(m: Market, seller: string) {
  // Look at every contract
  for (const c of m.contracts) {
    // This seller and still open
    if (c.seller === seller && c.status === 'open') {
      // Withdraw it
      c.status = 'cancelled';
      // Broadcast the change
      m.dirty = true;
    }
  }
}

// Marks running contracts whose time is up as done, Call regularly
// gameSocket.ts calls it 4 times a second
export function expireContracts(m: Market, now = Date.now()) {
  // Look at every contract
  for (const c of m.contracts) {
    // if that time has passed
    if (c.status === 'active' && c.endsAt !== null && c.endsAt <= now) {
      // It's finished Both browsers see "done" in the next broadcast and stop applying the power
      c.status = 'done';
      // Broadcast the change
      m.dirty = true;
    }
  }
}

// What clients receive
export const publicContracts = (m: Market) => m.contracts.map(({ createdAt: _c, ...rest }) => rest);
