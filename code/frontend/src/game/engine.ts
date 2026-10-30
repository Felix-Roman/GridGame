// =============================================================================
// engine.ts
// The microgrid simulation. Pure TypeScript, no React, so it can be tested and
// tuned on its own. Game.tsx calls stepSim() 10 times a second.
//
// How the pieces fit together each tick:
//
//   generation  = hydro + wind + power bought on the market + battery discharge
//   load        = customers + power sold on the market + battery charging
//   imbalance   = generation - load                              (kW)
//
//   Swing equation (how real grids behave):
//       df/dt = f0 * imbalance / (2 * Ek)
//   Ek is the kinetic energy stored in spinning machines (hydro turbines),
//   in kW·s. More hydro = more Ek = frequency changes more slowly.
//   df/dt is the Rate of Change of Frequency (ROCOF), shown under the gauge.
//
//   Automatic control (the formula in the EE document) is a PID controller
//   that sets the battery dial:
//       u(t) = Kp*e(t) + Ki*∫e dt + Kd*de/dt,   e = 60 Hz - frequency
//   Frequency low -> e positive -> u positive -> battery discharges (adds power).
//
// TIME: frequency moves in real seconds, but energy (kWh) and the time of day
// run on a faster game clock (TIME_SCALE), so a full day fits in ~16 minutes
// and the battery fills/empties on a scale you can actually play.
//
// Every number below is a tuning guess. Change them here; nothing else needs to.
// =============================================================================

import type { PidGains, ResourceState } from './types';

export const SIM = {
  DT: 0.1, // seconds of real time per tick (10 ticks per second)
  SUBSTEPS: 5, // physics steps per tick, for accuracy
  F0: 60, // nominal frequency, Hz
  F_TRIP_LOW: 58,
  F_TRIP_HIGH: 62,

  TIME_SCALE: 90, // 1 real second = 90 game seconds (1.5 game minutes)
  START_HOUR: 11, // the day starts at 11:00 AM (supply ≈ demand then)

  // ---- Generation ----
  HYDRO_KW: 45, // each hydro unit runs at a steady 45 kW
  HYDRO_INERTIA_KWS: 900, // spinning energy per hydro unit (H = 20 s on 45 kVA; high, so humans can react)
  BASE_INERTIA_KWS: 600, // motors in customers' buildings (so Ek is never 0)
  WIND_RATED_KW: 30, // each turbine at full wind
  WIND_MEAN: 0.65, // average wind as a fraction of rated output
  WIND_DRIFT_TAU: 40, // seconds: how slowly the wind's average level wanders
  WIND_DRIFT_STD: 0.16, // how far it wanders (fraction of rated)
  WIND_GUST_TAU: 3, // seconds: fast gusts
  WIND_GUST_STD: 0.04,

  // ---- Load ----
  CUSTOMER_BASE_KW: 400, // average demand per customer at the start
  LOAD_GROWTH_PER_MIN: 0.01, // +1% demand per real minute played
  DAILY_SWING: 0.12, // demand is ±12% over the day...
  PEAK_HOUR: 17, // ...peaking at 5 PM, lowest at 5 AM
  CUSTOMER_NOISE_STD: 0.05, // each customer wanders ±5% on its own
  CUSTOMER_NOISE_TAU: 12, // seconds
  CUSTOMER_RAMP_S: 10, // a new customer's demand ramps in over 10 s (no sudden shock)
  LOAD_DAMPING_PER_HZ: 0.03, // motors draw 3% more per +1 Hz (natural stabilizer)

  // ---- Battery ----
  DIAL_MAX_KW: 1000, // the dial goes -1000..1000 kW
  BATTERY_EFFICIENCY: 0.95, // 95% each way (charging and discharging)
  START_BATTERY_KWH: 500,
  DERIVATIVE_FILTER_S: 0.5, // ROCOF is measured over ~0.5 s, like a real relay

  // ---- Money ----
  INCOME_PER_CUSTOMER: 10, // $ per second per customer
} as const;

// kWh moved by 1 kW for 1 real second (on the game clock).
export const KWH_PER_KW_SECOND = SIM.TIME_SCALE / 3600;

export type TripReason = 'low' | 'high';

export interface SimState {
  t: number; // real seconds since the (re)start
  frequency: number; // Hz
  rocof: number; // filtered df/dt, Hz/s
  battery: number; // stored energy, kWh
  dial: number; // battery power command, kW (+ = discharge, - = charge)
  integral: number; // PID integral term (Hz·s)

  windLevel: number; // slow wind level (fraction of rated)
  gust: number; // fast gusts
  customerNoise: number[]; // one wandering value per customer
  customerAge: number[]; // seconds since each customer connected

  // What happened in the last tick (kW)
  hydroKw: number;
  windKw: number;
  loadKw: number; // customers only
  purchasedKw: number;
  soldKw: number;
  batteryKw: number; // actual battery flow seen by the grid (+ out, - in)
  spilledKw: number; // charging power that couldn't fit in a full battery
  imbalanceKw: number;
  inertiaKws: number;

  // Running totals (kWh)
  deliveredKwh: number; // energy your customers used
  wastedKwh: number; // energy lost because the battery was full
  batteryLossKwh: number; // conversion losses inside the battery

  tripped: TripReason | null;
}

export interface SimInputs {
  resources: ResourceState;
  autoOn: boolean;
  gains: PidGains;
  manualDial: number; // used when automatic control is off
  purchasedKw: number; // from active market contracts you bought
  soldKw: number; // from active market contracts you sold
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Normal (bell-curve) random number with mean 0 and std 1
function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

// Added by AI
// Ornstein–Uhlenbeck step: a value that wanders randomly but is pulled back to
// "mean". tau = how quickly it is pulled back, std = how far it typically wanders
function wander(x: number, mean: number, tau: number, std: number, dt: number, rand: () => number) {
  const sigma = std * Math.sqrt(2 / tau);
  return x + ((mean - x) / tau) * dt + sigma * Math.sqrt(dt) * gaussian(rand);
}

// Game clock
export function hourOfDay(t: number): number {
  return (SIM.START_HOUR + (t * SIM.TIME_SCALE) / 3600) % 24;
}

export function formatTimeOfDay(t: number): string {
  const h = hourOfDay(t);
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  const ampm = hh < 12 ? 'AM' : 'PM';
  return `${((hh + 11) % 12) + 1}:${mm.toString().padStart(2, '0')} ${ampm}`;
}

// Total spinning energy for a set of assets
export function inertiaOf(resources: ResourceState): number {
  return SIM.BASE_INERTIA_KWS + resources.hydroUnits * SIM.HYDRO_INERTIA_KWS;
}

// Demand of one average customer right now
export function customerDemandKw(t: number): number {
  const growth = 1 + SIM.LOAD_GROWTH_PER_MIN * (t / 60);
  const daily = 1 + SIM.DAILY_SWING * Math.cos((2 * Math.PI * (hourOfDay(t) - SIM.PEAK_HOUR)) / 24);
  return SIM.CUSTOMER_BASE_KW * growth * daily;
}

// Price of a market contract
export function contractEnergyKwh(powerKw: number, durationS: number) {
  return powerKw * durationS * KWH_PER_KW_SECOND;
}

export function createSim(): SimState {
  return {
    t: 0,
    frequency: SIM.F0,
    rocof: 0,
    battery: SIM.START_BATTERY_KWH,
    dial: 0,
    integral: 0,
    windLevel: SIM.WIND_MEAN,
    gust: 0,
    customerNoise: [],
    customerAge: [],
    hydroKw: 0,
    windKw: 0,
    loadKw: 0,
    purchasedKw: 0,
    soldKw: 0,
    batteryKw: 0,
    spilledKw: 0,
    imbalanceKw: 0,
    inertiaKws: SIM.BASE_INERTIA_KWS,
    deliveredKwh: 0,
    wastedKwh: 0,
    batteryLossKwh: 0,
    tripped: null,
  };
}

// The PID controller from the EE document. Returns the dial setting in kW
// - Derivative is taken on the measured frequency (filtered ROCOF), not on the
//   error, so changing the setpoint or gains doesn't cause a sudden kick.
// - Anti-windup: the integral stops growing while the dial is pinned at ±1000.
function pidOutput(s: SimState, gains: PidGains, dt: number): number {
  const e = SIM.F0 - s.frequency; // Hz
  const dedt = -s.rocof; // de/dt = -df/dt because the setpoint is constant
  const pd = gains.main * e + gains.rat * dedt;
  const nextIntegral = s.integral + e * dt;
  const u = pd + gains.sum * nextIntegral;
  const saturated = Math.abs(u) > SIM.DIAL_MAX_KW && Math.sign(u) === Math.sign(e);
  if (!saturated) s.integral = nextIntegral;
  return clamp(pd + gains.sum * s.integral, -SIM.DIAL_MAX_KW, SIM.DIAL_MAX_KW);
}

// Advances the simulation by dt seconds, Mutates and returns s
export function stepSim(s: SimState, inp: SimInputs, dt: number = SIM.DT, rand: () => number = Math.random): SimState {
  if (s.tripped) return s;
  const { resources, gains } = inp;

  // Controller, decides the battery command
  if (inp.autoOn) {
    s.dial = pidOutput(s, gains, dt);
  } else {
    s.dial = clamp(inp.manualDial, -SIM.DIAL_MAX_KW, SIM.DIAL_MAX_KW);
    // Keep the integral "tracking" the manual setting, so turning auto back on doesn't jump
    const e = SIM.F0 - s.frequency;
    s.integral = gains.sum !== 0 ? (s.dial - gains.main * e + gains.rat * s.rocof) / gains.sum : 0;
  }

  // Weather and customer behaviour wander randomly
  s.windLevel = clamp(wander(s.windLevel, SIM.WIND_MEAN, SIM.WIND_DRIFT_TAU, SIM.WIND_DRIFT_STD, dt, rand), 0.05, 1);
  s.gust = wander(s.gust, 0, SIM.WIND_GUST_TAU, SIM.WIND_GUST_STD, dt, rand);
  // Customers that already exist when the game starts are fully connected
  const startAge = s.t === 0 ? SIM.CUSTOMER_RAMP_S : 0;
  while (s.customerNoise.length < resources.customerUnits) {
    s.customerNoise.push(0);
    s.customerAge.push(startAge);
  }
  s.customerNoise.length = s.customerAge.length = resources.customerUnits;
  for (let i = 0; i < s.customerNoise.length; i++) {
    s.customerNoise[i] = wander(s.customerNoise[i], 0, SIM.CUSTOMER_NOISE_TAU, SIM.CUSTOMER_NOISE_STD, dt, rand);
    s.customerAge[i] += dt;
  }

  // Generation and load right now in kW
  s.hydroKw = resources.hydroUnits * SIM.HYDRO_KW;
  s.windKw = resources.windUnits * SIM.WIND_RATED_KW * clamp(s.windLevel + s.gust, 0, 1);
  const perCustomer = customerDemandKw(s.t);
  s.loadKw = s.customerNoise.reduce(
    (sum, n, i) => sum + perCustomer * (1 + n) * Math.min(1, s.customerAge[i] / SIM.CUSTOMER_RAMP_S),
    0,
  );
  s.purchasedKw = Math.max(0, inp.purchasedKw);
  s.soldKw = Math.max(0, inp.soldKw);

  // Battery, carry out the dial command within what the battery can do
  const capacity = Math.max(0, resources.storageUnits);
  const k = KWH_PER_KW_SECOND * dt; // kWh per kW this tick
  const eff = SIM.BATTERY_EFFICIENCY;
  s.spilledKw = 0;
  if (s.dial > 0) {
    // Discharging, limited by what's left in the battery
    const maxOut = (s.battery * eff) / k;
    const out = Math.min(s.dial, maxOut);
    s.battery -= (out * k) / eff;
    s.batteryLossKwh += out * k * (1 / eff - 1);
    s.batteryKw = out;
  } else if (s.dial < 0) {
    // Charging, the grid gives up the full amount, whatever doesn't fit is lost
    const wanted = -s.dial;
    const maxIn = Math.max(0, capacity - s.battery) / (k * eff);
    const stored = Math.min(wanted, maxIn);
    s.battery += stored * k * eff;
    s.batteryLossKwh += stored * k * (1 - eff);
    s.spilledKw = wanted - stored;
    s.wastedKwh += s.spilledKw * k;
    s.batteryKw = -wanted;
  } else {
    s.batteryKw = 0;
  }
  s.battery = clamp(s.battery, 0, capacity);

  // Physics like swing equation, integrated in small substeps
  s.inertiaKws = inertiaOf(resources);
  const h = dt / SIM.SUBSTEPS;
  const supply = s.hydroKw + s.windKw + s.purchasedKw + Math.max(0, s.batteryKw);
  const fixedDemand = s.soldKw + Math.max(0, -s.batteryKw);
  let dfdt = 0;
  for (let i = 0; i < SIM.SUBSTEPS; i++) {
    const motorLoad = s.loadKw * (1 + SIM.LOAD_DAMPING_PER_HZ * (s.frequency - SIM.F0));
    s.imbalanceKw = supply - motorLoad - fixedDemand;
    dfdt = (SIM.F0 * s.imbalanceKw) / (2 * s.inertiaKws);
    s.frequency += dfdt * h;
  }
  // ROCOF as a relay would measure it
  s.rocof += (dfdt - s.rocof) * Math.min(1, dt / SIM.DERIVATIVE_FILTER_S);

  // Accounting, lol
  s.deliveredKwh += s.loadKw * k;
  s.t += dt;

  // Protection relays: outside 58–62 Hz the grid trips.
  if (s.frequency < SIM.F_TRIP_LOW) s.tripped = 'low';
  else if (s.frequency > SIM.F_TRIP_HIGH) s.tripped = 'high';
  return s;
}
