# Pipeline — first-person arms for a character

Every playable character gets its own first-person arms, cut from a rigged Quaternius model in Blender. This is
the process used for the Adventurer test cut (2026-10-27), which the designer approved.

The game's guard is `MD/reference/arms_guard_gameplay.webp` (Update 0.0.3): fists low in the corners, the centre
clear. New characters' `fp.png` should read the same way. The first, photo-based guard
(`MD/reference/arms_guard_adventurer.webp`) put the left fist almost on the crosshair, which the designer found
uncomfortable to play with.

## What you need
- A **rigged** Quaternius humanoid as a `.blend`. Best source: *Ultimate Modular Men → Humanoid Rig → Individual
  Characters → Blend* (no animations, Mixamo-ready skeleton).
- Quaternius bone names: `UpperArm.L/R`, `LowerArm.L/R`, `Hand.L/R`, finger bones `Index/Middle/Ring/Pinky 2–4`,
  `Thumb2–3`, `Head`. The script stops and lists anything missing.
- The pack's license file. Quaternius packs are CC0 (sellable, no credit required; a thank-you line in the credits
  is still nice).
- Blender 5.0 (`C:\Program Files\Blender Foundation\Blender 5.0\blender.exe`) and Python 3 with Pillow.

## Steps
1. **Stage the file.** Put the `.blend` in `ASSETS/QUATERNIUS/<pack>/...`, keeping Quaternius's folder names.
   `ASSETS/` is git-ignored.
2. **Cut and render** (from `game/`):
   ```
   "C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" --background --disable-autoexec "<character.blend>" --python tools/blender/cut_arms.py -- --glb "<out>/arms_<id>.glb" --previews "<out>"
   ```
   `--disable-autoexec` stops scripts saved inside a downloaded `.blend` from running.
3. **Check the four previews:**
   | File | What to look for |
   |---|---|
   | `rest.png` | Both arms, with sleeves or gloves, and no chunks of shoulder or torso |
   | `fp.png` | The guard exactly as the game frames it (68° vertical FOV, 2:1): both fists low in the corners, the centre clear, the backs of the hands and knuckles showing, the fingers curled underneath |
   | `hand.png` | Closed fists, the thumb tucked (not sticking up) |
   | `side.png` | No broken wrists or twisted forearms (crumpled sleeves at the elbow are fine: never on screen) |
   | `export.png` | The T-pose with closed fists: what the game loads |
4. **Fix if needed:**
   - Sleeve cut too short (bare stumps) → lower `--keep` (default 0.5). Shoulder or torso left on → raise it.
   - Thumb sticking out → try `--thumb` variants (x,y,z radians; default `0,0,0.9`). Render each into its own
     folder and compare `hand.png` files with `py -3 tools/contact_sheet.py sheet.png "a=<dir1>/hand.png" ...`.
   - A pose that looks wrong for this character's proportions → try it with the in-game Arms sliders first. To
     preview other guards in Blender, pass `--guard-json <file>` (overrides `GUARD` entries). The script's `GUARD`
     and `game/src/engine/viewmodel/guard.ts` must hold the same guard (Blender x, y, z = glTF x, −z, y).
5. **Show the designer** `fp.png` and `hand.png`. Their approval is required before the arms ship.
6. **Ship it:** export straight into `game/public/models/arms/<id>.glb` (`--glb` takes that path). The game loads
   `ARMS_URL` in `engine/viewmodel/viewmodel.ts`; once characters exist, each one names its arms file. Run
   `npm run verify`: `test-arms.ts` poses the shipped model and checks the wrists land on target. Never ship
   the raw `.blend`.

## How the script works
- **The cut:** in every mesh skinned to the skeleton, it keeps vertices whose weights on arm bones (upper arm to
  fingertips) add up to at least `--keep`. Meshes left empty (head, legs, props) are deleted. Mirror modifiers are
  baked in first, because the glTF export skips them.
- **The skeleton stays,** so the game can bend the elbows in code. The `.glb` is exported in a T-pose with the
  **fists already closed**: the curl and thumb are baked into the mesh and the rest pose, so the game only moves
  the upper arm, forearm and hand. `--open-hands` exports open hands instead. `export.png` shows what the file
  holds.
- **Update 0.1.6 — the fingers are posed live** on top of the baked fist (`engine/viewmodel/handPose.ts`): the punching fist (thumb folded across the index and middle fingers), grips worked out from each handle's thickness, open hands. The baked fist is still the rest pose (a held weapon's place comes from it). A new character's arms need the same bones (`Index/Middle/Ring/Pinky 2–4`, `Thumb2–3`); check its fists with `tools/hand-shots.ts`.
- **Finger curl:** the script measures which rotation direction curls the fingers towards the palm, rather than
  assuming it.
- **The guard pose (previews only):** fist positions sit relative to the point between the shoulders and scale
  with the character's arm reach. Two-bone IK places the elbows (bending outward), and each bone is turned so the
  back of the hand faces the given way.
- **The arms sit 12 cm in front of the eye** (`VIEW_BACK`), as in other FPS games: the arms are too short to frame
  the guard from the real eye.
- **Axes:** in Blender the character faces −Y. The glTF export turns that into +Z, while Three.js cameras look down
  −Z, so the game turns the arms 180° to face forward.

## Lessons from the Adventurer
- The first try curled the fingers **backwards** (inside-out fists). The curl direction is now measured.
- The thumb stuck up like a fin. Of six angles tried, `0,0,0.9` tucks it.
- Fist placement was first tuned against a reference photo of a first-person boxing guard. It looked right but
  covered the crosshair in play, so the guard was moved to the lower corners. The spots were found by measuring
  where the knuckles land through the game's own arms camera (`test-arms.ts` now keeps the centre clear).

## Lessons from Gravity Sean (Update 0.3.80)
- A character from the same Humanoid Rig pack is Joseph's skeleton, bone for bone: the cut with no options is all it takes, and every guard and grip carries over. Check the lengths against Joseph's first (`test-gravity-sean.ts` does).
- Blender's `fp.png` isn't the game's pose: judge the fists through the game's rig, `ARMS=<id> npx tsx tools/hand-shots.ts <out>`, then `render_view.py` on its `shots.json` and `pov.json`.

## Lessons from the Demon (Update 0.3.70)
- A Bestiary monster's rig isn't Quaternius's humanoid: `--rig ual` takes it to the names the arms know. Its thumb starts at the wrist with its own axes: it's solved, not turned (`tuck_thumb`), and `HandFit` in `handPose.ts` holds its own numbers.
- **Judge a grip from the eye and from all round it.** The designer's reference showed what the fist was missing: fingers wrapped round the handle, hiding it, the whole fist in frame. Render from every side (`weapon-shots.ts` plus an orbit) before guessing.
- **Measure the hand against the handle.** The first grip failed because the handle was too thin for the hand, and the fix that first came to mind (thinner still) was backwards. Print the finger joints in the hand's own frame (`tools/grip-probe.ts`): the loop they close is the handle's size.
- Keep one hammer grip through every pose. Leaned to a fencer's the fingers open to clear the handle, and it shows in front of them. Move the arm instead, and print the wrist per frame.
- A blade pointing away from your eye looks short however long it is. To feel big it has to stand across the view. Grow the blade, not the guard (`export_weapon.py --blade`).
- Look at key frames at full size, not only on a contact sheet: the handle coming back in front of the fingers didn't show on one.
- **A map taken off leaves its factor behind.** The glow map went, its white emissive at strength 2 stayed, and the whole arm drew pure white in the game (0.3.70). Workbench previews don't draw emissive and the tests' models have no textures, so nothing showed it: check the file's own JSON (`test-blazing-arc.ts` does).
