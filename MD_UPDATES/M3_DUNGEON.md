# Milestone 3 — The Run: first slice, the dungeon

Status: started (2026-10-27, Update 0.0.12), from the designer's list: a floor plan different every run (like Soul Knight's levels), at least 8 hand-made rooms with variations, the room loop (step in, doors shut, enemies come), a small minimap, built from the Modular Dungeon Pack parts 1 and 2 ("we're inside dungeons").

## A floor
- Rooms sit on a **5 × 5 board** of slots. The start room is on the bottom row; from it a winding **way of 5 fight rooms** leads to the **exit room** (a trapdoor: the way down). **One or two side rooms** (fights) branch off the way. **(placeholder counts)**
- Rooms are joined by **4 m corridors** through arched doorways in the middle of their walls.
- Everything is on one grid of **2 m cells** (the kit's module). The same seed gives the same floor; Play picks a new seed every run; the next floor down is laid out from the same seed and the floor number.

## The rooms
- **Update 0.0.13 (the designer): twice the size**, 24–36 cells a side, drawn as quarters in `game/src/world/dungeon/fightRooms.ts` (`MD_UPDATES/M3_SHOP_CHESTS.md`). The shop is a side room; one or two fight rooms hold a chest.
- **Nine fight rooms**, drawn as text layouts in `game/src/world/dungeon/rooms.ts` (Update 0.0.13: `fightRooms.ts`): colonnade, crossfire, altar, spike hall, ledges, maze, arena, twin, crypt. Plus the start room and the exit room. None twice on a floor.
- What a room can hold: floor, inner walls (6 m), columns (5 m), low cover (crates, 1.3 m: jump it), high cover (broken columns, 2.9 m), ledges (1 m) and high ledges (2.5 m, by jump pads), spike traps, jump pads, enemy spawn points, the way down.
- **Variations per run:** mirrored either way, a quarter turn (square rooms), and every optional cover on or off.
- The middle two cells of each side stay clear two deep (the doorways). A test lays out 40 floors and checks every floor cell is reachable, every spawn point is free, and the grunts can reach every spot of every fight room (no safe pockets).

## The room loop
- Step properly into a fight room (past its doorway): its gates (iron bars in the arches) **crash down** with a clang and a shake.
- **0.7 s** later the first wave appears at the room's spawn points, at least 6 m from you; each next wave **0.9 s** after the last enemy of the one before dies. **(placeholder)**
- Waves are bought from the room's **budget: 4 + 2 × its depth + 3 × (floor − 1)**, in **2 waves (3 from a budget of 10)**. A grunt costs 1, a spitter 2, a brute 4; no brutes before the third room of floor 1. At most 8 in a wave. **(placeholder)** Update 0.0.13: **6 + 3 × depth + 4 × (floor − 1)**, 3 waves from 18; a leaper or a stinger costs 2 (from the second room), a wraith 3 (from the third); kinds are picked by weight.
- After the last wave: the bars sink, a chime, the gates open. A cleared room stays quiet.
- The **way down**: step on the trapdoor in the exit room: the next floor, with your health, coins and weapon. **Dying starts a new run** (a new floor plan, full health, no coins).

## The minimap
Top right, small: rooms you've been in filled, rooms beside them outlined, the one you're in bright, the start in green, the way down in purple, corridors between known rooms, you as an arrow. It follows you.

## Look
The Modular Dungeon Pack (parts 1 and 2), exported to `game/public/models/dungeon/kit.glb` by `tools/blender/export_dungeon_kit.py`: brick walls three pieces high with a cap, slate floors, stone arches (stretched to the 4 m doorway) with iron bars, rock columns and broken columns, crates, spike traps, stone ledges, wall torches, banners, bones, skulls and rocks along the walls, the trapdoor. Dim cold light, fog, and six warm torch lights that move to the torches nearest you; the way down glows purple. **Update 0.0.13 (the designer: way too dark to play): day time.** The dungeon is open to the sky: a sun from the south-west casting shadows within 40 m of you, a bright sky light, a pale sky-blue haze from 60 to 200 m, eight torch lights as warm accents (tuning tab Dungeon light).

## Later in M3
Reward rooms, rooms with height for the walkers (they walk the floor only for now), more rooms. (The shop and chests came in Update 0.0.13; the boss room at the end of the way, the wooden gate onto the dark and the fade on the way down in Update 0.0.15: `M3_BOSS.md`.)

## Tests
`test-dungeon.ts`: the rooms (even, doorways clear, ≥ 6 spawn points, varied per seed), a floor (the way, side rooms, one room per slot, no repeats, seeded), 40 floors (every cell reachable, every spawn free, no pockets), the level (start on open floor, gates per doorway, merged boxes, the way down), the room loop (gates shut, waves wait, waves come away from you, cleared, the way down), the budgets, the look (every piece in the kit, torches in every room, bars where the gates block).
