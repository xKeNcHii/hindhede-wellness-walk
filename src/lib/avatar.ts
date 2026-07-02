/**
 * Evolving pixel-avatar engine.
 *
 * Data lives in ./../data/sprites.json: 52 bases (7 head shapes + 2 soldier
 * uniforms), 6 wellness dimensions x 3 levels of overlay art, and special
 * checkpoint backgrounds (Durian Dodger). Compositing is deterministic:
 * grids stack in `zorder`, later layers win per pixel.
 *
 * Trait levels: 0 struggling | 1 neutral (start) | 2 thriving.
 * NON-REVERSIBLE: the first unhealthy answer on a dimension marks it
 * struggling for the rest of the walk — later good answers can't erase it.
 */
import spritesJson from "../data/sprites.json";

/* ------------------------------- types ---------------------------------- */

export type Dim = "mov" | "slp" | "wld" | "mod" | "bnd" | "sup";
export type Level = 0 | 1 | 2;

interface Palette {
  skin: string;
  skinD?: string;
  hair: string;
  hairD?: string;
  shirt: string;
  shirtD?: string;
  pants: string;
}

interface BaseDef {
  name: string;
  sil: string;
  pal: Palette;
}

interface BackgroundDef {
  canvas: [number, number];
  offset: [number, number];
  title: string;
  palette: Record<string, string>;
  grid: string[];
}

interface SpriteData {
  canvas: [number, number];
  fixed: Record<string, string>;
  accents: Record<string, string>;
  silhouettes: Record<string, string[]>;
  overlays: Record<string, Record<string, string[]>>;
  zorder: string[];
  dimensions: Dim[];
  dimensionMeta: Record<Dim, { label: string; props: Record<string, string> }>;
  bases: Record<string, BaseDef>;
  backgrounds: Record<string, BackgroundDef>;
}

export const SPRITES = spritesJson as unknown as SpriteData;

export interface Tally {
  up: number;
  down: number;
}

export interface AvatarState {
  baseId: string;
  traits: Record<Dim, Level>;
  tally: Record<Dim, Tally>;
  background: string | null;
}

/* ---------------------------- state helpers ----------------------------- */

export const BASE_IDS = Object.keys(SPRITES.bases);
export const DIMENSIONS = SPRITES.dimensions;

export function baseName(baseId: string): string {
  return SPRITES.bases[baseId]?.name ?? baseId;
}

export function newAvatarState(baseId: string): AvatarState {
  const traits = {} as Record<Dim, Level>;
  const tally = {} as Record<Dim, Tally>;
  for (const d of DIMENSIONS) {
    traits[d] = 1;
    tally[d] = { up: 0, down: 0 };
  }
  return { baseId, traits, tally, background: null };
}

function levelFromTally(t: Tally): Level {
  if (t.down > 0) return 0; // a struggle sticks (non-reversible)
  if (t.up > 0) return 2;
  return 1;
}

/** Apply one reflection answer. delta: +1 healthy / -1 unhealthy / 0 neutral. */
export function applyAnswer(state: AvatarState, dim: Dim, delta: number): AvatarState {
  const t = state.tally[dim] ?? { up: 0, down: 0 };
  if (delta > 0) t.up += 1;
  else if (delta < 0) t.down += 1;
  state.tally[dim] = t;
  state.traits[dim] = levelFromTally(t);
  return state;
}

/** Award a special-checkpoint background (e.g. "durian_dodger"). */
export function awardBackground(state: AvatarState, key: string): AvatarState {
  if (SPRITES.backgrounds && SPRITES.backgrounds[key]) state.background = key;
  return state;
}

/* -------------------- compact wire format (DB `avatar`) ------------------ */

const SHORT: Record<Dim, string> = { mov: "m", slp: "s", wld: "w", mod: "o", bnd: "b", sup: "c" };
const LONG: Record<string, Dim> = Object.fromEntries(
  Object.entries(SHORT).map(([k, v]) => [v, k as Dim])
) as Record<string, Dim>;

/** e.g. "014|m1s0w2o1b1c2|durian_dodger" — fits the participants.avatar column. */
export function encodeAvatar(s: AvatarState): string {
  const n = s.baseId.replace("base_", "");
  const t = DIMENSIONS.map((d) => SHORT[d] + s.traits[d]).join("");
  return `${n}|${t}` + (s.background ? `|${s.background}` : "");
}

export function decodeAvatar(str: string | null | undefined): AvatarState | null {
  if (!str || !str.includes("|")) return null;
  const [n, t, bg] = str.split("|");
  const baseId = `base_${n}`;
  if (!SPRITES.bases[baseId]) return null;
  const state = newAvatarState(baseId);
  for (const p of t.match(/[a-z]\d/g) ?? []) {
    const dim = LONG[p[0]];
    if (dim) state.traits[dim] = Number(p[1]) as Level;
  }
  state.background = bg && SPRITES.backgrounds[bg] ? bg : null;
  return state;
}

/* ------------------------------ rendering ------------------------------- */

function colorFor(ch: string, pal: Palette): string | null {
  if (ch === "k") return pal.hair;
  if (ch === "K") return pal.hairD ?? pal.hair;
  if (ch === "s" || ch === "h") return pal.skin;
  if (ch === "S") return pal.skinD ?? pal.skin;
  if (ch === "t") return pal.shirt;
  if (ch === "T") return pal.shirtD ?? pal.shirt;
  if (ch === "p") return pal.pants;
  return SPRITES.fixed[ch] ?? SPRITES.accents[ch] ?? null;
}

function composite(state: AvatarState): string[][] {
  const base = SPRITES.bases[state.baseId];
  const [W, H] = SPRITES.canvas;
  const out: string[][] = Array.from({ length: H }, () => Array<string>(W).fill("."));
  for (const slot of SPRITES.zorder) {
    let grid: string[];
    if (slot === "__base__") grid = SPRITES.silhouettes[base.sil];
    else {
      const dim = (slot.startsWith("mov") ? "mov" : slot) as Dim;
      grid = SPRITES.overlays[slot][String(state.traits[dim] ?? 1)];
    }
    grid.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== ".") out[y][x] = row[x];
      }
    });
  }
  return out;
}

export interface RenderOpts {
  scale?: number;
  /** Force a background regardless of state (preview), or null to suppress. */
  background?: string | null;
  /** Set false to hide the title banner over an earned background. */
  title?: boolean;
}

/** Returns a self-contained <svg> string (safe: only data-driven rects/text). */
export function renderAvatarSVG(state: AvatarState, opts: RenderOpts = {}): string {
  const { scale = 3, title } = opts;
  const base = SPRITES.bases[state.baseId];
  const pal = base.pal;
  const bgKey = opts.background !== undefined ? opts.background : state.background;
  const scene = bgKey ? SPRITES.backgrounds[bgKey] : null;
  const [W, H] = SPRITES.canvas;
  const [TW, TH] = scene ? scene.canvas : [W, H];
  const [ox, oy] = scene ? scene.offset : [0, 0];

  let rects = "";
  if (scene) {
    scene.grid.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = scene.palette[row[x]];
        if (!c) continue;
        rects += `<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="${c}"/>`;
      }
    });
  }
  composite(state).forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === ".") continue;
      const c = colorFor(row[x], pal);
      if (!c) continue;
      rects += `<rect x="${(x + ox) * scale}" y="${(y + oy) * scale}" width="${scale}" height="${scale}" fill="${c}"/>`;
    }
  });
  if (scene && scene.title && title !== false) {
    const fs = Math.max(8, 2.4 * scale);
    const label = scene.title.toUpperCase();
    const tw = label.length * fs * 0.64 + fs * 1.6;
    const th = fs * 1.7;
    const rx = (TW * scale - tw) / 2;
    const ry = scale * 0.5;
    rects += `<rect x="${rx}" y="${ry}" width="${tw}" height="${th}" rx="${fs * 0.35}" fill="#1f1d2b" stroke="#ffd23f" stroke-width="${Math.max(1.5, scale * 0.3)}"/>`;
    rects += `<rect x="${rx + scale * 0.8}" y="${ry + th - scale * 0.55}" width="${tw - scale * 1.6}" height="${scale * 0.35}" fill="#8a6d1f"/>`;
    rects += `<text x="${(TW * scale) / 2}" y="${ry + th * 0.72}" text-anchor="middle" font-family="ui-monospace,Menlo,Consolas,monospace" font-weight="800" font-size="${fs}" fill="#ffd23f" letter-spacing="1">${label}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TW * scale} ${TH * scale}" width="${TW * scale}" height="${TH * scale}" shape-rendering="crispEdges" role="img" aria-label="walker avatar">${rects}</svg>`;
}

/* --------------------------- end-of-walk summary ------------------------- */

export interface SummaryItem {
  dim: Dim;
  label: string;
  prop: string;
  up: number;
  down: number;
}

/** Honest tally-based split for the "you" card / end screen. */
export function summarize(state: AvatarState): {
  wins: SummaryItem[];
  growth: SummaryItem[];
  steady: SummaryItem[];
} {
  const wins: SummaryItem[] = [];
  const growth: SummaryItem[] = [];
  const steady: SummaryItem[] = [];
  for (const d of DIMENSIONS) {
    const meta = SPRITES.dimensionMeta[d];
    const t = state.tally?.[d] ?? { up: 0, down: 0 };
    if (t.down > 0)
      growth.push({ dim: d, label: meta.label, prop: meta.props["0"], up: t.up, down: t.down });
    else if (t.up > 0)
      wins.push({ dim: d, label: meta.label, prop: meta.props["2"], up: t.up, down: t.down });
    else steady.push({ dim: d, label: meta.label, prop: "", up: 0, down: 0 });
  }
  return { wins, growth, steady };
}
