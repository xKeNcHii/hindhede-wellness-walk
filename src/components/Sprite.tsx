export const SPRITES: Record<string, string> = {
  gate: "⛩️",
  tree: "🌳",
  swing: "🛝",
  water: "🌊",
  flag: "🚩",
  camera: "📸",
  rock: "🪨",
  wetland: "🦆",
  colugo: "🦥",
  player: "🧍",
};

export function Sprite({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span style={{ fontSize: size, lineHeight: 1 }} aria-hidden>
      {SPRITES[name] ?? "❓"}
    </span>
  );
}
