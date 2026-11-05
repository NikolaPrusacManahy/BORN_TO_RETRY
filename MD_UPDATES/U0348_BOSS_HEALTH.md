# Update 0.3.48 — every boss's health cut by 30%

Status: built (2026-11-05). The designer: "also nerf all bosses HP by 30%".

## The numbers

| Boss | Was | Now |
|---|---|---|
| The Dragon | 1600 | 1120 |
| The Swarm | 1600 | 1120 |
| The Bone King (each of its two lives) | 1000 | 700 |
| The Frost Roc | 1700 | 1190 |
| The Drowned King | 2000 | 1400 |
| The Velociraptor (also floor 10's stand-in) | 1800 | 1260 |
| The Big Shark | 1800 | 1260 |
| Yokai: Okami | 1850 | 1295 |
| Tidebreaker | 1900 | 1330 |
| The Old Whale (Lab only) | 2600 | 1820 |

- These are the knobs' defaults (F1), still in their ranges. They aren't rounded to the sliders' step of 50, so the cut is exactly 30%.
- Rage, frenzy and blast thresholds are shares of health, so they come 30% sooner in damage dealt.
- Mini bosses and ordinary enemies are unchanged.
- The Swarm's worms take a share of its bar, so each worm killed takes 30% less off it. A worm's own health (5) is unchanged.

## Files
- `tuning/`: `dragon.ts`, `swarm.ts`, `boneKing.ts`, `frostRoc.ts`, `drowned.ts`, `dino.ts`, `bigShark.ts`, `okami.ts`, `tidebreaker.ts`, `whale.ts`.
- `MD/DESIGN.md`: the numbers it quotes.
- Tests: `test-boss.ts` checks the cut on every boss. `test-frost-roc.ts`, `test-tidebreaker.ts`, `test-okami-show.ts` and `test-bone-king.ts` had their health ranges moved on purpose, to the new numbers.

## Unseen
- Not played. Fights will be shorter by about 30% of the damage dealt; whether any boss now ends too soon is for the designer to feel.
