# Update 0.3.34 — floor 8's boss, Yokai : Okami, and its show

Status: built (2026-11-03). The designer, on the look test: "Call it "Yokai : Okami" and yes build it". It came with its
moves ("Keep this, cause we need to intro done first and the arena shift after intro") and then its intro, quoted
below. This update is **its model, its show and the arena the show leaves**. Its five moves come next; for now it
fights with its claws.

## Its look (the look test the designer agreed)
- **Its model:** the Bestiary's Lycan, about 5.2 m tall, with no weapon (the designer: "no sword"). Its stance is the
  sword stance with an empty hand (the designer: "the same pose with the katana but just no katana").
- **Fur and markings:** its own texture repainted white, the shading kept and the dark mane turned silver-white. Its
  red markings are our own, in the style of kabuki's kumadori, not Capcom's wolf's:
  - from each eye, a line up over the brow to the ear and one back along the cheek;
  - red inner ears;
  - two bands round each forearm;
  - a line down each thigh;
  - a line down the spine onto the tail.

  Its eyes glow like embers.
- **Fire, rope and shide, made in code:**
  - a mane of fire from its shoulders down its spine;
  - fire at its tail's tip;
  - flames licking round its paws;
  - a wisp of fire back from each eye;
  - a twisted straw shimenawa round its neck, with two paper shide hanging in front.

  All of it rides its bones and moves with every clip. Every tongue of fire flickers, and its tail sways.

## Its show (the designer's intro, about 27 s)
> "Arena shakes, all previous rooms are destroyed at once, the arena expand (2 camera angles) * The floating islands
> all moves and regroup near the arena (2 camera angles) * Okami lands on one island and make it crach on the arena,
> inbedding it there * 3 temples fall from the sy and blocks the exit gate as a nice presentation (2 camera angles) *
> The remaining island shift and merge with the combat arena, becoming a walkable surface once crashed into the arena,
> making this a very dynamic looking arena with bits of island * Okami jumps in the air and slow motion + name * lands
> on ground and start to go back to player POV"

1. **The rooms and the arena.** The view pulls up off you and the whole place shakes.
   - **Angle 1:** circling high over the floor as **every other room blows at once**: a fireball out of each room, its
     pieces flung away.
   - **Angle 2:** high over the arena as **its walls slide out**, to a boss room's size, hold, then to twice that (120 m).
2. **The islands regroup.** The sky's floating islands leave the sky (they're gone from it for the rest of the floor)
   and come in over the arena. Okami's own stops straight over its place; the others hang round it.
   - **Angle 1:** wide from high off the arena's corner as they come.
   - **Angle 2:** from the arena's floor, looking up as they gather.
3. **Okami lands on its island.** It comes down out of the sky in a streak of fire onto its island. The island falls
   with it on it and **crashes into the arena**, where it stays embedded: the biggest jolt of the show. The view is
   on the floor, looking up and following it down.
   - Then (the designer: "it shakes so much that the camera angle shows a far wide shot of the shock wave blowing
     everything away") **the view cuts far and wide off the arena**, pulling back. A wall of shock races out over the
     whole arena from the crash, with a storm of dust and flung rock, and the islands still hanging are rocked as it
     passes under them.
4. **The three temples** (a shrine hall and two pagodas) **drop out of the sky across the doorway you came in by**, one
   after another.
   - **Angle 1:** at the doorway, for the first two.
   - **Angle 2:** low at its side, for the third.
5. **The rest merge.** The other six islands slide in and crash down one after another, merging with the arena. Each
   is a mound of rock and grass you can walk up, with its piece and its sakura on it. The view is high behind the
   doorway.
6. **Okami jumps into the air**, about 24 m up, **in slow motion, with its name** (YOKAI : OKAMI) on the right and it
   on the left of the view. The slow motion runs at 0.56× (the designer: "too slow, make x2 faster").
7. **Its landing destroys** (the designer: "needs a destroying landing impact and a very same monster transformation at
   the end with the screem"):
   - a white flash, a fireball, its own wall of shock, dust and rock;
   - a crater left scorched where it struck;
   - the whole place shaking.

   Then, low in front of it, it does **its monster transformation** (UAL's MonsterTransformation, as Tidebreaker's)
   **and screams**. The view goes **back into your eyes**, facing it, and the fight starts.

- **The exit gate** (Claude's reading): the doorway you came in by, the way back to rooms that no longer exist. After
  the fight only the wooden gate, the way down, opens, as on the Moon.
- **Every strike** (each island, each temple, its landing) throws up a shock ring, dust and flung rock. Each has its
  sound: the rooms' great boom and rumble, the walls grinding, the islands' rush, its fiery coming, each island's crash
  (its own the hardest), the temples slamming down, its leap and its landing.
- **Knobs** (F1 → Okami, the ten named "Show: …"): how long each beat lasts (with the shock wave's wide shot and its
  roar), and how slow its leap runs.

## The arena it leaves
- **Its size:** twice a boss room, 120 m across, with the four great sakura and lanterns round its middle.
- **Seven islands:**
  - Okami's own is the biggest: 24 m across and 2.1 m high, with the shrine hall and two sakura on it, off to one side
    toward the wooden gate.
  - The other six carry pagodas, a torii, the bell tower and sakura.
  - All are clear of the middle, of the way to the wooden gate and of the way in.
- **Walking on them:** each is a mound of terraces, each step 0.35 m high (you step up 0.4), so you walk up onto it.
  The real collision was checked: you walk up Okami's own onto its top.
- **When they're solid:** their boxes and the temples' only become solid once the show is over, so nothing can trap
  you while it plays. They stay for good.
- **Where you stand:** the show ends with you 24 m in from the doorway, facing where it lands.

## Its fight, for now
- **Health:** 1850, in the bosses' range.
- **Its claws:**
  - it stalks you;
  - in reach, it swipes both claws (two blows) or runs its three-blow combo;
  - each blow lands where the clip's hands do (measured from the Library) and throws you back;
  - it rests between attacks.
- **Its moves** (the designer's devastation, four leaps and blue fireball, and Claude's fire dash and roar of fire) are
  next, in `MD/FLOOR8_SHRINE_PLAN.md`.

## What was built
- **Model:** `tools/okami_paint.py` (new; it was `makami_paint.py` in the look test).
  - `tools/ual_bake.py`: its `okami` entry and its paint step, a glow texture of its own, the tail bones the Library
    lacks left at rest, the weapon grip now optional.
  - The model: `public/models/enemies/okami.glb` (new, 27 clips, 3.8 MB).
- **Arena:** `world/dungeon/okamiIsles.ts` (new: the islands, the temples, where you stand, where it lands).
  - `shrineRooms.ts`: the Great Shrine is 120 m.
  - `assemble.ts`: `okami`, its boxes as gates.
  - `physics/rapierWorld.ts`: gates can be turned.
- **Sim:**
  - New: `sim/dungeon/okamiShow.ts`, `sim/enemies/okami.ts`, `okamiShared.ts`; `tuning/okami.ts`.
  - Registered in `kindsShrine.ts`, `kinds.ts` (floor 8's boss its own), `update.ts`, `tokens.ts`, `wavePlan.ts`,
    `bossRoom.ts`, `bossBeats.ts`, `roomLoop.ts`, `eventsShrine.ts` and `store.ts`.
- **View:**
  - New: `engine/shrine/okamiShowView.ts`, `okamiCinema.ts`, `isleMesh.ts`, `showDust.ts`, `okamiFx.ts`,
    `okamiLook.ts`; `engine/boss/showViews.ts`; `engine/moon/roomFires.ts` (out of `tideShowView.ts`).
  - Changed: `moon/floorBlast.ts` (any order of rooms), `shrine/shrineSky.ts` (its islands taken), `depthsView.ts`,
    `dungeonView.ts`, `boss/bossShow.ts`, `shrine/shrineFx.ts`, `shrineLooks.ts`, `combatScene.ts`, `enemiesView.ts`,
    `gameBase.ts`.
- **Sound:** `audio/shrineSounds.ts`.
- **Screens:** `deathText.ts`, `labLists.ts`.
- **Tools:** `tools/boss-shots.ts` (floor 8's arena of islands and its show's shots, for Blender).
- **Tests:**
  - `test-okami-show.ts` (new): its place, model and clips; the arena; walking up its island on the real collision;
    the beats; the show stepped through; the shots' framing.
  - `test-okami-show-view.ts` (new): on the real kit, the rooms gone, the islands taken and landing, the temples, its
    fire, rope and shide.
  - Changed: `test-shrine.ts`, `test-lab.ts`, `test-lobby.ts`.

## Checked without a browser
- **Tests:** every beat in order, its events and where it is through them, the slow motion, the islands only solid
  after, the way down after the fight, each shot looking at what it's of, its name's side.
- **Blender:** the look test, and the arena after the show (`boss-shots.ts`): the islands, the temples, Okami.
- **Not yet seen in the game:** how the show looks and feels in three.js (the flying islands, the fire, the dust, the
  pacing, the sounds), and the claws' fight.
