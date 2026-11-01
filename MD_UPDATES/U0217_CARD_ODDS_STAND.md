# Update 0.2.17 — Each card its own chance; the Fate Cards' stand

Status: built (2026-11-01). The designer, after 0.2.16: "I would like to have a chance for each card... not having all 3
card in epic when we get epic once... the challenge room just gives a card guaranteed, not an Epic card guanrenteed ->
that is the idea of the card system"; and "in the lobby just after the Are you human difficulty, put a new stand... a bit
different, asking if the player wants the Cards in their run?"

## Each card its own chance
- **Every card in a deal rolls its own rarity at the chests' odds** (common 45, uncommon 30, rare 15, epic 8, mythic 2).
- **The key a chest was opened with no longer counts** (a white or gold key's deal was all rare-and-up, or all epic and
  mythic), and **a boss's or challenge room's deal no longer has a rare guaranteed**. They guarantee a deal, not a rarity.
- Fortune's Favour still rolls each card twice and keeps the better. Only cards you don't carry, as before.

## The Fate Cards' stand
- **Where:** along the west wall, past ARE YOU EVEN HUMAN?'s altar (short of the dark column).
- **What it looks like** (different from the altars): a small table with a candle at each end, and **a big Fate Card
  floating over it** (made in code). **On:** it turns slowly and glows crimson, "FATE CARDS" on its face. **Off:** it
  settles with its back to the room, grey and still. No sign on the wall (the torch there stays; a sign would run into
  ARE YOU EVEN HUMAN?'s).
- **E** turns Fate Cards on or off; its card says **FATE CARDS: ON / OFF** and **[E] to turn off / on**.
- **Saved** like your difficulty and character (on in a new save).
- **Off:** no chest deals. A boss's chest gives its coins and heart; a challenge room's gives its item; a keyed chest its
  loot. (The Lab's runs always have them on.)

## What was built
`deal.ts` (each card's roll; no key, no guarantee), `treasure.ts` (no deal when off: `CombatState.fate`);
`world/lobby/spots.ts` (`CARD_STAND`), `furniture.ts` (the table, the candles), `sim/lobby/lobby.ts` (the stand: E, its
card), `focus.ts` and `promptView.ts` (turn on / off), `engine/lobby/fateStand.ts` (the floating card), `lobbyView.ts`;
the choice saved and passed to the run (`state/settings.ts` `cards`, `Game.ts`, `gameBase.ts`, `runBase.ts`, `run.ts`,
`runLinks.ts`, `GameView.tsx`, `useLobbyGate.ts`, `useRunStart.ts`, `App.tsx`). Tests: `test-cards.ts` (the odds, off),
`test-lobby.ts` (the stand, the save).
