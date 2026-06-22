// The roster of pixel-style characters a player can pick as their map avatar.
// Emoji keep the same lightweight, pixel-font aesthetic as the rest of the app.
export interface Avatar {
  id: string;
  emoji: string;
  label: string;
}

export const AVATARS: Avatar[] = [
  { id: "fox", emoji: "🦊", label: "Fox" },
  { id: "cat", emoji: "🐱", label: "Cat" },
  { id: "dog", emoji: "🐶", label: "Dog" },
  { id: "frog", emoji: "🐸", label: "Frog" },
  { id: "owl", emoji: "🦉", label: "Owl" },
  { id: "bear", emoji: "🐻", label: "Bear" },
  { id: "panda", emoji: "🐼", label: "Panda" },
  { id: "rabbit", emoji: "🐰", label: "Rabbit" },
  { id: "tiger", emoji: "🐯", label: "Tiger" },
  { id: "koala", emoji: "🐨", label: "Koala" },
  { id: "monkey", emoji: "🐵", label: "Monkey" },
  { id: "chick", emoji: "🐥", label: "Chick" },
  { id: "penguin", emoji: "🐧", label: "Penguin" },
  { id: "unicorn", emoji: "🦄", label: "Unicorn" },
];

export const DEFAULT_AVATAR = AVATARS[0].id;

/** Emoji for an avatar id, falling back to the generic walker if unknown/old. */
export function avatarEmoji(id: string | null | undefined): string {
  return AVATARS.find((a) => a.id === id)?.emoji ?? "🧍";
}
