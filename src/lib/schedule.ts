// ── Schedule Mode ───────────────────────────────────────────
// Time-based playlist/collection rotation for gallery installations.

export interface ScheduleSlot {
  id: string;
  /** 24h format "HH:MM" */
  startTime: string;
  /** 24h format "HH:MM" */
  endTime: string;
  /** Playlist ID or collection name to show */
  source: { type: 'playlist'; id: string } | { type: 'collection'; name: string } | { type: 'all' };
  label: string;
}

export interface Schedule {
  enabled: boolean;
  slots: ScheduleSlot[];
}

const STORAGE_KEY = 'distoken:schedule';

export function loadSchedule(wallet: string): Schedule {
  try {
    const key = `${STORAGE_KEY}:${wallet.toLowerCase()}`;
    return JSON.parse(localStorage.getItem(key) ?? '{"enabled":false,"slots":[]}');
  } catch {
    return { enabled: false, slots: [] };
  }
}

export function saveSchedule(wallet: string, schedule: Schedule) {
  const key = `${STORAGE_KEY}:${wallet.toLowerCase()}`;
  localStorage.setItem(key, JSON.stringify(schedule));
}

/** Parse "HH:MM" to minutes since midnight */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Get current active slot based on time of day */
export function getActiveSlot(schedule: Schedule): ScheduleSlot | null {
  if (!schedule.enabled || schedule.slots.length === 0) return null;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const slot of schedule.slots) {
    const start = timeToMinutes(slot.startTime);
    const end = timeToMinutes(slot.endTime);
    // Handle overnight slots (e.g., 22:00 - 06:00)
    if (start <= end) {
      if (currentMinutes >= start && currentMinutes < end) return slot;
    } else {
      if (currentMinutes >= start || currentMinutes < end) return slot;
    }
  }
  return null;
}

export function createSlotId(): string {
  return Math.random().toString(36).substring(2, 8);
}
