# Update 0.2.18 — Fate Cards, wave 2

Status: built (2026-11-01). The designer: "just build wave 2": the cards from the proposal that needed effects of their
own (bleed, burn, lightning, blasts, homing knives, rings, a split throw). Their names are new and our own (the designer,
of wave 1: "the names are very similar if not same soo.. let's not do that"); the ideas came from Risk of Rain 2's items.
With them, 40 cards: 9 common, 9 uncommon, 9 rare, 7 epic, 6 mythic.

## The 10 cards (numbers are placeholders: F1 → Fate Cards)
| Card | Rarity | Move | Does |
|---|---|---|---|
| Jagged Knuckles | Uncommon | Fists | Your jabs make enemies bleed: 5 a second for 3 s (a jab starts it over) |
| Thunderclap | Rare | Fists | A charged punch arcs lightning to the 3 nearest enemies (20 each) |
| Death Throes | Rare | Kills | A kill has a 25% chance to burst: 30 to everything within 4 m |
| Pyre | Rare | Kills | A kill sets the enemies within 3 m of it on fire (12 a second for 3 s) |
| Spirit Knives | Epic | Kills | Every kill throws 3 knives that home in on enemies near it (15 each) |
| Powder Keg | Epic | Weapons | Thrown weapons (where they break) and charged punches explode: 40 within 4 m |
| Fire and Ice | Epic | Fists | A hit of 40 or more throws a ring of fire, the next a ring of ice (freezes 1.5 s; every 6 s) |
| Storm Heart | Epic | Body | Every 3 s, lightning strikes the 3 nearest enemies within 10 m (20 each) |
| Chain Reaction | Mythic | Kills | Every enemy you kill explodes (25 within 3 m), and its blast can set off the next |
| Splinter | Mythic | Weapons | Every weapon you throw splits into three (12° apart) |

- **Bleeds and burns** hurt every quarter second without staggering (no stunlock) and can't be dodged; a boss bleeds and
  burns. A boss is never frozen.
- **Blasts** (Death Throes, Powder Keg, Chain Reaction) hurt everything near, half as hard at the edge, not through walls.
  **A chain** goes off a blast at a time, a moment apart (never all in one tick: it ripples out).
- **Lightning** goes from where you punched (Thunderclap) or your chest (Storm Heart) to its targets, not through walls.
- **Spirit Knives** leave the body and turn after their marks; once a mark is dead, they fly on straight.
- **Splinter** works on throws that break (Q, or a spent weapon), not the Gold Axe's charged throw that comes back; each of
  the three hits (and Ricochets, and blows up with Powder Keg) on its own.
- Kills by bleeds, burns, bolts and blasts are yours (coins, the meter, other kill cards).

## How they look and sound (made in code)
Flames licking off what burns, blood dripping off what bleeds, a ball of fire, an orange ring and a flash where a blast
goes off, a burst of flames at a Pyre kill, a ring of fire or frost thrown out, pale blue lightning crackling along its
path with glowing specks, Spirit Knives trailing pale wisps (the Dual Daggers' model). Sounds: a boom, a crack, a rumble
before Storm Heart, whooshes, a frost chime, a rising whistle, Splinter's ring. Bleeds and burns tick quiet.

## The Lab
F8 → Fate Cards: a column a rarity now (epic and mythic apart).

## What was built
`sim/cards/cardPowers.ts` (the bleeds and burns, bolts, blasts and their queue, the kill, jab, charged punch, break and
big-hit effects, Splinter); `cards.ts` (the 10), `tuning/cards.ts`, `eventsCards.ts`; hooks in `punch.ts`, `thrown.ts`,
`strike.ts` (`landHit`'s `steady`, Fire and Ice), `enemy.ts` (`hitEnemy`'s `steady`: no stagger), `cardMoves.ts` (kills),
`step.ts` (their clock, Splinter), `knives.ts` (homing), `weapons.ts` (12 throws; `throwWeapon` returns its throw). The
look: `engine/cardFx.ts`, `cardFeedback.ts`, `cardSounds.ts`, `knivesView.ts`. Tests: `test-card-moves3.ts`.
