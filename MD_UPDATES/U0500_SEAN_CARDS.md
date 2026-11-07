# Update 0.5.0 — Gravity Sean's cards and chests

Status: built (2026-11-07), not played. The designer:

> 0.5.0 is the update start

> let's have fate cards for Gravity Sean, cause he won't be able to get any weapons like Joseph. he can get Armour, health and stats increases with rings but no weapons. SO let's make 20 different fate cards, 10 traitor and 10 death cards, only in challenge chest, no need for keys in Gravity Sean runs here. Gravity Sean has a 50% chance to spawn a chests in rooms with a higher chance to get only gold

## How I read it
- **40 cards:** 20 Fate, 10 Traitor, 10 Death. I asked whether that was 20 in all; the designer: "Yes, 40".
- **His own deck:** he's dealt only these, and no one else is dealt them. He used to get Joseph's cards, minus the weapon and execution ones.
- **Only in a challenge chest:** his boss chests no longer deal, and his shop has no Fate Card.

## His chests
- **No keys:** every chest opens with E. No key drops for him and his shop sells none. A won challenge room still holds him until its chest is open and its item taken.
- **50% in each fight room,** on its own seed, so the floor and its enemies are the same floor Joseph would get. The challenge room always has one; the boss's is as it was.
- **70% only gold** in a room's chest (**my number**). The rest: a heart, a silver plate, gold armour, a Great Heart or a ring. Never a weapon or a key.
- **A challenge chest** deals, and always holds an item too: a ring at least, as good as a white key would find (**my call**). The coins-only roll doesn't apply to it.
- **His shop:** what would be a weapon or a key is gold armour or a ring.

## The deck
The numbers are placeholders, all in F1 → Gravity Sean Cards. Every card changes a move of his.

### Fate Cards (20)
| Rarity | Card | Does |
|---|---|---|
| Common | Long Arm | Gravity Punch reaches 25% further |
| Common | Wide Ripple | The third Gravity Punch's wave is 60% wider and harder |
| Common | Loose Stone | Pieces you throw hit 25% harder |
| Common | Thin Air | Your hover lasts 100% longer |
| Common | Prospector | Chests give 100% more coins |
| Uncommon | Cooling Core | Instability rises 30% slower |
| Uncommon | Clean Vent | Switching back hits 50% harder and reaches 2 m further |
| Uncommon | Hard Landing | Ground Slam and your plunge reach 1.5 m further |
| Uncommon | Tidal Force | Black Hole hurts 50% harder |
| Uncommon | Recoil Dampers | Shockwave Punch is ready 30% sooner |
| Rare | Event Horizon | Black Hole pulls from 30% further |
| Rare | Wide Front | Shockwave Punch is 40% wider |
| Rare | Deep Well | Your ultimate meter fills 30% faster |
| Rare | Stored Force | Blows held in Time Stop land 30% harder |
| Epic | Bulwark | While you hold a piece, hits on you are 30% weaker |
| Epic | Head Start | Every floor starts with your ultimate meter at least 50% full |
| Epic | Full Reset | An ultimate makes Black Hole, Shockwave Punch and Ground Slam ready at once |
| Epic | Stone Rain | A piece you throw splits off two more, each 50% as hard |
| Mythic | Singularity | Black Hole pulls in mini bosses too |
| Mythic | Escape Velocity | The first time you'd die, this card burns: 1 health, and time stops |

### Traitor Cards (10)
| Card | Gift | Price |
|---|---|---|
| Overclock | Unstable mode hits 30% harder | Instability rises 100% faster |
| Hollow Frame | Black Hole's cooldown is 50% shorter | 25 less max health |
| Borrowed Mass | Pieces you throw hit 60% harder | Grab waits 4 times as long |
| Reactor Leak | Your ultimate meter fills 100% faster | Every ultimate costs 15 health (it never kills you) |
| Stolen Minutes | Time Stop lasts 4 s longer | You take 30% more damage |
| Meteor Debt | Meteor hits 50% harder | In its zone it hits you too, for 30 |
| Cold Reactor | Instability never overloads: it stays at full | Unstable mode kills don't heal you |
| Black Market | The shop is 30% cheaper | Chests hold only coins (not a boss's) |
| Stripped Suit | You run 20% faster | Armour gives 50% less |
| Point Blank | Gravity Punch hits 40% harder | It reaches 50% less far |

### Death Cards (10)
| Card | Does |
|---|---|
| Short Reach | Gravity Punch reaches 25% less far |
| Leaky Core | Instability rises 50% faster |
| Bad Vent | Switching back hits you too, for 8 |
| Slow Collapse | Black Hole's cooldown is 40% longer |
| Stuck Gears | Ground Slam and Shockwave Punch wait 40% longer |
| Heavy Stone | Pieces you throw fly 30% slower |
| Dim Meter | Your ultimate meter fills 30% slower |
| Lost Hours | Time Stop is 2.5 s shorter |
| Dead Weight | You can't hover |
| Cold Comfort | Your kills heal you 50% less |

**Kept to the rules:** no card heals him more than he heals now, and none makes an enemy tougher.

## Where the deck doesn't go
**The manor's cards gallery:** its walls hold 70 cards and 69 are already up, so his 40 aren't hung. Showing them needs a room or a smaller spacing: the designer's call.

## Also changed
- **His HUD** times each cooldown from what it was when it began, and Time Stop from how long it runs, so a card can't make a clock start part-full or run backwards.
- **The Lab** has his cards in their own columns: Sean and More Sean on the Fate Cards tab, Sean Traitor and Sean Death on the Traitor · Death tab.
- **Card marks:** 10 new line drawings, one per move of his.

## Tests
- **New:** `tests/test-sean-cards.ts`: each of the 40 through what it changes, real blows through `stepCombat`, real chests through `stepTreasure`.
- **Expected values changed on purpose:** `test-cards.ts` and `test-card-moves4.ts` now count Joseph's deck (still 69), and `test-lobby.ts` expects the gallery to hold every card but his.
- **Changed for a new field:** `test-sean-unstable.ts` builds a Time Stop by hand, which now has its length.

**Not seen:** the game itself. Nobody has played any of this, including the cards on screen, the new marks and how his chests feel over a run. Every number but the 50% is mine.
