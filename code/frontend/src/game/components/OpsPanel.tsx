// =============================================================================
// OpsPanel.tsx
//
// The Operations panel on the right, this replaces the old RightPanel 
// One row of five tabs: Overview, Generation & load, Security, Market, Assets.
// Market and Assets each have a single pill switch inside, instead of the old three tacked rows of tabs.
// Only the content under the tabs scrolls
// =============================================================================

import { useState } from 'react';
import type { Contract, ResourceState } from '../types';
// Live simulation values and chart history
import type { HistoryPoint, SimSnapshot } from '../useGridSim';
// The icon component
import Icon from './Icon';
// The tab row, the panel wrapper, the empty-state block, and the tab definition type
import Tabs, { EmptyState, TabPanel, type TabDef } from './Tabs';
import OverviewTab from './tabs/OverviewTab';
import GenLoadTab from './tabs/GenLoadTab';
import MarketTab from './tabs/MarketTab';
import AssetsTab from './tabs/AssetsTab';

// The five allowed tab keys, Using a type means a typo like 'asset' is a compile error
type TabKey = 'overview' | 'genload' | 'security' | 'market' | 'assets';

// The tab row, in display order
const tabs: TabDef<TabKey>[] = [
  { key: 'overview', label: 'Overview', icon: <Icon name="overview" /> },
  { key: 'genload', label: 'Generation & load', icon: <Icon name="chart" /> },
  { key: 'security', label: 'Security', icon: <Icon name="shield" /> },
  { key: 'market', label: 'Market', icon: <Icon name="market" /> },
  { key: 'assets', label: 'Assets', icon: <Icon name="assets" /> },
];

// inputs this component accepts, Most are passed straight through to AssetsTab
type Props = {
  score: number;
  resources: ResourceState; 
  incomePerSecond: number;
  onBuyStorage: () => void;
  onBuyWind: () => void;
  onBuyHydro: () => void;
  onAddCustomer: () => void;
  sim: SimSnapshot;
  history: HistoryPoint[];
  contracts: Contract[];
  myName: string;
  serverOffsetMs: number;
  onOffer: (o: { powerKw: number; durationS: number; pricePerKwh: number }) => Promise<string | null>;
  onAccept: (id: string) => Promise<string | null>;
  onCancel: (id: string) => void;
};

// The component. "props" keeps all inputs together so they can be passed along as props.score etc.
export default function OpsPanel(props: Props) {
  // Which tab is open. Starts on Assets, since buying is the most common action.
  const [active, setActive] = useState<TabKey>('assets');

  // Draws the panel.
  return (
    // The panel. aria-label names it for screen readers.
    <section className="gg-panel gg-ops" aria-label="Operations">
      {/* The tab row. Clicking a tab calls setActive with its key. */}
      <Tabs<TabKey> tabs={tabs} active={active} onChange={setActive} label="Operations" idPrefix="ops" />
      {/* The scrolling content area for whichever tab is open. */}
      <TabPanel idPrefix="ops" tabKey={active} className="gg-tabpanel">
        {/* Only the open tab's content is drawn. "a && b" draws b only when a is true. */}
        {active === 'overview' && <OverviewTab resources={props.resources} incomePerSecond={props.incomePerSecond} sim={props.sim} />}
        {/* Generation & load charts */}
        {active === 'genload' && <GenLoadTab history={props.history} />}
        {/* Security has no file of its own yet, just a heading and an empty state */}
        {active === 'security' && (
          <>
            {/* Tab heading. */}
            <div className="gg-tabpanel-head"><h2>Security</h2></div>
            {/* Placeholder message until the engine reports threats */}
            <EmptyState icon={<Icon name="shield" />} title="No threats detected">
              Grid vulnerability tracking and threat logs will appear here once the engine reports them.
            </EmptyState>
          </>
        )}
        {/* Market that shows contracts and demand response */}
        {active === 'market' && (
          <MarketTab
            contracts={props.contracts}
            myName={props.myName}
            score={props.score}
            serverOffsetMs={props.serverOffsetMs}
            onOffer={props.onOffer}
            onAccept={props.onAccept}
            onCancel={props.onCancel}
          />
        )}
        {/* the shop, Funds, owned counts and buy handlers are passed through from Game.tsx. */}
        {active === 'assets' && (
          // The Assets tab
          <AssetsTab
            // Available funds
            score={props.score}
            // Owned counts
            resources={props.resources}
            // Storage buy button
            onBuyStorage={props.onBuyStorage}
            // Wind buy button
            onBuyWind={props.onBuyWind}
            // Hydro buy button
            onBuyHydro={props.onBuyHydro}
            // Add customer button
            onAddCustomer={props.onAddCustomer}
          />
        )}
      </TabPanel>
    </section>
  );
}
