# Update 0.2.19 — Death Cards and Traitor Cards

Status: built (2026-11-01). The designer: "Now you will also create "Death Cards" * same drops, it also end up in the
same 3 cards pull, it is all rng. * at least think of 15 different annoying cards that can be obtained in chest too and
can make the run a bit painful (risk of rain prob have some), change the cards design so they look a bit different from
the Fate cards * Also "Traitor Cards", it has a good part and a counter part costs with them, think of 10 ones too ...
BUILD NOW". Names and effects are our own (ideas from Risk of Rain 2's curses and lunar items). With them, 66 cards: 40
Fate, 10 Traitor, 16 Death.

## In the deal (numbers are placeholders: F1 → Fate Cards)
- **Same chests, same deals:** each card dealt first rolls its family: **a Death Card 15%**, **a Traitor Card 12%**, else
  a Fate Card (its rarity rolled as before). Never one you carry, never twice in a deal. None left of a family: a Fate Card.
- **A Death Card is bound** (Claude's call, so they bite: knob *Death bound*, 1). It can't be picked alone while another
  card is there, and it **comes with whatever you take**. Dealt only Death Cards, you take them all. *Death bound* 0 makes
  it one to choose like the rest (then nobody would ever take one).
- Death and Traitor Cards have no rarity; a chest's glow counts only its Fate Cards.
- Carried for the run, lost when you die, shown on TAB in their own groups (Fate, Traitor, Death).

## The 16 Death Cards
| Card | Move | Does |
|---|---|---|
| Brittle Bones | Body | You take 25% more damage |
| Leaden Feet | Body | You run 15% slower |
| Short Breath | Dash | Your dashes refill 40% slower |
| Rust | Weapons | New weapons have 40% fewer uses |
| Rotten Grip | Weapons | Your weapons wear out twice as fast |
| Taxman | Coins | The shop costs 30% more |
| Empty Purse | Coins | Kills give 40% fewer coins |
| Ill Omen | Bonuses | Kill bonuses drop half as often |
| Heavy Hands | Fists | Charged attacks take 50% longer to charge |
| Anchor | Jump | You jump 20% lower |
| Glass Heart | Body | 20 less max health |
| Blunted Rage | Executions | The execution meter needs 4 more kills |
| Festering | Body | Every hit on you festers: 2 a second for 3 s |
| Cramp | Fists | Your attacks are 15% slower |
| Black Cat | Luck | Every chest and deal rolls its rarity twice and keeps the worse |
| Shaken | Executions | A hit on you empties your execution meter |

## The 10 Traitor Cards (a gift, a price)
| Card | Move | Gift | Price |
|---|---|---|---|
| Blood Pact | Body | Your hits deal 30% more | You take 30% more |
| Fragile Fortune | Luck | Every chest and deal rolls one rarity higher | 30 less max health |
| Runaway | Body | You run 25% faster | You can't slide |
| Fasting | Executions | The meter fills in 6 kills | The shop won't sell to you |
| Iron Skin | Body | Hits on you are 30% weaker | You run 15% slower |
| Bottled Lightning | Dash | Dashes refill twice as fast | 25 less max health |
| Miser's Oath | Coins | Kills give twice the coins | Every hit you take costs 5 coins |
| Berserker | Fists | Your attacks are 30% quicker | Your dashes refill 40% slower |
| Gambler | Luck | Deals show one card more | One of them is always a Death Card |
| Executioner's Deal | Executions | The meter fills in 4 kills | Executions don't heal you |

- Max health never goes under 10, whatever you carry. Two meter cards: the fewest kills counts; Blunted Rage adds to it.
- No card heals (the designer's rule: healing only from the shop, hearts, rings and executions).

## How they look
All share the one back (the flip is the reveal). **Death:** black, a bone frame, a dashed inner line, a sickly green
glow, a skull behind its mark, "Death" (and "Death · Bound" in a deal). **Traitor:** a gold and purple split frame,
"Traitor", its gift, its price in red below. In a deal a bound card is dimmed and won't take a click while there's a free
card; once you pick, it flies to the pile with your card.

## The Lab
F8 → a new tab, **Traitor · Death**: every one of them to give yourself (Traitor; Death in two columns).

## What was built
`sim/cards/cards.ts` (families, the 26), `deal.ts` (the family roll, bound cards, Gambler, the luck cards; `pickCard`
returns what you took), `tuning/cards.ts`; hooks in `health.ts` (damage taken, Festering, max health), `jump.ts`,
`dash.ts`, `slide.ts`, `items.ts` (run speed), `step.ts` (attack speed, Rotten Grip), `treasure.ts` (prices, Fasting,
chest luck), `loot.ts` (`rollLoot`'s luck), `bonuses.ts` (Ill Omen, coins), `cardMoves.ts` (charge, meter, Shaken,
Miser's Oath), `execution.ts`, `strike.ts` (Blood Pact). The look: `FateCard.tsx`, `FateDeal.tsx`, `Inventory.tsx`,
`fateView.ts`, `theme-33-cards.css`. Lab: `labLists.ts`, `LabPanel.tsx`. Tests: `test-card-moves4.ts`; `test-cards.ts`
reads the Fate Cards' odds with the other families off.
