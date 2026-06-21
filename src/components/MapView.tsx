import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGameStore } from "../store/useGameStore";
import { CHECKPOINTS, Checkpoint } from "../data/types";
import { haversine, formatDistance } from "../lib/geo";
import { Sprite, SPRITES } from "./Sprite";
import { PixelButton } from "./PixelButton";
import { METRES_PER_EGG } from "../data/creatures";

interface Props {
  unlockedIds: Set<string>;
  onOpenCheckpoint: (c: Checkpoint) => void;
}

const MANUAL_RANGE_M = 120; // show "I'm here" button when roughly near

// Park centre (average of the checkpoint cluster) used as the initial view.
const PARK_CENTER: [number, number] = [1.34874, 103.77573];

function checkpointIcon(emoji: string, order: number, unlocked: boolean) {
  return L.divIcon({
    className: "cp-marker",
    html: `<div class="cp-pin ${unlocked ? "cp-on" : "cp-off"}">
        <span class="cp-emoji">${emoji}</span>
        <span class="cp-num">${order}</span>
      </div>`,
    iconSize: [40, 50],
    iconAnchor: [20, 46],
  });
}

const playerIcon = L.divIcon({
  className: "cp-marker",
  html: `<div class="player-pin">${SPRITES.player}</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

/** On first mount, frame the whole route so all checkpoints are visible. */
function FitRoute() {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(CHECKPOINTS.map((c) => [c.lat, c.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Pan to the player the first time we get a GPS fix. */
function FollowPlayer({ coord }: { coord: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (coord) map.setView([coord.lat, coord.lng], 17, { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coord?.lat, coord?.lng]);
  return null;
}

export function MapView({ unlockedIds, onOpenCheckpoint }: Props) {
  const distance = useGameStore((s) => s.distance);
  const lastFix = useGameStore((s) => s.lastFix);
  const gpsStatus = useGameStore((s) => s.gpsStatus);
  const accuracy = useGameStore((s) => s.accuracy);

  const player = lastFix?.coord ?? null;

  const withDistance = CHECKPOINTS.map((c) => {
    const dist = player ? haversine(player, { lat: c.lat, lng: c.lng }) : null;
    return { c, dist };
  });

  const next = withDistance
    .filter((w) => !unlockedIds.has(w.c.id))
    .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity))[0];

  const toNextEgg = METRES_PER_EGG - (distance % METRES_PER_EGG);

  const trail = useMemo<[number, number][]>(
    () => CHECKPOINTS.map((c) => [c.lat, c.lng]),
    []
  );

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Stats bar */}
      <div className="pixel-border bg-forest-900 p-3 flex items-center justify-between text-[9px]">
        <div>
          <div className="text-forest-300">DISTANCE</div>
          <div className="text-sand text-[12px]">{formatDistance(distance)}</div>
        </div>
        <div className="text-right">
          <div className="text-forest-300">NEXT EGG</div>
          <div className="text-sand text-[12px]">{formatDistance(toNextEgg)}</div>
        </div>
      </div>

      {/* The real map */}
      <div className="pixel-border overflow-hidden" style={{ height: "58vh" }}>
        <MapContainer
          center={PARK_CENTER}
          zoom={17}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <Polyline
            positions={trail}
            pathOptions={{ color: "#0b1a12", weight: 3, dashArray: "6 6", opacity: 0.85 }}
          />

          {CHECKPOINTS.map((c) => (
            <Marker
              key={c.id}
              position={[c.lat, c.lng]}
              icon={checkpointIcon(SPRITES[c.sprite] ?? "❓", c.order, unlockedIds.has(c.id))}
              eventHandlers={{ click: () => onOpenCheckpoint(c) }}
            />
          ))}

          {player && <Marker position={[player.lat, player.lng]} icon={playerIcon} />}

          <FitRoute />
          <FollowPlayer coord={player} />
        </MapContainer>
      </div>

      {/* GPS status */}
      <div className="text-[8px] text-forest-300 flex justify-between">
        <span>GPS: {gpsStatus}</span>
        {accuracy != null && <span>±{Math.round(accuracy)}m</span>}
      </div>

      {/* Next checkpoint + manual override */}
      {next && (
        <div className="pixel-border bg-forest-900 p-3 text-[9px] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-forest-300">NEXT CHECKPOINT</span>
            <span className="text-sand">
              {next.dist != null ? formatDistance(next.dist) : "—"}
            </span>
          </div>
          <div className="text-sand text-[10px] flex items-center gap-2">
            <Sprite name={next.c.sprite} size={16} /> {next.c.name}
          </div>
          {next.dist != null && next.dist <= MANUAL_RANGE_M && (
            <PixelButton
              variant="ghost"
              onClick={() => onOpenCheckpoint(next.c)}
              className="mt-1"
            >
              I'm here — open checkpoint
            </PixelButton>
          )}
        </div>
      )}
    </div>
  );
}
