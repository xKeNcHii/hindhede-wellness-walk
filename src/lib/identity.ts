const KEY = "hww.identity.v2";

export interface Identity {
  deviceId: string;
  /** Unique walker name (checked against other participants at onboarding). */
  name: string;
  /** Which of the 52 pixel bases this walker picked, e.g. "base_014". */
  baseId: string;
}

function uuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Identity;
    // v1 identities (team era) lack baseId — treat as not onboarded.
    if (!parsed.baseId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveIdentity(id: Identity): void {
  localStorage.setItem(KEY, JSON.stringify(id));
}

export function clearIdentity(): void {
  localStorage.removeItem(KEY);
}

export function newDeviceId(): string {
  return uuid();
}
