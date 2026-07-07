import { useEffect, useMemo, useRef, useState } from "react";
import { Onboarding } from "./components/Onboarding";
import { MapView } from "./components/MapView";
import { YouView } from "./components/YouView";
import { Leaderboard } from "./components/Leaderboard";
import { AdminView } from "./components/AdminView";
import { CheckpointScreen } from "./components/CheckpointScreen";
import { PixelAvatar } from "./components/PixelAvatar";
import { useGameStore } from "./store/useGameStore";
import { useGeoTracker } from "./hooks/useGeoTracker";
import { useWakeLock } from "./hooks/useWakeLock";
import { useSnapshot } from "./hooks/useSnapshot";
import { loadIdentity, clearIdentity, Identity } from "./lib/identity";
import { upsertParticipant } from "./lib/backend";
import { CHECKPOINTS, Checkpoint } from "./data/types";
import { DURIAN_CHECKPOINT_ID } from "./data/reflection";
import { haversine, formatDistance } from "./lib/geo";
import { encodeAvatar } from "./lib/avatar";

type Tab = "map" | "you" | "walkers" | "admin";

const ADMIN_ENABLED =
  typeof window !== "undefined" &&
  (window.location.search.includes("admin") || window.location.hash.includes("admin"));

// Max GPS uncertainty (metres) we'll trust for auto-unlocking a checkpoint.
// A little looser than the distance filter to allow for tree cover, but tight
// enough to reject wildly coarse WiFi/IP fixes.
const GEOFENCE_MAX_ACCURACY_M = 50;

export default function App() {
  const identity = useGameStore((s) => s.identity);
  const setIdentity = useGameStore((s) => s.setIdentity);
  const avatar = useGameStore((s) => s.avatar);
  const distance = useGameStore((s) => s.distance);
  const unlock = useGameStore((s) => s.unlock);
  const earnBackground = useGameStore((s) => s.earnBackground);
  const lastFix = useGameStore((s) => s.lastFix);

  const [tab, setTab] = useState<Tab>("map");
  const [active, setActive] = useState<Checkpoint | null>(null);
  const autoOpened = useRef<Set<string>>(new Set());

  // Restore saved identity once on load.
  useEffect(() => {
    const saved = loadIdentity();
    if (saved) setIdentity(saved);
  }, [setIdentity]);

  // Register this walker (even at 0m) so they appear on the leaderboard.
  useEffect(() => {
    if (identity) {
      const s = useGameStore.getState();
      if (s.avatar) void upsertParticipant(identity, s.distance, encodeAvatar(s.avatar));
    }
  }, [identity]);

  useGeoTracker(Boolean(identity));
  useWakeLock(Boolean(identity));
  const snapshot = useSnapshot();

  // My unlocked checkpoints (solo mode: keyed by this device).
  const unlockedIds = useMemo(() => {
    if (!identity) return new Set<string>();
    return new Set(
      snapshot.checkpoints
        .filter((c) => c.device_id === identity.deviceId)
        .map((c) => c.checkpoint_id)
    );
  }, [snapshot.checkpoints, identity]);

  // Everyone else with a known position, for the map.
  const otherWalkers = useMemo(
    () =>
      identity
        ? snapshot.participants.filter(
            (p) => p.device_id !== identity.deviceId && p.lat != null && p.lng != null
          )
        : [],
    [snapshot.participants, identity]
  );

  // Geofence: auto-unlock + auto-open checkpoints when within radius.
  useEffect(() => {
    if (!identity || !lastFix) return;
    // Only trust the fix for unlocking when it's accurate enough. The map dot
    // still shows on coarse fixes, but a ±1000 m fix must not auto-unlock a
    // checkpoint just because its center happens to fall inside a small radius.
    if (lastFix.accuracy > GEOFENCE_MAX_ACCURACY_M) return;
    for (const c of CHECKPOINTS) {
      const dist = haversine(lastFix.coord, { lat: c.lat, lng: c.lng });
      if (dist <= c.radius) {
        if (!unlockedIds.has(c.id)) unlock(c.id, false);
        if (c.id === DURIAN_CHECKPOINT_ID) earnBackground("durian_dodger");
        if (!autoOpened.current.has(c.id) && !active) {
          autoOpened.current.add(c.id);
          setActive(c);
        }
      }
    }
  }, [lastFix, identity, unlockedIds, unlock, earnBackground, active]);

  if (!identity) {
    return <Onboarding onDone={(id: Identity) => setIdentity(id)} />;
  }

  const distanceToActive =
    active && lastFix
      ? haversine(lastFix.coord, { lat: active.lat, lng: active.lng })
      : null;

  return (
    <div className="min-h-full flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b-4 border-forest-950 bg-forest-900">
        <div className="flex items-center gap-2">
          {avatar && (
            <button onClick={() => setTab("you")} aria-label="Your avatar">
              <PixelAvatar state={avatar} scale={1} title={false} background={null} width={22} />
            </button>
          )}
          <div className="text-[9px]">
            <div className="text-sand">{identity.name}</div>
            <div className="text-forest-300 text-[7px]">{formatDistance(distance)} walked</div>
          </div>
        </div>
        <button
          className="text-[7px] text-forest-300 underline"
          onClick={() => {
            if (confirm("Reset this device and start over?")) {
              clearIdentity();
              useGameStore.getState().resetProgress();
              setIdentity(null);
            }
          }}
        >
          reset
        </button>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto pb-20">
        {tab === "map" && (
          <MapView
            unlockedIds={unlockedIds}
            onOpenCheckpoint={setActive}
            walkers={otherWalkers}
          />
        )}
        {tab === "you" && <YouView unlockedIds={unlockedIds} />}
        {tab === "walkers" && <Leaderboard snapshot={snapshot} identity={identity} />}
        {tab === "admin" && <AdminView snapshot={snapshot} />}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md grid grid-cols-4 border-t-4 border-forest-950 bg-forest-900">
        <NavBtn label="Map" icon="🗺️" on={tab === "map"} go={() => setTab("map")} />
        <NavBtn label="You" icon="🚶" on={tab === "you"} go={() => setTab("you")} />
        <NavBtn
          label="Walkers"
          icon="🏆"
          on={tab === "walkers"}
          go={() => setTab("walkers")}
        />
        {ADMIN_ENABLED ? (
          <NavBtn label="Admin" icon="🛠️" on={tab === "admin"} go={() => setTab("admin")} />
        ) : (
          <div className="py-3 text-center text-[8px] text-forest-500">—</div>
        )}
      </nav>

      {active && (
        <CheckpointScreen
          checkpoint={active}
          unlocked={unlockedIds.has(active.id)}
          distanceToIt={distanceToActive}
          identity={identity}
          onUnlock={(viaManual) => {
            unlock(active.id, viaManual);
            if (active.id === DURIAN_CHECKPOINT_ID) earnBackground("durian_dodger");
          }}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

function NavBtn({
  label,
  icon,
  on,
  go,
}: {
  label: string;
  icon: string;
  on: boolean;
  go: () => void;
}) {
  return (
    <button
      onClick={go}
      className={`py-3 flex flex-col items-center gap-1 text-[7px] ${
        on ? "text-forest-300 bg-forest-800" : "text-sand"
      }`}
    >
      <span className="text-[14px]">{icon}</span>
      {label}
    </button>
  );
}
