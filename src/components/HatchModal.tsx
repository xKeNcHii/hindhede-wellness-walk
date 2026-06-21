import { useGameStore } from "../store/useGameStore";
import { PixelButton } from "./PixelButton";

export function HatchModal() {
  const pending = useGameStore((s) => s.pendingHatch);
  const clear = useGameStore((s) => s.clearPendingHatch);
  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-50 bg-forest-950/90 flex items-center justify-center p-6">
      <div className="pixel-border bg-forest-900 p-6 text-center flex flex-col items-center gap-3 max-w-xs">
        <div className="text-[10px] text-forest-300">AN EGG HATCHED!</div>
        <div className="text-6xl animate-pop" style={{ color: pending.color }}>
          {pending.emoji}
        </div>
        <div className="text-[12px]" style={{ color: pending.color }}>
          {pending.name}
        </div>
        <p className="text-[8px] leading-relaxed text-sand">{pending.blurb}</p>
        <PixelButton onClick={clear} className="mt-2 w-full">
          Add to collection
        </PixelButton>
      </div>
    </div>
  );
}
