// =============================================================================
// MarketTab.tsx
// Power contracts between players in the same game
// Energy is counted on the game clock same as the battery see engine.ts for more
//
// This tab only DISPLAYS the market and COLLECTS what the player wants to do
//
// The contract list arrives as the "contracts" prop. Game.tsx keeps it up to date from the server's "market" broadcast
// Buying, offering and cancelling call functions from Game.tsx (onAccept, onOffer, onCancel)
// Those send socket messages to the server, where market.ts checks the rules and answers
// The tab has three views (Buy power / Sell power / Demand response)
// At the bottom of the file is a second small component, ActiveContracts, that draws the "Your contracts" table on both the Buy and Sell views
// =============================================================================

import { useState, type FormEvent } from 'react';
import Icon from '../Icon';
import Tabs, { EmptyState, TabPanel } from '../Tabs';
import { formatMoney, type Contract } from '../../types';
import { contractEnergyKwh } from '../../engine';

// The three views of the pill switch
type Sub = 'buy' | 'sell' | 'demand';

// The inputs handed down from Game.tsx through OpsPanel.tsx
type Props = {
  contracts: Contract[];
  myName: string;
  score: number;
  serverOffsetMs: number;
  onOffer: (offer: { powerKw: number; durationS: number; pricePerKwh: number }) => Promise<string | null>;
  onAccept: (id: string) => Promise<string | null>;
  onCancel: (id: string) => void;
};

// Formats money with exactly 2 decimals
const money2 = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Seconds left on an active contract
// c = the contract, offset = the clock minus the server's clock
function secondsLeft(c: Contract, offset: number) {
  // Not running yet, the full duration is left
  if (c.endsAt === null) return c.durationS;
  // endsAt is in SERVER time, Adding the offset converts it to YOUR clock's time
  return Math.max(0, Math.ceil((c.endsAt + offset - Date.now()) / 1000));
}

// The tab, The props are pulled out into variables ("destructuring")
export default function MarketTab({ contracts, myName, score, serverOffsetMs, onOffer, onAccept, onCancel }: Props) {
  // Which view is showing, Starts on Buy power.
  const [sub, setSub] = useState<Sub>('buy');
  // The three form fields are stored as TEXT, exactly as typed, so a half-typed value like "1." doesn't get mangled
  const [price, setPrice] = useState('1.20');
  const [duration, setDuration] = useState('60');
  const [power, setPower] = useState('100');
  // The red error under the Sell form, or null for none
  const [formError, setFormError] = useState<string | null>(null);
  // true while an offer is being sent, so the button can't be double-clicked, please dont reintroduce this bug it's really annoying to find
  const [busy, setBusy] = useState(false);
  // The red error on the Buy view
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Split the contract list three ways recalculated on every render, so always current
  const forSale = contracts.filter((c) => c.status === 'open' && c.seller !== myName);
  const mine = contracts.filter((c) => (c.seller === myName || c.buyer === myName) && (c.status === 'open' || c.status === 'active'));
  const history = contracts.filter((c) => (c.seller === myName || c.buyer === myName) && c.status === 'done').slice(-5).reverse();

  // Turn the typed text into numbers
  const p = Number(power), d = Number(duration), pr = Number(price);
  // The live preview under the form
  const previewKwh = Number.isFinite(p * d) ? contractEnergyKwh(p, d) : 0;
  // The total price of that energy
  const previewTotal = previewKwh * (Number.isFinite(pr) ? pr : 0);

  // Runs when the Sell form is submitted
  const submitOffer = async (e: FormEvent) => {
    // Stop the browser's default form behavior, which would reload the whole page
    e.preventDefault();
    // Clear any old error
    setFormError(null);
    // Check each number before bothering the server
    if (!(p >= 1 && p <= 1000)) return setFormError('Power must be 1–1,000 kW.');
    if (!(d >= 10 && d <= 600)) return setFormError('Duration must be 10–600 seconds.');
    if (!(pr >= 0.01 && pr <= 100)) return setFormError('Price must be $0.01–$100 per kWh.');
    // Disable the button while we wait
    setBusy(true);
    // Send the offer through Game.tsx to the server, and wait for its answer null = success or text = error
    const err = await onOffer({ powerKw: p, durationS: d, pricePerKwh: pr });
    // Re-enable the button
    setBusy(false);
    // If the server refused it, show why on success there's nothing to do: the new offer appears in "Your contracts" when the server's next market broadcast arrives
    if (err) setFormError(err);
  };

  // Runs when you click Buy on an offer
  const accept = async (id: string) => {
    // Clear any old error
    setAcceptError(null);
    // Ask the server to sell it to you, and wait for the answer
    const err = await onAccept(id);
    // Refused someone bought it first or not enough money
    if (err) setAcceptError(err);
  };

  // Draws the tab
  return (
    <>
      {/* "Market" title and the three-way switch */}
      <div className="gg-tabpanel-head">
        <h2>Market</h2>
        <Tabs<Sub>
          // Pill style instead of the underlined tab row
          variant="segmented"
          // Name for screen readers
          label="Market views"
          // Prefix for element ids
          idPrefix="market"
          // Which option is selected
          active={sub}
          // Picking an option updates sub
          onChange={setSub}
          // The three options
          tabs={[
            // Offers other players are selling
            { key: 'buy', label: 'Buy power' },
            // Create your own offer
            { key: 'sell', label: 'Sell power' },
            // Placeholder for a future feature that Tim has in gridgame2017 I think
            { key: 'demand', label: 'Demand response' },
          ]}
        />
      </div>

      {sub === 'buy' && (
        <TabPanel idPrefix="market" tabKey="buy">
          {/* The "Contracts for sale" box */}
          <section className="gg-shell" aria-labelledby="avail-title">
            {/* title on the left, your money on the right. */}
            <div className="gg-shell-head">
              <h3 id="avail-title">Contracts for sale</h3>
              <span className="gg-muted">You have {formatMoney(score)}</span>
            </div>
            {acceptError && <p className="gg-form-error" role="alert">{acceptError}</p>}
            {/* The table of offers. */}
            <table className="gg-table">
              <thead>
                <tr>
                  <th scope="col">Seller</th><th scope="col">Power</th><th scope="col">Duration</th>
                  {/* The last column holds the buttons; its label is hidden visually (sr-only) but read by screen readers. */}
                  <th scope="col">Price</th><th scope="col">Total</th><th scope="col"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {/* No offers, one row spanning all 6 columns with a message. Otherwise, one row per offer */}
                {forSale.length === 0 ? (
                  <tr><td colSpan={6}>No other player is selling power right now.</td></tr>
                ) : (
                  // .map turns each offer "c" into a table row
                  forSale.map((c) => (
                    // key = the contract's id, so React can track each row
                    <tr key={c.id} className="gg-row">
                      {/* Who's selling */}
                      <td>{c.seller}</td>
                      {/* How much power */}
                      <td>{c.powerKw} kW</td>
                      {/* For how long */}
                      <td>{c.durationS} s</td>
                      {/* Price per kWh */}
                      <td>{money2(c.pricePerKwh)}/kWh</td>
                      {/* The full price you'd pay */}
                      <td>{money2(c.totalPrice)}</td>
                      <td>
                        {/* Disabled when you can't afford it, "() => accept(c.id)" makes a small function, so accept runs only on click with this row's id */}
                        <button type="button" className="gg-btn primary small" disabled={score < c.totalPrice} onClick={() => accept(c.id)}>
                          {/* The button's text explains why it's disabled */}
                          {score < c.totalPrice ? 'Too expensive' : 'Buy'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
          {/* Your own open offers and running contracts, under the table */}
          <ActiveContracts contracts={mine} myName={myName} offset={serverOffsetMs} onCancel={onCancel} />
        </TabPanel>
      )}

      {sub === 'sell' && (
        <TabPanel idPrefix="market" tabKey="sell">
          {/* The "Offer a contract" box */}
          <section className="gg-shell" aria-labelledby="offer-title">
            <div className="gg-shell-head"><h3 id="offer-title">Offer a contract</h3></div>
            <form onSubmit={submitOffer}>
              {/* The three fields side by side */}
              <div className="gg-form">
                <div className="gg-field">
                  <label htmlFor="offer-price">Price ($/kWh)</label>
                  <input id="offer-price" className="gg-input" type="number" min={0.01} max={100} step={0.05} value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div className="gg-field">
                  {/* Duration in real seconds */}
                  <label htmlFor="offer-dur">Duration (s)</label>
                  <input id="offer-dur" className="gg-input" type="number" min={10} max={600} step={10} value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
                <div className="gg-field">
                  {/* Power in kW */}
                  <label htmlFor="offer-pow">Power (kW)</label>
                  <input id="offer-pow" className="gg-input" type="number" min={1} max={1000} step={10} value={power} onChange={(e) => setPower(e.target.value)} />
                </div>
              </div>
              {/* The red error, only when there is one */}
              {formError && <p className="gg-form-error" role="alert">{formError}</p>}
              {/* Submit button and the live preview. */}
              <div className="gg-form-foot">
                {/* type="submit" triggers the form's onSubmit disabled while busy */}
                <button type="submit" className="gg-btn primary" disabled={busy}>Offer contract</button>
                <span>
                  {/* Updates on every keystroke */}
                  {Math.round(previewKwh).toLocaleString('en-US')} kWh for {money2(previewTotal)}. While it runs, {Number.isFinite(p) ? p : 0} kW is added to your load.
                </span>
              </div>
            </form>
          </section>
          {/* Your open offers and running contracts */}
          <ActiveContracts contracts={mine} myName={myName} offset={serverOffsetMs} onCancel={onCancel} />
          {/* Only if you have finished contracts */}
          {history.length > 0 && (
            <section className="gg-shell" aria-labelledby="done-title">
              <div className="gg-shell-head"><h3 id="done-title">Finished</h3></div>
              <ul className="gg-history">
                {/* One line per finished contract */}
                {history.map((c) => (
                  <li key={c.id}>
                    {c.seller === myName ? `Sold to ${c.buyer}` : `Bought from ${c.seller}`}: {c.powerKw} kW × {c.durationS} s for {money2(c.totalPrice)}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </TabPanel>
      )}

      {sub === 'demand' && (
        <TabPanel idPrefix="market" tabKey="demand">
          {/* The text between the tags becomes EmptyState's message */}
          <EmptyState icon={<Icon name="market" />} title="Demand response isn't available yet">
            Recruit industrial customers who agree to cut their load during shortages, then curtail them when frequency drops.
          </EmptyState>
        </TabPanel>
      )}
    </>
  );
}

// open offers and running contracts
function ActiveContracts({ contracts, myName, offset, onCancel }: { contracts: Contract[]; myName: string; offset: number; onCancel: (id: string) => void }) {
  // Draws the "Your contracts" box
  return (
    <section className="gg-shell" aria-labelledby="mine-title">
      <div className="gg-shell-head"><h3 id="mine-title">Your contracts</h3></div>
      <table className="gg-table">
        <thead>
          <tr>
            <th scope="col">With</th><th scope="col">Power</th><th scope="col">Effect</th>
            <th scope="col">Total</th><th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {/* No contracts: a message row spanning all 5 columns. Otherwise, one row each */}
          {contracts.length === 0 ? (
            <tr><td colSpan={5}>No contracts yet.</td></tr>
          ) : (
            contracts.map((c) => {
              // Are you the seller of this one or the buyer
              const selling = c.seller === myName;
              return (
                <tr key={c.id} className="gg-row">
                  <td>{selling ? (c.buyer ?? 'Anyone') : c.seller}</td>
                  <td>{c.powerKw} kW</td>
                  {/* What it does to the users grid. */}
                  <td>{selling ? 'Adds to your load' : 'Adds to your generation'}</td>
                  <td>{money2(c.totalPrice)}</td>
                  <td>
                    {c.status === 'active' ? (
                      <span className="gg-pill-live">{secondsLeft(c, offset)} s left</span>
                    ) : (
                      <button type="button" className="gg-btn small" onClick={() => onCancel(c.id)}>Cancel offer</button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </section>
  );
}