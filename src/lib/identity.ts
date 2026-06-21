const KEY = "hww.identity.v1";

export interface Identity {
  deviceId: string;
  name: string;
  teamId: string;
  teamName: string;
}

function uuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Identity) : null;
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

/** Short, human-friendly team join code, e.g. "FOX-274". */
export function makeJoinCode(name: string): string {
  const slug = name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "TEAM";
  const num = Math.floor(100 + Math.random() * 900);
  return `${slug}-${num}`;
}
