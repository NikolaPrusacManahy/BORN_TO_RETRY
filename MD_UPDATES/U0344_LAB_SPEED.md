# Update 0.3.44 — floors from the Lab at full speed

Status: built (2026-11-04). The designer: "Only room 1 runs at 144 fps stable, the remaining is max 60 and drops to 40 on
fights". After several wrong tries, the designer found the pattern: floor 1 entered from the lobby ran at 144; every floor
started from the Lab ran at 60–72, floor 1 too.

## The cause (measured)
- **A hidden body for every kind, in every slot.** The enemies' view keeps one body of each kind it has loaded in each of
  its 16 slots, hidden until the slot needs it (`engine/enemiesView.ts`). They were all in the scene.
- **The Lab loads every kind** (since 0.3.24, so any enemy can be called up): 97 kinds. That makes 48,689 objects (bodies
  and their bones), against about 3,000 on a floor's own run.
- **three.js walks every object in the scene before each frame, hidden or not,** to update where it is. With the Lab's
  48,689 objects that took about 16 ms a frame (measured headless), inside the draw.
  - On the designer's PC (F2, while trying): the graphics card took 1–2 ms a frame and the game's rules under 1 ms, but
    each frame was stuck about 13 ms in the draw: every second refresh of a 144 Hz screen.
- **A normal run from the lobby never had it.**
- **Not the floors, the shadows or the resolution:** they changed nothing on the designer's PC. That work (the first
  0.3.44, see below) is shelved.

## The fix
- **A slot's body is in the scene only while the slot shows it.**
  - The hidden ones wait outside the scene.
  - When an enemy of a kind comes into a slot, that kind's body goes in.
  - When the enemy goes, its body comes out.
- **Measured, the Lab with no enemy out:** 48,689 objects walked each frame → 35; the walk 16.2 ms → 0.006 ms.
- **Unchanged:** how enemies look, move, die or are executed. Normal runs gain the same, on a smaller scale.

## Files
- `engine/enemiesView.ts` (`attach`: a body not added to the scene; `update`: added when its slot shows it, removed when
  the slot moves on).
- Tests: `tests/test-lab-speed.ts` (4 checks):
  - no body in the scene with no enemy out;
  - enemies out, only their bodies;
  - a slot's enemy gone, its body out;
  - the walk far shorter.

## Shelved (not in this update)
- **The first 0.3.44,** on the wrong cause:
  - the stone floors' far copies;
  - rooms behind walls not drawn;
  - light pieces in one draw;
  - F2's graphics-card timer;
  - Render scale and Shadows settings.
- **Not in main** (restored to 0.3.43 on the designer's word). Its files are saved apart.
- **Coming back:** only if wanted, one piece at a time, each checked on floor 1.

## Seen
- Played: every floor started from the Lab at 144 fps on the designer's PC ("Yes, 144", "all floors"), as floor 1 from
  the lobby.
