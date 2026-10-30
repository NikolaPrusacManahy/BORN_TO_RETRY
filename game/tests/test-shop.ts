// Update 0.0.13 — the shop and the chests (the designer): every floor has a shop room with five tiles (always a key),
// everything costs 70; the heart heals half, the plate gives a shield of half, the gold sword lasts 40 hits, the red
// ring +25% damage, the blue ring +20% speed; chests in some rooms open with a key (kneeling, both hands), holding
// 50–80 coins, a plate, a heart or a ring. Your hits no longer heal you.
// Update 0.0.16 (the designer, deliberate changes): the shop always has a heart and a plate, its other three tiles drawn
// (a key is no longer always there); a chest's loot goes by rarity and key (test-keys.ts); every room with a Yeti has
// a chest, and one or two more stand in other fight rooms.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { check, near, section } from './harness';
import { lidAngle, LID_OPEN, TreasureView } from '../src/engine/treasureView';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { verticalFov } from '../src/state/settings';
import { CAMERA } from '../src/tuning/camera';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { createDungeonRun } from '../src/sim/dungeon/roomLoop';
import { chestInReach, createTreasure, KNEEL_DIST, LOOT_AT, SHOP_TILES, stepTreasure, Treasure } from '../src/sim/dungeon/treasure';
import { createInventory, ITEM_KINDS, priceOf, speedFactor, takeItem } from '../src/sim/items/items';
import { emptyIntent } from '../src/sim/player/intent';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { stepPlayer } from '../src/sim/player/step';
import { HEALTH } from '../src/tuning/health';
import { ITEMS } from '../src/tuning/items';
import { MOVE } from '../src/tuning/movement';
import { TARGETS } from '../src/tuning/combat';
import { buildDungeon, DungeonLevel } from '../src/world/dungeon/assemble';
import { hasYeti } from '../src/sim/dungeon/wavePlan';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { buildNavGrid, freeAt } from '../src/world/navGrid';
import type { Arena } from '../src/world/arena';

const bare: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
const never = () => false;
const events = (c: ReturnType<typeof createCombat>) => Array.from({ length: c.events.length }, (_, i) => c.events.at(i).kind);

section('Shop — every floor');
{
  let bad = '';
  for (let seed = 1; seed <= 30; seed++) {
    const level = buildDungeon(planFloor(seed * 53, 1 + (seed % 3)));
    const shops = level.rooms.filter((r) => r.kind === 'shop');
    const t = createTreasure(level, createRng(seed));
    if (shops.length !== 1) bad ||= `seed ${seed}: ${shops.length} shops`;
    else if (shops[0].tiles.length !== SHOP_TILES) bad ||= `seed ${seed}: ${shops[0].tiles.length} tiles`;
    else if (t.offers.length !== SHOP_TILES || !t.offers.some((o) => o.kind === 'heart') || !t.offers.some((o) => o.kind === 'plate') || new Set(t.offers.map((o) => o.kind)).size !== SHOP_TILES) bad ||= `seed ${seed}: offers ${t.offers.map((o) => o.kind)}`;
    const yetis = level.rooms.filter((r) => r.kind === 'fight' && hasYeti(r.waves));
    if (yetis.some((r) => r.chest < 0)) bad ||= `seed ${seed}: a room with a Yeti and no chest`;
    // (Update 0.2.0 — the boss's chest, in the boss room, isn't one of these.)
    const more = level.chests.filter((c) => !c.boss).length - yetis.length;
    // (One or two more, unless every fight room already has one: floor 3 can have a Yeti in each.)
    const free = level.rooms.some((r) => r.kind === 'fight' && r.chest < 0);
    if (more > 2 || (more < 1 && free)) bad ||= `seed ${seed}: ${level.chests.length} chests for ${yetis.length} Yeti rooms`;
    for (const c of level.chests) {
      if (c.boss) {
        if (level.rooms[c.room].kind !== 'boss' || c.gate < 0) bad ||= `seed ${seed}: the boss's chest`;
        continue;
      }
      if (level.rooms[c.room].kind !== 'fight') bad ||= `seed ${seed}: a chest outside a fight room`;
      // You can stand where you kneel to open it, and it stands in the room's walk grid as an obstacle.
      const nav = buildNavGrid(level.rooms[c.room].arena, 0.3);
      if (!freeAt(nav, c.x + c.fx * KNEEL_DIST, c.z + c.fz * KNEEL_DIST)) bad ||= `seed ${seed}: no room to kneel at a chest`;
      // (Update 0.2.0 — a chest that rises: its box is a gate, solid once it's up.)
      const box = c.rises ? level.gates[c.gate] : null;
      if (c.rises ? !box || Math.abs(box.x - c.x) > 1e-9 || Math.abs(box.z - c.z) > 1e-9 : freeAt(nav, c.x, c.z)) bad ||= `seed ${seed}: a chest you can walk through`;
    }
  }
  check('30 floors: one shop of five tiles (a heart, a plate and three others), a chest in every Yeti room and one or two more, all in fight rooms you can kneel at', !bad, bad);
  const level = buildDungeon(planFloor(9, 1));
  const run = createDungeonRun(level);
  const shop = level.rooms.findIndex((r) => r.kind === 'shop');
  check('the shop never fights', run.rooms[shop].state === 'cleared' && level.rooms[shop].spawns.length === 0);
  const a = createTreasure(level, createRng(4));
  const b = createTreasure(level, createRng(4));
  check('the same seed, the same shop and chests', JSON.stringify(a.offers) === JSON.stringify(b.offers) && a.chests.map((c) => c.rolls.join()).join() === b.chests.map((c) => c.rolls.join()).join());
}

/** A shop of one offer at (0, -1) and you at the origin with `money`. */
function shopWith(kind: Treasure['offers'][number]['kind'], money: number) {
  const t: Treasure = { shop: 0, offers: [{ kind, price: priceOf(kind, 1), sold: false, x: 0, z: -1 }], chests: [], choosing: -1 };
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const c = createCombat(bare);
  c.money = money;
  return { t, p, c };
}

section('Shop — buying');
{
  // (Update 0.0.18 — each offer has its price: a ring is a normal item, 50 on floor 1.)
  const price = priceOf('redRing', 1);
  const { t, p, c } = shopWith('redRing', price - 1);
  check('E by a tile without the coins buys nothing', stepTreasure(t, p, c, true, false, never, DT) && !t.offers[0].sold && c.money === price - 1 && events(c).includes('buyFail'));
  c.money = price + 5;
  c.events.clear();
  check(`with ${price} it's yours`, stepTreasure(t, p, c, true, false, never, DT) && t.offers[0].sold && c.money === 5 && c.items.redRings === 1 && events(c).includes('buy'));
  c.money = 500;
  check('and it cannot be bought twice', !stepTreasure(t, p, c, true, false, never, DT) && c.money === 500);
  const far = shopWith('key', 500);
  far.p.pos.set(0, 0, 5);
  check('too far from the tile, E does nothing here (a weapon could be picked up)', !stepTreasure(far.t, far.p, far.c, true, false, never, DT) && far.c.money === 500);
  const full = shopWith('heart', 500);
  check('no heart at full health', stepTreasure(full.t, full.p, full.c, true, false, never, DT) && !full.t.offers[0].sold && full.c.money === 500);
  full.p.hp = 20;
  stepTreasure(full.t, full.p, full.c, true, false, never, DT);
  check(`a heart heals half your health (${HEALTH.v.maxHp * ITEMS.v.heartHeal})`, full.t.offers[0].sold && full.p.hp === 20 + HEALTH.v.maxHp * ITEMS.v.heartHeal);
}
{
  const { p, c } = shopWith('plate', 0);
  takeItem('plate', p, c);
  // (Update 0.0.17 — the designer: 20 shield, was half your health.)
  check(`the silver armour plate gives ${ITEMS.v.silverShield} shield`, p.shield === ITEMS.v.silverShield);
  c.weapon = { kind: 'sword', uses: 2, cooldown: 0, throwing: -1, mag: 0 };
  takeItem('goldSword', p, c);
  check(`the gold sword goes into your hand with ${ITEMS.v.goldSwordUses} uses`, c.weapon?.kind === 'goldSword' && c.weapon.uses === ITEMS.v.goldSwordUses);
  // (Update 0.0.17 — it goes in the next weapon slot; the sword you held stays in its own.)
  check('the sword you held stays in its slot', c.bag[1]?.kind === 'sword' && c.bag[1].uses === 2 && c.slot === 2 && !c.pickups.some((q) => q.alive));
  takeItem('key', p, c);
  check('a key is carried', c.items.keys === 1);
}

section('Shop — rings');
{
  const inv = createInventory();
  check('no rings, no change', speedFactor(inv) === 1);
  // (Update 0.0.17 — the blue ring +15% speed. Update 0.2.0 — the purple ring, +20% damage, is gone: the designer, "no
  // more damage increases"; the teal ring in its place gives health.)
  inv.blueRings = 1;
  check(`a blue ring: +${ITEMS.v.blueRing * 100}% speed`, near(speedFactor(inv), 1 + ITEMS.v.blueRing, 1e-9));
  check('no purple ring any more', !(ITEM_KINDS as readonly string[]).includes('purpleRing') && ITEM_KINDS.includes('tealRing'));
  // A real jab on a dummy, with and without every ring: no ring makes it harder.
  const jab = (rings: number) => {
    const s = createCombat({ ...bare, dummies: [{ x: 0, y: 0, z: -1.5 }] });
    s.items.redRings = s.items.blueRings = s.items.greenRings = s.items.tealRings = rings;
    const p = createPlayer(0, 0, 0, 0);
    stepCombat(s, p, { ...emptyCombatIntent(), attackPressed: true }, new FlatWorld(), DT);
    return TARGETS.v.dummyHp - s.dummies[0].hp;
  };
  const plain = jab(0);
  check('no ring makes your hits harder', plain > 0 && near(jab(1), plain, 1e-9), `${plain} → ${jab(1)}`);
  // Running flat out, with and without a blue ring.
  const run = (mul: number) => {
    const p = createPlayer(0, 0, 0, 0);
    p.grounded = true;
    p.speedMul = mul;
    const w = new FlatWorld();
    for (let i = 0; i < ticks(1); i++) stepPlayer(p, { ...emptyIntent(), moveZ: 1 }, w, [], DT);
    return Math.hypot(p.vel.x, p.vel.z);
  };
  check('a blue ring makes you run 15% faster', near(run(1), MOVE.v.runSpeed, 1e-6) && near(run(1 + ITEMS.v.blueRing), MOVE.v.runSpeed * (1 + ITEMS.v.blueRing), 1e-6));
}

/** A chest at the origin facing +z, and you in front of it. */
function chestScene(keys: number) {
  const level = { chests: [{ room: 0, x: 0, z: 0, rot: 0, fx: 0, fz: 1 }], rooms: [] } as unknown as DungeonLevel;
  const t = createTreasure(level, createRng(1));
  const p: PlayerState = createPlayer(0.3, 0, 1.6, 0);
  p.grounded = true;
  const c = createCombat(bare);
  c.items.keys = keys;
  return { t, p, c };
}

section('Chests');
{
  const { t, p, c } = chestScene(0);
  check('in front of a chest, it can be opened', chestInReach(t, p) === 0);
  p.pos.set(0, 0, -1.6);
  check('not from behind it', chestInReach(t, p) === -1);
  p.pos.set(0.3, 0, 1.6);
  check('without a key it stays shut (the lid rattles)', stepTreasure(t, p, c, true, false, never, DT) && t.chests[0].state === 'shut' && events(c).includes('chestLocked') && p.kneel === 0);
  c.items.keys = 1;
  check('not while its room is fighting', !stepTreasure(t, p, c, true, false, () => true, DT) && t.chests[0].state === 'shut' && c.items.keys === 1);
  c.events.clear();
  stepTreasure(t, p, c, true, false, never, DT);
  check('with a key: it opens, the key is used, you kneel', t.chests[0].state === 'opening' && c.items.keys === 0 && p.kneel > 0 && events(c).includes('chestOpen'));
  // Kneeling: you're eased onto the spot in front of it, facing it, and you don't fight.
  const w = new FlatWorld();
  const moneyBefore = c.money;
  let lootAt = -1;
  let attacked = false;
  let i = 0;
  let still = true;
  for (; p.kneel > 0 && i < ticks(5); i++) {
    c.events.clear();
    stepTreasure(t, p, c, false, false, never, DT);
    stepPlayer(p, { ...emptyIntent(), moveZ: 1, jumpPressed: true }, w, [], DT);
    stepCombat(c, p, { ...emptyCombatIntent(), attackPressed: true }, w, DT);
    if (events(c).includes('chestLoot') && lootAt < 0) lootAt = (i + 1) * DT;
    // (Once the kneel is over, on its last tick, you're free again.)
    if (p.kneel > 0) attacked ||= events(c).some((k) => k === 'jabL' || k === 'jabR');
    still &&= p.pos.y === 0;
  }
  check(`kneeling lasts the opening (${ITEMS.v.chestTime} s)`, near(i * DT, ITEMS.v.chestTime, DT * 1.5), `${(i * DT).toFixed(2)} s`);
  check('kneeling, you are eased in front of it, facing it', Math.hypot(p.pos.x, p.pos.z - KNEEL_DIST) < 0.05 && p.yaw === 0);
  check('and you neither walk, jump nor punch meanwhile', !attacked && still, `attacked ${attacked}, y ${p.pos.y}`);
  for (let k = 0; k < 3; k++) stepTreasure(t, p, c, false, false, never, DT);
  check('what it holds comes out as the lid is up', lootAt >= ITEMS.v.chestTime * LOOT_AT - DT * 2 && lootAt <= ITEMS.v.chestTime * LOOT_AT + DT * 2, `${lootAt.toFixed(2)} s`);
  check('then it stays open', t.chests[0].state === 'open' && chestInReach(t, p) === -1);
  const loot = t.chests[0].loot!;
  const coinsOut = c.coins.filter((q) => q.alive).length + c.money - moneyBefore;
  const got = loot.item ? true : coinsOut === loot.coins;
  check(`its loot is yours (${loot.rarity}: ${loot.item ?? `${loot.coins} coins`})`, got);
}

section('Chests — the item waits for E');
{
  // (Update 0.1.11 — the designer: a chest's item is taken with E, never by itself. A gold key and these rolls give an
  // epic chest: the Gold Axe, and Update 0.2.1, no coins with it.)
  const { t, p, c } = chestScene(0);
  c.items.goldKeys = 1;
  c.items.keyPick = 'goldKey';
  t.chests[0].rolls = [0.5, 0, 0];
  const w = new FlatWorld();
  const before = c.money;
  stepTreasure(t, p, c, true, false, never, DT);
  for (let i = 0; i < ticks(ITEMS.v.chestTime + 0.2); i++) {
    stepTreasure(t, p, c, false, false, never, DT);
    stepPlayer(p, emptyIntent(), w, [], DT);
    stepCombat(c, p, emptyCombatIntent(), w, DT);
  }
  const loot = t.chests[0].loot!;
  const waiting = () => c.drops.find((d) => d.alive && d.manual);
  const d = waiting();
  check(`opened: its item (${loot.item}) rises out and hovers over the chest, not yours yet`, loot.item === 'goldAxe' && !!d && d.kind === 'goldAxe' && near(d.pos.x, 0, 1e-6) && near(d.pos.z, 0, 1e-6) && d.pos.y > 0.3 && c.weapon === null);
  const coinsOut = c.coins.filter((q) => q.alive).length + c.money - before;
  check('no coins with it (Update 0.2.1)', coinsOut === 0, `${coinsOut}`);
  // Walk right over it, and wait.
  p.pos.set(0, 0, 0.4);
  for (let i = 0; i < ticks(30); i++) stepCombat(c, p, emptyCombatIntent(), w, DT);
  check('walking over it, or leaving it 30 s, doesn’t take it (it never fades)', !!waiting() && c.weapon === null);
  p.pos.set(0, 0, 1.6);
  c.events.clear();
  const used = stepTreasure(t, p, c, true, false, never, DT);
  check('E within Pickup range takes it: into a slot and your hand', used && !waiting() && (c.weapon as { kind: string } | null)?.kind === 'goldAxe' && events(c).includes('item'));
  check('and E with nothing waiting does nothing more', !stepTreasure(t, p, c, true, false, never, DT));
}

section('Shop and chests — the look');
{
  // The items (export_items.py): every item, the chest's base and lid, the shop's tile.
  const buf = readFileSync(new URL('../public/models/items/items.glb', import.meta.url));
  const items = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '');
  // (Update 0.0.16 — the white and gold keys are the key, recoloured in code: keyLooks.ts.)
  const names = [...ITEM_KINDS.filter((k) => k !== 'whiteKey' && k !== 'goldKey').map((k) => `item_${k}`), 'item_chestBase', 'item_chestLid', 'item_tile'];
  const missing = names.filter((n) => !items.scene.getObjectByName(n));
  check('every item, the chest (base and lid) and the tile are in items.glb', missing.length === 0, missing.join(', '));
  const lid = items.scene.getObjectByName('item_chestLid')!;
  check('the lid swings on its hinge, at the back of the chest', lid.position.y > 0.4 && lid.position.z < -0.2, `${lid.position.toArray().map((x) => x.toFixed(2))}`);

  // A floor's shop and chest, drawn.
  const level = { chests: [{ room: 0, x: 0, z: 0, rot: 0, fx: 0, fz: 1 }], rooms: [{ kind: 'shop', index: 0, tiles: [{ x: 4, y: 0, z: 0 }, { x: 6, y: 0, z: 0 }] }] } as unknown as DungeonLevel;
  const t = createTreasure(level, createRng(2));
  const scene = new THREE.Scene();
  const view = new TreasureView(scene, t, false);
  view.attach(items.scene);
  const c = createCombat(bare);
  const eye = new THREE.Vector3(0, 1.6, 3);
  view.update(c, eye, DT);
  const shown = (kind: string) => view.group.children.filter((o) => o.visible && o.name === `item_${kind}` && o.position.y > 0.8).length;
  check('each offer turns above its tile', t.offers.every((o) => shown(o.kind) >= 1));
  t.offers[0].sold = true;
  view.update(c, eye, DT);
  check('a sold one is gone', shown(t.offers[0].kind) === 0 && shown(t.offers[1].kind) >= 1);
  const angle = () => -view.group.getObjectByName('item_chestLid')!.rotation.x;
  check('a shut chest is shut', angle() === 0);
  const chest = t.chests[0];
  chest.state = 'opening';
  const lips: THREE.Vector3[] = [];
  for (const k of [0.1, 0.35, 0.5]) {
    chest.t = k * ITEMS.v.chestTime;
    view.update(c, eye, 0);
    lips.push(view.reach.left.clone());
  }
  check('opening, the lid rises from shut to open', near(lidAngle(0.1), 0, 1e-9) && angle() > 1 && lidAngle(1) === LID_OPEN);
  check('and its front edge (where the hands are) goes up with it', lips[1].y > lips[0].y + 0.05 && lips[2].y > lips[1].y + 0.1, lips.map((l) => l.y.toFixed(2)).join(' → '));
  check('the hands are told where it is while it opens', view.reach.k > 0);
  chest.state = 'open';
  view.update(c, eye, 0);
  check('open, it stays open and the hands let go', near(angle(), LID_OPEN, 1e-6) && view.reach.k === -1);

  // The hands on the lid: the game's own arms, posed through the reach, land on the lid's front edge on screen.
  const armsBuf = readFileSync(new URL('../public/models/arms/adventurer.glb', import.meta.url));
  const arms = await new GLTFLoader().parseAsync(armsBuf.buffer.slice(armsBuf.byteOffset, armsBuf.byteOffset + armsBuf.byteLength) as ArrayBuffer, '');
  const vm = new Viewmodel(false);
  vm.attach(ArmsRig.fromScene(arms.scene));
  vm.setLens(16 / 9);
  // Kneeling in front of it: the eye at kneel height, looking down at it as the game turns you.
  const cam = new THREE.PerspectiveCamera(verticalFov(100, 16 / 9), 16 / 9, 0.05, 100);
  cam.position.set(0, CAMERA.v.kneelEyeHeight, KNEEL_DIST);
  cam.rotation.set((CAMERA.v.kneelPitch * Math.PI) / 180, 0, 0, 'YXZ');
  chest.state = 'opening';
  chest.t = 0.3 * ITEMS.v.chestTime;
  view.update(c, eye, 0);
  const p = createPlayer(0, 0, KNEEL_DIST, 0);
  p.grounded = true;
  for (let i = 0; i < 30; i++) {
    vm.chest.update(view.reach.k, view.reach.left, view.reach.right, cam, vm.camera);
    vm.update(DT, DT, 0, 0, p, -1);
  }
  vm.scene.updateMatrixWorld(true);
  const fist = (n: string) => arms.scene.getObjectByName(n)!.getWorldPosition(new THREE.Vector3()).project(vm.camera);
  const lipL = view.reach.left.clone().project(cam);
  const lipR = view.reach.right.clone().project(cam);
  const l = fist('Middle2L');
  const r = fist('Middle2R');
  const off = Math.max(Math.hypot(l.x - lipL.x, l.y - lipL.y), Math.hypot(r.x - lipR.x, r.y - lipR.y));
  check('kneeling at a chest, both fists are on the lid’s front edge on screen', off < 0.2, `off by ${off.toFixed(2)} (screen half-widths): L (${l.x.toFixed(2)}, ${l.y.toFixed(2)}) at (${lipL.x.toFixed(2)}, ${lipL.y.toFixed(2)}), R (${r.x.toFixed(2)}, ${r.y.toFixed(2)}) at (${lipR.x.toFixed(2)}, ${lipR.y.toFixed(2)})`);
}
