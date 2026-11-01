# Update 0.2.20 — the shop's Fate Card; half the gold in chests

Status: built (2026-11-01). The designer, after 0.2.19: "you are forcing players to take the bad and the counterpart
cards.... * nope, just random and allow them to pick whatever they want * the shop has only one fate card. floating near,
cost 100 * reduce the amount of gold in chest by x2".

## Death Cards: your choice (a fix to 0.2.19)
0.2.19 made a dealt Death Card *bound*: it came with whatever card you took. Gone: a deal is random (Death 15%, Traitor
12%, else Fate) and you take whichever one card you like. The knob (*Death bound*), the "Death · Bound" label and the
dimmed card in the deal are gone; the 0.2.19 spec says so.

## The shop's Fate Card (numbers are placeholders: F1 → Fate Cards → Shop card)
- **One Fate Card** floats in every shop, **past the end of its row of tiles**: one cell past the candelabrum, on the side
  with the more room (2 m from the candelabrum, 4 m from the last tile; clear of the columns and the doorways).
- **100 coins.** Haggler (−25%) and Taxman (+30%) count; Fasting: the shop won't sell it. You can't buy a card you carry.
- **Which card:** a Fate Card (never a Traitor or Death Card), its rarity rolled like a deal's (the chests' odds; luck
  cards count), never one you carry as you come down the stairs. The floor's own: the same run sees the same card.
- **None** with Fate Cards off (the lobby's stand), on ARE YOU EVEN HUMAN? (no shop), or when you carry every Fate Card.
- **E in reach buys it:** it's yours for the run (the card sound and ring, the jingle), it's gone from the shop.
- **Its prompt** (as a shop item's): its name in its rarity's colour, the rarity, what it does, "[E] to buy"; nearby,
  just the card to read.

## How it looks (made in code)
The card turns slowly, bobbing at chest height (its middle 1.25 m up), lit by a small light in its rarity's colour; its
price tag over it (1.95 m: the coin and 100, red when you can't pay), like the tiles'. Its face is painted on a canvas
like the cards on the page: a dark card in its rarity's frame, its rarity and move along the top, its mark on a soft
glow, its name. Its back is the lobby stand's (crimson, the diamond).

The shop tiles' tags now show what you'd pay (Haggler and Taxman counted; they showed the plain price).

## Half the gold in chests
One knob, **Chest gold ×0.5** (F1 → Items), on every chest's coins: a chest of coins (keyed or gold) holds 5, 10, 15 or
20 (was 10, 20, 30, 40); a boss's chest 7.5 (7 or 8; the Old Whale's 9). Kill coins, the shop's prices and Blood Money
are as they were.

## What was built
`sim/cards/shopCard.ts` (where it floats, stocking it, its price, buying it); `treasure.ts` (the card on the treasure,
its roll last so the rest roll as before; E buys it after the tiles; `offerPrice` by `shopFactor`); `cards.ts`
(`shopFactor`); `deal.ts` (`rollRarity` and `fateOf` take an rng); `focus.ts` (`Focus.card`), `lobby.ts`;
`loot.ts` and `tuning/items.ts` (Chest gold); `tuning/cards.ts` (Shop card). The look: `engine/shopCardView.ts`,
`treasureView.ts` (the card and the tags), `promptView.ts` (a card's lines), `ui/cardMarks.ts` (the marks, shared with
`FateCard.tsx`), `lobby/fateStand.ts` (its back). `runBase.ts` stocks the card as you come down, then draws the shop.
Tests: `test-shop-card.ts`; `test-keys.ts`, `test-gold-chests.ts`, `test-loadout.ts` (halved coins);
`test-card-moves4.ts` (free picks).
