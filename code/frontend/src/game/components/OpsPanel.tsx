import { useState } from 'react';
import type { ResourceState } from '../types';
import Icon from './Icon';
import Tabs, { EmptyState, TabPanel, type TabDef } from './Tabs';
import OverviewTab from './tabs/OverviewTab';
import GenLoadTab from './tabs/GenLoadTab';
import MarketTab from './tabs/MarketTab';
import AssetsTab from './tabs/AssetsTab';

// Operations panel (replaces RightPanel). One row of tabs; Market and
// Assets each have a single segmented switch inside.

type TabKey = 'overview' | 'genload' | 'security' | 'market' | 'assets';

const tabs: TabDef<TabKey>[] = [
  { key: 'overview', label: 'Overview', icon: <Icon name="overview" /> },
  { key: 'genload', label: 'Generation & load', icon: <Icon name="chart" /> },
  { key: 'security', label: 'Security', icon: <Icon name="shield" /> },
  { key: 'market', label: 'Market', icon: <Icon name="market" /> },
  { key: 'assets', label: 'Assets', icon: <Icon name="assets" /> },
];

type Props = {
  score: number;
  resources: ResourceState;
  incomePerSecond: number;
  onBuyStorage: () => void;
  onBuyWind: () => void;
  onBuyHydro: () => void;
  onAddCustomer: () => void;
};

export default function OpsPanel(props: Props) {
  const [active, setActive] = useState<TabKey>('assets');

  return (
    <section className="gg-panel gg-ops" aria-label="Operations">
      <Tabs<TabKey> tabs={tabs} active={active} onChange={setActive} label="Operations" idPrefix="ops" />
      <TabPanel idPrefix="ops" tabKey={active} className="gg-tabpanel">
        {active === 'overview' && <OverviewTab resources={props.resources} incomePerSecond={props.incomePerSecond} />}
        {active === 'genload' && <GenLoadTab />}
        {active === 'security' && (
          <>
            <div className="gg-tabpanel-head"><h2>Security</h2></div>
            <EmptyState icon={<Icon name="shield" />} title="No threats detected">
              Grid vulnerability tracking and threat logs will appear here once the engine reports them.
            </EmptyState>
          </>
        )}
        {active === 'market' && <MarketTab />}
        {active === 'assets' && (
          <AssetsTab
            score={props.score}
            resources={props.resources}
            onBuyStorage={props.onBuyStorage}
            onBuyWind={props.onBuyWind}
            onBuyHydro={props.onBuyHydro}
            onAddCustomer={props.onAddCustomer}
          />
        )}
      </TabPanel>
    </section>
  );
}
