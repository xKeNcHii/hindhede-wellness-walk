import { create } from "zustand";
import type { Identity } from "../lib/identity";
import type { GeoFix } from "../lib/geo";
import { METRES_PER_EGG, creatureForHatchIndex, Creature } from "../data/creatures";
import { upsertParticipant, unlockCheckpoint } from "../lib/backend";

export type GpsStatus = "idle" | "requesting" | "tracking" | "denied" | "unavailable";

interface HatchedEgg {
  creatureId: string;
  index: number;
  at: number;
}

interface PersistShape {
  distance: number;
  hatched: HatchedEgg[];
}

const PKEY = "hww.progress.v1";

function loadProgress(): PersistShape {
  try {
    const raw = localStorage.getItem(PKEY);
    if (raw) return JSON.parse(raw) as PersistShape;
  } catch {
    /* ignore */
  }
  return { distance: 0, hatched: [] };
}

function saveProgress(p: PersistShape) {
  localStorage.setItem(PKEY, JSON.stringify(p));
}

interface GameState {
  identity: Identity | null;
  distance: number;
  hatched: HatchedEgg[];
  pendingHatch: Creature | null;
  lastFix: GeoFix | null;
  gpsStatus: GpsStatus;
  accuracy: number | null;

  setIdentity: (id: Identity | null) => void;
  setGpsStatus: (s: GpsStatus) => void;
  addDistance: (metres: number, fix: GeoFix) => void;
  clearPendingHatch: () => void;
  unlock: (checkpointId: string, viaManual: boolean) => void;
  resetProgress: () => void;
}

// Throttle backend writes (distance + live position) so we stay light on the
// Supabase free tier and on battery — at most one sync per this interval.
const SYNC_INTERVAL_MS = 6000;
let lastSyncAt = 0;

export const useGameStore = create<GameState>((set, get) => {
  const initial = loadProgress();
  return {
    identity: null,
    distance: initial.distance,
    hatched: initial.hatched,
    pendingHatch: null,
    lastFix: null,
    gpsStatus: "idle",
    accuracy: null,

    setIdentity: (id) => set({ identity: id }),
    setGpsStatus: (s) => set({ gpsStatus: s }),

    addDistance: (metres, fix) => {
      const { distance, hatched, identity } = get();
      const newDistance = distance + metres;
      const targetCount = Math.floor(newDistance / METRES_PER_EGG);
      let nextHatched = hatched;
      let pending: Creature | null = get().pendingHatch;

      if (targetCount > hatched.length) {
        nextHatched = [...hatched];
        for (let i = hatched.length; i < targetCount; i++) {
          const creature = creatureForHatchIndex(i);
          nextHatched.push({ creatureId: creature.id, index: i, at: Date.now() });
          pending = creature;
        }
      }

      set({
        distance: newDistance,
        hatched: nextHatched,
        lastFix: fix,
        accuracy: fix.accuracy,
        pendingHatch: pending,
      });
      saveProgress({ distance: newDistance, hatched: nextHatched });

      if (identity) {
        const now = Date.now();
        if (now - lastSyncAt >= SYNC_INTERVAL_MS) {
          lastSyncAt = now;
          void upsertParticipant(identity, newDistance, fix.coord);
        }
      }
    },

    clearPendingHatch: () => set({ pendingHatch: null }),

    unlock: (checkpointId, viaManual) => {
      const { identity } = get();
      if (!identity) return;
      void unlockCheckpoint(identity.teamId, checkpointId, viaManual);
    },

    resetProgress: () => {
      saveProgress({ distance: 0, hatched: [] });
      set({ distance: 0, hatched: [], pendingHatch: null });
    },
  };
});

if (import.meta.env.DEV) {
  (window as unknown as { __hww: typeof useGameStore }).__hww = useGameStore;
}
