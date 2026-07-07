import { supabase, isRemote } from "./supabase";
import type { Identity } from "./identity";

export { isRemote };

export interface ParticipantRow {
  id: string;
  device_id: string;
  name: string;
  distance_m: number;
  /** Encoded avatar state, e.g. "014|m1s0w2o1b1c2|durian_dodger". */
  avatar: string | null;
  lat: number | null;
  lng: number | null;
  updated_at: string;
}

export interface CheckpointRow {
  device_id: string;
  checkpoint_id: string;
  unlocked_at: string;
  via_manual: boolean;
}

export interface Snapshot {
  participants: ParticipantRow[];
  checkpoints: CheckpointRow[];
}

/* --------------------------- Local-only fallback -------------------------- */
const LKEY = "hww.localdb.v2";

function readLocal(): Snapshot {
  try {
    const raw = localStorage.getItem(LKEY);
    if (raw) return JSON.parse(raw) as Snapshot;
  } catch {
    /* ignore */
  }
  return { participants: [], checkpoints: [] };
}

function writeLocal(db: Snapshot) {
  localStorage.setItem(LKEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent("hww-local-change"));
}

/* ------------------------------- Public API ------------------------------ */

/** Case-insensitive uniqueness check, excluding this device's own row so a
 * walker can re-onboard on the same phone without their old name blocking. */
export async function isNameTaken(name: string, deviceId: string): Promise<boolean> {
  const norm = name.trim().toLowerCase();
  if (!norm) return false;
  if (isRemote && supabase) {
    const { data, error } = await supabase
      .from("participants")
      .select("device_id,name")
      .ilike("name", norm);
    if (error) throw error;
    return (data ?? []).some(
      (p) => p.name.trim().toLowerCase() === norm && p.device_id !== deviceId
    );
  }
  const db = readLocal();
  return db.participants.some(
    (p) => p.name.trim().toLowerCase() === norm && p.device_id !== deviceId
  );
}

export async function upsertParticipant(
  id: Identity,
  distanceM: number,
  avatarCode: string,
  coord?: { lat: number; lng: number }
): Promise<void> {
  if (isRemote && supabase) {
    const { error } = await supabase.from("participants").upsert(
      {
        device_id: id.deviceId,
        name: id.name,
        avatar: avatarCode,
        distance_m: Math.round(distanceM),
        // Only touch lat/lng when we actually have a fix, so a distance-only
        // update never wipes a previously reported position.
        ...(coord ? { lat: coord.lat, lng: coord.lng } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "device_id" }
    );
    if (error) throw error;
    return;
  }
  const db = readLocal();
  const existing = db.participants.find((p) => p.device_id === id.deviceId);
  const row: ParticipantRow = {
    id: id.deviceId,
    device_id: id.deviceId,
    name: id.name,
    avatar: avatarCode,
    distance_m: Math.round(distanceM),
    lat: coord ? coord.lat : existing?.lat ?? null,
    lng: coord ? coord.lng : existing?.lng ?? null,
    updated_at: new Date().toISOString(),
  };
  if (existing) Object.assign(existing, row);
  else db.participants.push(row);
  writeLocal(db);
}

export async function unlockCheckpoint(
  deviceId: string,
  checkpointId: string,
  viaManual: boolean
): Promise<void> {
  if (isRemote && supabase) {
    const { error } = await supabase.from("checkpoint_progress").upsert(
      {
        device_id: deviceId,
        checkpoint_id: checkpointId,
        via_manual: viaManual,
        unlocked_at: new Date().toISOString(),
      },
      { onConflict: "device_id,checkpoint_id", ignoreDuplicates: true }
    );
    if (error) throw error;
    return;
  }
  const db = readLocal();
  const exists = db.checkpoints.find(
    (c) => c.device_id === deviceId && c.checkpoint_id === checkpointId
  );
  if (!exists) {
    db.checkpoints.push({
      device_id: deviceId,
      checkpoint_id: checkpointId,
      via_manual: viaManual,
      unlocked_at: new Date().toISOString(),
    });
    writeLocal(db);
  }
}

/** Remove a walker entirely: their participant row and (via the device_id
 * foreign key's ON DELETE CASCADE) all their checkpoint progress. Used by
 * "reset" so the walker vanishes from the leaderboard and map for everyone. */
export async function deleteParticipant(deviceId: string): Promise<void> {
  if (isRemote && supabase) {
    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("device_id", deviceId);
    if (error) throw error;
    return;
  }
  const db = readLocal();
  db.participants = db.participants.filter((p) => p.device_id !== deviceId);
  db.checkpoints = db.checkpoints.filter((c) => c.device_id !== deviceId);
  writeLocal(db);
}

export async function fetchSnapshot(): Promise<Snapshot> {
  if (isRemote && supabase) {
    const [participants, checkpoints] = await Promise.all([
      supabase.from("participants").select(),
      supabase.from("checkpoint_progress").select(),
    ]);
    return {
      participants: (participants.data as ParticipantRow[]) ?? [],
      checkpoints: (checkpoints.data as CheckpointRow[]) ?? [],
    };
  }
  return readLocal();
}

/** Subscribe to changes. Returns an unsubscribe function. */
export function subscribe(onChange: () => void): () => void {
  if (isRemote && supabase) {
    const client = supabase;
    const channel = client
      .channel("hww-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "participants" }, onChange)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkpoint_progress" },
        onChange
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }
  const handler = () => onChange();
  window.addEventListener("hww-local-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("hww-local-change", handler);
    window.removeEventListener("storage", handler);
  };
}

export async function uploadPhoto(
  deviceId: string,
  checkpointId: string,
  file: File
): Promise<string> {
  if (isRemote && supabase) {
    const path = `${deviceId}/${checkpointId}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("photos").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) throw error;
    return path;
  }
  // Local mode: just keep an object URL for preview.
  return URL.createObjectURL(file);
}
