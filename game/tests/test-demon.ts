// Update 0.3.70 — the Playable Demon, phase 1 (enemy_bibles/Born to Retry — Playable Demon.docx; the designer: "beating the
// final boss … they will unlock the boss as a playable character … keep the same height … cut the arms and insert it into
// the pov and he always has the sword"; "this is how a proper weapon is gripped", "bigger sword, so it feels like a massive
// blade"): the roster and the save, the lobby's silhouette, the unlock, no other weapon, and the real arms and blade in
// the game's own viewmodel: a closed fist round a hilt that fills it, wrists straight, nothing on the crosshair.
import { existsSync, statSync } from 'node:fs';
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { OPEN_WORLD } from './fakes/enemyWorld';
import { parseUntextured } from './fakes/glb';
import { createRng } from '../src/core/rng';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { canPlay, isPlayable, ROSTER } from '../src/sim/characters';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { noWeaponsOffered, Treasure } from '../src/sim/dungeon/treasure';
import { hitEnemy } from '../src/sim/enemies/enemy';
import { updateEnemies } from '../src/sim/enemies/update';
import { emptyFocus, focusOf } from '../src/sim/items/focus';
import { isWeaponItem, ItemKind } from '../src/sim/items/items';
import { runLab } from '../src/sim/lab/labCommands';
import { createLobby, lobbyFocus, stepLobby } from '../src/sim/lobby/lobby';
import { createPlayer } from '../src/sim/player/state';
import { giveWeapon } from '../src/sim/weapons/slots';
import { holding, placePickup } from '../src/sim/weapons/weapons';
import { defaultSave, hydrateSave } from '../src/state/settings';
import { WEAPON_URL } from '../src/engine/weaponsView';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { DEMON_HAND } from '../src/engine/viewmodel/handPose';
import { DEMON_ARMS_URL, DEMON_BLADE_URL, Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { DEMON_MOVES, movesOf } from '../src/engine/viewmodel/weaponMoves';
import { DEMON_FIGURE_URL } from '../src/engine/lobby/lobbyView';
import { DAIS, FIGURES } from '../src/world/lobby/spots';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { bossRoomStart } from '../src/world/dungeon/bossStart';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { planFloor } from '../src/world/dungeon/floorPlan';
import type { Arena } from '../src/world/arena';

const demon = ROSTER.find((c) => c.id === 'demon')!;

section('The Demon — earned, on the roster and in the save');
{
  check('on the roster, last', ROSTER[ROSTER.length - 1] === demon && demon.name === 'The Demon');
  check('not playable till the final boss is beaten', !isPlayable(demon, false) && isPlayable(demon, true) && !canPlay('demon', false) && canPlay('demon', true));
  check('the others don’t come with it', !isPlayable(ROSTER[1], true) && !canPlay('king', true) && isPlayable(ROSTER[0], false));
  check('a new save hasn’t earned it', defaultSave().demon === false);
  check('nor an old save, or a bad value', hydrateSave({}).demon === false && hydrateSave({ demon: 'yes' }).demon === false);
  check('earned, it’s kept', hydrateSave({ demon: true }).demon === true);
  check('chosen in a save that hasn’t earned it: Joseph', hydrateSave({ character: 'demon' }).character === 'adventurer');
  check('chosen and earned: the Demon', hydrateSave({ character: 'demon', demon: true }).character === 'demon');
}

section('The Demon — on the lobby’s dais');
{
  check('a place for each on the roster, on the dais', FIGURES.length === ROSTER.length && FIGURES.every((f) => f.z > DAIS.z0 && f.z < DAIS.z1));
  check('room between them', FIGURES.every((f, i) => i === 0 || FIGURES[i - 1].z - f.z >= 2));
  const at = (x: number, z: number) => {
    const p = createPlayer(x, 0, z, 0);
    p.grounded = true;
    return p;
  };
  const place = FIGURES[ROSTER.indexOf(demon)];
  const sealed = createLobby('real', 'adventurer', true, false);
  stepLobby(sealed, at(DAIS.x0 + 0.6, place.z), false);
  const f = lobbyFocus(sealed, emptyFocus());
  check('not earned: no name, and its card says how', f.act === 'sealed' && f.label === '');
  stepLobby(sealed, at(DAIS.x0 + 0.6, place.z), true);
  check('E there: still Joseph (a knock)', sealed.character === 'adventurer' && sealed.events.join() === 'locked');
  const open = createLobby('real', 'adventurer', true, true);
  stepLobby(open, at(DAIS.x0 + 0.6, place.z), false);
  const g = lobbyFocus(open, emptyFocus());
  check('earned: its name, and E chooses it', g.act === 'choose' && g.label === 'The Demon');
  stepLobby(open, at(DAIS.x0 + 0.6, place.z), true);
  check('E there: you’re the Demon', open.character === 'demon' && open.events.join() === 'pick');
  check('chosen', lobbyFocus(open, emptyFocus()).act === 'chosen');
  check('its figure is its own file', existsSync(new URL(`../public${DEMON_FIGURE_URL}`, import.meta.url)));
  const figure = (await parseUntextured(new URL(`../public${DEMON_FIGURE_URL}`, import.meta.url))).scene;
  const body = figure.getObjectByName('Char_demon');
  check('Char_demon, as the others are named', !!body);
  const box = new THREE.Box3().setFromObject(figure);
  check(`towering, feet on the ground (${(box.max.y - box.min.y).toFixed(2)} m)`, box.max.y - box.min.y > 1.8 && box.max.y - box.min.y < 2.5 && Math.abs(box.min.y) < 0.02);
  check('standing on its place, its sword reaching out to the side', Math.abs(box.min.x + box.max.x) < 1.6);
}

section('The Demon — beating the final boss earns it, on any difficulty');
{
  /** Into a floor's boss room, through its show, and the boss killed. */
  const beat = (floor: number) => {
    const level = buildDungeon(planFloor(4242, floor));
    const run = createDungeonRun(level);
    const combat = createCombat(level.arena, false);
    const st = bossRoomStart(level);
    const p = createPlayer(st.x, 0, st.z, st.yaw);
    p.grounded = true;
    const rng = createRng(3);
    const tick = (secs: number) => {
      for (let i = 0; i < ticks(secs); i++) {
        p.hp = 100;
        stepRooms(run, p, combat, rng, DT);
        updateEnemies(combat.enemies, p, combat, OPEN_WORLD, DT);
        combat.events.clear();
      }
    };
    tick(25);
    const before = combat.wardenBeaten;
    const boss = combat.enemies[run.boss.slot];
    if (boss) hitEnemy(boss, 1e6, 0, 0, 1);
    tick(0.1);
    return { before, kind: boss?.kind, after: combat.wardenBeaten };
  };
  const hell = beat(FLOOR.hell);
  check('Hellwarden in its room, and not earned while it stands', hell.kind === 'hellwarden' && !hell.before);
  check('it falls: earned', hell.after);
  const first = beat(FLOOR.dungeon);
  check('another boss doesn’t earn it', first.kind !== 'hellwarden' && !first.after);
}

const bare: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };

section('The Demon — the sword’s always in hand: no other weapon');
{
  const c = createCombat(bare);
  c.demon = true;
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  giveWeapon(c, holding('goldAxe', 5), p.pos);
  check('one given goes nowhere', c.weapon === null && c.bag.every((w) => w === null));
  placePickup(c.pickups, 'sword', 5, new THREE.Vector3(0.5, 0, 0));
  const w = new FlatWorld();
  stepCombat(c, p, { ...emptyCombatIntent(), interactPressed: true }, w, DT);
  check('E doesn’t take one off the floor', c.weapon === null && c.pickups.some((q) => q.alive));
  const t: Treasure = { shop: -1, offers: [], chests: [], choosing: -1 };
  check('no card for one', focusOf(t, c, p, () => false, emptyFocus()).act === null);
  const j = createCombat(bare);
  const q = createPlayer(0, 0, 0, 0);
  q.grounded = true;
  placePickup(j.pickups, 'sword', 5, new THREE.Vector3(0.5, 0, 0));
  stepCombat(j, q, { ...emptyCombatIntent(), interactPressed: true }, w, DT);
  check('Joseph still does', j.weapon?.kind === 'sword');
  const offers = (['goldAxe', 'heart', 'grimoire', 'key', 'hammer'] as ItemKind[]).map((kind) => ({ kind, price: 1, sold: false, x: 0, z: 0 }));
  const shop: Treasure = { shop: 0, offers, chests: [], choosing: -1 };
  noWeaponsOffered(shop, 3);
  check('the shop sells it none', shop.offers.every((o) => !isWeaponItem(o.kind)));
  check('what it had that isn’t one stays', shop.offers[1].kind === 'heart' && shop.offers[3].kind === 'key' && shop.offers[1].price === 1);
  check('and what’s in their place has its price', shop.offers[0].price > 1);
  const lab = createCombat(bare);
  lab.weapon = lab.bag[1] = holding('sword', 3);
  lab.slot = 1;
  runLab({ kind: 'demon', on: true }, lab, createPlayer(0, 0, 0, 0), 0, t);
  check('the Lab’s Play as: the Demon, whatever was in the hand gone', lab.demon && lab.weapon === null && lab.slot === 0 && lab.bag.every((b) => b === null));
  runLab({ kind: 'demon', on: false }, lab, createPlayer(0, 0, 0, 0), 0, t);
  check('and back to Joseph', !lab.demon);
}

section('The Demon — its models');
{
  const size = (url: string) => statSync(new URL(`../public${url}`, import.meta.url)).size;
  check('its arms and its blade are in the game', size(DEMON_ARMS_URL) > 0 && size(DEMON_BLADE_URL) > 0);
  check(`light: arms ${Math.round(size(DEMON_ARMS_URL) / 1024)} KB, blade ${Math.round(size(DEMON_BLADE_URL) / 1024)} KB`, size(DEMON_ARMS_URL) < 500 * 1024 && size(DEMON_BLADE_URL) < 500 * 1024);
  check('nobody else pays for them: the blade’s not among the weapons every run loads', !Object.values(WEAPON_URL).includes(DEMON_BLADE_URL));
}

const STEP = 1 / 120;
const STILL = createPlayer(0, 0, 0, 0);
STILL.grounded = true;

async function demonArms() {
  const arms = await parseUntextured(new URL(`../public${DEMON_ARMS_URL}`, import.meta.url));
  const blade = await parseUntextured(new URL(`../public${DEMON_BLADE_URL}`, import.meta.url));
  const rig = ArmsRig.fromScene(arms.scene, DEMON_HAND);
  const vm = new Viewmodel(false);
  vm.holdBlade(blade.scene);
  vm.attach(rig);
  vm.setLens(16 / 9);
  const play = (s: number, c = -1) => {
    for (let t = 0; t < s - 1e-9; t += STEP) vm.update(STEP, STEP, 0, 0, STILL, c);
  };
  play(1.2);
  return { vm, rig, blade: blade.scene, play };
}

/** How far a wrist bends from its forearm's line (degrees). */
function wrist(rig: ArmsRig): number {
  const r = rig.arms.R;
  const elbow = r.fore.bone.getWorldPosition(new THREE.Vector3());
  const at = r.hand.bone.getWorldPosition(new THREE.Vector3());
  const knuckle = r.knuckle.getWorldPosition(new THREE.Vector3());
  return (at.clone().sub(elbow).angleTo(knuckle.sub(at)) * 180) / Math.PI;
}

section('The Demon — its blade in the game’s own arms');
{
  const { vm, rig, blade, play } = await demonArms();
  check('always in hand, with nothing else there', vm.heldWeapon === blade && vm.armed);
  check('its own moves', movesOf(blade) === DEMON_MOVES && vm.swordAnim.moves === DEMON_MOVES);
  vm.setWeapon(null);
  check('put away, it stays', vm.heldWeapon === blade);
  vm.punch('R', 'jab');
  check('left click swings it', vm.swordAnim.current === 'forehand');
  play(1.2);
  check('and it comes back to ready', vm.swordAnim.current === 'ready');

  const moments: [string, () => void][] = [
    ['ready', () => {}],
    ['a swing, 25%', () => (vm.slash(), play(vm.swordAnim.moves.swing() * (1 - Math.cbrt(1 - 0.25))))],
    ['contact', () => (vm.slash(), play(vm.swordAnim.moves.swing() * (1 - Math.cbrt(1 - 0.5))))],
    ['through', () => (vm.slash(), play(vm.swordAnim.moves.swing() * (1 - Math.cbrt(1 - 0.9))))],
    ['charged', () => play(0.6, 1)],
    ['the blow', () => (play(0.6, 1), vm.sword('pierce'), play(vm.swordAnim.moves.out()))],
  ];
  for (const [name, run] of moments) {
    vm.swordAnim.reset();
    play(0.6);
    run();
    vm.scene.updateMatrixWorld(true);
    const bend = wrist(rig);
    check(`${name}: the wrist at ${Math.round(bend)}°, under about 40°`, bend < 44);
  }
}

section('The Demon — the grip (the designer: "this is how a proper weapon is gripped")');
{
  const { vm, rig, blade } = await demonArms();
  vm.scene.updateMatrixWorld(true);
  vm.camera.updateMatrixWorld(true);
  const toScreen = (p: THREE.Vector3) => p.clone().project(vm.camera);
  const hand = toScreen(rig.arms.R.hand.bone.getWorldPosition(new THREE.Vector3()));
  const knuckle = toScreen(rig.arms.R.knuckle.getWorldPosition(new THREE.Vector3()));
  check('the whole fist on the screen, low on the right', hand.x > 0 && hand.x < 1 && hand.y < 0 && hand.y > -1 && knuckle.x > 0 && knuckle.x < 1 && knuckle.y > -1);
  // The fingers wrap the hilt: each one's closed at its knuckle and its middle joint.
  const hands = (rig as unknown as { hands: { R: { grip(r: number, t: number): { curl: number[] } } } }).hands.R;
  const curl = hands.grip(DEMON_MOVES.grip(), 0.4).curl;
  check('every finger closes on the hilt', [0, 3, 6, 9].every((f) => curl[f] > 1 && curl[f + 1] > 1), curl.slice(0, 12).map((n) => n.toFixed(1)).join(' '));
  check('no bend past its limits (past them the skin folds)', [0, 3, 6, 9].every((f) => curl[f] <= DEMON_HAND.most.knuckle + 1e-9 && curl[f + 1] <= DEMON_HAND.most.middle + 1e-9));
  // The blade's own vertices, as held.
  let mesh: THREE.Mesh | null = null;
  blade.traverse((o) => {
    if (o instanceof THREE.Mesh) mesh = o;
  });
  const m = mesh as unknown as THREE.Mesh;
  const pos = m.geometry.attributes.position;
  const v = new THREE.Vector3();
  let top = -Infinity;
  let bottom = Infinity;
  let handle = 0;
  let wide = 0;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    top = Math.max(top, v.y);
    bottom = Math.min(bottom, v.y);
    if (Math.abs(v.y) < 0.03) handle = Math.max(handle, Math.hypot(v.x, v.z));
    if (v.y > 1) wide = Math.max(wide, Math.abs(v.x));
  }
  check(`a massive blade: ${(top - bottom).toFixed(2)} m in all, ${top.toFixed(2)} m above the fist`, top - bottom > 2.5 && top > 2.2);
  check(`and broad (${(2 * wide).toFixed(2)} m)`, 2 * wide > 0.25);
  check(`its hilt (radius ${handle.toFixed(3)} m, the moves' ${DEMON_MOVES.grip()}) fills the fist`, near(handle, DEMON_MOVES.grip(), 0.012) && handle > 0.019);
  // Nothing on the crosshair while you hold it ready.
  let nearest = Infinity;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
    const s = toScreen(v);
    if (s.z < 1) nearest = Math.min(nearest, Math.hypot(s.x, s.y));
  }
  check(`the crosshair clear at ready (${nearest.toFixed(2)} of the screen away)`, nearest > 0.05);
  check('none of this is Joseph’s: he holds nothing', (() => {
    const j = new Viewmodel(false);
    j.setWeapon(null);
    return j.heldWeapon === null && !j.armed && !j.isDemon;
  })());
}

section('The Demon — and back to Joseph');
{
  const { vm, rig, blade } = await demonArms();
  const before = rig.root.parent;
  check('the Demon’s arms are on', !!before && vm.isDemon);
  vm.setCharacter('adventurer');
  check('its blade is put away', vm.heldWeapon === null && !vm.armed && blade.parent === null);
  vm.setCharacter('demon');
  check('and it’s there again without fetching a thing', vm.heldWeapon === blade && vm.isDemon && vm.loaded);
}
