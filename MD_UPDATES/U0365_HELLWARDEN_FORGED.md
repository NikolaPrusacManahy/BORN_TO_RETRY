# Update 0.3.65 — Hellwarden, forged from your dead

Status: built (2026-11-06). The designer sent a revised shot list and said: "make it memorable and spectacular". It replaces the intro from 0.3.64.

## The shot list (`sim/dungeon/wardenShow.ts`, `engine/hell/wardenCinema.ts`). About 20 s. SPACE skips it.

| Time | Beat | What happens |
|---|---|---|
| 0–2 s | Door slams, torches die | The view whips round from your eyes to the door as an iron slab drops behind the bars. Ten braziers in the small room go out one after another, away from you, each in a puff of smoke. The light dies and the sky goes down. |
| 2–5 s | The bones get pulled in | The walls go back in the dark. A river of lava opens down the room. Seen from high up, then from down among them: every bone on the floor is dragged in, jerking at first, then faster, each ending in a spit of fire. |
| 5–9 s | Molten rise | A bare figure rises slowly out of the lava, head bowed: a black crust split by seams of lava, no armor, no mask, a black hood for a head. |
| 9–12 s | Armor forges on | The chains snap. Each rock cracks in two as its piece of armor flies out and clamps on red hot, with a metal hit and a hard cut: boots, gauntlets, hips, chest, the spiked pauldrons last and biggest. The sword comes up out of the lava last, dull grey. |
| 12–14 s | The sword heats up | The flat of the blade across the view. It draws the sword through its left claws, and the glow follows them from hilt to tip. |
| 14–16 s | The mask | A skull floats up off the heap on the bank and grows horns on the way. Close on it: a dark socket, then the eye ignites white. A hard cut to silence. |
| 16–20 s | Leap and title card | In silence, it crouches and leaps at you. Mid-air, everything stops and the colour drains: its name, and "Forged from the 247 times you fell." A horn swells. It lands and the fight is yours at that moment. |

## The landing is its first attack
You get the controls as it lands, 6.5 m away. A ring is already rolling at you, reaching you about 0.55 s later for 20 damage. Jump or dash it. If you skipped the show there's no ring.

## Tied to your deaths
- The save now counts your deaths (`SaveData.deaths`, added when a run ends in death).
- The freeze frame shows the count: "Forged from the 247 times you fell." One death and none have their own wording.
- The more you've fallen, the more bones are dragged in (up to 140 extra).

## The two extras
- **Phase 2 payoff:** only its left eye is lit for the first half of the fight. At 50% the mask cracks and the second eye lights.
- **Readability:**
  - The orange sky is drawn down through the show and stays 60% down through the fight (F1 → Hellwarden, "Sky in its fight"). The floor's own light isn't touched.
  - Hellwarden has an orange rim light and lava light from below, in its own material, so it costs no extra lights.
  - Its armor is less metallic so it reads as silver: the game has no sky reflection, and metal would have gone black.

## How the armor comes apart
- The hips, thighs, chest, gorget, pauldrons, mask and sword are their own meshes, hidden until they land.
- The boots and gauntlets are part of the body's mesh, so they're told apart by the bones carrying them. They stay molten until they land.
- Pieces in flight are copies made from the pose they'll land on, so they arrive exactly on it.
- `engine/hell/wardenShader.ts`, `wardenForge.ts`, `wardenBake.ts`, `wardenSword.ts`, `wardenSkull.ts`, `wardenPose.ts`.

## Tuning
F1 → Hellwarden, "Show:" and "Its landing:".

## Also
- Its emissive map no longer blacks out its hit flash: it flashes all over now.
- Eyes and blade edge now glow in the game. They didn't before: the game sets emissive to 0 at rest.
- Its bones are no longer in the floor's dressing. They're drawn by the show and gone in the fight.
- `boss-shots.ts --beat=show-door … show-land`, `--tex=` for its texture on the render, `--phase2`.

## Placeholders
- Made in code: the door, the braziers, the rocks, the show's chains, the river and its lava texture, the molten crust, the flames, the mask's crack.
- Sounds: new clips from the Sonniss library (`tools/sfx/recipes/warden.json`), plus synth. Picked by name and measurement. Claude can't hear them: the designer chooses.

## Files
- **New:** `engine/hell/wardenShader.ts`, `wardenForge.ts`, `wardenBake.ts`, `wardenSword.ts`, `wardenSkull.ts`, `throneBones.ts`, `throneDoor.ts`, `throneRocks.ts`; `tools/sfx/recipes/warden.json`; `public/sounds/hell*`.
- **Rewritten:** `sim/dungeon/wardenShow.ts`, `engine/hell/wardenCinema.ts`, `throneView.ts`, `wardenPose.ts`, `wardenLook.ts`, `tests/test-warden-show.ts`.
- **Changed:** `tuning/hellwarden.ts`; `sim/combat/eventsHell.ts`; `sim/enemies/hellwarden.ts`, `wardenBody.ts`, `wardenMoves.ts`; `sim/dungeon/bossRoom.ts`; `world/dungeon/throne.ts`, `ownDressing.ts`; `state/settings.ts`; `App.tsx`; `engine/run.ts`, `dungeonView.ts`, `depthsView.ts`, `level.ts`, `enemiesView.ts`, `enemyLooks.ts`, `hudStore.ts`, `overlayFeed.ts`, `combatFeedback.ts`; `engine/boss/bossShow.ts`; `engine/hell/hellSky.ts`, `hellView.ts`, `wardenFx.ts`, `wardenFeedback.ts`; `audio/audio.ts`, `clips.ts`, `clipPicks.ts`, `wardenSounds.ts`; `screens/BossHud.tsx`; `ui/theme/theme-15-boss.css`; `world/lobby/credits.ts`; `README.md`; `tools/boss-shots.ts`, `tools/blender/render_dungeon.py`.

## Unseen
- The shader couldn't be compiled here: no browser, and no GLSL compiler. If it fails, the boss is drawn wrong or not at all, and the F12 console says why.
- Not played or heard. The shots were checked in Blender renders of the real camera positions and poses, without the game's shaders: the molten crust, the glows and the flames only look roughly right there.
- Not seen moving: the bones dragging, the pieces flying, the claws along the blade, the leap.
