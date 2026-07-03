import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";
import { useGameStore } from "../store/useGameStore";
import { CHECKPOINTS, Checkpoint } from "../data/types";
import { ROUTE } from "../data/route";
import { haversine, formatDistance } from "../lib/geo";
import { Sprite, SPRITES } from "./Sprite";
import { PixelButton } from "./PixelButton";
import { decodeAvatar, renderAvatarSVG } from "../lib/avatar";
import type { ParticipantRow } from "../lib/backend";

interface Props {
  unlockedIds: Set<string>;
  onOpenCheckpoint: (c: Checkpoint) => void;
  /** Everyone else on the walk (with a known position). */
  walkers: ParticipantRow[];
}

const MANUAL_RANGE_M = 120; // show "I'm here" button when roughly near

// The maplibre-gl-leaflet bridge looks for a global maplibregl.
(window as unknown as { maplibregl: typeof maplibregl }).maplibregl = maplibregl;

// Park centre (average of the checkpoint cluster) used as the initial view.
const PARK_CENTER: [number, number] = [1.34874, 103.77573];

const MIN_ZOOM = 15;
const MAX_ZOOM = 19;

// OpenFreeMap vector base layer rendered through MapLibre GL inside Leaflet.
const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

function BaseLayer() {
  const map = useMap();
  useEffect(() => {
    const gl = (L as unknown as {
      maplibreGL: (opts: Record<string, unknown>) => L.Layer;
    }).maplibreGL({
      style: OPENFREEMAP_STYLE,
      attribution:
        '&copy; <a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });
    gl.addTo(map);
    return () => {
      map.removeLayer(gl);
    };
  }, [map]);
  return null;
}

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

// A main-park checkpoint whose icon is still masked (Entrance not reached yet).
// Uses a plain "?" glyph (not an emoji) so it renders identically everywhere.
function maskedIcon(order: number) {
  return L.divIcon({
    className: "cp-marker",
    html: `<div class="cp-pin cp-off cp-masked">
        <span class="cp-qmark">?</span>
        <span class="cp-num">${order}</span>
      </div>`,
    iconSize: [40, 50],
    iconAnchor: [20, 46],
  });
}

// The hidden bonus checkpoint (Colugo Deck): a mysterious dungeon gate showing
// only a glowing "?". CSS-drawn (no emoji) so it can't break to a tofu box.
function secretIcon() {
  return L.divIcon({
    className: "cp-marker",
    html: `<div class="cp-pin cp-secret"><span class="cp-gate">?</span></div>`,
    iconSize: [40, 50],
    iconAnchor: [20, 46],
  });
}

function playerIcon(avatarSvg: string) {
  return L.divIcon({
    className: "cp-marker",
    html: `<div class="player-pin">${avatarSvg}</div>`,
    iconSize: [30, 40],
    iconAnchor: [15, 36],
  });
}

/* ----------------------------- Teammate layer ---------------------------- */

// Players whose markers fall within this many screen pixels are merged into a
// single numbered cluster instead of overlapping human icons.
const CLUSTER_PX = 38;

interface Mate {
  device_id: string;
  name: string;
  /** Pre-rendered evolving-avatar SVG for the map pin. */
  svg: string;
  lat: number;
  lng: number;
}

interface Cluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
  members: Mate[];
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

function mateIcon(name: string, avatarSvg: string) {
  return L.divIcon({
    className: "cp-marker",
    html: `<div class="mate-pin"><span class="mate-avatar">${avatarSvg}</span><span class="mate-name">${escapeHtml(
      name
    )}</span></div>`,
    iconSize: [44, 48],
    iconAnchor: [22, 40],
  });
}

function clusterIcon(count: number) {
  return L.divIcon({
    className: "cp-marker",
    html: `<div class="mate-cluster">${count}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

// Greedy single-pass clustering by on-screen pixel distance at the current zoom.
function clusterMates(map: L.Map, mates: Mate[]): Cluster[] {
  const pts = mates.map((m) => ({ m, p: map.latLngToLayerPoint([m.lat, m.lng]) }));
  const used = new Array(pts.length).fill(false);
  const clusters: Cluster[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const members = [pts[i].m];
    for (let j = i + 1; j < pts.length; j++) {
      if (!used[j] && pts[i].p.distanceTo(pts[j].p) <= CLUSTER_PX) {
        used[j] = true;
        members.push(pts[j].m);
      }
    }
    const lat = members.reduce((s, x) => s + x.lat, 0) / members.length;
    const lng = members.reduce((s, x) => s + x.lng, 0) / members.length;
    clusters.push({
      id: members.map((x) => x.device_id).sort().join("|"),
      lat,
      lng,
      count: members.length,
      members,
    });
  }
  return clusters;
}

/** Renders other walkers, collapsing nearby ones into a single numbered cluster. */
function TeammatesLayer({ mates }: { mates: Mate[] }) {
  const map = useMap();
  // Clustering depends on zoom (pixel spacing changes), so recompute on zoomend.
  const [, setTick] = useState(0);
  useEffect(() => {
    const rerender = () => setTick((n) => n + 1);
    map.on("zoomend", rerender);
    return () => {
      map.off("zoomend", rerender);
    };
  }, [map]);

  const clusters = clusterMates(map, mates);
  return (
    <>
      {clusters.map((cl) => (
        <Marker
          key={cl.id}
          position={[cl.lat, cl.lng]}
          icon={
            cl.count === 1
              ? mateIcon(cl.members[0].name, cl.members[0].svg)
              : clusterIcon(cl.count)
          }
          interactive={false}
          zIndexOffset={-100}
        />
      ))}
    </>
  );
}

const routeBounds = () =>
  L.latLngBounds(CHECKPOINTS.map((c) => [c.lat, c.lng] as [number, number]));

// Index of the recorded-route point closest to a checkpoint, so we can slice
// the trail between two checkpoints.
function nearestRouteIndex(coord: { lat: number; lng: number }): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < ROUTE.length; i++) {
    const d = haversine({ lat: ROUTE[i][0], lng: ROUTE[i][1] }, coord);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/**
 * Only draw the leg of the trail the team is currently walking: from the last
 * checkpoint they've reached to the next one they need to unlock. Returns null
 * once every checkpoint is done.
 */
function currentRouteSegment(unlockedIds: Set<string>): [number, number][] | null {
  const ordered = CHECKPOINTS; // already sorted by order
  // The "current" checkpoint is the furthest one reached; before any are
  // reached we're effectively at the first checkpoint, walking to the second.
  let currentIdx = -1;
  for (let i = 0; i < ordered.length; i++) {
    if (unlockedIds.has(ordered[i].id)) currentIdx = i;
  }
  if (currentIdx === -1) currentIdx = 0;
  const nextIdx = currentIdx + 1;
  if (nextIdx >= ordered.length) return null; // reached the last checkpoint — done

  const startIdx = nearestRouteIndex(ordered[currentIdx]);
  const endIdx = nearestRouteIndex(ordered[nextIdx]);
  const [a, b] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
  const seg = ROUTE.slice(a, b + 1);
  return seg.length >= 2 ? seg : null;
}

/**
 * Markers are a fixed pixel size, so they look oversized when zoomed out.
 * Scale them down with the zoom level via a CSS variable on the map container.
 */
function MarkerScaler() {
  const map = useMap();
  useEffect(() => {
    const apply = () => {
      const z = map.getZoom();
      // Full size at z>=17, never smaller than 0.7 so markers stay readable.
      const scale = Math.max(0.7, Math.min(1, (z - 13) / 4));
      map.getContainer().style.setProperty("--cp-scale", scale.toFixed(2));
    };
    apply();
    map.on("zoomend", apply);
    return () => {
      map.off("zoomend", apply);
    };
  }, [map]);
  return null;
}

/** Buttons to snap the view back to the whole route or to the player. */
function ViewControls({ coord }: { coord: { lat: number; lng: number } | null }) {
  const map = useMap();
  // keep the latest coord available to the (once-created) control handler
  const coordRef = useRef(coord);
  coordRef.current = coord;
  useEffect(() => {
    const ctrl = new L.Control({ position: "topright" });
    ctrl.onAdd = () => {
      const div = L.DomUtil.create("div", "leaflet-bar view-ctrl");
      div.innerHTML = `
        <a href="#" data-act="route" title="Show full trail" role="button">🥾</a>
        <a href="#" data-act="me" title="Center on me" role="button">📍</a>`;
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.on(div, "click", (e) => {
        L.DomEvent.preventDefault(e);
        const act = (e.target as HTMLElement).closest("a")?.getAttribute("data-act");
        if (act === "route") map.fitBounds(routeBounds(), { padding: [40, 40] });
        if (act === "me" && coordRef.current)
          map.setView([coordRef.current.lat, coordRef.current.lng], 17, { animate: true });
      });
      return div;
    };
    ctrl.addTo(map);
    return () => {
      ctrl.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

export function MapView({ unlockedIds, onOpenCheckpoint, walkers }: Props) {
  const distance = useGameStore((s) => s.distance);
  const lastFix = useGameStore((s) => s.lastFix);
  const gpsStatus = useGameStore((s) => s.gpsStatus);
  const accuracy = useGameStore((s) => s.accuracy);
  const myAvatar = useGameStore((s) => s.avatar);

  const player = lastFix?.coord ?? null;
  const myIcon = playerIcon(
    myAvatar ? renderAvatarSVG(myAvatar, { scale: 1, background: null }) : "🧍"
  );

  const withDistance = CHECKPOINTS.map((c) => {
    const dist = player ? haversine(player, { lat: c.lat, lng: c.lng }) : null;
    return { c, dist };
  });

  const next = withDistance
    .filter((w) => !unlockedIds.has(w.c.id))
    .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity))[0];

  // Only the leg from the last reached checkpoint to the next one.
  const routeSegment = currentRouteSegment(unlockedIds);

  const mates: Mate[] = walkers
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => {
      const state = decodeAvatar(p.avatar);
      return {
        device_id: p.device_id,
        name: p.name,
        svg: state
          ? renderAvatarSVG(state, { scale: 1, background: null })
          : "🧍",
        lat: p.lat!,
        lng: p.lng!,
      };
    });

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Stats bar */}
      <div className="pixel-border bg-forest-900 p-3 flex items-center justify-between text-[9px]">
        <div>
          <div className="text-forest-300">DISTANCE</div>
          <div className="text-sand text-[12px]">{formatDistance(distance)}</div>
        </div>
        <div className="text-right">
          <div className="text-forest-300">CHECKPOINTS</div>
          <div className="text-sand text-[12px]">
            {unlockedIds.size}/{CHECKPOINTS.length}
          </div>
        </div>
      </div>

      {/* The real map */}
      <div className="pixel-border overflow-hidden" style={{ height: "58vh" }}>
        <MapContainer
          center={PARK_CENTER}
          zoom={17}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          scrollWheelZoom
          inertia={false}
          style={{ height: "100%", width: "100%" }}
        >
          <BaseLayer />

          {/* Only the current leg of the trail (last checkpoint → next one). */}
          {routeSegment && (
            <Polyline
              positions={routeSegment}
              pathOptions={{ color: "#2f9c5e", weight: 4, opacity: 0.85, dashArray: "1 10", lineCap: "round" }}
            />
          )}

          {CHECKPOINTS.map((c) => {
            const unlocked = unlockedIds.has(c.id);
            const revealed = !c.revealAfter || unlockedIds.has(c.revealAfter);
            // Secret stays a dungeon gate until reached; masked main-park stops
            // stay "?" until the Entrance is unlocked. Both block early taps.
            const icon =
              c.secret && !unlocked
                ? secretIcon()
                : !revealed
                ? maskedIcon(c.order)
                : checkpointIcon(SPRITES[c.sprite] ?? "❓", c.order, unlocked);
            const clickable = unlocked || (revealed && !c.secret);
            return (
              <Marker
                key={c.id}
                position={[c.lat, c.lng]}
                icon={icon}
                interactive={clickable}
                eventHandlers={clickable ? { click: () => onOpenCheckpoint(c) } : {}}
              />
            );
          })}

          <TeammatesLayer mates={mates} />

          {player && <Marker position={[player.lat, player.lng]} icon={myIcon} />}

          <MarkerScaler />
          <ViewControls coord={player} />
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
            {next.c.secret ? (
              <>??? — a hidden place</>
            ) : next.c.revealAfter && !unlockedIds.has(next.c.revealAfter) ? (
              <>??? — reach the Entrance to reveal</>
            ) : (
              <>
                <Sprite name={next.c.sprite} size={16} /> {next.c.name}
              </>
            )}
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
