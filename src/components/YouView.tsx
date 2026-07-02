import { useGameStore } from "../store/useGameStore";
import { PixelAvatar } from "./PixelAvatar";
import { summarize } from "../lib/avatar";
import { CHECKPOINTS } from "../data/types";
import { formatDistance } from "../lib/geo";

interface Props {
  unlockedIds: Set<string>;
}

/** The walker's own card: big evolving avatar, stats, and an honest
 * "doing well / room to grow" summary with the visible props explained. */
export function YouView({ unlockedIds }: Props) {
  const identity = useGameStore((s) => s.identity);
  const avatar = useGameStore((s) => s.avatar);
  const distance = useGameStore((s) => s.distance);
  if (!identity || !avatar) return null;

  const { wins, growth, steady } = summarize(avatar);

  return (
    <div className="p-4 flex flex-col gap-3">
      <h2 className="text-[11px] text-forest-300 text-center">🚶 {identity.name}</h2>

      <div className="pixel-border bg-forest-900 p-4 flex flex-col items-center gap-2">
        <PixelAvatar state={avatar} scale={3} width={avatar.background ? 200 : 140} />
        {avatar.background === "durian_dodger" && (
          <div className="text-[7px] text-clay">🏵️ Durian Dodger — quarry lookout reached</div>
        )}
      </div>

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

      <div className="pixel-border bg-forest-900 p-4 flex flex-col gap-3 text-left">
        <div>
          <div className="text-[9px] text-forest-300 mb-1">✨ DOING WELL</div>
          {wins.length === 0 && (
            <div className="text-[8px] text-forest-800">— nothing yet, keep walking</div>
          )}
          {wins.map((w) => (
            <div key={w.dim} className="text-[8px] text-sand leading-relaxed">
              {w.label} <span className="text-forest-300">— {w.prop}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[9px] text-forest-300 mb-1">🌱 ROOM TO GROW</div>
          {growth.length === 0 && (
            <div className="text-[8px] text-forest-800">— nothing flagged</div>
          )}
          {growth.map((g) => (
            <div key={g.dim} className="text-[8px] text-sand leading-relaxed">
              {g.label} <span className="text-forest-300">— {g.prop}</span>
            </div>
          ))}
        </div>
        {steady.length > 0 && (
          <div className="text-[7px] text-forest-800">
            Not asked yet: {steady.map((s) => s.label).join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}
