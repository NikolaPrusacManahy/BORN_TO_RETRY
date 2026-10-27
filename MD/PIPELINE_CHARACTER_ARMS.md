# Pipeline — first-person arms for a character

Every playable character gets its own first-person arms, cut from a rigged Quaternius model in Blender. This is
the process used for the Adventurer test cut (2026-10-27), which the designer approved. The approved guard is
`MD/reference/arms_guard_adventurer.webp`; new characters' `fp.png` should read the same way.

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
   | `fp.png` | The guard from the player's eye: the left fist out front, the right fist low and close, the backs of the hands and knuckles showing, the fingers curled underneath |
   | `hand.png` | Closed fists, the thumb tucked (not sticking up) |
   | `side.png` | No broken wrists or twisted forearms (crumpled sleeves at the elbow are fine: never on screen) |
4. **Fix if needed:**
   - Sleeve cut too short (bare stumps) → lower `--keep` (default 0.5). Shoulder or torso left on → raise it.
   - Thumb sticking out → try `--thumb` variants (x,y,z radians; default `0,0,0.9`). Render each into its own
     folder and compare `hand.png` files with `py -3 tools/contact_sheet.py sheet.png "a=<dir1>/hand.png" ...`.
   - A pose that looks wrong for this character's proportions → change the in-game guard sliders, not the script.
     The script's `GUARD` table is only for previews.
5. **Show the designer** `fp.png` and `hand.png`. Their approval is required before the arms ship.
6. **Ship it** (once the arms are in the game, M1 step 6): copy the `.glb` to `game/public/models/arms/<id>.glb`
   and register it with the character. Never ship the raw `.blend`.

## How the script works
- **The cut:** in every mesh skinned to the skeleton, it keeps vertices whose weights on arm bones (upper arm to
  fingertips) add up to at least `--keep`. Meshes left empty (head, legs, props) are deleted. Mirror modifiers are
  baked in first, because the glTF export skips them.
- **The skeleton stays,** so the game can bend the elbows and curl the fingers in code. The `.glb` is exported in the
  rest (T) pose with no animations.
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
- Fist placement was tuned against a reference photo of a first-person boxing guard: orthodox stance, the left
  fist forward with the thumb on top, the right fist back and low with the back of the hand towards you.
