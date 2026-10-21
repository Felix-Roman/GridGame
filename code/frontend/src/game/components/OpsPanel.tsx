// OpsPanel.tsx
// The Operations panel on the right, 
// One row of five tabs: Overview, Generation & load, Security, Market, Assets, Market
// and Assets each have a single pill switch inside, instead of the old three
// stacked rows of tabs, Only the content under the tabs scrolls.

// useState remembers which tab is open
import { useState } from 'react';
// The TypeScript type for the player's owned assets
import type { ResourceState } from '../types';
// The icon component
import Icon from './Icon';
// The tab row, the panel wrapper, the empty state block, and the tab definition type
import Tabs, { EmptyState, TabPanel, type TabDef } from './Tabs';
// The content for each tab, each in its own file under ./tabs/
import OverviewTab from './tabs/OverviewTab';
import GenLoadTab from './tabs/GenLoadTab';
import MarketTab from './tabs/MarketTab';
import AssetsTab from './tabs/AssetsTab';

// The five allowed tab keys, Using a type means a typo like asset is a compile error
type TabKey = 'overview' | 'genload' | 'security' | 'market' | 'assets';

// The tab row, in display order, key, visible label, icon
const tabs: TabDef<TabKey>[] = [
  { key: 'overview', label: 'Overview', icon: <Icon name="overview" /> },          // summary tiles
  { key: 'genload', label: 'Generation & load', icon: <Icon name="chart" /> },     // charts
  { key: 'security', label: 'Security', icon: <Icon name="shield" /> },            // threats (not built yet)
  { key: 'market', label: 'Market', icon: <Icon name="market" /> },                // contracts + demand response
  { key: 'assets', label: 'Assets', icon: <Icon name="assets" /> },                // the shop
];

// The props the inputs that this component accepts, Most are passed straight through to AssetsTab
type Props = {
  score: number;                           // available funds
  resources: ResourceState;                // owned assets
  incomePerSecond: number;                 // for the Overview tab
  onBuyStorage: () => void;                // shop button handlers, from Game.tsx
  onBuyWind: () => void;
  onBuyHydro: () => void;
  onAddCustomer: () => void;
};

// The component, props keeps all inputs together so they can be passed along as props.score etc
export default function OpsPanel(props: Props) {
  // Which tab is open, Starts on Assets, since buying is the most common action
  const [active, setActive] = useState<TabKey>('assets');

  // Draws the panel
  return (
    // The panel,
    <section className="gg-panel gg-ops" aria-label="Operations">
      {/* The tab row, Clicking a tab calls setActive with its key */}
      <Tabs<TabKey> tabs={tabs} active={active} onChange={setActive} label="Operations" idPrefix="ops" />
      {/* The scrolling content area for whichever tab is open */}
      <TabPanel idPrefix="ops" tabKey={active} className="gg-tabpanel">
        {/* Only the open tab's content is drawn, a & b draws b only when a is true */}
        {active === 'overview' && <OverviewTab resources={props.resources} incomePerSecond={props.incomePerSecond} />}
        {/* Generation & load charts */}
        {active === 'genload' && <GenLoadTab />}
        {/* Security has no file of its own yet, just a heading and an empty state */}
        {active === 'security' && (
          // Fragment, groups the heading and empty state
          <>
            {/* Tab heading */}
            <div className="gg-tabpanel-head"><h2>Security</h2></div>
            {/* Placeholder message until the engine reports threats */}
            <EmptyState icon={<Icon name="shield" />} title="No threats detected">
              Grid vulnerability tracking and threat logs will appear here once the engine reports them.
            </EmptyState>
          </>
        )}
        {/* Market, contracts and demand response */}
        {active === 'market' && <MarketTab />}
        {/* Assets, the shop, Funds, owned counts and buy handlers are passed through from Game.tsx, */}
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
