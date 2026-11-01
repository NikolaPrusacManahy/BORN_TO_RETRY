# Update 0.2.16 — Fate Cards (wave 1) and the inventory

Status: built (2026-10-31). The designer, after 0.2.15's Scars: "instead of scars scattered on the floor... when we open
a chest... if you are lucky, you might not get a normal drop but you get sets of card you pick"; "open a chest, blurry
background, smoothly present the cards, they are appearing one by one, like a deck card would be... hoover with the
mouse and it reveals it by sliding it up a bit so you can read the effect. when selecting one, it slides out and nice
animation that make it smaller and drags toward the Player HUD"; "Press TAB to display what does the player has
currently equiped, like a invetory where they can inspect what they have on them"; "scars are turned into ..."; then
**"Fate cards"**, **"25% is fine"**, **"We need rarity too, grey, green, blue, purple, Red … same as drops but we need to
creates different effects that matches the rarity and power of the card"**, "Have a look at risk of rain 2 and their
long list of effects and try to find something that can be useful or very good example", and "You can start wave 1, but
the names are very similar if not same soo.. let's not do that". The 0.2.15 Scars (floor offer) are gone: they're 14
of the cards.

## When you get cards
- **A boss's chest** (not the run's last) **and a challenge room's** always deal. The boss's still gives its coins and its
  heart (no key, since 0.2.15); the challenge room's deals **instead of its item**, and its gates open once you've taken
  a card.
- **A chest opened with a key** deals **one time in four** (F1 → Fate Cards → Deal chance) **instead of its loot** (no item,
  no coins). **A gold chest never.**
- **Three cards** a deal, each rolled **as a chest's loot is** (common 45, uncommon 30, rare 15, epic 8, mythic 2), **the
  key counting**: a white key's are rare or better, a gold key's epic or mythic. A boss's or challenge room's deal has
  **one rare or better at least**.
- **Only cards you don't carry**, none twice. Nothing left to deal: the chest gives its loot as before.
- **ARE YOU EVEN HUMAN?**: no chests, so no cards.

## The deal (the screen)
The chest's lid lifts and the world **holds still and blurs**; the mouse is freed (no pause menu). A **deck** at the
bottom **deals the cards one by one**, each flipping face up into a row low on the screen, **the lower half (what it
does) below the edge**. **Hovering a card lifts it** so it reads whole, its glow brighter. **A click takes it**: it lifts,
**shrinks and flies to the card pile by your coins**; the others drop away; the mouse locks again (from that click) and
play goes on. **You must take one.**

**A card's face** (made in code): a dark card framed in its rarity's colour (grey, green, blue, purple, red: the chests'),
its rarity and the move it changes along the top, its mark (a line drawing a move: dash, slide, slam, fists, weapons,
executions, bonuses, body, jump, kills, coins, luck) on a glow, its name, what it does. Its back: crimson, a diamond.

## TAB: what you carry
**TAB** (Settings → Controls → Inventory) opens it; the world holds still and blurs. Your **Fate Cards** (hover one to
see it big), and beside them your **health, armour, dashes, coins**, your **weapons** and their uses (the one in hand in
gold), **rings**, **keys** and the **kill bonuses on** (seconds left). TAB again plays on; Esc goes to the pause menu.

**The HUD**: a little crimson card pile with how many you carry, after your rings.

## The 30 cards (all numbers are placeholders but the 25%: F1 → Fate Cards)
Ideas from Risk of Rain 2's items; the names and the effects are ours, made for our moves. Each once a run; lost when
you die (WEAKLING keeps them, as everything).

| Card | Rarity | Move | Does |
|---|---|---|---|
| Slingshot | Common | Slide | A jump out of a slide carries 50% more speed |
| Second Wind | Common | Dash | A wall run gives you back a dash |
| Hoarder | Common | Bonuses | Kill bonuses last twice as long |
| Collector | Common | Weapons | New weapons have 50% more uses |
| Hard Head | Common | Body | Every 10th hit on you does nothing |
| Light Bones | Common | Jump | You jump 20% higher |
| Quick Hands | Common | Weapons | Reloads and a weapon's charged attack are 40% quicker |
| Blood Money | Common | Coins | Every hit you take drops 3 coins for you |
| Haggler | Common | Coins | The shop is 15% cheaper (its tags show it) |
| Shoulder Charge | Uncommon | Dash | Dashing into an enemy throws it back and staggers it |
| Bowling | Uncommon | Slide | Sliding into an enemy throws it back and staggers it |
| Crater | Uncommon | Slam | The slam's ring grows with height, up to twice as wide |
| Hair Trigger | Uncommon | Fists | The charged punch is ready in half the time, for a dash |
| Air Butcher | Uncommon | Executions | Kills while you're in the air count twice on the meter |
| Bloodrush | Uncommon | Kills | A kill makes you 30% faster for 2 s |
| Killing Spree | Uncommon | Kills | 3 kills within 2 s: attacks 30% quicker for 4 s |
| Cold Snap | Uncommon | Fists | Charged punches and slams freeze what they hit for 1 s |
| Pogo | Rare | Slam | A slam that kills bounces you back up 5 m |
| Ricochet | Rare | Weapons | A thrown weapon bounces on to the nearest enemy |
| Iron Knuckles | Rare | Fists | A punch on a mini boss winding up makes it start over |
| Adrenaline | Rare | Executions | An execution refills your dashes; 2 s untouchable after |
| Mercy Kill | Rare | Kills | Any hit finishes an enemy under 15% health |
| Updraft | Rare | Jump | One more jump in the air |
| Bloodbath | Epic | Executions | An execution's blast reaches 6 m |
| Restless | Epic | Dash | 2 more dash charges, refilling 30% quicker |
| Giant Killer | Epic | Kills | Kill a mini boss: 5 s of free dashes and an instant charged punch |
| Fortune's Favour | Mythic | Luck | Every chest and deal rolls its rarity twice and keeps the better |
| Reaper's Rhythm | Mythic | Executions | The meter fills in 5 kills; an execution leaves it half full |
| Born Again | Mythic | Body | The first time you'd die the card burns instead: 1 health, 3 s untouchable |
| All In | Mythic | Fists | Your fists hit twice as hard; your max health is halved |

No boss is staggered, stalled, frozen or finished early by a card. No card heals (the designer's rule); All In is the one
that adds damage, as a trade-off (asked of the designer; built as listed in wave 1).

Changed from the list as proposed: **Hard Head** is every 10th hit, not 1 in 10 at random (no dice in your body's rules);
**Quick Hands** quickens reloads and a weapon's charge (a throw's wind-up is only 0.12 s: nothing to quicken); **Cold Snap**
freezes (the snowflake's freeze: enemies have no slow); **Iron Knuckles** is for mini bosses (any hit already staggers the
rest).

## Wave 2 (not built)
The cards that need new effects drawn: bleed, lightning, flames on kill, homing blades, explosions (proposed: Serrated,
Static Fists, Wisp, Cinders, Ceremonial Blades, Behemoth, Twin Bands, Tesla Heart, Volatile Souls, Thousand Blades;
they get our own names too).

## The Lab
F8 → **Fate Cards**: **Deal 3** (as a chest's), or any card given you, a column a rarity.

## What was built
`sim/cards/cards.ts` (the cards: rarity, move, name, what each does; carrying, taking), `deal.ts` (dealing: rarities,
the pool, the big fights' rare), `cardMoves.ts` (the effects in a fight and their clocks); in place: `treasure.ts` (deals,
Haggler's `offerPrice`), `loot.ts` (Fortune's Favour), `reward.ts` (a challenge room waits for your card), `health.ts`
(Hard Head, Born Again, All In, the hits Blood Money counts), `jump.ts` (Light Bones, Updraft), `dash.ts` (Restless, Giant
Killer's free dashes), `wallRun.ts`, `slamHit.ts`, `punch.ts`, `strike.ts` (Mercy Kill, the kills' cards, the meter's),
`execution.ts`, `gun.ts`, `bonuses.ts`, `items.ts` (Bloodrush). `tuning/cards.ts` (F1 → Fate Cards), `eventsCards.ts`.
The engine: `run.ts` (a deal holds the world and goes to the page; TAB), `fateView.ts` (what the screens show), the
callbacks (`runLinks.ts`, `GameView.tsx`). The page: `screens/FateCard.tsx`, `FateDeal.tsx`, `Inventory.tsx`,
`useFate.tsx`, `theme-33-cards.css`; the HUD's pile; the Lab's tab; the Inventory binding (Tab). Sounds and effects in
code (`cardSounds.ts`, `cardFeedback.ts`). The 0.2.15 floor offer is gone (`scarOffer.ts`, `scarLook.ts`, the drops'
flight). Tests: `test-cards.ts` (dealing), `test-card-moves.ts` (the first 14), `test-card-moves2.ts` (the new 16).
