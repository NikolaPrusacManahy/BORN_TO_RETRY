# Update 0.3.21 — the lobby, a manor

Status: built (2026-11-03). The plan's update 1 (`MD/LOBBY_MANOR_PLAN.md`). The designer first gave a blueprint for a
new lobby (built sci-fi, then not kept), then: "can we come back to the old one but you visually upgrade it? like it
looks like an explorable manor and we have databse of enemies still like upstairs?". Decided: a great hall with side
rooms; the bestiary as statues on plinths; the floor selector as framed paintings; the credits upstairs, the Fate Cards
by the difficulty.

Then, after playing it: the altars and the Fate Cards' stand "a bit on the left"; the wing banners "going through the
floor"; the rooms upstairs "bigger and give more space on the red carpet"; and the wings' rooms given to galleries:
"for room on the left downstairs that display all weapon align them all properly and put their name and effect as
player get closer, like a gallery of all items, that is the left side; the right side downstair is objects that aren't
weapons, ring, health, armour; upstairs right is the Cards gallery".

## The kit
The old hall's: the dungeon kit (bricks, caps, floors, the great arch and its portcullis, torches, wall banners,
carpets, tall candelabra, columns, rocks). The lobby's own (`tools/blender/build_lobby_kit.py`,
`public/models/menu/lobby.glb`, 6.7 MB) adds the packs' stairs and their side covers, fences, an arched door, a column,
the big pedestal, barrels, chests; windows, an entrance, potions; the RPG pack's five armours, the big weapons (swords,
axes, a hammer, bows), books open and closed, parchment, crystals, gold ingots, chests of ingots, crowns, a necklace.

## The manor (bricks of 2 m; the hall 30 × 44 m and 10 m high, each wing 18 × 32 m in two storeys, the upper 6 m up)
- **The great hall**, under its beamed roof and chandeliers:
  - **North:** the main gate (the great arch, its portcullis, your difficulty and character over it), the rearing
    horses and tall candelabra by it, two windows high in the wall.
  - **The grand stairs:** one along each side wall, three flights on a brick base, side covers on the hall's side,
    climbing north to a landing in each north corner, 6 m up, fenced. A doorway in the side wall leads into the
    bestiary.
  - **West:** the characters on their dais, banners and torches over them.
  - **East:** the three altars (each its sign on it, its name on the wall, a glow at yours), then the Fate Cards'
    stand, its card facing the hall; all moved north ("a bit on the left" as you face them), the torches between their
    boards.
  - **The middle:** a dais in two steps, a tall candelabrum at each corner, and over its pedestal the **great
    crystal**, floating, turning, glowing cold.
  - **South:** the **ten floor paintings**, 1 to 10 left to right as you face them, each in a gilt frame with a brass
    plaque (its number and name for now; its picture, and E to play it, in 0.3.23). Windows high over them.
  - The red carpet runs from the gate to the crystal and on towards the paintings, with standing banners along it.
    You start before the paintings, facing the gate.
- **The west wing** (an arch from the hall into its south room):
  - The **weapons gallery** (`world/lobby/galleries.ts`): every weapon over its own pedestal, turning slowly, in three
    straight rows of three, evenly spaced and centred (the silver ones; the gold ones; the axe, the grimoire, the
    pistol). The plain Sword is the gold one's shape in steel. Come near one and its card shows: its name, its rarity,
    what it does (the same card as on a weapon in a run). A carpet runs from the hall's arch along their front.
  - Through an arch, the **dining hall**: the long table laid for a feast on a rug, chairs down both sides and at its
    head, the hearth by the north wall with two chairs to it, barrels in the corner, a chest.
- **The east wing:**
  - The **items gallery**: everything that isn't a weapon, a row of each sort: the hearts and the armour, the four
    rings, the three keys, the kill bonuses (the snowflake, the gold ingots, the blue potion); each turning over its
    pedestal, its card showing as you come near.
  - Through an arch, the **library**: a lectern with an open book by the door, two reading tables (books, scrolls,
    parchment, candles) on a rug, stacks of books along the walls, the alchemist's table of potions, tall candelabra.
- **Upstairs west, the bestiary** (all ten floors):
  - From the landing's doorway a wide carpeted aisle runs down the hall's side. Off it, a row of plinths for each
    floor: one plinth per enemy (`sim/lobby/collection.ts`), four bare ones where a floor has none of its own yet. Its
    boss gets a big plinth at the far wall.
  - Each row's floor is named on a board hanging over its start (COMING SOON on floors 7, 9 and 10). The statues come
    in 0.3.22.
  - The **credits** hang on its north wall (MODELS, SOUND, MUSIC); windows and torches down its outer wall between
    the rows.
- **Upstairs east, the cards gallery**: every card (69) on its walls, each its painted face (`engine/cardFace.ts`, the
  shop's card painter, now each family's: a Death Card black with a sickly green frame and a skull behind its mark, a
  Traitor Card's frame gold and purple) in a gilt frame, clockwise round the room from its door: the Fate Cards from
  common to mythic, then the Traitor Cards, then the Death Cards. Come near one and it shows as it does in a run. A
  carpet down the middle between two lines of tall candelabra, their flames its light.
- **Windows** in every room downstairs and down the bestiary, their daylight lit from outside. Torches in every room
  and upstairs. The wing rooms' banners hang on their outer walls between the windows, under the upper floor (they
  went through it before).

## Light
As before (a warm fill, a key light from high above, the chandeliers, the torches nearest you, the dining hall's fire,
the glows at your altar and your character), and the crystal's cold glow, pulsing (`tuning/lobbyLight.ts`).

## Floors' names
`world/dungeon/floorNames.ts`: THE DUNGEON, THE VENOM GARDEN, THE BONE KEEP, THE DESERT, THE DROWNED TEMPLE, SKULL COVE,
FROZEN DEPTHS, THE MOON, THE RIFT, THE LAST FLOOR. Floors 1, 3 and 4 had no names: **(placeholder names)**.

## Credits
MODELS adds the Pirate Kit (floor 6) and the Ultimate Space Kit (floor 8), two packs a line.

## What was built
`world/lobby/spots.ts`, `manorWalls.ts` (new: every wall's bricks and collision from the same lines, the cores),
`hallDressing.ts`, `hallTrim.ts` (new: the boards, the windows), `furniture.ts`, `galleries.ts` (new: where each
exhibit and card stands), `roomFurniture.ts` (new: the dining hall, the library), `hall.ts`, `boards.ts`,
`credits.ts`; `world/dungeon/floorNames.ts` (new); `sim/lobby/collection.ts` (new); `sim/lobby/lobby.ts` (the
galleries' stations: an exhibit's or a card's, only to read, on its own floor); `engine/lobby/lobbyView.ts` (the
crystal, the frames and plaques, the rods, the daylight), `galleryView.ts` (new: the exhibits turning, the cards in
their frames), `lobbyLights.ts`, `fateStand.ts` (it faces the hall); `engine/cardFace.ts` (new: the card painter,
out of `shopCardView.ts`); `ui/cardMarks.ts` (the slide's dead mark gone); `tuning/lobbyLight.ts`;
`tools/blender/build_lobby_kit.py`, `render_dungeon.py` (the fill's colour, cuts, lit boxes, items.glb's pieces),
`tools/lobby-shots.ts`.
Tests: `test-lobby.ts` (the manor, the galleries, the bestiary's list, walking through it, the stations, the models,
the boards), `test-seams.ts`.

## Checked without a browser
Rules (tests): everything inside the manor and standing on something (a table, a pedestal, a dais, upstairs, a book,
a wall); nothing solid in anything; the carpet clear; the roofs closed; every board; the stairs a storey; a plinth per
enemy and per boss; the galleries (every weapon once on the left, everything else once on the right, in straight
evenly spaced centred rows, a pedestal under each, a clear walk past them; every card once upstairs, none touching,
none over the doorway); the rooms behind them furnished; walking (Rapier): never out of the manor from any room or
upstairs, the portcullis stops you, up a grand stair to its landing and through its doorway into the bestiary,
through the hall's arch into the weapons gallery and on into the dining hall, through the gate once each time; the
stations where they stand (an exhibit's card by its pedestal, a card's before it upstairs and not from under it, E
doing nothing there); every piece in the kits. Blender renders of every room (`tools/lobby-shots.ts`).
**Not yet seen in the game**: the rooms' light, the crystal's glow and turn, the windows' daylight, the exhibits
turning and their cards, the painted card faces on the walls.
