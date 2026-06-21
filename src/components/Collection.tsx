import { useGameStore } from "../store/useGameStore";
import { CREATURES, METRES_PER_EGG } from "../data/creatures";
import { formatDistance } from "../lib/geo";

export function Collection() {
  const hatched = useGameStore((s) => s.hatched);
  const distance = useGameStore((s) => s.distance);

  const counts = new Map<string, number>();
  hatched.forEach((h) => counts.set(h.creatureId, (counts.get(h.creatureId) ?? 0) + 1));

  const toNext = METRES_PER_EGG - (distance % METRES_PER_EGG);

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="pixel-border bg-forest-900 p-3 text-center text-[9px]">
        <div className="text-forest-300">EGGS HATCHED</div>
        <div className="text-[18px] text-sand my-1">{hatched.length}</div>
        <div className="text-[8px] text-forest-300">
          next in {formatDistance(toNext)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {CREATURES.map((c) => {
          const n = counts.get(c.id) ?? 0;
          const owned = n > 0;
          return (
            <div
              key={c.id}
              className={`pixel-border p-2 flex flex-col items-center text-center ${
                owned ? "bg-forest-800" : "bg-forest-950 opacity-50"
              }`}
            >
              <div className="text-3xl" style={{ filter: owned ? "none" : "grayscale(1)" }}>
                {owned ? c.emoji : "🥚"}
              </div>
              <div className="text-[7px] mt-1 text-sand">{owned ? c.name : "???"}</div>
              {n > 1 && <div className="text-[7px] text-forest-300">x{n}</div>}
            </div>
          );
        })}
      </div>

      <p className="text-[8px] text-forest-300 text-center leading-relaxed">
        Keep walking — every {METRES_PER_EGG}m hatches a new egg.
      </p>
    </div>
  );
}
