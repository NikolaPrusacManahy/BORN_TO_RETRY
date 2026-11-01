# Update 0.3.4 — the style rank; the speed lines taken out

Status: built (2026-11-01). The designer: "honestly, the rank can just be a nice visual for now, no need to add
bonuses … but make it look aggressive and very very matching the fast pace energy"; and "remove that air effect on the
player's screen when dashing … it takes too much space on the screen".

## The style rank (a visual only: it gives nothing)
- **D DIRTY, C CRUEL, B BRUTAL, A ATROCIOUS, S SAVAGE, SS SLAUGHTERHOUSE, SSS UNKILLABLE** (the game's own words; the
  letters are the genre's).
- **Points** from every blow (a jab 6, a finisher 12, a slam 16, a thrown weapon 16…), a kill 45, a parry 70, an
  execution 140. **The same move over and over adds less** each time (it freshens again a while after): variety climbs
  it. **In the air ×1.5; kills close together a multikill** (more for each).
- **It drains all the time**, faster the higher you are; **a hurt knocks a third off**.
- **On the screen**, right of centre and slanted: a huge letter in its rank's colour (grey, yellow, orange, red,
  crimson, magenta, white-hot) with a hard black shadow and a glow; its word on a black slash; a bar draining towards
  losing it; the feed of what you did ("+ PARRY", "+ EXECUTION", "+ AIR KILL", "+ MULTIKILL ×3") slamming in under it. A
  new rank slams in big and white-hot; from S up the letter trembles and splits red and cyan; SSS burns. Hidden in the
  boss shows.

## The speed lines: taken out
The streaks over the screen in a dash or a slide (0.3.1) are gone. The view still widens in a dash and at speed.

## What was built
`engine/styleMeter.ts`, `screens/StyleRank.tsx`, `theme-39-style.css`, `combatFeedback.ts` (it scores the events),
`combatScene.ts` (`realFrame`: hurts, in the air), `hudStore.ts`, `overlayFeed.ts`, `Hud.tsx`, `run.ts`;
`engine/speedLines.ts` to the Recycle Bin. Tests: `test-style.ts`; `test-rush.ts`.

## Unseen in the game
Checked by tests only: the look (its size and place on the screen), how fast it climbs and drains in a real fight.
