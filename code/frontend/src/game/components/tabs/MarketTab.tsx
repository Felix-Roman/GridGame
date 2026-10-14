import { useState } from 'react';
import Icon from '../Icon';
import Tabs, { EmptyState, TabPanel } from '../Tabs';

// Contracts between players and demand response. Replaces three of the
// old Resources sub-tabs. The layouts follow GridGame2017; actions stay
// disabled until the backend supports contracts.

type Sub = 'buy' | 'sell' | 'demand';
const columns = ['Seller', 'ID', 'Duration (s)', 'Power (kW)', 'Price ($/kWh)', 'Status'];

export default function MarketTab() {
  const [sub, setSub] = useState<Sub>('buy');

  return (
    <>
      <div className="gg-tabpanel-head">
        <h2>Market</h2>
        <Tabs<Sub>
          variant="segmented"
          label="Market views"
          idPrefix="market"
          active={sub}
          onChange={setSub}
          tabs={[
            { key: 'buy', label: 'Buy power' },
            { key: 'sell', label: 'Sell power' },
            { key: 'demand', label: 'Demand response' },
          ]}
        />
      </div>

      {sub === 'buy' && (
        <TabPanel idPrefix="market" tabKey="buy">
          <section className="gg-shell" aria-labelledby="avail-title">
            <div className="gg-shell-head"><h3 id="avail-title">Contracts for sale</h3></div>
            <table className="gg-table">
              <thead><tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
              <tbody><tr><td colSpan={columns.length}>No other player is selling power right now.</td></tr></tbody>
            </table>
          </section>
        </TabPanel>
      )}

      {sub === 'sell' && (
        <TabPanel idPrefix="market" tabKey="sell">
          <section className="gg-shell" aria-labelledby="offer-title">
            <div className="gg-shell-head"><h3 id="offer-title">Offer a contract</h3></div>
            <div className="gg-form">
              <div className="gg-field"><label htmlFor="offer-price">Price ($/kWh)</label><input id="offer-price" className="gg-input" type="number" defaultValue={200} disabled /></div>
              <div className="gg-field"><label htmlFor="offer-dur">Duration (s)</label><input id="offer-dur" className="gg-input" type="number" defaultValue={100} disabled /></div>
              <div className="gg-field"><label htmlFor="offer-pow">Power (kW)</label><input id="offer-pow" className="gg-input" type="number" defaultValue={50} disabled /></div>
            </div>
            <div className="gg-form-foot">
              <button type="button" className="gg-btn primary" disabled>Offer contract</button>
              Selling opens once contracts are added to the server.
            </div>
          </section>
          <section className="gg-shell" aria-labelledby="mine-title">
            <div className="gg-shell-head"><h3 id="mine-title">Your offers</h3></div>
            <table className="gg-table">
              <thead><tr>{columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
              <tbody><tr><td colSpan={columns.length}>You haven't offered any power yet.</td></tr></tbody>
            </table>
          </section>
        </TabPanel>
      )}

      {sub === 'demand' && (
        <TabPanel idPrefix="market" tabKey="demand">
          <EmptyState icon={<Icon name="market" />} title="Demand response isn't available yet">
            Recruit industrial customers who agree to cut their load during shortages, then curtail them when frequency drops.
          </EmptyState>
        </TabPanel>
      )}
    </>
  );
}
