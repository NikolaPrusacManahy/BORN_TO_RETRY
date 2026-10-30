# Update 0.2.4 — the Pistol

Status: built (2026-10-30), in the Lab only (F8 → Items → Weapons → Pistol). The designer's list:
- "try to add the pistol gun (not revolver) to the game, hand holding it, we do not see left hand"
- "we can aim with right click and it aims like a normal fps game"
- "reload animation top notch"
- "throw with q key"
- "max 15 bullets"
- "testing testing"
- (Then:) "sorry, 8 bullets per magazine, 40 in total"; "in comparison with fists, when trying to take down one grunt?
  it takes 6 hits, for the pistol it takes 5, so it is a little bit better as an ranged option, but remain a weak
  option in general"

## The gun
- The Quaternius Guns pack's `Pistol.blend` (a 1911), exported in parts the game moves itself
  (`tools/blender/export_pistol.py` → `public/models/weapons/pistol.glb`): the frame, the slide, the trigger, the
  magazine, and marks for the muzzle, the sights, the ejection port and the magazine's floor.
- Held in the right hand at its grip, the knuckles along the sights (a nearly straight wrist). The left arm drops out
  of view, as with a sword.

## Shooting
- Left click: one bullet a click (no faster than 0.14 s apart; a click a moment early is kept). A hitscan shot from
  your eye: the first wall stops it; the first target it passes takes **a Grunt's health over 5** (8 at its 40): **a
  Grunt in 5 bullets**, one fewer than the fists' 6 (the knob is Pistol shots a Grunt, so it holds if the Grunt's
  health is tuned). Every dodge and guard applies (the Skull Orc's front, the Flying Tribal's wards, the Ninja's
  teleport…).
- Spread: **2.2°** from the hip, **0.2°** aimed; each shot in a row adds **0.8°**, fading.
- The view kicks up a little with each shot (less aimed).
- **8 bullets a magazine, 40 in all** (the designer), the magazine included: those are its uses. With none left, the
  next click throws it (as any spent weapon); **Q throws it any time**.

## Aiming (right click held)
- In **0.16 s** the gun comes from the hip to the line of sight: the arm out straight, the rear and front sights on
  the crosshair (the crosshair fades). The view narrows to **0.78** of your FOV, the mouse slows to **0.78**, the
  arms' sway and bob all but stop.

## Reloading (R, rebindable)
- R reloads; a click with the magazine empty does too, and the last bullet fired starts it by itself.
- **1.3 s** with a bullet still in, **1.55 s** from empty. One-handed, since the left hand is never seen:
  1. the gun cants over and comes up, its grip turned to you; the magazine drops out and tumbles away;
  2. the hand dips out of sight below the screen (the new magazine goes in there, with its click);
  3. it comes back up canted; from empty, the slide (locked back since the last shot) is let go home with a jolt;
  4. it settles back at the hip.
- Bullets aren't lost: the magazine fills from what's left.

## Feel
- A shot: the muzzle kicks up about the wrist and the gun comes back (a spring), the slide blows back and returns, the
  trigger moves, a flash of fire at the muzzle, a brass case thrown out to the right, a streak of light racing to
  where the bullet ended, a flash of light round you, a hole where it hit a wall (gone after 8 s), sparks and grit.
- Sounds made in code (the library has no gunshots): the shot, the case tinkling down, a bullet in a wall or a body,
  the magazine out and in, the slide going home.
- HUD: the bullets in the magazine big above the weapon slots (red at 0), the rest small beside it.

## (placeholders)
- Every number but the 8, the 40 and the 5. Where it comes from in a run (shop, chests, drops): not yet, the Lab only.
- Its sounds: code-made until recordings are found.
