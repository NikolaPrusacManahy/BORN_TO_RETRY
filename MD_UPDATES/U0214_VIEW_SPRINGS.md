# Update 0.2.14 — The view flying into the sky (alpha fix)

Status: built (2026-10-31). The first alpha feedback, from a tester on a laptop, with two screenshots looking down on
the rooms from high above: "when i jump near a grunt as it attacks, it forces the camera or viewpoint to jump up into
the skybox and down repeatedly … when I collided with the archway in the door my camera got forced up and down … I
got backed into a corner and i got hit with the same camera effect". The designer: "focus on this bug".

## The cause
The camera's landing dip is a spring, stepped once a frame. Below about 12 fps (a frame longer than 0.084 s) each step
overshot more than the last, flipping up and down: a landing at 10 m/s, at 10 fps, had the view 600 km off in 3 s.
Every case the tester names is a landing: a jump, a jump into the arch, and a Grunt's hit (it lifts you 3 m/s). So
their laptop dropped to about 10 fps in those moments. The player's body never left the ground: a fuzz of jumps,
dashes, shoves and Grunt hits against the walls and doorways of floors 1–5 found nothing.

The same was true of the arms' landing dip (under ~11 fps) and the Pistol's recoil (under ~17 fps).

## The fix
`core/spring.ts` `stepSpring`: a spring stepped in slices of at most 1/120 s, so a frame of any length (up to the
0.25 s cap) settles as it does at 120 fps. The camera's dip (`cameraRig.ts`), the arms' dip (`armsMotion.ts`) and the
Pistol's recoil (`gunArms.ts`) use it. Nothing changes at 120 fps and up; at 60 fps the springs are a little more
exact.

Tests in `test-camera.ts`: a landing at 8 and 4 fps stays within the tuned dip and settles; the arms', the gun's and the
stiffest knob's springs at 4 fps never fly off.

## Not in this update
- The tester's frame rate itself (about 10 fps). The designer: "maybe we can have a an adaptative saclling? or just an
  option to choose resolution in the settings, but now now". Later.
