// Update 0.2.4 — what the Lab's panel lists (the designer: "make this interface a bit more comfier to navigate"): a
// column a floor, each with the enemies it brings in (on the first floor each comes, the mini bosses last), its boss and
// a run from its start; the items by kind. The floors' columns follow their rosters, so a new enemy shows up by itself.
// Update 0.2.16 — the Fate Cards (their own tab): a deal, or any card given you, a column a rarity.
// Update 0.3.11 — floor 7 (the designer: "F8 command please"): its Play, to see Frozen Depths past the run's end. Its
// stand-ins come from the floors before, so its column is empty till its own enemies are made.
// Update 0.3.13 — and floor 8: the floors with nothing of their own to list yet (7, 8) are buttons to play them (in
// the panel's bottom row); the rest a column each, three to a page. Update 0.3.15 — floor 6 has its crew: a column again.
// Update 0.3.22 — floor 7 its warband: a column too (none left only to play).
// Update 0.3.28 — the Moon's four mechs: a floor's mini bosses two to a row (LabPanel.tsx); the Moon's crew named.
import { rosterOf } from '../sim/dungeon/wavePlan';
import { BUILD_CARDS } from '../sim/cards/builds';
import { CARD, CARD_KINDS, CardKind, familyOf } from '../sim/cards/cards';
import { RARITIES } from '../sim/dungeon/loot';
import { EnemyKind, MINI_BOSSES, ownBossOf } from '../sim/enemies/kinds';
import { FLOOR, REALMS, UNBUILT } from '../world/dungeon/floorOrder';
import type { DropKind } from '../sim/items/drops';
import type { LabCommand } from '../sim/lab/labCommands';
import type { WeaponKind } from '../sim/weapons/catalog';

export type LabBoss = 'dragon' | 'swarm' | 'boneKing' | 'dino' | 'drownedKing' | 'whale' | 'bigShark' | 'frostRoc' | 'tidebreaker' | 'okami' | 'hellwarden';

const NAMES: Partial<Record<EnemyKind, string>> = {
  grunt: 'Grunt',
  spitter: 'Spitter',
  brute: 'Yeti',
  leaper: 'Leaper',
  stinger: 'Stinger',
  wraith: 'Wraith',
  slime: 'Slime',
  frog: 'Frog',
  snake: 'Snake',
  wasp: 'Wasp',
  spider: 'Spider',
  blueDemon: 'Blue Demon',
  skeleton: 'Skeleton',
  mushnub: 'Mushnub',
  ninja: 'Ninja',
  tribal: 'Tribal',
  cactoro: 'Cactoro',
  dinoBlob: 'Dino',
  lizard: 'Lizard',
  greenBlob: 'Green Blob',
  hywirl: 'Hywirl',
  maskTribal: 'Flying Tribal',
  cactoroBig: 'Big Cactoro',
  skullOrc: 'Skull Orc',
  dragonling: 'Dragonling',
  skullWraith: 'Skull Wraith',
  rabbit: 'White Rabbit',
  bigMushnub: 'Big Mushnub',
  snapper: 'Snapper',
  urchin: 'Urchin',
  jelly: 'Jelly',
  glub: 'Glub',
  bigGlub: 'Big Glub',
  squidle: 'Squidle',
  spawnling: 'Spawnling',
  deepOne: 'Deep One',
  bogBrute: 'Bog Brute',
  drownedKing: 'Drowned King',
  clownfish: 'Clownfish',
  tuna: 'Tuna',
  angelfish: 'Angelfish',
  dolphin: 'Dolphin',
  drownedPrince: 'Drowned Prince',
  mantaRay: 'Manta Ray',
  shark: 'Shark',
  whale: 'Old Whale',
  // (Update 0.3.15 — Skull Cove's crew.)
  corsair: 'Corsair',
  shanty: 'Shanty Man',
  bomber: 'Bomber',
  crewman: 'Cursed Crewman',
  headless: 'Headless Crewman',
  gull: 'Thieving Gull',
  bat: 'Cave Bats',
  tentacle: 'Kraken Tentacle',
  mako: 'Mako',
  captain: 'Barbarossa',
  bigShark: 'Big Shark',
  // (Update 0.3.22 — floor 7's warband.)
  raider: 'Raider',
  axeThrower: 'Axe Thrower',
  draugr: 'Draugr',
  barrowMaid: 'Barrow Maid',
  volva: 'Völva',
  berserker: 'Berserker',
  haugbui: 'Haugbui',
  frostRoc: 'Frost Roc',
  // (Update 0.3.33 — floor 8's martial artists.)
  karateka: 'Karateka',
  karateGirl: 'Karate Girl',
  shinobi: 'Shinobi',
  kunoichi: 'Kunoichi',
  sandNinja: 'Sand Ninja',
  sandNinjaF: 'Sand Ninja (she)',
  archer: 'Archer',
  sensei: 'Sensei',
  shadow: 'The Shadow',
  shadowClone: 'Shadow clone',
  // (Update 0.3.28 — the Moon's crew, and its four mechs and their pilots.)
  gunner: 'Gunner',
  flanker: 'Flanker',
  hopper: 'Leaper',
  strafer: 'Strafer',
  diver: 'Diver',
  mineLayer: 'Mine-layer',
  beeShip: 'Bee Ship',
  beeMech: 'Bee Mech',
  beeNaut: 'Barbara',
  flamingoMech: 'Flamingo Mech',
  flamingoNaut: 'Fernando',
  foxMech: 'Fox Mech',
  foxNaut: 'Rae',
  frogMech: 'Frog Mech',
  frogNaut: 'Finn',
  tidebreaker: 'Tidebreaker',
  hellwarden: 'Hellwarden',
  okami: 'Yokai : Okami',
  dragon: 'Dragon',
  swarm: 'The Swarm',
  boneKing: 'Bone King',
  dino: 'Velociraptor',
};
export const labName = (kind: EnemyKind) => NAMES[kind] ?? kind;
export const isMini = (kind: EnemyKind) => MINI_BOSSES.includes(kind);
/** Update 0.3.28 — the rows a floor's column takes: one an enemy, its mini bosses two to a row. */
export const labRows = (f: LabFloor) => f.enemies.filter((k) => !isMini(k)).length + Math.ceil(f.enemies.filter(isMini).length / 2);

export interface LabFloor {
  floor: number;
  /** The enemies it brings in, the mini bosses last. */
  enemies: EnemyKind[];
  /** Update 0.2.11 — null while the floor's boss is the floor before's (floor 6's isn't made yet). Update 0.3.11 — or
   *  any floor's before it (floor 7's stand-in is floor 4's). */
  boss: LabBoss | null;
}

/** The floors the panel offers (Update 0.3.11 — 7 too; Update 0.3.13 — 8). Update 0.3.25 — the floors reordered
 *  (world/dungeon/floorOrder.ts): every built one (not Hell on Earth, the Forge's rooms and stand-ins, as before; Update
 *  0.3.32 — the Shrine Dimension too). Update 0.3.43 — Hell on Earth too (its look is its own; the designer looked for it
 *  in the Lab): its enemies and boss still stand in, so it's a Floor 10 button in the bottom row. */
export const LAB_FLOOR_NUMBERS = REALMS.filter((r) => !UNBUILT.has(r)).map((r) => FLOOR[r]);

export const LAB_FLOORS: readonly LabFloor[] = (() => {
  const seen = new Set<EnemyKind>();
  const bosses = new Set<EnemyKind>();
  return LAB_FLOOR_NUMBERS.map((floor) => {
    const fresh = rosterOf(floor).filter((k) => !seen.has(k));
    for (const k of fresh) seen.add(k);
    // (Update 0.3.25 — under the floor it's its own boss on: the Velociraptor the Desert's, not Frozen Depths'.)
    const own = ownBossOf(floor);
    const boss = own && !bosses.has(own) ? (own as LabBoss) : null;
    if (own) bosses.add(own);
    return { floor, enemies: [...fresh.filter((k) => !isMini(k)), ...fresh.filter(isMini)], boss };
  });
})();

/** Update 0.3.13 — the floors with nothing of their own yet (their enemies and boss stand in): only to play; the rest
 *  each a column, this many to a page. */
export const LAB_NEW = LAB_FLOORS.filter((f) => f.enemies.length === 0 && !f.boss).map((f) => f.floor);
export const LAB_COLUMNS = LAB_FLOORS.filter((f) => !LAB_NEW.includes(f.floor));
export const PER_PAGE = 3;
export const LAB_PAGES: readonly LabFloor[][] = Array.from({ length: Math.ceil(LAB_COLUMNS.length / PER_PAGE) }, (_, i) => LAB_COLUMNS.slice(i * PER_PAGE, (i + 1) * PER_PAGE));

type Pick = [string, LabCommand];
const item = (kind: DropKind, label: string): Pick => [label, { kind: 'item', item: kind }];
const weapon = (kind: WeaponKind, label: string): Pick => [label, { kind: 'weapon', weapon: kind }];

export const LAB_ITEMS: readonly [string, Pick[]][] = [
  ['Health', [item('heart', 'Heart'), item('greatHeart', 'Great heart'), item('plate', 'Plate'), item('goldPlate', 'Gold armour')]],
  ['Rings', [item('redRing', 'Red ring'), item('tealRing', 'Teal ring'), item('greenRing', 'Green ring'), item('blueRing', 'Blue ring')]],
  ['Keys', [item('key', 'Key'), item('whiteKey', 'White key'), item('goldKey', 'Gold key'), ['Chest', { kind: 'chest' }]]],
  ['Bonuses', [item('snowflake', 'Snowflake'), item('goldIngots', 'Gold ingots'), item('bluePotion', 'Blue potion')]],
  // (Update 0.3.70 — and playing it unlocks it in the lobby. Update 0.3.80 — Gravity Sean too.)
  ['Play as', [['The Demon', { kind: 'demon', on: true }], ['Gravity Sean', { kind: 'sean' }], ['Joseph', { kind: 'demon', on: false }]]],
  [
    'Weapons',
    [
      weapon('sword', 'Sword'),
      weapon('goldSword', 'Gold sword'),
      weapon('hammer', 'Hammer'),
      weapon('goldHammer', 'Gold hammer'),
      weapon('daggers', 'Dual daggers'),
      weapon('goldDaggers', 'Gold daggers'),
      weapon('grimoire', 'Grimoire'),
      weapon('goldAxe', 'Gold axe'),
    ],
  ],
];

/** Update 0.2.16 — the Fate Cards' tab: a deal (as a chest's), then each card by its rarity, a column each (Update
 *  0.2.18 — wave 2 filled the epic and mythic ones apart). Update 0.2.22 — the builds' own cards a column of their own
 *  (taking a card you carry makes it II). */
const fate = (k: CardKind): Pick => [CARD[k].name, { kind: 'card', card: k }];
export const LAB_CARDS: readonly [string, Pick[]][] = [
  ['Deal', [['Deal 3', { kind: 'deal' }]]],
  ...RARITIES.map((r): [string, Pick[]] => [r[0].toUpperCase() + r.slice(1), CARD_KINDS.filter((k) => familyOf(k) === 'fate' && CARD[k].rarity === r && !BUILD_CARDS.includes(k)).map(fate)]),
  ['Builds', BUILD_CARDS.map(fate)],
];

/** Update 0.2.19 — the Traitor and Death Cards' tab: each card given you (the Death Cards two columns: 10 a column). */
const given = (family: 'traitor' | 'death') => CARD_KINDS.filter((k) => familyOf(k) === family).map((k): Pick => [CARD[k].name, { kind: 'card', card: k }]);
export const LAB_DARK: readonly [string, Pick[]][] = [
  ['Traitor', given('traitor')],
  ['Death', given('death').slice(0, 8)],
  ['More Death', given('death').slice(8)],
];
