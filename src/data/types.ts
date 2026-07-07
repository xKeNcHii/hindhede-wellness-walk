import checkpointsJson from "./checkpoints.json";

export type CheckpointType = "standard" | "swing" | "photo";

export interface Checkpoint {
  id: string;
  order: number;
  name: string;
  sprite: string;
  lat: number;
  lng: number;
  radius: number;
  /** Hand-placed pin position on park-map.png, as 0..1 fractions. */
  img?: { x: number; y: number };
  type: CheckpointType;
  /** A hidden bonus checkpoint: shown as a mysterious "dungeon gate" on the
   * map until the walker physically reaches it (no number, no reflection). */
  secret?: boolean;
  /** This checkpoint's icon stays masked ("?") until the given checkpoint id is
   * unlocked, then it reveals. Used to keep the main-park stops secret until the
   * walker reaches the Entrance. */
  revealAfter?: string;
  /** Explicitly pins one reflection question (by its id in reflection.ts) to
   * this checkpoint. Lets the six questions be scattered intentionally rather
   * than by array position, so reordering/swapping placeholder checkpoints
   * doesn't shuffle the questions. Falls back to positional mapping when unset. */
  questionId?: string;
  /** Keep this checkpoint locked until every earlier non-secret checkpoint has
   * been unlocked. Used for the return-leg stop that must come last, so a walker
   * passing near it early (e.g. on the way out) can't unlock it ahead of time. */
  unlockLast?: boolean;
  wellness: { title: string; body: string };
  /** Optional — a checkpoint may have no team activity. */
  activity?: { title: string; body: string };
}

export const CHECKPOINTS = (checkpointsJson as Checkpoint[]).sort(
  (a, b) => a.order - b.order
);

export function checkpointById(id: string): Checkpoint | undefined {
  return CHECKPOINTS.find((c) => c.id === id);
}

/** Whether `c` is allowed to unlock yet. Always true unless it's an
 * `unlockLast` stop and some earlier non-secret checkpoint is still locked. */
export function canUnlockCheckpoint(
  c: Checkpoint,
  unlockedIds: Set<string>
): boolean {
  if (!c.unlockLast) return true;
  return CHECKPOINTS.every(
    (o) => o.secret || o.order >= c.order || unlockedIds.has(o.id)
  );
}

/** Player-dot calibration: anchor real GPS to the map image corners (0..1).
 * The NParks map is schematic (not to scale), so the dot is approximate.
 * Tune these two corner coords after a recce to improve dot placement. */
export const MAP_ANCHORS = {
  topLeft: { lat: 1.3513, lng: 103.7743 }, // image (0,0) = north-west corner
  bottomRight: { lat: 1.3472, lng: 103.7795 }, // image (1,1) = south-east corner
};

/** Project a GPS coord into 0..1 canvas fractions, clamped to the map bounds. */
export function projectToMap(coord: { lat: number; lng: number }): {
  x: number;
  y: number;
} {
  const { topLeft, bottomRight } = MAP_ANCHORS;
  const x = (coord.lng - topLeft.lng) / (bottomRight.lng - topLeft.lng);
  const y = (topLeft.lat - coord.lat) / (topLeft.lat - bottomRight.lat);
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return { x: clamp(x), y: clamp(y) };
}
