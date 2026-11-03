# Update 0.3.25 — the floors reordered

Status: built (2026-11-03). The designer: "Let's do floors swaps, cause Floor 7 is an easier Floor than 4, 5 and 6, so
here is the new order … you head right for the 8th, we are making a Japan themed floor, but sort floors for now".

## The order
| Floor | Now | Was |
| --- | --- | --- |
| 1 | The Dungeon | 1 |
| 2 | The Venom Garden | 2 |
| 3 | The Bone Keep | 3 |
| 4 | **Frozen Depths** | 7 |
| 5 | The Drowned Temple | 5 |
| 6 | **The Desert** | 4 |
| 7 | **Skull Cove** | 6 |
| 8 | **Shrine Dimension** (a Japan floor, to come: no rooms yet) | — |
| 9 | **The Moon** | 8 |
| 10 | **Hell on Earth** (the Forge's rooms and look meanwhile, stand-in enemies) | the Forge, 10 |

## What moves with a floor
Its look, its nine-odd rooms, its enemies (and its percher), its boss and its boss room, its name: each follows the
floor's place (`world/dungeon/floorOrder.ts`; to reorder again, reorder that). What its number gives it stays with the
number: how many fight rooms (5 on floors 1–2, 6 on 3–4, 7 on 5–6, 8 on 7–8 …) and how many enemies a room sends. So
Frozen Depths, at 4, is shorter and lighter than it was at 7; the Desert and Skull Cove a little longer and fuller.

## The run, the Lab, the lobby
- **The run ends at Skull Cove's way down (floor 7)**: every built floor is in it now, Frozen Depths too (it was
  floors 1–6).
- **Frozen Depths' boss still stands in** till the Frost Roc: the Velociraptor, which is also the Desert's own boss, so a
  run meets it on 4 and on 6 for now.
- **The Lab** offers floors 1–7 and the Moon (9); not the Shrine Dimension (no rooms yet), nor Hell on Earth (as the
  Forge before). The Velociraptor is listed under the Desert; its boss room is the Desert's. The pages: 1–3, 4–6, 7 and 9.
- **The lobby**: the paintings and the bestiary's rows follow the order (names: SHRINE DIMENSION, HELL ON EARTH); the
  bestiary shows each floor's own boss (none on Frozen Depths yet); floors 8 and 10 COMING SOON.

## What was built
`world/dungeon/floorOrder.ts` (new: `FLOOR`, `REALMS`, `realmOf`, `UNBUILT`), `styles.ts`, `rooms.ts` (boss rooms),
the floors' room lists (`venomRooms.ts`, `boneRooms.ts`, `keepRooms.ts`, `frozenRooms.ts`, `drownedRooms.ts`,
`desertRooms.ts`, `coveRooms.ts`, `moonRooms.ts`, `forgeRooms.ts`), `floorNames.ts`; `sim/dungeon/wavePlan.ts` (rosters,
perchers), `sim/enemies/kinds.ts` (bosses, `ownBossOf`), `sim/lobby/collection.ts`; `engine/runLinks.ts` (LAST_FLOOR),
`gameBase.ts` (the Lab's boss rooms); `screens/labLists.ts`. Tests: the floors' tests name floors by place (`FLOOR.cove`
…), `test-lab.ts`, `test-lobby.ts`, `test-alpha.ts`, `test-floor3-executions.ts`, `test-floor-kinds.ts`.

## Checked without a browser
Every floor's tests (its look, its rooms and only its rooms, its roster, its boss, its perches) at its new number; the
run's end at 7; the Lab's floors and boss rooms; the lobby's paintings and rows. **Not yet seen in the game.**
