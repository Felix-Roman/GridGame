// MarketTab.tsx
// Contracts between players and demand response. It replaces three of the old
// Resources sub tabs being Available Contract, Offer Contracts, Demand Response
// with one pill switch. The layouts follow GridGame2017; the buttons and
// inputs stay disabled until the backend supports contracts.

// useState remembers which view of the switch is showing
import { useState } from 'react';
// The icon component
import Icon from '../Icon';
// The pill switch, the panel wrapper, and the empty-state block
import Tabs, { EmptyState, TabPanel } from '../Tabs';

// The three views of the switch
type Sub = 'buy' | 'sell' | 'demand';
// Column headers shared by both contract tables
const columns = ['Seller', 'ID', 'Duration (s)', 'Power (kW)', 'Price ($/kWh)', 'Status'];

// The component it needs no props yet
export default function MarketTab() {
  // Which view is showing, Starts on Buy power
  const [sub, setSub] = useState<Sub>('buy');

  return (
    // Fragment: returns several elements without a wrapper
    <>
      {/* Header: Market title and the switch */}
      <div className="gg-tabpanel-head">
        {/* Tab title */}
        <h2>Market</h2>
        {/* The pill switch, Sub>limits its keys to buy/sell/demand */}
        <Tabs<Sub>
          // Pill style
          variant="segmented"
          // Name for screen readers
          label="Market views"
          // Prefix for element ids market tab buy
          idPrefix="market"
          // Which option is selected
          active={sub}
          // Picking an option updates sub
          onChange={setSub}
          // The three options
          tabs={[
            { key: 'buy', label: 'Buy power' },              // contracts other players are selling
            { key: 'sell', label: 'Sell power' },            // create your own offer
            { key: 'demand', label: 'Demand response' },     // industrial load curtailment
          ]}
        />
      </div>

      {/* Buy power view */}
      {sub === 'buy' && (
        // Panel linked to the Buy power option
        <TabPanel idPrefix="market" tabKey="buy">
          {/* Frame around the table, named by its heading */}
          <section className="gg-shell" aria-labelledby="avail-title">
            {/* Heading */}
            <div className="gg-shell-head"><h3 id="avail-title">Contracts for sale</h3></div>
            {/* The contracts table */}
            <table className="gg-table">
              {/* Header row: one per column scope is equal to col which tells the screen readers it labels a column */}
              <thead><tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
              {/* Body: a single row spanning all columns with the empty message */}
              <tbody><tr><td colSpan={columns.length}>No other player is selling power right now.</td></tr></tbody>
            </table>
          </section>
        </TabPanel>
      )}

      {/* Sell power" view */}
      {sub === 'sell' && (
        // Panel linked to the Sell power option.
        <TabPanel idPrefix="market" tabKey="sell">
          {/* The offer form */}
          <section className="gg-shell" aria-labelledby="offer-title">
            {/* Heading */}
            <div className="gg-shell-head"><h3 id="offer-title">Offer a contract</h3></div>
            {/* Three inputs side by side defaultValue = GridGame2017's defaults; disabled until the backend supports it. */}
            <div className="gg-form">
              {/* Price per kWh */}
              <div className="gg-field"><label htmlFor="offer-price">Price ($/kWh)</label><input id="offer-price" className="gg-input" type="number" defaultValue={200} disabled /></div>
              {/* How long the contract lasts */}
              <div className="gg-field"><label htmlFor="offer-dur">Duration (s)</label><input id="offer-dur" className="gg-input" type="number" defaultValue={100} disabled /></div>
              {/* How much power is sent */}
              <div className="gg-field"><label htmlFor="offer-pow">Power (kW)</label><input id="offer-pow" className="gg-input" type="number" defaultValue={50} disabled /></div>
            </div>
            {/* Disabled submit button plus a note explaining why */}
            <div className="gg-form-foot">
              {/* The button */}
              <button type="button" className="gg-btn primary" disabled>Offer contract</button>
              Selling opens once contracts are added to the server.
            </div>
          </section>
          {/* Your existing offers */}
          <section className="gg-shell" aria-labelledby="mine-title">
            {/* Heading */}
            <div className="gg-shell-head"><h3 id="mine-title">Your offers</h3></div>
            {/* Same table layout as above */}
            <table className="gg-table">
              {/* Header row */}
              <thead><tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
              {/* Empty message */}
              <tbody><tr><td colSpan={columns.length}>You haven't offered any power yet.</td></tr></tbody>
            </table>
          </section>
        </TabPanel>
      )}

      {/* Demand response view */}
      {sub === 'demand' && (
        // Panel linked to the Demand response option
        <TabPanel idPrefix="market" tabKey="demand">
          {/* Placeholder explaining what demand response will do */}
          <EmptyState icon={<Icon name="market" />} title="Demand response isn't available yet">
            Recruit industrial customers who agree to cut their load during shortages, then curtail them when frequency drops.
          </EmptyState>
        </TabPanel>
      )}
    </>
  );
}
