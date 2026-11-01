# Update 0.2.15 — Scars: one choice after each big fight

**Replaced by Update 0.2.16 — Fate Cards** (`U0216_FATE_CARDS.md`): the 14 Scars are 14 of the cards, dealt from chests
on a screen instead of bouncing onto the floor.

Status: built (2026-10-31). The designer asked "is this even a rouge like?"; Claude's answer: yes, but a run changes
the map more than how you play. Claude proposed in-run choices; the designer: "Yes, propose some", then "Yes, build
Scars". The open questions were left to Claude's picks: the name **Scars**, offered **after bosses and challenge rooms**
(not every room), and **none on ARE YOU EVEN HUMAN?** (it has no chests, so no offers).

## How it works
- **After a boss and a challenge room**, the chest's loot comes with **three Scars**. After the first build, the
  designer: "it does not get picked up automatically, when opening a chest it bounces out and land on the floor, 3 of
  them and if you pick one, the other 2 dissapears". So they're **thrown out of the chest's top, tumbling, and land on
  the floor** with a little bounce (0.9 s) in an arc 3 m before it (nearer, 2.4 or 1.9 m, if something's in the way;
  never in a pit). Nothing takes one while it's in the air, and walking over one doesn't take it: **E does, and the
  other two fade.** Each has its card.
- **The boss's chest gives no key any more** (the designer: "the chest on a boss won does not give a key anymore, it
  gives scars"): its coins, its heart over it, and the Scars. The challenge room's item still waits over its chest.
  Leaving without a Scar is allowed (the challenge room's gates open once the chest's item is taken, as before).
- **The run's last boss offers none** (the run ends there: floor 5 in the alpha).
- Each Scar **changes one of your moves for the rest of the run**. You carry each at most once; only ones you don't
  carry are offered. They go down the floors with you and are lost when you die (WEAKLING keeps them, as it keeps
  everything).
- **No Scar adds damage or healing** (the designer's rule for items).
- **The card**: its name in crimson, "Scar · the move it changes" where a rarity would be, and what it does.
- **The HUD**: the Scars you carry sit after your rings, beside your coins: three claw marks glowing the colour of their
  move. **The pause menu** lists them: name, move, what it does.
- **The look** (made in code): three glowing crimson claw marks with a white-hot core, in a glow the colour of their
  move (dash blue, slide orange, slam amber, fists red, weapons steel, executions crimson, bonuses gold), turning and
  bobbing like other items. Sounds are code-made placeholders.

## The 14 Scars (two a move, and two more; all numbers are placeholders: F1 → Scars)
| Scar | Move | Does |
|---|---|---|
| Shoulder Charge | Dash | Dashing into an enemy throws it back and staggers it (no damage; once a dash). |
| Second Wind | Dash | Starting a wall run gives you back a dash. |
| Bowling | Slide | Sliding into an enemy throws it back and staggers it. |
| Slingshot | Slide | A jump out of a slide carries 50% more speed. |
| Crater | Slam | The slam's ring grows twice as fast with height, to twice as wide. |
| Pogo | Slam | A slam that kills bounces you back up 5 m, high enough to slam again. |
| Hair Trigger | Fists | The charged punch is ready in half the time (0.5 s), for a dash; with no dash to pay, as before. |
| Iron Knuckles | Fists | A punch on a mini boss winding up makes it start over. (Any hit already staggers every other enemy.) |
| Collector | Weapons | Every new weapon (drops, chests, the shop) has 50% more uses. |
| Ricochet | Weapons | A thrown weapon that hits an enemy flies on to the nearest other within 12 m and hits it too (once). |
| Bloodbath | Executions | An execution's blast reaches 6 m (was 2.5): a crimson ring shows it. |
| Adrenaline | Executions | An execution refills your dashes; you're untouchable for 2 s after. |
| Air Butcher | Executions | A kill while you're in the air counts double on the execution meter. |
| Hoarder | Bonuses | Kill bonuses (snowflake, gold ingots, blue potion) last twice as long. |

Shoulder Charge and Bowling never stagger a boss or a mini boss (they're still shoved); Iron Knuckles never stalls a
boss.

From the proposal, left for later: Afterimage (a dash ghost enemies attack), Burning Trail (a slide's fire), Cracked
(a jab mark that a charged punch sends flying), Boomerang (a Q throw that comes back), Shrapnel (a breaking weapon's
blades). Then Pacts and weapon twists, if Scars work.

**The pool and the picks**: a full alpha run can offer up to 9 choices (4 bosses, 5 challenge rooms) from 14 Scars, so
a long run ends up with most of them. The full game (7 floors) would offer up to 13: the pool should grow before then.

## The Lab
F8 → Items → **Scars**: **Offer** throws three out in front of you, as out of a chest; each Scar alone falls at your feet (walk
over it to take it). The two columns are Scars and More Scars.

## What was built
`sim/scars/scars.ts` (the Scars, their cards, carrying, taking), `scarOffer.ts` (the offer's arc), `scarMoves.ts`
(Shoulder Charge, Bowling, Pogo, Hair Trigger, Iron Knuckles, Ricochet); in place: Second Wind (`wallRun.ts`),
Slingshot (`jump.ts`), Crater (`slamHit.ts`, which now reports its kills), Collector (`strike.ts`, `items.ts`), Bloodbath
and Adrenaline (`execution.ts`), Air Butcher (`strike.ts`, `CombatState.inAir`), Hoarder (`bonuses.ts`). Drops hold
Scars (`drops.ts`: `Drop.offer`, the pool 12); chests know if they offer Scars (`Chest.scars`;
`createDungeonRun(level, last)`). `tuning/scars.ts` (F1 → Scars), `combat/eventsScars.ts`; the view: `scarLook.ts`,
`scarFeedback.ts`, `audio/scarSounds.ts`, the card (`promptView.ts`), the HUD (`Hud.tsx`), the pause menu
(`PauseMenu.tsx`, `theme-33-scars.css`), the Lab (`labLists.ts`, `labCommands.ts`). Tests: `test-scars.ts` (the offer,
taking, carrying, the Lab) and `test-scar-moves.ts` (each Scar against the move without it). Checked on 240 real floors:
every Scar on offer lands on free ground with no wall between it and its chest. The boss's loot (`bossRoom.ts`
`BOSS_LOOT`) is its heart alone; a drop can be in flight (`Drop.land`, `from`; `scarLand` as it lands; `treasureFx.ts`
draws the arc).
