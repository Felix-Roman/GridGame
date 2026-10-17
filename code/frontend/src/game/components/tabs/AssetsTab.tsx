// The Assets tab: the shop where players buy storage, wind, hydro and add
// customers, plus the grid inertia readout. 

// useEffect/useRef/useState power the little "bump" animation and the sub-switch.
import { useEffect, useRef, useState } from 'react';

// formatMoney turns 1800 into "$1,800"; ResourceState is the type for owned assets.
import { formatMoney, type ResourceState } from '../../types';

// The icon component and the type listing valid icon names.
import Icon, { type IconName } from '../Icon';

// The pill switch, the panel wrapper, and the empty-state block.
import Tabs, { EmptyState, TabPanel } from '../Tabs';

// The props/inputs this component accepts, passed down from Game.tsx through OpsPanel.
type Props = {
  score: number;                           // available funds
  resources: ResourceState;                // what the player owns
  onBuyStorage: () => void;                // buy storage handler
  onBuyWind: () => void;                   // buy wind handler
  onBuyHydro: () => void;                  // buy hydro handler
  onAddCustomer: () => void;               // add customer handler
};

// The two views of the sub-switch.
type Sub = 'buy' | 'configure';

// Shows an owned count and makes it briefly pop whenever the number changes so a purchase is visible.
function Owned({ value, unit }: { value: number; unit: string }) {

  // Remembers the previous value between renders without causing a redraw.
  const prev = useRef(value);

  // A counter that goes up on every change using it as the element's key restarts the CSS animation.
  const [bump, setBump] = useState(0);

  // After each render where value changed...
  useEffect(() => {

    // if it is really different from last time
    if (value !== prev.current) {

      // remember the new value
      prev.current = value;

      // and bump the counter to replay the animation.
      setBump((b) => b + 1);
    }

  // Only run when value changes.
  }, [value]);

  // Draws the count.
  return (
    <div className="gg-owned">
      {/* A new key makes React replace the element, which restarts the bump animation. No class on first render (bump = 0). */}
      <strong key={bump} className={bump ? 'bump' : undefined}>{value.toLocaleString('en-US')}</strong>
      {/* Label under the number ("owned", "capacity", "connected"). */}
      <span>{unit}</span>
    </div>
  );
}

// The Assets tab component.
export default function AssetsTab({ score, resources, onBuyStorage, onBuyWind, onBuyHydro, onAddCustomer }: Props) {

  // Which sub view is showing, Starts on Buy assets
  const [sub, setSub] = useState<Sub>('buy');

  // Score needed before another customer can be added customers x 1000
  const customerThreshold = resources.customerUnits * 1000;

  // Grid inertia: 0.01 per hydro unit, shown with 2 decimals 20 hydro -> 0.20
  const inertia = (resources.hydroUnits * 0.01).toFixed(2);

  // One entry per shop row, The type describes every field each row needs.
  const items: {
    kind: string; icon: IconName; name: string; effect: string; owned: number; unit: string;
    action: string; onClick: () => void; enabled: boolean; reason: string;

  // The actual rows:
  }[] = [

    // Battery storage: $100 for +100 capacity.
    {
      kind: 'storage', icon: 'battery', name: 'Battery storage', effect: '+100 capacity for $100',          // look and description
      owned: resources.storageUnits, unit: 'capacity', action: 'Buy for $100', onClick: onBuyStorage,       // count, label, button
      enabled: score >= 100, reason: `Need ${formatMoney(100 - score)} more`,                               // when it can be bought, and why not
    },

    // Wind turbine: $100 each.
    {
      kind: 'wind', icon: 'wind', name: 'Wind turbine', effect: 'Cheap generation, but output varies with the wind',
      owned: resources.windUnits, unit: 'owned', action: 'Buy for $100', onClick: onBuyWind,
      enabled: score >= 100, reason: `Need ${formatMoney(100 - score)} more`,
    },

    // Hydro generator: $1,000 each, and adds inertia.
    {
      kind: 'hydro', icon: 'hydro', name: 'Hydro generator', effect: 'Steady generation and adds grid inertia',
      owned: resources.hydroUnits, unit: 'owned', action: 'Buy for $1,000', onClick: onBuyHydro,
      enabled: score >= 1000, reason: `Need ${formatMoney(1000 - score)} more`,
    },

    // Customer: free, but only once score passes customers x 1000.
    {
      kind: 'customer', icon: 'customer', name: 'Customer', effect: 'Free. Each one adds load and pays $100/s',
      owned: resources.customerUnits, unit: 'connected', action: 'Add customer', onClick: onAddCustomer,
      enabled: score > customerThreshold, reason: `Unlocks when your score passes ${formatMoney(customerThreshold)}`,
    },
  ];

  // Draws the tab.
  return (

    // Fragment: returns several elements without a wrapper.
    <>
      {/* Header: "Assets" title and the Buy/Configure switch. */}
      <div className="gg-tabpanel-head">
        {/* Tab title. */}
        <h2>Assets</h2>
        {/* The pill switch. <Sub> limits its keys to 'buy' | 'configure'. */}
        <Tabs<Sub>
          // Pill style instead of the underlined tab row.
          variant="segmented"
          // Name for screen readers.
          label="Asset views"
          // Prefix for element ids ("assets-tab-buy", "assets-panel-buy").
          idPrefix="assets"
          // Which option is selected.
          active={sub}
          // Picking an option updates sub.
          onChange={setSub}
          // The two options.
          tabs={[{ key: 'buy', label: 'Buy assets' }, { key: 'configure', label: 'Configure' }]}
        />
      </div>

      {/* Show the shop for buy, otherwise the Configure placeholder. condition ? A : B */}
      {sub === 'buy' ? (

        // The shop panel.
        <TabPanel idPrefix="assets" tabKey="buy">
          {/* "Available funds  $1,800" bar */}
          <div className="gg-funds">
            {/* Label */}
            <span>Available funds</span>
            {/* Amount */}
            <strong>{formatMoney(score)}</strong>
          </div>

          {/* The list of shop rows */}
          <ul className="gg-shop">
            {/* One row per item */}
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
                  {/* Only when it can't be bought: why, in orange. The id lets the button point to it. */}
                  {!it.enabled && <p className="reason" id={`reason-${it.kind}`}>{it.reason}</p>}
                </div>
                {/* Owned count with the pop animation. */}
                <Owned value={it.owned} unit={it.unit} />
                {/* The buy button. */}
                <button
                  // A plain button not a form submit
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
                  {/* Button text, e.g. Buy for $100 */}
                  {it.action}
                </button>
              </li>
            ))}
          </ul>

          {/* Grid inertia readout. */}
          <div className="gg-inertia">
            {/* The value, e.g. 0.20 */}
            <span className="val">{inertia}</span>
            {/* Title. */}
            <h3>Grid inertia</h3>
            {/* Explanation */}
            <p>
              Hydro generators and industrial loads have large spinning machines. More inertia slows down how fast
              frequency changes when generation and load don't match.
            </p>
          </div>
        </TabPanel>
      ) : (
        // The Configure panel
        <TabPanel idPrefix="assets" tabKey="configure">
          {/* Placeholder until the engine sends asset settings. */}
          <EmptyState icon={<Icon name="plug" />} title="Asset settings aren't connected yet">
            The price customers pay and other asset settings will show here once the simulation engine sends them.
          </EmptyState>
        </TabPanel>
      )}
    </>
  );
}
