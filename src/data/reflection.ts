import type { Dim } from "../lib/avatar";
import { CHECKPOINTS } from "./types";

/**
 * One reflection question per checkpoint (after the gathering point).
 * Each answer nudges one wellness dimension of the walker's avatar:
 * +1 healthy, -1 unhealthy (non-reversible), 0 neutral.
 * Unhealthy options carry a supportive tip shown right after choosing.
 */

export interface ReflectionOption {
  text: string;
  delta: 1 | 0 | -1;
  tip?: string;
}

export interface ReflectionQuestion {
  id: string;
  dim: Dim;
  prompt: string;
  options: ReflectionOption[];
}

/** The hidden-reward checkpoint: reaching the quarry lookout (durian country)
 * earns the "Durian Dodger" avatar background. */
export const DURIAN_CHECKPOINT_ID = "lookout-point";

export const QUESTIONS: ReflectionQuestion[] = [
  {
    id: "mov_deskbreak",
    dim: "mov",
    prompt: "On a heavy work day, what happens to your breaks?",
    options: [
      { text: "I still get up and move regularly", delta: 1 },
      {
        text: "I stay glued to the desk for hours",
        delta: -1,
        tip: "Try the 50/10 rhythm: every 50 minutes, stand up for 10. Even a walk to the pantry counts — movement resets focus better than pushing through.",
      },
      { text: "Depends on the day", delta: 0 },
    ],
  },
  {
    id: "slp_lunch",
    dim: "slp",
    prompt: "Do you take a real lunch break away from work?",
    options: [
      { text: "Yes, I step away and reset", delta: 1 },
      {
        text: "I eat at my desk, still working",
        delta: -1,
        tip: "Desk lunches feel efficient but your afternoon pays for them. Even 15 minutes away from the screen measurably restores attention (and saves your shirt).",
      },
      { text: "Hit and miss", delta: 0 },
    ],
  },
  {
    id: "wld_load",
    dim: "wld",
    prompt: "When your plate is too full, what do you do?",
    options: [
      { text: "Reprioritise or flag it early", delta: 1 },
      {
        text: "Absorb it all and hope it holds",
        delta: -1,
        tip: "Overload hidden is overload doubled. Try naming your top 3 for the week to your manager — it turns \u2018too much\u2019 into a shared problem, not a private one.",
      },
      { text: "Muddle through", delta: 0 },
    ],
  },
  {
    id: "mod_setback",
    dim: "mod",
    prompt: "After a setback at work this week, the thought that stuck was...",
    options: [
      { text: "\u201cThat was hard, but I can handle it\u201d", delta: 1 },
      {
        text: "\u201cI always mess things up\u201d",
        delta: -1,
        tip: "Catch the word \u2018always\u2019 — it\u2019s rarely true. What would you say to a teammate who made the same mistake? Say that to yourself.",
      },
      { text: "I moved on without dwelling", delta: 0 },
    ],
  },
  {
    id: "bnd_afterhours",
    dim: "bnd",
    prompt: "After you log off, how connected to work are you?",
    options: [
      { text: "I switch off and protect my time", delta: 1 },
      {
        text: "Always on — notifications never stop",
        delta: -1,
        tip: "Pick one boundary to start: work notifications off after a set hour. If something is truly urgent, people call — everything else can wait for morning.",
      },
      { text: "Somewhere in between", delta: 0 },
    ],
  },
  {
    id: "sup_ask",
    dim: "sup",
    prompt: "When you're stuck or stretched, do you ask for help?",
    options: [
      { text: "Yes — I reach out to my team", delta: 1 },
      {
        text: "No, I tough it out alone",
        delta: -1,
        tip: "Asking early is a skill, not a weakness — \u2018Can I borrow 15 minutes? I\u2019m stuck on X\u2019 usually saves hours. Most colleagues are glad to be asked.",
      },
      { text: "Only when it's really bad", delta: 0 },
    ],
  },
];

/**
 * Deterministic checkpoint → question mapping.
 * The first checkpoint (gathering point) has no question; the rest walk
 * through the six dimensions in order, looping if there are more checkpoints.
 */
const ordered = [...CHECKPOINTS].sort((a, b) => a.order - b.order);

export function questionForCheckpoint(checkpointId: string): ReflectionQuestion | null {
  const idx = ordered.findIndex((c) => c.id === checkpointId);
  if (idx <= 0) return null; // gathering point: welcome only
  return QUESTIONS[(idx - 1) % QUESTIONS.length];
}
