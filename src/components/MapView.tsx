import { useGameStore } from "../store/useGameStore";
import { CHECKPOINTS, projectToMap, Checkpoint } from "../data/types";
import { haversine, formatDistance } from "../lib/geo";
import { Sprite } from "./Sprite";
import { PixelButton } from "./PixelButton";
import { METRES_PER_EGG } from "../data/creatures";

interface Props {
  unlockedIds: Set<string>;
  onOpenCheckpoint: (c: Checkpoint) => void;
}

const MANUAL_RANGE_M = 120; // show "I'm here" button when roughly near

export function MapView({ unlockedIds, onOpenCheckpoint }: Props) {
  const distance = useGameStore((s) => s.distance);
  const lastFix = useGameStore((s) => s.lastFix);
  const gpsStatus = useGameStore((s) => s.gpsStatus);
  const accuracy = useGameStore((s) => s.accuracy);

  const player = lastFix ? projectToMap(lastFix.coord) : null;

  const withDistance = CHECKPOINTS.map((c) => {
    const dist = lastFix ? haversine(lastFix.coord, { lat: c.lat, lng: c.lng }) : null;
    const pos = c.img ?? projectToMap({ lat: c.lat, lng: c.lng });
    return { c, dist, pos };
  });

  const next = withDistance
    .filter((w) => !unlockedIds.has(w.c.id))
    .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity))[0];

  const toNextEgg = METRES_PER_EGG - (distance % METRES_PER_EGG);

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

      {/* The map */}
      <div
        className="relative w-full pixel-border overflow-hidden bg-forest-900"
        style={{ aspectRatio: "1100 / 1489" }}
      >
        <img
          src="/park-map.png"
          alt="Hindhede Nature Park map"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* trail line connecting checkpoints */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={withDistance.map((w) => `${w.pos.x * 100},${w.pos.y * 100}`).join(" ")}
            fill="none"
            stroke="#0b1a12"
            strokeWidth="1.5"
            strokeDasharray="3 2"
            opacity="0.8"
          />
        </svg>

        {/* checkpoint pins */}
        {withDistance.map((w) => {
          const unlocked = unlockedIds.has(w.c.id);
          return (
            <button
              key={w.c.id}
              onClick={() => onOpenCheckpoint(w.c)}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${w.pos.x * 100}%`, top: `${w.pos.y * 100}%` }}
            >
              <div
                className={`pixel-border p-1 ${
                  unlocked ? "bg-forest-700" : "bg-forest-950 opacity-80"
                }`}
              >
                <Sprite name={w.c.sprite} size={20} />
              </div>
              <span className="mt-1 text-[7px] text-sand bg-forest-950/80 px-1">
                {w.c.order}
              </span>
            </button>
          );
        })}

        {/* player */}
        {player && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 animate-pop"
            style={{ left: `${player.x * 100}%`, top: `${player.y * 100}%` }}
          >
            <Sprite name="player" size={22} />
          </div>
        )}

        {!player && (
          <div className="absolute inset-0 flex items-center justify-center text-center text-[9px] text-forest-300 p-6">
            {gpsStatus === "denied"
              ? "Location blocked. Enable it in your browser to appear on the map."
              : "Finding you on the trail…"}
          </div>
        )}
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
