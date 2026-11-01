# Update 0.2.22 — builds of Fate Cards; the slam's blast is a card

Status: built (2026-11-01). From the testers' feedback the designer passed on ("Everything at once"); 0.2.21 was the
rest of it.

## Why
- A tester: "Ground smash can be spammed as you go on wall ground smash, go back on wall ground smash, again and again
  -> this can be a Build around ground smash instead of having it at the start".
- "Players really suggest build variety around Fate cards that allows a multiple of gameplay diversities".

## The slam's blast: Tremor
- **The slam stays everyone's** (F, from a real height: the drop, the landing's shake, the bounce after). **Its blast
  is a card now: Tremor** (uncommon, Slam): with it, the landing blasts the enemies near it as before (harder and wider
  the further you fell). Without it, a slam hurts nothing.
- With the Fate Cards off (the lobby's stand) or on ARE YOU EVEN HUMAN? there's no card to find: the blast is as before.
- **Crater and Pogo come only with Tremor** (they're dealt only to one who carries it), as do the two new Slam cards:
  - **Aftershock** (rare): a moment (0.45 s) after the slam's blast, a second one, 60% as hard and as wide.
  - **Scorched Earth** (epic, a pair card: Slam and Kills): what the slam's blast hits burns.

## Builds
- **Each Fate Card is of a build, by the move it changes:** Fists, Kills, Throws (weapons), Movement (dash, slide,
  jump), Slam, Executions. Body, Coins, Bonuses and Luck cards are of none, as are Traitor and Death Cards.
- **A deal leans to your builds:** each card you carry makes the cards of its build likelier (two of a build: twice as
  likely). The rarities' odds don't change; only which card of the rarity rolled.
- **Three of a build light its bonus** (shown on TAB, 2/3 until then):
  - Fists: your fists hit 25% harder (barehanded).
  - Kills: your cards' bleeds, burns, bolts and blasts hit 50% harder.
  - Throws: thrown weapons hit 50% harder.
  - Movement: one more dash charge.
  - Slam: you can slam from 1.6 m up: a jump is enough (2.8 m without).
  - Executions: the execution meter needs 2 fewer kills.

## II: a card dealt again
- **13 cards can grow:** a deal may offer one you carry again, as **II**, stronger (its face says "II" with a gold edge
  inside the frame, and what it does with the new number). A II is about a third as likely as a new card; it's the
  last (never a third time). The shop's card is never a II.
- Collector, Haggler, Jagged Knuckles, Thunderclap, Death Throes, Spirit Knives, Crater: twice as strong. Pyre, Mercy
  Kill, Bloodbath, Powder Keg, Storm Heart (half again as often), Chain Reaction: half again as strong.

## Pair cards (epic)
Dealt only to one who carries a card of each of their two builds.
- **Scorched Earth** (Slam + Kills, and Tremor): above.
- **Static Step** (Movement + Fists): every dash strikes the 2 nearest enemies (within 6 m) with lightning.
- **Shrapnel** (Throws + Kills): a thrown weapon that kills bursts: 30 within 3.5 m.
- **Last Rites** (Executions + Fists): an execution makes every enemy within 8 m bleed.

## A paid reroll
- Over the deal's cards: **Reroll 25**. It deals the deal again (new cards, as a chest would); the next costs 50, then
  75… in the same deal. Dimmed when you can't pay.

## Numbers
All placeholders, on F1 → Builds (the lean, the bonus count, the II chance, the reroll's price, each bonus, the new
cards).

## What was built
`tuning/builds.ts` (the knobs); `sim/cards/builds.ts` (the builds, what can be dealt, the weights); `cards.ts` (the six
cards, `needs`, `pair`, `up`, `boost`, II on taking); `deal.ts` (the weighted deal, the reroll); `cardHits.ts` (split
out of `cardPowers.ts`: what the cards' effects are made of; the Kills bonus); `buildPowers.ts` (Tremor, Aftershock,
Scorched Earth, Static Step, Shrapnel, Last Rites); the bonuses in `cardMoves.ts`, `dash.ts`, `slam.ts`, `thrown.ts`;
`slamHit.ts`, `step.ts`, `execution.ts`. The screens: `FateDeal.tsx` (the reroll), `FateCard.tsx` (II),
`Inventory.tsx` (Builds), `useFate.tsx`, `engine/fateView.ts`, `theme-36-builds.css`; the Lab's Builds column (F8 →
Fate Cards; taking a card twice makes it II). Tests: `test-builds.ts`.
