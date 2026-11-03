# Update 0.3.38 — lighter to run

Status: built (2026-11-03). The designer: "when I boot up the game my PC go full fan speed and warm air gets out …
That sounds so heavy for what it is supposed to be", then "Build fixes 1–3".

## What was wrong (counted from the scenes)
- **No frame cap.** Every time the screen refreshed (144 or 240 times a second on a fast screen), a frame was drawn.
  That included the main menu, which barely moves.
- **The main menu was heavy for a still picture.** The gate scene is 526,000 triangles in 653 separate meshes. All of
  them were drawn again into the moon's shadow map every frame, though nothing in it moves.
- **A floor drew everything, all the time.** Each kit piece was one InstancedMesh covering the whole floor, so none was
  ever left out. Every tile and wall of every room was drawn every frame, wherever you stood: 4–15 million triangles
  (floor 1: 14.8 million). The walls were drawn again in the sun's shadows (4–8 million).

## 1. A floor drawn square by square
- Each piece is now instanced per 30 m square of the floor. A square out of view isn't drawn, and neither is one
  outside the sun's shadow box round you (80 m across).
- **Measured from where you'd stand** (rooms' middles, looking each way):
  - about 36% of a floor is drawn (was all of it);
  - in the shadows, a tenth of its walls or less (was all of them).
  - Floor 1: 14.8 million triangles drawn → about 5.7 million in view. In the shadows: 8.3 million → under 1 million.
- **Draw calls** go up a little (about 240–470 a frame), small enough not to matter.
- **Squares of 12 and 20 m** were tried: hardly less drawn (32%, 34%), many more draw calls.
- **Nothing changes in the look:** the same pieces where they were, the same materials. The pillar finisher, the
  Moon's and Okami's shows (rooms blown away) and the Big Shark's water work on the squares as they did on the whole.
- **Cutting what's past the haze** was measured too: almost nothing is (under 0.8 million). It isn't done.

## 2. The frame-rate cap
- **Options → Graphics → Frame rate:** 30, 60, 90, 120, 144, 165 or 240 fps, or Unlimited. The default is 144.
- **The menus and the pause menu are held to 60 at most**, whatever's chosen (or the lower cap).
- **A cap at the screen's own rate, or over it, caps nothing:** every refresh is drawn. The screen's rate is measured,
  so a screen a hair faster than its number never drops a frame now and then.
- **A cap below the screen's rate** holds on average: 60 on a 144 Hz screen is 60. If the screen's rate isn't a multiple
  of the cap, frames come a refresh early or late. For the smoothest, pick the screen's rate, half of it, or Unlimited.
- The F2 overlay's fps shows the frames drawn.

## 3. The menus lighter
- **Merged:** each menu scene's still pieces that look the same (one material, or Blender's copies of it, such as
  Green and Green.031) are one mesh, baked where they stand.
  - The gate: 653 meshes → 20.
  - The camp: 207 → 17.
  - The same triangles in the same place. Mirrored pieces still face out.
  - The portcullis (it rises) and the gate's glow are kept as they came.
- **Their shadows are drawn once**, not every frame. They're drawn again when the scene shown changes or loads, when
  you come back to the menu from a run, and while the portcullis rises. A run's shadows are still drawn every frame
  (things move).

## Not done (the designer's choice: fixes 1–3 first)
4. **A simpler floor tile and wall in the distance.** Floor 1's stone tile alone is 1,176 triangles, used 5,466 times
   (6.4 million triangles), and the wall about 1,670. Lower-detail copies made in Blender would be swapped in past
   about 15 m. This needs before-and-after renders for the designer to approve the look.

## What was built
- **Engine:**
  - `engine/floorPieces.ts` (new): pieces by square. `dungeonView.ts` uses it.
  - `core/framePacer.ts` (new): the cap.
  - `Game.ts`: the cap, each refresh; the run's shadows every frame, the menus' when needed.
  - `gameBase.ts`: `paused`, seen by the cap.
- **Menus:** `engine/menu/mergeStatic.ts` (new); `menuScene.ts` and `campScene.ts` merged; `menuScenes.ts` (their
  shadows once).
- **Settings:** `state/settings.ts` (`frameCap`), `screens/SettingsFields.tsx` (the Frame rate slider).
- **Tests:** `test-perf.ts` (new):
  - every piece still placed, in squares;
  - from where you start, under half a floor in view; under a third of its walls in the shadows;
  - the cap held below the screen's rate, every refresh drawn at or over it, the menus at 60, old saves given 144;
  - the menus merged with the same triangles in the same place, the portcullis kept, a mirrored piece facing out,
    the shadows drawn again only while the portcullis rises.

## Checked without a browser
- **Tests:** everything above, counted from the scenes.
- **Not yet seen on the designer's PC:**
  - the fans and the fps (F2), before and after;
  - the menus' merged look;
  - the frame cap's feel.
