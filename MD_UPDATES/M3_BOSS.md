# M3, third slice — Update 0.0.15: the first boss, the Demon

Status: built (2026-10-28), from the designer's go-ahead on the pitch ("Build the Demon"):
- Build the Demon as pitched; make him bigger, with aura effects.
- The boss room's presentation: on entering, the camera moves out of first person into a cinematic. The walls expand smoothly, as if the room were reshaping, while the boss's energy comes out of a portal in the middle of the room. He takes a stance, with his name shown beside him. Then the view goes smoothly back to first person and the battle starts.
- When the boss is defeated, he freezes in the air, slowly drops to the ground with a flickering white effect, then explodes. This opens the end gate: a wooden gate, unlike the pack's iron bars, leading into the dark. It offers floor 2.

## The boss room
- It replaces the exit room at the end of the way (no trapdoor any more). It is 30 × 30 cells (60 m), drawn as a quarter (`BOSS_ROOM` in `rooms.ts`):
  - open in the middle, for the portal;
  - four columns and eight broken columns, to run the charge into;
  - a jump pad in each corner;
  - eight spots along the walls for the grunts it calls.
- Before the show you walk into a smaller room: 16 cells across the wall you came in by, and 14 deep. **(placeholder)**
  - Solid blocks of wall fill the rest; they are brick-faced like any wall and dark on top.
- Red on the minimap.
- **The way down:** a wooden gate in the middle of the far wall, opposite the door you came in by.
  - Behind it is a short dead end of pure black: no light reaches it and no haze.
  - The next floor's name (`FLOOR 2`) glows faintly in the dark once the gate is open.
  - The gate is shut until the boss is dead.
  - Stepping into the dark fades to black. The next floor loads under the black, and its name shows as the black clears.
  - The board's margin grew from 2 to 4 cells, so the dark fits beside a room on the board's edge.
- **The gate:** built in code from boxes, not from the kit.
  - A dark timber frame with two plank doors, bound in iron and with a ring to pull.
  - A torch on each side of it. Wall torches keep 9 m away from it.
  - It swings outward into the dark over 2.2 s.

## The show (Boss show tab)
1. You step 1.5 m in: the room's gates crash down. The view rises out of your eyes, 12 m over the room, in front of you (1.4 s). Black bars slide in and the rest of the HUD fades.
2. The walls slide back to the room's real walls (2.4 s), and the view drifts aside. The walls grind.
3. A portal opens in the middle (0.9 s):
   - a swirling disc of red and violet;
   - a column of light;
   - sparks rising;
   - a light flooding the room.
4. The Demon rises out of it (1.5 s), slowing as it arrives. The view comes down low in front of it, a little to the side: it stands left of the middle, facing you.
5. Its stance: it raises its trident (1.8 s). The name card slides in on the right: **THE DEMON**, with "Warden of Floor 1" over it. **(placeholder name and title)**
6. The view glides back into your eyes, turned to face it (1.3 s). The bars slide out, its health bar appears along the top, and the fight starts. It waits 1 s before its first move.
- About 8.2 s in all. You don't move or fight meanwhile, and the mouse waits.
- **The camera's shots** (`engine/boss/cinema.ts`): each shot is a place and a point it looks at, and the view eases from one to the next. The walls, the portal and the boss's rise follow the same beats (`introBeats` in `sim/dungeon/bossRoom.ts`).
- There is no player body: the view never looks back at where you stand.

## The Demon (Demon (boss) tab)
- **Model:** the Demon from Ultimate Monsters (`ASSETS/QUATERNIUS/Ultimate Monsters/boss/Demon.blend`, now `used_monster/Boss/Demon.blend`; it came in `big/`) → `public/models/enemies/demon.glb` (`export_monster.py`).
- **Size:** 6.5 m tall (2.3 times the brute) and 1.7 m wide. **(placeholder)**
- **Health:** 1200. It walks at 4.5 m/s. **(placeholder)**
- **It never flinches.**
- **Its moves:** every 1.1 s it picks a move by how far you are (seeded), never the same one three times running.
  - Far (over 16 m): mostly the charge or the volley.
  - Middle: any of the three.
  - Close (under 7 m): mostly the leap.
- **The charge:**
  - Warning (0.8 s): it lowers its head (Duck) and glows red, a red lane shows on the floor along its way, and it growls. It turns slowly meanwhile, so dash aside.
  - Then it runs straight at 24 m/s for up to 46 m. Running into you does 25 damage and throws you aside, once per charge.
  - A wall or a column in its way stuns it for 2.2 s (it shakes its head), and **hits on it do 1.5× damage** while it's stunned.
  - A charge with nothing in its way ends in a short stop.
- **The leap:**
  - Warning (0.7 s): it crouches (Jump) and glows orange, with a rising roar.
  - Then it leaps 9 m high, for 1 s, to where you stood. A ring as wide as its landing's reach shows where it will land.
  - Landing within 5 m of you does 30 damage and throws you, unless you're more than 1.5 m up.
  - The landing sends a **quake ring** rolling over the floor at 16 m/s, out to 28 m. As the ring passes, it does 15 damage and pops you up, but only if your feet are within 0.6 m of the floor: jump it.
  - Then it stands 1 s.
- **The volley:**
  - Warning (0.75 s): it raises its trident (Weapon) and glows violet, with a crackle.
  - Then a fan of 5 fire orbs from the trident's tip at your chest: 14 m/s, 12 damage each, 12° apart.
- **Rage**, at half health:
  - It roars once (arms flung wide) for 2 s and calls 4 grunts at the spots along the walls, away from you. While fewer than two are left, it calls 4 more every 18 s.
  - Its warnings are 0.75× as long and its pauses 0.6×. It walks and charges 1.25× as fast.
  - A charge with nothing in its way goes straight into a leap.
  - Its volley is two fans, the second turned half a gap.
- **The aura:**
  - a glow behind it (always facing you);
  - embers rising round it;
  - a ring of fire at its feet;
  - a red light.
  - In rage, all of these get fiercer and redder, and its body glows red.
- **Its death:**
  - The world slows to 0.3× and eases back over 1.4 s (the mouse never slows), and every grunt dies with it.
  - Its pose freezes. It rises 2.5 m (0.35 s), hangs there frozen (0.9 s), then sinks slowly to the ground (2.2 s), flickering white faster and faster.
  - Then it bursts in a flash: chunks, sparks, a ring and a boom.
  - It leaves **60 coins**, a **key** and a **heart** (heals half): the design's part-heal after a boss, given as a heart (healing only from hearts). **(placeholder)**
  - 1 s later the wooden gate swings open, and the view turns to it and back (2.8 s; Show the gate: 0 turns this off). The room's own gates lift too, so you can go back to the shop.
- **Feel Lab:** "Lab demon" (Demon tab) sends one with the lab's waves, to try the fight without the show.

## Every floor
The Demon is the boss of every floor for now: floors 2 and 3 have no designs yet. Beating floor 3's boss doesn't end the run yet; the run's end and unlocks come with M5.

## Tests
- **`test-boss.ts`** (the rules):
  - the Demon is big and never flinches, and hits do more while it's stunned;
  - every move warns before it can hit;
  - the charge throws you once, crashes into a wall and is stunned, and doesn't crash when it only grazes a wall;
  - the leap lands where you stood, and a jump clears it;
  - the quake hurts once on the ground and misses you in the air or out of its reach;
  - the volley's fan;
  - the rage roars once, warns quicker and fires two fans;
  - the same seed gives the same moves;
  - the death show: rises, hangs, sinks, one burst, slot freed;
  - the whole room: the dark does nothing while the gate is shut; stepping in starts the show; the walls slide; the boss rises out of the portal; the fight starts at the show's end; it calls grunts; killed, they die with it; it leaves a key, a heart and coins; the gate opens after its delay; the dark ends the floor.
- **`test-boss-show.ts`** (the drawing):
  - `demon.glb` has every clip and is drawn 6.5 m tall;
  - the view starts and ends in your eyes (facing the boss), stays in the room and never jumps;
  - at its stance the boss stands left of the middle;
  - the gate shot looks at the gate;
  - the sliding walls fill the room's edges and nothing of the small room, and are gone at the end;
  - the gate swings out into the dark, which is black and unlit;
  - the run holds you still during the show, slows as the boss dies, and goes down once the dark is black.
- **`test-dungeon.ts`:** the way ends in the boss room; over 60 floors the dark sits opposite its door, on empty ground, walled round and reachable.
- **Look without a browser:** `tools/boss-shots.ts` + `render_dungeon.py --day --demon`, which renders:
  - the room with its walls at 0, ½ and 1;
  - the gate shut and open;
  - the Demon's stance.
