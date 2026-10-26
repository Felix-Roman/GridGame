// =============================================================================
// AssetsTab.tsx
// The Assets tab: the shop where players buy storage, wind, hydro and add customers, plus the grid inertia readout
//
// This tab doesn't change any game numbers itself 
// When you click Buy it calls a function from Game.tsx passed down through OpsPanel.tsx 
// Game.tsx updates the money and assets, and React re-renders this tab with the new numbers.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { formatMoney, type ResourceState } from '../../types';
import Icon, { type IconName } from '../Icon';
import Tabs, { EmptyState, TabPanel } from '../Tabs';
import { SIM, inertiaOf } from '../../engine';

// The inputs this component accepts are passed down from Game.tsx through OpsPanel
// () => void means a function that takes nothing and returns nothing
type Props = {
  score: number;
  resources: ResourceState;
  onBuyStorage: () => void;
  onBuyWind: () => void;
  onBuyHydro: () => void;
  onAddCustomer: () => void;
};

// The two views of the sub-switch
type Sub = 'buy' | 'configure';

// Shows an owned count and makes it briefly pop whenever the number changes so a purchase is visible
function Owned({ value, unit }: { value: number; unit: string }) {

  // Remembers the previous value between renders without causing a redraw
  const prev = useRef(value);

  // A counter that goes up on every change; using it as the element's key restarts the CSS animation.
  // useState returns a pair, the current value bump and a function that changes it setBump() it starts at 0
  const [bump, setBump] = useState(0);

  // After each render where a value changed
  useEffect(() => {

    // if it is really different from last time
    if (value !== prev.current) {

      // remember the new value
      prev.current = value;

      // and bump the counter to replay the animation
      setBump((b) => b + 1);
    }

  // Only run when value changes.
  }, [value]);

  // Draws the count.
  return (
    <div className="gg-owned">
      <strong key={bump} className={bump ? 'bump' : undefined}>{value.toLocaleString('en-US')}</strong>
      <span>{unit}</span>
    </div>
  );
}

// The Assets tab component.
export default function AssetsTab({ score, resources, onBuyStorage, onBuyWind, onBuyHydro, onAddCustomer }: Props) {
  // Which sub view is showing, starts on Buy assets
  // useState<Sub> tells TypeScript sub can only be 'buy' or 'configure'
  const [sub, setSub] = useState<Sub>('buy');

  // Score needed before another customer can be added: customers x 1000.
  const customerThreshold = resources.customerUnits * 1000;

  // Grid inertia
  const inertiaKws = inertiaOf(resources);

  // How fast the needle moves for a 100 kW mismatch
  // This is the swing equation from engine.ts
  const rocofPer100 = (SIM.F0 * 100) / (2 * inertiaKws);

  // A turbine's average output
  const avgWindKw = Math.round(SIM.WIND_RATED_KW * SIM.WIND_MEAN);

  // the drawing code below is written once and loops over them.
  const items: {
    // kind is used for the CSS color class; icon = which icon; name/effect = the text; owned/unit = the count;
    // action is button text; onClick = what the button does; enabled = can it be bought now; reason = why not.
    kind: string; icon: IconName; name: string; effect: string; owned: number; unit: string;
    action: string; onClick: () => void; enabled: boolean; reason: string;
  }[] = [

    // Battery storage: $100 for +100 kWh of capacity
    {
      kind: 'storage', icon: 'battery', name: 'Battery storage', effect: '+100 kWh of storage for $100',
      owned: resources.storageUnits, unit: 'kWh', action: 'Buy for $100', onClick: onBuyStorage,
      enabled: score >= 100, reason: `Need ${formatMoney(100 - score)} more`,
    },

    // Wind turbine: $100 each
    {
      kind: 'wind', icon: 'wind', name: 'Wind turbine', effect: `About ${avgWindKw} kW on average (up to ${SIM.WIND_RATED_KW} kW). Cheap, but rises and falls with the wind and adds no inertia`,
      owned: resources.windUnits, unit: 'owned', action: 'Buy for $100', onClick: onBuyWind,
      enabled: score >= 100, reason: `Need ${formatMoney(100 - score)} more`,
    },

    // Hydro generator: $1,000 each, and adds inertia
    {
      kind: 'hydro', icon: 'hydro', name: 'Hydro generator', effect: `Steady ${SIM.HYDRO_KW} kW, and adds ${SIM.HYDRO_INERTIA_KWS} kW·s of inertia`,
      owned: resources.hydroUnits, unit: 'owned', action: 'Buy for $1,000', onClick: onBuyHydro,
      enabled: score >= 1000, reason: `Need ${formatMoney(1000 - score)} more`,
    },

    // Customer: free, but only once score passes customers x 1000
    {
      kind: 'customer', icon: 'customer', name: 'Customer', effect: `Free. Pays $${SIM.INCOME_PER_CUSTOMER}/s, but adds about ${SIM.CUSTOMER_BASE_KW} kW of demand that grows over time`,
      owned: resources.customerUnits, unit: 'connected', action: 'Add customer', onClick: onAddCustomer,
      enabled: score > customerThreshold, reason: `Unlocks when your score passes ${formatMoney(customerThreshold)}`,
    },
  ];

  // Draws the tab
  return (

    // Fragment: returns several elements without a wrapper.
    <>
      {/* Header "Assets" title and the Buy/Configure switch */}
      <div className="gg-tabpanel-head">
        {/* Tab title. */}
        <h2>Assets</h2>
        {/* The pill switch <Sub> limits its keys to 'buy' | 'configure' */}
        <Tabs<Sub>
          variant="segmented"
          label="Asset views"
          idPrefix="assets"
          active={sub}
          onChange={setSub}
          tabs={[{ key: 'buy', label: 'Buy assets' }, { key: 'configure', label: 'Configure' }]}
        />
      </div>

      {/* Show the shop for buy, otherwise the Configure placeholder*/}
      {sub === 'buy' ? (

        <TabPanel idPrefix="assets" tabKey="buy">
          {/* Available funds */}
          <div className="gg-funds">
            {/* Label */}
            <span>Available funds</span>
            {/* Amount */}
            <strong>{formatMoney(score)}</strong>
          </div>

          {/* The list of shop rows */}
          <ul className="gg-shop">
            {/* One row per item .map turns each item object into a <li> element */}
            {items.map((it) => (
              // The row. kind-<kind> sets its color stripe and icon
              <li key={it.kind} className={`gg-item kind-${it.kind}`}>
                {/* Colored icon tile */}
                <span className="gg-item-icon"><Icon name={it.icon} /></span>
                {/* Name, description, and if locked the reason */}
                <div>
                  {/* Asset name */}
                  <h3>{it.name}</h3>
                  {/* What it does */}
                  <p>{it.effect}</p>
                  {/* Only when it can't be bought show the why in orange */}
                  {!it.enabled && <p className="reason" id={`reason-${it.kind}`}>{it.reason}</p>}
                </div>
                {/* Owned count with the pop animation */}
                <Owned value={it.owned} unit={it.unit} />
                {/* The buy button */}
                <button
                  // A plain button, not a form submit
                  type="button"
                  // Yellow primary style
                  className="gg-btn primary"
                  // Runs the purchase handler from Game.tsx
                  onClick={it.onClick}
                  // Greyed out and unclickable when it can't be bought
                  disabled={!it.enabled}
                  // When disabled, screen readers also read the reason
                  aria-describedby={!it.enabled ? `reason-${it.kind}` : undefined}
                >
                  {/* Button text */}
                  {it.action}
                </button>
              </li>
            ))}
          </ul>

          {/* Grid inertia readout */}
          <div className="gg-inertia">
            {/* The value */}
            <span className="val">{inertiaKws.toLocaleString('en-US')}<small> kW·s</small></span>
            {/* Title */}
            <h3>Grid inertia</h3>
            {/* Explanation of grid intertia */}
            <p>
              Hydro generators and customers' motors are large spinning machines. More inertia slows down how fast
              frequency changes when generation and load don't match: right now a 100 kW mismatch moves the
              frequency about {rocofPer100.toFixed(2)} Hz per second.
            </p>
          </div>
        </TabPanel>
      ) : (
        // The Configure panel
        <TabPanel idPrefix="assets" tabKey="configure">
          {/* Placeholder until the engine sends asset settings */}
          <EmptyState icon={<Icon name="plug" />} title="Asset settings aren't connected yet">
            The price customers pay and other asset settings will show here once the simulation engine sends them.
          </EmptyState>
        </TabPanel>
      )}
    </>
  );
}