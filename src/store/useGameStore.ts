import { create } from "zustand";
import type { Identity } from "../lib/identity";
import type { GeoFix } from "../lib/geo";
import {
  AvatarState,
  Dim,
  newAvatarState,
  applyAnswer,
  awardBackground,
  encodeAvatar,
} from "../lib/avatar";
import { upsertParticipant, unlockCheckpoint } from "../lib/backend";

export type GpsStatus = "idle" | "requesting" | "tracking" | "denied" | "unavailable";

interface PersistShape {
  distance: number;
  avatar: AvatarState | null;
  /** checkpointId -> question id answered there (prevents re-answering). */
  answered: Record<string, string>;
}

const PKEY = "hww.progress.v2";

function loadProgress(): PersistShape {
  try {
    const raw = localStorage.getItem(PKEY);
    if (raw) return JSON.parse(raw) as PersistShape;
  } catch {
    /* ignore */
  }
  return { distance: 0, avatar: null, answered: {} };
}

function saveProgress(p: PersistShape) {
  localStorage.setItem(PKEY, JSON.stringify(p));
}

interface GameState {
  identity: Identity | null;
  distance: number;
  avatar: AvatarState | null;
  answered: Record<string, string>;
  lastFix: GeoFix | null;
  gpsStatus: GpsStatus;
  accuracy: number | null;

  setIdentity: (id: Identity | null) => void;
  setGpsStatus: (s: GpsStatus) => void;
  addDistance: (metres: number, fix: GeoFix) => void;
  /** Answer a reflection question at a checkpoint. Evolves the avatar and
   * syncs the new look to everyone. */
  answerReflection: (checkpointId: string, questionId: string, dim: Dim, delta: number) => void;
  earnBackground: (key: string) => void;
  unlock: (checkpointId: string, viaManual: boolean) => void;
  resetProgress: () => void;
}

// Throttle backend writes (distance + live position) so we stay light on the
// Supabase free tier and on battery — at most one sync per this interval.
const SYNC_INTERVAL_MS = 6000;
let lastSyncAt = 0;

function persist(get: () => GameState) {
  const { distance, avatar, answered } = get();
  saveProgress({ distance, avatar, answered });
}

/** Immediate (un-throttled) sync — used when the avatar visibly changes so the
 * map and leaderboard update for everyone right away. */
function syncNow(get: () => GameState, coord?: { lat: number; lng: number }) {
  const { identity, distance, avatar } = get();
  if (!identity || !avatar) return;
  lastSyncAt = Date.now();
  void upsertParticipant(identity, distance, encodeAvatar(avatar), coord);
}

export const useGameStore = create<GameState>((set, get) => {
  const initial = loadProgress();
  return {
    identity: null,
    distance: initial.distance,
    avatar: initial.avatar,
    answered: initial.answered,
    lastFix: null,
    gpsStatus: "idle",
    accuracy: null,

    setIdentity: (id) => {
      // First onboarding on this device: seed the avatar from the picked base.
      const current = get().avatar;
      if (id && (!current || current.baseId !== id.baseId)) {
        set({ identity: id, avatar: newAvatarState(id.baseId) });
      } else {
        set({ identity: id });
      }
      persist(get);
    },

    setGpsStatus: (s) => set({ gpsStatus: s }),

    addDistance: (metres, fix) => {
      const { distance, identity, avatar } = get();
      const newDistance = distance + metres;
      set({ distance: newDistance, lastFix: fix, accuracy: fix.accuracy });
      persist(get);

      if (identity && avatar) {
        const now = Date.now();
        if (now - lastSyncAt >= SYNC_INTERVAL_MS) {
          lastSyncAt = now;
          void upsertParticipant(identity, newDistance, encodeAvatar(avatar), fix.coord);
        }
      }
    },

    answerReflection: (checkpointId, questionId, dim, delta) => {
      const { avatar, answered } = get();
      if (!avatar || answered[checkpointId]) return;
      applyAnswer(avatar, dim, delta);
      set({ avatar: { ...avatar }, answered: { ...answered, [checkpointId]: questionId } });
      persist(get);
      syncNow(get, get().lastFix?.coord);
    },

    earnBackground: (key) => {
      const { avatar } = get();
      if (!avatar || avatar.background === key) return;
      awardBackground(avatar, key);
      set({ avatar: { ...avatar } });
      persist(get);
      syncNow(get, get().lastFix?.coord);
    },

    unlock: (checkpointId, viaManual) => {
      const { identity } = get();
      if (!identity) return;
      void unlockCheckpoint(identity.deviceId, checkpointId, viaManual);
    },

    resetProgress: () => {
      saveProgress({ distance: 0, avatar: null, answered: {} });
      set({ distance: 0, avatar: null, answered: {} });
    },
  };
});

if (import.meta.env.DEV) {
  (window as unknown as { __hww: typeof useGameStore }).__hww = useGameStore;
}
