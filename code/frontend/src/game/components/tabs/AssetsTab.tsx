import { useEffect, useRef, useState } from 'react';
import { formatMoney, type ResourceState } from '../../types';
import Icon, { type IconName } from '../Icon';
import Tabs, { EmptyState, TabPanel } from '../Tabs';

// Manage assets. The old Resources > Manage Assets > Purchase path
// (three tab rows) is now one tab with a two-way switch.

type Props = {
  score: number;
  resources: ResourceState;
  onBuyStorage: () => void;
  onBuyWind: () => void;
  onBuyHydro: () => void;
  onAddCustomer: () => void;
};

type Sub = 'buy' | 'configure';

// Briefly scales the owned count when it changes, so a purchase is visible.
function Owned({ value, unit }: { value: number; unit: string }) {
  const prev = useRef(value);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (value !== prev.current) {
      prev.current = value;
      setBump((b) => b + 1);
    }
  }, [value]);
  return (
    <div className="gg-owned">
      <strong key={bump} className={bump ? 'bump' : undefined}>{value.toLocaleString('en-US')}</strong>
      <span>{unit}</span>
    </div>
  );
}

export default function AssetsTab({ score, resources, onBuyStorage, onBuyWind, onBuyHydro, onAddCustomer }: Props) {
  const [sub, setSub] = useState<Sub>('buy');
  const customerThreshold = resources.customerUnits * 1000;
  const inertia = (resources.hydroUnits * 0.01).toFixed(2);

  const items: {
    kind: string; icon: IconName; name: string; effect: string; owned: number; unit: string;
    action: string; onClick: () => void; enabled: boolean; reason: string;
  }[] = [
    {
      kind: 'storage', icon: 'battery', name: 'Battery storage', effect: '+100 capacity for $100',
      owned: resources.storageUnits, unit: 'capacity', action: 'Buy for $100', onClick: onBuyStorage,
      enabled: score >= 100, reason: `Need ${formatMoney(100 - score)} more`,
    },
    {
      kind: 'wind', icon: 'wind', name: 'Wind turbine', effect: 'Cheap generation, but output varies with the wind',
      owned: resources.windUnits, unit: 'owned', action: 'Buy for $100', onClick: onBuyWind,
      enabled: score >= 100, reason: `Need ${formatMoney(100 - score)} more`,
    },
    {
      kind: 'hydro', icon: 'hydro', name: 'Hydro generator', effect: 'Steady generation and adds grid inertia',
      owned: resources.hydroUnits, unit: 'owned', action: 'Buy for $1,000', onClick: onBuyHydro,
      enabled: score >= 1000, reason: `Need ${formatMoney(1000 - score)} more`,
    },
    {
      kind: 'customer', icon: 'customer', name: 'Customer', effect: 'Free. Each one adds load and pays $100/s',
      owned: resources.customerUnits, unit: 'connected', action: 'Add customer', onClick: onAddCustomer,
      enabled: score > customerThreshold, reason: `Unlocks when your score passes ${formatMoney(customerThreshold)}`,
    },
  ];

  return (
    <>
      <div className="gg-tabpanel-head">
        <h2>Assets</h2>
        <Tabs<Sub>
          variant="segmented"
          label="Asset views"
          idPrefix="assets"
          active={sub}
          onChange={setSub}
          tabs={[{ key: 'buy', label: 'Buy assets' }, { key: 'configure', label: 'Configure' }]}
        />
      </div>

      {sub === 'buy' ? (
        <TabPanel idPrefix="assets" tabKey="buy">
          <div className="gg-funds">
            <span>Available funds</span>
            <strong>{formatMoney(score)}</strong>
          </div>

          <ul className="gg-shop">
            {items.map((it) => (
              <li key={it.kind} className={`gg-item kind-${it.kind}`}>
                <span className="gg-item-icon"><Icon name={it.icon} /></span>
                <div>
                  <h3>{it.name}</h3>
                  <p>{it.effect}</p>
                  {!it.enabled && <p className="reason" id={`reason-${it.kind}`}>{it.reason}</p>}
                </div>
                <Owned value={it.owned} unit={it.unit} />
                <button
                  type="button"
                  className="gg-btn primary"
                  onClick={it.onClick}
                  disabled={!it.enabled}
                  aria-describedby={!it.enabled ? `reason-${it.kind}` : undefined}
                >
                  {it.action}
                </button>
              </li>
            ))}
          </ul>

          <div className="gg-inertia">
            <span className="val">{inertia}</span>
            <h3>Grid inertia</h3>
            <p>
              Hydro generators and industrial loads have large spinning machines. More inertia slows down how fast
              frequency changes when generation and load don't match.
            </p>
          </div>
        </TabPanel>
      ) : (
        <TabPanel idPrefix="assets" tabKey="configure">
          <EmptyState icon={<Icon name="plug" />} title="Asset settings aren't connected yet">
            The price customers pay and other asset settings will show here once the simulation engine sends them.
          </EmptyState>
        </TabPanel>
      )}
    </>
  );
}
