// Update 0.0.16 — keys and loot (the designer). A chest's loot by rarity (common 45%: coins 20, 35, 45 or 70; uncommon
// 30%: a heart or a plate; rare 15%: the gold sword; epic 8%: a ring; legendary 2%: nothing yet, an epic instead); a
// white key never gives common or uncommon, a gold key only epic (or legendary). In front of a chest with keys you pick
// the key (switching goes round the ones you carry) and E uses it. The shop always has a heart and a plate, its key (if
// any) normal 70%, white 25%, gold 5%. A room with a Yeti has a chest, and the first Yeti killed there drops a key (one
// per room); walking over it takes it. In front of a chest the left hand opens, palm up, with the key on it.
// Update 0.1.10 — the designer's sort: common (coins, a heart, the silver plate), uncommon (the gold armour, the Great
// Heart), rare (the gold sword, every ring), epic (the Gold Axe or the Gold Hammer, and 60 coins), mythic (the Gold
// Daggers or the Grimoire, and 100 coins; it replaces legendary).
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { parseUntextured } from './fakes/glb';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { stepCombat } from '../src/sim/combat/step';
import { FlatWorld } from './fakes/flatWorld';
import { KEY_TIERS, RARITIES, Rarity, rollLoot } from '../src/sim/dungeon/loot';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { createTreasure, stepTreasure } from '../src/sim/dungeon/treasure';
import { hasYeti } from '../src/sim/dungeon/wavePlan';
import { hitEnemy, isLive, spawnEnemy } from '../src/sim/enemies/enemy';
import { keyFor, KeyKind } from '../src/sim/items/items';
import { emptyTargetHit, landHit } from '../src/sim/combat/strike';
import { createPlayer } from '../src/sim/player/state';
import { ITEMS } from '../src/tuning/items';
import { buildDungeon, DungeonLevel } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { itemLooks } from '../src/engine/keyLooks';
import type { Arena } from '../src/world/arena';

const bare: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
const never = () => false;
const events = (c: ReturnType<typeof createCombat>) => Array.from({ length: c.events.length }, (_, i) => c.events.at(i).kind);

/** How often each rarity (and each item) comes out of `n` chests opened with `key`. */
function tally(key: KeyKind, n: number) {
  const rng = createRng(11);
  const rarity: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, mythic: 0 };
  const items = new Set<string>();
  const coins = new Set<number>();
  /** The coins each rarity gave along with an item. */
  const withItem: Record<Rarity, Set<number>> = { common: new Set(), uncommon: new Set(), rare: new Set(), epic: new Set(), mythic: new Set() };
  for (let i = 0; i < n; i++) {
    const l = rollLoot(key, [rng(), rng(), rng()]);
    rarity[l.rarity]++;
    items.add(l.item ?? 'coins');
    if (!l.item) coins.add(l.coins);
    else withItem[l.rarity].add(l.coins);
  }
  return { rarity, items, coins, withItem };
}

section('Keys — loot by rarity');
{
  const n = 20000;
  const t = tally('key', n);
  const share = (r: Rarity) => t.rarity[r] / n;
  check(`a normal key: common ${ITEMS.v.common}%, uncommon ${ITEMS.v.uncommon}%, rare ${ITEMS.v.rare}%, epic ${ITEMS.v.epic}%, mythic ${ITEMS.v.mythic}%`,
    near(share('common'), 0.45, 0.015) && near(share('uncommon'), 0.3, 0.015) && near(share('rare'), 0.15, 0.01) && near(share('epic'), 0.08, 0.008) && near(share('mythic'), 0.02, 0.005),
    RARITIES.map((r) => `${r} ${(share(r) * 100).toFixed(1)}%`).join(', '));
  const all = ['coins', 'heart', 'plate', 'goldPlate', 'greatHeart', 'goldSword', 'redRing', 'blueRing', 'greenRing', 'purpleRing', 'goldAxe', 'goldHammer', 'goldDaggers', 'grimoire'];
  check('everything in the sort turns up', all.every((k) => t.items.has(k)) && t.items.size === all.length, [...t.items].join(', '));
  check(`an epic chest gives ${ITEMS.v.epicCoins} coins with its item, a mythic one ${ITEMS.v.mythicCoins}; the others coins or an item`, [...t.withItem.epic].join() === `${ITEMS.v.epicCoins}` && [...t.withItem.mythic].join() === `${ITEMS.v.mythicCoins}` && [...t.withItem.common, ...t.withItem.uncommon, ...t.withItem.rare].every((c) => c === 0));
  check(`coins come as ${ITEMS.v.coins1}, ${ITEMS.v.coins2}, ${ITEMS.v.coins3} or ${ITEMS.v.coins4}`, [...t.coins].sort((a, b) => a - b).join() === [ITEMS.v.coins1, ITEMS.v.coins2, ITEMS.v.coins3, ITEMS.v.coins4].sort((a, b) => a - b).join());
  const w = tally('whiteKey', 5000);
  check('a white key: never common or uncommon', w.rarity.common === 0 && w.rarity.uncommon === 0 && w.rarity.rare > 0 && w.rarity.epic > 0);
  const g = tally('goldKey', 5000);
  check('a gold key: only epic or mythic', g.rarity.common + g.rarity.uncommon + g.rarity.rare === 0 && g.rarity.epic + g.rarity.mythic === 5000 && g.rarity.mythic > 0);
  check('each key opens the rarities it should', KEY_TIERS.whiteKey.join() === 'rare,epic,mythic' && KEY_TIERS.goldKey.join() === 'epic,mythic');
}

section('Keys — at a chest');
{
  const level = { chests: [{ room: 0, x: 0, z: 0, rot: 0, fx: 0, fz: 1 }], rooms: [] } as unknown as DungeonLevel;
  const t = createTreasure(level, createRng(3));
  const p = createPlayer(0.3, 0, 1.6, 0);
  p.grounded = true;
  const c = createCombat(bare);
  stepTreasure(t, p, c, false, false, never, DT);
  check('no keys: nothing to pick', t.choosing === -1);
  c.items.keys = 1;
  c.items.whiteKeys = 1;
  stepTreasure(t, p, c, false, false, never, DT);
  check('with keys in front of it, you pick one (the normal key first)', t.choosing === 0 && c.items.keyPick === 'key');
  stepTreasure(t, p, c, false, true, never, DT);
  check('switching goes to the next key you carry', c.items.keyPick === 'whiteKey' && events(c).includes('keySwitch'));
  stepTreasure(t, p, c, false, true, never, DT);
  check('and round (no gold key: skipped)', c.items.keyPick === 'key');
  stepTreasure(t, p, c, false, true, never, DT);
  c.events.clear();
  stepTreasure(t, p, c, true, false, never, DT);
  const chest = t.chests[0];
  check('E opens it with the picked key: that key is used', chest.state === 'opening' && chest.key === 'whiteKey' && c.items.whiteKeys === 0 && c.items.keys === 1 && t.choosing === -1);
  check(`a white key's loot is rare or better (${chest.loot?.rarity})`, !!chest.loot && RARITIES.indexOf(chest.loot.rarity) >= RARITIES.indexOf('rare'));
  for (let i = 0; i < ticks(ITEMS.v.chestTime + 0.1); i++) stepTreasure(t, p, c, false, false, never, DT);
  check('its rarity shows as the lid comes up', events(c).includes('chestRarity'));
  p.pos.set(0, 0, 1.6);
  p.kneel = 0;
  stepTreasure(t, p, c, false, false, never, DT);
  check('an open chest offers no pick', t.choosing === -1);
  const away = createTreasure(level, createRng(3));
  p.pos.set(0, 0, 6);
  stepTreasure(away, p, c, false, false, never, DT);
  check('away from a chest, no pick', away.choosing === -1);
  const busy = createTreasure(level, createRng(3));
  p.pos.set(0.3, 0, 1.6);
  stepTreasure(busy, p, c, false, false, () => true, DT);
  check('nor while its room fights', busy.choosing === -1);
}

section('Keys — the shop');
{
  const kinds: Record<string, number> = {};
  let always = true;
  let n = 0;
  // (Update 0.1.10 — more shops: with more to draw from, a key turns up less often.)
  for (let seed = 1; seed <= 600; seed++) {
    const level = buildDungeon(planFloor(seed, 1));
    const t = createTreasure(level, createRng(seed));
    always &&= t.offers.some((o) => o.kind === 'heart') && t.offers.some((o) => o.kind === 'plate') && t.offers.filter((o) => o.kind.endsWith('ey')).length <= 1;
    for (const o of t.offers) if (o.kind === 'key' || o.kind === 'whiteKey' || o.kind === 'goldKey') {
      kinds[o.kind] = (kinds[o.kind] ?? 0) + 1;
      n++;
    }
  }
  check('600 shops: always a heart and a plate, at most one key', always);
  check(`its key: normal ~${ITEMS.v.keyOdds}%, white ~${ITEMS.v.whiteKeyOdds}%, gold ~${ITEMS.v.goldKeyOdds}%`, n > 100 && near((kinds.key ?? 0) / n, 0.7, 0.08) && near((kinds.whiteKey ?? 0) / n, 0.25, 0.08) && (kinds.goldKey ?? 0) > 0, JSON.stringify(kinds));
  const a = buildDungeon(planFloor(77, 1));
  const offers = (s: number) => createTreasure(a, createRng(s)).offers.map((o) => o.kind).join();
  check('the offers shuffle between floors', new Set(Array.from({ length: 12 }, (_, i) => offers(i))).size > 6);
  check('keyFor follows the odds', keyFor(0) === 'key' && keyFor(0.75) === 'whiteKey' && keyFor(0.99) === 'goldKey');
}

section('Keys — the Yeti');
{
  // A floor with a Yeti room.
  let level: DungeonLevel | null = null;
  for (let seed = 1; !level && seed < 200; seed++) {
    const l = buildDungeon(planFloor(seed, 1));
    if (l.rooms.some((r) => r.kind === 'fight' && r.waves.filter((w) => w.includes('brute')).length > 0)) level = l;
  }
  const room = level!.rooms.find((r) => r.kind === 'fight' && hasYeti(r.waves))!;
  check('a room with a Yeti has a chest', room.chest >= 0);
  const run = createDungeonRun(level!);
  const c = createCombat(level!.arena, false);
  const p = createPlayer((room.min.x + room.max.x) / 2, 0, (room.min.z + room.max.z) / 2, 0);
  p.grounded = true;
  stepRooms(run, p, c, createRng(1), DT);
  check('stepping in, the room holds one key', c.keyDrops === 1);
  // Two Yetis die: one key.
  for (const e of c.enemies) e.alive = false;
  const a = spawnEnemy(c.enemies, 'brute', new THREE.Vector3(p.pos.x + 8, 0, p.pos.z), 0);
  const b = spawnEnemy(c.enemies, 'brute', new THREE.Vector3(p.pos.x - 8, 0, p.pos.z), 0);
  const kill = (i: number) => {
    const hit = emptyTargetHit();
    hit.kind = 'enemy';
    hit.index = i;
    hit.point.copy(c.enemies[i].pos);
    landHit(c, hit, 1e6, 0, 0, 1, 'hitJab', 1);
  };
  // (Kill bonuses may drop too: only the keys count here.)
  const keyDrops = () => c.drops.filter((d) => d.alive && (d.kind === 'key' || d.kind === 'whiteKey' || d.kind === 'goldKey'));
  kill(a);
  check('the first Yeti killed drops a key where it fell', keyDrops().length === 1 && events(c).includes('itemDrop') && near(keyDrops()[0].pos.x, p.pos.x + 8, 0.01));
  kill(b);
  check('the second drops none (one key a room)', keyDrops().length === 1 && !isLive(c.enemies[b]));
  for (const d of c.drops) if (!keyDrops().includes(d)) d.alive = false;
  const drop = keyDrops()[0];
  const before = c.items.keys + c.items.whiteKeys + c.items.goldKeys;
  stepCombat(c, p, emptyCombatIntent(), new FlatWorld(), DT);
  check('it lies there until you walk over it', drop.alive);
  p.pos.set(drop.pos.x, 0, drop.pos.z);
  stepCombat(c, p, emptyCombatIntent(), new FlatWorld(), DT);
  check('then it’s yours', !drop.alive && c.items.keys + c.items.whiteKeys + c.items.goldKeys === before + 1);
  // A room without a Yeti: its brute... there's none; a grunt drops no key.
  c.keyDrops = 0;
  const g = spawnEnemy(c.enemies, 'grunt', new THREE.Vector3(p.pos.x + 3, 0, p.pos.z), 0);
  hitEnemy(c.enemies[g], 0, 0, 0, 1);
  kill(g);
  check('nothing else drops a key', c.drops.every((d) => !d.alive));
}

section('Keys — in your hand');
{
  const arms = await parseUntextured(new URL('../public/models/arms/adventurer.glb', import.meta.url));
  const items = await parseUntextured(new URL('../public/models/items/items.glb', import.meta.url));
  const looks = itemLooks({ key: items.scene.getObjectByName('item_key')! });
  const rig = ArmsRig.fromScene(arms.scene);
  const vm = new Viewmodel(false);
  vm.attach(rig);
  vm.setLens(16 / 9);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const tip = () => arms.scene.getObjectByName('Middle4L')!.getWorldPosition(new THREE.Vector3()).distanceTo(arms.scene.getObjectByName('HandL')!.getWorldPosition(new THREE.Vector3()));
  for (let i = 0; i < 30; i++) vm.update(DT, DT, 0, 0, p, -1);
  vm.scene.updateMatrixWorld(true);
  const fist = tip();
  const lenOf = () => {
    const key = vm.palm.holder.children[0];
    return key ? new THREE.Box3().setFromObject(key.children[0]).getSize(new THREE.Vector3()).length() : 0;
  };
  const sizes: number[] = [];
  for (const kind of ['key', 'whiteKey', 'goldKey'] as KeyKind[]) {
    for (let i = 0; i < ticks(1); i++) {
      vm.palm.update(kind, (k) => looks[k] ?? null, DT);
      vm.update(DT, DT, 0, 0, p, -1);
    }
    vm.scene.updateMatrixWorld(true);
    sizes.push(lenOf());
  }
  check('in front of a chest the left hand opens (its fingers straighten)', tip() > fist * 1.3, `${fist.toFixed(3)} → ${tip().toFixed(3)} m`);
  const hand = arms.scene.getObjectByName('HandL')!.getWorldPosition(new THREE.Vector3());
  const onPalm = vm.palm.holder.visible && vm.palm.holder.position.distanceTo(hand) < 0.15;
  const ndc = vm.palm.holder.getWorldPosition(new THREE.Vector3()).project(vm.camera);
  check('with the key on its palm, in view (left of the middle, low)', onPalm && ndc.x < 0 && ndc.x > -0.9 && ndc.y < 0 && ndc.y > -0.95, `(${ndc.x.toFixed(2)}, ${ndc.y.toFixed(2)})`);
  check('the white and gold keys lie there as big as the normal key', near(sizes[1], sizes[0], sizes[0] * 0.02) && near(sizes[2], sizes[0], sizes[0] * 0.02), sizes.map((s) => s.toFixed(3)).join(' '));
  for (let i = 0; i < ticks(1); i++) {
    vm.palm.update(null, (k) => looks[k] ?? null, DT);
    vm.update(DT, DT, 0, 0, p, -1);
  }
  vm.scene.updateMatrixWorld(true);
  check('away from it, the hand closes and goes back', !vm.palm.holder.visible && near(tip(), fist, 0.002));
}
