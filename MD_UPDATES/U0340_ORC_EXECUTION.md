# Update 0.3.40 — the Orc's execution, reworked

Status: built (2026-11-04). The designer: "I am here to talk about executions upgrades / reworks", then "I have that
ULA 1 & 2 lib now with a lot of animation, plus we can use a better use of Blender: is there a way to rework stuff?
like make stuff more accurate? are the animations in lib useful for this?", then "Yes, Orc's first", and during the
build: "the right hand looks absolutly crazy bad when lifting the body".

## Why the Orc's first
The Orc's execution is used by 28 kinds, more than any other: the Orc, the Tribal, floor 4's warband, Skull Cove's
pirates, the Moon's astronauts and floor 8's martial artists. Nearly all of them are humanoids on two rigs the
Universal Animation Library (`ASSETS/QUATERNIUS/ULA 1`, `ULA 2`: 254 clips on one 65-bone skeleton) can drive.

## What was wrong (seen in renders of the game's own code: `tools/exec-shots.ts`)
- **The body:** it was a statue. Held, it played its run cycle at 3× speed. Each blow only jolted it back 6 cm.
- **Your right hand on its head:** a flat, open hand with the fingers straight up, slapped on its face. The keys asked
  for the palm down on top of its head, but its head is above your eye. The fingers' way, worked out as "up across
  the palm", then pointed back at you, so the hand came out as a starfish.
- **The uppercut:** the fist came in from the lower right like a jab angled up, its back up.
- **The burst:** on its last moment the body was dropped to the floor, a metre under your fist. It burst there, out of
  view. The other held bursts did the same.

## What it does now
- **It moves as a body does.** Its own clips, baked into `orc.glb` from the library by `tools/ual_exec.py`:

  | When (s) | Clip | From the library |
  | --- | --- | --- |
  | 0 | `Exec_Lift`: it buckles as your hand takes it, then is drawn up arching | `LiftAir` (×1.6) |
  | 0.3 | `Exec_Hang`: hangs kicking, clawing at your arm | `LiftAir_Idle_Loop` |
  | 0.5 | `Exec_Flail`: flails as it's tossed | `LiftAir_Fall_Air_Loop` (×1.3) |
  | 0.83 | `Exec_Fold`: curled round the blow (landed by 0.85) | `LiftAir_Hit_R`, its moment at 0.3 |

  It hangs from its grip as the clip poses it (`exec/body.ts` `posedGrip`), so its head stays in your hand.
- **Your claw on its face:** the palm on it, the fingers curled up over its brow, the thumb at its cheek, the wrist
  nearly straight (under 40°). A new hand shape (`claw`, half open). Its fingers' way is now given in the key. As it's
  tossed, the hand opens, palm to it.
  - **Tried:**
    - the fingers straight up (the wrist bent 60°);
    - the fingers on along the forearm (straight, but the hand only reached its jaw);
    - kept: between the two.
  - The view looks up a little more as you take it (12° → 19°), so the claw sits in the middle of the view.
- **The uppercut is the library's** (`Melee_Uppercut`, thrown with its left hand, mirrored):
  - 0.63–0.71: the fist dropped by your right hip, palm up, out of view;
  - 0.85: straight up into its belly, knuckles up, the palm towards you, the back of the hand to it;
  - 1.0: carried on up past it.

  Your left stays in its guard (it was a raised fist filling the left of the view).
- **It bursts where you hold it,** in front of your fist. Its blood bursts from there too. Its body is still counted at
  the floor below, for what drops and what's hurt around it.

## The others that share its moves
- They keep their thrashing body until their models get the clips. The code plays the clips only on a model that has
  all four.
- Your hands (the claw, the uppercut) and the burst where you hold it are theirs now as well.
- **Next, if the designer likes it:** run `ual_exec.py` on the Ultimate Monsters humanoids (the Tribal, the pirates,
  the astronauts: the Orc's rig) and the people (floor 4's warband, floor 8's fighters: `ual_people.py`'s rig). Each
  needs its renders checked.

## Files
- **The victim's clips:**
  - `tools/ual_exec.py` (new): run again after re-exporting `orc.glb`;
  - `tools/ual_people.py`: its clip-building and writing shared;
  - `public/models/enemies/orc.glb`: 702 → 923 KB.
- **Played while held:**
  - `engine/exec/looks.ts`: `clips`, `execClipAt`;
  - `engine/enemiesView.ts`;
  - `engine/exec/body.ts`: `posedGrip`;
  - `engine/exec/execScene.ts`: the posed grip, and the burst where it's held.
- **The hands:**
  - `engine/exec/handMoves.ts`: `claw`, `fingers`, `back`, the Orc's keys;
  - `engine/exec/hands.ts`;
  - `engine/viewmodel/heldGrip.ts`.
- **The rules:**
  - `sim/combat/execMoves.ts`: the view at the grab;
  - `sim/combat/execution.ts`: the burst's event where it's held.
- **Tools:** `tools/exec-shots.ts` takes extra moments (`EXEC_AT=0.15,0.35,…`).
- **Tests:** `tests/test-exec-orc.ts` (10 checks):
  - its clips;
  - its face under your hand;
  - your wrist under 40°;
  - the back of your hand to you;
  - its clip posing it;
  - the uppercut knuckles up, palm to you;
  - the burst where it's held;
  - the Tribal as it was.

## Unseen
- Seen only in Blender renders of the game's own code, before and after at the same moments.
- Feel unverified: please play it (Lab → floor 1, an Orc, E with the meter full).
