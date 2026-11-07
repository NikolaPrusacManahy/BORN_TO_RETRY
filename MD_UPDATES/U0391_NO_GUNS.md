# Update 0.3.91 — no guns, no Alpha Team

Status: built (2026-11-07), not played. The designer, on the five new guns:

> nope, scrap every guns and the swat character

Asked whether "every gun" took in the Pistol as well, since it's been in the game since 0.2.4: "Remove it too".

## The five guns
The Revolver, Shotgun, Sniper, P90 and Rifle were built in another session, copied to the main folder as an uncommitted 0.3.91, and never committed. They've been taken out, so they're in no commit, and this update takes the number. A copy is still uncommitted in that session's worktree, `.claude/worktrees/elegant-tu-b37c1c`, if it's ever wanted.

## The Pistol
Out of the game entirely, with everything only it used:
- **Rules:** `sim/weapons/gun.ts`, `tuning/gun.ts` (its F1 group), `SHOOTS` in the catalog, a held weapon's `mag`, its combat events.
- **Arms and effects:** `gunArms.ts`, `gunPoses.ts`, `gunFx.ts`, `gunView.ts`, `gunFeedback.ts`, `gunSounds.ts`.
- **HUD:** the ammo counter and the slot's icon.
- **The R key:** Reload's gone from the controls and R is free.
- **Where it was found:** chests, the Lab, the manor's weapons gallery, the credits.
- **Model:** `public/models/weapons/pistol.glb` and `item_pistol` in `items.glb`. `tools/blender/export_pistol.py` and `tools/gun-shots.ts` are gone. The Guns pack stays in `ASSETS`.

**Enemies that shoot are not touched:** the Gunner, Barbara, Barbarossa and the rest.

**Boss cancels:** none needs a gun. Every cue on screen works bare-handed, and the tests hold that for the Dragon's core, the Frost Roc's knees and the Velociraptor's stone. The Velociraptor's Apex Hunt does lose one answer: a shot at its eyes in the half second they flash. A thrown blade or its stone parried back are what's left.

The README no longer lists the Pistol, the R key, Alpha Team on its roadmap or gun models in its credits.

## What that changes in play
- **Uncommon chests** now give gold armour or a Great Heart, so each comes up more often. The other tiers are as they were.
- **The gallery's last row** has two pedestals, the Gold Axe and the Grimoire, centred under the rows of three.
- **Quick Hands** said "Reloads and throws are 40% quicker". With no reloads, all it does is what it also did before: a weapon's charge. It now says "Weapons charge 40% quicker". **My call on the wording.** The card is weaker than it was and I haven't rebalanced it.

## Alpha Team
- **Off the roster:** Joseph, Gravity Sean, the Demon. It never had a kit and could never be played.
- **The dais:** three figures along the same stretch, evenly (z 18.8, 14, 9.2).
- **"Coming soon":** that card's gone, since every locked figure now says how to earn it.
- **The credits:** no Swat.
- **The lobby's kit:** rebuilt without `Char_swat`, 504 KB smaller. The Swat `.blend` stays in `ASSETS`.

The designer's final-game line was "4 playable characters". It's three now, unless another's added.

## Old saves
- A Reload key in a save is dropped; the other keys are kept.
- A save naming Alpha Team comes back as Joseph.
- A saved F1 value for the Pistol is ignored.

## Models checked
Both kits were rebuilt and compared with the old ones piece by piece: only `Char_swat` (lobby, 72 pieces left) and `item_pistol` (items, 22 left) are gone, every other piece has the same vertex count, and neither has shape keys.

## Tests
- **New:** `tests/test-no-guns.ts`.
- **Removed:** `tests/test-pistol.ts`, and the Pistol's streak section of `test-fixes025.ts`.
- **Expected values changed on purpose:**
  - `test-loadout.ts` and `test-keys.ts`: the chest tiers.
  - `test-lab.ts`: 8 weapons, not 9.
  - `test-lobby.ts`: three characters, and its locked figure is now Gravity Sean, saying how to earn him.
- **Changed because they named what's gone, with the same thing checked:**
  - `test-hud-controls.ts`: a sword in hand, no bullets above the slots.
  - `test-alpha.ts`, `test-blows.ts`, `test-style.ts`, `test-shop.ts`, `test-gravity-sean.ts`.
  - `test-fps-key.ts`: Inventory takes the key.
  - `test-card-moves2.ts`: its label.

**Not seen:** the game itself. Nothing here has been played by me, including the dais with three, the gallery's short row and the HUD without the counter.
