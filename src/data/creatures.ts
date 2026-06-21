export interface Creature {
  id: string;
  name: string;
  emoji: string;
  color: string;
  blurb: string;
}

/** Distance (metres) needed to hatch one egg. */
export const METRES_PER_EGG = 500;

/** Hatch pool. Each hatched egg picks the next creature by index (looping). */
export const CREATURES: Creature[] = [
  { id: "mossling", name: "Mossling", emoji: "🌱", color: "#6ee7a0", blurb: "A calm little sprout. Reminds you to grow slowly." },
  { id: "pebbit", name: "Pebbit", emoji: "🪨", color: "#a8a29e", blurb: "Steady and grounded. Nothing rattles it." },
  { id: "lumi", name: "Lumi", emoji: "✨", color: "#fde047", blurb: "A spark of joy that follows you down the trail." },
  { id: "dewdrop", name: "Dewdrop", emoji: "💧", color: "#7dd3fc", blurb: "Cool and clear. Helps you breathe out the noise." },
  { id: "fernix", name: "Fernix", emoji: "🦎", color: "#34d399", blurb: "Loves the forest floor. Curious about everything." },
  { id: "sunny", name: "Sunny", emoji: "🌻", color: "#fbbf24", blurb: "Turns to face the light, always." },
  { id: "hootle", name: "Hootle", emoji: "🦉", color: "#c4a484", blurb: "Wise and watchful. Knows when to rest." },
  { id: "petalon", name: "Petalon", emoji: "🦋", color: "#f9a8d4", blurb: "Flits from flower to flower without a worry." },
];

export function creatureForHatchIndex(index: number): Creature {
  return CREATURES[index % CREATURES.length];
}
