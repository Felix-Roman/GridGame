// =============================================================================
// OverviewTab.tsx
// what a user owns, and live numbers from the simulation, including how much energy has been lost to a full battery
//
// Two grids of small "tiles", each a label and a value:
// "Your grid" is what a user owns
// "Live" is what the simulation is doing right now which should changes 10x a second
// Like the other tabs, it only draws. 
// Its inputs come from Game.tsx through OpsPanel.tsx, and "sim" is a fresh snapshot of the simulation every tick
// =============================================================================

import { formatMoney, type ResourceState } from '../../types';
import { formatTimeOfDay, inertiaOf } from '../../engine';
import type { SimSnapshot } from '../../useGridSim';

// The props: what you own, your income per second, and the latest simulation snapshot
type Props = { resources: ResourceState; incomePerSecond: number; sim: SimSnapshot };

// Two tiny formatting helpers round to a whole number, add thousands commas, add the unit
const kw = (v: number) => `${Math.round(v).toLocaleString('en-US')} kW`;
const kwh = (v: number) => `${Math.round(v).toLocaleString('en-US')} kWh`;

// The tab
export default function OverviewTab({ resources, incomePerSecond, sim }: Props) {
  // Each tile is a { label, value } object; the drawing code below loops over the list
  const owned = [
    { label: 'Wind turbines', value: resources.windUnits },
    { label: 'Hydro generators', value: resources.hydroUnits },
    { label: 'Customers', value: resources.customerUnits },
    { label: 'Battery capacity', value: kwh(resources.storageUnits) },
    { label: 'Grid inertia', value: `${inertiaOf(resources).toLocaleString('en-US')} kW·s` },
    { label: 'Income', value: `${formatMoney(incomePerSecond)}/s` },
  ];

  // Power coming in: hydro + wind + power bought on the market
  const generation = sim.hydroKw + sim.windKw + sim.purchasedKw;

  // Power going out: your customers + power sold on the market
  const load = sim.loadKw + sim.soldKw;

  // Positive = more coming in than going out a surplus the battery could store
  // negative = a shortfall the battery has to cover, or the frequency drops
  const net = generation - load;

  // Live tiles from the simulation. "tone" colors a value being ok or warn
  // The type says each tile has a label and value, plus an optional tone 'ok' green or 'warn' orange
  const live: { label: string; value: string; tone?: 'ok' | 'warn'; hint?: string }[] = [
    // Everything coming in
    { label: 'Total generation', value: kw(generation), hint: 'Hydro + wind + power you bought' },
    // Everything going out
    { label: 'Total load', value: kw(load), hint: 'Your customers + power you sold' },
    // One tile that changes its own label: "Surplus" when net is 0 or more, "Shortfall" when it's negative
    {
      label: net >= 0 ? 'Surplus' : 'Shortfall',
      // Math.abs removes the minus sign, since the label already says which way it is
      value: kw(Math.abs(net)),
      // Green when within 50 kW of balanced, orange when further off
      tone: Math.abs(net) < 50 ? 'ok' : 'warn',
      hint: 'Generation minus load, before the battery',
    },
    // What the battery is doing
    // sim.batteryKw is positive when supplying the grid and negative when charging
    {
      label: 'Battery',
      value: sim.batteryKw > 0.5 ? `−${kw(sim.batteryKw)}` : sim.batteryKw < -0.5 ? `+${kw(-sim.batteryKw)}` : 'Idle',
      hint: '+ charging, − supplying the grid',
    },
    // Running total of energy your customers have used since the game started
    { label: 'Energy delivered', value: kwh(sim.deliveredKwh), hint: 'Total energy your customers have used' },
    // Running total of energy lost because the battery was full
    {
      label: 'Energy lost',
      value: kwh(sim.wastedKwh),
      // Orange only WHILE energy is actively being lost right now
      // undefined = no color the rest of the time
      tone: sim.spilledKw > 0.5 ? 'warn' : undefined,
      hint: 'Charging power that couldn’t fit because the battery was full',
    },
    // Energy lost inside the battery itself, it's 95% efficient, so 5% is lost going in and 5% coming out
    { label: 'Battery losses', value: kwh(sim.batteryLossKwh), hint: 'Charging/discharging is 95% efficient each way' },
    // The game clock, 1 real second = 1.5 game minutes
    { label: 'Time of day', value: formatTimeOfDay(sim.t), hint: 'Demand peaks around 5 PM and is lowest around 5 AM' },
  ];

  // Draws the tab
  return (
    <>
      <div className="gg-tabpanel-head"><h2>Overview</h2></div>
      <h3 className="gg-section-title">Your grid</h3>
      <div className="gg-tiles">
        {owned.map((t) => (
          <div className="gg-tile" key={t.label}><span>{t.label}</span><strong>{t.value}</strong></div>
        ))}
      </div>
      <h3 className="gg-section-title">Live</h3>
      <div className="gg-tiles">
        {live.map((t) => (
          <div className={`gg-tile${t.tone ? ` tone-${t.tone}` : ''}`} key={t.label} title={t.hint}>
            <span>{t.label}</span>
            <strong>{t.value}</strong>
          </div>
        ))}
      </div>
    </>
  );
}