// Update 0.2.23 — floor 2's Venom Garden (world/dungeon/venomRooms.ts): its webs (they slow you; a dash, which keeps its
// speed, takes you out), its sludge (the lava's pits there: falling in poisons you too), and the wasps' hives on its
// walls (sim/dungeon/hives.ts): while their room fights, each lets out a wasp now and then, until it's empty or punched
// down.
import { group, knob } from './schema';

export const GARDEN = group('garden', 'Venom Garden', {
  web: knob(0.4, 0.1, 1, 0.05, 'Web slow', 'In a web (floor 2) you move at this share of your speed; a dash keeps its own.'),
  sludgePoison: knob(6, 0, 15, 0.5, 'Sludge poison', 'Seconds of poison a fall into the sludge (floor 2’s pits) leaves you with.'),
  hiveHp: knob(40, 5, 200, 5, 'Hive health', 'Damage a wasps’ hive takes before it falls.'),
  hiveWasps: knob(3, 0, 8, 1, 'Wasps a hive', 'Wasps a hive lets out in one fight of its room.'),
  hiveGap: knob(7, 1, 30, 0.5, 'Hive gap', 'Seconds between a hive’s wasps (the first comes half as soon).'),
  hiveCap: knob(3, 1, 10, 1, 'Hive wasps at once', 'No hive lets one out while this many of the hives’ wasps are flying.'),
});
