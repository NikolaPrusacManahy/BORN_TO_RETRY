# Update 0.3.41 — the Dragon to floor 1, the Demon gone

Status: built (2026-11-04). The designer: "My goal is to take Boss 1 -> Remove it and take Boss 2 (dragon) to floor 1
boss. Make this new boss a floor 2 boss, fits the venom garden more than a dragon" (the new boss is the worm swarm,
`MD/the-knot-3d-boss.md`), then on the Dragon's numbers: "Keep its strength".

## What changes in play
- **Floor 1's boss is the Dragon,** as it was on floor 2:
  - 1,600 health (the Demon had 1,200), its moves, its rage up in the sky, its 15 coins;
  - in floor 1's boss room (the one the Demon fought in, as the Dragon did before 0.2.23), with the shared portal show.
- **Floor 2 (the Venom Garden):** the Dragon stands in, in its scorched grove, until the worm swarm is built. The Lab
  shows no boss room for floor 2 meanwhile: its own boss isn't made yet.
- **The Demon is gone:** from runs, the Lab (its boss button, its wave knob) and the tuning panel.

## What stays (it was the Demon's, every boss uses it)
- **The charge** (`sim/enemies/charge.ts`):
  - the Dragon's swoop, the Velociraptor's charge, the Blue Demon's, the Drowned King's surf;
  - its events keep their names (`demonCharge`, `demonCrash`, `demonGore`), and so do their sounds and shakes.
- **The death show** (`sim/enemies/bossDoom.ts`, `doomBoss`): it rises, hangs, sinks and bursts. Used by the Dragon,
  the Velociraptor, the Drowned King and the Old Whale.
- **What bosses draw on the floor** (`engine/boss/bossFx.ts`, was `demonFx.ts`):
  - the Dragon's swoop lane and its swing rings;
  - every quake ring;
  - the burst's flash.
- **The tuning group "Bosses"** (was "Demon (boss)"): stunned damage, quake clearance, the default rage mark, the death
  show's four knobs. A saved tuning with the Demon's old knobs loads fine: unknown knobs are skipped.
- **The Demon's roar and slam sounds:** clips the Bone King, the Velociraptor, the Drowned King and the Old Whale play.
  Its own events (warnings, leap, landing, volley, roar) are gone.

## Removed
- **The Demon's own code:**
  - `sim/enemies/demon.ts` and `demonMoves.ts` (all but the charge);
  - `engine/boss/demonView.ts` (`bossIn` moved to `bossIn.ts`);
  - the Demon's entries in the kinds, looks, names, wave costs, crowd roles, the Lab and the death screen.
- **Its model:** `public/models/enemies/demon.glb`. Its source, `Demon.blend`, went back from
  `ASSETS/…/used_monster/Boss` to `unused_monster/big`.
- **Its 27 tuning knobs,** and its five events.

## Tests
- `test-boss.ts`: rebuilt on what bosses share, on the Dragon:
  - a hard hit never flinches it, and a stunned one takes 1.5×;
  - the charge throws you once, crashes into a wall, and doesn't crash on a wall it only grazes;
  - the death show.
- `test-boss-show.ts`: the Dragon's model has every clip it plays, is drawn with its aura, and is gone once it bursts
  (the Demon's checks were these).
- **Moved from the Demon to the Dragon:**
  - the boss room (it screams and calls no one as it rages);
  - the floors' bosses, the bestiary's list, the Lab, the boss skip (8 bosses of their own now);
  - and the tests that used the Demon as "a boss" (cards, parry, crowd, death, rewards, loadout, alpha, blows,
    launch).

## Unseen
- Seen only in tests. The Dragon has fought in floor 1's room before (0.0.18–0.2.22).
- Please play floor 1's boss from a run, and from the Lab's floor 1 Room.
