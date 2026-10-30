// Update 0.2.4 — the Pistol (the designer: "the pistol gun (not revolver) … hand holding it, we do not see left hand, we
// can aim with right click and it aims like a normal fps game, reload animation top notch, throw with q key, max 15
// bullets, testing testing"). Its rules (sim/weapons/gun.ts): a shot a click, hitscan, stopped by walls, spread wide
// from the hip and tight aimed; right click aims (the view narrows, the mouse slows); R reloads, as does the last
// bullet; the beats; Q throws it. In the hand (engine/viewmodel/gunArms.ts): aimed, the sights on the crosshair; the
// left hand out of view; the wrist nearly straight; the slide and the magazine as the beats say.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { check, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { DEFAULT_BINDINGS } from '../src/input/bindings';
import { CombatIntent, emptyCombatIntent } from '../src/sim/combat/fists';
import { CombatState, createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { CASTS, SHOOTS, WEAPON_KINDS, WEAPON_STATS } from '../src/sim/weapons/catalog';
import { aimTurn, MAG_IN, MAG_OUT, magSize, pistolDamage, reloadTime, viewZoom } from '../src/sim/weapons/gun';
import { FISTS } from '../src/tuning/combat';
import { giveWeapon, selectSlot } from '../src/sim/weapons/slots';
import { holding } from '../src/sim/weapons/weapons';
import { GUN } from '../src/tuning/gun';
import { WEAPONS } from '../src/tuning/weapons';

const g = GUN.v;
const ROUNDS = Math.round(g.pistolRounds);
const GRUNT_HP = ENEMY_STATS.grunt().hp;

/** A player at the origin facing −z (or `yaw`) holding the Pistol with `uses` bullets. */
function lab(uses = ROUNDS) {
  const state = createCombat(OPEN_ARENA, false);
  state.weapon = holding('pistol', uses);
  return { state, p: createPlayer(0, 0, 0, 0), world: new FlatWorld() };
}

type Ev = { kind: string; value: number; x: number; y: number; z: number };
function tick(state: CombatState, p: PlayerState, world: FlatWorld, intent: Partial<CombatIntent> = {}): Ev[] {
  stepCombat(state, p, { ...emptyCombatIntent(), ...intent }, world, DT);
  const out = Array.from({ length: state.events.length }, (_, i) => {
    const e = state.events.at(i);
    return { kind: e.kind, value: e.value, x: e.x, y: e.y, z: e.z };
  });
  state.events.clear();
  return out;
}
function run(state: CombatState, p: PlayerState, world: FlatWorld, secs: number, intent: Partial<CombatIntent> = {}): Ev[] {
  const out: Ev[] = [];
  for (let i = 0; i < ticks(secs); i++) out.push(...tick(state, p, world, intent));
  return out;
}
const count = (ev: Ev[], kind: string) => ev.filter((e) => e.kind === kind).length;

async function load(path: string) {
  const b = readFileSync(new URL(path, import.meta.url));
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '');
}

section('Pistol — the weapon');
{
  check('a weapon of its own that shoots (no other does; it casts nothing)', WEAPON_KINDS.includes('pistol') && SHOOTS.pistol && WEAPON_KINDS.filter((k) => SHOOTS[k]).length === 1 && !CASTS.pistol);
  check('8 bullets in a magazine, 40 in all (the designer: "8 bullets per magazine, 40 in total")', g.pistolMag === 8 && ROUNDS === 40);
  check(`a new one comes loaded: 8 in, ${ROUNDS} in all (its uses)`, holding('pistol', ROUNDS).mag === 8 && WEAPON_STATS.pistol().uses === ROUNDS);
  check('with fewer than 8 in all, the magazine holds what there is', holding('pistol', 5).mag === 5);
  // Fists: jab, jab, finisher, again, till it drops.
  const combo = [FISTS.v.jabDamage, FISTS.v.jabDamage, FISTS.v.finisherDamage];
  let fist = 0;
  for (let hp = GRUNT_HP; hp > 0; fist++) hp -= combo[fist % 3];
  check(`a Grunt takes 5 bullets (${pistolDamage()} each) and 6 punches (the designer): a weak gun, a little better at range`, Math.ceil(GRUNT_HP / pistolDamage()) === 5 && pistolDamage() * 4 < GRUNT_HP && fist === 6, `${fist} punches`);
  check('Reload is R; Throw is still Q', DEFAULT_BINDINGS.reload === 'KeyR' && DEFAULT_BINDINGS.throw === 'KeyQ');
  const gun = await load('../public/models/weapons/pistol.glb');
  const names = ['Frame', 'Slide', 'Trigger', 'Magazine', 'Muzzle', 'FrontSight', 'RearSight', 'Ejector', 'MagBase'];
  check('the model in parts that move (frame, slide, trigger, magazine) and its marks', names.every((n) => gun.scene.getObjectByName(n)), names.filter((n) => !gun.scene.getObjectByName(n)).join(', '));
  const at = (n: string) => gun.scene.getObjectByName(n)!.position;
  check('held at its grip: the muzzle ahead (+x), the sights up top, the magazine’s floor below', at('Muzzle').x > 0.15 && at('RearSight').y > 0.08 && at('FrontSight').x > at('RearSight').x && at('MagBase').y < -0.04);
}

section('Pistol — shooting');
{
  const { state, p, world } = lab();
  const ev = tick(state, p, world, { attackPressed: true, attackHeld: true });
  check('a click fires one bullet: 7 left in the magazine, one less in all', count(ev, 'gunShot') === 1 && state.weapon!.mag === 7 && state.weapon!.uses === ROUNDS - 1);
  check('holding the button fires no more (one shot a click)', count(run(state, p, world, 1, { attackHeld: true }), 'gunShot') === 0);
  const fast = run(state, p, world, 1, { attackPressed: true, attackHeld: true });
  const most = Math.ceil(1 / g.pistolInterval) + 1;
  check(`clicking as fast as you can: no faster than Pistol fire rate (${most} a second at most)`, count(fast, 'gunShot') <= most && count(fast, 'gunShot') >= most - 3, `${count(fast, 'gunShot')}`);
}
{
  const { state, p, world } = lab();
  const e = spawnEnemy(state.enemies, 'grunt', new Vector3(0, 0, -10), 0);
  run(state, p, world, g.pistolAimIn + 0.05, { heavyHeld: true });
  const ev = tick(state, p, world, { attackPressed: true, heavyHeld: true });
  const trace = ev.find((x) => x.kind === 'gunTrace')!;
  check(`aimed at a Grunt 10 m off: it lands (${pistolDamage()}), and the bullet ends on it`, count(ev, 'hitShot') === 1 && state.enemies[e].hp === GRUNT_HP - pistolDamage() && trace.value === 1 && Math.abs(trace.z - state.enemies[e].pos.z) < 1);
}
{
  const { state, p, world } = lab();
  p.yaw = -Math.PI / 2;
  world.walls.push({ x: 5, normalX: -1 });
  const e = spawnEnemy(state.enemies, 'grunt', new Vector3(8, 0, 0), 0);
  run(state, p, world, g.pistolAimIn + 0.05, { heavyHeld: true, yaw: -Math.PI / 2 });
  const ev = tick(state, p, world, { attackPressed: true, heavyHeld: true, yaw: -Math.PI / 2 });
  const trace = ev.find((x) => x.kind === 'gunTrace')!;
  check('a wall between: the bullet stops in it, the Grunt behind unhurt', trace.value === 0 && Math.abs(trace.x - 5) < 0.05 && state.enemies[e].hp === GRUNT_HP);
  const sky = lab();
  const up = tick(sky.state, sky.p, sky.world, { attackPressed: true, pitch: 0.5 });
  check('nothing in range: it ends nowhere', up.find((x) => x.kind === 'gunTrace')!.value === -1);
}
{
  // How far off the aim bullets go: from the hip, and aimed (no shots in a row: no bloom).
  const spread = (aimed: boolean) => {
    const { state, p, world } = lab(10000);
    if (aimed) run(state, p, world, g.pistolAimIn + 0.05, { heavyHeld: true });
    let most = 0;
    for (let i = 0; i < 300; i++) {
      state.weapon!.cooldown = 0;
      state.weapon!.mag = magSize();
      state.gun.bloom = 0;
      const ev = tick(state, p, world, { attackPressed: true, heavyHeld: aimed });
      const t = ev.find((x) => x.kind === 'gunTrace')!;
      const d = new Vector3(t.x, t.y, t.z).sub(new Vector3(0, ev.find((x) => x.kind === 'gunShot')!.y, 0)).normalize();
      most = Math.max(most, THREE.MathUtils.radToDeg(Math.acos(Math.min(1, -d.z))));
    }
    return most;
  };
  const hip = spread(false);
  const aimed = spread(true);
  check(`from the hip bullets stray up to Pistol spread (${g.pistolSpread}°)`, hip <= g.pistolSpread + 0.01 && hip > g.pistolSpread * 0.8, `${hip.toFixed(2)}°`);
  check(`aimed, up to Pistol aimed spread (${g.pistolAimSpread}°)`, aimed <= g.pistolAimSpread + 0.01, `${aimed.toFixed(2)}°`);
  const { state, p, world } = lab();
  run(state, p, world, 0.5, { attackPressed: true, attackHeld: true });
  check('shots in a row widen it (bloom), and it fades', state.gun.bloom > 0 && (run(state, p, world, 2), state.gun.bloom === 0));
}

section('Pistol — aiming (right click)');
{
  const { state, p, world } = lab();
  run(state, p, world, g.pistolAimIn + 2 * DT, { heavyHeld: true });
  check(`right click held: aimed in ${g.pistolAimIn} s`, state.gun.aim === 1);
  check(`aimed, the view narrows to ${g.pistolZoom} and the mouse slows to ${g.pistolAimTurn}`, Math.abs(viewZoom(state) - g.pistolZoom) < 1e-9 && Math.abs(aimTurn(state) - g.pistolAimTurn) < 1e-9);
  run(state, p, world, g.pistolAimIn + 2 * DT);
  check('let go: back to the hip, the view as it was', state.gun.aim === 0 && viewZoom(state) === 1 && aimTurn(state) === 1);
  const none = createCombat(OPEN_ARENA, false);
  check('no gun in hand: the view and mouse untouched', viewZoom(none) === 1 && aimTurn(none) === 1);
  const empty = lab(0);
  check('with no bullets left, right click aims (it doesn’t throw it)…', count(run(empty.state, empty.p, empty.world, 0.3, { heavyHeld: true }), 'throwStart') === 0);
  check('…a click throws it, as any spent weapon', count(tick(empty.state, empty.p, empty.world, { attackPressed: true }), 'throwStart') === 1);
}

section('Pistol — reloading');
{
  const { state, p, world } = lab();
  state.weapon!.mag = 3;
  // (Clicking all through it, but not in its last moment: a click that late is kept and fires as it ends.)
  const ev = [...run(state, p, world, g.pistolReload - 0.2, { reloadPressed: true, attackPressed: true }), ...run(state, p, world, 0.25)];
  const at = (kind: string) => ev.findIndex((x) => x.kind === kind);
  check('R with 3 in: a reload, from a bullet still in', ev.find((x) => x.kind === 'reloadStart')?.value === 0);
  check('its beats in order: the magazine out, the new one in, done; no slide (it never locked)', at('magOut') < at('magIn') && at('magIn') < at('reloadDone') && at('slideHome') < 0);
  check(`8 in after it, in ${g.pistolReload} s; no bullet lost or gained`, state.weapon!.mag === 8 && state.weapon!.uses === ROUNDS && state.gun.reload === -1);
  check('no shot while it reloads (the clicks all through it)', count(ev, 'gunShot') === 0);
  check('R with a full magazine does nothing', count(tick(state, p, world, { reloadPressed: true }), 'reloadStart') === 0);
}
{
  const { state, p, world } = lab();
  let shots = 0;
  let started: Ev | undefined;
  for (let i = 0; i < ticks(4) && !started; i++) {
    const ev = tick(state, p, world, { attackPressed: true, attackHeld: true });
    shots += count(ev, 'gunShot');
    started = ev.find((x) => x.kind === 'reloadStart');
  }
  check('the last bullet fired, it reloads by itself, from empty', shots === 8 && started?.value === 1);
  const ev = run(state, p, world, g.pistolReloadEmpty + 0.05);
  const at = (kind: string) => ev.findIndex((x) => x.kind === kind);
  check(`from empty the thumb lets the slide go home, after the new magazine is in (${g.pistolReloadEmpty} s in all)`, at('magIn') < at('slideHome') && at('slideHome') < at('reloadDone') && state.weapon!.mag === 8);
  check('the beats where the arms play them', MAG_OUT < MAG_IN && reloadTime(true) === g.pistolReloadEmpty && reloadTime(false) === g.pistolReload);
}
{
  const { state, p, world } = lab(13);
  for (let i = 0; i < ticks(4) && state.weapon!.uses > 5; i++) tick(state, p, world, { attackPressed: true });
  run(state, p, world, g.pistolReloadEmpty + 0.1);
  check('13 in all, 8 fired: the reload loads the 5 left', state.weapon!.mag === 5 && state.weapon!.uses === 5);
  const ev = run(state, p, world, 2, { attackPressed: true });
  check('the last of them gone: it’s spent (and then a click throws it)', state.weapon === null && count(ev, 'weaponBroken') === 1 && count(ev, 'throwStart') === 1);
}
{
  const { state, p, world } = lab();
  state.weapon = null;
  giveWeapon(state, holding('pistol', ROUNDS), p.pos);
  giveWeapon(state, holding('sword', 10), p.pos);
  selectSlot(state, 1);
  state.weapon!.mag = 4;
  run(state, p, world, g.pistolReload * 0.3, { reloadPressed: true });
  selectSlot(state, 2);
  tick(state, p, world);
  check('put away mid-reload: the reload stops (before the new magazine went in, the old one stays)', state.gun.reload === -1 && state.bag[1]!.mag === 4);
}
{
  const { state, p, world } = lab();
  const ev = run(state, p, world, WEAPONS.v.throwWindup + 0.05, { throwPressed: true });
  check('Q throws it, as any weapon', count(ev, 'throwStart') === 1 && count(ev, 'throw') === 1 && state.weapon === null && state.thrown.some((t) => t.alive && t.kind === 'pistol'));
}

section('Pistol — in your hand');
{
  const pose = async (aim: number, then?: (vm: Viewmodel) => void, frames = 40) => {
    const arms = await load('../public/models/arms/adventurer.glb');
    const gun = await load('../public/models/weapons/pistol.glb');
    const vm = new Viewmodel(false);
    vm.attach(ArmsRig.fromScene(arms.scene));
    vm.setLens(16 / 9);
    gun.scene.userData.hold = 'gun';
    vm.setWeapon(gun.scene);
    const p = createPlayer(0, 0, 0, 0);
    p.grounded = true;
    vm.gun.sync(aim, -1, false, 15);
    for (let i = 0; i < frames; i++) vm.update(1 / 60, 1 / 60, 0, 0, p, -1);
    then?.(vm);
    vm.setLens(16 / 9);
    vm.scene.updateMatrixWorld(true);
    vm.camera.updateMatrixWorld(true);
    const at = (n: string) => arms.scene.getObjectByName(n)!.getWorldPosition(new THREE.Vector3());
    const fore = at('HandR').sub(at('LowerArmR')).normalize();
    const hand = at('Middle2R').sub(at('HandR')).normalize();
    const bend = THREE.MathUtils.radToDeg(Math.acos(Math.max(-1, Math.min(1, fore.dot(hand)))));
    const screen = (n: string) => gun.scene.getObjectByName(n)!.getWorldPosition(new THREE.Vector3()).project(vm.camera);
    const left = at('HandL').project(vm.camera);
    return { vm, gun: gun.scene, bend, screen, left };
  };
  const hip = await pose(0);
  check('from the hip: low right, the wrist nearly straight', hip.screen('Muzzle').x > 0 && hip.screen('RearSight').y < -0.2 && hip.bend < 25, `${hip.bend.toFixed(0)}°`);
  check('the left hand out of view (the designer)', Math.abs(hip.left.x) > 1 || Math.abs(hip.left.y) > 1 || hip.left.z > 1);
  const aimed = await pose(1);
  const rear = aimed.screen('RearSight');
  const front = aimed.screen('FrontSight');
  check('aimed: both sights on the crosshair', Math.hypot(rear.x, rear.y) < 0.005 && Math.hypot(front.x, front.y) < 0.005, `rear (${rear.x.toFixed(3)}, ${rear.y.toFixed(3)}), front (${front.x.toFixed(3)}, ${front.y.toFixed(3)})`);
  check('aimed: the arm out, the wrist turned in no more than a real one-handed hold (< 40°)', aimed.bend < 40, `${aimed.bend.toFixed(0)}°`);
  const slide = (r: Awaited<ReturnType<typeof pose>>) => r.gun.getObjectByName('Slide')!.position.length();
  const shot = await pose(0, (vm) => (vm.gun.shot(14), vm.update(1 / 120, 1 / 120, 0, 0, createPlayer(0, 0, 0, 0), -1)), 30);
  const settled = await pose(0, (vm) => {
    vm.gun.shot(14);
    for (let i = 0; i < 20; i++) vm.update(1 / 60, 1 / 60, 0, 0, createPlayer(0, 0, 0, 0), -1);
  });
  const locked = await pose(0, (vm) => {
    vm.gun.shot(0);
    vm.gun.sync(0, -1, false, 0);
    for (let i = 0; i < 20; i++) vm.update(1 / 60, 1 / 60, 0, 0, createPlayer(0, 0, 0, 0), -1);
  });
  check('a shot blows the slide back, and it comes home; the last one leaves it back (locked)', slide(shot) > 0.02 && slide(settled) < 0.002 && slide(locked) > 0.02);
  const out = await pose(0, (vm) => {
    vm.gun.magOut();
    vm.gun.sync(0, reloadTime(false) * 0.3, false, 6);
    vm.update(1 / 60, 1 / 60, 0, 0, createPlayer(0, 0, 0, 0), -1);
  });
  const back = await pose(0, (vm) => {
    vm.gun.sync(0, reloadTime(false) * 0.9, false, 15);
    vm.update(1 / 60, 1 / 60, 0, 0, createPlayer(0, 0, 0, 0), -1);
  });
  check('mid-reload the magazine is out of the gun; near the end it’s back in', !out.gun.getObjectByName('Magazine')!.visible && back.gun.getObjectByName('Magazine')!.visible);
}
