# Evolving avatar system

Each walker picks one of **52 pixel bases** (7 head shapes across skin tones and
outfits, plus 2 army-camo soldiers) at onboarding. The avatar starts neutral and
**evolves with reflection answers** at checkpoints along six workplace-wellness
dimensions:

| Dim | Label | Struggling adds | Thriving adds |
|---|---|---|---|
| `mov` | Movement & Energy | drained battery | golden speed shoes + sparks |
| `slp` | Rest & Recovery | eye bags + shirt stain | twinkles |
| `wld` | Workload & Stress | storm cloud + lightning + floor-to-waist paperwork | big sun |
| `mod` | Mood & Outlook | frown | smile + blush |
| `bnd` | Boundaries | buzzing phone in hand | steaming mug |
| `sup` | Support & Speaking Up | unsaid "..." bubble | colleague thumbs-up |

Levels are **non-reversible**: one unhealthy answer marks that dimension as a
growth area for the rest of the walk. Unhealthy options show a supportive tip.

Reaching the **quarry lookout** (`lookout-point`) earns the **Durian Dodger**
background: the avatar renders standing on the lookout deck with a gold title
banner.

## Where things live
- `src/data/sprites.json` — all pixel grids (bases, overlays, backgrounds)
- `src/lib/avatar.ts` — state, evolution, encode/decode, SVG renderer
- `src/data/reflection.ts` — questions + checkpoint mapping
- `src/components/PixelAvatar.tsx` — React wrapper

## Wire format
The whole avatar syncs through the existing `participants.avatar` text column
as a compact code, e.g. `014|m1s0w2o1b1c2|durian_dodger`
(base 014 | six trait levels | earned background). `decodeAvatar` returns
`null` for legacy emoji ids, so old rows just render a generic 🧍.
