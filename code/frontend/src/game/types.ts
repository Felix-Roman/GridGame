// Shared game types. These match the PlayerState shape in backend/src/server.ts,
// so the socket payloads are unchanged by the GUI rewrite.

export type PidGains = {
  main: number; // Kp, proportional gain
  sum: number;  // Ki, integral gain
  rat: number;  // Kd, derivative gain
};

export type PlayerData = {
  id: string;
  username: string;
  score: number;
  timeSeconds: number;
  battery: number;
  frequency: number;
  pid: PidGains;
};

export interface ControlState {
  score: number;
  timeSeconds: number;
  battery: number;
  frequency: number;
  pid: PidGains;
}

export interface ResourceState {
  storageUnits: number;  // battery capacity
  windUnits: number;
  hydroUnits: number;
  customerUnits: number;
}

// Frequency limits from the EE document: below 58 Hz or above 62 Hz trips the grid.
export const FREQ_SETPOINT = 60;
export const FREQ_MIN = 58;
export const FREQ_MAX = 62;

export type FreqStatus = 'stable' | 'drifting' | 'critical';

export function frequencyStatus(hz: number): FreqStatus {
  const off = Math.abs(hz - FREQ_SETPOINT);
  if (off < 0.5) return 'stable';
  if (off < 1.5) return 'drifting';
  return 'critical';
}

export const statusLabel: Record<FreqStatus, string> = {
  stable: 'Stable',
  drifting: 'Drifting',
  critical: 'Near trip limit',
};

export function formatClock(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${h}:${pad(m)}:${pad(s)}`;
}

export function formatMoney(n: number) {
  return '$' + Math.floor(n).toLocaleString('en-US');
}