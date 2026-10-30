// =============================================================================
// useGridSim.ts
// A React hook that runs the simulation (engine.ts) 10 times a second and hands
// Game.tsx a fresh snapshot to draw. It also keeps a 3-minute history (one
// point per second) for the Generation & load charts.
// =============================================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { createSim, stepSim, SIM, type SimInputs, type SimState } from './engine';

// One point on the charts.
export interface HistoryPoint {
  t: number;
  hydroKw: number;
  windKw: number;
  purchasedKw: number;
  batteryOutKw: number;
  loadKw: number;
  soldKw: number;
  batteryInKw: number;
  frequency: number;
  rocof: number;
  battery: number;
}

const HISTORY_POINTS = 180; // 3 minutes at 1 point per second
const MAX_CATCH_UP_S = 2; // after the tab was in the background, simulate at most 2 s at once

// A plain copy of the state for drawing as React needs a new object to redraw
export type SimSnapshot = Omit<SimState, 'customerNoise' | 'customerAge'>;
const snapshot = ({ customerNoise: _n, customerAge: _a, ...rest }: SimState): SimSnapshot => rest;

export function useGridSim(running: boolean, inputs: SimInputs) {
  const simRef = useRef<SimState>(createSim());
  const inputsRef = useRef(inputs);
  const historyRef = useRef<HistoryPoint[]>([]);
  const nextSampleRef = useRef(1); // sim time of the next chart point
  const [snap, setSnap] = useState<SimSnapshot>(() => snapshot(simRef.current));
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  // Always use the latest inputs without restarting the timer
  useEffect(() => {
    inputsRef.current = inputs;
  });

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let carry = 0; // leftover time smaller than one tick
    const id = setInterval(() => {
      const now = performance.now();
      // Use the real elapsed time, so the game runs at the right speed even if the browser delays timers
      carry += Math.min(MAX_CATCH_UP_S, (now - last) / 1000);
      last = now;
      const s = simRef.current;
      while (carry >= SIM.DT && !s.tripped) {
        stepSim(s, inputsRef.current, SIM.DT);
        carry -= SIM.DT;
        if (s.t >= nextSampleRef.current) {
          nextSampleRef.current += 1;
          historyRef.current.push({
            t: s.t,
            hydroKw: s.hydroKw,
            windKw: s.windKw,
            purchasedKw: s.purchasedKw,
            batteryOutKw: Math.max(0, s.batteryKw),
            loadKw: s.loadKw,
            soldKw: s.soldKw,
            batteryInKw: Math.max(0, -s.batteryKw),
            frequency: s.frequency,
            rocof: s.rocof,
            battery: s.battery,
          });
          if (historyRef.current.length > HISTORY_POINTS) historyRef.current.shift();
          setHistory([...historyRef.current]);
        }
      }
      setSnap(snapshot(s));
    }, SIM.DT * 1000);
    return () => clearInterval(id);
  }, [running]);

  // Start over from the beginning (used by "Restart" after a trip)
  const reset = useCallback(() => {
    simRef.current = createSim();
    historyRef.current = [];
    nextSampleRef.current = 1;
    setHistory([]);
    setSnap(snapshot(simRef.current));
  }, []);

  return { sim: snap, history, reset };
}
