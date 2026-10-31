// Update 0.2.4 — what the Lab's panel lists (the designer: "make this interface a bit more comfier to navigate"): a
// column a floor, each with the enemies it brings in (on the first floor each comes, the mini bosses last), its boss and
// a run from its start; the items by kind. The floors' columns follow their rosters, so a new enemy shows up by itself.
// Update 0.2.15 — the Scars: an offer of three in front of you (as a chest's), or one at your feet.
import { rosterOf } from '../sim/dungeon/wavePlan';
import { SCAR_KINDS, SCAR_NAME } from '../sim/scars/scars';
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
  /** Update 0.2.11 — null while the floor's boss is the floor before's (floor 6's isn't made yet). */
  boss: LabBoss | null;
}

export const LAB_FLOORS: readonly LabFloor[] = (() => {
  const seen = new Set<EnemyKind>();
  return [1, 2, 3, 4, 5, 6].map((floor) => {
    const fresh = rosterOf(floor).filter((k) => !seen.has(k));
    for (const k of fresh) seen.add(k);
    const boss = floor > 1 && bossOf(floor) === bossOf(floor - 1) ? null : (bossOf(floor) as LabBoss);
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
  // (Two columns: a column holds 10 at most.)
  ['Scars', [['Offer', { kind: 'scars' }], ...SCAR_KINDS.slice(0, 7).map((k) => item(k, SCAR_NAME[k]))]],
  ['More Scars', SCAR_KINDS.slice(7).map((k) => item(k, SCAR_NAME[k]))],
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
