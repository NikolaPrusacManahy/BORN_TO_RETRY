// Update 0.2.4 — what the Lab's panel lists (the designer: "make this interface a bit more comfier to navigate"): a
// column a floor, each with the enemies it brings in (on the first floor each comes, the mini bosses last), its boss and
// a run from its start; the items by kind. The floors' columns follow their rosters, so a new enemy shows up by itself.
// Update 0.2.16 — the Fate Cards (their own tab): a deal, or any card given you, a column a rarity.
// Update 0.3.11 — floor 7 (the designer: "F8 command please"): its Play, to see Frozen Depths past the run's end. Its
// stand-ins come from the floors before, so its column is empty till its own enemies are made.
import { rosterOf } from '../sim/dungeon/wavePlan';
import { BUILD_CARDS } from '../sim/cards/builds';
import { CARD, CARD_KINDS, CardKind, familyOf } from '../sim/cards/cards';
import { RARITIES } from '../sim/dungeon/loot';
import { bossOf, EnemyKind, MINI_BOSSES } from '../sim/enemies/kinds';
import type { DropKind } from '../sim/items/drops';
import type { LabCommand } from '../sim/lab/labCommands';
import type { WeaponKind } from '../sim/weapons/catalog';

export type LabBoss = 'demon' | 'dragon' | 'boneKing' | 'dino' | 'drownedKing' | 'whale';

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
  demon: 'Demon',
  dragon: 'Dragon',
  boneKing: 'Bone King',
  dino: 'Velociraptor',
};
export const labName = (kind: EnemyKind) => NAMES[kind] ?? kind;
export const isMini = (kind: EnemyKind) => MINI_BOSSES.includes(kind);

export interface LabFloor {
  floor: number;
  /** The enemies it brings in, the mini bosses last. */
  enemies: EnemyKind[];
  /** Update 0.2.11 — null while the floor's boss is the floor before's (floor 6's isn't made yet). Update 0.3.11 — or
   *  any floor's before it (floor 7's stand-in is floor 4's). */
  boss: LabBoss | null;
}

/** The floors the panel offers (Update 0.3.11 — 7 too). */
export const LAB_FLOOR_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

export const LAB_FLOORS: readonly LabFloor[] = (() => {
  const seen = new Set<EnemyKind>();
  const bosses = new Set<EnemyKind>();
  return LAB_FLOOR_NUMBERS.map((floor) => {
    const fresh = rosterOf(floor).filter((k) => !seen.has(k));
    for (const k of fresh) seen.add(k);
    const boss = bosses.has(bossOf(floor)) ? null : (bossOf(floor) as LabBoss);
    bosses.add(bossOf(floor));
    return { floor, enemies: [...fresh.filter((k) => !isMini(k)), ...fresh.filter(isMini)], boss };
  });
})();

type Pick = [string, LabCommand];
const item = (kind: DropKind, label: string): Pick => [label, { kind: 'item', item: kind }];
const weapon = (kind: WeaponKind, label: string): Pick => [label, { kind: 'weapon', weapon: kind }];

export const LAB_ITEMS: readonly [string, Pick[]][] = [
  ['Health', [item('heart', 'Heart'), item('greatHeart', 'Great heart'), item('plate', 'Plate'), item('goldPlate', 'Gold armour')]],
  ['Rings', [item('redRing', 'Red ring'), item('tealRing', 'Teal ring'), item('greenRing', 'Green ring'), item('blueRing', 'Blue ring')]],
  ['Keys', [item('key', 'Key'), item('whiteKey', 'White key'), item('goldKey', 'Gold key'), ['Chest', { kind: 'chest' }]]],
  ['Bonuses', [item('snowflake', 'Snowflake'), item('goldIngots', 'Gold ingots'), item('bluePotion', 'Blue potion')]],
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
      weapon('pistol', 'Pistol'),
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
