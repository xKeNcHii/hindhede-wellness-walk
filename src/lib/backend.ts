import { supabase, isRemote } from "./supabase";
import type { Identity } from "./identity";

export { isRemote };

export interface TeamRow {
  id: string;
  name: string;
  join_code: string;
}

export interface ParticipantRow {
  id: string;
  team_id: string;
  device_id: string;
  name: string;
  distance_m: number;
  updated_at: string;
}

export interface CheckpointRow {
  team_id: string;
  checkpoint_id: string;
  unlocked_at: string;
  via_manual: boolean;
}

export interface Snapshot {
  teams: TeamRow[];
  participants: ParticipantRow[];
  checkpoints: CheckpointRow[];
}

/* --------------------------- Local-only fallback -------------------------- */
const LKEY = "hww.localdb.v1";

function readLocal(): Snapshot {
  try {
    const raw = localStorage.getItem(LKEY);
    if (raw) return JSON.parse(raw) as Snapshot;
  } catch {
    /* ignore */
  }
  return { teams: [], participants: [], checkpoints: [] };
}

function writeLocal(db: Snapshot) {
  localStorage.setItem(LKEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent("hww-local-change"));
}

/* ------------------------------- Public API ------------------------------ */

export async function createTeam(name: string, code: string): Promise<TeamRow> {
  if (isRemote && supabase) {
    const { data, error } = await supabase
      .from("teams")
      .insert({ name, join_code: code })
      .select()
      .single();
    if (error) throw error;
    return data as TeamRow;
  }
  const db = readLocal();
  const team: TeamRow = { id: code, name, join_code: code };
  db.teams.push(team);
  writeLocal(db);
  return team;
}

export async function findTeamByCode(code: string): Promise<TeamRow | null> {
  const norm = code.trim().toUpperCase();
  if (isRemote && supabase) {
    const { data, error } = await supabase
      .from("teams")
      .select()
      .eq("join_code", norm)
      .maybeSingle();
    if (error) throw error;
    return (data as TeamRow) ?? null;
  }
  const db = readLocal();
  return db.teams.find((t) => t.join_code === norm) ?? null;
}

export async function upsertParticipant(id: Identity, distanceM: number): Promise<void> {
  if (isRemote && supabase) {
    const { error } = await supabase.from("participants").upsert(
      {
        device_id: id.deviceId,
        team_id: id.teamId,
        name: id.name,
        distance_m: Math.round(distanceM),
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
    team_id: id.teamId,
    device_id: id.deviceId,
    name: id.name,
    distance_m: Math.round(distanceM),
    updated_at: new Date().toISOString(),
  };
  if (existing) Object.assign(existing, row);
  else db.participants.push(row);
  writeLocal(db);
}

export async function unlockCheckpoint(
  teamId: string,
  checkpointId: string,
  viaManual: boolean
): Promise<void> {
  if (isRemote && supabase) {
    const { error } = await supabase.from("checkpoint_progress").upsert(
      {
        team_id: teamId,
        checkpoint_id: checkpointId,
        via_manual: viaManual,
        unlocked_at: new Date().toISOString(),
      },
      { onConflict: "team_id,checkpoint_id", ignoreDuplicates: true }
    );
    if (error) throw error;
    return;
  }
  const db = readLocal();
  const exists = db.checkpoints.find(
    (c) => c.team_id === teamId && c.checkpoint_id === checkpointId
  );
  if (!exists) {
    db.checkpoints.push({
      team_id: teamId,
      checkpoint_id: checkpointId,
      via_manual: viaManual,
      unlocked_at: new Date().toISOString(),
    });
    writeLocal(db);
  }
}

export async function fetchSnapshot(): Promise<Snapshot> {
  if (isRemote && supabase) {
    const [teams, participants, checkpoints] = await Promise.all([
      supabase.from("teams").select(),
      supabase.from("participants").select(),
      supabase.from("checkpoint_progress").select(),
    ]);
    return {
      teams: (teams.data as TeamRow[]) ?? [],
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
      .on("postgres_changes", { event: "*", schema: "public", table: "checkpoint_progress" }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, onChange)
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
  teamId: string,
  checkpointId: string,
  file: File
): Promise<string> {
  if (isRemote && supabase) {
    const path = `${teamId}/${checkpointId}-${Date.now()}.jpg`;
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
