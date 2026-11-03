# The new lobby — the manor (plan)

The designer (2026-11-03), first with a blueprint for a new lobby: the **main gate** between two **stairs** in the top
corners that lead **upstairs to the collection** ("where player can see all the enemy list aligned that are all darken
if not killed yet"); the **characters** ("and it's coming soon section") on the west wall, the **difficulty** on the east
wall, **decoration and stylish presentation** in the middle; along the south wall **a displayer of all 10 floors**, a
little image of each: "a floor selector, players can go inside any room they have already cleared; when they beat that
selected floor, they go back to lobby, they do not continue". It was first built sci-fi (not kept); then: "can we come
back to the old one but you visually upgrade it? like it looks like an explorable manor and we have database of enemies
still like upstairs?"

Decided (the designer's answers): a **great hall with side rooms** (the blueprint's stations in the great hall; rooms
to wander off it; a grand staircase up to the bestiary); the bestiary as **statues on plinths** (each enemy's model on
one, grouped by floor, black until you've killed one, then in colour with a name plate; bosses on bigger plinths); the
floor selector as **framed paintings** (one per floor, a brass plaque, E at a beaten floor's to play it); a floor played
from it **fresh, as a new run**; the **credits upstairs**, the **Fate Cards** by the difficulty.

The pieces: the Modular Dungeon Pack (parts 1 and 2: the dungeon kit's bricks, floors, caps, the great arch, the
portcullis, torches, banners, carpets; stairs, fences, windows, entrances, columns, pedestals, statues, tables, chairs,
candelabra) and the Ultimate RPG Pack (armour, weapons, books, scrolls, potions, crystals, crowns, chests, gold).

## The manor (game axes: x east, z south; bricks 2 m)
- **The great hall** (30 × 44 m, five bricks high under its beamed roof, chandeliers over the carpet): the **gate** in
  the north wall (the great arch, its portcullis, your difficulty and character over it), the horse statues by it; the
  two **grand stairs** along the side walls climbing north to a landing in each north corner (6 m up); the
  **characters** on a dais along the west wall, the **difficulty's** altars and the **Fate Cards'** stand along the east
  wall; in the middle a **stepped dais with a great crystal** floating and turning over it, tall candelabra round it;
  along the south wall the **ten floor paintings** (1 to 10 left to right as you face them). You start before them,
  facing the gate.
- After playing it (the designer: "for room on the left downstairs that display all weapon align them all properly and
  put their name and effect as player get closer, like a gallery of all items, that is the left side; the right side
  downstair is objects that aren't weapons, ring, health, armour; upstairs right is the Cards gallery"):
- **The west wing** (ground floor): through the great hall's arch the **weapons gallery** (south: every weapon over
  its pedestal in straight rows, its card as you come near), through an arch the **dining hall** (north: the long
  table, chairs, the hearth, the feast).
- **The east wing** (ground floor): the **items gallery** (south: everything that isn't a weapon, a row a sort: health
  and armour, rings, keys, the kill bonuses), through an arch the **library** (north: reading tables, books, scrolls,
  candles, potions).
- **Upstairs west**, from its landing: **the bestiary**, all ten floors; a row of plinths per floor running from the
  wide carpeted aisle to its boss's big plinth at the far wall, its name over it; the **credits** on its north wall.
  Windows lit from outside.
- **Upstairs east**, from its landing: **the cards gallery**: every card on its walls in gilt frames, the Fate Cards by
  rarity, then the Traitor Cards, then the Death Cards; each shows as you come near.

## The updates
1. **0.3.21 — the manor**: its kit (`build_lobby_kit.py`), the great hall and its stations, the galleries (weapons,
   items, cards) and the rooms behind them, the stairs and landings, the bestiary with its plinths (empty yet), the
   paintings (frames and plaques, not yet playable), the credits upstairs, the light.
2. **The bestiary** (after floor 7's warband, 0.3.22, and its boss): every kill remembered (saved); each enemy's statue
   on its plinth, black until killed.
3. **The floor selector**: the floors you've beaten remembered (saved); each painting of its floor (rendered from its
   own rooms); E at a beaten floor's starts a run there, fresh; its boss beaten, back to the lobby.
4. Then floor 8's boss (the three mechs). (Update 0.3.28 — the Moon's boss is Tidebreaker now; the mechs mini bosses.)
